/**
 * API: Upgrade model to new version
 * 
 * POST /api/models/evm/[id]/upgrade
 * 
 * Creates a new version of a model by:
 * 1. Building complete metadata from wizard steps
 * 2. Uploading metadata to IPFS
 * 3. Preparing listOrUpgrade transaction
 * 
 * The same slug is used, which unlists the previous version.
 * 
 * Returns transaction data for wagmi writeContract.
 */

import { NextRequest, NextResponse } from 'next/server'
import { listOrUpgradeTx, rightsArrayToBitmask } from '@/adapters/evm/write'
import { ROYALTY_LIMITS, validateRoyaltyPercent, percentToBps } from '@/config'
import { queryOne } from '@/lib/db'

export const dynamic = 'force-dynamic'

interface UpgradeParams {
  chainId: number
  slug: string
  
  // Step 1: Identity and classification
  name: string
  tagline?: string
  summary?: string
  cover?: { cid: string; filename: string }
  categories?: string[]
  tags?: string[]
  businessCategory?: string
  modelType?: string
  author?: {
    name?: string
    github?: string
    website?: string
    twitter?: string
    linkedin?: string
  }
  
  // Step 2: Customer sheet
  customer?: any
  
  // Step 3: Technical + artifacts
  technical?: any
  artifacts?: any[]
  demo?: any
  
  // Step 4: Pricing & licensing
  royaltyPercent: number
  pricePerpetual: string // USDC base units (6 decimals) as string
  priceSubscription: string // USDC base units (6 decimals) as string
  defaultDurationDays?: number // Days for subscription (0 for perpetual-only)
  defaultDurationMonths?: number // Legacy: months for subscription
  rights: string[] // ['API', 'Download']
  deliveryMode?: string
  termsText?: string
  termsSummary?: string[]
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  console.log('[Upgrade API] ========== UPGRADE API CALLED ==========')
  console.log('[Upgrade API] Model ID from params:', params.id)
  
  try {
    const modelId = parseInt(params.id, 10)
    if (isNaN(modelId) || modelId <= 0) {
      return NextResponse.json(
        { error: 'Invalid model ID' },
        { status: 400 }
      )
    }

    const body: UpgradeParams = await request.json()

    // Validate required fields
    if (!body.chainId || !body.slug || !body.name) {
      return NextResponse.json(
        { error: 'chainId, slug, and name are required' },
        { status: 400 }
      )
    }

    // Validate royalty
    const royaltyPercent = validateRoyaltyPercent(body.royaltyPercent)
    const royaltyBps = percentToBps(royaltyPercent)

    // Validate pricing
    const pricePerpetual = BigInt(body.pricePerpetual || '0')
    const priceSubscription = BigInt(body.priceSubscription || '0')
    
    if (pricePerpetual === 0n && priceSubscription === 0n) {
      return NextResponse.json(
        { error: 'At least one pricing option must be set' },
        { status: 400 }
      )
    }

    // Validate duration for subscription
    // Support both defaultDurationDays (new) and defaultDurationMonths (legacy)
    let durationDays = body.defaultDurationDays !== undefined 
      ? body.defaultDurationDays 
      : (body.defaultDurationMonths ? body.defaultDurationMonths * 30 : 0)
    
    // CRITICAL: If subscription price is 0, duration MUST be 0 (perpetual-only)
    // The contract will revert with InvalidDuration if priceSub=0 and duration!=0
    if (priceSubscription === 0n) {
      console.log('[Upgrade API] Forcing durationDays=0 because priceSubscription=0')
      durationDays = 0
    }
    
    console.log('[Upgrade API] Final values:', { pricePerpetual: pricePerpetual.toString(), priceSubscription: priceSubscription.toString(), durationDays })
    
    // If subscription price > 0, duration must be > 0
    if (priceSubscription > 0n && durationDays <= 0) {
      return NextResponse.json(
        { error: 'Subscription pricing requires duration >= 1 day' },
        { status: 400 }
      )
    }

    // Convert rights array to bitmask
    const deliveryRightsDefault = rightsArrayToBitmask(body.rights || ['API'])
    const deliveryModeHint = body.deliveryMode === 'API' ? 1 : body.deliveryMode === 'Download' ? 2 : 3

    // Get current version and inference price from Neon DB (blockchain data)
    let currentVersion = 1
    let originalInferencePrice = 0n
    try {
      const modelData = await queryOne(
        'SELECT version, price_inference FROM models WHERE model_id = $1 AND chain_id = $2 LIMIT 1',
        [modelId, body.chainId]
      )
      if (modelData?.version) {
        currentVersion = Number(modelData.version) || 1
      }
      if (modelData?.price_inference) {
        originalInferencePrice = BigInt(modelData.price_inference)
        console.log('[Upgrade API] Original inference price from DB:', originalInferencePrice.toString())
      }
    } catch (err) {
      console.warn('[Upgrade] Could not fetch current version/price, defaulting:', err)
    }
    
    // Calculate next version for metadata display
    const nextVersion = currentVersion + 1
    const versionTag = `v${nextVersion}.0.0`

    // Get wallet address from header for agent params
    const walletAddress = request.headers.get('X-Wallet-Address') || ''
    
    // Get inference price: use new value if provided, otherwise preserve original
    // body.demo?.pricePerInference is in dollars (e.g., "0.003")
    // originalInferencePrice is already in USDC base units (e.g., 3000 for $0.003)
    let priceInferenceUsdc = originalInferencePrice
    let pricePerCallHumanReadable = '0'
    if (body.demo?.pricePerInference && parseFloat(body.demo.pricePerInference) > 0) {
      priceInferenceUsdc = BigInt(Math.round(parseFloat(body.demo.pricePerInference) * 1_000_000))
      pricePerCallHumanReadable = body.demo.pricePerInference
    } else if (originalInferencePrice > 0n) {
      // Convert from USDC base units back to human readable
      pricePerCallHumanReadable = (Number(originalInferencePrice) / 1_000_000).toString()
    }
    console.log('[Upgrade API] Inference price:', { 
      fromBody: body.demo?.pricePerInference, 
      original: originalInferencePrice.toString(), 
      final: priceInferenceUsdc.toString(),
      humanReadable: pricePerCallHumanReadable
    })

    // Build complete metadata object (aligned with Quick Edit schema)
    const metadata = {
      // Identity
      name: body.name,
      slug: body.slug, // Preserve slug for version tracking
      tagline: body.tagline || '',
      summary: body.summary || body.tagline || '',
      cover: body.cover || null,
      
      // Classification
      categories: body.categories || [],
      tags: body.tags || [],
      businessCategory: body.businessCategory || '',
      modelType: body.modelType || '',
      
      // Author
      author: body.author || {},
      
      // Customer
      customer: body.customer || {},
      
      // Technical
      technical: body.technical || {},
      
      // Artifacts & demo
      artifacts: body.artifacts || [],
      demo: body.demo || {},
      
      // Licensing (using licensePolicy schema - consistent with Quick Edit)
      licensePolicy: {
        pricing: {
          perpetual: {
            price: body.pricePerpetual,
            available: pricePerpetual > 0n,
          },
          subscription: {
            pricePerMonth: body.priceSubscription,
            baseDurationDays: durationDays,
            available: priceSubscription > 0n,
          },
          // CRITICAL: Include inference pricing for x402 panel
          inference: {
            pricePerCall: pricePerCallHumanReadable,
          },
        },
        // Also include at top level for backward compatibility
        inference: {
          pricePerCall: pricePerCallHumanReadable,
        },
        rights: {
          api: body.rights?.includes('API') || false,
          download: body.rights?.includes('Download') || false,
          transferable: body.rights?.includes('Transferable') || false,
        },
        deliveryMode: body.deliveryMode?.toLowerCase() || 'api',
        fees: {
          royaltyBps: royaltyBps,
          royaltyPercent: royaltyPercent,
        },
        terms: {
          summaryBullets: body.termsSummary || [],
          textMarkdown: body.termsText || '',
        },
        termsHash: '',  // Will be set below
      },
      
      // Version tracking
      version: versionTag, // e.g., "v2.0.0", "v3.0.0"
      updatedAt: new Date().toISOString(),
    }
    
    // Calculate termsHash from termsText using SHA-256
    // IMPORTANT: termsHash must be a valid bytes32 (64 hex chars)
    let termsHash = '0x0000000000000000000000000000000000000000000000000000000000000000'
    if (body.termsText && body.termsText.trim()) {
      const crypto = await import('crypto')
      const hash = crypto.createHash('sha256').update(body.termsText).digest('hex')
      termsHash = `0x${hash}`
    }
    metadata.licensePolicy.termsHash = termsHash

    // Upload metadata to IPFS
    const appUrl = process.env.NEXT_PUBLIC_SITE_URL
    if (!appUrl) {
      throw new Error('NEXT_PUBLIC_SITE_URL is not configured in environment variables')
    }
    
    const uploadRes = await fetch(
      `${appUrl}/api/ipfs/upload`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          type: 'json',
          json: metadata,
          filename: `${body.slug}-metadata.json`,
        }),
      }
    )

    if (!uploadRes.ok) {
      const errorText = await uploadRes.text()
      throw new Error(`IPFS upload failed: ${errorText}`)
    }

    const uploadData = await uploadRes.json()
    const uri = uploadData.cid ? `ipfs://${uploadData.cid}` : uploadData.IpfsHash ? `ipfs://${uploadData.IpfsHash}` : ''

    if (!uri) {
      throw new Error('IPFS upload did not return a CID')
    }

    console.log(`[Upgrade] New metadata uploaded to IPFS: ${uri}`)

    // Get marketplace contract address from environment
    const marketAddr = process.env[`NEXT_PUBLIC_EVM_MARKET_${body.chainId}`] 
      || process.env.NEXT_PUBLIC_EVM_MARKET
    
    if (!marketAddr) {
      throw new Error(`Marketplace address not configured for chainId ${body.chainId}. Set NEXT_PUBLIC_EVM_MARKET_${body.chainId} in .env`)
    }

    // Prepare agent metadata URI (will be uploaded separately or use model URI)
    const agentMetadataUri = uri // Use same metadata URI for agent
    
    // For UPGRADES: Don't register a new agent - the model family already has one
    // The AgentRegistry.registerAgentFor will fail if an agent already exists for the model family
    // Send empty endpoint to skip agent registration in the contract
    // The existing agent from the original model will be preserved
    const txParams = {
      functionName: 'listOrUpgradeWithAgent',
      args: [
        body.slug,
        body.name,
        uri,
        royaltyBps.toString(),
        pricePerpetual.toString(),
        priceSubscription.toString(),
        durationDays.toString(),
        deliveryRightsDefault,
        deliveryModeHint,
        termsHash,
        priceInferenceUsdc.toString(), // priceInference in USDC (6 decimals)
        walletAddress || '0x0000000000000000000000000000000000000000', // inferenceWallet
        {
          endpoint: '', // Empty = skip agent registration (upgrade preserves existing agent)
          wallet: '0x0000000000000000000000000000000000000000',
          metadataUri: ''
        }
      ],
      contractAddress: marketAddr,
      chainId: body.chainId
    }

    console.log(`[Upgrade] Returning txParams for wallet signing (single-signature flow):`, {
      slug: body.slug,
      name: body.name,
      uri: uri.substring(0, 50) + '...',
      chainId: body.chainId,
      functionName: 'listOrUpgradeWithAgent'
    })

    return NextResponse.json({
      ok: true,
      uri,
      txParams,
      modelId, // Include modelId for reference
      metadata: {
        slug: body.slug,
        name: body.name,
        uri
      },
      message: 'Transaction prepared - sign with your wallet (single signature)',
    })

  } catch (error: any) {
    console.error('[API] Error preparing upgrade:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
