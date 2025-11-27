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
  pricePerpetual: string // wei as string
  priceSubscription: string // wei as string
  defaultDurationMonths: number
  rights: string[] // ['API', 'Download']
  deliveryMode?: string
  termsText?: string
  termsSummary?: string[]
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
    const durationDays = body.defaultDurationMonths * 30
    if (priceSubscription > 0n && durationDays <= 0) {
      return NextResponse.json(
        { error: 'Subscription pricing requires defaultDurationMonths >= 1' },
        { status: 400 }
      )
    }

    // Convert rights array to bitmask
    const deliveryRightsDefault = rightsArrayToBitmask(body.rights || ['API'])
    const deliveryModeHint = body.deliveryMode === 'API' ? 1 : body.deliveryMode === 'Download' ? 2 : 3

    // Get current version from Neon DB (blockchain data)
    let currentVersion = 1
    try {
      const modelData = await queryOne(
        'SELECT version FROM models WHERE model_id = $1 AND chain_id = $2 LIMIT 1',
        [modelId, body.chainId]
      )
      if (modelData?.version) {
        currentVersion = Number(modelData.version) || 1
      }
    } catch (err) {
      console.warn('[Upgrade] Could not fetch current version, defaulting to 1:', err)
    }
    
    // Calculate next version for metadata display
    const nextVersion = currentVersion + 1
    const versionTag = `v${nextVersion}.0.0`

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
            baseDurationMonths: body.defaultDurationMonths,
            available: priceSubscription > 0n,
          },
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
    
    // Calculate termsHash and add to metadata
    const termsHash = body.termsText
      ? `0x${Buffer.from(body.termsText).toString('hex').slice(0, 64).padEnd(64, '0')}`
      : ''
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

    // Execute transaction on blockchain (similar to publish endpoint)
    const { JsonRpcProvider, Wallet, Contract } = await import('ethers')
    
    // Get RPC URL from environment based on chainId
    // Try specific env var first, then fallback to generic
    const rpcEnvKey = `RPC_CHAIN_${body.chainId}`
    let rpc = process.env[rpcEnvKey]
    
    // Fallback: Try common naming patterns
    if (!rpc) {
      // Check for Avalanche mainnet/testnet
      if (body.chainId === 43114 || body.chainId === 43113) {
        rpc = process.env.RPC_AVAX || process.env.NEXT_PUBLIC_AVAX_RPC
      }
      // Check for Base mainnet/testnet  
      else if (body.chainId === 8453 || body.chainId === 84532) {
        rpc = process.env.RPC_BASE || process.env.NEXT_PUBLIC_BASE_RPC
      }
    }
    
    if (!rpc) {
      throw new Error(`RPC URL not configured for chainId ${body.chainId}. Set RPC_CHAIN_${body.chainId} in .env`)
    }
    
    const pk = process.env.PRIVATE_KEY
    if (!pk) {
      throw new Error('PRIVATE_KEY not configured in environment')
    }
    
    // Get marketplace contract address from environment
    // Try chain-specific env var first, then fallback to generic
    const marketAddr = process.env[`NEXT_PUBLIC_EVM_MARKET_${body.chainId}`] 
      || process.env.NEXT_PUBLIC_EVM_MARKET
    
    if (!marketAddr) {
      throw new Error(`Marketplace address not configured for chainId ${body.chainId}. Set NEXT_PUBLIC_EVM_MARKET_${body.chainId} in .env`)
    }
    
    console.log(`[Upgrade] Executing transaction on chainId ${body.chainId}...`)
    
    const provider = new JsonRpcProvider(rpc)
    const wallet = new Wallet(pk, provider)
    
    const abi = [
      'function listOrUpgrade(string slug,string name,string uri,uint256 royaltyBps,uint256 pricePerpetual,uint256 priceSubscription,uint256 defaultDurationDays,uint8 deliveryRightsDefault,uint8 deliveryModeHint,bytes32 termsHash)'
    ]
    const market = new Contract(marketAddr, abi, wallet)
    
    // Execute transaction
    const tx = await market.listOrUpgrade(
      body.slug,
      body.name,
      uri,
      royaltyBps,
      pricePerpetual,
      priceSubscription,
      durationDays,
      deliveryRightsDefault,
      deliveryModeHint,
      termsHash
    )
    
    console.log(`[Upgrade] Transaction sent: ${tx.hash}`)
    
    const receipt = await tx.wait()
    
    console.log(`[Upgrade] Transaction confirmed: ${receipt.hash}`)
    
    // Update Neon database immediately (don't wait for indexer)
    try {
      const { query } = await import('@/lib/db')
      
      // Update the model record with new metadata
      await query(
        `UPDATE models 
         SET name = $1,
             uri = $2,
             updated_at = NOW(),
             version = version + 1
         WHERE model_id = $3 AND chain_id = $4`,
        [body.name, uri, modelId, body.chainId]
      )
      
      console.log(`[Upgrade] Updated Neon DB for model ${modelId}:`, {
        name: body.name,
        uri: uri.substring(0, 50) + '...',
        chainId: body.chainId
      })
    } catch (dbError: any) {
      // Don't fail the whole request if DB update fails (indexer will catch it later)
      console.error('[Upgrade] Failed to update Neon DB (non-critical):', dbError.message)
    }
    
    // Map chainId to network name for response
    const getNetworkName = (chainId: number): string => {
      // Avalanche
      if (chainId === 43114) return 'avax-mainnet'
      if (chainId === 43113) return 'avax-testnet'
      // Base
      if (chainId === 8453) return 'base-mainnet'
      if (chainId === 84532) return 'base-testnet'
      // Ethereum
      if (chainId === 1) return 'eth-mainnet'
      if (chainId === 11155111) return 'eth-sepolia'
      // Generic fallback
      return `chain-${chainId}`
    }

    return NextResponse.json({
      ok: true,
      success: true,
      uri,
      onchain: {
        network: getNetworkName(body.chainId),
        chainId: body.chainId,
        market: marketAddr,
        txHash: receipt.hash
      },
      tx: receipt.hash,
      message: 'Model upgraded successfully on blockchain',
    })

  } catch (error: any) {
    console.error('[API] Error preparing upgrade:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
