/**
 * API: Quick Edit with Metadata Regeneration
 * 
 * POST /api/models/evm/[id]/quick-edit-metadata
 * 
 * Updates licensing parameters AND regenerates IPFS metadata to keep
 * blockchain and metadata synchronized.
 * 
 * Process:
 * 1. Fetch current model data from Neon (blockchain + cached metadata)
 * 2. Regenerate metadata JSON with updated licensing fields
 * 3. Upload new metadata to IPFS
 * 4. Return 2 transactions:
 *    - setLicensingParams (update prices/rights/delivery)
 *    - listOrUpgrade (update URI to new metadata CID)
 * 
 * This ensures metadata IPFS always reflects current blockchain state.
 */

import { NextRequest, NextResponse } from 'next/server'
import { setLicensingParamsTx, listOrUpgradeTx, isValidRights } from '@/adapters/evm/write'
import { queryOne } from '@/lib/db'

export const dynamic = 'force-dynamic'

interface QuickEditMetadataParams {
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

    const body: QuickEditMetadataParams = await request.json()

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

    // Validate pricing
    const pricePerpetual = BigInt(body.pricePerpetual || '0')
    const priceSubscription = BigInt(body.priceSubscription || '0')
    
    if (pricePerpetual < 0n || priceSubscription < 0n) {
      return NextResponse.json(
        { error: 'Prices cannot be negative' },
        { status: 400 }
      )
    }

    if (pricePerpetual === 0n && priceSubscription === 0n) {
      return NextResponse.json(
        { error: 'At least one pricing option must be set' },
        { status: 400 }
      )
    }

    // Validate duration
    const durationDays = body.defaultDurationMonths * 30
    if (priceSubscription !== 0n && durationDays <= 0) {
      return NextResponse.json(
        { error: 'Subscription pricing requires defaultDurationMonths >= 1' },
        { status: 400 }
      )
    }

    // === STEP 1: Fetch current model data from Neon ===
    const modelData = await queryOne<any>(
      `SELECT 
        m.model_id,
        m.chain_id,
        m.name,
        m.uri,
        m.royalty_bps,
        m.owner,
        mm.metadata
      FROM models m
      LEFT JOIN model_metadata mm ON m.model_id = mm.model_id
      WHERE m.model_id = $1 AND m.chain_id = $2`,
      [modelId, body.chainId]
    )

    if (!modelData) {
      return NextResponse.json(
        { error: 'Model not found' },
        { status: 404 }
      )
    }

    // === STEP 2: Regenerate metadata with updated licensing ===
    const currentMetadata = modelData.metadata || {}
    
    // Deep copy to avoid mutating original
    const newMetadata = JSON.parse(JSON.stringify(currentMetadata))

    // Update licensing fields in metadata
    if (!newMetadata.licensePolicy) {
      newMetadata.licensePolicy = {}
    }

    // Update pricing
    if (!newMetadata.licensePolicy.pricing) {
      newMetadata.licensePolicy.pricing = {}
    }
    
    newMetadata.licensePolicy.pricing.perpetual = {
      price: pricePerpetual.toString(),
      available: pricePerpetual > 0n
    }
    
    newMetadata.licensePolicy.pricing.subscription = {
      pricePerMonth: priceSubscription.toString(),
      baseDurationMonths: body.defaultDurationMonths,
      available: priceSubscription > 0n
    }

    // Update rights
    const hasAPI = (body.deliveryRightsDefault & 1) !== 0
    const hasDownload = (body.deliveryRightsDefault & 2) !== 0
    
    newMetadata.licensePolicy.rights = {
      api: hasAPI,
      download: hasDownload,
      transferable: currentMetadata.licensePolicy?.rights?.transferable ?? false
    }

    // Update delivery mode
    newMetadata.licensePolicy.deliveryMode = 
      body.deliveryModeHint === 1 ? 'api' :
      body.deliveryModeHint === 2 ? 'download' : 'both'

    // Update terms hash
    if (body.termsHash) {
      newMetadata.licensePolicy.termsHash = body.termsHash
    }

    // Add timestamp
    newMetadata.updatedAt = new Date().toISOString()

    // === STEP 3: Upload new metadata to IPFS ===
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const uploadRes = await fetch(`${appUrl}/api/ipfs/upload`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        json: newMetadata,
        type: 'json',
        filename: `model-${modelId}-metadata.json`
      }),
    })

    if (!uploadRes.ok) {
      const errorText = await uploadRes.text()
      throw new Error(`IPFS upload failed: ${errorText}`)
    }

    const uploadData = await uploadRes.json()
    const newUri = uploadData.cid ? `ipfs://${uploadData.cid}` : uploadData.IpfsHash ? `ipfs://${uploadData.IpfsHash}` : ''

    if (!newUri) {
      throw new Error('IPFS upload did not return a valid CID')
    }

    console.log(`[QuickEditMetadata] New metadata uploaded to IPFS: ${newUri}`)

    // === STEP 4: Prepare transactions ===
    
    // Generate slug from model_id (consistent for all upgrades)
    // The contract uses slug to identify the model family
    const slug = `model-${modelId}`
    
    // TX 1: Update licensing params
    const licensingTx = setLicensingParamsTx({
      chainId: body.chainId,
      modelId,
      pricePerpetual,
      priceSubscription,
      defaultDurationDays: durationDays,
      deliveryRightsDefault: body.deliveryRightsDefault,
      deliveryModeHint: body.deliveryModeHint,
      termsHash: body.termsHash || '',
    })

    // TX 2: Update URI (listOrUpgrade with new metadata CID)
    const uriTx = listOrUpgradeTx({
      chainId: body.chainId,
      slug: slug,
      name: modelData.name,
      uri: newUri,
      royaltyBps: modelData.royalty_bps,
      pricePerpetual,
      priceSubscription,
      defaultDurationDays: durationDays,
      deliveryRightsDefault: body.deliveryRightsDefault,
      deliveryModeHint: body.deliveryModeHint,
      termsHash: body.termsHash || '',
    })

    // Convert BigInt to string for JSON serialization
    const serializableLicensingTx = {
      ...licensingTx,
      args: licensingTx.args?.map((arg: any) => 
        typeof arg === 'bigint' ? arg.toString() : arg
      ),
    }

    const serializableUriTx = {
      ...uriTx,
      args: uriTx.args?.map((arg: any) => 
        typeof arg === 'bigint' ? arg.toString() : arg
      ),
    }

    return NextResponse.json({
      success: true,
      newUri,
      metadata: newMetadata,
      transactions: {
        licensing: serializableLicensingTx,
        uri: serializableUriTx,
      },
      message: 'Metadata regenerated and uploaded to IPFS. Two transactions prepared.',
    })

  } catch (error: any) {
    console.error('[API] Error in quick-edit-metadata:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
