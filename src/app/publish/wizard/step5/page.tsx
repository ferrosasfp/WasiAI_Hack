"use client";
import { useEffect, useMemo, useState } from 'react'
import { Box, Button, Paper, Typography, Stack, Grid, Select, MenuItem, Chip, List, ListItem, ListItemText, Divider, FormControl, InputLabel, OutlinedInput } from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined'
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch'
import { Alert } from '@mui/material'
 

async function publishModel(payload: any) {
  const res = await fetch('/api/models/publish', { method: 'POST', body: JSON.stringify(payload) })
  return res.json()
}

async function saveDraft(payload: any) {
  let addr: string | null = null
  try { addr = await (window as any)?.ethereum?.request?.({ method: 'eth_accounts' }).then((a: string[]) => a?.[0] || null) } catch {}
  const res = await fetch('/api/models/draft', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(addr ? { 'X-Wallet-Address': addr } : {}) },
    body: JSON.stringify(addr ? { ...payload, address: addr } : payload)
  })
  return res.json()
}

async function loadDraft() {
  let addr: string | null = null
  try { addr = await (window as any)?.ethereum?.request?.({ method: 'eth_accounts' }).then((a: string[]) => a?.[0] || null) } catch {}
  const res = await fetch('/api/models/draft' + (addr ? `?address=${addr}` : ''), { method: 'GET', headers: addr ? { 'X-Wallet-Address': addr } : {} })
  return res.json()
}

export default function Step5ReviewPublish() {
  const detectedLocale = typeof window !== 'undefined' ? (['en','es'].includes((window.location.pathname.split('/')[1]||'').toLowerCase()) ? window.location.pathname.split('/')[1] : 'en') : 'en'
  if (typeof window !== 'undefined' && !(/^\/(en|es)\//.test(window.location.pathname))) {
    window.location.replace(`/${detectedLocale}/publish/wizard/step5`)
    return null
  }
  const base = `/${detectedLocale}/publish/wizard`
  const [draft, setDraft] = useState<any>(null)
  const [targets, setTargets] = useState<Array<{chain:'evm'|'sui', network:'base'|'avax'|'testnet'}>>([{ chain:'evm', network:'base' }])
  const [publishing, setPublishing] = useState(false)
  const [results, setResults] = useState<Array<{ chain:string, network:string, ok:boolean, tx?:any, error?:string }>>([])
  const [msg, setMsg] = useState('')

  useEffect(() => {
    loadDraft().then(r=>{ if (r?.ok) setDraft(r.data||{}) }).catch(()=>{})
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
      delivery: s4?.delivery || undefined,
      licensePolicy: s4?.licensePolicy || undefined,
      downloadNotes: s3?.downloadNotes || undefined,
      version: 1,
    }
    // Normalize fields expected by summary
    if (!merged.slug && s1?.slug) merged.slug = s1.slug
    if (!merged.authorDisplay && s1?.author?.displayName) merged.authorDisplay = s1.author.displayName
    return merged
  }, [draft])

  const issues = useMemo(() => {
    const msgs:string[] = []
    const arts = Array.isArray(metadata?.artifacts) ? metadata.artifacts : []
    if (arts.length === 0 || arts.some((a:any)=>!a?.cid)) msgs.push('Debes tener al menos un artefacto con CID.')
    const rights = Array.isArray(metadata?.licensePolicy?.rights) ? metadata.licensePolicy.rights : []
    if (rights.length === 0) msgs.push('Selecciona al menos un derecho: API y/o Download (Paso 4).')
    const perp = Number(metadata?.licensePolicy?.perpetual?.priceRef || 0)
    const sub = Number(metadata?.licensePolicy?.subscription?.perMonthPriceRef || 0)
    const dur = Number(metadata?.licensePolicy?.defaultDurationDays || 0)
    if (!(perp>0 || sub>0)) msgs.push('Define al menos un precio (> 0) en licencias (Paso 4).')
    if (sub>0 && !(dur>0)) msgs.push('Si usas suscripción, define duración base (> 0).')
    return msgs
  }, [metadata])

  const onPublish = async () => {
    setPublishing(true)
    setMsg('')
    setResults([])
    try {
      for (const t of targets) {
        const r = await publishModel({ chain: t.chain, network: t.network, metadata })
        setResults(prev=>[...prev, { chain: t.chain, network: t.network, ok: !!r?.ok, tx: r?.onchain, error: r?.error }])
      }
      setMsg('Publicación finalizada')
    } catch {
      setMsg('Error al publicar')
    } finally {
      setPublishing(false)
    }
  }

  const onSave = async () => {
    setMsg('')
    try {
      await saveDraft({ step: 'step5', data: { publishedTargets: targets, ts: Date.now() } })
      setMsg('Guardado')
    } catch {
      setMsg('Error al guardar')
    }
  }

  return (
    <div style={{padding:24, maxWidth:1000, margin:'0 auto'}}>
      <Typography variant="h5" sx={{ fontWeight:700 }}>Paso 5 · Revisa y publica</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt:0.5, mb:1.5 }}>
        Revisa el resumen y publica en las redes seleccionadas. Construimos la metadata automáticamente con tus pasos anteriores.
      </Typography>

      <Paper variant="outlined" sx={{ p:{ xs:2, md:3 }, mb:2, borderRadius:2 }}>
        <Typography variant="h6" sx={{ fontWeight:600, mb:1 }}>Redes de publicación</Typography>
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <FormControl fullWidth>
              <InputLabel id="targets-label">Selecciona redes</InputLabel>
              <Select
                labelId="targets-label"
                multiple
                label="Selecciona redes"
                value={targets.map(t=>`${t.chain}:${t.network}`)}
                onChange={(e)=>{
                  const vals = (e.target.value as string[])
                  const next = vals.map(v=>{ const [c,n] = v.split(':') as any; return { chain: c, network: n } })
                  setTargets(next)
                }}
                input={<OutlinedInput label="Selecciona redes" />}
                renderValue={(selected)=> (
                  <Box sx={{ display:'flex', flexWrap:'wrap', gap:0.5 }}>
                    {(selected as string[]).map(v=> <Chip key={v} label={v.replace(':',' / ')} />)}
                  </Box>
                )}
              >
                <MenuItem value="evm:base">EVM: Base Sepolia</MenuItem>
                <MenuItem value="evm:avax">EVM: Avalanche Fuji</MenuItem>
                <MenuItem value="sui:testnet">Sui: Testnet</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12}>
            {issues.length>0 && (
              <Alert severity="warning" sx={{ mb: 1 }}>
                {issues.map((m,i)=>(<div key={i}>{m}</div>))}
              </Alert>
            )}
            <Button onClick={onPublish} disabled={publishing || targets.length===0 || issues.length>0} variant="contained" startIcon={<RocketLaunchIcon/>}>
              {publishing? 'Publicando...' : 'Publicar'}
            </Button>
          </Grid>
        </Grid>
      </Paper>

      <Paper variant="outlined" sx={{ p:{ xs:2, md:3 }, mb:2, borderRadius:2 }}>
        <Typography variant="h6" sx={{ fontWeight:600, mb:1 }}>Resumen</Typography>
        <Grid container spacing={2}>
          {((metadata as any)?.cover?.thumbCid || (metadata as any)?.cover?.cid) && (
            <Grid item xs={12}>
              <Box sx={{ display:'flex', alignItems:'center', gap:1 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`https://ipfs.io/ipfs/${(metadata as any).cover.thumbCid || (metadata as any).cover.cid}`}
                  alt="cover"
                  style={{ height: 100, borderRadius: 8 }}
                />
                <Typography variant="body2" color="text.secondary">
                  Portada
                </Typography>
              </Box>
            </Grid>
          )}
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2">Información del modelo</Typography>
            <List dense>
              <ListItem><ListItemText primary={`Nombre: ${metadata?.name || '-'}`} /></ListItem>
              <ListItem><ListItemText primary={`Slug: ${metadata?.slug || '-'}`} /></ListItem>
              <ListItem><ListItemText primary={`Autor: ${metadata?.authorDisplay || metadata?.author?.displayName || '-'}`} /></ListItem>
            </List>
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2">Licencias y entrega</Typography>
            <List dense>
              <ListItem><ListItemText primary={`Perpetua: ${metadata?.licensePolicy?.perpetual?.priceRef ?? 0}`} /></ListItem>
              <ListItem><ListItemText primary={`Suscripción/mes: ${metadata?.licensePolicy?.subscription?.perMonthPriceRef ?? 0}`} /></ListItem>
              <ListItem><ListItemText primary={`Duración base: ${metadata?.licensePolicy?.defaultDurationDays ?? 0} días`} /></ListItem>
              <ListItem><ListItemText primary={`Derechos: ${(metadata?.licensePolicy?.rights || []).join(', ') || '-'}`} /></ListItem>
              <ListItem><ListItemText primary={`Modo de entrega: ${metadata?.delivery?.hint || '-'}`} /></ListItem>
            </List>
          </Grid>
          <Grid item xs={12}>
            <Divider sx={{ my:1 }} />
            <Typography variant="subtitle2" sx={{ mb:1 }}>Artefactos (IPFS)</Typography>
            <List dense>
              {(metadata?.artifacts || []).map((a:any, idx:number)=>(
                <ListItem key={idx} sx={{ display:'grid', gridTemplateColumns:'1fr 1fr 2fr 2fr', columnGap: 1 }}>
                  <ListItemText primary={a.filename||'-'} secondary={`SHA-256: ${a.sha256||'-'}`} />
                  <ListItemText primary={a.sizeBytes? `${a.sizeBytes} bytes` : '-'} />
                  <ListItemText primary={`CID: ${a.cid||'-'}`} />
                  <ListItemText primary={`URI: ${a.cid? `ipfs://${a.cid}` : '-'}`} />
                </ListItem>
              ))}
              {(!metadata?.artifacts || metadata.artifacts.length===0) && (
                <ListItem><ListItemText primary="No hay artefactos." /></ListItem>
              )}
            </List>
          </Grid>
        </Grid>
      </Paper>

      {results.length>0 && (
        <Paper variant="outlined" sx={{ p:2, mt:2, borderRadius:2 }}>
          <Typography variant="subtitle1" sx={{ mb:1 }}>Resultados de publicación</Typography>
          <List dense>
            {results.map((r, i)=> (
              <ListItem key={i} sx={{ display:'grid', gridTemplateColumns:'1fr 1fr 3fr 3fr', columnGap:1 }}>
                <ListItemText primary={`${r.chain.toUpperCase()} / ${r.network}`} />
                <ListItemText primary={r.ok ? 'OK' : 'Error'} />
                <ListItemText primary={`TX: ${r?.tx?.txHash || r?.tx?.digest || '-'}`} />
                <ListItemText primary={r.error || ''} />
              </ListItem>
            ))}
          </List>
        </Paper>
      )}

      {/* Spacer para barra fija */}
      <Box sx={{ height: { xs: 76, md: 72 }, mt: 2 }} />

      {/* Barra fija inferior */}
      <Box sx={{ position:'fixed', bottom: 0, left: 0, right: 0, zIndex: (t)=>t.zIndex.appBar + 1 }}>
        <Paper elevation={3} sx={{ borderRadius: 0, px: { xs:1.5, md:2 }, py: 1 }}>
          <Box sx={{ maxWidth: 1000, mx: 'auto', width:'100%' }}>
            {/* Móvil: Atrás | Guardar (centro) | Publicar (derecha) */}
            <Box sx={{ display:{ xs:'flex', md:'none' }, alignItems:'center', justifyContent:'space-between', width:'100%' }}>
              <Button size="small" href={`${base}/step4`} variant="text" color="inherit" startIcon={<ArrowBackIcon />} sx={{ borderRadius: 2, textTransform:'none', py: 0.75, whiteSpace:'nowrap', fontSize:{ xs:12, md:14 }, '& .MuiButton-startIcon': { mr: 0.5, '& svg': { fontSize: 18 } } }}>
                Atrás
              </Button>
              <Button size="small" onClick={onSave} variant="text" color="primary" startIcon={<SaveOutlinedIcon />} sx={{ borderRadius: 2, textTransform:'none', py: 0.75, whiteSpace:'nowrap', fontSize:{ xs:12, md:14 }, '& .MuiButton-startIcon': { mr: 0.5, '& svg': { fontSize: 18 } } }}>
                Guardar borrador
              </Button>
              <Button size="small" onClick={onPublish} disabled={publishing || issues.length>0 || targets.length===0} variant="contained" startIcon={<RocketLaunchIcon />} sx={{ borderRadius: 2, textTransform:'none', py: 0.75, whiteSpace:'nowrap', fontSize:{ xs:12, md:14 }, '& .MuiButton-startIcon': { mr: 0.5, '& svg': { fontSize: 18 } } }}>
                {publishing? 'Publicando...' : 'Publicar'}
              </Button>
            </Box>

            {/* Desktop: Atrás izquierda; Guardar + Publicar derecha */}
            <Box sx={{ display:{ xs:'none', md:'flex' }, alignItems:'center', justifyContent:'space-between', gap: 1.25 }}>
              <Button href={`${base}/step4`} variant="text" color="inherit" startIcon={<ArrowBackIcon />} sx={{ borderRadius: 2, textTransform:'none', py: 1 }}>
                Atrás
              </Button>
              <Box sx={{ display:'flex', gap: 1.25 }}>
                <Button onClick={onSave} variant="text" color="primary" startIcon={<SaveOutlinedIcon />} sx={{ borderRadius: 2, textTransform:'none', py: 1 }}>
                  Guardar borrador
                </Button>
                <Button onClick={onPublish} disabled={publishing || issues.length>0 || targets.length===0} variant="contained" startIcon={<RocketLaunchIcon />} sx={{ borderRadius: 2, textTransform:'none', py: 1 }}>
                  {publishing? 'Publicando...' : 'Publicar'}
                </Button>
              </Box>
            </Box>
          </Box>
        </Paper>
      </Box>

      {msg && <p>{msg}</p>}
    </div>
  )
}
