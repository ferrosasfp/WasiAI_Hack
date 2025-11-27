"use client";

import React from 'react';
import { AppBar, Toolbar, Box, Typography, Container, Button, IconButton, Drawer, List, ListItem, ListItemButton, ListItemText, Stack, FormControl, Select, MenuItem, Skeleton } from '@mui/material';
import UnifiedConnectButtonEvm from '@/components/UnifiedConnectButtonEvm';
import MenuIcon from '@mui/icons-material/Menu';
import Link from 'next/link';
import {useTranslations, useLocale} from 'next-intl';
import { usePathname } from 'next/navigation';
import { useWalletEcosystem } from '@/contexts/WalletEcosystemContext';
import { useChainId, useAccount as useEvmAccount } from 'wagmi';
import { DEFAULT_CHAIN_ID, getChainConfig } from '@/config';

export function GlobalHeaderEvm() {
  const t = useTranslations();
  const locale = useLocale();
  const [open, setOpen] = React.useState(false);
  const pathname = usePathname();
  const { setEcosystem } = useWalletEcosystem();
  const chainId = useChainId();
  const { isConnected: evmConnected } = useEvmAccount();
  const isConnected = evmConnected;
  // For Avalanche Hackathon: Always use Avalanche Fuji
  const activeChainId = chainId || DEFAULT_CHAIN_ID;
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

  const LogoImg = ({ size=20, title }: { size?: number, title?: string }) => {
    const src = mounted ? '/icons/avalanche.svg' : '/icons/avalanche.svg'
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt={'Avalanche'} title={title || 'Avalanche'} width={size} height={size} style={{ display:'block' }} onError={(e)=>{ (e.currentTarget as HTMLImageElement).style.visibility = 'hidden' }} />
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
            <Typography 
              variant="h6" 
              fontWeight={800} 
              component={Link} 
              href={`/${locale}`}
              prefetch={true}
              style={{ textDecoration: 'none' }} 
              sx={{ 
                fontSize: { xs: 18, md: 22 }, 
                color: 'oklch(0.92 0 0)',
                transition: 'transform 0.2s ease',
                '&:hover': {
                  transform: 'scale(1.02)'
                }
              }}
            >
              <Box component="span" sx={{ background: 'linear-gradient(90deg, #9b8cff, #50e1ff)', WebkitBackgroundClip: 'text', color: 'transparent' }}>
                {t('header.brand')}
              </Box>
            </Typography>
            <Box sx={{ display: { xs: 'none', md: 'flex' }, gap: 3 }}>
              {nav.map((n) => (
                <Button 
                  key={`${n.label}-${n.href}`} 
                  component={Link} 
                  href={n.href}
                  prefetch={true}
                  color="inherit" 
                  variant="text" 
                  sx={{ 
                    textTransform: 'none', 
                    fontSize: 15, 
                    fontWeight: 600, 
                    color: pathname === n.href ? '#4fe1ff' : 'oklch(0.92 0 0)', 
                    px: 0, 
                    transition: 'color 0.2s ease',
                    '&:hover': { color: '#4fe1ff' } 
                  }}
                >
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
              {/* Avalanche Hackathon: Fixed badge showing Avalanche Fuji */}
              {(mounted && uiReady) ? (
                <Box 
                  component="span" 
                  sx={{ 
                    display: 'inline-flex', 
                    alignItems: 'center', 
                    gap: 0.75, 
                    fontSize: 14, 
                    color: '#fff', 
                    px: 1.25, 
                    py: 0.5, 
                    bgcolor: 'rgba(17,20,28,0.95)', 
                    borderRadius: '10px', 
                    border: '1px solid rgba(232, 65, 66, 0.3)',
                    cursor: 'default'
                  }}
                >
                  <LogoImg size={16} title={getChainConfig(activeChainId)?.shortName || 'Fuji'} />
                  <Box component="span">{getChainConfig(activeChainId)?.shortName || 'Fuji'}</Box>
                </Box>
              ) : (
                <Skeleton variant="rounded" width={90} height={36} />
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
              {/* Avalanche Hackathon: Fixed badge showing Avalanche Fuji in mobile drawer */}
              {(mounted && uiReady) ? (
                <Box 
                  sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    gap: 0.75, 
                    fontSize: 14, 
                    color: '#fff', 
                    px: 1.25, 
                    py: 0.75, 
                    bgcolor: 'rgba(18,22,33,0.9)', 
                    borderRadius: '10px', 
                    border: '1px solid rgba(232, 65, 66, 0.3)'
                  }}
                >
                  <LogoImg size={16} title={getChainConfig(activeChainId)?.shortName || 'Fuji'} />
                  <Box component="span">{getChainConfig(activeChainId)?.shortName || 'Fuji'}</Box>
                </Box>
              ) : (
                <Skeleton variant="rounded" width="100%" height={40} />
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
                <ListItemButton 
                  component={Link} 
                  href={n.href}
                  prefetch={true}
                  selected={pathname === n.href}
                  onClick={() => setOpen(false)}
                  sx={{
                    '&.Mui-selected': {
                      bgcolor: 'rgba(79, 225, 255, 0.15)',
                      borderLeft: '3px solid #4fe1ff',
                      '& .MuiListItemText-primary': {
                        color: '#4fe1ff',
                        fontWeight: 600
                      }
                    }
                  }}
                >
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
