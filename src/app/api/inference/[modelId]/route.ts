import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// ===== x402 Protocol Configuration =====

const CHAIN_ID = 43113 // Avalanche Fuji
const NETWORK = 'avalanche-fuji'

// USDC on Avalanche Fuji (official x402 token)
const USDC_ADDRESS = '0x5425890298aed601595a70AB815c96711a31Bc65'
const USDC_DECIMALS = 6

// Ultravioleta DAO Facilitator
const FACILITATOR_URL = process.env.X402_FACILITATOR_URL || 'https://facilitator.ultravioletadao.xyz'

// Default price per inference in USDC base units (0.01 USDC = 10000)
const DEFAULT_PRICE_USDC = process.env.X402_DEFAULT_PRICE_USDC || '10000' // $0.01

// Payment validity window (60 seconds as per x402 spec)
const MAX_TIMEOUT_SECONDS = 60

// In-memory nonce tracking (replay protection)
const usedNonces = new Set<string>()

// Rate limiting
const hits = new Map<string, { count: number; resetAt: number }>()

// Inference history (in-memory, last 100 per model)
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
}

const inferenceHistory = new Map<string, InferenceRecord[]>()
const MAX_HISTORY_PER_MODEL = 100

function recordInference(record: InferenceRecord) {
  const key = record.modelId
  const history = inferenceHistory.get(key) || []
  history.unshift(record)
  if (history.length > MAX_HISTORY_PER_MODEL) {
    history.pop()
  }
  inferenceHistory.set(key, history)
}

export function getInferenceHistory(modelId?: string, payer?: string, limit = 20): InferenceRecord[] {
  let results: InferenceRecord[] = []
  
  if (modelId) {
    results = inferenceHistory.get(modelId) || []
  } else {
    // Get all history across models
    for (const records of inferenceHistory.values()) {
      results.push(...records)
    }
    // Sort by timestamp descending
    results.sort((a, b) => b.timestamp - a.timestamp)
  }
  
  // Filter by payer if specified
  if (payer) {
    results = results.filter(r => r.payer.toLowerCase() === payer.toLowerCase())
  }
  
  return results.slice(0, limit)
}

function identify(req: NextRequest) {
  const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0]?.trim()
  return ip || 'unknown'
}

function rateLimit(key: string, max: number, windowMs: number) {
  const now = Date.now()
  const cur = hits.get(key)
  if (!cur || now > cur.resetAt) {
    hits.set(key, { count: 1, resetAt: now + windowMs })
    return { ok: true, remaining: max - 1 }
  }
  if (cur.count >= max) {
    return { ok: false, remaining: 0 }
  }
  cur.count += 1
  return { ok: true, remaining: max - cur.count }
}

// ===== Model Configuration =====

// Model configuration type for HuggingFace inference
interface ModelConfig {
  hfModel: string
  type: 'zero-shot-classification' | 'text-generation' | 'sentiment-analysis' | 'text2text-generation'
  defaultLabels?: string[]
  name: string
  description: string
  priceUsdc: number // Price in USDC (e.g., 0.01 = $0.01)
  agentId: number
  systemPrompt?: string
}

// ===== HARDCODED MODELS FOR MVP =====
// These 3 models are pre-configured for the hackathon demo
// All use HuggingFace free tier inference API

const HARDCODED_MODELS: Record<string, ModelConfig> = {
  // Model ID 14: Solidity Code Assistant
  // Uses Flan-T5 for code explanation/generation (free tier friendly)
  '14': {
    hfModel: 'google/flan-t5-base',
    type: 'text2text-generation',
    name: 'Solidity Code Assistant',
    description: 'AI assistant for Solidity smart contract development. Explains code, suggests improvements, and helps with blockchain development.',
    priceUsdc: 0.02,
    agentId: 1,
    systemPrompt: 'You are a Solidity smart contract expert. Help developers write, understand, and improve their blockchain code.'
  },
  
  // Model ID 20: Crypto/Financial Sentiment Analyzer
  // Uses FinBERT - specifically trained for financial sentiment (free tier)
  '20': {
    hfModel: 'ProsusAI/finbert',
    type: 'sentiment-analysis',
    name: 'Crypto Sentiment Analyzer',
    description: 'Analyzes sentiment of crypto and financial news. Returns positive, negative, or neutral classification with confidence scores.',
    priceUsdc: 0.005,
    agentId: 2
  },
  
  // Model ID 23: Blockchain Topic Classifier
  // Uses BART for zero-shot classification with blockchain-specific labels
  '23': {
    hfModel: 'facebook/bart-large-mnli',
    type: 'zero-shot-classification',
    name: 'Blockchain Topic Classifier',
    description: 'Classifies blockchain-related text into categories: DeFi, NFT, Layer2, Security, Governance, Trading, Development.',
    priceUsdc: 0.01,
    agentId: 3,
    defaultLabels: ['DeFi', 'NFT', 'Layer 2', 'Security', 'Governance', 'Trading', 'Development', 'Tokenomics']
  }
}

// Fallback config for non-hardcoded models
const DEFAULT_MODEL_CONFIG: ModelConfig = {
  hfModel: 'facebook/bart-large-mnli',
  type: 'zero-shot-classification',
  name: 'AI Classifier',
  description: 'General purpose text classification',
  priceUsdc: 0.01,
  agentId: 0,
  defaultLabels: ['positive', 'negative', 'neutral', 'question', 'statement']
}

// ===== Helper Functions =====

interface ModelInfo {
  pricePerInference: string // USDC base units
  recipientWallet: string
  name: string
  agentId: number
}

// Default recipient wallet for hardcoded models (can be overridden per model)
const DEFAULT_RECIPIENT_WALLET = process.env.X402_DEFAULT_RECIPIENT || '0x0000000000000000000000000000000000000000'

async function getModelInfo(modelId: string): Promise<ModelInfo | null> {
  // First check if this is a hardcoded model
  const hardcodedConfig = HARDCODED_MODELS[modelId]
  
  if (hardcodedConfig) {
    // Use hardcoded config - convert price from USDC to base units
    const pricePerInference = Math.floor(hardcodedConfig.priceUsdc * Math.pow(10, USDC_DECIMALS)).toString()
    
    console.log(`[x402] Using hardcoded model ${modelId}:`, {
      name: hardcodedConfig.name,
      priceUsdc: hardcodedConfig.priceUsdc,
      pricePerInference,
      priceFormatted: formatUsdcPrice(pricePerInference),
      agentId: hardcodedConfig.agentId
    })
    
    // Try to get recipient wallet from indexed model, fall back to default
    let recipientWallet = DEFAULT_RECIPIENT_WALLET
    try {
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
      const res = await fetch(`${baseUrl}/api/indexed/models/${modelId}`, {
        headers: { 'Cache-Control': 'no-cache' }
      })
      if (res.ok) {
        const data = await res.json()
        if (data.model?.creator || data.model?.owner) {
          recipientWallet = data.model.creator || data.model.owner
        }
      }
    } catch (e) {
      console.warn(`[x402] Could not fetch recipient wallet for model ${modelId}, using default`)
    }
    
    return {
      pricePerInference,
      recipientWallet,
      name: hardcodedConfig.name,
      agentId: hardcodedConfig.agentId,
    }
  }
  
  // Not a hardcoded model - try to fetch from indexed data
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
    const res = await fetch(`${baseUrl}/api/indexed/models/${modelId}`, {
      headers: { 'Cache-Control': 'no-cache' }
    })
    if (!res.ok) return null
    
    const data = await res.json()
    if (!data.model) return null
    
    const model = data.model
    const metadata = typeof model.metadata === 'string' 
      ? JSON.parse(model.metadata) 
      : model.metadata || {}
    
    // Get price per inference from metadata (multiple possible locations)
    // Priority: licensePolicy.inference.pricePerCall > pricePerInference > default
    let pricePerInference = DEFAULT_PRICE_USDC
    
    // Check new format: licensePolicy.inference.pricePerCall (human readable like "0.005")
    const inferencePrice = metadata?.licensePolicy?.inference?.pricePerCall
    if (inferencePrice) {
      // Convert from human readable (e.g., "0.005") to USDC base units (6 decimals)
      const priceFloat = parseFloat(inferencePrice)
      if (!isNaN(priceFloat)) {
        pricePerInference = Math.floor(priceFloat * Math.pow(10, USDC_DECIMALS)).toString()
      }
    }
    // Fallback: legacy format pricePerInference
    else if (metadata?.pricePerInference) {
      const legacyPrice = parseFloat(metadata.pricePerInference)
      if (!isNaN(legacyPrice)) {
        // If it's already in base units (large number), use as is
        // If it's human readable (small number), convert
        if (legacyPrice > 1000) {
          pricePerInference = Math.floor(legacyPrice).toString()
        } else {
          pricePerInference = Math.floor(legacyPrice * Math.pow(10, USDC_DECIMALS)).toString()
        }
      }
    }
    
    // Get recipient wallet (creator gets paid)
    const recipientWallet = model.creator || model.owner
    
    // Get agentId from AgentRegistry (stored in metadata or needs lookup)
    const agentId = metadata?.agentId || model.agentId || 0
    
    console.log(`[x402] Model ${modelId} info from index:`, {
      name: model.name,
      pricePerInference,
      priceFormatted: formatUsdcPrice(pricePerInference),
      recipientWallet,
      agentId
    })
    
    return {
      pricePerInference,
      recipientWallet,
      name: model.name || metadata?.name || `Model #${modelId}`,
      agentId,
    }
  } catch (e) {
    console.error('Failed to fetch model info:', e)
    return null
  }
}

// ===== x402 Payment Types =====

interface X402PaymentPayload {
  x402Version: number
  scheme: string
  network: string
  payload: {
    signature: string
    authorization: {
      from: string
      to: string
      value: string
      validAfter: string
      validBefore: string
      nonce: string
    }
  }
}

interface X402PaymentRequirement {
  scheme: string
  network: string
  maxAmountRequired: string
  resource: string
  description: string
  mimeType: string
  payTo: string
  asset: string
  maxTimeoutSeconds: number
}

// ===== x402 Verification via Facilitator =====

// For local development with ngrok:
// 1. Run: ngrok http 3000
// 2. Set NEXT_PUBLIC_BASE_URL=https://your-ngrok-url.ngrok-free.app in .env.local
// 3. Restart the dev server
// 
// Mock mode (X402_MOCK_MODE=true) skips facilitator for UI testing only
const MOCK_MODE = process.env.X402_MOCK_MODE === 'true'

async function verifyPaymentWithFacilitator(
  paymentHeader: string,
  requirement: X402PaymentRequirement
): Promise<{ valid: boolean; error?: string; txHash?: string; payer?: string }> {
  try {
    // Decode base64 payment payload
    const payloadJson = Buffer.from(paymentHeader, 'base64').toString('utf-8')
    const payment: X402PaymentPayload = JSON.parse(payloadJson)
    
    // Validate x402 version
    if (payment.x402Version !== 1) {
      return { valid: false, error: 'Unsupported x402 version' }
    }
    
    // Validate scheme
    if (payment.scheme !== 'exact') {
      return { valid: false, error: 'Unsupported payment scheme' }
    }
    
    // Validate network
    if (payment.network !== NETWORK) {
      return { valid: false, error: `Wrong network: expected ${NETWORK}` }
    }
    
    // Check nonce for replay protection
    const nonce = payment.payload.authorization.nonce
    if (usedNonces.has(nonce)) {
      return { valid: false, error: 'Payment nonce already used' }
    }
    
    // Validate amount
    const paymentAmount = BigInt(payment.payload.authorization.value)
    const requiredAmount = BigInt(requirement.maxAmountRequired)
    if (paymentAmount < requiredAmount) {
      return { valid: false, error: `Insufficient payment: need ${requirement.maxAmountRequired}, got ${payment.payload.authorization.value}` }
    }
    
    // Validate recipient
    if (payment.payload.authorization.to.toLowerCase() !== requirement.payTo.toLowerCase()) {
      return { valid: false, error: 'Payment to wrong recipient' }
    }
    
    // Validate time window
    const now = Math.floor(Date.now() / 1000)
    const validAfter = parseInt(payment.payload.authorization.validAfter)
    const validBefore = parseInt(payment.payload.authorization.validBefore)
    
    if (now < validAfter) {
      return { valid: false, error: 'Payment not yet valid' }
    }
    if (now > validBefore) {
      return { valid: false, error: 'Payment expired' }
    }
    

    if (MOCK_MODE) {
      console.log('[x402 MOCK] Simulating successful payment settlement')
      console.log('[x402 MOCK] Payer:', payment.payload.authorization.from)
      console.log('[x402 MOCK] Amount:', payment.payload.authorization.value, 'USDC base units')
      
      // Mark nonce as used (replay protection still works in mock mode)
      usedNonces.add(nonce)
      
      // Return mock success with fake txHash
      return {
        valid: true,
        txHash: `0xmock_${Date.now().toString(16)}_${nonce.slice(2, 10)}`,
        payer: payment.payload.authorization.from
      }
    }
    
    // Call facilitator to verify and settle
    // x402 spec: x402Version at root AND inside paymentPayload, NOT in paymentRequirements
    const settleRequest = {
      x402Version: payment.x402Version,
      paymentPayload: {
        x402Version: payment.x402Version,
        scheme: payment.scheme,
        network: payment.network,
        payload: payment.payload
      },
      paymentRequirements: requirement
    }
    
    console.log('[x402] Sending to facilitator for resource:', requirement.resource)
    
    const settleRes = await fetch(`${FACILITATOR_URL}/settle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settleRequest)
    })
    
    if (!settleRes.ok) {
      const errData = await settleRes.json().catch(() => ({}))
      return { valid: false, error: errData.error || `Facilitator error: ${settleRes.status}` }
    }
    
    const settleData = await settleRes.json()
    
    if (!settleData.success) {
      return { valid: false, error: settleData.errorReason || 'Settlement failed' }
    }
    
    // Mark nonce as used
    usedNonces.add(nonce)
    
    return {
      valid: true,
      txHash: settleData.transaction,
      payer: payment.payload.authorization.from
    }
  } catch (e: any) {
    console.error('x402 verification error:', e)
    return { valid: false, error: e.message || 'Payment verification failed' }
  }
}

// ===== Real AI Inference via HuggingFace =====

const HF_API_URL = 'https://api-inference.huggingface.co/models'
const HF_TOKEN = process.env.HUGGINGFACE_API_TOKEN

// Get model config - prioritize hardcoded, then fall back to dynamic lookup
function getModelConfig(modelId: string): ModelConfig {
  // Check hardcoded models first
  if (HARDCODED_MODELS[modelId]) {
    console.log(`[x402] Using hardcoded config for model ${modelId}:`, HARDCODED_MODELS[modelId].name)
    return HARDCODED_MODELS[modelId]
  }
  
  // Fall back to default
  console.log(`[x402] Model ${modelId} not in hardcoded list, using default config`)
  return { ...DEFAULT_MODEL_CONFIG, agentId: parseInt(modelId) || 0 }
}

interface InferenceInput {
  text?: string
  labels?: string[]
  prompt?: string
  modelType?: string
}

async function runInference(modelId: string, input: InferenceInput, agentId: number) {
  const started = Date.now()
  
  // Get model config from hardcoded list or default
  const config = getModelConfig(modelId)
  
  // Override agentId from config if available
  const effectiveAgentId = config.agentId || agentId
  
  // If no HF token, fall back to mock
  if (!HF_TOKEN) {
    console.warn('[Inference] No HUGGINGFACE_API_TOKEN set, using mock response')
    return runMockInference(modelId, input, effectiveAgentId, started, config)
  }
  
  try {
    let hfResponse: any
    const text = input.text || input.prompt || String(input)
    
    console.log(`[Inference] Running ${config.type} on model ${modelId} (${config.name})`)
    
    if (config.type === 'text2text-generation') {
      // Text-to-text generation (Flan-T5, etc.)
      // Add system prompt context if available
      const prompt = config.systemPrompt 
        ? `${config.systemPrompt}\n\nUser: ${text}\n\nAssistant:`
        : text
      
      const response = await fetch(`${HF_API_URL}/${config.hfModel}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${HF_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          inputs: prompt,
          parameters: {
            max_new_tokens: 256,
            temperature: 0.7,
            do_sample: true
          }
        })
      })
      
      if (!response.ok) {
        const error = await response.text()
        console.error('[HuggingFace] API error:', error)
        throw new Error(`HuggingFace API error: ${response.status}`)
      }
      
      hfResponse = await response.json()
      
      // Handle response format
      const generatedText = Array.isArray(hfResponse) 
        ? hfResponse[0]?.generated_text || hfResponse[0]
        : hfResponse.generated_text || hfResponse
      
      return {
        output: {
          task: 'text2text-generation',
          input_text: text,
          generated_text: typeof generatedText === 'string' ? generatedText : JSON.stringify(generatedText),
          model: config.hfModel,
          model_name: config.name,
          agent: `agent-${effectiveAgentId}`,
          timestamp: new Date().toISOString()
        },
        latencyMs: Date.now() - started,
        modelId,
        agentId: effectiveAgentId
      }
      
    } else if (config.type === 'zero-shot-classification') {
      // Zero-shot classification (BART, etc.)
      const candidateLabels = input.labels || config.defaultLabels || ['positive', 'negative', 'neutral']
      
      const response = await fetch(`${HF_API_URL}/${config.hfModel}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${HF_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          inputs: text,
          parameters: { candidate_labels: candidateLabels }
        })
      })
      
      if (!response.ok) {
        const error = await response.text()
        console.error('[HuggingFace] API error:', error)
        throw new Error(`HuggingFace API error: ${response.status}`)
      }
      
      hfResponse = await response.json()
      
      // Handle both array format (new API) and object format (old API)
      let resultLabels: string[]
      let resultScores: number[]
      
      if (Array.isArray(hfResponse)) {
        resultLabels = hfResponse.map((item: any) => item.label)
        resultScores = hfResponse.map((item: any) => item.score)
      } else {
        resultLabels = hfResponse.labels || []
        resultScores = hfResponse.scores || []
      }
      
      return {
        output: {
          task: 'zero-shot-classification',
          input_text: text,
          labels: resultLabels,
          scores: resultScores,
          top_label: resultLabels[0],
          top_score: resultScores[0],
          model: config.hfModel,
          model_name: config.name,
          agent: `agent-${effectiveAgentId}`,
          timestamp: new Date().toISOString()
        },
        latencyMs: Date.now() - started,
        modelId,
        agentId: effectiveAgentId
      }
      
    } else if (config.type === 'sentiment-analysis') {
      // Sentiment analysis (FinBERT, etc.)
      const response = await fetch(`${HF_API_URL}/${config.hfModel}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${HF_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ inputs: text })
      })
      
      if (!response.ok) {
        const error = await response.text()
        console.error('[HuggingFace] API error:', error)
        throw new Error(`HuggingFace API error: ${response.status}`)
      }
      
      hfResponse = await response.json()
      
      // Format sentiment response - FinBERT returns [[{label, score}, ...]]
      const sentiments = Array.isArray(hfResponse[0]) ? hfResponse[0] : hfResponse
      const topSentiment = sentiments.reduce((a: any, b: any) => a.score > b.score ? a : b, { label: 'unknown', score: 0 })
      
      return {
        output: {
          task: 'sentiment-analysis',
          input_text: text,
          sentiment: topSentiment.label,
          confidence: topSentiment.score,
          all_scores: sentiments,
          model: config.hfModel,
          model_name: config.name,
          agent: `agent-${effectiveAgentId}`,
          timestamp: new Date().toISOString()
        },
        latencyMs: Date.now() - started,
        modelId,
        agentId: effectiveAgentId
      }
      
    } else {
      // Fallback to mock for unsupported types
      return runMockInference(modelId, input, effectiveAgentId, started, config)
    }
    
  } catch (error: any) {
    console.error('[Inference] HuggingFace error:', error.message)
    // Fall back to mock on error
    return runMockInference(modelId, input, effectiveAgentId, started, config, error.message)
  }
}

// Fallback mock inference
function runMockInference(modelId: string, input: any, agentId: number, started: number, config?: ModelConfig, error?: string) {
  const modelName = config?.name || `Model #${modelId}`
  return {
    output: {
      task: 'mock',
      input_received: input,
      prediction: Math.random().toFixed(4),
      confidence: (0.7 + Math.random() * 0.25).toFixed(4),
      model: config?.hfModel || `model-${modelId}`,
      model_name: modelName,
      agent: `agent-${agentId}`,
      timestamp: new Date().toISOString(),
      note: error ? `Fallback to mock: ${error}` : 'Mock inference (set HUGGINGFACE_API_TOKEN for real AI)'
    },
    latencyMs: Date.now() - started,
    modelId,
    agentId
  }
}

// ===== x402 Response Helpers =====

function formatUsdcPrice(baseUnits: string): string {
  const value = parseFloat(baseUnits) / Math.pow(10, USDC_DECIMALS)
  return `$${value.toFixed(2)}`
}

function createPaymentRequirement(
  modelId: string,
  modelInfo: ModelInfo
): X402PaymentRequirement {
  // Facilitator requires absolute URL for resource field
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://wasiai.com'
  
  return {
    scheme: 'exact',
    network: NETWORK,
    maxAmountRequired: modelInfo.pricePerInference,
    resource: `${baseUrl}/api/inference/${modelId}`,
    description: `AI inference on ${modelInfo.name}`,
    mimeType: 'application/json',
    payTo: modelInfo.recipientWallet,
    asset: USDC_ADDRESS,
    maxTimeoutSeconds: MAX_TIMEOUT_SECONDS
  }
}

function encodePaymentResponse(success: boolean, txHash?: string, payer?: string, error?: string): string {
  const response = {
    success,
    transaction: txHash || null,
    network: NETWORK,
    payer: payer || null,
    errorReason: error || null
  }
  return Buffer.from(JSON.stringify(response)).toString('base64')
}

// ===== API Handler =====

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ modelId: string }> }
) {
  const { modelId } = await params
  
  // Rate limiting
  const clientKey = identify(req)
  const rateKey = `x402:${modelId}:${clientKey}`
  const gate = rateLimit(rateKey, 10, 60_000)
  
  if (!gate.ok) {
    return NextResponse.json(
      { ok: false, error: 'rate_limited', message: 'Too many requests' },
      { status: 429 }
    )
  }
  
  // Get model info
  const modelInfo = await getModelInfo(modelId)
  if (!modelInfo) {
    return NextResponse.json(
      { ok: false, error: 'model_not_found', message: `Model ${modelId} not found` },
      { status: 404 }
    )
  }
  
  // Create payment requirement
  const paymentRequirement = createPaymentRequirement(modelId, modelInfo)
  
  // Check for X-PAYMENT header (x402 standard)
  const paymentHeader = req.headers.get('X-PAYMENT')
  
  if (!paymentHeader) {
    // Return 402 Payment Required with x402 format
    const response = NextResponse.json(
      {
        x402Version: 1,
        accepts: [paymentRequirement],
        error: 'X-PAYMENT header is required',
        // Additional info for debugging
        _info: {
          model: modelInfo.name,
          agentId: modelInfo.agentId,
          priceFormatted: formatUsdcPrice(modelInfo.pricePerInference),
          currency: 'USDC',
          facilitator: FACILITATOR_URL
        }
      },
      { status: 402 }
    )
    
    return response
  }
  
  // Verify payment via facilitator
  const verification = await verifyPaymentWithFacilitator(paymentHeader, paymentRequirement)
  
  if (!verification.valid) {
    const response = NextResponse.json(
      {
        x402Version: 1,
        accepts: [paymentRequirement],
        error: verification.error || 'Payment verification failed'
      },
      { status: 402 }
    )
    
    // Add X-PAYMENT-RESPONSE header with error
    response.headers.set(
      'X-PAYMENT-RESPONSE',
      encodePaymentResponse(false, undefined, undefined, verification.error)
    )
    
    return response
  }
  
  // Payment verified! Run inference
  let body: any = {}
  try {
    body = await req.json()
  } catch {
    // Empty body is ok
  }
  
  const result = await runInference(modelId, body.input, modelInfo.agentId)
  
  // Record inference in history
  const inputStr = typeof body.input === 'string' ? body.input : JSON.stringify(body.input || '')
  const outputStr = typeof result.output === 'string' ? result.output : JSON.stringify(result.output || '')
  
  recordInference({
    id: `${modelId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    modelId,
    modelName: modelInfo.name,
    agentId: modelInfo.agentId,
    payer: verification.payer || '',
    txHash: verification.txHash || '',
    amount: modelInfo.pricePerInference,
    amountFormatted: formatUsdcPrice(modelInfo.pricePerInference),
    inputPreview: inputStr.slice(0, 100) + (inputStr.length > 100 ? '...' : ''),
    outputPreview: outputStr.slice(0, 200) + (outputStr.length > 200 ? '...' : ''),
    latencyMs: result.latencyMs,
    timestamp: Date.now(),
  })
  
  // Success response with X-PAYMENT-RESPONSE header
  const response = NextResponse.json({
    ok: true,
    result: result.output,
    latencyMs: result.latencyMs,
    payment: {
      txHash: verification.txHash,
      payer: verification.payer,
      amount: modelInfo.pricePerInference,
      amountFormatted: formatUsdcPrice(modelInfo.pricePerInference),
      currency: 'USDC',
      verified: true,
    },
    agent: {
      id: modelInfo.agentId,
      name: modelInfo.name,
    },
  })
  
  response.headers.set(
    'X-PAYMENT-RESPONSE',
    encodePaymentResponse(true, verification.txHash, verification.payer)
  )
  
  return response
}

// GET handler for documentation
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ modelId: string }> }
) {
  const { modelId } = await params
  
  const modelInfo = await getModelInfo(modelId)
  if (!modelInfo) {
    return NextResponse.json(
      { ok: false, error: 'model_not_found', message: `Model ${modelId} not found` },
      { status: 404 }
    )
  }
  
  const paymentRequirement = createPaymentRequirement(modelId, modelInfo)
  
  return NextResponse.json({
    ok: true,
    x402Version: 1,
    endpoint: `/api/inference/${modelId}`,
    method: 'POST',
    description: `x402 pay-per-inference endpoint for ${modelInfo.name}`,
    pricing: {
      amount: modelInfo.pricePerInference,
      amountFormatted: formatUsdcPrice(modelInfo.pricePerInference),
      currency: 'USDC',
      asset: USDC_ADDRESS,
      chainId: CHAIN_ID,
      network: NETWORK,
    },
    agent: {
      id: modelInfo.agentId,
      name: modelInfo.name,
      wallet: modelInfo.recipientWallet,
    },
    paymentRequirement,
    facilitator: FACILITATOR_URL,
    usage: {
      step1: 'POST to this endpoint without X-PAYMENT header to get 402 response',
      step2: 'Use x402-client or sign EIP-3009 authorization for USDC transfer',
      step3: 'POST again with X-PAYMENT header containing base64-encoded payment',
      step4: 'Receive inference result with X-PAYMENT-RESPONSE header',
    },
    headers: {
      'X-PAYMENT': 'Base64-encoded x402 payment payload (EIP-3009 authorization)',
      'Content-Type': 'application/json',
    },
    body: {
      input: 'Your inference input (format depends on model)',
    },
    links: {
      x402Docs: 'https://build.avax.network/academy/blockchain/x402-payment-infrastructure',
      facilitator: FACILITATOR_URL,
    }
  })
}
