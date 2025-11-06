"use client";

import React from 'react';
import { useParams } from 'next/navigation';
import { Box, Container, Typography, Stack, Button } from '@mui/material';
import { useCurrentAccount } from '@mysten/dapp-kit';
import { useQuery } from '@tanstack/react-query';
import { getSuiClient, devInspectGetModelInfoEx } from '@/lib/sui';
import { MARKET_ID, PACKAGE_ID, MODULES, FUNCTIONS, getObjectUrl } from '@/lib/sui/constants';
import { decodeModelInfoEx } from '@/lib/sui/parsers';

function extractReturnBytes(resp: any): Uint8Array | null {
  try {
    const rv = (resp as any)?.results?.[0]?.returnValues;
    const b64: string | undefined = Array.isArray(rv) && rv.length ? rv[0][0] : undefined;
    if (b64) {
      return typeof window === 'undefined'
        ? Uint8Array.from(Buffer.from(b64, 'base64'))
        : Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    }
  } catch {}
  try {
    const rv2 = (resp as any)?.effects?.returnValues;
    const b64: string | undefined = Array.isArray(rv2) && rv2.length ? rv2[0][0] : undefined;
    if (b64) {
      return typeof window === 'undefined'
        ? Uint8Array.from(Buffer.from(b64, 'base64'))
        : Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    }
  } catch {}
  return null;
}

// --- BCS helpers for get_models_page ---
type ModelSummaryLike = {
  id: number;
  owner: string;
  listed: boolean;
  price_direct: bigint;
  price_perpetual: bigint;
  price_subscription: bigint;
  default_duration_days: bigint;
  version: number;
};

function readU64LE(view: DataView, off: number): { v: bigint; n: number } {
  const lo = view.getUint32(off, true);
  const hi = view.getUint32(off + 4, true);
  return { v: (BigInt(hi) << 32n) + BigInt(lo), n: off + 8 };
}
function readU16LE(view: DataView, off: number): { v: number; n: number } {
  return { v: view.getUint16(off, true), n: off + 2 };
}
function readULEB128(buf: Uint8Array, off: number): { v: number; n: number } {
  let result = 0;
  let shift = 0;
  let i = off;
  while (i < buf.length) {
    const byte = buf[i];
    result |= (byte & 0x7f) << shift;
    i++;
    if ((byte & 0x80) === 0) break;
    shift += 7;
  }
  return { v: result, n: i };
}
function decodeModelsPage(bytes: Uint8Array): ModelSummaryLike[] {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let o = 0;
  const { v: len, n: n1 } = readULEB128(bytes, o); o = n1;
  const out: ModelSummaryLike[] = [];
  for (let i = 0; i < len; i++) {
    const idV = readU64LE(view, o); o = idV.n;
    const ownerBytes = bytes.slice(o, o + 32); o += 32;
    const listed = bytes[o] === 1; o += 1;
    const pd = readU64LE(view, o); o = pd.n;
    const pp = readU64LE(view, o); o = pp.n;
    const ps = readU64LE(view, o); o = ps.n;
    const dd = readU64LE(view, o); o = dd.n;
    const ver = readU16LE(view, o); o = ver.n;
    const owner = `0x${Array.from(ownerBytes).map((b) => b.toString(16).padStart(2, '0')).join('')}`;
    out.push({
      id: Number(idV.v), owner, listed,
      price_direct: pd.v, price_perpetual: pp.v, price_subscription: ps.v,
      default_duration_days: dd.v, version: ver.v,
    });
  }
  return out;
}

const DEFAULT_SENDER = '0x0000000000000000000000000000000000000000000000000000000000000001';

async function devInspectGetModelsPage(start: number, limit: number, sender?: string) {
  const client = getSuiClient();
  const txMod = await import('@mysten/sui/transactions');
  const tx = new txMod.Transaction();
  tx.moveCall({
    target: `${PACKAGE_ID}::${MODULES.MARKETPLACE}::${FUNCTIONS.GET_MODELS_PAGE}`,
    arguments: [tx.object(MARKET_ID), tx.pure.u64(start), tx.pure.u64(limit)],
  });
  const res = await client.devInspectTransactionBlock({ transactionBlock: await tx.build({ client }), sender: sender || DEFAULT_SENDER });
  return res;
}

export default function DebugModelPage() {
  const params = useParams<{ id: string }>();
  const id = Number(params?.id || 0);
  const account = useCurrentAccount();

  const { data, refetch, isFetching } = useQuery({
    queryKey: ['debug-model', id, account?.address || '(no-wallet)'],
    enabled: Number.isFinite(id) && id > 0,
    queryFn: async () => {
      const client = getSuiClient();

      // infoEx
      let infoEx: any = null;
      let infoExRaw: Array<[number[], string]> | null = null;
      try {
        const r = await devInspectGetModelInfoEx(id, account?.address || DEFAULT_SENDER);
        console.log('[debug] infoEx devInspect results?', r?.results?.length, r);
        const bytes = extractReturnBytes(r);
        console.log('[debug] infoEx bytes?', !!bytes);
        const rv = (r as any)?.results?.[0]?.returnValues as any[] | undefined;
        if (Array.isArray(rv)) infoExRaw = rv as any;
        if (bytes) infoEx = decodeModelInfoEx(bytes);
      } catch {}

      // summaries
      let summary: ModelSummaryLike | null = null;
      try {
        const r = await devInspectGetModelsPage(0, 500, account?.address || DEFAULT_SENDER);
        console.log('[debug] models_page devInspect results?', r?.results?.length, r);
        const bytes = extractReturnBytes(r);
        console.log('[debug] models_page bytes?', !!bytes);
        if (bytes) {
          const vec = decodeModelsPage(bytes);
          summary = vec.find((s) => Number(s.id) === id) || null;
        }
      } catch {}

      // DF object for the model (direct lookup by ModelKey{id})
      let df: any = null;
      // En este deployment, los DFs cuelgan del MARKET_ID directamente
      const parentId = MARKET_ID;
      // Enumeración de DFs para diagnóstico
      let dfPageSummary: any = null;
      try {
        const keyType = `${PACKAGE_ID}::${MODULES.MARKETPLACE}::ModelKey`;
        // Clave directa: value = { id: String(id) }
        const byName = await client.getDynamicFieldObject({ parentId, name: { type: keyType, value: { id: String(id) } } } as any);
        df = byName;
      } catch (e) {
        // Fallback: enumerate and filter
        try {
          const all: any[] = [];
          let cursor: string | null = null;
          do {
            const page = await client.getDynamicFields({ parentId, limit: 50, cursor: cursor || undefined });
            all.push(...page.data);
            cursor = page.hasNextPage ? page.nextCursor : null;
          } while (cursor);
          dfPageSummary = {
            count: all.length,
            sample: all.slice(0, 10).map((x: any) => ({ name: x?.name, type: x?.name?.type, value: x?.name?.value }))
          };
          const found = all.find((x) => x?.name?.type?.toLowerCase() === `${PACKAGE_ID.toLowerCase()}::${MODULES.MARKETPLACE}::ModelKey`.toLowerCase() && String(x?.name?.value?.id ?? '') === String(id));
          if (found?.name) {
            const obj = await client.getDynamicFieldObject({ parentId, name: found.name });
            df = obj;
          }
          if (!df) {
            // Fallback 2: direct BCS key value (8-byte LE)
            const le8 = (() => {
              const b = new Uint8Array(8);
              let x = BigInt(id);
              for (let i = 0; i < 8; i++) { b[i] = Number(x & 0xffn); x >>= 8n; }
              return '0x' + Array.from(b).map((v) => v.toString(16).padStart(2, '0')).join('');
            })();
            const alt = await (client as any).getDynamicFieldObject({ parentId, name: { type: `${PACKAGE_ID}::${MODULES.MARKETPLACE}::ModelKey`, value: le8 } });
            df = alt;
          }
        } catch (e) {
          console.error('Error fetching dynamic field:', e);
        }
      }

      // Metadata (if any)
      let metadata: any = null;
      try {
        const uri: string | undefined = (df as any)?.data?.content?.fields?.value?.fields?.uri || (df as any)?.fields?.uri;
        if (uri && typeof uri === 'string') {
          const cid = uri.startsWith('ipfs://') ? uri.slice('ipfs://'.length) : uri;
          const url = `https://gateway.pinata.cloud/ipfs/${cid}`;
          const res = await fetch(url);
          if (res.ok) metadata = await res.json();
        }
      } catch {}

      // Network/IDs sanity checks
      let rpcUrl: string | null = null;
      let marketObject: any = null;
      let marketInfo: any = null;
      try { rpcUrl = (client as any).options?.url ?? null; } catch {}
      try {
        marketObject = await client.getObject({ id: MARKET_ID, options: { showType: true, showContent: true } });
      } catch (e) {
        marketObject = { error: String(e) };
      }
      try {
        const txMod = await import('@mysten/sui/transactions');
        const tx = new txMod.Transaction();
        tx.moveCall({ target: `${PACKAGE_ID}::${MODULES.MARKETPLACE}::${FUNCTIONS.GET_MARKET_INFO}`, arguments: [tx.object(MARKET_ID)] });
        const mi = await client.devInspectTransactionBlock({ transactionBlock: await tx.build({ client }), sender: account?.address || DEFAULT_SENDER });
        marketInfo = { results: (mi as any)?.results?.length ?? 0, bytes: !!extractReturnBytes(mi) };
      } catch (e) {
        marketInfo = { error: String(e) };
      }

      // Instrumentation: list and display a sample of Dynamic Fields under MARKET_ID
      let dfInstrumentation: any = null;
      try {
        const all: any[] = [];
        let cursor: string | null = null;
        do {
          const page = await client.getDynamicFields({ parentId, limit: 50, cursor: cursor || undefined });
          all.push(...page.data);
          cursor = page.hasNextPage ? page.nextCursor : null;
        } while (cursor);
        dfInstrumentation = {
          count: all.length,
          sample: all.slice(0, 10).map((x: any) => ({ name: x?.name, type: x?.name?.type, value: x?.name?.value })),
          candidateModels: all.filter((x: any) => x?.name?.type?.toLowerCase() === `${PACKAGE_ID.toLowerCase()}::${MODULES.MARKETPLACE}::ModelKey`.toLowerCase()).map((x: any) => ({ id: x?.name?.value?.id, name: x?.name }))
        };
      } catch (e) {
        dfInstrumentation = { error: String(e) };
      }

      return { id, summary, infoEx, infoExRaw, df, metadata, constants: { PACKAGE_ID, MARKET_ID, sender: account?.address || '(no wallet)', rpcUrl }, marketObject, marketInfo, dfPageSummary, dfInstrumentation };
    },
  });

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', py: 4 }}>
      <Container maxWidth="md">
        <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
          <Typography variant="h5" fontWeight={600}>Debug model #{id}</Typography>
          <Button size="small" onClick={() => refetch()} disabled={isFetching}>Refrescar</Button>
          {data?.df?.objectId && (
            <Button size="small" component="a" href={getObjectUrl('testnet', data.df.objectId)} target="_blank" rel="noreferrer">Ver objeto</Button>
          )}
        </Stack>
        <Typography variant="subtitle2" sx={{ mt: 2 }}>Summary (get_models_page)</Typography>
        <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{JSON.stringify(data?.summary, null, 2)}</pre>

        <Typography variant="subtitle2" sx={{ mt: 2 }}>InfoEx (get_model_info_ex)</Typography>
        <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{JSON.stringify(data?.infoEx, (k, v) => typeof v === 'bigint' ? v.toString() : v, 2)}</pre>

        <Typography variant="subtitle2" sx={{ mt: 2 }}>InfoEx raw returnValues (idx · type · decoded)</Typography>
        <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{
          (() => {
            const rows: string[] = [];
            const rv = (data as any)?.infoExRaw as Array<[number[], string]> | undefined;
            if (!rv || !rv.length) return 'null';
            const toHex = (arr: Uint8Array) => Array.from(arr).map((b) => b.toString(16).padStart(2, '0')).join('');
            const asU64 = (arr: Uint8Array) => {
              const dv = new DataView(arr.buffer, arr.byteOffset, Math.min(8, arr.byteLength));
              const lo = dv.getUint32(0, true);
              const hi = dv.getUint32(4, true);
              return (BigInt(hi) << 32n) + BigInt(lo);
            };
            const asU16 = (arr: Uint8Array) => new DataView(arr.buffer, arr.byteOffset, Math.min(2, arr.byteLength)).getUint16(0, true);
            for (let i = 0; i < rv.length; i++) {
              const pair = rv[i];
              const bytesArr = pair?.[0] as number[] | undefined;
              const typ = String(pair?.[1] ?? 'unknown');
              const bytes = bytesArr ? Uint8Array.from(bytesArr) : new Uint8Array();
              let val: string | bigint | boolean | number = `[raw ${bytes.length} bytes]`;
              if (typ === 'address') val = `0x${toHex(bytes)}`;
              else if (typ === 'u64') val = asU64(bytes);
              else if (typ === 'u16') val = asU16(bytes);
              else if (typ === 'u8') val = bytes[0] ?? 0;
              else if (typ === 'bool') val = (bytes[0] ?? 0) === 1;
              else if (typ === 'vector<u8>') val = `0x${toHex(bytes).slice(0, 12)}…${toHex(bytes).slice(-12)}`;
              rows.push(`${i.toString().padStart(2, ' ')}. ${typ} => ${typeof val === 'bigint' ? val.toString() : String(val)}`);
            }
            return rows.join('\n');
          })()
        }</pre>

        <Typography variant="subtitle2" sx={{ mt: 2 }}>Dynamic Field (Model)</Typography>
        <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{JSON.stringify(data?.df, null, 2)}</pre>

        <Typography variant="subtitle2" sx={{ mt: 2 }}>Dynamic Fields (page summary)</Typography>
        <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{JSON.stringify((data as any)?.dfPageSummary, null, 2)}</pre>

        <Typography variant="subtitle2" sx={{ mt: 2 }}>DF Instrumentation</Typography>
        <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{JSON.stringify((data as any)?.dfInstrumentation, null, 2)}</pre>

        <Typography variant="subtitle2" sx={{ mt: 2 }}>Metadata (IPFS)</Typography>
        <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{JSON.stringify(data?.metadata, null, 2)}</pre>

        <Typography variant="subtitle2" sx={{ mt: 2 }}>Constants / Context</Typography>
        <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{JSON.stringify(data?.constants, null, 2)}</pre>

        <Typography variant="subtitle2" sx={{ mt: 2 }}>Market object (getObject)</Typography>
        <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{JSON.stringify(data?.marketObject, null, 2)}</pre>

        <Typography variant="subtitle2" sx={{ mt: 2 }}>get_market_info (devInspect)</Typography>
        <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{JSON.stringify(data?.marketInfo, null, 2)}</pre>
      </Container>
    </Box>
  );
}
