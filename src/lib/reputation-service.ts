/**
 * Reputation Service
 * 
 * Manages agent reputation with:
 * - Neon DB as cache for fast reads
 * - Blockchain (ReputationRegistry) as source of truth
 * - Automatic sync on cache miss or stale data
 */

import { query, queryOne } from './db'
import { createPublicClient, http, parseAbiItem } from 'viem'
import { avalancheFuji } from 'viem/chains'
import ReputationRegistryABI from '@/abis/ReputationRegistry.json'

// Configuration
const REPUTATION_REGISTRY_ADDRESS = process.env.NEXT_PUBLIC_REPUTATION_REGISTRY_ADDRESS as `0x${string}` | undefined
const CHAIN_ID = parseInt(process.env.NEXT_PUBLIC_EVM_DEFAULT_CHAIN_ID || '43113', 10)
const CACHE_TTL_SECONDS = 300 // 5 minutes

// Types
export interface AgentReputationData {
  agentId: number
  chainId: number
  positiveCount: number
  negativeCount: number
  totalFeedback: number
  score: number
  lastFeedbackAt: Date | null
  syncedAt: Date | null
  fromCache: boolean
}

export interface FeedbackRecord {
  id: number
  agentId: number
  userAddress: string
  positive: boolean
  inferenceHash: string
  txHash: string | null
  blockNumber: number | null
  feedbackAt: Date
}

// Create viem client for blockchain reads
function getClient() {
  return createPublicClient({
    chain: avalancheFuji,
    transport: http()
  })
}

/**
 * Get reputation from database cache
 */
async function getFromCache(agentId: number): Promise<AgentReputationData | null> {
  try {
    const row = await queryOne<{
      agent_id: number
      chain_id: number
      positive_count: number
      negative_count: number
      total_feedback: number
      score: number
      last_feedback_at: Date | null
      synced_at: Date | null
    }>(
      'SELECT * FROM agent_reputation WHERE agent_id = $1',
      [agentId]
    )

    if (!row) return null

    // Check if cache is stale
    const syncedAt = row.synced_at ? new Date(row.synced_at) : null
    const isStale = !syncedAt || (Date.now() - syncedAt.getTime()) > CACHE_TTL_SECONDS * 1000

    if (isStale) return null

    return {
      agentId: row.agent_id,
      chainId: row.chain_id,
      positiveCount: row.positive_count,
      negativeCount: row.negative_count,
      totalFeedback: row.total_feedback,
      score: row.score,
      lastFeedbackAt: row.last_feedback_at,
      syncedAt: row.synced_at,
      fromCache: true
    }
  } catch (error) {
    console.error('[ReputationService] Cache read error:', error)
    return null
  }
}

/**
 * Get reputation directly from blockchain
 */
async function getFromBlockchain(agentId: number): Promise<AgentReputationData | null> {
  if (!REPUTATION_REGISTRY_ADDRESS) {
    console.warn('[ReputationService] No REPUTATION_REGISTRY_ADDRESS configured')
    return null
  }

  try {
    const client = getClient()

    // Get reputation data
    const reputationData = await client.readContract({
      address: REPUTATION_REGISTRY_ADDRESS,
      abi: ReputationRegistryABI.abi,
      functionName: 'getReputation',
      args: [BigInt(agentId)]
    }) as { positiveCount: bigint; negativeCount: bigint; totalFeedback: bigint; lastFeedbackAt: bigint }

    // Get calculated score
    const score = await client.readContract({
      address: REPUTATION_REGISTRY_ADDRESS,
      abi: ReputationRegistryABI.abi,
      functionName: 'calculateScore',
      args: [BigInt(agentId)]
    }) as bigint

    const positiveCount = Number(reputationData.positiveCount)
    const negativeCount = Number(reputationData.negativeCount)
    const totalFeedback = Number(reputationData.totalFeedback)
    const lastFeedbackTimestamp = Number(reputationData.lastFeedbackAt)

    return {
      agentId,
      chainId: CHAIN_ID,
      positiveCount,
      negativeCount,
      totalFeedback,
      score: Number(score),
      lastFeedbackAt: lastFeedbackTimestamp > 0 ? new Date(lastFeedbackTimestamp * 1000) : null,
      syncedAt: new Date(),
      fromCache: false
    }
  } catch (error) {
    console.error('[ReputationService] Blockchain read error:', error)
    return null
  }
}

/**
 * Save reputation to database cache
 */
async function saveToCache(data: AgentReputationData): Promise<void> {
  try {
    await query(
      `INSERT INTO agent_reputation (
        agent_id, chain_id, positive_count, negative_count, 
        total_feedback, score, last_feedback_at, synced_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
      ON CONFLICT (agent_id) DO UPDATE SET
        positive_count = $3,
        negative_count = $4,
        total_feedback = $5,
        score = $6,
        last_feedback_at = $7,
        synced_at = NOW()`,
      [
        data.agentId,
        data.chainId,
        data.positiveCount,
        data.negativeCount,
        data.totalFeedback,
        data.score,
        data.lastFeedbackAt
      ]
    )
  } catch (error) {
    console.error('[ReputationService] Cache write error:', error)
    // Don't throw - cache write failure shouldn't break the flow
  }
}

/**
 * Get agent reputation with cache-first strategy
 * 
 * 1. Try to get from cache
 * 2. If cache miss or stale, fetch from blockchain
 * 3. Update cache with fresh data
 * 4. Return data with source indicator
 */
export async function getAgentReputation(agentId: number): Promise<AgentReputationData> {
  // Default response for no data
  const defaultData: AgentReputationData = {
    agentId,
    chainId: CHAIN_ID,
    positiveCount: 0,
    negativeCount: 0,
    totalFeedback: 0,
    score: 50,
    lastFeedbackAt: null,
    syncedAt: null,
    fromCache: false
  }

  if (agentId <= 0) return defaultData

  // Try cache first
  const cached = await getFromCache(agentId)
  if (cached) {
    console.log(`[ReputationService] Cache hit for agent ${agentId}`)
    return cached
  }

  // Cache miss - fetch from blockchain
  console.log(`[ReputationService] Cache miss for agent ${agentId}, fetching from blockchain`)
  const blockchainData = await getFromBlockchain(agentId)
  
  if (!blockchainData) {
    return defaultData
  }

  // Update cache asynchronously (don't wait)
  saveToCache(blockchainData).catch(err => 
    console.error('[ReputationService] Background cache update failed:', err)
  )

  return blockchainData
}

/**
 * Get reputation for multiple agents (batch)
 */
export async function getAgentReputationBatch(agentIds: number[]): Promise<Map<number, AgentReputationData>> {
  const results = new Map<number, AgentReputationData>()
  
  // Filter valid IDs
  const validIds = agentIds.filter(id => id > 0)
  if (validIds.length === 0) return results

  // Try to get all from cache first
  try {
    const rows = await query<{
      agent_id: number
      chain_id: number
      positive_count: number
      negative_count: number
      total_feedback: number
      score: number
      last_feedback_at: Date | null
      synced_at: Date | null
    }>(
      `SELECT * FROM agent_reputation 
       WHERE agent_id = ANY($1) 
       AND synced_at > NOW() - INTERVAL '${CACHE_TTL_SECONDS} seconds'`,
      [validIds]
    )

    for (const row of rows) {
      results.set(row.agent_id, {
        agentId: row.agent_id,
        chainId: row.chain_id,
        positiveCount: row.positive_count,
        negativeCount: row.negative_count,
        totalFeedback: row.total_feedback,
        score: row.score,
        lastFeedbackAt: row.last_feedback_at,
        syncedAt: row.synced_at,
        fromCache: true
      })
    }
  } catch (error) {
    console.error('[ReputationService] Batch cache read error:', error)
  }

  // Find missing IDs
  const missingIds = validIds.filter(id => !results.has(id))
  
  // Fetch missing from blockchain (in parallel, but limited)
  const BATCH_SIZE = 5
  for (let i = 0; i < missingIds.length; i += BATCH_SIZE) {
    const batch = missingIds.slice(i, i + BATCH_SIZE)
    const promises = batch.map(async (id) => {
      const data = await getFromBlockchain(id)
      if (data) {
        results.set(id, data)
        // Update cache in background
        saveToCache(data).catch(() => {})
      }
    })
    await Promise.all(promises)
  }

  return results
}

/**
 * Force sync reputation from blockchain (bypass cache)
 */
export async function syncAgentReputation(agentId: number): Promise<AgentReputationData | null> {
  const data = await getFromBlockchain(agentId)
  if (data) {
    await saveToCache(data)
  }
  return data
}

/**
 * Record a feedback event (called after blockchain tx confirms)
 */
export async function recordFeedback(
  agentId: number,
  userAddress: string,
  positive: boolean,
  inferenceHash: string,
  txHash: string,
  blockNumber: number
): Promise<void> {
  try {
    // Insert feedback record
    await query(
      `INSERT INTO feedback_history (
        agent_id, chain_id, user_address, positive, 
        inference_hash, tx_hash, block_number, feedback_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
      ON CONFLICT (chain_id, inference_hash) DO NOTHING`,
      [agentId, CHAIN_ID, userAddress, positive, inferenceHash, txHash, blockNumber]
    )

    // Force sync reputation from blockchain
    await syncAgentReputation(agentId)
  } catch (error) {
    console.error('[ReputationService] Record feedback error:', error)
  }
}

/**
 * Get feedback history for an agent
 */
export async function getFeedbackHistory(
  agentId: number,
  limit = 20
): Promise<FeedbackRecord[]> {
  try {
    const rows = await query<{
      id: number
      agent_id: number
      user_address: string
      positive: boolean
      inference_hash: string
      tx_hash: string | null
      block_number: string | null
      feedback_at: Date
    }>(
      `SELECT * FROM feedback_history 
       WHERE agent_id = $1 
       ORDER BY feedback_at DESC 
       LIMIT $2`,
      [agentId, limit]
    )

    return rows.map(row => ({
      id: row.id,
      agentId: row.agent_id,
      userAddress: row.user_address,
      positive: row.positive,
      inferenceHash: row.inference_hash,
      txHash: row.tx_hash,
      blockNumber: row.block_number ? parseInt(row.block_number) : null,
      feedbackAt: row.feedback_at
    }))
  } catch (error) {
    console.error('[ReputationService] Get feedback history error:', error)
    return []
  }
}
