/**
 * API: Update model licensing parameters (Quick Edit)
 * 
 * POST /api/models/evm/[id]/licensing
 * 
 * Updates pricing, duration, rights, delivery mode, and terms hash
 * without changing the model family (slug/uri remain the same).
 * 
 * Returns transaction data for wagmi writeContract.
 */

import { NextRequest, NextResponse } from 'next/server'
import { setLicensingParamsTx, isValidRights } from '@/adapters/evm/write'
import { ROYALTY_LIMITS, MARKETPLACE_FEE_BPS, percentToBps } from '@/config'

export const dynamic = 'force-dynamic'

interface LicensingParams {
  chainId: number
  pricePerpetual: string // wei as string
  priceSubscription: string // wei as string
  defaultDurationMonths: number
  deliveryRightsDefault: number
  deliveryModeHint: number
  termsHash: string
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

    const body: LicensingParams = await request.json()

    // Validate required fields
    if (!body.chainId) {
      return NextResponse.json(
        { error: 'chainId is required' },
        { status: 400 }
      )
    }

    // Validate rights bitmask
    if (!isValidRights(body.deliveryRightsDefault)) {
      return NextResponse.json(
        { error: 'Invalid rights bitmask. Must be 1 (API), 2 (Download), or 3 (Both)' },
        { status: 400 }
      )
    }

    // Validate duration
    const durationDays = body.defaultDurationMonths * 30
    if (body.priceSubscription !== '0' && durationDays <= 0) {
      return NextResponse.json(
        { error: 'Subscription pricing requires defaultDurationMonths >= 1' },
        { status: 400 }
      )
    }

    // Validate pricing (basic sanity checks)
    const pricePerpetual = BigInt(body.pricePerpetual || '0')
    const priceSubscription = BigInt(body.priceSubscription || '0')
    
    if (pricePerpetual < 0n || priceSubscription < 0n) {
      return NextResponse.json(
        { error: 'Prices cannot be negative' },
        { status: 400 }
      )
    }

    // At least one price must be set
    if (pricePerpetual === 0n && priceSubscription === 0n) {
      return NextResponse.json(
        { error: 'At least one pricing option must be set' },
        { status: 400 }
      )
    }

    // Prepare transaction data
    const txData = setLicensingParamsTx({
      chainId: body.chainId,
      modelId,
      pricePerpetual,
      priceSubscription,
      defaultDurationDays: durationDays,
      deliveryRightsDefault: body.deliveryRightsDefault,
      deliveryModeHint: body.deliveryModeHint,
      termsHash: body.termsHash || '',
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
      message: 'Transaction data prepared. Sign with your wallet.',
    })

  } catch (error: any) {
    console.error('[API] Error preparing licensing update:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
