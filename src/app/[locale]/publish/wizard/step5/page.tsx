"use client";
import { useEffect, useMemo, useState, useRef } from 'react'
import { Box, Button, Paper, Typography, Stack, Grid, Chip, List, ListItem, ListItemText, Divider, Alert, Checkbox, FormControlLabel, Table, TableHead, TableRow, TableCell, TableBody, IconButton, Tooltip, Skeleton, SvgIcon, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import GitHubIcon from '@mui/icons-material/GitHub'
import LanguageIcon from '@mui/icons-material/Language'
import LinkedInIcon from '@mui/icons-material/LinkedIn'
// removed copy actions per request
import { useLocale, useTranslations } from 'next-intl'
import { useWalletAddress } from '@/hooks/useWalletAddress'
import { useRouter } from 'next/navigation'

const XIcon = (props: any) => (
  <SvgIcon {...props} viewBox="0 0 24 24">
    <path d="M3 2l8 10-8 10h3l6.5-8L19 22h3l-8-10 8-10h-3l-6.5 8L6 2H3z" fill="currentColor" />
  </SvgIcon>
)

async function publishModel(payload: any) {
  let addr: string | null = null
  try { addr = await (window as any)?.ethereum?.request?.({ method: 'eth_accounts' }).then((a: string[]) => a?.[0] || null) } catch {}
  const res = await fetch('/api/models/publish', { method: 'POST', headers: { 'content-type': 'application/json', ...(addr ? { 'X-Wallet-Address': addr } : {}) }, body: JSON.stringify(addr ? { ...payload, address: addr } : payload) })
  return res.json()
}

async function saveDraft(payload: any) {
  let addr: string | null = null
  try { addr = await (window as any)?.ethereum?.request?.({ method: 'eth_accounts' }).then((a: string[]) => a?.[0] || null) } catch {}
  const res = await fetch('/api/models/draft', { method: 'POST', headers: { 'content-type': 'application/json', ...(addr ? { 'X-Wallet-Address': addr } : {}) }, body: JSON.stringify(addr ? { ...payload, address: addr } : payload) })
  return res.json()
}

async function loadDraft() {
  let addr: string | null = null
  try { addr = await (window as any)?.ethereum?.request?.({ method: 'eth_accounts' }).then((a: string[]) => a?.[0] || null) } catch {}
  const res = await fetch('/api/models/draft' + (addr ? `?address=${addr}` : ''), { method: 'GET', headers: addr ? { 'X-Wallet-Address': addr } : {} })
  return res.json()
}

export default function Step5ReviewPublishLocalized() {
  const t = useTranslations()
  const locale = useLocale()
  const base = `/${locale}/publish/wizard`
  const router = useRouter()
  const [draft, setDraft] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [targets, setTargets] = useState<Array<{chain:'evm'|'sui', network:'base'|'avax'|'testnet'}>>([])
  const [publishing, setPublishing] = useState(false)
  const [results, setResults] = useState<Array<{ chain:string, network:string, ok:boolean, tx?:any, error?:string }>>([])
  const [msg, setMsg] = useState('')
  const [accepted, setAccepted] = useState(false)
  const { walletAddress } = useWalletAddress()
  const [mounted, setMounted] = useState(false)
  const [shouldFade, setShouldFade] = useState(true)
  const [loadedRemote, setLoadedRemote] = useState(false)
  const [resetOpen, setResetOpen] = useState(false)
  const [resetting, setResetting] = useState(false)
  const acceptLabel = useMemo(() => (
    locale === 'es'
      ? 'He revisado toda la información y confirmo que es correcta para su publicación.'
      : 'I have reviewed all the information and confirm it is correct for publication.'
  ), [locale])

  // Local labels for Artifacts section
  const A = useMemo(() => (
    locale === 'es' ? {
      sectionTitle: 'Artefactos (IPFS)',
      total: 'Total',
      file: 'Archivo',
      cid: 'CID',
      uri: 'URI',
      sha256: 'SHA-256',
      actions: 'Acciones',
      view: 'Ver'
    } : {
      sectionTitle: 'Artifacts (IPFS)',
      total: 'Total',
      file: 'File',
      cid: 'CID',
      uri: 'URI',
      sha256: 'SHA-256',
      actions: 'Actions',
      view: 'View'
    }
  ), [locale])

  // Local labels for Business section
  const B = useMemo(() => (
    locale === 'es' ? {
      sectionTitle: 'Negocio',
      valueProp: 'Propuesta de valor (pitch)',
      description: 'Descripción para clientes',
      industries: 'Industrias',
      useCases: 'Casos de uso',
      expectedImpact: 'Impacto esperado',
      inputs: 'Entradas',
      outputs: 'Salidas',
      examples: 'Ejemplos I/O',
      risks: 'Limitaciones / Riesgos',
      privacy: 'Privacidad',
      deploy: 'Opciones de despliegue',
      support: 'Soporte',
      supportedLanguages: 'Idiomas soportados',
      primaryLanguage: 'Idioma principal',
      modelType: 'Tipo de modelo',
      metrics: 'Métricas',
      prohibited: 'Usos prohibidos'
    } : {
      sectionTitle: 'Business',
      valueProp: 'Value proposition (pitch)',
      description: 'Customer description',
      industries: 'Industries',
      useCases: 'Use cases',
      expectedImpact: 'Expected impact',
      inputs: 'Inputs',
      outputs: 'Outputs',
      examples: 'I/O examples',
      risks: 'Limitations / Risks',
      privacy: 'Privacy',
      deploy: 'Deploy options',
      support: 'Support',
      supportedLanguages: 'Supported languages',
      primaryLanguage: 'Primary language',
      modelType: 'Model type',
      metrics: 'Metrics',
      prohibited: 'Prohibited uses'
    }
  ), [locale])

  // Local labels for Compatibility section
  const C = useMemo(() => (
    locale === 'es' ? {
      sectionTitle: 'Compatibilidad',
      tasks: 'Tareas',
      modalities: 'Modalidades',
      frameworks: 'Frameworks',
      architectures: 'Arquitecturas',
      precisions: 'Precisiones',
      quantization: 'Cuantización',
      modelFiles: 'Archivos del modelo',
      modelSizeParams: 'Tamaño del modelo (parámetros)',
      artifactSizeGB: 'Tamaño del artefacto (GB)',
      embeddingDimension: 'Dimensión de embeddings',
      runtime: 'Runtime',
      python: 'Python',
      cuda: 'CUDA',
      torch: 'PyTorch',
      cudnn: 'cuDNN',
      os: 'Sistemas operativos',
      accelerators: 'Aceleradores',
      computeCapability: 'Compute Capability',
      dependencies: 'Dependencias (pip)',
      resources: 'Recursos',
      vramGB: 'VRAM (GB)',
      cpuCores: 'CPU cores',
      ramGB: 'RAM (GB)',
      inference: 'Inferencia',
      maxBatch: 'Tamaño de batch máx.',
      contextLen: 'Longitud de contexto',
      maxTokens: 'Tokens máx.',
      imageResolution: 'Resolución de imagen',
      sampleRate: 'Sample rate (Hz)',
      triton: 'Triton',
      refPerf: 'Latencia / throughput de referencia'
    } : {
      sectionTitle: 'Compatibility',
      tasks: 'Tasks',
      modalities: 'Modalities',
      frameworks: 'Frameworks',
      architectures: 'Architectures',
      precisions: 'Precisions',
      quantization: 'Quantization',
      modelFiles: 'Model files',
      modelSizeParams: 'Model size (parameters)',
      artifactSizeGB: 'Model artifact size (GB)',
      embeddingDimension: 'Embedding dimension',
      runtime: 'Runtime',
      python: 'Python',
      cuda: 'CUDA',
      torch: 'PyTorch',
      cudnn: 'cuDNN',
      os: 'Operating systems',
      accelerators: 'Accelerators',
      computeCapability: 'Compute Capability',
      dependencies: 'Dependencies (pip)',
      resources: 'Resources',
      vramGB: 'VRAM (GB)',
      cpuCores: 'CPU cores',
      ramGB: 'RAM (GB)',
      inference: 'Inference',
      maxBatch: 'Max batch size',
      contextLen: 'Context length',
      maxTokens: 'Max tokens',
      imageResolution: 'Image resolution',
      sampleRate: 'Sample rate (Hz)',
      triton: 'Triton',
      refPerf: 'Reference latency / throughput'
    }
  ), [locale])
  const defaultOrder = useMemo(() => ['model','licenses','compat','business','artifacts'], [])
  const [sectionOrder, setSectionOrder] = useState<string[]>(defaultOrder)
  const draggingIdRef = useRef<string | null>(null)
  const saveOrderTmoRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    setLoading(true)
    // Hydration from local cache to avoid empty initial render
    try {
      const raw = localStorage.getItem('draft_step5_draft')
      if (raw) {
        const cached = JSON.parse(raw)
        if (cached && typeof cached === 'object') {
          setDraft(cached)
          setShouldFade(false)
        }
      }
    } catch {}
    loadDraft()
      .then(r=>{
        if (r?.ok) {
          setDraft(r.data||{})
          try { localStorage.setItem('draft_step5_draft', JSON.stringify(r.data||{})) } catch {}
        }
      })
      .catch(()=>{})
      .finally(()=> { setLoading(false); setLoadedRemote(true) })
  }, [])

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    // Detect connected EVM network and set single target accordingly
    let cancelled = false
    const detect = async () => {
      try {
        const eth = (window as any)?.ethereum
        if (!eth) { setTargets([]); return }
        const chainIdHex = await eth.request?.({ method: 'eth_chainId' }).catch(()=>null)
        const chainId = chainIdHex ? parseInt(chainIdHex, 16) : null
        let network: 'base'|'avax'|'testnet'|null = null
        if (chainId === 84532) network = 'base' // Base Sepolia
        else if (chainId === 43113) network = 'avax' // Avalanche Fuji
        else network = 'testnet'
        if (!cancelled && network) setTargets([{ chain: 'evm', network }])
      } catch {
        if (!cancelled) setTargets([])
      }
    }
    detect()
    return () => { cancelled = true }
  }, [])

  const metadata = useMemo(()=>{
    const s1 = draft?.step1 || {}
    const s2 = draft?.step2 || {}
    const s3 = draft?.step3 || {}
    const s4 = draft?.step4 || {}
    const merged:any = {
      ...s1,
      ...s2,
      artifacts: s3?.artifacts || [],
      licensePolicy: s4?.licensePolicy || undefined,
      downloadNotes: s3?.downloadNotes || undefined,
      version: 1,
    }
    return merged
  }, [draft])

  const truncateMiddle = (s:string, start=6, end=6) => {
    if (!s) return '-'
    if (s.length <= start + end + 3) return s
    return `${s.slice(0,start)}…${s.slice(-end)}`
  }

  const Trunc: React.FC<{ value: string | number | null | undefined; max?: number; middle?: boolean; title?: string }> = ({ value, max=32, middle=false, title }) => {
    const raw = value == null ? '' : String(value)
    const shown = middle ? truncateMiddle(raw) : (raw.length>max ? `${raw.slice(0,max-1)}…` : raw)
    const tip = title ?? raw
    return (
      <Tooltip title={tip || ''} disableHoverListener={!tip}>
        <span style={{ display:'inline-block', maxWidth: '100%', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'normal', wordBreak:'break-word', lineHeight:1.35 }}>{shown || '-'}</span>
      </Tooltip>
    )
  }

  const ChipsShort: React.FC<{ items?: string[]; max?: number }> = ({ items, max=4 }) => {
    const arr = Array.isArray(items)? items : []
    const head = arr.slice(0, max)
    const rest = Math.max(0, arr.length - head.length)
    return (
      <Box sx={{ display:'flex', flexWrap:'wrap', gap:0.5 }}>
        {head.map((v, i)=> (
          <Tooltip key={`${v}-${i}`} title={v}><Chip size="small" label={<span style={{ maxWidth: 160, display:'inline-block', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{v}</span>} /></Tooltip>
        ))}
        {rest>0 && <Chip size="small" label={`+${rest}`} />}
      </Box>
    )
  }

  const Row: React.FC<{ label: React.ReactNode; value: React.ReactNode }> = ({ label, value }) => (
    <ListItem sx={{ py: { xs:0.75, md:0.5 } }}>
      <Box sx={{ display:'grid', gridTemplateColumns:{ xs:'minmax(120px, 42%) 1fr', sm:'minmax(160px, 38%) 1fr', md:'220px 1fr' }, alignItems:'start', columnGap: 1.5, width:'100%' }}>
        <Typography variant="body2" color="text.secondary" sx={{ fontWeight:600, pr:{ xs:0.5, md:0 } }}>{label}</Typography>
        <Box sx={{ minWidth:0, wordBreak:'break-word' }}>{value}</Box>
      </Box>
    </ListItem>
  )

  const formatPrice = (v:any) => {
    const n = Number(v||0)
    return n.toLocaleString()
  }

  // Local readable labels (avoid raw wizard.* keys here)
  const L = useMemo(() => (
    locale === 'es' ? {
      sectionTitle: 'Licencias y Términos',
      perpetual: 'Perpetuo',
      subscriptionPerMonth: 'Suscripción / mes',
      baseDurationDays: 'Duración base',
      month: 'mes',
      months: 'meses',
      royalty: 'Royalty',
      marketplaceFee: 'Comisión del marketplace',
      rights: 'Derechos',
      deliveryMode: 'Modo de entrega',
      splitPerpetual: 'Distribución (Perpetuo)',
      splitSubscription: 'Distribución (Suscripción)',
      marketplace: 'Marketplace',
      creator: 'Creador',
      seller: 'Vendedor',
      termsText: 'Términos'
    } : {
      sectionTitle: 'Licenses & Terms',
      perpetual: 'Perpetual',
      subscriptionPerMonth: 'Subscription / month',
      baseDurationDays: 'Base duration',
      month: 'month',
      months: 'months',
      royalty: 'Royalty',
      marketplaceFee: 'Marketplace fee',
      rights: 'Rights',
      deliveryMode: 'Delivery mode',
      splitPerpetual: 'Split (Perpetual)',
      splitSubscription: 'Split (Subscription)',
      marketplace: 'Marketplace',
      creator: 'Creator',
      seller: 'Seller',
      termsText: 'Terms text'
    }
  ), [locale])

  const formatDurationDays = (days:any) => {
    const d = Number(days||0)
    if (d<=0) return '—'
    const months = Math.round(d/30)
    return `${months} ${months===1? L.month : L.months}`
  }

  // Local common labels (avoid missing next-intl keys)
  const COMMON = useMemo(() => (
    locale === 'es'
      ? { edit: 'Editar', noNetwork: 'Sin red detectada' }
      : { edit: 'Edit', noNetwork: 'No network detected' }
  ), [locale])

  const issues = useMemo(() => {
    const msgs:string[] = []
    const arts = Array.isArray(metadata?.artifacts) ? metadata.artifacts : []
    if (arts.length === 0 || arts.some((a:any)=>!a?.cid)) msgs.push(t('wizard.step5.issues.artifacts'))
    const rights = Array.isArray(metadata?.licensePolicy?.rights) ? metadata.licensePolicy.rights : []
    if (rights.length === 0) msgs.push(t('wizard.step5.issues.rights'))
    const perp = Number(metadata?.licensePolicy?.perpetual?.priceRef || 0)
    const sub = Number(metadata?.licensePolicy?.subscription?.perMonthPriceRef || 0)
    const dur = Number(metadata?.licensePolicy?.defaultDurationDays || 0)
    if (!(perp>0 || sub>0)) msgs.push(t('wizard.step5.issues.onePrice'))
    if (sub>0 && !(dur>0)) msgs.push(t('wizard.step5.issues.subNeedsDuration'))
    return msgs
  }, [metadata, t])

  // Unit and split helpers (align with step 4)
  const unit = useMemo<'AVAX'|'ETH'>(() => {
    const n = targets[0]?.network
    return n === 'avax' ? 'AVAX' : 'ETH'
  }, [targets])
  const feeBpsEnv = useMemo(()=> parseInt(process.env.NEXT_PUBLIC_MARKETPLACE_FEE_BPS || process.env.NEXT_PUBLIC_MARKET_FEE_BPS || '1000') || 1000, [])
  const feeBpsEff5 = Number(metadata?.licensePolicy?.feeBps || feeBpsEnv)
  const royaltyBps = Number(metadata?.licensePolicy?.royaltyBps || 0)
  const fmt2Up = (v:number) => (Math.ceil(v * 100) / 100).toFixed(2)
  const splitFor = (amount:number) => {
    const fee = (amount * feeBpsEff5) / 10000
    const royalty = (amount * royaltyBps) / 10000
    const seller = Math.max(0, amount - fee - royalty)
    return { fee, royalty, seller }
  }

  useEffect(() => {
    const o = draft?.step5?.sectionOrder
    const allowed = new Set(defaultOrder)
    if (Array.isArray(o) && o.length) {
      const incoming = o.filter((id:string)=>allowed.has(id))
      const merged = [...incoming]
      for (const id of defaultOrder) if (!merged.includes(id)) merged.push(id)
      setSectionOrder(merged)
    } else {
      setSectionOrder(defaultOrder)
    }
  }, [draft, defaultOrder])

  const saveOrder = (order:string[]) => {
    if (saveOrderTmoRef.current) clearTimeout(saveOrderTmoRef.current)
    saveOrderTmoRef.current = setTimeout(() => {
      saveDraft({ step: 'step5', data: { sectionOrder: order, ts: Date.now() } }).catch(()=>{})
    }, 500)
  }

  const onDragStart = (id:string) => { draggingIdRef.current = id }
  const onDragOver = (e: React.DragEvent, overId:string) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move' }
  const onDrop = (overId:string) => {
    const from = draggingIdRef.current
    draggingIdRef.current = null
    if (!from || from===overId) return
    setSectionOrder(prev => {
      const next = prev.slice()
      const i = next.indexOf(from)
      const j = next.indexOf(overId)
      if (i<0 || j<0) return prev
      next.splice(i,1)
      next.splice(j,0,from)
      saveOrder(next)
      return next
    })
  }

  const resetOrder = () => { setSectionOrder(defaultOrder); saveOrder(defaultOrder) }

  const onPublish = async () => {
    setPublishing(true)
    setMsg('')
    setResults([])
    try {
      let allOk = true
      for (const tnet of targets) {
        const r = await publishModel({ chain: tnet.chain, network: tnet.network, metadata, address: walletAddress })
        const ok = !!r?.ok
        if (!ok) allOk = false
        setResults(prev=>[...prev, { chain: tnet.chain, network: tnet.network, ok, tx: r?.onchain, error: r?.error }])
      }
      setMsg(t('wizard.step5.messages.publishDone'))
      if (allOk) {
        try { setResetOpen(true) } catch {}
      }
    } catch {
      setMsg(t('wizard.step5.messages.publishError'))
    } finally {
      setPublishing(false)
    }
  }

  const onSave = async () => {
    setMsg('')
    try {
      await saveDraft({ step: 'step5', data: { publishedTargets: targets, ts: Date.now() } })
      setMsg(t('wizard.common.saved'))
    } catch {
      setMsg(t('wizard.common.errorSaving'))
    }
  }

  const networkLabel = useMemo(()=> targets.length>0 ? `${targets[0].chain.toUpperCase()} / ${targets[0].network}` : COMMON.noNetwork, [targets, COMMON])

  const clearWizardLocal = () => {
    try {
      const keys: string[] = []
      for (let i=0; i<localStorage.length; i++) {
        const k = localStorage.key(i)
        if (!k) continue
        if (k.startsWith('draft_step')) keys.push(k)
      }
      for (const k of keys) {
        try { localStorage.removeItem(k) } catch {}
      }
    } catch {}
  }

  const clearWizardRemote = async () => {
    try {
      // 1) Delete anonymous (IP/UA) bucket
      await fetch('/api/models/draft', { method: 'DELETE' }).catch(()=>{})

      // 2) Delete wallet-scoped bucket via header + query (cover both code paths)
      let addr = walletAddress
      if (!addr) {
        try { addr = await (window as any)?.ethereum?.request?.({ method: 'eth_accounts' }).then((a: string[]) => a?.[0] || null) } catch {}
      }
      if (addr) {
        const headers: Record<string,string> = { 'content-type': 'application/json', 'X-Wallet-Address': addr }
        await fetch('/api/models/draft', { method: 'DELETE', headers }).catch(()=>{})
        await fetch(`/api/models/draft?address=${encodeURIComponent(addr)}`, { method: 'DELETE', headers }).catch(()=>{})
      }

      // 3) Verify cleared; if not, retry once
      const checkAnon = await fetch('/api/models/draft', { method: 'GET' }).then(r=>r.json()).catch(()=>null)
      let hasData = Boolean(checkAnon && checkAnon.data && Object.keys(checkAnon.data||{}).length > 0)
      if (addr && !hasData) {
        const headers: Record<string,string> = { 'X-Wallet-Address': addr }
        const checkWal = await fetch('/api/models/draft', { method: 'GET', headers }).then(r=>r.json()).catch(()=>null)
        hasData = Boolean(checkWal && checkWal.data && Object.keys(checkWal.data||{}).length > 0)
      }
      if (hasData) {
        await fetch('/api/models/draft', { method: 'DELETE' }).catch(()=>{})
        if (addr) {
          const headers: Record<string,string> = { 'content-type': 'application/json', 'X-Wallet-Address': addr }
          await fetch('/api/models/draft', { method: 'DELETE', headers }).catch(()=>{})
          await fetch(`/api/models/draft?address=${encodeURIComponent(addr)}`, { method: 'DELETE', headers }).catch(()=>{})
        }
      }
    } catch {}
  }

  const onConfirmReset = async () => {
    setResetting(true)
    try {
      try { if (typeof window !== 'undefined') { localStorage.setItem('wizard_resetting','1'); sessionStorage.setItem('wizard_resetting','1') } } catch {}
      clearWizardLocal()
      await clearWizardRemote()
      try { setResetOpen(false) } catch {}
      try {
        if (typeof window !== 'undefined') {
          const target = `${base}?r=${Date.now()}`
          window.location.replace(target)
        }
      } catch { router.replace(base) }
    } finally {
      setResetting(false)
    }
  }

  return (
    <div style={{padding:24, maxWidth:1000, margin:'0 auto'}}>
      <Typography variant="h5" sx={{ fontWeight:700 }}>{t('wizard.step5.title')}</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt:0.5, mb:1.5 }}>
        {t('wizard.step5.subtitle')}
      </Typography>

      <Box sx={{ display:'flex', alignItems:'center', justifyContent:'space-between', mb:1 }}>
        <Typography variant="h6" sx={{ fontWeight:600 }}>{t('wizard.step5.sections.summary')}</Typography>
        <Button onClick={resetOrder} size="small" variant="text">{locale==='es'?'Restablecer orden':'Reset order'}</Button>
      </Box>
      {sectionOrder.map((secId)=>{
        if (secId==='model') {
          return (
            <div key={secId} draggable onDragStart={()=>onDragStart(secId)} onDragOver={(e)=>onDragOver(e,secId)} onDrop={()=>onDrop(secId)}>
              <Paper variant="outlined" sx={{ p:{ xs:2, md:3 }, mb:2, borderRadius:2 }}>
                <Box sx={{ display:'flex', alignItems:'center', justifyContent:'space-between', mb:1 }}>
                  <Typography variant="subtitle2" sx={{ color:'primary.main', fontWeight:700 }}>{t('wizard.step5.sections.modelInfo')}</Typography>
                  <Tooltip title={COMMON.edit}>
                    <IconButton size="small" href={`${base}/step1`} aria-label={COMMON.edit}>
                      <EditOutlinedIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
                {loading ? (
                  <List dense>
                    <ListItem><Skeleton animation="wave" variant="text" width={220} /></ListItem>
                    <ListItem><Skeleton animation="wave" variant="text" width={260} /></ListItem>
                    <ListItem><Skeleton animation="wave" variant="text" width={200} /></ListItem>
                    <ListItem><Skeleton animation="wave" variant="text" width={220} /></ListItem>
                    <ListItem><Skeleton animation="wave" variant="rectangular" height={100} /></ListItem>
                  </List>
                ) : (
                  <Box sx={{ transition:'opacity 150ms ease 40ms', willChange:'opacity', opacity: shouldFade ? (loadedRemote ? 1 : 0) : 1 }}>
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={8}>
                      <List dense>
                        <ListItem>
                          <Box sx={{ display:'grid', gridTemplateColumns: { xs:'auto 1fr', md:'180px 1fr' }, alignItems:'center', columnGap: 1, width:'100%' }}>
                            <Typography variant="body2" color="text.secondary" sx={{ fontWeight:600 }}>{t('wizard.step5.labels.name')}:</Typography>
                            <Box><Trunc value={metadata?.name} max={40} /></Box>
                          </Box>
                        </ListItem>
                        {Boolean((metadata as any)?.slug) && (
                          <ListItem>
                            <Box sx={{ display:'grid', gridTemplateColumns: { xs:'auto 1fr', md:'180px 1fr' }, alignItems:'center', columnGap: 1, width:'100%' }}>
                              <Typography variant="body2" color="text.secondary" sx={{ fontWeight:600 }}>{locale==='es' ? 'Identificador (URL)' : 'Identifier (URL)'}:</Typography>
                              <Box>
                                <Typography variant="body2" color="text.secondary">
                                  {(typeof window!=='undefined' ? window.location.origin : '') + `/${locale}/models/` + String((metadata as any).slug || '')}
                                </Typography>
                              </Box>
                            </Box>
                          </ListItem>
                        )}
                        <ListItem>
                          <Box sx={{ display:'grid', gridTemplateColumns: { xs:'auto 1fr', md:'180px 1fr' }, alignItems:'center', columnGap: 1, width:'100%' }}>
                            <Typography variant="body2" color="text.secondary" sx={{ fontWeight:600 }}>{t('wizard.step5.labels.author')}:</Typography>
                            <Box><Trunc value={(metadata as any)?.author?.displayName} max={40} /></Box>
                          </Box>
                        </ListItem>
                        {Boolean((metadata as any)?.shortSummary) && (
                          <ListItem>
                            <Box sx={{ display:'grid', gridTemplateColumns: { xs:'auto 1fr', md:'180px 1fr' }, alignItems:'start', columnGap: 1, width:'100%' }}>
                              <Typography variant="body2" color="text.secondary" sx={{ fontWeight:600 }}>{t('wizard.step1.fields.summary.label')}:</Typography>
                              <Box><Trunc value={(metadata as any)?.shortSummary} max={120} /></Box>
                            </Box>
                          </ListItem>
                        )}
                        {Boolean((metadata as any)?.author?.links && Object.keys((metadata as any).author.links).length>0) && (
                          <ListItem>
                            <Box sx={{ display:'grid', gridTemplateColumns: { xs:'auto 1fr', md:'180px 1fr' }, alignItems:'center', columnGap: 1, width:'100%' }}>
                              <Typography variant="body2" color="text.secondary" sx={{ fontWeight:600 }}>{t('wizard.step1.fields.socials.title')}:</Typography>
                              <Box>
                                {Object.entries((metadata as any).author.links).filter(([,v])=>!!v).map(([k,v]: any, i: number)=> {
                                  const label = k==='github'? 'GitHub' : k==='website'? 'Website' : k==='twitter'? 'X' : k==='linkedin'? 'LinkedIn' : k
                                  const icon = k==='github'? <GitHubIcon /> : k==='website'? <LanguageIcon /> : k==='twitter'? <XIcon /> : k==='linkedin'? <LinkedInIcon /> : undefined
                                  return (
                                    <Tooltip key={`${k}-${i}`} title={`${label}: ${v}`}>
                                      <IconButton size="small" sx={{ mr:0.5, mb:0.5 }} aria-label={label} onClick={()=>{ try { if (v) window.open(String(v), '_blank', 'noopener,noreferrer') } catch {} }}>
                                        {icon}
                                      </IconButton>
                                    </Tooltip>
                                  )
                                })}
                              </Box>
                            </Box>
                          </ListItem>
                        )}
                      </List>
                    </Grid>
                    <Grid item xs={12} md={4}>
                      {Boolean((metadata as any)?.cover?.thumbCid || (metadata as any)?.cover?.cid) && (
                        <Box sx={{ display:'flex', alignItems:'center', justifyContent:'center', width:'100%', maxWidth:'100%', overflow:'hidden' }}>
                          <img
                            src={`https://ipfs.io/ipfs/${(metadata as any).cover.thumbCid || (metadata as any).cover.cid}`}
                            alt="cover"
                            loading="lazy"
                            style={{
                              maxWidth: '100%',
                              height: 'auto',
                              maxHeight: 160,
                              borderRadius: 8,
                              objectFit: 'contain',
                              display: 'block',
                              margin: '0 auto'
                            }}
                          />
                        </Box>
                      )}
                    </Grid>
                  </Grid>
                  </Box>
                )}
              </Paper>
            </div>
          )
        }
        if (secId==='licenses') {
          return (
            <div key={secId} draggable onDragStart={()=>onDragStart(secId)} onDragOver={(e)=>onDragOver(e,secId)} onDrop={()=>onDrop(secId)}>
              <Paper variant="outlined" sx={{ p:{ xs:2, md:3 }, mb:2, borderRadius:2 }}>
                <Box sx={{ display:'flex', alignItems:'center', justifyContent:'space-between', mb:1 }}>
                  <Typography variant="subtitle2" sx={{ color:'primary.main', fontWeight:700 }}>{L.sectionTitle}</Typography>
                  <Tooltip title={COMMON.edit}>
                    <IconButton size="small" href={`${base}/step4`} aria-label={COMMON.edit}>
                      <EditOutlinedIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
                <List dense>
                  {loading ? (
                    <>
                      <ListItem><Skeleton animation="wave" variant="text" width={220} /></ListItem>
                      <ListItem><Skeleton animation="wave" variant="text" width={260} /></ListItem>
                      <ListItem><Skeleton animation="wave" variant="text" width={180} /></ListItem>
                      <ListItem><Skeleton animation="wave" variant="text" width={220} /></ListItem>
                      <ListItem><Skeleton animation="wave" variant="text" width={200} /></ListItem>
                    </>
                  ) : (
                    <Box sx={{ transition:'opacity 150ms ease 40ms', willChange:'opacity', opacity: shouldFade ? (loadedRemote ? 1 : 0) : 1 }}>
                      {/* Prices with unit */}
                      <Row label={L.perpetual} value={<>{fmt2Up(Number(metadata?.licensePolicy?.perpetual?.priceRef||0))} {unit}</>} />
                      <Row label={L.subscriptionPerMonth} value={<>{fmt2Up(Number(metadata?.licensePolicy?.subscription?.perMonthPriceRef||0))} {unit}</>} />
                      <Row label={L.baseDurationDays} value={formatDurationDays(metadata?.licensePolicy?.defaultDurationDays)} />
                      {/* Royalty percent */}
                      <Row label={L.royalty} value={<>{Math.round((royaltyBps||0)/100)}%</>} />
                      {/* Marketplace fee percent */}
                      <Row label={L.marketplaceFee} value={<>{Math.round((feeBpsEff5||0)/100)}%</>} />

                      <Divider sx={{ my: 1 }} />

                      {/* Revenue split calculations below royalty */}
                      {Number(metadata?.licensePolicy?.perpetual?.priceRef||0) > 0 && (()=>{
                        const amt = Number(metadata?.licensePolicy?.perpetual?.priceRef||0)
                        const s = splitFor(amt)
                        return (
                          <Row label={L.splitPerpetual} value={<>
                            {L.marketplace}: {fmt2Up(s.fee)} {unit} • {L.creator}: {fmt2Up(s.royalty)} {unit} • {L.seller}: {fmt2Up(s.seller)} {unit}
                          </>} />
                        )
                      })()}
                      {Number(metadata?.licensePolicy?.subscription?.perMonthPriceRef||0) > 0 && (()=>{
                        const amt = Number(metadata?.licensePolicy?.subscription?.perMonthPriceRef||0)
                        const s = splitFor(amt)
                        return (
                          <Row label={L.splitSubscription} value={<>
                            {L.marketplace}: {fmt2Up(s.fee)} {unit} • {L.creator}: {fmt2Up(s.royalty)} {unit} • {L.seller}: {fmt2Up(s.seller)} {unit}
                          </>} />
                        )
                      })()}

                      <Divider sx={{ my: 1 }} />

                      {/* Rights and delivery after distribution */}
                      <Row label={L.rights} value={<ChipsShort items={metadata?.licensePolicy?.rights} />} />
                      <Row label={L.deliveryMode} value={<ChipsShort items={metadata?.licensePolicy?.delivery} />} />

                      {/* Terms text */}
                      {Boolean(metadata?.licensePolicy?.termsText) && (
                        <Row label={L.termsText} value={<Trunc value={String(metadata?.licensePolicy?.termsText||'')} max={200} />} />
                      )}
                    </Box>
                  )}
                </List>
              </Paper>
            </div>
          )
        }
        if (secId==='compat') {
          return (
            <div key={secId} draggable onDragStart={()=>onDragStart(secId)} onDragOver={(e)=>onDragOver(e,secId)} onDrop={()=>onDrop(secId)}>
              <Paper variant="outlined" sx={{ p:{ xs:2, md:3 }, mb:2, borderRadius:2 }}>
                <Box sx={{ display:'flex', alignItems:'center', justifyContent:'space-between', mb:1 }}>
                  <Typography variant="subtitle2" sx={{ color:'primary.main', fontWeight:700 }}>{C.sectionTitle}</Typography>
                  <Tooltip title={COMMON.edit}>
                    <IconButton size="small" href={`${base}/step2`} aria-label={COMMON.edit}>
                      <EditOutlinedIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
                <Grid container spacing={1.5}>
                  <Grid item xs={12} md={6}>
                    <List dense>
                      {loading ? (
                        <>
                          <ListItem><Skeleton animation="wave" variant="text" width={260} /></ListItem>
                          <ListItem><Skeleton animation="wave" variant="text" width={240} /></ListItem>
                          <ListItem><Skeleton animation="wave" variant="text" width={220} /></ListItem>
                          <ListItem><Skeleton animation="wave" variant="text" width={200} /></ListItem>
                        </>
                      ) : (
                        <Box sx={{ transition:'opacity 150ms ease 40ms', willChange:'opacity', opacity: shouldFade ? (loadedRemote ? 1 : 0) : 1 }}>
                          <Row label={C.tasks} value={<ChipsShort items={metadata?.capabilities?.tasks} />} />
                          <Row label={C.modalities} value={<ChipsShort items={metadata?.capabilities?.modalities} />} />
                          <Row label={C.frameworks} value={<ChipsShort items={metadata?.architecture?.frameworks} />} />
                          <Row label={C.architectures} value={<ChipsShort items={metadata?.architecture?.architectures} />} />
                        </Box>
                      )}
                    </List>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <List dense>
                      {loading ? (
                        <>
                          <ListItem><Skeleton animation="wave" variant="text" width={220} /></ListItem>
                          <ListItem><Skeleton animation="wave" variant="text" width={200} /></ListItem>
                          <ListItem><Skeleton animation="wave" variant="text" width={220} /></ListItem>
                        </>
                      ) : (
                        <Box sx={{ transition:'opacity 150ms ease 40ms', willChange:'opacity', opacity: shouldFade ? (loadedRemote ? 1 : 0) : 1 }}>
                          <Row label={C.precisions} value={<ChipsShort items={metadata?.architecture?.precisions} />} />
                          <Row label={C.quantization} value={<Trunc value={metadata?.architecture?.quantization} max={24} />} />
                          <Row label={C.modelFiles} value={<ChipsShort items={metadata?.architecture?.modelFiles} />} />
                        </Box>
                      )}
                    </List>
                  </Grid>
                </Grid>
                {loading ? (
                  <>
                    <Divider sx={{ my: 1 }} />
                    <Grid container spacing={1.5}>
                      <Grid item xs={12} md={6}>
                        <List dense>
                          <ListItem><Skeleton animation="wave" variant="text" width={200} /></ListItem>
                          <ListItem><Skeleton animation="wave" variant="text" width={180} /></ListItem>
                          <ListItem><Skeleton animation="wave" variant="text" width={160} /></ListItem>
                        </List>
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <List dense>
                          <ListItem><Skeleton animation="wave" variant="text" width={200} /></ListItem>
                          <ListItem><Skeleton animation="wave" variant="text" width={220} /></ListItem>
                        </List>
                      </Grid>
                    </Grid>
                    <Divider sx={{ my: 1 }} />
                    <Skeleton animation="wave" variant="text" width={120} sx={{ mb:0.5 }} />
                    <Grid container spacing={1.5}>
                      <Grid item xs={12} md={6}>
                        <List dense>
                          <ListItem><Skeleton animation="wave" variant="text" width={180} /></ListItem>
                          <ListItem><Skeleton animation="wave" variant="text" width={180} /></ListItem>
                          <ListItem><Skeleton animation="wave" variant="text" width={180} /></ListItem>
                          <ListItem><Skeleton animation="wave" variant="text" width={160} /></ListItem>
                        </List>
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <List dense>
                          <ListItem><Skeleton animation="wave" variant="text" width={200} /></ListItem>
                          <ListItem><Skeleton animation="wave" variant="text" width={240} /></ListItem>
                          <ListItem><Skeleton animation="wave" variant="text" width={200} /></ListItem>
                        </List>
                      </Grid>
                    </Grid>
                    <Divider sx={{ my: 1 }} />
                    <Skeleton animation="wave" variant="text" width={120} sx={{ mb:0.5 }} />
                    <Grid container spacing={1.5}>
                      <Grid item xs={12} md={6}>
                        <List dense>
                          <ListItem><Skeleton animation="wave" variant="text" width={140} /></ListItem>
                          <ListItem><Skeleton animation="wave" variant="text" width={140} /></ListItem>
                        </List>
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <List dense>
                          <ListItem><Skeleton animation="wave" variant="text" width={140} /></ListItem>
                        </List>
                      </Grid>
                    </Grid>
                    <Divider sx={{ my: 1 }} />
                    <Skeleton animation="wave" variant="text" width={120} sx={{ mb:0.5 }} />
                    <Grid container spacing={1.5}>
                      <Grid item xs={12} md={6}>
                        <List dense>
                          <ListItem><Skeleton animation="wave" variant="text" width={160} /></ListItem>
                          <ListItem><Skeleton animation="wave" variant="text" width={160} /></ListItem>
                          <ListItem><Skeleton animation="wave" variant="text" width={160} /></ListItem>
                        </List>
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <List dense>
                          <ListItem><Skeleton animation="wave" variant="text" width={180} /></ListItem>
                          <ListItem><Skeleton animation="wave" variant="text" width={140} /></ListItem>
                          <ListItem><Skeleton animation="wave" variant="text" width={100} /></ListItem>
                          <ListItem><Skeleton animation="wave" variant="text" width={220} /></ListItem>
                        </List>
                      </Grid>
                    </Grid>
                  </>
                ) : (
                  <Box sx={{ position:'relative', minHeight: 240 }}>
                    {shouldFade && !loadedRemote && (
                      <Box sx={{ position:'absolute', inset:0, pointerEvents:'none', p:1, opacity:1, transition:'opacity 150ms ease 60ms' }}>
                        <Divider sx={{ my: 1 }} />
                        <Grid container spacing={1.5}>
                          <Grid item xs={12} md={6}>
                            <List dense>
                              <ListItem><Skeleton animation="wave" variant="text" width={180} /></ListItem>
                              <ListItem><Skeleton animation="wave" variant="text" width={160} /></ListItem>
                              <ListItem><Skeleton animation="wave" variant="text" width={140} /></ListItem>
                            </List>
                          </Grid>
                          <Grid item xs={12} md={6}>
                            <List dense>
                              <ListItem><Skeleton animation="wave" variant="text" width={200} /></ListItem>
                            </List>
                          </Grid>
                        </Grid>
                        <Divider sx={{ my: 1 }} />
                        <Skeleton animation="wave" variant="text" width={140} sx={{ mb:0.5 }} />
                        <Grid container spacing={1.5}>
                          <Grid item xs={12} md={6}>
                            <List dense>
                              <ListItem><Skeleton animation="wave" variant="text" width={160} /></ListItem>
                              <ListItem><Skeleton animation="wave" variant="text" width={160} /></ListItem>
                              <ListItem><Skeleton animation="wave" variant="text" width={160} /></ListItem>
                            </List>
                          </Grid>
                          <Grid item xs={12} md={6}>
                            <List dense>
                              <ListItem><Skeleton animation="wave" variant="text" width={180} /></ListItem>
                              <ListItem><Skeleton animation="wave" variant="text" width={140} /></ListItem>
                            </List>
                          </Grid>
                        </Grid>
                      </Box>
                    )}
                    <Box sx={{ transition:'opacity 150ms ease 60ms', willChange:'opacity', opacity: shouldFade ? (loadedRemote ? 1 : 0.6) : 1 }}>
                    <Divider sx={{ my: 1 }} />
                    <Grid container spacing={1.5}>
                      <Grid item xs={12} md={6}>
                        <List dense>
                          <Row label={C.modelSizeParams} value={<Trunc value={metadata?.architecture?.modelSizeParams} max={24} />} />
                          <Row label={C.artifactSizeGB} value={<Trunc value={metadata?.architecture?.artifactSizeGB} max={16} />} />
                          <Row label={C.embeddingDimension} value={<Trunc value={metadata?.architecture?.embeddingDimension} max={16} />} />
                        </List>
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <List dense>
                          <Row label={C.dependencies} value={<ChipsShort items={metadata?.dependencies?.pip} />} />
                        </List>
                      </Grid>
                    </Grid>
                    <Divider sx={{ my: 1 }} />
                    <Typography variant="subtitle2" sx={{ fontWeight:700, mb:0.5 }}>{C.runtime}</Typography>
                    <Grid container spacing={1.5}>
                      <Grid item xs={12} md={6}>
                        <List dense>
                          <Row label={C.python} value={<Trunc value={metadata?.runtime?.python} max={24} />} />
                          <Row label={C.cuda} value={<Trunc value={metadata?.runtime?.cuda} max={24} />} />
                          <Row label={C.torch} value={<Trunc value={metadata?.runtime?.torch} max={24} />} />
                          <Row label={C.cudnn} value={<Trunc value={metadata?.runtime?.cudnn} max={24} />} />
                        </List>
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <List dense>
                          <Row label={C.os} value={<ChipsShort items={metadata?.runtime?.os} />} />
                          <Row label={C.accelerators} value={<ChipsShort items={metadata?.runtime?.accelerators} />} />
                          <Row label={C.computeCapability} value={<Trunc value={metadata?.runtime?.computeCapability} max={24} />} />
                        </List>
                      </Grid>
                    </Grid>
                    <Divider sx={{ my: 1 }} />
                    <Typography variant="subtitle2" sx={{ fontWeight:700, mb:0.5 }}>{C.resources}</Typography>
                    <Grid container spacing={1.5}>
                      <Grid item xs={12} md={6}>
                        <List dense>
                          <Row label={C.vramGB} value={<Trunc value={metadata?.resources?.vramGB} max={12} />} />
                          <Row label={C.cpuCores} value={<Trunc value={metadata?.resources?.cpuCores} max={12} />} />
                        </List>
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <List dense>
                          <Row label={C.ramGB} value={<Trunc value={metadata?.resources?.ramGB} max={12} />} />
                        </List>
                      </Grid>
                    </Grid>
                    <Divider sx={{ my: 1 }} />
                    <Typography variant="subtitle2" sx={{ fontWeight:700, mb:0.5 }}>{C.inference}</Typography>
                    <Grid container spacing={1.5}>
                      <Grid item xs={12} md={6}>
                        <List dense>
                          <Row label={C.maxBatch} value={<Trunc value={metadata?.inference?.maxBatchSize} max={12} />} />
                          <Row label={C.contextLen} value={<Trunc value={metadata?.inference?.contextLength} max={12} />} />
                          <Row label={C.maxTokens} value={<Trunc value={metadata?.inference?.maxTokens} max={12} />} />
                        </List>
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <List dense>
                          <Row label={C.imageResolution} value={<Trunc value={metadata?.inference?.imageResolution} max={24} />} />
                          <Row label={C.sampleRate} value={<Trunc value={metadata?.inference?.sampleRate} max={12} />} />
                          <Row label={C.triton} value={<Trunc value={String(metadata?.inference?.triton)} max={8} />} />
                          <Row label={C.refPerf} value={<Trunc value={metadata?.inference?.referencePerf} max={40} />} />
                        </List>
                      </Grid>
                    </Grid>
                    </Box>
                  </Box>
                )}
              </Paper>
            </div>
          )
        }
        if (secId==='business') {
          return (
            <div key={secId} draggable onDragStart={()=>onDragStart(secId)} onDragOver={(e)=>onDragOver(e,secId)} onDrop={()=>onDrop(secId)}>
              <Paper variant="outlined" sx={{ p:{ xs:2, md:3 }, mb:2, borderRadius:2 }}>
                <Box sx={{ display:'flex', alignItems:'center', justifyContent:'space-between', mb:1 }}>
                  <Typography variant="subtitle2" sx={{ color:'primary.main', fontWeight:700 }}>{B.sectionTitle}</Typography>
                  <Tooltip title={COMMON.edit}>
                    <IconButton size="small" href={`${base}/step2`} aria-label={COMMON.edit}>
                      <EditOutlinedIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
                <List dense>
                  {loading ? (
                    <>
                      <ListItem><Skeleton animation="wave" variant="text" width={280} /></ListItem>
                      <ListItem><Skeleton animation="wave" variant="text" width={320} /></ListItem>
                      <ListItem><Skeleton animation="wave" variant="text" width={260} /></ListItem>
                      <ListItem><Skeleton animation="wave" variant="text" width={240} /></ListItem>
                    </>
                  ) : (
                    <Box sx={{ position:'relative', minHeight: 220 }}>
                      {shouldFade && !loadedRemote && (
                        <Box sx={{ position:'absolute', inset:0, pointerEvents:'none', p:1, opacity:1, transition:'opacity 150ms ease 60ms' }}>
                          <List dense>
                            <ListItem><Skeleton animation="wave" variant="text" width={260} /></ListItem>
                            <ListItem><Skeleton animation="wave" variant="text" width={300} /></ListItem>
                            <ListItem><Skeleton animation="wave" variant="text" width={280} /></ListItem>
                            <ListItem><Skeleton animation="wave" variant="text" width={240} /></ListItem>
                          </List>
                        </Box>
                      )}
                      <Box sx={{ transition:'opacity 150ms ease 60ms', willChange:'opacity', opacity: shouldFade ? (loadedRemote ? 1 : 0.6) : 1 }}>
                      <Row label={B.valueProp} value={<Trunc value={metadata?.customer?.valueProp} max={80} />} />
                      <Row label={B.description} value={<Trunc value={metadata?.customer?.description} max={100} />} />
                      <Row label={B.industries} value={<ChipsShort items={metadata?.customer?.industries} />} />
                      <Row label={B.useCases} value={<ChipsShort items={metadata?.customer?.useCases} />} />
                      <Row label={B.expectedImpact} value={<Trunc value={metadata?.customer?.expectedImpact} max={120} />} />
                      <Row label={B.inputs} value={<Trunc value={metadata?.customer?.inputs} max={120} />} />
                      <Row label={B.outputs} value={<Trunc value={metadata?.customer?.outputs} max={120} />} />
                      {/* Examples list */}
                      {Array.isArray(metadata?.customer?.examples) && metadata.customer.examples.length>0 && (
                        <Row label={B.examples} value={<Box>
                          {(metadata.customer.examples as any[]).slice(0,3).map((e:any, i:number)=> (
                            <Box key={i} sx={{ mb:0.5 }}>
                              <Typography variant="caption" color="text.secondary">{`#${i+1}`}</Typography>
                              <div><Typography variant="body2">Input: <Trunc value={e?.input} max={80} /></Typography></div>
                              <div><Typography variant="body2">Output: <Trunc value={e?.output} max={80} /></Typography></div>
                              {e?.note && <div><Typography variant="body2">Note: <Trunc value={e?.note} max={80} /></Typography></div>}
                            </Box>
                          ))}
                        </Box>} />
                      )}
                      <Row label={B.risks} value={<Trunc value={metadata?.customer?.risks} max={140} />} />
                      <Row label={B.privacy} value={<Trunc value={metadata?.customer?.privacy} max={140} />} />
                      <Row label={B.deploy} value={<ChipsShort items={metadata?.customer?.deploy} />} />
                      <Row label={B.support} value={<Trunc value={metadata?.customer?.support} max={80} />} />
                      <Row label={B.supportedLanguages} value={<ChipsShort items={metadata?.customer?.supportedLanguages} />} />
                      <Row label={B.primaryLanguage} value={<Trunc value={metadata?.customer?.primaryLanguage} max={24} />} />
                      <Row label={B.modelType} value={<Trunc value={metadata?.capabilities?.modelType} max={24} />} />
                      <Row label={B.metrics} value={<Trunc value={metadata?.customer?.metrics} max={80} />} />
                      <Row label={B.prohibited} value={<Trunc value={metadata?.customer?.prohibited} max={140} />} />
                      </Box>
                    </Box>
                  )}
                </List>
              </Paper>
            </div>
          )
        }
        
        if (secId==='artifacts') {
          return (
            <div key={secId} draggable onDragStart={()=>onDragStart(secId)} onDragOver={(e)=>onDragOver(e,secId)} onDrop={()=>onDrop(secId)}>
              <Paper variant="outlined" sx={{ p:{ xs:2, md:3 }, mb:2, borderRadius:2 }}>
                <Typography variant="h6" sx={{ fontWeight:700, mb:1, color:'primary.main' }}>{A.sectionTitle}</Typography>
                {(metadata?.artifacts || []).length>0 ? (
                  <>
                    <Typography variant="body2" color="text.secondary" sx={{ mb:1 }}>
                      {A.total}: {(metadata?.artifacts || []).length}
                    </Typography>
                    {/* Mobile stacked list */}
                    <Box sx={{ display:{ xs:'block', md:'none' } }}>
                      <List dense>
                        {(metadata?.artifacts || []).map((a:any, idx:number)=> (
                          <ListItem key={idx} sx={{ alignItems:'flex-start' }}>
                            <Box sx={{ width:'100%' }}>
                              <Box sx={{ display:'grid', gridTemplateColumns:'minmax(110px,40%) 1fr', columnGap:1 }}>
                                <Typography variant="body2" color="text.secondary" sx={{ fontWeight:600 }}>{A.file}</Typography>
                                <Typography variant="body2"><Trunc value={a.filename||'-'} max={40} /></Typography>
                              </Box>
                              <Box sx={{ display:'grid', gridTemplateColumns:'minmax(110px,40%) 1fr', columnGap:1, mt:0.5 }}>
                                <Typography variant="body2" color="text.secondary" sx={{ fontWeight:600 }}>{A.cid}</Typography>
                                <Typography variant="body2"><Trunc value={a.cid||'-'} middle /></Typography>
                              </Box>
                              <Box sx={{ display:'grid', gridTemplateColumns:'minmax(110px,40%) 1fr', columnGap:1, mt:0.5 }}>
                                <Typography variant="body2" color="text.secondary" sx={{ fontWeight:600 }}>{A.uri}</Typography>
                                <Typography variant="body2"><Trunc value={a.cid? `ipfs://${a.cid}` : '-'} middle /></Typography>
                              </Box>
                              <Box sx={{ display:'grid', gridTemplateColumns:'minmax(110px,40%) 1fr', columnGap:1, mt:0.5 }}>
                                <Typography variant="body2" color="text.secondary" sx={{ fontWeight:600 }}>{A.sha256}</Typography>
                                <Typography variant="body2"><Trunc value={a.sha256||'-'} middle /></Typography>
                              </Box>
                              <Box sx={{ display:'flex', justifyContent:'flex-end', mt:0.5 }}>
                                <Tooltip title={A.view}>
                                  <span>
                                    <Button size="small" variant="outlined" endIcon={<OpenInNewIcon fontSize="inherit" />} disabled={!a?.cid} onClick={()=>{ if(a?.cid) window.open(`https://ipfs.io/ipfs/${a.cid}`, '_blank', 'noopener,noreferrer') }}>
                                      {A.view}
                                    </Button>
                                  </span>
                                </Tooltip>
                              </Box>
                            </Box>
                          </ListItem>
                        ))}
                      </List>
                    </Box>
                    {/* Desktop table */}
                    <Box sx={{ display:{ xs:'none', md:'block' } }}>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>{A.file}</TableCell>
                            <TableCell>{A.cid}</TableCell>
                            <TableCell>{A.uri}</TableCell>
                            <TableCell>{A.sha256}</TableCell>
                            <TableCell align="right">{A.actions}</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {(metadata?.artifacts || []).map((a:any, idx:number)=> (
                            <TableRow key={idx}>
                              <TableCell>{a.filename||'-'}</TableCell>
                              <TableCell>{truncateMiddle(a.cid||'-')}</TableCell>
                              <TableCell>{a.cid? truncateMiddle(`ipfs://${a.cid}`) : '-'}</TableCell>
                              <TableCell>{truncateMiddle(a.sha256||'-')}</TableCell>
                              <TableCell align="right">
                                <Tooltip title={A.view}>
                                  <span>
                                    <IconButton size="small" disabled={!a?.cid} onClick={()=>{ if(a?.cid) window.open(`https://ipfs.io/ipfs/${a.cid}`, '_blank', 'noopener,noreferrer') }}>
                                      <OpenInNewIcon fontSize="inherit" />
                                    </IconButton>
                                  </span>
                                </Tooltip>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </Box>
                  </>
                ) : (
                  <Alert severity="info">{locale==='es' ? 'No hay artefactos' : 'No artifacts'}</Alert>
                )}
              </Paper>
            </div>
          )
        }
        if (secId==='terms') { return null }
        return null
      })}

      

      <Paper variant="outlined" sx={{ p:{ xs:2, md:3 }, mb:2, borderRadius:2 }}>
        {issues.length>0 && (
          <Alert severity="warning" sx={{ mb: 1 }}>
            {issues.map((m,i)=>(<div key={i}>{m}</div>))}
          </Alert>
        )}
        <FormControlLabel control={<Checkbox checked={accepted} onChange={(e)=>setAccepted(e.target.checked)} />} label={acceptLabel} />
        <Box sx={{ mt: 1 }}>
          <Button onClick={onPublish} disabled={publishing || issues.length>0 || !accepted} variant="contained" startIcon={<RocketLaunchIcon/>}>
            {publishing? t('wizard.step5.buttons.publishing') : t('wizard.step5.buttons.publish')}
          </Button>
        </Box>
      </Paper>

      {results.length>0 && (
        <Paper variant="outlined" sx={{ p:2, mt:2, borderRadius:2 }}>
          <Typography variant="subtitle1" sx={{ mb:1 }}>{t('wizard.step5.sections.results')}</Typography>
          <List dense>
            {results.map((r, i)=> (
              <ListItem key={i} sx={{ display:'grid', gridTemplateColumns:'1fr 1fr 3fr 3fr', columnGap:1 }}>
                <ListItemText primary={`${r.chain.toUpperCase()} / ${r.network}`} />
                <ListItemText primary={r.ok ? 'OK' : t('wizard.step5.labels.error')} />
                <ListItemText primary={`TX: ${r?.tx?.txHash || r?.tx?.digest || '-'}`} />
                <ListItemText primary={r.error || ''} />
              </ListItem>
            ))}
          </List>
        </Paper>
      )}

      <Box sx={{ height: { xs: 76, md: 72 }, mt: 2 }} />

      <Box sx={{ position:'fixed', bottom: 0, left: 0, right: 0, zIndex: (t)=>t.zIndex.appBar + 1 }}>
        <Paper elevation={3} sx={{ borderRadius: 0, px: { xs:1.5, md:2 }, py: 1 }}>
          <Box sx={{ maxWidth: 1000, mx: 'auto', width:'100%' }}>
            <Box sx={{ display:{ xs:'flex', md:'none' }, alignItems:'center', justifyContent:'flex-start', width:'100%' }}>
              <Button size="small" href={`${base}/step4`} variant="text" color="inherit" startIcon={<ArrowBackIcon />} sx={{ borderRadius: 2, textTransform:'none', py: 0.75, whiteSpace:'nowrap', fontSize:{ xs:12, md:14 }, '& .MuiButton-startIcon': { mr: 0.5, '& svg': { fontSize: 18 } } }}>
                {t('wizard.common.back')}
              </Button>
            </Box>

            <Box sx={{ display:{ xs:'none', md:'flex' }, alignItems:'center', justifyContent:'space-between', gap: 1.25 }}>
              <Button href={`${base}/step4`} variant="text" color="inherit" startIcon={<ArrowBackIcon />} sx={{ borderRadius: 2, textTransform:'none', py: 1 }}>
                {t('wizard.common.back')}
              </Button>
              <Box sx={{ display:'flex', gap: 1.25 }}></Box>
            </Box>
          </Box>
        </Paper>
      </Box>

      {/* Dialog to reset wizard after successful publish */}
      <Dialog open={resetOpen} onClose={()=>setResetOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>
          {locale==='es' ? '¿Empezar un nuevo listado?' : 'Start a new listing?'}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            {locale==='es'
              ? 'La publicación fue exitosa. Puedes limpiar el borrador del wizard para comenzar uno nuevo.'
              : 'Publish was successful. You can clear the wizard draft to start a new one.'}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={()=>setResetOpen(false)} disabled={resetting} color="inherit">
            {locale==='es' ? 'Mantener' : 'Keep'}
          </Button>
          <Button onClick={onConfirmReset} disabled={resetting} variant="contained" color="primary">
            {resetting ? (locale==='es' ? 'Limpiando…' : 'Clearing…') : (locale==='es' ? 'Reiniciar wizard' : 'Reset wizard')}
          </Button>
        </DialogActions>
      </Dialog>

      {msg && <p>{msg}</p>}
    </div>
  )
}
