// src/config/index.ts

// Exportar todas las configuraciones
export { env, type Env } from './env'

// Chain configuration
export {
  CHAIN_IDS,
  CHAIN_CONFIG,
  getChainConfig,
  isSupportedChain,
  getChainType,
  isTestnet,
  getNativeSymbol,
  getMarketAddress,
  getSupportedChainIds,
  getChainName,
  networkToChainId,
  chainIdToNetwork,
  type ChainId,
  type ChainType,
  type ChainConfig,
} from './chains'

// IPFS configuration
export {
  IPFS_GATEWAYS,
  PINATA_CONFIG,
  ipfsToHttp,
  ipfsToApiRoute,
  extractCid,
  isValidCid,
  getPinataEndpoint,
  getAllGateways,
  httpToIpfs,
  normalizeIpfsUri,
} from './ipfs'

// RPC configuration
export {
  RPC_URLS,
  RPC_FALLBACKS,
  getRpcUrl,
  getAllRpcUrls,
  getRpcUrlByNetwork,
} from './rpc'