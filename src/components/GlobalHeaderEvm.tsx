"use client";

import React from 'react';
import { AppBar, Toolbar, Box, Typography, Container, Button, IconButton, Drawer, List, ListItem, ListItemButton, ListItemText, Stack, FormControl, InputLabel, Select, MenuItem, Skeleton } from '@mui/material';
import { UnifiedConnectButtonEvm } from '@/components/UnifiedConnectButtonEvm';
import MenuIcon from '@mui/icons-material/Menu';
import Link from 'next/link';
import {useTranslations, useLocale} from 'next-intl';
import { usePathname } from 'next/navigation';
import { useWalletEcosystem } from '@/contexts/WalletEcosystemContext';
import { useChains, useChainId, useSwitchChain, useAccount as useEvmAccount } from 'wagmi';

export function GlobalHeaderEvm() {
  const t = useTranslations();
  const locale = useLocale();
  const [open, setOpen] = React.useState(false);
  const pathname = usePathname();
  const { ecosystem, setEcosystem } = useWalletEcosystem();
  const chains = useChains();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const { isConnected: evmConnected } = useEvmAccount();
  const isConnected = evmConnected;
  const [selectedNet, setSelectedNet] = React.useState<any>(chainId || '');
  React.useEffect(() => {
    if (typeof chainId === 'number') setSelectedNet(chainId)
  }, [chainId])
  const [mounted, setMounted] = React.useState(false)
  React.useEffect(() => { setMounted(true) }, [])
  const [uiReady, setUiReady] = React.useState(false)
  React.useEffect(() => { if (!mounted) return; const t = setTimeout(()=> setUiReady(true), 160); return ()=> clearTimeout(t) }, [mounted])

  const nav = [
    { label: t('header.nav.explore'), href: `/${locale}/models` },
    { label: t('header.nav.publish'), href: `/${locale}/publish/wizard` },
    { label: t('header.nav.licenses'), href: `/${locale}/licenses` },
  ];
  const switchLocale = (next: 'en'|'es') => {
    if (next === locale) return;
    const parts = (pathname || '/').split('/');
    if (parts.length > 1 && (parts[1] === 'en' || parts[1] === 'es')) parts[1] = next; else parts.splice(1, 0, next);
    const nextPath = parts.join('/') || `/${next}`;
    try { document.cookie = `lang=${next}; Max-Age=${60*60*24*365}; Path=/`; (window as any).__navigating = true } catch {}
    window.location.href = nextPath;
  };

  const LogoImg = ({ kind, size=20, title }: { kind: 'base'|'avax', size?: number, title?: string }) => {
    const real = kind === 'base' ? '/icons/base.svg' : '/icons/avalanche.svg'
    const src = mounted ? real : '/icons/base.svg'
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt={'network'} title={title || kind} width={size} height={size} style={{ display:'block' }} onError={(e)=>{ (e.currentTarget as HTMLImageElement).style.visibility = 'hidden' }} />
    )
  }

  return (
    <AppBar position="sticky" color="default" elevation={1}>
      <Toolbar>
        <Container maxWidth="lg" sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="h6" fontWeight="bold" component={Link} href={`/${locale}`} style={{ textDecoration: 'none', color: 'inherit' }}>
              {t('header.brand')}
            </Typography>
            <Box sx={{ display: { xs: 'none', md: 'flex' }, gap: 1 }}>
              {nav.map((n) => (
                <Button key={n.href} component={Link} href={n.href} color={pathname === n.href ? 'primary' : 'inherit'}>
                  {n.label}
                </Button>
              ))}
            </Box>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Stack direction="row" spacing={1} sx={{ display: { xs: 'none', md: 'flex' }, alignItems:'center' }}>
              <FormControl size="small" sx={{ minWidth: 86 }}>
                <Select value={locale} onChange={(e)=> switchLocale(e.target.value as 'en'|'es')} displayEmpty renderValue={(v)=> (<Box component="span" sx={{ fontSize: 14 }}>{v === 'es' ? '🇪🇸 ES' : '🇺🇸 EN'}</Box>)}>
                  <MenuItem value="es">🇪🇸 ES</MenuItem>
                  <MenuItem value="en">🇺🇸 EN</MenuItem>
                </Select>
              </FormControl>
              {(mounted && uiReady) ? (
                <FormControl size="small" sx={{ minWidth: 56 }}>
                  <InputLabel id="network-label">{t('header.network.label')}</InputLabel>
                  <Select labelId="network-label" label={t('header.network.label')} value={selectedNet} suppressHydrationWarning renderValue={(v)=>{
                    const kind = (v===8453||v===84532)?'base':'avax'
                    const title = kind==='base'?'Base':'Avalanche'
                    return (<Box sx={{ display:'flex', alignItems:'center' }}><LogoImg kind={kind as any} size={20} title={title} /></Box>)
                  }} disabled={isConnected} onChange={(e)=>{
                    const v = e.target.value as number
                    setSelectedNet(v)
                    try { switchChain({ chainId: v }) } catch {}
                    setEcosystem('evm')
                    try { localStorage.setItem('preferred_ecosystem', 'evm') } catch {}
                    try { localStorage.setItem('preferred_net', String(v)) } catch {}
                  }}>
                    {chains.map(c => {
                      const kind = (c.id === 84532 || c.id === 8453) ? 'base' : 'avax'
                      const title = kind === 'base' ? 'Base' : 'Avalanche'
                      return (
                        <MenuItem key={`evm-${c.id}`} value={c.id} title={title}>
                          <LogoImg kind={kind as any} title={title} />
                        </MenuItem>
                      )
                    })}
                  </Select>
                </FormControl>
              ) : (
                <Skeleton variant="rounded" width={56} height={40} />
              )}
              {(mounted && uiReady) ? (
                <UnifiedConnectButtonEvm />
              ) : (
                <Skeleton variant="rounded" width={140} height={36} />
              )}
            </Stack>
            <IconButton edge="end" sx={{ display: { xs: 'inline-flex', md: 'none' } }} onClick={() => setOpen(true)}>
              <MenuIcon />
            </IconButton>
          </Box>
        </Container>
      </Toolbar>
      <Drawer anchor="right" open={open} onClose={() => setOpen(false)}>
        <Box sx={{ width: 320, p: 2 }} role="presentation" onKeyDown={() => setOpen(false)}>
          <Box sx={{ mb: 2 }}>
            <Stack spacing={1}>
              <FormControl size="small" fullWidth>
                <Select value={locale} onChange={(e)=>{ setOpen(false); switchLocale(e.target.value as 'en'|'es'); }} displayEmpty renderValue={(v)=> (<Box component="span" sx={{ fontSize: 14 }}>{v === 'es' ? '🇪🇸 ES' : '🇺🇸 EN'}</Box>)}>
                  <MenuItem value="es">🇪🇸 ES</MenuItem>
                  <MenuItem value="en">🇺🇸 EN</MenuItem>
                </Select>
              </FormControl>
              {(mounted && uiReady) ? (
                <FormControl size="small" fullWidth>
                  <InputLabel id="network-label-m">{t('header.network.label')}</InputLabel>
                  <Select labelId="network-label-m" label={t('header.network.label')} value={selectedNet} suppressHydrationWarning renderValue={(v)=>{
                    const kind = (v===8453||v===84532)?'base':'avax'
                    const title = kind==='base'?'Base':'Avalanche'
                    return (<Box sx={{ display:'flex', alignItems:'center' }}><LogoImg kind={kind as any} size={20} title={title} /></Box>)
                  }} disabled={isConnected} onChange={(e)=>{
                    const v = e.target.value as number
                    setSelectedNet(v)
                    try { switchChain({ chainId: v }) } catch {}
                    setEcosystem('evm')
                    try { localStorage.setItem('preferred_net', String(v)) } catch {}
                  }}>
                    {chains.map(c => {
                      const kind = (c.id === 84532 || c.id === 8453) ? 'base' : 'avax'
                      const title = kind === 'base' ? 'Base' : 'Avalanche'
                      return (
                        <MenuItem key={`m-evm-${c.id}`} value={c.id} title={title}>
                          <LogoImg kind={kind as any} title={title} />
                        </MenuItem>
                      )
                    })}
                  </Select>
                </FormControl>
              ) : (
                <Skeleton variant="rounded" width={320} height={40} />
              )}
              {(mounted && uiReady) ? <UnifiedConnectButtonEvm /> : <Skeleton variant="rounded" width={160} height={36} />}
            </Stack>
          </Box>
          <List>
            {nav.map((n) => (
              <ListItem key={n.href} disablePadding>
                <ListItemButton component={Link} href={n.href} selected={pathname === n.href}>
                  <ListItemText primary={n.label} />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </Box>
      </Drawer>
    </AppBar>
  );
}
