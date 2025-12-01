/**
 * Reputation API
 * 
 * GET /api/reputation?agentId=14
 * GET /api/reputation?agentIds=14,20,23 (batch)
 * POST /api/reputation/sync { agentId: 14 } (force sync)
 * POST /api/reputation/feedback { agentId, userAddress, positive, inferenceHash, txHash, blockNumber }
 */

import { NextRequest, NextResponse } from 'next/server'
import { 
  getAgentReputation, 
  getAgentReputationBatch,
  syncAgentReputation,
  recordFeedback
} from '@/lib/reputation-service'

export const dynamic = 'force-dynamic'

/**
 * GET - Get reputation for one or multiple agents
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const agentId = searchParams.get('agentId')
    const agentIds = searchParams.get('agentIds')

    // Batch request
    if (agentIds) {
      const ids = agentIds.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id) && id > 0)
      
      if (ids.length === 0) {
        return NextResponse.json({ error: 'Invalid agentIds' }, { status: 400 })
      }

      if (ids.length > 50) {
        return NextResponse.json({ error: 'Max 50 agents per batch' }, { status: 400 })
      }

      const results = await getAgentReputationBatch(ids)
      
      // Convert Map to object for JSON response
      const data: Record<number, any> = {}
      results.forEach((value, key) => {
        data[key] = value
      })

      return NextResponse.json({ 
        success: true, 
        data,
        count: results.size
      })
    }

    // Single agent request
    if (agentId) {
      const id = parseInt(agentId)
      
      if (isNaN(id) || id <= 0) {
        return NextResponse.json({ error: 'Invalid agentId' }, { status: 400 })
      }

      const data = await getAgentReputation(id)
      
      return NextResponse.json({ 
        success: true, 
        data 
      })
    }

    return NextResponse.json({ error: 'agentId or agentIds required' }, { status: 400 })

  } catch (error: any) {
    console.error('[API/reputation] GET error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      message: error.message 
    }, { status: 500 })
  }
}

/**
 * POST - Sync reputation or record feedback
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action } = body

    // Force sync from blockchain
    if (action === 'sync') {
      const { agentId } = body
      
      if (!agentId || typeof agentId !== 'number' || agentId <= 0) {
        return NextResponse.json({ error: 'Invalid agentId' }, { status: 400 })
      }

      const data = await syncAgentReputation(agentId)
      
      return NextResponse.json({ 
        success: true, 
        data,
        message: 'Reputation synced from blockchain'
      })
    }

    // Record feedback (called after tx confirms)
    if (action === 'feedback') {
      const { agentId, userAddress, positive, inferenceHash, txHash, blockNumber } = body

      if (!agentId || !userAddress || typeof positive !== 'boolean' || !inferenceHash) {
        return NextResponse.json({ 
          error: 'Missing required fields: agentId, userAddress, positive, inferenceHash' 
        }, { status: 400 })
      }

      await recordFeedback(
        agentId,
        userAddress,
        positive,
        inferenceHash,
        txHash || '',
        blockNumber || 0
      )

      return NextResponse.json({ 
        success: true, 
        message: 'Feedback recorded and reputation synced'
      })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })

  } catch (error: any) {
    console.error('[API/reputation] POST error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      message: error.message 
    }, { status: 500 })
  }
}
