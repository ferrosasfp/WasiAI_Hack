/**
 * Admin API to upgrade a model (create new version)
 * 
 * SECURITY:
 * - Only works in development mode
 * - Requires admin secret header
 * - Uses server-side wallet (deployer key)
 * - Rate limited by design (blockchain tx)
 * 
 * FLOW:
 * 1. Validate inputs
 * 2. Pin new metadata to IPFS
 * 3. Call listOrUpgrade on blockchain (creates new version)
 * 4. Re-index the model from blockchain/IPFS
 * 
 * Usage: POST /api/admin/upgrade-model
 */

import { NextRequest, NextResponse } from 'next/server'
import { createWalletClient, createPublicClient, http, parseUnits } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { avalancheFuji } from 'viem/chains'
import { getMarketAddress, getChainConfig } from '@/config'
import { cacheModelMetadata } from '@/lib/indexer'
import { query } from '@/lib/db'
import MARKET_ABI from '@/abis/MarketplaceV2.json'

// Security: Only allow in development
const IS_DEV = process.env.NODE_ENV === 'development'
const ADMIN_SECRET = process.env.ADMIN_SECRET || 'dev-admin-secret'

interface UpgradeModelRequest {
  modelId: number
  metadata: {
    name: string
    slug: string
    summary: string
    description?: string
    image?: string
    cover?: { cid?: string; uri?: string }
    technicalCategories?: string[]
    tags?: string[]
    technical?: {
      tasks?: string[]
      frameworks?: string[]
      architectures?: string[]
    }
    customer?: {
      industries?: string[]
      useCases?: string[]
      inputs?: string
      outputs?: string
    }
    author?: string
    licensePolicy?: {
      perpetual?: { priceRef?: string }
      subscription?: { perMonthPriceRef?: string }
      inference?: { pricePerCall?: string }
      rights?: string[]
      royaltyBps?: number
      defaultDurationDays?: number
    }
    demo?: {
      endpoint?: string
    }
  }
  // Optional: override wallet for inference payments
  inferenceWallet?: string
}

async function pinJSONToIPFS(payload: any): Promise<{ cid: string; uri: string }> {
  const jwt = process.env.PINATA_JWT
  const key = process.env.PINATA_API_KEY
  const secret = process.env.PINATA_SECRET_KEY
  
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (jwt) {
    headers['Authorization'] = `Bearer ${jwt}`
  } else if (key && secret) {
    headers['pinata_api_key'] = key
    headers['pinata_secret_api_key'] = secret
  } else {
    throw new Error('PINATA_CREDENTIALS_MISSING')
  }

  const res = await fetch('https://api.pinata.cloud/pinning/pinJSONToIPFS', {
    method: 'POST',
    headers,
    body: JSON.stringify({ 
      pinataContent: payload,
      pinataMetadata: {
        name: `model-${payload.slug || 'unknown'}-${Date.now()}`
      }
    })
  })

  if (!res.ok) {
    const txt = await res.text()
    throw new Error(`PINATA_ERROR:${res.status}:${txt}`)
  }

  const out = await res.json() as any
  const cid = out.IpfsHash || out.cid || out.hash
  if (!cid) throw new Error('PINATA_NO_CID')
  
  return { cid, uri: `ipfs://${cid}` }
}

export async function POST(request: NextRequest) {
  // Security check 1: Development only
  if (!IS_DEV) {
    return NextResponse.json(
      { error: 'FORBIDDEN', message: 'This endpoint is only available in development' },
      { status: 403 }
    )
  }

  // Security check 2: Admin secret header
  const authHeader = request.headers.get('x-admin-secret')
  if (authHeader !== ADMIN_SECRET) {
    return NextResponse.json(
      { error: 'UNAUTHORIZED', message: 'Invalid admin secret' },
      { status: 401 }
    )
  }

  try {
    const body: UpgradeModelRequest = await request.json()
    const { modelId, metadata } = body

    // Validate required fields
    if (!modelId || typeof modelId !== 'number') {
      return NextResponse.json({ error: 'INVALID_MODEL_ID' }, { status: 400 })
    }
    if (!metadata?.name || !metadata?.slug) {
      return NextResponse.json({ error: 'MISSING_NAME_OR_SLUG' }, { status: 400 })
    }

    // Get existing model to verify it exists and get owner
    const existingModel = await query<any>(
      'SELECT model_id, owner, chain_id FROM models WHERE model_id = $1',
      [modelId]
    )
    if (!existingModel.length) {
      return NextResponse.json({ error: 'MODEL_NOT_FOUND' }, { status: 404 })
    }

    const chainId = existingModel[0].chain_id || 43113 // Default to Fuji
    const marketAddress = getMarketAddress(chainId)
    
    if (!marketAddress) {
      return NextResponse.json({ error: 'MARKET_ADDRESS_NOT_CONFIGURED' }, { status: 500 })
    }

    // Get private key
    const privateKey = process.env.PRIVATE_KEY
    if (!privateKey) {
      return NextResponse.json({ error: 'PRIVATE_KEY_NOT_CONFIGURED' }, { status: 500 })
    }

    console.log(`🔄 Upgrading model ${modelId} with new metadata...`)

    // Step 1: Pin metadata to IPFS
    console.log('📌 Pinning metadata to IPFS...')
    const { cid, uri } = await pinJSONToIPFS(metadata)
    console.log(`✅ Pinned to IPFS: ${uri}`)

    // Step 2: Prepare blockchain transaction
    const account = privateKeyToAccount(privateKey as `0x${string}`)
    
    const chainConfig = getChainConfig(chainId)
    const chain = chainId === 43113 ? avalancheFuji : avalancheFuji // Add more chains as needed
    const rpcUrl = chainConfig?.rpc || 'https://api.avax-test.network/ext/bc/C/rpc'
    
    // Configure HTTP transport with longer timeout for blockchain operations
    const httpTransport = http(rpcUrl, {
      timeout: 60_000, // 60 seconds
      retryCount: 3,
      retryDelay: 1000,
    })
    
    const publicClient = createPublicClient({
      chain,
      transport: httpTransport
    })

    const walletClient = createWalletClient({
      account,
      chain,
      transport: httpTransport
    })

    // Prepare contract parameters
    const slug = metadata.slug
    const name = metadata.name
    const royaltyBps = BigInt(metadata.licensePolicy?.royaltyBps || 0)
    
    // Convert prices to USDC base units (6 decimals)
    const pricePerpetual = metadata.licensePolicy?.perpetual?.priceRef
      ? parseUnits(String(metadata.licensePolicy.perpetual.priceRef), 6)
      : BigInt(0)
    
    const priceSubscription = metadata.licensePolicy?.subscription?.perMonthPriceRef
      ? parseUnits(String(metadata.licensePolicy.subscription.perMonthPriceRef), 6)
      : BigInt(0)
    
    // Contract requires: if priceSubscription == 0, then defaultDurationDays must be 0
    // If priceSubscription > 0, then defaultDurationDays must be >= 1
    const defaultDurationDays = priceSubscription > BigInt(0) 
      ? BigInt(metadata.licensePolicy?.defaultDurationDays || 30)
      : BigInt(0)
    
    // Rights bitmask
    const rights = metadata.licensePolicy?.rights || []
    const rightsMask = (rights.includes('API') ? 1 : 0) | (rights.includes('Download') ? 2 : 0)
    const deliveryModeHint = rightsMask === 1 ? 1 : rightsMask === 2 ? 2 : 3
    
    // Terms hash (empty for now)
    const termsHash = '0x0000000000000000000000000000000000000000000000000000000000000000' as `0x${string}`

    // Inference pricing (USDC 6 decimals)
    const pricePerInference = metadata.licensePolicy?.inference?.pricePerCall || '0.0005'
    const priceInference = parseUnits(String(pricePerInference), 6)
    
    // Inference wallet (defaults to deployer)
    const inferenceWallet = (body.inferenceWallet || account.address) as `0x${string}`
    
    // Agent endpoint for x402 inference
    const inferenceEndpoint = metadata.demo?.endpoint || 
      `${process.env.NEXT_PUBLIC_APP_URL || 'https://wasiai.com'}/api/inference/{modelId}`
    
    // Build agent metadata
    const agentMetadata = {
      name: metadata.name,
      description: metadata.summary || metadata.description || `AI Agent: ${metadata.name}`,
      wallet: inferenceWallet,
      pricePerInference: pricePerInference,
      image: metadata.cover?.uri || metadata.image,
      capabilities: {
        tasks: metadata.technical?.tasks || metadata.technicalCategories || [],
        inputModalities: metadata.customer?.inputs ? [metadata.customer.inputs] : [],
        outputModalities: metadata.customer?.outputs ? [metadata.customer.outputs] : []
      },
      creator: metadata.author || 'Unknown'
    }
    
    // Pin agent metadata to IPFS
    console.log('📌 Pinning agent metadata to IPFS...')
    const agentMetadataPinned = await pinJSONToIPFS(agentMetadata)
    console.log(`✅ Agent metadata pinned: ${agentMetadataPinned.uri}`)

    console.log('📝 Transaction parameters:', {
      slug,
      name,
      uri,
      royaltyBps: royaltyBps.toString(),
      pricePerpetual: pricePerpetual.toString(),
      priceSubscription: priceSubscription.toString(),
      defaultDurationDays: defaultDurationDays.toString(),
      rightsMask,
      deliveryModeHint,
      priceInference: priceInference.toString(),
      inferenceWallet,
      inferenceEndpoint
    })

    // Step 3: Execute blockchain transaction with agent registration
    console.log('⛓️ Sending transaction to blockchain (listOrUpgradeWithAgent)...')
    
    const hash = await walletClient.writeContract({
      address: marketAddress as `0x${string}`,
      abi: MARKET_ABI.abi,
      functionName: 'listOrUpgradeWithAgent',
      args: [
        slug,
        name,
        uri,
        royaltyBps,
        pricePerpetual,
        priceSubscription,
        defaultDurationDays,
        rightsMask,
        deliveryModeHint,
        termsHash,
        priceInference,
        inferenceWallet,
        {
          endpoint: inferenceEndpoint,
          wallet: inferenceWallet,
          metadataUri: agentMetadataPinned.uri
        }
      ]
    })

    console.log(`📤 Transaction sent: ${hash}`)

    // Wait for confirmation
    const receipt = await publicClient.waitForTransactionReceipt({ hash })
    console.log(`✅ Transaction confirmed in block ${receipt.blockNumber}`)

    // Step 4: Get new model ID from logs
    // The ModelListed event contains the new model ID
    let newModelId: number | null = null
    for (const log of receipt.logs) {
      try {
        // ModelListed event signature: ModelListed(uint256 indexed modelId, address indexed owner)
        if (log.topics[0] === '0x8a0e37b73a0d9c82e205d4d1a3ff3d0b57ce5f4d7bccf6bac03336dc101cb7ba') {
          newModelId = Number(BigInt(log.topics[1] || '0'))
          break
        }
      } catch {}
    }

    if (!newModelId) {
      // Fallback: query the contract for nextId - 1
      const nextId = await publicClient.readContract({
        address: marketAddress as `0x${string}`,
        abi: MARKET_ABI.abi,
        functionName: 'nextId'
      }) as bigint
      newModelId = Number(nextId) - 1
    }

    console.log(`🆕 New model ID: ${newModelId}`)

    // Step 5: Index the new model in database
    console.log('💾 Indexing new model in database...')
    
    // Read model data from blockchain
    const modelData = await publicClient.readContract({
      address: marketAddress as `0x${string}`,
      abi: MARKET_ABI.abi,
      functionName: 'models',
      args: [BigInt(newModelId)]
    }) as any[]

    // Insert into database with inference fields
    await query(
      `INSERT INTO models (
        model_id, chain_id, owner, creator, name, uri,
        price_perpetual, price_subscription, default_duration_days,
        listed, version, royalty_bps, delivery_rights_default,
        delivery_mode_hint, terms_hash, price_inference, inference_wallet
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      ON CONFLICT (model_id) DO UPDATE SET
        owner = EXCLUDED.owner,
        name = EXCLUDED.name,
        uri = EXCLUDED.uri,
        listed = EXCLUDED.listed,
        price_perpetual = EXCLUDED.price_perpetual,
        price_subscription = EXCLUDED.price_subscription,
        default_duration_days = EXCLUDED.default_duration_days,
        delivery_rights_default = EXCLUDED.delivery_rights_default,
        delivery_mode_hint = EXCLUDED.delivery_mode_hint,
        version = EXCLUDED.version,
        price_inference = EXCLUDED.price_inference,
        inference_wallet = EXCLUDED.inference_wallet,
        updated_at = NOW()`,
      [
        newModelId,
        chainId,
        modelData[0], // owner
        modelData[1], // creator
        modelData[2] || name, // name
        modelData[3] || uri, // uri
        modelData[6]?.toString() || pricePerpetual.toString(), // price_perpetual
        modelData[7]?.toString() || priceSubscription.toString(), // price_subscription
        Number(modelData[8]) || Number(defaultDurationDays), // default_duration_days
        Boolean(modelData[5]), // listed
        Number(modelData[11]) || 1, // version
        Number(modelData[4]) || Number(royaltyBps), // royalty_bps
        Number(modelData[9]) || rightsMask, // delivery_rights_default
        Number(modelData[10]) || deliveryModeHint, // delivery_mode_hint
        modelData[12] || termsHash, // terms_hash
        modelData[13]?.toString() || priceInference.toString(), // price_inference
        modelData[14] || inferenceWallet, // inference_wallet
      ]
    )

    // Step 6: Cache IPFS metadata
    console.log('📥 Caching IPFS metadata...')
    await cacheModelMetadata(newModelId)

    // Unlist old model in database
    await query(
      'UPDATE models SET listed = false, updated_at = NOW() WHERE model_id = $1',
      [modelId]
    )

    // Try to get agent ID from AgentLinked event
    let agentId: number | null = null
    for (const log of receipt.logs) {
      try {
        // AgentLinked event signature
        if (log.topics[0] === '0x7c5e8e2c0c8f8c8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e') {
          agentId = Number(BigInt(log.topics[2] || '0'))
          break
        }
      } catch {}
    }

    console.log(`✅ Model upgraded successfully: ${modelId} → ${newModelId}${agentId ? ` (Agent: ${agentId})` : ''}`)

    return NextResponse.json({
      success: true,
      oldModelId: modelId,
      newModelId,
      agentId,
      ipfs: { 
        modelMetadata: { cid, uri },
        agentMetadata: agentMetadataPinned
      },
      inference: {
        pricePerCall: pricePerInference,
        priceUsdc: priceInference.toString(),
        wallet: inferenceWallet,
        endpoint: inferenceEndpoint
      },
      transaction: {
        hash,
        blockNumber: Number(receipt.blockNumber)
      },
      message: `Model upgraded from ID ${modelId} to ID ${newModelId}`
    })

  } catch (error: any) {
    console.error('❌ Upgrade model error:', error)
    return NextResponse.json({
      error: 'UPGRADE_FAILED',
      message: error.message,
      code: error.code
    }, { status: 500 })
  }
}
