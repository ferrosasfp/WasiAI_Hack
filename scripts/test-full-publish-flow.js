/**
 * Test Full Publish Flow - Example 3: Product Image Classifier
 * 
 * This script tests the complete flow:
 * 1. Upload artifacts to IPFS
 * 2. Upload cover image to IPFS
 * 3. Call publish API to get transaction params
 * 4. Execute blockchain transaction
 * 5. Verify model is listed
 * 
 * Usage:
 *   node scripts/test-full-publish-flow.js
 */

const fs = require('fs')
const path = require('path')
const { ethers } = require('ethers')
require('dotenv').config({ path: '.env.local' })

// Configuration
const API_BASE = 'http://localhost:3000'
const RPC_URL = process.env.NEXT_PUBLIC_AVALANCHE_FUJI_RPC || 'https://api.avax-test.network/ext/bc/C/rpc'
const CHAIN_ID = 43113

// Example 3 Data - Product Image Classifier
const EXAMPLE_3 = {
  step1: {
    name: 'Product Image Classifier',
    slug: `product-classifier-${Date.now()}`, // Unique slug
    summary: 'AI-powered product image classification model. Automatically categorize product photos into 1000+ categories with 96% accuracy. Built on EfficientNet-B4 architecture, optimized for e-commerce and retail applications.',
    businessCategory: 'Operations & Logistics',
    modelTypeBusiness: 'Image Recognition',
    technicalCategories: ['Computer Vision'],
    technicalTags: ['image-classification', 'efficientnet', 'pytorch', 'e-commerce', 'product-recognition'],
    // cover will be uploaded separately
  },
  step2: {
    valueProp: 'Automate product categorization and save 80% of manual tagging time. Improve search accuracy and product discovery for your e-commerce platform.',
    customerDescription: 'E-commerce platforms, marketplaces, retail companies, and inventory management systems that need to automatically classify and tag product images at scale.',
    expectedImpact: 'Reduce product listing time by 75%. Improve category accuracy to 96%. Enable visual search capabilities. Process 10,000+ images per hour.',
    inputs: 'Product image (JPEG/PNG, min 224x224px), optional: preferred category scope',
    outputs: 'Top-5 category predictions with confidence scores, product attributes (color, material, style), suggested tags for SEO',
    examples: 'Input: Photo of a red leather handbag → Output: Category: Fashion > Bags > Handbags (98%), Attributes: Color=Red, Material=Leather, Style=Casual',
    knownLimitations: 'Requires clear product images with white/neutral background for best results. May struggle with very small objects or extreme angles. Not suitable for food freshness detection.',
    prohibitedUses: 'Do not use for surveillance, facial recognition, or any purpose that violates privacy laws. Not intended for medical or safety-critical applications.',
    industries: ['E-commerce', 'Retail', 'Logistics', 'Fashion', 'Consumer Goods'],
    useCases: ['Product categorization', 'Visual search', 'Inventory management', 'Catalog automation', 'Quality control'],
    supportedLanguages: ['English'],
    privacyCompliance: 'Model processes images only. No personal data stored. GDPR compliant. Images are not retained after inference.',
    deploymentNotes: 'Supports batch and real-time inference. GPU recommended for production. Docker image available. Kubernetes-ready.',
    supportSla: 'Email support with 24h response. Premium support with 4h response available. 99.5% uptime SLA.',
  },
  step3: {
    downloadNotes: `## Installation

\`\`\`bash
pip install torch torchvision safetensors pillow
\`\`\`

## Quick Start

\`\`\`python
import torch
from safetensors.torch import load_file
from torchvision import transforms
from PIL import Image

# Load model
weights = load_file('model.safetensors')
model = EfficientNet.from_pretrained('efficientnet-b4')
model.load_state_dict(weights)
model.eval()

# Preprocess image
transform = transforms.Compose([
    transforms.Resize(256),
    transforms.CenterCrop(224),
    transforms.ToTensor(),
    transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
])

# Predict
image = Image.open('product.jpg')
input_tensor = transform(image).unsqueeze(0)
with torch.no_grad():
    output = model(input_tensor)
    probabilities = torch.nn.functional.softmax(output[0], dim=0)
\`\`\`

## Requirements
- Python 3.8+
- PyTorch >= 2.0
- torchvision >= 0.15
- safetensors >= 0.3
`,
    tasks: ['Image Classification'],
    modalities: ['Image'],
    frameworks: ['PyTorch'],
    architectures: ['EfficientNet', 'CNN'],
    precisions: ['FP32', 'FP16'],
    pythonVersion: '3.10',
    operatingSystems: ['Linux', 'macOS', 'Windows'],
    cudaVersion: '11.8',
    pytorchVersion: '2.0',
    vramGb: 4,
    cpuCores: 4,
    ramGb: 8,
    maxBatchSize: 64,
    imageResolution: '224x224',
  },
  step4: {
    pricePerpetual: '50000000', // $50 USDC (6 decimals)
    priceSubscription: '0',
    defaultDurationDays: 0,
    royaltyBps: 500, // 5%
    deliveryRightsDefault: 3, // API + Download
    deliveryModeHint: 3, // API + Download
    rightsTransferable: false,
    termsText: `PRODUCT IMAGE CLASSIFIER LICENSE AGREEMENT

1. LICENSE GRANT
This license grants you non-exclusive, worldwide rights to use the Product Image Classifier model for commercial purposes.

2. PERMITTED USES
- Deploy in production environments
- Process unlimited images
- Integrate into your products and services
- Use for internal business operations

3. RESTRICTIONS
- No redistribution of model weights
- No training derivative models
- No use for surveillance or facial recognition
- No resale as standalone product

4. SUPPORT
- Community forum access included
- Email support for technical issues
- Documentation and examples provided

5. WARRANTY DISCLAIMER
Model provided "as is" without warranty of any kind.

6. LIMITATION OF LIABILITY
Licensor not liable for any damages from use of this model.`,
  },
}

async function uploadToIPFS(filePath, filename) {
  const FormData = (await import('form-data')).default
  const fetch = (await import('node-fetch')).default
  
  const form = new FormData()
  form.append('file', fs.createReadStream(filePath), filename)
  
  const response = await fetch(`${API_BASE}/api/ipfs/upload`, {
    method: 'POST',
    body: form,
    headers: form.getHeaders(),
  })
  
  if (!response.ok) {
    throw new Error(`IPFS upload failed: ${response.status}`)
  }
  
  const data = await response.json()
  return data.cid
}

async function main() {
  console.log('='.repeat(60))
  console.log('Test Full Publish Flow - Example 3')
  console.log('='.repeat(60))
  console.log('')
  
  const fetch = (await import('node-fetch')).default
  
  // Setup wallet
  const privateKey = process.env.PRIVATE_KEY
  if (!privateKey) {
    console.error('❌ PRIVATE_KEY not found in .env.local')
    process.exit(1)
  }
  
  const provider = new ethers.JsonRpcProvider(RPC_URL)
  const wallet = new ethers.Wallet(privateKey, provider)
  console.log(`Wallet: ${wallet.address}`)
  console.log('')
  
  // Step 1: Upload artifacts to IPFS
  console.log('📦 Step 1: Uploading artifacts to IPFS...')
  const artifactsDir = path.join(__dirname, '../test-assets/example3')
  
  const artifacts = []
  
  // Upload model
  console.log('   Uploading model.safetensors...')
  const modelCid = await uploadToIPFS(
    path.join(artifactsDir, 'model.safetensors'),
    'model.safetensors'
  )
  artifacts.push({
    filename: 'model.safetensors',
    cid: modelCid,
    uri: `ipfs://${modelCid}`,
    sizeBytes: fs.statSync(path.join(artifactsDir, 'model.safetensors')).size,
    role: 'model_weights',
  })
  console.log(`   ✅ model.safetensors: ${modelCid}`)
  
  // Upload labels
  console.log('   Uploading labels.json...')
  const labelsCid = await uploadToIPFS(
    path.join(artifactsDir, 'labels.json'),
    'labels.json'
  )
  artifacts.push({
    filename: 'labels.json',
    cid: labelsCid,
    uri: `ipfs://${labelsCid}`,
    sizeBytes: fs.statSync(path.join(artifactsDir, 'labels.json')).size,
    role: 'configuration',
  })
  console.log(`   ✅ labels.json: ${labelsCid}`)
  
  // Upload cover
  console.log('   Uploading cover.svg...')
  const coverCid = await uploadToIPFS(
    path.join(artifactsDir, 'cover.svg'),
    'cover.svg'
  )
  console.log(`   ✅ cover.svg: ${coverCid}`)
  console.log('')
  
  // Step 2: Prepare publish payload in the format expected by the API
  console.log('📝 Step 2: Preparing publish payload...')
  
  // Build metadata in the format the API expects
  const metadata = {
    name: EXAMPLE_3.step1.name,
    slug: EXAMPLE_3.step1.slug,
    summary: EXAMPLE_3.step1.summary,
    description: EXAMPLE_3.step2.customerDescription,
    cover: { cid: coverCid, uri: `ipfs://${coverCid}` },
    businessCategory: EXAMPLE_3.step1.businessCategory,
    modelTypeBusiness: EXAMPLE_3.step1.modelTypeBusiness,
    technicalCategories: EXAMPLE_3.step1.technicalCategories,
    tags: EXAMPLE_3.step1.technicalTags,
    
    // Customer/business info
    customer: {
      valueProp: EXAMPLE_3.step2.valueProp,
      description: EXAMPLE_3.step2.customerDescription,
      expectedImpact: EXAMPLE_3.step2.expectedImpact,
      inputs: EXAMPLE_3.step2.inputs,
      outputs: EXAMPLE_3.step2.outputs,
      examples: EXAMPLE_3.step2.examples,
      limitations: EXAMPLE_3.step2.knownLimitations,
      prohibitedUses: EXAMPLE_3.step2.prohibitedUses,
      industries: EXAMPLE_3.step2.industries,
      useCases: EXAMPLE_3.step2.useCases,
      supportedLanguages: EXAMPLE_3.step2.supportedLanguages,
    },
    
    // Technical specs
    technical: {
      tasks: EXAMPLE_3.step3.tasks,
      modalities: EXAMPLE_3.step3.modalities,
      frameworks: EXAMPLE_3.step3.frameworks,
      architectures: EXAMPLE_3.step3.architectures,
      precisions: EXAMPLE_3.step3.precisions,
      pythonVersion: EXAMPLE_3.step3.pythonVersion,
      operatingSystems: EXAMPLE_3.step3.operatingSystems,
      cudaVersion: EXAMPLE_3.step3.cudaVersion,
      pytorchVersion: EXAMPLE_3.step3.pytorchVersion,
    },
    
    // Resources
    resources: {
      vramGb: EXAMPLE_3.step3.vramGb,
      cpuCores: EXAMPLE_3.step3.cpuCores,
      ramGb: EXAMPLE_3.step3.ramGb,
    },
    
    // Inference
    inference: {
      maxBatchSize: EXAMPLE_3.step3.maxBatchSize,
      imageResolution: EXAMPLE_3.step3.imageResolution,
    },
    
    // Artifacts
    artifacts: artifacts,
    
    // Demo/download notes
    demo: {
      downloadNotes: EXAMPLE_3.step3.downloadNotes,
    },
    
    // License policy
    licensePolicy: {
      royaltyBps: EXAMPLE_3.step4.royaltyBps,
      perpetual: {
        priceRef: (Number(EXAMPLE_3.step4.pricePerpetual) / 1e6).toString(), // Convert to human readable
      },
      subscription: {
        perMonthPriceRef: '0',
      },
      defaultDurationDays: EXAMPLE_3.step4.defaultDurationDays,
      rights: ['API', 'Download'], // Based on deliveryRightsDefault = 3
      termsText: EXAMPLE_3.step4.termsText,
    },
    
    // Privacy and support
    privacy: EXAMPLE_3.step2.privacyCompliance,
    deployment: EXAMPLE_3.step2.deploymentNotes,
    support: EXAMPLE_3.step2.supportSla,
  }
  
  const publishPayload = {
    chain: 'evm',
    network: 'avax',
    address: wallet.address,
    metadata: metadata,
  }
  
  console.log(`   Model: ${metadata.name}`)
  console.log(`   Slug: ${metadata.slug}`)
  console.log(`   Price: $${metadata.licensePolicy.perpetual.priceRef} USDC`)
  console.log('')
  
  // Step 3: Call publish API
  console.log('🌐 Step 3: Calling publish API...')
  
  const publishResponse = await fetch(`${API_BASE}/api/models/publish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(publishPayload),
  })
  
  if (!publishResponse.ok) {
    const errorText = await publishResponse.text()
    console.error(`❌ Publish API failed: ${publishResponse.status}`)
    console.error(errorText)
    process.exit(1)
  }
  
  const publishData = await publishResponse.json()
  console.log(`   ✅ Metadata uploaded to IPFS: ${publishData.cid || publishData.metadataCid}`)
  console.log(`   ✅ Transaction params received`)
  console.log('')
  
  if (!publishData.txParams) {
    console.error('❌ No txParams in response')
    console.log('Response:', JSON.stringify(publishData, null, 2))
    process.exit(1)
  }
  
  // Step 4: Execute blockchain transaction
  console.log('⛓️  Step 4: Executing blockchain transaction...')
  
  const txParams = publishData.txParams
  const MARKETPLACE_ADDRESS = process.env.NEXT_PUBLIC_EVM_MARKET_43113 || '0xdDF773Bb0a9a6F186175fB39CA166DA17994491E'
  
  console.log(`   Function: ${txParams.functionName}`)
  console.log(`   Contract: ${MARKETPLACE_ADDRESS}`)
  
  // Load ABI
  const marketplaceAbi = require('../src/abis/MarketplaceV2.json').abi
  const marketplace = new ethers.Contract(MARKETPLACE_ADDRESS, marketplaceAbi, wallet)
  
  // Execute transaction
  console.log('   Sending transaction...')
  const tx = await marketplace[txParams.functionName](...txParams.args)
  console.log(`   TX Hash: ${tx.hash}`)
  
  console.log('   Waiting for confirmation...')
  const receipt = await tx.wait()
  console.log(`   ✅ Confirmed in block ${receipt.blockNumber}`)
  console.log('')
  
  // Step 5: Extract model ID from events
  console.log('🔍 Step 5: Extracting model ID...')
  
  let modelId = null
  for (const log of receipt.logs) {
    try {
      const parsed = marketplace.interface.parseLog({
        topics: log.topics,
        data: log.data,
      })
      if (parsed && (parsed.name === 'ModelListed' || parsed.name === 'ModelUpdated')) {
        modelId = parsed.args.id?.toString() || parsed.args[0]?.toString()
        console.log(`   ✅ Model ID: ${modelId}`)
        break
      }
    } catch (e) {
      // Not a marketplace event
    }
  }
  
  if (!modelId) {
    console.log('   ⚠️ Could not extract model ID from events')
  }
  console.log('')
  
  // Step 6: Verify model is listed
  console.log('✅ Step 6: Verification...')
  
  if (modelId) {
    const model = await marketplace.models(modelId)
    console.log(`   Name: ${model.name}`)
    console.log(`   Owner: ${model.owner}`)
    console.log(`   Listed: ${model.listed}`)
    console.log(`   Price: $${Number(model.pricePerpetual) / 1e6} USDC`)
    console.log(`   URI: ${model.uri}`)
  }
  
  console.log('')
  console.log('='.repeat(60))
  console.log('🎉 PUBLISH FLOW COMPLETED SUCCESSFULLY!')
  console.log('='.repeat(60))
  console.log('')
  console.log('Next steps:')
  console.log(`1. View model: http://localhost:3000/en/evm/models/${modelId}`)
  console.log(`2. Test purchase flow with MockUSDC`)
  console.log('')
  
  return { modelId, txHash: tx.hash }
}

main()
  .then(result => {
    console.log('Result:', result)
    process.exit(0)
  })
  .catch(error => {
    console.error('❌ Error:', error)
    process.exit(1)
  })
