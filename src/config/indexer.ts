/**
 * Centralized Indexer and Blockchain Configuration
 * 
 * All blockchain indexing parameters, scanning limits, and blockchain constants
 * should be imported from this file to ensure consistency and easy tuning.
 * 
 * @module config/indexer
 */

/**
 * Parse environment variable as number with fallback
 */
function parseEnvNumber(key: string, fallback: number): number {
  const value = process.env[key]
  if (!value) return fallback
  const parsed = Number(value)
  return isNaN(parsed) ? fallback : Math.max(0, parsed)
}

/**
 * Parse environment variable as bigint with fallback
 */
function parseEnvBigInt(key: string, fallback: bigint): bigint {
  const value = process.env[key]
  if (!value) return fallback
  try {
    return BigInt(value)
  } catch {
    return fallback
  }
}

/**
 * Block Scanning Configuration
 * 
 * These values control how the indexer scans blockchain data.
 * Adjust based on network speed and database capacity.
 */
export const INDEXER_CONFIG = {
  /** Maximum blocks to scan per indexer run (default: 2000) */
  MAX_BLOCKS_PER_RUN: parseEnvNumber('INDEXER_MAX_BLOCKS', 2000),
  
  /** Blocks per batch when scanning (default: 500) */
  BATCH_SIZE: parseEnvNumber('INDEXER_BATCH_SIZE', 500),
  
  /** Block scanning step size for license lookups (default: 2000) */
  SCAN_STEP_SIZE: parseEnvBigInt('INDEXER_SCAN_STEP', 2000n),
  
  /** Maximum iterations to prevent infinite loops (default: 10000) */
  MAX_ITERATIONS: parseEnvNumber('INDEXER_MAX_ITERATIONS', 10000),
  
  /** Maximum licenses to scan per load (default: 200) */
  MAX_LICENSES_TO_SCAN: parseEnvNumber('INDEXER_MAX_LICENSES', 200),
} as const

/**
 * Zero Address Constants
 * 
 * Common zero/null addresses used in blockchain operations
 */
export const ZERO_ADDRESSES = {
  /** EVM zero address (0x0000...0000) */
  EVM: '0x0000000000000000000000000000000000000000' as const,
  
  /** Sui zero object ID */
  SUI: '0x0000000000000000000000000000000000000000000000000000000000000000' as const,
  
  /** DevInspect sender address (Sui) */
  SUI_DEVINSPECT_SENDER: '0x0000000000000000000000000000000000000000000000000000000000000001' as const,
} as const

/**
 * Image Compression Configuration
 * 
 * Default parameters for client-side image compression
 */
export const IMAGE_CONFIG = {
  /** Maximum width in pixels (default: 1280) */
  MAX_WIDTH: parseEnvNumber('NEXT_PUBLIC_IMG_MAX_W', 1280),
  
  /** Maximum height in pixels (default: 720) */
  MAX_HEIGHT: parseEnvNumber('NEXT_PUBLIC_IMG_MAX_H', 720),
  
  /** JPEG quality 0-1 (default: 0.8 = 80%) */
  QUALITY: Math.max(0, Math.min(1, parseEnvNumber('NEXT_PUBLIC_IMG_QUALITY', 0.8))),
} as const

/**
 * Protected Fetch Configuration
 * 
 * Retry behavior for protected/authenticated requests
 */
export const PROTECTED_FETCH_CONFIG = {
  /** Number of retry attempts (default: 3) */
  MAX_RETRIES: parseEnvNumber('NEXT_PUBLIC_PROTECTED_FETCH_RETRIES', 3),
  
  /** Delay between retries in milliseconds (default: 1000ms) */
  RETRY_DELAY_MS: parseEnvNumber('NEXT_PUBLIC_PROTECTED_FETCH_RETRY_DELAY_MS', 1000),
} as const

/**
 * Helper: Check if address is zero/null
 * @param address - Address to check
 * @returns True if address is zero/null
 */
export function isZeroAddress(address: string | undefined | null): boolean {
  if (!address) return true
  const normalized = address.toLowerCase().replace(/^0x/, '')
  return normalized === '' || /^0+$/.test(normalized)
}

/**
 * Helper: Get non-zero address or undefined
 * @param address - Address to validate
 * @returns Address if non-zero, undefined otherwise
 */
export function getNonZeroAddress(address: string | undefined | null): string | undefined {
  return isZeroAddress(address) ? undefined : address || undefined
}

/**
 * All indexer and blockchain configurations combined
 */
export const BLOCKCHAIN_CONFIG = {
  INDEXER: INDEXER_CONFIG,
  ZERO_ADDRESSES,
  IMAGE: IMAGE_CONFIG,
  PROTECTED_FETCH: PROTECTED_FETCH_CONFIG,
} as const

export type BlockchainConfig = typeof BLOCKCHAIN_CONFIG
