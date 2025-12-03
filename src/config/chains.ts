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
  usdcAddress: string // USDC token address for license payments
  agentRegistryAddress?: string // ERC-8004 Agent Registry
  reputationRegistryAddress?: string // Reputation Registry for feedback
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
    usdcAddress: process.env.NEXT_PUBLIC_EVM_USDC_43113 || '0xCDa6E1C8340550aC412Ee9BC59ae4Db46745C53e', // MockUSDC on Fuji
    agentRegistryAddress: process.env.NEXT_PUBLIC_EVM_AGENT_REGISTRY_43113 || '0x7686810c46946a223B7a9baF0F52A4e2c7392B9f',
    reputationRegistryAddress: process.env.NEXT_PUBLIC_REPUTATION_REGISTRY_43113 || '0xf4D4c4b91BaE8863f508B772f0195b7D3Fbc6412',
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
    usdcAddress: process.env.NEXT_PUBLIC_EVM_USDC_43114 || '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E', // USDC on Avalanche
    agentRegistryAddress: process.env.NEXT_PUBLIC_EVM_AGENT_REGISTRY_43114,
    reputationRegistryAddress: process.env.NEXT_PUBLIC_REPUTATION_REGISTRY_43114,
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
 * Helper: Get USDC address for chain
 */
export function getUsdcAddress(chainId: number): string | undefined {
  return getChainConfig(chainId)?.usdcAddress
}

/**
 * Helper: Get Agent Registry address for chain
 */
export function getAgentRegistryAddress(chainId: number): string | undefined {
  return getChainConfig(chainId)?.agentRegistryAddress
}

/**
 * Helper: Get Reputation Registry address for chain
 */
export function getReputationRegistryAddress(chainId: number): string | undefined {
  return getChainConfig(chainId)?.reputationRegistryAddress
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
