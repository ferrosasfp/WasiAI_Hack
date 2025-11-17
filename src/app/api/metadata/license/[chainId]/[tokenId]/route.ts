import { NextRequest, NextResponse } from 'next/server'
import { createPublicClient, http } from 'viem'
import MarketplaceAbi from '@/abis/Marketplace.json'
import LicenseNFTAbi from '@/abis/LicenseNFT.json'

function getEnvAddress(name: string): `0x${string}` | undefined {
  const v = process.env[name]
  return v && v.startsWith('0x') ? (v as `0x${string}`) : undefined
}

function rpcForChain(chainId: number, fallback?: string): string {
  if (fallback) return fallback
  if (chainId === 43113) return 'https://api.avax-test.network/ext/bc/C/rpc'
  if (chainId === 84532) return 'https://sepolia.base.org'
  throw new Error('Unsupported chainId, provide ?rpc=...')
}

function pick<T>(x: any, k: string, def?: T): T | undefined {
  return typeof x === 'object' && x && k in x ? (x[k] as T) : def
}

function toRightsLabel(rights: number): string {
  const API = 1, DL = 2
  if (rights === API + DL) return 'API + Managed Download'
  if (rights === API) return 'API'
  if (rights === DL) return 'Managed Download'
  return 'Unknown'
}

function toKindLabel(kind: number): string {
  return kind === 0 ? 'Perpetual' : kind === 1 ? 'Subscription' : 'Unknown'
}

function ipfsToGateway(u?: string): string | undefined {
  if (!u) return undefined
  if (u.startsWith('ipfs://')) {
    const cid = u.replace('ipfs://', '')
    const gw = process.env.NEXT_PUBLIC_PINATA_GATEWAY || 'https://gateway.pinata.cloud/ipfs'
    return `${gw}/${cid}`
  }
  return u
}

async function fetchWithTimeout(input: RequestInfo | URL, init: RequestInit = {}, ms = 8000): Promise<Response> {
  const ac = new AbortController()
  const t = setTimeout(() => ac.abort(), ms)
  try {
    return await fetch(input, { ...init, signal: ac.signal })
  } finally {
    clearTimeout(t)
  }
}

export async function GET(req: NextRequest, { params }: { params: { chainId: string; tokenId: string } }) {
  try {
    const tokenId = BigInt(params.tokenId)
    const chainId = Number(params.chainId)
    const { searchParams } = new URL(req.url)
    const rpc = searchParams.get('rpc') || undefined

    const MARKET = getEnvAddress(`NEXT_PUBLIC_EVM_MARKET_${chainId}`)
    const LICENSE = getEnvAddress(`NEXT_PUBLIC_EVM_LICENSE_${chainId}`)
    if (!MARKET || !LICENSE) {
      return NextResponse.json({ error: 'Missing contract addresses for chainId' }, { status: 400 })
    }

    const client = createPublicClient({ chain: undefined as any, transport: http(rpcForChain(chainId, rpc)) })

    const lic: any = await client.readContract({
      address: LICENSE,
      abi: (LicenseNFTAbi as any).abi,
      functionName: 'getLicense',
      args: [tokenId],
    })

    const modelId: bigint = BigInt(lic.modelId)
    const model: any = await client.readContract({
      address: MARKET,
      abi: (MarketplaceAbi as any).abi,
      functionName: 'models',
      args: [modelId],
    })

    const modelName: string = pick<string>(model, 'name', '') || ''
    const modelUri: string = pick<string>(model, 'uri', '') || ''

    let image: string | undefined
    try {
      const metaUrl = ipfsToGateway(modelUri)
      if (metaUrl) {
        const r = await fetchWithTimeout(metaUrl, { cache: 'no-store' }, 8000)
        if (r.ok) {
          const j = await r.json().catch(()=>null)
          if (j && typeof j === 'object') {
            image = (j.image as string) || (j.cover as string) || (j.banner as string)
          }
        }
      }
    } catch {}

    const attrs = [
      { trait_type: 'Model', value: modelName || `Model #${modelId}` },
      { trait_type: 'Model ID', value: Number(modelId) },
      { trait_type: 'License Type', value: toKindLabel(Number(lic.licenseKind)) },
      { trait_type: 'Delivery', value: toRightsLabel(Number(lic.rights)) },
      { trait_type: 'Transferable', value: Boolean(lic.transferable) ? 'Yes' : 'No' },
      ...(Number(lic.expiresAt) > 0 ? [{ trait_type: 'Expires At', display_type: 'date', value: Number(lic.expiresAt) }] : []),
      { trait_type: 'Version', value: Number(lic.version) },
    ]

    const json = {
      name: `License #${params.tokenId} – ${modelName || 'Model'}`,
      description: `License to use the model ${modelName || `#${modelId}`}.`,
      image: image || undefined,
      external_url: process.env.NEXT_PUBLIC_SITE_URL ? `${process.env.NEXT_PUBLIC_SITE_URL}/evm/models/${modelId}` : undefined,
      attributes: attrs,
    }

    return NextResponse.json(json, { status: 200 })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'failed' }, { status: 500 })
  }
}
