"use client";

import React from 'react'
import Link from 'next/link'
import { useLocale } from 'next-intl'
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  Grid,
  Stack,
  Typography,
} from '@mui/material'
import { UploadRounded, LockRounded, FlashOnRounded, BoltRounded, ArrowForwardRounded } from '@mui/icons-material'

export const dynamic = 'force-dynamic'

export default function LandingV2() {
  const locale = useLocale()
  const to = (p: string) => `/${locale}${p}`
  const es = locale === 'es'
  const tokenSym = 'AVAX'
  const L = React.useMemo(()=>({
    heroTitle: es ? 'Agentes de IA que cobran por uso.' : 'AI agents that get paid per use.',
    heroBody: es
      ? 'WasiAI es el hogar de los agentes de IA en Avalanche. Publica tu modelo y cobra automáticamente cada vez que alguien lo usa — sin intermediarios, sin facturas, sin esperas. Cada agente tiene identidad verificada en blockchain.'
      : 'WasiAI is the home of AI agents on Avalanche. Publish your model and get paid automatically every time someone uses it — no middlemen, no invoices, no waiting. Every agent has verified identity on blockchain.',
    ctaExplore: es ? 'Explorar modelos' : 'Explore models',
    ctaPublish: es ? 'Publica tu modelo' : 'Publish your model',
    howItWorks: es ? 'Cómo funciona' : 'How it works',
    forCreators: es ? 'Para creadores' : 'For creators',
    forTeams: es ? 'Para equipos' : 'For teams',
    featured: es ? 'Modelos destacados' : 'Featured models',
    featuredSub: es ? 'Modelos populares seleccionados por el equipo de WasiAI.' : 'Popular models curated by the WasiAI team.',
    whyTitle: es ? 'Por qué WasiAI' : 'Why WasiAI',
    useCases: es ? 'Hecho para casos reales' : 'Built for real use cases',
    seeModels: es ? 'Ver modelos →' : 'See models →',
    ctaBandTitle: es ? '¿Listo para publicar o probar tu primer modelo?' : 'Ready to publish or try your first model?',
    ctaBandExplore: es ? 'Explorar modelos' : 'Explore models',
    ctaBandPublish: es ? 'Publicar un modelo' : 'Publish a model',
    subscription: es ? 'Pago por uso' : 'Pay per use',
    perpetual: es ? 'Licencia perpetua' : 'Perpetual License',
    from: es ? 'Desde' : 'From',
    runDemo: es ? 'Probar demo' : 'Run demo',
    viewDetails: es ? 'Ver detalles' : 'View details',
    viewModel: es ? 'Ver modelo' : 'View model',
    demoCard: es
      ? { name: 'Pronóstico de Ventas Pro', desc: 'Analítica predictiva para proyección de ingresos', tags: ['Analítica','Modelo ML','Enterprise'] }
      : { name: 'Sales Forecasting Pro', desc: 'Advanced AI model for predictive sales analytics', tags: ['Analytics','ML Model','Enterprise'] },
    creatorsSteps: es ? [
      { k: '1/3', t: 'Publica tu modelo', d: 'Sube tu modelo, configura precio por uso y obtén identidad verificada' },
      { k: '2/3', t: 'Elige cómo cobrar', d: 'Por cada uso, suscripción mensual o licencia perpetua' },
      { k: '3/3', t: 'Cobra automáticamente', d: 'Recibe AVAX instantáneamente cada vez que usan tu modelo' },
    ] : [
      { k: '1/3', t: 'Publish your model', d: 'Upload your model, set price per use and get verified identity' },
      { k: '2/3', t: 'Choose how to charge', d: 'Per use, monthly subscription, or perpetual license' },
      { k: '3/3', t: 'Get paid automatically', d: 'Receive AVAX instantly every time someone uses your model' },
    ],
    teamsSteps: es ? [
      { k: '1/3', t: 'Descubre agentes', d: 'Busca agentes verificados por caso de uso' },
      { k: '2/3', t: 'Prueba antes de pagar', d: 'Corre una demo gratuita en entorno seguro' },
      { k: '3/3', t: 'Paga solo por lo que usas', d: 'Sin contratos, sin mínimos — pagas por cada llamada' },
    ] : [
      { k: '1/3', t: 'Discover agents', d: 'Find verified agents by use case' },
      { k: '2/3', t: 'Try before you pay', d: 'Run a free demo in a safe environment' },
      { k: '3/3', t: 'Pay only for what you use', d: 'No contracts, no minimums — pay per call' },
    ],
    whyList: es ? [
      { t: '💰 Pago por uso (x402)', d: 'Cobra automáticamente cada vez que alguien usa tu modelo. Sin facturas, sin esperas — el dinero llega directo a tu wallet.' },
      { t: '🪪 Identidad verificada (ERC-8004)', d: 'Cada agente tiene un "pasaporte digital" que prueba quién lo creó y su historial de uso. Confía en agentes verificados.' },
      { t: '🎮 Prueba gratis antes de pagar', d: 'Corre demos en un entorno seguro. Si te gusta, pagas. Si no, no gastas nada.' },
      { t: '⚡ Pagos instantáneos en AVAX', d: 'Los creadores reciben su pago en segundos, no en 30 días. Sin intermediarios, sin comisiones ocultas.' },
    ] : [
      { t: '💰 Pay per use (x402)', d: 'Get paid automatically every time someone uses your model. No invoices, no waiting — money goes straight to your wallet.' },
      { t: '🪪 Verified identity (ERC-8004)', d: 'Every agent has a "digital passport" proving who created it and its usage history. Trust verified agents.' },
      { t: '🎮 Try free before you pay', d: 'Run demos in a safe environment. If you like it, pay. If not, spend nothing.' },
      { t: '⚡ Instant payments in AVAX', d: 'Creators get paid in seconds, not 30 days. No middlemen, no hidden fees.' },
    ],
    useCasesList: es ? [
      { t: 'Analítica y pronósticos', d: 'Modelos predictivos para ingresos, demanda y forecasting.' },
      { t: 'Atención al cliente y copilots', d: 'Agentes para soporte y automatización interna.' },
      { t: 'Trading y agentes DeFi', d: 'Modelos para gestión de portafolio y estrategias.' },
      { t: 'Herramientas internas y automatizaciones', d: 'Modelos a medida para optimizar flujos de trabajo.' },
    ] : [
      { t: 'Analytics & forecasting', d: 'Predictive models for revenue, demand, and market forecasting.' },
      { t: 'Customer support & copilots', d: 'Autonomous agents for customer service and internal automation.' },
      { t: 'Trading & DeFi agents', d: 'Specialized models for portfolio management and trading strategies.' },
      { t: 'Internal tools & automations', d: 'Custom models to streamline workflows and internal operations.' },
    ],
    featuredModels: es ? [
      { name: 'Pronóstico de Ventas Pro', desc: 'Analítica predictiva para proyección de ingresos', tags: ['Analítica','Verificado','Enterprise'], sub: '0.1 AVAX/uso', perp: '50 AVAX', chain: 'Avalanche' },
      { name: 'Agente de Riesgo DeFi', desc: 'Agente autónomo para gestión de riesgo de portafolio', tags: ['Agente','DeFi','Verificado'], sub: '0.2 AVAX/uso', perp: '80 AVAX', chain: 'Avalanche' },
      { name: 'Copiloto de Soporte', desc: 'Automatización de atención al cliente con IA', tags: ['NLP','Copilot','Verificado'], sub: '0.05 AVAX/uso', perp: '30 AVAX', chain: 'Avalanche' },
    ] : [
      { name: 'Sales Forecasting Pro', desc: 'Predictive analytics for revenue forecasting', tags: ['Analytics','Verified','Enterprise'], sub: '0.1 AVAX/use', perp: '50 AVAX', chain: 'Avalanche' },
      { name: 'DeFi Risk Agent', desc: 'Autonomous agent for portfolio risk management', tags: ['Agent','DeFi','Verified'], sub: '0.2 AVAX/use', perp: '80 AVAX', chain: 'Avalanche' },
      { name: 'Customer Support Copilot', desc: 'AI-powered customer service automation', tags: ['NLP','Copilot','Verified'], sub: '0.05 AVAX/use', perp: '30 AVAX', chain: 'Avalanche' },
    ],
    footerTagline: es ? 'Agentes de IA que cobran por uso en Avalanche.' : 'AI agents that get paid per use on Avalanche.',
    footerCols: es ? [
      { h: 'Producto', items: ['Explorar','Precios','Hoja de ruta'] },
      { h: 'Desarrolladores', items: ['Docs','API','GitHub'] },
      { h: 'Compañía', items: ['Acerca de','Contacto'] },
      { h: 'Comunidad', items: ['X (Twitter)','Discord','Blog'] },
    ] : [
      { h: 'Product', items: ['Explore','Pricing','Roadmap'] },
      { h: 'Developers', items: ['Docs','API','GitHub'] },
      { h: 'Company', items: ['About','Contact'] },
      { h: 'Community', items: ['X (Twitter)','Discord','Blog'] },
    ],
    footerCopyright: (year: number) => es ? `© ${year} WasiAI. Todos los derechos reservados.` : `© ${year} WasiAI. All rights reserved.`,
  }), [es])

  const gradientBg = (t: any) => ({
    minHeight: '100vh',
    background: [
      'radial-gradient(900px 520px at 88% -140px, rgba(46,160,255,0.22), rgba(46,160,255,0) 60%)',
      'radial-gradient(700px 420px at -120px 240px, rgba(124,92,255,0.16), rgba(124,92,255,0) 55%)',
      'linear-gradient(180deg, #0b1422 0%, #0a111c 50%, #070b12 80%, #05080d 100%)'
    ].join(', '),
    color: 'oklch(0.985 0 0)'
  })

  const panelSx = {
    borderRadius: '16px',
    border: '1px solid',
    borderColor: { xs: 'oklch(0.26 0 0)', md: 'oklch(0.22 0 0)' },
    background: {
      xs: 'linear-gradient(180deg, rgba(22,26,36,0.75), rgba(12,15,24,0.75))',
      md: 'linear-gradient(180deg, rgba(22,26,36,0.6), rgba(12,15,24,0.6))'
    },
    boxShadow: {
      xs: '0 0 0 1px rgba(255,255,255,0.03) inset, 0 10px 26px rgba(0,0,0,0.45)',
      md: '0 0 0 1px rgba(255,255,255,0.02) inset, 0 8px 24px rgba(0,0,0,0.35)'
    },
    backdropFilter: 'blur(8px)'
  } as const

  return (
    <Box sx={gradientBg}>


      {/* Hero */}
      <Container maxWidth="lg" sx={{ py: { xs: 10, md: 14 } }}>
        <Grid container spacing={6} alignItems="center">
          <Grid item xs={12} md={7}>
            <Stack spacing={3}>
              <Typography component="h1" sx={{
                fontSize: { xs: 42, md: 68 },
                fontWeight: 800,
                lineHeight: 1.05,
                letterSpacing: '-0.02em'
              }}>{L.heroTitle}</Typography>
              <Typography variant="body1" sx={{ color: 'oklch(0.78 0 0)', fontSize: { xs: 16, md: 18 }, maxWidth: 720 }}>
                {L.heroBody}
              </Typography>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ pt: 1 }}>
                <Button size="large" sx={{
                  backgroundImage: 'linear-gradient(90deg, #7c5cff, #2ea0ff)',
                  color: '#fff',
                  px: 3.5,
                  py: 1.25,
                  borderRadius: '12px',
                  boxShadow: '0 6px 20px rgba(46,160,255,0.25)',
                  '&:hover': { filter: 'brightness(1.05)', backgroundImage: 'linear-gradient(90deg, #7c5cff, #2ea0ff)' }
                }} component={Link} href={to('/models')}>{L.ctaExplore}</Button>
                <Button variant="outlined" size="large" sx={{ borderColor: 'oklch(0.28 0 0)', color: 'oklch(0.90 0 0)', borderRadius: '12px', px: 3.5, py: 1.25, backgroundColor: 'rgba(255,255,255,0.02)' }} component={Link} href={to('/publish/wizard')}>{L.ctaPublish}</Button>
              </Stack>
              <Stack direction="row" spacing={1.2} sx={{ pt: 1 }}>
                {['Avalanche','x402','ERC-8004'].map((c)=> (
                  <Chip key={c} size="small" label={c} sx={{ bgcolor: c === 'Avalanche' ? 'rgba(232,65,66,0.15)' : 'rgba(36,48,68,0.5)', color: c === 'Avalanche' ? '#ff6b6b' : '#b9d7ff', borderRadius: '999px', border: c === 'Avalanche' ? '1px solid rgba(232,65,66,0.35)' : '1px solid rgba(120,150,200,0.25)' }} />
                ))}
              </Stack>
            </Stack>
          </Grid>
          <Grid item xs={12} md={5}>
            <Card sx={panelSx}>
              <CardContent sx={{ p: 3.5 }}>
                <Stack spacing={2}>
                  <Stack spacing={0.5}>
                    <Typography sx={{ fontSize: 20, fontWeight: 700, color: 'oklch(0.97 0 0)', letterSpacing: '-0.01em' }}>{L.demoCard.name}</Typography>
                    <Typography variant="body2" sx={{ color: 'oklch(0.84 0 0)' }}>{L.demoCard.desc}</Typography>
                  </Stack>
                  <Stack direction="row" spacing={1} flexWrap="wrap">
                    {L.demoCard.tags.map((t)=> (
                      <Chip key={t} size="small" label={t} sx={{ bgcolor: 'rgba(124,92,255,0.14)', color: '#cbbfff', border: '1px solid rgba(124,92,255,0.32)', borderRadius: '999px' }} />
                    ))}
                  </Stack>
                  <Stack spacing={1} sx={{ borderTop: '1px solid', borderColor: 'oklch(0.20 0 0)', pt: 1 }}>
                    <Stack direction="row" justifyContent="space-between">
                      <Typography variant="body2" sx={{ color: 'oklch(0.78 0 0)' }}>{L.subscription}</Typography>
                      <Typography variant="body2" sx={{ color: '#4fe1ff', fontWeight: 700 }}>{L.from} 0.1 AVAX/{es ? 'uso' : 'use'}</Typography>
                    </Stack>
                    <Stack direction="row" justifyContent="space-between">
                      <Typography variant="body2" sx={{ color: 'oklch(0.78 0 0)' }}>{L.perpetual}</Typography>
                      <Typography variant="body2" sx={{ color: '#4fe1ff', fontWeight: 700 }}>{L.from} 10 AVAX</Typography>
                    </Stack>
                  </Stack>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                    <Button fullWidth sx={{ backgroundImage: 'linear-gradient(90deg, #7c5cff, #2ea0ff)', color: '#fff', height: 44, borderRadius: '12px', boxShadow: '0 6px 18px rgba(46,160,255,0.25)' }}>{L.runDemo}</Button>
                    <Button fullWidth variant="outlined" sx={{ borderColor: 'oklch(0.28 0 0)', color: 'oklch(0.90 0 0)', height: 44, borderRadius: '12px', backgroundColor: 'rgba(255,255,255,0.02)' }}>{L.viewDetails}</Button>
                  </Stack>
                  <Box sx={{ mt: 1, p: 2, borderRadius: '12px', bgcolor: 'rgba(2,6,12,0.7)', border: '1px solid', borderColor: 'oklch(0.20 0 0)', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: 12, color: 'oklch(0.75 0 0)' }}>
                    <Box sx={{ color: 'oklch(0.65 0 0)' }}>{'> '}<Box component="span" sx={{ color: '#4fe1ff' }}>invoke_model</Box></Box>
                    <Box sx={{ color: 'oklch(0.65 0 0)' }}>{'{'}<Box component="span" sx={{ color: '#ffb86b' }}>"prediction"</Box><Box component="span" sx={{ color: 'oklch(0.75 0 0)' }}>: </Box><Box component="span" sx={{ color: '#8ef18b' }}>0.94</Box>,</Box>
                    <Box sx={{ pl: 2, color: 'oklch(0.65 0 0)' }}><Box component="span" sx={{ color: '#ffb86b' }}>"confidence"</Box><Box component="span" sx={{ color: 'oklch(0.75 0 0)' }}>: </Box><Box component="span" sx={{ color: '#8ef18b' }}>0.87</Box></Box>
                    <Box sx={{ color: 'oklch(0.65 0 0)' }}>{'}'}</Box>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Container>

      {/* How it works */}
      <Box sx={{ borderTop: '1px solid', borderColor: 'oklch(0.18 0 0)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.045)' }}>
        <Container maxWidth="lg" sx={{ py: { xs: 5, md: 12 } }}>
          <Typography variant="h3" fontWeight={800} textAlign="center" sx={{ mb: { xs: 6, md: 9 }, letterSpacing: '-0.016em', color: 'oklch(0.99 0 0)', fontSize: { xs: 30, md: 48 } }}>{L.howItWorks}</Typography>

          <Typography sx={{ mb: 2.5, fontWeight: 700, color: '#39d0ff' }}>{L.forCreators}</Typography>
          <Grid container spacing={{ xs: 2, md: 3 }} sx={{ mb: { xs: 5, md: 7 } }}>
            {L.creatorsSteps.map((s, i) => (
              <Grid key={s.t} item xs={12} md={4} sx={{ display: 'flex' }}>
                <Card sx={{ ...panelSx, position: 'relative', height: '100%', display: 'flex', flexDirection: 'column' }}>
                  <CardContent sx={{ p: { xs: 3, md: 3.25 }, flexGrow: 1, minHeight: { xs: 160, md: 240 } }}>
                    <Stack spacing={{ xs: 0.9, md: 1.25 }}>
                      <Stack direction="row" alignItems="center" spacing={1.1}>
                        <Box sx={{ width: { xs: 34, md: 44 }, height: { xs: 34, md: 44 }, borderRadius: '12px', background: 'linear-gradient(135deg, #8b5cf6, #6ee7ff)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 12px 26px rgba(80,225,255,0.24)' }}>
                          <Box sx={{ color: '#fff' }}>{i===0 ? <UploadRounded fontSize="small" /> : i===1 ? <LockRounded fontSize="small" /> : <FlashOnRounded fontSize="small" />}</Box>
                        </Box>
                        <Typography variant="caption" sx={{ color: 'oklch(0.74 0 0)', fontSize: { xs: 13, md: 15 } }}>{s.k}</Typography>
                      </Stack>
                      <Typography sx={{ fontSize: { xs: 22, md: 28 }, fontWeight: 800, color: 'oklch(0.99 0 0)', letterSpacing: '-0.015em' }}>{s.t}</Typography>
                      <Typography variant="body2" sx={{ color: 'oklch(0.88 0 0)', fontSize: { xs: 15.5, md: 17.5 } }}>{s.d}</Typography>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>

          <Typography sx={{ mb: 2.5, fontWeight: 700, color: '#35e0b6' }}>{L.forTeams}</Typography>
          <Grid container spacing={{ xs: 2, md: 3 }}>
            {L.teamsSteps.map((s, i) => (
              <Grid key={s.t} item xs={12} md={4} sx={{ display: 'flex' }}>
                <Card sx={{ ...panelSx, position: 'relative', height: '100%', display: 'flex', flexDirection: 'column' }}>
                  <CardContent sx={{ p: 3.25, flexGrow: 1, minHeight: { xs: 170, md: 240 } }}>
                    <Stack spacing={1.25}>
                      <Stack direction="row" alignItems="center" spacing={1.1}>
                        <Box sx={{ width: { xs: 40, md: 44 }, height: { xs: 40, md: 44 }, borderRadius: '12px', background: 'linear-gradient(135deg, #2ea0ff, #6ee7ff)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 12px 26px rgba(46,160,255,0.24)' }}>
                          <Box sx={{ color: '#fff' }}>{i===0 ? <BoltRounded fontSize="small" /> : i===1 ? <LockRounded fontSize="small" /> : <ArrowForwardRounded fontSize="small" />}</Box>
                        </Box>
                        <Typography variant="caption" sx={{ color: 'oklch(0.74 0 0)', fontSize: { xs: 14, md: 15 } }}>{s.k}</Typography>
                      </Stack>
                      <Typography sx={{ fontSize: { xs: 23, md: 26 }, fontWeight: 800, color: 'oklch(0.99 0 0)', letterSpacing: '-0.015em' }}>{s.t}</Typography>
                      <Typography variant="body2" sx={{ color: 'oklch(0.88 0 0)', fontSize: { xs: 16.5, md: 17.5 } }}>{s.d}</Typography>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* Featured models */}
      <Box sx={{ borderTop: '1px solid', borderColor: 'oklch(0.20 0 0)' }}>
        <Container maxWidth="lg" sx={{ py: { xs: 6, md: 12 } }}>
          <Stack spacing={1.25} sx={{ mb: 5 }}>
            <Typography variant="h3" fontWeight={800} sx={{ letterSpacing: '-0.014em', color: 'oklch(0.99 0 0)', fontSize: { xs: 28, md: 40 } }}>{L.featured}</Typography>
            <Typography variant="body1" sx={{ color: 'oklch(0.86 0 0)', fontSize: { xs: 15.5, md: 16.5 } }}>{L.featuredSub}</Typography>
          </Stack>
          <Grid container spacing={3}>
            {L.featuredModels.map((m) => (
              <Grid key={m.name} item xs={12} md={4}>
                <Card sx={panelSx}>
                  <CardContent sx={{ p: { xs: 3, md: 3.5 } }}>
                    <Stack spacing={2}>
                      <Stack spacing={0.75}>
                        <Typography variant="h6" fontWeight={800} sx={{ fontSize: { xs: 20, md: 22 }, color: 'oklch(0.985 0 0)', letterSpacing: '-0.012em' }}>{m.name}</Typography>
                        <Typography variant="body2" sx={{ color: 'oklch(0.86 0 0)', fontSize: { xs: 15.5, md: 16.5 } }}>{m.desc}</Typography>
                      </Stack>
                      <Stack direction="row" spacing={1} flexWrap="wrap">
                        {m.tags.map((t)=> (<Chip key={t} size="small" label={t} sx={{ bgcolor: 'rgba(43, 56, 77, 0.35)', color: 'oklch(0.85 0 0)' }} />))}
                      </Stack>
                      <Stack spacing={1} sx={{ borderTop: '1px solid', borderColor: 'oklch(0.20 0 0)', pt: 1 }}>
                        <Stack direction="row" justifyContent="space-between">
                          <Typography variant="body2" sx={{ color: 'oklch(0.86 0 0)', fontSize: { xs: 14.5, md: 15.5 } }}>{es ? 'Por uso' : 'Per use'}: {m.sub}</Typography>
                          <Typography variant="body2" sx={{ color: '#4fe1ff', fontWeight: 800, fontSize: { xs: 14.5, md: 15.5 } }}>{m.perp}</Typography>
                        </Stack>
                      </Stack>
                      <Stack direction="row" spacing={1}>
                        <Chip label="Avalanche" size="small" sx={{ bgcolor: 'rgba(232,65,66,0.15)', color: '#ff6b6b', border: '1px solid rgba(232,65,66,0.35)', borderRadius: '999px' }} />
                        <Chip label={es ? '✓ Verificado' : '✓ Verified'} size="small" sx={{ bgcolor: 'rgba(46,160,255,0.12)', color: '#4fe1ff', border: '1px solid rgba(46,160,255,0.35)', borderRadius: '999px' }} />
                      </Stack>
                      <Stack direction="row" spacing={1}>
                        <Button variant="outlined" fullWidth sx={{ borderColor: 'oklch(0.26 0 0)', color: 'oklch(0.85 0 0)' }}>{L.viewModel}</Button>
                        <Button sx={{ minWidth: 40, bgcolor: 'oklch(0.28 0 0)', color: '#fff', '&:hover': { bgcolor: 'oklch(0.32 0 0)' } }}>▶</Button>
                      </Stack>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* Why WasiAI */}
      <Box sx={{ borderTop: '1px solid', borderColor: 'oklch(0.20 0 0)' }}>
        <Container maxWidth="lg" sx={{ py: { xs: 8, md: 12 } }}>
          <Typography variant="h3" fontWeight={800} textAlign="center" sx={{ mb: 7, letterSpacing: '-0.014em', color: 'oklch(0.99 0 0)', fontSize: { xs: 30, md: 42 } }}>{L.whyTitle}</Typography>
          <Grid container spacing={3}>
            {L.whyList.map((f) => (
              <Grid key={f.t} item xs={12} md={6}>
                <Card sx={panelSx}>
                  <CardContent sx={{ p: 3.5 }}>
                    <Stack spacing={1.1}>
                      <Typography variant="h6" fontWeight={800} sx={{ fontSize: { xs: 19, md: 21 }, color: 'oklch(0.985 0 0)', letterSpacing: '-0.011em' }}>{f.t}</Typography>
                      <Typography variant="body2" sx={{ color: 'oklch(0.86 0 0)', fontSize: { xs: 15.5, md: 16.5 } }}>{f.d}</Typography>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* Use cases */}
      <Box sx={{ borderTop: '1px solid', borderColor: 'oklch(0.20 0 0)' }}>
        <Container maxWidth="lg" sx={{ py: { xs: 8, md: 12 } }}>
          <Typography variant="h3" fontWeight={800} textAlign="center" sx={{ mb: 7, letterSpacing: '-0.014em', color: 'oklch(0.99 0 0)', fontSize: { xs: 30, md: 42 } }}>{L.useCases}</Typography>
          <Grid container spacing={3}>
            {L.useCasesList.map((u) => (
              <Grid key={u.t} item xs={12} md={6}>
                <Card sx={panelSx}>
                  <CardContent sx={{ p: { xs: 3, md: 3.5 }, display: 'flex', alignItems: { xs: 'flex-start', md: 'center' }, justifyContent: 'space-between', gap: { xs: 1.5, md: 2 } }}>
                    <Box>
                      <Typography variant="h6" fontWeight={800} sx={{ fontSize: { xs: 19, md: 21 }, color: 'oklch(0.985 0 0)', letterSpacing: '-0.011em' }}>{u.t}</Typography>
                      <Typography variant="body2" sx={{ color: 'oklch(0.86 0 0)', fontSize: { xs: 15.5, md: 16.5 } }}>{u.d}</Typography>
                    </Box>
                    <Button variant="text" sx={{ color: '#62e9ff' }} component={Link} href={to('/models')}>{L.seeModels}</Button>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* CTA Band */}
      <Box sx={{ borderTop: '1px solid', borderColor: 'oklch(0.20 0 0)' }}>
        <Container maxWidth="lg" sx={{ py: { xs: 8, md: 12 } }}>
          <Box sx={{ position: 'relative', borderRadius: '16px', overflow: 'hidden', border: '1px solid', borderColor: 'oklch(0.20 0 0)' }}>
            <Box sx={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, rgba(124,92,255,0.2), rgba(46,160,255,0.2))' }} />
            <Box sx={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(19,24,36,0.95), rgba(8,10,16,0.95))' }} />
            <Box sx={{ position: 'relative', p: { xs: 3.5, md: 8 }, textAlign: 'center' }}>
              <Typography fontWeight={800} sx={{ mb: 4, letterSpacing: '-0.015em', fontSize: { xs: 30, md: 50 }, color: 'oklch(0.99 0 0)' }}>{L.ctaBandTitle}</Typography>
              <Stack direction="row" spacing={2} justifyContent="center" sx={{ flexWrap: 'wrap' }}>
                <Button sx={{ height: { xs: 44, md: 48 }, px: 3.5, borderRadius: '12px', fontSize: { xs: 15, md: 16 }, backgroundImage: 'linear-gradient(90deg, #7c5cff, #2ea0ff)', color: '#fff', boxShadow: '0 6px 20px rgba(46,160,255,0.25)', '&:hover': { filter: 'brightness(1.05)', backgroundImage: 'linear-gradient(90deg, #7c5cff, #2ea0ff)' } }} component={Link} href={to('/models')}>{L.ctaBandExplore}</Button>
                <Button variant="outlined" sx={{ height: { xs: 44, md: 48 }, px: 3.5, borderRadius: '12px', fontSize: { xs: 15, md: 16 }, borderColor: 'oklch(0.22 0 0)', color: 'oklch(0.92 0 0)', backgroundColor: 'rgba(255,255,255,0.02)', '&:hover': { borderColor: 'oklch(0.24 0 0)', backgroundColor: 'rgba(255,255,255,0.03)' } }} component={Link} href={to('/publish/wizard')}>{L.ctaBandPublish}</Button>
              </Stack>
            </Box>
          </Box>
        </Container>
      </Box>

      {/* Footer */}
      <Box sx={{ borderTop: '1px solid', borderColor: 'oklch(0.18 0 0)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.045)', py: 6, bgcolor: 'rgba(2,4,8,0.4)' }}>
        <Container maxWidth="lg">
          <Grid container spacing={4} sx={{ mb: 4 }}>
            <Grid item xs={12} md={3}>
              <Stack spacing={1}>
                <Typography variant="h6" fontWeight={800}>
                  <Box component="span" sx={{ background: 'linear-gradient(90deg, #9b8cff, #50e1ff)', WebkitBackgroundClip: 'text', color: 'transparent' }}>WasiAI</Box>
                </Typography>
                <Typography variant="body2" sx={{ color: 'oklch(0.75 0 0)' }}>{L.footerTagline}</Typography>
              </Stack>
            </Grid>
            {L.footerCols.map((col) => (
              <Grid key={col.h} item xs={6} md={2.25 as any}>
                <Stack spacing={1.25}>
                  <Typography variant="subtitle2" fontWeight={700}>{col.h}</Typography>
                  <Stack spacing={0.75}>
                    {col.items.map((it) => (
                      <Typography key={it} variant="body2" sx={{ color: 'oklch(0.75 0 0)' }}>{it}</Typography>
                    ))}
                  </Stack>
                </Stack>
              </Grid>
            ))}
          </Grid>
          <Box sx={{ borderTop: '1px solid', borderColor: 'oklch(0.20 0 0)', pt: 2 }}>
            <Typography variant="caption" sx={{ color: 'oklch(0.65 0 0)' }}>
              {L.footerCopyright(new Date().getFullYear())}
            </Typography>
          </Box>
        </Container>
      </Box>
    </Box>
  )
}
