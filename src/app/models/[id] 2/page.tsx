'use client';

import React, { useMemo } from 'react';
import { useParams } from 'next/navigation';
import { Box, Container, Typography, Stack, Button, Tooltip, Chip, Grid, Card, CardContent, Divider, IconButton, CardMedia, Alert, TextField, MenuItem } from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import { useCurrentAccount, useSignAndExecuteTransaction } from '@mysten/dapp-kit';
import { buildBuyLicenseTx } from '@/lib/sui';
import { useQuery } from '@tanstack/react-query';
import { getSuiClient, devInspectGetModelInfoEx } from '@/lib/sui';
import { MARKET_ID, PACKAGE_ID, MODULES, FUNCTIONS } from '@/lib/sui/constants';
import { env } from '@/config/env';
import { decodeModelInfoEx, type ModelInfoEx } from '@/lib/sui/parsers';
import { decryptAESGCM, fromBase64, importRawKey } from '@/lib/crypto';

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
      id: Number(idV.v),
      owner,
      listed,
      price_direct: pd.v,
      price_perpetual: pp.v,
      price_subscription: ps.v,
      default_duration_days: dd.v,
      version: ver.v,
    });
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
  const res = await client.devInspectTransactionBlock({ transactionBlock: await tx.build({ client }), sender: MARKET_ID });
  return res;
}

export default function ModelDetailPage() {
  const params = useParams<{ id: string }>();
  const id = Number(params?.id ?? 0);
  const account = useCurrentAccount();
  const { mutateAsync: signAndExecute, status } = useSignAndExecuteTransaction();

  const gateway = env.NEXT_PUBLIC_PINATA_GATEWAY || 'https://gateway.pinata.cloud';

  const { data: model } = useQuery({
    queryKey: ['model-detail-v2', id],
    enabled: Number.isFinite(id) && id >= 0,
    queryFn: async () => {
      const res = await fetch(`/api/model-info?id=${id}`, { cache: 'no-store' });
      if (!res.ok) throw new Error('model-info api error');
      const json = await res.json();
      return json?.data || null;
    },
  });

  const { data: metadata } = useQuery({
    queryKey: ['model-metadata', model?.uri],
    enabled: !!model?.uri,
    queryFn: async () => {
      const uri: string = model!.uri as string; // e.g. ipfs://CID
      const cid = uri.startsWith('ipfs://') ? uri.slice('ipfs://'.length) : uri;
      const url = `${gateway}/ipfs/${cid}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('No se pudo obtener metadata IPFS');
      return res.json();
    },
  });

  const viewName = useMemo(() => {
    const f: any = model;
    if (metadata?.name) return String(metadata.name);
    if (typeof f?.name === 'string') return f.name;
    if (typeof f?.slug === 'string') return f.slug;
    return `Modelo #${id}`;
  }, [metadata?.name, model, id]);

  const pricePerpMist = useMemo(() => {
    const fromApi = Number((model as any)?.price_perpetual ?? 0);
    const fromMeta = Number(metadata?.price_perpetual ?? 0);
    return fromApi || fromMeta || 0;
  }, [model, metadata]);
  const priceSubMist = useMemo(() => {
    const fromApi = Number((model as any)?.price_subscription ?? 0);
    const fromMeta = Number(metadata?.price_subscription ?? 0);
    return fromApi || fromMeta || 0;
  }, [model, metadata]);

  const fmt = (n: number) => new Intl.NumberFormat('es-MX').format(Math.max(0, Math.floor(Number(n || 0))));
  const fmtSui = (mist: number) => {
    const sui = Number(mist || 0) / 1_000_000_000;
    return new Intl.NumberFormat('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 4 }).format(sui);
  };
  const shortAddr = (a?: string) => (a && a.length > 12 ? `${a.slice(0, 6)}…${a.slice(-4)}` : a || '');
  const [showFullCreator, setShowFullCreator] = React.useState(false);
  const [showFullOwner, setShowFullOwner] = React.useState(false);

  const listed = useMemo(() => {
    return Boolean((model as any)?.listed ?? true);
  }, [model]);

  const isCreator = useMemo(() => {
    const creator = (model as any)?.creator;
    const addr = account?.address;
    if (!creator || !addr) return false;
    return addr.toLowerCase() === creator.toLowerCase();
  }, [model, account?.address]);

  const isSeller = useMemo(() => {
    const owner = (model as any)?.owner;
    const addr = account?.address;
    if (!owner || !addr) return false;
    return addr.toLowerCase() === owner.toLowerCase();
  }, [model, account?.address]);

  async function buyPerpetual() {
    if (isCreator) throw new Error('El creador no puede comprar su propio modelo');
    if (isSeller) throw new Error('El vendedor no puede comprar su propio modelo');
    const tx = buildBuyLicenseTx({
      modelId: id,
      kind: 0,
      months: 0,
      transferable: true,
      amountInMist: BigInt(pricePerpMist || 0),
    });
    await signAndExecute({ transaction: tx });
  }

  const [monthsSel, setMonthsSel] = React.useState<number>(1);
  React.useEffect(() => {
    // Derivar meses por defecto desde default_duration_days si existe
    const ddays = Number((model as any)?.default_duration_days ?? metadata?.default_duration_days ?? 0);
    const m = Math.max(1, Math.round(ddays / 30));
    if (m && Number.isFinite(m)) setMonthsSel(m);
  }, [model, metadata]);

  async function buySubscription() {
    if (isCreator) throw new Error('El creador no puede comprar su propio modelo');
    if (isSeller) throw new Error('El vendedor no puede comprar su propio modelo');
    if (!priceSubMist) throw new Error('Precio de suscripción no disponible');
    const months = Math.max(1, Number(monthsSel || 1));
    const tx = buildBuyLicenseTx({
      modelId: id,
      kind: 1,
      months,
      transferable: false,
      amountInMist: BigInt((priceSubMist || 0) * months),
    });
    await signAndExecute({ transaction: tx });
  }

  const imgUrl = useMemo(() => {
    const u = (metadata as any)?.image || (metadata as any)?.image_url || (metadata as any)?.thumbnail || '';
    if (!u || typeof u !== 'string') return '';
    if (u.startsWith('http')) return u;
    const raw = u.startsWith('ipfs://') ? u.slice('ipfs://'.length) : u;
    return `${gateway}/ipfs/${raw}`;
  }, [metadata, gateway]);

  const encryptedUri = useMemo(() => {
    const m: any = metadata || {};
    const e = m?.encrypted_uri || '';
    if (typeof e === 'string' && e) return e;
    const u = (model as any)?.uri;
    if (typeof u === 'string' && u.includes('.enc')) return u;
    return '';
  }, [metadata, model]);

  const modelSlug = useMemo(() => {
    const m: any = metadata || {};
    return m?.slug || (model as any)?.slug || '';
  }, [metadata, model]);

  const modelOwner = useMemo(() => {
    const m: any = metadata || {};
    return (model as any)?.creator || m?.owner || '';
  }, [metadata, model]);

  const { data: decryptedPreview, error: decryptError } = useQuery({
    queryKey: ['model-decrypt', id, encryptedUri, account?.address, modelSlug],
    enabled: !!encryptedUri && !!account?.address,
    queryFn: async () => {
      const addr = account!.address as string;
      const uri = String(encryptedUri);
      const slugParam = modelSlug ? `&slug=${encodeURIComponent(String(modelSlug))}` : '';
      const url = `/api/protected/fetch?modelId=${id}&addr=${encodeURIComponent(addr)}&uri=${encodeURIComponent(uri)}${slugParam}`;
      let res: Response | null = null;
      const maxRetries = Number(env.NEXT_PUBLIC_PROTECTED_FETCH_RETRIES || 3);
      const delayMs = Number(env.NEXT_PUBLIC_PROTECTED_FETCH_RETRY_DELAY_MS || 1000);
      for (let i = 0; i < maxRetries; i++) {
        res = await fetch(url, { cache: 'no-store' });
        if (res.ok) break;
        if (res.status === 404) {
          await new Promise((r) => setTimeout(r, delayMs));
          continue;
        }
        if (res.status === 403) throw new Error('no-license');
        throw new Error('fetch-failed');
      }
      if (!res || !res.ok) throw new Error('fetch-failed');
      const mimeHeader = res.headers.get('content-type') || 'application/octet-stream';
      const buf = await res.arrayBuffer();
      const b = new Uint8Array(buf);
      const sig = (...xs: number[]) => xs.every((v, i) => b[i] === v);
      const has = (str: string) => {
        const arr = Array.from(str).map((c) => c.charCodeAt(0));
        for (let i = 0; i + arr.length <= Math.min(b.length, 16); i++) {
          if (arr.every((v, j) => b[i + j] === v)) return true;
        }
        return false;
      };
      let kind: 'image' | 'video' | 'pdf' | 'text' | 'binary' = 'binary';
      let mime = mimeHeader;
      if (mime === 'application/octet-stream') {
        if (sig(0x89, 0x50, 0x4e, 0x47)) { mime = 'image/png'; kind = 'image'; }
        else if (sig(0xff, 0xd8, 0xff)) { mime = 'image/jpeg'; kind = 'image'; }
        else if (has('GIF8')) { mime = 'image/gif'; kind = 'image'; }
        else if (has('ftyp')) { mime = 'video/mp4'; kind = 'video'; }
        else if (sig(0x25, 0x50, 0x44, 0x46)) { mime = 'application/pdf'; kind = 'pdf'; }
        else if (sig(0x50, 0x4b, 0x03, 0x04)) { mime = 'application/zip'; kind = 'binary'; }
      } else {
        if (mime.includes('image')) kind = 'image';
        else if (mime.includes('video')) kind = 'video';
        else if (mime.includes('pdf')) kind = 'pdf';
      }
      if (kind === 'binary') {
        try {
          const text = new TextDecoder().decode(b);
          return { kind: 'text', text: text.slice(0, 400), bytes: b.byteLength };
        } catch {}
      }
      const ab = b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer;
      const blob = new Blob([ab], { type: mime });
      const objUrl = URL.createObjectURL(blob);
      return { kind, url: objUrl, mime, bytes: b.byteLength };
    },
    retry: 0,
  });

  const tags = useMemo(() => {
    const t = (metadata as any)?.tags ?? (metadata as any)?.keywords;
    if (!t) return [] as string[];
    if (Array.isArray(t)) return t.map((x) => String(x)).filter(Boolean);
    return String(t).split(',').map((s) => s.trim()).filter(Boolean);
  }, [metadata]);

  const links = useMemo(() => {
    const m: any = metadata || {};
    const entries: Array<{ label: string; url: string }> = [];
    const push = (label: string, url: any) => { if (url && typeof url === 'string') entries.push({ label, url }); };
    push('Sitio', m.website || m.homepage || m.url || m.external_url);
    push('Repositorio', m.repository || m.repo);
    push('Docs', m.docs || m.documentation);
    push('Paper', m.paper || m.whitepaper);
    push('Twitter/X', m.twitter || m.x);
    push('Discord', m.discord);
    return entries;
  }, [metadata]);

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', py: 6 }}>
      <Container maxWidth="lg">
        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <Card>
              <CardContent>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                  <Typography variant="h4" fontWeight="bold">{viewName}</Typography>
                </Stack>
                <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                  <Chip size="small" label={listed ? 'Listado' : 'No listado'} color={listed ? 'success' : 'default'} />
                  {typeof (model as any)?.version === 'number' && (
                    <Chip size="small" label={`v${(model as any)?.version}`} variant="outlined" />
                  )}
                  {encryptedUri && (
                    <Chip size="small" label="Protegido" color="warning" variant="outlined" />
                  )}
                </Stack>
                {imgUrl && (
                  <CardMedia sx={{ borderRadius: 1, mb: 2 }} component="img" height="220" image={imgUrl} alt={viewName} />
                )}
                {metadata?.description && (
                  <Typography color="text.secondary" sx={{ mb: 2 }}>
                    {metadata.description}
                  </Typography>
                )}
                <Typography variant="h6" sx={{ mb: 2 }}>
                  Precios
                </Typography>
                <Stack direction="column" spacing={2}>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                  <Tooltip
                    title={!account ? 'Conecta tu wallet' : status === 'pending' ? 'Esperando confirmación' : !listed ? 'Modelo no listado' : !pricePerpMist ? 'Precio no disponible' : isCreator ? 'Eres el creador' : isSeller ? 'Eres el vendedor' : 'Comprar licencia perpetua'}
                  >
                    <span>
                      <Button
                        variant="contained"
                        onClick={buyPerpetual}
                        disabled={!account || status === 'pending' || !listed || !pricePerpMist || isCreator || isSeller}
                      >
                        {status === 'pending' ? 'Comprando…' : `Perpetua (${fmtSui(pricePerpMist)} SUI)`}
                      </Button>
                    </span>
                  </Tooltip>
                  </Stack>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }}>
                    <TextField
                      select
                      label="Meses (suscripción)"
                      value={monthsSel}
                      onChange={(e) => setMonthsSel(Number(e.target.value))}
                      sx={{ width: { xs: '100%', sm: 220 } }}
                      disabled={!priceSubMist}
                      helperText={priceSubMist ? `Total: ${fmtSui(priceSubMist * Math.max(1, Number(monthsSel || 1)))} SUI` : 'No disponible'}
                    >
                      {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                        <MenuItem key={m} value={m}>{m} mes{m>1?'es':''}</MenuItem>
                      ))}
                    </TextField>
                    <Tooltip
                      title={!account ? 'Conecta tu wallet' : status === 'pending' ? 'Esperando confirmación' : !listed ? 'Modelo no listado' : !priceSubMist ? 'Suscripción no disponible' : isCreator ? 'Eres el creador' : isSeller ? 'Eres el vendedor' : `Comprar ${monthsSel} mes(es) de suscripción`}
                    >
                      <span>
                        <Button
                          variant="outlined"
                          onClick={buySubscription}
                          disabled={!account || status === 'pending' || !listed || !priceSubMist || isCreator || isSeller}
                        >
                          {status === 'pending' ? 'Comprando…' : `Suscripción (${monthsSel}m · ${fmtSui(priceSubMist * Math.max(1, Number(monthsSel || 1)))} SUI)`}
                        </Button>
                      </span>
                    </Tooltip>
                  </Stack>
                </Stack>
              </CardContent>
            </Card>
            {encryptedUri && (
              <Card sx={{ mt: 3 }}>
                <CardContent>
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>Contenido protegido</Typography>
                  {!account?.address && (
                    <Alert severity="info">Conecta tu wallet para solicitar acceso.</Alert>
                  )}
                  {account?.address && !decryptedPreview && !decryptError && (
                    <Typography color="text.secondary">Verificando licencia y descifrando…</Typography>
                  )}
                  {decryptError && (
                    <Alert severity="warning">Requiere compra o permiso para acceder a este contenido.</Alert>
                  )}
                  {decryptedPreview && (
                    typeof (decryptedPreview as any)?.kind === 'string' ? (
                      (decryptedPreview as any).kind === 'image' ? (
                        <CardMedia sx={{ borderRadius: 1 }} component="img" image={(decryptedPreview as any).url} alt="contenido" />
                      ) : (decryptedPreview as any).kind === 'video' ? (
                        <Box component="video" src={(decryptedPreview as any).url} controls style={{ width: '100%' }} />
                      ) : (decryptedPreview as any).kind === 'pdf' ? (
                        <Box component="iframe" src={(decryptedPreview as any).url} style={{ width: '100%', height: 480, border: 0 }} />
                      ) : (decryptedPreview as any).kind === 'text' ? (
                        <Typography sx={{ whiteSpace: 'pre-wrap' }}>{(decryptedPreview as any).text}</Typography>
                      ) : (
                        <Stack spacing={1}>
                          <Typography color="text.secondary">Archivo descifrado ({(decryptedPreview as any).bytes} bytes)</Typography>
                          <Button variant="outlined" component="a" href={(decryptedPreview as any).url} download>
                            Descargar archivo
                          </Button>
                        </Stack>
                      )
                    ) : (
                      <Typography sx={{ whiteSpace: 'pre-wrap' }}>{String(decryptedPreview)}</Typography>
                    )
                  )}
                </CardContent>
              </Card>
            )}
          </Grid>
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>Detalles</Typography>
                <Divider sx={{ mb: 2 }} />
                <Stack spacing={1}>
                  {(model as any)?.creator && (
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Typography color="text.secondary" sx={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>Creador: {showFullCreator ? (model as any).creator : shortAddr((model as any).creator)}</Typography>
                      <IconButton size="small" onClick={() => setShowFullCreator((v) => !v)}>{showFullCreator ? <VisibilityOffIcon fontSize="inherit" /> : <VisibilityIcon fontSize="inherit" />}</IconButton>
                      <IconButton size="small" onClick={() => navigator.clipboard.writeText(String((model as any).creator))}><ContentCopyIcon fontSize="inherit" /></IconButton>
                    </Stack>
                  )}
                  {(model as any)?.owner && (
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Typography color="text.secondary" sx={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>Vendedor: {showFullOwner ? (model as any).owner : shortAddr((model as any).owner)}</Typography>
                      <IconButton size="small" onClick={() => setShowFullOwner((v) => !v)}>{showFullOwner ? <VisibilityOffIcon fontSize="inherit" /> : <VisibilityIcon fontSize="inherit" />}</IconButton>
                      <IconButton size="small" onClick={() => navigator.clipboard.writeText(String((model as any).owner))}><ContentCopyIcon fontSize="inherit" /></IconButton>
                    </Stack>
                  )}
                  {modelSlug && (
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Typography color="text.secondary" sx={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>Slug: {String(modelSlug)}</Typography>
                      <IconButton size="small" onClick={() => navigator.clipboard.writeText(String(modelSlug))}><ContentCopyIcon fontSize="inherit" /></IconButton>
                    </Stack>
                  )}
                  {typeof (model as any)?.default_duration_days !== 'undefined' && (
                    <Typography color="text.secondary">Duración por defecto: {(model as any).default_duration_days} días</Typography>
                  )}
                  {typeof (model as any)?.price_subscription === 'number' && (model as any).price_subscription > 0 && (
                    <Typography color="text.secondary">Suscripción: {fmtSui((model as any).price_subscription)} SUI/mes</Typography>
                  )}
                  {(model as any)?.uri && (
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Typography color="text.secondary" sx={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>URI: {(model as any).uri}</Typography>
                      <IconButton size="small" onClick={() => navigator.clipboard.writeText(String((model as any).uri))}><ContentCopyIcon fontSize="inherit" /></IconButton>
                      <IconButton size="small" component="a" href={`${gateway}/ipfs/${String((model as any).uri).replace('ipfs://', '')}`} target="_blank" rel="noreferrer"><OpenInNewIcon fontSize="inherit" /></IconButton>
                    </Stack>
                  )}
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}
