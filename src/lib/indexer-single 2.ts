/**
 * Single model indexer
 * Indexes a specific model from blockchain to Neon database
 * Used after Quick Edit to sync changes immediately
 */

import { createPublicClient, http } from 'viem'
import { query } from './db'
import MARKET_ARTIFACT from '@/abis/Marketplace.json'
import { getChainConfig, getMarketAddress, isSupportedChain, ZERO_ADDRESSES } from '@/config'

interface IndexSingleModelOptions {
  chainId: number
  modelId: number
}

interface IndexSingleModelResult {
  success: boolean
  modelId: number
  chainId: number
  error?: string
}

/**
 * Index a single model from blockchain to database
 * Fast operation (~1-2 seconds) to sync after Quick Edit
 */
export async function indexSingleModel(
  options: IndexSingleModelOptions
): Promise<IndexSingleModelResult> {
  const { chainId, modelId } = options

  console.log(`[IndexSingleModel] Starting for model ${modelId} on chain ${chainId}`)

  try {
    // Validate chain
    if (!isSupportedChain(chainId)) {
      throw new Error(`Chain ${chainId} not supported`)
    }

    const chainConfig = getChainConfig(chainId)
    const marketAddress = getMarketAddress(chainId)

    if (!chainConfig || !marketAddress) {
      throw new Error(`Chain ${chainId} not properly configured`)
    }

    // Create viem client
    const client = createPublicClient({
      chain: chainConfig.chain,
      transport: http(chainConfig.rpc),
    })

    // Read model data from blockchain
    const abi: any = MARKET_ARTIFACT.abi
    const modelData: any = await client.readContract({
      address: marketAddress as `0x${string}`,
      abi,
      functionName: 'models',
      args: [BigInt(modelId)],
    })

    // Validate model exists (owner is not zero address)
    if (!modelData || modelData[0] === ZERO_ADDRESSES.EVM) {
      throw new Error(`Model ${modelId} not found on chain ${chainId}`)
    }

    console.log(`[IndexSingleModel] Model data fetched from blockchain`)

    // Insert or update model in database
    // Use same field mapping as main indexer (src/lib/indexer.ts)
    await query(
      `INSERT INTO models (
        model_id, chain_id, owner, creator, name, uri,
        price_perpetual, price_subscription, default_duration_days,
        listed, version, royalty_bps, delivery_rights_default,
        delivery_mode_hint, terms_hash, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW())
      ON CONFLICT (model_id) DO UPDATE SET
        owner = EXCLUDED.owner,
        listed = EXCLUDED.listed,
        price_perpetual = EXCLUDED.price_perpetual,
        price_subscription = EXCLUDED.price_subscription,
        default_duration_days = EXCLUDED.default_duration_days,
        delivery_rights_default = EXCLUDED.delivery_rights_default,
        delivery_mode_hint = EXCLUDED.delivery_mode_hint,
        terms_hash = EXCLUDED.terms_hash,
        updated_at = NOW()`,
      [
        modelId,
        chainId,
        modelData[0], // owner
        modelData[1], // creator
        modelData[2] || null, // name
        modelData[3] || null, // uri
        modelData[6]?.toString() || '0', // price_perpetual
        modelData[7]?.toString() || '0', // price_subscription
        Number(modelData[8]) || 0, // default_duration_days
        Boolean(modelData[5]), // listed
        Number(modelData[11]) || 1, // version
        Number(modelData[4]) || 0, // royalty_bps
        Number(modelData[9]) || 0, // delivery_rights_default
        Number(modelData[10]) || 0, // delivery_mode_hint
        modelData[12] || null, // terms_hash
      ]
    )

    console.log(`[IndexSingleModel] Model ${modelId} synced to database`)

    return {
      success: true,
      modelId,
      chainId
    }
  } catch (error: any) {
    console.error(`[IndexSingleModel] Error:`, error)
    return {
      success: false,
      modelId,
      chainId,
      error: error.message || 'Unknown error'
    }
  }
}
