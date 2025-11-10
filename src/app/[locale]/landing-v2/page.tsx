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
  const [tokenSym, setTokenSym] = React.useState<'ETH'|'AVAX'>('ETH')
  React.useEffect(()=>{
    const compute = () => {
      try {
        const v = typeof window !== 'undefined' ? window.localStorage.getItem('preferred_net') : null
        const id = v ? Number(v) : undefined
        const isBase = id === 8453 || id === 84532
        setTokenSym(isBase ? 'ETH' : 'AVAX')
      } catch {}
    }
    compute()
    const onFocus = () => compute()
    const onVis = () => { if (document.visibilityState === 'visible') compute() }
    const onEvt = (e: Event) => {
      try {
        const anyEvt = e as any
        const id = Number(anyEvt?.detail?.id)
        const isBase = id === 8453 || id === 84532
        setTokenSym(isBase ? 'ETH' : 'AVAX')
      } catch { compute() }
    }
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onVis)
    window.addEventListener('preferred_net_changed', onEvt as any)
    return () => { window.removeEventListener('focus', onFocus); document.removeEventListener('visibilitychange', onVis); window.removeEventListener('preferred_net_changed', onEvt as any) }
  }, [])
  const L = React.useMemo(()=>({
    heroTitle: es ? 'Lanza IA más rápido con modelos con licencia.' : 'Ship AI faster with licensed models.',
    heroBody: es
      ? 'MarketplaceAI es un marketplace donde los builders publican y monetizan modelos agentes, analíticas, bots de trading, copilots y más. Las empresas descubren, prueban demos alojadas y compran licencias on-chain con opciones de suscripción o perpetuas.'
      : 'MarketplaceAI is a marketplace where AI builders publish and monetize models agents, analytics, trading bots, copilots, and more. Businesses discover, test hosted demos, and buy on-chain licenses with subscription or perpetual options.',
    ctaExplore: es ? 'Explorar modelos' : 'Explore models',
    ctaPublish: es ? 'Publica tu modelo' : 'Publish your model',
    howItWorks: es ? 'Cómo funciona' : 'How it works',
    forCreators: es ? 'Para creadores' : 'For creators',
    forTeams: es ? 'Para equipos' : 'For teams',
    featured: es ? 'Modelos destacados' : 'Featured models',
    featuredSub: es ? 'Modelos populares seleccionados por el equipo de MarketplaceAI.' : 'Popular models curated by the MarketplaceAI team.',
    whyTitle: es ? 'Por qué MarketplaceAI' : 'Why MarketplaceAI',
    useCases: es ? 'Hecho para casos reales' : 'Built for real use cases',
    seeModels: es ? 'Ver modelos →' : 'See models →',
    ctaBandTitle: es ? '¿Listo para publicar o probar tu primer modelo?' : 'Ready to publish or try your first model?',
    ctaBandExplore: es ? 'Explorar modelos' : 'Explore models',
    ctaBandPublish: es ? 'Publicar un modelo' : 'Publish a model',
    subscription: es ? 'Suscripción' : 'Subscription',
    perpetual: es ? 'Licencia perpetua' : 'Perpetual License',
    from: es ? 'Desde' : 'From',
    runDemo: es ? 'Probar demo' : 'Run demo',
    viewDetails: es ? 'Ver detalles' : 'View details',
    viewModel: es ? 'Ver modelo' : 'View model',
    demoCard: es
      ? { name: 'Pronóstico de Ventas Pro', desc: 'Analítica predictiva para proyección de ingresos', tags: ['Analítica','Modelo ML','Enterprise'] }
      : { name: 'Sales Forecasting Pro', desc: 'Advanced AI model for predictive sales analytics', tags: ['Analytics','ML Model','Enterprise'] },
    creatorsSteps: es ? [
      { k: '1/3', t: 'Publica tu modelo', d: 'Sube el artefacto, configura metadatos y precio' },
      { k: '2/3', t: 'Elige licenciamiento', d: 'Suscripción o perpetua, define derechos' },
      { k: '3/3', t: 'Cobra on-chain', d: 'Regalías on-chain y pagos transparentes' },
    ] : [
      { k: '1/3', t: 'Publish your model', d: 'Upload artifact, set metadata and price' },
      { k: '2/3', t: 'Choose licensing', d: 'Subscription or perpetual, define rights' },
      { k: '3/3', t: 'Get paid on-chain', d: 'On-chain royalties and transparent payouts' },
    ],
    teamsSteps: es ? [
      { k: '1/3', t: 'Descubre modelos', d: 'Busca por caso de uso y stack tecnológico' },
      { k: '2/3', t: 'Prueba demos alojadas', d: 'Corre una demo de inferencia en un entorno seguro' },
      { k: '3/3', t: 'Compra una licencia', d: 'Prueba on-chain de que puedes usarlo en producción' },
    ] : [
      { k: '1/3', t: 'Discover models', d: 'Search by use case and tech stack' },
      { k: '2/3', t: 'Test hosted demos', d: 'Run a safe, sandboxed inference demo' },
      { k: '3/3', t: 'Buy a license', d: 'Get on-chain proof you can run it in production' },
    ],
    whyList: es ? [
      { t: 'Licenciamiento on-chain', d: 'Propiedad verificable y regalías con pruebas on-chain transparentes.' },
      { t: 'Demos alojadas incluidas', d: 'Prueba modelos de forma segura antes de comprar.' },
      { t: 'Multi-chain listo', d: 'Soporte para Base, Avalanche y wallets EVM.' },
      { t: 'Reparto justo de ingresos', d: 'Estructura de comisiones transparente para que los creadores ganen más.' },
    ] : [
      { t: 'On-chain licensing', d: 'Verifiable ownership and royalties with transparent on-chain proofs.' },
      { t: 'Hosted demos included', d: 'Run models safely in a sandboxed environment before you buy.' },
      { t: 'Multi-chain ready', d: 'Support for Base, Avalanche and all EVM-compatible wallets.' },
      { t: 'Fair revenue sharing', d: 'Transparent fee structure ensuring creators keep more of what they earn.' },
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
      { name: 'Pronóstico de Ventas Pro', desc: 'Analítica predictiva para proyección de ingresos', tags: ['Analítica','Modelo ML','Enterprise'], sub: '$29/mes', perp: '$399', chain: 'Base' },
      { name: 'Agente de Riesgo DeFi', desc: 'Agente autónomo para gestión de riesgo de portafolio', tags: ['Agente','DeFi','Trading'], sub: '$49/mes', perp: '$599', chain: 'Base' },
      { name: 'Copiloto de Soporte', desc: 'Automatización de atención al cliente con IA', tags: ['NLP','Copilot','SaaS'], sub: '$39/mes', perp: '$499', chain: 'Avalanche' },
    ] : [
      { name: 'Sales Forecasting Pro', desc: 'Predictive analytics for revenue forecasting', tags: ['Analytics','ML Model','Enterprise'], sub: '$29/mo', perp: '$399', chain: 'Base' },
      { name: 'DeFi Risk Agent', desc: 'Autonomous agent for portfolio risk management', tags: ['Agent','DeFi','Trading'], sub: '$49/mo', perp: '$599', chain: 'Base' },
      { name: 'Customer Support Copilot', desc: 'AI-powered customer service automation', tags: ['NLP','Copilot','SaaS'], sub: '$39/mo', perp: '$499', chain: 'Avalanche' },
    ],
    footerTagline: es ? 'Lanza IA más rápido con modelos con licencia.' : 'Ship AI faster with licensed models.',
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
    footerCopyright: (year: number) => es ? `© ${year} MarketplaceAI. Todos los derechos reservados.` : `© ${year} MarketplaceAI. All rights reserved.`,
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
                {['Base','Avalanche'].map((c)=> (
                  <Chip key={c} size="small" label={c} sx={{ bgcolor: 'rgba(36,48,68,0.5)', color: '#b9d7ff', borderRadius: '999px', border: '1px solid rgba(120,150,200,0.25)' }} />
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
                      <Typography variant="body2" sx={{ color: '#4fe1ff', fontWeight: 700 }}>{L.from} {tokenSym==='ETH' ? '0.2 ETH/mo' : '2 AVAX/mo'}</Typography>
                    </Stack>
                    <Stack direction="row" justifyContent="space-between">
                      <Typography variant="body2" sx={{ color: 'oklch(0.78 0 0)' }}>{L.perpetual}</Typography>
                      <Typography variant="body2" sx={{ color: '#4fe1ff', fontWeight: 700 }}>{L.from} {(tokenSym==='ETH' ? '1 ETH' : '10 AVAX')}</Typography>
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
                          {(() => {
                            const token = m.chain === 'Base' ? 'ETH' : 'AVAX'
                            let sub = m.sub
                            if (sub.includes('$29')) sub = `0.2 ETH/mo`
                            else if (sub.includes('$49')) sub = `0.3 ETH/mo`
                            else if (sub.includes('$39')) sub = `1 AVAX/mo`
                            let perp = m.perp
                            if (perp.includes('$399')) perp = (m.chain === 'Base' ? '1 ETH' : '5 AVAX')
                            else if (perp.includes('$599')) perp = `2 ETH`
                            else if (perp.includes('$499')) perp = `10 AVAX`
                            return (
                              <>
                                <Typography variant="body2" sx={{ color: 'oklch(0.86 0 0)', fontSize: { xs: 14.5, md: 15.5 } }}>{es ? 'Desde' : 'From'} {sub}</Typography>
                                <Typography variant="body2" sx={{ color: '#4fe1ff', fontWeight: 800, fontSize: { xs: 14.5, md: 15.5 } }}>{perp}</Typography>
                              </>
                            )
                          })()}
                        </Stack>
                      </Stack>
                      <Chip label={m.chain} sx={{ width: 'fit-content', bgcolor: 'rgba(124,92,255,0.12)', color: '#c9b9ff', border: '1px solid rgba(124,92,255,0.35)', borderRadius: '999px' }} />
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

      {/* Why MarketplaceAI */}
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
                  <Box component="span" sx={{ background: 'linear-gradient(90deg, #9b8cff, #50e1ff)', WebkitBackgroundClip: 'text', color: 'transparent' }}>MarketplaceAI</Box>
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
