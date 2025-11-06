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
  ListItemText,
  LinearProgress,
  SvgIcon,
  Skeleton
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
import { useLocale, useTranslations } from 'next-intl'

const XIcon = (props: any) => (
  <SvgIcon {...props} viewBox="0 0 24 24">
    <path d="M3 2l8 10-8 10h3l6.5-8L19 22h3l-8-10 8-10h-3l-6.5 8L6 2H3z" fill="currentColor" />
  </SvgIcon>
)

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

async function loadDraft(): Promise<any> {
  let addr: string | null = null
  try { addr = await (window as any)?.ethereum?.request?.({ method: 'eth_accounts' }).then((a: string[]) => a?.[0] || null) } catch {}
  const res = await fetch('/api/models/draft' + (addr ? `?address=${addr}` : ''), { method: 'GET', headers: addr ? { 'X-Wallet-Address': addr } : {} })
  return res.json()
}

export default function Step1BasicsLocalized() {
  const t = useTranslations()
  const locale = useLocale()
  const base = `/${locale}/publish/wizard`

  const [saving, setSaving] = useState(false)
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
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
  const SOCIALS = useMemo(() => [
    { key:'github', label:'GitHub', placeholder:'https://github.com/usuario', icon:<GitHubIcon fontSize="small" /> },
    { key:'website', label:'Website', placeholder:'https://tu-sitio.dev', icon:<LanguageIcon fontSize="small" /> },
    { key:'twitter', label:'X', placeholder:'https://x.com/usuario', icon:<XIcon fontSize="small" /> },
    { key:'linkedin', label:'LinkedIn', placeholder:'https://www.linkedin.com/in/usuario', icon:<LinkedInIcon fontSize="small" /> },
  ], [])
  const [socialValues, setSocialValues] = useState<Record<string,string>>({})
  const [msg, setMsg] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [errors, setErrors] = useState<{name?:string; slug?:string; categories?:string}>({})
  const { walletAddress } = useWalletAddress()
  const didMountRef = useRef(false)
  const loadingFromDraftRef = useRef(false)
  const lastSavedRef = useRef<any>(null)
  const autoSaveDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [loadingDraft, setLoadingDraft] = useState(false)
  const [shouldFade, setShouldFade] = useState(true)
  const [loadedRemote, setLoadedRemote] = useState(false)

  // Autoload draft on mount and when wallet changes, with cache hydration
  useEffect(() => {
    let alive = true
    // Hydrate from local cache first to avoid empty initial render
    try {
      const raw = localStorage.getItem('draft_step1')
      if (raw) {
        const s1 = JSON.parse(raw)
        setName(s1?.name || '')
        setShortSummary(s1?.shortSummary || '')
        setSlug(s1?.slug || '')
        setCategoriesSel(Array.isArray(s1?.categories)? s1.categories : [])
        setTagsSel(Array.isArray(s1?.tags)? s1.tags : [])
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
        try { lastSavedRef.current = s1 } catch {}
        setShouldFade(false)
      }
    } catch {}
    loadingFromDraftRef.current = true
    setLoadingDraft(true)
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
      try { lastSavedRef.current = s1 } catch {}
    }).catch(()=>{})
    .finally(()=>{ loadingFromDraftRef.current = false; setLoadingDraft(false); setLoadedRemote(true) })
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
      const tmo = setTimeout(()=>finish(false), timeoutMs)
      img.onload = () => { clearTimeout(tmo); finish(true) }
      img.onerror = () => { clearTimeout(tmo); finish(false) }
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
    const ok = window.confirm(t('wizard.step1.confirm.removeCover'))
    if (!ok) return
    const prevMain = coverCid
    const prevThumb = coverThumbCid
    setCoverCid(''); setCoverThumbCid(''); setCoverDisplayUrl(''); setCoverPreview(''); setCoverMime(''); setCoverSize(0)
    try { await unpinCid(prevMain); await unpinCid(prevThumb); setCoverMsg(t('wizard.step1.cover.removed')) } catch { setCoverMsg(t('wizard.step1.cover.removedSlow')) }
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
      try { if (coverPreview?.startsWith('blob:')) URL.revokeObjectURL(coverPreview) } catch {}
      const nextVersion = coverVersion + 1
      setCoverVersion(nextVersion)
      const url = URL.createObjectURL(f)
      setCoverPreview(url)
      setCoverDisplayUrl(url)
      setImgKey(String(Date.now()))
      setCoverCid(''); setCoverThumbCid('')
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
    if (!f) { setCoverMsg(t('wizard.step1.cover.helper')); return }
    setCoverMsg('')
    const ALLOWED = ['image/png','image/jpeg','image/webp']
    if (!ALLOWED.includes(f.type)) { setCoverMsg(t('wizard.step1.cover.errorFormat')); return }
    const MAX = 5 * 1024 * 1024
    if (f.size > MAX) { setCoverMsg(t('wizard.step1.cover.errorSize')); return }
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
      setCoverMsg(t('wizard.step1.cover.uploaded'))
      if (coverPreview) setCoverDisplayUrl(coverPreview)
      setPromoting(true)
      promoteCoverToIPFS(coverVersion).finally(()=>setPromoting(false))
      if (prevMain && prevMain!==main.cid) unpinCid(prevMain)
      if (prevThumb && prevThumb!==thumb.cid) unpinCid(prevThumb)
    } catch (e:any) {
      setCoverMsg(`Error: ${String(e?.message||e)}`)
    } finally {
      setCoverUploading(false)
    }
  }

  const isMeaningful = (d: any) => {
    const nameOk = (d?.name||'').trim()
    const sumOk = (d?.shortSummary||'').trim()
    const cats = Array.isArray(d?.categories) ? d.categories : []
    const tags = Array.isArray(d?.tags) ? d.tags : []
    const author = (d?.author?.displayName||'').trim()
    const cov = d?.cover
    return Boolean(nameOk || sumOk || cats.length>0 || tags.length>0 || author || (cov && (cov.cid || cov.thumbCid)))
  }

  const shallowEqualJSON = (a:any,b:any) => { try { return JSON.stringify(a)===JSON.stringify(b) } catch { return false } }

  const onSave = async (reason?: 'autosave'|'manual') => {
    const nextErrors: typeof errors = {}
    if (!name.trim()) nextErrors.name = t('wizard.step1.errors.required')
    if (categoriesSel.length === 0) nextErrors.categories = t('wizard.step1.errors.categoriesRequired')
    setErrors(nextErrors)
    if (reason!== 'autosave' && Object.keys(nextErrors).length) { setMsg(t('wizard.step1.errors.fixMarked')); return }
    setSaving(true)
    setMsg('')
    const linksObj = Object.fromEntries(Object.entries(socialValues).filter(([_,v])=>v && v.trim()))

    const payload = {
      address: walletAddress,
      step: 'step1',
      data: {
        name, shortSummary,
        categories: categoriesSel,
        tags: tagsSel,
        author: { displayName: authorDisplay, links: linksObj },
        cover: coverCid ? { cid: coverCid, thumbCid: coverThumbCid, mime: coverMime, size: coverSize } : undefined
      }
    }
    if (reason==='autosave') {
      if (loadingFromDraftRef.current) { setSaving(false); return }
      if (!isMeaningful(payload.data)) { setSaving(false); return }
      if (lastSavedRef.current && shallowEqualJSON(lastSavedRef.current, payload.data)) { setSaving(false); return }
    }
    try {
      await saveDraft(payload)
      setMsg(t('wizard.common.saved'))
      lastSavedRef.current = payload.data
      try { localStorage.setItem('draft_step1', JSON.stringify(payload.data)) } catch {}
    } catch (e: any) {
      setMsg(t('wizard.common.errorSaving'))
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
    if (coverUploading) return
    await onSave()
    window.location.href = url
  }

  // Debounced autosave on important changes
  useEffect(() => {
    if (!didMountRef.current) { didMountRef.current = true; return }
    if (autoSaveDebounceRef.current) clearTimeout(autoSaveDebounceRef.current)
    autoSaveDebounceRef.current = setTimeout(() => {
      if (!saving && !loadingFromDraftRef.current) onSave('autosave')
    }, 700)
    return () => { if (autoSaveDebounceRef.current) clearTimeout(autoSaveDebounceRef.current) }
  }, [name, shortSummary, categoriesSel, tagsSel, authorDisplay, socialValues, coverCid, coverThumbCid, coverMime, coverSize, saving])

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: 1000, mx: 'auto' }}>
      {(loadingDraft || coverUploading) && (
        <Box sx={{ mb: 1 }}>
          <LinearProgress />
        </Box>
      )}
      <Stack spacing={2} sx={{ mb: 2 }}>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>{t('wizard.step1.title')}</Typography>
        <Typography variant="body1" color="text.secondary">
          {t('wizard.step1.subtitle')}
        </Typography>
      </Stack>

      <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 }, mb: 3, borderRadius: 2 }}>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>{t('wizard.step1.sections.identity.title')}</Typography>
          <Tooltip title={t('wizard.step1.sections.identity.help')}><InfoOutlinedIcon fontSize="small" color="action" /></Tooltip>
        </Stack>
        {loadingDraft ? (
          <Stack spacing={2}>
            <Skeleton animation="wave" variant="rounded" height={56} />
            <Skeleton animation="wave" variant="rounded" height={96} />
          </Stack>
        ) : (
          <Box sx={{ transition:'opacity 150ms ease 40ms', willChange:'opacity', opacity: shouldFade ? (loadedRemote ? 1 : 0) : 1, minHeight: 160 }}>
          <Stack spacing={2}>
            <TextField
              label={t('wizard.step1.fields.name.label')}
              value={name}
              onChange={(e)=>onNameChange(e.target.value)}
              placeholder={t('wizard.step1.fields.name.placeholder')}
              fullWidth
              error={!!errors.name}
              helperText={errors.name || t('wizard.step1.fields.name.helper')}
            />

            <TextField
              label={t('wizard.step1.fields.summary.label')}
              value={shortSummary}
              onChange={(e)=>setShortSummary(e.target.value)}
              placeholder={t('wizard.step1.fields.summary.placeholder')}
              multiline rows={3}
              fullWidth
            />
          </Stack>
          </Box>
        )}
      </Paper>

      <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 }, mb: 3, borderRadius: 2 }}>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>{t('wizard.step1.sections.cover.title')}</Typography>
          <Tooltip title={t('wizard.step1.sections.cover.help')}><InfoOutlinedIcon fontSize="small" color="action" /></Tooltip>
        </Stack>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
          <Button component="label" variant="outlined">
            {t('wizard.step1.buttons.chooseImage')}
            <input ref={fileInputRef} hidden type="file" accept="image/png,image/jpeg,image/webp" onChange={onSelectCover} />
          </Button>
          <Button variant="contained" onClick={onUploadCover} disabled={!coverFile || coverUploading}>{coverUploading? t('wizard.step1.cover.uploading') : t('wizard.step1.buttons.uploadCover')}</Button>
          <Tooltip title={t('wizard.step1.buttons.refresh')}>
            <IconButton onClick={handleMenuOpen} size="medium" sx={{ height: 40 }}>
              <MoreVertIcon />
            </IconButton>
          </Tooltip>
          <Menu anchorEl={menuAnchor} open={openMenu} onClose={handleMenuClose} anchorOrigin={{ vertical:'bottom', horizontal:'left' }}>
            <MenuItem onClick={()=>{ handleMenuClose(); onRefreshCover() }} disabled={promoting}>
              <ListItemIcon><RefreshIcon fontSize="small"/></ListItemIcon>
              <ListItemText>{promoting? '...' : t('wizard.step1.buttons.refresh')}</ListItemText>
            </MenuItem>
            <MenuItem onClick={()=>{ handleMenuClose(); openCoverInIPFS() }} disabled={!(coverCid || coverThumbCid)}>
              <ListItemIcon><OpenInNewIcon fontSize="small"/></ListItemIcon>
              <ListItemText>{t('wizard.step1.buttons.viewInIPFS')}</ListItemText>
            </MenuItem>
            <MenuItem onClick={()=>{ handleMenuClose(); copyToClipboard(coverCid) }} disabled={!coverCid}>
              <ListItemIcon><ContentCopyIcon fontSize="small"/></ListItemIcon>
              <ListItemText>{t('wizard.step1.buttons.copyCid')}</ListItemText>
            </MenuItem>
            <MenuItem onClick={()=>{ handleMenuClose(); onRemoveCover() }} disabled={!(coverCid || coverThumbCid)}>
              <ListItemIcon><DeleteOutlineIcon fontSize="small"/></ListItemIcon>
              <ListItemText>{t('wizard.step1.buttons.remove')}</ListItemText>
            </MenuItem>
          </Menu>
        </Stack>

        <Stack direction={{ xs:'column', md:'row' }} spacing={3} alignItems={{ xs:'stretch', md:'center' }}>
          <Stack spacing={1} sx={{ flex: 1 }}>
            <FormHelperText>{t('wizard.step1.cover.helper')}</FormHelperText>
            {coverMsg && <FormHelperText sx={{ color: coverMsg.includes('Error')? 'error.main' : 'success.main' }}>{coverMsg}</FormHelperText>}
            {(coverCid || coverThumbCid) && (
              <Stack spacing={0.5}>
                <Typography variant="caption" color="text.secondary">{t('wizard.step1.cover.meta')}</Typography>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ flexWrap:'wrap' }}>
                  {coverMime && <Chip size="small" label={coverMime.replace('image/','').toUpperCase()} />}
                  {coverSize>0 && <Chip size="small" label={`${(coverSize/1024).toFixed(0)} KB`} />}
                  {coverThumbCid && <Chip size="small" label={t('wizard.step1.cover.thumb')} />}
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
            {loadingDraft && !coverUrl ? (
              <Skeleton animation="wave" variant="rounded" width="100%" height="100%" />
            ) : coverUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={imgKey}
                src={coverUrl}
                alt="cover"
                loading="lazy"
                style={{ width:'100%', height:'100%', objectFit:'contain', objectPosition:'center center', display:'block' }}
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
              <Avatar variant="rounded" sx={{ width: 160, height: 120, fontSize: 16 }}>{t('wizard.step1.cover.placeholder')}</Avatar>
            )}
          </Box>
        </Stack>
      </Paper>

      <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 }, mb: 3, borderRadius: 2 }}>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>{t('wizard.step1.sections.classification.title')}</Typography>
          <Tooltip title={t('wizard.step1.sections.classification.help')}><InfoOutlinedIcon fontSize="small" color="action" /></Tooltip>
        </Stack>
        {loadingDraft ? (
          <Stack spacing={2}>
            <Skeleton animation="wave" variant="rounded" height={56} />
            <Skeleton animation="wave" variant="rounded" height={56} />
          </Stack>
        ) : (
          <Box sx={{ transition:'opacity 150ms ease 40ms', willChange:'opacity', opacity: shouldFade ? (loadedRemote ? 1 : 0) : 1, minHeight: 160 }}>
            <Autocomplete
              multiple
              options={CATEGORY_OPTIONS}
              value={categoriesSel}
              onChange={(_, v)=>setCategoriesSel(v)}
              renderTags={(value, getTagProps) => value.map((option, index) => (
                <Chip variant="outlined" label={option} {...getTagProps({ index })} key={option} />
              ))}
              renderInput={(params) => (
                <TextField {...params} label={t('wizard.step1.fields.categories.label')} placeholder={t('wizard.step1.fields.categories.placeholder')} error={!!errors.categories} helperText={errors.categories || t('wizard.step1.fields.categories.helper')} />
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
                <TextField {...params} label={t('wizard.step1.fields.tags.label')} placeholder={t('wizard.step1.fields.tags.placeholder')} helperText={t('wizard.step1.fields.tags.helper')} />
              )}
            />
          </Box>
        )}
      </Paper>

      <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 }, mb: 3, borderRadius: 2 }}>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>{t('wizard.step1.sections.authorship.title')}</Typography>
          <Tooltip title={t('wizard.step1.sections.authorship.help')}><InfoOutlinedIcon fontSize="small" color="action" /></Tooltip>
        </Stack>
        {loadingDraft ? (
          <Stack spacing={2}>
            <Skeleton animation="wave" variant="rounded" height={56} />
            <Stack spacing={1}>
              <Skeleton animation="wave" variant="text" width={180} />
              <Grid container spacing={2}>
                {Array.from({ length: 4 }).map((_, i)=>(
                  <Grid item xs={12} md={6} key={i}>
                    <Skeleton animation="wave" variant="rounded" height={56} />
                  </Grid>
                ))}
              </Grid>
              <Skeleton animation="wave" variant="text" width={220} />
            </Stack>
          </Stack>
        ) : (
          <Box sx={{ transition:'opacity 150ms ease 40ms', willChange:'opacity', opacity: shouldFade ? (loadedRemote ? 1 : 0) : 1, minHeight: 200 }}>
          <Stack spacing={2}>
            <TextField
              label={t('wizard.step1.fields.author.label')}
              value={authorDisplay}
              onChange={(e)=>setAuthorDisplay(e.target.value)}
              fullWidth
            />
            <Stack spacing={1}>
              <Typography variant="subtitle1">{t('wizard.step1.fields.socials.title')}</Typography>
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
              <FormHelperText>{t('wizard.step1.fields.socials.helper')}</FormHelperText>
            </Stack>
          </Stack>
          </Box>
        )}
      </Paper>

      <Divider sx={{ my: 2 }} />

      <Box sx={{ height: { xs: 76, md: 72 } }} />

      <Box sx={{ position:'fixed', bottom: 0, left: 0, right: 0, zIndex: (t)=>t.zIndex.appBar + 1 }}>
        <Paper elevation={3} sx={{ borderRadius: 0, px: { xs:1.5, md:2 }, py: 1 }}>
          <Box sx={{ maxWidth: 1000, mx: 'auto', width:'100%' }}>
            <Box sx={{ display:{ xs:'flex', md:'none' }, alignItems:'center', justifyContent:'space-between', width:'100%' }}>
              <Button size="small" href={base} onClick={(e)=>navigateAfterSave(e, base)} disabled={coverUploading} variant="text" color="inherit" startIcon={<ArrowBackIcon />} sx={{ borderRadius: 2, textTransform:'none', py: 0.75, whiteSpace:'nowrap', fontSize:{ xs:12, md:14 }, '& .MuiButton-startIcon': { mr: 0.5, '& svg': { fontSize: 18 } } }}>
                {t('wizard.common.back')}
              </Button>
              <Button size="small" onClick={()=>onSave('manual')} disabled={saving} variant="text" color="primary" startIcon={<SaveOutlinedIcon />} sx={{ borderRadius: 2, textTransform:'none', py: 0.75, whiteSpace:'nowrap', fontSize:{ xs:12, md:14 }, '& .MuiButton-startIcon': { mr: 0.5, '& svg': { fontSize: 18 } } }}>
                {saving? t('wizard.common.saving') : t('wizard.common.saveDraft')}
              </Button>
              <Button size="small" href={`${base}/step2`} onClick={(e)=>navigateAfterSave(e, `${base}/step2`)} disabled={!isStepValid() || coverUploading} variant="text" color="inherit" endIcon={<ArrowForwardIcon />} sx={{ borderRadius: 2, textTransform:'none', py: 0.75, whiteSpace:'nowrap', fontSize:{ xs:12, md:14 }, '& .MuiButton-endIcon': { ml: 0.5, '& svg': { fontSize: 18 } } }}>
                {t('wizard.common.next')}
              </Button>
            </Box>
            <Box sx={{ display:{ xs:'none', md:'flex' }, alignItems:'center', justifyContent:'space-between', gap: 1.25 }}>
              <Button href={base} onClick={(e)=>navigateAfterSave(e, base)} disabled={coverUploading} variant="text" color="inherit" startIcon={<ArrowBackIcon />} sx={{ borderRadius: 2, textTransform:'none', py: 1 }}>
                {t('wizard.common.back')}
              </Button>
              <Box sx={{ display:'flex', gap: 1.25 }}>
                <Button onClick={()=>onSave('manual')} disabled={saving} variant="text" color="primary" startIcon={<SaveOutlinedIcon />} sx={{ borderRadius: 2, textTransform:'none', py: 1 }}>
                  {saving? t('wizard.common.saving') : t('wizard.common.saveDraft')}
                </Button>
                <Button href={`${base}/step2`} onClick={(e)=>navigateAfterSave(e, `${base}/step2`)} disabled={!isStepValid() || coverUploading} variant="text" color="inherit" endIcon={<ArrowForwardIcon />} sx={{ borderRadius: 2, textTransform:'none', py: 1 }}>
                  {t('wizard.common.next')}
                </Button>
              </Box>
              {(loadingDraft || coverUploading) && (
                <Typography variant="caption" color="text.secondary" sx={{ ml: 2 }}>
                  {loadingDraft ? t('wizard.common.loadingDraft') : t('wizard.common.uploadInProgress')}
                </Typography>
              )}
            </Box>
          </Box>
        </Paper>
      </Box>

      {msg && <Typography sx={{ mt:1 }} color={msg===t('wizard.common.saved') ? 'success.main' : 'warning.main'}>{msg}</Typography>}
    </Box>
  )
}
