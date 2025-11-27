/**
 * Adapters for ViewModels
 * 
 * Convert between ViewModel format and other data structures
 */

import type { ModelDetailData } from '@/components/ModelDetailView'
import type { UnifiedModelViewModel } from './types'

/**
 * Convert UnifiedModelViewModel to ModelDetailData format
 * Used to maintain compatibility with existing ModelDetailView component
 */
export function viewModelToModelDetailData(viewModel: UnifiedModelViewModel): ModelDetailData {
  const { step1, step2, step3, step4 } = viewModel
  
  return {
    // Step 1: Identity
    name: step1.name,
    tagline: step1.tagline,
    description: step1.summary,
    cover: step1.cover,
    businessCategory: step1.businessCategory,
    modelType: step1.modelTypeBusiness,
    chainName: step1.chain,
    chainSymbol: step1.chainSymbol,
    author: {
      displayName: step1.authorName,
      links: step1.authorLinks as Record<string, string> | undefined
    },
    
    // Step 2: Customer & Technical
    customer: {
      valueProp: step2.customer.valueProp,
      description: step2.customer.customerDescription,
      expectedImpact: step2.customer.expectedImpact,
      inputs: step2.customer.inputs,
      outputs: step2.customer.outputs,
      examples: step2.customer.examples,
      risks: step2.customer.risks,
      prohibited: step2.customer.prohibited,
      industries: step1.industries, // From step1
      useCases: step1.useCases, // From step1
      supportedLanguages: step1.supportedLanguages, // From step1
      privacy: step2.customer.privacy,
      deploy: step2.customer.deploy,
      support: step2.customer.support
    },
    
    capabilities: {
      tasks: step2.technical.tasks,
      modalities: step2.technical.modalities
    },
    
    architecture: {
      frameworks: step2.technical.frameworks,
      architectures: step2.technical.architectures,
      precisions: step2.technical.precisions,
      modelFiles: step2.technical.modelFiles,
      quantization: step2.technical.quantization ? step2.technical.quantization.join(', ') : undefined,
      modelSize: step2.technical.modelSize,
      artifactSize: step2.technical.artifactSize,
      embeddingDimension: step2.technical.embeddingDimension?.toString()
    },
    
    runtime: {
      python: step2.technical.python,
      cuda: step2.technical.cuda,
      pytorch: step2.technical.pytorch,
      cudnn: step2.technical.cudnn,
      os: step2.technical.os,
      accelerators: step2.technical.accelerators,
      computeCapability: step2.technical.computeCapability
    },
    
    dependencies: {
      pip: step2.technical.pip
    },
    
    resources: {
      vramGB: step2.technical.vramGB?.toString(),
      cpuCores: step2.technical.cpuCores?.toString(),
      ramGB: step2.technical.ramGB?.toString()
    },
    
    inference: {
      maxBatchSize: step2.technical.maxBatchSize?.toString(),
      contextLength: step2.technical.contextLength?.toString(),
      maxTokens: step2.technical.maxTokens?.toString(),
      imageResolution: step2.technical.imageResolution,
      sampleRate: step2.technical.sampleRate,
      triton: step2.technical.triton,
      referencePerf: step2.technical.referenceLatency
    },
    
    // Step 3: Artifacts
    artifacts: step3.artifacts.map(art => ({
      cid: art.cid,
      filename: art.filename,
      size: art.size?.toString(),
      sha256: art.sha256,
      role: art.role
    })),
    downloadNotes: step3.downloadInstructions,
    
    // Step 4: Licenses
    licensePolicy: {
      perpetual: step4.pricing.perpetual ? {
        priceRef: step4.pricing.perpetual.priceFormatted
      } : undefined,
      subscription: step4.pricing.subscription ? {
        perMonthPriceRef: step4.pricing.subscription.pricePerMonthFormatted
      } : undefined,
      rights: [
        ...(step4.rights.canUseAPI ? ['API usage'] : []),
        ...(step4.rights.canDownload ? ['Model download'] : []),
        ...(step4.rights.isTransferable ? ['Transferable'] : [])
      ],
      delivery: step4.rights.deliveryMode ? [step4.rights.deliveryMode] : [],
      termsText: step4.termsMarkdown
    },
    
    // Demo
    demoPreset: !!step3.demoPreset
  }
}

/**
 * Convenience function: Create ModelDetailData directly from raw data
 */
export function createModelDetailDataFromRaw(data: any, options?: {
  includePublished?: boolean
  includeBuyData?: boolean
  contractAddress?: string
  modelId?: string | number
}): ModelDetailData {
  const { createUnifiedViewModel } = require('./factories')
  const viewModel = createUnifiedViewModel(data, options)
  return viewModelToModelDetailData(viewModel)
}
