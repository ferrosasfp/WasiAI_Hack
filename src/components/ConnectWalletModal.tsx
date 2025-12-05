'use client';

import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Typography,
  Divider,
  Button,
  Box,
  Stack,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import { useConnectModal } from '@rainbow-me/rainbowkit';
import { useLocale } from 'next-intl';
import { SocialLoginButtons } from './SocialLoginButtons';

interface ConnectWalletModalProps {
  open: boolean;
  onClose: () => void;
}

export function ConnectWalletModal({ open, onClose }: ConnectWalletModalProps) {
  const { openConnectModal } = useConnectModal();
  const locale = useLocale();
  const isES = locale === 'es';

  const handleWalletConnect = () => {
    onClose();
    // Small delay to allow modal to close before opening RainbowKit
    setTimeout(() => {
      openConnectModal?.();
    }, 100);
  };

  const handleSuccess = () => {
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: {
          bgcolor: 'rgba(14, 18, 26, 0.98)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 3,
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
        },
      }}
    >
      <DialogTitle
        component="div"
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          pb: 1,
        }}
      >
        <Typography component="h2" variant="h6" sx={{ fontWeight: 600, color: '#fff' }}>
          {isES ? 'Conectar' : 'Connect'}
        </Typography>
        <IconButton
          onClick={onClose}
          size="small"
          sx={{ color: 'rgba(255,255,255,0.5)' }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ pt: 2 }}>
        <Stack spacing={3}>
          {/* Social Login Options (Thirdweb) */}
          <SocialLoginButtons onSuccess={handleSuccess} />

          {/* Divider */}
          <Box sx={{ position: 'relative', py: 1 }}>
            <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)' }} />
            <Typography
              variant="caption"
              sx={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                bgcolor: 'rgba(14, 18, 26, 0.98)',
                px: 2,
                color: 'rgba(255,255,255,0.4)',
                fontSize: '0.7rem',
              }}
            >
              {isES ? 'o' : 'or'}
            </Typography>
          </Box>

          {/* Traditional Wallet Options (RainbowKit) */}
          <Box>
            <Typography
              variant="caption"
              sx={{
                color: 'text.secondary',
                display: 'block',
                mb: 1.5,
                textTransform: 'uppercase',
                letterSpacing: 0.5,
                fontSize: '0.7rem',
              }}
            >
              {isES ? 'Conectar wallet' : 'Connect wallet'}
            </Typography>

            <Button
              variant="outlined"
              startIcon={<AccountBalanceWalletIcon />}
              onClick={handleWalletConnect}
              fullWidth
              sx={{
                textTransform: 'none',
                borderRadius: 2,
                py: 1.5,
                borderColor: 'rgba(255,255,255,0.2)',
                color: '#fff',
                '&:hover': {
                  borderColor: 'rgba(255,255,255,0.4)',
                  bgcolor: 'rgba(255,255,255,0.05)',
                },
              }}
            >
              {isES ? 'MetaMask, WalletConnect...' : 'MetaMask, WalletConnect...'}
            </Button>
          </Box>

          {/* Footer note */}
          <Typography
            variant="caption"
            sx={{
              color: 'rgba(255,255,255,0.3)',
              textAlign: 'center',
              fontSize: '0.65rem',
              lineHeight: 1.4,
            }}
          >
            {isES
              ? 'Al conectar, aceptas los términos de servicio'
              : 'By connecting, you agree to the terms of service'}
          </Typography>
        </Stack>
      </DialogContent>
    </Dialog>
  );
}

export default ConnectWalletModal;
