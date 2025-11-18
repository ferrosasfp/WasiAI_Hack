/**
 * RPC Configuration
 * Centralized RPC URLs and fallbacks for blockchain connections
 */

import { CHAIN_IDS, type ChainId } from './chains'

/**
 * RPC URLs by Chain ID
 */
export const RPC_URLS: Record<ChainId, string> = {
  [CHAIN_IDS.AVALANCHE_FUJI]: 
    process.env.NEXT_PUBLIC_AVALANCHE_FUJI_RPC || 
    'https://api.avax-test.network/ext/bc/C/rpc',
  
  [CHAIN_IDS.AVALANCHE_MAINNET]: 
    process.env.NEXT_PUBLIC_AVALANCHE_MAINNET_RPC || 
    'https://api.avax.network/ext/bc/C/rpc',
  
  [CHAIN_IDS.BASE_SEPOLIA]: 
    process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC || 
    'https://sepolia.base.org',
  
  [CHAIN_IDS.BASE_MAINNET]: 
    process.env.NEXT_PUBLIC_BASE_MAINNET_RPC || 
    'https://mainnet.base.org',
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
  [CHAIN_IDS.BASE_SEPOLIA]: [
    'https://base-sepolia.blockpi.network/v1/rpc/public',
  ],
  [CHAIN_IDS.BASE_MAINNET]: [
    'https://base.blockpi.network/v1/rpc/public',
    'https://rpc.ankr.com/base',
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
 * Helper: Get RPC URL by legacy network name
 * @deprecated Use getRpcUrl with chain ID instead
 */
export function getRpcUrlByNetwork(network: 'avax' | 'base'): string {
  if (network === 'avax') return RPC_URLS[CHAIN_IDS.AVALANCHE_FUJI]
  if (network === 'base') return RPC_URLS[CHAIN_IDS.BASE_SEPOLIA]
  return RPC_URLS[CHAIN_IDS.BASE_SEPOLIA] // Default fallback
}
