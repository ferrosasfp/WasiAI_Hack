/**
 * Chain Configuration
 * Centralized configuration for Avalanche blockchain networks
 */

import { avalanche, avalancheFuji } from 'viem/chains'
import type { Chain } from 'viem'

/**
 * Supported Chain IDs (Avalanche only)
 * Use these constants instead of magic numbers throughout the codebase
 */
export const CHAIN_IDS = {
  AVALANCHE_FUJI: 43113,
  AVALANCHE_MAINNET: 43114,
} as const

export type ChainId = typeof CHAIN_IDS[keyof typeof CHAIN_IDS]

/**
 * Default Chain ID - Read from environment variable
 * Set NEXT_PUBLIC_EVM_DEFAULT_CHAIN_ID in .env.local
 * - 43113 = Avalanche Fuji (testnet)
 * - 43114 = Avalanche Mainnet
 */
const envChainId = typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_EVM_DEFAULT_CHAIN_ID
  ? parseInt(process.env.NEXT_PUBLIC_EVM_DEFAULT_CHAIN_ID, 10)
  : CHAIN_IDS.AVALANCHE_FUJI

export const DEFAULT_CHAIN_ID: ChainId = (envChainId === CHAIN_IDS.AVALANCHE_MAINNET)
  ? CHAIN_IDS.AVALANCHE_MAINNET
  : CHAIN_IDS.AVALANCHE_FUJI

/**
 * Chain Type (for UI logic)
 */
export type ChainType = 'avalanche'

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
 * Avalanche Chain Configuration
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
  return getChainConfig(chainId)?.symbol ?? 'AVAX'
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
 * Helper: Map network string to chain ID
 */
export function networkToChainId(network: string): ChainId | undefined {
  const map: Record<string, ChainId> = {
    'avax': CHAIN_IDS.AVALANCHE_FUJI,
    'avalanche': CHAIN_IDS.AVALANCHE_MAINNET,
  }
  return map[network]
}

/**
 * Helper: Map chain ID to network string
 */
export function chainIdToNetwork(chainId: number): 'avax' | 'testnet' | null {
  const config = getChainConfig(chainId)
  if (!config) return 'testnet'
  return 'avax'
}
