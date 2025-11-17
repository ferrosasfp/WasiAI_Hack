import { NextRequest } from 'next/server'
import { cacheClient, cacheHash } from '@/lib/cache'
import { getUserEntitlementsEvm, type EntitlementsDTO } from '@/adapters/evm/entitlements'

const ENTITLEMENTS_TTL_SEC = 120 // 2 minutes
const CACHE_CONTROL = 'private, max-age=60, stale-while-revalidate=300'

type CachedPayload = { payload: EntitlementsDTO; etag: string }

function normalizeAddress(addr?: string | null): string | null {
  if (!addr) return null
  const trimmed = addr.trim().toLowerCase()
  if (!trimmed.startsWith('0x') || trimmed.length !== 42) return null
  return trimmed
}

function extractUser(req: NextRequest): string | null {
  try {
    const url = new URL(req.url)
    const qp = url.searchParams
    const candidates = [qp.get('user'), qp.get('address'), qp.get('wallet'), req.headers.get('x-wallet-address')]
    for (const cand of candidates) {
      const normalized = normalizeAddress(cand)
      if (normalized) return normalized
    }
  } catch {}
  return null
}

function jsonResponse(body: any, status = 200, etag?: string | null) {
  const headers: Record<string, string> = {
    'content-type': 'application/json',
    'cache-control': CACHE_CONTROL,
  }
  if (etag) headers['etag'] = etag
  return new Response(JSON.stringify(body), { status, headers })
}

export async function GET(req: NextRequest, ctx: { params: { id: string } }) {
  try {
    const { searchParams } = new URL(req.url)
    const idNum = Number(ctx?.params?.id ?? '0')
    if (!Number.isFinite(idNum) || idNum <= 0) {
      return jsonResponse({ error: 'invalid id' }, 400)
    }
    const user = extractUser(req)
    if (!user) {
      return jsonResponse({ error: 'missing user address' }, 400)
    }
    const evmChainIdRaw = searchParams.get('chainId')
    const evmChainId = evmChainIdRaw ? Number(evmChainIdRaw) : undefined
    if (evmChainIdRaw && !Number.isFinite(evmChainId)) {
      return jsonResponse({ error: 'invalid chainId' }, 400)
    }

    const cacheKey = `entitlements:evm:v1:${user}:${idNum}:${evmChainId || 'default'}`
    const ifNoneMatch = req.headers.get('if-none-match') || ''
    const cached = await cacheClient.get<CachedPayload>(cacheKey)
    if (cached?.etag && cached.etag === ifNoneMatch) {
      return new Response(null, { status: 304, headers: { 'cache-control': CACHE_CONTROL, etag: cached.etag } })
    }
    if (cached?.payload) {
      return jsonResponse(cached.payload, 200, cached.etag)
    }

    const dto = await getUserEntitlementsEvm({ modelId: idNum, user, evmChainId })
    const etag = cacheHash({ ...dto, etag: undefined })
    const payload: EntitlementsDTO = { ...dto, etag }
    cacheClient.set(cacheKey, { payload, etag }, ENTITLEMENTS_TTL_SEC).catch(() => {})
    return jsonResponse(payload, 200, etag)
  } catch (e: any) {
    return jsonResponse({ error: String(e?.message || e) }, 500)
  }
}
