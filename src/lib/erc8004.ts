/**
 * ERC-8004 Agent Identity Schema
 * 
 * This module defines the metadata schema for AI agents following the ERC-8004 standard.
 * Each agent registered in AgentRegistry has a tokenURI pointing to an IPFS file
 * containing this metadata structure.
 */

/**
 * USDC token addresses by chain ID
 * x402 protocol uses USDC for pay-per-inference payments
 */
const USDC_ADDRESSES: Record<number, string> = {
  // Avalanche Fuji Testnet
  43113: '0x5425890298aed601595a70AB815c96711a31Bc65',
  // Avalanche Mainnet
  43114: '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E',
  // Base Sepolia Testnet
  84532: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
  // Base Mainnet
  8453: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
  // Ethereum Mainnet
  1: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
}

/**
 * Get USDC token address for a given chain ID
 */
function getUSDCAddress(chainId: number): string {
  return USDC_ADDRESSES[chainId] || USDC_ADDRESSES[43113] // Default to Fuji
}

export interface ERC8004Endpoint {
  /** URL of the endpoint (e.g., x402 inference endpoint) */
  url: string
  /** Type of endpoint: 'x402' | 'rest' | 'websocket' */
  type: 'x402' | 'rest' | 'websocket'
  /** HTTP method if applicable */
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  /** Description of what this endpoint does */
  description?: string
}

export interface ERC8004Registration {
  /** The agent's token ID in the registry */
  agentId: number
  /** Address of the AgentRegistry contract */
  registryAddress: string
  /** Chain ID where the agent is registered */
  chainId: number
  /** Block number when registered */
  registeredAtBlock?: number
  /** Timestamp when registered */
  registeredAt?: string
}

export interface ERC8004SupportedTrust {
  /** Trust mechanism type */
  type: 'reputation' | 'validation' | 'stake'
  /** Contract address for the trust mechanism */
  contractAddress?: string
  /** Description of the trust mechanism */
  description?: string
}

/**
 * ERC-8004 Agent Metadata Schema
 * 
 * This is the JSON structure stored on IPFS and referenced by tokenURI
 */
export interface ERC8004AgentMetadata {
  /** Schema version */
  schemaVersion: '1.0.0'
  
  /** Agent type identifier */
  type: 'ai-agent'
  
  /** Human-readable name of the agent */
  name: string
  
  /** Short description of what the agent does */
  description: string
  
  /** Longer detailed description */
  longDescription?: string
  
  /** IPFS URI or HTTP URL to agent's image/avatar */
  image?: string
  
  /** Agent's wallet address for receiving payments */
  wallet: string
  
  /** List of endpoints this agent exposes */
  endpoints: ERC8004Endpoint[]
  
  /** Registration information */
  registrations: ERC8004Registration[]
  
  /** Supported trust mechanisms */
  supportedTrust?: ERC8004SupportedTrust[]
  
  /** Reference to the model in Marketplace */
  modelReference?: {
    /** Marketplace contract address */
    marketplaceAddress: string
    /** Model ID in the Marketplace */
    modelId: number
    /** Chain ID */
    chainId: number
  }
  
  /** Pricing information for x402 */
  pricing?: {
    /** Price per inference (in USDC units, e.g., "0.001" = 0.001 USDC) */
    pricePerInference: string
    /** Currency symbol (always USDC for x402) */
    currency: 'USDC'
    /** USDC token contract address */
    tokenAddress: string
    /** Chain ID for payments */
    chainId: number
  }
  
  /** Technical capabilities */
  capabilities?: {
    /** List of tasks the agent can perform */
    tasks?: string[]
    /** Input modalities */
    inputModalities?: string[]
    /** Output modalities */
    outputModalities?: string[]
  }
  
  /** Creator/author information */
  creator?: {
    name?: string
    website?: string
    twitter?: string
    github?: string
  }
  
  /** Additional metadata */
  metadata?: Record<string, any>
  
  /** Timestamp when this metadata was created */
  createdAt: string
  
  /** Timestamp when this metadata was last updated */
  updatedAt: string
}

/**
 * Build ERC-8004 compliant agent metadata from model data
 */
export function buildAgentMetadata(params: {
  name: string
  description: string
  wallet: string
  modelId: number
  chainId: number
  marketplaceAddress: string
  agentRegistryAddress: string
  agentId: number
  pricePerInference: string
  image?: string
  capabilities?: {
    tasks?: string[]
    inputModalities?: string[]
    outputModalities?: string[]
  }
  creator?: {
    name?: string
    website?: string
    twitter?: string
    github?: string
  }
  baseUrl?: string
}): ERC8004AgentMetadata {
  const now = new Date().toISOString()
  const baseUrl = params.baseUrl || process.env.NEXT_PUBLIC_BASE_URL || 'https://wasiai.com'
  
  return {
    schemaVersion: '1.0.0',
    type: 'ai-agent',
    name: params.name,
    description: params.description,
    image: params.image,
    wallet: params.wallet,
    
    endpoints: [
      {
        url: `${baseUrl}/api/inference/${params.modelId}`,
        type: 'x402',
        method: 'POST',
        description: 'x402 pay-per-inference endpoint'
      }
    ],
    
    registrations: [
      {
        agentId: params.agentId,
        registryAddress: params.agentRegistryAddress,
        chainId: params.chainId,
        registeredAt: now
      }
    ],
    
    supportedTrust: [
      {
        type: 'reputation',
        description: 'On-chain reputation from user feedback after paid inferences'
      }
    ],
    
    modelReference: {
      marketplaceAddress: params.marketplaceAddress,
      modelId: params.modelId,
      chainId: params.chainId
    },
    
    pricing: {
      pricePerInference: params.pricePerInference,
      currency: 'USDC', // x402 uses USDC stablecoin for payments
      tokenAddress: getUSDCAddress(params.chainId),
      chainId: params.chainId
    },
    
    capabilities: params.capabilities,
    creator: params.creator,
    
    createdAt: now,
    updatedAt: now
  }
}

/**
 * Default price per inference in USDC (human-readable format)
 * USDC has 6 decimals, so "0.001" = 0.001 USDC = 1000 units
 */
export const DEFAULT_PRICE_PER_INFERENCE = '0.001' // 0.001 USDC per inference
