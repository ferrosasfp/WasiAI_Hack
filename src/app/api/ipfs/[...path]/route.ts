// src/app/api/ipfs/[...path]/route.ts
import { NextRequest } from 'next/server'

const DEFAULT_GATEWAY = 'https://gateway.pinata.cloud'

export async function GET(req: NextRequest, ctx: { params: { path?: string[] } }) {
  try {
    const gateway = process.env.NEXT_PUBLIC_PINATA_GATEWAY || DEFAULT_GATEWAY
    const parts = (ctx.params?.path || []).join('/')
    // Accept either plain CID or paths like ipfs/<cid>/... => normalize to /ipfs/<...>
    let targetPath = parts
    if (!targetPath.startsWith('ipfs/')) {
      targetPath = `ipfs/${targetPath}`
    }
    const url = new URL(`${gateway.replace(/\/$/, '')}/${targetPath}`)
    // Pass through original querystring
    const reqUrl = new URL(req.url)
    reqUrl.searchParams.forEach((v, k) => url.searchParams.set(k, v))

    // Simple in-memory cache to reduce rate limiting during development
    type CacheEntry = { body: ArrayBuffer; contentType?: string; status: number; created: number; headers: Record<string,string> }
    const g: any = globalThis as any
    g.__ipfsCache = g.__ipfsCache || new Map<string, CacheEntry>()
    const CACHE = g.__ipfsCache as Map<string, CacheEntry>
    const key = url.toString()
    const ttlMs = 300_000 // 5 minutos
    const maxEntries = 200
    const now = Date.now()
    const cached = CACHE.get(key)
    if (cached && now - cached.created < ttlMs) {
      const h = new Headers(cached.headers)
      h.set('Access-Control-Allow-Origin', '*')
      h.set('Cache-Control', 'public, max-age=300')
      return new Response(cached.body, { status: cached.status, headers: h })
    }

    // Intento contra gateway principal y fallbacks simples
    const fetchWithFallback = async (): Promise<Response> => {
      try {
        const r = await fetch(key, { cache: 'no-store' })
        if (r.ok) return r
        if (r.status === 404) return r
        if (r.status === 429 || (r.status >= 500 && r.status < 600)) {
          // probar fallbacks
          const fallbacks = ['https://ipfs.io', 'https://cloudflare-ipfs.com']
          for (const gw of fallbacks) {
            const u = new URL(key)
            const idx = u.pathname.indexOf('/ipfs/')
            if (idx >= 0) {
              const rest = u.pathname.substring(idx + '/ipfs/'.length)
              const alt = `${gw}/ipfs/${rest}${u.search}`
              try {
                const r2 = await fetch(alt, { cache: 'no-store' })
                if (r2.ok || r2.status === 404) return r2
              } catch {}
            }
          }
        }
        return r
      } catch {
        // red contra fallbacks si el primer fetch lanzó error de red
        try {
          const u = new URL(key)
          const idx = u.pathname.indexOf('/ipfs/')
          if (idx >= 0) {
            const rest = u.pathname.substring(idx + '/ipfs/'.length)
            for (const gw of ['https://ipfs.io', 'https://cloudflare-ipfs.com']) {
              const alt = `${gw}/ipfs/${rest}${u.search}`
              try {
                const r3 = await fetch(alt, { cache: 'no-store' })
                if (r3.ok || r3.status === 404) return r3
              } catch {}
            }
          }
        } catch {}
        // como último recurso
        return new Response('Upstream error', { status: 502 })
      }
    }
    const upstream = await fetchWithFallback()
    // Serve stale on errors if we have any cached entry (even expired)
    if ((!upstream.ok && upstream.status !== 404) && cached) {
      const h = new Headers(cached.headers)
      h.set('Access-Control-Allow-Origin', '*')
      h.set('Cache-Control', 'public, max-age=60')
      h.set('Warning', '110 - "Response served stale due to upstream error"')
      return new Response(cached.body, { status: 200, headers: h })
    }
    const headers = new Headers()
    // Copy selected headers but drop compression-related ones because body is already decoded by fetch
    upstream.headers.forEach((v, k) => {
      const key = k.toLowerCase()
      if (key === 'content-encoding' || key === 'transfer-encoding' || key === 'content-length') return
      headers.set(k, v)
    })
    headers.set('Access-Control-Allow-Origin', '*')
    headers.set('Cache-Control', 'public, max-age=300')

    // Buffer the stream once for caching
    const arrBuf = await upstream.arrayBuffer()
    const body = arrBuf
    // Save to cache with cap
    try {
      if (CACHE.size > maxEntries) {
        // delete oldest entry (Map iteration order is insertion)
        const firstKey = CACHE.keys().next().value
        if (firstKey) CACHE.delete(firstKey)
      }
      const ct = headers.get('content-type') || undefined
      const headersObj: Record<string,string> = {}
      headers.forEach((v,k)=>{ headersObj[k] = v })
      CACHE.set(key, { body, contentType: ct, status: upstream.status, created: now, headers: headersObj })
    } catch {}

    return new Response(body, { status: upstream.status, headers })
  } catch (e: any) {
    return new Response(JSON.stringify({ error: String(e?.message || e) }), {
      status: 500,
      headers: {
        'content-type': 'application/json',
        'cache-control': 'no-store',
        'Access-Control-Allow-Origin': '*',
      },
    })
  }
}
