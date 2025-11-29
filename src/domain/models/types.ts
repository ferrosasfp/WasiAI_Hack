// src/domain/models/types.ts

export type ChainKind = 'evm';

export interface ModelSummary {
  id: number;
  owner?: string;
  listed?: boolean;
  price_perpetual?: number;
  price_subscription?: number;
  default_duration_days?: number;
  version?: number;
  uri?: string;
  slug?: string;
  name?: string;
  description?: string;
}

export interface ModelInfo extends ModelSummary {
  creator?: string;
  royalty_bps?: number;
  terms_hash?: string;
  delivery_rights_default?: number;
  delivery_mode_hint?: number;
}

export interface GetModelsPageParams {
  start: number;
  limit: number;
  order?: 'featured' | 'price_desc' | 'price_asc' | 'version_desc' | 'recent_desc' | 'recent_asc';
  listedOnly?: boolean;
  q?: string;
}
