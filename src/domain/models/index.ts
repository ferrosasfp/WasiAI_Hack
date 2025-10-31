// src/domain/models/index.ts
import type { IModelsService } from './service';
import type { ChainKind } from './types';
import { getSuiModelsService } from '@/adapters/sui/models';

export function getModelsService(chain: ChainKind): IModelsService {
  if (chain === 'sui') return getSuiModelsService();
  // Placeholder: EVM vendrá luego
  return getSuiModelsService();
}
