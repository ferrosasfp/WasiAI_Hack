"use client";

import React from 'react';
import NextDynamic from 'next/dynamic'
import Image from 'next/image'
import { Box, Stack, Typography, Paper, Button, Grid, Chip, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import {useLocale, useTranslations} from 'next-intl';
import { useRouter } from 'next/navigation'
import { useWalletAddress } from '@/hooks/useWalletAddress'
const UnifiedConnectButton = NextDynamic<any>(
  () => import('@/components/UnifiedConnectButton').then(m => m.UnifiedConnectButton),
  { ssr: false }
)
// Removed wallet hooks from this page to keep bundle smaller; connection is handled inside UnifiedConnectButton

export const dynamic = 'force-dynamic'

export default function WizardIndexLocalized() {
  const t = useTranslations()
  const locale = useLocale()
  const base = `/${locale}/publish/wizard`
  const heroSrc = React.useMemo(() => (process.env.NEXT_PUBLIC_WIZARD_HERO_SRC || '').trim(), [])
  const router = useRouter()
  const [askConnect, setAskConnect] = React.useState(false)
  const { walletAddress } = useWalletAddress()

  const onStart = () => {
    if (walletAddress) {
      router.push(`${base}/step1`)
    } else {
      setAskConnect(true)
    }
  }

  // Si el modal está abierto y el usuario conecta, sólo cerramos el modal.
  // La navegación a step1 ocurre únicamente al pulsar "Start".
  // (handled inside UnifiedConnectButton)
  React.useEffect(() => {
    if (askConnect && walletAddress) {
      try { setAskConnect(false) } catch {}
      try { router.push(`${base}/step1`) } catch {}
    }
  }, [askConnect, walletAddress, router, base])

  // Clear reset flag when landing mounts (after Step 5 reset redirect)
  React.useEffect(() => {
    try { localStorage.removeItem('wizard_resetting'); sessionStorage.removeItem('wizard_resetting') } catch {}
  }, [])

  // Prefetch del siguiente paso para navegar más rápido tras el CTA
  React.useEffect(() => {
    try { router.prefetch(`${base}/step1`) } catch {}
  }, [router, base])

  return (
    <Box sx={{ p: { xs:2, md:4 }, maxWidth: 1100, mx: 'auto' }}>
      <Grid container spacing={3} alignItems="center">
        <Grid item xs={12} md={7}>
          <Stack spacing={2}>
            <Typography variant="h3" fontWeight={800}>{t('wizard.step0.title')}</Typography>
            <Typography color="text.secondary">{t('wizard.step0.subtitle')}</Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap">
              <Chip label={t('wizard.step0.blocks.value.items.0')} />
              <Chip label={t('wizard.step0.blocks.value.items.1')} />
              <Chip label={t('wizard.step0.blocks.value.items.2')} />
            </Stack>
            <Typography variant="body2" color="text.secondary">{t('wizard.step0.pitch.body')}</Typography>
            <Stack direction="row" spacing={1}>
              <Button onClick={onStart} variant="contained" color="primary" size="large" endIcon={<ArrowForwardIcon />} sx={{ px: 3 }}>
                {t('wizard.step0.cta')}
              </Button>
            </Stack>
          </Stack>
        </Grid>
        <Grid item xs={12} md={5}>
          <Paper variant="outlined" sx={{ p: 0, borderRadius: 2, overflow:'hidden' }}>
            {heroSrc ? (
              <Image
                src={heroSrc}
                alt="wizard hero"
                width={1200}
                height={800}
                sizes="(max-width: 900px) 100vw, 440px"
                style={{ width:'100%', height:'auto', display:'block' }}
                loading="lazy"
                priority={false}
              />
            ) : (
              <Box sx={{ height: { xs: 200, md: 320 }, background: (t)=>`linear-gradient(135deg, ${t.palette.primary.light} 0%, ${t.palette.success.light} 100%)` }} />
            )}
          </Paper>
        </Grid>
      </Grid>

      <Paper variant="outlined" sx={{ p: { xs:2, md:3 }, borderRadius:2, mt: 4 }}>
        <Stack spacing={1}>
          <Typography variant="subtitle1" fontWeight={700}>{t('wizard.step0.steps.title')}</Typography>
          <Typography color="text.secondary">{t('wizard.step0.steps.subtitle')}</Typography>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12} md={4}>
              <Typography variant="subtitle2">{t('wizard.index.step1')}</Typography>
              <Typography color="text.secondary" variant="body2">{t('wizard.step1.subtitle')}</Typography>
            </Grid>
            <Grid item xs={12} md={4}>
              <Typography variant="subtitle2">{t('wizard.index.step2')}</Typography>
              <Typography color="text.secondary" variant="body2">{t('wizard.step2.subtitle')}</Typography>
            </Grid>
            <Grid item xs={12} md={4}>
              <Typography variant="subtitle2">{t('wizard.index.step3')}</Typography>
              <Typography color="text.secondary" variant="body2">{t('wizard.step3.subtitle')}</Typography>
            </Grid>
            <Grid item xs={12} md={4}>
              <Typography variant="subtitle2">{t('wizard.index.step4')}</Typography>
              <Typography color="text.secondary" variant="body2">{t('wizard.step4.subtitle')}</Typography>
            </Grid>
            <Grid item xs={12} md={4}>
              <Typography variant="subtitle2">{t('wizard.index.step5')}</Typography>
              <Typography color="text.secondary" variant="body2">{t('wizard.step5.subtitle')}</Typography>
            </Grid>
          </Grid>
        </Stack>
      </Paper>
      <Dialog open={askConnect} onClose={()=> setAskConnect(false)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ fontWeight: 800 }}>
          {t('wizard.index.connectModal.title')}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            {t('wizard.index.connectModal.body')}
          </Typography>
          <Box sx={{ mt: 2, display:'flex', justifyContent:'center' }}>
            {askConnect && <UnifiedConnectButton onBeforeOpen={()=> setAskConnect(false)} />}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={()=> setAskConnect(false)}>{t('wizard.index.connectModal.close')}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
