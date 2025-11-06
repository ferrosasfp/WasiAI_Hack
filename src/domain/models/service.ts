// src/domain/models/service.ts
import type { GetModelsPageParams, ModelInfo, ModelSummary } from './types';

export interface IModelsService {
  getModelsPage(params: GetModelsPageParams): Promise<ModelSummary[]>;
  getModelInfo(id: number): Promise<ModelInfo | null>;
}

export type ModelsServiceFactory = () => IModelsService;
