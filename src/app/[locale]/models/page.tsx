"use client";
import React, { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useLocale } from 'next-intl'
import { Container, Box, Grid, Stack, Typography, Button, Card, CardContent, TextField, Chip, IconButton, Drawer, Divider, Skeleton } from '@mui/material'
import TuneIcon from '@mui/icons-material/Tune'
import VerifiedIcon from '@mui/icons-material/Verified'
import UploadIcon from '@mui/icons-material/CloudUpload'
import RocketIcon from '@mui/icons-material/RocketLaunch'
import { ModelCard } from '@/components/ModelCard'
import { useWalletEcosystem } from '@/contexts/WalletEcosystemContext'
import { useChainId as useEvmChainId, useConfig as useWagmiConfig, useAccount as useEvmAccount } from 'wagmi'

type ApiModel = {
  objectId: string
  modelId?: number
  name?: string
  description?: string
  listed?: boolean
  uri?: string
  imageUrl?: string
  owner?: string
  version?: number
  price_perpetual?: number
  price_subscription?: number
  author?: string
  valueProposition?: string
  categories?: string[]
  tasks?: string[]
  tags?: string[]
  architectures?: string[]
  frameworks?: string[]
  precision?: string[]
  rights?: { api?: boolean; download?: boolean; transferable?: boolean }
  demoPreset?: boolean
  artifacts?: boolean
  deliveryMode?: string
}

export default function ExploreModelsPage() {
  const locale = useLocale()
  const isES = String(locale||'').startsWith('es')
  const { ecosystem } = useWalletEcosystem()
  const evmChainId = useEvmChainId()
  const wagmiConfig = useWagmiConfig()
  const { isConnected: evmConnected } = useEvmAccount()
  const evmSymbol = React.useMemo(()=>{
    if (typeof evmChainId !== 'number') return 'ETH'
    try {
      const chains = (wagmiConfig as any)?.chains || []
      const ch = chains.find((c:any)=> c?.id === evmChainId)
      const sym = ch?.nativeCurrency?.symbol
      return typeof sym === 'string' && sym ? sym : 'ETH'
    } catch {
      return 'ETH'
    }
  }, [evmChainId, wagmiConfig])
  const L = {
    title: isES ? 'Explora modelos de IA listos para producción' : 'Explore production-ready AI models',
    subtitle: isES ? 'Modelos con licencias perpetuas o por suscripción, listos para integrar por API o descarga.' : 'Models with perpetual or subscription licenses, ready by API or download.',
    exploreAll: isES ? 'Explorar todos los modelos' : 'Explore all models',
    publish: isES ? 'Publicar un modelo' : 'Publish a model',
    recommended: isES ? 'Recomendados para ti' : 'Recommended for you',
    popular: isES ? 'Modelos más populares' : 'Most popular',
    new: isES ? 'Nuevos modelos' : 'New models',
    byCategory: isES ? 'Por categoría' : 'By category',
    searchPh: isES ? 'Buscar por nombre, autor…' : 'Search by name, author…',
    filters: isES ? 'Filtros' : 'Filters',
  }

  const [q, setQ] = useState('')
  const [openFilters, setOpenFilters] = useState(false)
  const [cats, setCats] = useState<string[]>([]) // placeholder for future taxonomy
  const [tasks, setTasks] = useState<string[]>([])
  const [items, setItems] = useState<ApiModel[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [start, setStart] = useState(0)
  const [limit] = useState(6)
  const [hasMore, setHasMore] = useState(true)
  const [initialFailed, setInitialFailed] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const [initialTimeoutMs, setInitialTimeoutMs] = useState(8000)
  const initialRetryRef = useRef(0)
  const sentinelRef = useRef<HTMLDivElement | null>(null)
  const [debugOn, setDebugOn] = useState(false)
  const [metaAgg, setMetaAgg] = useState<Record<string, any>>({})
  const onCardMeta = React.useCallback((id: string, meta: any) => {
    setMetaAgg(prev => ({ ...prev, [id]: meta }))
  }, [])
  const [visibleCount, setVisibleCount] = useState(0)
  const revealTimer = useRef<any>(null)

  useEffect(() => {
    let alive = true
    const fetchWithTimeout = async (input: RequestInfo | URL, init: RequestInit = {}, ms = 8000): Promise<Response> => {
      const ac = new AbortController()
      const id = setTimeout(()=> ac.abort(), ms)
      try {
        return await fetch(input, { ...init, signal: ac.signal })
      } finally {
        clearTimeout(id)
      }
    }
    const load = async (nextStart: number) => {
      const isFirst = nextStart === 0
      isFirst ? setLoading(true) : setLoadingMore(true)
      try {
        const params = new URLSearchParams({ start: String(nextStart), limit: String(limit), order: 'featured', listed: '1', chain: ecosystem })
        if (ecosystem === 'evm' && typeof evmChainId === 'number') params.set('chainId', String(evmChainId))
        const r = await fetchWithTimeout(`/api/models-page?${params.toString()}`, { cache: 'no-store' }, isFirst ? initialTimeoutMs : 8000)
        const j = await r.json().catch(()=>({}))
        const arr = Array.isArray(j?.data) ? j.data as any[] : []
        // hydrate images similar to non-locale page
        const gateway = (process.env.NEXT_PUBLIC_PINATA_GATEWAY || 'https://gateway.pinata.cloud')
        const toHttpFromIpfs = (u: string): string => {
          if (!u) return ''
          if (u.startsWith('ipfs://')) return `/api/ipfs/ipfs/${u.replace('ipfs://','')}`
          if (u.startsWith('/ipfs/')) return `/api/ipfs${u}`
          if (u.startsWith('http://') || u.startsWith('https://')) {
            try {
              const url = new URL(u)
              if (url.hostname.includes('pinata.cloud') || url.hostname.includes('ipfs.io')) {
                const idx = url.pathname.indexOf('/ipfs/')
                if (idx >= 0) {
                  const rest = url.pathname.substring(idx + '/ipfs/'.length)
                  return `/api/ipfs/ipfs/${rest}`
                }
              }
            } catch {}
            return u
          }
          return `/api/ipfs/ipfs/${u}`
        }
        const toApiFromIpfs = (u: string): string => {
          if (!u) return ''
          if (u.startsWith('http://') || u.startsWith('https://')) return u // already http json, fetch directly
          if (u.startsWith('ipfs://')) return `/api/ipfs/ipfs/${u.replace('ipfs://','')}`
          if (u.startsWith('/ipfs/')) return `/api/ipfs${u}`
          return `/api/ipfs/ipfs/${u}`
        }
        const concurrency = 6
        const out: ApiModel[] = new Array(arr.length)
        const runTask = async (m:any, index:number) => {
          const imageUrl: string | undefined = typeof m?.imageUrl === 'string' ? m.imageUrl : undefined
          out[index] = {
            objectId: String(m?.objectId || ''),
            modelId: Number(m?.id ?? m?.modelId),
            name: m?.name,
            description: m?.description,
            listed: Boolean(m?.listed),
            uri: m?.uri,
            owner: m?.owner,
            version: Number(m?.version),
            price_perpetual: Number(m?.price_perpetual || 0),
            price_subscription: Number(m?.price_subscription || 0),
            imageUrl,
          } as ApiModel
        }
        let cursor = 0
        const worker = async () => {
          while (true) {
            const i = cursor++
            if (i >= arr.length) break
            await runTask(arr[i], i)
          }
        }
        await Promise.all(Array.from({ length: Math.min(concurrency, arr.length) }, () => worker()))
        let withImages: ApiModel[] = out.filter(Boolean)
        if (alive) {
          // Pintar primero
          if (isFirst) {
            if (withImages.length > 0) {
              setItems(withImages)
              setHasMore(withImages.length === limit)
              setStart(withImages.length)
              setInitialFailed(false)
              // Prefetch de la siguiente página en background si hay más
              if (alive && withImages.length === limit) {
                setTimeout(()=>{ if (alive) { /* prefetch next page */ load(withImages.length) } }, 200)
              }
            } else {
              // Si la primera respuesta viene vacía, no pisar posibles items del cache
              setHasMore(false)
              setInitialFailed(true)
            }
          } else {
            setItems(prev => [...prev, ...withImages])
            setHasMore(withImages.length === limit)
            setStart(nextStart + withImages.length)
          }
        }
        // Cachear primera página solo si hay resultados
        if (alive && isFirst && withImages.length > 0) {
          try { sessionStorage.setItem('models_first_page_cache', JSON.stringify(withImages)) } catch {}
        }
        // Enriquecer después: primero 3 y luego siguientes 3, en paralelo y sin bloquear
        if (alive && isFirst) {
          const strMeta = (v:any): string => {
            if (v == null) return ''
            if (typeof v === 'string') return v
            if (typeof v === 'object') {
              const n = v.name || v.framework || v.arch || v.type || ''
              const ver = v.version || v.ver || v.v || ''
              return [String(n||'').trim(), String(ver||'').trim()].filter(Boolean).join(' ')
            }
            return String(v)
          }
          const first3 = withImages.slice(0, 3).filter(m=> m?.uri)
          first3.forEach(async (base) => {
            try {
              const metaUrl = toApiFromIpfs(String(base.uri))
              const r = await fetch(metaUrl, { cache: 'no-store' })
              if (!r.ok) return
              const meta: any = await r.json().catch(()=>undefined)
              if (!meta) return
              const categories = Array.isArray(meta?.categories) ? meta.categories : []
              const tasks = Array.isArray(meta?.tasks) ? meta.tasks : (Array.isArray(meta?.capabilities?.tasks) ? meta.capabilities.tasks : [])
              const tagsA = Array.isArray(meta?.tags) ? meta.tags : []
              const tagsB = Array.isArray(meta?.capabilities?.tags) ? meta.capabilities.tags : []
              const mods = Array.isArray(meta?.modalities) ? meta.modalities : (Array.isArray(meta?.capabilities?.modalities) ? meta.capabilities.modalities : [])
              const tags = Array.from(new Set([...tagsA, ...tagsB, ...mods].filter(Boolean).map(String)))
              const architectures = Array.isArray(meta?.architectures) ? meta.architectures.map(strMeta)
                : (Array.isArray(meta?.architecture?.architectures) ? meta.architecture.architectures.map(strMeta) : [])
              const frameworks = Array.isArray(meta?.frameworks) ? meta.frameworks.map(strMeta)
                : (Array.isArray(meta?.architecture?.frameworks) ? meta.architecture.frameworks.map(strMeta) : [])
              const precision = Array.isArray(meta?.precision) ? meta.precision.map(strMeta)
                : (Array.isArray(meta?.architecture?.precisions) ? meta.architecture.precisions.map(strMeta) : [])
              const rights = (base.rights && typeof base.rights === 'object') ? base.rights : (meta?.rights && typeof meta.rights === 'object' ? {
                api: !!meta.rights.api,
                download: !!meta.rights.download,
                transferable: !!meta.rights.transferable,
              } : (meta?.licensePolicy ? {
                api: Array.isArray(meta.licensePolicy.rights) ? meta.licensePolicy.rights.map((x:any)=> String(x).toLowerCase()).includes('api') : undefined,
                download: Array.isArray(meta.licensePolicy.rights) ? meta.licensePolicy.rights.map((x:any)=> String(x).toLowerCase()).includes('download') : undefined,
                transferable: !!meta.licensePolicy.transferable,
              } : undefined))
              const deliveryMode = base.deliveryMode || (typeof meta?.deliveryMode === 'string' && meta.deliveryMode) || (typeof meta?.delivery?.mode === 'string' && meta.delivery.mode) || (Array.isArray(meta?.licensePolicy?.delivery) ? (()=>{
                const d = meta.licensePolicy.delivery.map((x:any)=> String(x).toLowerCase())
                return d.includes('api') && d.includes('download') ? 'both' : d.includes('api') ? 'api' : d.includes('download') ? 'download' : undefined
              })() : undefined)
              setItems(prev => prev.map(it => {
                if ((it.modelId ?? it.objectId) === (base.modelId ?? base.objectId)) {
                  return { ...it, categories, tasks, tags, architectures, frameworks, precision, rights, deliveryMode, __preMeta: meta }
                }
                return it
              }))
            } catch {}
          })
          // Enriquecer los siguientes 3 tras un pequeño retraso
          const next3 = withImages.slice(3, 6).filter(m=> m?.uri)
          if (next3.length) {
            setTimeout(()=>{
              if (!alive) return
              next3.forEach(async (base) => {
                try {
                  const metaUrl = toApiFromIpfs(String(base.uri))
                  const r = await fetch(metaUrl, { cache: 'no-store' })
                  if (!r.ok) return
                  const meta: any = await r.json().catch(()=>undefined)
                  if (!meta) return
                  const categories = Array.isArray(meta?.categories) ? meta.categories : []
                  const tasks = Array.isArray(meta?.tasks) ? meta.tasks : (Array.isArray(meta?.capabilities?.tasks) ? meta.capabilities.tasks : [])
                  const tagsA = Array.isArray(meta?.tags) ? meta.tags : []
                  const tagsB = Array.isArray(meta?.capabilities?.tags) ? meta.capabilities.tags : []
                  const mods = Array.isArray(meta?.modalities) ? meta.modalities : (Array.isArray(meta?.capabilities?.modalities) ? meta.capabilities.modalities : [])
                  const tags = Array.from(new Set([...tagsA, ...tagsB, ...mods].filter(Boolean).map(String)))
                  const architectures = Array.isArray(meta?.architectures) ? meta.architectures.map(strMeta)
                    : (Array.isArray(meta?.architecture?.architectures) ? meta.architecture.architectures.map(strMeta) : [])
                  const frameworks = Array.isArray(meta?.frameworks) ? meta.frameworks.map(strMeta)
                    : (Array.isArray(meta?.architecture?.frameworks) ? meta.architecture.frameworks.map(strMeta) : [])
                  const precision = Array.isArray(meta?.precision) ? meta.precision.map(strMeta)
                    : (Array.isArray(meta?.architecture?.precisions) ? meta.architecture.precisions.map(strMeta) : [])
                  const rights = (base.rights && typeof base.rights === 'object') ? base.rights : (meta?.rights && typeof meta.rights === 'object' ? {
                    api: !!meta.rights.api,
                    download: !!meta.rights.download,
                    transferable: !!meta.rights.transferable,
                  } : (meta?.licensePolicy ? {
                    api: Array.isArray(meta.licensePolicy.rights) ? meta.licensePolicy.rights.map((x:any)=> String(x).toLowerCase()).includes('api') : undefined,
                    download: Array.isArray(meta.licensePolicy.rights) ? meta.licensePolicy.rights.map((x:any)=> String(x).toLowerCase()).includes('download') : undefined,
                    transferable: !!meta.licensePolicy.transferable,
                  } : undefined))
                  const deliveryMode = base.deliveryMode || (typeof meta?.deliveryMode === 'string' && meta.deliveryMode) || (typeof meta?.delivery?.mode === 'string' && meta.delivery.mode) || (Array.isArray(meta?.licensePolicy?.delivery) ? (()=> {
                    const d = meta.licensePolicy.delivery.map((x:any)=> String(x).toLowerCase())
                    return d.includes('api') && d.includes('download') ? 'both' : d.includes('api') ? 'api' : d.includes('download') ? 'download' : undefined
                  })() : undefined)
                  setItems(prev => prev.map(it => {
                    if ((it.modelId ?? it.objectId) === (base.modelId ?? base.objectId)) {
                      return { ...it, categories, tasks, tags, architectures, frameworks, precision, rights, deliveryMode, __preMeta: meta }
                    }
                    return it
                  }))
                } catch {}
              })
            }, 700)
          }
        }
      } catch {
        if (alive && nextStart === 0) {
          setItems([])
          setHasMore(false)
          setInitialFailed(true)
        }
      } finally {
        if (alive) {
          setLoading(false)
          setLoadingMore(false)
        }
      }
    }
    // reset on ecosystem/chain change
    setItems([])
    setStart(0)
    setHasMore(true)
    // Intentar hidratar desde cache de sesión inmediatamente
    try {
      const raw = sessionStorage.getItem('models_first_page_cache')
      const cached = raw ? JSON.parse(raw) : undefined
      if (Array.isArray(cached) && cached.length) {
        setItems(cached)
        setStart(cached.length)
        setVisibleCount(Math.min(3, cached.length))
      }
    } catch {}
    // Revalidar en background
    load(0)
    return () => { alive = false }
  }, [ecosystem, evmChainId, limit, refreshKey, initialTimeoutMs])

  // Auto-reintento con backoff si la carga inicial falla y no hay items
  useEffect(()=>{
    if (!initialFailed || items.length > 0) return
    if (initialRetryRef.current >= 3) return
    const attempt = initialRetryRef.current + 1
    const t = setTimeout(()=>{
      initialRetryRef.current = attempt
      setInitialTimeoutMs(ms=> Math.min(15000, ms + 4000))
      setHasMore(true)
      setRefreshKey(k=>k+1)
    }, 800 * attempt)
    return ()=> clearTimeout(t)
  }, [initialFailed, items.length])

  // Resetear contador de reintentos cuando llegan items
  useEffect(()=>{ if (items.length > 0) initialRetryRef.current = 0 }, [items.length])

  // Infinite scroll observer
  useEffect(() => {
    if (!hasMore || loading || loadingMore || items.length === 0) return
    const el = sentinelRef.current
    if (!el) return
    let alive = true
    const io = new IntersectionObserver((entries)=>{
      const first = entries[0]
      if (first?.isIntersecting && alive && !loadingMore) {
        // load next page
        // delay a tick to avoid thrashing
        setTimeout(()=>{
          if (alive) {
            // trigger loadMore by refetching effect body
            (async ()=>{
              // reuse loader but do not reset
              const params = new URLSearchParams({ start: String(start), limit: String(limit), order: 'featured', listed: '1', chain: ecosystem })
              if (ecosystem === 'evm' && typeof evmChainId === 'number') params.set('chainId', String(evmChainId))
              setLoadingMore(true)
              try {
                const ac = new AbortController()
                const t = setTimeout(()=> ac.abort(), 10000)
                let r: Response
                try {
                  r = await fetch(`/api/models-page?${params.toString()}`, { cache: 'no-store', signal: ac.signal })
                } catch (e: any) {
                  if (e && (e.name === 'AbortError' || e.code === 'ABORT_ERR')) {
                    clearTimeout(t)
                    return
                  }
                  clearTimeout(t)
                  throw e
                }
                clearTimeout(t)
                const j = await r.json().catch(()=>({}))
                const arr = Array.isArray(j?.data) ? j.data as any[] : []
                const toHttpFromIpfs = (u: string): string => {
                  if (!u) return ''
                  if (u.startsWith('ipfs://')) return `/api/ipfs/ipfs/${u.replace('ipfs://','')}`
                  if (u.startsWith('/ipfs/')) return `/api/ipfs${u}`
                  if (u.startsWith('http://') || u.startsWith('https://')) {
                    try {
                      const url = new URL(u)
                      if (url.hostname.includes('pinata.cloud') || url.hostname.includes('ipfs.io')) {
                        const idx = url.pathname.indexOf('/ipfs/')
                        if (idx >= 0) {
                          const rest = url.pathname.substring(idx + '/ipfs/'.length)
                          return `/api/ipfs/ipfs/${rest}`
                        }
                      }
                    } catch {}
                    return u
                  }
                  return `/api/ipfs/ipfs/${u}`
                }
                const toApiFromIpfs = (u: string): string => {
                  if (!u) return ''
                  if (u.startsWith('http://') || u.startsWith('https://')) return u
                  if (u.startsWith('ipfs://')) return `/api/ipfs/ipfs/${u.replace('ipfs://','')}`
                  if (u.startsWith('/ipfs/')) return `/api/ipfs${u}`
                  return `/api/ipfs/ipfs/${u}`
                }
                const concurrency = 3
                const out: ApiModel[] = new Array(arr.length)
                const runTask = async (m:any, index:number) => {
                  const imageUrl: string | undefined = typeof m?.imageUrl === 'string' ? m.imageUrl : undefined
                  out[index] = {
                    objectId: String(m?.objectId || ''),
                    modelId: Number(m?.id ?? m?.modelId),
                    name: m?.name,
                    description: m?.description,
                    listed: Boolean(m?.listed),
                    uri: m?.uri,
                    owner: m?.owner,
                    version: Number(m?.version),
                    price_perpetual: Number(m?.price_perpetual || 0),
                    price_subscription: Number(m?.price_subscription || 0),
                    imageUrl,
                  } as ApiModel
                }
                let cursor = 0
                const worker = async () => {
                  while (true) {
                    const i = cursor++
                    if (i >= arr.length) break
                    await runTask(arr[i], i)
                  }
                }
                await Promise.all(Array.from({ length: Math.min(concurrency, arr.length) }, () => worker()))
                const withImages: ApiModel[] = out.filter(Boolean)
                if (alive) {
                  setItems(prev => [...prev, ...withImages])
                  setHasMore(withImages.length === limit)
                  setStart(prev => prev + withImages.length)
                }
              } finally {
                if (alive) setLoadingMore(false)
              }
            })()
          }
        }, 50)
      }
    }, { rootMargin: '800px 0px' })
    io.observe(el)
    return () => { alive = false; io.disconnect() }
  }, [hasMore, loading, loadingMore, start, limit, ecosystem, evmChainId, items.length])

  const filtered = useMemo(()=>{
    return items.filter(m=>{
      const text = (String(m.name||'') + ' ' + String(m.description||'') + ' ' + String(m.owner||'')).toLowerCase()
      const okQ = q ? text.includes(q.toLowerCase()) : true
      const okCat = true
      const okTask = true
      return okQ && okCat && okTask
    })
  }, [q, items])
  const displayed = useMemo(()=> filtered.slice(0, Math.min(visibleCount, filtered.length)), [filtered, visibleCount])

  // Reiniciar revelado al cambiar consulta
  useEffect(()=>{ setVisibleCount(0) }, [q])
  // Arrancar revelado cuando haya elementos
  useEffect(()=>{
    if (filtered.length === 0) {
      if (revealTimer.current) { clearInterval(revealTimer.current); revealTimer.current = null }
      setVisibleCount(0)
      return
    }
    if (visibleCount === 0) setVisibleCount(Math.min(3, filtered.length))
    if (revealTimer.current) return
    revealTimer.current = setInterval(()=>{
      setVisibleCount(prev => {
        const next = Math.min(prev + 3, filtered.length)
        if (next >= filtered.length) {
          clearInterval(revealTimer.current)
          revealTimer.current = null
        }
        return next
      })
    }, 400)
    return () => { if (revealTimer.current) { clearInterval(revealTimer.current); revealTimer.current = null } }
  }, [filtered.length, visibleCount])

  

  const Filters = (
    <Box sx={{ width: 300, p: 2 }} role="presentation">
      <Typography variant="h6" fontWeight={700} sx={{ mb: 1 }}>{L.filters}</Typography>
      <Divider sx={{ mb: 2 }} />
      <Typography variant="body2" color="text.secondary">
        {isES ? 'Filtros avanzados próximamente.' : 'Advanced filters coming soon.'}
      </Typography>
    </Box>
  )

  return (
    <Box>
      <Container maxWidth="lg" sx={{ py: { xs: 4, md: 6 } }}>
        <Grid container spacing={3} alignItems="center">
          <Grid item xs={12} md={7}>
            <Stack spacing={2}>
              <Chip icon={<VerifiedIcon />} label={isES ? 'Marketplace de modelos de IA' : 'AI Models Marketplace'} sx={{ alignSelf:'flex-start', bgcolor:'rgba(0,0,0,0.06)' }} />
              <Typography variant="h3" fontWeight={800}>{L.title}</Typography>
              <Typography variant="h6" color="text.secondary">{L.subtitle}</Typography>
              <Stack direction={{ xs:'column', sm:'row' }} spacing={2}>
                <Button startIcon={<RocketIcon />} component={Link} href={`/${locale}/models`} variant="contained">{L.exploreAll}</Button>
                <Button startIcon={<UploadIcon />} component={Link} href={`/${locale}/publish/wizard`} variant="outlined">{L.publish}</Button>
              </Stack>
            </Stack>
          </Grid>
          <Grid item xs={12} md={5}>
            <Card>
              <CardContent>
                <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>{isES ? 'Buscar y filtrar' : 'Search and filter'}</Typography>
                <Stack direction="row" spacing={1}>
                  <TextField fullWidth size="small" placeholder={L.searchPh} value={q} onChange={(e)=>setQ(e.target.value)} />
                  <IconButton onClick={()=>setOpenFilters(true)}><TuneIcon /></IconButton>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Only category grid remains */}

        <Box sx={{ py: 4 }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
            <Typography variant="h5" fontWeight={800}>{L.byCategory}</Typography>
            <Button size="small" variant={debugOn ? 'contained' : 'outlined'} onClick={()=> setDebugOn(v=>!v)}>{debugOn ? 'Debug ON' : 'Debug'}</Button>
          </Stack>
          {/* Category chips pending real taxonomy */}
          <Grid container spacing={2}>
            {loading && items.length === 0 && Array.from({ length: 6 }).map((_, i) => (
              <Grid key={`sk-${i}`} item xs={12} sm={6} md={4}>
                <Card>
                  <Skeleton variant="rectangular" height={160} />
                  <CardContent>
                    <Stack spacing={1}>
                      <Skeleton variant="text" width="60%" height={28} />
                      <Skeleton variant="text" width="90%" />
                      <Stack direction="row" spacing={0.5} sx={{ flexWrap:'wrap' }}>
                        <Skeleton variant="rounded" width={60} height={24} />
                        <Skeleton variant="rounded" width={70} height={24} />
                        <Skeleton variant="rounded" width={80} height={24} />
                      </Stack>
                      <Skeleton variant="text" width="40%" />
                      <Stack direction="row" spacing={0.75}>
                        <Skeleton variant="rounded" width={110} height={28} />
                        <Skeleton variant="rounded" width={130} height={28} />
                      </Stack>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            ))}
            {!loading && items.length === 0 && (
              <Grid item xs={12}>
                <Card>
                  <CardContent>
                    <Stack spacing={2} alignItems="center" justifyContent="center" sx={{ py: 4 }}>
                      <Typography variant="subtitle1" fontWeight={700}>
                        {isES ? 'Estamos cargando los modelos…' : 'We are loading the models…'}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {isES ? 'Esto puede tardar unos segundos si la red está lenta. Reintentaremos automáticamente.' : 'This may take a few seconds if the network is slow. We will retry automatically.'}
                      </Typography>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            )}
            {(displayed.length>0?displayed:filtered).map((m:any, idx:number) => (
              <Grid key={m.modelId || m.objectId || idx} item xs={12} sm={6} md={4}>
                <ModelCard locale={locale} data={{
                  slug: '',
                  name: m.name || 'Model',
                  summary: m.description || '',
                  description: m.description,
                  cover: m.imageUrl,
                  uri: m.uri,
                  author: m.author,
                  valueProposition: m.valueProposition,
                  categories: m.categories,
                  tasks: m.tasks,
                  tags: m.tags,
                  architectures: m.architectures,
                  frameworks: m.frameworks,
                  precision: m.precision,
                  rights: m.rights || (m.licensePolicy ? {
                    api: Array.isArray(m.licensePolicy.rights) ? m.licensePolicy.rights.map((x:any)=> String(x).toLowerCase()).includes('api') : undefined,
                    download: Array.isArray(m.licensePolicy.rights) ? m.licensePolicy.rights.map((x:any)=> String(x).toLowerCase()).includes('download') : undefined,
                    transferable: Boolean(m.licensePolicy.transferable)
                  } : undefined),
                  demoPreset: m.demoPreset,
                  artifacts: m.artifacts,
                  deliveryMode: m.deliveryMode || (Array.isArray(m?.licensePolicy?.delivery) ?
                    (()=>{ const d = m.licensePolicy.delivery.map((x:any)=> String(x).toLowerCase()); return d.includes('api') && d.includes('download') ? 'both' : d.includes('api') ? 'api' : d.includes('download') ? 'download' : undefined })()
                  : undefined),
                  pricePerpetual: m.price_perpetual ? (ecosystem==='sui' ? `${(m.price_perpetual/1_000_000_000).toFixed(2)} SUI` : `${(m.price_perpetual/1e18).toFixed(4)} ${evmSymbol}`) : undefined,
                  priceSubscription: m.price_subscription ? (ecosystem==='sui' ? `${(m.price_subscription/1_000_000_000).toFixed(2)} SUI/${isES?'mes':'mo'}` : `${(m.price_subscription/1e18).toFixed(4)} ${evmSymbol}/${isES?'mes':'mo'}`) : undefined,
                }} href={ecosystem==='sui' ? `/models/${m.modelId ?? ''}` : (m.modelId ? `/${locale}/evm/models/${m.modelId}` : undefined)} priority={idx < 3} onMeta={onCardMeta} preMeta={(m as any).__preMeta} />
              </Grid>
            ))}
          </Grid>
          <Box ref={sentinelRef} sx={{ height: 1 }} />
          {loadingMore && items.length > 0 && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              {isES ? 'Cargando más…' : 'Loading more…'}
            </Typography>
          )}
          {!hasMore && items.length > 0 && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              {isES ? 'No hay más resultados.' : 'No more results.'}
            </Typography>
          )}
          {debugOn && (
            <Box sx={{ mt: 3 }}>
              <details open>
                <summary>meta agregados visibles</summary>
                <Box component="pre" sx={{ whiteSpace:'pre-wrap', fontSize: 12, bgcolor:'grey.50', p: 2, borderRadius: 1, maxHeight: 400, overflow:'auto' }}>
                  {JSON.stringify(Object.entries(metaAgg).map(([id, meta])=> ({ id, meta })), null, 2)}
                </Box>
              </details>
            </Box>
          )}
        </Box>
      </Container>

      <Drawer anchor="right" open={openFilters} onClose={()=>setOpenFilters(false)}>
        {Filters}
      </Drawer>
    </Box>
  )
}
