"use client";

import React, { Suspense } from 'react';
import Link from 'next/link';
import { Box, Container, Typography, Grid, Card, CardContent, Button, Stack, Skeleton, Snackbar, Alert, Tooltip, Chip, Select, MenuItem, Checkbox, FormControlLabel, TextField, Divider } from '@mui/material';
import { useInfiniteQuery } from '@tanstack/react-query';
import { getSuiClient, devInspectGetModelInfoEx, buildBuyLicenseTx } from '@/lib/sui';
import { MARKET_ID, OBJECT_TYPES, PACKAGE_ID, MODULES, FUNCTIONS } from '@/lib/sui/constants';
import { env } from '@/config/env';
import { decodeModelInfoEx } from '@/lib/sui/parsers';
import { truncateAddress } from '@/lib/sui/parsers';
import { useCurrentAccount, useSignAndExecuteTransaction } from '@mysten/dapp-kit';
import { getTransactionUrl, getObjectUrl } from '@/lib/sui/constants';
import { getModelsService } from '@/domain/models';
import type { ChainKind } from '@/domain/models/types';
import { useSearchParams, useRouter } from 'next/navigation';

type ModelCard = {
  objectId: string;
  modelId?: number;
  slug?: string;
  name?: string;
  description?: string;
  price_perpetual?: number;
  price_subscription?: number;
  listed?: boolean;
  uri?: string;
  imageUrl?: string;
  hydrateError?: boolean;
  creator?: string;
  owner?: string;
  hydratedInfoEx?: boolean;
  royalty_bps?: number;
  default_duration_days?: number;
  delivery_rights_default?: number;
  version?: number;
  terms_hash?: Uint8Array;
};

function toNumberLike(v: any): number | undefined {
  const tryParse = (x: any): number | undefined => {
    if (typeof x === 'number' && Number.isFinite(x)) return x;
    if (typeof x === 'bigint') return Number(x);
    if (typeof x === 'string') {
      const m = x.match(/^\d+$/);
      if (m) return Number.parseInt(x, 10);
    }
    if (x && typeof x === 'object') {
      if ('value' in x) return tryParse((x as any).value);
      if ('id' in x) return tryParse((x as any).id);
      if ('fields' in x) {
        const f: any = (x as any).fields;
        return tryParse(f?.value ?? f?.id ?? f);
      }
    }
    return undefined;
  };
  return tryParse(v);
}

export default function ModelsPage() {
  return (
    <Suspense fallback={
      <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', py: 6 }}>
        <Container maxWidth="lg">
          <Typography variant="h4" fontWeight="bold" sx={{ mb: 2 }}>Modelos</Typography>
          <Grid container spacing={2}>
            {Array.from({ length: 12 }).map((_, i) => (
              <Grid item xs={12} md={6} key={i}>
                <Card>
                  <CardContent>
                    <Skeleton width="60%" height={28} />
                    <Skeleton width="90%" height={20} />
                    <Skeleton width="50%" height={18} />
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>
    }>
      <ModelsPageInner />
    </Suspense>
  );
}

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

const DEFAULT_SENDER = '0x0000000000000000000000000000000000000000000000000000000000000001';

async function devInspectGetModelInfoExBySlug(slug: string) {
  const client = getSuiClient();
  const tx = new (await import('@mysten/sui/transactions')).Transaction();
  tx.moveCall({
    target: `${PACKAGE_ID}::${MODULES.MARKETPLACE}::${FUNCTIONS.GET_MODEL_INFO_EX}`,
    arguments: [tx.object(MARKET_ID), tx.pure.string(slug)],
  });
  const res = await client.devInspectTransactionBlock({ transactionBlock: await tx.build({ client }), sender: DEFAULT_SENDER });
  return res;
}

async function devInspectInfoExWithRetry(id: number, slug?: string, attempts = 3): Promise<Uint8Array | null> {
  let lastErr: any;
  for (let i = 0; i < attempts; i++) {
    try {
      const r = await devInspectGetModelInfoEx(id, DEFAULT_SENDER);
      const bytes = extractReturnBytes(r);
      if (bytes) return bytes;
      if (slug) {
        const r2 = await devInspectGetModelInfoExBySlug(slug);
        const bytes2 = extractReturnBytes(r2);
        if (bytes2) return bytes2;
      }
      return bytes;
    } catch (e) {
      lastErr = e;
      await new Promise((res) => setTimeout(res, 500 * (i + 1)));
    }
  }
  console.error('[models] devInspect falló', { modelId: id, slug, error: String(lastErr) });
  return null;
}

function formatSuiFromMist(mist?: number): string {
  if (!mist || !Number.isFinite(mist)) return '—';
  const sui = mist / 1_000_000_000;
  return `${sui.toFixed(2)} SUI`;
}

function bpsToPct(bps?: number): string {
  if (typeof bps !== 'number') return '—';
  return `${(bps / 100).toFixed(2)}%`;
}

function rightsLabel(bitmask?: number): string {
  if (!bitmask) return '—';
  if (bitmask === 3) return 'API + Descarga';
  if (bitmask === 2) return 'Descarga';
  if (bitmask === 1) return 'API';
  return '—';
}

function hexPreview(bytes?: Uint8Array): string {
  if (!bytes || bytes.length === 0) return '—';
  const hex = Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
  if (hex.length <= 12) return `0x${hex}`;
  return `0x${hex.slice(0, 6)}…${hex.slice(-6)}`;
}

// Simple in-memory cache for get_model_info_ex
const infoExCache = new Map<number, ReturnType<typeof decodeModelInfoEx>>();

// ===== get_models_page: devInspect + decoder =====
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
  // length ULEB128
  const { v: len, n: n1 } = readULEB128(bytes, o); o = n1;
  const out: ModelSummaryLike[] = [];
  for (let i = 0; i < len; i++) {
    const start = o;
    // fixed 75 bytes per item
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
      id: Number(idV.v),
      owner,
      listed,
      price_direct: pd.v,
      price_perpetual: pp.v,
      price_subscription: ps.v,
      default_duration_days: dd.v,
      version: ver.v,
    });
    // safety if layout changes
    const consumed = o - start;
    if (consumed !== 75) {
      // attempt to realign if needed
      // but for now, continue
    }
  }
  return out;
}

async function devInspectGetModelsPage(start: number, limit: number) {
  const client = getSuiClient();
  const txMod = await import('@mysten/sui/transactions');
  const tx = new txMod.Transaction();
  tx.moveCall({
    target: `${PACKAGE_ID}::${MODULES.MARKETPLACE}::${FUNCTIONS.GET_MODELS_PAGE}`,
    arguments: [tx.object(MARKET_ID), tx.pure.u64(start), tx.pure.u64(limit)],
  });
  const res = await client.devInspectTransactionBlock({ transactionBlock: await tx.build({ client }), sender: '0x0000000000000000000000000000000000000000000000000000000000000001' });
  return res;
}

// Hydratar por DF directo usando ModelKey { id: u64 }
async function fetchModelDFById(id: number) {
  const client = getSuiClient();
  const keyType = `${PACKAGE_ID}::${MODULES.MARKETPLACE}::ModelKey`;
  try {
    const obj: any = await (client as any).getDynamicFieldObject({
      parentId: MARKET_ID,
      name: {
        type: keyType,
        value: { type: keyType, fields: { id: String(id) } },
      },
    });
    const dataAny: any = obj?.data;
    const ff: any = dataAny?.content?.fields?.value?.fields;
    if (ff) return { objectId: dataAny?.objectId as string, fields: ff };
  } catch {}
  return null;
}

// Concurrency limiter
async function mapLimit<T, R>(arr: T[], limit: number, fn: (t: T) => Promise<R>): Promise<R[]> {
  const ret: R[] = new Array(arr.length) as any;
  let i = 0;
  const runners: Promise<void>[] = [];
  const run = async (idx: number) => {
    try { ret[idx] = await fn(arr[idx]); } catch { /* ignore */ }
  };
  while (i < arr.length) {
    while (runners.length < limit && i < arr.length) {
      const idx = i++;
      const p = run(idx).finally(() => { const k = runners.indexOf(p as any); if (k >= 0) runners.splice(k, 1); });
      runners.push(p as any);
    }
    if (runners.length >= limit) await Promise.race(runners);
  }
  await Promise.all(runners);
  return ret;
}

function useModelsInfinite(pageSize: number, order: string, listedOnly: boolean, q: string) {
  return useInfiniteQuery<ModelCard[], Error, ModelCard[], (string | number)[], number>({
    queryKey: ['models-v2', MARKET_ID, pageSize, order, listedOnly ? 1 : 0, q],
    initialPageParam: 0,
    getNextPageParam: (lastPage, _allPages, lastPageParam) =>
      (Array.isArray(lastPage) && lastPage.length === pageSize ? lastPageParam + pageSize : undefined),
    queryFn: async ({ pageParam }) => {
      const start = Number(pageParam || 0);
      const params = new URLSearchParams();
      params.set('start', String(start));
      params.set('limit', String(pageSize));
      if (order) params.set('order', order);
      if (listedOnly) params.set('listed', '1');
      if (q) params.set('q', q);
      const res = await fetch(`/api/models-page?${params.toString()}`, { cache: 'no-store' });
      if (!res.ok) throw new Error('models api error');
      const json = await res.json();
      const arr = Array.isArray(json?.data) ? json.data : [];
      const seen = new Set<number>();
      const list: ModelCard[] = [];
      for (const x of arr) {
        const idNum = Number((x as any)?.id);
        if (!Number.isFinite(idNum) || seen.has(idNum)) continue;
        seen.add(idNum);
        list.push({
          objectId: `model-${idNum}`,
          modelId: idNum,
          name: (x as any)?.name,
          description: (x as any)?.description,
          price_perpetual: (x as any)?.price_perpetual,
          price_subscription: (x as any)?.price_subscription,
          listed: (x as any)?.listed,
          uri: (x as any)?.uri,
          owner: (x as any)?.owner,
          version: (x as any)?.version,
        });
      }
      const gateway = env.NEXT_PUBLIC_PINATA_GATEWAY || 'https://gateway.pinata.cloud';
      const withImages = await mapLimit(list, 6, async (m) => {
        try {
          if (!m.uri || typeof m.uri !== 'string') return m;
          if (m.uri.includes('.enc')) return m;
          const cid = m.uri.startsWith('ipfs://') ? m.uri.slice('ipfs://'.length) : m.uri;
          const url = `${gateway}/ipfs/${cid}`;
          const r = await fetch(url, { cache: 'force-cache' });
          if (!r.ok) return m;
          const meta = await r.json();
          const img = meta?.image || meta?.image_url || meta?.thumbnail;
          if (!img || typeof img !== 'string') return m;
          const imgUrl = img.startsWith('http') ? img : `${gateway}/ipfs/${(img as string).replace('ipfs://', '')}`;
          return { ...m, imageUrl: imgUrl } as ModelCard;
        } catch { return m; }
      });
      withImages.sort((a, b) => {
        const la = Boolean(a.listed), lb = Boolean(b.listed);
        if (la !== lb) return la ? -1 : 1;
        const pa = Number(a.price_perpetual || 0);
        const pb = Number(b.price_perpetual || 0);
        return pb - pa;
      });
      return withImages;
    },
    staleTime: 30_000,
    gcTime: 5 * 60_000,
  });
}

function ModelsPageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [order, setOrder] = React.useState<'featured' | 'price_desc' | 'price_asc' | 'version_desc' | 'recent_desc' | 'recent_asc'>('featured');
  const [listedOnly, setListedOnly] = React.useState(false);
  const [q, setQ] = React.useState('');
  const [qDebounced, setQDebounced] = React.useState('');
  const pageSize = 12;
  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useModelsInfinite(pageSize, order, listedOnly, qDebounced);
  const flat = React.useMemo<ModelCard[]>(() => {
    const pages = (data as any)?.pages as ModelCard[][] | undefined;
    return Array.isArray(pages) ? pages.flat() : [];
  }, [data]);
  const filtered = flat;

  const account = useCurrentAccount();
  const { mutateAsync: signAndExecute, status } = useSignAndExecuteTransaction();
  const [snack, setSnack] = React.useState<{ open: boolean; msg: string; severity: 'success' | 'error' } | null>(null);
  const [monthsMap, setMonthsMap] = React.useState<Record<number, number>>({});

  const didInit = React.useRef(false);
  React.useEffect(() => {
    if (didInit.current) return;
    const qpOrder = (searchParams.get('order') as any) || undefined;
    const qpListed = searchParams.get('listed');
    const qpQ = searchParams.get('q') || '';
    if (qpOrder && ['featured','price_desc','price_asc','version_desc','recent_desc','recent_asc'].includes(qpOrder)) setOrder(qpOrder);
    if (qpListed === '1' || qpListed === 'true') setListedOnly(true);
    if (qpQ) setQ(qpQ);
    didInit.current = true;
  }, [searchParams]);

  React.useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('order', order);
    if (listedOnly) params.set('listed', '1'); else params.delete('listed');
    if (q) params.set('q', q); else params.delete('q');
    router.replace(`?${params.toString()}`);
  }, [order, listedOnly]);

  // Debounce búsqueda
  React.useEffect(() => {
    const t = setTimeout(() => setQDebounced(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);

  // Auto-carga: IntersectionObserver
  const loadMoreRef = React.useRef<HTMLDivElement | null>(null);
  React.useEffect(() => {
    const el = loadMoreRef.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      }
    }, { rootMargin: '400px 0px' });
    io.observe(el);
    return () => io.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', py: 6 }}>
      <Container maxWidth="lg">
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }} alignItems={{ xs: 'flex-start', sm: 'center' }} justifyContent="space-between">
          <Typography variant="h4" fontWeight="bold">Modelos</Typography>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} alignItems={{ md: 'center' }} sx={{ width: '100%' }}>
            <TextField size="small" placeholder="Buscar modelos…" value={q} onChange={(e) => setQ(e.target.value)} sx={{ minWidth: { xs: '100%', md: 280 } }} />
            <FormControlLabel control={<Checkbox size="small" checked={listedOnly} onChange={(e) => { setListedOnly(e.target.checked); }} />} label={<Typography variant="body2" color="text.secondary">Solo listados</Typography>} />
            <Typography variant="body2" color="text.secondary">Ordenar por</Typography>
            <Select size="small" value={order} onChange={(e) => { setOrder(e.target.value as any); }}>
              <MenuItem value="featured">Destacados</MenuItem>
              <MenuItem value="price_desc">Precio (alto a bajo)</MenuItem>
              <MenuItem value="price_asc">Precio (bajo a alto)</MenuItem>
              <MenuItem value="version_desc">Versión (alto a bajo)</MenuItem>
              <MenuItem value="recent_desc">Recientes</MenuItem>
              <MenuItem value="recent_asc">Antiguos</MenuItem>
            </Select>
          </Stack>
        </Stack>
        {isLoading ? (
          <Grid container spacing={2}>
            {Array.from({ length: pageSize }).map((_, i) => (
              <Grid item xs={12} md={6} key={i}>
                <Card>
                  <CardContent>
                    <Skeleton width="60%" height={28} />
                    <Skeleton width="90%" height={20} />
                    <Skeleton width="50%" height={18} />
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        ) : (
          <Grid container spacing={2}>
            {filtered.map((m) => (
              <Grid item xs={12} md={4} key={m.modelId ?? m.objectId}>
                <Card>
                  <CardContent>
                    <Box sx={{ mb: 1, borderRadius: 1, overflow: 'hidden', height: 140, bgcolor: 'background.paper', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {m.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={m.imageUrl} alt={m.name || 'model'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <Typography variant="h5" color="text.disabled">{(m.name || 'Modelo').slice(0, 1).toUpperCase()}</Typography>
                      )}
                    </Box>
                    <Typography variant="h6" fontWeight="bold">
                      {m.name || `Objeto ${m.objectId.slice(0, 8)}...`}
                    </Typography>
                    <Stack direction="row" spacing={1} sx={{ mt: 0.5, mb: 1 }}>
                      <Chip size="small" label={m.listed ? 'Listado' : 'No listado'} color={m.listed ? 'success' : 'default'} />
                      {typeof m.version === 'number' && m.version > 0 && (
                        <Chip size="small" label={`v${m.version}`} variant="outlined" />
                      )}
                      {typeof m.uri === 'string' && m.uri.includes('.enc') && (
                        <Chip size="small" label="Encriptado" color="warning" variant="outlined" />
                      )}
                    </Stack>
                    {m.owner && (
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                        Vendedor: {truncateAddress(m.owner)}
                      </Typography>
                    )}
                    {m.description && (
                      <Typography color="text.secondary" sx={{ mb: 1 }}>
                        {m.description}
                      </Typography>
                    )}
                    <Typography color="text.secondary" sx={{ mb: 1 }}>
                      {`Perpetua: ${((m.price_perpetual ?? 0) / 1_000_000_000).toLocaleString('es-MX', { maximumFractionDigits: 4 })} SUI`} {typeof m.price_subscription === 'number' ? `· Sub: ${((m.price_subscription ?? 0) / 1_000_000_000).toLocaleString('es-MX', { maximumFractionDigits: 4 })} SUI/mes` : ''}
                    </Typography>
                    <Divider sx={{ my: 1 }} />
                    <Stack spacing={1.25}>
                      <Stack direction="row" spacing={1} alignItems="center">
                        {m.objectId?.startsWith('0x') && (
                          <Button size="small" component={Link} href={getObjectUrl('testnet', m.objectId)} target="_blank" rel="noreferrer">
                            Ver en explorer
                          </Button>
                        )}
                        <Button size="small" component={Link} href={`/models/${m.modelId ?? ''}`} disabled={typeof m.modelId !== 'number'}>
                          Ver detalle
                        </Button>
                      </Stack>
                      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'center' }}>
                        <Tooltip
                          title={
                            (!m.hydratedInfoEx && (!m.price_perpetual || typeof m.listed === 'undefined')) ? 'Hidratando info on-chain…' :
                            !account ? 'Conecta tu wallet' :
                            status === 'pending' ? 'Esperando confirmación' :
                            typeof m.modelId !== 'number' ? 'ModelId no disponible' :
                            !m.listed ? 'Modelo no listado' :
                            !m.price_perpetual ? 'Precio perpetua no disponible' :
                            (!!m.creator && account?.address?.toLowerCase() === m.creator.toLowerCase()) ? 'No disponible para el creador' :
                            (!!m.owner && account?.address?.toLowerCase() === m.owner.toLowerCase()) ? 'No disponible para el vendedor' :
                            `Perpetua • ${((m.price_perpetual || 0)/1_000_000_000).toLocaleString('es-MX', { maximumFractionDigits: 4 })} SUI`
                          }
                        >
                          <span>
                            <Button
                              size="small"
                              variant="contained"
                              disabled={
                                (!m.hydratedInfoEx && (!m.price_perpetual || typeof m.listed === 'undefined')) ||
                                !account ||
                                status === 'pending' ||
                                !m.listed ||
                                !m.price_perpetual ||
                                typeof m.modelId !== 'number' ||
                                (!!m.creator && account?.address?.toLowerCase() === m.creator.toLowerCase()) ||
                                (!!m.owner && account?.address?.toLowerCase() === m.owner.toLowerCase())
                              }
                              onClick={async () => {
                                try {
                                  if (typeof m.modelId !== 'number' || !m.price_perpetual) {
                                    setSnack({ open: true, msg: 'Datos insuficientes para comprar (modelId/precio)', severity: 'error' });
                                    return;
                                  }
                                  if (!!m.creator && account?.address?.toLowerCase() === m.creator.toLowerCase()) {
                                    setSnack({ open: true, msg: 'El creador no puede comprar su propio modelo', severity: 'error' });
                                    return;
                                  }
                                  if (!!m.owner && account?.address?.toLowerCase() === m.owner.toLowerCase()) {
                                    setSnack({ open: true, msg: 'El vendedor no puede comprar su propio modelo', severity: 'error' });
                                    return;
                                  }
                                  const amount = BigInt(Math.floor(Number(m.price_perpetual)));
                                  const tx = buildBuyLicenseTx({ modelId: m.modelId, kind: 0, months: 0, transferable: true, amountInMist: amount });
                                  const res: any = await signAndExecute({ transaction: tx });
                                  const digest = res?.digest;
                                  const url = digest ? getTransactionUrl('testnet', digest) : '';
                                  setSnack({ open: true, msg: `Compra exitosa${url ? ` · ${url}` : ''}`, severity: 'success' });
                                } catch (e: any) {
                                  setSnack({ open: true, msg: `Error al comprar: ${String(e?.message || e)}`, severity: 'error' });
                                }
                              }}
                            >
                              Perpetua
                            </Button>
                          </span>
                        </Tooltip>
                      </Stack>
                      {m.price_subscription ? (
                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'center' }}>
                          <Select
                            size="small"
                            value={monthsMap[m.modelId!] || 1}
                            onChange={(e) => setMonthsMap((prev) => ({ ...prev, [m.modelId!]: Number(e.target.value) }))}
                            disabled={!m.price_subscription}
                            sx={{ width: { xs: '100%', sm: 110 } }}
                          >
                            {Array.from({ length: 12 }, (_, i) => i + 1).map((mm) => (
                              <MenuItem key={mm} value={mm}>{mm} mes{mm>1?'es':''}</MenuItem>
                            ))}
                          </Select>
                          <Tooltip
                            title={
                              (!m.hydratedInfoEx && (typeof m.listed === 'undefined')) ? 'Hidratando info on-chain…' :
                              !account ? 'Conecta tu wallet' :
                              status === 'pending' ? 'Esperando confirmación' :
                              typeof m.modelId !== 'number' ? 'ModelId no disponible' :
                              !m.listed ? 'Modelo no listado' :
                              !m.price_subscription ? 'Suscripción no disponible' :
                              `Total: ${(((m.price_subscription || 0) * (monthsMap[m.modelId!]||1))/1_000_000_000).toLocaleString('es-MX', { maximumFractionDigits: 4 })} SUI`
                            }
                          >
                            <span>
                              <Button
                                size="small"
                                variant="outlined"
                                disabled={
                                  (!m.hydratedInfoEx && (typeof m.listed === 'undefined')) ||
                                  !account ||
                                  status === 'pending' ||
                                  !m.listed ||
                                  !m.price_subscription ||
                                  typeof m.modelId !== 'number' ||
                                  (!!m.creator && account?.address?.toLowerCase() === m.creator.toLowerCase()) ||
                                  (!!m.owner && account?.address?.toLowerCase() === m.owner.toLowerCase())
                                }
                                onClick={async () => {
                                  try {
                                    if (typeof m.modelId !== 'number' || !m.price_subscription) {
                                      setSnack({ open: true, msg: 'Datos insuficientes para comprar (modelId/precio sub)', severity: 'error' });
                                      return;
                                    }
                                    const months = Math.max(1, Number(monthsMap[m.modelId!] || 1));
                                    const amount = BigInt(Math.floor(Number(m.price_subscription) * months));
                                    const tx = buildBuyLicenseTx({ modelId: m.modelId, kind: 1, months, transferable: false, amountInMist: amount });
                                    const res: any = await signAndExecute({ transaction: tx });
                                    const digest = res?.digest;
                                    const url = digest ? getTransactionUrl('testnet', digest) : '';
                                    setSnack({ open: true, msg: `Compra de suscripción exitosa${url ? ` · ${url}` : ''}`, severity: 'success' });
                                  } catch (e: any) {
                                    setSnack({ open: true, msg: `Error al comprar suscripción: ${String(e?.message || e)}`, severity: 'error' });
                                  }
                                }}
                              >
                                Suscripción
                              </Button>
                            </span>
                          </Tooltip>
                        </Stack>
                      ) : null}
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
        <Box ref={loadMoreRef} />
        <Stack direction="row" spacing={2} sx={{ mt: 3 }}>
          <Button disabled={!hasNextPage || isFetchingNextPage} onClick={() => fetchNextPage()}>
            {isFetchingNextPage ? 'Cargando…' : hasNextPage ? 'Cargar más' : 'No hay más'}
          </Button>
        </Stack>
        <Snackbar open={!!snack?.open} autoHideDuration={6000} onClose={() => setSnack(null)}>
          <Alert onClose={() => setSnack(null)} severity={snack?.severity || 'success'} sx={{ width: '100%' }}>
            {snack?.msg}
          </Alert>
        </Snackbar>
      </Container>
    </Box>
  );
}
