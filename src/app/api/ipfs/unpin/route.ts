import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

async function unpinFromIPFS(cid: string) {
  const jwt = process.env.PINATA_JWT
  const key = process.env.PINATA_API_KEY
  const secret = process.env.PINATA_SECRET_KEY
  if (!jwt && !(key && secret)) throw new Error('pinata_credentials_missing')

  const headers: Record<string, string> = {}
  if (jwt) headers['Authorization'] = `Bearer ${jwt}`
  else {
    headers['pinata_api_key'] = key as string
    headers['pinata_secret_api_key'] = secret as string
  }

  const res = await fetch(`https://api.pinata.cloud/pinning/unpin/${cid}`, {
    method: 'DELETE',
    headers,
  })
  if (!res.ok) {
    const txt = await res.text()
    throw new Error(`unpin_failed:${res.status}:${txt}`)
  }
  return { ok: true }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(()=> ({})) as any
    const cid = String(body?.cid || '')
    if (!cid) return NextResponse.json({ ok: false, error: 'cid_missing' }, { status: 400 })
    await unpinFromIPFS(cid)
    return NextResponse.json({ ok: true })
  } catch (e:any) {
    return NextResponse.json({ ok: false, error: String(e?.message||e) }, { status: 500 })
  }
}
