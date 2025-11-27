"use client";

import React, { useMemo } from "react";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Divider from "@mui/material/Divider";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import LogoutIcon from "@mui/icons-material/Logout";
import { useAccount as useEvmAccount, useDisconnect } from "wagmi";
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

/**
 * Unified Connect Button - Avalanche EVM only
 */
export function UnifiedConnectButton({ onBeforeOpen, onConnectError }: { onBeforeOpen?: () => void; onConnectError?: (err: any) => void } = {}) {
  const { address: evmAddress, isConnected } = useEvmAccount();
  const { openConnectModal } = useConnectModal();
  const { disconnect } = useDisconnect();
  
  const label = useMemo(() => {
    if (!isConnected) return "Connect Wallet";
    return shorten(evmAddress);
  }, [isConnected, evmAddress]);

  const [menuAnchor, setMenuAnchor] = React.useState<null | HTMLElement>(null);
  const menuOpen = Boolean(menuAnchor);
  const [busy, setBusy] = React.useState(false);

  // Close menu when connection state changes
  React.useEffect(() => {
    if (!isConnected && menuOpen) setMenuAnchor(null);
  }, [isConnected, menuOpen]);

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (isConnected) {
      setMenuAnchor(e.currentTarget);
      return;
    }
    if (busy) return;
    setBusy(true);
    const release = () => setTimeout(() => setBusy(false), 1200);
    try { onBeforeOpen?.(); } catch {}
    if (openConnectModal) {
      try { openConnectModal(); } finally { release(); }
    } else { release(); }
  };

  // Detect MetaMask cancel (4001) to surface a friendly message
  React.useEffect(() => {
    const onRejection = (e: PromiseRejectionEvent) => {
      const reason: any = (e as any).reason || {}
      const code = reason?.code || reason?.data?.code
      if (code === 4001) {
        try { onConnectError?.(reason) } catch {}
      }
    }
    window.addEventListener('unhandledrejection', onRejection)
    return () => window.removeEventListener('unhandledrejection', onRejection)
  }, [onConnectError])

  const onCopy = async () => {
    try { if (evmAddress) await navigator.clipboard.writeText(evmAddress); } catch {}
    setMenuAnchor(null);
  };

  const onLogout = () => {
    setMenuAnchor(null);
    disconnect();
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

      {/* Menu when connected */}
      <Menu anchorEl={menuAnchor} open={menuOpen} onClose={() => setMenuAnchor(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} transformOrigin={{ vertical: 'top', horizontal: 'right' }}>
        <MenuItem onClick={onCopy} disabled={!isConnected}>
          <ListItemIcon><ContentCopyIcon fontSize="small" /></ListItemIcon>
          <ListItemText>{shorten(evmAddress) || '—'}</ListItemText>
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
