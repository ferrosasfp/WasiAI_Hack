'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Button,
  Container,
  Grid,
  Stack,
  TextField,
  Typography,
  MenuItem,
  FormControlLabel,
  Checkbox,
  Switch,
  LinearProgress,
  Snackbar,
  Alert as MuiAlert,
  FormControlLabel as MuiFormControlLabel,
  IconButton,
  Badge,
  Menu,
} from '@mui/material';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { env } from '@/config/env';
import { getMarketInfo } from '@/store/market';
import { useCurrentAccount, useSignAndExecuteTransaction } from '@mysten/dapp-kit';
import { buildListOrUpgradeTx } from '@/lib/sui';
import { toBase64, encryptAESGCM, generateKey, exportRawKey } from '@/lib/crypto';

async function sha256ToBytes(input: string): Promise<Uint8Array> {
  const enc = new TextEncoder();
  const data = enc.encode(input);
  const hashBuf = await crypto.subtle.digest('SHA-256', data);
  return new Uint8Array(hashBuf);
}

export default function UploadPage() {
  const account = useCurrentAccount();
  const { mutateAsync: signAndExecute, status } = useSignAndExecuteTransaction();
  const router = useRouter();

  const [slug, setSlug] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [royaltyPct, setRoyaltyPct] = useState(5); // mostrado en %, selección fija
  const [pricePerpStr, setPricePerpStr] = useState(''); // SUI (string para edición limpia)
  const [priceSubStr, setPriceSubStr] = useState(''); // SUI/mes (string)
  const [durationMonths, setDurationMonths] = useState(1); // selección en meses
  const [rightsApi, setRightsApi] = useState(true);
  const [rightsDl, setRightsDl] = useState(true);
  const [deliveryApi, setDeliveryApi] = useState(true);
  const [deliveryDl, setDeliveryDl] = useState(true);
  const [terms, setTerms] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [protectedMode, setProtectedMode] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<any | null>(null);
  const [step, setStep] = useState<string>('');
  const [successOpen, setSuccessOpen] = useState(false);
  const [toast, setToast] = useState<{ open: boolean; msg: string; severity: 'error'|'info'|'success'|'warning' }>({ open: false, msg: '', severity: 'info' });
  const [notifs, setNotifs] = useState<Array<{ id: number; msg: string; severity: 'error'|'info'|'success'|'warning'; ts: number }>>([]);
  const [notifAnchor, setNotifAnchor] = useState<null | HTMLElement>(null);
  const notifOpen = Boolean(notifAnchor);
  const [finalModelId, setFinalModelId] = useState<number | null>(null);
  const [slugReserveError, setSlugReserveError] = useState<string>('');
  
  // Si el usuario activa suscripción y meses está en 0, forzar 1 como default; si desactiva, no reseteamos meses
  useEffect(() => {
    const ps = parseFloat(priceSubStr || '0');
    if (ps > 0 && Number(durationMonths) === 0) {
      setDurationMonths(1);
    }
  }, [priceSubStr]);

  // Marketplace fee (bps): estado con fallback a env, y carga on-chain
  const [marketFeeBps, setMarketFeeBps] = useState<number>(Number((env as any).NEXT_PUBLIC_MARKET_FEE_BPS || 2000));
  useEffect(() => {
    (async () => {
      try {
        const mi = await getMarketInfo();
        if (mi?.feeBps != null && !Number.isNaN(Number(mi.feeBps))) setMarketFeeBps(Number(mi.feeBps));
      } catch {}
    })();
  }, []);
  const feePct = marketFeeBps / 10000;
  const royaltyPctDec = Number(royaltyPct || 0) / 100;
  const dec9 = /^(?:\d+)?(?:\.\d{0,9})?$/; // hasta 9 decimales
  const pricePerpInvalid = pricePerpStr !== '' && !dec9.test(pricePerpStr);
  const priceSubInvalid = priceSubStr !== '' && !dec9.test(priceSubStr);
  // Límites de tamaño de archivo (MB)
  const maxProtectedMB = Number((env as any).NEXT_PUBLIC_MAX_SIZE_MB_PROTECTED || 250);
  const maxUnprotectedMB = Number((env as any).NEXT_PUBLIC_MAX_SIZE_MB_UNPROTECTED || 500);
  const fileSizeMB = file ? file.size / 1e6 : 0;
  const sizeLimitMB = protectedMode ? maxProtectedMB : maxUnprotectedMB;
  const fileTooLarge = Boolean(file) && fileSizeMB > sizeLimitMB;
  const perpTotal = parseFloat(pricePerpStr || '0') || 0;
  const perpFee = perpTotal * feePct;
  const perpRoyalty = perpTotal * royaltyPctDec;
  const perpNetSeller = Math.max(0, perpTotal - perpFee - perpRoyalty);
  const subMonths = Number(durationMonths || 0);
  const priceSubNum = parseFloat(priceSubStr || '0') || 0;
  const subTotal = priceSubNum * (priceSubNum > 0 ? subMonths : 0);
  const subFee = subTotal * feePct;
  const subRoyalty = subTotal * royaltyPctDec;
  const subNetSeller = Math.max(0, subTotal - subFee - subRoyalty);

  // Cap validation: fee_bps + royalty_bps <= 10000
  const royaltyBpsSel = Math.round(Number(royaltyPct || 0) * 100);
  const capExceeded = marketFeeBps + royaltyBpsSel > 10000;


  function kebabify(s: string) {
    return s
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .replace(/-{2,}/g, '-');
  }
  function validSlug(s: string) { return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(s) && s.length >= 3 && s.length <= 40; }
  function randomCode(len = 10) {
    const arr = new Uint8Array(len);
    crypto.getRandomValues(arr);
    const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let out = '';
    for (let i = 0; i < len; i++) out += alphabet[arr[i] % alphabet.length];
    return out;
  }
  async function shortHash(input: string) {
    const enc = new TextEncoder();
    const buf = await crypto.subtle.digest('SHA-256', enc.encode(input));
    const arr = Array.from(new Uint8Array(buf).slice(0, 4));
    return arr.map((b) => b.toString(36).padStart(2, '0')).join('').slice(0, 6);
  }
  function sanitizeDecimal9(input: string): string {
    if (input === '') return '';
    let s = input.replace(/[^0-9.]/g, '');
    const firstDot = s.indexOf('.');
    if (firstDot !== -1) {
      s = s.slice(0, firstDot + 1) + s.slice(firstDot + 1).replace(/\./g, '');
      const [intPart, decPart = ''] = s.split('.');
      s = intPart + '.' + decPart.slice(0, 9);
    }
    if (s.startsWith('.')) s = '0' + s;
    if (!s.includes('.')) {
      s = String(Number(s));
    }
    return s;
  }
  function makeUniqueName(original: string, uniqueKey: string, overrideExt?: string) {
    const m = original.match(/^(.*?)(?:\.([^.]+))?$/);
    const base = m?.[1] || 'file';
    const ext = (overrideExt || m?.[2] || '').replace(/^\./, '');
    return ext ? `${base}.${uniqueKey}.${ext}` : `${base}.${uniqueKey}`;
  }
  async function uploadFileMultipart(file: File | Blob, filename?: string): Promise<string> {
    const fd = new FormData();
    const nameGuess = filename || ((file as any)?.name ?? 'file.bin');
    fd.append('file', file as any, nameGuess);
    const resp = await fetch('/api/ipfs/upload', { method: 'POST', body: fd });
    if (!resp.ok) throw new Error(await resp.text());
    const j = await resp.json();
    return j.cid as string;
  }
  function notify(msg: string, severity: 'error'|'info'|'success'|'warning' = 'info') {
    setToast({ open: true, msg, severity });
    setNotifs((arr) => [{ id: Date.now(), msg, severity, ts: Date.now() }, ...arr].slice(0, 10));
  }
  async function fetchWithTimeout(url: string, opts: RequestInit & { timeoutMs?: number } = {}): Promise<Response> {
    const { timeoutMs = 6000, ...init } = opts;
    const ctrl = new AbortController();
    const id = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      return await fetch(url, { ...init, signal: ctrl.signal });
    } finally {
      clearTimeout(id);
    }
  }
  async function ensureUniqueSlug(base: string) {
    let candidate = validSlug(base) ? base : kebabify(base);
    const check = async (s: string) => {
      const r = await fetch(`/api/models/resolve-id?slug=${encodeURIComponent(s)}`);
      if (!r.ok) return false;
      const j = await r.json();
      return Boolean(j?.found);
    };
    let tries = 0;
    while (await check(candidate)) {
      const suffix = await shortHash(`${base}-${Date.now()}-${tries++}`);
      candidate = `${kebabify(base)}-${suffix}`;
      if (tries > 5) break;
    }
    return candidate;
  }

  const rightsMask = (rightsApi ? 1 : 0) + (rightsDl ? 2 : 0);
  const noRightsSelected = !rightsApi && !rightsDl;
  const deliveryMask = (deliveryApi ? 1 : 0) + (deliveryDl ? 2 : 0);
  // Validaciones de campos obligatorios y reglas de precio
  const nameInvalid = name.trim().length === 0;
  const descInvalid = description.trim().length === 0;
  const termsInvalid = terms.trim().length === 0;
  const hasPerp = perpTotal > 0;
  const hasSub = priceSubNum > 0;
  const durationInvalid = hasSub && Number(durationMonths || 0) < 1;
  const priceRuleInvalid = !hasPerp && !hasSub;
  const imageMissing = !imageFile;
  const fileMissing = !file;

  async function reserveSlugWithRetries(): Promise<string> {
    let unique = '';
    const reserveAttempts = Number((env as any).NEXT_PUBLIC_SLUG_RESERVE_ATTEMPTS || 5);
    const reserveTimeoutMs = Number((env as any).NEXT_PUBLIC_SLUG_RESERVE_TIMEOUT_MS || 10000);
    for (let i = 0; i < reserveAttempts; i++) {
      const trySlug = `m-${randomCode(4)}-${randomCode(6)}`;
      try {
        setStep(`Reservando identificador… (intento ${i + 1}/${reserveAttempts})`);
        const r = await fetchWithTimeout('/api/models/slug-available', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ slug: trySlug }),
          timeoutMs: reserveTimeoutMs,
        });
        if (r.ok) {
          const j = await r.json();
          if (j?.ok && j?.reserved) { unique = trySlug; break; }
          if (j?.reason === 'reserved' || j?.reason === 'exists' || j?.reason === 'db-exists') {
            continue;
          }
        }
      } catch (e) {
        try { console.debug?.('[upload] slug-available timeout/error', e); } catch {}
      }
      const delay = Math.min(1500 * (2 ** i), 4000) + Math.floor(Math.random() * 250);
      await new Promise((r) => setTimeout(r, delay));
    }
    return unique;
  }

  async function handleRetryReserve() {
    setSlugReserveError('');
    const unique = await reserveSlugWithRetries();
    if (unique) {
      if (unique !== slug) setSlug(unique);
      setStep('Identificador reservado');
    } else {
      setSlugReserveError('No fue posible reservar un identificador. Verifica tu conexión e intenta nuevamente.');
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!account) return;
    if (submitting) return; // guard contra doble click
    if (fileTooLarge) {
      notify(`El archivo del modelo excede el límite de ${sizeLimitMB} MB (${fileSizeMB.toFixed(1)} MB).`, 'warning');
      return;
    }
    setSubmitting(true);
    setSuccessOpen(false);
    setFinalModelId(null);
    
    setStep('Preparando archivos…');
    if (!file) {
      notify('Selecciona un archivo del modelo', 'warning');
      setSubmitting(false);
      return;
    }
    if (!imageFile) {
      notify('Selecciona una imagen del modelo', 'warning');
      setSubmitting(false);
      return;
    }

    // Normalización/validación para cumplir validate_licensing
    let normPriceSub = Number(parseFloat(priceSubStr || '0') || 0);
    let normDurationDays = 0;
    if (normPriceSub === 0) {
      normDurationDays = 0; // sin suscripción
    } else {
      if (Number(durationMonths || 0) < 1) {
        notify('La duración base debe ser al menos 1 mes.', 'warning');
        return;
      }
      normDurationDays = Number(durationMonths) * 30; // mínimo 30 días, meses a días
    }

    // 0) Reservar slug
    const unique = await reserveSlugWithRetries();
    if (!unique) {
      setSlugReserveError('No fue posible reservar un identificador. Reintenta.');
      setSubmitting(false);
      return;
    }
    if (unique !== slug) setSlug(unique);
    const uniqKey = `${unique}-${Date.now()}-${randomCode(4)}`;

    // 1) Preparar compresión de imagen y subir en paralelo con artefacto
    async function compressImage(file: File, maxW = 1280, maxH = 720, quality = 0.8): Promise<Uint8Array> {
      try {
        const bmp = await createImageBitmap(file);
        const scale = Math.min(1, maxW / bmp.width, maxH / bmp.height);
        const w = Math.max(1, Math.round(bmp.width * scale));
        const h = Math.max(1, Math.round(bmp.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('no-ctx');
        ctx.drawImage(bmp, 0, 0, w, h);
        const blob: Blob = await new Promise((res) => canvas.toBlob((b) => res(b || file), 'image/jpeg', quality));
        const ab = await blob.arrayBuffer();
        return new Uint8Array(ab);
      } catch {
        // fallback sin compresión
        return new Uint8Array(await file.arrayBuffer());
      }
    }

    setStep('Procesando y subiendo archivos a IPFS…');
    const imgPromise = (async () => {
      const imgBytes = await compressImage(imageFile, (window as any).env?.NEXT_PUBLIC_IMG_MAX_W || undefined, (window as any).env?.NEXT_PUBLIC_IMG_MAX_H || undefined, (window as any).env?.NEXT_PUBLIC_IMG_QUALITY || undefined);
      const resp = await fetch('/api/ipfs/upload', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ type: 'file', filename: makeUniqueName(imageFile.name.replace(/\.[^.]+$/, '.jpg'), uniqKey, 'jpg'), contentBase64: toBase64(imgBytes) }),
      });
      if (!resp.ok) throw new Error(await resp.text());
      const j = await resp.json();
      return j.cid as string;
    })();

    // 2) Subir archivo del modelo (raw o cifrado)
    let assetUri: string | undefined;
    let encryptedUri: string | undefined;
    let exportedKeyB64: string | undefined;
    let imageCid: string | undefined;
    if (protectedMode) {
      const modelBytes = new Uint8Array(await file.arrayBuffer());
      const key = await generateKey();
      const { iv, cipher } = await encryptAESGCM(modelBytes, key);
      const joined = new Uint8Array(iv.length + cipher.length);
      joined.set(iv, 0);
      joined.set(cipher, iv.length);
      const encPromise = (async () => {
        const blob = new Blob([joined], { type: 'application/octet-stream' });
        const cid = await uploadFileMultipart(blob, makeUniqueName(file.name, uniqKey, 'enc'));
        return cid;
      })();
      const [_imageCid, encCid] = await Promise.all([imgPromise, encPromise]);
      imageCid = _imageCid;
      encryptedUri = `ipfs://${encCid}`;
      const raw = await exportRawKey(key);
      exportedKeyB64 = toBase64(new Uint8Array(raw));
      // Pre-guardar clave por slug (mejor UX): no bloqueante
      try {
        if (typeof window !== 'undefined') {
          try { localStorage.setItem(`key:${unique}`, exportedKeyB64); } catch {}
        }
        await fetch('/api/keys/put', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ slug: unique, keyB64: exportedKeyB64 }),
        });
      } catch (e) {
        console.warn('[upload] fallo pre-guardar clave por slug', e);
      }
    } else {
      const rawPromise = uploadFileMultipart(file, makeUniqueName(file.name, uniqKey));
      const [_imageCid, rawCid] = await Promise.all([imgPromise, rawPromise]);
      imageCid = _imageCid;
      assetUri = `ipfs://${rawCid}`;
    }

    // 3) Subir metadata a IPFS vía /api/ipfs/upload
    const metadata = {
      slug: unique,
      name,
      description,
      image: `ipfs://${imageCid}`,
      asset_uri: assetUri,
      encrypted: protectedMode,
      encrypted_uri: encryptedUri,
      royalty_bps: Math.round(Number(royaltyPct || 0) * 100),
      price_perpetual: Number(parseFloat(pricePerpStr || '0') || 0),
      price_subscription: normPriceSub,
      default_duration_days: normDurationDays,
    };
    setStep('Subiendo metadata…');
    const metaResp = await fetch('/api/ipfs/upload', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ type: 'json', filename: makeUniqueName('metadata.json', uniqKey, 'json'), json: metadata }),
    });
    if (!metaResp.ok) {
      const t = await metaResp.text();
      notify('Error subiendo metadata a IPFS', 'error');
      setSubmitting(false);
      return;
    }
    const { cid: metadataCid } = await metaResp.json();

    // 4) Construir transacción list_or_upgrade
    const termsHash = await sha256ToBytes(terms);

    const tx = buildListOrUpgradeTx({
      slug: unique,
      name,
      uri: `ipfs://${metadataCid}`,
      royaltyBps: Math.round(Number(royaltyPct || 0) * 100),
      pricePerpetual: Math.round((parseFloat(pricePerpStr || '0') || 0) * 1e9),
      priceSubscription: Math.round((parseFloat(priceSubStr || '0') || 0) * 1e9),
      defaultDurationDays: normDurationDays,
      deliveryRightsDefault: (rightsMask || 1) as 1 | 2 | 3,
      deliveryModeHint: (deliveryMask || 2) as 1 | 2 | 3,
      termsHash,
    });

    try {
      setStep('Publicando en la red (firmando)…');
      const execRes: any = await signAndExecute({ transaction: tx });
      const txDigest: string | undefined = execRes?.digest || execRes?.effects?.transactionDigest || execRes?.certificate?.transactionDigest;
      // Guardado automático de clave (por slug) cuando es protegido
      if (protectedMode && exportedKeyB64) {
        try {
          if (typeof window !== 'undefined') {
            try { localStorage.setItem(`key:${unique}`, exportedKeyB64); } catch {}
          }
          setStep('Finalizando publicación (preparando acceso protegido)…');
          const fin = await fetch('/api/models/finalize', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ slug: unique, keyB64: exportedKeyB64, txDigest: txDigest || null }),
          });
          try {
            const j = await fin.json();
            if (typeof j?.modelId === 'number') {
              setFinalModelId(j.modelId);
              setSuccessOpen(true);
            } else {
              // Si no vino modelId, intentar resolver por slug con reintentos
              setStep('Resolviendo ID del modelo…');
              for (let i = 0; i < 6; i++) {
                try {
                  const r = await fetch(`/api/models/resolve-id?slug=${encodeURIComponent(unique)}`);
                  if (r.ok) {
                    const jj = await r.json();
                    if (jj?.found && typeof jj?.modelId === 'number') { setFinalModelId(jj.modelId); setSuccessOpen(true); break; }
                  }
                } catch {}
                await new Promise((r) => setTimeout(r, 1000));
              }
            }
          } catch {}
        } catch {}
      }
      setResult({ image: `ipfs://${imageCid}`, assetUri, encryptedUri, protectedMode, keyB64: exportedKeyB64, savedKey: Boolean(protectedMode && exportedKeyB64) });
      setStep('Listo');
      // El Snackbar se abre cuando finalModelId haya sido establecido más arriba
      // Mantener submitting=true tras éxito para evitar re-envíos accidentales.
    } catch (err: any) {
      const msg = String(err?.message || err);
      notify(`Error en transacción: ${msg}`, 'error');
      setSubmitting(false);
      setStep('');
    }
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', py: 6 }}>
      <Container maxWidth="md">
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h4" fontWeight="bold" gutterBottom>
            Publicar Modelo
          </Typography>
          {notifs.length > 0 && (
            <IconButton aria-label="Notificaciones" onClick={(e) => setNotifAnchor(e.currentTarget)}>
              <Badge color="secondary" variant={notifs.length > 0 ? 'dot' : undefined} badgeContent={notifs.length > 9 ? '9+' : notifs.length} overlap="circular">
                <span className="material-icons" style={{ fontSize: 22 }}>notifications</span>
              </Badge>
            </IconButton>
          )}
          {notifs.length > 0 && (
            <Menu anchorEl={notifAnchor} open={notifOpen} onClose={() => setNotifAnchor(null)}>
              {notifs.slice(0, 10).map((n) => (
                <MenuItem key={n.id} dense>
                  <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: n.severity === 'error' ? 'error.main' : n.severity === 'warning' ? 'warning.main' : n.severity === 'success' ? 'success.main' : 'info.main', mr: 1 }} />
                  <Typography variant="body2" sx={{ maxWidth: 320 }}>{n.msg}</Typography>
                </MenuItem>
              ))}
            </Menu>
          )}
        </Box>
        {!account && (
          <Typography color="text.secondary">Conecta tu wallet para continuar.</Typography>
        )}
        <Box component="form" onSubmit={onSubmit} sx={{ mt: 3 }}>
          {slugReserveError && (
            <MuiAlert severity="warning" action={<Button color="inherit" size="small" onClick={handleRetryReserve}>Reintentar</Button>} sx={{ mb: 2 }}>
              {slugReserveError}
            </MuiAlert>
          )}
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <Stack direction="row" spacing={1} alignItems="center">
                <TextField label="Slug (auto)" fullWidth value={slug} placeholder="ej. m-ab12-c3d4ef" inputProps={{ readOnly: true }} helperText="Código único generado por la dApp" />
              </Stack>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField label="Nombre" placeholder="Nombre del modelo" fullWidth value={name} onChange={(e) => { setName(e.target.value); }} required error={nameInvalid} />
            </Grid>
            <Grid item xs={12}>
              <TextField label="Descripción" placeholder="Descripción del modelo" fullWidth multiline minRows={3} value={description} onChange={(e) => setDescription(e.target.value)} required error={descInvalid} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField select fullWidth label="Royalty (%)" value={royaltyPct} onChange={(e) => setRoyaltyPct(Number(e.target.value))}>
                {[0,2,5,8,10,12,15,18,20].map(v => (
                  <MenuItem key={v} value={v}>{v}%</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              {priceSubNum === 0 ? (
                <TextField fullWidth label="Duración base (meses, sub)" value={"Sin suscripción"} disabled />
              ) : (
                <TextField select fullWidth label="Duración base (meses, sub)" value={durationMonths} onChange={(e) => setDurationMonths(Number(e.target.value))} helperText="Selecciona meses de vigencia" error={durationInvalid}>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                    <MenuItem key={m} value={m}>{m} mes{m>1?'es':''}</MenuItem>
                  ))}
                </TextField>
              )}
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField label="Precio perpetua (SUI)" type="text" inputMode="decimal" placeholder="0.00" fullWidth value={pricePerpStr} onChange={(e) => setPricePerpStr(sanitizeDecimal9(e.target.value))} error={pricePerpInvalid} helperText={`Royalty (creador) ${royaltyPct}%: ${((parseFloat(pricePerpStr||'0')||0)*Number(royaltyPct||0)/100).toFixed(2)} SUI${pricePerpInvalid ? ' • Formato inválido (máx 9 decimales)' : ''}`} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField label="Precio suscripción (SUI/mes)" type="text" inputMode="decimal" placeholder="0.00" fullWidth value={priceSubStr} onChange={(e) => setPriceSubStr(sanitizeDecimal9(e.target.value))} error={priceSubInvalid} helperText={`Royalty (creador) ${royaltyPct}%: ${((parseFloat(priceSubStr||'0')||0)*Number(royaltyPct||0)/100).toFixed(2)} SUI/mes${priceSubInvalid ? ' • Formato inválido (máx 9 decimales)' : ''}`} />
            </Grid>
            <Grid item xs={12}>
              <Stack spacing={0.5}>
                <Typography variant="body2" color="text.secondary">
                  Total perpetuo: {perpTotal.toFixed(2)} SUI · Fee marketplace: {perpFee.toFixed(2)} · Royalty (creador): {perpRoyalty.toFixed(2)} · Neto vendedor: {perpNetSeller.toFixed(2)} SUI
                </Typography>
                {priceSubNum > 0 && (
                  <Typography variant="body2" color="text.secondary">
                    Total suscripción base ({durationMonths} meses): {subTotal.toFixed(2)} SUI · Fee marketplace: {subFee.toFixed(2)} · Royalty (creador): {subRoyalty.toFixed(2)} · Neto vendedor: {subNetSeller.toFixed(2)} SUI
                  </Typography>
                )}
                {priceRuleInvalid && (
                  <MuiAlert severity="warning" variant="outlined" sx={{ py: 0.5, px: 1, borderRadius: 1, alignItems: 'center' }}>
                    Ingresa al menos un precio: perpetuo o suscripción.
                  </MuiAlert>
                )}
                {durationInvalid && (
                  <MuiAlert severity="warning" variant="outlined" sx={{ py: 0.5, px: 1, borderRadius: 1, alignItems: 'center' }}>
                    La duración base es obligatoria cuando hay precio de suscripción.
                  </MuiAlert>
                )}
                {capExceeded && (
                  <MuiAlert severity="warning" variant="outlined" sx={{ py: 0.5, px: 1, borderRadius: 1, alignItems: 'center' }}>
                    La suma de fee del marketplace ({(feePct*100).toFixed(2)}%) y royalty ({royaltyPct}%) excede 100%.
                  </MuiAlert>
                )}
                <Typography variant="caption" color="text.secondary">
                  Nota: el comprador elegirá entre la duración base seleccionada y 12 meses; el total cobrado y los cargos se calcularán proporcionalmente a su selección.
                </Typography>
              </Stack>
            </Grid>
            <Grid item xs={12}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <FormControlLabel control={<Checkbox checked={rightsApi} onChange={(e) => { const v = e.target.checked; setRightsApi(v); setDeliveryApi(v); }} />} label="Derecho API" />
                <FormControlLabel control={<Checkbox checked={rightsDl} onChange={(e) => { const v = e.target.checked; setRightsDl(v); setDeliveryDl(v); }} />} label="Derecho descarga" />
                <FormControlLabel control={<Checkbox checked={rightsApi} disabled />} label="Delivery API" />
                <FormControlLabel control={<Checkbox checked={rightsDl} disabled />} label="Delivery descarga" />
              </Stack>
              {noRightsSelected && (
                <MuiAlert severity="warning" variant="outlined" sx={{ mt: 1, py: 0.5, px: 1, borderRadius: 1, alignItems: 'center' }}>
                  Debes seleccionar al menos un derecho (API o descarga) para poder publicar.
                </MuiAlert>
              )}
            </Grid>
            <Grid item xs={12}>
              <MuiFormControlLabel control={<Switch checked={protectedMode} onChange={(e) => setProtectedMode(e.target.checked)} />} label="Proteger contenido (encriptar archivo del modelo)" />
            </Grid>
            <Grid item xs={12}>
              <TextField label="Términos (para hash)" placeholder="Términos de uso" fullWidth multiline minRows={2} value={terms} onChange={(e) => setTerms(e.target.value)} required error={termsInvalid} />
            </Grid>
            <Grid item xs={12}>
              <Button variant="outlined" component="label">
                Seleccionar imagen del modelo
                <input type="file" accept="image/*" hidden onChange={(e) => setImageFile(e.target.files?.[0] ?? null)} />
              </Button>
              <Typography variant="body2" color="text.secondary" sx={{ ml: 2, display: 'inline-block' }}>
                {imageFile ? imageFile.name : 'Ninguna imagen seleccionada'}
              </Typography>
              {imageFile && (
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5, ml: { sm: 0 } }}>
                  Imagen: {(imageFile.size/1e6).toFixed(1)} MB
                </Typography>
              )}
              {imageMissing && (
                <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mt: 0.75 }}>
                  <WarningAmberIcon fontSize="small" sx={{ color: 'warning.main' }} />
                  <Typography variant="caption" sx={{ color: 'warning.main' }}>
                    Debes seleccionar una imagen del modelo.
                  </Typography>
                </Stack>
              )}
            </Grid>
            <Grid item xs={12}>
              <Button variant="outlined" component="label">
                Seleccionar archivo del modelo
                <input type="file" hidden onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
              </Button>
              <Typography variant="body2" color="text.secondary" sx={{ ml: 2, display: 'inline-block' }}>
                {file ? file.name : 'Ningún archivo seleccionado'}
              </Typography>
              {file && (
                <Typography variant="caption" color={fileTooLarge ? 'error' : 'text.secondary'} display="block" sx={{ mt: 0.5, ml: { sm: 0 } }}>
                  Tamaño: {fileSizeMB.toFixed(1)} MB · Límite {sizeLimitMB} MB {protectedMode ? '(protegido)' : '(sin protección)'}
                </Typography>
              )}
              {fileTooLarge && (
                <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mt: 0.75 }}>
                  <WarningAmberIcon fontSize="small" sx={{ color: 'warning.main' }} />
                  <Typography variant="caption" sx={{ color: 'warning.main' }}>
                    El archivo excede el límite permitido para {protectedMode ? 'modo protegido' : 'sin protección'}. Reduce el tamaño o cambia el modo.
                  </Typography>
                </Stack>
              )}
              {fileMissing && (
                <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mt: 0.75 }}>
                  <WarningAmberIcon fontSize="small" sx={{ color: 'warning.main' }} />
                  <Typography variant="caption" sx={{ color: 'warning.main' }}>
                    Debes seleccionar el archivo del modelo.
                  </Typography>
                </Stack>
              )}
            </Grid>
            <Grid item xs={12}>
              <Button type="submit" variant="contained" disabled={!account || status === 'pending' || submitting || capExceeded || noRightsSelected || nameInvalid || descInvalid || termsInvalid || priceRuleInvalid || durationInvalid || fileTooLarge || imageMissing || fileMissing} title={noRightsSelected ? 'Selecciona al menos un derecho para habilitar la publicación' : undefined}>
                {status === 'pending' ? 'Publicando…' : 'Publicar'}
              </Button>
            </Grid>
            {submitting && (
              <Grid item xs={12}>
                <Stack spacing={1}>
                  <LinearProgress />
                  <Typography variant="body2" color="text.secondary">{step}</Typography>
                </Stack>
              </Grid>
            )}
            {result && (
              <Grid item xs={12}>
                <Typography variant="subtitle2">Resultado</Typography>
                <Typography variant="body2">Imagen: {result.image}</Typography>
                {result.assetUri && <Typography variant="body2">Asset: {result.assetUri}</Typography>}
                {result.encryptedUri && <Typography variant="body2">Encrypted: {result.encryptedUri}</Typography>}
                {result.keyB64 && <Typography variant="body2">Key (base64): {result.keyB64}</Typography>}
              </Grid>
            )}
          </Grid>
        </Box>
      </Container>
      <Snackbar open={successOpen && finalModelId != null} autoHideDuration={6000} onClose={() => setSuccessOpen(false)}>
        <MuiAlert onClose={() => setSuccessOpen(false)} severity="success" sx={{ width: '100%' }}>
          Modelo publicado.
          {finalModelId != null && (
            <Button color="inherit" size="small" onClick={() => router.push(`/models/${finalModelId}`)} sx={{ ml: 1 }}>
              Ver en detalle
            </Button>
          )}
        </MuiAlert>
      </Snackbar>
      <Snackbar open={toast.open} autoHideDuration={4000} onClose={() => setToast((t) => ({ ...t, open: false }))}>
        <MuiAlert onClose={() => setToast((t) => ({ ...t, open: false }))} severity={toast.severity} sx={{ width: '100%' }}>
          {toast.msg}
        </MuiAlert>
      </Snackbar>
    </Box>
  );
}
