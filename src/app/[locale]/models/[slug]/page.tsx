"use client";
import React, { useMemo } from 'react'
import { notFound } from 'next/navigation'
import { useLocale } from 'next-intl'
import Link from 'next/link'
import { Box, Container, Grid, Stack, Typography, Chip, Button, Card, CardContent, Tooltip, Divider, Table, TableBody, TableCell, TableRow } from '@mui/material'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import CloudDoneIcon from '@mui/icons-material/CloudDone'
import DownloadDoneIcon from '@mui/icons-material/DownloadDone'
import SwapHorizIcon from '@mui/icons-material/SwapHoriz'
import ScienceIcon from '@mui/icons-material/Science'
import { mockModels } from '@/data/mockModels'

export default function ModelDetailPage({ params }: { params: { slug: string } }) {
  const locale = useLocale()
  const isES = String(locale||'').startsWith('es')
  const m = useMemo(()=> mockModels.find(mm => mm.slug === params.slug), [params.slug])
  if (!m) return notFound()

  const copy = async (txt?: string) => { if (!txt) return; try { await navigator.clipboard.writeText(txt) } catch {} }

  return (
    <Box>
      <Container maxWidth="lg" sx={{ py: { xs: 3, md: 5 } }}>
        {/* Summary */}
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            {m.cover ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={m.cover} alt={m.name} style={{ width:'100%', height:'auto', borderRadius: 12 }} />
            ) : (
              <Box sx={{ aspectRatio:'16/9', bgcolor:'grey.100', borderRadius: 2, display:'flex', alignItems:'center', justifyContent:'center' }}>
                <ScienceIcon color="primary" />
              </Box>
            )}
          </Grid>
          <Grid item xs={12} md={6}>
            <Stack spacing={1.25}>
              <Typography variant="h4" fontWeight={800}>{m.name}</Typography>
              <Typography variant="h6" color="text.secondary">{m.valueProposition || m.summary}</Typography>
              <Typography variant="body2" color="text.secondary">{(isES? 'por ' : 'by ') + (m.author || 'Unknown')}</Typography>
              <Stack direction="row" spacing={1} sx={{ flexWrap:'wrap' }}>
                {(m.categories||[]).map(c=> <Chip key={c} label={c} size="small" />)}
                {(m.tasks||[]).map(t=> <Chip key={t} label={t} size="small" variant="outlined" />)}
              </Stack>
              <Stack direction={{ xs:'column', sm:'row' }} spacing={1}>
                {m.pricePerpetual && <Chip color="primary" label={(isES?'Perpetua: ':'Perpetual: ')+m.pricePerpetual} />}
                {m.priceSubscription && <Chip color="secondary" label={(isES?'Suscripción: ':'Subscription: ')+m.priceSubscription} />}
              </Stack>
              <Stack direction="row" spacing={1} sx={{ flexWrap:'wrap' }}>
                {m.rights?.api && <Chip icon={<CloudDoneIcon />} label="API" size="small" />}
                {m.rights?.download && <Chip icon={<DownloadDoneIcon />} label="Download" size="small" />}
                {m.rights?.transferable && <Chip icon={<SwapHorizIcon />} label={isES? 'Transferible':'Transferable'} size="small" />}
              </Stack>
              <Stack direction={{ xs:'column', sm:'row' }} spacing={1}>
                <Button variant="contained">{isES? 'Comprar licencia':'Buy license'}</Button>
                {m.demoPreset && <Button variant="outlined">{isES? 'Probar demo':'Run demo'}</Button>}
              </Stack>
            </Stack>
          </Grid>
        </Grid>

        <Divider sx={{ my: 4 }} />

        {/* Customer-facing sheet */}
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" fontWeight={700} gutterBottom>{isES? 'Entradas y salidas':'Inputs and outputs'}</Typography>
                <Table size="small"><TableBody>
                  {m.inputs && <TableRow><TableCell sx={{ width: 160 }}>Input</TableCell><TableCell>{m.inputs}</TableCell></TableRow>}
                  {m.outputs && <TableRow><TableCell>Output</TableCell><TableCell>{m.outputs}</TableCell></TableRow>}
                </TableBody></Table>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" fontWeight={700} gutterBottom>{isES? 'Industria y casos de uso':'Industries & use cases'}</Typography>
                <Stack direction="row" spacing={1} sx={{ flexWrap:'wrap' }}>
                  {(m.industries||[]).map(x=> <Chip key={x} label={x} size="small" />)}
                  {(m.useCases||[]).map(x=> <Chip key={x} label={x} size="small" variant="outlined" />)}
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" fontWeight={700} gutterBottom>{isES? 'Limitaciones conocidas':'Known limitations'}</Typography>
                <Typography variant="body2" color="text.secondary">{m.knownLimitations || (isES? '—':'—')}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" fontWeight={700} gutterBottom>{isES? 'Usos prohibidos':'Prohibited uses'}</Typography>
                <Typography variant="body2" color="text.secondary">{m.prohibitedUses || (isES? '—':'—')}</Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <Divider sx={{ my: 4 }} />

        {/* Technical config */}
        <Card>
          <CardContent>
            <Typography variant="h6" fontWeight={700} gutterBottom>{isES? 'Configuración técnica':'Technical configuration'}</Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Stack spacing={1}>
                  <Row label="Frameworks" value={(m.frameworks||[]).join(', ')} />
                  <Row label="Arquitecturas" value={(m.architectures||[]).join(', ')} />
                  <Row label="Precisión/quant" value={(m.precision||[]).join('/')} />
                  <Row label="Formatos" value={(m.fileFormats||[]).join(', ')} />
                </Stack>
              </Grid>
              <Grid item xs={12} md={6}>
                <Stack spacing={1}>
                  <Row label={isES? 'Recursos mínimos':'Min resources'} value={m.minResources} />
                  <Row label="Runtime" value={(m.runtimeSystems||[]).join(', ')} />
                </Stack>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        <Divider sx={{ my: 4 }} />

        {/* Artifacts & demo (summary mock) */}
        <Card>
          <CardContent>
            <Typography variant="h6" fontWeight={700} gutterBottom>Artifacts (IPFS)</Typography>
            <Typography variant="body2" color="text.secondary">{m.artifacts ? (isES? 'Artifacts disponibles (mock).':'Artifacts available (mock).') : (isES? 'Sin artifacts.':'No artifacts.')}</Typography>
            <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
              <Button size="small" variant="outlined" startIcon={<ContentCopyIcon />} onClick={()=>copy('ipfs://example-cid')}>CID</Button>
              {m.demoPreset && <Button size="small" variant="outlined">{isES? 'Run demo (mock)':'Run demo (mock)'}</Button>}
            </Stack>
          </CardContent>
        </Card>

        <Divider sx={{ my: 4 }} />

        {/* Licenses & terms */}
        <Card>
          <CardContent>
            <Typography variant="h6" fontWeight={700} gutterBottom>{isES? 'Licencias y términos':'Licenses & terms'}</Typography>
            <Stack direction={{ xs:'column', sm:'row' }} spacing={1} sx={{ mb: 1 }}>
              {m.pricePerpetual && <Chip color="primary" label={(isES?'Perpetua: ':'Perpetual: ')+m.pricePerpetual} />}
              {m.priceSubscription && <Chip color="secondary" label={(isES?'Suscripción: ':'Subscription: ')+m.priceSubscription} />}
            </Stack>
            <Stack direction="row" spacing={1} sx={{ flexWrap:'wrap' }}>
              {m.rights?.api && <Chip icon={<CloudDoneIcon />} label="API" size="small" />}
              {m.rights?.download && <Chip icon={<DownloadDoneIcon />} label="Download" size="small" />}
              {m.rights?.transferable && <Chip icon={<SwapHorizIcon />} label={isES? 'Transferible':'Transferable'} size="small" />}
            </Stack>
          </CardContent>
        </Card>
      </Container>
    </Box>
  )
}

function Row({ label, value }: { label: string; value?: string }) {
  return (
    <Stack direction="row" spacing={1}>
      <Typography variant="body2" sx={{ width: 180, fontWeight: 600 }}>{label}</Typography>
      <Typography variant="body2" color="text.secondary">{value || '—'}</Typography>
    </Stack>
  )
}
