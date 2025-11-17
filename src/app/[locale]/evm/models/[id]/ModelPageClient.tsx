"use client";
import React from 'react'
import useSWR from 'swr'
import { useConfig } from 'wagmi'
import {
  Container, Box, Stack, Typography, Chip, Grid, Skeleton, Button, Divider,
  Card, CardContent, CardHeader, Tooltip, IconButton, SvgIcon, Paper,
  Table, TableBody, TableCell, TableHead, TableRow,
  Dialog, DialogTitle, DialogContent, DialogActions,
  List, ListItem, ListItemText,
  Radio, RadioGroup, FormControlLabel, TextField, MenuItem,
  Snackbar, Alert, CircularProgress
} from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import CheckIcon from '@mui/icons-material/Check'
import Link from 'next/link'
import { useWriteContract, usePublicClient, useSwitchChain, useAccount, useChainId } from 'wagmi'
import MARKET_ARTIFACT from '@/abis/Marketplace.json'
import { useTranslations, useLocale } from 'next-intl'
import { createViewModelFromPublished } from '@/viewmodels'
import type { EntitlementsDTO } from '@/adapters/evm/entitlements'
import { Row, ChipsShort, displayValue, formatPriceDisplay } from '@/components/ModelDetailShared'
import { useWalletAddress } from '@/hooks/useWalletAddress'
import GitHubIcon from '@mui/icons-material/GitHub'
import LanguageIcon from '@mui/icons-material/Language'
import LinkedInIcon from '@mui/icons-material/LinkedIn'
import PersonIcon from '@mui/icons-material/Person'

export type ModelPageClientProps = {
  modelId: number
  initialModel: any | null
  initialEntitlements: EntitlementsDTO | null
  entitlementsEndpoint: string
  targetChainId?: number | null
}

type UseEvmModelOptions = {
  modelId?: number
  chainId?: number | null
  initialModel?: any | null
}

const XIcon = (props: any) => (
  <SvgIcon {...props} viewBox="0 0 24 24">
    <path d="M3 2l8 10-8 10h3l6.5-8L19 22h3l-8-10 8-10h-3l-6.5 8L6 2H3z" fill="currentColor" />
  </SvgIcon>
)

function useEvmModel(options: UseEvmModelOptions) {
  const { modelId, chainId, initialModel } = options
  const id = modelId
  const [data, setData] = React.useState<any | null>(initialModel ?? null)
  const [loading, setLoading] = React.useState(!initialModel)
  const [attempted, setAttempted] = React.useState(Boolean(initialModel))
  const walletChainId = useChainId() // Detect chain from connected wallet
  const evmChainId = React.useMemo(() => {
    // Priority: explicit chainId from URL > wallet chainId > env default
    if (typeof chainId === 'number' && Number.isFinite(chainId)) {
      return chainId
    }
    if (typeof walletChainId === 'number' && Number.isFinite(walletChainId)) {
      return walletChainId
    }
    const envValue = Number(process.env.NEXT_PUBLIC_EVM_DEFAULT_CHAIN_ID || process.env.NEXT_PUBLIC_EVM_CHAIN_ID || 0)
    return Number.isFinite(envValue) && envValue > 0 ? envValue : undefined
  }, [chainId, walletChainId])

  React.useEffect(() => {
    setData(initialModel ?? null)
    setLoading(!initialModel)
    setAttempted(Boolean(initialModel))
  }, [initialModel, modelId])

  React.useEffect(() => {
    if (!id) return
    let alive = true
    const load = async () => {
      setLoading(true)
      try {
        const qs = new URLSearchParams()
        if (typeof evmChainId === 'number') qs.set('chainId', String(evmChainId))
        const fetchWithTimeout = async (input: RequestInfo | URL, init: RequestInit = {}, ms = 10000): Promise<Response> => {
          const ac = new AbortController()
          const t = setTimeout(()=> ac.abort(), ms)
          try {
            return await fetch(input, { ...init, signal: ac.signal })
          } finally {
            clearTimeout(t)
          }
        }
        const r = await fetchWithTimeout(`/api/models/evm/${id}?${qs.toString()}`, { cache: 'no-store' }, 10000)
        const j = await r.json().catch(()=>({}))
        let m = j?.data || null
        if (m && m.uri && typeof m.uri === 'string' && !m.uri.includes('.enc')) {
          try {
            const uri = m.uri as string
            const toApiFromIpfs = (u: string): string => {
              if (!u) return ''
              if (u.startsWith('http://') || u.startsWith('https://')) return u
              if (u.startsWith('ipfs://')) return `/api/ipfs/ipfs/${u.replace('ipfs://','')}`
              if (u.startsWith('/ipfs/')) return `/api/ipfs${u}`
              return `/api/ipfs/ipfs/${u}`
            }
            const httpUrl = toApiFromIpfs(uri)
            const meta = await fetchWithTimeout(httpUrl, { cache: 'no-store' }, 10000).then(r=>r.json()).catch(()=>null)
            if (meta) {
              const img = meta.image || meta.image_url || meta.thumbnail || meta?.cover?.thumbCid || meta?.cover?.cid
              if (img && typeof img === 'string') {
                if (img.startsWith('http://') || img.startsWith('https://')) {
                  m.imageUrl = img
                } else if (img.startsWith('ipfs://')) {
                  m.imageUrl = `/api/ipfs/ipfs/${img.replace('ipfs://','')}`
                } else if (img.startsWith('/ipfs/')) {
                  m.imageUrl = `/api/ipfs${img}`
                } else {
                  m.imageUrl = `/api/ipfs/ipfs/${img}`
                }
              }
              if (!m.name && typeof meta.name === 'string') m.name = meta.name
              const desc = typeof meta.description === 'string' ? meta.description : (typeof (meta as any).shortSummary === 'string' ? (meta as any).shortSummary : undefined)
              if (!m.description && typeof desc === 'string') m.description = desc
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
              const rights = (meta?.rights && typeof meta.rights === 'object') ? {
                api: !!meta.rights.api,
                download: !!meta.rights.download,
                transferable: !!meta.rights.transferable,
              } : (meta?.licensePolicy ? {
                api: Array.isArray(meta.licensePolicy.rights) ? meta.licensePolicy.rights.map((x:any)=> String(x).toLowerCase()).includes('api') : undefined,
                download: Array.isArray(meta.licensePolicy.rights) ? meta.licensePolicy.rights.map((x:any)=> String(x).toLowerCase()).includes('download') : undefined,
                transferable: !!meta.licensePolicy.transferable,
              } : undefined)
              const deliveryMode = (typeof meta?.deliveryMode === 'string' && meta.deliveryMode) || (typeof meta?.delivery?.mode === 'string' && meta.delivery.mode) || (Array.isArray(meta?.licensePolicy?.delivery) ? ( ()=>{
                const d = meta.licensePolicy.delivery.map((x:any)=> String(x).toLowerCase())
                return d.includes('api') && d.includes('download') ? 'both' : d.includes('api') ? 'api' : d.includes('download') ? 'download' : undefined
              })() : undefined)
              const stripIpfs = (u:any): string => {
                const s = String(u||'')
                if (!s) return ''
                if (s.startsWith('ipfs://')) return s.replace('ipfs://','')
                if (s.startsWith('/ipfs/')) return s.replace('/ipfs/','')
                return s
              }
              const toArray = (x:any): any[] => {
                if (!x) return []
                if (Array.isArray(x)) return x
                if (typeof x === 'object') {
                  if (Array.isArray((x as any).items)) return (x as any).items
                  try { return Object.values(x) } catch { return [] }
                }
                return []
              }
              const rawArtifacts = [
                ...toArray((meta as any)?.artifacts),
                ...toArray((meta as any)?.files),
                ...toArray((meta as any)?.assets),
                ...toArray((meta as any)?.bundle?.files),
                ...toArray((meta as any)?.model?.artifacts),
              ]
              const normArtifact = (v:any) => {
                if (v == null) return null as any
                if (typeof v === 'string') {
                  const cid = stripIpfs(v)
                  return cid ? { cid, filename: '', size: '', sha256: '' } : null
                }
                if (typeof v === 'object') {
                  const cidRaw = (v as any).cid || (v as any).hash || (v as any).ipfs || (v as any).ipfs_cid || (v as any).url
                  const cid = stripIpfs(cidRaw)
                  const filename = (v as any).filename || (v as any).name || (v as any).path || ''
                  const size = (v as any).size || (v as any).bytes || (v as any).length || ''
                  const sha256 = (v as any).sha256 || (v as any).hash256 || (v as any).sha || ''
                  return cid ? { cid: String(cid), filename: String(filename||''), size, sha256: String(sha256||'') } : null
                }
                return null as any
              }
              const artifactsList = rawArtifacts.map(normArtifact).filter(Boolean).reduce((acc:any[], cur:any)=>{
                const key = `${cur.cid}::${cur.filename||''}`
                if (!acc.some(x=> `${x.cid}::${x.filename||''}` === key)) acc.push(cur)
                return acc
              }, [])
              // Map Step 2 customer-facing fields when present
              const cust = (meta as any)?.customer || {}
              const listing = (meta as any)?.listing || {}
              const businessCategory = typeof listing.businessCategory === 'string' ? listing.businessCategory : (typeof cust.businessCategory === 'string' ? cust.businessCategory : (typeof (meta as any)?.businessCategory === 'string' ? (meta as any).businessCategory : undefined))
              const valueProposition = typeof cust.valueProp === 'string' ? cust.valueProp : (typeof (meta as any)?.valueProposition === 'string' ? (meta as any).valueProposition : undefined)
              const customerDescription = typeof cust.description === 'string' ? cust.description : undefined
              const expectedImpact = typeof cust.expectedImpact === 'string' ? cust.expectedImpact : (typeof cust.expectedOutcomes === 'string' ? cust.expectedOutcomes : undefined)
              const inputs = typeof cust.inputs === 'string' ? cust.inputs : undefined
              const outputs = typeof cust.outputs === 'string' ? cust.outputs : undefined
              const examples = Array.isArray(cust.examples) ? cust.examples : undefined
              const industries = Array.isArray(cust.industries) ? cust.industries : undefined
              const useCases = Array.isArray(cust.useCases) ? cust.useCases : undefined
              const limitations = typeof cust.limitations === 'string' ? cust.limitations : (typeof cust.risks === 'string' ? cust.risks : undefined)
              const prohibited = typeof cust.prohibited === 'string' ? cust.prohibited : undefined
              const privacy = typeof cust.privacy === 'string' ? cust.privacy : undefined
              const deploy = Array.isArray(cust.deploy) ? cust.deploy : undefined
              const support = typeof cust.support === 'string' ? cust.support : undefined
              const supportedLanguages = Array.isArray(cust.supportedLanguages) ? cust.supportedLanguages : undefined
              const primaryLanguage = typeof cust.primaryLanguage === 'string' ? cust.primaryLanguage : undefined
              const modelType = typeof cust.modelType === 'string' ? cust.modelType 
                : (typeof listing.modelType === 'string' ? listing.modelType 
                : (typeof (meta as any)?.modelType === 'string' ? (meta as any).modelType 
                : (typeof (meta as any)?.modelTypeBusiness === 'string' ? (meta as any).modelTypeBusiness : undefined)))
              const metrics = typeof cust.metrics === 'string' ? cust.metrics : undefined
              // Extract authorship data
              const authorship = (meta as any)?.authorship || (meta as any)?.author || {}
              const authorName = typeof authorship.name === 'string' ? authorship.name : (typeof authorship.displayName === 'string' ? authorship.displayName : undefined)
              const authorLinks = (authorship.links && typeof authorship.links === 'object') ? authorship.links : (authorship.socials && typeof authorship.socials === 'object') ? authorship.socials : undefined
              console.log('🔍 DEBUG - IPFS modelType extraction:', {
                'cust.modelType': cust.modelType,
                'listing.modelType': listing.modelType,
                'meta.modelType': (meta as any)?.modelType,
                'meta.modelTypeBusiness': (meta as any)?.modelTypeBusiness,
                'final modelType': modelType
              })
              console.log('🔍 DEBUG - IPFS authorship extraction:', {
                'authorship': authorship,
                'authorName': authorName,
                'authorLinks': authorLinks
              })
              // Map Step 2 technical fields when present
              const arch = (meta as any)?.architecture || {}
              const quantization = typeof arch.quantization === 'string' ? arch.quantization : undefined
              const fileFormats = Array.isArray(arch.modelFiles) ? arch.modelFiles : undefined
              const modelSize = (arch as any).modelSizeParams != null ? String((arch as any).modelSizeParams) : undefined
              const artifactSize = typeof (arch as any).artifactSizeGB === 'string' ? (arch as any).artifactSizeGB : undefined
              const runtime2 = (meta as any)?.runtime || {}
              const python = typeof (runtime2 as any).python === 'string' ? (runtime2 as any).python : undefined
              const cuda = typeof (runtime2 as any).cuda === 'string' ? (runtime2 as any).cuda : undefined
              const pytorch = typeof (runtime2 as any).torch === 'string' ? (runtime2 as any).torch : undefined
              const cudnn = typeof (runtime2 as any).cudnn === 'string' ? (runtime2 as any).cudnn : undefined
              const systems = Array.isArray((runtime2 as any).os) ? (runtime2 as any).os : undefined
              const accelerators = Array.isArray((runtime2 as any).accelerators) ? (runtime2 as any).accelerators : undefined
              const computeCapability = typeof (runtime2 as any).computeCapability === 'string' ? (runtime2 as any).computeCapability : undefined
              const deps2 = (meta as any)?.dependencies || {}
              const dependencies = Array.isArray((deps2 as any).pip) ? ((deps2 as any).pip as string[]).join('\n') : undefined
              const res2 = (meta as any)?.resources || {}
              const minVram = (res2 as any).vramGB != null ? Number((res2 as any).vramGB) : undefined
              const minCpu = (res2 as any).cpuCores != null ? Number((res2 as any).cpuCores) : undefined
              const recRam = (res2 as any).ramGB != null ? Number((res2 as any).ramGB) : undefined
              const inf2 = (meta as any)?.inference || {}
              const maxBatch = (inf2 as any).maxBatchSize != null ? Number((inf2 as any).maxBatchSize) : undefined
              const contextLength = (inf2 as any).contextLength != null ? Number((inf2 as any).contextLength) : undefined
              const maxTokens = (inf2 as any).maxTokens != null ? Number((inf2 as any).maxTokens) : undefined
              const imageResolution = typeof (inf2 as any).imageResolution === 'string' ? (inf2 as any).imageResolution : undefined
              const sampleRate = (inf2 as any).sampleRate != null ? String((inf2 as any).sampleRate) : undefined
              const triton = typeof (inf2 as any).triton === 'boolean' ? (inf2 as any).triton : undefined
              const gpuNotes = typeof (inf2 as any).referencePerf === 'string' ? (inf2 as any).referencePerf : undefined
              const termsText = typeof (meta as any)?.licensePolicy?.termsText === 'string' ? (meta as any).licensePolicy.termsText : undefined
              m = { ...m,
                categories, tasks, tags, architectures, frameworks, precision, rights, deliveryMode,
                modalities: mods,
                businessCategory, valueProposition, customerDescription, expectedImpact, inputs, outputs, examples, industries, useCases, limitations, prohibited, privacy, deploy, support, supportedLanguages, primaryLanguage, modelType, metrics,
                quantization, fileFormats, modelSize, artifactSize,
                python, cuda, pytorch, cudnn, systems, accelerators, computeCapability,
                dependencies, minVram, minCpu, recRam,
                maxBatch, contextLength, maxTokens, imageResolution, sampleRate, triton, gpuNotes,
                termsText,
                artifactsList,
                authorName, authorLinks
              }
            }
          } catch {}
        }
        if (alive) setData(m)
      } catch {
        if (alive) setData(null)
      } finally {
        if (alive) {
          setLoading(false)
          setAttempted(true)
        }
      }
    }
    load()
    return () => { alive = false }
  }, [id, evmChainId])

  return { data, loading, attempted, evmChainId }
}

export default function ModelPageClient(props: ModelPageClientProps) {
  const { modelId, initialModel, initialEntitlements, entitlementsEndpoint, targetChainId } = props
  const id = modelId
  const { data, loading, attempted, evmChainId } = useEvmModel({ modelId, chainId: targetChainId, initialModel })
  const { chains } = useConfig() as any
  const t = useTranslations('evm.detail')
  const locale = useLocale()
  const [buyOpen, setBuyOpen] = React.useState(false)
  const [buyStep, setBuyStep] = React.useState<'select'|'review'>('select')
  const [buyKind, setBuyKind] = React.useState<'perpetual'|'subscription'|undefined>(undefined)
  const [buyMonths, setBuyMonths] = React.useState<number>(1)
  const demoAnchorRef = React.useRef<HTMLDivElement>(null)
  const { writeContractAsync} = useWriteContract()
  const publicClient = usePublicClient()
  const { switchChainAsync } = useSwitchChain()
  const [txLoading, setTxLoading] = React.useState(false)
  const [snkOpen, setSnkOpen] = React.useState(false)
  const [snkMsg, setSnkMsg] = React.useState<string>('')
  const [snkSev, setSnkSev] = React.useState<'success'|'error'|'info'|'warning'>('info')
  const { isConnected, chain } = useAccount()
  const { walletAddress } = useWalletAddress()
  const entitlementsKey = walletAddress && id ? ['entitlements', id, walletAddress.toLowerCase(), evmChainId || 'default'] : null
  const entitlementsFetcher = React.useCallback(async () => {
    if (!walletAddress || !id) return null
    const qs = new URLSearchParams()
    if (typeof evmChainId === 'number') qs.set('chainId', String(evmChainId))
    const url = `${entitlementsEndpoint}${qs.toString() ? `?${qs.toString()}` : ''}`
    const res = await fetch(url, {
      headers: { 'x-wallet-address': walletAddress },
      cache: 'no-store',
    })
    if (!res.ok) {
      if (res.status === 404) return null
      throw new Error('entitlements_fetch_failed')
    }
    return (await res.json()) as EntitlementsDTO
  }, [walletAddress, id, entitlementsEndpoint, evmChainId])
  const { data: entitlementsData, mutate: mutateEntitlements } = useSWR<EntitlementsDTO | null>(entitlementsKey, entitlementsFetcher, {
    fallbackData: initialEntitlements ?? undefined,
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
  })
  const entitlements = entitlementsData ?? null
  const entitlementsEtagRef = React.useRef<string | null>(initialEntitlements?.etag ?? null)
  const hasActiveLicense = React.useMemo(() => {
    if (!entitlements || entitlements.revoked) return false
    if (entitlements.kind === 'perpetual') return true
    if (typeof entitlements.expiresAt === 'number') {
      const now = Math.floor(Date.now() / 1000)
      return entitlements.expiresAt > now
    }
    return false
  }, [entitlements])
  const entitlementsExpiryDate = React.useMemo(() => {
    if (!entitlements?.expiresAt) return null
    try {
      return new Date(entitlements.expiresAt * 1000)
    } catch {
      return null
    }
  }, [entitlements?.expiresAt])
  React.useEffect(() => {
    const nextEtag = entitlements?.etag ?? null
    const prevEtag = entitlementsEtagRef.current
    if (!prevEtag && nextEtag) {
      entitlementsEtagRef.current = nextEtag
      return
    }
    if (prevEtag && nextEtag && prevEtag !== nextEtag) {
      entitlementsEtagRef.current = nextEtag
      const infoMsg = locale === 'es' ? 'Datos de licencia actualizados' : 'License data refreshed'
      setSnkSev('info')
      setSnkMsg(infoMsg)
      setSnkOpen(true)
    }
    if (!nextEtag) {
      entitlementsEtagRef.current = null
    }
  }, [entitlements, locale])
  const L = React.useMemo(()=>({
    back: t('back'),
    buy: t('buy'),
    tryDemo: t('tryDemo'),
    noCover: t('noCover'),
    perpetual: t('perpetual'),
    subscriptionMo: t('subscriptionMo'),
    version: t('version'),
    uri: t('uri'),
    notFound: t('notFound'),
    whatItDoes: t('whatItDoes'),
    valueProp: t('valueProp'),
    descMissing: t('descMissing'),
    expectedImpact: t('expectedImpact'),
    customerSheet: t('customerSheet'),
    ioTitle: t('ioTitle'),
    ioSubtitle: t('ioSubtitle'),
    inputs: t('inputs'),
    outputs: t('outputs'),
    examples: t('examples'),
    exampleIn: t('exampleIn'),
    exampleOut: t('exampleOut'),
    note: t('note'),
    noExamples: t('noExamples'),
    industriesUseCases: t('industriesUseCases'),
    industries: t('industries'),
    useCases: t('useCases'),
    unspecified: t('unspecified'),
    knownLimits: t('knownLimits'),
    prohibited: t('prohibited'),
    privacy: t('privacy'),
    deploy: t('deploy'),
    support: t('support'),
    techConfig: t('techConfig'),
    capabilities: t('capabilities'),
    modalities: t('modalities'),
    architecture: t('architecture'),
    frameworks: t('frameworks'),
    architectures: t('architectures'),
    precision: t('precision'),
    quantization: t('quantization'),
    fileFormats: t('fileFormats'),
    modelSize: t('modelSize'),
    artifactSize: t('artifactSize'),
    runtime: t('runtime'),
    dependencies: t('dependencies'),
    minResources: t('minResources'),
    minVram: t('minVram'),
    cpuCores: t('cpuCores'),
    recRam: t('recRam'),
    inferenceOpts: t('inferenceOpts'),
    maxBatch: t('maxBatch'),
    contextLength: t('contextLength'),
    maxTokens: t('maxTokens'),
    referenceLatency: t('referenceLatency'),
    triton: t('triton'),
    imageResolution: t('imageResolution'),
    artifactsDemo: t('artifactsDemo'),
    artifacts: t('artifacts'),
    cid: t('cid'),
    filename: t('filename'),
    size: t('size'),
    sha256: t('sha256'),
    actions: t('actions'),
    open: t('open'),
    copy: t('copy'),
    copyHash: t('copyHash'),
    noArtifacts: t('noArtifacts'),
    hostedDemo: t('hostedDemo'),
    runDemo: t('runDemo'),
    noDemo: t('noDemo'),
    licensesTerms: t('licensesTerms'),
    perpetualLicense: t('perpetualLicense'),
    subscriptionPerMonth: t('subscriptionPerMonth'),
    baseDuration: t('baseDuration'),
    rightsDelivery: t('rightsDelivery'),
    deliveryHint: t('deliveryHint'),
    transferableHint: t('transferableHint'),
    termsKey: t('termsKey'),
    termsHash: t('termsHash'),
    buyModalTitle: t('buyModalTitle'),
    buyModalHint: t('buyModalHint'),
    close: t('close'),
    continue: t('continue'),
    months: t('months'),
    selectType: t('selectType'),
    review: t('review'),
    purchase: t('purchase'),
    // snack / status
    connectWallet: t('connectWallet'),
    wrongNetwork: t('wrongNetwork'),
    purchaseSuccess: t('purchaseSuccess'),
    purchaseErrorPrefix: t('purchaseErrorPrefix'),
    marketAddressMissing: t('marketAddressMissing'),
    loadingModelTitle: t('loadingModelTitle'),
    loadingModelBody: t('loadingModelBody'),
    systems: t('systems'),
    accelerators: t('accelerators'),
  }), [t])
  const evmSymbol = React.useMemo(()=>{
    try {
      if (typeof evmChainId !== 'number') return 'ETH'
      const ch = Array.isArray(chains) ? chains.find((c:any)=> c?.id === evmChainId) : undefined
      const sym = ch?.nativeCurrency?.symbol
      return typeof sym === 'string' && sym ? sym : 'ETH'
    } catch {
      return 'ETH'
    }
  }, [evmChainId, chains])
  const marketAddress = React.useMemo(() => {
    try {
      if (typeof evmChainId !== 'number') return undefined
      // Use explicit env references so Next.js inlines them at build time
      const map: Record<number, `0x${string}` | undefined> = {
        43113: (process.env.NEXT_PUBLIC_EVM_MARKET_43113 as any),
        43114: (process.env.NEXT_PUBLIC_EVM_MARKET_43114 as any),
        84532: (process.env.NEXT_PUBLIC_EVM_MARKET_84532 as any),
        8453: (process.env.NEXT_PUBLIC_EVM_MARKET_8453 as any),
      }
      return map[evmChainId]
    } catch { return undefined }
  }, [evmChainId])

  const handleOpenBuy = React.useCallback(() => {
    // set default months from default_duration_days rounded to months (1..12)
    const days = (data as any)?.default_duration_days
    const m = Math.max(1, Math.min(12, Math.round((typeof days === 'number' ? (days/30) : 1))))
    setBuyMonths(m)
    setBuyKind(undefined)
    setBuyStep('select')
    setBuyOpen(true)
  }, [data])

  const handlePurchase = React.useCallback(async ()=>{
    try {
      if (!id || typeof evmChainId !== 'number' || !buyKind) return
      if (!marketAddress) { setSnkSev('error'); setSnkMsg(L.marketAddressMissing); setSnkOpen(true); return }
      // require wallet connection
      if (!isConnected) { setSnkSev('warning'); setSnkMsg(L.connectWallet); setSnkOpen(true); return }
      // validate network and auto-switch
      const currentChainId = chain?.id
      const desiredChainId = evmChainId
      if (currentChainId !== desiredChainId) {
        try {
          await switchChainAsync({ chainId: desiredChainId })
        } catch {
          setSnkSev('warning'); setSnkMsg(L.wrongNetwork); setSnkOpen(true)
          return
        }
      }
      const abi = (MARKET_ARTIFACT as any).abi
      const licenseKind = buyKind === 'perpetual' ? 0 : 1
      const months = buyKind === 'subscription' ? buyMonths : 0
      const transferable = Boolean((data as any)?.rights?.transferable)
      const priceP = (data as any)?.price_perpetual
      const priceS = (data as any)?.price_subscription
      const valueWei = buyKind === 'perpetual'
        ? (typeof priceP === 'number' ? BigInt(Math.max(0, Math.floor(priceP))) : 0n)
        : (typeof priceS === 'number' ? BigInt(Math.max(0, Math.floor(priceS * months))) : 0n)
      // Usar metadata del modelo para el NFT de licencia
      const tokenUri = (data as any)?.uri || ''
      setTxLoading(true)
      const hash = await writeContractAsync({
        address: marketAddress as `0x${string}`,
        abi: abi as any,
        functionName: 'buyLicenseWithURI',
        args: [BigInt(id), Number(licenseKind), Number(months), Boolean(transferable), tokenUri],
        chainId: evmChainId,
        value: valueWei,
      })
      if (publicClient && hash) {
        await publicClient.waitForTransactionReceipt({ hash })
      }
      setSnkSev('success'); setSnkMsg(L.purchaseSuccess); setSnkOpen(true)
      setBuyOpen(false)
      setBuyStep('select')
      setBuyKind(undefined)
      if (typeof mutateEntitlements === 'function') {
        mutateEntitlements(undefined, { revalidate: true }).catch(() => {})
      }
    } catch (e: any) {
      const msg = String(e?.shortMessage || e?.message || e || '')
      setSnkSev('error'); setSnkMsg(L.purchaseErrorPrefix + msg)
      setSnkOpen(true)
    }
    finally { setTxLoading(false) }
  }, [id, marketAddress, evmChainId, buyKind, buyMonths, data, writeContractAsync, chain, switchChainAsync, isConnected, publicClient, L, mutateEntitlements])
  const chainName = React.useMemo(()=>{
    try {
      if (typeof evmChainId !== 'number') return 'EVM'
      const ch = Array.isArray(chains) ? chains.find((c:any)=> c?.id === evmChainId) : undefined
      return typeof ch?.name === 'string' && ch.name ? ch.name : 'EVM'
    } catch {
      return 'EVM'
    }
  }, [evmChainId, chains])

  const chainIconSrc = React.useMemo(() => {
    const id = evmChainId
    if (id === 43113 || id === 43114) return '/icons/avalanche.svg'
    if (id === 84532 || id === 8453) return '/icons/base.svg'
    return undefined
  }, [evmChainId])

  const truncateAddr = React.useCallback((s: any) => {
    const v = typeof s === 'string' ? s : ''
    if (!v) return ''
    return v.length > 12 ? `${v.slice(0,6)}…${v.slice(-4)}` : v
  }, [])

  const ChainIcon: React.FC = React.useCallback(() => {
    const id = evmChainId
    const color = (id === 43113 || id === 43114) ? '#E84142' /* Avalanche */
      : (id === 84532 || id === 8453) ? '#0052FF' /* Base */
      : '#627EEA' /* Ethereum default */
    return (
      <SvgIcon fontSize="small" sx={{ color }} viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="9" fill="currentColor" />
      </SvgIcon>
    )
  }, [evmChainId])

  const backHref = React.useMemo(()=> `/${locale}/models`, [locale])
  
  const isES = locale === 'es'
  
  const handleTryDemo = React.useCallback(() => {
    demoAnchorRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])
  
  // Create ViewModel directly like Step 5
  const viewModel = React.useMemo(() => {
    if (!data) return null
    
    try {
      const enrichedData = {
        ...data,
        name: data.name || `Model #${id}`,
        chain: chainName,
        chainSymbol: evmSymbol,
        summary: data.description || data.summary,
        tagline: data.tagline,
        authorName: data.authorName || (data.owner ? truncateAddr(data.owner) : undefined),
        authorLinks: data.authorLinks,
        cover: data.imageUrl ? { url: data.imageUrl } : undefined,
        businessCategory: data.businessCategory,
        modelTypeBusiness: data.modelType,
        categories: data.categories,
        technicalCategories: data.categories,
        tags: data.tags,
        technicalTags: data.tags,
        industries: data.industries,
        useCases: data.useCases,
        supportedLanguages: data.supportedLanguages,
        valueProp: data.valueProposition,
        customerDescription: data.customerDescription,
        expectedImpact: data.expectedImpact,
        inputs: data.inputs,
        outputs: data.outputs,
        examples: data.examples,
        risks: data.limitations,
        prohibited: data.prohibited,
        privacy: data.privacy,
        deploy: data.deploy,
        support: Array.isArray(data.support) ? data.support : (data.support ? [data.support] : undefined),
        tasks: data.tasks,
        modalities: data.modalities,
        frameworks: data.frameworks,
        architectures: data.architectures,
        precisions: data.precision,
        quantization: data.quantization,
        modelFiles: data.fileFormats,
        modelSize: data.modelSize,
        artifactSize: data.artifactSize,
        python: data.python,
        cuda: data.cuda,
        pytorch: data.pytorch,
        cudnn: data.cudnn,
        os: data.systems,
        accelerators: data.accelerators,
        computeCapability: data.computeCapability,
        dependencies: data.dependencies,
        pip: typeof data.dependencies === 'string' ? data.dependencies.split('\n').filter(Boolean) : undefined,
        vramGB: data.minVram,
        cpuCores: data.minCpu,
        ramGB: data.recRam,
        maxBatchSize: data.maxBatch,
        contextLength: data.contextLength,
        maxTokens: data.maxTokens,
        imageResolution: data.imageResolution,
        sampleRate: data.sampleRate,
        triton: data.triton,
        referenceLatency: data.gpuNotes,
        artifacts: data.artifactsList || [],
        price_perpetual: data.price_perpetual,
        price_subscription: data.price_subscription,
        rights: data.rights,
        deliveryMode: data.deliveryMode,
        termsMarkdown: data.termsText
      }
      
      console.log('🔍 DEBUG - enrichedData technical fields:', {
        frameworks: enrichedData.frameworks,
        architectures: enrichedData.architectures,
        precisions: enrichedData.precisions,
        python: enrichedData.python,
        cuda: enrichedData.cuda,
        pytorch: enrichedData.pytorch,
        os: enrichedData.os,
        vramGB: enrichedData.vramGB,
        cpuCores: enrichedData.cpuCores,
        ramGB: enrichedData.ramGB,
        maxBatchSize: enrichedData.maxBatchSize,
        contextLength: enrichedData.contextLength,
        maxTokens: enrichedData.maxTokens
      })
      
      const vm = createViewModelFromPublished(enrichedData, undefined, id)
      console.log('🔍 DEBUG - viewModel.step2.technical:', vm?.step2?.technical)
      return vm
    } catch (err) {
      console.error('Error creating ViewModel:', err)
      return null
    }
  }, [data, id, chainName, evmSymbol, truncateAddr])
  
  return (
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
        '& .MuiInputBase-root': { color:'#fff' }
      }}>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
          <Button component={Link} href={backHref} startIcon={<ArrowBackIcon />}>
            {L.back}
          </Button>
        </Stack>
        {loading && (
          <Grid container spacing={3}>
            <Grid item xs={12} md={5}>
              <Skeleton variant="rounded" width="100%" height={300} />
            </Grid>
            <Grid item xs={12} md={7}>
              <Skeleton variant="text" height={44} />
              <Skeleton variant="text" height={28} width={240} />
              <Divider sx={{ my: 2 }} />
              <Skeleton variant="text" height={20} />
              <Skeleton variant="text" height={20} />
            </Grid>
          </Grid>
        )}
        {!loading && !data && !attempted && (
          <Typography color="text.secondary">{L.loadingModelBody || 'Loading model...'}</Typography>
        )}
        {!loading && !data && attempted && (
          <Typography color="error">{L.notFound}</Typography>
        )}
        {!loading && data && viewModel && (
          <>
            {/* Listing overview - como Step 5 */}
            <Paper variant="outlined" sx={{ p:{ xs:2, md:3 }, mb:2, borderRadius:2, bgcolor:'rgba(255,255,255,0.02)' }}>
              <Grid container spacing={3}>
                {/* Left column: Listing information */}
                <Grid item xs={12} md={8}>
                  <Stack spacing={2.5}>
                    {/* Name and Tagline */}
                    <Box>
                      <Typography variant="h4" sx={{ fontWeight:800, color:'#fff', mb:1, fontSize:{ xs:'1.75rem', md:'2rem' } }}>
                        {viewModel.step1.name}
                      </Typography>
                      {viewModel.step1.tagline && (
                        <Typography variant="h6" sx={{ color:'#ffffffcc', fontWeight:400, mb:1.5, fontSize:'1.1rem' }}>
                          {viewModel.step1.tagline}
                        </Typography>
                      )}
                      {/* Summary with line clamp */}
                      {viewModel.step1.summary && (
                        <Typography 
                          variant="body1" 
                          sx={{ 
                            color:'#ffffffb3',
                            fontSize:'0.95rem',
                            lineHeight:1.6,
                            display: '-webkit-box',
                            WebkitLineClamp: 3,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }}
                        >
                          {viewModel.step1.summary}
                        </Typography>
                      )}
                    </Box>

                    {/* Quick stats / metadata badges inline */}
                    {((Array.isArray(viewModel.step1.industries) && viewModel.step1.industries.length > 0) || (Array.isArray(viewModel.step1.useCases) && viewModel.step1.useCases.length > 0) || (Array.isArray(viewModel.step1.supportedLanguages) && viewModel.step1.supportedLanguages.length > 0)) && (
                      <Stack direction="row" spacing={1} sx={{ flexWrap:'wrap', gap:1 }}>
                        {(viewModel.step1.industries || []).slice(0,3).map((industry, i) => (
                          <Chip 
                            key={i}
                            size="small" 
                            label={industry}
                            sx={{ 
                              bgcolor:'rgba(124,92,255,0.15)', 
                              color:'#b8a3ff', 
                              border:'1px solid rgba(124,92,255,0.3)',
                              fontWeight:600,
                              fontSize:'0.75rem'
                            }}
                          />
                        ))}
                        {(viewModel.step1.useCases || []).slice(0,2).map((useCase, i) => (
                          <Chip 
                            key={i}
                            size="small" 
                            label={useCase}
                            sx={{ 
                              bgcolor:'rgba(46,160,255,0.15)', 
                              color:'#4fe1ff', 
                              border:'1px solid rgba(46,160,255,0.3)',
                              fontWeight:600,
                              fontSize:'0.75rem'
                            }}
                          />
                        ))}
                        {(viewModel.step1.supportedLanguages || []).slice(0,2).map((lang, i) => (
                          <Chip 
                            key={i}
                            size="small" 
                            label={lang}
                            icon={<LanguageIcon sx={{ fontSize:'1rem !important' }} />}
                            sx={{ 
                              bgcolor:'rgba(255,255,255,0.08)', 
                              color:'#ffffffcc', 
                              border:'1px solid rgba(255,255,255,0.2)',
                              fontSize:'0.75rem'
                            }}
                          />
                        ))}
                      </Stack>
                    )}

                    {/* Business category & Model type (always visible with fallbacks) */}
                    <Box>
                      <Typography 
                        variant="caption" 
                        sx={{ 
                          display:'block', 
                          mb:1.5, 
                          fontWeight:700, 
                          textTransform:'uppercase', 
                          fontSize:'0.7rem',
                          letterSpacing:'0.08em',
                          color:'#ffffffb3'
                        }}
                      >
                        {isES ? 'Perfil de negocio' : 'Business profile'}
                      </Typography>
                      <Grid container spacing={1.5}>
                        <Grid item xs={12} sm={6}>
                          <Box sx={{ 
                            p:1.5, 
                            borderRadius:1.5, 
                            bgcolor:'rgba(124,92,255,0.08)', 
                            border:'1px solid rgba(124,92,255,0.2)',
                            transition:'all 0.2s',
                            '&:hover': {
                              bgcolor:'rgba(124,92,255,0.12)',
                              borderColor:'rgba(124,92,255,0.3)'
                            }
                          }}>
                            <Typography variant="caption" sx={{ fontSize:'0.7rem', display:'block', mb:0.5, color:'#b8a3ff', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.05em' }}>
                              {isES ? 'Categoría de negocio' : 'Business category'}
                            </Typography>
                            <Typography variant="body2" sx={{ color:'#fff', fontWeight:700, fontSize:'0.95rem' }}>
                              {viewModel.step1.businessCategory || (isES ? 'Sin especificar' : 'Unspecified')}
                            </Typography>
                          </Box>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <Box sx={{ 
                            p:1.5, 
                            borderRadius:1.5, 
                            bgcolor:'rgba(46,160,255,0.08)', 
                            border:'1px solid rgba(46,160,255,0.2)',
                            transition:'all 0.2s',
                            '&:hover': {
                              bgcolor:'rgba(46,160,255,0.12)',
                              borderColor:'rgba(46,160,255,0.3)'
                            }
                          }}>
                            <Typography variant="caption" sx={{ fontSize:'0.7rem', display:'block', mb:0.5, color:'#4fe1ff', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.05em' }}>
                              {isES ? 'Tipo de modelo' : 'Model type'}
                            </Typography>
                            <Typography variant="body2" sx={{ color:'#fff', fontWeight:700, fontSize:'0.95rem' }}>
                              {viewModel.step1.modelTypeBusiness || (isES ? 'Sin especificar' : 'Unspecified')}
                            </Typography>
                          </Box>
                        </Grid>
                      </Grid>
                    </Box>

                    {/* Technical classification */}
                    {Array.isArray(viewModel.step1.technicalTags) && viewModel.step1.technicalTags.length > 0 && (
                      <Box>
                        <Typography 
                          variant="caption" 
                          sx={{ 
                            display:'block', 
                            mb:1.5, 
                            fontWeight:700, 
                            textTransform:'uppercase', 
                            fontSize:'0.7rem',
                            letterSpacing:'0.08em',
                            color:'#ffffffb3'
                          }}
                        >
                          {isES ? 'Clasificación técnica' : 'Technical classification'}
                        </Typography>
                        <Stack direction="row" spacing={1} sx={{ flexWrap:'wrap', gap:1 }}>
                          {(viewModel.step1.technicalTags || [])
                            .slice() // copy to avoid mutating original
                            .sort((a: any, b: any) => {
                              const sa = typeof a === 'string' ? a.toLowerCase() : ''
                              const sb = typeof b === 'string' ? b.toLowerCase() : ''
                              const pa = sa === 'tabular' ? -1 : 0
                              const pb = sb === 'tabular' ? -1 : 0
                              return pa - pb
                            })
                            .slice(0,6)
                            .map((tag, i) => (
                             <Chip 
                               key={i}
                               size="small" 
                               label={(typeof tag === 'string' && tag.toLowerCase() === 'tabular') ? 'Tabular / structured data' : tag}
                               sx={{ 
                                 bgcolor:'rgba(255,255,255,0.06)', 
                                 color:'#ffffffcc', 
                                 border:'1px solid rgba(255,255,255,0.15)',
                                 fontWeight:600,
                                 fontSize:'0.75rem',
                                 transition:'all 0.2s',
                                 '&:hover': {
                                   bgcolor:'rgba(255,255,255,0.1)',
                                   borderColor:'rgba(255,255,255,0.25)'
                                 }
                               }}
                             />
                          ))}
                        </Stack>
                      </Box>
                    )}

                    {/* Prices - Enhanced visual cards */}
                    {(viewModel.step4.pricing.perpetual || viewModel.step4.pricing.subscription) && (
                      <Box>
                        <Typography variant="caption" color="text.secondary" sx={{ display:'block', mb:1.5, fontWeight:600, textTransform:'uppercase', fontSize:'0.7rem', letterSpacing:'0.5px' }}>
                          {isES ? 'Precios y licencias' : 'Pricing & licenses'}
                        </Typography>
                        <Grid container spacing={2}>
                          {viewModel.step4.pricing.perpetual?.available && (
                            <Grid item xs={12} sm={viewModel.step4.pricing.subscription?.available ? 6 : 12}>
                              <Box sx={{ 
                                p:2, 
                                borderRadius:2, 
                                border:'2px solid #4fe1ff',
                                bgcolor:'rgba(79,225,255,0.08)',
                                transition:'all 0.2s',
                                '&:hover': { bgcolor:'rgba(79,225,255,0.12)', transform:'translateY(-2px)' }
                              }}>
                                <Typography variant="caption" sx={{ color:'#4fe1ff', fontWeight:700, fontSize:'0.7rem', textTransform:'uppercase', display:'block', mb:0.5 }}>
                                  {isES ? '🏆 Licencia perpetua' : '🏆 Perpetual license'}
                                </Typography>
                                <Typography variant="h5" sx={{ color:'#4fe1ff', fontWeight:800, mb:0.5 }}>
                                  {viewModel.step4.pricing.perpetual.priceFormatted} {evmSymbol}
                                </Typography>
                                <Typography variant="caption" sx={{ color:'#ffffffb3', fontSize:'0.75rem' }}>
                                  {isES ? 'Pago único • Acceso de por vida' : 'One-time payment • Lifetime access'}
                                </Typography>
                              </Box>
                            </Grid>
                          )}
                          {viewModel.step4.pricing.subscription?.available && (
                            <Grid item xs={12} sm={viewModel.step4.pricing.perpetual?.available ? 6 : 12}>
                              <Box sx={{ 
                                p:2, 
                                borderRadius:2, 
                                border:'1px solid rgba(255,255,255,0.2)',
                                bgcolor:'rgba(255,255,255,0.05)',
                                transition:'all 0.2s',
                                '&:hover': { bgcolor:'rgba(255,255,255,0.08)', borderColor:'rgba(255,255,255,0.3)' }
                              }}>
                                <Typography variant="caption" sx={{ color:'#ffffffcc', fontWeight:700, fontSize:'0.7rem', textTransform:'uppercase', display:'block', mb:0.5 }}>
                                  {isES ? '📅 Suscripción mensual' : '📅 Monthly subscription'}
                                </Typography>
                                <Typography variant="h5" sx={{ color:'#fff', fontWeight:700, mb:0.5 }}>
                                  {viewModel.step4.pricing.subscription.pricePerMonthFormatted} {evmSymbol}
                                  <Typography component="span" sx={{ fontSize:'0.9rem', color:'#ffffffb3', fontWeight:400 }}>
                                    {isES ? '/mes' : '/mo'}
                                  </Typography>
                                </Typography>
                                <Typography variant="caption" sx={{ color:'#ffffffb3', fontSize:'0.75rem' }}>
                                  {isES ? 'Pago recurrente • Cancela cuando quieras' : 'Recurring payment • Cancel anytime'}
                                </Typography>
                              </Box>
                            </Grid>
                          )}
                        </Grid>
                        
                        {/* Rights & Delivery */}
                        {(viewModel.step4.rights.canUseAPI || viewModel.step4.rights.canDownload || viewModel.step4.rights.isTransferable) && (
                          <Box sx={{ mt:1.5, p:1.5, borderRadius:1.5, bgcolor:'rgba(124,92,255,0.08)', border:'1px solid rgba(124,92,255,0.2)' }}>
                            <Typography variant="caption" sx={{ color:'#b8a3ff', fontWeight:600, fontSize:'0.7rem', textTransform:'uppercase', display:'block', mb:1 }}>
                              ✨ {isES ? 'Incluye' : 'Includes'}
                            </Typography>
                            <Stack direction="row" spacing={1} sx={{ flexWrap:'wrap', gap:0.5 }}>
                              {viewModel.step4.rights.canUseAPI && (
                                <Chip 
                                  label={isES ? 'Acceso API' : 'API Access'}
                                  size="small"
                                  sx={{ 
                                    bgcolor:'rgba(124,92,255,0.2)', 
                                    color:'#e0d4ff', 
                                    border:'1px solid rgba(124,92,255,0.4)',
                                    fontSize:'0.7rem',
                                    height:'24px'
                                  }}
                                />
                              )}
                              {viewModel.step4.rights.canDownload && (
                                <Chip 
                                  label={isES ? 'Descarga del modelo' : 'Model Download'}
                                  size="small"
                                  sx={{ 
                                    bgcolor:'rgba(124,92,255,0.2)', 
                                    color:'#e0d4ff', 
                                    border:'1px solid rgba(124,92,255,0.4)',
                                    fontSize:'0.7rem',
                                    height:'24px'
                                  }}
                                />
                              )}
                              {viewModel.step4.rights.isTransferable && (
                                <Chip 
                                  label={isES ? 'Transferible' : 'Transferable'}
                                  size="small"
                                  sx={{ 
                                    bgcolor:'rgba(124,92,255,0.2)', 
                                    color:'#e0d4ff', 
                                    border:'1px solid rgba(124,92,255,0.4)',
                                    fontSize:'0.7rem',
                                    height:'24px'
                                  }}
                                />
                              )}
                            </Stack>
                          </Box>
                        )}
                      </Box>
                    )}

                    {/* Action buttons - Enhanced */}
                    {hasActiveLicense && (
                      <Alert severity="success" sx={{ mb:2, borderRadius:2 }}>
                        {locale === 'es' ? 'Ya cuentas con una licencia activa.' : 'You already hold an active license.'}
                        {entitlements?.kind === 'subscription' && entitlementsExpiryDate && (
                          <>
                            {' '}
                            {locale === 'es'
                              ? `Vence el ${entitlementsExpiryDate.toLocaleDateString(locale)}`
                              : `Expires on ${entitlementsExpiryDate.toLocaleDateString(locale)}`}
                          </>
                        )}
                      </Alert>
                    )}
                    <Stack direction={{ xs:'column', sm:'row' }} spacing={2} sx={{ pt: hasActiveLicense ? 0 : 2 }}>
                      <Button 
                        variant="contained" 
                        size="large"
                        onClick={handleOpenBuy}
                        sx={{ 
                          backgroundImage: 'linear-gradient(90deg, #7c5cff, #2ea0ff)', 
                          color: '#fff', 
                          textTransform: 'none', 
                          fontWeight: 700,
                          fontSize:'1rem',
                          py:1.5,
                          px:4,
                          boxShadow: '0 6px 20px rgba(46,160,255,0.35)',
                          '&:hover': { 
                            filter: 'brightness(1.15)',
                            boxShadow: '0 8px 24px rgba(46,160,255,0.45)',
                            transform: 'translateY(-1px)'
                          },
                          transition: 'all 0.2s'
                        }}
                      >
                        💰 {L.buy || (isES ? 'Comprar licencia' : 'Buy license')}
                      </Button>
                      <Button 
                        variant="outlined" 
                        size="large" 
                        onClick={handleTryDemo} 
                        sx={{ 
                          textTransform: 'none',
                          fontWeight:600,
                          fontSize:'0.95rem',
                          py:1.5,
                          px:3,
                          borderWidth:'2px',
                          borderColor:'rgba(255,255,255,0.3)',
                          color:'#fff',
                          '&:hover': {
                            borderWidth:'2px',
                            borderColor:'#4fe1ff',
                            bgcolor:'rgba(79,225,255,0.1)',
                            transform: 'translateY(-1px)'
                          },
                          transition: 'all 0.2s'
                        }}
                      >
                        🚀 {L.tryDemo || (isES ? 'Probar demo' : 'Try demo')}
                      </Button>
                    </Stack>

                    {/* Author section - Enhanced */}
                    <Box sx={{ pt:2, mt:2, borderTop:'2px solid rgba(255,255,255,0.1)' }}>
                      <Stack direction="row" spacing={2} alignItems="center">
                        <Box sx={{ 
                          width:48, 
                          height:48, 
                          borderRadius:'50%', 
                          bgcolor:'rgba(124,92,255,0.2)', 
                          border:'2px solid rgba(124,92,255,0.4)',
                          display:'flex',
                          alignItems:'center',
                          justifyContent:'center'
                        }}>
                          <PersonIcon sx={{ color:'#b8a3ff', fontSize:'1.75rem' }} />
                        </Box>
                        <Box sx={{ flex:1 }}>
                          <Typography variant="caption" sx={{ color:'#ffffffb3', fontSize:'0.7rem', textTransform:'uppercase', display:'block', mb:0.25 }}>
                            {isES ? 'Publicado por' : 'Published by'}
                          </Typography>
                          <Stack direction="row" spacing={1} alignItems="center">
                            <Typography variant="body1" sx={{ color:'#fff', fontWeight:700, fontSize:'1rem' }}>
                              {viewModel.step1.authorName || '-'}
                            </Typography>
                            {viewModel.step1.authorLinks && Object.values(viewModel.step1.authorLinks as Record<string, any>).some(Boolean) && (
                              <Stack direction="row" spacing={0.5}>
                                {Object.entries(viewModel.step1.authorLinks as Record<string, any>).filter(([,v])=>!!v).map(([k,v]: any, i: number)=> {
                                  const label = k==='github'? 'GitHub' : k==='website'? 'Website' : k==='twitter'? 'X' : k==='linkedin'? 'LinkedIn' : k
                                  const icon = k==='github'? <GitHubIcon fontSize="small" /> : k==='website'? <LanguageIcon fontSize="small" /> : k==='twitter'? <XIcon fontSize="small" /> : k==='linkedin'? <LinkedInIcon fontSize="small" /> : undefined
                                  return (
                                    <Tooltip key={`${k}-${i}`} title={`${label}: ${v}`}>
                                      <IconButton 
                                        size="small" 
                                        aria-label={label} 
                                        onClick={()=>{ try { if (v) window.open(String(v), '_blank', 'noopener,noreferrer') } catch {} }}
                                        sx={{ 
                                          bgcolor:'rgba(255,255,255,0.05)',
                                          color:'#fff',
                                          '&:hover': { bgcolor:'rgba(124,92,255,0.2)', color:'#b8a3ff' },
                                          transition:'all 0.2s'
                                        }}
                                      >
                                        {icon}
                                      </IconButton>
                                    </Tooltip>
                                  )
                                })}
                              </Stack>
                            )}
                          </Stack>
                        </Box>
                      </Stack>
                    </Box>
                  </Stack>
                </Grid>

                {/* Right column: Cover */}
                <Grid item xs={12} md={4}>
                  <Stack spacing={2}>
                    {/* Cover / Hero Image */}
                    {viewModel.step1.cover?.cid || data.imageUrl ? (
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
                        {(() => {
                          const imgSrc = data.imageUrl || (viewModel.step1.cover?.cid ? `https://ipfs.io/ipfs/${viewModel.step1.cover?.cid}` : undefined)
                          return imgSrc ? (
                            <img
                              src={imgSrc}
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
                          ) : null
                        })()}
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
                          {isES ? 'Sin imagen' : 'No image'}
                        </Typography>
                      </Box>
                    )}

                    {/* Metadata badges - removed Category & Model type to avoid duplication */}
                  </Stack>
                </Grid>
              </Grid>
            </Paper>

            {/* Customer Sheet - como Step 5 */}
            <Paper variant="outlined" sx={{ p:{ xs:2, md:3 }, mb:2, borderRadius:2, bgcolor:'rgba(255,255,255,0.02)' }}>
              <Typography variant="subtitle2" sx={{ color:'#fff', fontWeight:700, mb:2 }}>
                {isES ? 'Ficha del cliente' : 'Customer sheet'}
              </Typography>
              <Grid container spacing={3}>
                <Grid item xs={12} md={7}>
                  <Stack spacing={2}>
                    {(viewModel.step2.customer.valueProp || viewModel.step2.customer.customerDescription || viewModel.step2.customer.expectedImpact) && (
                      <Box>
                        <Typography variant="caption" sx={{ display:'block', mb:1, fontWeight:700, textTransform:'uppercase', fontSize:'0.7rem', color:'#ffffffb3' }}>
                          {isES ? 'Perfil de negocio' : 'Business profile'}
                        </Typography>
                        <Stack spacing={1.25}>
                          {viewModel.step2.customer.valueProp && (
                            <Box sx={{ p:1.25, borderRadius:1.5, bgcolor:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)' }}>
                              <Typography variant="caption" sx={{ color:'text.secondary', display:'block', mb:0.25 }}>
                                {isES ? 'Qué hace este modelo' : 'What this model does'}
                              </Typography>
                              <Typography variant="body2" sx={{ color:'#fff', fontWeight:700 }}>
                                {viewModel.step2.customer.valueProp}
                              </Typography>
                            </Box>
                          )}
                          {viewModel.step2.customer.customerDescription && (
                            <Box>
                              <Typography variant="caption" sx={{ color:'text.secondary', display:'block', mb:0.25 }}>
                                {isES ? 'Descripción' : 'Description'}
                              </Typography>
                              <Typography variant="body2" sx={{ color:'#ffffffcc', lineHeight:1.6 }}>
                                {viewModel.step2.customer.customerDescription}
                              </Typography>
                            </Box>
                          )}
                          {viewModel.step2.customer.expectedImpact && (
                            <Box>
                              <Typography variant="caption" sx={{ color:'text.secondary', display:'block', mb:0.25 }}>
                                {isES ? 'Impacto esperado' : 'Expected impact'}
                              </Typography>
                              <Typography variant="body2" sx={{ color:'#4fe1ff', fontWeight:700 }}>
                                {viewModel.step2.customer.expectedImpact}
                              </Typography>
                            </Box>
                          )}
                        </Stack>
                      </Box>
                    )}
                    {(viewModel.step2.customer.inputs || viewModel.step2.customer.outputs) && (
                      <Box>
                        <Typography variant="caption" sx={{ display:'block', mb:1, fontWeight:600, textTransform:'uppercase', fontSize:'0.7rem', color:'#ffffffb3' }}>
                          {isES ? 'Cómo se usa' : 'How this is used'}
                        </Typography>
                        <List dense sx={{ p:0 }}>
                          {viewModel.step2.customer.inputs && (
                            <Row label={isES ? 'Entradas' : 'Inputs'} value={viewModel.step2.customer.inputs} />
                          )}
                          {viewModel.step2.customer.outputs && (
                            <Row label={isES ? 'Salidas' : 'Outputs'} value={viewModel.step2.customer.outputs} />
                          )}
                        </List>
                      </Box>
                    )}
                    {viewModel.step2.customer.risks && (
                      <Box>
                        <Typography variant="caption" sx={{ display:'block', mb:0.5, fontWeight:600, color:'warning.main' }}>
                          ⚠️ {isES ? 'Limitaciones conocidas' : 'Known limitations'}
                        </Typography>
                        <Typography variant="body2" sx={{ color:'#ffffffcc' }}>
                          {viewModel.step2.customer.risks}
                        </Typography>
                      </Box>
                    )}
                    {viewModel.step2.customer.prohibited && (
                      <Box>
                        <Typography variant="caption" sx={{ display:'block', mb:0.5, fontWeight:600, color:'error.main' }}>
                          🚫 {isES ? 'Usos prohibidos' : 'Prohibited uses'}
                        </Typography>
                        <Typography variant="body2" sx={{ color:'#ffffffcc' }}>
                          {viewModel.step2.customer.prohibited}
                        </Typography>
                      </Box>
                    )}
                  </Stack>
                </Grid>
                <Grid item xs={12} md={5}>
                  <Stack spacing={2}>
                    {((viewModel.step1.industries && viewModel.step1.industries.length > 0) || (viewModel.step1.useCases && viewModel.step1.useCases.length > 0)) && (
                      <Box>
                        <Typography variant="caption" sx={{ display:'block', mb:1, fontWeight:600, textTransform:'uppercase', fontSize:'0.7rem', color:'#ffffffb3' }}>
                          {isES ? 'Encaje de negocio' : 'Business fit'}
                        </Typography>
                        <Stack spacing={1.5}>
                          {viewModel.step1.industries && viewModel.step1.industries.length > 0 && (
                            <Box>
                              <Typography variant="caption" sx={{ display:'block', mb:0.5, fontSize:'0.75rem', color:'#ffffffb3' }}>
                                {isES ? 'Industrias' : 'Industries'}
                              </Typography>
                              <ChipsShort items={viewModel.step1.industries} max={6} />
                            </Box>
                          )}
                          {viewModel.step1.useCases && viewModel.step1.useCases.length > 0 && (
                            <Box>
                              <Typography variant="caption" sx={{ display:'block', mb:0.5, fontSize:'0.75rem', color:'#ffffffb3' }}>
                                {isES ? 'Casos de uso' : 'Use cases'}
                              </Typography>
                              <ChipsShort items={viewModel.step1.useCases} max={6} />
                            </Box>
                          )}
                        </Stack>
                      </Box>
                    )}
                    {viewModel.step1.supportedLanguages && viewModel.step1.supportedLanguages.length > 0 && (
                      <Box>
                        <Typography variant="caption" sx={{ display:'block', mb:0.5, fontSize:'0.75rem', color:'#ffffffb3' }}>
                          {isES ? 'Idiomas soportados' : 'Supported languages'}
                        </Typography>
                        <Typography variant="body2" sx={{ color:'#ffffffcc', fontSize:'0.85rem' }}>
                          {viewModel.step1.supportedLanguages.join(', ')}
                        </Typography>
                      </Box>
                    )}
                  </Stack>
                </Grid>
              </Grid>
            </Paper>

            {/* Technical Configuration - como Step 5 */}
            <Paper variant="outlined" sx={{ p:{ xs:2, md:3 }, mb:2, borderRadius:2, bgcolor:'rgba(255,255,255,0.02)' }}>
              <Typography variant="subtitle2" sx={{ color:'#fff', fontWeight:700, mb:2 }}>
                {isES ? 'Configuración técnica' : 'Technical configuration'}
              </Typography>
              
              <Grid container spacing={3}>
                {/* Left Column */}
                <Grid item xs={12} md={6}>
                  {/* Capabilities */}
                  {((viewModel.step2.technical?.tasks?.length ?? 0) > 0 || (viewModel.step2.technical?.modalities?.length ?? 0) > 0) && (
                    <Box sx={{ mb:2 }}>
                      <Typography variant="caption" sx={{ display:'block', mb:1, fontWeight:600, textTransform:'uppercase', fontSize:'0.7rem', color:'#ffffffb3' }}>
                        {isES ? 'Capacidades' : 'Capabilities'}
                      </Typography>
                      <List dense>
                        {(viewModel.step2.technical?.tasks?.length ?? 0) > 0 && (
                          <Row label={isES ? 'Tareas' : 'Tasks'} value={<ChipsShort items={viewModel.step2.technical?.tasks || []} />} />
                        )}
                        {(viewModel.step2.technical?.modalities?.length ?? 0) > 0 && (
                          <Row label={isES ? 'Modalidades' : 'Modalities'} value={<ChipsShort items={viewModel.step2.technical?.modalities || []} />} />
                        )}
                      </List>
                    </Box>
                  )}
                  
                  {/* Architecture */}
                  <Box sx={{ mb:2 }}>
                    <Typography variant="caption" sx={{ display:'block', mb:1, fontWeight:600, textTransform:'uppercase', fontSize:'0.7rem', color:'#ffffffb3' }}>
                      {isES ? 'Arquitectura' : 'Architecture'}
                    </Typography>
                    <List dense>
                      {viewModel.step2.technical?.frameworks && viewModel.step2.technical.frameworks.length > 0 && (
                        <Row label={isES ? 'Frameworks' : 'Frameworks'} value={<ChipsShort items={viewModel.step2.technical?.frameworks || []} />} />
                      )}
                      {viewModel.step2.technical?.architectures && viewModel.step2.technical.architectures.length > 0 && (
                        <Row label={isES ? 'Arquitecturas' : 'Architectures'} value={<ChipsShort items={viewModel.step2.technical?.architectures || []} />} />
                      )}
                      {viewModel.step2.technical?.precisions && viewModel.step2.technical.precisions.length > 0 && (
                        <Row label={isES ? 'Precisiones' : 'Precisions'} value={<ChipsShort items={viewModel.step2.technical?.precisions || []} />} />
                      )}
                      <Row label={isES ? 'Tamaño del modelo (parámetros)' : 'Model size (params)'} value={displayValue(viewModel.step2.technical?.modelSize)} />
                      <Row label={isES ? 'Tamaño de artefacto (GB)' : 'Artifact size (GB)'} value={displayValue(viewModel.step2.technical?.artifactSize)} />
                    </List>
                  </Box>
                  
                  {/* Runtime */}
                  <Box>
                    <Typography variant="caption" sx={{ display:'block', mb:1, fontWeight:600, textTransform:'uppercase', fontSize:'0.7rem', color:'#ffffffb3' }}>
                      {isES ? 'Runtime' : 'Runtime'}
                    </Typography>
                    <List dense>
                      <Row label="Python" value={displayValue(viewModel.step2.technical?.python)} />
                      {viewModel.step2.technical?.os && viewModel.step2.technical.os.length > 0 && (
                        <Row label={isES ? 'Sistemas operativos' : 'Operating systems'} value={<ChipsShort items={viewModel.step2.technical?.os || []} />} />
                      )}
                      <Row label="CUDA" value={displayValue(viewModel.step2.technical?.cuda)} />
                      <Row label="PyTorch" value={displayValue(viewModel.step2.technical?.pytorch)} />
                    </List>
                  </Box>
                </Grid>
                
                {/* Right Column */}
                <Grid item xs={12} md={6}>
                  {/* Resources */}
                  <Box sx={{ mb:2 }}>
                    <Typography variant="caption" sx={{ display:'block', mb:1, fontWeight:600, textTransform:'uppercase', fontSize:'0.7rem', color:'#ffffffb3' }}>
                      {isES ? 'Recursos' : 'Resources'}
                    </Typography>
                    <List dense>
                      <Row label={isES ? 'VRAM (GB)' : 'VRAM (GB)'} value={displayValue(viewModel.step2.technical?.vramGB, true)} />
                      <Row label={isES ? 'Núcleos CPU' : 'CPU cores'} value={displayValue(viewModel.step2.technical?.cpuCores, true)} />
                      <Row label={isES ? 'RAM (GB)' : 'RAM (GB)'} value={displayValue(viewModel.step2.technical?.ramGB, true)} />
                    </List>
                  </Box>
                  
                  {/* Inference */}
                  <Box>
                    <Typography variant="caption" sx={{ display:'block', mb:1, fontWeight:600, textTransform:'uppercase', fontSize:'0.7rem', color:'#ffffffb3' }}>
                      {isES ? 'Inferencia' : 'Inference'}
                    </Typography>
                    <List dense>
                      <Row label={isES ? 'Tamaño de batch máx.' : 'Max batch size'} value={displayValue(viewModel.step2.technical?.maxBatchSize, true)} />
                      <Row label={isES ? 'Longitud de contexto' : 'Context length'} value={displayValue(viewModel.step2.technical?.contextLength, true)} />
                      <Row label={isES ? 'Tokens máx.' : 'Max tokens'} value={displayValue(viewModel.step2.technical?.maxTokens, true)} />
                    </List>
                  </Box>
                </Grid>
              </Grid>
            </Paper>

            {/* Licenses - como Step 5 */}
            <Paper variant="outlined" sx={{ p:{ xs:2, md:3 }, mb:2, borderRadius:2, bgcolor:'rgba(255,255,255,0.02)' }}>
              <Typography variant="subtitle2" sx={{ color:'#fff', fontWeight:700, mb:2 }}>
                {isES ? 'Licencias y términos' : 'Licenses and terms'}
              </Typography>
              <Stack spacing={2}>
                <Box>
                  <Typography variant="caption" sx={{ display:'block', mb:1, fontWeight:600, textTransform:'uppercase', fontSize:'0.7rem', color:'#ffffffb3' }}>
                    {isES ? 'Precios' : 'Prices'}
                  </Typography>
                  <List dense>
                    {viewModel.step4.pricing.perpetual?.available && (
                      <Row 
                        label={isES ? 'Licencia perpetua' : 'Perpetual license'} 
                        value={`${viewModel.step4.pricing.perpetual.priceFormatted} ${evmSymbol}`}
                      />
                    )}
                    {viewModel.step4.pricing.subscription?.available && (
                      <Row 
                        label={isES ? 'Suscripción (por mes)' : 'Subscription (per month)'} 
                        value={`${viewModel.step4.pricing.subscription.pricePerMonthFormatted} ${evmSymbol}/mes`}
                      />
                    )}
                  </List>
                </Box>
                <Box>
                  <Typography variant="caption" sx={{ display:'block', mb:0.5, fontWeight:600, color:'#ffffffb3' }}>
                    {isES ? 'Derechos y entrega' : 'Rights & delivery'}
                  </Typography>
                  <Stack direction="row" spacing={1} sx={{ flexWrap:'wrap', gap:1 }}>
                    {viewModel.step4.rights.canUseAPI && (
                      <Chip label="API usage" size="small" variant="outlined" sx={{ borderColor:'rgba(255,255,255,0.3)', color:'#fff' }} />
                    )}
                    {viewModel.step4.rights.canDownload && (
                      <Chip label="Model download" size="small" variant="outlined" sx={{ borderColor:'rgba(255,255,255,0.3)', color:'#fff' }} />
                    )}
                    {viewModel.step4.rights.isTransferable && (
                      <Chip label="Transferable" size="small" variant="outlined" sx={{ borderColor:'rgba(255,255,255,0.3)', color:'#fff' }} />
                    )}
                  </Stack>
                </Box>
              </Stack>
            </Paper>
          </>
        )}
      </Box>

            {/* Modal: Comprar licencia */}
      <Dialog
        open={buyOpen}
        onClose={()=> { setBuyOpen(false); setBuyStep('select'); setBuyKind(undefined); }}
        fullWidth
        maxWidth="sm"
        PaperProps={{
          sx: {
            borderRadius: '16px',
            border: '2px solid',
            borderColor: 'oklch(0.30 0 0)',
            background: 'linear-gradient(180deg, rgba(38,46,64,0.90), rgba(20,26,42,0.90))',
            boxShadow: '0 0 0 1px rgba(255,255,255,0.05) inset, 0 14px 36px rgba(0,0,0,0.45)',
            backdropFilter: 'blur(10px)'
          }
        }}
      >
        <DialogTitle sx={{ color:'#fff', fontWeight:800 }}>{L.buyModalTitle}</DialogTitle>
        <DialogContent dividers sx={{ color:'#ffffffd6', borderColor:'rgba(255,255,255,0.08)' }}>
          {buyStep === 'select' && (
            <Stack spacing={2}>
              <Typography variant="body2" sx={{ color:'#ffffff99' }}>{L.buyModalHint}</Typography>
              <Box>
                <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1, color:'#fff' }}>{L.selectType}</Typography>
                <RadioGroup row value={buyKind || ''} onChange={(e)=> setBuyKind((e.target as HTMLInputElement).value as any)}>
                  <FormControlLabel
                    value="perpetual"
                    control={<Radio sx={{ color:'#ffffffb3', '&.Mui-checked': { color:'#fff' } }} />}
                    label={L.perpetual}
                    sx={{ color:'#fff' }}
                  />
                  <FormControlLabel
                    value="subscription"
                    control={<Radio sx={{ color:'#ffffffb3', '&.Mui-checked': { color:'#fff' } }} />}
                    label={L.subscriptionPerMonth}
                    sx={{ color:'#fff' }}
                  />
                </RadioGroup>
              </Box>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Card sx={{ borderRadius: 2, border:'1px solid', borderColor: buyKind==='perpetual' ? 'primary.main' : 'rgba(255,255,255,0.18)', background:'rgba(255,255,255,0.06)' }}>
                    <CardContent>
                      <Typography variant="subtitle2" fontWeight={700} sx={{ color:'#fff' }}>{L.perpetual}</Typography>
                      <Typography variant="h6" sx={{ color:'#4fe1ff' }}>{data && typeof data.price_perpetual === 'number' && data.price_perpetual > 0 ? `${(data.price_perpetual/1e18).toFixed(2)} ${evmSymbol}` : L.unspecified}</Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Card sx={{ borderRadius: 2, border:'1px solid', borderColor: buyKind==='subscription' ? 'primary.main' : 'rgba(255,255,255,0.18)', background:'rgba(255,255,255,0.06)' }}>
                    <CardContent>
                      <Typography variant="subtitle2" fontWeight={700} sx={{ color:'#fff' }}>{L.subscriptionPerMonth}</Typography>
                      <Typography variant="h6" sx={{ color:'#4fe1ff' }}>{data && typeof data.price_subscription === 'number' && data.price_subscription > 0 ? `${(data.price_subscription/1e18).toFixed(2)} ${evmSymbol}` : L.unspecified}</Typography>
                      {buyKind === 'subscription' && (
                        <Box sx={{ mt: 2 }}>
                          <TextField
                            label={L.months}
                            size="small"
                            select
                            fullWidth
                            value={buyMonths}
                            onChange={(e)=> setBuyMonths(Number(e.target.value) || 1)}
                            sx={{
                              '& .MuiInputBase-input': { color:'#fff' },
                              '& .MuiOutlinedInput-notchedOutline': { borderColor:'rgba(255,255,255,0.28)' },
                              '&:hover .MuiOutlinedInput-notchedOutline': { borderColor:'rgba(255,255,255,0.40)' },
                              '& .MuiInputLabel-root': { color:'#ffffffcc' }
                            }}
                          >
                            {Array.from({ length: 12 }, (_, i) => i + 1).map(m=> (<MenuItem key={m} value={m}>{m}</MenuItem>))}
                          </TextField>
                        </Box>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </Stack>
          )}
          {buyStep === 'review' && (
            <Stack spacing={2}>
              <Typography variant="subtitle2" fontWeight={700} sx={{ color:'#fff' }}>{L.review}</Typography>
              <Stack spacing={0.5}>
                <Typography variant="body2" sx={{ color:'#ffffffcc' }}><b>{L.selectType}:</b> {buyKind === 'perpetual' ? L.perpetual : L.subscriptionPerMonth}</Typography>
                {buyKind === 'subscription' && (
                  <Typography variant="body2" sx={{ color:'#ffffffcc' }}><b>{L.months}:</b> {buyMonths}</Typography>
                )}
                <Divider sx={{ my: 1 }} />
                <Typography variant="body2" sx={{ color:'#ffffffcc' }}>
                  {buyKind === 'perpetual' ? (
                    <>{typeof data?.price_perpetual === 'number' && data.price_perpetual > 0 ? `${(data.price_perpetual/1e18).toFixed(2)} ${evmSymbol}` : L.unspecified}</>
                  ) : (
                    <>
                      {typeof data?.price_subscription === 'number' && data.price_subscription > 0
                        ? `${(data.price_subscription/1e18).toFixed(2)} ${evmSymbol} × ${buyMonths} = ${(((data.price_subscription*buyMonths)/1e18)).toFixed(2)} ${evmSymbol}`
                        : L.unspecified}
                    </>
                  )}
                </Typography>
              </Stack>
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          {buyStep === 'review' ? (
            <>
              <Button onClick={()=> setBuyStep('select')} sx={{ textTransform:'none', color:'#fff' }}>{L.back}</Button>
              <Button variant="contained" onClick={handlePurchase} disabled={txLoading} startIcon={txLoading ? <CircularProgress size={16} /> : undefined} sx={{ backgroundImage: 'linear-gradient(90deg, #7c5cff, #2ea0ff)', color:'#fff', fontWeight:700, '&:hover': { filter:'brightness(1.05)', backgroundImage:'linear-gradient(90deg, #7c5cff, #2ea0ff)' } }}>{L.purchase}</Button>
            </>
          ) : (
            <>
              <Button onClick={()=> { setBuyOpen(false); setBuyStep('select'); setBuyKind(undefined); }} sx={{ textTransform:'none', color:'#fff' }}>{L.close}</Button>
              <Button
                variant="contained"
                disabled={!buyKind || (buyKind==='subscription' && (!data?.price_subscription || data.price_subscription <= 0 || buyMonths < 1 || buyMonths > 12)) || (buyKind==='perpetual' && (!data?.price_perpetual || data.price_perpetual <= 0))}
                onClick={()=> setBuyStep('review')}
                sx={{ backgroundImage: 'linear-gradient(90deg, #7c5cff, #2ea0ff)', color:'#fff', fontWeight:700, '&:hover': { filter:'brightness(1.05)', backgroundImage:'linear-gradient(90deg, #7c5cff, #2ea0ff)' } }}
              >
                {L.continue}
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>
      <Snackbar open={snkOpen} autoHideDuration={6000} onClose={()=> setSnkOpen(false)} anchorOrigin={{ vertical:'bottom', horizontal:'center' }}>
        <Alert onClose={()=> setSnkOpen(false)} severity={snkSev} sx={{ width: '100%' }}>
          {snkMsg}
        </Alert>
      </Snackbar>
    </Box>
  )
}
