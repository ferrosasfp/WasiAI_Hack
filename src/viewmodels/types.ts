/**
 * ViewModels Type Definitions
 * 
 * Unified source of truth for wizard and model detail page.
 * These interfaces define the contract for data presentation across:
 * - Step 5 (Review & Publish)
 * - Model Detail Page (/models/:id)
 */

// ============================================================================
// Step 1 ViewModel - Identity & Classification
// ============================================================================

export interface AuthorLinks {
  github?: string
  website?: string
  twitter?: string
  linkedin?: string
}

export interface CoverImage {
  url?: string
  cid?: string
  thumbCid?: string
}

export interface Step1ViewModel {
  // Identity
  name: string
  identifierUrl?: string
  tagline?: string
  summary: string
  cover?: CoverImage
  
  // Business profile
  businessCategory?: string
  modelTypeBusiness?: string
  
  // Technical classification (listing labels)
  technicalCategories?: string[]
  technicalTags?: string[]
  
  // Business context
  industries?: string[]
  useCases?: string[]
  tasks?: string[]
  modalities?: string[]
  supportedLanguages?: string[]
  
  // Metadata
  chain: 'avalanche'
  chainSymbol: 'AVAX' | 'USDC'
  visibility: 'public' | 'private'
  locale: 'en' | 'es'
  version?: string
  
  // Authorship
  authorName?: string
  authorAddress?: string
  authorLinks?: AuthorLinks
}

// ============================================================================
// Step 2 ViewModel - Customer Sheet & Technical Configuration
// ============================================================================

export interface ExampleRow {
  input: string
  output: string
  note?: string
}

export interface CustomerSheetViewModel {
  // One-liner/pitch
  valueProp?: string
  
  // Business explanation
  customerDescription?: string
  
  // Expected impact
  expectedImpact?: string
  
  // Inputs/Outputs
  inputs?: string
  outputs?: string
  examples?: ExampleRow[]
  
  // Limitations & Restrictions
  risks?: string // "Known limitations"
  prohibited?: string // "Do not use for"
  
  // Privacy, deploy, support
  privacy?: string
  deploy?: string[] // ["SaaS API", "On-prem Docker", etc.]
  support?: string[]
}

export interface TechnicalConfigViewModel {
  // Capabilities
  tasks?: string[]
  modalities?: string[]
  
  // Architecture
  frameworks?: string[]
  architectures?: string[]
  precisions?: string[]
  quantization?: string[]
  modelFiles?: string[] // file formats
  modelSize?: string // e.g., "7B parameters"
  artifactSize?: string // e.g., "4.2 GB"
  embeddingDimension?: number
  
  // Dependencies
  pip?: string[] // pip packages
  
  // Runtime
  python?: string
  cuda?: string
  pytorch?: string
  cudnn?: string
  os?: string[] // operating systems
  accelerators?: string[]
  computeCapability?: string
  
  // Minimum resources
  vramGB?: number
  cpuCores?: number
  ramGB?: number
  
  // Inference
  maxBatchSize?: number
  contextLength?: number
  maxTokens?: number
  imageResolution?: string
  sampleRate?: string
  triton?: boolean
  referenceLatency?: string // latency/throughput notes
}

export interface Step2ViewModel {
  customer: CustomerSheetViewModel
  technical: TechnicalConfigViewModel
}

// ============================================================================
// Step 3 ViewModel - Artifacts & Instructions
// ============================================================================

export interface ArtifactItem {
  filename: string
  cid: string
  uri: string
  size?: number
  sha256?: string
  role?: string // e.g., "model", "tokenizer", "config"
  notes?: string
}

export interface Step3ViewModel {
  artifacts: ArtifactItem[]
  downloadInstructions?: string // multiline text
  demoPreset?: any // demo configuration if exists
}

// ============================================================================
// Step 4 ViewModel - Licenses & Terms
// ============================================================================

export interface LicensePricing {
  perpetual?: {
    available: boolean
    price: string // in chain currency (AVAX/ETH)
    priceFormatted?: string // with 2 decimals
  }
  subscription?: {
    available: boolean
    pricePerMonth: string // in chain currency
    pricePerMonthFormatted?: string
    baseDurationMonths: number
  }
}

export interface RevenueShare {
  creatorRoyaltyPct: number
  marketplaceFeePct: number
  // Derived splits
  perpetual: {
    marketplace: number
    creator: number
    seller: number
  }
  subscription: {
    marketplace: number
    creator: number
    seller: number
  }
}

export interface LicenseRightsDelivery {
  canUseAPI: boolean
  canDownload: boolean
  isTransferable: boolean
  deliveryMode?: string // e.g., "IPFS", "API", "Hybrid"
}

export interface Step4ViewModel {
  pricing: LicensePricing
  revenueShare: RevenueShare
  rights: LicenseRightsDelivery
  
  // Terms
  termsSummary?: string[] // 3-5 buyer-friendly points
  termsMarkdown?: string
  termsHash?: string
}

// ============================================================================
// Unified ViewModel - Composing all steps
// ============================================================================

export interface UnifiedModelViewModel {
  step1: Step1ViewModel
  step2: Step2ViewModel
  step3: Step3ViewModel
  step4: Step4ViewModel
  
  // Buy-specific data (only for detail page)
  buy?: {
    perpetualEnabled: boolean
    subscriptionEnabled: boolean
    contractAddress?: string
    modelId?: string | number
  }
  
  // Metadata
  isPublished: boolean
  publishedAt?: Date
  updatedAt?: Date
}
