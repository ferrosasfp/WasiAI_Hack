/**
 * ViewModel Factory Functions
 * 
 * These functions transform raw data (draft or published) into ViewModels.
 * They provide a unified interface for both wizard and detail pages.
 */

import {
  Step1ViewModel,
  Step2ViewModel,
  Step3ViewModel,
  Step4ViewModel,
  UnifiedModelViewModel,
  CustomerSheetViewModel,
  TechnicalConfigViewModel,
  LicensePricing,
  RevenueShare,
  LicenseRightsDelivery,
  ArtifactItem,
} from './types'

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get chain symbol from chain name
 */
function getChainSymbol(chain: string): 'AVAX' | 'ETH' | 'SUI' {
  const normalized = chain.toLowerCase()
  if (normalized.includes('avalanche') || normalized.includes('avax')) return 'AVAX'
  if (normalized.includes('base') || normalized.includes('ethereum') || normalized.includes('eth')) return 'ETH'
  if (normalized.includes('sui')) return 'SUI'
  return 'ETH' // default
}

/**
 * Format price to 2 decimals (rounding up)
 */
function formatPrice(value: string | number): string {
  const num = typeof value === 'string' ? parseFloat(value) : value
  if (isNaN(num)) return '0.00'
  return Math.ceil(num * 100) / 100 + ''
}

/**
 * Safe string extractor
 */
function safeString(val: any): string | undefined {
  if (val === null || val === undefined) return undefined
  if (typeof val === 'string') return val.trim() || undefined
  return String(val).trim() || undefined
}

/**
 * Safe array extractor
 */
function safeArray(val: any): string[] | undefined {
  if (!Array.isArray(val)) return undefined
  const filtered = val.filter(v => typeof v === 'string' && v.trim()).map(v => v.trim())
  return filtered.length > 0 ? filtered : undefined
}

/**
 * Calculate revenue splits based on royalty and fee percentages
 */
function calculateRevenueShares(
  creatorRoyaltyPct: number,
  marketplaceFeePct: number
): RevenueShare['perpetual'] & RevenueShare['subscription'] {
  const marketplace = marketplaceFeePct
  const creator = creatorRoyaltyPct
  const seller = 100 - marketplace - creator
  
  return {
    marketplace: Math.max(0, marketplace),
    creator: Math.max(0, creator),
    seller: Math.max(0, seller)
  }
}

// ============================================================================
// Step 1 Factory
// ============================================================================

export function createStep1ViewModel(data: any): Step1ViewModel {
  const chain = safeString(data.chain) || 'base'
  const chainSymbol = getChainSymbol(chain)
  
  return {
    // Identity
    name: safeString(data.name) || 'Untitled Model',
    identifierUrl: safeString(data.identifierUrl) || safeString(data.slug),
    tagline: safeString(data.tagline),
    summary: safeString(data.summary) || safeString(data.shortSummary) || safeString(data.description) || '',
    cover: data.cover ? {
      url: safeString(data.cover.url) || safeString(data.imageUrl),
      cid: safeString(data.cover.cid),
      thumbCid: safeString(data.cover.thumbCid)
    } : undefined,
    
    // Business profile
    businessCategory: safeString(data.businessCategory),
    modelTypeBusiness: safeString(data.modelTypeBusiness) || safeString(data.modelType),
    
    // Technical classification
    technicalCategories: safeArray(data.technicalCategories) || safeArray(data.categories),
    technicalTags: safeArray(data.technicalTags) || safeArray(data.tags),
    
    // Business context
    industries: safeArray(data.industries),
    useCases: safeArray(data.useCases),
    tasks: safeArray(data.tasks),
    modalities: safeArray(data.modalities),
    supportedLanguages: safeArray(data.supportedLanguages),
    
    // Metadata
    chain: chain as any,
    chainSymbol,
    visibility: (safeString(data.visibility) || 'public') as any,
    locale: (safeString(data.locale) || 'en') as any,
    version: safeString(data.version),
    
    // Authorship
    authorName: safeString(data.authorName) || safeString(data.author?.displayName),
    authorAddress: safeString(data.authorAddress) || safeString(data.owner),
    authorLinks: data.authorLinks || data.author?.links || {}
  }
}

// ============================================================================
// Step 2 Factory
// ============================================================================

export function createStep2ViewModel(data: any): Step2ViewModel {
  // Customer Sheet
  const customer: CustomerSheetViewModel = {
    valueProp: safeString(data.valueProp) || safeString(data.valueProposition),
    customerDescription: safeString(data.customerDescription),
    expectedImpact: safeString(data.expectedImpact),
    inputs: safeString(data.inputs),
    outputs: safeString(data.outputs),
    examples: Array.isArray(data.examples) ? data.examples.map((ex: any) => ({
      input: safeString(ex.input) || '',
      output: safeString(ex.output) || safeString(ex.modelResponse) || '',
      note: safeString(ex.note) || safeString(ex.context)
    })).filter((ex: any) => ex.input || ex.output) : undefined,
    risks: safeString(data.risks) || safeString(data.limitations),
    prohibited: safeString(data.prohibited),
    privacy: safeString(data.privacy),
    deploy: safeArray(data.deploy),
    support: safeArray(data.support)
  }
  
  // Technical Configuration
  const technical: TechnicalConfigViewModel = {
    tasks: safeArray(data.tasks),
    modalities: safeArray(data.modalities),
    frameworks: safeArray(data.frameworks),
    architectures: safeArray(data.architectures),
    precisions: safeArray(data.precisions) || safeArray(data.precision),
    quantization: safeArray(data.quantization),
    modelFiles: safeArray(data.modelFiles) || safeArray(data.fileFormats),
    modelSize: safeString(data.modelSize),
    artifactSize: safeString(data.artifactSize),
    embeddingDimension: typeof data.embeddingDimension === 'number' ? data.embeddingDimension : undefined,
    pip: safeArray(data.pip) || (typeof data.dependencies === 'string' ? data.dependencies.split('\n').filter(Boolean) : undefined),
    python: safeString(data.python),
    cuda: safeString(data.cuda),
    pytorch: safeString(data.pytorch),
    cudnn: safeString(data.cudnn),
    os: safeArray(data.os) || safeArray(data.systems),
    accelerators: safeArray(data.accelerators),
    computeCapability: safeString(data.computeCapability),
    vramGB: typeof data.vramGB === 'number' ? data.vramGB : (typeof data.minVram === 'number' ? data.minVram : undefined),
    cpuCores: typeof data.cpuCores === 'number' ? data.cpuCores : (typeof data.minCpu === 'number' ? data.minCpu : undefined),
    ramGB: typeof data.ramGB === 'number' ? data.ramGB : (typeof data.recRam === 'number' ? data.recRam : undefined),
    maxBatchSize: typeof data.maxBatchSize === 'number' ? data.maxBatchSize : (typeof data.maxBatch === 'number' ? data.maxBatch : undefined),
    contextLength: typeof data.contextLength === 'number' ? data.contextLength : undefined,
    maxTokens: typeof data.maxTokens === 'number' ? data.maxTokens : undefined,
    imageResolution: safeString(data.imageResolution),
    sampleRate: safeString(data.sampleRate),
    triton: typeof data.triton === 'boolean' ? data.triton : undefined,
    referenceLatency: safeString(data.referenceLatency) || safeString(data.gpuNotes)
  }
  
  return { customer, technical }
}

// ============================================================================
// Step 3 Factory
// ============================================================================

export function createStep3ViewModel(data: any): Step3ViewModel {
  const artifacts: ArtifactItem[] = []
  
  if (Array.isArray(data.artifacts)) {
    data.artifacts.forEach((art: any) => {
      if (art && typeof art === 'object') {
        artifacts.push({
          filename: safeString(art.filename) || safeString(art.name) || 'unknown',
          cid: safeString(art.cid) || '',
          uri: safeString(art.uri) || (art.cid ? `ipfs://${art.cid}` : ''),
          size: typeof art.size === 'number' ? art.size : undefined,
          sha256: safeString(art.sha256) || safeString(art.hash),
          role: safeString(art.role) || safeString(art.label),
          notes: safeString(art.notes)
        })
      }
    })
  }
  
  // Also check artifactsList (alternate field name)
  if (artifacts.length === 0 && Array.isArray(data.artifactsList)) {
    data.artifactsList.forEach((art: any) => {
      if (art && typeof art === 'object') {
        artifacts.push({
          filename: safeString(art.filename) || safeString(art.name) || 'unknown',
          cid: safeString(art.cid) || '',
          uri: safeString(art.uri) || (art.cid ? `ipfs://${art.cid}` : ''),
          size: typeof art.size === 'number' ? art.size : undefined,
          sha256: safeString(art.sha256) || safeString(art.hash),
          role: safeString(art.role) || safeString(art.label),
          notes: safeString(art.notes)
        })
      }
    })
  }
  
  return {
    artifacts,
    downloadInstructions: safeString(data.downloadInstructions) || safeString(data.instructions),
    demoPreset: data.demoPreset
  }
}

// ============================================================================
// Step 4 Factory
// ============================================================================

export function createStep4ViewModel(data: any): Step4ViewModel {
  // Extract pricing data
  const perpetualPrice = data.price_perpetual ?? data.perpetualPrice ?? data.pricing?.perpetual?.price
  const subscriptionPrice = data.price_subscription ?? data.subscriptionPrice ?? data.pricing?.subscription?.pricePerMonth
  const baseDuration = data.baseDurationMonths ?? data.pricing?.subscription?.baseDurationMonths ?? 1
  
  // Convert from wei if needed (if values are very large, assume wei)
  const perpetualValue = typeof perpetualPrice === 'number' && perpetualPrice > 1000 
    ? (perpetualPrice / 1e18).toFixed(4) 
    : (perpetualPrice ? String(perpetualPrice) : undefined)
  const subscriptionValue = typeof subscriptionPrice === 'number' && subscriptionPrice > 1000
    ? (subscriptionPrice / 1e18).toFixed(4)
    : (subscriptionPrice ? String(subscriptionPrice) : undefined)
  
  const pricing: LicensePricing = {
    perpetual: perpetualValue ? {
      available: true,
      price: perpetualValue,
      priceFormatted: formatPrice(perpetualValue)
    } : undefined,
    subscription: subscriptionValue ? {
      available: true,
      pricePerMonth: subscriptionValue,
      pricePerMonthFormatted: formatPrice(subscriptionValue),
      baseDurationMonths: typeof baseDuration === 'number' ? baseDuration : 1
    } : undefined
  }
  
  // Revenue share
  const creatorRoyaltyPct = typeof data.creatorRoyaltyPct === 'number' ? data.creatorRoyaltyPct : 10
  const marketplaceFeePct = typeof data.marketplaceFeePct === 'number' ? data.marketplaceFeePct : 5
  const shares = calculateRevenueShares(creatorRoyaltyPct, marketplaceFeePct)
  
  const revenueShare: RevenueShare = {
    creatorRoyaltyPct,
    marketplaceFeePct,
    perpetual: shares,
    subscription: shares
  }
  
  // Rights & Delivery
  const rights: LicenseRightsDelivery = {
    canUseAPI: !!(data.rights?.api ?? data.canUseAPI ?? false),
    canDownload: !!(data.rights?.download ?? data.canDownload ?? false),
    isTransferable: !!(data.rights?.transferable ?? data.isTransferable ?? false),
    deliveryMode: safeString(data.deliveryMode)
  }
  
  // Terms
  const termsSummary = safeArray(data.termsSummary) || safeArray(data.keyTerms)
  
  return {
    pricing,
    revenueShare,
    rights,
    termsSummary,
    termsMarkdown: safeString(data.termsMarkdown) || safeString(data.terms),
    termsHash: safeString(data.termsHash)
  }
}

// ============================================================================
// Unified ViewModel Factory
// ============================================================================

export function createUnifiedViewModel(data: any, options?: {
  includePublishedMetadata?: boolean
  includeBuyData?: boolean
  contractAddress?: string
  modelId?: string | number
}): UnifiedModelViewModel {
  const step1 = createStep1ViewModel(data)
  const step2 = createStep2ViewModel(data)
  const step3 = createStep3ViewModel(data)
  const step4 = createStep4ViewModel(data)
  
  const unified: UnifiedModelViewModel = {
    step1,
    step2,
    step3,
    step4,
    isPublished: !!(data.isPublished ?? data.published ?? options?.includePublishedMetadata),
    publishedAt: data.publishedAt ? new Date(data.publishedAt) : undefined,
    updatedAt: data.updatedAt ? new Date(data.updatedAt) : undefined
  }
  
  // Add buy data if requested (for detail page)
  if (options?.includeBuyData) {
    unified.buy = {
      perpetualEnabled: !!step4.pricing.perpetual?.available,
      subscriptionEnabled: !!step4.pricing.subscription?.available,
      contractAddress: options.contractAddress,
      modelId: options.modelId
    }
  }
  
  return unified
}

// ============================================================================
// Convenience Factories
// ============================================================================

/**
 * Create ViewModel from wizard draft
 */
export function createViewModelFromDraft(draft: any): UnifiedModelViewModel {
  // Merge draft steps into flat structure (like Step 5 does with metadata)
  const s1 = draft?.step1 || {}
  const s2 = draft?.step2 || {}
  const s3 = draft?.step3 || {}
  const s4 = draft?.step4 || {}
  
  // Flatten step2 nested structure
  const s2Flat = {
    // Capabilities
    tasks: s2.capabilities?.tasks,
    modalities: s2.capabilities?.modalities,
    
    // Architecture
    frameworks: s2.architecture?.frameworks,
    architectures: s2.architecture?.architectures,
    precisions: s2.architecture?.precisions,
    quantization: s2.architecture?.quantization,
    modelSize: s2.architecture?.modelSizeParams,
    artifactSize: s2.architecture?.artifactSizeGB,
    embeddingDimension: s2.architecture?.embeddingDimension,
    modelFiles: s2.architecture?.modelFiles,
    
    // Runtime
    python: s2.runtime?.python,
    cuda: s2.runtime?.cuda,
    pytorch: s2.runtime?.torch,
    cudnn: s2.runtime?.cudnn,
    os: s2.runtime?.os,
    accelerators: s2.runtime?.accelerators,
    computeCapability: s2.runtime?.computeCapability,
    
    // Dependencies
    pip: s2.dependencies?.pip,
    
    // Resources
    vramGB: s2.resources?.vramGB,
    cpuCores: s2.resources?.cpuCores,
    ramGB: s2.resources?.ramGB,
    
    // Inference
    maxBatchSize: s2.inference?.maxBatchSize,
    contextLength: s2.inference?.contextLength,
    maxTokens: s2.inference?.maxTokens,
    imageResolution: s2.inference?.imageResolution,
    sampleRate: s2.inference?.sampleRate,
    triton: s2.inference?.triton,
    referenceLatency: s2.inference?.referencePerf,
    
    // Customer (already flat in step2.customer)
    ...s2.customer
  }
  
  const merged = {
    ...s1,
    ...s2Flat,
    artifacts: s3?.artifacts || [],
    downloadNotes: s3?.downloadNotes,
    licensePolicy: s4?.licensePolicy,
    version: 1
  }
  
  return createUnifiedViewModel(merged, {
    includePublishedMetadata: false,
    includeBuyData: false
  })
}

/**
 * Create ViewModel from published model (for detail page)
 */
export function createViewModelFromPublished(
  model: any,
  contractAddress?: string,
  modelId?: string | number
): UnifiedModelViewModel {
  return createUnifiedViewModel(model, {
    includePublishedMetadata: true,
    includeBuyData: true,
    contractAddress,
    modelId
  })
}
