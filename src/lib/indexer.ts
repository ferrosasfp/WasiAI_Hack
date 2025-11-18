/**
 * Blockchain indexer for models and licenses
 * Scans smart contracts and stores data in database
 * Can be run as: API route, cron job, or GitHub Action
 */

import { createPublicClient, http } from 'viem'
import { query, queryOne } from './db'
import MARKET_ARTIFACT from '@/abis/Marketplace.json'
import { CHAIN_CONFIG, getChainConfig, getMarketAddress, isSupportedChain, ipfsToHttp } from '@/config'

interface IndexerOptions {
  chainId: number
  maxBlocks?: number // Max blocks to scan per run (default: 2000)
  batchSize?: number // Blocks per batch (default: 500)
}

interface IndexerResult {
  chainId: number
  modelsIndexed: number
  licensesIndexed: number
  blocksScanned: number
  lastBlock: bigint
  duration: number
}

/**
 * Main indexer function
 */
export async function indexChain(options: IndexerOptions): Promise<IndexerResult> {
  const startTime = Date.now()
  const { chainId, maxBlocks = 2000, batchSize = 500 } = options

  console.log(`🔍 Starting indexer for chain ${chainId}...`)

  // Get chain configuration from centralized config
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

  // Get indexer state
  let state = await queryOne<any>(
    'SELECT * FROM indexer_state WHERE chain_id = $1',
    [chainId]
  )

  if (!state) {
    // Initialize state
    await query(
      'INSERT INTO indexer_state (chain_id, last_block_models, last_block_licenses) VALUES ($1, 0, 0)',
      [chainId]
    )
    state = { last_block_models: '0', last_block_licenses: '0', last_model_id: 0, last_license_id: 0 }
  }

  // Get current blockchain state
  const abi: any = MARKET_ARTIFACT.abi
  const [nextId, lastLicenseId, latestBlock] = await Promise.all([
    client.readContract({
      address: marketAddress as `0x${string}`,
      abi,
      functionName: 'nextId',
      args: [],
    }) as Promise<bigint>,
    client.readContract({
      address: marketAddress as `0x${string}`,
      abi,
      functionName: 'lastLicenseId',
      args: [],
    }) as Promise<bigint>,
    client.getBlockNumber(),
  ])

  // nextId is the next available id, so last used id is nextId - 1
  const lastModelId = nextId > 0n ? nextId - 1n : 0n

  console.log(`📊 Chain state: lastModelId=${lastModelId}, lastLicenseId=${lastLicenseId}, latestBlock=${latestBlock}`)

  let modelsIndexed = 0
  let licensesIndexed = 0
  let blocksScanned = 0

  // Index new models
  const newModelIds = []
  for (let id = state.last_model_id + 1; id <= Number(lastModelId); id++) {
    newModelIds.push(id)
  }

  if (newModelIds.length > 0) {
    console.log(`📦 Indexing ${newModelIds.length} new models...`)
    modelsIndexed = await indexModels(client, marketAddress, chainId, newModelIds)
  }

  // Index licenses via events
  const fromBlock = BigInt(state.last_block_licenses) + 1n
  const toBlock = latestBlock
  const blocksToScan = Number(toBlock - fromBlock + 1n)

  if (blocksToScan > 0 && blocksToScan <= maxBlocks) {
    console.log(`🎫 Scanning ${blocksToScan} blocks for license events...`)
    licensesIndexed = await indexLicenses(client, marketAddress, chainId, fromBlock, toBlock, batchSize)
    blocksScanned = blocksToScan
  } else if (blocksToScan > maxBlocks) {
    // Incremental scan
    const scanTo = fromBlock + BigInt(maxBlocks) - 1n
    console.log(`🎫 Incremental scan: blocks ${fromBlock} to ${scanTo}...`)
    licensesIndexed = await indexLicenses(client, marketAddress, chainId, fromBlock, scanTo, batchSize)
    blocksScanned = maxBlocks
  }

  // Update state
  await query(
    `UPDATE indexer_state 
     SET last_block_models = $1, 
         last_block_licenses = $2, 
         last_model_id = $3, 
         last_license_id = $4,
         last_sync_at = NOW(),
         status = 'idle'
     WHERE chain_id = $5`,
    [latestBlock.toString(), toBlock.toString(), Number(lastModelId), Number(lastLicenseId), chainId]
  )

  const duration = Date.now() - startTime

  console.log(`✅ Indexer completed: ${modelsIndexed} models, ${licensesIndexed} licenses in ${duration}ms`)

  return {
    chainId,
    modelsIndexed,
    licensesIndexed,
    blocksScanned,
    lastBlock: latestBlock,
    duration,
  }
}

/**
 * Index new models
 */
async function indexModels(
  client: any,
  marketAddress: string,
  chainId: number,
  modelIds: number[]
): Promise<number> {
  const abi: any = MARKET_ARTIFACT.abi
  let indexed = 0

  for (const modelId of modelIds) {
    try {
      const modelData: any = await client.readContract({
        address: marketAddress as `0x${string}`,
        abi,
        functionName: 'models',
        args: [BigInt(modelId)],
      })

      if (!modelData || modelData[0] === '0x0000000000000000000000000000000000000000') {
        continue // Skip non-existent models
      }

      // Insert or update model
      await query(
        `INSERT INTO models (
          model_id, chain_id, owner, creator, name, uri,
          price_perpetual, price_subscription, default_duration_days,
          listed, version, royalty_bps, delivery_rights_default,
          delivery_mode_hint, terms_hash
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        ON CONFLICT (model_id) DO UPDATE SET
          owner = EXCLUDED.owner,
          listed = EXCLUDED.listed,
          price_perpetual = EXCLUDED.price_perpetual,
          price_subscription = EXCLUDED.price_subscription,
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

      // TODO: Fetch and cache IPFS metadata in background
      // This can be done asynchronously to not block indexing

      indexed++
    } catch (error) {
      console.error(`Failed to index model ${modelId}:`, error)
    }
  }

  return indexed
}

/**
 * Index licenses from events
 */
async function indexLicenses(
  client: any,
  marketAddress: string,
  chainId: number,
  fromBlock: bigint,
  toBlock: bigint,
  batchSize: number
): Promise<number> {
  const abi: any = MARKET_ARTIFACT.abi
  const event = abi.find((e: any) => e.type === 'event' && e.name === 'LicenseMinted')

  if (!event) {
    throw new Error('LicenseMinted event not found in ABI')
  }

  let indexed = 0
  let currentFrom = fromBlock

  while (currentFrom <= toBlock) {
    const currentTo = currentFrom + BigInt(batchSize) - 1n > toBlock ? toBlock : currentFrom + BigInt(batchSize) - 1n

    try {
      const logs = await client.getLogs({
        address: marketAddress as `0x${string}`,
        event,
        fromBlock: currentFrom,
        toBlock: currentTo,
      })

      for (const log of logs) {
        try {
          const args = (log as any).args
          const tokenId = Number(args?.licenseId || 0)
          const modelId = Number(args?.modelId || 0)
          const owner = args?.buyer || ''
          const kind = Number(args?.kind || 0)
          const expiresAt = args?.expiresAt?.toString() || '0'

          if (!tokenId || !modelId || !owner) continue

          // Get license status from contract
          const status: any = await client.readContract({
            address: marketAddress as `0x${string}`,
            abi,
            functionName: 'licenseStatus',
            args: [BigInt(tokenId)],
          })

          await query(
            `INSERT INTO licenses (
              token_id, chain_id, model_id, owner, kind,
              revoked, valid_api, valid_download, expires_at,
              tx_hash, block_number
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            ON CONFLICT (chain_id, token_id) DO UPDATE SET
              revoked = EXCLUDED.revoked,
              valid_api = EXCLUDED.valid_api,
              valid_download = EXCLUDED.valid_download,
              owner = EXCLUDED.owner`,
            [
              tokenId,
              chainId,
              modelId,
              owner,
              kind,
              Boolean(status?.[0]), // revoked
              Boolean(status?.[1]), // valid_api
              Boolean(status?.[2]), // valid_download
              expiresAt,
              (log as any).transactionHash || null,
              (log as any).blockNumber?.toString() || null,
            ]
          )

          indexed++
        } catch (error) {
          console.error(`Failed to index license from log:`, error)
        }
      }
    } catch (error) {
      console.error(`Failed to fetch logs from ${currentFrom} to ${currentTo}:`, error)
    }

    currentFrom = currentTo + 1n
  }

  return indexed
}

/**
 * Fetch and cache IPFS metadata for a model
 */
export async function cacheModelMetadata(modelId: number): Promise<void> {
  try {
    // Get model URI
    const model = await queryOne<any>('SELECT uri FROM models WHERE model_id = $1', [modelId])
    
    if (!model?.uri) return

    // Convert IPFS URI to HTTP using centralized config
    const httpUrl = ipfsToHttp(model.uri)

    // Fetch metadata
    const response = await fetch(httpUrl, { 
      signal: AbortSignal.timeout(10000),
      headers: { 'Accept': 'application/json' }
    })

    if (!response.ok) return

    const metadata = await response.json()

    // Extract searchable fields
    const categories = metadata?.technical?.categories || []
    const tags = metadata?.technical?.tags || []
    const industries = metadata?.business?.industries || []
    const useCases = metadata?.business?.useCases || []
    const frameworks = metadata?.technical?.architecture?.frameworks || []
    const architectures = metadata?.technical?.architecture?.architectures || []

    // Extract image URL using centralized IPFS helper
    let imageUrl = null
    const imgCid = metadata?.image || metadata?.image_url || metadata?.thumbnail || metadata?.cover?.cid
    if (imgCid && typeof imgCid === 'string') {
      imageUrl = ipfsToHttp(imgCid)
    }

    // Update model name if available
    if (metadata?.name) {
      await query('UPDATE models SET name = $1 WHERE model_id = $2', [metadata.name, modelId])
    }

    // Cache metadata
    await query(
      `INSERT INTO model_metadata (
        model_id, metadata, image_url, categories, tags,
        industries, use_cases, frameworks, architectures
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (model_id) DO UPDATE SET
        metadata = EXCLUDED.metadata,
        image_url = EXCLUDED.image_url,
        categories = EXCLUDED.categories,
        tags = EXCLUDED.tags,
        industries = EXCLUDED.industries,
        use_cases = EXCLUDED.use_cases,
        frameworks = EXCLUDED.frameworks,
        architectures = EXCLUDED.architectures,
        cached_at = NOW()`,
      [
        modelId,
        JSON.stringify(metadata),
        imageUrl,
        categories,
        tags,
        industries,
        useCases,
        frameworks,
        architectures,
      ]
    )

    console.log(`✅ Cached metadata for model ${modelId}`)
  } catch (error) {
    console.error(`Failed to cache metadata for model ${modelId}:`, error)
  }
}
