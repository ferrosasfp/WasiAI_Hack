/**
 * API: Update model listing status
 * 
 * POST /api/models/evm/[id]/listed
 * 
 * Changes whether a model is listed (visible) or unlisted (hidden).
 * 
 * Returns transaction data for wagmi writeContract.
 */

import { NextRequest, NextResponse } from 'next/server'
import { setListedTx } from '@/adapters/evm/write'

export const dynamic = 'force-dynamic'

interface ListedParams {
  chainId: number
  listed: boolean
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const modelId = parseInt(params.id, 10)
    if (isNaN(modelId) || modelId <= 0) {
      return NextResponse.json(
        { error: 'Invalid model ID' },
        { status: 400 }
      )
    }

    const body: ListedParams = await request.json()

    // Validate required fields
    if (!body.chainId) {
      return NextResponse.json(
        { error: 'chainId is required' },
        { status: 400 }
      )
    }

    if (typeof body.listed !== 'boolean') {
      return NextResponse.json(
        { error: 'listed must be a boolean' },
        { status: 400 }
      )
    }

    // Prepare transaction data
    const txData = setListedTx({
      chainId: body.chainId,
      modelId,
      listed: body.listed,
    })

    // Convert BigInt values to strings for JSON serialization
    const serializableTxData = {
      ...txData,
      args: txData.args?.map((arg: any) => 
        typeof arg === 'bigint' ? arg.toString() : arg
      ),
    }

    return NextResponse.json({
      success: true,
      tx: serializableTxData,
      message: `Transaction data prepared to ${body.listed ? 'list' : 'unlist'} model.`,
    })

  } catch (error: any) {
    console.error('[API] Error preparing listing update:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
