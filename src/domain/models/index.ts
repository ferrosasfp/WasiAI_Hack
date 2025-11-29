// src/domain/models/index.ts
// EVM-only: Avalanche marketplace
// Service factory for future extensibility

import type { IModelsService } from './service';
import type { ChainKind } from './types';

// EVM models service will be implemented when needed
// For now, models are fetched directly via /api/models/evm endpoints
export function getModelsService(_chain: ChainKind): IModelsService {
  throw new Error('Use /api/models/evm endpoints directly for EVM models');
}
