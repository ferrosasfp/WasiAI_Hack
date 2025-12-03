/**
 * Admin API to update model data directly in DB
 * Usage: POST /api/admin/update-model
 */

import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { modelId, name, metadata, imageUrl, priceInference, pricePerpetual, priceSubscription } = body

    if (!modelId) {
      return NextResponse.json({ error: 'modelId required' }, { status: 400 })
    }

    // Update models table
    if (name || pricePerpetual !== undefined || priceSubscription !== undefined || priceInference !== undefined) {
      const updates: string[] = []
      const values: any[] = []
      let paramIndex = 1

      if (name) {
        updates.push(`name = $${paramIndex++}`)
        values.push(name)
      }
      if (pricePerpetual !== undefined) {
        updates.push(`price_perpetual = $${paramIndex++}`)
        values.push(pricePerpetual.toString())
      }
      if (priceSubscription !== undefined) {
        updates.push(`price_subscription = $${paramIndex++}`)
        values.push(priceSubscription.toString())
      }
      if (priceInference !== undefined) {
        updates.push(`price_inference = $${paramIndex++}`)
        values.push(priceInference.toString())
      }
      updates.push(`updated_at = NOW()`)
      values.push(modelId)

      await query(
        `UPDATE models SET ${updates.join(', ')} WHERE model_id = $${paramIndex}`,
        values
      )
    }

    // Update model_metadata table
    if (metadata || imageUrl) {
      const metaUpdates: string[] = []
      const metaValues: any[] = []
      let paramIndex = 1

      if (metadata) {
        metaUpdates.push(`metadata = $${paramIndex++}`)
        metaValues.push(JSON.stringify(metadata))
        
        // Extract arrays for search
        metaUpdates.push(`categories = $${paramIndex++}`)
        metaValues.push(metadata.technicalCategories || [])
        
        metaUpdates.push(`tags = $${paramIndex++}`)
        metaValues.push(metadata.tags || [])
        
        metaUpdates.push(`industries = $${paramIndex++}`)
        metaValues.push(metadata.customer?.industries || [])
        
        metaUpdates.push(`use_cases = $${paramIndex++}`)
        metaValues.push(metadata.customer?.useCases || [])
        
        metaUpdates.push(`frameworks = $${paramIndex++}`)
        metaValues.push(metadata.technical?.frameworks || [])
        
        metaUpdates.push(`architectures = $${paramIndex++}`)
        metaValues.push(metadata.technical?.architectures || [])
      }

      if (imageUrl) {
        metaUpdates.push(`image_url = $${paramIndex++}`)
        metaValues.push(imageUrl)
      }

      metaUpdates.push(`cached_at = NOW()`)
      metaValues.push(modelId)

      // Check if metadata exists
      const existing = await query('SELECT model_id FROM model_metadata WHERE model_id = $1', [modelId])
      
      if (existing.length > 0) {
        await query(
          `UPDATE model_metadata SET ${metaUpdates.join(', ')} WHERE model_id = $${paramIndex}`,
          metaValues
        )
      } else {
        // Insert new metadata
        await query(
          `INSERT INTO model_metadata (model_id, metadata, image_url, categories, tags, industries, use_cases, frameworks, architectures)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            modelId,
            JSON.stringify(metadata || {}),
            imageUrl || null,
            metadata?.technicalCategories || [],
            metadata?.tags || [],
            metadata?.customer?.industries || [],
            metadata?.customer?.useCases || [],
            metadata?.technical?.frameworks || [],
            metadata?.technical?.architectures || []
          ]
        )
      }
    }

    return NextResponse.json({
      success: true,
      modelId,
      message: 'Model updated successfully'
    })
  } catch (error: any) {
    console.error('Update model error:', error)
    return NextResponse.json({
      error: 'Failed to update model',
      message: error.message
    }, { status: 500 })
  }
}
