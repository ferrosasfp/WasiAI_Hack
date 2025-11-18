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

// Timeout and delay configuration
export {
  TIMEOUTS,
  DB_TIMEOUTS,
  HTTP_TIMEOUTS,
  CACHE_TTLS,
  RETRY_DELAYS,
  UI_TIMEOUTS,
  getExponentialBackoff,
  getLinearBackoff,
  createTimeoutSignal,
  type TimeoutsConfig,
} from './timeouts'

// Fee and pricing configuration
export {
  FEE_CONFIG,
  MARKETPLACE_FEE_BPS,
  ROYALTY_LIMITS,
  PRICING_LIMITS,
  percentToBps,
  bpsToPercent,
  validateRoyaltyPercent,
  calculateRevenueSplit,
  formatAmount,
  type FeeConfig,
} from './fees'

// Indexer and blockchain configuration
export {
  BLOCKCHAIN_CONFIG,
  INDEXER_CONFIG,
  ZERO_ADDRESSES,
  IMAGE_CONFIG,
  PROTECTED_FETCH_CONFIG,
  isZeroAddress,
  getNonZeroAddress,
  type BlockchainConfig,
} from './indexer'