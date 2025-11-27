import crypto from 'node:crypto'

const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL || ''
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || ''
const HAS_REDIS = Boolean(REDIS_URL && REDIS_TOKEN)

async function redisRequest<T = any>(command: string[]): Promise<T | null> {
  if (!HAS_REDIS) return null
  const res = await fetch(REDIS_URL, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${REDIS_TOKEN}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify(command),
    next: { revalidate: 0 },
  })
  if (!res.ok) throw new Error(`redis_http_${res.status}`)
  type RedisResponse = { result?: T }
  const out = (await res.json().catch(() => ({}))) as RedisResponse | T
  if (typeof out === 'object' && out && 'result' in out) return (out as RedisResponse).result ?? null
  return out as T
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  const raw = await redisRequest<string>(['GET', key]).catch(() => null)
  if (!raw) return null
  try {
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

export async function cacheSet<T>(key: string, value: T, ttlSec?: number): Promise<void> {
  const payload = JSON.stringify(value)
  const args = ['SET', key, payload]
  if (Number.isFinite(ttlSec) && ttlSec! > 0) {
    args.push('EX', String(Math.floor(ttlSec!)))
  }
  await redisRequest(args).catch(() => null)
}

export async function cacheDel(keys: string | string[]): Promise<void> {
  const arr = Array.isArray(keys) ? keys : [keys]
  if (!arr.length) return
  await redisRequest(['DEL', ...arr]).catch(() => null)
}

export function cacheHash(value: any): string {
  try {
    const json = typeof value === 'string' ? value : JSON.stringify(value)
    return crypto.createHash('sha256').update(json).digest('hex')
  } catch {
    return ''
  }
}

export const cacheClient = {
  hasRedis: HAS_REDIS,
  get: cacheGet,
  set: cacheSet,
  del: cacheDel,
  hash: cacheHash,
}
