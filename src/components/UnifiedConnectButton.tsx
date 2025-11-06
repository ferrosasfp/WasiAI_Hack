"use client";

import React, { useMemo, useRef } from "react";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Divider from "@mui/material/Divider";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Typography from "@mui/material/Typography";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import LogoutIcon from "@mui/icons-material/Logout";
import { useWalletEcosystem } from "@/contexts/WalletEcosystemContext";
import { useAccount as useEvmAccount, useDisconnect } from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { ConnectButton as SuiConnectButton, useCurrentAccount as useSuiAccount } from "@mysten/dapp-kit";
// Intentaremos desconectar SUI vía dapp-kit si está disponible
// @ts-ignore
import { useCurrentWallet as useSuiCurrentWallet } from "@mysten/dapp-kit";

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

export function UnifiedConnectButton({ onBeforeOpen, onConnectError }: { onBeforeOpen?: () => void; onConnectError?: (err: any) => void } = {}) {
  const { ecosystem } = useWalletEcosystem();
  const enableSui = (process.env.NEXT_PUBLIC_ENABLE_SUI || '').toLowerCase() === 'true'
  const { address: evmAddress, isConnected: evmConnected } = useEvmAccount();
  const { openConnectModal } = useConnectModal();
  let suiAcc: ReturnType<typeof useSuiAccount> | null = null as any;
  try { if (enableSui) { suiAcc = useSuiAccount() as any } } catch {}
  const suiConnected = !!(suiAcc as any)?.address;
  const { disconnect } = useDisconnect();
  // Obtener la wallet actual de SUI solo si está habilitado
  // @ts-ignore
  const suiWallet = enableSui && typeof useSuiCurrentWallet === 'function' ? (useSuiCurrentWallet as any)() : null;
  const isConnected = (enableSui && ecosystem === "sui") ? suiConnected : evmConnected;
  const label = useMemo(() => {
    if (!isConnected) return "Connect Wallet";
    return ecosystem === "evm" ? shorten(evmAddress) : shorten((suiAcc as any)?.address);
  }, [isConnected, ecosystem, evmAddress, (suiAcc as any)?.address]);

  // Hidden SUI connect button to trigger its modal if needed
  const suiBtnRef = useRef<HTMLDivElement>(null);
  const [menuAnchor, setMenuAnchor] = React.useState<null | HTMLElement>(null);
  const menuOpen = Boolean(menuAnchor);
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);

  // Cerrar el menú si cambia el estado de conexión
  React.useEffect(() => {
    if (!isConnected && menuOpen) setMenuAnchor(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected]);

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (isConnected) {
      setMenuAnchor(e.currentTarget);
      return;
    }
    if (busy) return;
    setBusy(true);
    const release = () => setTimeout(()=> setBusy(false), 1200);
    try { onBeforeOpen?.(); } catch {}
    if (!enableSui || ecosystem === "evm") {
      if (openConnectModal) {
        try { openConnectModal(); } finally { release(); }
      } else { release(); }
    } else {
      const btn = suiBtnRef.current?.querySelector("button");
      if (btn) (btn as HTMLButtonElement).click();
      release();
    }
  };

  // Detect MetaMask cancel (4001) to surface a friendly message once
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
    const addr = ecosystem === 'evm' ? evmAddress : (suiAcc as any)?.address;
    try { if (addr) await navigator.clipboard.writeText(addr); } catch {}
    setMenuAnchor(null);
  };

  const onLogout = async () => {
    try {
      // cerrar menú inmediatamente
      setMenuAnchor(null);
      if (ecosystem === 'evm') {
        disconnect();
      } else {
        const w: any = suiWallet;
        const cap = w?.features?.['standard:disconnect'] as any;
        if (cap?.disconnect) {
          await cap.disconnect();
        } else {
          // Pedir confirmación y usar un click real del usuario para abrir el modal nativo
          setConfirmOpen(true);
        }
      }
    } finally {
      // menú ya gestionado
    }
  };

  const confirmSuiDisconnect = () => {
    setConfirmOpen(false);
    // Disparar el botón nativo oculto (modal Mysten) tras confirmación del usuario
    const btn = suiBtnRef.current?.querySelector('button, [role="button"]') as HTMLElement | null;
    if (btn) {
      try { btn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true })); }
      catch { (btn as any).click?.(); }
    }
  };

  const cancelSuiDisconnect = () => setConfirmOpen(false);

  return (
    <Stack direction="row" alignItems="center" spacing={1}>
      {/* Hidden Sui connect button to provide modal/flows when ecosystem = SUI */}
      {enableSui && (
        <div
          ref={suiBtnRef}
          style={{
            display: ecosystem === "sui" ? "block" : "none",
            position: "fixed",
            left: 8,
            top: 8,
            opacity: 0,
            pointerEvents: "auto",
            zIndex: 9999,
          }}
          aria-hidden
        >
          <SuiConnectButton>Connect</SuiConnectButton>
        </div>
      )}

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

      {/* Menu cuando está conectado */}
      <Menu anchorEl={menuAnchor} open={menuOpen} onClose={()=>setMenuAnchor(null)} anchorOrigin={{ vertical:'bottom', horizontal:'right' }} transformOrigin={{ vertical:'top', horizontal:'right' }}>
        <MenuItem onClick={onCopy} disabled={!isConnected}>
          <ListItemIcon><ContentCopyIcon fontSize="small" /></ListItemIcon>
          <ListItemText>{(ecosystem === 'evm' ? shorten(evmAddress) : shorten(suiAcc?.address)) || '—'}</ListItemText>
        </MenuItem>
        <Divider />
        <MenuItem onClick={onLogout}>
          <ListItemIcon><LogoutIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Log Out</ListItemText>
        </MenuItem>
      </Menu>

      {/* Confirmación para SUI */}
      <Dialog open={confirmOpen} onClose={cancelSuiDisconnect} maxWidth="xs" fullWidth>
        <DialogTitle>Disconnect wallet</DialogTitle>
        <DialogContent>
          <Typography variant="body2">You are connected on Sui. Do you want to disconnect now?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={cancelSuiDisconnect} color="inherit">Cancel</Button>
          <Button onClick={confirmSuiDisconnect} variant="contained" color="primary">Disconnect</Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
