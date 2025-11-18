import { NextRequest, NextResponse } from 'next/server'
import { getPinataEndpoint } from '@/config'

async function pinJsonToPinata(payload: any): Promise<{ cid: string; uri: string }> {
  const jwt = process.env.PINATA_JWT
  const apiKey = process.env.PINATA_API_KEY
  const secret = process.env.PINATA_SECRET_KEY
  const url = getPinataEndpoint('pinJson')
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (jwt) headers['Authorization'] = `Bearer ${jwt}`
  else if (apiKey && secret) {
    headers['pinata_api_key'] = apiKey
    headers['pinata_secret_api_key'] = secret
  } else {
    throw new Error('Missing Pinata credentials')
  }

  const body = JSON.stringify({ pinataContent: payload })
  const r = await fetch(url, { method: 'POST', headers, body })
  if (!r.ok) {
    const t = await r.text()
    throw new Error(`Pinata error: ${r.status} ${t}`)
  }
  const j = await r.json()
  const cid = j.IpfsHash as string
  return { cid, uri: `ipfs://${cid}` }
}

export async function POST(req: NextRequest) {
  try {
    const json = await req.json()
    const { cid, uri } = await pinJsonToPinata(json)
    return NextResponse.json({ cid, uri }, { status: 200 })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'failed' }, { status: 500 })
  }
}
