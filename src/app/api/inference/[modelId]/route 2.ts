import { NextRequest, NextResponse } from 'next/server'
import { createPublicClient, http, parseAbiItem, formatEther } from 'viem'
import { avalancheFuji } from 'viem/chains'

export const dynamic = 'force-dynamic'

// ===== Configuration =====

const AVAX_RPC = process.env.RPC_AVAX || 'https://api.avax-test.network/ext/bc/C/rpc'
const CHAIN_ID = 43113 // Avalanche Fuji

// Default price per inference in wei (0.001 AVAX = 1e15 wei)
const DEFAULT_PRICE_WEI = BigInt(process.env.X402_DEFAULT_PRICE_WEI || '1000000000000000')

// Payment validity window (5 minutes)
const PAYMENT_VALIDITY_SECONDS = 300

// In-memory cache for used tx hashes (replay protection)
// In production, use Redis or DB
const usedTxHashes = new Set<string>()

// Rate limiting (reuse from demo)
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
  pricePerInference: bigint
  recipientWallet: string
  name: string
  agentId: number
}

async function getModelInfo(modelId: string): Promise<ModelInfo | null> {
  // Fetch model from indexed API to get pricing and wallet info
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
    // Priority: metadata.pricePerInference > env default
    let pricePerInference = DEFAULT_PRICE_WEI
    if (model.metadata?.pricePerInference) {
      pricePerInference = BigInt(model.metadata.pricePerInference)
    }
    
    // Recipient is the model creator/owner
    const recipientWallet = model.creator || model.owner
    
    // Agent ID from metadata (set during publish)
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

interface PaymentVerification {
  valid: boolean
  error?: string
  txHash?: string
  amount?: bigint
  from?: string
}

async function verifyPayment(
  txHash: string,
  expectedRecipient: string,
  expectedAmount: bigint
): Promise<PaymentVerification> {
  try {
    // Check replay protection
    if (usedTxHashes.has(txHash.toLowerCase())) {
      return { valid: false, error: 'Transaction already used for payment' }
    }
    
    // Fetch transaction
    const tx = await publicClient.getTransaction({ hash: txHash as `0x${string}` })
    if (!tx) {
      return { valid: false, error: 'Transaction not found' }
    }
    
    // Verify recipient
    if (tx.to?.toLowerCase() !== expectedRecipient.toLowerCase()) {
      return { valid: false, error: 'Payment sent to wrong recipient' }
    }
    
    // Verify amount (allow small tolerance for gas estimation differences)
    if (tx.value < expectedAmount) {
      return { 
        valid: false, 
        error: `Insufficient payment: expected ${formatEther(expectedAmount)} AVAX, got ${formatEther(tx.value)} AVAX` 
      }
    }
    
    // Get transaction receipt to verify it was successful
    const receipt = await publicClient.getTransactionReceipt({ hash: txHash as `0x${string}` })
    if (!receipt || receipt.status !== 'success') {
      return { valid: false, error: 'Transaction failed or pending' }
    }
    
    // Verify transaction is recent (within validity window)
    const block = await publicClient.getBlock({ blockNumber: receipt.blockNumber })
    const txTimestamp = Number(block.timestamp)
    const now = Math.floor(Date.now() / 1000)
    
    if (now - txTimestamp > PAYMENT_VALIDITY_SECONDS) {
      return { valid: false, error: 'Payment transaction too old' }
    }
    
    // Mark tx as used (replay protection)
    usedTxHashes.add(txHash.toLowerCase())
    
    return {
      valid: true,
      txHash,
      amount: tx.value,
      from: tx.from,
    }
  } catch (e: any) {
    console.error('Payment verification error:', e)
    return { valid: false, error: e.message || 'Failed to verify payment' }
  }
}

// ===== Mock Inference =====

interface InferenceResult {
  output: any
  latencyMs: number
  modelId: string
  agentId: number
}

async function runInference(modelId: string, input: any, agentId: number): Promise<InferenceResult> {
  const started = Date.now()
  
  // TODO: Replace with real inference
  // For MVP, we return a mock response that shows the system works
  await new Promise(r => setTimeout(r, 100 + Math.random() * 200)) // Simulate latency
  
  const output = {
    prediction: Math.random().toFixed(4),
    confidence: (0.7 + Math.random() * 0.25).toFixed(4),
    input_received: input,
    model: `model-${modelId}`,
    agent: `agent-${agentId}`,
    timestamp: new Date().toISOString(),
    note: 'x402 paid inference - replace with real model',
  }
  
  return {
    output,
    latencyMs: Date.now() - started,
    modelId,
    agentId,
  }
}

// ===== API Handler =====

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ modelId: string }> }
) {
  const { modelId } = await params
  
  // Rate limiting for unpaid requests
  const clientKey = identify(req)
  const rateKey = `x402:${modelId}:${clientKey}`
  const gate = rateLimit(rateKey, 10, 60_000) // 10 requests per minute
  
  if (!gate.ok) {
    return NextResponse.json(
      { ok: false, error: 'rate_limited', message: 'Too many requests. Please try again later.' },
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
  
  // Check for payment proof header
  const paymentTxHash = req.headers.get('X-Payment-TxHash')
  
  if (!paymentTxHash) {
    // Return 402 Payment Required with payment instructions
    const priceAvax = formatEther(modelInfo.pricePerInference)
    
    const response = NextResponse.json(
      {
        ok: false,
        error: 'payment_required',
        message: `Payment required to run inference on ${modelInfo.name}`,
        payment: {
          recipient: modelInfo.recipientWallet,
          amount: modelInfo.pricePerInference.toString(),
          amountFormatted: `${priceAvax} AVAX`,
          chainId: CHAIN_ID,
          chain: 'avalanche-fuji',
          currency: 'AVAX',
        },
        agent: {
          id: modelInfo.agentId,
          name: modelInfo.name,
        },
        instructions: 'Send payment to recipient address, then retry with X-Payment-TxHash header',
      },
      { status: 402 }
    )
    
    // Set x402 headers
    response.headers.set('X-Payment-Recipient', modelInfo.recipientWallet)
    response.headers.set('X-Payment-Amount', modelInfo.pricePerInference.toString())
    response.headers.set('X-Payment-Chain-Id', CHAIN_ID.toString())
    response.headers.set('X-Payment-Currency', 'AVAX')
    
    return response
  }
  
  // Verify payment
  const verification = await verifyPayment(
    paymentTxHash,
    modelInfo.recipientWallet,
    modelInfo.pricePerInference
  )
  
  if (!verification.valid) {
    return NextResponse.json(
      {
        ok: false,
        error: 'payment_invalid',
        message: verification.error || 'Payment verification failed',
        txHash: paymentTxHash,
      },
      { status: 402 }
    )
  }
  
  // Payment verified! Run inference
  let body: any = {}
  try {
    body = await req.json()
  } catch {
    // Empty body is ok
  }
  
  const result = await runInference(modelId, body.input, modelInfo.agentId)
  
  return NextResponse.json({
    ok: true,
    result: result.output,
    latencyMs: result.latencyMs,
    payment: {
      txHash: paymentTxHash,
      amount: verification.amount?.toString(),
      from: verification.from,
      verified: true,
    },
    agent: {
      id: modelInfo.agentId,
      name: modelInfo.name,
    },
  })
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
  
  const priceAvax = formatEther(modelInfo.pricePerInference)
  
  return NextResponse.json({
    ok: true,
    endpoint: `/api/inference/${modelId}`,
    method: 'POST',
    description: `x402 pay-per-inference endpoint for ${modelInfo.name}`,
    pricing: {
      amount: modelInfo.pricePerInference.toString(),
      amountFormatted: `${priceAvax} AVAX`,
      currency: 'AVAX',
      chainId: CHAIN_ID,
    },
    agent: {
      id: modelInfo.agentId,
      name: modelInfo.name,
      wallet: modelInfo.recipientWallet,
    },
    usage: {
      step1: 'POST to this endpoint without payment to get 402 response with payment details',
      step2: 'Send AVAX payment to the recipient address',
      step3: 'POST again with X-Payment-TxHash header containing the transaction hash',
      step4: 'Receive inference result',
    },
    headers: {
      'X-Payment-TxHash': 'Transaction hash of AVAX payment (required for inference)',
      'Content-Type': 'application/json',
    },
    body: {
      input: 'Your inference input (format depends on model)',
    },
  })
}
