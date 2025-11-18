"use client";
import { useEffect, useMemo, useState, useRef } from 'react'
import { Box, Button, Paper, Typography, Stack, Grid, Chip, List, ListItem, ListItemText, Divider, Alert, Checkbox, FormControlLabel, Table, TableHead, TableRow, TableCell, TableBody, IconButton, Tooltip, Skeleton, SvgIcon, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import CheckIcon from '@mui/icons-material/Check'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch'
import WizardFooter from '@/components/WizardFooter'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import WizardThemeProvider from '@/components/WizardThemeProvider'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import GitHubIcon from '@mui/icons-material/GitHub'
import LanguageIcon from '@mui/icons-material/Language'
import LinkedInIcon from '@mui/icons-material/LinkedIn'
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile'
import FolderZipIcon from '@mui/icons-material/FolderZip'
import CodeIcon from '@mui/icons-material/Code'
import DescriptionIcon from '@mui/icons-material/Description'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
// removed copy actions per request
import { useLocale, useTranslations } from 'next-intl'
import { useWalletAddress } from '@/hooks/useWalletAddress'
import { useRouter } from 'next/navigation'
import { createViewModelFromDraft, UnifiedModelViewModel } from '@/viewmodels'
import { ipfsToHttp } from '@/config'

export const dynamic = 'force-dynamic'

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
  const [hashCopied, setHashCopied] = useState(false)
  const [copiedCid, setCopiedCid] = useState<string | null>(null)
  const [showFullInstructions, setShowFullInstructions] = useState(false)
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

  // ViewModel (unified source of truth)
  // Migration Guide:
  // Old: metadata?.name → New: viewModel?.step1.name
  // Old: metadata?.businessCategory → New: viewModel?.step1.businessCategory
  // Old: metadata?.valueProp → New: viewModel?.step2.customer.valueProp
  // Old: metadata?.frameworks → New: viewModel?.step2.technical.frameworks
  // Old: metadata?.artifacts → New: viewModel?.step3.artifacts
  // Old: metadata?.licensePolicy → New: viewModel?.step4
  // See /src/viewmodels/README.md for complete documentation
  const viewModel = useMemo<UnifiedModelViewModel | null>(()=>{
    if (!draft) return null
    try {
      const vm = createViewModelFromDraft(draft)
      return vm
    } catch (err) {
      console.error('Error creating ViewModel:', err)
      return null
    }
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
          <Tooltip key={`${v}-${i}`} title={v}>
            <Chip 
              size="small" 
              variant="outlined"
              sx={{ borderColor:'rgba(255,255,255,0.3)', color:'#fff', '& .MuiChip-label': { fontSize:'0.75rem' } }}
              label={<span style={{ maxWidth: 160, display:'inline-block', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{v}</span>} 
            />
          </Tooltip>
        ))}
        {rest>0 && (
          <Chip 
            size="small" 
            variant="outlined"
            sx={{ borderColor:'rgba(255,255,255,0.3)', color:'#fff', '& .MuiChip-label': { fontSize:'0.75rem' } }}
            label={`+${rest}`} 
          />
        )}
      </Box>
    )
  }

  const Row: React.FC<{ label: React.ReactNode; value: React.ReactNode }> = ({ label, value }) => (
    <ListItem sx={{ py: { xs:0.75, md:0.5 } }}>
      <Box sx={{ display:'grid', gridTemplateColumns:{ xs:'minmax(120px, 42%) 1fr', sm:'minmax(160px, 38%) 1fr', md:'220px 1fr' }, alignItems:'start', columnGap: 1.5, width:'100%' }}>
        <Typography variant="body2" sx={{ color:'#ffffffcc', fontWeight:600, pr:{ xs:0.5, md:0 } }}>{label}</Typography>
        <Box sx={{ minWidth:0, wordBreak:'break-word', color:'#fff' }}>{value}</Box>
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

  const navigateAfterSave = async (e: React.MouseEvent<HTMLButtonElement | HTMLAnchorElement>, url: string) => {
    e.preventDefault()
    try { await onSave() } catch {}
    try { router.push(url) } catch { try { window.location.href = url } catch {} }
  }

  return (
    <WizardThemeProvider>
    <Box sx={{ minHeight: '100vh', background: 'linear-gradient(180deg, #0f2740 0%, #0b1626 30%, #0a111c 100%)' }}>
      <Box sx={{
        p: 3,
        maxWidth: 1000,
        mx: 'auto',
        color:'#ffffffd6',
        '& .MuiTypography-h6': { color:'#fff' },
        '& .MuiTypography-subtitle2': { color:'#fff' },
        '& .MuiTypography-body2': { color:'#ffffffcc' },
        '& .MuiTypography-caption': { color:'#ffffff99' },
        '& .MuiFormLabel-root': { color:'#ffffffcc' },
        '& .MuiIconButton-root': { color:'#fff' },
        '& .MuiSvgIcon-root': { color:'#fff' },
        '& .MuiPaper-outlined': {
          borderRadius: '16px',
          border:'2px solid',
          borderColor:'oklch(0.30 0 0)',
          background:'linear-gradient(180deg, rgba(38,46,64,0.78), rgba(20,26,42,0.78))',
          boxShadow:'0 0 0 1px rgba(255,255,255,0.04) inset, 0 10px 28px rgba(0,0,0,0.40)',
          backdropFilter:'blur(10px)'
        }
      }}>
      <Typography variant="h5" sx={{ fontWeight:700, color:'#fff' }}>{t('wizard.step5.title')}</Typography>
      <Typography variant="body2" sx={{ mt:0.5, mb:1.5, color:'#ffffffcc' }}>
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
                <Box sx={{ display:'flex', alignItems:'center', justifyContent:'space-between', mb:2 }}>
                  <Typography variant="subtitle2" sx={{ color:'#fff', fontWeight:700 }}>{t('wizard.step5.sections.listingOverview')}</Typography>
                  <Button 
                    size="small" 
                    variant="outlined" 
                    startIcon={<EditOutlinedIcon fontSize="small" />}
                    onClick={(e) => navigateAfterSave(e as any, `${base}/step1`)}
                    sx={{ textTransform: 'none' }}
                  >
                    {t('wizard.step5.step1Summary.editStep1')}
                  </Button>
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
                  <Grid container spacing={3}>
                    {/* Left column: Listing information from Step 1 */}
                    <Grid item xs={12} md={8}>
                      <Stack spacing={2}>
                        {/* Name */}
                        <Box>
                          <Typography variant="h6" sx={{ fontWeight:700, color:'#fff', mb:0.5 }}>
                            {viewModel?.step1.name || metadata?.name || '-'}
                          </Typography>
                          {/* Identifier (URL) */}
                          {Boolean((metadata as any)?.slug) && (
                            <Typography variant="caption" color="text.secondary" sx={{ display:'block', mt:0.5 }}>
                              {t('wizard.step5.step1Summary.identifier')}: {(typeof window!=='undefined' ? window.location.origin : '') + `/${locale}/models/` + String((metadata as any).slug || '')}
                            </Typography>
                          )}
                        </Box>

                        {/* Summary with line clamp + view link */}
                        {Boolean(viewModel?.step1.summary || (metadata as any)?.shortSummary) && (
                          <Box>
                            <Typography 
                              variant="body2" 
                              sx={{ 
                                color:'#ffffffcc',
                                display: '-webkit-box',
                                WebkitLineClamp: 3,
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                mb: 0.5
                              }}
                            >
                              {viewModel?.step1.summary || (metadata as any).shortSummary}
                            </Typography>
                            {Boolean((metadata as any)?.slug) && (
                              <Button 
                                size="small" 
                                variant="text" 
                                sx={{ textTransform:'none', p:0, minWidth:'auto', fontSize:'0.75rem' }}
                                onClick={(e) => navigateAfterSave(e as any, `${base}/step1`)}
                              >
                                {t('wizard.step5.step1Summary.viewFullListing')} →
                              </Button>
                            )}
                          </Box>
                        )}

                        {/* Business profile */}
                        {(Boolean(viewModel?.step1.businessCategory || (metadata as any)?.businessCategory) || Boolean(viewModel?.step1.modelTypeBusiness || (metadata as any)?.modelType)) && (
                          <Box>
                            <Typography variant="caption" color="text.secondary" sx={{ display:'block', mb:0.5, fontWeight:600, textTransform:'uppercase', fontSize:'0.7rem' }}>
                              {locale==='es' ? 'Perfil de negocio' : 'Business profile'}
                            </Typography>
                            <Grid container spacing={1}>
                              {Boolean(viewModel?.step1.businessCategory || (metadata as any)?.businessCategory) && (
                                <Grid item xs={12} sm={6}>
                                  <Typography variant="body2" color="text.secondary" sx={{ fontSize:'0.8rem' }}>
                                    {t('wizard.step5.step1Summary.businessCategory')}:
                                  </Typography>
                                  <Typography variant="body2" sx={{ color:'#fff', fontWeight:600 }}>
                                    {viewModel?.step1.businessCategory || (metadata as any).businessCategory}
                                  </Typography>
                                </Grid>
                              )}
                              {Boolean(viewModel?.step1.modelTypeBusiness || (metadata as any)?.modelType) && (
                                <Grid item xs={12} sm={6}>
                                  <Typography variant="body2" color="text.secondary" sx={{ fontSize:'0.8rem' }}>
                                    {t('wizard.step5.step1Summary.modelType')}:
                                  </Typography>
                                  <Typography variant="body2" sx={{ color:'#fff', fontWeight:600 }}>
                                    {viewModel?.step1.modelTypeBusiness || (metadata as any).modelType}
                                  </Typography>
                                </Grid>
                              )}
                            </Grid>
                          </Box>
                        )}

                        {/* Technical classification */}
                        {(Boolean(viewModel?.step1.technicalCategories?.length || (metadata as any)?.technicalCategories?.length) || Boolean(viewModel?.step1.technicalTags?.length || (metadata as any)?.technicalTags?.length)) && (
                          <Box>
                            <Typography variant="caption" color="text.secondary" sx={{ display:'block', mb:0.5, fontWeight:600, textTransform:'uppercase', fontSize:'0.7rem' }}>
                              {locale==='es' ? 'Clasificación técnica' : 'Technical classification'}
                            </Typography>
                            <Stack spacing={1}>
                              {Boolean(viewModel?.step1.technicalCategories?.length || (metadata as any)?.technicalCategories?.length) && (
                                <Box>
                                  <Typography variant="caption" color="text.secondary" sx={{ display:'block', mb:0.5, fontSize:'0.75rem' }}>
                                    {t('wizard.step5.step1Summary.technicalCategories')}
                                  </Typography>
                                  <ChipsShort items={viewModel?.step1.technicalCategories || (metadata as any).technicalCategories} max={6} />
                                </Box>
                              )}
                              {Boolean(viewModel?.step1.technicalTags?.length || (metadata as any)?.technicalTags?.length) && (
                                <Box>
                                  <Typography variant="caption" color="text.secondary" sx={{ display:'block', mb:0.5, fontSize:'0.75rem' }}>
                                    {t('wizard.step5.step1Summary.technicalTags')}
                                  </Typography>
                                  <ChipsShort items={viewModel?.step1.technicalTags || (metadata as any).technicalTags} max={6} />
                                </Box>
                              )}
                            </Stack>
                          </Box>
                        )}

                        {/* Author section */}
                        <Box sx={{ pt:1, borderTop:'1px solid rgba(255,255,255,0.1)' }}>
                          <Typography variant="body2" sx={{ color:'#ffffffcc', mb:1 }}>
                            {t('wizard.step5.step1Summary.by')} <strong>{viewModel?.step1.authorName || (metadata as any)?.author?.displayName || '-'}</strong>
                          </Typography>
                          {Boolean((viewModel?.step1.authorLinks && Object.keys(viewModel.step1.authorLinks).length>0) || ((metadata as any)?.author?.links && Object.keys((metadata as any).author.links).length>0)) && (
                            <Stack direction="row" spacing={0.5} sx={{ flexWrap:'wrap' }}>
                              {Object.entries(viewModel?.step1.authorLinks || (metadata as any).author.links || {}).filter(([,v])=>!!v).map(([k,v]: any, i: number)=> {
                                const label = k==='github'? 'GitHub' : k==='website'? 'Website' : k==='twitter'? 'X' : k==='linkedin'? 'LinkedIn' : k
                                const icon = k==='github'? <GitHubIcon fontSize="small" /> : k==='website'? <LanguageIcon fontSize="small" /> : k==='twitter'? <XIcon fontSize="small" /> : k==='linkedin'? <LinkedInIcon fontSize="small" /> : undefined
                                return (
                                  <Tooltip key={`${k}-${i}`} title={`${label}: ${v}`}>
                                    <IconButton size="small" aria-label={label} onClick={()=>{ try { if (v) window.open(String(v), '_blank', 'noopener,noreferrer') } catch {} }}>
                                      {icon}
                                    </IconButton>
                                  </Tooltip>
                                )
                              })}
                            </Stack>
                          )}
                        </Box>
                      </Stack>
                    </Grid>

                    {/* Right column: Cover + Metadata badges from Step 1 */}
                    <Grid item xs={12} md={4}>
                      <Stack spacing={2}>
                        {/* Cover / Hero Image */}
                        {Boolean(viewModel?.step1.cover?.thumbCid || viewModel?.step1.cover?.cid || (metadata as any)?.cover?.thumbCid || (metadata as any)?.cover?.cid) ? (
                          <Box sx={{ 
                            display:'flex', 
                            alignItems:'center', 
                            justifyContent:'center', 
                            width:'100%', 
                            maxWidth:'100%', 
                            overflow:'hidden',
                            borderRadius:2,
                            border:'1px solid rgba(255,255,255,0.1)'
                          }}>
                            <img
                              src={ipfsToHttp(viewModel?.step1.cover?.thumbCid || viewModel?.step1.cover?.cid || (metadata as any).cover?.thumbCid || (metadata as any).cover?.cid || '')}
                              alt="Model cover"
                              loading="lazy"
                              style={{
                                maxWidth: '100%',
                                width: '100%',
                                height: 'auto',
                                maxHeight: 200,
                                borderRadius: 8,
                                objectFit: 'cover',
                                display: 'block'
                              }}
                            />
                          </Box>
                        ) : (
                          <Box sx={{
                            display:'flex',
                            alignItems:'center',
                            justifyContent:'center',
                            width:'100%',
                            height:160,
                            borderRadius:2,
                            border:'1px solid rgba(255,255,255,0.1)',
                            bgcolor:'rgba(255,255,255,0.05)'
                          }}>
                            <Typography variant="caption" color="text.secondary">
                              {locale==='es' ? 'Sin imagen' : 'No image'}
                            </Typography>
                          </Box>
                        )}

                        {/* Metadata badges from Step 1 */}
                        <Stack spacing={1}>
                          {/* Business Category */}
                          {Boolean(viewModel?.step1.businessCategory || (metadata as any)?.businessCategory) && (
                            <Chip 
                              size="small" 
                              label={`${locale==='es' ? 'Categoría' : 'Category'}: ${viewModel?.step1.businessCategory || (metadata as any).businessCategory}`}
                              sx={{ 
                                borderColor:'rgba(255,255,255,0.3)',
                                color:'#fff',
                                '& .MuiChip-label': { fontSize:'0.75rem' }
                              }}
                              variant="outlined"
                            />
                          )}

                          {/* Model Type (business) */}
                          {Boolean(viewModel?.step1.modelTypeBusiness || (metadata as any)?.modelType) && (
                            <Chip 
                              size="small" 
                              label={`${locale==='es' ? 'Tipo' : 'Model type'}: ${viewModel?.step1.modelTypeBusiness || (metadata as any).modelType}`}
                              sx={{ 
                                borderColor:'rgba(255,255,255,0.3)',
                                color:'#fff',
                                '& .MuiChip-label': { fontSize:'0.75rem' }
                              }}
                              variant="outlined"
                            />
                          )}

                          {/* Technical spotlight (first technical category or tag) */}
                          {Boolean(viewModel?.step1.technicalCategories?.[0] || viewModel?.step1.technicalTags?.[0] || (metadata as any)?.technicalCategories?.[0] || (metadata as any)?.technicalTags?.[0]) && (
                            <Chip 
                              size="small" 
                              label={`Tech: ${viewModel?.step1.technicalCategories?.[0] || viewModel?.step1.technicalTags?.[0] || (metadata as any).technicalCategories?.[0] || (metadata as any).technicalTags?.[0]}`}
                              sx={{ 
                                borderColor:'rgba(255,255,255,0.3)',
                                color:'#fff',
                                '& .MuiChip-label': { fontSize:'0.75rem' }
                              }}
                              variant="outlined"
                            />
                          )}
                        </Stack>
                      </Stack>
                    </Grid>
                  </Grid>
                  </Box>
                )}
              </Paper>
            </div>
          )
        }
        if (secId==='licenses') {
          const licenseData = viewModel?.step4 || ({} as any)
          const pricingMode = (metadata as any)?.pricingMode || 'both'
          const pricingModeLabel = pricingMode === 'perpetual' ? (locale==='es' ? 'Perpetuo' : 'One-time (perpetual)') 
            : pricingMode === 'subscription' ? (locale==='es' ? 'Suscripción' : 'Subscription') 
            : (locale==='es' ? 'Ambos' : 'Both')
          const termsSummary = licenseData.termsSummary?.join('\n') || (metadata as any)?.termsSummary || ''
          const termsHash = licenseData.termsHash || metadata?.licensePolicy?.termsHash || ''
          const hasRights = (licenseData.rights && (licenseData.rights.canUseAPI || licenseData.rights.canDownload || licenseData.rights.isTransferable)) || (metadata?.licensePolicy?.rights && Array.isArray(metadata.licensePolicy.rights) && metadata.licensePolicy.rights.length > 0)
          
          const copyHashToClipboard = () => {
            if (termsHash) {
              try {
                navigator.clipboard.writeText(termsHash)
                setHashCopied(true)
                setTimeout(() => setHashCopied(false), 2000)
              } catch {}
            }
          }

          return (
            <div key={secId} draggable onDragStart={()=>onDragStart(secId)} onDragOver={(e)=>onDragOver(e,secId)} onDrop={()=>onDrop(secId)}>
              <Paper variant="outlined" sx={{ p:{ xs:2, md:3 }, mb:2, borderRadius:2 }}>
                <Box sx={{ display:'flex', alignItems:'center', justifyContent:'space-between', mb:2 }}>
                  <Typography variant="subtitle2" sx={{ color:'#fff', fontWeight:700 }}>{t('wizard.step5.sections.licensesTerms')}</Typography>
                  <Button 
                    size="small" 
                    variant="outlined" 
                    startIcon={<EditOutlinedIcon fontSize="small" />}
                    onClick={(e) => navigateAfterSave(e as any, `${base}/step4`)}
                    sx={{ textTransform: 'none' }}
                  >
                    {t('wizard.step5.step4Summary.editStep4')}
                  </Button>
                </Box>
                {loading ? (
                  <List dense>
                    <ListItem><Skeleton animation="wave" variant="text" width={220} /></ListItem>
                    <ListItem><Skeleton animation="wave" variant="text" width={260} /></ListItem>
                    <ListItem><Skeleton animation="wave" variant="text" width={180} /></ListItem>
                    <ListItem><Skeleton animation="wave" variant="text" width={220} /></ListItem>
                    <ListItem><Skeleton animation="wave" variant="text" width={200} /></ListItem>
                  </List>
                ) : (
                  <Box sx={{ transition:'opacity 150ms ease 40ms', willChange:'opacity', opacity: shouldFade ? (loadedRemote ? 1 : 0) : 1 }}>
                    <Stack spacing={2}>
                      {/* 1. PRICES SECTION */}
                      <Box>
                        <Typography variant="caption" color="text.secondary" sx={{ display:'block', mb:1, fontWeight:600, textTransform:'uppercase', fontSize:'0.7rem' }}>
                          {t('wizard.step5.step4Summary.prices')}
                        </Typography>
                        <List dense>
                          {/* Pricing Model */}
                          <Row label={t('wizard.step5.step4Summary.pricingModel')} value={pricingModeLabel} />
                          
                          {/* Perpetual Price */}
                          {(pricingMode === 'perpetual' || pricingMode === 'both') && (
                            <Row label={t('wizard.step5.step4Summary.perpetualPrice')} value={<>{fmt2Up(Number(metadata?.licensePolicy?.perpetual?.priceRef||0))} {unit}</>} />
                          )}
                          
                          {/* Subscription Price */}
                          {(pricingMode === 'subscription' || pricingMode === 'both') && (
                            <Row label={t('wizard.step5.step4Summary.subscriptionPrice')} value={<>{fmt2Up(Number(metadata?.licensePolicy?.subscription?.perMonthPriceRef||0))} {unit}</>} />
                          )}
                          
                          {/* Base Duration */}
                          {(pricingMode === 'subscription' || pricingMode === 'both') && (
                            <Row label={t('wizard.step5.step4Summary.baseDuration')} value={<>{Math.round(Number(metadata?.licensePolicy?.defaultDurationDays||0)/30)} {t('wizard.step5.step4Summary.months')}</>} />
                          )}
                          
                          {/* Creator Royalty */}
                          <Row label={t('wizard.step5.step4Summary.creatorRoyalty')} value={<>{Math.round((royaltyBps||0)/100)}%</>} />
                          
                          {/* Marketplace Fee */}
                          <Row label={t('wizard.step5.step4Summary.marketplaceFee')} value={<>{Math.round((feeBpsEff5||0)/100)}%</>} />
                        </List>
                      </Box>

                      <Divider />

                      {/* 2. REVENUE SPLIT SECTION */}
                      <Box>
                        <Typography variant="caption" color="text.secondary" sx={{ display:'block', mb:1, fontWeight:600, textTransform:'uppercase', fontSize:'0.7rem' }}>
                          {t('wizard.step5.step4Summary.revenueSplit')}
                        </Typography>
                        <List dense>
                          {/* Perpetual Split */}
                          {Number(metadata?.licensePolicy?.perpetual?.priceRef||0) > 0 && (()=>{
                            const amt = Number(metadata?.licensePolicy?.perpetual?.priceRef||0)
                            const s = splitFor(amt)
                            return (
                              <Row label={t('wizard.step5.step4Summary.splitPerpetual')} value={<>
                                {L.marketplace}: {fmt2Up(s.fee)} {unit} • {L.creator}: {fmt2Up(s.royalty)} {unit} • {L.seller}: {fmt2Up(s.seller)} {unit}
                              </>} />
                            )
                          })()}
                          
                          {/* Subscription Split */}
                          {Number(metadata?.licensePolicy?.subscription?.perMonthPriceRef||0) > 0 && (()=>{
                            const amt = Number(metadata?.licensePolicy?.subscription?.perMonthPriceRef||0)
                            const s = splitFor(amt)
                            return (
                              <Row label={t('wizard.step5.step4Summary.splitSubscription')} value={<>
                                {L.marketplace}: {fmt2Up(s.fee)} {unit} • {L.creator}: {fmt2Up(s.royalty)} {unit} • {L.seller}: {fmt2Up(s.seller)} {unit}
                              </>} />
                            )
                          })()}
                        </List>
                      </Box>

                      <Divider />

                      {/* 3. RIGHTS & DELIVERY SECTION */}
                      <Box>
                        <Typography variant="caption" color="text.secondary" sx={{ display:'block', mb:1, fontWeight:600, textTransform:'uppercase', fontSize:'0.7rem' }}>
                          {t('wizard.step5.step4Summary.rightsDelivery')}
                        </Typography>
                        <List dense>
                          {/* Rights (use Row for consistent alignment) */}
                          <Row 
                            label={t('wizard.step5.step4Summary.rights')} 
                            value={hasRights ? (
                              <ChipsShort items={metadata.licensePolicy.rights} max={6} />
                            ) : (
                              <Typography variant="body2" color="text.secondary" sx={{ fontStyle:'italic', fontSize:'0.85rem' }}>
                                {t('wizard.step5.step4Summary.noRights')}
                              </Typography>
                            )}
                          />

                          {/* Delivery Mode */}
                          {Boolean(metadata?.licensePolicy?.delivery?.length) && (
                            <Row label={t('wizard.step5.step4Summary.deliveryMode')} value={<ChipsShort items={metadata?.licensePolicy?.delivery} />} />
                          )}
                        </List>
                      </Box>

                      <Divider />

                      {/* 4. TERMS SECTION */}
                      <Box>
                        <Typography variant="caption" color="text.secondary" sx={{ display:'block', mb:1, fontWeight:600, textTransform:'uppercase', fontSize:'0.7rem' }}>
                          {t('wizard.step5.step4Summary.terms')}
                        </Typography>
                        <List dense>
                          {/* Buyer-friendly summary */}
                          {Boolean(termsSummary) && (
                            <ListItem sx={{ px:0, py:0.5, alignItems:'flex-start' }}>
                              <Box sx={{ display:'grid', gridTemplateColumns: { xs:'auto 1fr', md:'180px 1fr' }, alignItems:'start', columnGap: 1, width:'100%' }}>
                                <Typography variant="body2" color="text.secondary" sx={{ fontWeight:600 }}>{t('wizard.step5.step4Summary.buyerSummary')}:</Typography>
                                <Box>
                                  <Typography 
                                    variant="body2" 
                                    sx={{ 
                                      color:'#ffffffcc',
                                      maxHeight: 80,
                                      overflow: 'auto',
                                      fontSize:'0.85rem',
                                      '&::-webkit-scrollbar': { width: 4 },
                                      '&::-webkit-scrollbar-thumb': { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 2 }
                                    }}
                                  >
                                    {termsSummary}
                                  </Typography>
                                </Box>
                              </Box>
                            </ListItem>
                          )}

                          {/* Terms text (truncated) */}
                          {Boolean(metadata?.licensePolicy?.termsText) && (
                            <ListItem sx={{ px:0, py:0.5, alignItems:'flex-start' }}>
                              <Box sx={{ display:'grid', gridTemplateColumns: { xs:'auto 1fr', md:'180px 1fr' }, alignItems:'start', columnGap: 1, width:'100%' }}>
                                <Typography variant="body2" color="text.secondary" sx={{ fontWeight:600 }}>{t('wizard.step5.step4Summary.termsText')}:</Typography>
                                <Box>
                                  <Typography 
                                    variant="body2" 
                                    sx={{ 
                                      color:'#ffffffcc',
                                      display: '-webkit-box',
                                      WebkitLineClamp: 2,
                                      WebkitBoxOrient: 'vertical',
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                      mb: 0.5,
                                      fontSize:'0.85rem'
                                    }}
                                  >
                                    {String(metadata?.licensePolicy?.termsText||'')}
                                  </Typography>
                                  <Button 
                                    size="small" 
                                    variant="text" 
                                    sx={{ textTransform:'none', p:0, minWidth:'auto', fontSize:'0.75rem' }}
                                    onClick={(e) => navigateAfterSave(e as any, `${base}/step4`)}
                                  >
                                    {t('wizard.step5.step4Summary.viewFullTerms')} →
                                  </Button>
                                </Box>
                              </Box>
                            </ListItem>
                          )}

                          {/* Terms hash */}
                          <ListItem sx={{ px:0, py:0.5, alignItems:'flex-start' }}>
                            <Box sx={{ display:'grid', gridTemplateColumns: { xs:'auto 1fr', md:'180px 1fr' }, alignItems:'start', columnGap: 1, width:'100%' }}>
                              <Typography variant="body2" color="text.secondary" sx={{ fontWeight:600 }}>{t('wizard.step5.step4Summary.termsHash')}:</Typography>
                              <Box>
                                {termsHash ? (
                                  <Box sx={{ display:'flex', alignItems:'center', gap:1 }}>
                                    <Typography variant="body2" sx={{ color:'#ffffffcc', fontFamily:'monospace', fontSize:'0.8rem' }}>
                                      {termsHash.substring(0, 10)}...
                                    </Typography>
                                    <Tooltip title={hashCopied ? t('wizard.step5.step4Summary.hashCopied') : t('wizard.step5.step4Summary.copyHash')}>
                                      <IconButton size="small" onClick={copyHashToClipboard} sx={{ p:0.5 }}>
                                        {hashCopied ? <CheckIcon fontSize="small" sx={{ color:'success.main' }} /> : <ContentCopyIcon fontSize="small" />}
                                      </IconButton>
                                    </Tooltip>
                                  </Box>
                                ) : (
                                  <Typography variant="body2" color="text.secondary" sx={{ fontStyle:'italic', fontSize:'0.85rem' }}>
                                    {t('wizard.step5.step4Summary.termsNotSigned')}
                                  </Typography>
                                )}
                              </Box>
                            </Box>
                          </ListItem>
                        </List>
                      </Box>
                    </Stack>
                  </Box>
                )}
              </Paper>
            </div>
          )
        }
        if (secId==='compat') {
          const tech = viewModel?.step2.technical ? {
            capabilities: { tasks: viewModel.step2.technical.tasks, modalities: viewModel.step2.technical.modalities },
            architecture: {
              frameworks: viewModel.step2.technical.frameworks,
              architectures: viewModel.step2.technical.architectures,
              precisions: viewModel.step2.technical.precisions,
              quantization: viewModel.step2.technical.quantization?.join(', '),
              modelSizeParams: viewModel.step2.technical.modelSize,
              artifactSizeGB: viewModel.step2.technical.artifactSize,
              embeddingDimension: viewModel.step2.technical.embeddingDimension,
              modelFiles: viewModel.step2.technical.modelFiles
            },
            runtime: {
              python: viewModel.step2.technical.python,
              os: viewModel.step2.technical.os,
              accelerators: viewModel.step2.technical.accelerators,
              cuda: viewModel.step2.technical.cuda,
              torch: viewModel.step2.technical.pytorch,
              cudnn: viewModel.step2.technical.cudnn,
              computeCapability: viewModel.step2.technical.computeCapability
            },
            dependencies: {
              pip: viewModel.step2.technical.pip
            },
            resources: {
              vramGB: viewModel.step2.technical.vramGB,
              cpuCores: viewModel.step2.technical.cpuCores,
              ramGB: viewModel.step2.technical.ramGB
            },
            inference: {
              maxBatchSize: viewModel.step2.technical.maxBatchSize,
              contextLength: viewModel.step2.technical.contextLength,
              maxTokens: viewModel.step2.technical.maxTokens,
              imageResolution: viewModel.step2.technical.imageResolution,
              sampleRate: viewModel.step2.technical.sampleRate,
              triton: viewModel.step2.technical.triton,
              referencePerf: viewModel.step2.technical.referenceLatency
            }
          } : (metadata || {})
          const step2Data = draft?.data?.step2 || {}
          
          // Helper to display value or dash
          const displayValue = (val: any, isNumber = false): string | React.ReactNode => {
            if (val === null || val === undefined || val === '') return '–'
            if (isNumber && (Number(val) === 0 || isNaN(Number(val)))) return '–'
            return val
          }
          
          // Get primary language from tech or customer
          const primaryLang = tech.primaryLanguage ?? step2Data?.customer?.primaryLanguage
          const metrics = tech.metrics ?? step2Data?.customer?.metrics
          const hasTrainingEval = Boolean(primaryLang || metrics)
          
          return (
            <div key={secId} draggable onDragStart={()=>onDragStart(secId)} onDragOver={(e)=>onDragOver(e,secId)} onDrop={()=>onDrop(secId)}>
              <Paper variant="outlined" sx={{ p:{ xs:2, md:3 }, mb:2, borderRadius:2 }}>
                <Box sx={{ display:'flex', alignItems:'center', justifyContent:'space-between', mb:2 }}>
                  <Typography variant="subtitle2" sx={{ color:'#fff', fontWeight:700 }}>
                    {t('wizard.step5.sections.technicalConfig')}
                  </Typography>
                  <Button 
                    size="small" 
                    variant="outlined" 
                    startIcon={<EditOutlinedIcon fontSize="small" />}
                    onClick={(e) => navigateAfterSave(e as any, `${base}/step2`)}
                    sx={{ textTransform: 'none' }}
                  >
                    {t('wizard.step5.techConfig.editStep2')}
                  </Button>
                </Box>
                
                {loading ? (
                  <List dense>
                    <ListItem><Skeleton animation="wave" variant="text" width={280} /></ListItem>
                    <ListItem><Skeleton animation="wave" variant="text" width={260} /></ListItem>
                    <ListItem><Skeleton animation="wave" variant="text" width={240} /></ListItem>
                    <ListItem><Skeleton animation="wave" variant="text" width={220} /></ListItem>
                  </List>
                ) : (
                  <Box sx={{ transition:'opacity 150ms ease 40ms', willChange:'opacity', opacity: shouldFade ? (loadedRemote ? 1 : 0) : 1 }}>
                    {/* 1. CAPABILITIES */}
                    {(tech.capabilities?.tasks?.length > 0 || tech.capabilities?.modalities?.length > 0) && (
                      <Box sx={{ mb:2 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ display:'block', mb:1, fontWeight:600, textTransform:'uppercase', fontSize:'0.7rem' }}>
                          {t('wizard.step5.techConfig.capabilities')}
                        </Typography>
                        <List dense>
                          {tech.capabilities?.tasks?.length > 0 && (
                            <Row label={t('wizard.step5.techConfig.tasks')} value={<ChipsShort items={tech.capabilities.tasks} />} />
                          )}
                          {tech.capabilities?.modalities?.length > 0 && (
                            <Row label={t('wizard.step5.techConfig.modalities')} value={<ChipsShort items={tech.capabilities.modalities} />} />
                          )}
                        </List>
                      </Box>
                    )}

                    {/* 2. ARCHITECTURE */}
                    <Box sx={{ mb:2 }}>
                      <Typography variant="caption" color="text.secondary" sx={{ display:'block', mb:1, fontWeight:600, textTransform:'uppercase', fontSize:'0.7rem' }}>
                        {t('wizard.step5.techConfig.architecture')}
                      </Typography>
                      <List dense>
                        {tech.architecture?.frameworks?.length > 0 && (
                          <Row label={t('wizard.step5.techConfig.frameworks')} value={<ChipsShort items={tech.architecture.frameworks} />} />
                        )}
                        {tech.architecture?.architectures?.length > 0 && (
                          <Row label={t('wizard.step5.techConfig.architectures')} value={<ChipsShort items={tech.architecture.architectures} />} />
                        )}
                        {tech.architecture?.precisions?.length > 0 && (
                          <Row label={t('wizard.step5.techConfig.precisions')} value={<ChipsShort items={tech.architecture.precisions} />} />
                        )}
                        <Row label={t('wizard.step5.techConfig.quantization')} value={displayValue(tech.architecture?.quantization)} />
                        <Row label={t('wizard.step5.techConfig.modelSizeParams')} value={displayValue(tech.architecture?.modelSizeParams)} />
                        <Row label={t('wizard.step5.techConfig.artifactSizeGB')} value={displayValue(tech.architecture?.artifactSizeGB)} />
                        {tech.architecture?.embeddingDimension && (
                          <Row label={t('wizard.step5.techConfig.embeddingDimension')} value={displayValue(tech.architecture.embeddingDimension, true)} />
                        )}
                        {tech.architecture?.modelFiles?.length > 0 && (
                          <Row label={t('wizard.step5.techConfig.modelFiles')} value={<ChipsShort items={tech.architecture.modelFiles} />} />
                        )}
                      </List>
                    </Box>

                    {/* 3. TRAINING & EVALUATION (optional) */}
                    {hasTrainingEval && (
                      <Box sx={{ mb:2 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ display:'block', mb:1, fontWeight:600, textTransform:'uppercase', fontSize:'0.7rem' }}>
                          {t('wizard.step5.techConfig.trainingEval')}
                        </Typography>
                        <List dense>
                          {primaryLang && (
                            <Row label={t('wizard.step5.techConfig.primaryLanguage')} value={primaryLang} />
                          )}
                          {metrics && (
                            <Row label={t('wizard.step5.techConfig.metrics')} value={metrics} />
                          )}
                        </List>
                      </Box>
                    )}

                    {/* 4. RUNTIME */}
                    <Box sx={{ mb:2 }}>
                      <Typography variant="caption" color="text.secondary" sx={{ display:'block', mb:1, fontWeight:600, textTransform:'uppercase', fontSize:'0.7rem' }}>
                        {t('wizard.step5.techConfig.runtime')}
                      </Typography>
                      <List dense>
                        <Row label={t('wizard.step5.techConfig.python')} value={displayValue(tech.runtime?.python)} />
                        {tech.runtime?.os?.length > 0 && (
                          <Row label={t('wizard.step5.techConfig.os')} value={<ChipsShort items={tech.runtime.os} />} />
                        )}
                        {tech.runtime?.accelerators?.length > 0 && (
                          <Row label={t('wizard.step5.techConfig.accelerators')} value={<ChipsShort items={tech.runtime.accelerators} />} />
                        )}
                        <Row label={t('wizard.step5.techConfig.cuda')} value={displayValue(tech.runtime?.cuda)} />
                        <Row label={t('wizard.step5.techConfig.torch')} value={displayValue(tech.runtime?.torch)} />
                        <Row label={t('wizard.step5.techConfig.cudnn')} value={displayValue(tech.runtime?.cudnn)} />
                        <Row label={t('wizard.step5.techConfig.computeCapability')} value={displayValue(tech.runtime?.computeCapability)} />
                      </List>
                    </Box>

                    {/* 5. DEPENDENCIES */}
                    {tech.dependencies?.pip?.length > 0 && (
                      <Box sx={{ mb:2 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ display:'block', mb:1, fontWeight:600, textTransform:'uppercase', fontSize:'0.7rem' }}>
                          {t('wizard.step5.techConfig.dependencies')}
                        </Typography>
                        <List dense>
                          <Row label={t('wizard.step5.techConfig.dependenciesPip')} value={tech.dependencies.pip.join(' · ')} />
                        </List>
                      </Box>
                    )}

                    {/* 6. RESOURCES */}
                    <Box sx={{ mb:2 }}>
                      <Typography variant="caption" color="text.secondary" sx={{ display:'block', mb:1, fontWeight:600, textTransform:'uppercase', fontSize:'0.7rem' }}>
                        {t('wizard.step5.techConfig.resources')}
                      </Typography>
                      <List dense>
                        <Row label={t('wizard.step5.techConfig.vramGB')} value={displayValue(tech.resources?.vramGB, true)} />
                        <Row label={t('wizard.step5.techConfig.cpuCores')} value={displayValue(tech.resources?.cpuCores, true)} />
                        <Row label={t('wizard.step5.techConfig.ramGB')} value={displayValue(tech.resources?.ramGB, true)} />
                      </List>
                    </Box>

                    {/* 7. INFERENCE */}
                    <Box>
                      <Typography variant="caption" color="text.secondary" sx={{ display:'block', mb:1, fontWeight:600, textTransform:'uppercase', fontSize:'0.7rem' }}>
                        {t('wizard.step5.techConfig.inference')}
                      </Typography>
                      <List dense>
                        <Row label={t('wizard.step5.techConfig.maxBatchSize')} value={displayValue(tech.inference?.maxBatchSize, true)} />
                        <Row label={t('wizard.step5.techConfig.contextLength')} value={displayValue(tech.inference?.contextLength, true)} />
                        <Row label={t('wizard.step5.techConfig.maxTokens')} value={displayValue(tech.inference?.maxTokens, true)} />
                        {tech.inference?.imageResolution && (
                          <Row label={t('wizard.step5.techConfig.imageResolution')} value={tech.inference.imageResolution} />
                        )}
                        {tech.inference?.sampleRate && Number(tech.inference.sampleRate) > 0 && (
                          <Row label={t('wizard.step5.techConfig.sampleRate')} value={tech.inference.sampleRate} />
                        )}
                        <Row 
                          label={t('wizard.step5.techConfig.triton')} 
                          value={tech.inference?.triton ? t('wizard.step5.techConfig.tritonEnabled') : t('wizard.step5.techConfig.tritonDisabled')} 
                        />
                        {tech.inference?.referencePerf && (
                          <Row label={t('wizard.step5.techConfig.referencePerf')} value={tech.inference.referencePerf} />
                        )}
                      </List>
                    </Box>
                  </Box>
                )}
              </Paper>
            </div>
          )
        }
        if (secId==='business') {
          const customer = viewModel?.step2.customer || metadata?.customer || {}
          const hasCustomerData = Boolean(
            customer.valueProp || customer.description || customer.expectedImpact || 
            customer.inputs || customer.outputs || customer.risks || customer.privacy || 
            customer.support || customer.prohibited ||
            (customer.industries && customer.industries.length > 0) ||
            (customer.useCases && customer.useCases.length > 0) ||
            (customer.deploy && customer.deploy.length > 0) ||
            (customer.supportedLanguages && customer.supportedLanguages.length > 0) ||
            (customer.examples && customer.examples.length > 0) ||
            (viewModel?.step1.industries && viewModel.step1.industries.length > 0) ||
            (viewModel?.step1.useCases && viewModel.step1.useCases.length > 0) ||
            (viewModel?.step1.supportedLanguages && viewModel.step1.supportedLanguages.length > 0)
          )

          return (
            <div key={secId} draggable onDragStart={()=>onDragStart(secId)} onDragOver={(e)=>onDragOver(e,secId)} onDrop={()=>onDrop(secId)}>
              <Paper variant="outlined" sx={{ p:{ xs:2, md:3 }, mb:2, borderRadius:2 }}>
                {/* Header with title and edit button */}
                <Box sx={{ mb:2 }}>
                  <Box sx={{ display:'flex', alignItems:'center', justifyContent:'space-between', mb:0.5 }}>
                    <Typography variant="subtitle2" sx={{ color:'#fff', fontWeight:700 }}>
                      {t('wizard.step5.sections.customerSheet')}
                    </Typography>
                    <Button 
                      size="small" 
                      variant="outlined" 
                      startIcon={<EditOutlinedIcon fontSize="small" />}
                      onClick={(e) => navigateAfterSave(e as any, `${base}/step2`)}
                      sx={{ textTransform: 'none' }}
                    >
                      {t('wizard.step5.step2Summary.editStep2')}
                    </Button>
                  </Box>
                  <Typography variant="caption" color="text.secondary" sx={{ display:'block' }}>
                    {t('wizard.step5.step2Summary.subtitle')}
                  </Typography>
                </Box>

                {loading ? (
                  <List dense>
                    <ListItem><Skeleton animation="wave" variant="text" width={280} /></ListItem>
                    <ListItem><Skeleton animation="wave" variant="text" width={320} /></ListItem>
                    <ListItem><Skeleton animation="wave" variant="text" width={260} /></ListItem>
                    <ListItem><Skeleton animation="wave" variant="text" width={240} /></ListItem>
                  </List>
                ) : !hasCustomerData ? (
                  <Alert severity="info" sx={{ mt:1 }}>
                    {t('wizard.step5.step2Summary.emptyState')}
                  </Alert>
                ) : (
                  <Box sx={{ transition:'opacity 150ms ease 40ms', willChange:'opacity', opacity: shouldFade ? (loadedRemote ? 1 : 0) : 1 }}>
                    <Grid container spacing={3}>
                      {/* LEFT COLUMN: Business narrative */}
                      <Grid item xs={12} md={7}>
                        <Stack spacing={2}>
                          {/* Headline (valueProp) */}
                          {Boolean(customer.valueProp) && (
                            <Box>
                              <Typography variant="h6" sx={{ fontWeight:700, color:'#fff', mb:0.5 }}>
                                {customer.valueProp}
                              </Typography>
                            </Box>
                          )}

                          {/* Description */}
                          {Boolean(customer.description) && (
                            <Box>
                              <Typography variant="body2" sx={{ color:'#ffffffcc' }}>
                                {customer.description}
                              </Typography>
                            </Box>
                          )}

                          {/* Expected Impact */}
                          {Boolean(customer.expectedImpact) && (
                            <Box>
                              <Typography variant="caption" color="text.secondary" sx={{ display:'block', mb:0.5, fontWeight:600 }}>
                                {t('wizard.step5.step2Summary.expectedImpact')}
                              </Typography>
                              <Typography 
                                variant="body2" 
                                sx={{ 
                                  color:'#ffffffcc',
                                  display: '-webkit-box',
                                  WebkitLineClamp: 3,
                                  WebkitBoxOrient: 'vertical',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis'
                                }}
                              >
                                {customer.expectedImpact}
                              </Typography>
                            </Box>
                          )}

                          {/* How this is used (Inputs/Outputs) */}
                          {(Boolean(customer.inputs) || Boolean(customer.outputs)) && (
                            <Box>
                              <Typography variant="caption" color="text.secondary" sx={{ display:'block', mb:1, fontWeight:600, textTransform:'uppercase', fontSize:'0.7rem' }}>
                                {t('wizard.step5.step2Summary.howUsed')}
                              </Typography>
                              <List dense sx={{ p:0 }}>
                                {Boolean(customer.inputs) && (
                                  <Row label={t('wizard.step5.step2Summary.inputs')} value={customer.inputs} />
                                )}
                                {Boolean(customer.outputs) && (
                                  <Row label={t('wizard.step5.step2Summary.outputs')} value={customer.outputs} />
                                )}
                              </List>
                            </Box>
                          )}

                          {/* I/O Examples */}
                          {Boolean(customer.examples && Array.isArray(customer.examples) && customer.examples.length > 0) && (
                            <Box>
                              <Typography variant="caption" color="text.secondary" sx={{ display:'block', mb:1, fontWeight:600 }}>
                                {t('wizard.step5.step2Summary.ioExamples')}
                              </Typography>
                              <Box sx={{ p:1.5, bgcolor:'rgba(255,255,255,0.03)', borderRadius:1, border:'1px solid rgba(255,255,255,0.1)' }}>
                                {/* First example */}
                                <Box>
                                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight:600 }}>#1</Typography>
                                  <Box sx={{ mt:0.5 }}>
                                    <Typography variant="body2" sx={{ color:'#ffffffcc', fontSize:'0.85rem' }}>
                                      <strong>Input:</strong> {customer.examples[0].input}
                                    </Typography>
                                    <Typography variant="body2" sx={{ color:'#ffffffcc', fontSize:'0.85rem', mt:0.5 }}>
                                      <strong>Output:</strong> {customer.examples[0].output}
                                    </Typography>
                                    {customer.examples[0].note && (
                                      <Typography variant="body2" sx={{ color:'text.secondary', fontSize:'0.8rem', mt:0.5, fontStyle:'italic' }}>
                                        {customer.examples[0].note}
                                      </Typography>
                                    )}
                                  </Box>
                                </Box>
                                {/* More examples indicator */}
                                {customer.examples.length > 1 && (
                                  <Typography variant="caption" color="primary.main" sx={{ display:'block', mt:1 }}>
                                    + {customer.examples.length - 1} {t('wizard.step5.step2Summary.moreExamples')}
                                  </Typography>
                                )}
                              </Box>
                            </Box>
                          )}

                          {/* Limitations / Risks */}
                          {Boolean(customer.risks) && (
                            <Box>
                              <Typography variant="caption" sx={{ display:'block', mb:0.5, fontWeight:600, color:'warning.main' }}>
                                ⚠️ {t('wizard.step5.step2Summary.limitations')}
                              </Typography>
                              <Typography 
                                variant="body2" 
                                sx={{ 
                                  color:'#ffffffcc',
                                  display: '-webkit-box',
                                  WebkitLineClamp: 3,
                                  WebkitBoxOrient: 'vertical',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis'
                                }}
                              >
                                {customer.risks}
                              </Typography>
                            </Box>
                          )}

                          {/* Prohibited uses */}
                          {Boolean(customer.prohibited) && (
                            <Box>
                              <Typography variant="caption" sx={{ display:'block', mb:0.5, fontWeight:600, color:'error.main' }}>
                                🚫 {t('wizard.step5.step2Summary.prohibited')}
                              </Typography>
                              <Typography 
                                variant="body2" 
                                sx={{ 
                                  color:'#ffffffcc',
                                  display: '-webkit-box',
                                  WebkitLineClamp: 4,
                                  WebkitBoxOrient: 'vertical',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis'
                                }}
                              >
                                {customer.prohibited}
                              </Typography>
                            </Box>
                          )}

                          {/* Privacy & data */}
                          {Boolean(customer.privacy) && (
                            <Box>
                              <Typography variant="caption" color="text.secondary" sx={{ display:'block', mb:0.5, fontWeight:600 }}>
                                {t('wizard.step5.step2Summary.privacy')}
                              </Typography>
                              <Typography 
                                variant="body2" 
                                sx={{ 
                                  color:'#ffffffcc',
                                  display: '-webkit-box',
                                  WebkitLineClamp: 3,
                                  WebkitBoxOrient: 'vertical',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis'
                                }}
                              >
                                {customer.privacy}
                              </Typography>
                            </Box>
                          )}

                          {/* Support & service */}
                          {Boolean(customer.support) && (
                            <Box>
                              <Typography variant="caption" color="text.secondary" sx={{ display:'block', mb:0.5, fontWeight:600 }}>
                                {t('wizard.step5.step2Summary.support')}
                              </Typography>
                              <Typography variant="body2" sx={{ color:'#ffffffcc' }}>
                                {customer.support}
                              </Typography>
                            </Box>
                          )}
                        </Stack>
                      </Grid>

                      {/* RIGHT COLUMN: Context chips/badges */}
                      <Grid item xs={12} md={5}>
                        <Stack spacing={2}>
                          {/* Business fit */}
                          {(Boolean(customer.industries?.length) || Boolean(customer.useCases?.length) || Boolean(viewModel?.step1.industries?.length) || Boolean(viewModel?.step1.useCases?.length)) && (
                            <Box>
                              <Typography variant="caption" color="text.secondary" sx={{ display:'block', mb:1, fontWeight:600, textTransform:'uppercase', fontSize:'0.7rem' }}>
                                {t('wizard.step5.step2Summary.businessFit')}
                              </Typography>
                              <Stack spacing={1.5}>
                                {Boolean(customer.industries?.length || viewModel?.step1.industries?.length) && (
                                  <Box>
                                    <Typography variant="caption" color="text.secondary" sx={{ display:'block', mb:0.5, fontSize:'0.75rem' }}>
                                      {t('wizard.step5.step2Summary.industries')}
                                    </Typography>
                                    <Box sx={{ display:'flex', flexWrap:'wrap', gap:0.5 }}>
                                      {(customer.industries || viewModel?.step1.industries || []).map((item: string, i: number) => (
                                        <Chip key={i} label={item} size="small" variant="outlined" sx={{ borderColor:'rgba(255,255,255,0.3)', color:'#fff', fontSize:'0.75rem' }} />
                                      ))}
                                    </Box>
                                  </Box>
                                )}
                                {Boolean(customer.useCases?.length || viewModel?.step1.useCases?.length) && (
                                  <Box>
                                    <Typography variant="caption" color="text.secondary" sx={{ display:'block', mb:0.5, fontSize:'0.75rem' }}>
                                      {t('wizard.step5.step2Summary.useCases')}
                                    </Typography>
                                    <Box sx={{ display:'flex', flexWrap:'wrap', gap:0.5 }}>
                                      {(customer.useCases || viewModel?.step1.useCases || []).map((item: string, i: number) => (
                                        <Chip key={i} label={item} size="small" variant="outlined" sx={{ borderColor:'rgba(255,255,255,0.3)', color:'#fff', fontSize:'0.75rem' }} />
                                      ))}
                                    </Box>
                                  </Box>
                                )}
                              </Stack>
                            </Box>
                          )}

                          {/* Delivery & deploy */}
                          {Boolean(customer.deploy?.length) && (
                            <Box>
                              <Typography variant="caption" color="text.secondary" sx={{ display:'block', mb:0.5, fontSize:'0.75rem' }}>
                                {t('wizard.step5.step2Summary.delivery')}
                              </Typography>
                              <Box sx={{ display:'flex', flexWrap:'wrap', gap:0.5 }}>
                                {customer.deploy.map((item: string, i: number) => (
                                  <Chip key={i} label={item} size="small" variant="outlined" sx={{ borderColor:'rgba(255,255,255,0.3)', color:'#fff', fontSize:'0.75rem' }} />
                                ))}
                              </Box>
                            </Box>
                          )}

                          {/* Languages */}
                          {(Boolean(customer.supportedLanguages?.length) || Boolean(customer.primaryLanguage) || Boolean(viewModel?.step1.supportedLanguages?.length)) && (
                            <Box>
                              <Typography variant="caption" color="text.secondary" sx={{ display:'block', mb:0.5, fontSize:'0.75rem' }}>
                                {t('wizard.step5.step2Summary.languages')}
                              </Typography>
                              <Typography variant="body2" sx={{ color:'#ffffffcc', fontSize:'0.85rem' }}>
                                {(customer.supportedLanguages || viewModel?.step1.supportedLanguages || []).join(', ') || '-'}
                                {customer.primaryLanguage && (
                                  <> • <strong>{t('wizard.step5.step2Summary.primary')}:</strong> {customer.primaryLanguage}</>
                                )}
                              </Typography>
                            </Box>
                          )}

                          {/* Model type */}
                          {Boolean(customer.modelType) && (
                            <Box>
                              <Chip 
                                label={`${t('wizard.step5.step2Summary.modelType')}: ${customer.modelType}`}
                                size="small" 
                                variant="outlined" 
                                sx={{ borderColor:'rgba(255,255,255,0.3)', color:'#fff', fontSize:'0.75rem' }} 
                              />
                            </Box>
                          )}

                          {/* Metrics */}
                          {Boolean(customer.metrics) && (
                            <Box>
                              <Typography variant="caption" color="text.secondary" sx={{ display:'block', mb:0.5, fontSize:'0.75rem' }}>
                                {t('wizard.step5.step2Summary.metrics')}
                              </Typography>
                              <Typography variant="body2" sx={{ color:'#ffffffcc', fontSize:'0.85rem' }}>
                                {customer.metrics}
                              </Typography>
                            </Box>
                          )}
                        </Stack>
                      </Grid>
                    </Grid>
                  </Box>
                )}
              </Paper>
            </div>
          )
        }
        
        if (secId==='artifacts') {
          const artifacts = viewModel?.step3.artifacts || metadata?.artifacts || []
          const downloadNotes = viewModel?.step3.downloadInstructions || (draft?.data?.step3 as any)?.downloadNotes || ''
          
          // Helper to get file icon
          const getFileIcon = (filename: string) => {
            const ext = filename.split('.').pop()?.toLowerCase() || ''
            if (['zip', 'tar', 'gz', 'bz2', 'xz', '7z'].includes(ext)) return <FolderZipIcon fontSize="small" />
            if (['py', 'js', 'ts', 'jsx', 'tsx', 'cpp', 'c', 'java', 'sh'].includes(ext)) return <CodeIcon fontSize="small" />
            if (['pdf', 'md', 'txt', 'doc', 'docx'].includes(ext)) return <DescriptionIcon fontSize="small" />
            return <InsertDriveFileIcon fontSize="small" />
          }
          
          // Helper to format file size
          const formatFileSize = (sizeBytes: number | undefined): string => {
            if (!sizeBytes || sizeBytes === 0) return '–'
            if (sizeBytes < 1024 * 1024) {
              return `${(sizeBytes / 1024).toFixed(1)} KB`
            }
            return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`
          }
          
          // Get primary weights artifact
          const primaryWeights = artifacts.find((a: any) => a.role === 'primary-weights')
          
          // Get unique roles
          const roleSet = new Set<string>((artifacts as any[])
            .map((a: any) => (a.role as string) || 'other')
            .filter((r: string) => r !== 'primary-weights'))
          const uniqueRoles: string[] = Array.from(roleSet)
          
          // Sort artifacts: primary-weights first, then by role
          const sortedArtifacts = [...artifacts].sort((a: any, b: any) => {
            const roleA = a.role || 'other'
            const roleB = b.role || 'other'
            if (roleA === 'primary-weights') return -1
            if (roleB === 'primary-weights') return 1
            const roleOrder = ['adapter', 'inference-code', 'training-code', 'tokenizer', 'assets', 'other']
            return roleOrder.indexOf(roleA) - roleOrder.indexOf(roleB)
          })
          
          // Copy CID handler
          const copyCid = (cid: string) => {
            try {
              navigator.clipboard.writeText(cid)
              setCopiedCid(cid)
              setTimeout(() => setCopiedCid(null), 2000)
            } catch {}
          }

          return (
            <div key={secId} draggable onDragStart={()=>onDragStart(secId)} onDragOver={(e)=>onDragOver(e,secId)} onDrop={()=>onDrop(secId)}>
              <Paper variant="outlined" sx={{ p:{ xs:2, md:3 }, mb:2, borderRadius:2 }}>
                {/* Header */}
                <Box sx={{ display:'flex', alignItems:'center', justifyContent:'space-between', mb:2 }}>
                  <Typography variant="subtitle2" sx={{ color:'#fff', fontWeight:700 }}>
                    {t('wizard.step5.sections.artifactsDemo')}
                  </Typography>
                  <Button 
                    size="small" 
                    variant="outlined" 
                    startIcon={<EditOutlinedIcon fontSize="small" />}
                    onClick={(e) => navigateAfterSave(e as any, `${base}/step3`)}
                    sx={{ textTransform: 'none' }}
                  >
                    {t('wizard.step5.artifactsDemo.editStep3')}
                  </Button>
                </Box>
                
                {artifacts.length === 0 ? (
                  <Alert severity="info" sx={{ mt:1 }}>
                    {t('wizard.step5.artifactsDemo.noArtifacts')}
                  </Alert>
                ) : (
                  <>
                    {/* Summary badges */}
                    <Box sx={{ display:'flex', flexWrap:'wrap', gap:1, mb:2 }}>
                      <Chip 
                        label={`${t('wizard.step5.artifactsDemo.totalFiles')}: ${artifacts.length}`} 
                        size="small" 
                        variant="outlined"
                        sx={{ borderColor:'rgba(255,255,255,0.3)', color:'#fff' }}
                      />
                      <Chip 
                        label={primaryWeights 
                          ? `${t('wizard.step5.artifactsDemo.primaryWeights')}: ${primaryWeights.filename}` 
                          : t('wizard.step5.artifactsDemo.noPrimaryWeights')
                        }
                        size="small" 
                        variant="outlined"
                        color={primaryWeights ? 'success' : 'warning'}
                        sx={{ borderColor: primaryWeights ? 'rgba(76,175,80,0.5)' : 'rgba(255,152,0,0.5)' }}
                      />
                      {uniqueRoles.length > 0 && (
                        <Chip 
                          label={`${t('wizard.step5.artifactsDemo.rolesCovered')}: ${uniqueRoles.map((r: string) => 
                            t(`wizard.step5.artifactsDemo.roles.${r}` as any) || r
                          ).join(', ')}`}
                          size="small" 
                          variant="outlined"
                          sx={{ borderColor:'rgba(255,255,255,0.3)', color:'#fff' }}
                        />
                      )}
                    </Box>

                    {/* Artifacts table */}
                    <Box sx={{ overflowX:'auto', mb:2 }}>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell sx={{ color:'#fff' }}>{t('wizard.step5.artifactsDemo.file')}</TableCell>
                            <TableCell sx={{ color:'#fff' }}>{t('wizard.step5.artifactsDemo.cid')}</TableCell>
                            <TableCell sx={{ color:'#fff' }}>{t('wizard.step5.artifactsDemo.size')}</TableCell>
                            <TableCell sx={{ color:'#fff' }}>{t('wizard.step5.artifactsDemo.sha256')}</TableCell>
                            <TableCell sx={{ color:'#fff' }}>{t('wizard.step5.artifactsDemo.notes')}</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {sortedArtifacts.map((a: any, idx: number) => {
                            const role = a.role || 'other'
                            const roleLabel = t(`wizard.step5.artifactsDemo.roles.${role}` as any) || role
                            
                            return (
                              <TableRow key={idx}>
                                {/* File column with icon, name, and role chip */}
                                <TableCell>
                                  <Box sx={{ display:'flex', alignItems:'center', gap:1 }}>
                                    {getFileIcon(a.filename || '')}
                                    <Box>
                                      <Typography variant="body2" sx={{ fontWeight:500 }}>
                                        {a.filename || '–'}
                                      </Typography>
                                      <Chip 
                                        label={roleLabel} 
                                        size="small" 
                                        sx={{ 
                                          height:18, 
                                          fontSize:'0.7rem', 
                                          mt:0.5,
                                          backgroundColor: role === 'primary-weights' ? 'rgba(76,175,80,0.2)' : 'rgba(255,255,255,0.1)',
                                          color: role === 'primary-weights' ? '#4caf50' : '#ffffffcc'
                                        }} 
                                      />
                                    </Box>
                                  </Box>
                                </TableCell>
                                
                                {/* CID column with copy and open buttons */}
                                <TableCell>
                                  <Box sx={{ display:'flex', alignItems:'center', gap:0.5 }}>
                                    <Typography variant="body2" sx={{ fontFamily:'monospace', fontSize:'0.8rem' }}>
                                      {a.cid ? `${a.cid.substring(0, 6)}...${a.cid.substring(a.cid.length - 4)}` : '–'}
                                    </Typography>
                                    {a.cid && (
                                      <>
                                        <Tooltip title={copiedCid === a.cid ? t('wizard.step5.artifactsDemo.copied') : t('wizard.step5.artifactsDemo.copy')}>
                                          <IconButton size="small" onClick={() => copyCid(a.cid)} sx={{ p:0.5 }}>
                                            {copiedCid === a.cid ? <CheckIcon fontSize="small" sx={{ color:'success.main' }} /> : <ContentCopyIcon fontSize="small" />}
                                          </IconButton>
                                        </Tooltip>
                                        <Tooltip title={t('wizard.step5.artifactsDemo.open')}>
                                          <IconButton 
                                            size="small" 
                                            onClick={() => window.open(ipfsToHttp(a.cid), '_blank', 'noopener,noreferrer')} 
                                            sx={{ p:0.5 }}
                                          >
                                            <OpenInNewIcon fontSize="small" />
                                          </IconButton>
                                        </Tooltip>
                                      </>
                                    )}
                                  </Box>
                                </TableCell>
                                
                                {/* Size column */}
                                <TableCell>
                                  <Typography variant="body2">
                                    {formatFileSize(a.sizeBytes)}
                                  </Typography>
                                </TableCell>
                                
                                {/* SHA-256 column with tooltip */}
                                <TableCell>
                                  {a.sha256 ? (
                                    <Tooltip title={`${t('wizard.step5.artifactsDemo.viewSha')}: ${a.sha256}`}>
                                      <Typography variant="body2" sx={{ fontFamily:'monospace', fontSize:'0.8rem', cursor:'help' }}>
                                        {a.sha256.substring(0, 10)}...
                                      </Typography>
                                    </Tooltip>
                                  ) : (
                                    <Typography variant="body2">–</Typography>
                                  )}
                                </TableCell>
                                
                                {/* Notes column with tooltip */}
                                <TableCell>
                                  {a.notes ? (
                                    <Tooltip title={`${t('wizard.step5.artifactsDemo.viewNotes')}: ${a.notes}`}>
                                      <Typography 
                                        variant="body2" 
                                        sx={{ 
                                          maxWidth: 150,
                                          whiteSpace: 'nowrap',
                                          overflow: 'hidden',
                                          textOverflow: 'ellipsis',
                                          cursor:'help'
                                        }}
                                      >
                                        {a.notes}
                                      </Typography>
                                    </Tooltip>
                                  ) : (
                                    <Typography variant="body2">–</Typography>
                                  )}
                                </TableCell>
                              </TableRow>
                            )
                          })}
                        </TableBody>
                      </Table>
                    </Box>

                    {/* Demo instructions section */}
                    {downloadNotes && (
                      <Box sx={{ mt:2 }}>
                        <Box sx={{ display:'flex', alignItems:'center', justifyContent:'space-between', mb:1 }}>
                          <Typography variant="caption" color="text.secondary" sx={{ fontWeight:600, textTransform:'uppercase', fontSize:'0.7rem' }}>
                            {t('wizard.step5.artifactsDemo.demoInstructions')}
                          </Typography>
                          <Button 
                            size="small" 
                            onClick={() => setShowFullInstructions(!showFullInstructions)}
                            endIcon={showFullInstructions ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                            sx={{ textTransform: 'none', fontSize:'0.75rem' }}
                          >
                            {showFullInstructions ? t('wizard.step5.artifactsDemo.hideInstructions') : t('wizard.step5.artifactsDemo.showFullInstructions')}
                          </Button>
                        </Box>
                        <Paper 
                          variant="outlined" 
                          sx={{ 
                            p:1.5, 
                            bgcolor:'rgba(0,0,0,0.2)', 
                            maxHeight: showFullInstructions ? 'none' : 120,
                            overflow: showFullInstructions ? 'visible' : 'hidden',
                            position: 'relative'
                          }}
                        >
                          <Typography 
                            variant="body2" 
                            component="pre" 
                            sx={{ 
                              fontFamily:'monospace', 
                              fontSize:'0.8rem', 
                              color:'#ffffffcc',
                              whiteSpace: 'pre-wrap',
                              wordBreak: 'break-word',
                              m:0
                            }}
                          >
                            {downloadNotes}
                          </Typography>
                          {!showFullInstructions && downloadNotes.split('\n').length > 5 && (
                            <Box 
                              sx={{ 
                                position:'absolute', 
                                bottom:0, 
                                left:0, 
                                right:0, 
                                height:40, 
                                background:'linear-gradient(to bottom, transparent, rgba(0,0,0,0.8))' 
                              }} 
                            />
                          )}
                        </Paper>
                      </Box>
                    )}
                  </>
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
        <FormControlLabel
          sx={{ color:'#fff', alignItems:'center', '& .MuiSvgIcon-root': { color:'#fff' }, '& .MuiFormControlLabel-label': { lineHeight: 1.4 } }}
          control={<Checkbox
            checked={accepted}
            onChange={(e)=>setAccepted(e.target.checked)}
            sx={{ color:'#ffffffcc', '&.Mui-checked': { color:'#fff' } }}
          />}
          label={<Typography variant="body2" sx={{ color:'#fff' }}>{acceptLabel}</Typography>}
        />
        <Box sx={{ mt: 1 }}>
          <Button onClick={onPublish} disabled={publishing || issues.length>0 || !accepted} variant="contained" startIcon={<RocketLaunchIcon/>}
            sx={{ backgroundImage:'linear-gradient(90deg, #7c5cff, #2ea0ff)', color:'#fff', fontWeight:700, textTransform:'none', boxShadow:'0 6px 20px rgba(46,160,255,0.25)', '&:hover': { filter:'brightness(1.05)', backgroundImage:'linear-gradient(90deg, #7c5cff, #2ea0ff)' } }}
          >
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

      <Box sx={{ height: { xs: 76, md: 76 }, mt: 2 }} />

      <WizardFooter
        currentStep={5}
        totalSteps={5}
        stepTitle={t('wizard.step5.title')}
        onBack={() => { window.location.href = `${base}/step4` }}
        onSaveDraft={() => { /* optional on step 5; no-op */ }}
        onNext={() => { if (publishing || issues.length>0 || !accepted) return; onPublish() }}
        isNextDisabled={publishing || issues.length>0 || !accepted}
        isSaving={false}
        isLastStep={true}
        backLabel={t('wizard.common.back')}
        saveDraftLabel={t('wizard.common.saveDraft')}
        savingLabel={t('wizard.common.saving')}
        nextLabel={t('wizard.index.publish')}
        publishLabel={t('wizard.index.publish')}
        hideSaveDraft
        hideNext
        hideBack
      />

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
      </Box>
    </Box>
    </WizardThemeProvider>
  )
}
