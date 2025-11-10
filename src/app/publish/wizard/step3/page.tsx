"use client";
import { useState, useEffect } from 'react'
import { Box, Button, Paper, Typography, Stack, Grid, TextField, IconButton, Chip, LinearProgress, Tooltip, Divider, InputAdornment } from '@mui/material'
import { useWalletAddress } from '@/hooks/useWalletAddress'
import NextDynamic from 'next/dynamic'

export const dynamic = 'force-dynamic'
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

async function validateDemo(payload: any) {
  let addr: string | null = null
  try { addr = await (window as any)?.ethereum?.request?.({ method: 'eth_accounts' }).then((a: string[]) => a?.[0] || null) } catch {}
  const res = await fetch('/api/models/validate-demo', {
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

function Step3ArtifactsDemoImpl() {
  const detectedLocale = typeof window !== 'undefined' ? (['en','es'].includes((window.location.pathname.split('/')[1]||'').toLowerCase()) ? window.location.pathname.split('/')[1] : 'en') : 'en'
  if (typeof window !== 'undefined' && !/^\/(en|es)\//.test(window.location.pathname)) {
    window.location.replace(`/${detectedLocale}/publish/wizard/step3`)
    return null
  }
  const base = `/${detectedLocale}/publish/wizard`
  const [saving, setSaving] = useState(false)
  const [validating, setValidating] = useState(false)
  const [artifacts, setArtifacts] = useState<Artifact[]>([{ cid: '', filename: '' }])
  const [deliveryKind] = useState<'hosted'>('hosted')
  const [downloadNotes, setDownloadNotes] = useState('')
  const [presetInput, setPresetInput] = useState('{}')
  const [preview, setPreview] = useState<any>(null)
  const [msg, setMsg] = useState('')
  const { walletAddress } = useWalletAddress()

  // Autoload draft on mount and populate fields
  useEffect(() => {
    let alive = true
    loadDraft().then((r)=>{
      if (!alive) return
      const s3 = r?.data?.step3
      if (!s3) return
      try {
        if (Array.isArray(s3.artifacts)) setArtifacts(s3.artifacts)
        if (typeof s3.downloadNotes === 'string') setDownloadNotes(s3.downloadNotes)
        if (s3.demoPreset) setPresetInput(JSON.stringify(s3.demoPreset, null, 2))
      } catch {}
    }).catch(()=>{})
    return () => { alive = false }
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

  const copy = async (txt: string) => { try { await navigator.clipboard.writeText(txt) } catch {} }

  const extLabel = (name?: string) => {
    const n = name || ''
    const m = n.toLowerCase().match(/\.([a-z0-9]+)$/)
    if (!m) return 'file'
    const ext = m[1]
    if (['safetensors','bin','pt','onnx','gguf','json','zip','tar','gz','bz2','xz'].includes(ext)) return ext
    return ext
  }

  const uploadWithProgress = (file: File, onProgress: (pct:number)=>void): Promise<any> => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      xhr.open('POST', '/api/ipfs/pin-file')
      xhr.onload = async () => {
        try {
          const out = JSON.parse(xhr.responseText || '{}')
          if (xhr.status>=200 && xhr.status<300 && out?.ok) resolve(out)
          else reject(new Error(out?.error || `pin_failed:${xhr.status}`))
        } catch (e:any) {
          reject(new Error(`pin_parse_failed:${xhr.status}`))
        }
      }
      xhr.onerror = () => reject(new Error('pin_network_error'))
      xhr.upload.onprogress = (evt) => {
        if (evt.lengthComputable) {
          const pct = Math.round((evt.loaded / evt.total) * 100)
          onProgress(pct)
        }
      }
      const form = new FormData()
      form.append('file', file)
      xhr.send(form)
    })
  }

  const computeSha256 = async (file: File) => {
    const buf = await file.arrayBuffer()
    const hash = await crypto.subtle.digest('SHA-256', buf)
    return Array.from(new Uint8Array(hash)).map(b=>b.toString(16).padStart(2,'0')).join('')
  }

  const onSelectLocalFile = async (i: number, file: File) => {
    setArtifacts(arr => arr.map((a, idx) => idx===i ? { ...a, status: 'uploading', error: undefined, progress: 0 } : a))
    try {
      if (file.size > MAX_SIZE_BYTES) {
        throw new Error(`Archivo demasiado grande. Máximo permitido: 200 MB`)
      }
      const preSha = await computeSha256(file)
      const isDuplicate = artifacts.some((a, idx)=> idx!==i && (
        (a.sha256 && a.sha256 === preSha) ||
        (a.filename && a.sizeBytes && a.filename === file.name && a.sizeBytes === file.size)
      ))
      if (isDuplicate) {
        setArtifacts(arr => arr.map((a, idx) => idx===i ? { ...a, status: 'error', error: 'Archivo duplicado en la lista', filename: file.name, sizeBytes: file.size, sha256: preSha } : a))
        return
      }
      const out = await uploadWithProgress(file, (pct)=>{
        setArtifacts(arr=>arr.map((a, idx)=> idx===i ? { ...a, progress: pct } : a))
      })
      const sha = preSha
      const next: Artifact = { cid: out.cid, filename: file.name, sizeBytes: file.size, sha256: sha, status: 'ready' }
      setArtifacts(arr => arr.map((a, idx) => idx===i ? next : a))
    } catch (e:any) {
      setArtifacts(arr => arr.map((a, idx) => idx===i ? { ...a, status: 'error', error: String(e?.message||e) } : a))
    }
  }

  const onSelectMultiple = async (files: FileList) => {
    const arr = Array.from(files)
    if (!arr.length) return
    let base = artifacts.slice()
    if (base.length===0 || base[base.length-1].cid || base[base.length-1].filename) {
      base = [...base, { cid: '', filename: '' }]
    }
    setArtifacts(base)
    for (let idx=0; idx<arr.length; idx++) {
      const file = arr[idx]
      const targetIndex = base.length-1 + idx
      setArtifacts(prev => {
        const copy = prev.slice()
        while (copy.length<=targetIndex) copy.push({ cid:'', filename:'' })
        copy[targetIndex] = { cid:'', filename:'', status:'uploading', progress:0 }
        return copy
      })
      await onSelectLocalFile(targetIndex, file)
    }
  }

  const onPasteCID = async (i:number) => {
    const promptCid = window.prompt('Pega el CID existente (ipfs hash):')?.trim()
    if (!promptCid) return
    if (artifacts.some((a, idx)=> idx!==i && a.cid && a.cid===promptCid)) {
      setArtifacts(arr=>arr.map((a, idx)=> idx===i ? { ...a, status:'error', error:'CID duplicado' } : a))
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
      const ok = window.confirm('Este artefacto está listo. ¿Eliminar de la lista? (No desenpinna en IPFS)')
      if (!ok) return
    }
    setArtifacts(arr => arr.filter((_, idx) => idx!==i))
  }

  const onSave = async () => {
    setSaving(true)
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
    try {
      await saveDraft(payload)
      setMsg('Guardado')
    } catch {
      setMsg('Error al guardar')
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
      setMsg(r?.ok ? 'Demo OK' : (r?.error || 'Error demo'))
    } catch {
      setMsg('Error al validar demo')
    } finally {
      setValidating(false)
    }
  }

  const navigateAfterSave = async (e: React.MouseEvent<HTMLAnchorElement | HTMLButtonElement>, url: string) => {
    e.preventDefault()
    await onSave()
    window.location.href = url
  }

  return (
    <div style={{padding:24, maxWidth:900, margin:'0 auto'}}>
      <Typography variant="h5" sx={{ fontWeight:700 }}>Paso 3 · Empaqueta tus artefactos y prueba la demo</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
        Sube los archivos del modelo a IPFS (CID y hash automáticos), añade notas si lo necesitas y valida un preset de entrada para ejecutar una demo alojada en nuestra plataforma.
      </Typography>

      <Paper variant="outlined" sx={{ p:{ xs:2, md:3 }, mt:2, borderRadius:2 }}>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight:600 }}>Artefactos (IPFS)</Typography>
          <Tooltip title="Sube tus archivos del modelo; generamos el CID automáticamente"><InfoOutlinedIcon fontSize="small" color="action" /></Tooltip>
        </Stack>
        
        <Grid container spacing={2}>
          {artifacts.map((a, i) => (
            <Grid item xs={12} key={i}>
              <Paper variant="outlined" sx={{ p:1.5, borderRadius:2, bgcolor: a.status==='ready' ? 'action.hover' : undefined }}>
                <Stack direction={{ xs:'column', md:'row' }} spacing={1.5} alignItems={{ xs:'stretch', md:'center' }}>
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ flex:1 }}>
                    <Tooltip
                      title={
                        <Box>
                          <Typography variant="body2">{a.filename ? 'Reemplazar archivo' : 'Seleccionar archivo'}</Typography>
                          <Typography variant="caption">Tipos: safetensors, bin, pt, onnx, gguf, json, zip, tar, gz, bz2, xz. Máx: 200 MB.</Typography>
                        </Box>
                      }
                    >
                      <IconButton component="label" color="primary" aria-label={a.filename ? 'Reemplazar archivo' : 'Seleccionar archivo'}>
                        <UploadFileIcon />
                        <input hidden type="file" multiple accept={ACCEPTED_EXT} onChange={e=>{ const files=e.target.files; if(files && files.length>1) onSelectMultiple(files); else { const f=e.target.files?.[0]; if(f) onSelectLocalFile(i, f) } }} />
                      </IconButton>
                    </Tooltip>
                    {a.status==='uploading' && <Chip label="Subiendo..." size="small" />}
                    {a.status==='ready' && <Chip color="success" label="Listo" size="small" />}
                    {a.status==='error' && <Chip color="error" label="Error" size="small" />}
                    {a.filename && <Chip label={extLabel(a.filename)} size="small" />}
                    <Tooltip title="Crear fila desde un CID">
                      <IconButton size="small" onClick={()=>onPasteCID(i)}><ContentPasteIcon fontSize="small" /></IconButton>
                    </Tooltip>
                  </Stack>
                  <TextField
                    label="CID"
                    value={a.cid}
                    fullWidth
                    InputProps={{ readOnly: true, endAdornment: (
                      <InputAdornment position="end">
                        <Tooltip title="Copiar CID"><IconButton size="small" onClick={()=>a.cid && copy(a.cid)}><ContentCopyIcon fontSize="inherit" /></IconButton></Tooltip>
                        <Tooltip title="Abrir en gateway"><span><IconButton size="small" disabled={!a.cid} onClick={()=>window.open(`https://ipfs.io/ipfs/${a.cid}`,'_blank')}><OpenInNewIcon fontSize="inherit" /></IconButton></span></Tooltip>
                      </InputAdornment>
                    ) }}
                  />
                  <TextField
                    label="Archivo"
                    value={a.filename}
                    onChange={e=>onChangeArtifact(i,'filename',e.target.value)}
                    fullWidth
                    error={Boolean(a.filename) && artifacts.some((x,idx)=> idx!==i && x.filename && x.filename===a.filename)}
                    helperText={Boolean(a.filename) && artifacts.some((x,idx)=> idx!==i && x.filename && x.filename===a.filename) ? 'Nombre repetido en la lista' : undefined}
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
                    label="Tamaño"
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
                        <Tooltip title="Copiar hash"><IconButton size="small" onClick={()=>a.sha256 && copy(a.sha256)}><ContentCopyIcon fontSize="inherit" /></IconButton></Tooltip>
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
          <Button variant="text" onClick={onAddArtifact}>+ Agregar artefacto</Button>
        </Stack>
        <TextField label="Notas de descarga" multiline rows={3} value={downloadNotes} onChange={e=>setDownloadNotes(e.target.value)} fullWidth sx={{ mt:2 }} />
      </Paper>

      <Paper variant="outlined" sx={{ p:{ xs:2, md:3 }, mt:2, borderRadius:2 }}>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight:600 }}>Demo (Hosted)</Typography>
          <Tooltip title="La demo se ejecuta en nuestra infraestructura"><InfoOutlinedIcon fontSize="small" color="action" /></Tooltip>
        </Stack>
        <Grid container spacing={2} sx={{ mt:1 }}>
          <Grid item xs={12}>
            <TextField label="Preset de input (JSON)" fullWidth multiline rows={5} value={presetInput} onChange={e=>setPresetInput(e.target.value)} />
          </Grid>
        </Grid>
        <Stack direction="row" spacing={1} sx={{ mt:1 }}>
          <Button onClick={onValidate} disabled={validating} variant="outlined">{validating? 'Validando...' : 'Probar demo'}</Button>
        </Stack>
        {preview && (
          <Box sx={{ mt:1 }}>
            <Typography variant="subtitle2">Respuesta de demo</Typography>
            <pre style={{whiteSpace:'pre-wrap', background:'#111', color:'#eee', padding:12}}>{JSON.stringify(preview,null,2)}</pre>
          </Box>
        )}
      </Paper>

      {/* Spacer para barra fija */}
      <Box sx={{ height: { xs: 76, md: 72 }, mt: 2 }} />

      {/* Barra fija inferior */}
      <Box sx={{ position:'fixed', bottom: 0, left: 0, right: 0, zIndex: (t)=>t.zIndex.appBar + 1 }}>
        <Paper elevation={3} sx={{ borderRadius: 0, px: { xs:1.5, md:2 }, py: 1 }}>
          <Box sx={{ maxWidth: 1000, mx: 'auto', width:'100%' }}>
            {/* Móvil: tres posiciones con Guardar centrado */}
            <Box sx={{ display:{ xs:'flex', md:'none' }, alignItems:'center', justifyContent:'space-between', width:'100%' }}>
              <Button size="small" href={`${base}/step2`} onClick={(e)=>navigateAfterSave(e, `${base}/step2`)} variant="text" color="inherit" startIcon={<ArrowBackIcon />} sx={{ borderRadius: 2, textTransform:'none', py: 0.75, whiteSpace:'nowrap', fontSize:{ xs:12, md:14 }, '& .MuiButton-startIcon': { mr: 0.5, '& svg': { fontSize: 18 } } }}>
                Atrás
              </Button>
              <Button size="small" onClick={onSave} disabled={saving} variant="text" color="primary" startIcon={<SaveOutlinedIcon />} sx={{ borderRadius: 2, textTransform:'none', py: 0.75, whiteSpace:'nowrap', fontSize:{ xs:12, md:14 }, '& .MuiButton-startIcon': { mr: 0.5, '& svg': { fontSize: 18 } } }}>
                {saving? 'Guardando...' : 'Guardar borrador'}
              </Button>
              <Button size="small" href={`${base}/step4`} onClick={(e)=>navigateAfterSave(e, `${base}/step4`)} disabled={!isStepValid()} variant="text" color="inherit" endIcon={<ArrowForwardIcon />} sx={{ borderRadius: 2, textTransform:'none', py: 0.75, whiteSpace:'nowrap', fontSize:{ xs:12, md:14 }, '& .MuiButton-endIcon': { ml: 0.5, '& svg': { fontSize: 18 } } }}>
                Siguiente
              </Button>
            </Box>

            {/* Desktop: Atrás izquierda; Guardar + Siguiente a la derecha */}
            <Box sx={{ display:{ xs:'none', md:'flex' }, alignItems:'center', justifyContent:'space-between', gap: 1.25 }}>
              <Button href={`${base}/step2`} onClick={(e)=>navigateAfterSave(e, `${base}/step2`)} variant="text" color="inherit" startIcon={<ArrowBackIcon />} sx={{ borderRadius: 2, textTransform:'none', py: 1 }}>
                Atrás
              </Button>
              <Box sx={{ display:'flex', gap: 1.25 }}>
                <Button onClick={onSave} disabled={saving} variant="text" color="primary" startIcon={<SaveOutlinedIcon />} sx={{ borderRadius: 2, textTransform:'none', py: 1 }}>
                  {saving? 'Guardando...' : 'Guardar borrador'}
                </Button>
                <Button href={`${base}/step4`} onClick={(e)=>navigateAfterSave(e, `${base}/step4`)} disabled={!isStepValid()} variant="text" color="inherit" endIcon={<ArrowForwardIcon />} sx={{ borderRadius: 2, textTransform:'none', py: 1 }}>
                  Siguiente
                </Button>
              </Box>
            </Box>
          </Box>
        </Paper>
      </Box>

      {msg && <p>{msg}</p>}
    </div>
  )
}

export default NextDynamic(() => Promise.resolve(Step3ArtifactsDemoImpl), { ssr: false })
