# Code Cleanup Analysis - MarketPlaceAI

**Generated**: Nov 17, 2025
**Purpose**: Identify dead code, duplicates, and technical debt for safe removal
**Status**: Phase 1 & 2 COMPLETED ✅

---

## 🎯 Executive Summary

After deep analysis of the codebase, identified **4 cleanup phases** organized by safety and impact:

- **Phase 1**: ✅ COMPLETED - 100% safe deletions (backup files, debug logs)
- **Phase 2**: ✅ COMPLETED - SUI-related code (disabled for MVP, removed)
- **Phase 3**: PENDING - Obsolete API routes (replaced by indexed APIs)
- **Phase 4**: PENDING - Duplicate/deprecated pages (requires careful testing)

**Progress**: 7,693 lines of dead code removed (Phase 1 & 2)
**Total estimated reduction**: ~2,000-3,000 lines remaining

---

## 📋 Phase 1: 100% Safe Deletions ✅ COMPLETED

### Results:
- ✅ Deleted 1 backup file (1,982 lines)
- ✅ Removed 36 lines of debug logs from 3 files
- ✅ Fixed Prisma schema bug (added @updatedAt)
- **Total**: 2,018 lines removed
- **Commit**: `556abdfd`

### 1.1 Backup Files ✅ DELETED

```
src/app/[locale]/publish/wizard/step5/page.tsx.backup (1,982 lines)
```

---

### 1.2 Debug Logs 🔍 SAFE TO REMOVE

**Files with temporary debug logs**:

#### `src/lib/db.ts` (lines 33-34)
```typescript
console.log('🔍 DATABASE_URL length:', connectionString.length)
console.log('🔍 DATABASE_URL preview:', connectionString.substring(0, 50) + '...')
```
**Purpose**: Was used to debug Neon connection issues (RESOLVED).

**Action**: Remove these 2 lines.

---

#### `src/app/[locale]/publish/wizard/step5/page.tsx` (lines 301-303)
```typescript
console.log('🔍 Step5 Debug - Draft:', draft)
console.log('🔍 Step5 Debug - ViewModel:', vm)
console.log('🔍 Step5 Debug - step1:', vm?.step1)
```
**Purpose**: Debugging draft → viewModel transformation (STABLE).

**Action**: Remove these 3 lines.

---

#### `src/app/[locale]/evm/models/[id]/ModelPageClient.tsx` (lines 230-236, 237-240, 683-686, 700)
```typescript
console.log('🔍 DEBUG - IPFS modelType extraction:', {...})
console.log('🔍 DEBUG - IPFS authorship extraction:', {...})
console.log('🔍 DEBUG - enrichedData technical fields:', {...})
console.log('🔍 DEBUG - viewModel.step2.technical:', vm?.step2?.technical)
```
**Purpose**: Debugging IPFS metadata parsing (WORKING).

**Action**: Remove these 4 debug blocks.

---

### 1.3 Empty/Placeholder Files

**To verify** (may be empty or unused):
- `src/app/.DS_Store` ← Mac system file, should be in `.gitignore`

---

## 📋 Phase 2: SUI-Related Code ✅ COMPLETED

### Results:
- ✅ Deleted 31 files (5,675 lines)
- ✅ Removed all SUI blockchain integration
- ✅ Removed obsolete pages without locale prefix
- ✅ Removed obsolete API routes (SUI-based and replaced)
- ✅ Updated EVM adapter with inlined types
- **Total**: 5,675 lines removed
- **Commit**: `252d8998`

### 2.1 SUI Adapter & Libs ✅ DELETED

```
src/adapters/sui/                    # SUI blockchain adapters
src/lib/sui/                         # SUI utilities
src/components/StyledSuiConnectButton.tsx
src/components/SuiNativeButtonWithFallback.tsx
```

**Why**: Project runs in **EVM-only mode** for MVP (per user's memory).

**Risk**: **MEDIUM** - These files are isolated, but verify no imports remain.

**Action (Phase 2)**:
1. Search for any `import` statements referencing these files
2. If none found, delete entire folders/files
3. Update `.gitignore` to exclude SUI-related folders if re-enabled later

---

### 2.2 SUI-Related Pages

```
src/app/[locale]/licenses/page.tsx   # Old SUI licenses page
```

**Current**: Only `/evm/licenses` is used (indexed API).

**Risk**: **LOW** - Page is not linked in navigation.

**Action**: Verify no routes point to this, then delete.

---

## 📋 Phase 3: Obsolete API Routes

### 3.1 Replaced by Indexed APIs 🔄

#### `/api/models-page/route.ts` ❌ REPLACED

**File**: `src/app/api/models-page/route.ts`

**Replaced by**: `/api/indexed/models/route.ts`

**Used by**: ~~`/en/models`~~ (now uses `/api/indexed/models`)

**Verification**:
```bash
grep -r "models-page" src/app/[locale]/models/
```

**Result**: No matches found ✅

**Action**: DELETE `src/app/api/models-page/route.ts`

---

### 3.2 Potentially Obsolete (Needs Verification)

#### `/api/models/evm/[id]/route.ts` ⚠️ MAY BE REPLACED

**File**: `src/app/api/models/evm/[id]/route.ts`

**Replaced by**: `/api/indexed/models/[id]/route.ts` (new)

**Still used by**:
- `src/lib/fetchEvmModel.ts` (line 63)
- `src/app/evm/licenses/page.tsx` (line 235) ← **Licenses page still uses it for artifacts drawer**
- `src/app/[locale]/evm/models/[id]/ModelPageClient.tsx` (line 92) ← **Client-side fallback**

**Risk**: **HIGH** - Still actively used as fallback when indexed API fails.

**Action**: **KEEP FOR NOW** (fallback mechanism). Can be deprecated later after confirming all data is indexed.

---

### 3.3 Unused API Routes (To Verify)

**Candidates** (need usage scan):
- `/api/model-info/route.ts` - What does this do?
- `/api/metrics/route.ts` - Is this used anywhere?

**Action (Phase 3)**:
```bash
# Search for usage of each route
grep -r "/api/model-info" src/
grep -r "/api/metrics" src/
```

If no matches → DELETE.

---

## 📋 Phase 4: Duplicate/Deprecated Pages

### 4.1 Pages Without Locale Prefix

#### `/app/models/[id]/page.tsx` ❌ DEPRECATED (No locale)

**File**: `src/app/models/[id]/page.tsx`

**Replaced by**: `src/app/[locale]/evm/models/[id]/page.tsx` (with i18n)

**Risk**: **MEDIUM** - May be old route before i18n was added.

**Verification**: Check if this route is accessible or redirects.

**Action**: DELETE if not actively routing.

---

#### `/app/models/upload/page.tsx` ❌ DEPRECATED (Old upload UI)

**File**: `src/app/models/upload/page.tsx`

**Replaced by**: `src/app/[locale]/publish/wizard/` (5-step wizard)

**Why**: Old single-page upload form, replaced by multi-step wizard.

**Risk**: **LOW** - Not linked in navigation.

**Action**: DELETE.

---

#### `/app/upload/page.tsx` ❌ DEPRECATED

**File**: `src/app/upload/page.tsx`

**Replaced by**: Wizard publish flow.

**Action**: DELETE.

---

#### `/app/publish/wizard/` (No locale) ❌ DEPRECATED

**Files**:
```
src/app/publish/wizard/page.tsx
src/app/publish/wizard/step1/page.tsx
src/app/publish/wizard/step2/page.tsx
src/app/publish/wizard/step3/page.tsx
src/app/publish/wizard/step4/page.tsx
src/app/publish/wizard/step5/page.tsx
```

**Replaced by**: `src/app/[locale]/publish/wizard/` (with i18n)

**Risk**: **MEDIUM** - Verify no redirects or imports reference these.

**Action (Phase 4)**:
1. Search for any imports from `/app/publish/wizard/`
2. If none found, DELETE entire folder

---

### 4.2 Debug/Test Pages

#### `/app/debug/model/[id]/page.tsx` ⚠️ DEBUG PAGE

**File**: `src/app/debug/model/[id]/page.tsx`

**Purpose**: Debug/testing page for model display.

**Risk**: **LOW** - Not production-facing.

**Options**:
1. Keep if still useful for debugging
2. Delete if no longer needed
3. Move to a `/dev` folder (not deployed to production)

**Action**: User decision - keep or delete?

---

## 📋 Phase 5: Optional Optimizations

### 5.1 Consolidate Duplicate Pages

Currently have 2 model detail implementations:

1. **`/app/[locale]/models/[slug]/page.tsx`** (SUI-based, uses slug)
2. **`/app/[locale]/evm/models/[id]/page.tsx`** (EVM-based, uses numeric ID)

**Options**:
- Keep both (different blockchain systems)
- Merge into single detail page with chain detection
- Delete SUI version (Phase 2 if MVP is EVM-only)

**Recommendation**: Keep both for now (SUI may be re-enabled later).

---

### 5.2 Remove Unused Imports

**Tool**: Use ESLint with `no-unused-vars` rule.

**Command**:
```bash
npm run lint -- --fix
```

This will auto-remove unused imports.

---

## 🗂️ Cleanup Phases Summary

| Phase | Risk | Files Affected | Est. Lines | Can Execute Now? |
|-------|------|----------------|------------|------------------|
| **Phase 1** | ✅ SAFE | 1 backup + 10 debug logs | ~20 | ✅ YES |
| **Phase 2** | 🟡 MEDIUM | SUI adapters/components | ~500 | ⚠️ If EVM-only confirmed |
| **Phase 3** | 🟠 HIGH | Obsolete API routes | ~300 | ⚠️ After usage verification |
| **Phase 4** | 🔴 RISKY | Duplicate pages (no locale) | ~1,500 | ❌ Requires testing |

---

## 🚀 Recommended Execution Order

### Step 1: Execute Phase 1 NOW ✅
- Delete backup file
- Remove debug logs
- **Risk**: ZERO
- **Benefit**: Clean codebase, less noise

### Step 2: Verify Phase 2 (SUI code)
```bash
grep -r "sui" src/app --include="*.tsx" --include="*.ts"
grep -r "StyledSuiConnectButton" src/
grep -r "SuiNativeButtonWithFallback" src/
```

If no active imports → DELETE SUI code.

### Step 3: Verify Phase 3 (API routes)
```bash
grep -r "/api/models-page" src/
grep -r "/api/model-info" src/
grep -r "/api/metrics" src/
```

For each with 0 matches → DELETE route.

### Step 4: Test Phase 4 (Duplicate pages)
1. Navigate to each old route (e.g., `/models/1`, `/upload`)
2. If 404 or redirects → Safe to delete
3. If still renders → Need migration plan

---

## 📊 Expected Impact

**Before cleanup**:
- ~15,000 lines of code in `/src`

**After Phase 1**:
- ~14,980 lines (-20)

**After Phase 1-3**:
- ~14,200 lines (-800)

**After Phase 1-4**:
- ~12,700 lines (-2,300)

**Benefits**:
- ✅ Faster builds
- ✅ Less confusion for new developers
- ✅ Easier maintenance
- ✅ Smaller bundle size

---

## ⚠️ Safety Checklist Before Each Phase

- [ ] Run `npm run build` to ensure no broken imports
- [ ] Run `npm run lint` to catch unused variables
- [ ] Test affected routes manually
- [ ] Commit changes with clear message (e.g., "Phase 1: Remove debug logs and backup files")
- [ ] Have rollback plan (git history)

---

## 🎯 Next Steps

1. **User approval**: Review this analysis and approve Phase 1
2. **Execute Phase 1**: Remove backup + debug logs (100% safe)
3. **Verify Phase 2**: Scan for SUI imports
4. **Plan Phase 3**: Test API route usage
5. **Test Phase 4**: Verify duplicate pages are truly unused

**Estimated time**:
- Phase 1: 5 minutes
- Phase 2: 15 minutes (verification + deletion)
- Phase 3: 30 minutes (careful verification)
- Phase 4: 1-2 hours (testing + migration if needed)

---

**Ready to proceed with Phase 1?**
