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
import { useWriteContract, usePublicClient, useSwitchChain, useAccount, useChainId, useReadContract } from 'wagmi'
import MARKET_ARTIFACT from '@/abis/MarketplaceV2.json'
import ERC20_ARTIFACT from '@/abis/ERC20.json'
import { useTranslations, useLocale } from 'next-intl'
import { createViewModelFromPublished } from '@/viewmodels'
import type { EntitlementsDTO } from '@/adapters/evm/entitlements'
import { Row, ChipsShort, displayValue, formatPriceDisplay } from '@/components/ModelDetailShared'
import { useWalletAddress } from '@/hooks/useWalletAddress'
import GitHubIcon from '@mui/icons-material/GitHub'
import LanguageIcon from '@mui/icons-material/Language'
import LinkedInIcon from '@mui/icons-material/LinkedIn'
import PersonIcon from '@mui/icons-material/Person'
import { getMarketAddress, getChainConfig, getUsdcAddress } from '@/config'
import { ModelEditControls } from '@/components/ModelEditControls'
import { QuickEditDrawer } from '@/components/QuickEditDrawer'
import { rightsBitmaskToArray } from '@/adapters/evm/write'
import { IpfsImage } from '@/components/IpfsImage'
import X402InferencePanel from '@/components/X402InferencePanel'
import ERC8004Badge from '@/components/ERC8004Badge'
import AgentReputation from '@/components/AgentReputation'
import InferenceHistory from '@/components/InferenceHistory'

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
  const { isConnected } = useAccount()
  
  const evmChainId = React.useMemo(() => {
    // Priority for browsing/viewing (no wallet required):
    // 1. ENV default (for public exploration) - Always available
    // 2. Wallet chainId (if connected) - Can override default
    // 3. URL param (for testing/debugging) - Manual override
    
    // First, get default chainId for public browsing
    const envValue = Number(process.env.NEXT_PUBLIC_EVM_DEFAULT_CHAIN_ID || process.env.NEXT_PUBLIC_EVM_CHAIN_ID || 0)
    const hasEnvDefault = Number.isFinite(envValue) && envValue > 0
    
    // If wallet is connected, use wallet's chainId (allows user to switch networks)
    if (isConnected && typeof walletChainId === 'number' && Number.isFinite(walletChainId)) {
      console.log('[ModelPageClient] Using chainId from connected wallet:', walletChainId, '(user can switch networks)')
      return walletChainId
    }
    
    // Fallback to URL param (for testing/debugging without wallet)
    if (typeof chainId === 'number' && Number.isFinite(chainId)) {
      console.log('[ModelPageClient] Using chainId from URL param:', chainId, '(manual override)')
      return chainId
    }
    
    // Default: ENV chainId for public browsing (no wallet required)
    if (hasEnvDefault) {
      console.log('[ModelPageClient] Using default chainId for browsing:', envValue, '(no wallet required)')
      return envValue
    }
    
    console.warn('[ModelPageClient] No chainId available. Set NEXT_PUBLIC_EVM_DEFAULT_CHAIN_ID in .env.local')
    return undefined
  }, [isConnected, walletChainId, chainId])

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
      
      // Determine data source based on initialModel and chainId match
      const initialChainId = (initialModel as any)?.chainId
      const chainsMatch = !evmChainId || !initialChainId || initialChainId === evmChainId
      const useNeonData = initialModel && chainsMatch
      
      // Helper for fetch with timeout (used for both blockchain API and IPFS)
      const fetchWithTimeout = async (input: RequestInfo | URL, init: RequestInit = {}, ms = 10000): Promise<Response> => {
        const ac = new AbortController()
        const t = setTimeout(()=> ac.abort(), ms)
        try {
          return await fetch(input, { ...init, signal: ac.signal })
        } finally {
          clearTimeout(t)
        }
      }
      
      try {
        let m: any = null
        
        // Use Neon data if available and chains match, otherwise fetch from blockchain
        if (useNeonData) {
          console.log('[useEvmModel] Using SSR data from Neon (fresh after Quick Edit sync)')
          // Clone initialModel to avoid mutating the original
          m = { ...initialModel }
        } else {
          if (initialModel && !chainsMatch) {
            console.log('[useEvmModel] Chain mismatch, fetching from blockchain:', { initialChainId, evmChainId })
          }
          
          const qs = new URLSearchParams()
          if (typeof evmChainId === 'number') qs.set('chainId', String(evmChainId))
          const apiUrl = `/api/models/evm/${id}?${qs.toString()}`
          console.log('[ModelPageClient] Fetching model:', { id, evmChainId, apiUrl })
          const r = await fetchWithTimeout(apiUrl, { cache: 'no-store' }, 10000)
        
          if (!r.ok) {
            console.error('[ModelPageClient] API error:', r.status, r.statusText)
            const errorText = await r.text().catch(() => 'Unknown error')
            console.error('[ModelPageClient] Error details:', errorText)
            if (!alive) return
            setData(null)
            setLoading(false)
            setAttempted(true)
            return
          }
          
          const j = await r.json().catch((e) => {
            console.error('[ModelPageClient] JSON parse error:', e)
            return {}
          })
          console.log('[ModelPageClient] API response:', j)
          m = j?.data || null
        }
        
        if (!alive) return
        if (!m) {
          setData(null)
          setLoading(false)
          setAttempted(true)
          return
        }
        
        // Use cached imageUrl from Neon if available
        if (m.imageUrl && typeof m.imageUrl === 'string') {
          console.log('[useEvmModel] Using cached imageUrl from Neon:', m.imageUrl)
        }
        
        // Process IPFS metadata
        // If metadata already exists in DB (from Neon), use it; otherwise fetch from IPFS
        if (m && m.uri && typeof m.uri === 'string' && !m.uri.includes('.enc')) {
          try {
            let meta = null
            
            // Use cached metadata from Neon if available
            if (m.metadata && typeof m.metadata === 'object') {
              console.log('[useEvmModel] Using cached metadata from Neon')
              meta = m.metadata
            } else {
              // Fetch from IPFS if not cached
              const uri = m.uri as string
              const toApiFromIpfs = (u: string): string => {
                if (!u) return ''
                if (u.startsWith('http://') || u.startsWith('https://')) return u
                if (u.startsWith('ipfs://')) return `/api/ipfs/${u.replace('ipfs://','')}`
                if (u.startsWith('/ipfs/')) return `/api/ipfs${u.replace('/ipfs/', '/')}`
                return `/api/ipfs/${u}`
              }
              const httpUrl = toApiFromIpfs(uri)
              console.log('[useEvmModel] Fetching metadata from IPFS:', httpUrl)
              meta = await fetchWithTimeout(httpUrl, { cache: 'no-store' }, 10000).then(r=>r.json()).catch(()=>null)
            }
            if (meta) {
              const img = meta.image || meta.image_url || meta.thumbnail || meta?.cover?.thumbCid || meta?.cover?.cid
              if (img && typeof img === 'string') {
                if (img.startsWith('http://') || img.startsWith('https://')) {
                  m.imageUrl = img
                } else if (img.startsWith('ipfs://')) {
                  m.imageUrl = `/api/ipfs/${img.replace('ipfs://','')}`
                } else if (img.startsWith('/ipfs/')) {
                  m.imageUrl = `/api/ipfs${img.replace('/ipfs/', '/')}`
                } else {
                  m.imageUrl = `/api/ipfs/${img}`
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
                authorName, authorLinks,
                metadata: meta // Store full metadata for x402 and other features
              }
            }
          } catch (metaErr) {
            console.error('[ModelPageClient] IPFS metadata fetch error:', metaErr)
            // Continue with basic model data even if metadata fetch fails
          }
          if (alive) setData(m)
        } else {
          if (alive) setData(m)
        }
      } catch (e) {
        console.error('[ModelPageClient] Fetch error:', e)
        if (!alive) return
        setData(null)
        setLoading(false)
        setAttempted(true)
      } finally {
        if (alive) {
          setLoading(false)
          setAttempted(true)
        }
      }
    }
    load()
    return () => { alive = false }
  }, [id, evmChainId, initialModel])

  return { data, loading, attempted, evmChainId }
}

/**
 * Format price from USDC base units (6 decimals) to display
 * - Rounds up to 2 decimals if there are decimals
 * - Shows as integer if no decimals
 * @param usdcValue - Price in USDC base units (6 decimals)
 * @returns Formatted price string (e.g., "5", "5.01", "5.67")
 */
function formatPrice(usdcValue: number | bigint | string | undefined): string {
  if (!usdcValue) return '0'
  
  // Handle bigint and large string numbers
  let num: number
  if (typeof usdcValue === 'bigint') {
    num = Number(usdcValue)
  } else if (typeof usdcValue === 'string') {
    // For very large strings, use BigInt first to avoid precision loss
    try {
      num = Number(BigInt(usdcValue))
    } catch {
      num = parseFloat(usdcValue)
    }
  } else {
    num = usdcValue
  }
  
  if (num <= 0) return '0'
  
  // USDC has 6 decimals
  const tokens = num / 1e6
  const hasDecimals = tokens % 1 !== 0
  
  if (hasDecimals) {
    // Round up to 2 decimals
    return (Math.ceil(tokens * 100) / 100).toFixed(2)
  } else {
    // Show as integer
    return Math.floor(tokens).toString()
  }
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
  const { isConnected, chain, address: currentAddress } = useAccount()
  const { walletAddress } = useWalletAddress()
  
  // Edit controls state
  const [quickEditOpen, setQuickEditOpen] = React.useState(false)
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
  // Prices are now in USDC (stablecoin), not native token
  const evmSymbol = 'USDC'
  const marketAddress = React.useMemo(() => {
    try {
      if (typeof evmChainId !== 'number') return undefined
      // Use centralized chain configuration
      return getMarketAddress(evmChainId) as `0x${string}` | undefined
    } catch { return undefined }
  }, [evmChainId])

  // Direct purchase for perpetual license (no popup for hackathon MVP)
  // This sets up the purchase and delegates to handlePurchase which handles USDC approval + buy
  const handleOpenBuy = React.useCallback(async () => {
    // Check if wallet is connected before allowing purchase
    if (!isConnected) {
      setSnkSev('warning')
      setSnkMsg(L.connectWallet)
      setSnkOpen(true)
      return
    }
    
    // Validate price is configured
    const hasPerpetual = data?.price_perpetual && (typeof data.price_perpetual === 'number' ? data.price_perpetual > 0 : true)
    if (!hasPerpetual) {
      setSnkSev('error')
      setSnkMsg(locale === 'es' ? 'Este modelo no tiene precio de licencia configurado' : 'This model has no license price configured')
      setSnkOpen(true)
      return
    }

    // Set perpetual as the kind - handlePurchase will be triggered via useEffect or we call it directly
    setBuyKind('perpetual')
    setBuyMonths(0)
    
    // Open the buy dialog which will show the purchase flow
    setBuyOpen(true)
    setBuyStep('review')
  }, [data, isConnected, L, locale])

  const handlePurchase = React.useCallback(async ()=>{
    try {
      if (!id || typeof evmChainId !== 'number' || !buyKind) return
      if (!marketAddress) { setSnkSev('error'); setSnkMsg(L.marketAddressMissing); setSnkOpen(true); return }
      // require wallet connection
      if (!isConnected || !currentAddress) { setSnkSev('warning'); setSnkMsg(L.connectWallet); setSnkOpen(true); return }
      
      // Get USDC address for this chain
      const usdcAddress = getUsdcAddress(evmChainId)
      if (!usdcAddress) { setSnkSev('error'); setSnkMsg('USDC not configured for this chain'); setSnkOpen(true); return }
      
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
      const erc20Abi = (ERC20_ARTIFACT as any).abi
      const licenseKind = buyKind === 'perpetual' ? 0 : 1
      const months = buyKind === 'subscription' ? buyMonths : 0
      const transferable = Boolean((data as any)?.rights?.transferable)
      
      // Prices are now in USDC (6 decimals) - stored as base units
      const priceP = (data as any)?.price_perpetual
      const priceS = (data as any)?.price_subscription
      
      // Convert to BigInt (USDC base units, 6 decimals)
      const toBigIntUsdc = (val: any): bigint => {
        if (val === undefined || val === null) return 0n
        if (typeof val === 'bigint') return val
        if (typeof val === 'string') {
          const clean = val.split('.')[0]
          return BigInt(clean || '0')
        }
        if (typeof val === 'number') {
          return BigInt(Math.round(val).toString())
        }
        return 0n
      }
      
      const priceUsdc = buyKind === 'perpetual'
        ? toBigIntUsdc(priceP)
        : toBigIntUsdc(priceS) * BigInt(months)
      
      if (priceUsdc === 0n) {
        setSnkSev('error'); setSnkMsg('Price not configured'); setSnkOpen(true); return
      }
      
      // Usar metadata del modelo para el NFT de licencia
      const tokenUri = (data as any)?.uri || ''
      setTxLoading(true)
      
      console.log('[Purchase] Starting USDC purchase flow:', {
        usdcAddress,
        marketAddress,
        priceUsdc: priceUsdc.toString(),
        currentAddress,
      })
      
      // Step 1: Check USDC balance
      let usdcBalance = 0n
      try {
        if (publicClient) {
          usdcBalance = await publicClient.readContract({
            address: usdcAddress as `0x${string}`,
            abi: erc20Abi,
            functionName: 'balanceOf',
            args: [currentAddress as `0x${string}`],
          }) as bigint
          console.log('[Purchase] USDC balance:', usdcBalance.toString())
        }
      } catch (e) {
        console.warn('[Purchase] Failed to check USDC balance:', e)
      }
      
      if (usdcBalance < priceUsdc) {
        const needed = Number(priceUsdc) / 1e6
        const have = Number(usdcBalance) / 1e6
        setSnkSev('error')
        setSnkMsg(locale === 'es' 
          ? `Saldo USDC insuficiente. Necesitas ${needed} USDC, tienes ${have.toFixed(2)} USDC`
          : `Insufficient USDC balance. Need ${needed} USDC, have ${have.toFixed(2)} USDC`)
        setSnkOpen(true)
        setTxLoading(false)
        return
      }
      
      // Step 2: Check current allowance
      let currentAllowance = 0n
      try {
        if (publicClient) {
          currentAllowance = await publicClient.readContract({
            address: usdcAddress as `0x${string}`,
            abi: erc20Abi,
            functionName: 'allowance',
            args: [currentAddress as `0x${string}`, marketAddress as `0x${string}`],
          }) as bigint
          console.log('[Purchase] Current allowance:', currentAllowance.toString())
        }
      } catch (e) {
        console.warn('[Purchase] Failed to check allowance:', e)
      }
      
      // Step 3: Approve USDC if needed (infinite approve for better UX - only once per user)
      if (currentAllowance < priceUsdc) {
        console.log('[Purchase] Approving USDC...')
        setSnkSev('info'); setSnkMsg(locale === 'es' ? 'Aprobando USDC (solo una vez)...' : 'Approving USDC (one time only)...'); setSnkOpen(true)
        const MAX_UINT256 = BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff')
        const approveHash = await writeContractAsync({
          address: usdcAddress as `0x${string}`,
          abi: erc20Abi,
          functionName: 'approve',
          args: [marketAddress as `0x${string}`, MAX_UINT256],
          chainId: evmChainId,
        })
        console.log('[Purchase] Approve tx hash:', approveHash)
        if (publicClient && approveHash) {
          await publicClient.waitForTransactionReceipt({ hash: approveHash })
          console.log('[Purchase] Approve confirmed')
        }
      } else {
        console.log('[Purchase] Allowance sufficient, skipping approve')
      }
      
      // Step 4: Buy license (no value - USDC is transferred via transferFrom)
      setSnkSev('info'); setSnkMsg(locale === 'es' ? 'Comprando licencia...' : 'Purchasing license...'); setSnkOpen(true)
      const hash = await writeContractAsync({
        address: marketAddress as `0x${string}`,
        abi: abi as any,
        functionName: 'buyLicenseWithURI',
        args: [BigInt(id), Number(licenseKind), Number(months), Boolean(transferable), tokenUri],
        chainId: evmChainId,
        // No value - payment is in USDC, not native token
      })
      let receipt = null
      if (publicClient && hash) {
        receipt = await publicClient.waitForTransactionReceipt({ hash })
      }
      
      // Register license in Neon DB for fast retrieval
      try {
        // Parse LicenseMinted event to get tokenId
        const abi = (MARKET_ARTIFACT as any).abi
        const licenseMintedEvent = abi.find((e: any) => e.type === 'event' && e.name === 'LicenseMinted')
        let tokenId = null
        
        if (receipt?.logs && licenseMintedEvent) {
          for (const log of receipt.logs) {
            try {
              // Check if this log is from the marketplace contract
              if (log.address.toLowerCase() === marketAddress.toLowerCase()) {
                // Try to decode the log
                const { decodeEventLog } = await import('viem')
                const decoded = decodeEventLog({
                  abi: [licenseMintedEvent],
                  data: log.data,
                  topics: log.topics,
                }) as { eventName: string; args: any }
                if (decoded.eventName === 'LicenseMinted') {
                  tokenId = Number(decoded.args.licenseId || decoded.args.tokenId)
                  break
                }
              }
            } catch {}
          }
        }
        
        if (tokenId) {
          const rights = (data as any)?.rights || {}
          await fetch('/api/indexed/licenses', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              tokenId,
              modelId: Number(id),
              owner: currentAddress,
              kind: licenseKind,
              expiresAt: 0, // perpetual
              chainId: evmChainId,
              txHash: hash,
              validApi: rights.api !== false,
              validDownload: rights.download !== false,
            }),
          })
          console.log('[Purchase] License registered in Neon:', tokenId)
        }
      } catch (e) {
        console.warn('[Purchase] Failed to register license in Neon:', e)
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
  }, [id, marketAddress, evmChainId, buyKind, buyMonths, data, writeContractAsync, chain, switchChainAsync, isConnected, publicClient, L, mutateEntitlements, currentAddress, locale])
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
    if (!evmChainId) return undefined
    // Use centralized chain configuration
    const config = getChainConfig(evmChainId)
    return config?.icon
  }, [evmChainId])

  const truncateAddr = React.useCallback((s: any) => {
    const v = typeof s === 'string' ? s : ''
    if (!v) return ''
    return v.length > 12 ? `${v.slice(0,6)}…${v.slice(-4)}` : v
  }, [])

  const ChainIcon: React.FC = React.useCallback(() => {
    // Use centralized chain configuration for color
    const config = evmChainId ? getChainConfig(evmChainId) : null
    const color = config?.color || '#627EEA' /* Ethereum default */
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
      // Extract from metadata if not already processed
      const meta = data.metadata || {}
      const customer = meta.customer || {}
      const author = meta.author || {}
      // Technical data is nested under meta.technical
      const technical = meta.technical || {}
      const arch = technical.architecture || meta.architecture || {}
      const runtime = technical.runtime || meta.runtime || {}
      const resources = technical.resources || meta.resources || {}
      const inference = technical.inference || meta.inference || {}
      const deps = technical.dependencies || meta.dependencies || {}
      const capabilities = technical.capabilities || meta.capabilities || {}
      const lp = meta.licensePolicy || {}
      
      // Determine summary and tagline (avoid duplication)
      const taglineValue = data.tagline || meta.tagline || ''
      const summaryValue = data.summary || meta.summary || meta.shortSummary || ''
      // Use tagline as summary only if no separate summary exists
      const finalSummary = summaryValue || taglineValue
      
      // valueProp should be different from summary (it's the "what this model does" field)
      const valuePropValue = data.valueProposition || customer.valueProp || customer.valueProposition || ''
      
      const enrichedData = {
        ...data,
        name: data.name || meta.name || `Model #${id}`,
        chain: chainName,
        chainSymbol: evmSymbol,
        summary: finalSummary,
        tagline: taglineValue,
        authorName: data.authorName || author.displayName || author.name || (data.owner ? truncateAddr(data.owner) : undefined),
        authorLinks: data.authorLinks || author.links,
        cover: (() => {
          // Extract CID from metadata cover object or from imageUrl
          const coverCid = meta?.cover?.cid || meta?.cover?.thumbCid
          if (coverCid) {
            return { cid: coverCid, url: data.imageUrl }
          }
          if (data.imageUrl) {
            return { url: data.imageUrl }
          }
          return undefined
        })(),
        businessCategory: data.businessCategory || meta.businessCategory,
        modelTypeBusiness: data.modelType || meta.modelType,
        categories: data.categories || meta.categories || [],
        technicalCategories: data.categories || meta.categories || [],
        tags: data.tags || meta.tags || [],
        technicalTags: data.tags || meta.tags || [],
        industries: data.industries || customer.industries || [],
        useCases: data.useCases || customer.useCases || [],
        supportedLanguages: data.supportedLanguages || customer.supportedLanguages || [],
        // Customer sheet fields
        valueProp: valuePropValue,
        customerDescription: data.customerDescription || customer.description,
        expectedImpact: data.expectedImpact || customer.expectedImpact || customer.expectedOutcomes,
        inputs: data.inputs || customer.inputs,
        outputs: data.outputs || customer.outputs,
        examples: data.examples || customer.examples,
        risks: data.limitations || customer.risks || customer.limitations,
        prohibited: data.prohibited || customer.prohibited,
        privacy: data.privacy || customer.privacy,
        deploy: data.deploy || customer.deploy,
        support: Array.isArray(data.support) ? data.support : (data.support ? [data.support] : (customer.support ? [customer.support] : undefined)),
        // Technical fields - from meta.technical.* structure
        tasks: data.tasks || capabilities.tasks || [],
        modalities: data.modalities || capabilities.modalities || [],
        frameworks: data.frameworks || arch.frameworks || [],
        architectures: data.architectures || arch.architectures || [],
        precisions: data.precision || arch.precisions || [],
        quantization: data.quantization || arch.quantization || undefined,
        modelFiles: data.fileFormats || arch.modelFiles || undefined,
        modelSize: data.modelSize || arch.modelSizeParams || undefined,
        artifactSize: data.artifactSize || arch.artifactSizeGB || undefined,
        // Runtime
        python: data.python || runtime.python || undefined,
        cuda: data.cuda || runtime.cuda || undefined,
        pytorch: data.pytorch || runtime.torch || undefined,
        cudnn: data.cudnn || runtime.cudnn || undefined,
        os: data.systems || runtime.os || [],
        accelerators: data.accelerators || runtime.accelerators || [],
        computeCapability: data.computeCapability || runtime.computeCapability || undefined,
        // Dependencies
        dependencies: data.dependencies || (Array.isArray(deps.pip) && deps.pip.length > 0 ? deps.pip.join('\n') : undefined),
        pip: typeof data.dependencies === 'string' ? data.dependencies.split('\n').filter(Boolean) : (Array.isArray(deps.pip) ? deps.pip : undefined),
        // Resources
        vramGB: data.minVram ?? resources.vramGB ?? undefined,
        cpuCores: data.minCpu ?? resources.cpuCores ?? undefined,
        ramGB: data.recRam ?? resources.ramGB ?? undefined,
        // Inference
        maxBatchSize: data.maxBatch ?? inference.maxBatchSize ?? undefined,
        contextLength: data.contextLength ?? inference.contextLength ?? undefined,
        maxTokens: data.maxTokens ?? inference.maxTokens ?? undefined,
        imageResolution: data.imageResolution || inference.imageResolution || undefined,
        sampleRate: data.sampleRate || inference.sampleRate || undefined,
        triton: data.triton ?? inference.triton ?? undefined,
        referenceLatency: data.gpuNotes || inference.referencePerf || undefined,
        artifacts: data.artifactsList || meta.artifacts || [],
        price_perpetual: data.price_perpetual,
        price_subscription: data.price_subscription,
        delivery_rights_default: data.delivery_rights_default,
        delivery_mode_hint: data.delivery_mode_hint,
        rights: data.rights || (lp.rights ? {
          api: lp.rights.api,
          download: lp.rights.download,
          transferable: lp.rights.transferable || lp.transferable
        } : undefined),
        deliveryMode: data.deliveryMode || lp.deliveryMode,
        termsMarkdown: data.termsText || lp.termsText || lp.terms?.textMarkdown,
        termsSummary: lp.terms?.summaryBullets,
        version: (() => {
          // Convert DB integer version to string format "v1.0.0"
          const dbVersion = Number(data.version)
          if (dbVersion > 0) return `v${dbVersion}.0.0`
          // Fallback to metadata string version if present
          if (typeof meta.version === 'string') return meta.version
          return undefined
        })()
      }
      
      console.log('[ModelPageClient] enrichedData for ViewModel:', {
        name: enrichedData.name,
        price_perpetual: enrichedData.price_perpetual,
        price_subscription: enrichedData.price_subscription,
        summary: enrichedData.summary?.substring(0, 50),
        tagline: enrichedData.tagline?.substring(0, 50),
        valueProp: enrichedData.valueProp?.substring(0, 50),
        frameworks: enrichedData.frameworks,
        architectures: enrichedData.architectures,
        tasks: enrichedData.tasks,
        vramGB: enrichedData.vramGB,
        cpuCores: enrichedData.cpuCores,
        'meta.technical': !!meta.technical,
        'meta.architecture': !!meta.architecture,
        'arch.frameworks': arch.frameworks,
      })
      
      const vm = createViewModelFromPublished(enrichedData, undefined, id)
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
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 3 }}>
          <Button 
            component={Link} 
            href={backHref}
            prefetch={true}
            startIcon={<ArrowBackIcon />}
            sx={{
              color: 'oklch(0.92 0 0)',
              bgcolor: 'rgba(255,255,255,0.05)',
              borderRadius: '10px',
              px: 2.5,
              py: 1,
              fontSize: 14,
              fontWeight: 600,
              transition: 'all 0.2s ease',
              '&:hover': {
                bgcolor: 'rgba(79,225,255,0.15)',
                color: '#4fe1ff',
                transform: 'translateX(-4px)',
                boxShadow: '0 0 12px rgba(79,225,255,0.3)'
              }
            }}
          >
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
        {!evmChainId && !loading && (
          <Paper variant="outlined" sx={{ p: 3, mb: 2, borderRadius: 2, bgcolor: 'rgba(255,165,0,0.05)', borderColor: 'rgba(255,165,0,0.3)' }}>
            <Typography color="warning.main" variant="h6" sx={{ mb: 2 }}>
              {locale === 'es' ? '⚙️ Configuración requerida' : '⚙️ Configuration Required'}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {locale === 'es' 
                ? 'No se pudo detectar una red blockchain. Por favor configura NEXT_PUBLIC_EVM_DEFAULT_CHAIN_ID en tu archivo .env.local o conecta tu wallet.'
                : 'Could not detect a blockchain network. Please configure NEXT_PUBLIC_EVM_DEFAULT_CHAIN_ID in your .env.local file or connect your wallet.'}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {locale === 'es' 
                ? 'Ejemplo: NEXT_PUBLIC_EVM_DEFAULT_CHAIN_ID=43113 (Avalanche Fuji)'
                : 'Example: NEXT_PUBLIC_EVM_DEFAULT_CHAIN_ID=43113 (Avalanche Fuji)'}
            </Typography>
          </Paper>
        )}
        {!loading && !data && attempted && evmChainId && (
          <Paper variant="outlined" sx={{ p: 3, mb: 2, borderRadius: 2, bgcolor: 'rgba(255,0,0,0.05)' }}>
            <Typography color="error" variant="h6" sx={{ mb: 2 }}>
              {L.notFound || 'Model not found'}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              {locale === 'es' ? 'Información de diagnóstico:' : 'Diagnostic information:'}
            </Typography>
            <Box component="ul" sx={{ pl: 2 }}>
              <Typography component="li" variant="body2" color="text.secondary">
                Model ID: {id}
              </Typography>
              <Typography component="li" variant="body2" color="text.secondary">
                Chain ID: {evmChainId} ({getChainConfig(evmChainId)?.name || 'Unknown'})
              </Typography>
              <Typography component="li" variant="body2" color="text.secondary">
                {locale === 'es' ? 'Red detectada de tu wallet' : 'Network detected from your wallet'}
              </Typography>
              <Typography component="li" variant="body2" color="text.secondary">
                {locale === 'es' ? 'Revisa la consola del navegador para más detalles' : 'Check browser console for more details'}
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              {locale === 'es' 
                ? 'Posibles causas: modelo no existe en esta red, no está publicado, o problemas de conexión. Intenta cambiar de red en tu wallet.'
                : 'Possible causes: model does not exist on this network, not published, or connection issues. Try switching networks in your wallet.'}
            </Typography>
          </Paper>
        )}
        {!loading && data && viewModel && (
          <Box
            sx={{
              animation: 'fadeIn 0.4s ease-in',
              '@keyframes fadeIn': {
                from: { opacity: 0, transform: 'translateY(8px)' },
                to: { opacity: 1, transform: 'translateY(0)' }
              }
            }}
          >
            {/* Listing overview - como Step 5 */}
            <Paper variant="outlined" sx={{ p:{ xs:2, md:3 }, mb:2, borderRadius:2, bgcolor:'rgba(255,255,255,0.02)' }}>
              <Grid container spacing={3}>
                {/* Left column: Listing information */}
                <Grid item xs={12} md={8}>
                  <Stack spacing={2.5}>
                    {/* Name and Tagline */}
                    <Box>
                      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb:1, flexWrap:'wrap', gap:1 }}>
                        <Typography variant="h4" sx={{ fontWeight:800, color:'#fff', fontSize:{ xs:'1.75rem', md:'2rem' } }}>
                          {viewModel.step1.name}
                        </Typography>
                        {viewModel.step1.version && (
                          <Chip 
                            label={viewModel.step1.version} 
                            size="small"
                            sx={{ 
                              bgcolor: 'rgba(46, 160, 255, 0.15)', 
                              color: '#4fe1ff', 
                              border: '1px solid rgba(46, 160, 255, 0.3)',
                              fontSize: '0.85rem',
                              height: 28,
                              fontWeight: 600
                            }} 
                          />
                        )}
                        {/* ERC-8004 Agent Badge - shown if model has agent identity */}
                        {data?.metadata?.agentId && (
                          <ERC8004Badge 
                            agentId={data.metadata.agentId} 
                            variant="chip" 
                            locale={locale} 
                          />
                        )}
                        {/* On-chain Reputation Badge */}
                        <AgentReputation 
                          agentId={data?.metadata?.agentId || Number(id)} 
                          locale={locale}
                          compact
                        />
                      </Stack>
                      {viewModel.step1.tagline && (
                        <Typography variant="h6" sx={{ color:'#ffffffcc', fontWeight:400, mb:1.5, fontSize:'1.1rem' }}>
                          {viewModel.step1.tagline}
                        </Typography>
                      )}
                      {/* Info: browsing without wallet */}
                      {!isConnected && evmChainId && (
                        <Paper 
                          variant="outlined" 
                          sx={{ 
                            p: 1.5, 
                            mb: 2, 
                            bgcolor: 'rgba(100,200,255,0.05)', 
                            borderColor: 'rgba(100,200,255,0.2)',
                            borderRadius: 1
                          }}
                        >
                          <Stack direction="row" spacing={1} alignItems="center">
                            <Typography variant="caption" sx={{ color: '#90caf9', fontSize: '0.75rem' }}>
                              ℹ️ {locale === 'es' 
                                ? `Navegando en: ${getChainConfig(evmChainId)?.name || `Chain ${evmChainId}`}. Conecta tu wallet para cambiar de red o realizar acciones (comprar, publicar, editar).`
                                : `Browsing on: ${getChainConfig(evmChainId)?.name || `Chain ${evmChainId}`}. Connect your wallet to switch networks or take actions (buy, publish, edit).`}
                            </Typography>
                          </Stack>
                        </Paper>
                      )}
                      {/* Summary with line clamp - only show if different from tagline */}
                      {viewModel.step1.summary && viewModel.step1.summary !== viewModel.step1.tagline && (
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
                    {(viewModel?.step4?.pricing?.perpetual || viewModel?.step4?.pricing?.subscription || data?.price_perpetual || data?.price_subscription) && (
                      <Box>
                        <Typography variant="caption" color="text.secondary" sx={{ display:'block', mb:1.5, fontWeight:600, textTransform:'uppercase', fontSize:'0.7rem', letterSpacing:'0.5px' }}>
                          {isES ? 'Precios y licencias' : 'Pricing & licenses'}
                        </Typography>
                        <Grid container spacing={2}>
                          {/* Left: Price card */}
                          {(viewModel?.step4?.pricing?.perpetual?.available || (data?.price_perpetual && data.price_perpetual > 0)) && (
                            <Grid item xs={12} sm={6}>
                              <Box sx={{ 
                                p:2, 
                                borderRadius:2, 
                                border:'2px solid #4fe1ff',
                                bgcolor:'rgba(79,225,255,0.05)',
                                height:'100%',
                                display:'flex',
                                flexDirection:'column',
                                justifyContent:'center'
                              }}>
                                <Typography variant="caption" sx={{ color:'#4fe1ff', fontWeight:700, fontSize:'0.7rem', textTransform:'uppercase', display:'block', mb:0.5 }}>
                                  {isES ? '🏆 Licencia perpetua' : '🏆 Perpetual license'}
                                </Typography>
                                <Typography variant="h4" sx={{ color:'#4fe1ff', fontWeight:800, mb:0.5 }}>
                                  {viewModel?.step4?.pricing?.perpetual?.priceFormatted || formatPrice(data?.price_perpetual)} {evmSymbol}
                                </Typography>
                                <Typography variant="caption" sx={{ color:'#ffffffb3', fontSize:'0.75rem' }}>
                                  {isES ? 'Pago único • Acceso de por vida' : 'One-time payment • Lifetime access'}
                                </Typography>
                              </Box>
                            </Grid>
                          )}
                          
                          {/* Right: Benefits card */}
                          {(viewModel?.step4?.pricing?.perpetual?.available || (data?.price_perpetual && data.price_perpetual > 0)) && (
                            <Grid item xs={12} sm={6}>
                              <Box sx={{ 
                                p:1.5, 
                                borderRadius:2, 
                                border:'1px solid rgba(124,92,255,0.3)',
                                bgcolor:'rgba(124,92,255,0.05)',
                                height:'100%',
                                display:'flex',
                                flexDirection:'column',
                                justifyContent:'space-between'
                              }}>
                                <Box>
                                  <Typography variant="caption" sx={{ color:'#b8a3ff', fontWeight:600, fontSize:'0.68rem', textTransform:'uppercase', display:'block', mb:1 }}>
                                    ✨ {isES ? 'Incluye' : 'Includes'}
                                  </Typography>
                                  <Stack direction="row" spacing={0.5} sx={{ flexWrap:'wrap', gap:0.5 }}>
                                    {viewModel?.step4?.rights?.canUseAPI && (
                                      <Chip label={isES ? 'API' : 'API Access'} size="small" sx={{ bgcolor:'rgba(124,92,255,0.15)', color:'#b8a3ff', fontSize:'0.68rem', height:22 }} />
                                    )}
                                    {viewModel?.step4?.rights?.canDownload && (
                                      <Chip label={isES ? 'Descarga' : 'Download'} size="small" sx={{ bgcolor:'rgba(124,92,255,0.15)', color:'#b8a3ff', fontSize:'0.68rem', height:22 }} />
                                    )}
                                    <Chip label="NFT" size="small" sx={{ bgcolor:'rgba(124,92,255,0.15)', color:'#b8a3ff', fontSize:'0.68rem', height:22 }} />
                                    <Chip label={isES ? 'Perpetua' : 'Perpetual'} size="small" sx={{ bgcolor:'rgba(124,92,255,0.15)', color:'#b8a3ff', fontSize:'0.68rem', height:22 }} />
                                  </Stack>
                                </Box>
                                
                                {/* Clarification about inference */}
                                <Box sx={{ mt:1, p:0.75, borderRadius:1, bgcolor:'rgba(255,193,7,0.08)', border:'1px solid rgba(255,193,7,0.2)' }}>
                                  <Typography variant="caption" sx={{ color:'#ffc107', fontSize:'0.65rem', fontWeight:500, lineHeight:1.3 }}>
                                    ⚡ {isES 
                                      ? 'Inferencia: pago por uso via x402 (USDC)' 
                                      : 'Inference: pay-per-use via x402 (USDC)'}
                                  </Typography>
                                </Box>
                              </Box>
                            </Grid>
                          )}
                        </Grid>
                        
                        {/* Rights & Delivery - Now shown in benefits card */}
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
                      {/* Demo button removed */}
                    </Stack>

                  </Stack>
                </Grid>

                {/* Right column: Cover */}
                <Grid item xs={12} md={4}>
                  <Stack spacing={2}>
                    {/* Cover / Hero Image */}
                    {viewModel.step1.cover?.cid || data.imageUrl ? (
                      <Box sx={{ 
                        position: 'relative',
                        width:'100%', 
                        height: 200,
                        maxWidth:'100%', 
                        overflow:'hidden',
                        borderRadius:2,
                        border:'1px solid rgba(255,255,255,0.1)'
                      }}>
                        <IpfsImage
                          cid={viewModel.step1.cover?.cid}
                          alt="Model cover"
                          height={200}
                          priority={false}
                          objectFit="cover"
                          fallbackSrc={data.imageUrl}
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
                          {isES ? 'Sin imagen' : 'No image'}
                        </Typography>
                      </Box>
                    )}

                    {/* On-Chain Reputation - in right column - Full detailed view */}
                    <AgentReputation 
                      agentId={data?.metadata?.agentId || Number(id)} 
                      locale={locale}
                      compact={false}
                    />
                  </Stack>
                </Grid>
              </Grid>
            </Paper>

            {/* x402 Inference Panel - Pay per use */}
            {/* Show for hardcoded models (14, 20, 23) OR models with pricePerCall in metadata */}
            {(() => {
              // Check multiple possible paths for pricePerCall
              const pricePerCall = data?.metadata?.licensePolicy?.pricing?.inference?.pricePerCall 
                || data?.metadata?.licensePolicy?.inference?.pricePerCall
              const showX402 = ['14', '20', '23'].includes(String(id)) || !!pricePerCall
              return showX402 ? (
                <Box sx={{ mb: 2 }}>
                  <X402InferencePanel
                    modelId={id}
                    modelName={viewModel?.step1?.name || data?.name || `Model #${id}`}
                    agentId={data?.metadata?.agentId}
                    pricePerInference={pricePerCall}
                    recipientWallet={data?.creator || data?.owner}
                    chainId={evmChainId}
                    locale={locale}
                  />
                </Box>
              ) : null
            })()}

            {/* Inference History */}
            <Box sx={{ mb: 2 }}>
              <InferenceHistory
                modelId={id}
                locale={locale}
                maxRows={10}
              />
            </Box>

            {/* Licenses and terms - Hidden for cleaner UI, info already in pricing cards */}
            {false && (
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
                    {(viewModel?.step4?.pricing?.perpetual?.available || (data?.price_perpetual && data.price_perpetual > 0)) && (
                      <Row 
                        label={isES ? 'Licencia perpetua' : 'Perpetual license'} 
                        value={`${viewModel?.step4?.pricing?.perpetual?.priceFormatted || formatPrice(data?.price_perpetual)} ${evmSymbol}`}
                      />
                    )}
                    {/* Subscription row hidden for hackathon MVP */}
                    {false && (viewModel?.step4?.pricing?.subscription?.available || (data?.price_subscription && data.price_subscription > 0)) && (
                      <Row 
                        label={isES ? 'Suscripción (por mes)' : 'Subscription (per month)'} 
                        value={`${viewModel?.step4?.pricing?.subscription?.pricePerMonthFormatted || formatPrice(data?.price_subscription)} ${evmSymbol}/mes`}
                      />
                    )}
                  </List>
                </Box>
                <Box>
                  <Typography variant="caption" sx={{ display:'block', mb:0.5, fontWeight:600, color:'#ffffffb3' }}>
                    {isES ? 'Derechos y entrega' : 'Rights & delivery'}
                  </Typography>
                  <Stack direction="row" spacing={1} sx={{ flexWrap:'wrap', gap:1 }}>
                    {viewModel?.step4?.rights?.canUseAPI && (
                      <Chip label="API usage" size="small" variant="outlined" sx={{ borderColor:'rgba(255,255,255,0.3)', color:'#fff' }} />
                    )}
                    {viewModel?.step4?.rights?.canDownload && (
                      <Chip label="Model download" size="small" variant="outlined" sx={{ borderColor:'rgba(255,255,255,0.3)', color:'#fff' }} />
                    )}
                    {viewModel?.step4?.rights?.isTransferable && (
                      <Chip label="Transferable" size="small" variant="outlined" sx={{ borderColor:'rgba(255,255,255,0.3)', color:'#fff' }} />
                    )}
                  </Stack>
                </Box>
              </Stack>
            </Paper>
            )}

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
                <Grid item xs={12} md={6}>
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
                  <Box sx={{ mb:2 }}>
                    <Typography variant="caption" sx={{ display:'block', mb:1, fontWeight:600, textTransform:'uppercase', fontSize:'0.7rem', color:'#ffffffb3' }}>
                      {isES ? 'Arquitectura' : 'Architecture'}
                    </Typography>
                    <List dense>
                      {viewModel.step2.technical?.frameworks && viewModel.step2.technical.frameworks.length > 0 && (
                        <Row label="Frameworks" value={<ChipsShort items={viewModel.step2.technical?.frameworks || []} />} />
                      )}
                      {viewModel.step2.technical?.architectures && viewModel.step2.technical.architectures.length > 0 && (
                        <Row label={isES ? 'Arquitecturas' : 'Architectures'} value={<ChipsShort items={viewModel.step2.technical?.architectures || []} />} />
                      )}
                      {viewModel.step2.technical?.precisions && viewModel.step2.technical.precisions.length > 0 && (
                        <Row label={isES ? 'Precisiones' : 'Precisions'} value={<ChipsShort items={viewModel.step2.technical?.precisions || []} />} />
                      )}
                      <Row label={isES ? 'Tamaño del modelo' : 'Model size'} value={displayValue(viewModel.step2.technical?.modelSize)} />
                      <Row label={isES ? 'Tamaño de artefacto' : 'Artifact size'} value={displayValue(viewModel.step2.technical?.artifactSize)} />
                    </List>
                  </Box>
                  <Box>
                    <Typography variant="caption" sx={{ display:'block', mb:1, fontWeight:600, textTransform:'uppercase', fontSize:'0.7rem', color:'#ffffffb3' }}>
                      Runtime
                    </Typography>
                    <List dense>
                      <Row label="Python" value={displayValue(viewModel.step2.technical?.python)} />
                      {viewModel.step2.technical?.os && viewModel.step2.technical.os.length > 0 && (
                        <Row label={isES ? 'OS' : 'OS'} value={<ChipsShort items={viewModel.step2.technical?.os || []} />} />
                      )}
                      <Row label="CUDA" value={displayValue(viewModel.step2.technical?.cuda)} />
                      <Row label="PyTorch" value={displayValue(viewModel.step2.technical?.pytorch)} />
                    </List>
                  </Box>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Box sx={{ mb:2 }}>
                    <Typography variant="caption" sx={{ display:'block', mb:1, fontWeight:600, textTransform:'uppercase', fontSize:'0.7rem', color:'#ffffffb3' }}>
                      {isES ? 'Recursos' : 'Resources'}
                    </Typography>
                    <List dense>
                      <Row label="VRAM (GB)" value={displayValue(viewModel.step2.technical?.vramGB, true)} />
                      <Row label={isES ? 'CPU cores' : 'CPU cores'} value={displayValue(viewModel.step2.technical?.cpuCores, true)} />
                      <Row label="RAM (GB)" value={displayValue(viewModel.step2.technical?.ramGB, true)} />
                    </List>
                  </Box>
                  <Box>
                    <Typography variant="caption" sx={{ display:'block', mb:1, fontWeight:600, textTransform:'uppercase', fontSize:'0.7rem', color:'#ffffffb3' }}>
                      {isES ? 'Inferencia' : 'Inference'}
                    </Typography>
                    <List dense>
                      <Row label={isES ? 'Batch máx.' : 'Max batch'} value={displayValue(viewModel.step2.technical?.maxBatchSize, true)} />
                      <Row label={isES ? 'Contexto' : 'Context'} value={displayValue(viewModel.step2.technical?.contextLength, true)} />
                      <Row label={isES ? 'Tokens máx.' : 'Max tokens'} value={displayValue(viewModel.step2.technical?.maxTokens, true)} />
                    </List>
                  </Box>
                </Grid>
              </Grid>
            </Paper>

            {/* Edit controls (solo owner) */}
            {data && evmChainId && (
              <ModelEditControls
                modelId={id}
                ownerAddress={data.owner || ''}
                currentAddress={currentAddress}
                onQuickEdit={() => setQuickEditOpen(true)}
              />
            )}

            {/* Published by - Author section at the end */}
            <Paper variant="outlined" sx={{ p:{ xs:2, md:3 }, mb:2, borderRadius:2, bgcolor:'rgba(255,255,255,0.02)' }}>
              <Typography variant="subtitle2" sx={{ color:'#fff', fontWeight:700, mb:2 }}>
                {isES ? 'Publicado por' : 'Published by'}
              </Typography>
              <Stack direction="row" spacing={2} alignItems="center">
                {/* Author avatar/icon */}
                <Box sx={{ 
                  width:56, 
                  height:56, 
                  borderRadius:'50%', 
                  bgcolor:'rgba(124,92,255,0.2)', 
                  border:'2px solid rgba(124,92,255,0.4)',
                  display:'flex',
                  alignItems:'center',
                  justifyContent:'center',
                  flexShrink:0
                }}>
                  {viewModel.step1.authorName ? (
                    <Typography variant="h5" sx={{ color:'#b8a3ff', fontWeight:700 }}>
                      {viewModel.step1.authorName.charAt(0).toUpperCase()}
                    </Typography>
                  ) : (
                    <PersonIcon sx={{ color:'#b8a3ff', fontSize:'2rem' }} />
                  )}
                </Box>
                
                {/* Author info */}
                <Box sx={{ flex:1 }}>
                  <Typography variant="body1" sx={{ color:'#fff', fontWeight:700, fontSize:'1.1rem', mb:0.5 }}>
                    {viewModel.step1.authorName || data?.owner?.slice(0,6) + '...' + data?.owner?.slice(-4) || (isES ? 'Autor anónimo' : 'Anonymous author')}
                  </Typography>
                  
                  {/* Social links */}
                  {viewModel.step1.authorLinks && Object.values(viewModel.step1.authorLinks as Record<string, any>).some(Boolean) ? (
                    <Stack direction="row" spacing={1} sx={{ mt:1 }}>
                      {Object.entries(viewModel.step1.authorLinks as Record<string, any>).filter(([,v])=>!!v).map(([k,v]: any, i: number)=> {
                        const label = k==='github'? 'GitHub' : k==='website'? 'Website' : k==='twitter'? 'X' : k==='linkedin'? 'LinkedIn' : k
                        const icon = k==='github'? <GitHubIcon fontSize="small" /> : k==='website'? <LanguageIcon fontSize="small" /> : k==='twitter'? <XIcon fontSize="small" /> : k==='linkedin'? <LinkedInIcon fontSize="small" /> : undefined
                        return (
                          <Tooltip key={`${k}-${i}`} title={label}>
                            <IconButton 
                              size="small" 
                              aria-label={label} 
                              onClick={()=>{ try { if (v) window.open(String(v), '_blank', 'noopener,noreferrer') } catch {} }}
                              sx={{ 
                                bgcolor:'rgba(255,255,255,0.08)',
                                color:'#fff',
                                '&:hover': { bgcolor:'rgba(124,92,255,0.3)', color:'#b8a3ff' },
                                transition:'all 0.2s'
                              }}
                            >
                              {icon}
                            </IconButton>
                          </Tooltip>
                        )
                      })}
                    </Stack>
                  ) : (
                    <Typography variant="caption" sx={{ color:'#ffffff66' }}>
                      {isES ? 'Sin redes sociales configuradas' : 'No social links configured'}
                    </Typography>
                  )}
                </Box>
              </Stack>
            </Paper>
          </Box>
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
                      <Typography variant="h6" sx={{ color:'#4fe1ff' }}>{(data?.price_perpetual && (typeof data.price_perpetual === 'number' ? data.price_perpetual > 0 : true)) ? `${formatPrice(data.price_perpetual)} ${evmSymbol}` : L.unspecified}</Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Card sx={{ borderRadius: 2, border:'1px solid', borderColor: buyKind==='subscription' ? 'primary.main' : 'rgba(255,255,255,0.18)', background:'rgba(255,255,255,0.06)' }}>
                    <CardContent>
                      <Typography variant="subtitle2" fontWeight={700} sx={{ color:'#fff' }}>{L.subscriptionPerMonth}</Typography>
                      <Typography variant="h6" sx={{ color:'#4fe1ff' }}>{(data?.price_subscription && (typeof data.price_subscription === 'number' ? data.price_subscription > 0 : true)) ? `${formatPrice(data.price_subscription)} ${evmSymbol}` : L.unspecified}</Typography>
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
                    <>{(data?.price_perpetual && (typeof data.price_perpetual === 'number' ? data.price_perpetual > 0 : true)) ? `${formatPrice(data.price_perpetual)} ${evmSymbol}` : L.unspecified}</>
                  ) : (
                    <>
                      {(data?.price_subscription && (typeof data.price_subscription === 'number' ? data.price_subscription > 0 : true))
                        ? (() => {
                            const priceNum = typeof data.price_subscription === 'string' ? Number(BigInt(data.price_subscription)) : data.price_subscription
                            return `${formatPrice(data.price_subscription)} ${evmSymbol} × ${buyMonths} = ${formatPrice(priceNum * buyMonths)} ${evmSymbol}`
                          })()
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
                disabled={!buyKind || (buyKind==='subscription' && (buyMonths < 1 || buyMonths > 12)) || !data}
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
      
      {/* Quick Edit Drawer */}
      {data && evmChainId && (
        <QuickEditDrawer
          open={quickEditOpen}
          onClose={() => setQuickEditOpen(false)}
          modelId={id}
          chainId={evmChainId}
          chainSymbol={evmSymbol}
          initialValues={{
            pricePerpetual: String(data.price_perpetual || '0'),
            priceSubscription: String(data.price_subscription || '0'),
            defaultDurationMonths: Math.floor((data.default_duration_days || 30) / 30),
            rights: rightsBitmaskToArray(data.delivery_rights_default || 1),
            deliveryMode: data.delivery_mode_hint === 1 ? 'API' : data.delivery_mode_hint === 2 ? 'Download' : 'Both',
            termsHash: data.terms_hash || '',
            listed: data.listed ?? true,
          }}
          onSuccess={(message?: string) => {
            // Show success message
            const successMsg = message || (locale === 'es' 
              ? 'Modelo actualizado exitosamente. Recargando...' 
              : 'Model updated successfully. Reloading...')
            setSnkSev('success')
            setSnkMsg(successMsg)
            setSnkOpen(true)
            
            // Close drawer
            setQuickEditOpen(false)
            
            // Reload page to fetch fresh data from Neon
            setTimeout(() => {
              // Hard reload to ensure client component remounts and fetches new data
              window.location.reload()
            }, 1500)
          }}
        />
      )}
    </Box>
  )
}
