"use client";

import React, { useState } from 'react';
import {
  Container,
  Typography,
  Button,
  Box,
  Grid,
  Card,
  CardContent,
  Stack,
  Chip
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  Verified as VerifiedIcon,
  Security as SecurityIcon,
  Speed as SpeedIcon,
  AutoAwesome as StarsIcon,
  Layers as LayersIcon,
  Bolt as BoltIcon,
  RocketLaunch as RocketIcon
} from '@mui/icons-material';
import Link from 'next/link';
import {useTranslations, useLocale} from 'next-intl';

export default function LocaleHome() {
  const t = useTranslations('landing');
  const locale = useLocale();
  const heroSrcEnv = (process.env.NEXT_PUBLIC_LANDING_HERO_SRC || '').trim();
  const heroFallbackLocal = '/illustrations/landing-hero.png';
  const heroCandidate = heroSrcEnv || heroFallbackLocal;
  const [heroError, setHeroError] = useState(false);

  const BenefitIcon = ({ src, fallback }: { src?: string; fallback: React.ReactNode }) => {
    const [err, setErr] = useState(false)
    const real = (src || '').trim()
    if (!real || err) return <>{fallback}</>
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={real} alt="benefit" width={34} height={34} style={{ display:'block' }} onError={()=> setErr(true)} />
    )
  }

  const benefits = [
    {
      src: (process.env.NEXT_PUBLIC_BENEFIT_ICON1 || '').trim(),
      fallback: <SecurityIcon sx={{ fontSize: 34, color: 'primary.main' }} />,
      title: t('benefits.0.title'),
      desc: t('benefits.0.desc')
    },
    {
      src: (process.env.NEXT_PUBLIC_BENEFIT_ICON2 || '').trim(),
      fallback: <SpeedIcon sx={{ fontSize: 34, color: 'primary.main' }} />,
      title: t('benefits.1.title'),
      desc: t('benefits.1.desc')
    },
    {
      src: (process.env.NEXT_PUBLIC_BENEFIT_ICON3 || '').trim(),
      fallback: <LayersIcon sx={{ fontSize: 34, color: 'primary.main' }} />,
      title: t('benefits.2.title'),
      desc: t('benefits.2.desc')
    },
    {
      src: (process.env.NEXT_PUBLIC_BENEFIT_ICON4 || '').trim(),
      fallback: <BoltIcon sx={{ fontSize: 34, color: 'primary.main' }} />,
      title: t('benefits.3.title'),
      desc: t('benefits.3.desc')
    },
  ];

  const steps = [
    { k: 1, title: t('steps.0.title'), desc: t('steps.0.desc') },
    { k: 2, title: t('steps.1.title'), desc: t('steps.1.desc') },
    { k: 3, title: t('steps.2.title'), desc: t('steps.2.desc') },
  ];

  const testimonials = [
    { name: t('testimonials.0.name'), quote: t('testimonials.0.quote') },
    { name: t('testimonials.1.name'), quote: t('testimonials.1.quote') },
    { name: t('testimonials.2.name'), quote: t('testimonials.2.quote') },
  ];

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      {/* Hero minimal */}
      <Box>
        <Container maxWidth="lg" sx={{ py: { xs: 8, md: 12 } }}>
          <Grid container spacing={4} alignItems="center">
            <Grid item xs={12} md={7}>
              <Stack spacing={2}>
                <Chip icon={<VerifiedIcon />} label={t('badge')} sx={{ alignSelf: 'flex-start', bgcolor: 'rgba(0,0,0,0.06)' }} />
                <Typography variant="h2" component="h1" fontWeight={800}>{t('title')}</Typography>
                <Typography variant="h6" color="text.secondary">{t('subtitle')}</Typography>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mt: 1 }}>
                  <Button component={Link} href={`/${locale}/models`} size="large" variant="contained" color="primary" startIcon={<RocketIcon />}>{t('ctaExplore')}</Button>
                  <Button component={Link} href={`/${locale}/publish/wizard`} size="large" variant="outlined" startIcon={<UploadIcon /> }>{t('ctaPublish')}</Button>
                </Stack>
              </Stack>
            </Grid>
            <Grid item xs={12} md={5}>
              <Card sx={{ overflow:'hidden' }}>
                <CardContent sx={{ p:0 }}>
                  {!heroError ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={heroCandidate}
                      alt="landing hero"
                      style={{ width:'100%', height:'auto', display:'block' }}
                      onError={()=> setHeroError(true)}
                    />
                  ) : (
                    <Box sx={{ height: { xs: 200, md: 320 }, background: (t)=>`linear-gradient(135deg, ${t.palette.primary.light} 0%, ${t.palette.secondary.light} 100%)` }} />
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* Benefits */}
      <Container maxWidth="lg" sx={{ py: 6 }}>
        <Typography variant="h3" textAlign="center" fontWeight="bold" gutterBottom>
          {t('benefitsTitle')}
        </Typography>
        <Typography variant="body1" color="text.secondary" textAlign="center" sx={{ mb: 4 }}>
          {t('benefitsSubtitle')}
        </Typography>
        <Grid container spacing={3}>
          {benefits.map((b, i) => (
            <Grid item xs={12} sm={6} md={3} key={i}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Stack spacing={1.25}>
                    <Box>
                      <BenefitIcon src={b.src as string} fallback={b.fallback} />
                    </Box>
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
            {t('howTitle')}
          </Typography>
          <Grid container spacing={3} sx={{ mt: 1 }}>
            {steps.map((s, idx) => (
              <Grid item xs={12} md={4} key={idx}>
                <Card sx={{ height: '100%' }}>
                  <CardContent>
                    <Stack spacing={1}>
                      <Chip label={`${t('step')} ${s.k}`} color="primary" variant="outlined" sx={{ alignSelf: 'flex-start' }} />
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
          {t('storiesTitle')}
        </Typography>
        <Grid container spacing={3} sx={{ mt: 1 }}>
          {testimonials.map((tt, i) => (
            <Grid item xs={12} md={4} key={i}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Stack spacing={1}>
                    <StarsIcon sx={{ color: 'warning.main' }} />
                    <Typography variant="body1">“{tt.quote}”</Typography>
                    <Typography variant="body2" color="text.secondary">{tt.name}</Typography>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Container>

      {/* Final CTA minimal */}
      <Box sx={{ bgcolor: 'primary.main', color: 'primary.contrastText' }}>
        <Container maxWidth="lg" sx={{ py: 8 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={8}>
              <Typography variant="h4" fontWeight="bold">{t('ctaFinal.title')}</Typography>
              <Typography variant="body1" sx={{ opacity: 0.9, mt: 0.5 }}>
                {t('ctaFinal.subtitle')}
              </Typography>
            </Grid>
            <Grid item xs={12} md={4}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} justifyContent={{ md: 'flex-end' }}>
                <Button component={Link} href={`/${locale}/publish/wizard`} variant="contained" color="secondary" startIcon={<UploadIcon /> }>
                  {t('ctaPublish')}
                </Button>
                <Button component={Link} href={`/${locale}/models`} variant="outlined" sx={{ color: 'white', borderColor: 'white' }}>
                  {t('ctaExplore')}
                </Button>
              </Stack>
            </Grid>
          </Grid>
        </Container>
      </Box>
    </Box>
  );
}
