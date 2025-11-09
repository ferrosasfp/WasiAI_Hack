"use client";
import React from 'react'
import { useParams } from 'next/navigation'
import { useConfig } from 'wagmi'
import {
  Container, Box, Stack, Typography, Chip, Grid, Skeleton, Button, Divider,
  Card, CardContent, CardHeader, Tooltip, IconButton,
  Table, TableBody, TableCell, TableHead, TableRow,
  Dialog, DialogTitle, DialogContent, DialogActions
} from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import Link from 'next/link'
import { useChainId as useEvmChainId } from 'wagmi'

function useEvmModel(id: number | undefined) {
  const evmChainId = useEvmChainId()
  const [data, setData] = React.useState<any | null>(null)
  const [loading, setLoading] = React.useState(false)

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
              if (!m.description && typeof meta.description === 'string') m.description = meta.description
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
              m = { ...m, categories, tasks, tags, architectures, frameworks, precision, rights, deliveryMode }
            }
          } catch {}
        }
        if (alive) setData(m)
      } catch {
        if (alive) setData(null)
      } finally {
        if (alive) setLoading(false)
      }
    }
    load()
    return () => { alive = false }
  }, [id, evmChainId])

  return { data, loading, evmChainId }
}

export default function EvmModelDetailPage() {
  const params = useParams() as { id?: string }
  const id = params?.id ? Number(params.id) : undefined
  const { data, loading, evmChainId } = useEvmModel(id)
  const { chains } = useConfig() as any
  const [buyOpen, setBuyOpen] = React.useState(false)
  const demoAnchorRef = React.useRef<HTMLDivElement | null>(null)
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

  return (
    <Box>
      <Container maxWidth="lg" sx={{ py: { xs: 4, md: 6 } }}>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
          <Button component={Link} href="/" startIcon={<ArrowBackIcon />}>
            Back
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
        {!loading && data && (
          <Grid container spacing={3}>
            {/* Hero Resumen */}
            <Grid item xs={12} md={5}>
              <Card>
                <CardContent>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {data.imageUrl ? (
                    <img src={data.imageUrl} alt={data.name || 'cover'} style={{ width:'100%', borderRadius: 12, display:'block' }} />
                  ) : (
                    <Box sx={{ border: '1px dashed rgba(0,0,0,0.2)', borderRadius: 2, height: 300, display:'flex', alignItems:'center', justifyContent:'center' }}>
                      <Typography color="text.secondary">No cover</Typography>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={7}>
              <Card>
                <CardContent>
                  <Stack spacing={1}>
                    <Typography variant="h4" fontWeight={800}>{data.name || `Model #${id}`}</Typography>
                    {data.owner && (
                      <Typography variant="body2" color="text.secondary">Owner: {data.owner}</Typography>
                    )}
                    <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap:'wrap' }}>
                      {typeof data.price_perpetual === 'number' && data.price_perpetual > 0 && (
                        <Chip label={`Perpetual: ${(data.price_perpetual/1e18).toFixed(2)} ${evmSymbol}`} color="primary" />
                      )}
                      {typeof data.price_subscription === 'number' && data.price_subscription > 0 && (
                        <Chip label={`Subscription: ${(data.price_subscription/1e18).toFixed(2)} ${evmSymbol}/mo`} />
                      )}
                      {typeof data.version === 'number' && data.version > 0 && (
                        <Chip label={`v${data.version}`} />)
                      }
                    </Stack>
                    <Stack direction={{ xs:'column', sm:'row' }} spacing={1} sx={{ mt: 2 }}>
                      <Button variant="contained" onClick={()=> setBuyOpen(true)}>{'Comprar licencia'}</Button>
                      <Button variant="outlined" onClick={()=> demoAnchorRef.current?.scrollIntoView({ behavior: 'smooth' })} disabled={!data?.demoPreset}>{'Probar demo'}</Button>
                    </Stack>
                    <Divider sx={{ my: 2 }} />
                    {/* Chips principales */}
                    {(Array.isArray(data.categories) && data.categories.length > 0) && (
                      <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap:'wrap' }}>
                        {data.categories.map((c:string, i:number)=> (<Chip key={`cat-${i}`} label={c} size="small" />))}
                      </Stack>
                    )}
                    {(Array.isArray(data.tasks) && data.tasks.length > 0) && (
                      <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap:'wrap' }}>
                        {data.tasks.map((t:string, i:number)=> (<Chip key={`task-${i}`} label={t} size="small" color="secondary" variant="outlined" />))}
                      </Stack>
                    )}
                    {(Array.isArray(data.tags) && data.tags.length > 0) && (
                      <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap:'wrap' }}>
                        {data.tags.map((t:string, i:number)=> (<Chip key={`tag-${i}`} label={t} size="small" variant="outlined" />))}
                      </Stack>
                    )}
                    {(Array.isArray(data.architectures) || Array.isArray(data.frameworks) || Array.isArray(data.precision)) && (
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        {[...(data.architectures||[]), ...(data.frameworks||[]), ...(data.precision||[])].filter(Boolean).join(' • ')}
                      </Typography>
                    )}
                    <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap:'wrap' }}>
                      {data.deliveryMode === 'api' && (<Chip size="small" label="API" />)}
                      {data.deliveryMode === 'download' && (<Chip size="small" label="Download" />)}
                      {data.deliveryMode === 'both' && (<Chip size="small" label="API + Download" />)}
                      {data.rights?.api && (<Chip size="small" label="API rights" variant="outlined" />)}
                      {data.rights?.download && (<Chip size="small" label="Download rights" variant="outlined" />)}
                      {data.rights?.transferable && (<Chip size="small" label="Transferable" variant="outlined" />)}
                    </Stack>
                    {data.uri && (
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>URI: {data.uri}</Typography>
                    )}
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}
        {!loading && !data && (
          <Typography color="error">Model not found.</Typography>
        )}

        {/* Sección: Qué hace este modelo (Resumen extendido) */}
        {!loading && data && (
          <Box sx={{ mt: 4 }}>
            <Card>
              <CardHeader title={<Typography variant="h5" fontWeight={800}>{'Qué hace este modelo'}</Typography>} />
              <CardContent>
                <Stack spacing={2}>
                  <Typography variant="subtitle1" fontWeight={700}>{data.valueProposition || 'Propuesta de valor'}</Typography>
                  <Typography variant="body1" sx={{ whiteSpace:'pre-wrap' }}>{data.customerDescription || data.description || 'Descripción no especificada.'}</Typography>
                  {Array.isArray((data as any)?.expectedBusinessImpact) ? (
                    <Box>
                      <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>{'Impacto de negocio esperado'}</Typography>
                      <Stack component="ul" sx={{ pl: 3 }} spacing={0.5}>
                        {((data as any).expectedBusinessImpact as string[]).map((s, i)=>(<li key={i}><Typography variant="body2">{s}</Typography></li>))}
                      </Stack>
                    </Box>
                  ) : null}
                </Stack>
              </CardContent>
            </Card>
          </Box>
        )}

        {/* Sección: Ficha para clientes */}
        {!loading && data && (
          <Box sx={{ mt: 4 }}>
            <Card>
              <CardHeader title={<Typography variant="h5" fontWeight={800}>{'Ficha para clientes'}</Typography>} />
              <CardContent>
                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2" fontWeight={700}>{'Entradas y salidas'}</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>{'Qué entregan los usuarios y qué reciben.'}</Typography>
                    <Typography variant="body2">{(data as any).inputs || 'Entradas: No especificado'}</Typography>
                    <Typography variant="body2">{(data as any).outputs || 'Salidas: No especificado'}</Typography>
                    <Divider sx={{ my: 2 }} />
                    <Typography variant="subtitle2" fontWeight={700}>{'Ejemplos'}</Typography>
                    {Array.isArray((data as any)?.examples) && (data as any).examples.length > 0 ? (
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>{'Ejemplo de entrada'}</TableCell>
                            <TableCell>{'Respuesta del modelo'}</TableCell>
                            <TableCell>{'Nota'}</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {((data as any).examples as any[]).map((ex, i)=> (
                            <TableRow key={i}>
                              <TableCell>{ex.input || '-'}</TableCell>
                              <TableCell>{ex.output || '-'}</TableCell>
                              <TableCell>{ex.note || '-'}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <Typography variant="body2" color="text.secondary">{'El creador aún no ha añadido ejemplos.'}</Typography>
                    )}
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2" fontWeight={700}>{'Industrias y casos de uso'}</Typography>
                    <Typography variant="body2" fontWeight={700} sx={{ mt: 1 }}>{'Industrias'}</Typography>
                    <Stack direction="row" spacing={1} sx={{ flexWrap:'wrap', mt: 0.5 }}>
                      {Array.isArray((data as any)?.industries) ? ((data as any).industries as string[]).map((x,i)=>(<Chip key={i} label={x} size="small" />)) : <Typography variant="body2" color="text.secondary">{'No especificado'}</Typography>}
                    </Stack>
                    <Typography variant="body2" fontWeight={700} sx={{ mt: 1 }}>{'Casos de uso'}</Typography>
                    <Stack direction="row" spacing={1} sx={{ flexWrap:'wrap', mt: 0.5 }}>
                      {Array.isArray((data as any)?.useCases) ? ((data as any).useCases as string[]).map((x,i)=>(<Chip key={i} label={x} size="small" variant="outlined" />)) : <Typography variant="body2" color="text.secondary">{'No especificado'}</Typography>}
                    </Stack>
                    <Divider sx={{ my: 2 }} />
                    <Typography variant="subtitle2" fontWeight={700}>{'Limitaciones conocidas'}</Typography>
                    <Typography variant="body2">{(data as any).limitations || 'No especificado'}</Typography>
                    <Divider sx={{ my: 2 }} />
                    <Typography variant="subtitle2" fontWeight={700}>{'Usos prohibidos'}</Typography>
                    <Typography variant="body2">{(data as any).prohibited || 'No especificado'}</Typography>
                  </Grid>
                </Grid>
                <Divider sx={{ my: 3 }} />
                <Grid container spacing={2}>
                  <Grid item xs={12} md={4}>
                    <Card variant="outlined">
                      <CardHeader title={<Typography variant="subtitle2" fontWeight={700}>{'Privacidad'}</Typography>} />
                      <CardContent>
                        <Typography variant="body2">{(data as any).privacy || 'No especificado'}</Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Card variant="outlined">
                      <CardHeader title={<Typography variant="subtitle2" fontWeight={700}>{'Deploy'}</Typography>} />
                      <CardContent>
                        <Typography variant="body2">{(data as any).deploy || 'No especificado'}</Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Card variant="outlined">
                      <CardHeader title={<Typography variant="subtitle2" fontWeight={700}>{'Soporte'}</Typography>} />
                      <CardContent>
                        <Typography variant="body2">{(data as any).support || 'No especificado'}</Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Box>
        )}

        {/* Sección: Configuración técnica */}
        {!loading && data && (
          <Box sx={{ mt: 4 }}>
            <Card>
              <CardHeader title={<Typography variant="h5" fontWeight={800}>{'Configuración técnica'}</Typography>} />
              <CardContent>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2" fontWeight={700}>{'Capacidades'}</Typography>
                    <Stack direction="row" spacing={1} sx={{ flexWrap:'wrap', mt: 1 }}>
                      {Array.isArray(data.tasks) && data.tasks.length ? data.tasks.map((t:string, i:number)=>(<Chip key={i} label={t} size="small" />)) : <Typography variant="body2" color="text.secondary">{'No especificado'}</Typography>}
                    </Stack>
                    <Typography variant="subtitle2" fontWeight={700} sx={{ mt: 2 }}>{'Modalidades'}</Typography>
                    <Stack direction="row" spacing={1} sx={{ flexWrap:'wrap', mt: 1 }}>
                      {Array.isArray((data as any)?.modalities) && (data as any).modalities.length ? ((data as any).modalities as string[]).map((m,i)=>(<Chip key={i} label={m} size="small" variant="outlined" />)) : <Typography variant="body2" color="text.secondary">{'No especificado'}</Typography>}
                    </Stack>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2" fontWeight={700}>{'Arquitectura'}</Typography>
                    <Stack spacing={0.5} sx={{ mt: 1 }}>
                      <Typography variant="body2"><b>Frameworks:</b> {Array.isArray(data.frameworks) && data.frameworks.length ? data.frameworks.join(', ') : 'No especificado'}</Typography>
                      <Typography variant="body2"><b>Architectures:</b> {Array.isArray(data.architectures) && data.architectures.length ? data.architectures.join(', ') : 'No especificado'}</Typography>
                      <Typography variant="body2"><b>Precision:</b> {Array.isArray(data.precision) && data.precision.length ? data.precision.join(', ') : 'No especificado'}</Typography>
                      <Typography variant="body2"><b>Quantization:</b> {(data as any).quantization || 'No especificado'}</Typography>
                      <Typography variant="body2"><b>File formats:</b> {Array.isArray((data as any)?.fileFormats) ? ((data as any).fileFormats as string[]).join(', ') : 'No especificado'}</Typography>
                      <Typography variant="body2"><b>Model size:</b> {(data as any).modelSize || 'No especificado'}</Typography>
                      <Typography variant="body2"><b>Artifact size:</b> {(data as any).artifactSize || 'No especificado'}</Typography>
                    </Stack>
                  </Grid>
                </Grid>
                <Divider sx={{ my: 2 }} />
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2" fontWeight={700}>{'Runtime'}</Typography>
                    <Stack spacing={0.5} sx={{ mt: 1 }}>
                      <Typography variant="body2"><b>Python:</b> {(data as any).python || 'No especificado'}</Typography>
                      <Typography variant="body2"><b>CUDA:</b> {(data as any).cuda || 'No especificado'}</Typography>
                      <Typography variant="body2"><b>PyTorch:</b> {(data as any).pytorch || 'No especificado'}</Typography>
                      <Typography variant="body2"><b>cuDNN:</b> {(data as any).cudnn || 'No especificado'}</Typography>
                      <Typography variant="body2"><b>Sistemas:</b> {Array.isArray((data as any)?.systems) ? ((data as any).systems as string[]).join(', ') : 'No especificado'}</Typography>
                      <Typography variant="body2"><b>Aceleradores:</b> {Array.isArray((data as any)?.accelerators) ? ((data as any).accelerators as string[]).join(', ') : 'No especificado'}</Typography>
                      <Typography variant="body2"><b>Notas GPU:</b> {(data as any).gpuNotes || 'No especificado'}</Typography>
                    </Stack>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2" fontWeight={700}>{'Dependencias'}</Typography>
                    <Box component="pre" sx={{ bgcolor:'grey.50', p: 2, borderRadius: 1, fontSize: 12, whiteSpace:'pre-wrap', minHeight: 80 }}>
                      {(data as any).dependencies || 'No especificado'}
                    </Box>
                    <Divider sx={{ my: 2 }} />
                    <Typography variant="subtitle2" fontWeight={700}>{'Recursos mínimos'}</Typography>
                    <Grid container spacing={1} sx={{ mt: 0.5 }}>
                      <Grid item xs={12} sm={4}><Card variant="outlined"><CardContent><Typography variant="caption" color="text.secondary">VRAM mínima</Typography><Typography variant="body2">{(data as any).minVram || 'No especificado'}</Typography></CardContent></Card></Grid>
                      <Grid item xs={12} sm={4}><Card variant="outlined"><CardContent><Typography variant="caption" color="text.secondary">CPU cores</Typography><Typography variant="body2">{(data as any).minCpu || 'No especificado'}</Typography></CardContent></Card></Grid>
                      <Grid item xs={12} sm={4}><Card variant="outlined"><CardContent><Typography variant="caption" color="text.secondary">RAM recomendada</Typography><Typography variant="body2">{(data as any).recRam || 'No especificado'}</Typography></CardContent></Card></Grid>
                    </Grid>
                  </Grid>
                </Grid>
                <Divider sx={{ my: 2 }} />
                <Typography variant="subtitle2" fontWeight={700}>{'Opciones de inferencia'}</Typography>
                <Grid container spacing={1} sx={{ mt: 0.5 }}>
                  <Grid item xs={12} sm={4}><Card variant="outlined"><CardContent><Typography variant="caption" color="text.secondary">Max batch size</Typography><Typography variant="body2">{(data as any).maxBatch || 'No especificado'}</Typography></CardContent></Card></Grid>
                  <Grid item xs={12} sm={4}><Card variant="outlined"><CardContent><Typography variant="caption" color="text.secondary">Context length</Typography><Typography variant="body2">{(data as any).contextLength || 'No especificado'}</Typography></CardContent></Card></Grid>
                  <Grid item xs={12} sm={4}><Card variant="outlined"><CardContent><Typography variant="caption" color="text.secondary">Max tokens</Typography><Typography variant="body2">{(data as any).maxTokens || 'No especificado'}</Typography></CardContent></Card></Grid>
                  <Grid item xs={12} sm={4}><Card variant="outlined"><CardContent><Typography variant="caption" color="text.secondary">Sample rate (Hz)</Typography><Typography variant="body2">{(data as any).sampleRate || 'No especificado'}</Typography></CardContent></Card></Grid>
                  <Grid item xs={12} sm={4}><Card variant="outlined"><CardContent><Typography variant="caption" color="text.secondary">Triton</Typography><Typography variant="body2">{(data as any).triton ? 'Sí' : 'No especificado'}</Typography></CardContent></Card></Grid>
                  <Grid item xs={12} sm={4}><Card variant="outlined"><CardContent><Typography variant="caption" color="text.secondary">Resolución imagen</Typography><Typography variant="body2">{(data as any).imageResolution || 'No especificado'}</Typography></CardContent></Card></Grid>
                </Grid>
              </CardContent>
            </Card>
          </Box>
        )}

        {/* Sección: Artefactos & demo */}
        {!loading && data && (
          <Box sx={{ mt: 4 }} ref={demoAnchorRef}>
            <Card>
              <CardHeader title={<Typography variant="h5" fontWeight={800}>{'Artefactos & demo'}</Typography>} />
              <CardContent>
                <Typography variant="subtitle2" fontWeight={700}>{'Artifacts (IPFS)'}</Typography>
                {Array.isArray((data as any)?.artifactsList) && (data as any).artifactsList.length > 0 ? (
                  <Table size="small" sx={{ mt: 1 }}>
                    <TableHead>
                      <TableRow>
                        <TableCell>{'CID'}</TableCell>
                        <TableCell>{'Filename'}</TableCell>
                        <TableCell>{'Size'}</TableCell>
                        <TableCell>{'SHA-256'}</TableCell>
                        <TableCell>{'Acciones'}</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {((data as any).artifactsList as any[]).map((a, i)=> (
                        <TableRow key={i}>
                          <TableCell>
                            <Stack direction="row" spacing={1} alignItems="center">
                              <Typography variant="body2">{String(a.cid||'').slice(0,8)}…{String(a.cid||'').slice(-6)}</Typography>
                              <Tooltip title="Copiar CID"><IconButton size="small" onClick={()=> navigator.clipboard.writeText(String(a.cid||''))}><ContentCopyIcon fontSize="inherit" /></IconButton></Tooltip>
                            </Stack>
                          </TableCell>
                          <TableCell>{a.filename || '-'}</TableCell>
                          <TableCell>{a.size || '-'}</TableCell>
                          <TableCell>{a.sha256 ? `${String(a.sha256).slice(0,10)}…` : '-'}</TableCell>
                          <TableCell>
                            <Button size="small" component={Link} href={a.cid ? `/api/ipfs/ipfs/${a.cid}` : '#'} disabled={!a.cid} target="_blank">{'Abrir'}</Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <Typography variant="body2" color="text.secondary">{'No hay artefactos publicados.'}</Typography>
                )}

                <Divider sx={{ my: 3 }} />
                <Typography variant="subtitle2" fontWeight={700}>{'Demo (Hosted)'}</Typography>
                {Boolean((data as any)?.demoPreset) ? (
                  <>
                    <Box component="pre" sx={{ bgcolor:'grey.50', p: 2, borderRadius: 1, fontSize: 12, whiteSpace:'pre-wrap' }}>
                      {typeof (data as any).demoPreset === 'string' ? (data as any).demoPreset : JSON.stringify((data as any).demoPreset, null, 2)}
                    </Box>
                    <Button variant="contained" sx={{ mt: 1 }}>{'Run demo'}</Button>
                  </>
                ) : (
                  <Typography variant="body2" color="text.secondary">{'Este modelo no tiene una demo configurada.'}</Typography>
                )}
              </CardContent>
            </Card>
          </Box>
        )}

        {/* Sección: Licencias y términos */}
        {!loading && data && (
          <Box sx={{ mt: 4 }}>
            <Card>
              <CardHeader title={<Typography variant="h5" fontWeight={800}>{'Licencias y términos'}</Typography>} />
              <CardContent>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={4}>
                    <Card variant="outlined"><CardContent>
                      <Typography variant="subtitle2" fontWeight={700}>{'Perpetual license'}</Typography>
                      <Typography variant="h6">{typeof data.price_perpetual === 'number' && data.price_perpetual > 0 ? `${(data.price_perpetual/1e18).toFixed(2)} ${evmSymbol}` : 'No especificado'}</Typography>
                    </CardContent></Card>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Card variant="outlined"><CardContent>
                      <Typography variant="subtitle2" fontWeight={700}>{'Subscription / month'}</Typography>
                      <Typography variant="h6">{typeof data.price_subscription === 'number' && data.price_subscription > 0 ? `${(data.price_subscription/1e18).toFixed(2)} ${evmSymbol}` : 'No especificado'}</Typography>
                    </CardContent></Card>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Card variant="outlined"><CardContent>
                      <Typography variant="subtitle2" fontWeight={700}>{'Base duration'}</Typography>
                      <Typography variant="h6">{(data as any).default_duration_days ? `${Math.round(((data as any).default_duration_days/30))} mo` : 'No especificado'}</Typography>
                    </CardContent></Card>
                  </Grid>
                </Grid>
                <Divider sx={{ my: 2 }} />
                <Typography variant="subtitle2" fontWeight={700}>{'Rights & delivery'}</Typography>
                <Stack direction="row" spacing={1} sx={{ flexWrap:'wrap', mt: 1 }}>
                  {data.deliveryMode === 'api' && (<Chip size="small" label="API" />)}
                  {data.deliveryMode === 'download' && (<Chip size="small" label="Download" />)}
                  {data.deliveryMode === 'both' && (<Chip size="small" label="API + Download" />)}
                  {data.rights?.api && (<Chip size="small" label="API rights" variant="outlined" />)}
                  {data.rights?.download && (<Chip size="small" label="Download rights" variant="outlined" />)}
                  {data.rights?.transferable && (<Chip size="small" label="Transferable" variant="outlined" />)}
                </Stack>
                <Divider sx={{ my: 2 }} />
                <Typography variant="subtitle2" fontWeight={700}>{'Términos clave'}</Typography>
                <Typography variant="body2">{(data as any).termsText || 'No especificado'}</Typography>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1 }}>
                  <Typography variant="body2"><b>{'Terms hash (SHA-256):'}</b> {(data as any).terms_hash || 'No firmado'}</Typography>
                  {Boolean((data as any).terms_hash) && (
                    <Tooltip title="Copiar hash"><IconButton size="small" onClick={()=> navigator.clipboard.writeText(String((data as any).terms_hash))}><ContentCopyIcon fontSize="inherit" /></IconButton></Tooltip>
                  )}
                </Stack>
              </CardContent>
            </Card>
          </Box>
        )}
      </Container>

      {/* Modal: Comprar licencia */}
      <Dialog open={buyOpen} onClose={()=> setBuyOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{'Comprar licencia'}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            <Typography variant="body2" color="text.secondary">{'Selecciona la opción de licencia que prefieras.'}</Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Card variant="outlined"><CardContent>
                  <Typography variant="subtitle2" fontWeight={700}>{'Perpetual'}</Typography>
                  <Typography variant="h6">{data && typeof data.price_perpetual === 'number' && data.price_perpetual > 0 ? `${(data.price_perpetual/1e18).toFixed(2)} ${evmSymbol}` : 'No disponible'}</Typography>
                </CardContent></Card>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Card variant="outlined"><CardContent>
                  <Typography variant="subtitle2" fontWeight={700}>{'Subscription / month'}</Typography>
                  <Typography variant="h6">{data && typeof data.price_subscription === 'number' && data.price_subscription > 0 ? `${(data.price_subscription/1e18).toFixed(2)} ${evmSymbol}` : 'No disponible'}</Typography>
                </CardContent></Card>
              </Grid>
            </Grid>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={()=> setBuyOpen(false)}>{'Cerrar'}</Button>
          <Button variant="contained" disabled>{'Continuar'}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
