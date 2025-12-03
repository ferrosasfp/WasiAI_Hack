'use client'

import { useState, useEffect } from 'react'
import { Box, Typography, Stack, Chip, LinearProgress, Tooltip, Skeleton } from '@mui/material'
import ThumbUpIcon from '@mui/icons-material/ThumbUp'
import ThumbDownIcon from '@mui/icons-material/ThumbDown'
import VerifiedIcon from '@mui/icons-material/Verified'
import { useReadContract, useChainId } from 'wagmi'
import ReputationRegistryABI from '@/abis/ReputationRegistry.json'
import { getReputationRegistryAddress, DEFAULT_CHAIN_ID } from '@/config/chains'

interface AgentReputationProps {
  agentId: number
  locale?: string
  compact?: boolean
}

interface ReputationData {
  positiveCount: number
  negativeCount: number
  totalFeedback: number
  score: number
  fromCache: boolean
}

export default function AgentReputation({
  agentId,
  locale = 'en',
  compact = false,
}: AgentReputationProps) {
  const isES = locale === 'es'
  const chainId = useChainId() || DEFAULT_CHAIN_ID
  const REPUTATION_REGISTRY_ADDRESS = getReputationRegistryAddress(chainId) as `0x${string}` | undefined
  
  // State for API data
  const [apiData, setApiData] = useState<ReputationData | null>(null)
  const [apiLoading, setApiLoading] = useState(true)
  const [apiError, setApiError] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  // Fetch from API first (fast, cached in DB)
  const fetchFromApi = async () => {
    if (agentId <= 0) {
      setApiLoading(false)
      return
    }
    
    try {
      const res = await fetch(`/api/reputation?agentId=${agentId}&t=${Date.now()}`)
      if (res.ok) {
        const json = await res.json()
        if (json.success && json.data) {
          setApiData({
            positiveCount: json.data.positiveCount || 0,
            negativeCount: json.data.negativeCount || 0,
            totalFeedback: json.data.totalFeedback || 0,
            score: json.data.score || 50,
            fromCache: json.data.fromCache || false
          })
        }
      } else {
        setApiError(true)
      }
    } catch (err) {
      console.error('[AgentReputation] API fetch error:', err)
      setApiError(true)
    } finally {
      setApiLoading(false)
    }
  }

  // Initial fetch
  useEffect(() => {
    fetchFromApi()
  }, [agentId, refreshKey])

  // Listen for feedback events to refresh reputation
  useEffect(() => {
    const handleFeedbackSubmitted = (event: CustomEvent<{ agentId: number }>) => {
      if (event.detail.agentId === agentId) {
        console.log('[AgentReputation] Feedback received, refreshing...', agentId)
        // Small delay to allow DB sync
        setTimeout(() => {
          setRefreshKey(prev => prev + 1)
        }, 1500)
      }
    }

    window.addEventListener('reputation-feedback-submitted', handleFeedbackSubmitted as EventListener)
    return () => {
      window.removeEventListener('reputation-feedback-submitted', handleFeedbackSubmitted as EventListener)
    }
  }, [agentId])

  // Fallback: Get reputation directly from blockchain if API fails
  const { data: reputationData, isLoading: chainLoading, error: repError } = useReadContract({
    address: REPUTATION_REGISTRY_ADDRESS,
    abi: ReputationRegistryABI.abi,
    functionName: 'getReputation',
    args: [BigInt(agentId)],
    chainId: chainId,
    query: {
      // Only fetch from chain if API failed or no data
      enabled: !!REPUTATION_REGISTRY_ADDRESS && agentId > 0 && apiError && !apiData,
    },
  })

  // Fallback: Get score from blockchain
  const { data: scoreData, error: scoreError } = useReadContract({
    address: REPUTATION_REGISTRY_ADDRESS,
    abi: ReputationRegistryABI.abi,
    functionName: 'calculateScore',
    args: [BigInt(agentId)],
    chainId: chainId,
    query: {
      enabled: !!REPUTATION_REGISTRY_ADDRESS && agentId > 0 && apiError && !apiData,
    },
  })
  
  // Log errors only
  if (repError) console.error('[AgentReputation] getReputation error:', repError)
  if (scoreError) console.error('[AgentReputation] calculateScore error:', scoreError)

  // Determine final values - prefer API data, fallback to blockchain
  let positiveCount = 0
  let negativeCount = 0
  let totalFeedback = 0
  let scoreValue = 50
  
  if (apiData) {
    // Use API data (from DB cache or blockchain via API)
    positiveCount = apiData.positiveCount
    negativeCount = apiData.negativeCount
    totalFeedback = apiData.totalFeedback
    scoreValue = apiData.score
  } else if (reputationData) {
    // Fallback to direct blockchain read
    if (Array.isArray(reputationData)) {
      positiveCount = Number(reputationData[0] || 0n)
      negativeCount = Number(reputationData[1] || 0n)
      totalFeedback = Number(reputationData[2] || 0n)
    } else {
      const rep = reputationData as { positiveCount: bigint; negativeCount: bigint; totalFeedback: bigint }
      positiveCount = Number(rep.positiveCount || 0n)
      negativeCount = Number(rep.negativeCount || 0n)
      totalFeedback = Number(rep.totalFeedback || 0n)
    }
    scoreValue = scoreData !== undefined ? Number(scoreData) : 50
  }
  
  const isLoading = apiLoading || (apiError && chainLoading)

  // If contract not deployed, show placeholder
  if (!REPUTATION_REGISTRY_ADDRESS) {
    return (
      <Box sx={{ 
        display: 'inline-flex', 
        alignItems: 'center', 
        gap: 0.5,
        bgcolor: 'rgba(255,255,255,0.05)',
        px: 1,
        py: 0.5,
        borderRadius: 1,
      }}>
        <VerifiedIcon sx={{ fontSize: 14, color: '#9c27b0' }} />
        <Typography variant="caption" sx={{ color: '#ffffffaa' }}>
          {isES ? 'Reputación on-chain próximamente' : 'On-chain reputation coming soon'}
        </Typography>
      </Box>
    )
  }

  if (isLoading) {
    return <Skeleton variant="rounded" width={compact ? 100 : 200} height={24} />
  }

  // Compact view for badges
  if (compact) {
    const getScoreColor = () => {
      if (scoreValue >= 70) return '#4caf50'
      if (scoreValue >= 40) return '#ff9800'
      return '#f44336'
    }

    return (
      <Tooltip title={
        <Box>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {isES ? 'Reputación On-Chain' : 'On-Chain Reputation'}
          </Typography>
          <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
            <Typography variant="caption">👍 {positiveCount}</Typography>
            <Typography variant="caption">👎 {negativeCount}</Typography>
          </Stack>
          <Typography variant="caption" sx={{ display: 'block', mt: 0.5, opacity: 0.8 }}>
            {isES ? `${totalFeedback} valoraciones totales` : `${totalFeedback} total ratings`}
          </Typography>
        </Box>
      }>
        <Chip
          icon={<VerifiedIcon sx={{ fontSize: 14 }} />}
          label={`${scoreValue}%`}
          size="small"
          sx={{
            bgcolor: 'rgba(156, 39, 176, 0.15)',
            color: getScoreColor(),
            border: `1px solid ${getScoreColor()}33`,
            '& .MuiChip-icon': { color: getScoreColor() },
            fontSize: '0.75rem',
            height: 24,
          }}
        />
      </Tooltip>
    )
  }

  // Full view - Professional detailed display
  const scoreColor = scoreValue >= 70 ? '#4caf50' : scoreValue >= 40 ? '#ff9800' : '#f44336'
  const positivePercent = totalFeedback > 0 ? Math.round((positiveCount / totalFeedback) * 100) : 0
  const negativePercent = totalFeedback > 0 ? Math.round((negativeCount / totalFeedback) * 100) : 0
  
  return (
    <Box sx={{ 
      p: 2, 
      bgcolor: 'rgba(255,255,255,0.02)', 
      borderRadius: 2,
      border: '1px solid rgba(255,255,255,0.1)',
    }}>
      {/* Header */}
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <VerifiedIcon sx={{ fontSize: 18, color: '#9c27b0' }} />
          <Typography variant="caption" sx={{ fontWeight: 600, color: '#ffffffb3', textTransform: 'uppercase', fontSize: '0.7rem' }}>
            {isES ? 'Reputación On-Chain' : 'On-Chain Reputation'}
          </Typography>
        </Stack>
        {totalFeedback > 0 && (
          <Chip 
            label={`${scoreValue}%`} 
            size="small" 
            sx={{ 
              bgcolor: `${scoreColor}22`, 
              color: scoreColor, 
              fontWeight: 700,
              fontSize: '0.8rem',
              height: 24,
              border: `1px solid ${scoreColor}44`
            }} 
          />
        )}
      </Stack>

      {totalFeedback === 0 ? (
        <Box sx={{ textAlign: 'center', py: 2 }}>
          <Typography variant="body2" sx={{ color: '#ffffff66', mb: 0.5 }}>
            {isES ? 'Sin valoraciones aún' : 'No ratings yet'}
          </Typography>
          <Typography variant="caption" sx={{ color: '#ffffff44' }}>
            {isES ? 'Sé el primero en valorar' : 'Be the first to rate'}
          </Typography>
        </Box>
      ) : (
        <>
          {/* Score Progress Bar */}
          <Box sx={{ mb: 2 }}>
            <LinearProgress
              variant="determinate"
              value={scoreValue}
              sx={{
                height: 10,
                borderRadius: 5,
                bgcolor: 'rgba(255,255,255,0.08)',
                '& .MuiLinearProgress-bar': {
                  bgcolor: scoreColor,
                  borderRadius: 5,
                  transition: 'transform 0.4s ease',
                },
              }}
            />
          </Box>

          {/* Thumbs up/down with bars */}
          <Stack spacing={1.5}>
            {/* Positive */}
            <Stack direction="row" alignItems="center" spacing={1.5}>
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                width: 32, 
                height: 32, 
                borderRadius: '50%', 
                bgcolor: 'rgba(76, 175, 80, 0.15)',
                border: '1px solid rgba(76, 175, 80, 0.3)'
              }}>
                <ThumbUpIcon sx={{ fontSize: 16, color: '#4caf50' }} />
              </Box>
              <Box sx={{ flex: 1 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.25 }}>
                  <Typography variant="caption" sx={{ color: '#ffffffcc', fontWeight: 500 }}>
                    {isES ? 'Positivas' : 'Positive'}
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#4caf50', fontWeight: 700 }}>
                    {positiveCount} ({positivePercent}%)
                  </Typography>
                </Stack>
                <LinearProgress
                  variant="determinate"
                  value={positivePercent}
                  sx={{
                    height: 6,
                    borderRadius: 3,
                    bgcolor: 'rgba(255,255,255,0.06)',
                    '& .MuiLinearProgress-bar': {
                      bgcolor: '#4caf50',
                      borderRadius: 3,
                    },
                  }}
                />
              </Box>
            </Stack>

            {/* Negative */}
            <Stack direction="row" alignItems="center" spacing={1.5}>
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                width: 32, 
                height: 32, 
                borderRadius: '50%', 
                bgcolor: 'rgba(244, 67, 54, 0.15)',
                border: '1px solid rgba(244, 67, 54, 0.3)'
              }}>
                <ThumbDownIcon sx={{ fontSize: 16, color: '#f44336' }} />
              </Box>
              <Box sx={{ flex: 1 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.25 }}>
                  <Typography variant="caption" sx={{ color: '#ffffffcc', fontWeight: 500 }}>
                    {isES ? 'Negativas' : 'Negative'}
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#f44336', fontWeight: 700 }}>
                    {negativeCount} ({negativePercent}%)
                  </Typography>
                </Stack>
                <LinearProgress
                  variant="determinate"
                  value={negativePercent}
                  sx={{
                    height: 6,
                    borderRadius: 3,
                    bgcolor: 'rgba(255,255,255,0.06)',
                    '& .MuiLinearProgress-bar': {
                      bgcolor: '#f44336',
                      borderRadius: 3,
                    },
                  }}
                />
              </Box>
            </Stack>
          </Stack>

          {/* Total count */}
          <Box sx={{ mt: 2, pt: 1.5, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="caption" sx={{ color: '#ffffff66' }}>
                {isES ? 'Total de valoraciones' : 'Total ratings'}
              </Typography>
              <Typography variant="caption" sx={{ color: '#ffffffcc', fontWeight: 600 }}>
                {totalFeedback}
              </Typography>
            </Stack>
          </Box>
        </>
      )}

      {/* Footer */}
      <Box sx={{ mt: 1.5, pt: 1, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <Typography variant="caption" sx={{ color: '#ffffff44', fontSize: '0.65rem' }}>
          ⛓️ {isES ? 'Verificado en Avalanche • ERC-8004' : 'Verified on Avalanche • ERC-8004'}
        </Typography>
      </Box>
    </Box>
  )
}
