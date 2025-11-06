"use client";
import { useMemo, useRef, useState, useEffect } from 'react'
import {
  Box,
  Stack,
  TextField,
  Typography,
  Button,
  Avatar,
  Chip,
  Autocomplete,
  FormHelperText,
  Grid,
  Paper,
  Divider,
  Tooltip,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText
} from '@mui/material'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import RefreshIcon from '@mui/icons-material/Refresh'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import GitHubIcon from '@mui/icons-material/GitHub'
import LanguageIcon from '@mui/icons-material/Language'
import TwitterIcon from '@mui/icons-material/Twitter'
import LinkedInIcon from '@mui/icons-material/LinkedIn'
import { useWalletAddress } from '@/hooks/useWalletAddress'

async function saveDraft(payload: any) {
  let addr: string | null = null
  try {
    addr = await (window as any)?.ethereum?.request?.({ method: 'eth_accounts' }).then((a: string[]) => a?.[0] || null)
  } catch {}
  const res = await fetch('/api/models/draft', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(addr ? { 'X-Wallet-Address': addr } : {}) },
    body: JSON.stringify(addr ? { ...payload, address: addr } : payload)
  })
  return res.json()
}

async function loadDraft() {
  let addr: string | null = null
  try {
    addr = await (window as any)?.ethereum?.request?.({ method: 'eth_accounts' }).then((a: string[]) => a?.[0] || null)
  } catch {}
  const res = await fetch('/api/models/draft' + (addr ? `?address=${addr}` : ''), { method: 'GET', headers: addr ? { 'X-Wallet-Address': addr } : {} })
  return res.json()
}

export default function Step1Basics() {
  const detectedLocale = typeof window !== 'undefined' ? (['en','es'].includes((window.location.pathname.split('/')[1]||'').toLowerCase()) ? window.location.pathname.split('/')[1] : 'en') : 'en'
  if (typeof window !== 'undefined' && !/^\/(en|es)\//.test(window.location.pathname)) {
    window.location.replace(`/${detectedLocale}/publish/wizard/step1`)
    return null
  }
  const base = `/${detectedLocale}/publish/wizard`
  const [saving, setSaving] = useState(false)
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('') // internal only (not rendered)
  const [slugTouched, setSlugTouched] = useState(false)
  const [shortSummary, setShortSummary] = useState('')
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [coverPreview, setCoverPreview] = useState('')
  const [coverCid, setCoverCid] = useState<string>('')
  const [coverThumbCid, setCoverThumbCid] = useState<string>('')
  const [coverMime, setCoverMime] = useState<string>('')
  const [coverSize, setCoverSize] = useState<number>(0)
  const [coverUploading, setCoverUploading] = useState<boolean>(false)
  const [coverMsg, setCoverMsg] = useState<string>('')
  const [coverDisplayUrl, setCoverDisplayUrl] = useState<string>('')
  const [promoting, setPromoting] = useState<boolean>(false)
  const [coverVersion, setCoverVersion] = useState<number>(0)
  const [imgKey, setImgKey] = useState<string>('')
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null)
  const openMenu = Boolean(menuAnchor)
  const CATEGORY_OPTIONS = useMemo(() => ['nlp','vision','audio','video','multimodal','tabular'], [])
  const TAG_OPTIONS = useMemo(() => ['pytorch','onnx','transformers','diffusion','quantized','int8','fp16','rl','lora'], [])
  const [categoriesSel, setCategoriesSel] = useState<string[]>([])
  const [tagsSel, setTagsSel] = useState<string[]>([])
  const [authorDisplay, setAuthorDisplay] = useState('')
  // links avanzados retirados; se construyen solo desde socialValues
  const SOCIALS = useMemo(() => [
    { key:'github', label:'GitHub', placeholder:'https://github.com/usuario', icon:<GitHubIcon fontSize="small" /> },
    { key:'website', label:'Website', placeholder:'https://tu-sitio.dev', icon:<LanguageIcon fontSize="small" /> },
    { key:'twitter', label:'Twitter/X', placeholder:'https://x.com/usuario', icon:<TwitterIcon fontSize="small" /> },
    { key:'linkedin', label:'LinkedIn', placeholder:'https://www.linkedin.com/in/usuario', icon:<LinkedInIcon fontSize="small" /> },
  ], [])
  const [socialValues, setSocialValues] = useState<Record<string,string>>({})
  const [msg, setMsg] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [errors, setErrors] = useState<{name?:string; slug?:string; categories?:string}>({})
  const { walletAddress } = useWalletAddress()

  // Autoload draft on mount and when wallet changes
  useEffect(() => {
    let alive = true
    loadDraft().then((r)=>{
      if (!alive) return
      const s1 = r?.data?.step1
      if (!s1) return
      setName(s1.name || '')
      setShortSummary(s1.shortSummary || '')
      setSlug(s1.slug || '')
      setCategoriesSel(Array.isArray(s1.categories)? s1.categories : [])
      setTagsSel(Array.isArray(s1.tags)? s1.tags : [])
      const disp = s1?.author?.displayName || ''
      setAuthorDisplay(disp)
      const links = (s1?.author?.links && typeof s1.author.links === 'object') ? s1.author.links : {}
      setSocialValues(links)
      const cov = s1?.cover
      if (cov?.cid || cov?.thumbCid) {
        setCoverCid(cov?.cid || '')
        setCoverThumbCid(cov?.thumbCid || '')
        setCoverMime(cov?.mime || '')
        setCoverSize(Number(cov?.size||0))
        const url = cov?.thumbCid ? `https://ipfs.io/ipfs/${cov.thumbCid}` : (cov?.cid ? `https://ipfs.io/ipfs/${cov.cid}` : '')
        if (url) setCoverDisplayUrl(url)
      }
    }).catch(()=>{})
    return () => { alive = false }
  }, [walletAddress])

  const onNameChange = (v: string) => {
    setName(v)
    if (!slugTouched) {
      const auto = v.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-')
      setSlug(auto)
    }
  }

  const probeImage = async (url: string, timeoutMs = 6000): Promise<boolean> => {
    return await new Promise((resolve) => {
      const img = new Image()
      let done = false
      const finish = (ok: boolean) => { if (!done) { done = true; resolve(ok) } }
      const t = setTimeout(()=>finish(false), timeoutMs)
      img.onload = () => { clearTimeout(t); finish(true) }
      img.onerror = () => { clearTimeout(t); finish(false) }
      img.src = url
    })
  }

  const promoteCoverToIPFS = async (version?: number) => {
    const thumb = coverThumbCid
    const main = coverCid
    const ts = Date.now()
    const gws = ['https://ipfs.io/ipfs/','https://dweb.link/ipfs/','https://cf-ipfs.com/ipfs/']
    const candidates: string[] = []
    if (thumb) gws.forEach(g=>candidates.push(`${g}${thumb}?t=${ts}`))
    if (main) gws.forEach(g=>candidates.push(`${g}${main}?t=${ts}`))
    for (const url of candidates) {
      const ok = await probeImage(url)
      if (ok) {
        // Evita que una promoción antigua sobreescriba una selección nueva
        if (version === undefined || version === coverVersion) {
          setCoverDisplayUrl(url)
        }
        return true as any
      }
    }
    return false as any
  }

  const onRefreshCover = async () => {
    if (coverPreview) setCoverDisplayUrl(coverPreview)
    setPromoting(true)
    await promoteCoverToIPFS(coverVersion)
    setPromoting(false)
  }

  const onRemoveCover = async () => {
    const ok = window.confirm('¿Quitar portada actual? Se hará unpin de los CIDs en tu pinning service.')
    if (!ok) return
    const prevMain = coverCid
    const prevThumb = coverThumbCid
    setCoverCid(''); setCoverThumbCid(''); setCoverDisplayUrl(''); setCoverPreview(''); setCoverMime(''); setCoverSize(0)
    try { await unpinCid(prevMain); await unpinCid(prevThumb); setCoverMsg('Portada eliminada') } catch { setCoverMsg('Portada eliminada (unpin puede tardar)') }
  }

  const copyToClipboard = async (txt?: string) => { if (!txt) return; try { await navigator.clipboard.writeText(txt) } catch {} }

  const openCoverInIPFS = () => {
    const target = coverThumbCid || coverCid
    if (target) window.open(`https://ipfs.io/ipfs/${target}`,'_blank')
  }

  const handleMenuOpen = (e: React.MouseEvent<HTMLElement>) => setMenuAnchor(e.currentTarget)
  const handleMenuClose = () => setMenuAnchor(null)

  const onSlugChange = (v: string) => {
    setSlugTouched(true)
    setSlug(v.toLowerCase().trim().replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-'))
  }

  const toggleFrom = (arr: string[], val: string) => arr.includes(val) ? arr.filter(x=>x!==val) : [...arr, val]

  const onSelectCover = () => {
    const f = fileInputRef.current?.files?.[0] || null
    setCoverFile(f)
    if (f) {
      // Revocar URL anterior si existe
      try { if (coverPreview?.startsWith('blob:')) URL.revokeObjectURL(coverPreview) } catch {}
      const nextVersion = coverVersion + 1
      setCoverVersion(nextVersion)
      const url = URL.createObjectURL(f)
      setCoverPreview(url)
      setCoverDisplayUrl(url)
      setImgKey(String(Date.now()))
      // Limpiar CIDs para evitar que el fallback muestre la imagen anterior
      setCoverCid(''); setCoverThumbCid('')
      // Limpiar input para que permitir seleccionar el mismo archivo de nuevo si hace falta
      try { if (fileInputRef.current) (fileInputRef.current as any).value = '' } catch {}
      setCoverMsg('')
    } else {
      setCoverPreview('')
      setCoverDisplayUrl('')
    }
  }

  const pinFile = async (file: Blob, name?: string) => {
    const form = new FormData()
    form.append('file', file)
    if (name) form.append('name', name)
    const res = await fetch('/api/ipfs/pin-file', { method: 'POST', body: form as any })
    const out = await res.json()
    if (!out?.ok) throw new Error(out?.error || 'pin_failed')
    return out as { ok: boolean; cid: string; uri: string }
  }

  const unpinCid = async (cid?: string) => {
    if (!cid) return
    try { await fetch('/api/ipfs/unpin', { method: 'POST', headers: { 'content-type':'application/json' }, body: JSON.stringify({ cid }) }) } catch {}
  }

  const createThumbnail = async (file: File): Promise<Blob> => {
    const MAX_W = 480
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, MAX_W / bitmap.width)
    const w = Math.round(bitmap.width * scale)
    const h = Math.round(bitmap.height * scale)
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')!
    ctx.drawImage(bitmap, 0, 0, w, h)
    return await new Promise((resolve) => canvas.toBlob(b=>resolve(b as Blob), 'image/webp', 0.8))
  }

  const onUploadCover = async () => {
    const f = coverFile
    if (!f) { setCoverMsg('Selecciona una imagen primero'); return }
    setCoverMsg('')
    const ALLOWED = ['image/png','image/jpeg','image/webp']
    if (!ALLOWED.includes(f.type)) { setCoverMsg('Formato no permitido (usa PNG, JPEG o WEBP)'); return }
    const MAX = 5 * 1024 * 1024
    if (f.size > MAX) { setCoverMsg('La imagen supera 5 MB'); return }
    setCoverUploading(true)
    try {
      const prevMain = coverCid
      const prevThumb = coverThumbCid
      const main = await pinFile(f, `cover-${slug||name||'model'}`)
      const thumbBlob = await createThumbnail(f)
      const thumb = await pinFile(thumbBlob, `cover-thumb-${slug||name||'model'}`)
      setCoverCid(main.cid)
      setCoverThumbCid(thumb.cid)
      setCoverMime(f.type)
      setCoverSize(f.size)
      setCoverMsg('Portada subida')
      // Mostrar de inmediato la preview local y promover a IPFS con verificación de gateways
      if (coverPreview) setCoverDisplayUrl(coverPreview)
      setPromoting(true)
      try {
        const ok1 = await promoteCoverToIPFS(coverVersion)
        if (!ok1) {
          // Intentar re-pin por CID en Pinata y reintentar promoción
          try { await fetch('/api/ipfs/pin-cid', { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({ cid: main.cid, name: `cover-${slug||name||'model'}` }) }) } catch {}
          try { await fetch('/api/ipfs/pin-cid', { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({ cid: thumb.cid, name: `cover-thumb-${slug||name||'model'}` }) }) } catch {}
          await promoteCoverToIPFS(coverVersion)
        }
      } finally {
        setPromoting(false)
      }
      // Unpin previos
      if (prevMain && prevMain!==main.cid) unpinCid(prevMain)
      if (prevThumb && prevThumb!==thumb.cid) unpinCid(prevThumb)
    } catch (e:any) {
      setCoverMsg(`Error subiendo portada: ${String(e?.message||e)}`)
    } finally {
      setCoverUploading(false)
    }
  }

  const onSave = async () => {
    const nextErrors: typeof errors = {}
    if (!name.trim()) nextErrors.name = 'Requerido'
    // slug se generará al publicar; no requerido aquí
    if (categoriesSel.length === 0) nextErrors.categories = 'Elige al menos una categoría'
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) { setMsg('Corrige los campos marcados'); return }
    setSaving(true)
    setMsg('')
    // construir links autor solo desde UI de redes
    const linksObj = Object.fromEntries(Object.entries(socialValues).filter(([_,v])=>v && v.trim()))

    const payload = {
      address: walletAddress,
      step: 'step1',
      data: {
        name, shortSummary,
        slug,
        categories: categoriesSel,
        tags: tagsSel,
        author: { displayName: authorDisplay, links: linksObj },
        cover: coverCid ? { cid: coverCid, thumbCid: coverThumbCid, mime: coverMime, size: coverSize } : undefined
      }
    }
    try {
      const r = await saveDraft(payload)
      setMsg('Guardado')
    } catch (e: any) {
      setMsg('Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  const coverUrl = coverDisplayUrl || coverPreview || (coverThumbCid ? `https://ipfs.io/ipfs/${coverThumbCid}` : (coverCid ? `https://ipfs.io/ipfs/${coverCid}` : ''))

  const isStepValid = () => {
    return Boolean(name.trim() && shortSummary.trim() && categoriesSel.length > 0 && coverCid)
  }

  const navigateAfterSave = async (e: React.MouseEvent<HTMLAnchorElement | HTMLButtonElement>, url: string) => {
    e.preventDefault()
    await onSave()
    window.location.href = url
  }

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: 1000, mx: 'auto' }}>
      <Stack spacing={2} sx={{ mb: 2 }}>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>Paso 1 — Identidad del modelo</Typography>
        <Typography variant="body1" color="text.secondary">
          Presenta tu modelo de la mejor manera. Define su nombre y resumen, elige una portada atractiva y clasifícalo para que los usuarios lo encuentren rápido.
        </Typography>
      </Stack>

      <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 }, mb: 3, borderRadius: 2 }}>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>Identidad</Typography>
          <Tooltip title="Estos campos ayudan a que tu modelo sea fácil de entender y encontrar."><InfoOutlinedIcon fontSize="small" color="action" /></Tooltip>
        </Stack>
        <Stack spacing={2}>
          <TextField
            label="Nombre"
            value={name}
            onChange={(e)=>onNameChange(e.target.value)}
            placeholder="Nombre del modelo"
            fullWidth
            error={!!errors.name}
            helperText={errors.name || 'Usa un título claro y conciso.'}
          />

          <TextField
            label="Resumen"
            value={shortSummary}
            onChange={(e)=>setShortSummary(e.target.value)}
            placeholder="1–3 frases que expliquen el propósito"
            multiline rows={3}
            fullWidth
          />
        </Stack>
      </Paper>

      <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 }, mb: 3, borderRadius: 2 }}>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>Portada</Typography>
          <Tooltip title="Selecciona una imagen que represente tu modelo."><InfoOutlinedIcon fontSize="small" color="action" /></Tooltip>
        </Stack>
        {/* Fila superior con acciones de portada */}
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
          <Button component="label" variant="outlined">
            Elegir imagen
            <input ref={fileInputRef} hidden type="file" accept="image/png,image/jpeg,image/webp" onChange={onSelectCover} />
          </Button>
          <Button variant="contained" onClick={onUploadCover} disabled={!coverFile || coverUploading}>{coverUploading? 'Subiendo...' : 'Subir portada'}</Button>
          <Tooltip title="Más opciones">
            <IconButton onClick={handleMenuOpen} size="medium" sx={{ height: 40 }}>
              <MoreVertIcon />
            </IconButton>
          </Tooltip>
          <Menu anchorEl={menuAnchor} open={openMenu} onClose={handleMenuClose} anchorOrigin={{ vertical:'bottom', horizontal:'left' }}>
            <MenuItem onClick={()=>{ handleMenuClose(); onRefreshCover() }} disabled={promoting}>
              <ListItemIcon><RefreshIcon fontSize="small"/></ListItemIcon>
              <ListItemText>{promoting? 'Comprobando…' : 'Refrescar vista'}</ListItemText>
            </MenuItem>
            <MenuItem onClick={()=>{ handleMenuClose(); openCoverInIPFS() }} disabled={!(coverCid || coverThumbCid)}>
              <ListItemIcon><OpenInNewIcon fontSize="small"/></ListItemIcon>
              <ListItemText>Ver en IPFS</ListItemText>
            </MenuItem>
            <MenuItem onClick={()=>{ handleMenuClose(); copyToClipboard(coverCid) }} disabled={!coverCid}>
              <ListItemIcon><ContentCopyIcon fontSize="small"/></ListItemIcon>
              <ListItemText>Copiar CID</ListItemText>
            </MenuItem>
            <MenuItem onClick={()=>{ handleMenuClose(); onRemoveCover() }} disabled={!(coverCid || coverThumbCid)}>
              <ListItemIcon><DeleteOutlineIcon fontSize="small"/></ListItemIcon>
              <ListItemText>Quitar</ListItemText>
            </MenuItem>
          </Menu>
        </Stack>

        {/* Contenido principal en columnas: helper/metadata y preview */}
        <Stack direction={{ xs:'column', md:'row' }} spacing={3} alignItems={{ xs:'stretch', md:'center' }}>
          <Stack spacing={1} sx={{ flex: 1 }}>
            <FormHelperText>Selecciona una portada (recomendado 3:2 o 16:9). Formatos: PNG, JPEG o WEBP. Máx 5 MB.</FormHelperText>
            {coverMsg && <FormHelperText sx={{ color: coverMsg.includes('Error')? 'error.main' : 'success.main' }}>{coverMsg}</FormHelperText>}
            {(coverCid || coverThumbCid) && (
              <Stack spacing={0.5}>
                <Typography variant="caption" color="text.secondary">Metadata</Typography>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ flexWrap:'wrap' }}>
                  {coverMime && <Chip size="small" label={coverMime.replace('image/','').toUpperCase()} />}
                  {coverSize>0 && <Chip size="small" label={`${(coverSize/1024).toFixed(0)} KB`} />}
                  {coverThumbCid && <Chip size="small" label="thumb" />}
                </Stack>
              </Stack>
            )}
          </Stack>
          <Box sx={{
            width: { xs: '100%', md: 560 },
            height: 120,
            borderRadius: 2,
            overflow: 'hidden',
            bgcolor: '#f2f2f2',
            display:'flex',
            alignItems:'center',
            justifyContent:'center',
            position:'relative'
          }}>
            {coverUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={imgKey}
                src={coverUrl}
                alt="cover"
                style={{ width:'100%', height:'100%', objectFit:'cover' }}
                onError={(e)=>{
                  const tried = (e.currentTarget as any)._gwTry || 0
                  ;(e.currentTarget as any)._gwTry = tried + 1
                  const cThumb = coverThumbCid
                  const cMain = coverCid
                  const fallbacks: string[] = []
                  if (cThumb) fallbacks.push(`https://dweb.link/ipfs/${cThumb}`, `https://cf-ipfs.com/ipfs/${cThumb}`)
                  if (cMain) fallbacks.push(`https://dweb.link/ipfs/${cMain}`, `https://cf-ipfs.com/ipfs/${cMain}`)
                  if (coverPreview) fallbacks.push(coverPreview)
                  if (tried < fallbacks.length) {
                    e.currentTarget.src = fallbacks[tried]
                  }
                }}
              />
            ) : (
              <Avatar variant="rounded" sx={{ width: 160, height: 120, fontSize: 16 }}>Cover</Avatar>
            )}
            {/* overlay de acciones removido: ahora están en el menú principal */}
          </Box>
        </Stack>
      </Paper>

      <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 }, mb: 3, borderRadius: 2 }}>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>Clasificación</Typography>
          <Tooltip title="Facilita el descubrimiento con categorías y tags relevantes."><InfoOutlinedIcon fontSize="small" color="action" /></Tooltip>
        </Stack>
        <Autocomplete
          multiple
          options={CATEGORY_OPTIONS}
          value={categoriesSel}
          onChange={(_, v)=>setCategoriesSel(v)}
          renderTags={(value, getTagProps) => value.map((option, index) => (
            <Chip variant="outlined" label={option} {...getTagProps({ index })} key={option} />
          ))}
          renderInput={(params) => (
            <TextField {...params} label="Categorías" placeholder="Selecciona una o varias" error={!!errors.categories} helperText={errors.categories || 'Ej.: nlp, vision'} />
          )}
        />

        <Autocomplete
          multiple
          options={TAG_OPTIONS}
          value={tagsSel}
          onChange={(_, v)=>setTagsSel(v)}
          renderTags={(value, getTagProps) => value.map((option, index) => (
            <Chip variant="outlined" label={option} {...getTagProps({ index })} key={option} />
          ))}
          renderInput={(params) => (
            <TextField {...params} label="Tags" placeholder="Selecciona tags" helperText="Tecnologías/formatos (pytorch, onnx, etc.)" />
          )}
        />
      </Paper>

      <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 }, mb: 3, borderRadius: 2 }}>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>Autoría</Typography>
          <Tooltip title="Información visible del autor del modelo."><InfoOutlinedIcon fontSize="small" color="action" /></Tooltip>
        </Stack>
        <Stack spacing={2}>
          <TextField
            label="Autor o responsable"
            value={authorDisplay}
            onChange={(e)=>setAuthorDisplay(e.target.value)}
            fullWidth
          />
          <Stack spacing={1}>
            <Typography variant="subtitle1">Redes del autor</Typography>
            <Grid container spacing={2}>
              {SOCIALS.map(s => (
                <Grid item xs={12} md={6} key={s.key}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    {s.icon}
                    <TextField
                      fullWidth
                      label={s.label}
                      value={socialValues[s.key] || ''}
                      onChange={(e)=>setSocialValues(v=>({...v, [s.key]: e.target.value}))}
                      placeholder={s.placeholder}
                    />
                  </Stack>
                </Grid>
              ))}
            </Grid>
            <FormHelperText>Ninguno es obligatorio. Agrega tus redes si quieres mostrarlas en la ficha del modelo.</FormHelperText>
          </Stack>
        </Stack>
      </Paper>

      <Divider sx={{ my: 2 }} />

      {/* Spacer para no tapar contenido con la barra fija */}
      <Box sx={{ height: { xs: 76, md: 72 } }} />

      {/* Barra fija inferior */}
      <Box sx={{ position:'fixed', bottom: 0, left: 0, right: 0, zIndex: (t)=>t.zIndex.appBar + 1 }}>
        <Paper elevation={3} sx={{ borderRadius: 0, px: { xs:1.5, md:2 }, py: 1 }}>
          <Box sx={{ maxWidth: 1000, mx: 'auto', width:'100%' }}>
            {/* Móvil: tres posiciones con Guardar centrado */}
            <Box sx={{ display:{ xs:'flex', md:'none' }, alignItems:'center', justifyContent:'space-between', width:'100%' }}>
              <Button size="small" href={base} onClick={(e)=>navigateAfterSave(e, base)} variant="text" color="inherit" startIcon={<ArrowBackIcon />} sx={{ borderRadius: 2, textTransform:'none', py: 0.75, whiteSpace:'nowrap', fontSize:{ xs:12, md:14 }, '& .MuiButton-startIcon': { mr: 0.5, '& svg': { fontSize: 18 } } }}>
                Atrás
              </Button>
              <Button size="small" onClick={onSave} disabled={saving} variant="text" color="primary" startIcon={<SaveOutlinedIcon />} sx={{ borderRadius: 2, textTransform:'none', py: 0.75, whiteSpace:'nowrap', fontSize:{ xs:12, md:14 }, '& .MuiButton-startIcon': { mr: 0.5, '& svg': { fontSize: 18 } } }}>
                {saving? 'Guardando...' : 'Guardar borrador'}
              </Button>
              <Button size="small" href={`${base}/step2`} onClick={(e)=>navigateAfterSave(e, `${base}/step2`)} disabled={!isStepValid()} variant="text" color="inherit" endIcon={<ArrowForwardIcon />} sx={{ borderRadius: 2, textTransform:'none', py: 0.75, whiteSpace:'nowrap', fontSize:{ xs:12, md:14 }, '& .MuiButton-endIcon': { ml: 0.5, '& svg': { fontSize: 18 } } }}>
                Siguiente
              </Button>
            </Box>

            {/* Desktop: Atrás izquierda; Guardar + Siguiente a la derecha */}
            <Box sx={{ display:{ xs:'none', md:'flex' }, alignItems:'center', justifyContent:'space-between', gap: 1.25 }}>
              <Button href={base} onClick={(e)=>navigateAfterSave(e, base)} variant="text" color="inherit" startIcon={<ArrowBackIcon />} sx={{ borderRadius: 2, textTransform:'none', py: 1 }}>
                Atrás
              </Button>
              <Box sx={{ display:'flex', gap: 1.25 }}>
                <Button onClick={onSave} disabled={saving} variant="text" color="primary" startIcon={<SaveOutlinedIcon />} sx={{ borderRadius: 2, textTransform:'none', py: 1 }}>
                  {saving? 'Guardando...' : 'Guardar borrador'}
                </Button>
                <Button href={`${base}/step2`} onClick={(e)=>navigateAfterSave(e, `${base}/step2`)} disabled={!isStepValid()} variant="text" color="inherit" endIcon={<ArrowForwardIcon />} sx={{ borderRadius: 2, textTransform:'none', py: 1 }}>
                  Siguiente
                </Button>
              </Box>
            </Box>
          </Box>
        </Paper>
      </Box>

      {msg && <Typography sx={{ mt:1 }} color={msg==='Guardado' ? 'success.main' : 'warning.main'}>{msg}</Typography>}
    </Box>
  )
}

function safeIsJson(s: string) {
  try { JSON.parse(s); return true } catch { return false }
}
