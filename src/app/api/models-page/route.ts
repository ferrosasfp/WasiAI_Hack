// src/app/api/models-page/route.ts
import { NextRequest } from 'next/server';
import { getModelsService } from '@/domain/models';
import type { ChainKind } from '@/domain/models/types';
import { createPublicClient, http } from 'viem'
import { avalanche, avalancheFuji, base, baseSepolia } from 'viem/chains'
import MARKET_ARTIFACT from '@/abis/Marketplace.json'

const MARKET_ABI_MIN = [
  { name: 'nextId', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { name: 'activeModels', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { name: 'models', type: 'function', stateMutability: 'view', inputs: [{ name: 'id', type: 'uint256' }], outputs: [
    { name: 'owner', type: 'address' },
    { name: 'creator', type: 'address' },
    { name: 'name', type: 'string' },
    { name: 'uri', type: 'string' },
    { name: 'royaltyBps', type: 'uint256' },
    { name: 'listed', type: 'bool' },
    { name: 'pricePerpetual', type: 'uint256' },
    { name: 'priceSubscription', type: 'uint256' },
    { name: 'defaultDurationDays', type: 'uint256' },
    { name: 'deliveryRightsDefault', type: 'uint8' },
    { name: 'deliveryModeHint', type: 'uint8' },
    { name: 'version', type: 'uint16' },
    { name: 'termsHash', type: 'bytes32' },
  ] },
] as const

const ABI = (MARKET_ARTIFACT as any).abi

function getChainById(chainId: number) {
  const list = [avalancheFuji, avalanche, baseSepolia, base]
  return list.find(c => c?.id === chainId)
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const start = Number(searchParams.get('start') ?? '0');
    const limit = Number(searchParams.get('limit') ?? '50');
    const chain = (searchParams.get('chain') as ChainKind) || 'sui';
    const evmChainId = searchParams.get('chainId') ? Number(searchParams.get('chainId')) : undefined;
    const order = (searchParams.get('order') as any) || undefined;
    const listedOnly = searchParams.get('listed') === '1' || searchParams.get('listed') === 'true' || undefined;
    const q = searchParams.get('q') || undefined;

    // Elegir servicio por chain
    // Nota: para 'evm' devolvemos placeholder vacío por ahora para evitar 500
    let data: any = [];
    if (chain !== 'evm') {
      try {
        const service = getModelsService(chain);
        data = await service.getModelsPage({ start, limit, order, listedOnly, q });
      } catch {}
    }

    let marketAddress: string | undefined = undefined;
    if (chain === 'evm' && typeof evmChainId === 'number') {
      const key = `NEXT_PUBLIC_EVM_MARKET_${evmChainId}`;
      marketAddress = (process.env as any)[key];
    }

    let evmDebug: any = undefined;
    if (chain === 'evm' && typeof evmChainId === 'number' && marketAddress) {
      try {
        const chainObj = getChainById(evmChainId);
        if (chainObj) {
          const rpcs: any = (chainObj as any).rpcUrls || {}
          const rpcUrl: string | undefined = (rpcs.public && rpcs.public.http && rpcs.public.http[0]) || (rpcs.default && rpcs.default.http && rpcs.default.http[0]) || undefined
          const client = createPublicClient({ chain: chainObj as any, transport: http(rpcUrl) })
          const nextId: bigint = await client.readContract({ address: marketAddress as `0x${string}`, abi: ABI as any, functionName: 'nextId', args: [] }) as any
          const active: bigint = await client.readContract({ address: marketAddress as `0x${string}`, abi: ABI as any, functionName: 'activeModels', args: [] }) as any
          const maxId = Number(nextId) - 1
          const samples: any[] = []
          let firstErr: string | undefined
          // Recolectar últimas N para debug
          for (let i = Math.max(1, maxId - 2); i <= maxId; i++) {
            try {
              const m: any = await client.readContract({ address: marketAddress as `0x${string}`, abi: ABI as any, functionName: 'models', args: [BigInt(i)] })
              const listed = typeof m?.listed === 'boolean' ? m.listed : Boolean(m?.[5])
              const name = typeof m?.name === 'string' ? m.name : (typeof m?.[2] === 'string' ? m[2] : '')
              samples.push({ id: i, listed, name })
            } catch (e: any) {
              if (!firstErr) firstErr = String(e?.message || e)
            }
          }
          evmDebug = { nextId: Number(nextId), activeModels: Number(active), maxId, lastIds: samples, firstErr }

          // Construir listado mínimo para UI (ModelSummary-like)
          const evmItems: any[] = []
          const SCAN = 200
          for (let i = maxId; i >= Math.max(1, maxId - SCAN + 1); i--) {
            try {
              const m: any = await client.readContract({ address: marketAddress as `0x${string}`, abi: ABI as any, functionName: 'models', args: [BigInt(i)] })
              const listed = typeof m?.listed === 'boolean' ? m.listed : Boolean(m?.[5])
              const name = typeof m?.name === 'string' ? m.name : (typeof m?.[2] === 'string' ? m[2] : undefined)
              const uri = typeof m?.uri === 'string' ? m.uri : (typeof m?.[3] === 'string' ? m[3] : undefined)
              const pricePerp = (m?.pricePerpetual != null) ? m.pricePerpetual : m?.[6]
              const priceSub = (m?.priceSubscription != null) ? m.priceSubscription : m?.[7]
              const durDays = (m?.defaultDurationDays != null) ? m.defaultDurationDays : m?.[8]
              const version = (m?.version != null) ? m.version : m?.[11]
              const item = {
                id: i,
                listed: !!listed,
                name,
                uri,
                price_perpetual: pricePerp != null ? Number(pricePerp) : undefined,
                price_subscription: priceSub != null ? Number(priceSub) : undefined,
                default_duration_days: durDays != null ? Number(durDays) : undefined,
                version: version != null ? Number(version) : undefined,
              }
              evmItems.push(item)
            } catch {}
          }
          // Filtros y orden
          let list = evmItems
          const query = (q || '').trim().toLowerCase()
          if (query) list = list.filter(m => (m.name || '').toLowerCase().includes(query))
          if (listedOnly) list = list.filter(m => !!m.listed)
          const byPrice = (a: any, b: any) => Number((b.price_perpetual ?? 0) - (a.price_perpetual ?? 0));
          if (order === 'price_desc') list.sort(byPrice)
          else if (order === 'price_asc') list.sort((a, b) => Number((a.price_perpetual ?? 0) - (b.price_perpetual ?? 0)))
          else if (order === 'version_desc') list.sort((a, b) => Number((b.version ?? 0) - (a.version ?? 0)))
          else if (order === 'recent_desc') list.sort((a, b) => Number((b.id ?? 0) - (a.id ?? 0)))
          else if (order === 'recent_asc') list.sort((a, b) => Number((a.id ?? 0) - (b.id ?? 0)))
          else list.sort((a, b) => { const la = !!a.listed, lb = !!b.listed; if (la !== lb) return la ? -1 : 1; return byPrice(a, b); })
          data = list.slice(start, start + limit)
        }
      } catch {}
    }

    // Server-side enrichment & cache for above-the-fold models (start===0)
    try {
      if (start === 0 && data) {
        const g: any = globalThis as any
        type MetaCacheEntry = { ts: number; meta: any }
        g.__modelsMetaCache = g.__modelsMetaCache || new Map<string, MetaCacheEntry>()
        const META = g.__modelsMetaCache as Map<string, MetaCacheEntry>
        const TTL = 5 * 60 * 1000
        const toApiFromIpfs = (u: string): string => {
          if (!u) return ''
          if (u.startsWith('http://') || u.startsWith('https://')) return u
          if (u.startsWith('ipfs://')) return `https://${(process.env.NEXT_PUBLIC_PINATA_GATEWAY||'gateway.pinata.cloud').replace(/^https?:\/\//,'')}/ipfs/${u.replace('ipfs://','')}`
          if (u.startsWith('/ipfs/')) return `https://${(process.env.NEXT_PUBLIC_PINATA_GATEWAY||'gateway.pinata.cloud').replace(/^https?:\/\//,'')}${u}`
          return `https://${(process.env.NEXT_PUBLIC_PINATA_GATEWAY||'gateway.pinata.cloud').replace(/^https?:\/\//,'')}/ipfs/${u}`
        }
        const toHttpFromIpfs = (u: string): string => {
          if (!u) return ''
          if (u.startsWith('ipfs://')) return `/api/ipfs/ipfs/${u.replace('ipfs://','')}`
          if (u.startsWith('/ipfs/')) return `/api/ipfs${u}`
          const cidv0 = /^Qm[1-9A-Za-z]{44}(?:\/.+)?$/
          const cidv1 = /^bafy[1-9A-Za-z]+(?:\/.+)?$/
          if (cidv0.test(u) || cidv1.test(u)) return `/api/ipfs/ipfs/${u}`
          try {
            const url = new URL(u)
            if (url.hostname.includes('pinata.cloud') || url.hostname.includes('ipfs.io') || url.hostname.includes('cloudflare-ipfs.com')) {
              const idx = url.pathname.indexOf('/ipfs/')
              if (idx >= 0) {
                const rest = url.pathname.substring(idx + '/ipfs/'.length)
                return `/api/ipfs/ipfs/${rest}`
              }
            }
          } catch {}
          return u
        }
        const arr = Array.isArray((data as any)?.items) ? (data as any).items : (Array.isArray(data) ? (data as any) : [])
        const firstN = Math.min(12, arr.length)
        let cursor = 0
        const enrichOne = async (i: number) => {
          const m = arr[i]
          if (!m) return
          const uri: string | undefined = m?.uri
          if (!uri || typeof uri !== 'string' || uri.includes('.enc')) return
          try {
            const k = uri
            const now = Date.now()
            const cached = META.get(k)
            if (cached && now - cached.ts < TTL) {
              const meta = cached.meta
              const img = meta?.image || meta?.image_url || meta?.thumbnail || meta?.cover?.thumbCid || meta?.cover?.cid
              const imageUrl = typeof img === 'string' ? toHttpFromIpfs(img) : m.imageUrl
              const author = (typeof meta?.author === 'string' && meta.author) || (meta?.author && typeof meta.author === 'object' && typeof meta.author.displayName === 'string' && meta.author.displayName) || (typeof meta?.creator === 'string' ? meta.creator : undefined)
              const valueProposition = typeof meta?.valueProposition === 'string' ? meta.valueProposition : undefined
              const description = (typeof meta?.description === 'string' && meta.description) || (typeof meta?.summary === 'string' && meta.summary) || (typeof meta?.shortSummary === 'string' && meta.shortSummary) || (typeof meta?.shortDescription === 'string' && meta.shortDescription) || (typeof meta?.short_desc === 'string' && meta.short_desc) || (typeof meta?.overview === 'string' && meta.overview) || (typeof meta?.subtitle === 'string' && meta.subtitle) || m.description
              const categories = Array.isArray(meta?.categories) ? meta.categories : undefined
              const tasksArr = Array.isArray(meta?.tasks) ? meta.tasks : (Array.isArray(meta?.capabilities?.tasks) ? meta.capabilities.tasks : undefined)
              const tags = Array.isArray(meta?.tags) ? meta.tags : undefined
              const architectures = Array.isArray(meta?.architectures) ? meta.architectures : (Array.isArray(meta?.architecture?.architectures) ? meta.architecture.architectures : undefined)
              const frameworks = Array.isArray(meta?.frameworks) ? meta.frameworks : (Array.isArray(meta?.architecture?.frameworks) ? meta.architecture.frameworks : undefined)
              const precision = Array.isArray(meta?.precision) ? meta.precision : (Array.isArray(meta?.architecture?.precisions) ? meta.architecture.precisions : undefined)
              let rights: { api?: boolean; download?: boolean; transferable?: boolean } | undefined
              if (meta?.rights && typeof meta.rights === 'object') rights = { api: !!meta.rights.api, download: !!meta.rights.download, transferable: !!meta.rights.transferable }
              if (!rights && meta?.licensePolicy) {
                const r = meta.licensePolicy.rights
                const rightsArr = Array.isArray(r) ? r.map((x:any)=> String(x).toLowerCase()) : []
                rights = { api: rightsArr.includes('api'), download: rightsArr.includes('download'), transferable: !!meta.licensePolicy.transferable }
              }
              let deliveryMode = typeof meta?.deliveryMode === 'string' ? meta.deliveryMode : (typeof meta?.delivery?.mode === 'string' ? meta.delivery.mode : undefined)
              if (!deliveryMode && rights) {
                if (rights.api && rights.download) deliveryMode = 'both'; else if (rights.api) deliveryMode = 'api'; else if (rights.download) deliveryMode = 'download'
              }
              arr[i] = { ...m, imageUrl, author, valueProposition, description, categories, tasks: tasksArr, tags, architectures, frameworks, precision, rights, deliveryMode, demoPreset: !!meta?.demoPreset, artifacts: !!meta?.artifacts }
              return
            }
            const metaUrl = toApiFromIpfs(uri)
            const r = await fetch(metaUrl, { cache: 'no-store' })
            if (!r.ok) return
            const meta = await r.json().catch(()=>null)
            if (!meta) return
            META.set(k, { ts: now, meta })
            const img = meta?.image || meta?.image_url || meta?.thumbnail || meta?.cover?.thumbCid || meta?.cover?.cid
            const imageUrl = typeof img === 'string' ? toHttpFromIpfs(img) : m.imageUrl
            const author = (typeof meta?.author === 'string' && meta.author) || (meta?.author && typeof meta.author === 'object' && typeof meta.author.displayName === 'string' && meta.author.displayName) || (typeof meta?.creator === 'string' ? meta.creator : undefined)
            const valueProposition = typeof meta?.valueProposition === 'string' ? meta.valueProposition : undefined
            const description = (typeof meta?.description === 'string' && meta.description) || (typeof meta?.summary === 'string' && meta.summary) || (typeof meta?.shortSummary === 'string' && meta.shortSummary) || (typeof meta?.shortDescription === 'string' && meta.shortDescription) || (typeof meta?.short_desc === 'string' && meta.short_desc) || (typeof meta?.overview === 'string' && meta.overview) || (typeof meta?.subtitle === 'string' && meta.subtitle) || m.description
            const categories = Array.isArray(meta?.categories) ? meta.categories : undefined
            const tasksArr = Array.isArray(meta?.tasks) ? meta.tasks : (Array.isArray(meta?.capabilities?.tasks) ? meta.capabilities.tasks : undefined)
            const tags = Array.isArray(meta?.tags) ? meta.tags : undefined
            const architectures = Array.isArray(meta?.architectures) ? meta.architectures : (Array.isArray(meta?.architecture?.architectures) ? meta.architecture.architectures : undefined)
            const frameworks = Array.isArray(meta?.frameworks) ? meta.frameworks : (Array.isArray(meta?.architecture?.frameworks) ? meta.architecture.frameworks : undefined)
            const precision = Array.isArray(meta?.precision) ? meta.precision : (Array.isArray(meta?.architecture?.precisions) ? meta.architecture.precisions : undefined)
            let rights: { api?: boolean; download?: boolean; transferable?: boolean } | undefined
            if (meta?.rights && typeof meta.rights === 'object') rights = { api: !!meta.rights.api, download: !!meta.rights.download, transferable: !!meta.rights.transferable }
            if (!rights && meta?.licensePolicy) {
              const r2 = meta.licensePolicy.rights
              const rightsArr = Array.isArray(r2) ? r2.map((x:any)=> String(x).toLowerCase()) : []
              rights = { api: rightsArr.includes('api'), download: rightsArr.includes('download'), transferable: !!meta.licensePolicy.transferable }
            }
            let deliveryMode = typeof meta?.deliveryMode === 'string' ? meta.deliveryMode : (typeof meta?.delivery?.mode === 'string' ? meta.delivery.mode : undefined)
            if (!deliveryMode && rights) {
              if (rights.api && rights.download) deliveryMode = 'both'; else if (rights.api) deliveryMode = 'api'; else if (rights.download) deliveryMode = 'download'
            }
            arr[i] = { ...m, imageUrl, author, valueProposition, description, categories, tasks: tasksArr, tags, architectures, frameworks, precision, rights, deliveryMode, demoPreset: !!meta?.demoPreset, artifacts: !!meta?.artifacts }
          } catch {}
        }
        const worker = async () => { while (true) { const i = cursor++; if (i >= firstN) break; await enrichOne(i) } }
        await Promise.all(Array.from({ length: 4 }, () => worker()))
      }
    } catch {}

    const cacheCtl = 'public, max-age=30, s-maxage=60, stale-while-revalidate=300'
    return new Response(JSON.stringify({ chain, chainId: evmChainId, start, limit, order, listedOnly, q, marketAddress, evmDebug, data }), {
      status: 200,
      headers: {
        'content-type': 'application/json',
        'cache-control': cacheCtl,
        'cdn-cache-control': cacheCtl,
        'vary': 'accept-encoding'
      },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: String(e?.message || e) }), { status: 500, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
  }
}
