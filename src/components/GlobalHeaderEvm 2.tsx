"use client";

import React from 'react';
import { AppBar, Toolbar, Box, Typography, Container, Button, IconButton, Drawer, List, ListItem, ListItemButton, ListItemText, Stack, FormControl, InputLabel, Select, MenuItem, Skeleton } from '@mui/material';
import UnifiedConnectButtonEvm from '@/components/UnifiedConnectButtonEvm';
import MenuIcon from '@mui/icons-material/Menu';
import Link from 'next/link';
import {useTranslations, useLocale} from 'next-intl';
import { usePathname } from 'next/navigation';
import { useWalletEcosystem } from '@/contexts/WalletEcosystemContext';
import { useChains, useChainId, useSwitchChain, useAccount as useEvmAccount } from 'wagmi';
import { getChainConfig, getChainType } from '@/config';

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

  const es = locale === 'es'
  const LL = React.useMemo(()=>({
    useCases: es ? 'Casos de uso' : 'Use cases',
    community: es ? 'Comunidad' : 'Community',
  }), [es])
  const nav = [
    { label: t('header.nav.explore'), href: `/${locale}/models` },
    { label: t('header.nav.publish'), href: `/${locale}/publish/wizard` },
    { label: t('header.nav.licenses'), href: `/${locale}/licenses` },
    { label: LL.useCases, href: `/${locale}/models` },
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
    <AppBar
      position="sticky"
      color="transparent"
      elevation={0}
      sx={{
        borderBottom: '1px solid',
        borderColor: 'oklch(0.20 0 0)',
        bgcolor: 'rgba(5,7,12,0.70)',
        backgroundImage: 'none',
        boxShadow: 'none',
        backdropFilter: 'blur(8px)',
        color: 'oklch(0.92 0 0)',
        position: 'relative',
        '&.MuiPaper-root': {
          backgroundColor: 'rgba(5,7,12,0.70) !important',
          backgroundImage: 'none',
          boxShadow: 'none'
        }
      }}
    >
      <Box sx={{ position:'absolute', inset: 0, bgcolor: 'rgba(5,7,12,0.70)', backdropFilter: 'blur(8px)', pointerEvents:'none' }} />
      <Toolbar sx={{ position:'relative' }}>
        <Container maxWidth="lg" sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 1.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="h6" fontWeight={800} component={Link} href={`/${locale}`} style={{ textDecoration: 'none' }} sx={{ fontSize: { xs: 18, md: 22 }, color: 'oklch(0.92 0 0)' }}>
              <Box component="span" sx={{ background: 'linear-gradient(90deg, #9b8cff, #50e1ff)', WebkitBackgroundClip: 'text', color: 'transparent' }}>
                {t('header.brand')}
              </Box>
            </Typography>
            <Box sx={{ display: { xs: 'none', md: 'flex' }, gap: 3 }}>
              {nav.map((n) => (
                <Button key={`${n.label}-${n.href}`} component={Link} href={n.href} color="inherit" variant="text" sx={{ textTransform: 'none', fontSize: 15, fontWeight: 600, color: 'oklch(0.92 0 0)', px: 0, '&:hover': { color: 'oklch(0.98 0 0)' } }}>
                  {n.label}
                </Button>
              ))}
            </Box>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Stack direction="row" spacing={0.25} sx={{ display: { xs: 'none', md: 'flex' }, alignItems:'center' }}>
              <FormControl size="small" sx={{ minWidth: 86 }}>
                <Select
                  value={locale}
                  onChange={(e)=> switchLocale(e.target.value as 'en'|'es')}
                  displayEmpty
                  renderValue={(v)=> (
                    <Box component="span" sx={{ display:'inline-flex', alignItems:'center', gap: 0.75, fontSize: 14, color: '#fff', px: 1.25, py: 0.5, bgcolor: 'rgba(17,20,28,0.95)', borderRadius: '10px', border: '1px solid oklch(0.22 0 0)' }}>
                      <Box component="span" aria-hidden> {v === 'es' ? '🇪🇸' : '🇺🇸'} </Box>
                      <Box component="span">{v === 'es' ? 'ES' : 'EN'}</Box>
                    </Box>
                  )}
                  sx={{ '& .MuiSelect-select': { py: 0, color: '#fff', WebkitTextFillColor: '#fff' }, '& .MuiSelect-select > span': { color: '#fff' }, '& .MuiSelect-select > span *': { color: '#fff' }, '& .MuiSelect-icon': { color: '#fff' }, '& fieldset': { display: 'none' } }}
                  MenuProps={{ PaperProps: { sx: { bgcolor: 'rgba(14,18,26,0.98)', border: '1px solid oklch(0.22 0 0)', color: 'oklch(0.95 0 0)' } } }}
                >
                  <MenuItem value="es" sx={{ color: '#fff' }}>ES</MenuItem>
                  <MenuItem value="en" sx={{ color: '#fff' }}>EN</MenuItem>
                </Select>
              </FormControl>
              {(mounted && uiReady) ? (
                <FormControl size="small" sx={{ minWidth: 116 }}>
                  <Select
                    value={selectedNet}
                    suppressHydrationWarning
                    displayEmpty
                    renderValue={(v)=>{
                      const config = getChainConfig(v)
                      const kind = config?.type || 'avax'
                      const title = config?.shortName || 'Unknown'
                      return (
                        <Box component="span" sx={{ display:'inline-flex', alignItems:'center', gap: 0.75, fontSize: 14, color: '#fff', px: 1.25, py: 0.5, bgcolor: 'rgba(17,20,28,0.95)', borderRadius: '10px', border: '1px solid oklch(0.22 0 0)' }}>
                          <LogoImg kind={kind as any} size={16} title={title} />
                          <Box component="span">{title}</Box>
                        </Box>
                      )
                    }}
                    onChange={(e)=>{
                      const v = e.target.value as number
                      setSelectedNet(v)
                      setTimeout(()=>{
                        try { switchChain({ chainId: v }) } catch {}
                        try { setEcosystem('evm') } catch {}
                        try { localStorage.setItem('preferred_ecosystem', 'evm') } catch {}
                        try { localStorage.setItem('preferred_net', String(v)) } catch {}
                        try { window.dispatchEvent(new CustomEvent('preferred_net_changed', { detail: { id: v } })) } catch {}
                      }, 0)
                    }}
                    sx={{
                      '& .MuiSelect-select': { py: 0, color: '#fff', WebkitTextFillColor: '#fff' },
                      '& .MuiSelect-select > span': { color: '#fff' },
                      '& .MuiSelect-select > span *': { color: '#fff' },
                      '& .MuiSelect-icon': { color: '#fff' },
                      '& fieldset': { display: 'none' },
                      '&.Mui-disabled': { opacity: '1 !important' },
                      '& .MuiInputBase-root.Mui-disabled': { opacity: '1 !important' },
                      '& .MuiSelect-select.Mui-disabled': { opacity: '1 !important', color: '#fff', WebkitTextFillColor: '#fff' },
                      '& .MuiInputBase-input.Mui-disabled': { color: '#fff', WebkitTextFillColor: '#fff' },
                      pointerEvents: isConnected ? 'none' : 'auto'
                    }}
                    MenuProps={{ PaperProps: { sx: { bgcolor: 'rgba(14,18,26,0.98)', border: '1px solid oklch(0.22 0 0)', color: 'oklch(0.95 0 0)' } } }}
                  >
                    {chains.map(c => {
                      const config = getChainConfig(c.id)
                      const kind = config?.type || 'avax'
                      const title = config?.shortName || c.name
                      return (
                        <MenuItem key={`evm-${c.id}`} value={c.id} title={title}>
                          <Box sx={{ display:'flex', alignItems:'center', gap: 0.75, color: '#fff' }}>
                            <LogoImg kind={kind as any} title={title} />
                            <Box component="span">{title}</Box>
                          </Box>
                        </MenuItem>
                      )
                    })}
                  </Select>
                </FormControl>
              ) : (
                <Skeleton variant="rounded" width={116} height={40} />
              )}
              {(mounted && uiReady) ? (
                <Box sx={{ '& button': { height: 36, backgroundImage: 'linear-gradient(90deg, #7c5cff, #2ea0ff)', color: '#fff', borderRadius: '10px', px: 2, boxShadow: '0 6px 20px rgba(46,160,255,0.25)', '&:hover': { filter: 'brightness(1.05)', backgroundImage: 'linear-gradient(90deg, #7c5cff, #2ea0ff)' } } }}>
                  <UnifiedConnectButtonEvm />
                </Box>
              ) : (
                <Skeleton variant="rounded" width={140} height={36} />
              )}
            </Stack>
            <IconButton edge="end" sx={{ display: { xs: 'inline-flex', md: 'none' }, color: 'oklch(0.92 0 0)' }} onClick={() => setOpen(true)}>
              <MenuIcon />
            </IconButton>
          </Box>
        </Container>
      </Toolbar>
      <Drawer anchor="right" open={open} onClose={() => setOpen(false)} PaperProps={{ sx: { width: 320, bgcolor: 'rgba(10,12,18,0.98)', borderLeft: '1px solid', borderColor: 'oklch(0.22 0 0)' } }}>
        <Box sx={{ p: 2 }} role="presentation" onKeyDown={() => setOpen(false)}>
          <Box sx={{ mb: 2 }}>
            <Stack spacing={1}>
              <FormControl size="small" fullWidth>
                <Select
                  value={locale}
                  onChange={(e)=>{ setOpen(false); switchLocale(e.target.value as 'en'|'es'); }}
                  displayEmpty
                  renderValue={(v)=> (
                    <Box component="span" sx={{ display:'inline-flex', alignItems:'center', gap: 0.75, fontSize: 14, color: '#fff', px: 1.25, py: 0.75, bgcolor: 'rgba(18,22,33,0.9)', borderRadius: '10px', border: '1px solid oklch(0.22 0 0)' }}>
                      <Box component="span" aria-hidden> {v === 'es' ? '🇪🇸' : '🇺🇸'} </Box>
                      <Box component="span">{v === 'es' ? 'ES' : 'EN'}</Box>
                    </Box>
                  )}
                  sx={{
                    '& .MuiSelect-select': { color: '#fff', WebkitTextFillColor: '#fff' }, 
                    '& .MuiSelect-select > span': { color: '#fff' }, 
                    '& .MuiSelect-select > span *': { color: '#fff' }, 
                    '& .MuiSelect-icon': { color: '#fff' }, 
                    '& fieldset': { display: 'none' }, 
                    '&.Mui-disabled': { opacity: '1 !important' }, 
                    '& .MuiInputBase-root.Mui-disabled': { opacity: '1 !important' }, 
                    '& .MuiSelect-select.Mui-disabled': { opacity: '1 !important', color: '#fff', WebkitTextFillColor: '#fff' }, 
                    '& .MuiInputBase-input.Mui-disabled': { color: '#fff', WebkitTextFillColor: '#fff' }, 
                    pointerEvents: isConnected ? 'none' : 'auto'
                  }}
                  MenuProps={{ PaperProps: { sx: { bgcolor: 'rgba(14,18,26,0.98)', border: '1px solid oklch(0.22 0 0)', color: 'oklch(0.95 0 0)' } } }}
                >
                  <MenuItem value="es" sx={{ color: '#fff' }}>🇪🇸 ES</MenuItem>
                  <MenuItem value="en" sx={{ color: '#fff' }}>🇺🇸 EN</MenuItem>
                </Select>
              </FormControl>
              {(mounted && uiReady) ? (
                <FormControl size="small" fullWidth>
                  <Select
                    value={selectedNet}
                    suppressHydrationWarning
                    displayEmpty
                    renderValue={(v)=>{
                      const config = getChainConfig(v)
                      const kind = config?.type || 'avax'
                      const title = config?.shortName || 'Unknown'
                      return (
                        <Box component="span" sx={{ display:'inline-flex', alignItems:'center', gap: 0.75, fontSize: 14, color: '#fff', px: 1.25, py: 0.75, bgcolor: 'rgba(18,22,33,0.9)', borderRadius: '10px', border: '1px solid oklch(0.22 0 0)' }}>
                          <LogoImg kind={kind as any} size={16} title={title} />
                          <Box component="span">{title}</Box>
                        </Box>
                      )
                    }}
                    onChange={(e)=>{
                  const v = e.target.value as number
                  setSelectedNet(v)
                  setTimeout(()=>{
                    try { switchChain({ chainId: v }) } catch {}
                    try { setEcosystem('evm') } catch {}
                    try { localStorage.setItem('preferred_net', String(v)) } catch {}
                    try { window.dispatchEvent(new CustomEvent('preferred_net_changed', { detail: { id: v } })) } catch {}
                  }, 0)
                }}
                  sx={{ '& fieldset': { display: 'none' } }}
                  MenuProps={{ PaperProps: { sx: { bgcolor: 'rgba(14,18,26,0.98)', border: '1px solid oklch(0.22 0 0)', color: 'oklch(0.95 0 0)' } } }}
                  >
                    {chains.map(c => {
                      const config = getChainConfig(c.id)
                      const kind = config?.type || 'avax'
                      const title = config?.shortName || c.name
                      return (
                        <MenuItem key={`m-evm-${c.id}`} value={c.id} title={title}>
                          <Box sx={{ display:'flex', alignItems:'center', gap: 0.75, color: '#fff' }}>
                            <LogoImg kind={kind as any} title={title} />
                            <Box component="span">{title}</Box>
                          </Box>
                        </MenuItem>
                      )
                    })}
                  </Select>
                </FormControl>
              ) : (
                <Skeleton variant="rounded" width={320} height={40} />
              )}
              {(mounted && uiReady) ? (
                <Box sx={{ '& button': { width: '100%', height: 36, backgroundImage: 'linear-gradient(90deg, #7c5cff, #2ea0ff)', color: '#fff', borderRadius: '10px', py: 0, boxShadow: '0 6px 20px rgba(46,160,255,0.25)', '&:hover': { filter: 'brightness(1.05)', backgroundImage: 'linear-gradient(90deg, #7c5cff, #2ea0ff)' } } }}>
                  <UnifiedConnectButtonEvm />
                </Box>
              ) : (
                <Skeleton variant="rounded" width={160} height={36} />
              )}
            </Stack>
          </Box>
          <List>
            {nav.map((n) => (
              <ListItem key={`${n.label}-${n.href}`} disablePadding>
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
