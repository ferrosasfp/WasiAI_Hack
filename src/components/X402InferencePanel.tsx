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
import InferenceFeedback from './InferenceFeedback'

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

// Circle USDC for x402 (different from MockUSDC for licenses)
const USDC_ADDRESS = process.env.NEXT_PUBLIC_X402_USDC_ADDRESS || '0x5425890298aed601595a70AB815c96711a31Bc65'
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
  // Use 4 decimals for small inference costs
  return `$${value.toFixed(4)}`
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
  pricePerInference,
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
    title: isES ? '🚀 Ejecutar Modelo' : '🚀 Run Model',
    subtitle: isES ? 'Prueba el modelo con pago por uso' : 'Try the model with pay-per-use',
    description: isES 
      ? '1. Escribe tu entrada → 2. Firma con tu wallet → 3. Recibe el resultado' 
      : '1. Enter your input → 2. Sign with wallet → 3. Get results',
    inputLabel: isES ? 'Tu entrada' : 'Your input',
    inputPlaceholder: isES ? 'Escribe el texto o datos que quieres procesar...' : 'Enter the text or data you want to process...',
    runButton: isES ? 'Ejecutar modelo' : 'Run model',
    connectWallet: isES ? 'Conecta tu wallet' : 'Connect your wallet',
    checking: isES ? 'Verificando precio...' : 'Checking price...',
    paymentRequired: isES ? 'Confirma el pago' : 'Confirm payment',
    signing: isES ? 'Firma la autorización en tu wallet...' : 'Sign authorization in your wallet...',
    settling: isES ? 'Procesando pago (sin gas)...' : 'Processing payment (gasless)...',
    running: isES ? 'Ejecutando modelo...' : 'Running model...',
    success: isES ? '✅ Resultado listo' : '✅ Result ready',
    price: isES ? 'Costo' : 'Cost',
    pricePerRun: isES ? 'Precio por ejecución' : 'Price per run',
    recipient: isES ? 'Creador' : 'Creator',
    txHashLabel: isES ? 'Transacción' : 'Transaction',
    viewOnExplorer: isES ? 'Ver en explorador' : 'View on explorer',
    showDetails: isES ? 'Ver detalles técnicos' : 'View technical details',
    hideDetails: isES ? 'Ocultar detalles' : 'Hide details',
    agentBadge: isES ? 'Agente IA' : 'AI Agent',
    copiedText: isES ? '¡Copiado!' : 'Copied!',
    tryAgain: isES ? 'Ejecutar de nuevo' : 'Run again',
    gasless: isES ? '⚡ Sin gas requerido - El facilitador cubre las fees de red' : '⚡ No gas required - Facilitator covers network fees',
    protocol: 'x402',
    howItWorks: isES ? 'Cómo funciona' : 'How it works',
    step1: isES ? 'Escribe tu entrada' : 'Enter your input',
    step2: isES ? 'Firma el pago (USDC)' : 'Sign payment (USDC)',
    step3: isES ? 'Recibe el resultado' : 'Get your result',
    textClassification: isES ? 'Clasificación del texto:' : 'Text classification:',
    confidence: isES ? 'Confianza' : 'Confidence',
    allCategories: isES ? 'Todas las categorías:' : 'All categories:',
    sentimentAnalysis: isES ? 'Análisis de sentimiento:' : 'Sentiment analysis:',
    positive: isES ? '😊 Positivo' : '😊 Positive',
    negative: isES ? '😞 Negativo' : '😞 Negative',
    neutral: isES ? '😐 Neutral' : '😐 Neutral',
    copy: isES ? 'Copiar' : 'Copy',
    poweredBy: isES ? 'Impulsado por' : 'Powered by',
    onAvalanche: isES ? 'en Avalanche' : 'on Avalanche',
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
      // Detect ngrok/facilitator connection errors
      const errMsg = err.message || 'An error occurred'
      if (errMsg.includes('NullResp') || errMsg.includes('TransportError') || errMsg.includes('Failed to fetch')) {
        const ngrokError = isES 
          ? 'Error de conexión con el facilitador x402. Asegúrate de que ngrok esté corriendo (ngrok http 3000) y que NEXT_PUBLIC_BASE_URL esté configurado con tu URL de ngrok.'
          : 'x402 facilitator connection error. Make sure ngrok is running (ngrok http 3000) and NEXT_PUBLIC_BASE_URL is set to your ngrok URL.'
        setError(ngrokError)
      } else {
        setError(errMsg)
      }
      setStatus('error')
    }
  }, [isConnected, address, modelId, input, signTypedDataAsync, L.connectWallet, isES])
  
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
  
  // Get price from payment requirement, prop, or show default
  const displayPrice = paymentRequirement 
    ? formatUsdcPrice(paymentRequirement.maxAmountRequired)
    : pricePerInference 
      ? `$${pricePerInference}` 
      : '$0.001' // Default display price
  
  return (
    <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 }, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(79, 225, 255, 0.2)' }}>
      {/* Header */}
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <Typography variant="h6" sx={{ fontWeight: 700, color: '#fff' }}>{L.title}</Typography>
          <Chip label={L.protocol} size="small" sx={{ bgcolor: 'rgba(79, 225, 255, 0.15)', color: '#4fe1ff', fontSize: '0.7rem', height: 20 }} />
        </Stack>
        {/* Price badge */}
        <Box sx={{ 
          bgcolor: 'rgba(76, 175, 80, 0.15)', 
          border: '1px solid rgba(76, 175, 80, 0.3)',
          borderRadius: 2,
          px: 2,
          py: 0.75
        }}>
          <Typography variant="caption" sx={{ color: '#ffffffaa', display: 'block', fontSize: '0.65rem', textTransform: 'uppercase' }}>
            {L.pricePerRun}
          </Typography>
          <Typography variant="body1" sx={{ color: '#4caf50', fontWeight: 700 }}>
            {displayPrice} <span style={{ fontSize: '0.75rem', fontWeight: 400 }}>USDC</span>
          </Typography>
        </Box>
      </Stack>
      
      <Typography variant="body2" sx={{ color: '#ffffffcc', mb: 2 }}>{L.subtitle}</Typography>
      
      {/* How it works - Steps */}
      <Box sx={{ 
        display: 'flex', 
        gap: 2, 
        mb: 2.5, 
        p: 1.5, 
        bgcolor: 'rgba(255,255,255,0.03)', 
        borderRadius: 1.5,
        border: '1px solid rgba(255,255,255,0.06)'
      }}>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ flex: 1 }}>
          <Box sx={{ width: 24, height: 24, borderRadius: '50%', bgcolor: 'rgba(79, 225, 255, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Typography variant="caption" sx={{ color: '#4fe1ff', fontWeight: 700 }}>1</Typography>
          </Box>
          <Typography variant="caption" sx={{ color: '#ffffffaa' }}>{L.step1}</Typography>
        </Stack>
        <Typography sx={{ color: '#ffffff44' }}>→</Typography>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ flex: 1 }}>
          <Box sx={{ width: 24, height: 24, borderRadius: '50%', bgcolor: 'rgba(156, 39, 176, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Typography variant="caption" sx={{ color: '#ce93d8', fontWeight: 700 }}>2</Typography>
          </Box>
          <Typography variant="caption" sx={{ color: '#ffffffaa' }}>{L.step2}</Typography>
        </Stack>
        <Typography sx={{ color: '#ffffff44' }}>→</Typography>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ flex: 1 }}>
          <Box sx={{ width: 24, height: 24, borderRadius: '50%', bgcolor: 'rgba(76, 175, 80, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Typography variant="caption" sx={{ color: '#4caf50', fontWeight: 700 }}>3</Typography>
          </Box>
          <Typography variant="caption" sx={{ color: '#ffffffaa' }}>{L.step3}</Typography>
        </Stack>
      </Box>
      
      {/* Gasless notice */}
      <Alert 
        severity="info" 
        icon={false}
        sx={{ 
          mb: 2, 
          bgcolor: 'rgba(79, 225, 255, 0.06)', 
          border: '1px solid rgba(79, 225, 255, 0.15)',
          '& .MuiAlert-message': { color: '#4fe1ff', fontSize: '0.8rem' }
        }}
      >
        {L.gasless}
      </Alert>
      
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
          
          {/* Visual result display for classification tasks */}
          {result.task === 'zero-shot-classification' && result.labels && result.scores && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" sx={{ color: '#ffffffaa', mb: 1.5 }}>
                {L.textClassification}
              </Typography>
              <Box sx={{ bgcolor: 'rgba(156, 39, 176, 0.15)', p: 2, borderRadius: 1, mb: 2 }}>
                <Typography variant="h6" sx={{ color: '#ce93d8', fontWeight: 700 }}>
                  {result.top_label}
                </Typography>
                <Typography variant="body2" sx={{ color: '#ffffffaa' }}>
                  {L.confidence}: {(result.top_score * 100).toFixed(1)}%
                </Typography>
              </Box>
              <Typography variant="caption" sx={{ color: '#ffffff88', display: 'block', mb: 1 }}>
                {L.allCategories}
              </Typography>
              <Stack spacing={0.5}>
                {result.labels.map((label: string, idx: number) => (
                  <Box key={label} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ flex: 1, bgcolor: 'rgba(255,255,255,0.1)', borderRadius: 1, overflow: 'hidden', height: 20 }}>
                      <Box sx={{ width: `${result.scores[idx] * 100}%`, bgcolor: idx === 0 ? '#9c27b0' : 'rgba(156, 39, 176, 0.5)', height: '100%', transition: 'width 0.3s' }} />
                    </Box>
                    <Typography variant="caption" sx={{ color: '#fff', minWidth: 120 }}>{label}</Typography>
                    <Typography variant="caption" sx={{ color: '#ffffffaa', minWidth: 45, textAlign: 'right' }}>{(result.scores[idx] * 100).toFixed(1)}%</Typography>
                  </Box>
                ))}
              </Stack>
            </Box>
          )}
          
          {/* Visual result display for sentiment analysis */}
          {result.task === 'sentiment-analysis' && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" sx={{ color: '#ffffffaa', mb: 1.5 }}>
                {L.sentimentAnalysis}
              </Typography>
              <Box sx={{ 
                bgcolor: result.sentiment === 'positive' ? 'rgba(76, 175, 80, 0.15)' : 
                         result.sentiment === 'negative' ? 'rgba(244, 67, 54, 0.15)' : 'rgba(255, 193, 7, 0.15)', 
                p: 2, borderRadius: 1 
              }}>
                <Typography variant="h6" sx={{ 
                  color: result.sentiment === 'positive' ? '#4caf50' : 
                         result.sentiment === 'negative' ? '#f44336' : '#ffc107',
                  fontWeight: 700, textTransform: 'capitalize'
                }}>
                  {result.sentiment === 'positive' ? L.positive :
                   result.sentiment === 'negative' ? L.negative :
                   L.neutral}
                </Typography>
                <Typography variant="body2" sx={{ color: '#ffffffaa' }}>
                  {L.confidence}: {(result.confidence * 100).toFixed(1)}%
                </Typography>
              </Box>
            </Box>
          )}
          
          {/* Raw JSON for other tasks or details */}
          <Collapse in={showDetails || (result.task !== 'zero-shot-classification' && result.task !== 'sentiment-analysis')}>
            <Box sx={{ bgcolor: 'rgba(0,0,0,0.3)', p: 1.5, borderRadius: 1, fontFamily: 'monospace', fontSize: '0.75rem', color: '#fff', whiteSpace: 'pre-wrap', wordBreak: 'break-word', maxHeight: 200, overflow: 'auto', mb: 1 }}>
              {typeof result === 'string' ? result : JSON.stringify(result, null, 2)}
            </Box>
          </Collapse>
          
          <Collapse in={showDetails}>
            <Stack spacing={1} sx={{ mt: 1 }}>
              {txHash && (
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Typography variant="caption" sx={{ color: '#ffffffaa' }}>{L.txHashLabel}:</Typography>
                  <Typography variant="caption" sx={{ color: '#fff', fontFamily: 'monospace' }}>{txHash.slice(0, 10)}...{txHash.slice(-8)}</Typography>
                  <Tooltip title={copied ? L.copiedText : L.copy}><IconButton size="small" onClick={() => copyToClipboard(txHash)}><ContentCopyIcon sx={{ fontSize: 14, color: '#ffffffaa' }} /></IconButton></Tooltip>
                  {explorerUrl && <Tooltip title={L.viewOnExplorer}><IconButton size="small" component="a" href={explorerUrl} target="_blank"><OpenInNewIcon sx={{ fontSize: 14, color: '#ffffffaa' }} /></IconButton></Tooltip>}
                </Stack>
              )}
            </Stack>
          </Collapse>
          <Button size="small" onClick={() => setShowDetails(!showDetails)} endIcon={showDetails ? <ExpandLessIcon /> : <ExpandMoreIcon />} sx={{ mt: 1, color: '#ffffffaa' }}>{showDetails ? L.hideDetails : L.showDetails}</Button>
          
          {/* Feedback component for on-chain reputation */}
          <InferenceFeedback
            agentId={agentId || Number(modelId)}
            inferenceHash={txHash || `inference-${modelId}-${Date.now()}`}
            locale={locale}
          />
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
        {L.poweredBy} <MuiLink href="https://build.avax.network/academy/blockchain/x402-payment-infrastructure" target="_blank" sx={{ color: '#4fe1ff' }}>x402 Protocol</MuiLink> {L.onAvalanche}
      </Typography>
    </Paper>
  )
}
