'use client'

import { Box, Typography, Stack, Chip, LinearProgress, Tooltip, Skeleton } from '@mui/material'
import ThumbUpIcon from '@mui/icons-material/ThumbUp'
import ThumbDownIcon from '@mui/icons-material/ThumbDown'
import VerifiedIcon from '@mui/icons-material/Verified'
import { useReadContract } from 'wagmi'
import ReputationRegistryABI from '@/abis/ReputationRegistry.json'

interface AgentReputationProps {
  agentId: number
  locale?: string
  compact?: boolean
}

const REPUTATION_REGISTRY_ADDRESS = process.env.NEXT_PUBLIC_REPUTATION_REGISTRY_ADDRESS as `0x${string}` | undefined

export default function AgentReputation({
  agentId,
  locale = 'en',
  compact = false,
}: AgentReputationProps) {
  const isES = locale === 'es'

  // Get reputation data
  const { data: reputationData, isLoading } = useReadContract({
    address: REPUTATION_REGISTRY_ADDRESS,
    abi: ReputationRegistryABI.abi,
    functionName: 'getReputation',
    args: [BigInt(agentId)],
    query: {
      enabled: !!REPUTATION_REGISTRY_ADDRESS && agentId > 0,
    },
  })

  // Get score
  const { data: scoreData } = useReadContract({
    address: REPUTATION_REGISTRY_ADDRESS,
    abi: ReputationRegistryABI.abi,
    functionName: 'calculateScore',
    args: [BigInt(agentId)],
    query: {
      enabled: !!REPUTATION_REGISTRY_ADDRESS && agentId > 0,
    },
  })

  // Parse data
  const reputation = reputationData as { positiveCount: bigint; negativeCount: bigint; totalFeedback: bigint } | undefined
  const score = scoreData as bigint | undefined
  const positiveCount = reputation ? Number(reputation.positiveCount) : 0
  const negativeCount = reputation ? Number(reputation.negativeCount) : 0
  const totalFeedback = reputation ? Number(reputation.totalFeedback) : 0
  const scoreValue = score !== undefined ? Number(score) : 50

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

  // Full view
  return (
    <Box sx={{ 
      p: 2, 
      bgcolor: 'rgba(255,255,255,0.03)', 
      borderRadius: 2,
      border: '1px solid rgba(255,255,255,0.1)',
    }}>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
        <VerifiedIcon sx={{ fontSize: 18, color: '#9c27b0' }} />
        <Typography variant="body2" sx={{ fontWeight: 600, color: '#fff' }}>
          {isES ? 'Reputación On-Chain' : 'On-Chain Reputation'}
        </Typography>
      </Stack>

      {totalFeedback === 0 ? (
        <Typography variant="caption" sx={{ color: '#ffffffaa' }}>
          {isES ? 'Sin valoraciones aún' : 'No ratings yet'}
        </Typography>
      ) : (
        <>
          {/* Score bar */}
          <Box sx={{ mb: 1.5 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.5 }}>
              <Typography variant="caption" sx={{ color: '#ffffffaa' }}>
                {isES ? 'Puntuación' : 'Score'}
              </Typography>
              <Typography variant="body2" sx={{ 
                fontWeight: 700, 
                color: scoreValue >= 70 ? '#4caf50' : scoreValue >= 40 ? '#ff9800' : '#f44336' 
              }}>
                {scoreValue}%
              </Typography>
            </Stack>
            <LinearProgress
              variant="determinate"
              value={scoreValue}
              sx={{
                height: 8,
                borderRadius: 4,
                bgcolor: 'rgba(255,255,255,0.1)',
                '& .MuiLinearProgress-bar': {
                  bgcolor: scoreValue >= 70 ? '#4caf50' : scoreValue >= 40 ? '#ff9800' : '#f44336',
                  borderRadius: 4,
                },
              }}
            />
          </Box>

          {/* Feedback counts */}
          <Stack direction="row" spacing={2}>
            <Stack direction="row" alignItems="center" spacing={0.5}>
              <ThumbUpIcon sx={{ fontSize: 16, color: '#4caf50' }} />
              <Typography variant="body2" sx={{ color: '#4caf50', fontWeight: 600 }}>
                {positiveCount}
              </Typography>
            </Stack>
            <Stack direction="row" alignItems="center" spacing={0.5}>
              <ThumbDownIcon sx={{ fontSize: 16, color: '#f44336' }} />
              <Typography variant="body2" sx={{ color: '#f44336', fontWeight: 600 }}>
                {negativeCount}
              </Typography>
            </Stack>
            <Typography variant="caption" sx={{ color: '#ffffff66' }}>
              ({totalFeedback} {isES ? 'total' : 'total'})
            </Typography>
          </Stack>
        </>
      )}

      <Typography variant="caption" sx={{ display: 'block', mt: 1.5, color: '#ffffff44' }}>
        ⛓️ {isES ? 'Verificado en Avalanche' : 'Verified on Avalanche'}
      </Typography>
    </Box>
  )
}
