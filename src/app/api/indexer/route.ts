/**
 * Indexer API endpoint
 * Triggers blockchain indexing for models and agents
 * Usage: GET /api/indexer?chainId=43113
 */

import { NextRequest, NextResponse } from 'next/server'
import { indexChain } from '@/lib/indexer'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const chainIdParam = searchParams.get('chainId')
  
  if (!chainIdParam) {
    return NextResponse.json({ 
      error: 'Missing chainId parameter',
      usage: '/api/indexer?chainId=43113'
    }, { status: 400 })
  }

  const chainId = parseInt(chainIdParam, 10)
  
  if (isNaN(chainId)) {
    return NextResponse.json({ 
      error: 'Invalid chainId',
      received: chainIdParam
    }, { status: 400 })
  }

  try {
    console.log(`🔄 Starting indexer for chain ${chainId}...`)
    
    const result = await indexChain({ chainId })
    
    return NextResponse.json({
      success: true,
      ...result,
      lastBlock: result.lastBlock.toString()
    })
  } catch (error: any) {
    console.error('❌ Indexer failed:', error)
    return NextResponse.json({
      error: 'Indexer failed',
      message: error.message,
      code: error.code
    }, { status: 500 })
  }
}
