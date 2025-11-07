"use client";
import { useEffect, useRef, useState } from 'react'
import { Box, Button, Paper, Typography, Stack, Grid, TextField, IconButton, Chip, LinearProgress, Tooltip, Divider, InputAdornment } from '@mui/material'
import { useWalletAddress } from '@/hooks/useWalletAddress'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined'
import UploadFileIcon from '@mui/icons-material/UploadFile'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import DescriptionIcon from '@mui/icons-material/Description'
import ContentPasteIcon from '@mui/icons-material/ContentPaste'
import { useLocale, useTranslations } from 'next-intl'

async function saveDraft(payload: any) {
  let addr: string | null = null
  try { addr = await (window as any)?.ethereum?.request?.({ method: 'eth_accounts' }).then((a: string[]) => a?.[0] || null) } catch {}
  const res = await fetch('/api/models/draft', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(addr ? { 'X-Wallet-Address': addr } : {}) },
    body: JSON.stringify(addr ? { ...payload, address: addr } : payload)
  })
  return res.json()
}

async function loadDraft() {
  let addr: string | null = null
  try { addr = await (window as any)?.ethereum?.request?.({ method: 'eth_accounts' }).then((a: string[]) => a?.[0] || null) } catch {}
  const res = await fetch('/api/models/draft' + (addr ? `?address=${addr}` : ''), { method: 'GET', headers: addr ? { 'X-Wallet-Address': addr } : {} })
  return res.json()
}

interface Artifact { cid: string; filename: string; sizeBytes?: number; sha256?: string; status?: 'idle'|'uploading'|'ready'|'error'; error?: string; progress?: number }

export default function Step3ArtifactsDemoLocalized() {
  const t = useTranslations()
  const locale = useLocale()
  const base = `/${locale}/publish/wizard`
  const isES = String(locale || '').toLowerCase().startsWith('es')
  const COMMON = {
    loadingDraft: isES ? 'Cargando borrador…' : 'Loading draft…',
    uploadInProgress: isES ? 'Subida en curso…' : 'Upload in progress…',
    confirmRemoveReady: isES ? 'Este archivo ya está listo. ¿Quieres eliminarlo?' : 'This file is already ready. Do you want to remove it?'
  }
  const isResetting = () => { try { return localStorage.getItem('wizard_resetting')==='1' || sessionStorage.getItem('wizard_resetting')==='1' } catch { return false } }
  const [saving, setSaving] = useState(false)
  const [validating, setValidating] = useState(false)
  const [artifacts, setArtifacts] = useState<Artifact[]>([{ cid: '', filename: '' }])
  const [downloadNotes, setDownloadNotes] = useState('')
  const [presetInput, setPresetInput] = useState('{}')
  const [preview, setPreview] = useState<any>(null)
  const [msg, setMsg] = useState('')
  const [shouldFade, setShouldFade] = useState(true)
  const { walletAddress } = useWalletAddress()
  const navigatingRef = useRef(false)
  const didMountRef = useRef(false)
  const loadingFromDraftRef = useRef(false)
  const [loadedRemote, setLoadedRemote] = useState(false)
  const lastSavedRef = useRef<any>(null)
  const autoSaveDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const anyUploading = artifacts.some(a=>a?.status==='uploading')
  const [loadingDraft, setLoadingDraft] = useState(false)
  const uploadQueueRef = useRef<Array<{ index:number, file: File }>>([])
  const processingUploadsRef = useRef(false)
  const inflightXhrRef = useRef<Map<number, XMLHttpRequest>>(new Map())
  const artifactsRef = useRef<Artifact[]>(artifacts)
  const deadlineTimersRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map())

  useEffect(()=>{ artifactsRef.current = artifacts }, [artifacts])

  // Cleanup on unmount: abort inflight XHRs, clear deadlines, empty queue
  useEffect(()=>{
    return () => {
      try { inflightXhrRef.current.forEach((xhr)=>{ try { xhr.abort() } catch {} }); inflightXhrRef.current.clear() } catch {}
      try { deadlineTimersRef.current.forEach((tm)=>{ try { clearTimeout(tm) } catch {} }); deadlineTimersRef.current.clear() } catch {}
      uploadQueueRef.current = []
      processingUploadsRef.current = false
    }
  }, [])

  const isStepValid = () => artifacts.some(a => Boolean(a.cid && a.filename))

  const ACCEPTED_EXT = '.safetensors,.bin,.pt,.onnx,.gguf,.json,.zip,.tar,.gz,.bz2,.xz,application/octet-stream'
  const MAX_SIZE_BYTES = 200 * 1024 * 1024 // 200 MB

  const fmtBytes = (n?: number) => {
    if (!n && n!==0) return ''
    const units = ['B','KB','MB','GB']
    let v = n; let u = 0
    while (v>=1024 && u<units.length-1) { v/=1024; u++ }
    return `${v.toFixed( (u===0)?0:1 )} ${units[u]}`
  }

  const uploadSimple = async (file: File) => {
    const form = new FormData()
    form.append('file', file)
    form.append('name', file.name)
    const res = await fetch('/api/ipfs/pin-file', { method: 'POST', body: form as any })
    const out = await res.json()
    if (!res.ok || !out?.ok) throw new Error(out?.error || `pin_failed:${res.status}`)
    return out
  }

  const CACHE_KEY = 'draft_step3'

  const readCache = () => {
    try { const raw = localStorage.getItem(CACHE_KEY); return raw ? JSON.parse(raw) : null } catch { return null }
  }
  const writeCache = (data: any) => { try { localStorage.setItem(CACHE_KEY, JSON.stringify(data)) } catch {} }

  // Autoload draft on mount with cache hydration (skip server hydration if resetting)
  useEffect(() => {
    let alive = true
    // Hydrate from cache first to avoid empty initial render
    try {
      const c = readCache()
      if (c) {
        if (Array.isArray(c.artifacts)) setArtifacts(c.artifacts)
        if (typeof c.downloadNotes === 'string') setDownloadNotes(c.downloadNotes)
        if (c.demoPreset) { try { setPresetInput(JSON.stringify(c.demoPreset, null, 2)) } catch {} }
        lastSavedRef.current = c
        setShouldFade(false)
      }
    } catch {}
    loadingFromDraftRef.current = true
    setLoadingDraft(true)
    if (isResetting()) { loadingFromDraftRef.current = false; setLoadingDraft(false); setLoadedRemote(true); return () => { alive = false } }
    loadDraft().then((r)=>{
      if (!alive) return
      const s3 = r?.data?.step3
      if (!s3) return
      try {
        if (Array.isArray(s3.artifacts)) setArtifacts(s3.artifacts)
        if (typeof s3.downloadNotes === 'string') setDownloadNotes(s3.downloadNotes)
        if (s3.demoPreset) { try { setPresetInput(JSON.stringify(s3.demoPreset, null, 2)) } catch { /* ignore */ } }
        lastSavedRef.current = s3
      } catch {}
    }).catch(()=>{}).finally(()=>{ loadingFromDraftRef.current = false; setLoadingDraft(false); setLoadedRemote(true) })
    return () => { alive = false }
  }, [])

  // Debounced autosave on important changes (skip if resetting)
  useEffect(() => {
    if (!didMountRef.current) { didMountRef.current = true; return }
    if (autoSaveDebounceRef.current) clearTimeout(autoSaveDebounceRef.current)
    autoSaveDebounceRef.current = setTimeout(() => {
      if (isResetting()) return
      if (!navigatingRef.current && !saving && !loadingFromDraftRef.current) onSave('autosave')
    }, 700)
    return () => { if (autoSaveDebounceRef.current) clearTimeout(autoSaveDebounceRef.current) }
  }, [artifacts, downloadNotes, presetInput])

  const copy = async (txt: string) => { try { await navigator.clipboard.writeText(txt) } catch {} }

  const extLabel = (name?: string) => {
    const n = name || ''
    const m = n.toLowerCase().match(/\.([a-z0-9]+)$/)
    if (!m) return t('wizard.step3.file')
    const ext = m[1]
    return ext
  }

  const uploadWithProgress = (index: number, file: File, onProgress: (pct:number)=>void): Promise<any> => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      inflightXhrRef.current.set(index, xhr)
      let finished = false
      const fail = (err: any) => { if (!finished) { finished = true; reject(err instanceof Error ? err : new Error(String(err))) } }
      const ok = (out: any) => { if (!finished) { finished = true; resolve(out) } }
      let lastProgressAt = Date.now()
      try {
        xhr.open('POST', '/api/ipfs/pin-file')
        // Aumentar timeout para soportar archivos grandes (hasta 10 minutos por intento)
        xhr.timeout = 600000
        xhr.onload = async () => {
          inflightXhrRef.current.delete(index)
          // limpiar deadline si aplica
          const dlt = deadlineTimersRef.current.get(index); if (dlt) { clearTimeout(dlt); deadlineTimersRef.current.delete(index) }
          try {
            const ct = xhr.getResponseHeader('content-type') || ''
            if (ct.includes('application/json')) {
              const out = JSON.parse(xhr.responseText || '{}')
              if (xhr.status>=200 && xhr.status<300 && out?.ok) ok(out)
              else fail(new Error(out?.error || `pin_failed:${xhr.status}`))
            } else {
              // Respuesta no JSON (posible HTML 413/500 del servidor)
              const snippet = (xhr.responseText||'').slice(0, 200)
              fail(new Error(`pin_non_json_response:${xhr.status}:${snippet}`))
            }
          } catch {
            fail(new Error(`pin_parse_failed:${xhr.status}`))
          }
        }
        xhr.ontimeout = () => { inflightXhrRef.current.delete(index); const dlt = deadlineTimersRef.current.get(index); if (dlt) { clearTimeout(dlt); deadlineTimersRef.current.delete(index) } fail(new Error('pin_timeout')) }
        xhr.onerror = () => { inflightXhrRef.current.delete(index); const dlt = deadlineTimersRef.current.get(index); if (dlt) { clearTimeout(dlt); deadlineTimersRef.current.delete(index) } fail(new Error('pin_network_error')) }
        xhr.upload.onprogress = (evt) => {
          if (evt.lengthComputable) {
            const pct = Math.round((evt.loaded / evt.total) * 100)
            onProgress(pct)
            lastProgressAt = Date.now()
          } else {
            // keep a minimal heartbeat to indicate activity
            onProgress(5)
          }
        }
        const form = new FormData()
        form.append('file', file)
        form.append('name', file.name)
        xhr.send(form)
      } catch (e) {
        inflightXhrRef.current.delete(index)
        const dlt = deadlineTimersRef.current.get(index); if (dlt) { clearTimeout(dlt); deadlineTimersRef.current.delete(index) }
        fail(e)
      }
    })
  }

  const computeSha256 = async (file: File) => {
    const buf = await file.arrayBuffer()
    const hash = await crypto.subtle.digest('SHA-256', buf)
    return Array.from(new Uint8Array(hash)).map(b=>b.toString(16).padStart(2,'0')).join('')
  }

  const actuallyUpload = async (i: number, file: File) => {
    try {
      if (file.size > MAX_SIZE_BYTES) {
        throw new Error(t('wizard.step3.errors.tooLarge', { max: '200 MB' }))
      }
      // Reactivar prehash SHA-256 para todos los archivos
      const preSha = await computeSha256(file)
      const artsNow = artifactsRef.current || []
      const isDuplicate = artsNow.some((a, idx)=> idx!==i && (
        (a.sha256 && a.sha256 === preSha) ||
        (a.filename && a.sizeBytes && a.filename === file.name && a.sizeBytes === file.size)
      ))
      if (isDuplicate) {
        setArtifacts(arr => arr.map((a, idx) => idx===i ? { ...a, status: 'error', error: t('wizard.step3.errors.duplicateFile'), filename: file.name, sizeBytes: file.size, sha256: preSha } : a))
        // Purga cualquier entrada de cola pendiente para este índice
        uploadQueueRef.current = uploadQueueRef.current.filter(e=>e.index!==i)
        return
      }
      let out: any = null
      // Reintentos configurables por .env (por defecto: pequeños=3, grandes=1)
      const envSmall = parseInt(process.env.NEXT_PUBLIC_STEP3_UPLOAD_RETRIES || '', 10)
      const envLarge = parseInt(process.env.NEXT_PUBLIC_STEP3_UPLOAD_RETRIES_LARGE || '', 10)
      const maxAttempts = file.size > (50 * 1024 * 1024)
        ? (Number.isFinite(envLarge) && envLarge>0 ? envLarge : 1)
        : (Number.isFinite(envSmall) && envSmall>0 ? envSmall : 3)

      // Deadline por ítem configurable (.env), por defecto 12 minutos
      const deadlineMs = (()=>{ const v = parseInt(process.env.NEXT_PUBLIC_STEP3_UPLOAD_DEADLINE_MS || '',10); return (Number.isFinite(v) && v>0) ? v : 12*60*1000 })()
      const deadline = setTimeout(()=>{
        try {
          const xhr = inflightXhrRef.current.get(i)
          if (xhr) xhr.abort()
        } catch {}
        setArtifacts(arr => arr.map((a, idx) => idx===i ? { ...a, status: 'error', error: 'upload_deadline_exceeded' } : a))
        // limpiar cola para el índice
        uploadQueueRef.current = uploadQueueRef.current.filter(e=>e.index!==i)
      }, deadlineMs)
      deadlineTimersRef.current.set(i, deadline)
      for (let attempt=1; attempt<=maxAttempts; attempt++) {
        try { console.log('[step3] upload:attempt', i, attempt, file?.name) } catch {}
        try {
          out = await uploadWithProgress(i, file, (pct)=>{
            setArtifacts(arr=>arr.map((a, idx)=> idx===i ? { ...a, progress: pct } : a))
          })
          break
        } catch (e:any) {
          if (attempt < maxAttempts) {
            await new Promise(r=>setTimeout(r, 1000 * attempt))
          } else {
            // Fallback to simple fetch without progres
            out = await uploadSimple(file)
          }
        }
      }
      const sha = preSha
      const next: Artifact = { cid: out.cid, filename: file.name, sizeBytes: file.size, sha256: sha, status: 'ready' }
      setArtifacts(arr => arr.map((a, idx) => idx===i ? next : a))
      const dlt = deadlineTimersRef.current.get(i); if (dlt) { clearTimeout(dlt); deadlineTimersRef.current.delete(i) }
      try { console.log('[step3] upload:success', i, file?.name, out?.cid) } catch {}
    } catch (e:any) {
      setArtifacts(arr => arr.map((a, idx) => idx===i ? { ...a, status: 'error', error: String(e?.message||e) } : a))
      // Purga cualquier entrada de cola pendiente para este índice y limpia XHR inflight
      uploadQueueRef.current = uploadQueueRef.current.filter(e=>e.index!==i)
      try { inflightXhrRef.current.delete(i) } catch {}
      const dlt = deadlineTimersRef.current.get(i); if (dlt) { clearTimeout(dlt); deadlineTimersRef.current.delete(i) }
      try { console.warn('[step3] upload:error', i, file?.name, e) } catch {}
    }
  }

  const processUploadQueue = async () => {
    if (processingUploadsRef.current) return
    processingUploadsRef.current = true
    try {
      while (uploadQueueRef.current.length > 0) {
        const { index, file } = uploadQueueRef.current.shift() as { index:number, file: File }
        await actuallyUpload(index, file)
      }
    } finally {
      processingUploadsRef.current = false
    }
  }

  const onSelectLocalFile = async (i: number, file: File) => {
    try { console.log('[step3] upload:start', i, file?.name, file?.size) } catch {}
    // Seteamos metadata visible desde el inicio para chequeos y UI
    setArtifacts(arr => arr.map((a, idx) => idx===i ? { ...a, status: 'uploading', error: undefined, progress: 0, filename: file.name, sizeBytes: file.size } : a))
    uploadQueueRef.current.push({ index: i, file })
    processUploadQueue()
  }

  const onCancelUpload = (i:number) => {
    const xhr = inflightXhrRef.current.get(i)
    if (xhr) {
      try { xhr.abort() } catch {}
      inflightXhrRef.current.delete(i)
    }
    setArtifacts(arr=>arr.map((a, idx)=> idx===i ? { ...a, status: 'error', error: t('wizard.step3.upload.cancelled') } : a))
    // also purge any queued entries for this index
    uploadQueueRef.current = uploadQueueRef.current.filter(e=>e.index!==i)
  }

  const onSelectMultiple = async (files: FileList) => {
    const arr = Array.from(files)
    if (!arr.length) return
    let baseArr = artifacts.slice()
    if (baseArr.length===0 || baseArr[baseArr.length-1].cid || baseArr[baseArr.length-1].filename) {
      baseArr = [...baseArr, { cid: '', filename: '' }]
    }
    setArtifacts(baseArr)
    for (let idx=0; idx<arr.length; idx++) {
      const file = arr[idx]
      const targetIndex = baseArr.length-1 + idx
      setArtifacts(prev => {
        const copy = prev.slice()
        while (copy.length<=targetIndex) copy.push({ cid:'', filename:'' })
        copy[targetIndex] = { cid:'', filename:'', status:'uploading', progress:0 }
        return copy
      })
      uploadQueueRef.current.push({ index: targetIndex, file })
    }
    processUploadQueue()
  }

  const onPasteCID = async (i:number) => {
    const promptCid = window.prompt(t('wizard.step3.actions.pasteCidPrompt'))?.trim()
    if (!promptCid) return
    if (artifacts.some((a, idx)=> idx!==i && a.cid && a.cid===promptCid)) {
      setArtifacts(arr=>arr.map((a, idx)=> idx===i ? { ...a, status:'error', error:t('wizard.step3.errors.duplicateCID') } : a))
      return
    }
    setArtifacts(arr=>arr.map((a, idx)=> idx===i ? { ...a, cid: promptCid, status:'ready', error: undefined } : a))
  }

  const onAddArtifact = () => setArtifacts(a => [...a, { cid: '', filename: '' }])
  const onChangeArtifact = (i: number, key: keyof Artifact, val: any) => {
    setArtifacts(a => a.map((it, idx) => idx===i ? { ...it, [key]: val } : it))
  }
  const onRemoveArtifact = (i: number) => {
    const a = artifacts[i]
    if (a?.status==='ready') {
      const ok = window.confirm(COMMON.confirmRemoveReady)
      if (!ok) return
    }
    setArtifacts(arr => arr.filter((_, idx) => idx!==i))
  }

  const isMeaningful = (p: any) => {
    const d = p?.data || {}
    const arts = Array.isArray(d.artifacts) ? d.artifacts : []
    const notes = (d.downloadNotes||'').trim()
    return Boolean(
      arts.some((a:any)=>a?.cid && a?.filename) ||
      notes
    )
  }

  const shallowEqualJSON = (a: any, b: any) => { try { return JSON.stringify(a) === JSON.stringify(b) } catch { return false } }

  const onSave = async (reason?: 'autosave'|'manual') => {
    setMsg('')
    const payload = {
      address: walletAddress,
      step: 'step3',
      data: {
        artifacts,
        delivery: { kind: 'hosted' },
        downloadNotes,
        demoPreset: (()=>{ try { return JSON.parse(presetInput||'{}') } catch { return {} } })()
      }
    }
    if (reason==='autosave') {
      if (anyUploading) { return }
      if (!isMeaningful(payload)) { return }
      if (lastSavedRef.current && shallowEqualJSON(lastSavedRef.current, payload.data)) { return }
    }
    setSaving(true)
    try { console.log('[step3] payload to save:', payload) } catch {}
    try {
      const resp = await saveDraft(payload)
      try { console.log('[step3] saveDraft resp:', resp) } catch {}
      setMsg(t('wizard.common.saved'))
      lastSavedRef.current = payload.data
      writeCache(payload.data)
    } catch {
      setMsg(t('wizard.common.errorSaving'))
    } finally {
      setSaving(false)
    }
  }

  const onValidate = async () => {
    setValidating(true)
    setMsg('')
    try {
      const input = (()=>{ try { return JSON.parse(presetInput||'{}') } catch { return {} } })()
      const payload = { artifacts: artifacts.map(a=>({ cid: a.cid, filename: a.filename, sha256: a.sha256 })), input }
      const res = await fetch('/api/demo/run', { method: 'POST', headers: { 'content-type':'application/json' }, body: JSON.stringify(payload) })
      const r = await res.json()
      setPreview(r)
      setMsg(r?.ok ? t('wizard.step3.demo.ok') : (r?.error || t('wizard.step3.demo.error')))
    } catch {
      setMsg(t('wizard.step3.demo.errorValidate'))
    } finally {
      setValidating(false)
    }
  }

  const navigateAfterSave = async (e: React.MouseEvent<HTMLAnchorElement | HTMLButtonElement>, url: string) => {
    e.preventDefault()
    if (anyUploading) return
    await onSave()
    window.location.href = url
  }

  return (
    <div style={{padding:24, maxWidth:900, margin:'0 auto'}}>
      {(loadingDraft || anyUploading) && (
        <Box sx={{ mb: 1 }}>
          <LinearProgress />
        </Box>
      )}
      <Typography variant="h5" sx={{ fontWeight:700 }}>{t('wizard.step3.title')}</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
        {t('wizard.step3.subtitle')}
      </Typography>

      <Paper variant="outlined" sx={{ p:{ xs:2, md:3 }, mt:2, borderRadius:2 }}>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight:600 }}>{t('wizard.step3.sections.artifacts.title')}</Typography>
          <Tooltip title={t('wizard.step3.sections.artifacts.help')}><InfoOutlinedIcon fontSize="small" color="action" /></Tooltip>
        </Stack>
        <Box sx={{ transition:'opacity 150ms ease 60ms', willChange:'opacity', opacity: shouldFade ? (loadedRemote ? 1 : 0) : 1, minHeight: 200 }}>
        <Grid container spacing={2}>
          {artifacts.map((a, i) => (
            <Grid item xs={12} key={i}>
              <Paper variant="outlined" sx={{ p:1.5, borderRadius:2, bgcolor: a.status==='ready' ? 'action.hover' : undefined }}>
                <Stack direction={{ xs:'column', md:'row' }} spacing={1.5} alignItems={{ xs:'stretch', md:'center' }}>
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ flex:1 }}>
                    <Tooltip
                      title={
                        <Box>
                          <Typography variant="body2">{a.filename ? t('wizard.step3.actions.replaceFile') : t('wizard.step3.actions.selectFile')}</Typography>
                          <Typography variant="caption">{t('wizard.step3.actions.typesMax')}</Typography>
                        </Box>
                      }
                    >
                      <IconButton component="label" color="primary" aria-label={a.filename ? t('wizard.step3.actions.replaceFile') : t('wizard.step3.actions.selectFile')}>
                        <UploadFileIcon />
                        <input hidden type="file" multiple accept={ACCEPTED_EXT} onChange={e=>{ const files=e.target.files; if(files && files.length>1) onSelectMultiple(files); else { const f=e.target.files?.[0]; if(f) onSelectLocalFile(i, f) } }} />
                      </IconButton>
                    </Tooltip>
                    {a.status==='uploading' && <Chip label={t('wizard.step3.status.uploading')} size="small" />}
                    {a.status==='ready' && <Chip color="success" label={t('wizard.step3.status.ready')} size="small" />}
                    {a.status==='error' && <Chip color="error" label={t('wizard.step3.status.error')} size="small" />}
                    {a.filename && <Chip label={extLabel(a.filename)} size="small" />}
                    <Tooltip title={t('wizard.step3.actions.fromCid')}>
                      <IconButton size="small" onClick={()=>onPasteCID(i)}><ContentPasteIcon fontSize="small" /></IconButton>
                    </Tooltip>
                    {/* Botones Cancelar/Reintentar removidos según pedido */}
                  </Stack>
                  <TextField
                    label="CID"
                    value={a.cid}
                    fullWidth
                    InputProps={{ readOnly: true, endAdornment: (
                      <InputAdornment position="end">
                        <Tooltip title={t('wizard.step3.actions.copyCid')}><IconButton size="small" onClick={()=>a.cid && copy(a.cid)}><ContentCopyIcon fontSize="inherit" /></IconButton></Tooltip>
                        <Tooltip title={t('wizard.step3.actions.openGateway')}><span><IconButton size="small" disabled={!a.cid} onClick={()=>window.open(`https://ipfs.io/ipfs/${a.cid}`,'_blank')}><OpenInNewIcon fontSize="inherit" /></IconButton></span></Tooltip>
                      </InputAdornment>
                    ) }}
                  />
                  <TextField
                    label={t('wizard.step3.fields.filename')}
                    value={a.filename}
                    onChange={e=>onChangeArtifact(i,'filename',e.target.value)}
                    fullWidth
                    error={Boolean(a.filename) && artifacts.some((x,idx)=> idx!==i && x.filename && x.filename===a.filename)}
                    helperText={Boolean(a.filename) && artifacts.some((x,idx)=> idx!==i && x.filename && x.filename===a.filename) ? t('wizard.step3.errors.duplicateFilenameShort') : undefined}
                    InputProps={{
                      startAdornment: (<InputAdornment position="start"><DescriptionIcon fontSize="small" /></InputAdornment>),
                      endAdornment: (()=>{
                        const dupIndex = artifacts.slice(0, i).filter(x=>x.filename===a.filename).length
                        return dupIndex>0 ? <InputAdornment position="end">({dupIndex+1})</InputAdornment> : undefined
                      })(),
                      readOnly: a.status==='ready'
                    }}
                  />
                  <TextField
                    label={t('wizard.step3.fields.size')}
                    value={fmtBytes(a.sizeBytes)}
                    fullWidth
                    InputProps={{ readOnly: true }}
                  />
                  <TextField
                    label="SHA-256"
                    value={a.sha256||''}
                    fullWidth
                    InputProps={{ readOnly: true, endAdornment: (
                      <InputAdornment position="end">
                        <Tooltip title={t('wizard.step3.actions.copyHash')}><IconButton size="small" onClick={()=>a.sha256 && copy(a.sha256)}><ContentCopyIcon fontSize="inherit" /></IconButton></Tooltip>
                      </InputAdornment>
                    ) }}
                  />
                  <IconButton color="error" onClick={()=>onRemoveArtifact(i)}><DeleteOutlineIcon/></IconButton>
                </Stack>
                {a.status==='uploading' && <LinearProgress variant={typeof a.progress==='number' ? 'determinate' : 'indeterminate'} value={a.progress||0} sx={{ mt:1 }} />}
                {a.error && <Typography variant="caption" color="error.main" sx={{ mt: 0.5 }}>{a.error}</Typography>}
              </Paper>
            </Grid>
          ))}
        </Grid>
        <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
          <Button variant="text" onClick={onAddArtifact}>+ {t('wizard.step3.actions.addArtifact')}</Button>
        </Stack>
        <TextField label={t('wizard.step3.fields.downloadNotes')} multiline rows={3} value={downloadNotes} onChange={e=>setDownloadNotes(e.target.value)} fullWidth sx={{ mt:2 }} />
        </Box>
      </Paper>

      <Paper variant="outlined" sx={{ p:{ xs:2, md:3 }, mt:2, borderRadius:2 }}>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight:600 }}>{t('wizard.step3.sections.demo.title')}</Typography>
          <Tooltip title={t('wizard.step3.sections.demo.help')}><InfoOutlinedIcon fontSize="small" color="action" /></Tooltip>
        </Stack>
        <Box sx={{ transition:'opacity 150ms ease 40ms', willChange:'opacity', opacity: shouldFade ? (loadedRemote ? 1 : 0) : 1, minHeight: 140 }}>
          <Grid container spacing={2} sx={{ mt:1 }}>
            <Grid item xs={12}>
              <TextField label={t('wizard.step3.fields.presetJson')} fullWidth multiline rows={5} value={presetInput} onChange={e=>setPresetInput(e.target.value)} />
            </Grid>
          </Grid>
          <Stack direction="row" spacing={1} sx={{ mt:1 }}>
            <Button onClick={onValidate} disabled={validating} variant="outlined" sx={{ transition:'opacity 120ms ease', opacity: validating ? 0.85 : 1 }}>
              {validating? t('wizard.step3.actions.validating') : t('wizard.step3.actions.tryDemo')}
            </Button>
          </Stack>
          {preview && (
            <Box sx={{ mt:1 }}>
              <Typography variant="subtitle2">{t('wizard.step3.demo.response')}</Typography>
              <pre style={{whiteSpace:'pre-wrap', background:'#111', color:'#eee', padding:12}}>{JSON.stringify(preview,null,2)}</pre>
            </Box>
          )}
        </Box>
      </Paper>

      <Box sx={{ height: { xs: 76, md: 72 }, mt: 2 }} />

      <Box sx={{ position:'fixed', bottom: 0, left: 0, right: 0, zIndex: (t)=>t.zIndex.appBar + 1 }}>
        <Paper elevation={3} sx={{ borderRadius: 0, px: { xs:1.5, md:2 }, py: 1 }}>
          <Box sx={{ maxWidth: 1000, mx: 'auto', width:'100%' }}>
            <Box sx={{ display:{ xs:'flex', md:'none' }, alignItems:'center', justifyContent:'space-between', width:'100%' }}>
              <Button size="small" href={`${base}/step2`} onClick={(e)=>navigateAfterSave(e, `${base}/step2`)} disabled={anyUploading} variant="text" color="inherit" startIcon={<ArrowBackIcon />} sx={{ borderRadius: 2, textTransform:'none', py: 0.75, whiteSpace:'nowrap', fontSize:{ xs:12, md:14 }, '& .MuiButton-startIcon': { mr: 0.5, '& svg': { fontSize: 18 } } }}>
                {t('wizard.common.back')}
              </Button>
              <Button size="small" onClick={()=>onSave('manual')} disabled={saving || anyUploading} variant="text" color="primary" startIcon={<SaveOutlinedIcon />} sx={{ borderRadius: 2, textTransform:'none', py: 0.75, whiteSpace:'nowrap', fontSize:{ xs:12, md:14 }, '& .MuiButton-startIcon': { mr: 0.5, '& svg': { fontSize: 18 } }, transition:'opacity 120ms ease', opacity: (saving||anyUploading) ? 0.85 : 1 }}>
                {saving? t('wizard.common.saving') : t('wizard.common.saveDraft')}
              </Button>
              <Button size="small" href={`${base}/step4`} onClick={(e)=>navigateAfterSave(e, `${base}/step4`)} disabled={!isStepValid() || anyUploading} variant="text" color="inherit" endIcon={<ArrowForwardIcon />} sx={{ borderRadius: 2, textTransform:'none', py: 0.75, whiteSpace:'nowrap', fontSize:{ xs:12, md:14 }, '& .MuiButton-endIcon': { ml: 0.5, '& svg': { fontSize: 18 } }, transition:'opacity 120ms ease', opacity: (!isStepValid() || anyUploading) ? 0.85 : 1 }}>
                {t('wizard.common.next')}
              </Button>
            </Box>
            <Box sx={{ display:{ xs:'none', md:'flex' }, alignItems:'center', justifyContent:'space-between', gap: 1.25 }}>
              <Button href={`${base}/step2`} onClick={(e)=>navigateAfterSave(e, `${base}/step2`)} disabled={anyUploading} variant="text" color="inherit" startIcon={<ArrowBackIcon />} sx={{ borderRadius: 2, textTransform:'none', py: 1, transition:'opacity 120ms ease', opacity: anyUploading ? 0.85 : 1 }}>
                {t('wizard.common.back')}
              </Button>
              <Box sx={{ display:'flex', gap: 1.25 }}>
                <Button onClick={()=>onSave('manual')} disabled={saving || anyUploading} variant="text" color="primary" startIcon={<SaveOutlinedIcon />} sx={{ borderRadius: 2, textTransform:'none', py: 1, transition:'opacity 120ms ease', opacity: (saving||anyUploading) ? 0.85 : 1 }}>
                  {saving? t('wizard.common.saving') : t('wizard.common.saveDraft')}
                </Button>
                <Button href={`${base}/step4`} onClick={(e)=>navigateAfterSave(e, `${base}/step4`)} disabled={!isStepValid() || anyUploading} variant="text" color="inherit" endIcon={<ArrowForwardIcon />} sx={{ borderRadius: 2, textTransform:'none', py: 1, transition:'opacity 120ms ease', opacity: (!isStepValid() || anyUploading) ? 0.85 : 1 }}>
                  {t('wizard.common.next')}
                </Button>
              </Box>
              {(loadingDraft || anyUploading) && (
                <Typography variant="caption" color="text.secondary" sx={{ ml: 2 }}>
                  {loadingDraft ? COMMON.loadingDraft : COMMON.uploadInProgress}
                </Typography>
              )}
            </Box>
          </Box>
        </Paper>
      </Box>

      {msg && <p>{msg}</p>}
    </div>
  )
}
