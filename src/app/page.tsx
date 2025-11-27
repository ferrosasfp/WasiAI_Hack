'use client';

import React from 'react';
import {
  Container,
  Typography,
  Button,
  Box,
  Grid,
  Card,
  CardContent,
  Stack,
  Chip,
  Divider,
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  Verified as VerifiedIcon,
  Security as SecurityIcon,
  Speed as SpeedIcon,
  RocketLaunch as RocketIcon,
  AutoAwesome as StarsIcon,
  Layers as LayersIcon,
  Bolt as BoltIcon,
} from '@mui/icons-material';
import { useCurrentAccount, ConnectButton } from '@mysten/dapp-kit';
import Link from 'next/link';

export default function HomePage() {
  const account = useCurrentAccount();

  const benefits = [
    { icon: <SecurityIcon sx={{ fontSize: 34, color: 'primary.main' }} />, title: 'Propiedad segura', desc: 'Licencias tokenizadas con cumplimiento en cadena.' },
    { icon: <SpeedIcon sx={{ fontSize: 34, color: 'primary.main' }} />, title: 'Pagos instantáneos', desc: 'Liquidaciones en segundos con tarifas bajas.' },
    { icon: <LayersIcon sx={{ fontSize: 34, color: 'primary.main' }} />, title: 'IPFS + cifrado', desc: 'Entrega protegida con IPFS y AES-GCM.' },
    { icon: <BoltIcon sx={{ fontSize: 34, color: 'primary.main' }} />, title: 'API o descarga', desc: 'Vende acceso por API y/o descarga perpetua.' },
  ];

  const steps = [
    { k: 1, title: 'Publica tu modelo', desc: 'Sube imagen y artefacto, define precios y derechos.' },
    { k: 2, title: 'Lista en el mercado', desc: 'Ambos precios (perpetuo y suscripción) en un solo listado.' },
    { k: 3, title: 'Vende y escala', desc: 'Compras con un clic y renovaciones sin fricción.' },
  ];

  const testimonials = [
    { name: 'Ana, creadora IA', quote: 'En 10 minutos publiqué y vendí mi primer modelo. El flujo es impecable.' },
    { name: 'Luis, startup ML', quote: 'La suscripción nos dio ingresos recurrentes desde la semana 1.' },
    { name: 'Caro, data scientist', quote: 'IPFS + cifrado me dio confianza para compartir modelos privados.' },
  ];

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      {/* Hero */}
      <Box sx={{ position: 'relative', overflow: 'hidden' }}>
        <Box
          sx={{
            position: 'absolute', inset: 0,
            backgroundImage: {
              xs: 'linear-gradient(rgba(10,10,20,.7), rgba(10,10,20,.85)), url(https://images.unsplash.com/photo-1555255707-c07966088b7b?q=80&w=1080&h=1600&fit=crop&auto=format)',
              sm: 'linear-gradient(rgba(10,10,20,.7), rgba(10,10,20,.85)), url(https://images.unsplash.com/photo-1555255707-c07966088b7b?q=80&w=1600&h=900&fit=crop&auto=format)',
              lg: 'linear-gradient(rgba(10,10,20,.7), rgba(10,10,20,.85)), url(https://images.unsplash.com/photo-1555255707-c07966088b7b?q=80&w=2400&h=1400&fit=crop&auto=format)',
            },
            backgroundSize: 'cover',
            backgroundPosition: { xs: 'center', sm: 'center' },
            filter: 'saturate(115%)',
          }}
        />
        <Container maxWidth="lg" sx={{ position: 'relative', py: { xs: 10, md: 16 }, color: 'white' }}>
          <Stack spacing={2} sx={{ maxWidth: 880 }}>
            <Chip icon={<VerifiedIcon />} label="Marketplace de modelos de IA en Sui" sx={{ alignSelf: 'flex-start', bgcolor: 'rgba(255,255,255,0.12)', color: 'white' }} />
            <Typography variant="h2" component="h1" fontWeight="bold">
              Publica, vende y escala tus modelos de IA
            </Typography>
            <Typography variant="h6" sx={{ opacity: 0.9 }}>
              Monetiza con licencias perpetuas o por suscripción. Entrega segura con IPFS y cifrado.
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mt: 1 }}>
              <Button component={Link} href="/models" size="large" variant="contained" color="secondary" startIcon={<RocketIcon />}>
                Explorar modelos
              </Button>
              <Button component={Link} href="/upload" size="large" variant="outlined" startIcon={<UploadIcon />} sx={{ color: 'white', borderColor: 'white', '&:hover': { borderColor: 'white', bgcolor: 'rgba(255,255,255,0.1)' } }}>
                Publicar modelo
              </Button>
            </Stack>
            {!account && (
              <Box sx={{ mt: 1 }}>
                <ConnectButton>Conectar wallet Sui</ConnectButton>
              </Box>
            )}
          </Stack>
        </Container>
      </Box>

      {/* Trust logos */}
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Grid container spacing={2} alignItems="center" justifyContent="center">
          {['pinata', 'ipfs', 'sui', 'move', 'mui'].map((x) => (
            <Grid item xs={6} sm={2.4 as any} key={x}>
              <Box sx={{
                height: 48, borderRadius: 1, border: '1px solid', borderColor: 'divider',
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'text.secondary',
                bgcolor: 'background.paper'
              }}>
                {x.toUpperCase()}
              </Box>
            </Grid>
          ))}
        </Grid>
      </Container>

      {/* Benefits */}
      <Container maxWidth="lg" sx={{ py: 6 }}>
        <Typography variant="h3" textAlign="center" fontWeight="bold" gutterBottom>
          Diseñado para creadores y equipos
        </Typography>
        <Typography variant="body1" color="text.secondary" textAlign="center" sx={{ mb: 4 }}>
          Seguridad, velocidad y control para escalar tu negocio de modelos de IA.
        </Typography>
        <Grid container spacing={3}>
          {benefits.map((b, i) => (
            <Grid item xs={12} sm={6} md={3} key={i}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Stack spacing={1.25}>
                    <Box>{b.icon}</Box>
                    <Typography variant="h6" fontWeight="bold">{b.title}</Typography>
                    <Typography variant="body2" color="text.secondary">{b.desc}</Typography>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Container>

      {/* How it works */}
      <Box sx={{ bgcolor: 'grey.50', borderTop: '1px solid', borderColor: 'divider' }}>
        <Container maxWidth="lg" sx={{ py: 8 }}>
          <Typography variant="h3" textAlign="center" fontWeight="bold" gutterBottom>
            ¿Cómo funciona?
          </Typography>
          <Grid container spacing={3} sx={{ mt: 1 }}>
            {steps.map((s) => (
              <Grid item xs={12} md={4} key={s.k}>
                <Card sx={{ height: '100%' }}>
                  <CardContent>
                    <Stack spacing={1}>
                      <Chip label={`Paso ${s.k}`} color="primary" variant="outlined" sx={{ alignSelf: 'flex-start' }} />
                      <Typography variant="h6" fontWeight="bold">{s.title}</Typography>
                      <Typography variant="body2" color="text.secondary">{s.desc}</Typography>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* Testimonials */}
      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Typography variant="h3" textAlign="center" fontWeight="bold" gutterBottom>
          Historias reales
        </Typography>
        <Grid container spacing={3} sx={{ mt: 1 }}>
          {testimonials.map((t, i) => (
            <Grid item xs={12} md={4} key={i}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Stack spacing={1}>
                    <StarsIcon sx={{ color: 'warning.main' }} />
                    <Typography variant="body1">“{t.quote}”</Typography>
                    <Typography variant="body2" color="text.secondary">{t.name}</Typography>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Container>

      {/* Final CTA */}
      <Box sx={{ bgcolor: 'primary.main', color: 'primary.contrastText' }}>
        <Container maxWidth="lg" sx={{ py: 8 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={8}>
              <Typography variant="h4" fontWeight="bold">Comienza hoy</Typography>
              <Typography variant="body1" sx={{ opacity: 0.9, mt: 0.5 }}>
                Publica tu primer modelo en minutos y habilita ventas globales.
              </Typography>
            </Grid>
            <Grid item xs={12} md={4}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} justifyContent={{ md: 'flex-end' }}>
                <Button component={Link} href="/upload" variant="contained" color="secondary" startIcon={<UploadIcon />}>
                  Publicar modelo
                </Button>
                <Button component={Link} href="/models" variant="outlined" sx={{ color: 'white', borderColor: 'white' }}>
                  Explorar modelos
                </Button>
              </Stack>
            </Grid>
          </Grid>
        </Container>
      </Box>
    </Box>
  );
}