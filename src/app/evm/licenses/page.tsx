"use client";
import React from 'react'
import { useAccount, useChainId as useEvmChainId, usePublicClient, useSwitchChain } from 'wagmi'
import {
  Container, Box, Stack, Typography, Button, Divider, Alert, Table, TableHead, TableRow, TableCell, TableBody, Chip, CircularProgress, Snackbar, Dialog, DialogTitle, DialogContent, IconButton
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import DownloadIcon from '@mui/icons-material/Download'
import MARKET_ARTIFACT from '@/abis/Marketplace.json'
import NextDynamic from 'next/dynamic'
import Link from 'next/link'
import { useLocale } from 'next-intl'

export const dynamic = 'force-dynamic'

function useMarketAddress(chainId: number | undefined) {
  return React.useMemo(() => {
    try {
      if (typeof chainId !== 'number') return undefined
      const map: Record<number, `0x${string}` | undefined> = {
        43113: (process.env.NEXT_PUBLIC_EVM_MARKET_43113 as any),
        43114: (process.env.NEXT_PUBLIC_EVM_MARKET_43114 as any),
        84532: (process.env.NEXT_PUBLIC_EVM_MARKET_84532 as any),
        8453: (process.env.NEXT_PUBLIC_EVM_MARKET_8453 as any),
      }
      return map[chainId]
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

  const [loading, setLoading] = React.useState(false)
  const [rows, setRows] = React.useState<any[]>([])
  const [snkOpen, setSnkOpen] = React.useState(false)
  const [snkMsg, setSnkMsg] = React.useState('')
  const [snkSev, setSnkSev] = React.useState<'success'|'error'|'info'|'warning'>('info')

  const [dlgOpen, setDlgOpen] = React.useState(false)
  const [dlgTitle, setDlgTitle] = React.useState<string>('Artifacts')
  const [dlgItems, setDlgItems] = React.useState<Array<{ name: string; url: string; type: string; size?: number }>>([])
  const [dlgLoading, setDlgLoading] = React.useState(false)
  const [dlgNotes, setDlgNotes] = React.useState<string>('')
  const licenseModelCache = React.useRef<Map<number, number>>(new Map())

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
        const STEP = 2000n
        let to = latest
        let found: any = null
        for (let i = 0; i < 10000 && to > 0n; i++) {
          const from = to > STEP ? (to - STEP + 1n) : 0n
          try {
            const chunk = await publicClient.getLogs({ address: marketAddress as `0x${string}`, event, fromBlock: from, toBlock: to })
            for (const l of chunk) {
              try { if (Number((l as any).args?.licenseId) === tokenId) { found = l; break } } catch {}
            }
            if (found) break
          } catch {}
          if (to === 0n) break
          to = from > 0n ? (from - 1n) : 0n
        }
        modelId = found ? Number((found as any).args?.modelId || 0) : 0
        if (modelId) licenseModelCache.current.set(tokenId, modelId)
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
  }, [publicClient, marketAddress, evmChainId, toHttpFromIpfs])

  const load = React.useCallback(async () => {
    try {
      if (!publicClient) return
      if (!marketAddress) { setSnkSev('error'); setSnkMsg('Marketplace address is not configured for this network.'); setSnkOpen(true); return }
      setLoading(true)
      const abi: any = (MARKET_ARTIFACT as any).abi
      const lastId: bigint = await publicClient.readContract({ address: marketAddress as `0x${string}`, abi, functionName: 'lastLicenseId', args: [] }) as any
      const max = Number(lastId)
      const startFrom = Math.max(1, max - 199) // scan last 200 tokens
      const items: any[] = []
      for (let tokenId = max; tokenId >= startFrom; tokenId--) {
        try {
          const st: any = await publicClient.readContract({ address: marketAddress as `0x${string}`, abi, functionName: 'licenseStatus', args: [BigInt(tokenId)] })
          const owner: string = st?.[5]
          if (owner && address && owner.toLowerCase() === address.toLowerCase()) {
            items.push({
              tokenId,
              revoked: Boolean(st?.[0]),
              validApi: Boolean(st?.[1]),
              validDownload: Boolean(st?.[2]),
              kind: Number(st?.[3]) as 0|1,
              expiresAt: Number(st?.[4]) || 0,
              owner,
              modelId: undefined,
              modelName: undefined,
            })
          }
        } catch {}
      }
      // resolve modelId via logs for the collected tokenIds
      try {
        const need = new Set<number>(items.map(it=> it.tokenId))
        const map: Map<number, number> = new Map()
        const event = (abi as any).find((e:any)=> e.type==='event' && e.name==='LicenseMinted')
        const latest = await publicClient.getBlockNumber()
        const STEP = 2000n
        let to = latest
        for (let i = 0; i < 2000 && to > 0n && map.size < need.size; i++) {
          const from = to > STEP ? (to - STEP + 1n) : 0n
          try {
            const logs = await publicClient.getLogs({ address: marketAddress as `0x${string}`, event, fromBlock: from, toBlock: to })
            for (const l of logs) {
              try {
                const lic = Number((l as any).args?.licenseId)
                if (need.has(lic) && !map.has(lic)) {
                  const mid = Number((l as any).args?.modelId || 0)
                  if (mid) map.set(lic, mid)
                }
              } catch {}
            }
          } catch {}
          if (to === 0n) break
          to = from > 0n ? (from - 1n) : 0n
        }
        // fetch names for resolved modelIds
        const uniqModelIds = Array.from(new Set(Array.from(map.values())))
        const names = new Map<number, string>()
        await Promise.all(uniqModelIds.map(async (mid)=>{
          try {
            const r = await fetch(`/api/models/evm/${mid}?chainId=${evmChainId}`, { cache: 'no-store' })
            const j = await r.json().catch(()=>null)
            const nm: string | undefined = j?.data?.name || j?.data?.data?.name || j?.data?.model?.name || j?.data?.name
            if (nm) names.set(mid, nm)
          } catch {}
        }))
        items.forEach(it=>{ const mid = map.get(it.tokenId); if (mid) { it.modelId = mid; it.modelName = names.get(mid) || `Model #${mid}` } })
      } catch {}
      setRows(items)
    } catch (e:any) {
      setSnkSev('error'); setSnkMsg(String(e?.message || e || 'Failed to load licenses')) ; setSnkOpen(true)
    } finally {
      setLoading(false)
    }
  }, [publicClient, marketAddress, address])

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
              <Divider sx={{ mb: 2, borderColor:'oklch(0.22 0 0)' }} />
              {loading ? (
                <Stack alignItems="center" sx={{ py: 4 }}>
                  <CircularProgress />
                </Stack>
              ) : rows.length === 0 ? (
                <Typography variant="body2" sx={{ color:'oklch(0.78 0 0)' }}>No licenses found for this wallet in the last 200 issued licenses.</Typography>
              ) : (
                <Table size="small" sx={{
                  '& th, & td': { borderColor:'oklch(0.22 0 0)', color:'oklch(0.98 0 0)' },
                  '& thead th': { color:'oklch(0.90 0 0)' }
                }}>
                  <TableHead>
                    <TableRow>
                      <TableCell>Token ID</TableCell>
                      <TableCell>Model</TableCell>
                      <TableCell>Kind</TableCell>
                      <TableCell>Validity</TableCell>
                      <TableCell>Expires</TableCell>
                      <TableCell>Delivery</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {rows.map((r)=>{
                      const exp = r.expiresAt ? new Date(r.expiresAt * 1000) : null
                      return (
                        <TableRow key={r.tokenId}>
                          <TableCell>{r.tokenId}</TableCell>
                          <TableCell>
                            {r.modelId ? (
                              <Link href={`/${locale}/evm/models/${r.modelId}`} style={{ color:'#7cc8ff', textDecoration:'none' }}>
                                {r.modelName || `Model #${r.modelId}`}
                              </Link>
                            ) : (
                              <Typography variant="body2" sx={{ color:'oklch(0.78 0 0)' }}>—</Typography>
                            )}
                          </TableCell>
                          <TableCell>{r.kind === 0 ? 'Perpetual' : 'Subscription'}</TableCell>
                          <TableCell>
                            {r.revoked ? (
                              <Chip size="small" label="Revoked" color="error" />
                            ) : r.kind === 0 ? (
                              // Perpetual license: outlined green (text+border only)
                              <Chip size="small" label="Active" variant="outlined" sx={{ color:'success.main', borderColor:'success.main' }} />
                            ) : (
                              // Subscription: green filled if active, default if expired
                              <Chip size="small" label={exp && exp.getTime() > Date.now() ? 'Active' : 'Expired'} color={exp && exp.getTime() > Date.now() ? 'success' : 'default'} />
                            )}
                          </TableCell>
                          <TableCell>{exp ? exp.toLocaleString() : '-'}</TableCell>
                          <TableCell>
                            <Stack direction="row" spacing={1}>
                              {r.validApi && (
                                <Chip size="small" label="API" variant="outlined" onClick={()=> openArtifactsDialog(r.tokenId, 'api')} sx={{ cursor:'pointer', color:'#fff', borderColor:'rgba(255,255,255,0.28)' }} />
                              )}
                              {r.validDownload && (
                                <Chip size="small" label="Download" variant="outlined" onClick={()=> openArtifactsDialog(r.tokenId, 'download')} sx={{ cursor:'pointer', color:'#fff', borderColor:'rgba(255,255,255,0.28)' }} />
                              )}
                            </Stack>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
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
      <Dialog open={dlgOpen} onClose={()=> setDlgOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{
          m: 0,
          py: 1.5,
          px: 2,
          color: '#fff',
          background: 'linear-gradient(180deg, rgba(20,26,42,0.85) 0%, rgba(12,15,24,0.85) 100%)',
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
            <Stack alignItems="center" sx={{ py: 4 }}>
              <CircularProgress />
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
    </Box>
  )
}

export default NextDynamic(() => Promise.resolve(EvmLicensesPageImpl), { ssr: false })
