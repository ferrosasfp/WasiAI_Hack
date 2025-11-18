/**
 * API: Upgrade model to new version
 * 
 * POST /api/models/evm/[id]/upgrade
 * 
 * Creates a new version of a model by:
 * 1. Building complete metadata from wizard steps
 * 2. Uploading metadata to IPFS
 * 3. Preparing listOrUpgrade transaction
 * 
 * The same slug is used, which unlists the previous version.
 * 
 * Returns transaction data for wagmi writeContract.
 */

import { NextRequest, NextResponse } from 'next/server'
import { listOrUpgradeTx, rightsArrayToBitmask } from '@/adapters/evm/write'
import { ROYALTY_LIMITS, validateRoyaltyPercent, percentToBps } from '@/config'

export const dynamic = 'force-dynamic'

interface UpgradeParams {
  chainId: number
  slug: string
  
  // Step 1: Identity
  name: string
  tagline?: string
  summary?: string
  cover?: { cid: string; filename: string }
  categories?: string[]
  
  // Step 2: Customer sheet
  customer?: any
  
  // Step 3: Technical + artifacts
  technical?: any
  artifacts?: any[]
  demo?: any
  
  // Step 4: Pricing & licensing
  royaltyPercent: number
  pricePerpetual: string // wei as string
  priceSubscription: string // wei as string
  defaultDurationMonths: number
  rights: string[] // ['API', 'Download']
  deliveryMode?: string
  termsText?: string
  termsSummary?: string[]
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

    const body: UpgradeParams = await request.json()

    // Validate required fields
    if (!body.chainId || !body.slug || !body.name) {
      return NextResponse.json(
        { error: 'chainId, slug, and name are required' },
        { status: 400 }
      )
    }

    // Validate royalty
    const royaltyPercent = validateRoyaltyPercent(body.royaltyPercent)
    const royaltyBps = percentToBps(royaltyPercent)

    // Validate pricing
    const pricePerpetual = BigInt(body.pricePerpetual || '0')
    const priceSubscription = BigInt(body.priceSubscription || '0')
    
    if (pricePerpetual === 0n && priceSubscription === 0n) {
      return NextResponse.json(
        { error: 'At least one pricing option must be set' },
        { status: 400 }
      )
    }

    // Validate duration for subscription
    const durationDays = body.defaultDurationMonths * 30
    if (priceSubscription > 0n && durationDays <= 0) {
      return NextResponse.json(
        { error: 'Subscription pricing requires defaultDurationMonths >= 1' },
        { status: 400 }
      )
    }

    // Convert rights array to bitmask
    const deliveryRightsDefault = rightsArrayToBitmask(body.rights || ['API'])
    const deliveryModeHint = body.deliveryMode === 'API' ? 1 : body.deliveryMode === 'Download' ? 2 : 3

    // Build complete metadata object
    const metadata = {
      // Identity
      name: body.name,
      tagline: body.tagline || '',
      summary: body.summary || '',
      cover: body.cover || null,
      categories: body.categories || [],
      
      // Customer
      customer: body.customer || {},
      
      // Technical
      technical: body.technical || {},
      
      // Artifacts & demo
      artifacts: body.artifacts || [],
      demo: body.demo || {},
      
      // Licensing
      licensing: {
        pricing: {
          perpetual: {
            weiAmount: body.pricePerpetual,
          },
          subscription: {
            weiPerMonth: body.priceSubscription,
            defaultDurationDays: durationDays,
          },
        },
        rights: body.rights || [],
        deliveryMode: body.deliveryMode || 'API',
        fees: {
          royaltyPct: royaltyPercent,
        },
        terms: {
          summaryBullets: body.termsSummary || [],
          textMarkdown: body.termsText || '',
        },
      },
      
      // Timestamps
      version: 'upgrade',
      timestamp: new Date().toISOString(),
    }

    // Upload metadata to IPFS
    const uploadRes = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/ipfs/upload`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          type: 'json',
          json: metadata,
          filename: `${body.slug}-metadata.json`,
        }),
      }
    )

    if (!uploadRes.ok) {
      const errorText = await uploadRes.text()
      throw new Error(`IPFS upload failed: ${errorText}`)
    }

    const uploadData = await uploadRes.json()
    const uri = uploadData.cid

    if (!uri) {
      throw new Error('IPFS upload did not return a CID')
    }

    // Calculate termsHash (simple hash of terms text)
    const termsHash = body.termsText
      ? `0x${Buffer.from(body.termsText).toString('hex').slice(0, 64).padEnd(64, '0')}`
      : ''

    // Prepare transaction data
    const txData = listOrUpgradeTx({
      chainId: body.chainId,
      slug: body.slug,
      name: body.name,
      uri,
      royaltyBps,
      pricePerpetual,
      priceSubscription,
      defaultDurationDays: durationDays,
      deliveryRightsDefault,
      deliveryModeHint,
      termsHash,
    })

    return NextResponse.json({
      success: true,
      uri,
      tx: txData,
      message: 'Metadata uploaded to IPFS. Transaction data prepared.',
    })

  } catch (error: any) {
    console.error('[API] Error preparing upgrade:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
