import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

async function pinFileToIPFS(file: Blob, name?: string) {
  const jwt = process.env.PINATA_JWT
  const key = process.env.PINATA_API_KEY
  const secret = process.env.PINATA_SECRET_KEY
  if (!jwt && !(key && secret)) throw new Error('pinata_credentials_missing')

  const form = new FormData()
  form.append('file', file, (name || (file as any)?.name || 'upload'))

  if (name) {
    // Pinata espera pinataMetadata como string JSON, no como Blob
    form.append('pinataMetadata', JSON.stringify({ name }))
  }

  const headers: Record<string, string> = {}
  if (jwt) headers['Authorization'] = `Bearer ${jwt}`
  else {
    headers['pinata_api_key'] = key as string
    headers['pinata_secret_api_key'] = secret as string
  }

  const url = 'https://api.pinata.cloud/pinning/pinFileToIPFS'
  const maxAttempts = 3
  let lastErr: any = null
  for (let attempt=1; attempt<=maxAttempts; attempt++) {
    try {
      const controller = new AbortController()
      // Aumentar timeout por intento a 10 minutos para archivos grandes
      const tmo = setTimeout(()=>controller.abort(), 600000)
      const res = await fetch(url, {
        method: 'POST',
        headers,
        body: form as any,
        signal: controller.signal,
      })
      clearTimeout(tmo)
      if (!res.ok) {
        const txt = await res.text()
        throw new Error(`pin_file_failed:${res.status}:${txt}`)
      }
      const out = await res.json() as any
      const cid = out.IpfsHash || out.cid || out.hash
      if (!cid) throw new Error('pin_no_cid')
      return { cid, uri: `ipfs://${cid}` }
    } catch (e:any) {
      lastErr = e
      if (attempt < maxAttempts) {
        await new Promise(r=>setTimeout(r, 1000 * attempt))
        continue
      }
      throw e
    }
  }
  throw lastErr
}

export async function POST(req: Request) {
  try {
    // Si el cuerpo es multipart grande, hacemos proxy en streaming para evitar cargar todo en memoria
    const ct = req.headers.get('content-type') || ''
    const lenHeader = req.headers.get('content-length')
    const contentLength = lenHeader ? parseInt(lenHeader, 10) : undefined
    const isMultipart = ct.toLowerCase().startsWith('multipart/form-data')
    const LARGE_THRESHOLD = 50 * 1024 * 1024 // 50MB

    if (isMultipart && (contentLength === undefined || contentLength > LARGE_THRESHOLD)) {
      const jwt = process.env.PINATA_JWT
      const key = process.env.PINATA_API_KEY
      const secret = process.env.PINATA_SECRET_KEY
      if (!jwt && !(key && secret)) return NextResponse.json({ ok:false, error:'pinata_credentials_missing' }, { status: 500 })

      const headers: Record<string, string> = { 'content-type': ct }
      if (jwt) headers['authorization'] = `Bearer ${jwt}`
      else { headers['pinata_api_key'] = key as string; headers['pinata_secret_api_key'] = secret as string }

      const url = 'https://api.pinata.cloud/pinning/pinFileToIPFS'
      const maxAttempts = 3
      let lastErr: any = null
      for (let attempt=1; attempt<=maxAttempts; attempt++) {
        try {
          const controller = new AbortController()
          const tmo = setTimeout(()=>controller.abort(), 600000) // 10min
          const res = await fetch(url, { method:'POST', headers, body: req.body as any, signal: controller.signal, // requerido por undici para stream
            // @ts-ignore
            duplex: 'half' as any,
          })
          clearTimeout(tmo)
          if (!res.ok) {
            const snippet = (await res.text()).slice(0, 400)
            throw new Error(`pin_file_failed:${res.status}:${snippet}`)
          }
          const out = await res.json() as any
          const cid = out.IpfsHash || out.cid || out.hash
          if (!cid) throw new Error('pin_no_cid')
          return NextResponse.json({ ok:true, cid, uri:`ipfs://${cid}` })
        } catch (e:any) {
          lastErr = e
          if (attempt < maxAttempts) { await new Promise(r=>setTimeout(r, 1000*attempt)); continue }
          throw e
        }
      }
      throw lastErr
    }

    // Ruta normal (archivos pequeños): parse formData y reenviar con metadata opcional
    const form = await req.formData()
    const file = form.get('file') as Blob | null
    const name = (form.get('name') as string) || undefined
    if (!file) return NextResponse.json({ ok: false, error: 'file_missing' }, { status: 400 })
    const pinned = await pinFileToIPFS(file, name)
    return NextResponse.json({ ok: true, ...pinned })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 })
  }
}
