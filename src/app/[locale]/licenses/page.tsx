"use client";
import React from 'react'
import { useAccount, useChainId as useEvmChainId, usePublicClient, useSwitchChain, useConfig } from 'wagmi'
import {
  Container, Box, Stack, Typography, Button, Divider, Alert, Table, TableHead, TableRow, TableCell, TableBody, Chip, CircularProgress, Snackbar, Dialog, DialogTitle, DialogContent, IconButton,
  TableContainer, Paper, Tooltip, Drawer
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import DownloadIcon from '@mui/icons-material/Download'
import ApiIcon from '@mui/icons-material/Api'
import CloudDownloadIcon from '@mui/icons-material/CloudDownload'
import SwapHorizIcon from '@mui/icons-material/SwapHoriz'
import ArticleIcon from '@mui/icons-material/Article'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import LanguageIcon from '@mui/icons-material/Language'
import VisibilityIcon from '@mui/icons-material/Visibility'
import MARKET_ARTIFACT from '@/abis/MarketplaceV3.json'
import Link from 'next/link'
import { useLocale } from 'next-intl'
import { createViewModelFromPublished } from '@/viewmodels'
import { getMarketAddress, CACHE_TTLS, INDEXER_CONFIG } from '@/config'

const globalCache = globalThis as any
globalCache.__LICENSE_STATUS_CACHE = globalCache.__LICENSE_STATUS_CACHE || new Map<string, { data: any; ts: number }>()
globalCache.__LICENSE_LOGS_CACHE = globalCache.__LICENSE_LOGS_CACHE || new Map<string, { logs: any[]; ts: number }>()
const LICENSE_STATUS_CACHE = globalCache.__LICENSE_STATUS_CACHE as Map<string, { data: any; ts: number }>
const LICENSE_LOGS_CACHE = globalCache.__LICENSE_LOGS_CACHE as Map<string, { logs: any[]; ts: number }>

// Use centralized cache TTL configuration
const STATUS_CACHE_TTL = CACHE_TTLS.LICENSE_STATUS
const LOG_CACHE_TTL = CACHE_TTLS.LICENSE_LOGS
const MODEL_CACHE_STORAGE_KEY = 'licenseModelCache'

function useMarketAddress(chainId: number | undefined) {
  return React.useMemo(() => {
    try {
      if (typeof chainId !== 'number') return undefined
      // Use centralized chain configuration
      return getMarketAddress(chainId) as `0x${string}` | undefined
    } catch { return undefined }
  }, [chainId])
}

function EvmLicensesPageImpl() {
  const locale = useLocale() as string
  const { address, isConnected, chain } = useAccount()
  const evmChainId = useEvmChainId()
  const marketAddress = useMarketAddress(evmChainId)
  const publicClient = usePublicClient()
  const { switchChainAsync } = useSwitchChain()
  const { chains } = useConfig() as any

  const [loading, setLoading] = React.useState(false)
  const [rows, setRows] = React.useState<any[]>([])
  const [snkOpen, setSnkOpen] = React.useState(false)
  const [snkMsg, setSnkMsg] = React.useState('')
  const [snkSev, setSnkSev] = React.useState<'success'|'error'|'info'|'warning'>('info')

  const [artifactsDrawerOpen, setArtifactsDrawerOpen] = React.useState(false)
  const [selectedLicense, setSelectedLicense] = React.useState<any>(null)

  const [dlgOpen, setDlgOpen] = React.useState(false)
  const [dlgTitle, setDlgTitle] = React.useState<string>('Artifacts')
  const [dlgItems, setDlgItems] = React.useState<Array<{ name: string; url: string; type: string; size?: number }>>([])
  const [dlgLoading, setDlgLoading] = React.useState(false)
  const [dlgNotes, setDlgNotes] = React.useState<string>('')
  const [viewDrawerOpen, setViewDrawerOpen] = React.useState(false)
  const [viewLicense, setViewLicense] = React.useState<any>(null)
  const licenseModelCache = React.useRef<Map<number, number>>(new Map())

  const persistLicenseModelCache = React.useCallback(() => {
    if (typeof window === 'undefined') return
    try {
      const entries = Array.from(licenseModelCache.current.entries())
      window.localStorage.setItem(MODEL_CACHE_STORAGE_KEY, JSON.stringify(entries))
    } catch {}
  }, [])

  React.useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const raw = window.localStorage.getItem(MODEL_CACHE_STORAGE_KEY)
      if (raw) {
        const entries = JSON.parse(raw)
        if (Array.isArray(entries)) {
          licenseModelCache.current = new Map(entries)
        }
      }
    } catch {}
  }, [])

  const rememberModelId = React.useCallback((tokenId: number, modelId: number) => {
    if (!modelId) return
    if (licenseModelCache.current.get(tokenId) === modelId) return
    licenseModelCache.current.set(tokenId, modelId)
    persistLicenseModelCache()
  }, [persistLicenseModelCache])

  const getLogsMemoized = React.useCallback(async (args: any) => {
    if (!publicClient || !args) return []
    const from = args.fromBlock ? args.fromBlock.toString() : '0'
    const to = args.toBlock ? args.toBlock.toString() : '0'
    const eventName = (args.event as any)?.name || 'event'
    const cacheKey = `${evmChainId || 'unknown'}:${marketAddress || 'unknown'}:${eventName}:${from}-${to}`
    const cached = LICENSE_LOGS_CACHE.get(cacheKey)
    if (cached && Date.now() - cached.ts < LOG_CACHE_TTL) {
      return cached.logs
    }
    const logs = await publicClient.getLogs(args)
    LICENSE_LOGS_CACHE.set(cacheKey, { logs, ts: Date.now() })
    return logs
  }, [publicClient, evmChainId, marketAddress])

  const fetchLicenseStatus = React.useCallback(async (tokenId: number, abi: any) => {
    if (!publicClient || !marketAddress) return null
    const cacheKey = `${evmChainId || 'unknown'}:${marketAddress}:${tokenId}`
    const cached = LICENSE_STATUS_CACHE.get(cacheKey)
    const now = Date.now()
    if (cached && now - cached.ts < STATUS_CACHE_TTL) {
      return cached.data
    }
    const result = await publicClient.readContract({
      address: marketAddress as `0x${string}`,
      abi,
      functionName: 'licenseStatus',
      args: [BigInt(tokenId)]
    })
    LICENSE_STATUS_CACHE.set(cacheKey, { data: result, ts: now })
    return result
  }, [publicClient, marketAddress, evmChainId])

  const isES = locale === 'es'
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
  
  const chainName = React.useMemo(()=>{
    try {
      if (typeof evmChainId !== 'number') return 'EVM'
      const ch = Array.isArray(chains) ? chains.find((c:any)=> c?.id === evmChainId) : undefined
      return ch?.name || 'EVM'
    } catch {
      return 'EVM'
    }
  }, [evmChainId, chains])

  const toHttpFromIpfs = React.useCallback((u: string): string => {
    if (!u) return ''
    if (u.startsWith('ipfs://')) return `/api/ipfs/ipfs/${u.replace('ipfs://','')}`
    if (u.startsWith('/ipfs/')) return `/api/ipfs${u}`
    const cidv0 = /^Qm[1-9A-Za-z]{44}(?:\/.+)?$/
    const cidv1 = /^bafy[1-9A-Za-z]+(?:\/.+)?$/
    if (cidv0.test(u) || cidv1.test(u)) return `/api/ipfs/ipfs/${u}`
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

  const fmtBytes = React.useCallback((n?: number) => {
    if (n == null) return '-'
    const units = ['B','KB','MB','GB','TB']
    let v = n
    let u = 0
    while (v >= 1024 && u < units.length - 1) { v /= 1024; u++ }
    return `${v.toFixed(u===0 ? 0 : 1)} ${units[u]}`
  }, [])

  const inferFileType = React.useCallback((nameOrUrl: string): string => {
    try {
      const clean = nameOrUrl.split('?')[0].split('#')[0]
      const m = clean.match(/\.([a-zA-Z0-9]+)$/)
      const ext = (m ? m[1] : '').toLowerCase()
      if (!ext) return 'file'
      const map: Record<string,string> = {
        'pt':'PyTorch', 'pth':'PyTorch', 'bin':'Binary', 'safetensors':'Safetensors', 'onnx':'ONNX', 'gguf':'GGUF', 'ggml':'GGML',
        'json':'JSON', 'yaml':'YAML', 'yml':'YAML', 'txt':'Text', 'md':'Markdown', 'zip':'ZIP', 'tar':'TAR', 'gz':'GZIP',
        'ckpt':'Checkpoint', 'h5':'HDF5', 'pdf':'PDF', 'csv':'CSV'
      }
      return map[ext] || ext.toUpperCase()
    } catch { return 'file' }
  }, [])

  const openArtifactsDialog = React.useCallback(async (tokenId: number, kind: 'api'|'download') => {
    try {
      if (!publicClient || !marketAddress) return
      setDlgTitle(kind === 'api' ? 'API Artifacts' : 'Download Artifacts')
      setDlgItems([])
      setDlgNotes('')
      setDlgLoading(true)
      setDlgOpen(true)
      // 1) Resolve modelId via cached mapping or paginated log scan
      let modelId = licenseModelCache.current.get(tokenId) || 0
      if (!modelId) {
        const abi: any = (MARKET_ARTIFACT as any).abi
        const event = (abi as any).find((e:any)=> e.type==='event' && e.name==='LicenseMinted')
        const latest = await publicClient.getBlockNumber()
        // Use centralized block scanning configuration
        const STEP = INDEXER_CONFIG.SCAN_STEP_SIZE
        let to = latest
        let found: any = null
        for (let i = 0; i < INDEXER_CONFIG.MAX_ITERATIONS && to > 0n; i++) {
          const from = to > STEP ? (to - STEP + 1n) : 0n
          try {
            const chunk = await getLogsMemoized({ address: marketAddress as `0x${string}`, event, fromBlock: from, toBlock: to })
            for (const l of chunk) {
              try { if (Number((l as any).args?.licenseId) === tokenId) { found = l; break } } catch {}
            }
            if (found) break
          } catch {}
          if (to === 0n) break
          to = from > 0n ? (from - 1n) : 0n
        }
        modelId = found ? Number((found as any).args?.modelId || 0) : 0
        if (modelId) rememberModelId(tokenId, modelId)
      }
      if (!modelId) { setDlgLoading(false); setDlgItems([]); setSnkSev('warning'); setSnkMsg('Could not resolve model for this license.'); setSnkOpen(true); return }
      // 2) Fetch model info (to get URI)
      const url = `/api/models/evm/${modelId}?chainId=${evmChainId}`
      const r = await fetch(url, { cache: 'no-store' })
      const j = await r.json().catch(()=>null)
      const modelName: string | undefined = j?.data?.name || j?.data?.data?.name || j?.data?.model?.name || j?.data?.name
      if (modelName) setDlgTitle(`${modelName} · Artifacts`)
      const uri: string | undefined = j?.data?.uri || j?.data?.data?.uri || j?.data?.model?.uri || j?.data?.uri
      if (!uri) { setDlgLoading(false); setDlgItems([]); return }
      // 3) Fetch metadata and extract artifacts
      const metaUrl = uri.startsWith('http') ? uri : toHttpFromIpfs(uri)
      const mr = await fetch(metaUrl, { cache: 'no-store' })
      const meta = await mr.json().catch(()=>null)
      const items: Array<{ name: string; url: string; type: string; size?: number }> = []
      const pushItem = (name: string, url: string, size?: number) => { if (url) { const http = toHttpFromIpfs(url); const baseName = name || http.split('/').pop() || 'artifact'; items.push({ name: baseName, url: http, type: inferFileType(baseName || http), size }) } }
      if (meta) {
        if (Array.isArray(meta?.artifacts)) {
          for (const it of meta.artifacts) {
            const name = String(it?.filename || it?.name || it?.file || it?.path || it?.cid || '')
            const url = String(it?.url || it?.uri || it?.cid || '')
            const size = Number(it?.sizeBytes ?? it?.size ?? it?.bytes)
            if (url) pushItem(name, url, Number.isFinite(size) ? size : undefined)
          }
        }
        if (!items.length && Array.isArray(meta?.assets)) {
          for (const it of meta.assets) {
            const name = String(it?.filename || it?.name || it?.file || it?.path || it?.cid || 'asset')
            const url = String(it?.url || it?.uri || it?.cid || '')
            const size = Number(it?.sizeBytes ?? it?.size ?? it?.bytes)
            if (url) pushItem(name, url, Number.isFinite(size) ? size : undefined)
          }
        }
        if (!items.length && Array.isArray(meta?.files)) {
          for (const it of meta.files) {
            const name = String(it?.filename || it?.name || it?.file || it?.path || it?.cid || 'file')
            const url = String(it?.url || it?.uri || it?.cid || '')
            const size = Number(it?.sizeBytes ?? it?.size ?? it?.bytes)
            if (url) pushItem(name, url, Number.isFinite(size) ? size : undefined)
          }
        }
        if (!items.length && typeof meta?.download === 'string') {
          pushItem('download', meta.download)
        }
        const notes = (meta?.downloadNotes || meta?.notes || meta?.deliveryNotes || '')
        if (typeof notes === 'string') setDlgNotes(notes)
      }
      setDlgItems(items)
    } catch (e:any) {
      setSnkSev('error'); setSnkMsg(String(e?.message || e || 'Failed to load artifacts')); setSnkOpen(true)
    } finally {
      setDlgLoading(false)
    }
  }, [publicClient, marketAddress, evmChainId, toHttpFromIpfs, getLogsMemoized, rememberModelId])

  // NEW: Load licenses from indexed API (FAST!)
  const load = React.useCallback(async () => {
    try {
      if (!address) return
      setLoading(true)
      
      // Fetch from indexed API (instant!)
      const response = await fetch(
        `/api/indexed/licenses?userAddress=${address}&chainId=${evmChainId}`,
        { cache: 'no-store' }
      )
      
      if (!response.ok) throw new Error('Failed to fetch licenses')
      
      const data = await response.json()
      
      // Transform to match existing UI format
      // Filter only perpetual licenses (kind === 0) for hackathon MVP
      const perpetualLicenses = data.licenses.filter((lic: any) => lic.kind === 0)
      const items = perpetualLicenses.map((lic: any) => {
        const metadata = lic.model_metadata || {}
        
        // Create viewModel from metadata if available
        let viewModel = null
        try {
          if (metadata && Object.keys(metadata).length > 0) {
            viewModel = createViewModelFromPublished({
              ...metadata,
              artifacts: metadata.artifacts || [],
            })
          }
        } catch {}
        
        return {
          tokenId: lic.token_id,
          modelId: lic.model_id,
          modelName: lic.model_name || `Model #${lic.model_id}`,
          revoked: lic.revoked,
          validApi: lic.valid_api,
          validDownload: lic.valid_download,
          kind: lic.kind,
          expiresAt: Number(lic.expires_at),
          owner: lic.owner,
          modelData: {
            name: lic.model_name,
            uri: lic.model_uri,
            imageUrl: lic.model_image,
            ...metadata,
            artifactsList: metadata.artifacts || [],
            download_notes: metadata.downloadNotes || '',
          },
          viewModel,
        }
      })
      
      setRows(items)
    } catch (e: any) {
      setSnkSev('error')
      setSnkMsg(String(e?.message || e || 'Failed to load licenses'))
      setSnkOpen(true)
    } finally {
      setLoading(false)
    }
  }, [address, evmChainId])

  React.useEffect(() => { if (isConnected) load() }, [isConnected, evmChainId, load])

  const needsSwitch = isConnected && chain?.id !== evmChainId

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
        <Stack spacing={2}>
          <Typography variant="h4" fontWeight={800} sx={{ color:'oklch(0.99 0 0)' }}>My licenses</Typography>
          {!isConnected && (
            <Alert severity="info" sx={{ bgcolor:'rgba(36,48,68,0.5)', color:'#b9d7ff', border:'1px solid rgba(120,150,200,0.25)' }}>Connect your wallet to view your licenses.</Alert>
          )}
          {isConnected && needsSwitch && (
            <Alert severity="warning" action={
              <Button color="inherit" size="small" onClick={async()=>{ try { await switchChainAsync({ chainId: evmChainId }) } catch {} }}>Switch</Button>
            } sx={{ bgcolor:'rgba(255,193,7,0.10)', border:'1px solid rgba(255,193,7,0.32)' }}>You are on the wrong network. Please switch to the target network.</Alert>
          )}
          {isConnected && !needsSwitch && (
            <Box sx={{
              borderRadius: '16px',
              border:'1px solid',
              borderColor:'oklch(0.22 0 0)',
              background:'linear-gradient(180deg, rgba(22,26,36,0.6), rgba(12,15,24,0.6))',
              boxShadow:'0 0 0 1px rgba(255,255,255,0.02) inset, 0 8px 24px rgba(0,0,0,0.35)',
              backdropFilter:'blur(8px)',
              p: { xs:2, md:3 }
            }}>
              {loading ? (
                <Stack alignItems="center" sx={{ py: 4 }}>
                  <CircularProgress />
                </Stack>
              ) : rows.length === 0 ? (
                <Typography variant="body2" sx={{ color:'oklch(0.78 0 0)', py: 4, textAlign:'center' }}>
                  {isES ? 'No se encontraron licencias para esta wallet en las últimas 200 licencias emitidas.' : 'No licenses found for this wallet in the last 200 issued licenses.'}
                </Typography>
              ) : (
                <TableContainer component={Paper} sx={{ background:'transparent', boxShadow:'none', borderRadius:2, border:'1px solid rgba(255,255,255,0.08)' }}>
                  <Table size="small" sx={{ minWidth: 650, '& th, & td': { borderColor:'rgba(255,255,255,0.08)', color:'#ffffffd6' } }}>
                    <TableHead>
                      <TableRow>
                        <TableCell>{isES ? 'NFT' : 'NFT'}</TableCell>
                        <TableCell>{isES ? 'Modelo' : 'Model'}</TableCell>
                        <TableCell>{isES ? 'Tipo' : 'Type'}</TableCell>
                        <TableCell>{isES ? 'Estado' : 'Status'}</TableCell>
                        <TableCell>{isES ? 'Artifacts' : 'Artifacts'}</TableCell>
                        <TableCell align="right">{isES ? 'Acciones' : 'Actions'}</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {rows.map((license) => {
                        const modelData = license.modelData
                        const modelNameFromVm = license.viewModel?.step1?.name
                        const modelDisplayName = modelNameFromVm || license.modelName || (license.modelId ? `Model #${license.modelId}` : isES ? 'Modelo desconocido' : 'Unknown model')
                        const subType = license.kind === 0 ? (isES ? 'Perpetua' : 'Perpetual') : (isES ? 'Suscripción' : 'Subscription')
                        const expiresAt = license.expiresAt ? new Date(license.expiresAt * 1000) : null
                        const isActive = !license.revoked && (license.kind === 0 || (expiresAt && expiresAt.getTime() > Date.now()))
                        const artifactsCount = modelData?.artifactsList?.length || 0

                        return (
                          <TableRow key={license.tokenId} hover>
                            <TableCell>
                              <Stack spacing={0.5}>
                                <Typography variant="body2" sx={{ fontWeight:700, color:'#fff' }}>#{license.tokenId}</Typography>
                                {license.modelId && (
                                  <Typography variant="caption" sx={{ color:'#ffffff99' }}>
                                    ID: {license.modelId}
                                  </Typography>
                                )}
                              </Stack>
                            </TableCell>
                            <TableCell>
                              <Stack spacing={0.25}>
                                <Typography variant="body2" sx={{ fontWeight:600, color:'#fff' }}>{modelDisplayName}</Typography>
                                {license.viewModel?.step1?.tagline && (
                                  <Typography variant="caption" sx={{ color:'#ffffff99' }}>{license.viewModel.step1.tagline}</Typography>
                                )}
                                {license.modelId && (
                                  <Button
                                    variant="text"
                                    size="small"
                                    component={Link}
                                    href={`/${locale}/evm/models/${license.modelId}`}
                                    sx={{ color:'#7ec8ff', textTransform:'none', fontSize:'0.7rem', p:0, alignSelf:'flex-start' }}
                                  >
                                    {isES ? 'Ver modelo' : 'View model'}
                                  </Button>
                                )}
                              </Stack>
                            </TableCell>
                            <TableCell>
                              <Chip 
                                label={subType}
                                size="small"
                                sx={{
                                  bgcolor: license.kind === 0 ? 'rgba(76,175,80,0.18)' : 'rgba(33,150,243,0.18)',
                                  color: license.kind === 0 ? '#7feb9c' : '#7ec8ff',
                                  fontWeight:600,
                                  fontSize:'0.7rem'
                                }}
                              />
                              {license.kind === 1 && expiresAt && (
                                <Typography variant="caption" sx={{ display:'block', color:'#ffffff99', mt:0.25 }}>
                                  {isES ? 'Expira:' : 'Expires:'} {expiresAt.toLocaleDateString()}
                                </Typography>
                              )}
                            </TableCell>
                            <TableCell>
                              {license.revoked ? (
                                <Chip size="small" label={isES ? 'Revocada' : 'Revoked'} color="error" sx={{ fontSize:'0.7rem' }} />
                              ) : isActive ? (
                                <Chip size="small" label={isES ? 'Activa' : 'Active'} sx={{ fontSize:'0.7rem', bgcolor:'rgba(76,175,80,0.2)', color:'#7feb9c' }} />
                              ) : (
                                <Chip size="small" label={isES ? 'Expirada' : 'Expired'} sx={{ fontSize:'0.7rem', bgcolor:'rgba(255,255,255,0.08)', color:'#ffffffb3' }} />
                              )}
                            </TableCell>
                            <TableCell>
                              {license.validDownload ? (
                                <Stack direction="row" spacing={0.5} alignItems="center">
                                  <Chip label={`${artifactsCount || 0}`} size="small" sx={{ bgcolor:'rgba(255,255,255,0.08)', color:'#ffffffcc', fontSize:'0.7rem' }} />
                                  <Button
                                    variant="text"
                                    size="small"
                                    startIcon={<DownloadIcon fontSize="small" />}
                                    onClick={() => {
                                      setSelectedLicense(license)
                                      setArtifactsDrawerOpen(true)
                                    }}
                                    sx={{ color:'#7ec8ff', textTransform:'none', fontSize:'0.8rem' }}
                                  >
                                    {isES ? 'Descargar' : 'Download'}
                                  </Button>
                                </Stack>
                              ) : (
                                <Typography variant="caption" sx={{ color:'#ffffff66' }}>
                                  {isES ? 'Sin acceso' : 'No access'}
                                </Typography>
                              )}
                            </TableCell>
                            <TableCell align="right">
                              <Stack direction="row" spacing={1} justifyContent="flex-end">
                                <Button
                                  variant="outlined"
                                  size="small"
                                  startIcon={<VisibilityIcon fontSize="small" />}
                                  sx={{
                                    borderColor:'rgba(255,255,255,0.18)',
                                    color:'#ffffffcc',
                                    textTransform:'none',
                                    fontSize:'0.75rem',
                                    px:1.5
                                  }}
                                  onClick={() => {
                                    setViewLicense(license)
                                    setViewDrawerOpen(true)
                                  }}
                                >
                                  {isES ? 'Ver NFT' : 'View NFT'}
                                </Button>
                              </Stack>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Box>
          )}
        </Stack>
        <Snackbar open={snkOpen} autoHideDuration={6000} onClose={()=> setSnkOpen(false)} anchorOrigin={{ vertical:'bottom', horizontal:'center' }}>
          <Alert onClose={()=> setSnkOpen(false)} severity={snkSev} sx={{ width: '100%' }}>
            {snkMsg}
          </Alert>
        </Snackbar>
      </Container>
      
      {/* Drawer: Artifacts list */}
      <Drawer
        anchor="right"
        open={artifactsDrawerOpen}
        onClose={() => setArtifactsDrawerOpen(false)}
        PaperProps={{
          sx: {
            width: { xs: '100%', sm: 600, md: 700 },
            bgcolor: 'rgba(20,26,42,0.98)',
            backgroundImage: 'linear-gradient(180deg, rgba(38,46,64,0.95), rgba(20,26,42,0.95))',
            borderLeft: '1px solid rgba(255,255,255,0.08)',
            backdropFilter: 'blur(10px)'
          }
        }}
      >
        <Box sx={{ p: 3 }}>
          {/* Header */}
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 3 }}>
            <Box>
              <Typography variant="h6" sx={{ color: '#fff', fontWeight: 700, mb: 0.5 }}>
                {selectedLicense?.modelName || (isES ? 'Artifacts del modelo' : 'Model artifacts')}
              </Typography>
              <Typography variant="caption" sx={{ color: '#ffffffb3' }}>
                {isES ? 'Licencia NFT' : 'License NFT'} #{selectedLicense?.tokenId} • {selectedLicense?.kind === 0 ? (isES ? 'Perpetua' : 'Perpetual') : (isES ? 'Suscripción' : 'Subscription')}
              </Typography>
            </Box>
            <IconButton onClick={() => setArtifactsDrawerOpen(false)} sx={{ color: '#ffffffb3' }}>
              <CloseIcon />
            </IconButton>
          </Stack>

          {/* Artifacts table */}
          {selectedLicense?.modelData?.artifactsList && selectedLicense.modelData.artifactsList.length > 0 ? (
            <Box sx={{ bgcolor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 2, overflow: 'hidden' }}>
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: 'rgba(255,255,255,0.03)' }}>
                    <TableCell sx={{ color: '#ffffffb3', fontWeight: 600, fontSize: '0.75rem', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                      {isES ? 'Archivo' : 'File'}
                    </TableCell>
                    <TableCell sx={{ color: '#ffffffb3', fontWeight: 600, fontSize: '0.75rem', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                      CID
                    </TableCell>
                    <TableCell sx={{ color: '#ffffffb3', fontWeight: 600, fontSize: '0.75rem', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                      {isES ? 'Tamaño' : 'Size'}
                    </TableCell>
                    <TableCell sx={{ color: '#ffffffb3', fontWeight: 600, fontSize: '0.75rem', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                      {isES ? 'Acciones' : 'Actions'}
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {selectedLicense.modelData.artifactsList.map((artifact: any, idx: number) => (
                    <TableRow key={idx} sx={{ '&:hover': { bgcolor: 'rgba(255,255,255,0.03)' } }}>
                      <TableCell sx={{ color: '#ffffffcc', fontSize: '0.85rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <Typography variant="body2" sx={{ color: '#fff', fontWeight: 500, fontSize: '0.85rem' }}>
                          {artifact.filename || (isES ? 'Sin nombre' : 'Unnamed')}
                        </Typography>
                        {artifact.role && (
                          <Typography variant="caption" sx={{ color: '#ffffffb3', fontSize: '0.7rem' }}>
                            {artifact.role}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell sx={{ color: '#ffffffcc', fontSize: '0.75rem', fontFamily: 'monospace', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <Tooltip title={artifact.cid || ''}>
                          <Typography variant="caption" sx={{ fontFamily: 'monospace', fontSize: '0.7rem', color: '#ffffffb3' }}>
                            {artifact.cid ? `${artifact.cid.slice(0, 8)}...${artifact.cid.slice(-6)}` : '—'}
                          </Typography>
                        </Tooltip>
                      </TableCell>
                      <TableCell sx={{ color: '#ffffffcc', fontSize: '0.85rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        {artifact.sizeBytes ? (
                          <Typography variant="caption" sx={{ color: '#ffffffb3', fontSize: '0.75rem' }}>
                            {(artifact.sizeBytes / 1024 / 1024).toFixed(2)} MB
                          </Typography>
                        ) : '—'}
                      </TableCell>
                      <TableCell sx={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <Stack direction="row" spacing={0.5}>
                          {artifact.cid && (
                            <Tooltip title={isES ? 'Copiar CID' : 'Copy CID'}>
                              <IconButton
                                size="small"
                                onClick={() => {
                                  navigator.clipboard.writeText(artifact.cid)
                                  setSnkSev('success')
                                  setSnkMsg(isES ? 'CID copiado' : 'CID copied')
                                  setSnkOpen(true)
                                }}
                                sx={{ color: '#ffffffb3', '&:hover': { color: '#fff', bgcolor: 'rgba(255,255,255,0.08)' } }}
                              >
                                <ContentCopyIcon sx={{ fontSize: '1rem' }} />
                              </IconButton>
                            </Tooltip>
                          )}
                          {artifact.uri && (
                            <Tooltip title={isES ? 'Copiar URI' : 'Copy URI'}>
                              <IconButton
                                size="small"
                                onClick={() => {
                                  navigator.clipboard.writeText(artifact.uri)
                                  setSnkSev('success')
                                  setSnkMsg(isES ? 'URI copiado' : 'URI copied')
                                  setSnkOpen(true)
                                }}
                                sx={{ color: '#ffffffb3', '&:hover': { color: '#fff', bgcolor: 'rgba(255,255,255,0.08)' } }}
                              >
                                <LanguageIcon sx={{ fontSize: '1rem' }} />
                              </IconButton>
                            </Tooltip>
                          )}
                          {artifact.cid && (
                            <Tooltip title={isES ? 'Descargar' : 'Download'}>
                              <IconButton
                                size="small"
                                component="a"
                                href={`/api/ipfs/ipfs/${artifact.cid}`}
                                download={artifact.filename || 'artifact'}
                                target="_blank"
                                sx={{ color: '#ffffffb3', '&:hover': { color: '#fff', bgcolor: 'rgba(255,255,255,0.08)' } }}
                              >
                                <DownloadIcon sx={{ fontSize: '1rem' }} />
                              </IconButton>
                            </Tooltip>
                          )}
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          ) : (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <Typography variant="body2" sx={{ color: '#ffffffb3', mb: 1 }}>
                {isES ? 'No hay artifacts disponibles' : 'No artifacts available'}
              </Typography>
              <Typography variant="caption" sx={{ color: '#ffffff99' }}>
                {isES ? 'Este modelo no tiene archivos para descargar' : 'This model has no files to download'}
              </Typography>
            </Box>
          )}

          {/* Instructions to download and run */}
          {selectedLicense?.modelData?.download_notes && (
            <Box sx={{ mt: 3 }}>
              <Typography variant="subtitle2" sx={{ color: '#fff', fontWeight: 700, mb: 1.5, fontSize: '0.95rem' }}>
                {isES ? 'Instrucciones para descargar y ejecutar el modelo' : 'Instructions to download and run the model'}
              </Typography>
              <Box 
                sx={{ 
                  p: 2, 
                  bgcolor: 'rgba(255,255,255,0.02)', 
                  border: '1px solid rgba(255,255,255,0.08)', 
                  borderRadius: 2,
                  '& pre': {
                    margin: 0,
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    fontFamily: 'monospace',
                    fontSize: '0.8rem',
                    color: '#ffffffcc'
                  }
                }}
              >
                <pre>{selectedLicense.modelData.download_notes}</pre>
              </Box>
            </Box>
          )}

          {/* Download notice */}
          {selectedLicense && !selectedLicense.validDownload && (
            <Box sx={{ mt: 2, p: 2, bgcolor: 'rgba(255,152,0,0.1)', border: '1px solid rgba(255,152,0,0.3)', borderRadius: 2 }}>
              <Typography variant="caption" sx={{ color: '#ffa726', fontSize: '0.8rem' }}>
                ⚠️ {isES ? 'Descarga no permitida por esta licencia' : 'Download not allowed by this license'}
              </Typography>
            </Box>
          )}
        </Box>
      </Drawer>

      <Dialog open={dlgOpen} onClose={()=> setDlgOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{
          m: 0,
          py: 1.5,
          px: 2,
          color: '#fff',
          background: 'linear-gradient(180deg, rgba(20,26,42,0.85), rgba(12,15,24,0.85))',
          borderBottom: '1px solid rgba(255,255,255,0.12)',
          position: 'relative'
        }}>
          {dlgTitle}
          <IconButton aria-label="close" onClick={()=> setDlgOpen(false)} sx={{ position:'absolute', right: 8, top: 8, color:'#ffffffcc' }}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ bgcolor:'rgba(12,15,24,0.9)' }}>
          {dlgLoading ? (
            <Stack sx={{ alignItems:'center', justifyContent:'center', py:4 }}>
              <CircularProgress size={28} />
            </Stack>
          ) : dlgItems.length === 0 ? (
            <Typography variant="body2" sx={{ color:'oklch(0.78 0 0)' }}>No artifacts were found for this license.</Typography>
          ) : (
            <>
            <Table size="small" sx={{ '& th, & td': { borderColor:'oklch(0.22 0 0)', color:'oklch(0.98 0 0)' }, '& thead th': { color:'oklch(0.90 0 0)' } }}>
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell align="right">Size</TableCell>
                  <TableCell align="right">Download</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {dlgItems.map((it, idx)=> (
                  <TableRow key={`${it.name}-${idx}`}>
                    <TableCell>{it.name}</TableCell>
                    <TableCell>{it.type}</TableCell>
                    <TableCell align="right">{fmtBytes(it.size)}</TableCell>
                    <TableCell align="right">
                      <IconButton href={it.url} download sx={{ color:'#fff' }} aria-label={`download-${it.name}`}>
                        <DownloadIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {dlgNotes && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2" sx={{ color:'oklch(0.90 0 0)' }}>Download notes</Typography>
                <Typography variant="body2" sx={{ color:'oklch(0.80 0 0)', whiteSpace:'pre-wrap' }}>{dlgNotes}</Typography>
              </Box>
            )}
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Drawer: View NFT Card */}
      <Drawer
        anchor="right"
        open={viewDrawerOpen}
        onClose={() => setViewDrawerOpen(false)}
        PaperProps={{
          sx: {
            width: { xs: '100%', sm: 480 },
            bgcolor: 'rgba(10,16,28,0.98)',
            backgroundImage: 'linear-gradient(180deg, rgba(22,26,36,0.95), rgba(10,16,28,0.95))',
            borderLeft: '1px solid rgba(255,255,255,0.08)',
            backdropFilter: 'blur(10px)'
          }
        }}
      >
        {viewLicense && (
          <Box sx={{ p: 3, height:'100%', display:'flex', flexDirection:'column' }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb:2 }}>
              <Box>
                <Typography variant="h6" sx={{ color:'#fff', fontWeight:700 }}>
                  {viewLicense.modelName || (viewLicense.modelId ? `Model #${viewLicense.modelId}` : isES ? 'Modelo' : 'Model')}
                </Typography>
                <Typography variant="caption" sx={{ color:'#ffffff99' }}>
                  {isES ? 'Licencia NFT' : 'License NFT'} #{viewLicense.tokenId}
                </Typography>
              </Box>
              <IconButton onClick={() => setViewDrawerOpen(false)} sx={{ color:'#ffffffb3' }}>
                <CloseIcon />
              </IconButton>
            </Stack>

            <Box sx={{
              borderRadius:2,
              border:'1px solid rgba(255,255,255,0.08)',
              overflow:'hidden',
              boxShadow:'0 12px 32px rgba(0,0,0,0.45)'
            }}>
              {viewLicense.modelData?.imageUrl ? (
                <Box component="img"
                  src={viewLicense.modelData.imageUrl}
                  alt={viewLicense.modelName || 'Model'}
                  sx={{ width:'100%', height:220, objectFit:'cover' }}
                />
              ) : (
                <Box sx={{ height:220, bgcolor:'rgba(255,255,255,0.04)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <Typography variant="caption" sx={{ color:'#ffffff80' }}>
                    {isES ? 'Sin imagen' : 'No image'}
                  </Typography>
                </Box>
              )}

              <Box sx={{ p:2.5, bgcolor:'rgba(255,255,255,0.01)' }}>
                <Stack spacing={1.5}>
                  <Typography variant="body2" sx={{ color:'#fff', fontWeight:700 }}>
                    {viewLicense.viewModel?.step1?.name || viewLicense.modelName}
                  </Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap">
                    <Chip 
                      label={viewLicense.kind === 0 ? (isES ? 'Perpetua' : 'Perpetual') : (isES ? 'Suscripción' : 'Subscription')}
                      size="small"
                      sx={{
                        bgcolor: viewLicense.kind === 0 ? 'rgba(76,175,80,0.18)' : 'rgba(33,150,243,0.18)',
                        color: viewLicense.kind === 0 ? '#7feb9c' : '#7ec8ff',
                        fontWeight:600,
                        fontSize:'0.7rem'
                      }}
                    />
                    {viewLicense.validApi && (
                      <Chip size="small" label="API" icon={<ApiIcon sx={{ fontSize:'0.8rem' }} />} variant="outlined" sx={{ color:'#ffffffcc', borderColor:'rgba(255,255,255,0.2)', fontSize:'0.65rem' }} />
                    )}
                    {viewLicense.validDownload && (
                      <Chip size="small" label={isES ? 'Descarga' : 'Download'} icon={<DownloadIcon sx={{ fontSize:'0.8rem' }} />} variant="outlined" sx={{ color:'#ffffffcc', borderColor:'rgba(255,255,255,0.2)', fontSize:'0.65rem' }} />
                    )}
                  </Stack>
                  {viewLicense.viewModel?.step1?.summary && (
                    <Typography variant="body2" sx={{ color:'#ffffffcc', lineHeight:1.5 }}>
                      {viewLicense.viewModel.step1.summary}
                    </Typography>
                  )}
                </Stack>
              </Box>
            </Box>
          </Box>
        )}
      </Drawer>
    </Box>
  )
}

export default EvmLicensesPageImpl
