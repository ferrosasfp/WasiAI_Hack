"use client";
import { useMemo, useState, useEffect } from 'react'
import { useWalletAddress } from '@/hooks/useWalletAddress'
import { Box, Button, Paper, Typography, Stack, Grid, TextField, Checkbox, FormControlLabel, Select, MenuItem, Switch, FormGroup, FormControl, InputLabel, Tooltip, IconButton, Alert } from '@mui/material'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined'
 

async function saveDraft(payload: any) {
  const res = await fetch('/api/models/draft', { method: 'POST', body: JSON.stringify(payload) })
  return res.json()
}

export default function Step4LicensesTerms() {
  const detectedLocale = typeof window !== 'undefined' ? (['en','es'].includes((window.location.pathname.split('/')[1]||'').toLowerCase()) ? window.location.pathname.split('/')[1] : 'en') : 'en'
  if (typeof window !== 'undefined' && !/^\/(en|es)\//.test(window.location.pathname)) {
    window.location.replace(`/${detectedLocale}/publish/wizard/step4`)
    return null
  }
  const base = `/${detectedLocale}/publish/wizard`
  const [saving, setSaving] = useState(false)
  const [pricePerpetual, setPricePerpetual] = useState('0')
  const [priceSubscription, setPriceSubscription] = useState('0')
  const [defaultDurationDays, setDefaultDurationDays] = useState('1')
  const [transferable, setTransferable] = useState(false)
  const [rightsAPI, setRightsAPI] = useState(true)
  const [rightsDownload, setRightsDownload] = useState(false)
  const [deliveryModeHint, setDeliveryModeHint] = useState<'API'|'Download'|'Both'>('API')
  const [termsUrl, setTermsUrl] = useState('')
  const [termsText, setTermsText] = useState('')
  const [termsHash, setTermsHash] = useState('')
  const [msg, setMsg] = useState('')
  const { walletAddress } = useWalletAddress()

  const rightsMask = useMemo(() => {
    const r:string[] = []
    if (rightsAPI) r.push('API')
    if (rightsDownload) r.push('Download')
    return r
  }, [rightsAPI, rightsDownload])

  // Reglas
  const pPerp = Number(pricePerpetual || 0)
  const pSub = Number(priceSubscription || 0)
  const dMonths = Number(defaultDurationDays || 0)
  const dDays = dMonths > 0 ? dMonths * 30 : 0
  const atLeastOnePrice = pPerp > 0 || pSub > 0
  const subNeedsDuration = pSub > 0 && dMonths <= 0
  const invalidPerp = !Number.isFinite(pPerp) || pPerp < 0 || !Number.isInteger(pPerp)
  const invalidSub = !Number.isFinite(pSub) || pSub < 0 || !Number.isInteger(pSub)
  const invalidDur = !Number.isFinite(dMonths) || dMonths < 0 || !Number.isInteger(dMonths) || dMonths > 12 || subNeedsDuration
  const noRights = !(rightsAPI || rightsDownload)
  const isValid = atLeastOnePrice && !invalidPerp && !invalidSub && !invalidDur && !noRights

  // Sync combo -> rights
  useEffect(() => {
    if (deliveryModeHint === 'API') {
      if (!rightsAPI || rightsDownload) { setRightsAPI(true); setRightsDownload(false) }
    } else if (deliveryModeHint === 'Download') {
      if (rightsAPI || !rightsDownload) { setRightsAPI(false); setRightsDownload(true) }
    } else if (deliveryModeHint === 'Both') {
      if (!rightsAPI || !rightsDownload) { setRightsAPI(true); setRightsDownload(true) }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deliveryModeHint])

  // Sync rights -> combo
  useEffect(() => {
    if (rightsAPI && rightsDownload && deliveryModeHint !== 'Both') {
      setDeliveryModeHint('Both')
    } else if (rightsAPI && !rightsDownload && deliveryModeHint !== 'API') {
      setDeliveryModeHint('API')
    } else if (!rightsAPI && rightsDownload && deliveryModeHint !== 'Download') {
      setDeliveryModeHint('Download')
    } else if (!rightsAPI && !rightsDownload) {
      // ninguno
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rightsAPI, rightsDownload])

  const onHashTerms = async () => {
    try {
      const enc = new TextEncoder().encode(termsText || '')
      const buf = await crypto.subtle.digest('SHA-256', enc)
      const hex = Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,'0')).join('')
      setTermsHash('0x'+hex)
    } catch {
      setTermsHash('')
    }
  }

  const onSave = async () => {
    setSaving(true)
    setMsg('')
    const payload = {
      address: walletAddress,
      step: 'step4',
      data: {
        licensePolicy: {
          rights: rightsMask,
          subscription: { perMonthPriceRef: priceSubscription },
          perpetual: { priceRef: pricePerpetual },
          defaultDurationDays: dDays,
          transferable,
          termsUrl,
          termsHash
        },
        delivery: { hint: deliveryModeHint }
      }
    }
    try {
      await saveDraft(payload)
      setMsg('Guardado')
    } catch {
      setMsg('Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  const navigateAfterSave = async (e: React.MouseEvent<HTMLAnchorElement | HTMLButtonElement>, url: string) => {
    e.preventDefault()
    await onSave()
    window.location.href = url
  }

  return (
    <div style={{padding:24, maxWidth:900, margin:'0 auto'}}>
      <Typography variant="h5" sx={{ fontWeight:700 }}>Paso 4 · Define licencias y términos</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt:0.5, mb:1.5 }}>
        Establece precios, derechos de uso y las condiciones legales. Estos datos se usarán al publicar el modelo.
      </Typography>

      <Paper variant="outlined" sx={{ p:{ xs:2, md:3 }, mb:2, borderRadius:2 }}>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight:600 }}>Precios</Typography>
          <Tooltip title="Valores de referencia. Puedes dejar 0 si no aplica."><InfoOutlinedIcon fontSize="small" color="action" /></Tooltip>
        </Stack>
        {!atLeastOnePrice && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            Define al menos un precio (&gt; 0): Perpetua o Suscripción.
          </Alert>
        )}
        <Grid container spacing={2}>
          <Grid item xs={12} md={4}>
            <TextField label="Perpetua (ref)" type="number" fullWidth value={pricePerpetual} onChange={(e)=>setPricePerpetual(e.target.value)}
              error={invalidPerp}
              helperText={invalidPerp ? 'Debe ser un entero ≥ 0' : ' '} />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField label="Suscripción / mes" type="number" fullWidth value={priceSubscription} onChange={(e)=>setPriceSubscription(e.target.value)}
              error={invalidSub}
              helperText={invalidSub ? 'Debe ser un entero ≥ 0' : ' '} />
          </Grid>
          <Grid item xs={12} md={4}>
            <FormControl fullWidth>
              <InputLabel id="duration-label">Duración base (meses)</InputLabel>
              <Select labelId="duration-label" label="Duración base (meses)" value={defaultDurationDays} onChange={(e)=>setDefaultDurationDays(String(e.target.value))}
                error={invalidDur}
              >
                {Array.from({length:12}, (_,i)=>i+1).map(m => (
                  <MenuItem key={m} value={String(m)}>{m}</MenuItem>
                ))}
              </Select>
              <Typography variant="caption" color={invalidDur? 'error' : 'text.secondary'} sx={{ mt: 0.5, display:'block' }}>
                {subNeedsDuration ? 'Requerido si hay suscripción' : invalidDur ? 'Selecciona entre 1 y 12 meses' : ' '}
              </Typography>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>

      <Paper variant="outlined" sx={{ p:{ xs:2, md:3 }, mb:2, borderRadius:2 }}>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight:600 }}>Derechos y entrega</Typography>
          <Tooltip title="Selecciona cómo se puede usar y entregar el modelo."><InfoOutlinedIcon fontSize="small" color="action" /></Tooltip>
        </Stack>
        <FormGroup row sx={{ mb: 2 }}>
          <FormControlLabel control={<Checkbox checked={rightsAPI} onChange={(e)=>setRightsAPI(e.target.checked)} />} label="API" />
          <FormControlLabel control={<Checkbox checked={rightsDownload} onChange={(e)=>setRightsDownload(e.target.checked)} />} label="Download" />
          <FormControlLabel control={<Switch checked={transferable} onChange={(e)=>setTransferable(e.target.checked)} />} label="Transferible" />
        </FormGroup>
        <FormControl fullWidth>
          <InputLabel id="delivery-mode-label">Modo de entrega</InputLabel>
          <Select labelId="delivery-mode-label" label="Modo de entrega" value={!(rightsAPI||rightsDownload) ? 'none' : deliveryModeHint} onChange={(e)=>{
            const v = String(e.target.value||'') as 'API'|'Download'|'Both'|'none'
            if (v === 'API') { setDeliveryModeHint('API'); setRightsAPI(true); setRightsDownload(false) }
            else if (v === 'Download') { setDeliveryModeHint('Download'); setRightsAPI(false); setRightsDownload(true) }
            else if (v === 'Both') { setDeliveryModeHint('Both'); setRightsAPI(true); setRightsDownload(true) }
            else { setRightsAPI(false); setRightsDownload(false) }
          }}>
            <MenuItem value="none">Ninguno</MenuItem>
            <MenuItem value="API">API</MenuItem>
            <MenuItem value="Download">Download</MenuItem>
            <MenuItem value="Both">Both</MenuItem>
          </Select>
        </FormControl>
        {noRights && (
          <Alert severity="error" sx={{ mt: 1 }}>Debes elegir al menos un derecho: API y/o Download.</Alert>
        )}
      </Paper>

      <Paper variant="outlined" sx={{ p:{ xs:2, md:3 }, mb:2, borderRadius:2 }}>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight:600 }}>Términos</Typography>
          <Tooltip title="Puedes pegar tus términos o enlazarlos. Calcula el hash para anclar la versión."><InfoOutlinedIcon fontSize="small" color="action" /></Tooltip>
        </Stack>
        <Stack spacing={2}>
          <TextField label="URL de Términos (opcional)" value={termsUrl} onChange={(e)=>setTermsUrl(e.target.value)} placeholder="https://..." fullWidth />
          <TextField label="Texto de Términos" value={termsText} onChange={(e)=>setTermsText(e.target.value)} multiline rows={4} fullWidth />
          <Stack direction="row" spacing={1} alignItems="center">
            <Button variant="outlined" onClick={onHashTerms}>Calcular hash</Button>
            <TextField label="Hash (SHA-256)" value={termsHash} InputProps={{ readOnly: true, endAdornment: (
              <IconButton size="small" onClick={()=>{ if(termsHash) navigator.clipboard.writeText(termsHash) }}><ContentCopyIcon fontSize="small" /></IconButton>
            ) }} placeholder="0x..." fullWidth />
          </Stack>
        </Stack>
      </Paper>

      {/* Spacer para barra fija */}
      <Box sx={{ height: { xs: 76, md: 72 }, mt: 2 }} />

      {/* Barra fija inferior */}
      <Box sx={{ position:'fixed', bottom: 0, left: 0, right: 0, zIndex: (t)=>t.zIndex.appBar + 1 }}>
        <Paper elevation={3} sx={{ borderRadius: 0, px: { xs:1.5, md:2 }, py: 1 }}>
          <Box sx={{ maxWidth: 1000, mx: 'auto', width:'100%' }}>
            {/* Móvil: tres posiciones con Guardar centrado */}
            <Box sx={{ display:{ xs:'flex', md:'none' }, alignItems:'center', justifyContent:'space-between', width:'100%' }}>
              <Button size="small" href={`${base}/step3`} onClick={(e)=>navigateAfterSave(e, `${base}/step3`)} variant="text" color="inherit" startIcon={<ArrowBackIcon />} sx={{ borderRadius: 2, textTransform:'none', py: 0.75, whiteSpace:'nowrap', fontSize:{ xs:12, md:14 }, '& .MuiButton-startIcon': { mr: 0.5, '& svg': { fontSize: 18 } } }}>
                Atrás
              </Button>
              <Button size="small" onClick={onSave} disabled={saving} variant="text" color="primary" startIcon={<SaveOutlinedIcon />} sx={{ borderRadius: 2, textTransform:'none', py: 0.75, whiteSpace:'nowrap', fontSize:{ xs:12, md:14 }, '& .MuiButton-startIcon': { mr: 0.5, '& svg': { fontSize: 18 } } }}>
                {saving? 'Guardando...' : 'Guardar borrador'}
              </Button>
              <Button size="small" href={`${base}/step5`} onClick={(e)=>navigateAfterSave(e, `${base}/step5`)} disabled={!isValid} variant="text" color="inherit" endIcon={<ArrowForwardIcon />} sx={{ borderRadius: 2, textTransform:'none', py: 0.75, whiteSpace:'nowrap', fontSize:{ xs:12, md:14 }, '& .MuiButton-endIcon': { ml: 0.5, '& svg': { fontSize: 18 } } }}>
                Siguiente
              </Button>
            </Box>

            {/* Desktop: Atrás izquierda; Guardar + Siguiente a la derecha */}
            <Box sx={{ display:{ xs:'none', md:'flex' }, alignItems:'center', justifyContent:'space-between', gap: 1.25 }}>
              <Button href={`${base}/step3`} onClick={(e)=>navigateAfterSave(e, `${base}/step3`)} variant="text" color="inherit" startIcon={<ArrowBackIcon />} sx={{ borderRadius: 2, textTransform:'none', py: 1 }}>
                Atrás
              </Button>
              <Box sx={{ display:'flex', gap: 1.25 }}>
                <Button onClick={onSave} disabled={saving} variant="text" color="primary" startIcon={<SaveOutlinedIcon />} sx={{ borderRadius: 2, textTransform:'none', py: 1 }}>
                  {saving? 'Guardando...' : 'Guardar borrador'}
                </Button>
                <Button href={`${base}/step5`} onClick={(e)=>navigateAfterSave(e, `${base}/step5`)} disabled={!isValid} variant="text" color="inherit" endIcon={<ArrowForwardIcon />} sx={{ borderRadius: 2, textTransform:'none', py: 1 }}>
                  Siguiente
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
