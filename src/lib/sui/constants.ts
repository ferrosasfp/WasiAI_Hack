// src/lib/sui/constants.ts

import { env } from '@/config/env';

// ============================================
// SMART CONTRACT IDs
// ============================================

export const PACKAGE_ID = env.NEXT_PUBLIC_PACKAGE_ID;
export const MARKET_ID = env.NEXT_PUBLIC_MARKET_ID;
export const SUI_CLOCK_OBJECT_ID = '0x6';

// ============================================
// MÓDULOS DEL SMART CONTRACT
// ============================================

export const MODULES = {
  MARKETPLACE: 'marketplace',
} as const;

// ============================================
// FUNCIONES DEL SMART CONTRACT (principales)
// ============================================

export const FUNCTIONS = {
  // Lecturas
  GET_MODELS_PAGE: 'get_models_page',
  GET_MODEL_INFO_EX: 'get_model_info_ex',
  GET_MARKET_INFO: 'get_market_info',
  MODEL_EXISTS: 'model_exists',
  LATEST_FOR_FAMILY: 'latest_for_family',
  LICENSE_STATUS: 'license_status',
  GET_LICENSE_INFO: 'get_license_info',

  // Escrituras (entry)
  LIST_OR_UPGRADE: 'list_or_upgrade',
  SET_LICENSING_PARAMS: 'set_licensing_params',
  SET_LISTED: 'set_listed',
  SET_MODEL_URI: 'set_model_uri',
  SET_MODEL_TERMS: 'set_model_terms',
  SET_MODEL_DELIVERY: 'set_model_delivery',
  BUY: 'buy',
  BUY_LICENSE: 'buy_license',
  RENEW_LICENSE: 'renew_license',
} as const;

// ============================================
// TIPOS DE OBJETOS SUI
// ============================================

export const OBJECT_TYPES = {
  MARKETPLACE: `${PACKAGE_ID}::${MODULES.MARKETPLACE}::Marketplace`,
  MODEL: `${PACKAGE_ID}::${MODULES.MARKETPLACE}::Model`,
  LICENSE: `${PACKAGE_ID}::${MODULES.MARKETPLACE}::License`,
} as const;

// ============================================
// CONFIGURACIÓN DE GAS
// ============================================

export const GAS_BUDGET = {
  DEFAULT: 20_000_000,
  WRITE_MEDIUM: 30_000_000,
} as const;

// ============================================
// CONFIGURACIÓN DE RED
// ============================================

export const NETWORK_CONFIG = {
  testnet: {
    name: 'Testnet',
    rpcUrl: 'https://fullnode.testnet.sui.io:443',
    explorerUrl: 'https://suiscan.xyz/testnet',
  },
  mainnet: {
    name: 'Mainnet',
    rpcUrl: 'https://fullnode.mainnet.sui.io:443',
    explorerUrl: 'https://suiscan.xyz/mainnet',
  },
  devnet: {
    name: 'Devnet',
    rpcUrl: 'https://fullnode.devnet.sui.io:443',
    explorerUrl: 'https://suiscan.xyz/devnet',
  },
} as const;

// ============================================
// HELPERS
// ============================================

export function getExplorerUrl(network: keyof typeof NETWORK_CONFIG, path: string): string {
  return `${NETWORK_CONFIG[network].explorerUrl}/${path}`;
}

export function getTransactionUrl(network: keyof typeof NETWORK_CONFIG, digest: string): string {
  return getExplorerUrl(network, `tx/${digest}`);
}

export function getObjectUrl(network: keyof typeof NETWORK_CONFIG, objectId: string): string {
  return getExplorerUrl(network, `object/${objectId}`);
}

export function getAddressUrl(network: keyof typeof NETWORK_CONFIG, address: string): string {
  return getExplorerUrl(network, `account/${address}`);
}