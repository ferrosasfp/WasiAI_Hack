"use client";

import React from 'react';
import { AppBar, Toolbar, Box, Typography, Container, Button, IconButton, Drawer, List, ListItem, ListItemButton, ListItemText, Stack, FormControl, InputLabel, Select, MenuItem, Skeleton } from '@mui/material';
import { ConnectButton as SuiConnectButton, useCurrentAccount as useSuiAccount } from '@mysten/dapp-kit';
import { UnifiedConnectButton } from '@/components/UnifiedConnectButton';
import MenuIcon from '@mui/icons-material/Menu';
import Link from 'next/link';
import {useTranslations, useLocale} from 'next-intl';
import { usePathname } from 'next/navigation';
import { useWalletEcosystem } from '@/contexts/WalletEcosystemContext';
import { useChains, useChainId, useSwitchChain, useAccount as useEvmAccount } from 'wagmi';

export function GlobalHeader() {
  const t = useTranslations();
  const locale = useLocale();
  const [open, setOpen] = React.useState(false);
  const pathname = usePathname();
  const { ecosystem, setEcosystem } = useWalletEcosystem();
  const chains = useChains();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const { isConnected: evmConnected } = useEvmAccount();
  const suiAcc = useSuiAccount();
  const suiConnected = !!suiAcc?.address;
  const isConnected = ecosystem === 'evm' ? evmConnected : suiConnected;
  const isMainnet = (process.env.NEXT_PUBLIC_NETWORK_ENV || '').toLowerCase() === 'mainnet'
  const enableSui = (process.env.NEXT_PUBLIC_ENABLE_SUI || '').toLowerCase() === 'true'
  const suiNet = (process.env.NEXT_PUBLIC_SUI_NETWORK || 'testnet').toLowerCase()
  const suiOption = { id: `sui:${suiNet}`, name: 'SUI' as const }
  const currentNetValue = ecosystem === 'evm' ? (chainId || '') : suiOption.id
  const [selectedNet, setSelectedNet] = React.useState<any>(currentNetValue)
  React.useEffect(() => {
    if (currentNetValue !== '' && currentNetValue != null) {
      setSelectedNet(currentNetValue)
    }
  }, [currentNetValue])
  const [mounted, setMounted] = React.useState(false)
  React.useEffect(() => { setMounted(true) }, [])
  const [uiReady, setUiReady] = React.useState(false)
  React.useEffect(() => {
    if (!mounted) return
    const t = setTimeout(()=> setUiReady(true), 160)
    return ()=> clearTimeout(t)
  }, [mounted])
  // Load preferred ecosystem+network when not connected (first client mount)
  React.useEffect(() => {
    if (!mounted) return
    if (!isConnected) {
      try {
        const prefEco = localStorage.getItem('preferred_ecosystem')
        const pref = localStorage.getItem('preferred_net')
        if (prefEco === 'evm' || prefEco === 'sui') {
          setEcosystem(prefEco as any)
        }
        if (pref) {
          let val: any = pref
          if (!isNaN(Number(pref))) val = Number(pref)
          setSelectedNet(val)
        }
      } catch {}
    }
  }, [mounted, isConnected, setEcosystem])
  const kindFromValue = (v: any): 'base'|'avax'|'sui'|undefined => {
    if (typeof v === 'number') {
      if (v === 8453 || v === 84532) return 'base'
      if (v === 43114 || v === 43113) return 'avax'
    } else if (typeof v === 'string' && v.startsWith('sui:')) {
      return 'sui'
    }
    return undefined
  }
  const LogoImg = ({ kind, size=20, title }: { kind: 'base'|'avax'|'sui', size?: number, title?: string }) => {
    const real = kind === 'base' ? '/icons/base.svg' : kind === 'avax' ? '/icons/avalanche.svg' : '/icons/sui.svg'
    const src = mounted ? real : '/icons/base.svg'
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt={'network'} title={title || kind} width={size} height={size} style={{ display:'block' }} onError={(e)=>{ (e.currentTarget as HTMLImageElement).style.visibility = 'hidden' }} />
    )
  }
  const nav = [
    { label: t('header.nav.explore'), href: `/${locale}/models` },
    { label: t('header.nav.publish'), href: `/${locale}/publish/wizard` },
    { label: t('header.nav.licenses'), href: `/${locale}/licenses` },
  ];
  const switchLocale = (next: 'en'|'es') => {
    if (next === locale) return;
    const parts = (pathname || '/').split('/');
    if (parts.length > 1 && (parts[1] === 'en' || parts[1] === 'es')) {
      parts[1] = next;
    } else {
      parts.splice(1, 0, next);
    }
    const nextPath = parts.join('/') || `/${next}`;
    try {
      // set cookie preference for 1 year
      document.cookie = `lang=${next}; Max-Age=${60*60*24*365}; Path=/`;
      // set a global navigation flag to suppress beforeunload prompts in pages
      (window as any).__navigating = true;
    } catch {}
    window.location.href = nextPath;
  };
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
              {/* Selector de idioma (desktop) */}
              <FormControl size="small" sx={{ minWidth: 86 }}>
                <Select
                  value={locale}
                  onChange={(e)=> switchLocale(e.target.value as 'en'|'es')}
                  displayEmpty
                  renderValue={(v)=> (
                    <Box component="span" sx={{ fontSize: 14 }}>{v === 'es' ? '🇪🇸 ES' : '🇺🇸 EN'}</Box>
                  )}
                >
                  <MenuItem value="es">🇪🇸 ES</MenuItem>
                  <MenuItem value="en">🇺🇸 EN</MenuItem>
                </Select>
              </FormControl>
              {/* Selector de Red (infiriendo ecosistema) */}
              {(mounted && uiReady) ? (
                <FormControl size="small" sx={{ minWidth: 56 }}>
                  <InputLabel id="network-label">{t('header.network.label')}</InputLabel>
                  <Select
                    labelId="network-label"
                    label={t('header.network.label')}
                    value={selectedNet}
                    suppressHydrationWarning
                    renderValue={(v)=>{
                      const kind = kindFromValue(v)
                      return (
                        <Box sx={{ display:'flex', alignItems:'center' }}>
                          {kind && <LogoImg kind={kind} size={20} title={kind === 'base' ? 'Base' : kind === 'avax' ? 'Avalanche' : 'SUI'} />}
                        </Box>
                      )
                    }}
                    disabled={isConnected}
                    onChange={(e)=>{
                      const v = e.target.value
                      setSelectedNet(v)
                      if (typeof v === 'number') {
                        setEcosystem('evm')
                        try { switchChain({ chainId: v }) } catch {}
                        try { localStorage.setItem('preferred_ecosystem', 'evm') } catch {}
                      } else if (typeof v === 'string' && v.startsWith('sui:')) {
                        setEcosystem('sui')
                        try { localStorage.setItem('preferred_ecosystem', 'sui') } catch {}
                      }
                      try { localStorage.setItem('preferred_net', String(v)) } catch {}
                    }}
                  >
                    {chains.map(c => {
                      const kind = (c.id === 84532 || c.id === 8453) ? 'base' : 'avax'
                      const title = kind === 'base' ? 'Base' : 'Avalanche'
                      return (
                        <MenuItem key={`evm-${c.id}`} value={c.id} title={title}>
                          <LogoImg kind={kind as any} title={title} />
                        </MenuItem>
                      )
                    })}
                    {enableSui && (
                      <MenuItem key={suiOption.id} value={suiOption.id} title="SUI">
                        <LogoImg kind={'sui'} title="SUI" />
                      </MenuItem>
                    )}
                  </Select>
                </FormControl>
              ) : (
                <Skeleton variant="rounded" width={56} height={40} />
              )}
              {(mounted && uiReady) ? (
                (ecosystem === 'sui' && suiConnected) ? (
                  <SuiConnectButton>Wallet</SuiConnectButton>
                ) : (
                  <UnifiedConnectButton />
                )
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
              {/* Selector de idioma (mobile) */}
              <FormControl size="small" fullWidth>
                <Select
                  value={locale}
                  onChange={(e)=>{ setOpen(false); switchLocale(e.target.value as 'en'|'es'); }}
                  displayEmpty
                  renderValue={(v)=> (
                    <Box component="span" sx={{ fontSize: 14 }}>{v === 'es' ? '🇪🇸 ES' : '🇺🇸 EN'}</Box>
                  )}
                >
                  <MenuItem value="es">🇪🇸 ES</MenuItem>
                  <MenuItem value="en">🇺🇸 EN</MenuItem>
                </Select>
              </FormControl>
              {(mounted && uiReady) ? (
                <FormControl size="small" fullWidth>
                  <InputLabel id="network-label-m">{t('header.network.label')}</InputLabel>
                  <Select
                    labelId="network-label-m"
                    label={t('header.network.label')}
                    value={selectedNet}
                    suppressHydrationWarning
                    renderValue={(v)=>{
                      const kind = kindFromValue(v)
                      return (
                        <Box sx={{ display:'flex', alignItems:'center' }}>
                          {kind && <LogoImg kind={kind} size={20} title={kind === 'base' ? 'Base' : kind === 'avax' ? 'Avalanche' : 'SUI'} />}
                        </Box>
                      )
                    }}
                    disabled={isConnected}
                    onChange={(e)=>{
                      const v = e.target.value
                      setSelectedNet(v)
                      if (typeof v === 'number') {
                        setEcosystem('evm')
                        try { switchChain({ chainId: v }) } catch {}
                      } else if (typeof v === 'string' && v.startsWith('sui:')) {
                        setEcosystem('sui')
                      }
                      try { localStorage.setItem('preferred_net', String(v)) } catch {}
                    }}
                  >
                    {chains.map(c => {
                      const kind = (c.id === 84532 || c.id === 8453) ? 'base' : 'avax'
                      const title = kind === 'base' ? 'Base' : 'Avalanche'
                      return (
                        <MenuItem key={`m-evm-${c.id}`} value={c.id} title={title}>
                          <LogoImg kind={kind as any} title={title} />
                        </MenuItem>
                      )
                    })}
                    {enableSui && (
                      <MenuItem key={`m-${suiOption.id}`} value={suiOption.id} title="SUI">
                        <LogoImg kind={'sui'} title="SUI" />
                      </MenuItem>
                    )}
                  </Select>
                </FormControl>
              ) : (
                <Skeleton variant="rounded" width={320} height={40} />
              )}
              {(mounted && uiReady) ? <UnifiedConnectButton /> : <Skeleton variant="rounded" width={160} height={36} />}
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
