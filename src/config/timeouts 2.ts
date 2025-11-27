/**
 * Centralized Timeout and Delay Configuration
 * 
 * All timeout values, cache TTLs, and retry delays should be imported from this file
 * to ensure consistency and easy configuration via environment variables.
 * 
 * @module config/timeouts
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
 * Database Connection Timeouts
 */
export const DB_TIMEOUTS = {
  /** Idle connection timeout (default: 30 seconds) */
  IDLE: parseEnvNumber('DB_IDLE_TIMEOUT_MS', 30000),
  
  /** Connection establishment timeout (default: 10 seconds) */
  CONNECTION: parseEnvNumber('DB_CONNECTION_TIMEOUT_MS', 10000),
} as const

/**
 * HTTP Request Timeouts
 */
export const HTTP_TIMEOUTS = {
  /** Default HTTP request timeout (default: 10 seconds) */
  DEFAULT: parseEnvNumber('HTTP_TIMEOUT_MS', 10000),
  
  /** IPFS file upload timeout - longer for large files (default: 10 minutes) */
  IPFS_UPLOAD: parseEnvNumber('HTTP_IPFS_UPLOAD_TIMEOUT_MS', 600000),
  
  /** Indexer fetch timeout (default: 10 seconds) */
  INDEXER: parseEnvNumber('HTTP_INDEXER_TIMEOUT_MS', 10000),
  
  /** Initial timeout for first load (default: 30 seconds) */
  INITIAL_LOAD: parseEnvNumber('HTTP_INITIAL_LOAD_TIMEOUT_MS', 30000),
} as const

/**
 * Cache TTLs (Time To Live)
 */
export const CACHE_TTLS = {
  /** License status cache TTL (default: 5 minutes) */
  LICENSE_STATUS: parseEnvNumber('CACHE_LICENSE_STATUS_MS', 5 * 60 * 1000),
  
  /** License logs cache TTL (default: 10 minutes) */
  LICENSE_LOGS: parseEnvNumber('CACHE_LICENSE_LOGS_MS', 10 * 60 * 1000),
  
  /** API keys cache TTL (default: 1 minute) */
  API_KEYS: parseEnvNumber('CACHE_API_KEYS_MS', 60000),
  
  /** Wagmi query stale time (default: 1 minute) */
  WAGMI_STALE: parseEnvNumber('CACHE_WAGMI_STALE_MS', 60 * 1000),
  
  /** Wagmi query garbage collection time (default: 5 minutes) */
  WAGMI_GC: parseEnvNumber('CACHE_WAGMI_GC_MS', 5 * 60 * 1000),
} as const

/**
 * Retry Delays
 */
export const RETRY_DELAYS = {
  /** Initial retry delay for exponential backoff (default: 120ms) */
  INITIAL_EXPONENTIAL: parseEnvNumber('RETRY_INITIAL_EXPONENTIAL_MS', 120),
  
  /** Maximum retry delay cap (default: 30 seconds) */
  MAX_DELAY: parseEnvNumber('RETRY_MAX_DELAY_MS', 30000),
  
  /** Linear backoff base (default: 1 second) */
  LINEAR_BASE: parseEnvNumber('RETRY_LINEAR_BASE_MS', 1000),
} as const

/**
 * UI Feedback Timeouts
 */
export const UI_TIMEOUTS = {
  /** Snackbar auto-hide duration (default: 2 seconds) */
  SNACKBAR: parseEnvNumber('UI_SNACKBAR_DURATION_MS', 2000),
  
  /** Copied state reset delay (default: 2 seconds) */
  COPIED_STATE: parseEnvNumber('UI_COPIED_STATE_MS', 2000),
  
  /** Toast notification duration (default: 3 seconds) */
  TOAST: parseEnvNumber('UI_TOAST_DURATION_MS', 3000),
} as const

/**
 * Helper: Get exponential backoff delay
 * @param attemptIndex - Zero-based attempt index
 * @param initialDelay - Initial delay in milliseconds
 * @param maxDelay - Maximum delay cap
 * @returns Delay in milliseconds
 */
export function getExponentialBackoff(
  attemptIndex: number,
  initialDelay: number = RETRY_DELAYS.INITIAL_EXPONENTIAL,
  maxDelay: number = RETRY_DELAYS.MAX_DELAY
): number {
  return Math.min(initialDelay * Math.pow(2, attemptIndex), maxDelay)
}

/**
 * Helper: Get linear backoff delay
 * @param attemptIndex - Zero-based attempt index
 * @param baseDelay - Base delay in milliseconds
 * @returns Delay in milliseconds
 */
export function getLinearBackoff(
  attemptIndex: number,
  baseDelay: number = RETRY_DELAYS.LINEAR_BASE
): number {
  return baseDelay * (attemptIndex + 1)
}

/**
 * Helper: Create AbortSignal with timeout
 * @param ms - Timeout in milliseconds
 * @returns AbortSignal that will abort after timeout
 */
export function createTimeoutSignal(ms: number = HTTP_TIMEOUTS.DEFAULT): AbortSignal {
  return AbortSignal.timeout(ms)
}

/**
 * All timeout configurations combined
 */
export const TIMEOUTS = {
  DB: DB_TIMEOUTS,
  HTTP: HTTP_TIMEOUTS,
  CACHE: CACHE_TTLS,
  RETRY: RETRY_DELAYS,
  UI: UI_TIMEOUTS,
} as const

export type TimeoutsConfig = typeof TIMEOUTS
