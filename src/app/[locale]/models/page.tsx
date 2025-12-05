"use client";
import React, { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useLocale, useTranslations } from 'next-intl'
import { Container, Box, Grid, Stack, Typography, Button, Card, CardContent, TextField, Chip, IconButton, Drawer, Divider, Skeleton, Tooltip, CircularProgress } from '@mui/material'
import TuneIcon from '@mui/icons-material/Tune'
import RefreshIcon from '@mui/icons-material/Refresh'
import VerifiedIcon from '@mui/icons-material/Verified'
import UploadIcon from '@mui/icons-material/CloudUpload'
import RocketIcon from '@mui/icons-material/RocketLaunch'
import { ModelCard } from '@/components/ModelCard'
import { useChainId as useEvmChainId, useConfig as useWagmiConfig, useAccount as useEvmAccount } from 'wagmi'
import { ipfsToApiRoute } from '@/config'

type ApiModel = {
  objectId: string
  modelId?: number
  name?: string
  description?: string
  listed?: boolean
  uri?: string
  imageUrl?: string
  owner?: string
  version?: string
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
  industries?: string[]
  useCases?: string[]
  rights?: { api?: boolean; download?: boolean; transferable?: boolean }
  demoPreset?: boolean
  artifacts?: boolean
  deliveryMode?: string
}

export default function ExploreModelsPage() {
  const locale = useLocale()
  const t = useTranslations('explore')
  const isES = String(locale||'').startsWith('es')
  const evmChainId = useEvmChainId()
  const wagmiConfig = useWagmiConfig()
  const { isConnected: evmConnected } = useEvmAccount()
  const evmSymbol = React.useMemo(()=>{
    if (typeof evmChainId !== 'number') return 'AVAX'
    try {
      const chains = (wagmiConfig as any)?.chains || []
      const ch = chains.find((c:any)=> c?.id === evmChainId)
      const sym = ch?.nativeCurrency?.symbol
      return typeof sym === 'string' && sym ? sym : 'AVAX'
    } catch {
      return 'AVAX'
    }
  }, [evmChainId, wagmiConfig])
  const L = {
    title: t('title'),
    subtitle: t('subtitle'),
    exploreAll: t('exploreAll'),
    publish: t('publish'),
    recommended: t('recommended'),
    popular: t('popular'),
    new: t('new'),
    byCategory: t('byCategory'),
    searchPh: t('searchPlaceholder'),
    filters: t('filters'),
  }

  const [q, setQ] = useState('')
  const [openFilters, setOpenFilters] = useState(false)
  const [cats, setCats] = useState<string[]>([]) // placeholder for future taxonomy
  const [tasks, setTasks] = useState<string[]>([])
  const [items, setItems] = useState<ApiModel[]>([])
  const [loading, setLoading] = useState(true) // Start as true for immediate skeleton
  const [loadingMore, setLoadingMore] = useState(false)
  const [start, setStart] = useState(0)
  const [limit] = useState(6)
  const [hasMore, setHasMore] = useState(true)
  const [initialFailed, setInitialFailed] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const [refreshing, setRefreshing] = useState(false)
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
        // NEW: Use indexed API (FAST!) - already has metadata cached
        const page = Math.floor(nextStart / limit) + 1
        const params = new URLSearchParams({ page: String(page), limit: String(limit) })
        if (typeof evmChainId === 'number') params.set('chainId', String(evmChainId))
        const r = await fetchWithTimeout(`/api/indexed/models?${params.toString()}`, { cache: 'no-store' }, isFirst ? initialTimeoutMs : 8000)
        const j = await r.json().catch(()=>({}))
        // API indexada devuelve {models: [], total, page, pages}
        const arr = Array.isArray(j?.models) ? j.models as any[] : []
        // hydrate images using centralized IPFS config
        const hydrated = arr.map(model => ({
          ...model,
          imageUrl: ipfsToApiRoute(model.imageUrl || '')
        }))
        // Transform indexed API response (already has metadata cached!)
        const withImages: ApiModel[] = hydrated.map((m: any) => {
          const meta = m.metadata || {}
          const customer = meta?.customer || {}
          const author = meta?.author || {}
          return {
            objectId: String(m?.model_id || ''),
            modelId: Number(m?.model_id),
            // agentId from AgentRegistryV2 (ERC-8004 identity)
            // Priority: DB agent_id > model_id fallback
            agentId: m?.agent_id ? Number(m.agent_id) : Number(m?.model_id),
            name: m?.name || meta?.name,
            // Priority: tagline > shortSummary > summary > description
            description: meta?.tagline || meta?.shortSummary || meta?.summary || meta?.description || '',
            listed: Boolean(m?.listed),
            uri: m?.uri,
            owner: m?.owner,
            // Author from metadata
            author: author?.displayName || author?.name || m?.creator || '',
            // Value proposition from customer sheet
            valueProposition: customer?.valueProp || customer?.valueProposition || '',
            version: (() => {
              // Convert DB integer version to string format "v1.0.0"
              const dbVersion = Number(m?.version)
              if (dbVersion > 0) return `v${dbVersion}.0.0`
              // Fallback to metadata string version if present
              if (typeof meta?.version === 'string') return meta.version
              return undefined
            })(),
            price_perpetual: Number(m?.price_perpetual || 0),
            price_subscription: Number(m?.price_subscription || 0),
            // Price per inference from MarketplaceV2 (USDC base units, 6 decimals)
            // Priority: DB price_inference > metadata > default for API-enabled models
            pricePerInference: (() => {
              // Check DB price_inference first (from MarketplaceV2 smart contract)
              const dbPriceInference = m?.price_inference ? BigInt(m.price_inference) : 0n
              if (dbPriceInference > 0n) {
                // Convert from USDC base units (6 decimals) to display format
                return (Number(dbPriceInference) / 1e6).toString()
              }
              // Fallback to metadata
              const metaPrice = meta?.licensePolicy?.pricing?.inference?.pricePerCall 
                || meta?.licensePolicy?.inference?.pricePerCall
                || meta?.pricePerInference
              if (metaPrice) return String(metaPrice)
              return undefined
            })(),
            // Agent endpoint from AgentRegistryV2
            inferenceEndpoint: m?.agent_endpoint || m?.inference_endpoint || undefined,
            // Agent wallet for x402 payments
            inferenceWallet: m?.agent_wallet || m?.inference_wallet || undefined,
            imageUrl: m?.image_url,
            // Extract from cached metadata (prioritize DB columns over nested metadata)
            categories: m?.categories || meta?.categories || meta?.technicalCategories || [],
            tasks: meta?.capabilities?.tasks || [],
            tags: m?.tags || meta?.tags || meta?.technicalTags || [],
            architectures: m?.architectures || meta?.architecture?.architectures || [],
            frameworks: m?.frameworks || meta?.architecture?.frameworks || [],
            precision: meta?.architecture?.precisions || [],
            // Industries and use cases from customer sheet
            industries: customer?.industries || [],
            useCases: customer?.useCases || [],
            // PRIORITY: Use Neon DB fields (delivery_rights_default, delivery_mode_hint) over IPFS metadata
            // This ensures Quick Edit changes are immediately reflected in listings
            rights: (() => {
              // delivery_rights_default: 1=API, 2=Download, 3=Both
              const rightsBitmask = typeof m?.delivery_rights_default === 'number' ? m.delivery_rights_default : null
              if (rightsBitmask !== null) {
                return {
                  api: (rightsBitmask & 1) !== 0,
                  download: (rightsBitmask & 2) !== 0,
                  transferable: Boolean(meta?.licensePolicy?.transferable || meta?.licensePolicy?.rights?.transferable)
                }
              }
              // Fallback to metadata if DB field missing
              if (meta?.licensePolicy?.rights) {
                return {
                  api: Array.isArray(meta.licensePolicy.rights) ? meta.licensePolicy.rights.includes('API') : Boolean(meta.licensePolicy.rights.api),
                  download: Array.isArray(meta.licensePolicy.rights) ? meta.licensePolicy.rights.includes('Download') : Boolean(meta.licensePolicy.rights.download),
                  transferable: Boolean(meta.licensePolicy.transferable || meta.licensePolicy.rights.transferable)
                }
              }
              return undefined
            })(),
            deliveryMode: (() => {
              // delivery_mode_hint: 1=API, 2=Download, 3=Both
              const modeHint = typeof m?.delivery_mode_hint === 'number' ? m.delivery_mode_hint : null
              if (modeHint !== null) {
                return modeHint === 1 ? 'api' : modeHint === 2 ? 'download' : 'both'
              }
              // Fallback to metadata if DB field missing
              if (Array.isArray(meta?.licensePolicy?.delivery)) {
                return (meta.licensePolicy.delivery.includes('API') && meta.licensePolicy.delivery.includes('Download') ? 'both' : 
                        meta.licensePolicy.delivery.includes('API') ? 'api' : 
                        meta.licensePolicy.delivery.includes('Download') ? 'download' : undefined)
              }
              if (typeof meta?.licensePolicy?.deliveryMode === 'string') {
                return meta.licensePolicy.deliveryMode.toLowerCase()
              }
              return undefined
            })(),
            __preMeta: meta
          } as ApiModel
        }).filter(Boolean)
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
        // No need to enrich metadata anymore - already cached in DB! ✅
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
    // reset on chain change
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
  }, [evmChainId, limit, refreshKey, initialTimeoutMs])

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
              // reuse loader but do not reset - use indexed API
              const page = Math.floor(start / limit) + 1
              const params = new URLSearchParams({ page: String(page), limit: String(limit) })
              if (typeof evmChainId === 'number') params.set('chainId', String(evmChainId))
              setLoadingMore(true)
              try {
                const ac = new AbortController()
                const t = setTimeout(()=> ac.abort(), 10000)
                let r: Response
                try {
                  r = await fetch(`/api/indexed/models?${params.toString()}`, { cache: 'no-store', signal: ac.signal })
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
                // Transform indexed API response (already has metadata cached!)
                const arr = Array.isArray(j?.models) ? j.models as any[] : []
                const withImages: ApiModel[] = arr.map((m: any) => {
                  const meta = m.metadata || {}
                  const customer = meta?.customer || {}
                  const authorMeta = meta?.author || {}
                  return {
                    objectId: String(m?.model_id || ''),
                    modelId: Number(m?.model_id),
                    name: m?.name || meta?.name,
                    description: meta?.tagline || meta?.shortSummary || meta?.summary || meta?.description || '',
                    listed: Boolean(m?.listed),
                    uri: m?.uri,
                    owner: m?.owner,
                    author: authorMeta?.displayName || authorMeta?.name || m?.creator || '',
                    valueProposition: customer?.valueProp || customer?.valueProposition || '',
                    version: (() => {
                      const dbVersion = Number(m?.version)
                      if (dbVersion > 0) return `v${dbVersion}.0.0`
                      if (typeof meta?.version === 'string') return meta.version
                      return undefined
                    })(),
                    price_perpetual: Number(m?.price_perpetual || 0),
                    price_subscription: Number(m?.price_subscription || 0),
                    imageUrl: m?.image_url,
                    categories: m?.categories || meta?.categories || meta?.technicalCategories || [],
                    tasks: meta?.capabilities?.tasks || [],
                    tags: m?.tags || meta?.tags || meta?.technicalTags || [],
                    architectures: m?.architectures || meta?.architecture?.architectures || [],
                    frameworks: m?.frameworks || meta?.architecture?.frameworks || [],
                    precision: meta?.architecture?.precisions || [],
                    industries: customer?.industries || [],
                    useCases: customer?.useCases || [],
                    rights: (() => {
                      const rightsBitmask = typeof m?.delivery_rights_default === 'number' ? m.delivery_rights_default : null
                      if (rightsBitmask !== null) {
                        return {
                          api: (rightsBitmask & 1) !== 0,
                          download: (rightsBitmask & 2) !== 0,
                          transferable: Boolean(meta?.licensePolicy?.transferable || meta?.licensePolicy?.rights?.transferable)
                        }
                      }
                      if (meta?.licensePolicy?.rights) {
                        return {
                          api: typeof meta.licensePolicy.rights.api === 'boolean' ? meta.licensePolicy.rights.api : false,
                          download: typeof meta.licensePolicy.rights.download === 'boolean' ? meta.licensePolicy.rights.download : false,
                          transferable: Boolean(meta.licensePolicy.transferable || meta.licensePolicy.rights.transferable)
                        }
                      }
                      return undefined
                    })(),
                    deliveryMode: (() => {
                      const modeHint = typeof m?.delivery_mode_hint === 'number' ? m.delivery_mode_hint : null
                      if (modeHint !== null) {
                        return modeHint === 1 ? 'api' : modeHint === 2 ? 'download' : 'both'
                      }
                      if (typeof meta?.licensePolicy?.deliveryMode === 'string') {
                        return meta.licensePolicy.deliveryMode.toLowerCase()
                      }
                      return undefined
                    })(),
                    __preMeta: meta
                  } as ApiModel
                }).filter(Boolean)
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
  }, [hasMore, loading, loadingMore, start, limit, evmChainId, items.length])

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

  // Handle manual refresh - triggers full reindex from blockchain
  const handleRefresh = React.useCallback(async () => {
    if (refreshing) return
    
    setRefreshing(true)
    try {
      // Call the cron endpoint to reindex all models
      const res = await fetch(`/api/indexer?chainId=${evmChainId || 43113}`, {
        method: 'GET',
        cache: 'no-store'
      })
      
      if (res.ok) {
        // Reset and reload data
        setItems([])
        setStart(0)
        setHasMore(true)
        setRefreshKey(k => k + 1)
      }
    } catch (err) {
      console.error('[Catalog Refresh] Error:', err)
    } finally {
      setRefreshing(false)
    }
  }, [refreshing, evmChainId])

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
    <Box sx={{
      minHeight: '100vh',
      background: [
        'radial-gradient(900px 520px at 88% -140px, rgba(46,160,255,0.22), rgba(46,160,255,0) 60%)',
        'radial-gradient(700px 420px at -120px 240px, rgba(124,92,255,0.16), rgba(124,92,255,0) 55%)',
        'linear-gradient(180deg, #0b1422 0%, #0a111c 50%, #070b12 80%, #05080d 100%)'
      ].join(', '),
      color: 'oklch(0.985 0 0)'
    }}>
      <Container maxWidth="lg" sx={{ py: { xs: 6, md: 8 } }}>
        <Grid container spacing={3} alignItems="center">
          <Grid item xs={12} md={7}>
            <Stack spacing={2}>
              <Chip icon={<VerifiedIcon />} label={isES ? 'Marketplace de modelos de IA' : 'AI Models Marketplace'} sx={{ alignSelf:'flex-start', bgcolor:'rgba(36,48,68,0.5)', color: '#b9d7ff', borderRadius: '999px', border: '1px solid rgba(120,150,200,0.25)' }} />
              <Typography variant="h3" fontWeight={800} sx={{ letterSpacing: '-0.014em' }}>{L.title}</Typography>
              <Typography variant="h6" sx={{ color: 'oklch(0.78 0 0)' }}>{L.subtitle}</Typography>
              <Stack direction={{ xs:'column', sm:'row' }} spacing={2} sx={{ pt: 1 }}>
                <Button startIcon={<RocketIcon />} component={Link} href={`/${locale}/models`} variant="contained" sx={{ backgroundImage: 'linear-gradient(90deg, #7c5cff, #2ea0ff)', color: '#fff', px: 3.5, py: 1.25, borderRadius: '12px', boxShadow: '0 6px 20px rgba(46,160,255,0.25)', '&:hover': { filter: 'brightness(1.05)', backgroundImage: 'linear-gradient(90deg, #7c5cff, #2ea0ff)' } }}>{L.exploreAll}</Button>
                <Button startIcon={<UploadIcon />} component={Link} href={`/${locale}/publish/wizard`} variant="outlined" sx={{ borderColor: 'oklch(0.28 0 0)', color: 'oklch(0.90 0 0)', borderRadius: '12px', px: 3.5, py: 1.25, backgroundColor: 'rgba(255,255,255,0.02)' }}>{L.publish}</Button>
              </Stack>
            </Stack>
          </Grid>
          <Grid item xs={12} md={5}>
            <Card sx={{ borderRadius: '16px', border: '1px solid', borderColor: 'oklch(0.22 0 0)', background: 'linear-gradient(180deg, rgba(22,26,36,0.6), rgba(12,15,24,0.6))', boxShadow: '0 0 0 1px rgba(255,255,255,0.02) inset, 0 8px 24px rgba(0,0,0,0.35)', backdropFilter: 'blur(8px)' }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1, color: 'oklch(0.98 0 0)' }}>{isES ? 'Buscar y filtrar' : 'Search and filter'}</Typography>
                <Stack direction="row" spacing={1}>
                  <TextField fullWidth size="small" placeholder={L.searchPh} value={q} onChange={(e)=>setQ(e.target.value)} sx={{
                    '& .MuiInputBase-root': { bgcolor: 'rgba(255,255,255,0.06)', color: 'oklch(0.98 0 0)' },
                    '& .MuiOutlinedInput-notchedOutline': { borderColor: 'oklch(0.28 0 0)' },
                    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'oklch(0.32 0 0)' },
                    '& .MuiSvgIcon-root': { color: 'oklch(0.90 0 0)' },
                    '& input::placeholder': { color: 'oklch(0.80 0 0)', opacity: 1 }
                  }} />
                  <Tooltip title={isES ? 'Actualizar desde blockchain' : 'Refresh from blockchain'}>
                    <IconButton 
                      onClick={handleRefresh} 
                      disabled={refreshing || loading}
                      sx={{ 
                        color: 'oklch(0.98 0 0)', 
                        border: '1px solid oklch(0.28 0 0)', 
                        bgcolor: 'rgba(255,255,255,0.04)',
                        '&:disabled': { color: 'oklch(0.5 0 0)' }
                      }}
                    >
                      {refreshing ? <CircularProgress size={20} sx={{ color: 'inherit' }} /> : <RefreshIcon />}
                    </IconButton>
                  </Tooltip>
                  <IconButton onClick={()=>setOpenFilters(true)} sx={{ color: 'oklch(0.98 0 0)', border: '1px solid oklch(0.28 0 0)', bgcolor: 'rgba(255,255,255,0.04)' }}><TuneIcon /></IconButton>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Only category grid remains */}

        <Box sx={{ py: 4 }}>
          {/* Header hidden per request */}
          {/* Category chips pending real taxonomy */}
          <Grid container spacing={2}>
            {loading && items.length === 0 && Array.from({ length: 6 }).map((_, i) => (
              <Grid key={`sk-${i}`} item xs={12} sm={6} md={4}>
                <Card sx={{ borderRadius: '16px', border: '1px solid', borderColor: 'oklch(0.22 0 0)', background: 'linear-gradient(180deg, rgba(22,26,36,0.6), rgba(12,15,24,0.6))', boxShadow: '0 0 0 1px rgba(255,255,255,0.02) inset, 0 8px 24px rgba(0,0,0,0.35)', backdropFilter: 'blur(8px)' }}>
                  <Skeleton variant="rectangular" height={160} />
                  <CardContent sx={{ p: 3 }}>
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
                <Card sx={{ borderRadius: '16px', border: '1px solid', borderColor: 'oklch(0.22 0 0)', background: 'linear-gradient(180deg, rgba(22,26,36,0.6), rgba(12,15,24,0.6))', boxShadow: '0 0 0 1px rgba(255,255,255,0.02) inset, 0 8px 24px rgba(0,0,0,0.35)', backdropFilter: 'blur(8px)' }}>
                  <CardContent sx={{ p: 3 }}>
                    <Stack spacing={2} alignItems="center" justifyContent="center" sx={{ py: 4 }}>
                      <Typography variant="subtitle1" fontWeight={700} sx={{ color: 'oklch(0.98 0 0)' }}>
                        {isES ? 'Estamos cargando los modelos…' : 'We are loading the models…'}
                      </Typography>
                      <Typography variant="body2" sx={{ color: 'oklch(0.78 0 0)' }}>
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
                  industries: m.industries,
                  useCases: m.useCases,
                  rights: m.rights,
                  demoPreset: m.demoPreset,
                  artifacts: m.artifacts,
                  deliveryMode: m.deliveryMode,
                  // price_perpetual is in USDC base units (6 decimals), not AVAX
                  pricePerpetual: m.price_perpetual ? `${(Number(m.price_perpetual)/1e6).toFixed(2)} USDC` : undefined,
                  // price_subscription is in USDC base units (6 decimals)
                  priceSubscription: m.price_subscription ? `${(Number(m.price_subscription)/1e6).toFixed(2)} USDC/${isES?'mes':'mo'}` : undefined,
                  pricePerInference: m.pricePerInference || m.price_per_inference || undefined,
                  version: m.version || undefined,
                  agentId: m.agentId || m.modelId,
                }} href={m.modelId ? `/${locale}/evm/models/${m.modelId}` : undefined} priority={idx < 3} onMeta={onCardMeta} preMeta={(m as any).__preMeta} />
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
