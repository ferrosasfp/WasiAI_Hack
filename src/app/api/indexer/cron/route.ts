/**
 * Vercel Cron Job endpoint for blockchain indexing
 * 
 * This endpoint is called by Vercel Cron to keep the database in sync with blockchain.
 * 
 * Vercel Hobby (Free): 1 cron job per day
 * Vercel Pro ($20/mo): Cron jobs every 1 minute
 * 
 * Configure in vercel.json with crons array pointing to /api/indexer/cron
 * Schedule example: "0 0 * * *" for daily at midnight
 * 
 * For local testing: GET /api/indexer/cron
 */

import { NextRequest, NextResponse } from 'next/server'
import { indexChain } from '@/lib/indexer'
import { CHAIN_IDS } from '@/config/chains'

// Vercel Cron sends this header to authenticate cron requests
const CRON_SECRET = process.env.CRON_SECRET

export const dynamic = 'force-dynamic'
export const maxDuration = 60 // Max 60 seconds for Vercel Hobby

export async function GET(request: NextRequest) {
  const startTime = Date.now()
  
  // Verify cron secret in production (optional but recommended)
  const authHeader = request.headers.get('authorization')
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    // In development, allow without secret
    if (process.env.NODE_ENV === 'production') {
      console.warn('[Cron] Unauthorized cron request')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }
  
  console.log('🕐 [Cron] Starting scheduled blockchain sync...')
  
  const results: Array<{
    chainId: number
    success: boolean
    modelsIndexed?: number
    error?: string
  }> = []
  
  // Index all supported chains
  const chainsToIndex = [CHAIN_IDS.AVALANCHE_FUJI]
  // Add mainnet when ready: CHAIN_IDS.AVALANCHE_MAINNET
  
  for (const chainId of chainsToIndex) {
    try {
      console.log(`[Cron] Indexing chain ${chainId}...`)
      
      const result = await indexChain({ 
        chainId,
        maxBlocks: 5000,  // Limit blocks per run to stay within timeout
        batchSize: 100
      })
      
      results.push({
        chainId,
        success: true,
        modelsIndexed: result.modelsIndexed
      })
      
      console.log(`[Cron] ✅ Chain ${chainId}: ${result.modelsIndexed} models indexed`)
    } catch (error: any) {
      console.error(`[Cron] ❌ Chain ${chainId} failed:`, error.message)
      results.push({
        chainId,
        success: false,
        error: error.message
      })
    }
  }
  
  const duration = Date.now() - startTime
  const allSuccess = results.every(r => r.success)
  
  console.log(`🕐 [Cron] Completed in ${duration}ms. Success: ${allSuccess}`)
  
  return NextResponse.json({
    ok: allSuccess,
    timestamp: new Date().toISOString(),
    duration,
    results
  }, { 
    status: allSuccess ? 200 : 207 // 207 Multi-Status if partial failure
  })
}

// Also support POST for manual triggers
export async function POST(request: NextRequest) {
  return GET(request)
}
