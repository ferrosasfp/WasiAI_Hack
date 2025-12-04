/**
 * Force re-cache of model metadata from IPFS and/or re-sync from blockchain
 * Usage: 
 *   GET /api/indexer/recache?modelId=1 - Re-cache IPFS metadata
 *   GET /api/indexer/recache?modelId=1&sync=true - Also re-sync blockchain data
 *   GET /api/indexer/recache?all=true - Re-cache all models
 */

import { NextRequest, NextResponse } from 'next/server'
import { cacheModelMetadata } from '@/lib/indexer'
import { query } from '@/lib/db'
import { createPublicClient, http } from 'viem'
import { getChainConfig, getMarketAddress, isSupportedChain, ZERO_ADDRESSES } from '@/config'
import MARKET_ARTIFACT from '@/abis/MarketplaceV2.json'
import AGENT_REGISTRY_ARTIFACT from '@/abis/AgentRegistryV2.json'

/**
 * Re-sync model data from blockchain
 */
async function resyncModelFromChain(modelId: number, chainId: number): Promise<void> {
  if (!isSupportedChain(chainId)) {
    throw new Error(`Chain ${chainId} not supported`)
  }

  const chainConfig = getChainConfig(chainId)
  const marketAddress = getMarketAddress(chainId)

  if (!chainConfig || !marketAddress) {
    throw new Error(`Chain ${chainId} not properly configured`)
  }

  const client = createPublicClient({
    chain: chainConfig.chain,
    transport: http(chainConfig.rpcUrl),
  })

  const abi: any = MARKET_ARTIFACT.abi

  // Read model data from blockchain
  const modelData: any = await client.readContract({
    address: marketAddress as `0x${string}`,
    abi,
    functionName: 'models',
    args: [BigInt(modelId)],
  })

  if (!modelData || modelData[0] === ZERO_ADDRESSES.EVM) {
    throw new Error(`Model ${modelId} not found on chain ${chainId}`)
  }

  // Get agent registry address
  const agentRegistryAddress = await client.readContract({
    address: marketAddress as `0x${string}`,
    abi,
    functionName: 'agentRegistry',
    args: [],
  }) as string

  // Get agent ID for this model
  let agentId = 0
  let agentEndpoint = ''
  let agentWallet = ''
  
  if (agentRegistryAddress && agentRegistryAddress !== ZERO_ADDRESSES.EVM) {
    const agentAbi: any = AGENT_REGISTRY_ARTIFACT.abi
    
    try {
      const agentIdBigInt = await client.readContract({
        address: agentRegistryAddress as `0x${string}`,
        abi: agentAbi,
        functionName: 'modelToAgent',
        args: [BigInt(modelId)],
      }) as bigint
      
      agentId = Number(agentIdBigInt)
      
      if (agentId > 0) {
        const agentData: any = await client.readContract({
          address: agentRegistryAddress as `0x${string}`,
          abi: agentAbi,
          functionName: 'agents',
          args: [BigInt(agentId)],
        })
        
        // Agent struct: [modelId, wallet, endpoint, registeredAt, active]
        agentWallet = agentData[1] || ''
        agentEndpoint = agentData[2] || ''
      }
    } catch (e) {
      console.warn('Could not fetch agent data:', e)
    }
  }

  // Update model in database with all blockchain data
  // MarketplaceV2 Model struct:
  // [0] owner, [1] creator, [2] name, [3] uri, [4] royaltyBps, [5] listed,
  // [6] pricePerpetual, [7] priceSubscription, [8] defaultDurationDays,
  // [9] deliveryRightsDefault, [10] deliveryModeHint, [11] version,
  // [12] termsHash, [13] priceInference, [14] inferenceWallet
  await query(
    `UPDATE models SET
      owner = $1,
      creator = $2,
      name = $3,
      uri = $4,
      royalty_bps = $5,
      listed = $6,
      price_perpetual = $7,
      price_subscription = $8,
      default_duration_days = $9,
      delivery_rights_default = $10,
      delivery_mode_hint = $11,
      version = $12,
      terms_hash = $13,
      price_inference = $14,
      inference_wallet = $15,
      agent_id = $16,
      inference_endpoint = $17,
      updated_at = NOW()
    WHERE model_id = $18 AND chain_id = $19`,
    [
      modelData[0], // owner
      modelData[1], // creator
      modelData[2] || null, // name
      modelData[3] || null, // uri
      Number(modelData[4]) || 0, // royalty_bps
      Boolean(modelData[5]), // listed
      modelData[6]?.toString() || '0', // price_perpetual
      modelData[7]?.toString() || '0', // price_subscription
      Number(modelData[8]) || 0, // default_duration_days
      Number(modelData[9]) || 0, // delivery_rights_default
      Number(modelData[10]) || 0, // delivery_mode_hint
      Number(modelData[11]) || 1, // version
      modelData[12] || null, // terms_hash
      modelData[13]?.toString() || '0', // price_inference
      modelData[14] || null, // inference_wallet
      agentId > 0 ? agentId : null, // agent_id
      agentEndpoint || null, // inference_endpoint from agent
      modelId,
      chainId,
    ]
  )

  // Also update agents table if agent exists
  if (agentId > 0) {
    await query(
      `INSERT INTO agents (agent_id, chain_id, model_id, owner, wallet, endpoint, active, registered_at)
       VALUES ($1, $2, $3, $4, $5, $6, true, EXTRACT(EPOCH FROM NOW())::BIGINT)
       ON CONFLICT (agent_id) DO UPDATE SET
         chain_id = EXCLUDED.chain_id,
         model_id = EXCLUDED.model_id,
         owner = EXCLUDED.owner,
         wallet = EXCLUDED.wallet,
         endpoint = EXCLUDED.endpoint,
         active = EXCLUDED.active,
         updated_at = NOW()`,
      [agentId, chainId, modelId, modelData[0], agentWallet, agentEndpoint]
    )
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const modelIdParam = searchParams.get('modelId')
  const chainIdParam = searchParams.get('chainId')
  const sync = searchParams.get('sync') === 'true'
  const all = searchParams.get('all') === 'true'

  // Default chainId to Avalanche Fuji
  const chainId = chainIdParam ? parseInt(chainIdParam, 10) : 43113

  try {
    if (all) {
      // Re-cache all models
      const models = await query<{ model_id: number; chain_id: number }>('SELECT model_id, chain_id FROM models WHERE listed = true')
      const results = []
      
      for (const model of models) {
        try {
          if (sync) {
            await resyncModelFromChain(model.model_id, model.chain_id)
          }
          await cacheModelMetadata(model.model_id)
          results.push({ modelId: model.model_id, success: true })
        } catch (err: any) {
          results.push({ modelId: model.model_id, success: false, error: err.message })
        }
      }
      
      return NextResponse.json({
        success: true,
        message: `Re-cached ${results.filter(r => r.success).length}/${models.length} models`,
        synced: sync,
        results
      })
    } else if (modelIdParam) {
      const modelId = parseInt(modelIdParam, 10)
      if (isNaN(modelId)) {
        return NextResponse.json({ error: 'Invalid modelId' }, { status: 400 })
      }
      
      // Optionally sync from blockchain first
      if (sync) {
        await resyncModelFromChain(modelId, chainId)
      }
      
      // Then re-cache IPFS metadata
      await cacheModelMetadata(modelId)
      
      // Fetch updated data from both tables
      const modelData = await query(
        `SELECT m.royalty_bps, m.terms_hash, m.agent_id, m.inference_endpoint,
                mm.categories, mm.tags, mm.industries, mm.use_cases, mm.frameworks, mm.architectures, mm.image_url
         FROM models m
         LEFT JOIN model_metadata mm ON m.model_id = mm.model_id
         WHERE m.model_id = $1`,
        [modelId]
      )
      
      return NextResponse.json({
        success: true,
        modelId,
        chainId,
        synced: sync,
        message: sync ? 'Blockchain synced and metadata re-cached' : 'Metadata re-cached successfully',
        data: modelData[0] || null
      })
    } else {
      return NextResponse.json({
        error: 'Missing parameter',
        usage: [
          '/api/indexer/recache?modelId=1 - Re-cache IPFS metadata',
          '/api/indexer/recache?modelId=1&sync=true - Sync blockchain + re-cache IPFS',
          '/api/indexer/recache?modelId=1&sync=true&chainId=43113 - Specify chain',
          '/api/indexer/recache?all=true - Re-cache all models',
          '/api/indexer/recache?all=true&sync=true - Sync all from blockchain'
        ]
      }, { status: 400 })
    }
  } catch (error: any) {
    console.error('Re-cache error:', error)
    return NextResponse.json({
      error: 'Failed to re-cache',
      message: error.message
    }, { status: 500 })
  }
}
