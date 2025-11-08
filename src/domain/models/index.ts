// src/domain/models/index.ts
import type { IModelsService } from './service';
import type { ChainKind } from './types';
import { getSuiModelsService } from '@/adapters/sui/models';
import { getEvmModelsService } from '@/adapters/evm/models';

export function getModelsService(chain: ChainKind, evmChainId?: number): IModelsService {
  if (chain === 'sui') return getSuiModelsService();
  return getEvmModelsService(evmChainId);
}
