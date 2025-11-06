import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// Persistencia: Redis (Upstash REST). Fallback a memoria si no hay configuración.
type DraftData = Record<string, any>
const store = new Map<string, DraftData>()

const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL || ''
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || ''
const HAS_REDIS = Boolean(REDIS_URL && REDIS_TOKEN)
// TTL: por defecto 6h; configurable vía DRAFT_TTL_SECONDS (segundos). Rango recomendado 1h–6h.
const ttlEnv = Number(process.env.DRAFT_TTL_SECONDS || 21600) // 6h
const TTL_SECONDS = (()=>{
  if (!Number.isFinite(ttlEnv) || ttlEnv <= 0) return 21600
  // acotar rangos sugeridos entre 1h y 6h
  return Math.max(3600, Math.min(21600, Math.floor(ttlEnv)))
})()

async function redisCmd<T = any>(args: string[]): Promise<T | null> {
  if (!HAS_REDIS) return null
  const res = await fetch(REDIS_URL, {
    method: 'POST',
    headers: { 'authorization': `Bearer ${REDIS_TOKEN}`, 'content-type': 'application/json' },
    body: JSON.stringify(args)
  })
  if (!res.ok) throw new Error(`redis_http_${res.status}`)
  const out = await res.json().catch(()=>({})) as any
  if (Object.prototype.hasOwnProperty.call(out, 'result')) return out.result as T
  return out as T
}

export async function DELETE(req: Request) {
  const wallet = walletFromReq(req)
  const id = wallet ? `wallet:${wallet}` : identify(req)
  const key = draftKey(id)
  if (HAS_REDIS) {
    try {
      await redisCmd(['DEL', key])
    } catch {}
    return NextResponse.json({ ok: true })
  } else {
    store.delete(id)
    return NextResponse.json({ ok: true, note: 'memory_fallback' })
  }
}

function identify(req: Request) {
  const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0]?.trim()
  const ua = req.headers.get('user-agent') || 'ua'
  return `${ip||'unknown'}:${ua}`
}

function draftKey(id: string) {
  return `draft:${id}`
}

function walletFromReq(req: Request, body?: any): string | null {
  // 1) body.address (POST)
  const bAddr = typeof body?.address === 'string' && body.address.trim() ? body.address.trim() : null
  if (bAddr) return bAddr
  // 2) header X-Wallet-Address (GET/POST)
  const hAddr = req.headers.get('x-wallet-address')?.trim()
  if (hAddr) return hAddr
  // 3) query ?address=
  try {
    const url = new URL(req.url)
    const qAddr = url.searchParams.get('address')?.trim()
    if (qAddr) return qAddr
  } catch {}
  return null
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({})) as any
  const wallet = walletFromReq(req, body)
  const id = wallet ? `wallet:${wallet}` : identify(req)
  const key = draftKey(id)
  const step = String(body?.step || '')
  const data = body?.data || null
  if (!step || !data) {
    return NextResponse.json({ ok: false, error: 'invalid_step_or_data' }, { status: 400 })
  }

  if (HAS_REDIS) {
    // Leer previo
    const prevRaw = await redisCmd<string>(['GET', key]).catch(()=>null)
    const prev = prevRaw ? (JSON.parse(prevRaw) as DraftData) : {}
    const next = { ...prev, [step]: data, updatedAt: Date.now() }
    await redisCmd(['SET', key, JSON.stringify(next), 'EX', String(TTL_SECONDS)])
    return NextResponse.json({ ok: true })
  } else {
    const prev = store.get(id) || {}
    const next = { ...prev, [step]: data, updatedAt: Date.now() }
    store.set(id, next)
    return NextResponse.json({ ok: true, note: 'memory_fallback' })
  }
}

export async function GET(req: Request) {
  const wallet = walletFromReq(req)
  const id = wallet ? `wallet:${wallet}` : identify(req)
  const key = draftKey(id)
  if (HAS_REDIS) {
    const raw = await redisCmd<string>(['GET', key]).catch(()=>null)
    const data = raw ? (JSON.parse(raw) as DraftData) : {}
    return NextResponse.json({ ok: true, data })
  } else {
    const data = store.get(id) || {}
    return NextResponse.json({ ok: true, data, note: 'memory_fallback' })
  }
}
