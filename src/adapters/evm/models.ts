// src/adapters/evm/models.ts
import { createPublicClient, http, Address } from 'viem'
import type { Abi } from 'viem'
import MARKET_ARTIFACT from '@/abis/Marketplace.json'
import { avalanche, avalancheFuji, base, baseSepolia } from 'viem/chains'

// Local type definitions (domain layer removed)
export type GetModelsPageParams = {
  start: number
  limit: number
  order?: 'recent' | 'featured' | 'recent_asc'
  listedOnly?: boolean
  q?: string
}

export type ModelSummary = {
  id: number
  owner?: string
  listed?: boolean
  price_perpetual?: number
  price_subscription?: number
  default_duration_days?: number
  version?: number
  uri?: string
  name?: string
}

export type ModelInfo = {
  id: number
  owner?: string
  creator?: string
  listed?: boolean
  price_perpetual?: number
  price_subscription?: number
  default_duration_days?: number
  version?: number
  uri?: string
  name?: string
  royalty_bps?: number
  delivery_rights_default?: number
  delivery_mode_hint?: number
  terms_hash?: string
}

export interface IModelsService {
  getModelsPage(params: GetModelsPageParams): Promise<ModelSummary[]>
  getModelInfo(id: number): Promise<ModelInfo | null>
}

const MARKET_ABI = (MARKET_ARTIFACT as any).abi as Abi

function getMarketAddressByChainId(chainId: number): Address | null {
  const env = (name: string) => (process.env as any)[name] as string | undefined
  const key = `NEXT_PUBLIC_EVM_MARKET_${chainId}`
  const val = env(key)
  return (val as Address) || null
}

function getChainById(chainId: number) {
  const list = [avalancheFuji, avalanche, baseSepolia, base]
  return list.find(c => c?.id === chainId)
}

export function getEvmModelsService(chainId: number | undefined): IModelsService {
  const client = (() => {
    if (!chainId) return null
    const chain = getChainById(chainId)
    if (!chain) return null
    const env = (name: string) => (process.env as any)[name] as string | undefined
    const rpcKey = `NEXT_PUBLIC_EVM_RPC_${chainId}`
    const rpcUrl = env(rpcKey)
    return createPublicClient({ chain, transport: rpcUrl ? http(rpcUrl) : http() })
  })()

  const market = chainId ? getMarketAddressByChainId(chainId) : null

  const empty: IModelsService = {
    async getModelsPage() { return [] },
    async getModelInfo() { return null },
  }

  if (!client || !market) return empty

  return {
    async getModelsPage({ start, limit, order, listedOnly, q }: GetModelsPageParams): Promise<ModelSummary[]> {
      try {
        const total: bigint = await client.readContract({ address: market, abi: MARKET_ABI as any, functionName: 'nextId', args: [] }) as any
        const maxId = Number(total) - 1
        if (!Number.isFinite(maxId) || maxId <= 0) return []

        const ids: number[] = []
        // Default order: featured/recent => newest first by id desc
        if (order === 'recent_asc') {
          for (let i = 1; i <= maxId; i++) ids.push(i)
        } else {
          for (let i = maxId; i >= 1; i--) ids.push(i)
        }

        const out: ModelSummary[] = []
        for (let i = 0; i < ids.length; i++) {
          const id = ids[i]
          try {
            const v: any = await client.readContract({ address: market, abi: MARKET_ABI as any, functionName: 'models', args: [BigInt(id)] })
            // Support flattened outputs (array) and object-shaped results
            const a: any[] | null = Array.isArray(v) ? v : null
            const owner = a ? a[0] : v?.owner
            const name: string = a ? a[2] : (v?.name || '')
            const uri: string = a ? a[3] : (v?.uri || '')
            const listed = a ? Boolean(a[5]) : Boolean(v?.listed)
            const pricePerpetual = a ? a[6] : v?.pricePerpetual
            const priceSubscription = a ? a[7] : v?.priceSubscription
            const defaultDurationDays = a ? a[8] : v?.defaultDurationDays
            const version = a ? a[11] : v?.version
            if (listedOnly && !listed) continue
            const slugOrName = name.toLowerCase()
            if (q && q.trim()) {
              const qq = q.toLowerCase()
              if (!slugOrName.includes(qq)) continue
            }
            const item: ModelSummary = {
              id,
              owner: owner,
              listed,
              price_perpetual: pricePerpetual ? Number(pricePerpetual) : undefined,
              price_subscription: priceSubscription ? Number(priceSubscription) : undefined,
              default_duration_days: defaultDurationDays ? Number(defaultDurationDays) : undefined,
              version: version ? Number(version) : undefined,
              uri: uri,
              name: name || undefined,
            }
            out.push(item)
            if (out.length >= start + limit) break
          } catch {}
        }
        return out.slice(start, start + limit)
      } catch {
        return []
      }
    },

    async getModelInfo(id: number): Promise<ModelInfo | null> {
      try {
        const v: any = await client.readContract({ address: market, abi: MARKET_ABI as any, functionName: 'models', args: [BigInt(id)] })
        const a: any[] | null = Array.isArray(v) ? v : null
        const item: ModelInfo = {
          id,
          owner: a ? a[0] : v?.owner,
          creator: a ? a[1] : v?.creator,
          listed: a ? Boolean(a[5]) : Boolean(v?.listed),
          price_perpetual: a ? (a[6] ? Number(a[6]) : undefined) : (v?.pricePerpetual ? Number(v.pricePerpetual) : undefined),
          price_subscription: a ? (a[7] ? Number(a[7]) : undefined) : (v?.priceSubscription ? Number(v.priceSubscription) : undefined),
          default_duration_days: a ? (a[8] ? Number(a[8]) : undefined) : (v?.defaultDurationDays ? Number(v.defaultDurationDays) : undefined),
          version: a ? (a[11] ? Number(a[11]) : undefined) : (v?.version ? Number(v.version) : undefined),
          uri: a ? a[3] : v?.uri,
          name: a ? (a[2] || undefined) : (v?.name || undefined),
          royalty_bps: a ? (a[4] ? Number(a[4]) : undefined) : (v?.royaltyBps ? Number(v.royaltyBps) : undefined),
          delivery_rights_default: a ? (a[9] ? Number(a[9]) : undefined) : (v?.deliveryRightsDefault ? Number(v.deliveryRightsDefault) : undefined),
          delivery_mode_hint: a ? (a[10] ? Number(a[10]) : undefined) : (v?.deliveryModeHint ? Number(v.deliveryModeHint) : undefined),
          terms_hash: a ? String(a[12]) : (v?.termsHash ? String(v.termsHash) : undefined),
        }
        return item
      } catch {
        return null
      }
    },
  }
}
