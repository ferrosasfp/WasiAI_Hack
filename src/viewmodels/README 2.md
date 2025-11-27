# ViewModels Architecture

## Overview

This module provides a **unified source of truth** for model data presentation across:
- **Step 5 (Review & Publish)** in the wizard
- **Model Detail Page** (`/models/:id`)

## Key Principles

1. **Single Source of Truth**: One data structure for both wizard and detail page
2. **Type Safety**: Full TypeScript interfaces with strict contracts
3. **Defensive Rendering**: All fields are optional; UI hides missing data
4. **Currency Consistency**: Always show chain currency (AVAX/ETH), never fiat
5. **Localization Ready**: Supports ES/EN with consistent labeling

## Architecture

```
┌──────────────────────────────────────────┐
│      UnifiedModelViewModel               │
│  ┌────────────────────────────────────┐  │
│  │  Step1: Identity & Classification  │  │
│  │  Step2: Customer + Technical       │  │
│  │  Step3: Artifacts                  │  │
│  │  Step4: Licenses & Terms           │  │
│  │  Buy: (optional, detail page only) │  │
│  └────────────────────────────────────┘  │
└──────────────────────────────────────────┘
           │                    │
           ▼                    ▼
    ┌─────────────┐      ┌─────────────┐
    │  Step 5 UI  │      │ Detail Page │
    │  (wizard)   │      │   (public)  │
    └─────────────┘      └─────────────┘
```

## Usage

### In Wizard (Step 5)

```typescript
import { createViewModelFromDraft } from '@/viewmodels'

// Load draft
const draft = await loadDraft()

// Create ViewModel
const viewModel = createViewModelFromDraft(draft)

// Use in UI
<Box>
  <Typography>{viewModel.step1.name}</Typography>
  <Typography>{viewModel.step1.summary}</Typography>
  {viewModel.step2.customer.valueProp && (
    <Typography>{viewModel.step2.customer.valueProp}</Typography>
  )}
</Box>
```

### In Model Detail Page

```typescript
import { createViewModelFromPublished } from '@/viewmodels'

// Fetch published model
const model = await fetch(`/api/models/${id}`).then(r => r.json())

// Create ViewModel with buy data
const viewModel = createViewModelFromPublished(
  model,
  contractAddress, // from blockchain
  modelId // on-chain ID
)

// Use in UI
<Box>
  {viewModel.buy?.perpetualEnabled && (
    <Button>
      Buy {viewModel.step4.pricing.perpetual?.priceFormatted} {viewModel.step1.chainSymbol}
    </Button>
  )}
</Box>
```

## ViewModel Contracts

### Step 1: Identity & Classification

**What it contains:**
- Model name, tagline, summary, cover image
- Business category and model type
- Technical categories and tags
- Industries, use cases, tasks, modalities
- Chain, visibility, locale
- Author info and links

**When to use:**
- Hero section
- Metadata badges
- Author attribution

### Step 2: Customer Sheet & Technical Config

**What it contains:**

**Customer Sheet:**
- Value proposition and business description
- Expected impact
- Inputs, outputs, examples
- Limitations, prohibited uses
- Privacy, deployment, support

**Technical Config:**
- Capabilities (tasks, modalities)
- Architecture (frameworks, precisions, quantization, sizes)
- Dependencies (pip packages)
- Runtime (Python, CUDA, OS, accelerators)
- Resources (VRAM, CPU, RAM)
- Inference (batch size, context, tokens, Triton)

**When to use:**
- Customer-facing explanations
- Technical specifications
- Resource requirements

### Step 3: Artifacts

**What it contains:**
- List of IPFS artifacts (filename, CID, URI, size, SHA-256)
- Download/execution instructions
- Demo configuration

**When to use:**
- Artifact tables
- Download instructions
- Demo integration

### Step 4: Licenses & Terms

**What it contains:**
- Pricing (perpetual and subscription with formatted values)
- Revenue share (creator royalty %, marketplace fee %)
- Revenue splits (marketplace/creator/seller percentages)
- Rights (API, download, transferable)
- Delivery mode
- Terms summary and full markdown

**When to use:**
- Pricing display
- Revenue calculator
- License terms
- Rights badges

## Field Mapping

### From Draft (Wizard)

```typescript
{
  name → step1.name
  summary → step1.summary
  businessCategory → step1.businessCategory
  valueProp → step2.customer.valueProp
  frameworks → step2.technical.frameworks
  price_perpetual → step4.pricing.perpetual.price
  // ... etc
}
```

### From Published Model (Detail)

Same mapping as draft, plus:
- `isPublished: true`
- `buy` object with contract data

## Defensive Rendering Pattern

```typescript
{viewModel.step2.customer.valueProp && (
  <Box>
    <Typography variant="caption">Value Proposition</Typography>
    <Typography>{viewModel.step2.customer.valueProp}</Typography>
  </Box>
)}
```

**Never render:**
- Empty strings
- Undefined values
- Empty arrays

## Price Formatting

All prices are:
- Stored as strings in chain currency
- Formatted to 2 decimals (rounded up)
- Displayed with chain symbol (AVAX/ETH)
- **Never converted to fiat**

Example:
```typescript
`${viewModel.step4.pricing.perpetual?.priceFormatted} ${viewModel.step1.chainSymbol}`
// → "2.50 AVAX"
```

## Revenue Share Calculation

Given:
- `creatorRoyaltyPct`: 10%
- `marketplaceFeePct`: 5%

Result:
```typescript
{
  marketplace: 5,
  creator: 10,
  seller: 85  // 100 - 5 - 10
}
```

## Extending ViewModels

To add a new field:

1. **Add to type** (`types.ts`):
   ```typescript
   export interface Step1ViewModel {
     // ... existing fields
     newField?: string
   }
   ```

2. **Add to factory** (`factories.ts`):
   ```typescript
   export function createStep1ViewModel(data: any): Step1ViewModel {
     return {
       // ... existing mappings
       newField: safeString(data.newField)
     }
   }
   ```

3. **Use in UI**:
   ```typescript
   {viewModel.step1.newField && (
     <Typography>{viewModel.step1.newField}</Typography>
   )}
   ```

## Testing

To test ViewModels:

```typescript
import { createViewModelFromDraft } from '@/viewmodels'

const mockDraft = {
  name: 'Test Model',
  summary: 'A test model',
  chain: 'avalanche',
  price_perpetual: 2.5,
  // ... other fields
}

const viewModel = createViewModelFromDraft(mockDraft)

console.log(viewModel.step1.name) // → "Test Model"
console.log(viewModel.step1.chainSymbol) // → "AVAX"
console.log(viewModel.step4.pricing.perpetual?.priceFormatted) // → "2.50"
```

## Migration from Old Code

### Before (Direct data access):
```typescript
<Typography>{draft?.name}</Typography>
<Typography>{draft?.description}</Typography>
```

### After (ViewModel):
```typescript
const viewModel = createViewModelFromDraft(draft)
<Typography>{viewModel.step1.name}</Typography>
<Typography>{viewModel.step1.summary}</Typography>
```

## Benefits

✅ **Type Safety**: Catch errors at compile time  
✅ **Consistency**: Same data structure everywhere  
✅ **Maintainability**: Change once, update everywhere  
✅ **Testability**: Easy to mock and test  
✅ **Defensive**: Handles missing data gracefully  
✅ **Scalable**: Easy to extend with new fields  

## Support

For questions or issues, refer to:
- Type definitions: `src/viewmodels/types.ts`
- Factory functions: `src/viewmodels/factories.ts`
- This README: `src/viewmodels/README.md`
