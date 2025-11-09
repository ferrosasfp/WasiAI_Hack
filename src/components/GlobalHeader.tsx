"use client";

import React from 'react';
import { AppBar, Toolbar, Box, Typography, Container, Button, IconButton, Drawer, List, ListItem, ListItemButton, ListItemText } from '@mui/material';
import { ConnectButton } from '@mysten/dapp-kit';
import MenuIcon from '@mui/icons-material/Menu';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function GlobalHeader() {
  const [open, setOpen] = React.useState(false);
  const pathname = usePathname();
  const nav = [
    { label: 'Explorar modelos', href: '/models' },
    { label: 'Publicar modelo', href: '/upload' },
    { label: 'Mis licencias', href: '/licenses' },
  ];
  return (
    <AppBar position="sticky" color="default" elevation={1}>
      <Toolbar>
        <Container maxWidth="lg" sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="h6" fontWeight="bold" component={Link} href="/" style={{ textDecoration: 'none', color: 'inherit' }}>
              MarketplaceAI
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
            <Box sx={{ display: { xs: 'none', md: 'block' } }}>
              <ConnectButton>Conectar / Desconectar</ConnectButton>
            </Box>
            <IconButton edge="end" sx={{ display: { xs: 'inline-flex', md: 'none' } }} onClick={() => setOpen(true)}>
              <MenuIcon />
            </IconButton>
          </Box>
        </Container>
      </Toolbar>
      <Drawer anchor="right" open={open} onClose={() => setOpen(false)}>
        <Box sx={{ width: 280, p: 2 }} role="presentation" onClick={() => setOpen(false)} onKeyDown={() => setOpen(false)}>
          <Box sx={{ mb: 2 }}>
            <ConnectButton>Conectar / Desconectar</ConnectButton>
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
