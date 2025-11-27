import { createPublicClient, http, Address } from 'viem'
import type { Abi } from 'viem'
import { avalanche, avalancheFuji, base, baseSepolia } from 'viem/chains'
import MARKET_ARTIFACT from '@/abis/Marketplace.json'
import LICENSE_NFT_ARTIFACT from '@/abis/LicenseNFT.json'

const MARKET_ABI = (MARKET_ARTIFACT as any).abi as Abi
const LICENSE_ABI = (LICENSE_NFT_ARTIFACT as any).abi as Abi

const CHAINS = [avalancheFuji, avalanche, baseSepolia, base]
const RIGHTS_API = 1
const RIGHTS_DOWNLOAD = 2
const KIND_PERPETUAL = 0
const MAX_SCAN = Number(process.env.LICENSE_SCAN_LIMIT || 600)

export type EntitlementsDTO = {
  modelId: number
  user: string
  rights: { api: boolean; download: boolean; transferable: boolean }
  kind: 'perpetual' | 'subscription' | null
  expiresAt: number | null
  revoked: boolean
  version: number
  etag: string
}

export type GetUserEntitlementsParams = {
  modelId: number
  user: string
  evmChainId?: number
}

function getChainById(chainId?: number) {
  if (!chainId) return undefined
  return CHAINS.find((c) => c?.id === chainId)
}

function getRpcUrl(chainId: number | undefined) {
  if (!chainId) return undefined
  const envKey = `NEXT_PUBLIC_EVM_RPC_${chainId}`
  const envUrl = (process.env as any)[envKey]
  if (typeof envUrl === 'string' && envUrl.trim()) return envUrl
  const chain = getChainById(chainId)
  const urls = (chain as any)?.rpcUrls
  return urls?.public?.http?.[0] || urls?.default?.http?.[0]
}

function getMarketAddressByChainId(chainId?: number): Address | null {
  if (!chainId) return null
  const key = `NEXT_PUBLIC_EVM_MARKET_${chainId}`
  const addr = (process.env as any)[key]
  return (typeof addr === 'string' && addr.startsWith('0x') ? addr : null) as Address | null
}

function normalizeAddress(addr?: string | null): `0x${string}` | null {
  if (!addr) return null
  const value = addr.trim().toLowerCase()
  if (!value.startsWith('0x') || value.length !== 42) return null
  return value as `0x${string}`
}

function maskHas(value: number, bit: number) {
  return (value & bit) === bit
}

export async function getUserEntitlementsEvm(params: GetUserEntitlementsParams): Promise<EntitlementsDTO> {
  const { modelId } = params
  const user = normalizeAddress(params.user)
  if (!Number.isFinite(modelId) || modelId <= 0) {
    throw new Error('invalid_model_id')
  }
  if (!user) {
    throw new Error('invalid_user_address')
  }
  const evmChainId = typeof params.evmChainId === 'number' && Number.isFinite(params.evmChainId)
    ? params.evmChainId
    : Number(process.env.NEXT_PUBLIC_EVM_DEFAULT_CHAIN_ID || process.env.NEXT_PUBLIC_EVM_CHAIN_ID || 0)

  if (!evmChainId) {
    throw new Error('missing_chain_id')
  }

  const chain = getChainById(evmChainId)
  if (!chain) {
    throw new Error('unsupported_chain_id')
  }

  const marketAddress = getMarketAddressByChainId(evmChainId)
  if (!marketAddress) {
    throw new Error('market_address_not_configured')
  }

  const rpcUrl = getRpcUrl(evmChainId)
  const client = createPublicClient({ chain, transport: http(rpcUrl) })

  const empty: EntitlementsDTO = {
    modelId,
    user,
    rights: { api: false, download: false, transferable: false },
    kind: null,
    expiresAt: null,
    revoked: false,
    version: 0,
    etag: '',
  }

  const lastLicenseIdBig = await client.readContract({ address: marketAddress, abi: MARKET_ABI, functionName: 'lastLicenseId' }) as bigint
  const lastLicenseId = Number(lastLicenseIdBig)
  if (!Number.isFinite(lastLicenseId) || lastLicenseId <= 0) {
    return empty
  }

  const licenseAddress = await client.readContract({ address: marketAddress, abi: MARKET_ABI, functionName: 'licenseNFTAddress' }) as `0x${string}`

  const limit = Math.max(1, Math.min(MAX_SCAN, lastLicenseId))

  for (let idx = 0; idx < limit; idx++) {
    const tokenId = lastLicenseId - idx
    if (tokenId <= 0) break
    try {
      const status = await client.readContract({
        address: marketAddress,
        abi: MARKET_ABI,
        functionName: 'licenseStatus',
        args: [BigInt(tokenId)],
      }) as [boolean, boolean, boolean, number, bigint, `0x${string}`]
      const owner = status?.[5]
      if (!owner || owner.toLowerCase() !== user) continue

      const licenseData = await client.readContract({
        address: licenseAddress,
        abi: LICENSE_ABI,
        functionName: 'getLicense',
        args: [BigInt(tokenId)],
      }) as any

      const licenseModelId = Number(licenseData?.modelId ?? 0)
      if (licenseModelId !== modelId) continue

      const rightsMask = Number(licenseData?.rights ?? 0)
      const transferable = Boolean(licenseData?.transferable)
      const kindRaw = Number(licenseData?.licenseKind ?? status?.[3] ?? 0)
      const expiresAt = Number(status?.[4] ?? 0)
      const revoked = Boolean(status?.[0])
      const validApi = Boolean(status?.[1])
      const validDownload = Boolean(status?.[2])
      const version = Number(licenseData?.version ?? 0)

      return {
        modelId,
        user,
        rights: {
          api: validApi || maskHas(rightsMask, RIGHTS_API),
          download: validDownload || maskHas(rightsMask, RIGHTS_DOWNLOAD),
          transferable,
        },
        kind: kindRaw === KIND_PERPETUAL ? 'perpetual' : 'subscription',
        expiresAt: expiresAt > 0 ? expiresAt : null,
        revoked,
        version,
        etag: '',
      }
    } catch {
      continue
    }
  }

  return empty
}
