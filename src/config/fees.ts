/**
 * Centralized Fee and Pricing Configuration
 * 
 * All marketplace fees, royalty limits, and pricing constraints should be
 * imported from this file to ensure consistency across the application.
 * 
 * @module config/fees
 */

/**
 * Parse environment variable as basis points (BPS) with fallback
 * BPS (Basis Points): 1 BPS = 0.01%, 100 BPS = 1%, 10000 BPS = 100%
 */
function parseEnvBps(key: string, fallback: number): number {
  const value = process.env[key]
  if (!value) return fallback
  const parsed = parseInt(value, 10)
  return isNaN(parsed) ? fallback : Math.max(0, Math.min(10000, parsed))
}

/**
 * Marketplace Fee Configuration (in basis points)
 * 
 * Default: 1000 BPS = 10%
 * Configurable via: NEXT_PUBLIC_MARKETPLACE_FEE_BPS or NEXT_PUBLIC_MARKET_FEE_BPS
 */
export const MARKETPLACE_FEE_BPS = parseEnvBps(
  'NEXT_PUBLIC_MARKETPLACE_FEE_BPS',
  parseEnvBps('NEXT_PUBLIC_MARKET_FEE_BPS', 1000)
)

/**
 * Royalty Limits (in percentage)
 * 
 * These limits ensure creators can't set excessive royalties
 * while still providing fair revenue share.
 */
export const ROYALTY_LIMITS = {
  /** Minimum royalty percentage (default: 0%) */
  MIN_PERCENT: parseEnvBps('ROYALTY_MIN_PERCENT', 0) / 100,
  
  /** Maximum royalty percentage (default: 20%) */
  MAX_PERCENT: parseEnvBps('ROYALTY_MAX_PERCENT', 2000) / 100,
  
  /** Default royalty percentage for new models (default: 0%) */
  DEFAULT_PERCENT: parseEnvBps('ROYALTY_DEFAULT_PERCENT', 0) / 100,
} as const

/**
 * Pricing Constraints
 */
export const PRICING_LIMITS = {
  /** Minimum price in native currency (default: 0) */
  MIN_PRICE: Number(process.env.PRICING_MIN_PRICE) || 0,
  
  /** Maximum price in native currency (default: unlimited) */
  MAX_PRICE: Number(process.env.PRICING_MAX_PRICE) || Number.MAX_SAFE_INTEGER,
  
  /** Minimum subscription duration in days (default: 1 day) */
  MIN_SUBSCRIPTION_DAYS: Number(process.env.PRICING_MIN_SUBSCRIPTION_DAYS) || 1,
  
  /** Maximum subscription duration in days (default: 365 days) */
  MAX_SUBSCRIPTION_DAYS: Number(process.env.PRICING_MAX_SUBSCRIPTION_DAYS) || 365,
} as const

/**
 * Helper: Convert percentage to basis points
 * @param percent - Percentage (0-100)
 * @returns Basis points (0-10000)
 */
export function percentToBps(percent: number): number {
  return Math.round(Math.max(0, Math.min(100, percent)) * 100)
}

/**
 * Helper: Convert basis points to percentage
 * @param bps - Basis points (0-10000)
 * @returns Percentage (0-100)
 */
export function bpsToPercent(bps: number): number {
  return Math.max(0, Math.min(10000, bps)) / 100
}

/**
 * Helper: Validate and clamp royalty percentage
 * @param percent - Input percentage
 * @returns Clamped percentage within ROYALTY_LIMITS
 */
export function validateRoyaltyPercent(percent: number | string): number {
  const num = typeof percent === 'string' ? parseFloat(percent) : percent
  if (isNaN(num)) return ROYALTY_LIMITS.DEFAULT_PERCENT
  return Math.max(
    ROYALTY_LIMITS.MIN_PERCENT,
    Math.min(ROYALTY_LIMITS.MAX_PERCENT, num)
  )
}

/**
 * Helper: Calculate revenue split for a given amount
 * @param amount - Total amount in native currency
 * @param royaltyBps - Creator royalty in basis points (0-10000)
 * @param marketplaceFeeBps - Marketplace fee in basis points (default: MARKETPLACE_FEE_BPS)
 * @returns Object with fee, royalty, and seller amounts
 */
export function calculateRevenueSplit(
  amount: number,
  royaltyBps: number,
  marketplaceFeeBps: number = MARKETPLACE_FEE_BPS
): { fee: number; royalty: number; seller: number } {
  const fee = (amount * marketplaceFeeBps) / 10000
  const royalty = (amount * royaltyBps) / 10000
  const seller = Math.max(0, amount - fee - royalty)
  
  return { fee, royalty, seller }
}

/**
 * Helper: Format amount with 2 decimal places (rounded up)
 * @param amount - Amount to format
 * @returns Formatted string with 2 decimals
 */
export function formatAmount(amount: number): string {
  return (Math.ceil(amount * 100) / 100).toFixed(2)
}

/**
 * All fee configurations combined
 */
export const FEE_CONFIG = {
  MARKETPLACE_FEE_BPS,
  ROYALTY_LIMITS,
  PRICING_LIMITS,
} as const

export type FeeConfig = typeof FEE_CONFIG
