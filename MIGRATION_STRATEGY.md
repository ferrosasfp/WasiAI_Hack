# Migration Strategy: ViewModels in Step 5

## Status: Phase 1 Complete ✅

### What We've Done

1. **Created ViewModel Architecture** (`/src/viewmodels/`)
   - Complete TypeScript interfaces for all 4 steps
   - Factory functions for draft and published data
   - Comprehensive documentation

2. **Integrated ViewModel in Step 5**
   - Import added: `import { createViewModelFromDraft, UnifiedModelViewModel } from '@/viewmodels'`
   - ViewModel creation: `const viewModel = useMemo(() => createViewModelFromDraft(draft), [draft])`
   - Migration guide comments added
   - **Zero visual changes** - UI remains identical

3. **Preserved Backwards Compatibility**
   - `metadata` object still exists and works
   - All existing code continues to function
   - No breaking changes

## Current State

### Step 5 (`/src/app/[locale]/publish/wizard/step5/page.tsx`)

```typescript
// Both available:
const metadata = useMemo(() => { ... }, [draft])  // OLD (still works)
const viewModel = useMemo(() => createViewModelFromDraft(draft), [draft])  // NEW (available)

// Old code still works:
{metadata?.name}
{metadata?.businessCategory}

// New code can use:
{viewModel?.step1.name}
{viewModel?.step1.businessCategory}
```

## Migration Paths

### Option A: Progressive Migration (Recommended)

Migrate sections one at a time as needed:

1. **Start with Hero/Identity Section**
   ```typescript
   // Before
   <Typography>{metadata?.name}</Typography>
   
   // After
   <Typography>{viewModel?.step1.name}</Typography>
   ```

2. **Then Business Section**
   ```typescript
   // Before
   {metadata?.valueProp}
   
   // After
   {viewModel?.step2.customer.valueProp}
   ```

3. **Continue with other sections**

### Option B: Component Extraction

Extract sections into separate components that use ViewModels:

```typescript
// src/components/Step5/IdentitySection.tsx
interface Props {
  viewModel: Step1ViewModel
  onEdit: () => void
}

export function IdentitySection({ viewModel, onEdit }: Props) {
  return (
    <Paper>
      <Typography>{viewModel.name}</Typography>
      <Typography>{viewModel.businessCategory}</Typography>
      {/* ... */}
    </Paper>
  )
}

// In Step 5:
{viewModel && <IdentitySection viewModel={viewModel.step1} onEdit={() => router.push('{base}/step1')} />}
```

### Option C: Full Refactor (Future)

When ready, replace all `metadata?.` references with `viewModel?.stepX.` references.

## Field Mapping Reference

```typescript
// STEP 1: Identity & Classification
metadata?.name                    → viewModel?.step1.name
metadata?.tagline                 → viewModel?.step1.tagline
metadata?.summary                 → viewModel?.step1.summary
metadata?.businessCategory        → viewModel?.step1.businessCategory
metadata?.modelType               → viewModel?.step1.modelTypeBusiness
metadata?.industries              → viewModel?.step1.industries
metadata?.useCases                → viewModel?.step1.useCases
metadata?.chain                   → viewModel?.step1.chain
metadata?.chainSymbol             → viewModel?.step1.chainSymbol
metadata?.author                  → viewModel?.step1.authorName / authorLinks

// STEP 2: Customer & Technical
metadata?.valueProp               → viewModel?.step2.customer.valueProp
metadata?.customerDescription     → viewModel?.step2.customer.customerDescription
metadata?.expectedImpact          → viewModel?.step2.customer.expectedImpact
metadata?.inputs                  → viewModel?.step2.customer.inputs
metadata?.outputs                 → viewModel?.step2.customer.outputs
metadata?.risks                   → viewModel?.step2.customer.risks
metadata?.prohibited              → viewModel?.step2.customer.prohibited
metadata?.tasks                   → viewModel?.step2.technical.tasks
metadata?.modalities              → viewModel?.step2.technical.modalities
metadata?.frameworks              → viewModel?.step2.technical.frameworks
metadata?.architectures           → viewModel?.step2.technical.architectures
metadata?.vramGB                  → viewModel?.step2.technical.vramGB

// STEP 3: Artifacts
metadata?.artifacts               → viewModel?.step3.artifacts
metadata?.downloadNotes           → viewModel?.step3.downloadInstructions

// STEP 4: Licenses
metadata?.licensePolicy           → viewModel?.step4
metadata?.licensePolicy?.perpetual?.priceRef
                                  → viewModel?.step4.pricing.perpetual?.priceFormatted
```

## Benefits of Migration

1. **Type Safety**: Full TypeScript support with autocomplete
2. **Consistency**: Same data structure in wizard and detail page
3. **Maintainability**: Single source of truth
4. **Defensive Rendering**: Built-in null/undefined handling
5. **Future-Proof**: Easy to add new fields

## Testing Strategy

When migrating sections:

1. **Visual Regression**: Compare before/after screenshots
2. **Data Flow**: Verify all fields render correctly
3. **Edge Cases**: Test with empty/missing data
4. **Localization**: Verify ES/EN labels work

## Next Steps

### Immediate (Phase 2)
- ✅ ViewModel integrated in Step 5
- ⏭️ Update ModelDetailView to use ViewModel (already partially done)
- ⏭️ Validate UI remains identical
- ⏭️ Test with real data

### Short Term
- Migrate Step 5 Hero section to use ViewModel
- Migrate Step 5 Business section to use ViewModel
- Extract reusable components

### Long Term
- Full Step 5 migration to ViewModels
- Deprecate `metadata` object
- Create E2E tests with ViewModels

## Rollback Plan

If issues arise:

1. **Immediate**: ViewModel is additive, no changes needed
2. **Remove imports**: Comment out ViewModel creation
3. **Restore backup**: `/src/app/[locale]/publish/wizard/step5/page.tsx.backup`

## Support

- **ViewModel Documentation**: `/src/viewmodels/README.md`
- **Type Definitions**: `/src/viewmodels/types.ts`
- **Factory Functions**: `/src/viewmodels/factories.ts`
- **This Guide**: `/MIGRATION_STRATEGY.md`

---

**Last Updated**: 2024-11-12  
**Status**: Phase 1 Complete - ViewModel Available, Zero Visual Changes
