import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// Simple in-memory rate limit (per process). For prod, move to Redis/DB.
const hits = new Map<string, { count: number; resetAt: number }>()

function identify(req: Request) {
  const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0]?.trim()
  return ip || 'unknown'
}

function allow(key: string, max: number, windowMs: number) {
  const now = Date.now()
  const cur = hits.get(key)
  if (!cur || now > cur.resetAt) {
    hits.set(key, { count: 1, resetAt: now + windowMs })
    return { ok: true, remaining: max - 1, resetAt: now + windowMs }
  }
  if (cur.count >= max) {
    return { ok: false, remaining: 0, resetAt: cur.resetAt }
  }
  cur.count += 1
  return { ok: true, remaining: max - cur.count, resetAt: cur.resetAt }
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({})) as any
  const keyBase = body?.user || identify(req)
  const modelId = String(body?.modelId || '')
  const MAX = Number(process.env.DEMO_MAX_PER_WINDOW || 3)
  const WINDOW = Number(process.env.DEMO_WINDOW_MS || 10 * 60 * 1000)
  const rateKey = `demo:${modelId}:${keyBase}`

  const gate = allow(rateKey, MAX, WINDOW)
  if (!gate.ok) {
    return NextResponse.json({ ok: false, error: 'rate_limited', resetAt: gate.resetAt }, { status: 429 })
  }

  // Stub demo execution: echo input and simulate latency
  const started = Date.now()
  const input = body?.input ?? null
  // TODO: integrate with hosted runner or author endpoint
  const output = { echo: input, note: 'demo-stub: replace with real inference' }
  const latencyMs = Date.now() - started

  const resp = NextResponse.json({ ok: true, modelId, result: output, latencyMs })
  resp.headers.set('x-rate-remaining', String(gate.remaining))
  resp.headers.set('x-rate-reset', String(gate.resetAt))
  return resp
}
