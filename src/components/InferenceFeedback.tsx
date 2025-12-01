'use client'

import { useState, useEffect } from 'react'
import {
  Box,
  Button,
  Typography,
  Stack,
  Tooltip,
  CircularProgress,
  Alert,
  Chip,
  LinearProgress,
} from '@mui/material'
import ThumbUpIcon from '@mui/icons-material/ThumbUp'
import ThumbDownIcon from '@mui/icons-material/ThumbDown'
import ThumbUpOutlinedIcon from '@mui/icons-material/ThumbUpOutlined'
import ThumbDownOutlinedIcon from '@mui/icons-material/ThumbDownOutlined'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi'
import { keccak256, toBytes } from 'viem'
import ReputationRegistryABI from '@/abis/ReputationRegistry.json'

interface InferenceFeedbackProps {
  agentId: number
  inferenceHash: string // txHash from x402 payment
  locale?: string
  onFeedbackSubmitted?: (positive: boolean) => void
}

// Contract address - will be set after deployment
const REPUTATION_REGISTRY_ADDRESS = process.env.NEXT_PUBLIC_REPUTATION_REGISTRY_ADDRESS as `0x${string}` | undefined

export default function InferenceFeedback({
  agentId,
  inferenceHash,
  locale = 'en',
  onFeedbackSubmitted,
}: InferenceFeedbackProps) {
  const isES = locale === 'es'
  const { address, isConnected } = useAccount()
  const [submitted, setSubmitted] = useState(false)
  const [selectedFeedback, setSelectedFeedback] = useState<'positive' | 'negative' | null>(null)
  const [syncedTxHash, setSyncedTxHash] = useState<string | null>(null)

  // Convert inferenceHash to bytes32
  const inferenceHashBytes32 = inferenceHash.startsWith('0x') 
    ? inferenceHash as `0x${string}`
    : keccak256(toBytes(inferenceHash))

  // Check if user can submit feedback
  const { data: canSubmitData } = useReadContract({
    address: REPUTATION_REGISTRY_ADDRESS,
    abi: ReputationRegistryABI.abi,
    functionName: 'canSubmitFeedback',
    args: [BigInt(agentId), address, inferenceHashBytes32],
    query: {
      enabled: !!REPUTATION_REGISTRY_ADDRESS && !!address && isConnected,
    },
  })

  // Get current reputation
  const { data: reputationData, refetch: refetchReputation } = useReadContract({
    address: REPUTATION_REGISTRY_ADDRESS,
    abi: ReputationRegistryABI.abi,
    functionName: 'getReputation',
    args: [BigInt(agentId)],
    query: {
      enabled: !!REPUTATION_REGISTRY_ADDRESS,
    },
  })

  // Get reputation score
  const { data: scoreData, refetch: refetchScore } = useReadContract({
    address: REPUTATION_REGISTRY_ADDRESS,
    abi: ReputationRegistryABI.abi,
    functionName: 'calculateScore',
    args: [BigInt(agentId)],
    query: {
      enabled: !!REPUTATION_REGISTRY_ADDRESS,
    },
  })

  // Submit feedback transaction
  const { writeContract, data: txHash, isPending, error: writeError } = useWriteContract()

  // Wait for transaction
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash: txHash,
  })

  // Handle successful submission
  useEffect(() => {
    // Only sync if confirmed, has feedback, has txHash, and hasn't been synced yet
    if (isConfirmed && selectedFeedback && txHash && txHash !== syncedTxHash) {
      console.log('[InferenceFeedback] TX confirmed, syncing...', { txHash, agentId, selectedFeedback })
      
      setSubmitted(true)
      setSyncedTxHash(txHash) // Mark as synced to prevent duplicate calls
      refetchReputation()
      refetchScore()
      onFeedbackSubmitted?.(selectedFeedback === 'positive')
      
      // Sync reputation to database cache
      console.log('[InferenceFeedback] Syncing reputation to DB...', { agentId, address, positive: selectedFeedback === 'positive' })
      fetch('/api/reputation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'feedback',
          agentId,
          userAddress: address || '',
          positive: selectedFeedback === 'positive',
          inferenceHash,
          txHash
        })
      })
        .then(res => res.json())
        .then(data => console.log('[InferenceFeedback] Sync result:', data))
        .catch(err => console.error('[InferenceFeedback] Failed to sync reputation:', err))
    }
  }, [isConfirmed, selectedFeedback, txHash, syncedTxHash, onFeedbackSubmitted, refetchReputation, refetchScore, agentId, address, inferenceHash])

  const handleFeedback = (positive: boolean) => {
    if (!REPUTATION_REGISTRY_ADDRESS || !isConnected) return
    
    setSelectedFeedback(positive ? 'positive' : 'negative')
    
    writeContract({
      address: REPUTATION_REGISTRY_ADDRESS,
      abi: ReputationRegistryABI.abi,
      functionName: 'submitFeedback',
      args: [BigInt(agentId), positive, inferenceHashBytes32],
    })
  }

  // Parse reputation data
  const reputation = reputationData as { positiveCount: bigint; negativeCount: bigint; totalFeedback: bigint } | undefined
  const score = scoreData as bigint | undefined
  const canSubmit = (canSubmitData as [boolean, string] | undefined)?.[0] ?? true
  const cannotSubmitReason = (canSubmitData as [boolean, string] | undefined)?.[1] ?? ''

  // If contract not deployed, show mock UI
  if (!REPUTATION_REGISTRY_ADDRESS) {
    return (
      <Box sx={{ mt: 2, p: 2, bgcolor: 'rgba(255,255,255,0.03)', borderRadius: 2 }}>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
          {isES ? '¿Fue útil esta respuesta?' : 'Was this response helpful?'}
        </Typography>
        <Stack direction="row" spacing={1}>
          <Button
            size="small"
            variant="outlined"
            startIcon={<ThumbUpOutlinedIcon />}
            disabled
            sx={{ borderColor: 'rgba(255,255,255,0.2)', color: 'text.secondary' }}
          >
            {isES ? 'Sí' : 'Yes'}
          </Button>
          <Button
            size="small"
            variant="outlined"
            startIcon={<ThumbDownOutlinedIcon />}
            disabled
            sx={{ borderColor: 'rgba(255,255,255,0.2)', color: 'text.secondary' }}
          >
            {isES ? 'No' : 'No'}
          </Button>
        </Stack>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1, fontStyle: 'italic' }}>
          {isES ? 'Feedback on-chain próximamente' : 'On-chain feedback coming soon'}
        </Typography>
      </Box>
    )
  }

  // Already submitted
  if (submitted || !canSubmit) {
    return (
      <Box sx={{ mt: 2, p: 2, bgcolor: 'rgba(255,255,255,0.03)', borderRadius: 2 }}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <CheckCircleIcon sx={{ color: 'success.main', fontSize: 20 }} />
          <Typography variant="body2" color="text.secondary">
            {submitted 
              ? (isES ? '¡Gracias por tu feedback!' : 'Thanks for your feedback!')
              : (isES ? 'Ya enviaste feedback para esta inferencia' : 'You already submitted feedback for this inference')
            }
          </Typography>
        </Stack>
        
        {/* Show current reputation */}
        {reputation && score !== undefined && (
          <Box sx={{ mt: 2 }}>
            <Stack direction="row" alignItems="center" spacing={2}>
              <Chip
                icon={<ThumbUpIcon sx={{ fontSize: 14 }} />}
                label={Number(reputation.positiveCount)}
                size="small"
                sx={{ bgcolor: 'rgba(76, 175, 80, 0.2)', color: '#4caf50' }}
              />
              <Chip
                icon={<ThumbDownIcon sx={{ fontSize: 14 }} />}
                label={Number(reputation.negativeCount)}
                size="small"
                sx={{ bgcolor: 'rgba(244, 67, 54, 0.2)', color: '#f44336' }}
              />
              <Typography variant="caption" color="text.secondary">
                {isES ? 'Puntuación:' : 'Score:'} {Number(score)}%
              </Typography>
            </Stack>
            <LinearProgress
              variant="determinate"
              value={Number(score)}
              sx={{
                mt: 1,
                height: 6,
                borderRadius: 3,
                bgcolor: 'rgba(255,255,255,0.1)',
                '& .MuiLinearProgress-bar': {
                  bgcolor: Number(score) >= 70 ? '#4caf50' : Number(score) >= 40 ? '#ff9800' : '#f44336',
                  borderRadius: 3,
                },
              }}
            />
          </Box>
        )}
      </Box>
    )
  }

  // Pending or confirming
  if (isPending || isConfirming) {
    return (
      <Box sx={{ mt: 2, p: 2, bgcolor: 'rgba(255,255,255,0.03)', borderRadius: 2 }}>
        <Stack direction="row" alignItems="center" spacing={2}>
          <CircularProgress size={20} />
          <Typography variant="body2" color="text.secondary">
            {isPending 
              ? (isES ? 'Confirma en tu wallet...' : 'Confirm in your wallet...')
              : (isES ? 'Enviando feedback on-chain...' : 'Submitting feedback on-chain...')
            }
          </Typography>
        </Stack>
      </Box>
    )
  }

  // Error state
  if (writeError) {
    return (
      <Box sx={{ mt: 2 }}>
        <Alert severity="error" sx={{ bgcolor: 'rgba(211, 47, 47, 0.1)' }}>
          {isES ? 'Error al enviar feedback: ' : 'Error submitting feedback: '}
          {writeError.message.slice(0, 100)}
        </Alert>
      </Box>
    )
  }

  // Main feedback UI
  return (
    <Box sx={{ mt: 2, p: 2, bgcolor: 'rgba(255,255,255,0.03)', borderRadius: 2 }}>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
        {isES ? '¿Fue útil esta respuesta?' : 'Was this response helpful?'}
      </Typography>
      
      <Stack direction="row" spacing={1.5}>
        <Tooltip title={isES ? 'Feedback positivo (on-chain)' : 'Positive feedback (on-chain)'}>
          <Button
            size="small"
            variant="outlined"
            onClick={() => handleFeedback(true)}
            startIcon={<ThumbUpOutlinedIcon />}
            sx={{
              borderColor: 'rgba(76, 175, 80, 0.5)',
              color: '#4caf50',
              '&:hover': {
                borderColor: '#4caf50',
                bgcolor: 'rgba(76, 175, 80, 0.1)',
              },
            }}
          >
            {isES ? 'Sí' : 'Yes'}
          </Button>
        </Tooltip>
        
        <Tooltip title={isES ? 'Feedback negativo (on-chain)' : 'Negative feedback (on-chain)'}>
          <Button
            size="small"
            variant="outlined"
            onClick={() => handleFeedback(false)}
            startIcon={<ThumbDownOutlinedIcon />}
            sx={{
              borderColor: 'rgba(244, 67, 54, 0.5)',
              color: '#f44336',
              '&:hover': {
                borderColor: '#f44336',
                bgcolor: 'rgba(244, 67, 54, 0.1)',
              },
            }}
          >
            {isES ? 'No' : 'No'}
          </Button>
        </Tooltip>
      </Stack>

      {/* Show current reputation if available */}
      {reputation && Number(reputation.totalFeedback) > 0 && (
        <Box sx={{ mt: 2 }}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <Typography variant="caption" color="text.secondary">
              {isES ? 'Reputación actual:' : 'Current reputation:'}
            </Typography>
            <Chip
              icon={<ThumbUpIcon sx={{ fontSize: 12 }} />}
              label={Number(reputation.positiveCount)}
              size="small"
              sx={{ height: 20, fontSize: '0.7rem', bgcolor: 'rgba(76, 175, 80, 0.15)', color: '#4caf50' }}
            />
            <Chip
              icon={<ThumbDownIcon sx={{ fontSize: 12 }} />}
              label={Number(reputation.negativeCount)}
              size="small"
              sx={{ height: 20, fontSize: '0.7rem', bgcolor: 'rgba(244, 67, 54, 0.15)', color: '#f44336' }}
            />
          </Stack>
        </Box>
      )}

      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.5, opacity: 0.7 }}>
        {isES 
          ? '⛓️ Tu feedback se registra on-chain en Avalanche'
          : '⛓️ Your feedback is recorded on-chain on Avalanche'
        }
      </Typography>
    </Box>
  )
}
