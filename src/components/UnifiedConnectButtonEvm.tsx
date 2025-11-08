"use client";

import React, { useMemo, useState } from "react";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Divider from "@mui/material/Divider";
import Typography from "@mui/material/Typography";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import LogoutIcon from "@mui/icons-material/Logout";
import { useAccount as useEvmAccount, useDisconnect, useChainId, useConfig } from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";

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
  const { openConnectModal } = useConnectModal();
  const { disconnectAsync } = useDisconnect();
  const chainId = useChainId();
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const menuOpen = Boolean(menuAnchor);
  const [busy, setBusy] = useState(false);

  const label = useMemo(() => {
    if (!isConnected) return "Connect Wallet";
    return shorten(evmAddress);
  }, [isConnected, evmAddress]);

  const networkName = useMemo(() => {
    try {
      const ch = (config as any)?.chains?.find((c:any)=> c?.id === chainId)
      const nm = ch?.name
      return typeof nm === 'string' && nm ? nm : (chainId ? `Chain ${chainId}` : 'Unknown')
    } catch {
      return chainId ? `Chain ${chainId}` : 'Unknown'
    }
  }, [chainId, config]);

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (isConnected) {
      setMenuAnchor(e.currentTarget);
      return;
    }
    if (busy) return;
    setBusy(true);
    const release = () => setTimeout(()=> setBusy(false), 900);
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

      <Menu anchorEl={menuAnchor} open={menuOpen} onClose={()=>setMenuAnchor(null)} anchorOrigin={{ vertical:'bottom', horizontal:'right' }} transformOrigin={{ vertical:'top', horizontal:'right' }}>
        <MenuItem disabled>
          <ListItemText>Network: {networkName}</ListItemText>
        </MenuItem>
        <Divider />
        <MenuItem onClick={onCopy} disabled={!isConnected}>
          <ListItemIcon><ContentCopyIcon fontSize="small" /></ListItemIcon>
          <ListItemText>{shorten(evmAddress)}</ListItemText>
        </MenuItem>
        <Divider />
        <MenuItem onClick={onLogout}>
          <ListItemIcon><LogoutIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Log Out</ListItemText>
        </MenuItem>
      </Menu>
    </Stack>
  );
}
