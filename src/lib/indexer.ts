/**
 * Blockchain indexer for models and licenses
 * Scans smart contracts and stores data in database
 * Can be run as: API route, cron job, or GitHub Action
 */

import { createPublicClient, http } from 'viem'
import { query, queryOne } from './db'
import MARKET_ARTIFACT from '@/abis/MarketplaceV2.json'
import AGENT_REGISTRY_ARTIFACT from '@/abis/AgentRegistryV2.json'
import { CHAIN_CONFIG, getChainConfig, getMarketAddress, isSupportedChain, ipfsToHttp, createTimeoutSignal, INDEXER_CONFIG, ZERO_ADDRESSES, IPFS_GATEWAYS } from '@/config'

/**
 * Helper to extract array from nested object paths
 * Tries each path in order and returns the first valid array found
 */
function extractArray(obj: any, paths: string[]): string[] {
  for (const path of paths) {
    const value = getNestedValue(obj, path)
    if (Array.isArray(value) && value.length > 0) {
      return value.filter(v => typeof v === 'string')
    }
  }
  return []
}

/**
 * Get nested value from object using dot notation path
 */
function getNestedValue(obj: any, path: string): any {
  if (!obj || typeof obj !== 'object') return undefined
  const parts = path.split('.')
  let current = obj
  for (const part of parts) {
    if (current === null || current === undefined) return undefined
    current = current[part]
  }
  return current
}

interface IndexerOptions {
  chainId: number
  maxBlocks?: number // Max blocks to scan per run (default from INDEXER_CONFIG)
  batchSize?: number // Blocks per batch (default from INDEXER_CONFIG)
}

interface IndexerResult {
  chainId: number
  modelsIndexed: number
  agentsIndexed: number
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
  // Use centralized indexer configuration
  const { chainId, maxBlocks = INDEXER_CONFIG.MAX_BLOCKS_PER_RUN, batchSize = INDEXER_CONFIG.BATCH_SIZE } = options

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
  let agentsIndexed = 0
  let licensesIndexed = 0
  let blocksScanned = 0

  // Get AgentRegistry address from chain config
  const agentRegistryAddress = chainConfig.agentRegistryAddress

  // Index new models
  const newModelIds = []
  for (let id = state.last_model_id + 1; id <= Number(lastModelId); id++) {
    newModelIds.push(id)
  }

  if (newModelIds.length > 0) {
    console.log(`📦 Indexing ${newModelIds.length} new models...`)
    modelsIndexed = await indexModels(client, marketAddress, chainId, newModelIds)
  }

  // Index agents from AgentRegistry
  if (agentRegistryAddress) {
    console.log(`🤖 Indexing agents from AgentRegistry...`)
    agentsIndexed = await indexAgents(client, agentRegistryAddress, chainId, state.last_agent_id || 0)
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

  // Get last agent ID for state update
  let lastAgentId = state.last_agent_id || 0
  if (agentRegistryAddress && agentsIndexed > 0) {
    try {
      const agentAbi: any = AGENT_REGISTRY_ARTIFACT.abi
      const nextAgentId = await client.readContract({
        address: agentRegistryAddress as `0x${string}`,
        abi: agentAbi,
        functionName: 'nextAgentId',
        args: [],
      }) as bigint
      lastAgentId = Number(nextAgentId) - 1
    } catch (e) {
      console.warn('Failed to get nextAgentId:', e)
    }
  }

  // Update state
  await query(
    `UPDATE indexer_state 
     SET last_block_models = $1, 
         last_block_licenses = $2, 
         last_model_id = $3, 
         last_license_id = $4,
         last_agent_id = $5,
         last_sync_at = NOW(),
         status = 'idle'
     WHERE chain_id = $6`,
    [latestBlock.toString(), toBlock.toString(), Number(lastModelId), Number(lastLicenseId), lastAgentId, chainId]
  )

  const duration = Date.now() - startTime

  console.log(`✅ Indexer completed: ${modelsIndexed} models, ${agentsIndexed} agents, ${licensesIndexed} licenses in ${duration}ms`)

  return {
    chainId,
    modelsIndexed,
    agentsIndexed,
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

      // Skip non-existent models (owner is zero address)
      if (!modelData || modelData[0] === ZERO_ADDRESSES.EVM) {
        continue
      }

      // MarketplaceV2 Model struct:
      // [0] owner, [1] creator, [2] name, [3] uri, [4] royaltyBps, [5] listed,
      // [6] pricePerpetual, [7] priceSubscription, [8] defaultDurationDays,
      // [9] deliveryRightsDefault, [10] deliveryModeHint, [11] version,
      // [12] termsHash, [13] priceInference, [14] inferenceWallet
      
      // Log model data for debugging
      console.log(`  ├─ Model ${modelId} data:`, {
        name: modelData[2],
        pricePerpetual: modelData[6]?.toString(),
        priceSubscription: modelData[7]?.toString(),
        priceInference: modelData[13]?.toString(),
        inferenceWallet: modelData[14],
        deliveryRightsDefault: Number(modelData[9]),
        deliveryModeHint: Number(modelData[10]),
      })

      // Insert or update model with inference fields
      await query(
        `INSERT INTO models (
          model_id, chain_id, owner, creator, name, uri,
          price_perpetual, price_subscription, default_duration_days,
          listed, version, royalty_bps, delivery_rights_default,
          delivery_mode_hint, terms_hash, price_inference, inference_wallet
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
        ON CONFLICT (model_id) DO UPDATE SET
          owner = EXCLUDED.owner,
          listed = EXCLUDED.listed,
          price_perpetual = EXCLUDED.price_perpetual,
          price_subscription = EXCLUDED.price_subscription,
          default_duration_days = EXCLUDED.default_duration_days,
          delivery_rights_default = EXCLUDED.delivery_rights_default,
          delivery_mode_hint = EXCLUDED.delivery_mode_hint,
          price_inference = EXCLUDED.price_inference,
          inference_wallet = EXCLUDED.inference_wallet,
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
          modelData[13]?.toString() || '0', // price_inference (USDC base units)
          modelData[14] || null, // inference_wallet
        ]
      )

// Fetch and cache IPFS metadata
      const uri = modelData[3]
      if (uri) {
        try {
          await cacheModelMetadata(modelId)
          console.log(`  │  └─ Cached IPFS metadata`)
        } catch (metaErr) {
          console.warn(`  │  └─ Failed to cache IPFS metadata`)
        }
      }

      indexed++
    } catch (error) {
      console.error(`Failed to index model ${modelId}:`, error)
    }
  }

  // After indexing models, propagate agent_id to models in the same family
  // This ensures upgraded models inherit the agent from the original model
  await propagateAgentIdToFamily()

  return indexed
}

/**
 * Propagate agent_id to all models in the same family (same owner + slug)
 * This preserves reputation across model upgrades
 */
async function propagateAgentIdToFamily(): Promise<void> {
  try {
    // Find families where some models have different agent_id
    // Update all models in family to use the agent_id from the original (lowest version)
    // Use LOWER(owner) for case-insensitive matching of Ethereum addresses
    const result = await query(`
      WITH family_agents AS (
        -- Get the agent_id for each family (owner + slug combination)
        -- Use the agent_id from the model with lowest version (original)
        SELECT DISTINCT ON (LOWER(owner), slug)
          LOWER(owner) as owner_lower,
          slug,
          agent_id
        FROM models
        WHERE agent_id IS NOT NULL AND slug IS NOT NULL
        ORDER BY LOWER(owner), slug, version ASC
      )
      UPDATE models m
      SET agent_id = fa.agent_id
      FROM family_agents fa
      WHERE LOWER(m.owner) = fa.owner_lower
        AND m.slug = fa.slug
        AND (m.agent_id IS NULL OR m.agent_id != fa.agent_id)
      RETURNING m.model_id, m.slug, fa.agent_id
    `)
    
    if (result && result.length > 0) {
      console.log(`📎 Propagated agent_id to ${result.length} models in families:`)
      result.forEach((r: any) => {
        console.log(`  └─ Model ${r.model_id} (${r.slug}) → agent_id=${r.agent_id}`)
      })
    }
  } catch (error) {
    console.error('Failed to propagate agent_id to families:', error)
  }
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
      signal: createTimeoutSignal(),
      headers: { 'Accept': 'application/json' }
    })

    if (!response.ok) return

    const metadata = await response.json()

    // Extract searchable fields from multiple possible locations in metadata
    // Support both flat and nested structures for maximum compatibility
    const categories = extractArray(metadata, [
      'categories',
      'technicalCategories', 
      'technical.categories',
      'businessProfile.categories'
    ])
    
    const tags = extractArray(metadata, [
      'tags',
      'technical.tags',
      'capabilities.tags'
    ])
    
    const industries = extractArray(metadata, [
      'industries',
      'customer.industries',
      'business.industries',
      'businessProfile.industries'
    ])
    
    const useCases = extractArray(metadata, [
      'useCases',
      'use_cases',
      'customer.useCases',
      'business.useCases'
    ])
    
    const frameworks = extractArray(metadata, [
      'frameworks',
      'technical.frameworks',
      'technical.architecture.frameworks',
      'architecture.frameworks'
    ])
    
    const architectures = extractArray(metadata, [
      'architectures',
      'technical.architectures',
      'technical.architecture.architectures',
      'architecture.architectures'
    ])

    // Extract image CID from IPFS metadata (source of truth)
    // Only accept IPFS CIDs - no external URLs (maintains Dapp integrity)
    let imageCid: string | null = null
    let imageUrl: string | null = null
    
    // Priority: cover.cid > image > thumbnail (all must be IPFS CIDs)
    const rawImageRef = metadata?.cover?.cid || metadata?.image || metadata?.image_url || metadata?.thumbnail
    
    if (rawImageRef && typeof rawImageRef === 'string') {
      // Extract CID from various formats: ipfs://Qm..., /ipfs/Qm..., Qm...
      const cidMatch = rawImageRef.match(/(?:ipfs:\/\/|\/ipfs\/)?([Qm][a-zA-Z0-9]{44,}|bafy[a-zA-Z0-9]{50,})/)
      if (cidMatch) {
        imageCid = cidMatch[1]
        imageUrl = ipfsToHttp(`ipfs://${imageCid}`)
      }
    }

    // Update model name and slug if available
    if (metadata?.name || metadata?.slug) {
      await query(
        'UPDATE models SET name = COALESCE($1, name), slug = COALESCE($2, slug) WHERE model_id = $3',
        [metadata.name || null, metadata.slug || null, modelId]
      )
    }

    // Cache metadata with IPFS CID as source of truth
    await query(
      `INSERT INTO model_metadata (
        model_id, metadata, image_cid, image_url, categories, tags,
        industries, use_cases, frameworks, architectures
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT (model_id) DO UPDATE SET
        metadata = EXCLUDED.metadata,
        image_cid = EXCLUDED.image_cid,
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
        imageCid,  // IPFS CID (source of truth)
        imageUrl,  // Derived HTTP gateway URL
        categories,
        tags,
        industries,
        useCases,
        frameworks,
        architectures,
      ]
    )

    console.log(`✅ Cached metadata for model ${modelId}:`, {
      categories: categories.length,
      tags: tags.length,
      industries: industries.length,
      useCases: useCases.length,
      frameworks: frameworks.length,
      architectures: architectures.length,
      imageCid: imageCid || '(none)'
    })
  } catch (error: any) {
    console.error(`❌ Failed to cache metadata for model ${modelId}:`, error.message)
    throw error
  }
}

/**
 * Index agents from AgentRegistryV2
 */
async function indexAgents(
  client: any,
  agentRegistryAddress: string,
  chainId: number,
  lastAgentId: number
): Promise<number> {
  const abi: any = AGENT_REGISTRY_ARTIFACT.abi
  let indexed = 0

  try {
    // Get next agent ID from contract
    const nextAgentId = await client.readContract({
      address: agentRegistryAddress as `0x${string}`,
      abi,
      functionName: 'nextAgentId',
      args: [],
    }) as bigint

    const lastId = Number(nextAgentId) - 1
    
    if (lastId <= lastAgentId) {
      console.log(`  └─ No new agents to index (last: ${lastAgentId}, current: ${lastId})`)
      return 0
    }

    console.log(`  ├─ Indexing agents ${lastAgentId + 1} to ${lastId}...`)

    for (let agentId = lastAgentId + 1; agentId <= lastId; agentId++) {
      try {
        // Get agent data from contract
        // AgentRegistryV2.Agent struct: modelId, wallet, endpoint, registeredAt, active
        const agentData: any = await client.readContract({
          address: agentRegistryAddress as `0x${string}`,
          abi,
          functionName: 'agents',
          args: [BigInt(agentId)],
        })

        // Get owner of the agent NFT
        let owner = ''
        try {
          owner = await client.readContract({
            address: agentRegistryAddress as `0x${string}`,
            abi,
            functionName: 'ownerOf',
            args: [BigInt(agentId)],
          }) as string
        } catch (e) {
          // Agent might not exist or be burned
          console.warn(`  │  └─ Could not get owner for agent ${agentId}`)
          continue
        }

        // Get token URI (metadata)
        let metadataUri = ''
        try {
          metadataUri = await client.readContract({
            address: agentRegistryAddress as `0x${string}`,
            abi,
            functionName: 'tokenURI',
            args: [BigInt(agentId)],
          }) as string
        } catch (e) {
          console.warn(`  │  └─ Could not get tokenURI for agent ${agentId}`)
        }

        const modelId = Number(agentData[0])
        const wallet = agentData[1] as string
        const endpoint = agentData[2] as string
        const registeredAt = Number(agentData[3])
        const active = Boolean(agentData[4])

        console.log(`  │  ├─ Agent ${agentId}: modelId=${modelId}, wallet=${wallet?.slice(0,10)}..., active=${active}`)

        // Insert or update agent
        await query(
          `INSERT INTO agents (
            agent_id, chain_id, model_id, owner, wallet, endpoint,
            metadata_uri, registered_at, active
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          ON CONFLICT (agent_id) DO UPDATE SET
            owner = EXCLUDED.owner,
            wallet = EXCLUDED.wallet,
            endpoint = EXCLUDED.endpoint,
            metadata_uri = EXCLUDED.metadata_uri,
            active = EXCLUDED.active,
            updated_at = NOW()`,
          [
            agentId,
            chainId,
            modelId,
            owner,
            wallet,
            endpoint || null,
            metadataUri || null,
            registeredAt,
            active,
          ]
        )

        // Update model with agent_id reference and inference endpoint
        await query(
          `UPDATE models SET 
            agent_id = $1, 
            inference_endpoint = COALESCE($3, inference_endpoint)
          WHERE model_id = $2`,
          [agentId, modelId, endpoint || null]
        )

        // Cache agent metadata from IPFS if available
        if (metadataUri) {
          try {
            await cacheAgentMetadata(agentId, metadataUri)
            console.log(`  │  │  └─ Cached agent metadata`)
          } catch (metaErr) {
            console.warn(`  │  │  └─ Failed to cache agent metadata`)
          }
        }

        indexed++
      } catch (error) {
        console.error(`Failed to index agent ${agentId}:`, error)
      }
    }
  } catch (error) {
    console.error('Failed to index agents:', error)
  }

  return indexed
}

/**
 * Fetch and cache IPFS metadata for an agent
 */
async function cacheAgentMetadata(agentId: number, metadataUri: string): Promise<void> {
  try {
    // Convert IPFS URI to HTTP
    const httpUrl = ipfsToHttp(metadataUri)

    // Fetch metadata
    const response = await fetch(httpUrl, { 
      signal: createTimeoutSignal(),
      headers: { 'Accept': 'application/json' }
    })

    if (!response.ok) return

    const metadata = await response.json()

    // Extract fields from ERC-8004 metadata
    const name = metadata?.name || null
    const description = metadata?.description || null
    const capabilities = Array.isArray(metadata?.capabilities) ? metadata.capabilities : []
    
    // Extract image URL
    let imageUrl = null
    const imgCid = metadata?.image || metadata?.avatar || metadata?.icon
    if (imgCid && typeof imgCid === 'string') {
      imageUrl = ipfsToHttp(imgCid)
    }

    // Cache metadata
    await query(
      `INSERT INTO agent_metadata (
        agent_id, metadata, name, description, image_url, capabilities
      ) VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (agent_id) DO UPDATE SET
        metadata = EXCLUDED.metadata,
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        image_url = EXCLUDED.image_url,
        capabilities = EXCLUDED.capabilities,
        cached_at = NOW()`,
      [
        agentId,
        JSON.stringify(metadata),
        name,
        description,
        imageUrl,
        capabilities,
      ]
    )
  } catch (error: any) {
    console.error(`❌ Failed to cache agent metadata for agent ${agentId}:`, error.message)
    throw error
  }
}
