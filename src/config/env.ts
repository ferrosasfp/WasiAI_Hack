// src/config/env.ts

/**
 * Configuración y validación de variables de entorno
 */
import { z } from 'zod';

const schema = z.object({
  NEXT_PUBLIC_SUI_NETWORK: z.enum(['testnet', 'mainnet', 'devnet']).catch('testnet'),
  NEXT_PUBLIC_SUI_RPC_URL: z.string().url().optional(),
  NEXT_PUBLIC_PACKAGE_ID: z
    .string()
    .min(1)
    .catch('0x0000000000000000000000000000000000000000000000000000000000000000'),
  NEXT_PUBLIC_MARKET_ID: z
    .string()
    .min(1)
    .catch('0x0000000000000000000000000000000000000000000000000000000000000000'),
  NEXT_PUBLIC_PINATA_GATEWAY: z.string().url().catch('https://gateway.pinata.cloud'),
  NEXT_PUBLIC_DEVINSPECT_SENDER: z
    .string()
    .catch('0x0000000000000000000000000000000000000000000000000000000000000001'),
  PINATA_API_KEY: z.string().catch(''),
  PINATA_SECRET_KEY: z.string().catch(''),
  NEXT_PUBLIC_APP_URL: z.string().url().catch('http://localhost:3000'),
  // Upload image compression params (client)
  NEXT_PUBLIC_IMG_MAX_W: z.coerce.number().catch(1280),
  NEXT_PUBLIC_IMG_MAX_H: z.coerce.number().catch(720),
  NEXT_PUBLIC_IMG_QUALITY: z.coerce.number().min(0).max(1).catch(0.8),
  // Protected fetch retries (client)
  NEXT_PUBLIC_PROTECTED_FETCH_RETRIES: z.coerce.number().catch(3),
  NEXT_PUBLIC_PROTECTED_FETCH_RETRY_DELAY_MS: z.coerce.number().catch(1000),
  // Marketplace fee (bps)
  NEXT_PUBLIC_MARKET_FEE_BPS: z.coerce.number().catch(2000),
});

const raw = {
  NEXT_PUBLIC_SUI_NETWORK: process.env.NEXT_PUBLIC_SUI_NETWORK,
  NEXT_PUBLIC_SUI_RPC_URL: process.env.NEXT_PUBLIC_SUI_RPC_URL,
  NEXT_PUBLIC_PACKAGE_ID: process.env.NEXT_PUBLIC_PACKAGE_ID,
  NEXT_PUBLIC_MARKET_ID: process.env.NEXT_PUBLIC_MARKET_ID,
  NEXT_PUBLIC_PINATA_GATEWAY: process.env.NEXT_PUBLIC_PINATA_GATEWAY,
  NEXT_PUBLIC_DEVINSPECT_SENDER: process.env.NEXT_PUBLIC_DEVINSPECT_SENDER,
  PINATA_API_KEY: process.env.PINATA_API_KEY,
  PINATA_SECRET_KEY: process.env.PINATA_SECRET_KEY,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  NEXT_PUBLIC_IMG_MAX_W: process.env.NEXT_PUBLIC_IMG_MAX_W,
  NEXT_PUBLIC_IMG_MAX_H: process.env.NEXT_PUBLIC_IMG_MAX_H,
  NEXT_PUBLIC_IMG_QUALITY: process.env.NEXT_PUBLIC_IMG_QUALITY,
  NEXT_PUBLIC_PROTECTED_FETCH_RETRIES: process.env.NEXT_PUBLIC_PROTECTED_FETCH_RETRIES,
  NEXT_PUBLIC_PROTECTED_FETCH_RETRY_DELAY_MS: process.env.NEXT_PUBLIC_PROTECTED_FETCH_RETRY_DELAY_MS,
  NEXT_PUBLIC_MARKET_FEE_BPS: process.env.NEXT_PUBLIC_MARKET_FEE_BPS,
};

export const env = schema.parse(raw);

// Tipo para acceso seguro
export type Env = typeof env;