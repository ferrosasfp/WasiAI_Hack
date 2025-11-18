import { NextRequest, NextResponse } from 'next/server';
import { getPinataEndpoint } from '@/config';

export const runtime = 'nodejs';

function b64ToBuffer(b64: string): Buffer {
  return Buffer.from(b64, 'base64');
}

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get('content-type') || '';
    const gatewayJwt = process.env.PINATA_JWT || process.env.NEXT_PUBLIC_PINATA_JWT;
    if (!gatewayJwt) return new Response(JSON.stringify({ error: 'Missing PINATA_JWT' }), { status: 500, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });

    // 0) Soporte multipart (archivo directo desde el cliente)
    if (contentType.includes('multipart/form-data')) {
      const formIn = await req.formData();
      const file = formIn.get('file') as File | null;
      const name = (formIn.get('filename') as string) || (file?.name ?? 'file.bin');
      if (!file) {
        return new Response(JSON.stringify({ error: 'multipart missing file field' }), { status: 400, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
      }
      const form = new FormData();
      form.append('file', file, name);
      const res = await fetch(getPinataEndpoint('pinFile'), {
        method: 'POST',
        headers: { Authorization: `Bearer ${gatewayJwt}` },
        body: form as any,
      });
      if (!res.ok) {
        const txt = await res.text();
        return new Response(JSON.stringify({ error: `pinFile failed: ${txt}` }), { status: 500, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
      }
      const json = await res.json();
      const cid = json?.IpfsHash;
      return new Response(JSON.stringify({ cid }), { status: 200, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
    }

    // 1) JSON payload (base64)
    const body = await req.json();
    const type = String(body?.type || 'json');
    const filename = String(body?.filename || (type === 'file' ? 'file.bin' : 'metadata.json'));

    if (type === 'file') {
      const b64: string = body?.contentBase64;
      if (!b64) return new Response(JSON.stringify({ error: 'contentBase64 required' }), { status: 400, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
      const form = new FormData();
      const bytes = new Uint8Array(b64ToBuffer(b64));
      const blob = new Blob([bytes]);
      form.append('file', blob, filename);
      const res = await fetch(getPinataEndpoint('pinFile'), {
        method: 'POST',
        headers: { Authorization: `Bearer ${gatewayJwt}` },
        body: form as any,
      });
      if (!res.ok) {
        const txt = await res.text();
        return new Response(JSON.stringify({ error: `pinFile failed: ${txt}` }), { status: 500, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
      }
      const json = await res.json();
      const cid = json?.IpfsHash;
      return new Response(JSON.stringify({ cid }), { status: 200, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
    }

    // json
    const jsonObj = body?.json;
    if (!jsonObj || typeof jsonObj !== 'object') return new Response(JSON.stringify({ error: 'json object required' }), { status: 400, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
    const res = await fetch(getPinataEndpoint('pinJson'), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${gatewayJwt}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ pinataContent: jsonObj, pinataMetadata: { name: filename } }),
    });
    if (!res.ok) {
      const txt = await res.text();
      return new Response(JSON.stringify({ error: `pinJSON failed: ${txt}` }), { status: 500, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
    }
    const json = await res.json();
    const cid = json?.IpfsHash;
    return new Response(JSON.stringify({ cid }), { status: 200, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: String(e?.message || e) }), { status: 500, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
  }
}
