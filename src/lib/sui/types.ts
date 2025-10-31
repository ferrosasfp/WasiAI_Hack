// Tipos para el smart contract

export interface AIModel {
    id: string;
    name: string;
    description: string;
    ipfs_hash: string;
    price: number; // en MIST
    owner: string;
    is_listed: boolean;
    created_at: number;
    updated_at: number;
  }
  
  export interface ModelMetadata {
    name: string;
    description: string;
    framework: string;
    version: string;
    tags: string[];
    license: string;
    author: string;
  }
  
  export interface CreateModelParams {
    name: string;
    description: string;
    ipfs_hash: string;
    price: number; // en MIST
  }
  
  export interface PurchaseModelParams {
    model_id: string;
    payment: number; // en MIST
  }
  
  export interface UpdatePriceParams {
    model_id: string;
    new_price: number; // en MIST
  }
  
  export interface DelistModelParams {
    model_id: string;
  }
  
  // Tipos de respuesta de transacciones
  export interface TransactionResult {
    digest: string;
    effects: {
      status: { status: string };
      gasUsed: {
        computationCost: string;
        storageCost: string;
        storageRebate: string;
      };
    };
  }
  
  // Tipos de errores
  export enum ErrorCode {
    WALLET_NOT_CONNECTED = 'WALLET_NOT_CONNECTED',
    INSUFFICIENT_BALANCE = 'INSUFFICIENT_BALANCE',
    TRANSACTION_FAILED = 'TRANSACTION_FAILED',
    MODEL_NOT_FOUND = 'MODEL_NOT_FOUND',
    UNAUTHORIZED = 'UNAUTHORIZED',
    INVALID_PRICE = 'INVALID_PRICE',
    NETWORK_ERROR = 'NETWORK_ERROR',
  }
  
  export class MarketplaceError extends Error {
    code: ErrorCode;
    
    constructor(code: ErrorCode, message: string) {
      super(message);
      this.code = code;
      this.name = 'MarketplaceError';
    }
  }