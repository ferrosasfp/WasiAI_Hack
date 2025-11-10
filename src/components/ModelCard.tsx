 
"use client";
import React from 'react'
import { useTranslations } from 'next-intl'
import { useConnectModal } from '@rainbow-me/rainbowkit'
import Link from 'next/link'
import Image from 'next/image'
import { Card, CardActionArea, CardContent, CardMedia, Stack, Typography, Chip, Box, Button, Tooltip } from '@mui/material'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import ScienceIcon from '@mui/icons-material/Science'
import CloudDoneIcon from '@mui/icons-material/CloudDone'
import DownloadDoneIcon from '@mui/icons-material/DownloadDone'
import SwapHorizIcon from '@mui/icons-material/SwapHoriz'
import SettingsIcon from '@mui/icons-material/Settings'

// Global controls to avoid bursts across many cards
const __g: any = globalThis as any
__g.__cardMetaSem = __g.__cardMetaSem || { count: 0, max: Number(process.env.NEXT_PUBLIC_CARD_META_CONCURRENCY || 5) }
__g.__cardMetaInflight = __g.__cardMetaInflight || new Map<string, Promise<any>>()
__g.__cardMetaCache = __g.__cardMetaCache || new Map<string, any>()
const CARD_SEM = __g.__cardMetaSem as { count: number; max: number }
const META_INFLIGHT = __g.__cardMetaInflight as Map<string, Promise<any>>
const META_CACHE = __g.__cardMetaCache as Map<string, any>
async function acquireCard() {
  while (CARD_SEM.count >= CARD_SEM.max) await new Promise(r=>setTimeout(r, 8))
  CARD_SEM.count++
}
function releaseCard() { CARD_SEM.count = Math.max(0, CARD_SEM.count - 1) }

export type ModelCardData = {
  slug: string
  name: string
  summary: string
  description?: string
  cover?: string
  uri?: string
  categories?: string[]
  tags?: string[]
  author?: string
  valueProposition?: string
  industries?: string[]
  useCases?: string[]
  expectedBusinessImpact?: string
  inputs?: string
  outputs?: string
  knownLimitations?: string
  prohibitedUses?: string
  tasks?: string[]
  frameworks?: string[]
  architectures?: string[]
  precision?: string[]
  fileFormats?: string[]
  minResources?: string
  runtimeSystems?: string[]
  pricePerpetual?: string
  priceSubscription?: string
  creatorRoyaltyBps?: number
  rights?: { api?: boolean; download?: boolean; transferable?: boolean }
  deliveryMode?: string
  artifacts?: boolean
  demoPreset?: boolean
}

function ConnectWalletInline({ }: { locale: string }) {
  const { openConnectModal } = useConnectModal()
  const t = useTranslations('modelCard')
  return (
    <Button size="small" variant="outlined" onClick={()=> openConnectModal?.()}>
      {t('connect')}
    </Button>
  )
}

export function ModelCard({ locale, data, href: hrefProp, showConnect, priority, onMeta, preMeta }: { locale: string; data: ModelCardData; href?: string; showConnect?: boolean; priority?: boolean; onMeta?: (id: string, meta: any) => void; preMeta?: any }) {
  const defaultHref = data.slug ? `/${locale}/models/${data.slug}` : undefined
  const href = hrefProp || defaultHref
  const t = useTranslations('modelCard')
  const [coverSrc, setCoverSrc] = React.useState<string | undefined>(undefined)
  const rootRef = React.useRef<HTMLDivElement | null>(null)
  const [author, setAuthor] = React.useState<string | undefined>(data.author)
  const [categories, setCategories] = React.useState<string[]>(Array.isArray(data.categories) ? data.categories : [])
  const [tasks, setTasks] = React.useState<string[]>(Array.isArray(data.tasks) ? data.tasks : [])
  const [tags, setTags] = React.useState<string[]>(Array.isArray(data.tags) ? data.tags : [])
  const [architectures, setArchitectures] = React.useState<string[]>(Array.isArray(data.architectures) ? data.architectures : [])
  const [frameworks, setFrameworks] = React.useState<string[]>(Array.isArray(data.frameworks) ? data.frameworks : [])
  const [precision, setPrecision] = React.useState<string[]>(Array.isArray(data.precision) ? data.precision : [])
  const [rights, setRights] = React.useState<{ api?: boolean; download?: boolean; transferable?: boolean } | undefined>(data.rights)
  const [deliveryMode, setDeliveryMode] = React.useState<string | undefined>(data.deliveryMode)
  const [valueProposition, setValueProposition] = React.useState<string | undefined>(data.valueProposition)
  const [description, setDescription] = React.useState<string | undefined>(data.description)
  const [demoPreset, setDemoPreset] = React.useState<boolean | undefined>(data.demoPreset)
  const [artifacts, setArtifacts] = React.useState<boolean | undefined>(data.artifacts)
  const strMeta = React.useCallback((v: any): string => {
    if (v == null) return ''
    if (typeof v === 'string') return v
    if (typeof v === 'object') {
      const n = v.name || v.framework || v.arch || v.type || ''
      const ver = v.version || v.ver || v.v || ''
      const a = String(n || '').trim()
      const b = String(ver || '').trim()
      return [a, b].filter(Boolean).join(' ')
    }
    try { return String(v) } catch { return '' }
  }, [])
  // Aplicar preMeta inmediatamente si viene desde la página
  React.useEffect(()=>{
    const meta: any = preMeta
    if (!meta) return
    const a = (typeof meta?.author === 'string' && meta.author) || (meta?.author && typeof meta.author === 'object' && typeof meta.author.displayName === 'string' && meta.author.displayName) || (typeof meta?.creator === 'string' ? meta.creator : undefined)
    if (!author && a) setAuthor(a)
    if (!valueProposition && typeof meta?.valueProposition === 'string') setValueProposition(meta.valueProposition)
    if (!description) {
      const desc = (typeof meta?.description === 'string' && meta.description) || (typeof meta?.summary === 'string' && meta.summary) || (typeof meta?.shortSummary === 'string' && meta.shortSummary) || (typeof meta?.shortDescription === 'string' && meta.shortDescription) || (typeof meta?.short_desc === 'string' && meta.short_desc) || (typeof meta?.overview === 'string' && meta.overview) || (typeof meta?.subtitle === 'string' && meta.subtitle) || undefined
      if (desc) setDescription(desc)
    }
    if (!categories?.length && Array.isArray(meta?.categories)) setCategories(meta.categories)
    if (!tasks?.length) setTasks(Array.isArray(meta?.tasks) ? meta.tasks : (Array.isArray(meta?.capabilities?.tasks) ? meta.capabilities.tasks : tasks))
    if (!tags?.length) {
      const tagsA = Array.isArray(meta?.tags) ? meta.tags : []
      const tagsB = Array.isArray(meta?.capabilities?.tags) ? meta.capabilities.tags : []
      const mods = Array.isArray(meta?.modalities) ? meta.modalities : (Array.isArray(meta?.capabilities?.modalities) ? meta.capabilities.modalities : [])
      const uniq = Array.from(new Set([...tagsA, ...tagsB, ...mods].filter(Boolean).map(String)))
      if (uniq.length) setTags(uniq)
    }
    if (!architectures?.length) {
      const arch = Array.isArray(meta?.architectures) ? meta.architectures : (Array.isArray(meta?.architecture?.architectures) ? meta.architecture.architectures : architectures)
      if (Array.isArray(arch)) setArchitectures(arch.map(strMeta).filter(Boolean))
    }
    if (!frameworks?.length) {
      const fw = Array.isArray(meta?.frameworks) ? meta.frameworks : (Array.isArray(meta?.architecture?.frameworks) ? meta.architecture.frameworks : frameworks)
      if (Array.isArray(fw)) setFrameworks(fw.map(strMeta).filter(Boolean))
    }
    if (!precision?.length) {
      const prec = Array.isArray(meta?.precision) ? meta.precision : (Array.isArray(meta?.architecture?.precisions) ? meta.architecture.precisions : precision)
      if (Array.isArray(prec)) setPrecision(prec.map(strMeta).filter(Boolean))
    }
    if (!rights) {
      let rightsObj: { api?: boolean; download?: boolean; transferable?: boolean } | undefined = undefined
      if (meta?.rights && typeof meta.rights === 'object') {
        rightsObj = { api: !!meta.rights.api, download: !!meta.rights.download, transferable: !!meta.rights.transferable }
      } else if (meta?.licensePolicy) {
        const r = meta.licensePolicy.rights
        const rightsArr = Array.isArray(r) ? r.map((x:any)=> String(x).toLowerCase()) : []
        rightsObj = { api: rightsArr.includes('api'), download: rightsArr.includes('download'), transferable: !!meta.licensePolicy.transferable }
      }
      if (rightsObj) setRights(rightsObj)
    }
    if (!deliveryMode) {
      const mode = (typeof meta?.deliveryMode === 'string' && meta.deliveryMode) || (typeof meta?.delivery?.mode === 'string' && meta.delivery.mode) || (Array.isArray(meta?.licensePolicy?.delivery) ? (()=>{
        const d = meta.licensePolicy.delivery.map((x:any)=> String(x).toLowerCase()); return d.includes('api') && d.includes('download') ? 'both' : d.includes('api') ? 'api' : d.includes('download') ? 'download' : undefined
      })() : undefined)
      if (mode) setDeliveryMode(mode)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preMeta])
  const toHttpFromIpfs = React.useCallback((u: string): string => {
    if (!u) return ''
    // ipfs URI scheme
    if (u.startsWith('ipfs://')) return `/api/ipfs/ipfs/${u.replace('ipfs://','')}`
    // explicit /ipfs path
    if (u.startsWith('/ipfs/')) return `/api/ipfs${u}`
    // bare CID or CID with path (no scheme/host)
    const cidv0 = /^Qm[1-9A-Za-z]{44}(?:\/.+)?$/
    const cidv1 = /^bafy[1-9A-Za-z]+(?:\/.+)?$/
    if (cidv0.test(u) || cidv1.test(u)) return `/api/ipfs/ipfs/${u}`
    // http(s) gateway URLs
    try {
      const url = new URL(u)
      if (url.hostname.includes('pinata.cloud') || url.hostname.includes('ipfs.io') || url.hostname.includes('cloudflare-ipfs.com')) {
        const idx = url.pathname.indexOf('/ipfs/')
        if (idx >= 0) {
          const rest = url.pathname.substring(idx + '/ipfs/'.length)
          return `/api/ipfs/ipfs/${rest}`
        }
      }
    } catch {}
    return u
  }, [])
  // Normalize initial cover if provided (bare CID, ipfs:// or gateway URL)
  React.useEffect(() => {
    if (data.cover) {
      const c = typeof data.cover === 'string' ? data.cover.trim() : data.cover
      setCoverSrc(toHttpFromIpfs(String(c || '')))
    } else {
      setCoverSrc(undefined)
    }
  }, [data.cover, toHttpFromIpfs])

  // Sync base fields from props when data changes
  React.useEffect(() => {
    setAuthor(data.author)
    setCategories(Array.isArray(data.categories) ? data.categories : [])
    setTasks(Array.isArray(data.tasks) ? data.tasks : [])
    setArchitectures(Array.isArray(data.architectures) ? data.architectures : [])
    setFrameworks(Array.isArray(data.frameworks) ? data.frameworks : [])
    setPrecision(Array.isArray(data.precision) ? data.precision : [])
    setRights(data.rights)
    setDeliveryMode(data.deliveryMode)
    setValueProposition(data.valueProposition)
    setDescription(data.description)
    setDemoPreset(data.demoPreset)
    setArtifacts(data.artifacts)
  }, [data.author, data.categories, data.tasks, data.architectures, data.frameworks, data.precision, data.rights, data.deliveryMode, data.valueProposition, data.description, data.demoPreset, data.artifacts])

  React.useEffect(() => {
    if (coverSrc) return
    const el = rootRef.current
    if (!el) return
    let alive = true
    const io = new IntersectionObserver(async (entries) => {
      const first = entries[0]
      if (!first?.isIntersecting) return
      if (coverSrc) return
      if (!data?.uri) { io.disconnect(); return }
      const uri = data.uri
      const metaUrl = uri.startsWith('http') ? uri : (uri.startsWith('ipfs://') ? `/api/ipfs/ipfs/${uri.replace('ipfs://','')}` : (uri.startsWith('/ipfs/') ? `/api/ipfs${uri}` : `/api/ipfs/ipfs/${uri}`))
      const doFetch = async () => {
        // cache first
        const cached = META_CACHE.get(metaUrl)
        if (cached) return cached
        await acquireCard()
        try {
          // de-dupe by uri
          const inflight = META_INFLIGHT.get(metaUrl)
          if (inflight) return await inflight
          const p = (async ()=>{
            let last: Response | undefined
            for (let attempt = 0; attempt < 2; attempt++) {
              try {
                const ctrl = new AbortController()
                const tm = setTimeout(() => ctrl.abort(), 2500)
                const r = await fetch(metaUrl, { cache: 'no-store', signal: ctrl.signal })
                clearTimeout(tm)
                last = r
                if (r.ok) return await r.json().catch(()=>null)
                // respect Retry-After for 429
                const ra = r.headers.get('retry-after')
                const wait = ra ? (isNaN(Number(ra)) ? Math.min(800, Math.max(0, Date.parse(ra) - Date.now())) : Math.min(800, Number(ra) * 1000)) : 120 * Math.pow(2, attempt)
                await new Promise(res=>setTimeout(res, wait + Math.floor(Math.random()*50)))
              } catch {
                await new Promise(res=>setTimeout(res, 120 * Math.pow(2, attempt)))
              }
            }
            return last && last.ok ? await last.json().catch(()=>null) : null
          })()
          META_INFLIGHT.set(metaUrl, p)
          const meta = await p
          META_INFLIGHT.delete(metaUrl)
          if (meta) META_CACHE.set(metaUrl, meta)
          return meta
        } finally {
          releaseCard()
        }
      }
      try {
        const meta: any = await doFetch()
        const img = meta?.image || meta?.image_url || meta?.thumbnail || meta?.cover?.thumbCid || meta?.cover?.cid
        if (alive && typeof img === 'string') setCoverSrc(toHttpFromIpfs(img))
        if (alive && meta) {
          try {
            const key = String((data as any)?.id ?? (data as any)?.modelId ?? (data as any)?.uri ?? '') || undefined
            if (key && typeof onMeta === 'function') onMeta(key, meta)
          } catch {}
          const a = (typeof meta?.author === 'string' && meta.author) || (meta?.author && typeof meta.author === 'object' && typeof meta.author.displayName === 'string' && meta.author.displayName) || (typeof meta?.creator === 'string' ? meta.creator : undefined)
          setAuthor(a)
          setValueProposition(typeof meta?.valueProposition === 'string' ? meta.valueProposition : valueProposition)
          const desc = (typeof meta?.description === 'string' && meta.description) || (typeof meta?.summary === 'string' && meta.summary) || (typeof meta?.shortSummary === 'string' && meta.shortSummary) || (typeof meta?.shortDescription === 'string' && meta.shortDescription) || (typeof meta?.short_desc === 'string' && meta.short_desc) || (typeof meta?.overview === 'string' && meta.overview) || (typeof meta?.subtitle === 'string' && meta.subtitle) || description
          setDescription(desc)
          setCategories(Array.isArray(meta?.categories) ? meta.categories : categories)
          setTasks(Array.isArray(meta?.tasks) ? meta.tasks : (Array.isArray(meta?.capabilities?.tasks) ? meta.capabilities.tasks : tasks))
          {
            const tagsA = Array.isArray(meta?.tags) ? meta.tags : []
            const tagsB = Array.isArray(meta?.capabilities?.tags) ? meta.capabilities.tags : []
            const mods = Array.isArray(meta?.modalities) ? meta.modalities : (Array.isArray(meta?.capabilities?.modalities) ? meta.capabilities.modalities : [])
            const merged = [...tagsA, ...tagsB, ...mods].filter(Boolean).map(String)
            const uniq = Array.from(new Set(merged))
            setTags(uniq.length ? uniq : tags)
          }
          {
            const arch = Array.isArray(meta?.architectures) ? meta.architectures : (Array.isArray(meta?.architecture?.architectures) ? meta.architecture.architectures : architectures)
            setArchitectures(Array.isArray(arch) ? arch.map(strMeta).filter(Boolean) : architectures)
          }
          {
            const fw = Array.isArray(meta?.frameworks) ? meta.frameworks : (Array.isArray(meta?.architecture?.frameworks) ? meta.architecture.frameworks : frameworks)
            setFrameworks(Array.isArray(fw) ? fw.map(strMeta).filter(Boolean) : frameworks)
          }
          {
            const prec = Array.isArray(meta?.precision) ? meta.precision : (Array.isArray(meta?.architecture?.precisions) ? meta.architecture.precisions : precision)
            setPrecision(Array.isArray(prec) ? prec.map(strMeta).filter(Boolean) : precision)
          }
          let rightsObj: { api?: boolean; download?: boolean; transferable?: boolean } | undefined = rights
          if (meta?.rights && typeof meta.rights === 'object') {
            rightsObj = { api: Boolean(meta.rights.api), download: Boolean(meta.rights.download), transferable: Boolean(meta.rights.transferable) }
          }
          if (!rightsObj && meta?.licensePolicy) {
            const r = meta.licensePolicy.rights
            const rightsArr = Array.isArray(r) ? r.map((x:any)=> String(x).toLowerCase()) : []
            rightsObj = { api: rightsArr.includes('api'), download: rightsArr.includes('download'), transferable: Boolean(meta.licensePolicy.transferable) }
          }
          setRights(rightsObj)
          let mode: string | undefined = typeof meta?.deliveryMode === 'string' ? meta.deliveryMode : (typeof meta?.delivery?.mode === 'string' ? meta.delivery.mode : deliveryMode)
          if (!mode && rightsObj) {
            if (rightsObj.api && rightsObj.download) mode = 'both'
            else if (rightsObj.api) mode = 'api'
            else if (rightsObj.download) mode = 'download'
          }
          setDeliveryMode(mode)
          setDemoPreset(Boolean(meta?.demoPreset))
          setArtifacts(Boolean(meta?.artifacts))
        }
      } catch {}
      io.disconnect()
    }, { rootMargin: '800px 0px' })
    io.observe(el)
    return () => { alive = false; io.disconnect() }
  }, [coverSrc, data?.uri, toHttpFromIpfs])
  const techLine = React.useMemo(()=>{
    const a = architectures && architectures[0]
    const f = frameworks && frameworks[0]
    const p = Array.isArray(precision) && precision.length ? precision.join('/') : undefined
    return [a, f, p].filter(Boolean).join(' · ')
  }, [architectures, frameworks, precision])
  const deliveryFlags = React.useMemo(()=>{
    const mode = String(deliveryMode || '').toLowerCase()
    let api = mode === 'api' || mode === 'both'
    let download = mode === 'download' || mode === 'both'
    if (!api && !download && rights) {
      api = !!rights.api
      download = !!rights.download
    }
    return { api, download }
  }, [deliveryMode, rights])

  return (
    <Card
      sx={{
        height: '100%',
        borderRadius: '16px',
        border: '2px solid',
        borderColor: 'oklch(0.30 0 0)',
        background: 'linear-gradient(180deg, rgba(38,46,64,0.78), rgba(20,26,42,0.78))',
        boxShadow: '0 0 0 1px rgba(255,255,255,0.04) inset, 0 10px 28px rgba(0,0,0,0.40)',
        backdropFilter: 'blur(10px)',
        position:'relative',
        overflow:'hidden'
      }}
      ref={rootRef}
    >
      <CardActionArea component={href ? Link : 'div'} href={href as any} sx={{ alignItems:'stretch', display:'flex', flexDirection:'column', height:'100%', position:'relative' }}>
        {coverSrc ? (
          <Box sx={{ position:'relative', width:'100%', height: { xs: 160, sm: 180 }, overflow:'hidden', bgcolor:'#0a111c', p: 1 }}>
            <Image src={(coverSrc && (coverSrc.startsWith('http') || coverSrc.startsWith('/'))) ? coverSrc : toHttpFromIpfs(String(coverSrc||''))} alt={data.name} fill sizes="(max-width: 600px) 100vw, (max-width: 1200px) 50vw, 33vw" style={{ objectFit:'contain', objectPosition: 'center' }} loading={priority ? undefined : 'lazy'} priority={!!priority} unoptimized />
          </Box>
        ) : (
          <Box sx={{ width:'100%', height: { xs: 160, sm: 180 }, bgcolor:'#0a111c', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <ScienceIcon color="primary" />
          </Box>
        )}
        <Box sx={{ position:'absolute', right: 12, top: 12, opacity: 0, transition:'opacity .2s', '.MuiCardActionArea-root:hover &': { opacity: 1 } }}>
          <Button size="small" variant="contained" sx={{ backgroundImage: 'linear-gradient(90deg, #7c5cff, #2ea0ff)', color: '#fff', textTransform: 'none', fontWeight: 600, boxShadow: '0 6px 18px rgba(46,160,255,0.25)', '&:hover': { filter: 'brightness(1.05)', backgroundImage: 'linear-gradient(90deg, #7c5cff, #2ea0ff)' } }}>{t('details')}</Button>
        </Box>
        <CardContent sx={{ flex:1, p: { xs: 3, sm: 3.25 } }}>
          <Stack spacing={1}>
            <Typography variant="h6" fontWeight={800} noWrap title={data.name} sx={{ color: '#fff' }}>{data.name}</Typography>
            <Typography variant="body2" sx={{ color: '#ffffffd6', display:'-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>
              {description || data.summary || valueProposition}
            </Typography>
            {/* author/rating line intentionally removed per spec */}
            <Stack direction="row" spacing={0.5} sx={{ flexWrap:'wrap' }}>
              {(categories||[]).slice(0,2).map((c)=> <Chip key={`cat-${c}`} size="small" label={c} sx={{ bgcolor: 'rgba(255,255,255,0.10)', color: '#fff', border: '1px solid rgba(255,255,255,0.18)' }} />)}
              {(tasks||[]).slice(0,2).map((t)=> <Chip key={`task-${t}`} size="small" label={t} sx={{ bgcolor: 'rgba(255,255,255,0.08)', color: '#fff', border: '1px solid rgba(255,255,255,0.18)' }} />)}
              {(tags||[]).slice(0,3).map((g)=> <Chip key={`tag-${g}`} size="small" label={g} sx={{ bgcolor: 'rgba(255,255,255,0.08)', color: '#fff', border: '1px solid rgba(255,255,255,0.18)' }} />)}
            </Stack>
            {techLine && (
              <Stack direction="row" spacing={0.5} alignItems="center">
                <SettingsIcon fontSize="small" sx={{ color:'text.secondary' }} />
                <Typography variant="caption" sx={{ color: '#e2eeff' }} noWrap title={techLine}>{techLine}</Typography>
              </Stack>
            )}
            <Stack spacing={0.25}>
              {showConnect ? null : data.pricePerpetual && (
                <Typography variant="subtitle1" fontWeight={800} sx={{ color: '#4fe1ff' }}>
                  {data.pricePerpetual} · {t('oneTime')}
                </Typography>
              )}
              {showConnect ? null : data.priceSubscription && (
                <Typography variant="subtitle2" sx={{ color: '#ffffffcc' }}>
                  {data.priceSubscription} {t('subscription')}
                </Typography>
              )}
              {showConnect && (
                <ConnectWalletInline locale={locale} />
              )}
            </Stack>
            <Stack direction="row" spacing={0.75} alignItems="center" sx={{ flexWrap:'wrap' }}>
              {deliveryFlags.api && (
                <Chip size="small" icon={<CloudDoneIcon sx={{ color: '#fff' }} />} label={t('chips.apiUsage')} sx={{ bgcolor: 'rgba(255,255,255,0.10)', color: '#fff', border: '1px solid rgba(255,255,255,0.18)', '& .MuiChip-icon': { color: '#fff' } }} />
              )}
              {deliveryFlags.download && (
                <Chip size="small" icon={<DownloadDoneIcon sx={{ color: '#fff' }} />} label={t('chips.modelDownload')} sx={{ bgcolor: 'rgba(255,255,255,0.10)', color: '#fff', border: '1px solid rgba(255,255,255,0.18)', '& .MuiChip-icon': { color: '#fff' } }} />
              )}
            </Stack>
            {rights?.transferable && (
              <Stack direction="row" spacing={0.75} alignItems="center" sx={{ flexWrap:'wrap' }}>
                <Chip size="small" icon={<SwapHorizIcon sx={{ color: '#fff' }} />} label={t('chips.transferable')} sx={{ bgcolor: 'rgba(255,255,255,0.10)', color: '#fff', border: '1px solid rgba(255,255,255,0.18)', '& .MuiChip-icon': { color: '#fff' } }} />
              </Stack>
            )}
            {data.knownLimitations && (
              <Tooltip title={data.knownLimitations} placement="bottom-start">
                <Stack direction="row" spacing={0.5} alignItems="center">
                  <WarningAmberIcon fontSize="small" sx={{ color: 'warning.main' }} />
                  <Typography variant="caption" color="text.secondary" sx={{ maxWidth: '100%' }} noWrap>
                    {data.knownLimitations}
                  </Typography>
                </Stack>
              </Tooltip>
            )}
          </Stack>
        </CardContent>
      </CardActionArea>
    </Card>
  )
}
