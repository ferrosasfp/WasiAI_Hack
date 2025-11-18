# Hardcode Analysis - MarketPlaceAI

**Date**: November 18, 2025
**Purpose**: Identify hardcoded values that should be configurable
**Status**: Analysis Complete

---

## Executive Summary

Found **150+ instances** of hardcoded values across multiple categories:

| Category | Count | Priority | Risk Level |
|----------|-------|----------|------------|
| **IPFS Gateway URLs** | 45+ | HIGH | Medium |
| **Chain IDs** | 30+ | HIGH | Medium |
| **API Endpoints** | 15+ | MEDIUM | Low |
| **Timeouts & Limits** | 25+ | MEDIUM | Low |
| **Contract Addresses** | 8+ | HIGH | Medium |
| **Magic Numbers** | 30+ | LOW | Low |

---

## 1. IPFS Gateway URLs (HIGH PRIORITY)

### Issue:
Multiple hardcoded IPFS gateway URLs throughout the codebase. If a gateway goes down, requires code changes to switch.

### Locations:

#### `https://ipfs.io/ipfs/` (Primary Gateway)
**Files affected**: 15+
- `lib/indexer.ts` (lines 337, 365)
- `components/ModelDetailView.tsx` (line 183)
- `app/[locale]/publish/wizard/step1/page.tsx` (lines 262, 299, 332, 368, 572)
- `app/[locale]/publish/wizard/step3/page.tsx` (line 767)
- `app/[locale]/publish/wizard/step5/page.tsx` (line 803)
- `app/[locale]/evm/models/[id]/ModelPageClient.tsx` (line 1158)
- `app/evm/licenses/page.tsx` (line 166)

#### `https://gateway.pinata.cloud` (Secondary Gateway)
**Files affected**: 5+
- `config/env.ts` (line 19) - **Good**: Has fallback
- `app/api/metadata/license/[chainId]/[tokenId]/route.ts` (line 38)
- `app/[locale]/models/page.tsx` (line 118)

#### `https://api.pinata.cloud` (Pinata API)
**Files affected**: 8+
- `app/api/ipfs/pin-file/route.ts` (lines 27, 81)
- `app/api/ipfs/pin-cid/route.ts` (line 21)
- `app/api/ipfs/pin-json/route.ts` (line 7)
- `app/api/ipfs/upload/route.ts` (lines 25, 51, 68)
- `app/api/pinata/upload/route.ts` (lines 36, 54)
- `app/api/models/publish/route.ts` (line 18)

### Recommendation:
```typescript
// Create centralized config
const IPFS_GATEWAYS = {
  primary: process.env.NEXT_PUBLIC_IPFS_GATEWAY_PRIMARY || 'https://ipfs.io',
  secondary: process.env.NEXT_PUBLIC_IPFS_GATEWAY_SECONDARY || 'https://gateway.pinata.cloud',
  fallbacks: [
    process.env.NEXT_PUBLIC_IPFS_GATEWAY_3 || 'https://dweb.link',
    process.env.NEXT_PUBLIC_IPFS_GATEWAY_4 || 'https://cf-ipfs.com',
  ]
}

const PINATA_API_URL = process.env.PINATA_API_URL || 'https://api.pinata.cloud'
```

**Impact**: HIGH - Gateway downtime could break IPFS functionality
**Effort**: MEDIUM - Requires refactoring 15+ files

---

## 2. Chain IDs (HIGH PRIORITY)

### Issue:
Chain IDs are hardcoded as magic numbers throughout the codebase. Makes it hard to add new chains or understand what chain ID represents what network.

### Hardcoded Values:
- `43113` - Avalanche Fuji (testnet) - **30+ occurrences**
- `43114` - Avalanche Mainnet - **20+ occurrences**
- `84532` - Base Sepolia (testnet) - **25+ occurrences**
- `8453` - Base Mainnet - **20+ occurrences**

### Locations:

#### Direct comparisons:
```typescript
// app/[locale]/publish/wizard/step4/page.tsx (lines 477-478)
if (id === 43114 || id === 43113) setUnit('AVAX')
else if (id === 8453 || id === 84532) setUnit('ETH')

// components/GlobalHeaderEvm.tsx (lines 127, 162, 232, 255)
const kind = (v===8453||v===84532)?'base':'avax'

// app/[locale]/evm/models/[id]/ModelPageClient.tsx (lines 569-570)
if (id === 43113 || id === 43114) return '/icons/avalanche.svg'
if (id === 84532 || id === 8453) return '/icons/base.svg'
```

#### Map objects:
```typescript
// lib/indexer.ts (lines 38-48)
const CHAINS = {
  43113: { chain: avalancheFuji, rpc: ... },
  43114: { chain: avalanche, rpc: ... },
  84532: { chain: baseSepolia, rpc: ... },
  8453: { chain: base, rpc: ... },
}

// app/[locale]/evm/models/[id]/ModelPageClient.tsx (lines 484-487)
const map: Record<number, `0x${string}` | undefined> = {
  43113: (process.env.NEXT_PUBLIC_EVM_MARKET_43113 as any),
  43114: (process.env.NEXT_PUBLIC_EVM_MARKET_43114 as any),
  84532: (process.env.NEXT_PUBLIC_EVM_MARKET_84532 as any),
  8453: (process.env.NEXT_PUBLIC_EVM_MARKET_8453 as any),
}
```

### Recommendation:
```typescript
// config/chains.ts
export const CHAIN_IDS = {
  AVALANCHE_FUJI: 43113,
  AVALANCHE_MAINNET: 43114,
  BASE_SEPOLIA: 84532,
  BASE_MAINNET: 8453,
} as const

export const CHAIN_CONFIG = {
  [CHAIN_IDS.AVALANCHE_FUJI]: {
    name: 'Avalanche Fuji',
    symbol: 'AVAX',
    icon: '/icons/avalanche.svg',
    color: '#E84142',
    isTestnet: true,
    rpc: process.env.NEXT_PUBLIC_AVALANCHE_FUJI_RPC,
    marketAddress: process.env.NEXT_PUBLIC_EVM_MARKET_43113,
  },
  // ... etc
}

// Usage
if (chainId === CHAIN_IDS.AVALANCHE_FUJI || chainId === CHAIN_IDS.AVALANCHE_MAINNET) {
  setUnit(CHAIN_CONFIG[chainId].symbol)
}
```

**Impact**: HIGH - Makes adding new chains difficult
**Effort**: HIGH - Requires refactoring 30+ files

---

## 3. Timeouts & Delays (MEDIUM PRIORITY)

### Issue:
Timeout values are scattered throughout code as magic numbers. Hard to tune for performance or adjust for network conditions.

### Locations:

#### Database Connection Timeouts:
```typescript
// lib/db.ts (lines 35-36)
idleTimeoutMillis: 30000,        // 30 seconds
connectionTimeoutMillis: 10000,  // 10 seconds
```

#### HTTP Request Timeouts:
```typescript
// lib/fetchEvmModel.ts (line 47)
async function fetchWithTimeout(url: string, init: RequestInit = {}, ms = 10000)

// lib/indexer.ts (line 344)
signal: AbortSignal.timeout(10000)  // 10 seconds

// app/api/ipfs/pin-file/route.ts (line 33)
const tmo = setTimeout(()=>controller.abort(), 600000)  // 10 MINUTES for large files
```

#### Cache TTLs:
```typescript
// app/evm/licenses/page.tsx (lines 28-29)
const STATUS_CACHE_TTL = 5 * 60 * 1000   // 5 minutes
const LOG_CACHE_TTL = 10 * 60 * 1000     // 10 minutes

// app/api/keys/get/route.ts (line 27)
const KEYS_CACHE_TTL = Math.max(0, Number(process.env.KEYS_CACHE_TTL_MS || 60000))  // 1 minute

// app/providers-evm.tsx (lines 18-20)
staleTime: 60 * 1000,           // 1 minute
gcTime: 5 * 60 * 1000,          // 5 minutes
retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000)
```

#### Retry Delays:
```typescript
// components/ModelCard.tsx (line 266)
const wait = ra ? ... : 120 * Math.pow(2, attempt)  // Exponential backoff starting at 120ms

// app/api/ipfs/pin-file/route.ts (line 50)
await new Promise(r=>setTimeout(r, 1000 * attempt))  // Linear backoff
```

#### UI Feedback Timeouts:
```typescript
// components/ModelCard.tsx (line 660)
autoHideDuration={2000}  // Snackbar auto-hide

// components/ModelDetailView.tsx (line 171)
setTimeout(() => setCopiedCid(null), 2000)  // Reset copied state
```

### Recommendation:
```typescript
// config/timeouts.ts
export const TIMEOUTS = {
  // Database
  DB_IDLE: Number(process.env.DB_IDLE_TIMEOUT_MS) || 30000,
  DB_CONNECTION: Number(process.env.DB_CONNECTION_TIMEOUT_MS) || 10000,
  
  // HTTP Requests
  HTTP_DEFAULT: Number(process.env.HTTP_TIMEOUT_MS) || 10000,
  HTTP_IPFS_UPLOAD: Number(process.env.HTTP_IPFS_UPLOAD_TIMEOUT_MS) || 600000,
  
  // Cache TTLs
  CACHE_LICENSE_STATUS: Number(process.env.CACHE_LICENSE_STATUS_MS) || 5 * 60 * 1000,
  CACHE_LICENSE_LOGS: Number(process.env.CACHE_LICENSE_LOGS_MS) || 10 * 60 * 1000,
  CACHE_KEYS: Number(process.env.CACHE_KEYS_MS) || 60000,
  
  // UI
  SNACKBAR_DURATION: 2000,
  COPIED_FEEDBACK_DURATION: 2000,
  
  // Retry
  RETRY_BASE_DELAY: 120,
  RETRY_MAX_DELAY: 30000,
}
```

**Impact**: MEDIUM - Affects performance and UX
**Effort**: LOW - Easy to centralize

---

## 4. Block Scanning Limits (MEDIUM PRIORITY)

### Issue:
Blockchain scanning limits hardcoded, making it hard to tune indexer performance.

### Locations:

```typescript
// lib/indexer.ts (lines 14-15, 32)
maxBlocks?: number // Max blocks to scan per run (default: 2000)
batchSize?: number // Blocks per batch (default: 500)
const { chainId, maxBlocks = 2000, batchSize = 500 } = options

// app/evm/licenses/page.tsx (line 215)
const STEP = 2000n  // Block scanning step size
for (let i = 0; i < 10000 && to > 0n; i++)  // Max 10,000 iterations
```

### Recommendation:
```typescript
// config/indexer.ts
export const INDEXER_CONFIG = {
  MAX_BLOCKS_PER_RUN: Number(process.env.INDEXER_MAX_BLOCKS) || 2000,
  BATCH_SIZE: Number(process.env.INDEXER_BATCH_SIZE) || 500,
  SCAN_STEP_SIZE: BigInt(process.env.INDEXER_SCAN_STEP) || 2000n,
  MAX_ITERATIONS: Number(process.env.INDEXER_MAX_ITERATIONS) || 10000,
}
```

**Impact**: MEDIUM - Affects indexer performance
**Effort**: LOW - Easy to extract

---

## 5. Web Vitals Thresholds (LOW PRIORITY)

### Issue:
Performance metric thresholds hardcoded.

### Location:
```typescript
// components/WebVitals.tsx (lines 43-49)
const thresholds = {
  CLS: { good: 0.1, needsImprovement: 0.25 },
  FID: { good: 100, needsImprovement: 300 },
  FCP: { good: 1800, needsImprovement: 3000 },
  LCP: { good: 1800, needsImprovement: 4000 },
  TTFB: { good: 200, needsImprovement: 500 },
  INP: { good: 200, needsImprovement: 500 },
}
```

### Recommendation:
These are Google's standard thresholds, so hardcoding is acceptable. **No action needed**.

---

## 6. Contract Address Patterns (LOW PRIORITY)

### Issue:
Zero address used for checks.

### Location:
```typescript
// lib/indexer.ts (line 183)
if (!modelData || modelData[0] === '0x0000000000000000000000000000000000000000') {

// config/env.ts (lines 14, 18, 22) - Used as fallbacks
.catch('0x0000000000000000000000000000000000000000000000000000000000000000')
```

### Recommendation:
```typescript
// config/constants.ts
export const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000' as const
export const ZERO_HASH = '0x0000000000000000000000000000000000000000000000000000000000000000' as const

// Usage
if (!modelData || modelData[0] === ZERO_ADDRESS) {
```

**Impact**: LOW - Improves readability
**Effort**: LOW - Simple refactor

---

## 7. Image & UI Dimensions (LOW PRIORITY)

### Issue:
UI dimensions and image sizes hardcoded.

### Locations:
```typescript
// components/evm/EvmModelDetailPage.tsx (line 7)
maxWidth: 1000

// config/env.ts (lines 27-29)
NEXT_PUBLIC_IMG_MAX_W: z.coerce.number().catch(1280),
NEXT_PUBLIC_IMG_MAX_H: z.coerce.number().catch(720),
NEXT_PUBLIC_IMG_QUALITY: z.coerce.number().min(0).max(1).catch(0.8),
```

### Recommendation:
Already using env vars for image settings ✅. UI dimensions are design decisions, hardcoding is OK.

---

## 8. RPC Fallback URLs (MEDIUM PRIORITY)

### Issue:
Public RPC URLs hardcoded as fallbacks.

### Locations:
```typescript
// app/api/protected/fetch/route.ts (line 13)
const SUI_RPC_URL = process.env.SUI_RPC_URL || 'https://fullnode.testnet.sui.io:443'

// app/api/keys/get/route.ts (line 35)
const RPC_URL = process.env.SUI_RPC_URL || process.env.NEXT_PUBLIC_SUI_RPC_URL || 'https://fullnode.testnet.sui.io:443'

// app/api/models/publish/route.ts (line 164)
const suiRpc = process.env.SUI_RPC_URL || process.env.NEXT_PUBLIC_SUI_RPC_URL || 'https://fullnode.testnet.sui.io:443'

// app/api/metadata/license/[chainId]/[tokenId]/route.ts (lines 13-15)
if (chainId === 43113) return 'https://api.avax-test.network/ext/bc/C/rpc'
if (chainId === 84532) return 'https://sepolia.base.org'

// app/[locale]/publish/wizard/step4/page.tsx (lines 526-527)
if (chainId === 8453 || chainId === 84532) url = process.env.RPC_BASE || 'https://sepolia.base.org'
if (chainId === 43114 || chainId === 43113) url = process.env.RPC_AVAX || 'https://api.avax-test.network/ext/bc/C/rpc'
```

### Recommendation:
```typescript
// config/rpc.ts
export const RPC_URLS = {
  [CHAIN_IDS.AVALANCHE_FUJI]: process.env.NEXT_PUBLIC_AVALANCHE_FUJI_RPC || 'https://api.avax-test.network/ext/bc/C/rpc',
  [CHAIN_IDS.AVALANCHE_MAINNET]: process.env.NEXT_PUBLIC_AVALANCHE_MAINNET_RPC || 'https://api.avax.network/ext/bc/C/rpc',
  [CHAIN_IDS.BASE_SEPOLIA]: process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC || 'https://sepolia.base.org',
  [CHAIN_IDS.BASE_MAINNET]: process.env.NEXT_PUBLIC_BASE_MAINNET_RPC || 'https://mainnet.base.org',
}
```

**Impact**: MEDIUM - Public RPCs can be rate-limited
**Effort**: LOW - Easy to centralize

---

## 9. Analytics & External Services (COMMENTED OUT)

### Location:
```typescript
// app/api/web-vitals/route.ts (lines 20, 37)
// await fetch('https://vitals.vercel-analytics.com/v1/vitals', ...)
// await fetch(`https://www.google-analytics.com/mp/collect?...`, ...)
```

### Status:
Commented out, no action needed.

---

## Priority Summary

### High Priority (Do First):
1. **IPFS Gateway URLs** - Centralize gateway configuration
2. **Chain IDs** - Create chain configuration system
3. **RPC Fallback URLs** - Centralize RPC configuration

### Medium Priority (Do Next):
4. **Timeouts & Delays** - Extract to centralized config
5. **Block Scanning Limits** - Make indexer configurable

### Low Priority (Nice to Have):
6. **Zero Address Constants** - Extract for readability
7. **Contract Address Helpers** - Create utility functions

---

## Proposed File Structure

```
src/config/
  ├── chains.ts         # Chain IDs, names, icons, colors
  ├── rpc.ts            # RPC URLs per chain
  ├── ipfs.ts           # IPFS gateway configuration
  ├── timeouts.ts       # All timeout values
  ├── indexer.ts        # Indexer configuration
  └── constants.ts      # Zero addresses, etc.
```

---

## Environment Variables Needed

Add to `.env.example`:

```bash
# IPFS Gateways
NEXT_PUBLIC_IPFS_GATEWAY_PRIMARY=https://ipfs.io
NEXT_PUBLIC_IPFS_GATEWAY_SECONDARY=https://gateway.pinata.cloud
NEXT_PUBLIC_IPFS_GATEWAY_3=https://dweb.link
NEXT_PUBLIC_IPFS_GATEWAY_4=https://cf-ipfs.com

# Pinata API
PINATA_API_URL=https://api.pinata.cloud

# Timeouts (milliseconds)
DB_IDLE_TIMEOUT_MS=30000
DB_CONNECTION_TIMEOUT_MS=10000
HTTP_TIMEOUT_MS=10000
HTTP_IPFS_UPLOAD_TIMEOUT_MS=600000

# Cache TTLs (milliseconds)
CACHE_LICENSE_STATUS_MS=300000
CACHE_LICENSE_LOGS_MS=600000
CACHE_KEYS_MS=60000

# Indexer
INDEXER_MAX_BLOCKS=2000
INDEXER_BATCH_SIZE=500
INDEXER_SCAN_STEP=2000
INDEXER_MAX_ITERATIONS=10000

# RPC Fallbacks (already exist, just document)
NEXT_PUBLIC_AVALANCHE_FUJI_RPC=https://api.avax-test.network/ext/bc/C/rpc
NEXT_PUBLIC_AVALANCHE_MAINNET_RPC=https://api.avax.network/ext/bc/C/rpc
NEXT_PUBLIC_BASE_SEPOLIA_RPC=https://sepolia.base.org
NEXT_PUBLIC_BASE_MAINNET_RPC=https://mainnet.base.org
```

---

## Benefits of Refactoring

### Maintainability:
- Single place to update gateway URLs
- Easy to add new chains
- Clear timeout tuning

### Flexibility:
- Swap IPFS gateways without code changes
- A/B test different timeout values
- Environment-specific configuration

### Reliability:
- Fallback gateway configuration
- Better error messages with named constants
- Easier debugging

---

## Estimated Effort

| Task | Files Affected | Effort | Priority |
|------|---------------|--------|----------|
| IPFS Gateways | 15+ | 4h | HIGH |
| Chain IDs | 30+ | 8h | HIGH |
| RPC URLs | 10+ | 2h | HIGH |
| Timeouts | 15+ | 2h | MEDIUM |
| Indexer Config | 3 | 1h | MEDIUM |
| Constants | 5 | 1h | LOW |
| **TOTAL** | **70+** | **18h** | - |

---

## Recommendation

**Phase 1** (Week 1): High Priority Items
- Create `src/config/` folder structure
- Extract IPFS gateway configuration
- Create chain configuration system
- Centralize RPC URLs

**Phase 2** (Week 2): Medium Priority Items
- Extract timeout configuration
- Make indexer configurable
- Update documentation

**Phase 3** (Optional): Low Priority Items
- Extract zero address constants
- Create utility functions

---

**Next Step**: Create the config files and start refactoring high-priority items?
