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
    <Box sx={{ minHeight: '100vh', background: 'linear-gradient(180deg, #0f2740 0%, #0b1626 30%, #0a111c 100%)' }}>
      <Box sx={{ p: { xs:2, md:4 }, maxWidth: 1100, mx: 'auto' }}>
      <Grid container spacing={3} alignItems="center">
        <Grid item xs={12} md={7}>
          <Stack spacing={2}>
            <Typography variant="h3" fontWeight={800} sx={{ color:'#fff' }}>{t('wizard.step0.title')}</Typography>
            <Typography sx={{ color:'#ffffffcc' }}>{t('wizard.step0.subtitle')}</Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap">
              <Chip label={t('wizard.step0.blocks.value.items.0')} sx={{ bgcolor: 'rgba(255,255,255,0.10)', color:'#fff', border:'1px solid rgba(255,255,255,0.18)' }} />
              <Chip label={t('wizard.step0.blocks.value.items.1')} sx={{ bgcolor: 'rgba(255,255,255,0.10)', color:'#fff', border:'1px solid rgba(255,255,255,0.18)' }} />
              <Chip label={t('wizard.step0.blocks.value.items.2')} sx={{ bgcolor: 'rgba(255,255,255,0.10)', color:'#fff', border:'1px solid rgba(255,255,255,0.18)' }} />
            </Stack>
            <Typography variant="body2" sx={{ color:'#ffffffcc' }}>{t('wizard.step0.pitch.body')}</Typography>
            <Stack direction="row" spacing={1}>
              <Button onClick={onStart} variant="contained" color="primary" size="large" endIcon={<ArrowForwardIcon />} sx={{ px: 3, backgroundImage:'linear-gradient(90deg, #7c5cff, #2ea0ff)', color:'#fff', textTransform:'none', fontWeight:800, boxShadow:'0 6px 20px rgba(46,160,255,0.25)', '&:hover': { filter:'brightness(1.05)', backgroundImage:'linear-gradient(90deg, #7c5cff, #2ea0ff)' } }}>
                {t('wizard.step0.cta')}
              </Button>
            </Stack>
          </Stack>
        </Grid>
        <Grid item xs={12} md={5}>
          <Paper variant="outlined" sx={{ p: 0, borderRadius: '16px', overflow:'hidden', border:'2px solid', borderColor:'oklch(0.30 0 0)', background:'linear-gradient(180deg, rgba(38,46,64,0.78), rgba(20,26,42,0.78))', boxShadow:'0 0 0 1px rgba(255,255,255,0.04) inset, 0 10px 28px rgba(0,0,0,0.40)', backdropFilter:'blur(10px)' }}>
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
              <Box sx={{ height: { xs: 200, md: 320 }, background: 'linear-gradient(135deg, #3b3f54 0%, #1a2033 100%)' }} />
            )}
          </Paper>
        </Grid>
      </Grid>

      <Paper variant="outlined" sx={{ p: { xs:2, md:3 }, borderRadius:'16px', mt: 4, border:'2px solid', borderColor:'oklch(0.30 0 0)', background:'linear-gradient(180deg, rgba(38,46,64,0.78), rgba(20,26,42,0.78))', boxShadow:'0 0 0 1px rgba(255,255,255,0.04) inset, 0 10px 28px rgba(0,0,0,0.40)', backdropFilter:'blur(10px)' }}>
        <Stack spacing={1}>
          <Typography variant="subtitle1" fontWeight={700} sx={{ color:'#fff' }}>{t('wizard.step0.steps.title')}</Typography>
          <Typography sx={{ color:'#ffffffcc' }}>{t('wizard.step0.steps.subtitle')}</Typography>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12} md={4}>
              <Typography variant="subtitle2" sx={{ color:'#fff' }}>{t('wizard.index.step1')}</Typography>
              <Typography sx={{ color:'#ffffffcc' }} variant="body2">{t('wizard.step1.subtitle')}</Typography>
            </Grid>
            <Grid item xs={12} md={4}>
              <Typography variant="subtitle2" sx={{ color:'#fff' }}>{t('wizard.index.step2')}</Typography>
              <Typography sx={{ color:'#ffffffcc' }} variant="body2">{t('wizard.step2.subtitle')}</Typography>
            </Grid>
            <Grid item xs={12} md={4}>
              <Typography variant="subtitle2" sx={{ color:'#fff' }}>{t('wizard.index.step3')}</Typography>
              <Typography sx={{ color:'#ffffffcc' }} variant="body2">{t('wizard.step3.subtitle')}</Typography>
            </Grid>
            <Grid item xs={12} md={4}>
              <Typography variant="subtitle2" sx={{ color:'#fff' }}>{t('wizard.index.step4')}</Typography>
              <Typography sx={{ color:'#ffffffcc' }} variant="body2">{t('wizard.step4.subtitle')}</Typography>
            </Grid>
            <Grid item xs={12} md={4}>
              <Typography variant="subtitle2" sx={{ color:'#fff' }}>{t('wizard.index.step5')}</Typography>
              <Typography sx={{ color:'#ffffffcc' }} variant="body2">{t('wizard.step5.subtitle')}</Typography>
            </Grid>
          </Grid>
        </Stack>
      </Paper>
      <Dialog
        open={askConnect}
        onClose={()=> setAskConnect(false)}
        fullWidth maxWidth="xs"
        PaperProps={{ sx: { borderRadius:'16px', border:'2px solid', borderColor:'oklch(0.30 0 0)', background:'linear-gradient(180deg, rgba(38,46,64,0.90), rgba(20,26,42,0.90))', boxShadow:'0 0 0 1px rgba(255,255,255,0.05) inset, 0 14px 36px rgba(0,0,0,0.45)', backdropFilter:'blur(10px)' } }}
      >
        <DialogTitle sx={{ fontWeight: 800, color:'#fff' }}>
          {t('wizard.index.connectModal.title')}
        </DialogTitle>
        <DialogContent sx={{ color:'#ffffffd6' }}>
          <Typography variant="body2" sx={{ color:'#ffffffcc' }}>
            {t('wizard.index.connectModal.body')}
          </Typography>
          <Box sx={{ mt: 2, display:'flex', justifyContent:'center' }}>
            {askConnect && <UnifiedConnectButton onBeforeOpen={()=> setAskConnect(false)} />}
          </Box>
        </DialogContent>
        <DialogActions sx={{ borderTop:'1px solid rgba(255,255,255,0.08)' }}>
          <Button onClick={()=> setAskConnect(false)} sx={{ textTransform:'none', color:'#fff' }}>{t('wizard.index.connectModal.close')}</Button>
        </DialogActions>
      </Dialog>
      </Box>
    </Box>
  )
}
