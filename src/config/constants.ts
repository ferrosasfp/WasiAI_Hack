// Constantes generales de la aplicación

export const APP_CONFIG = {
    name: 'WasiAI',
    description: 'AI Agent Marketplace on Avalanche',
    version: '1.0.0',
  } as const;
  
  // Límites de la aplicación
  export const LIMITS = {
    MAX_FILE_SIZE: 100 * 1024 * 1024, // 100MB
    MAX_NAME_LENGTH: 100,
    MAX_DESCRIPTION_LENGTH: 1000,
    MAX_TAGS: 10,
    MIN_PRICE: 0.01, // SUI
    MAX_PRICE: 1000000, // SUI
  } as const;
  
  // Formatos de archivo permitidos
  export const ALLOWED_FILE_TYPES = {
    models: ['.pkl', '.h5', '.pt', '.pth', '.onnx', '.safetensors', '.bin'],
    images: ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
    metadata: ['.json'],
  } as const;
  
  // Timeouts y retry
  export const NETWORK_CONFIG = {
    REQUEST_TIMEOUT: 30000, // 30 segundos
    MAX_RETRIES: 3,
    RETRY_DELAY: 1000, // 1 segundo
  } as const;
  
  // Gas configuration
  export const GAS_CONFIG = {
    DEFAULT_BUDGET: 10_000_000, // 0.01 SUI
    MAX_BUDGET: 1_000_000_000, // 1 SUI
  } as const;
  
  // Conversión de unidades Sui
  export const SUI_DECIMALS = 9;
  export const MIST_PER_SUI = 1_000_000_000;
  
  // Helper para convertir SUI a MIST
  export function suiToMist(sui: number): number {
    return Math.floor(sui * MIST_PER_SUI);
  }
  
  // Helper para convertir MIST a SUI
  export function mistToSui(mist: number): number {
    return mist / MIST_PER_SUI;
  }
  
  // Helper para formatear SUI
  export function formatSui(mist: number, decimals: number = 4): string {
    const sui = mistToSui(mist);
    return sui.toFixed(decimals);
  }
  
  // Rutas de la aplicación
  export const ROUTES = {
    HOME: '/',
    MODELS: '/models',
    MODEL_DETAIL: (id: string) => `/models/${id}`,
    MODEL_PURCHASE: (id: string) => `/models/${id}/purchase`,
    MY_MODELS: '/my-models',
    UPLOAD: '/upload',
    PROFILE: '/profile',
  } as const;