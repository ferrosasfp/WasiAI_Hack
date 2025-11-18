"use client";

import React, { useRef } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import { ConnectButton as SuiConnectButton } from "@mysten/dapp-kit";

function WalletIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M3.75 7.5C3.75 6.25736 4.75736 5.25 6 5.25H18C19.2426 5.25 20.25 6.25736 20.25 7.5V16.5C20.25 17.7426 19.2426 18.75 18 18.75H6C4.75736 18.75 3.75 17.7426 3.75 16.5V7.5Z" stroke="#FFFFFF" strokeWidth="1.8"/>
      <path d="M16.5 12C16.5 11.1716 17.1716 10.5 18 10.5H21V13.5H18C17.1716 13.5 16.5 12.8284 16.5 12Z" stroke="#FFFFFF" strokeWidth="1.8"/>
    </svg>
  );
}

export function StyledSuiConnectButton({ children = "Connect Wallet" }: { children?: React.ReactNode }) {
  const hiddenRef = useRef<HTMLDivElement>(null);

  const handleClick = () => {
    const btn = hiddenRef.current?.querySelector('button, [role="button"]') as HTMLElement | null;
    if (btn) {
      try { btn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true })); }
      catch { (btn as any).click?.(); }
    }
  };

  return (
    <Stack direction="row" alignItems="center" spacing={1}>
      {/* Botón nativo oculto para abrir el menú/modal de Sui */}
      <Box ref={hiddenRef} sx={{ position: 'fixed', left: 8, top: 8, opacity: 0, pointerEvents: 'auto', zIndex: 9999 }} aria-hidden>
        <SuiConnectButton>Open</SuiConnectButton>
      </Box>

      {/* Botón visible con estilo EVM */}
      <Button
        onClick={handleClick}
        variant="contained"
        startIcon={<WalletIcon />}
        sx={{
          textTransform: 'none',
          fontWeight: 600,
          borderRadius: 2,
          px: 2.25,
          py: 1,
          bgcolor: '#2f6bff',
          ':hover': { bgcolor: '#2559db' },
          color: '#fff',
          boxShadow: '0 6px 20px rgba(47,107,255,0.35)'
        }}
      >
        {children}
      </Button>
    </Stack>
  );
}
