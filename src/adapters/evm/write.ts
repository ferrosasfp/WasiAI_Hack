/**
 * EVM Write Adapters
 * 
 * Helpers for preparing write transactions to the Marketplace smart contract.
 * These functions return the data needed for wagmi's writeContract.
 * 
 * @module adapters/evm/write
 */

import type { Address, Abi } from 'viem'
// Use MarketplaceV3 ABI for single-signature model+agent registration with integrated splitters
import MARKET_ARTIFACT from '@/abis/MarketplaceV3.json'
import { getMarketAddress } from '@/config'

const MARKET_ABI = (MARKET_ARTIFACT as any).abi as Abi

/**
 * Prepare transaction for setLicensingParams
 * Updates pricing, duration, rights, delivery mode, and terms hash
 * 
 * @param params - Licensing parameters
 * @returns Transaction data for wagmi writeContract
 */
export function setLicensingParamsTx(params: {
  chainId: number
  modelId: number
  pricePerpetual: bigint
  priceSubscription: bigint
  defaultDurationDays: number
  deliveryRightsDefault: number
  deliveryModeHint: number
  termsHash: string
}) {
  const address = getMarketAddress(params.chainId)
  
  return {
    address: address as Address,
    abi: MARKET_ABI,
    functionName: 'setLicensingParams',
    args: [
      BigInt(params.modelId),
      params.pricePerpetual,
      params.priceSubscription,
      BigInt(params.defaultDurationDays),
      BigInt(params.deliveryRightsDefault),
      BigInt(params.deliveryModeHint),
      params.termsHash,
    ],
  }
}

/**
 * Prepare transaction for setListed
 * Changes the listing status of a model
 * 
 * @param params - Listing parameters
 * @returns Transaction data for wagmi writeContract
 */
export function setListedTx(params: {
  chainId: number
  modelId: number
  listed: boolean
}) {
  const address = getMarketAddress(params.chainId)
  
  return {
    address: address as Address,
    abi: MARKET_ABI,
    functionName: 'setListed',
    args: [BigInt(params.modelId), params.listed],
  }
}

/**
 * Prepare transaction for listOrUpgrade
 * Creates a new version or lists a model for the first time
 * 
 * @param params - Model parameters
 * @returns Transaction data for wagmi writeContract
 */
export function listOrUpgradeTx(params: {
  chainId: number
  slug: string
  name: string
  uri: string
  royaltyBps: number
  pricePerpetual: bigint
  priceSubscription: bigint
  defaultDurationDays: number
  deliveryRightsDefault: number
  deliveryModeHint: number
  termsHash: string
}) {
  const address = getMarketAddress(params.chainId)
  
  return {
    address: address as Address,
    abi: MARKET_ABI,
    functionName: 'listOrUpgrade',
    args: [
      params.slug,
      params.name,
      params.uri,
      BigInt(params.royaltyBps),
      params.pricePerpetual,
      params.priceSubscription,
      BigInt(params.defaultDurationDays),
      BigInt(params.deliveryRightsDefault),
      BigInt(params.deliveryModeHint),
      params.termsHash,
    ],
  }
}

/**
 * Agent parameters for single-signature registration
 */
export interface AgentParams {
  endpoint: string      // x402 inference endpoint URL
  wallet: string        // Wallet for x402 payments (use '' for msg.sender)
  metadataUri: string   // IPFS URI for agent metadata
}

/**
 * Prepare transaction for listOrUpgradeWithAgent
 * Creates model AND registers agent in a single transaction (one signature)
 * 
 * @param params - Model + Agent parameters
 * @returns Transaction data for wagmi writeContract
 */
export function listOrUpgradeWithAgentTx(params: {
  chainId: number
  slug: string
  name: string
  uri: string
  royaltyBps: number
  pricePerpetual: bigint
  priceSubscription: bigint
  defaultDurationDays: number
  deliveryRightsDefault: number
  deliveryModeHint: number
  termsHash: string
  // Inference fields
  priceInference: bigint    // Price per inference (USDC, 6 decimals)
  inferenceWallet: string   // Wallet for x402 payments
  // Agent params
  agentParams: AgentParams
}) {
  const address = getMarketAddress(params.chainId)
  
  return {
    address: address as Address,
    abi: MARKET_ABI,
    functionName: 'listOrUpgradeWithAgent',
    args: [
      params.slug,
      params.name,
      params.uri,
      BigInt(params.royaltyBps),
      params.pricePerpetual,
      params.priceSubscription,
      BigInt(params.defaultDurationDays),
      BigInt(params.deliveryRightsDefault),
      BigInt(params.deliveryModeHint),
      params.termsHash,
      params.priceInference,
      params.inferenceWallet as Address,
      // AgentParams struct
      {
        endpoint: params.agentParams.endpoint,
        wallet: (params.agentParams.wallet || params.inferenceWallet) as Address,
        metadataUri: params.agentParams.metadataUri,
      },
    ],
  }
}

/**
 * Prepare transaction for updateModelAgent
 * Updates agent endpoint and/or wallet for an existing model
 * 
 * @param params - Update parameters
 * @returns Transaction data for wagmi writeContract
 */
export function updateModelAgentTx(params: {
  chainId: number
  modelId: number
  agentEndpoint: string   // New endpoint (empty string to skip)
  agentWallet: string     // New wallet (zero address to skip)
}) {
  const address = getMarketAddress(params.chainId)
  
  return {
    address: address as Address,
    abi: MARKET_ABI,
    functionName: 'updateModelAgent',
    args: [
      BigInt(params.modelId),
      params.agentEndpoint,
      params.agentWallet as Address,
    ],
  }
}

/**
 * Rights bitmask constants
 */
export const RIGHTS = {
  API: 1,
  DOWNLOAD: 2,
  BOTH: 3,
} as const

/**
 * Helper: Validate rights bitmask
 * @param rights - Rights value (1, 2, or 3)
 * @returns True if valid
 */
export function isValidRights(rights: number): boolean {
  return rights === RIGHTS.API || rights === RIGHTS.DOWNLOAD || rights === RIGHTS.BOTH
}

/**
 * Helper: Convert rights array to bitmask
 * @param rightsArray - Array of rights ['API', 'Download']
 * @returns Bitmask (1, 2, or 3)
 */
export function rightsArrayToBitmask(rightsArray: string[]): number {
  const hasApi = rightsArray.includes('API')
  const hasDownload = rightsArray.includes('Download')
  
  if (hasApi && hasDownload) return RIGHTS.BOTH
  if (hasApi) return RIGHTS.API
  if (hasDownload) return RIGHTS.DOWNLOAD
  
  return RIGHTS.API // Default to API if empty
}

/**
 * Helper: Convert rights bitmask to array
 * @param bitmask - Rights bitmask (1, 2, or 3)
 * @returns Array of rights
 */
export function rightsBitmaskToArray(bitmask: number): string[] {
  if (bitmask === RIGHTS.BOTH) return ['API', 'Download']
  if (bitmask === RIGHTS.API) return ['API']
  if (bitmask === RIGHTS.DOWNLOAD) return ['Download']
  return ['API'] // Default
}
