/**
 * RPC Configuration
 * Centralized RPC URLs and fallbacks for Avalanche blockchain
 */

import { CHAIN_IDS, type ChainId } from './chains'

/**
 * RPC URLs by Chain ID (Avalanche only)
 */
export const RPC_URLS: Record<ChainId, string> = {
  [CHAIN_IDS.AVALANCHE_FUJI]: 
    process.env.NEXT_PUBLIC_AVALANCHE_FUJI_RPC || 
    'https://api.avax-test.network/ext/bc/C/rpc',
  
  [CHAIN_IDS.AVALANCHE_MAINNET]: 
    process.env.NEXT_PUBLIC_AVALANCHE_MAINNET_RPC || 
    'https://api.avax.network/ext/bc/C/rpc',
}

/**
 * Fallback RPC URLs (in case primary fails)
 */
export const RPC_FALLBACKS: Partial<Record<ChainId, string[]>> = {
  [CHAIN_IDS.AVALANCHE_FUJI]: [
    'https://avalanche-fuji-c-chain.publicnode.com',
    'https://rpc.ankr.com/avalanche_fuji',
  ],
  [CHAIN_IDS.AVALANCHE_MAINNET]: [
    'https://avalanche-c-chain.publicnode.com',
    'https://rpc.ankr.com/avalanche',
  ],
}

/**
 * Helper: Get RPC URL for chain
 */
export function getRpcUrl(chainId: number): string | undefined {
  return RPC_URLS[chainId as ChainId]
}

/**
 * Helper: Get all RPC URLs for chain (primary + fallbacks)
 */
export function getAllRpcUrls(chainId: number): string[] {
  const primary = getRpcUrl(chainId)
  const fallbacks = RPC_FALLBACKS[chainId as ChainId] || []
  
  return primary ? [primary, ...fallbacks] : fallbacks
}

/**
 * Helper: Get RPC URL by network name
 */
export function getRpcUrlByNetwork(network: 'avax'): string {
  return RPC_URLS[CHAIN_IDS.AVALANCHE_FUJI]
}
