import { NextResponse } from 'next/server'
import { getPinataEndpoint } from '@/config'

export const dynamic = 'force-dynamic'

async function pinByHash(cid: string, name?: string) {
  const jwt = process.env.PINATA_JWT
  const key = process.env.PINATA_API_KEY
  const secret = process.env.PINATA_SECRET_KEY
  if (!jwt && !(key && secret)) throw new Error('pinata_credentials_missing')

  const headers: Record<string, string> = { 'content-type': 'application/json' }
  if (jwt) headers['Authorization'] = `Bearer ${jwt}`
  else {
    headers['pinata_api_key'] = key as string
    headers['pinata_secret_api_key'] = secret as string
  }

  const body: any = { hashToPin: cid }
  if (name) body.pinataMetadata = { name }

  const res = await fetch(getPinataEndpoint('pinCid'), {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const txt = await res.text()
    throw new Error(`pin_by_hash_failed:${res.status}:${txt}`)
  }
  return { ok: true }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(()=> ({})) as any
    const cid = String(body?.cid || '')
    const name = (body?.name ? String(body?.name) : undefined)
    if (!cid) return NextResponse.json({ ok: false, error: 'cid_missing' }, { status: 400 })
    await pinByHash(cid, name)
    return NextResponse.json({ ok: true })
  } catch (e:any) {
    return NextResponse.json({ ok: false, error: String(e?.message||e) }, { status: 500 })
  }
}
