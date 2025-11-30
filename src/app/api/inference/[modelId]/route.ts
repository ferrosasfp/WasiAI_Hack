import { NextRequest, NextResponse } from 'next/server'
import { createPublicClient, http, encodeFunctionData, parseAbi } from 'viem'
import { avalancheFuji } from 'viem/chains'

export const dynamic = 'force-dynamic'

// ===== x402 Protocol Configuration =====

const CHAIN_ID = 43113 // Avalanche Fuji
const NETWORK = 'avalanche-fuji'
const AVAX_RPC = process.env.RPC_AVAX || 'https://api.avax-test.network/ext/bc/C/rpc'

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

// ===== Viem Client =====

const publicClient = createPublicClient({
  chain: avalancheFuji,
  transport: http(AVAX_RPC),
})

// ===== Helper Functions =====

interface ModelInfo {
  pricePerInference: string // USDC base units
  recipientWallet: string
  name: string
  agentId: number
}

async function getModelInfo(modelId: string): Promise<ModelInfo | null> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
    const res = await fetch(`${baseUrl}/api/indexed/models/${modelId}`, {
      headers: { 'Cache-Control': 'no-cache' }
    })
    if (!res.ok) return null
    
    const data = await res.json()
    if (!data.model) return null
    
    const model = data.model
    
    // Get price per inference from metadata or use default
    let pricePerInference = DEFAULT_PRICE_USDC
    if (model.metadata?.pricePerInference) {
      pricePerInference = String(model.metadata.pricePerInference)
    }
    
    const recipientWallet = model.creator || model.owner
    const agentId = model.metadata?.agentId || model.agentId || 0
    
    return {
      pricePerInference,
      recipientWallet,
      name: model.name || `Model #${modelId}`,
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
  payTo: string
  asset: string
  maxTimeoutSeconds: number
}

// ===== x402 Verification via Facilitator =====

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
    
    // Call facilitator to verify and settle
    const settleRes = await fetch(`${FACILITATOR_URL}/settle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        x402Version: 1,
        scheme: 'exact',
        network: NETWORK,
        payload: payment.payload,
        paymentRequirements: requirement
      })
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

// ===== Mock Inference =====

async function runInference(modelId: string, input: any, agentId: number) {
  const started = Date.now()
  
  // TODO: Replace with real inference
  await new Promise(r => setTimeout(r, 100 + Math.random() * 200))
  
  const output = {
    prediction: Math.random().toFixed(4),
    confidence: (0.7 + Math.random() * 0.25).toFixed(4),
    input_received: input,
    model: `model-${modelId}`,
    agent: `agent-${agentId}`,
    timestamp: new Date().toISOString(),
    note: 'x402 paid inference via USDC - replace with real model',
  }
  
  return {
    output,
    latencyMs: Date.now() - started,
    modelId,
    agentId,
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
  return {
    scheme: 'exact',
    network: NETWORK,
    maxAmountRequired: modelInfo.pricePerInference,
    resource: `/api/inference/${modelId}`,
    description: `AI inference on ${modelInfo.name}`,
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
