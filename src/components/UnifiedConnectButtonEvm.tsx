"use client";

import React, { useMemo, useState } from "react";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Divider from "@mui/material/Divider";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import LinkOffIcon from "@mui/icons-material/LinkOff";
import { useAccount as useEvmAccount, useDisconnect, useChainId, useConfig, useConnect } from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { useLocale } from "next-intl";
import { ConnectWalletModal } from "./ConnectWalletModal";

function WalletIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M3.75 7.5C3.75 6.25736 4.75736 5.25 6 5.25H18C19.2426 5.25 20.25 6.25736 20.25 7.5V16.5C20.25 17.7426 19.2426 18.75 18 18.75H6C4.75736 18.75 3.75 17.7426 3.75 16.5V7.5Z" stroke="#FFFFFF" strokeWidth="1.8"/>
      <path d="M16.5 12C16.5 11.1716 17.1716 10.5 18 10.5H21V13.5H18C17.1716 13.5 16.5 12.8284 16.5 12Z" stroke="#FFFFFF" strokeWidth="1.8"/>
    </svg>
  );
}

function shorten(addr?: string) {
  if (!addr) return "";
  return addr.slice(0, 6) + "…" + addr.slice(-4);
}

export default function UnifiedConnectButtonEvm() {
  const config = useConfig();
  const { address: evmAddress, isConnected } = useEvmAccount();
  const { connectors } = useConnect();
  const { openConnectModal } = useConnectModal();
  const { disconnectAsync } = useDisconnect();
  const chainId = useChainId();
  const locale = useLocale();
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const menuOpen = Boolean(menuAnchor);
  const [busy, setBusy] = useState(false);
  const [connectModalOpen, setConnectModalOpen] = useState(false);

  // Check if Thirdweb in-app wallet is available
  const hasThirdwebConnector = connectors.some((c) => c.id === 'in-app-wallet');

  const L = useMemo(() => {
    const es = locale === 'es';
    return {
      networkPrefix: es ? 'Red:' : 'Network:',
      disconnect: es ? 'Desconectar' : 'Disconnect',
      connect: es ? 'Conectar wallet' : 'Connect Wallet',
      unknown: es ? 'Desconocida' : 'Unknown',
      chainPrefix: es ? 'Cadena' : 'Chain',
    };
  }, [locale]);

  const label = useMemo(() => {
    if (!isConnected) return L.connect;
    return shorten(evmAddress);
  }, [isConnected, evmAddress, L.connect]);

  const networkName = useMemo(() => {
    try {
      const ch = (config as any)?.chains?.find((c:any)=> c?.id === chainId)
      const nm = ch?.name
      return typeof nm === 'string' && nm ? nm : (chainId ? `${L.chainPrefix} ${chainId}` : L.unknown)
    } catch {
      return chainId ? `${L.chainPrefix} ${chainId}` : L.unknown
    }
  }, [chainId, config, L.chainPrefix, L.unknown]);

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (isConnected) {
      setMenuAnchor(e.currentTarget);
      return;
    }
    if (busy) return;
    setBusy(true);
    const release = () => setTimeout(()=> setBusy(false), 900);
    
    // If Thirdweb is available, show our custom modal with both options
    if (hasThirdwebConnector) {
      setConnectModalOpen(true);
      release();
      return;
    }
    
    // Otherwise, fall back to RainbowKit modal
    if (openConnectModal) {
      try { openConnectModal(); } finally { release(); }
    } else { release(); }
  };

  const onCopy = async () => {
    try { if (evmAddress) await navigator.clipboard.writeText(evmAddress); } catch {}
    setMenuAnchor(null);
  };

  const onLogout = async () => {
    try {
      setMenuAnchor(null);
      await disconnectAsync().catch(()=>{});
      try {
        // Clear RainbowKit recent connector and other keys
        const ls = typeof window !== 'undefined' ? window.localStorage : null;
        if (ls) {
          try { ls.removeItem('preferred_ecosystem'); } catch {}
          try { ls.removeItem('preferred_net'); } catch {}
          try {
            const keys = Object.keys(ls);
            for (const k of keys) if (k.startsWith('rk-')) { try { ls.removeItem(k); } catch {} }
          } catch {}
        }
      } catch {}
      // Soft reload to ensure UI resets
      setTimeout(() => { try { window.location.reload(); } catch {} }, 50);
    } finally {}
  };

  return (
    <Stack direction="row" alignItems="center" spacing={1}>
      <Button
        onClick={handleClick}
        variant="contained"
        startIcon={<WalletIcon />}
        sx={{
          textTransform: "none",
          fontWeight: 600,
          borderRadius: 2,
          px: 2.25,
          py: 1,
          bgcolor: "#2f6bff",
          ":hover": { bgcolor: "#2559db" },
          color: "#fff",
          boxShadow: "0 6px 20px rgba(47,107,255,0.35)",
        }}
      >
        {label}
      </Button>

      <Menu
        anchorEl={menuAnchor}
        open={menuOpen}
        onClose={()=>setMenuAnchor(null)}
        anchorOrigin={{ vertical:'bottom', horizontal:'right' }}
        transformOrigin={{ vertical:'top', horizontal:'right' }}
        PaperProps={{ sx: { bgcolor: 'rgba(14,18,26,0.98)', border: '1px solid oklch(0.22 0 0)', color: 'oklch(0.95 0 0)', borderRadius: '10px', boxShadow: '0 20px 40px rgba(0,0,0,0.4)', overflow: 'hidden' } }}
        MenuListProps={{ dense: true, sx: { py: 0.5 } }}
      >
        <MenuItem disabled sx={{ cursor: 'default', opacity: 1, py: 1 }}>
          <ListItemText primary={`${L.networkPrefix} ${networkName}`} primaryTypographyProps={{ sx: { color: 'oklch(0.75 0 0)', fontSize: 12, fontWeight: 600, letterSpacing: 0.2 } }} />
        </MenuItem>
        <Divider sx={{ borderColor: 'oklch(0.22 0 0)' }} />
        <MenuItem onClick={onCopy} disabled={!isConnected} sx={{ color: 'oklch(0.95 0 0)', py: 1, '&:hover': { bgcolor: 'rgba(255,255,255,0.06)' } }}>
          <ListItemIcon sx={{ minWidth: 32, color: 'oklch(0.85 0 0)' }}><ContentCopyIcon fontSize="small" /></ListItemIcon>
          <ListItemText primary={shorten(evmAddress)} primaryTypographyProps={{ sx: { color: 'oklch(0.95 0 0)', fontSize: 14 } }} />
        </MenuItem>
        <Divider sx={{ borderColor: 'oklch(0.22 0 0)' }} />
        <MenuItem onClick={onLogout} sx={{ color: 'oklch(0.95 0 0)', py: 1, '&:hover': { bgcolor: 'rgba(255,255,255,0.06)' } }}>
          <ListItemIcon sx={{ minWidth: 32, color: 'oklch(0.85 0 0)' }}><LinkOffIcon fontSize="small" /></ListItemIcon>
          <ListItemText primary={L.disconnect} primaryTypographyProps={{ sx: { color: 'oklch(0.95 0 0)', fontSize: 14 } }} />
        </MenuItem>
      </Menu>

      {/* Connect Wallet Modal (Social Login + Traditional Wallets) */}
      <ConnectWalletModal
        open={connectModalOpen}
        onClose={() => setConnectModalOpen(false)}
      />
    </Stack>
  );
}
