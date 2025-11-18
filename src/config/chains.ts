/**
 * Chain Configuration
 * Centralized configuration for all supported blockchain networks
 */

import { avalanche, avalancheFuji, base, baseSepolia } from 'viem/chains'
import type { Chain } from 'viem'

/**
 * Supported Chain IDs
 * Use these constants instead of magic numbers throughout the codebase
 */
export const CHAIN_IDS = {
  AVALANCHE_FUJI: 43113,
  AVALANCHE_MAINNET: 43114,
  BASE_SEPOLIA: 84532,
  BASE_MAINNET: 8453,
} as const

export type ChainId = typeof CHAIN_IDS[keyof typeof CHAIN_IDS]

/**
 * Chain Type (for UI logic)
 */
export type ChainType = 'avalanche' | 'base'

/**
 * Chain Configuration Interface
 */
export interface ChainConfig {
  id: ChainId
  name: string
  shortName: string
  symbol: string
  icon: string
  color: string
  type: ChainType
  isTestnet: boolean
  chain: Chain
  rpc: string
  marketAddress: string
  explorerUrl: string
}

/**
 * Get Chain Configuration
 */
export const CHAIN_CONFIG: Record<ChainId, ChainConfig> = {
  [CHAIN_IDS.AVALANCHE_FUJI]: {
    id: CHAIN_IDS.AVALANCHE_FUJI,
    name: 'Avalanche Fuji',
    shortName: 'Fuji',
    symbol: 'AVAX',
    icon: '/icons/avalanche.svg',
    color: '#E84142',
    type: 'avalanche',
    isTestnet: true,
    chain: avalancheFuji,
    rpc: process.env.NEXT_PUBLIC_AVALANCHE_FUJI_RPC || avalancheFuji.rpcUrls.default.http[0],
    marketAddress: process.env.NEXT_PUBLIC_EVM_MARKET_43113 || '',
    explorerUrl: 'https://testnet.snowtrace.io',
  },
  [CHAIN_IDS.AVALANCHE_MAINNET]: {
    id: CHAIN_IDS.AVALANCHE_MAINNET,
    name: 'Avalanche',
    shortName: 'Avalanche',
    symbol: 'AVAX',
    icon: '/icons/avalanche.svg',
    color: '#E84142',
    type: 'avalanche',
    isTestnet: false,
    chain: avalanche,
    rpc: process.env.NEXT_PUBLIC_AVALANCHE_MAINNET_RPC || avalanche.rpcUrls.default.http[0],
    marketAddress: process.env.NEXT_PUBLIC_EVM_MARKET_43114 || '',
    explorerUrl: 'https://snowtrace.io',
  },
  [CHAIN_IDS.BASE_SEPOLIA]: {
    id: CHAIN_IDS.BASE_SEPOLIA,
    name: 'Base Sepolia',
    shortName: 'Base',
    symbol: 'ETH',
    icon: '/icons/base.svg',
    color: '#0052FF',
    type: 'base',
    isTestnet: true,
    chain: baseSepolia,
    rpc: process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC || baseSepolia.rpcUrls.default.http[0],
    marketAddress: process.env.NEXT_PUBLIC_EVM_MARKET_84532 || '',
    explorerUrl: 'https://sepolia.basescan.org',
  },
  [CHAIN_IDS.BASE_MAINNET]: {
    id: CHAIN_IDS.BASE_MAINNET,
    name: 'Base',
    shortName: 'Base',
    symbol: 'ETH',
    icon: '/icons/base.svg',
    color: '#0052FF',
    type: 'base',
    isTestnet: false,
    chain: base,
    rpc: process.env.NEXT_PUBLIC_BASE_MAINNET_RPC || base.rpcUrls.default.http[0],
    marketAddress: process.env.NEXT_PUBLIC_EVM_MARKET_8453 || '',
    explorerUrl: 'https://basescan.org',
  },
}

/**
 * Helper: Get chain config by ID
 */
export function getChainConfig(chainId: number): ChainConfig | undefined {
  return CHAIN_CONFIG[chainId as ChainId]
}

/**
 * Helper: Check if chain ID is supported
 */
export function isSupportedChain(chainId: number): chainId is ChainId {
  return chainId in CHAIN_CONFIG
}

/**
 * Helper: Get chain type (avalanche or base)
 */
export function getChainType(chainId: number): ChainType | undefined {
  return getChainConfig(chainId)?.type
}

/**
 * Helper: Check if chain is testnet
 */
export function isTestnet(chainId: number): boolean {
  return getChainConfig(chainId)?.isTestnet ?? false
}

/**
 * Helper: Get native currency symbol
 */
export function getNativeSymbol(chainId: number): string {
  return getChainConfig(chainId)?.symbol ?? 'ETH'
}

/**
 * Helper: Get market address for chain
 */
export function getMarketAddress(chainId: number): string | undefined {
  return getChainConfig(chainId)?.marketAddress
}

/**
 * Helper: Get all supported chain IDs as array
 */
export function getSupportedChainIds(): ChainId[] {
  return Object.values(CHAIN_IDS)
}

/**
 * Helper: Get chain name
 */
export function getChainName(chainId: number): string {
  return getChainConfig(chainId)?.name ?? `Chain ${chainId}`
}

/**
 * Legacy: Map network string to chain ID (for backwards compatibility)
 */
export function networkToChainId(network: string): ChainId | undefined {
  const map: Record<string, ChainId> = {
    'avax': CHAIN_IDS.AVALANCHE_FUJI,
    'base': CHAIN_IDS.BASE_SEPOLIA,
  }
  return map[network]
}

/**
 * Legacy: Map chain ID to network string (for backwards compatibility)
 */
export function chainIdToNetwork(chainId: number): 'avax' | 'base' | 'testnet' | null {
  const config = getChainConfig(chainId)
  if (!config) return 'testnet'
  return config.type === 'avalanche' ? 'avax' : 'base'
}
