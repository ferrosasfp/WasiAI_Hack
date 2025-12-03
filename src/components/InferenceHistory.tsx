'use client'

import { useState, useEffect } from 'react'
import {
  Box,
  Paper,
  Typography,
  Stack,
  Chip,
  IconButton,
  Tooltip,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Link as MuiLink,
  Button,
} from '@mui/material'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import RefreshIcon from '@mui/icons-material/Refresh'
import AccessTimeIcon from '@mui/icons-material/AccessTime'
import AttachMoneyIcon from '@mui/icons-material/AttachMoney'
import { useAccount } from 'wagmi'

interface InferenceRecord {
  id: string
  modelId: string
  modelName: string
  agentId: number
  payer: string
  txHash: string
  amount: string
  amountFormatted: string
  inputPreview: string
  outputPreview: string
  latencyMs: number
  timestamp: number
  explorerUrl: string | null
  timeAgo: string
}

interface InferenceHistoryProps {
  modelId?: string | number
  showPayer?: boolean
  locale?: string
  maxRows?: number
}

export default function InferenceHistory({
  modelId,
  showPayer = true,
  locale = 'en',
  maxRows = 10,
}: InferenceHistoryProps) {
  const isES = locale === 'es'
  const { address } = useAccount()
  const [history, setHistory] = useState<InferenceRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const L = {
    title: isES ? '📊 Ejecuciones Recientes' : '📊 Recent Runs',
    subtitle: isES ? 'Historial de uso del modelo' : 'Model usage history',
    noHistory: isES ? 'Aún no hay ejecuciones' : 'No runs yet',
    noHistoryHint: isES ? 'Sé el primero en probar este modelo' : 'Be the first to try this model',
    model: isES ? 'Modelo' : 'Model',
    input: isES ? 'Entrada' : 'Input',
    output: isES ? 'Salida' : 'Output',
    cost: isES ? 'Pagado' : 'Paid',
    latency: isES ? 'Latencia' : 'Latency',
    time: isES ? 'Cuándo' : 'When',
    payer: isES ? 'Usuario' : 'User',
    viewTx: isES ? 'Ver transacción' : 'View transaction',
    refresh: isES ? 'Actualizar' : 'Refresh',
    myInferences: isES ? 'Mis ejecuciones' : 'My runs',
    allInferences: isES ? 'Todas' : 'All runs',
    tx: isES ? 'Tx' : 'Tx',
    verifiedPayments: isES ? 'Pagos verificados en Avalanche via x402' : 'Payments verified on Avalanche via x402',
  }

  // Format cost with proper decimals (show 4 decimals for small amounts)
  // amountFormatted comes as "$0.0010" from API, amount comes as base units "10000"
  const formatCost = (amountFormatted: string, amountBaseUnits?: string): string => {
    // First try to use base units if available (more accurate)
    if (amountBaseUnits && amountBaseUnits !== '0') {
      const baseUnits = parseFloat(amountBaseUnits)
      if (!isNaN(baseUnits) && baseUnits > 0) {
        const usdcValue = baseUnits / 1000000 // USDC has 6 decimals
        if (usdcValue < 0.01) return usdcValue.toFixed(4)
        if (usdcValue < 1) return usdcValue.toFixed(4)
        return usdcValue.toFixed(2)
      }
    }
    
    // Fallback to amountFormatted - Remove $ if present and parse
    const cleanValue = amountFormatted.replace(/[$,]/g, '')
    const num = parseFloat(cleanValue)
    if (isNaN(num) || num === 0) return '0.0010' // Show minimum instead of 0
    if (num < 0.01) return num.toFixed(4)
    if (num < 1) return num.toFixed(4)
    return num.toFixed(2)
  }

  const fetchHistory = async (payerFilter?: string) => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (modelId) params.set('modelId', String(modelId))
      if (payerFilter) params.set('payer', payerFilter)
      params.set('limit', String(maxRows))

      const res = await fetch(`/api/inference/history?${params}`)
      const data = await res.json()

      if (data.ok) {
        setHistory(data.history)
      } else {
        setError(data.error || 'Failed to fetch history')
      }
    } catch (e: any) {
      setError(e.message || 'Network error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchHistory()
  }, [modelId])

  const [filterMine, setFilterMine] = useState(false)

  useEffect(() => {
    fetchHistory(filterMine && address ? address : undefined)
  }, [filterMine, address])

  if (loading) {
    return (
      <Paper variant="outlined" sx={{ p: 2, bgcolor: 'rgba(255,255,255,0.02)' }}>
        <Stack spacing={1}>
          <Skeleton variant="text" width={200} />
          <Skeleton variant="rectangular" height={100} />
        </Stack>
      </Paper>
    )
  }

  return (
    <Paper variant="outlined" sx={{ p: 2, bgcolor: 'rgba(255,255,255,0.02)', borderRadius: 2 }}>
      {/* Header */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.5 }}>
        <Typography variant="subtitle2" sx={{ color: '#fff', fontWeight: 700 }}>
          {L.title}
        </Typography>
        <Stack direction="row" spacing={1}>
          {address && (
            <Button
              size="small"
              variant={filterMine ? 'contained' : 'outlined'}
              onClick={() => setFilterMine(!filterMine)}
              sx={{
                fontSize: '0.7rem',
                py: 0.5,
                ...(filterMine
                  ? { bgcolor: '#9c27b0', '&:hover': { bgcolor: '#7b1fa2' } }
                  : { borderColor: 'rgba(255,255,255,0.3)', color: '#fff' }),
              }}
            >
              {filterMine ? L.myInferences : L.allInferences}
            </Button>
          )}
          <Tooltip title={L.refresh}>
            <IconButton
              size="small"
              onClick={() => fetchHistory(filterMine && address ? address : undefined)}
              sx={{ color: '#ffffffaa' }}
            >
              <RefreshIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      </Stack>
      
      <Typography variant="caption" sx={{ color: '#ffffff66', display: 'block', mb: 2 }}>
        {L.subtitle}
      </Typography>

      {error && (
        <Typography variant="body2" sx={{ color: 'error.main', mb: 2 }}>
          {error}
        </Typography>
      )}

      {history.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 4, bgcolor: 'rgba(255,255,255,0.02)', borderRadius: 1 }}>
          <Typography variant="body2" sx={{ color: '#ffffffaa', mb: 0.5 }}>
            {L.noHistory}
          </Typography>
          <Typography variant="caption" sx={{ color: '#ffffff55' }}>
            {L.noHistoryHint}
          </Typography>
        </Box>
      ) : (
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                {!modelId && (
                  <TableCell sx={{ color: '#ffffffaa', borderColor: 'rgba(255,255,255,0.1)' }}>
                    {L.model}
                  </TableCell>
                )}
                <TableCell sx={{ color: '#ffffffaa', borderColor: 'rgba(255,255,255,0.1)' }}>
                  {L.input}
                </TableCell>
                <TableCell sx={{ color: '#ffffffaa', borderColor: 'rgba(255,255,255,0.1)' }}>
                  {L.cost}
                </TableCell>
                <TableCell sx={{ color: '#ffffffaa', borderColor: 'rgba(255,255,255,0.1)' }}>
                  {L.latency}
                </TableCell>
                <TableCell sx={{ color: '#ffffffaa', borderColor: 'rgba(255,255,255,0.1)' }}>
                  {L.time}
                </TableCell>
                <TableCell sx={{ color: '#ffffffaa', borderColor: 'rgba(255,255,255,0.1)', width: 50 }}>
                  {L.tx}
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {history.map((record) => (
                <TableRow key={record.id} sx={{ '&:hover': { bgcolor: 'rgba(255,255,255,0.03)' } }}>
                  {!modelId && (
                    <TableCell sx={{ borderColor: 'rgba(255,255,255,0.1)' }}>
                      <Typography variant="body2" sx={{ color: '#fff', fontWeight: 500 }}>
                        {record.modelName}
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#ffffffaa' }}>
                        #{record.modelId}
                      </Typography>
                    </TableCell>
                  )}
                  <TableCell sx={{ borderColor: 'rgba(255,255,255,0.1)', maxWidth: 200 }}>
                    <Tooltip title={record.inputPreview}>
                      <Typography
                        variant="body2"
                        sx={{
                          color: '#fff',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          maxWidth: 150,
                        }}
                      >
                        {record.inputPreview}
                      </Typography>
                    </Tooltip>
                  </TableCell>
                  <TableCell sx={{ borderColor: 'rgba(255,255,255,0.1)' }}>
                    <Chip
                      icon={<AttachMoneyIcon sx={{ fontSize: 14 }} />}
                      label={`$${formatCost(record.amountFormatted, record.amount)}`}
                      size="small"
                      sx={{
                        bgcolor: 'rgba(76, 175, 80, 0.15)',
                        color: '#4caf50',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        height: 24,
                        '& .MuiChip-label': { px: 1 }
                      }}
                    />
                  </TableCell>
                  <TableCell sx={{ borderColor: 'rgba(255,255,255,0.1)' }}>
                    <Chip
                      icon={<AccessTimeIcon sx={{ fontSize: 14 }} />}
                      label={`${record.latencyMs}ms`}
                      size="small"
                      sx={{
                        bgcolor: 'rgba(33, 150, 243, 0.15)',
                        color: '#2196f3',
                        fontSize: '0.7rem',
                        height: 22,
                      }}
                    />
                  </TableCell>
                  <TableCell sx={{ borderColor: 'rgba(255,255,255,0.1)' }}>
                    <Typography variant="caption" sx={{ color: '#ffffffaa' }}>
                      {record.timeAgo}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ borderColor: 'rgba(255,255,255,0.1)' }}>
                    {record.explorerUrl ? (
                      <Tooltip title={L.viewTx}>
                        <IconButton
                          size="small"
                          component="a"
                          href={record.explorerUrl}
                          target="_blank"
                          sx={{ color: '#4fe1ff' }}
                        >
                          <OpenInNewIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    ) : (
                      <Typography variant="caption" sx={{ color: '#ffffff44' }}>
                        -
                      </Typography>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Typography variant="caption" sx={{ display: 'block', mt: 1.5, color: '#ffffff44', textAlign: 'center' }}>
        ⛓️ {L.verifiedPayments}
      </Typography>
    </Paper>
  )
}
