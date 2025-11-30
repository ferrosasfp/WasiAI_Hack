'use client'

import React, { useState, useCallback } from 'react'
import {
  Box,
  Button,
  TextField,
  Typography,
  Paper,
  Stack,
  Alert,
  CircularProgress,
  Chip,
  Collapse,
  IconButton,
  Tooltip,
  Link as MuiLink
} from '@mui/material'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import { useAccount, useSignTypedData } from 'wagmi'

interface X402InferencePanelProps {
  modelId: number | string
  modelName: string
  agentId?: number
  pricePerInference?: string
  recipientWallet?: string
  chainId?: number
  locale?: string
}

type InferenceStatus = 'idle' | 'checking' | 'payment_required' | 'signing' | 'settling' | 'running' | 'success' | 'error'

const USDC_ADDRESS = '0x5425890298aed601595a70AB815c96711a31Bc65'
const USDC_DECIMALS = 6
const NETWORK = 'avalanche-fuji'
const CHAIN_ID = 43113

const USDC_DOMAIN = {
  name: 'USD Coin',
  version: '2',
  chainId: CHAIN_ID,
  verifyingContract: USDC_ADDRESS as `0x${string}`
}

const TRANSFER_WITH_AUTHORIZATION_TYPES = {
  TransferWithAuthorization: [
    { name: 'from', type: 'address' },
    { name: 'to', type: 'address' },
    { name: 'value', type: 'uint256' },
    { name: 'validAfter', type: 'uint256' },
    { name: 'validBefore', type: 'uint256' },
    { name: 'nonce', type: 'bytes32' }
  ]
} as const

interface X402PaymentRequirement {
  scheme: string
  network: string
  maxAmountRequired: string
  resource: string
  description: string
  payTo: string
  asset: string
  maxTimeoutSeconds: number
}

function formatUsdcPrice(baseUnits: string): string {
  const value = parseFloat(baseUnits) / Math.pow(10, USDC_DECIMALS)
  return `$${value.toFixed(2)}`
}

function generateNonce(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return '0x' + Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')
}

export default function X402InferencePanel({
  modelId,
  modelName,
  agentId,
  locale = 'en'
}: X402InferencePanelProps) {
  const isES = locale === 'es'
  
  const [input, setInput] = useState('')
  const [status, setStatus] = useState<InferenceStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<any>(null)
  const [paymentRequirement, setPaymentRequirement] = useState<X402PaymentRequirement | null>(null)
  const [txHash, setTxHash] = useState<string | null>(null)
  const [latencyMs, setLatencyMs] = useState<number | null>(null)
  const [showDetails, setShowDetails] = useState(false)
  const [copied, setCopied] = useState(false)
  
  const { address, isConnected } = useAccount()
  const { signTypedDataAsync } = useSignTypedData()
  
  const L = {
    title: isES ? 'Inferencia x402' : 'x402 Inference',
    subtitle: isES ? 'Paga por uso con USDC (gasless)' : 'Pay per use with USDC (gasless)',
    inputLabel: isES ? 'Entrada para el modelo' : 'Model input',
    inputPlaceholder: isES ? 'Escribe tu consulta aquí...' : 'Enter your query here...',
    runButton: isES ? 'Ejecutar con x402' : 'Run with x402',
    connectWallet: isES ? 'Conecta tu wallet' : 'Connect your wallet',
    checking: isES ? 'Verificando precio...' : 'Checking price...',
    paymentRequired: isES ? 'Pago requerido' : 'Payment required',
    signing: isES ? 'Firma la autorización en tu wallet...' : 'Sign authorization in your wallet...',
    settling: isES ? 'Procesando pago (gasless)...' : 'Processing payment (gasless)...',
    running: isES ? 'Ejecutando inferencia...' : 'Running inference...',
    success: isES ? 'Inferencia completada' : 'Inference completed',
    price: isES ? 'Precio' : 'Price',
    recipient: isES ? 'Destinatario' : 'Recipient',
    txHashLabel: isES ? 'Hash de transacción' : 'Transaction hash',
    viewOnExplorer: isES ? 'Ver en explorador' : 'View on explorer',
    showDetails: isES ? 'Mostrar detalles' : 'Show details',
    hideDetails: isES ? 'Ocultar detalles' : 'Hide details',
    agentBadge: isES ? 'Agente ERC-8004' : 'ERC-8004 Agent',
    copiedText: isES ? '¡Copiado!' : 'Copied!',
    tryAgain: isES ? 'Intentar de nuevo' : 'Try again',
    gasless: isES ? 'Sin gas - El facilitador paga las fees' : 'Gasless - Facilitator pays fees',
    protocol: 'x402 Protocol',
  }
  
  const copyToClipboard = useCallback((text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [])
  
  const runInference = useCallback(async () => {
    if (!isConnected || !address) {
      setError(L.connectWallet)
      return
    }
    
    setStatus('checking')
    setError(null)
    setResult(null)
    setTxHash(null)
    setLatencyMs(null)
    
    try {
      const checkRes = await fetch(`/api/inference/${modelId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input })
      })
      
      if (checkRes.status === 402) {
        const data = await checkRes.json()
        const requirement = data.accepts?.[0] as X402PaymentRequirement
        
        if (!requirement) {
          throw new Error('Invalid 402 response')
        }
        
        setPaymentRequirement(requirement)
        setStatus('signing')
        
        const now = Math.floor(Date.now() / 1000)
        const validAfter = now - 60
        const validBefore = now + requirement.maxTimeoutSeconds
        const nonce = generateNonce()
        
        const authorization = {
          from: address,
          to: requirement.payTo as `0x${string}`,
          value: BigInt(requirement.maxAmountRequired),
          validAfter: BigInt(validAfter),
          validBefore: BigInt(validBefore),
          nonce: nonce as `0x${string}`
        }
        
        const signature = await signTypedDataAsync({
          domain: USDC_DOMAIN,
          types: TRANSFER_WITH_AUTHORIZATION_TYPES,
          primaryType: 'TransferWithAuthorization',
          message: authorization
        })
        
        const paymentPayload = {
          x402Version: 1,
          scheme: 'exact',
          network: NETWORK,
          payload: {
            signature,
            authorization: {
              from: address,
              to: requirement.payTo,
              value: requirement.maxAmountRequired,
              validAfter: validAfter.toString(),
              validBefore: validBefore.toString(),
              nonce
            }
          }
        }
        
        const xPaymentHeader = btoa(JSON.stringify(paymentPayload))
        setStatus('settling')
        
        const startTime = Date.now()
        const inferRes = await fetch(`/api/inference/${modelId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-PAYMENT': xPaymentHeader },
          body: JSON.stringify({ input })
        })
        
        const inferData = await inferRes.json()
        
        const paymentResponse = inferRes.headers.get('X-PAYMENT-RESPONSE')
        if (paymentResponse) {
          try {
            const decoded = JSON.parse(atob(paymentResponse))
            if (decoded.transaction) setTxHash(decoded.transaction)
          } catch {}
        }
        
        if (!inferRes.ok) throw new Error(inferData.error || 'Inference failed')
        
        setLatencyMs(inferData.latencyMs || (Date.now() - startTime))
        setResult(inferData.result)
        setStatus('success')
        if (inferData.payment?.txHash) setTxHash(inferData.payment.txHash)
        
      } else if (checkRes.ok) {
        const data = await checkRes.json()
        setResult(data.result)
        setLatencyMs(data.latencyMs)
        setStatus('success')
      } else {
        const errData = await checkRes.json()
        throw new Error(errData.message || 'Request failed')
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred')
      setStatus('error')
    }
  }, [isConnected, address, modelId, input, signTypedDataAsync, L.connectWallet])
  
  const reset = useCallback(() => {
    setStatus('idle')
    setError(null)
    setResult(null)
    setPaymentRequirement(null)
    setTxHash(null)
    setLatencyMs(null)
  }, [])
  
  const getStatusMessage = () => {
    switch (status) {
      case 'checking': return L.checking
      case 'signing': return L.signing
      case 'settling': return L.settling
      case 'running': return L.running
      case 'success': return L.success
      default: return ''
    }
  }
  
  const isLoading = ['checking', 'signing', 'settling', 'running'].includes(status)
  const explorerUrl = txHash ? `https://testnet.snowtrace.io/tx/${txHash}` : null
  
  return (
    <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 }, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(79, 225, 255, 0.2)' }}>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#fff' }}>{L.title}</Typography>
        <Chip label={L.protocol} size="small" sx={{ bgcolor: 'rgba(79, 225, 255, 0.15)', color: '#4fe1ff', fontSize: '0.7rem', height: 20 }} />
        {agentId && agentId > 0 && (
          <Chip label={`${L.agentBadge} #${agentId}`} size="small" sx={{ bgcolor: 'rgba(156, 39, 176, 0.15)', color: '#ce93d8', fontSize: '0.7rem', height: 20 }} />
        )}
      </Stack>
      
      <Typography variant="body2" sx={{ color: '#ffffffaa', mb: 2 }}>{L.subtitle}</Typography>
      
      <Alert severity="info" sx={{ mb: 2, bgcolor: 'rgba(79, 225, 255, 0.08)', '& .MuiAlert-icon': { color: '#4fe1ff' } }}>{L.gasless}</Alert>
      
      <TextField fullWidth multiline rows={3} label={L.inputLabel} placeholder={L.inputPlaceholder} value={input} onChange={(e) => setInput(e.target.value)} disabled={isLoading} sx={{ mb: 2, '& .MuiOutlinedInput-root': { bgcolor: 'rgba(255,255,255,0.03)' } }} />
      
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      
      {paymentRequirement && status !== 'success' && (
        <Paper variant="outlined" sx={{ p: 2, mb: 2, bgcolor: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,193,7,0.3)' }}>
          <Typography variant="body2" sx={{ fontWeight: 600, color: '#ffc107', mb: 1 }}>{L.paymentRequired}</Typography>
          <Stack spacing={0.5}>
            <Typography variant="body2" sx={{ color: '#ffffffcc' }}><strong>{L.price}:</strong> {formatUsdcPrice(paymentRequirement.maxAmountRequired)} USDC</Typography>
            <Typography variant="body2" sx={{ color: '#ffffffaa', fontSize: '0.8rem' }}><strong>{L.recipient}:</strong> {paymentRequirement.payTo.slice(0, 10)}...{paymentRequirement.payTo.slice(-8)}</Typography>
          </Stack>
        </Paper>
      )}
      
      {isLoading && (
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
          <CircularProgress size={20} sx={{ color: '#4fe1ff' }} />
          <Typography variant="body2" sx={{ color: '#4fe1ff' }}>{getStatusMessage()}</Typography>
        </Stack>
      )}
      
      {status === 'success' && result && (
        <Paper variant="outlined" sx={{ p: 2, mb: 2, bgcolor: 'rgba(76, 175, 80, 0.08)', borderColor: 'rgba(76, 175, 80, 0.3)' }}>
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
            <CheckCircleIcon sx={{ color: '#4caf50', fontSize: 20 }} />
            <Typography variant="body2" sx={{ fontWeight: 600, color: '#4caf50' }}>{L.success}</Typography>
            {latencyMs && <Chip label={`${latencyMs}ms`} size="small" sx={{ bgcolor: 'rgba(255,255,255,0.1)', color: '#fff', fontSize: '0.7rem', height: 18 }} />}
          </Stack>
          <Box sx={{ bgcolor: 'rgba(0,0,0,0.3)', p: 1.5, borderRadius: 1, fontFamily: 'monospace', fontSize: '0.85rem', color: '#fff', whiteSpace: 'pre-wrap', wordBreak: 'break-word', maxHeight: 200, overflow: 'auto' }}>
            {typeof result === 'string' ? result : JSON.stringify(result, null, 2)}
          </Box>
          <Collapse in={showDetails}>
            <Stack spacing={1} sx={{ mt: 2 }}>
              {txHash && (
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Typography variant="caption" sx={{ color: '#ffffffaa' }}>{L.txHashLabel}:</Typography>
                  <Typography variant="caption" sx={{ color: '#fff', fontFamily: 'monospace' }}>{txHash.slice(0, 10)}...{txHash.slice(-8)}</Typography>
                  <Tooltip title={copied ? L.copiedText : 'Copy'}><IconButton size="small" onClick={() => copyToClipboard(txHash)}><ContentCopyIcon sx={{ fontSize: 14, color: '#ffffffaa' }} /></IconButton></Tooltip>
                  {explorerUrl && <Tooltip title={L.viewOnExplorer}><IconButton size="small" component="a" href={explorerUrl} target="_blank"><OpenInNewIcon sx={{ fontSize: 14, color: '#ffffffaa' }} /></IconButton></Tooltip>}
                </Stack>
              )}
            </Stack>
          </Collapse>
          <Button size="small" onClick={() => setShowDetails(!showDetails)} endIcon={showDetails ? <ExpandLessIcon /> : <ExpandMoreIcon />} sx={{ mt: 1, color: '#ffffffaa' }}>{showDetails ? L.hideDetails : L.showDetails}</Button>
        </Paper>
      )}
      
      <Stack direction="row" spacing={2}>
        {(status === 'idle' || status === 'error') && (
          <Button variant="contained" startIcon={<PlayArrowIcon />} onClick={runInference} disabled={!isConnected || !input.trim()} sx={{ background: 'linear-gradient(135deg, #9c27b0 0%, #2196f3 100%)', '&:hover': { background: 'linear-gradient(135deg, #7b1fa2 0%, #1976d2 100%)' }, '&:disabled': { background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.3)' } }}>
            {!isConnected ? L.connectWallet : L.runButton}
          </Button>
        )}
        {status === 'success' && <Button variant="outlined" onClick={reset} sx={{ borderColor: 'rgba(255,255,255,0.3)', color: '#fff' }}>{L.tryAgain}</Button>}
      </Stack>
      
      <Typography variant="caption" sx={{ display: 'block', mt: 2, color: '#ffffff66' }}>
        Powered by <MuiLink href="https://build.avax.network/academy/blockchain/x402-payment-infrastructure" target="_blank" sx={{ color: '#4fe1ff' }}>x402 Protocol</MuiLink> on Avalanche
      </Typography>
    </Paper>
  )
}
