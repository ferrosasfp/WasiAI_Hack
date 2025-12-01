import { NextRequest, NextResponse } from 'next/server'
import { getInferenceHistory } from '../[modelId]/route'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const modelId = searchParams.get('modelId') || undefined
  const payer = searchParams.get('payer') || undefined
  const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100)
  
  const history = getInferenceHistory(modelId, payer, limit)
  
  return NextResponse.json({
    ok: true,
    count: history.length,
    history: history.map(record => ({
      ...record,
      explorerUrl: record.txHash 
        ? `https://testnet.snowtrace.io/tx/${record.txHash}`
        : null,
      timeAgo: getTimeAgo(record.timestamp),
    })),
  })
}

function getTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000)
  
  if (seconds < 60) return `${seconds}s ago`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  return `${Math.floor(seconds / 86400)}d ago`
}
