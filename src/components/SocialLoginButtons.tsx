'use client';

import React, { useState } from 'react';
import { useConnect } from 'wagmi';
import {
  Button,
  Stack,
  CircularProgress,
  Typography,
  Box,
} from '@mui/material';
import GoogleIcon from '@mui/icons-material/Google';
import AppleIcon from '@mui/icons-material/Apple';
import EmailIcon from '@mui/icons-material/Email';
import KeyIcon from '@mui/icons-material/Key';
import { useLocale } from 'next-intl';

interface SocialLoginButtonsProps {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
  compact?: boolean;
}

export function SocialLoginButtons({ 
  onSuccess, 
  onError,
  compact = false 
}: SocialLoginButtonsProps) {
  const { connect, connectors, isPending } = useConnect();
  const locale = useLocale();
  const [loadingStrategy, setLoadingStrategy] = useState<string | null>(null);

  const isES = locale === 'es';

  // Find the in-app wallet connector from Thirdweb
  const inAppWallet = connectors.find((c) => c.id === 'in-app-wallet');

  // If Thirdweb is not configured, don't render anything
  if (!inAppWallet) {
    return null;
  }

  const handleConnect = async (strategy: string) => {
    setLoadingStrategy(strategy);
    try {
      await connect(
        { 
          connector: inAppWallet, 
          // @ts-ignore - strategy is passed to the connector
          strategy 
        },
        {
          onSuccess: () => {
            setLoadingStrategy(null);
            onSuccess?.();
          },
          onError: (error) => {
            setLoadingStrategy(null);
            onError?.(error);
          },
        }
      );
    } catch (error) {
      setLoadingStrategy(null);
      onError?.(error as Error);
    }
  };

  const isLoading = isPending || loadingStrategy !== null;

  const buttonSx = {
    textTransform: 'none' as const,
    borderRadius: 2,
    py: compact ? 1 : 1.5,
    borderColor: 'rgba(255,255,255,0.2)',
    color: '#fff',
    '&:hover': {
      borderColor: 'rgba(255,255,255,0.4)',
      bgcolor: 'rgba(255,255,255,0.05)',
    },
    '&.Mui-disabled': {
      borderColor: 'rgba(255,255,255,0.1)',
      color: 'rgba(255,255,255,0.3)',
    },
  };

  const strategies = [
    {
      id: 'google',
      label: isES ? 'Continuar con Google' : 'Continue with Google',
      icon: <GoogleIcon />,
      color: '#4285F4',
    },
    {
      id: 'apple',
      label: isES ? 'Continuar con Apple' : 'Continue with Apple',
      icon: <AppleIcon />,
      color: '#fff',
    },
    {
      id: 'email',
      label: isES ? 'Continuar con Email' : 'Continue with Email',
      icon: <EmailIcon />,
      color: '#9c27b0',
    },
    {
      id: 'passkey',
      label: isES ? 'Usar Passkey' : 'Use Passkey',
      icon: <KeyIcon />,
      color: '#00bcd4',
    },
  ];

  // In compact mode, only show Google and Email
  const displayStrategies = compact 
    ? strategies.filter(s => ['google', 'email'].includes(s.id))
    : strategies;

  return (
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
        {isES ? 'Inicio rápido' : 'Quick sign in'}
      </Typography>
      
      <Stack spacing={1}>
        {displayStrategies.map((strategy) => (
          <Button
            key={strategy.id}
            variant="outlined"
            startIcon={
              loadingStrategy === strategy.id ? (
                <CircularProgress size={18} color="inherit" />
              ) : (
                strategy.icon
              )
            }
            onClick={() => handleConnect(strategy.id)}
            disabled={isLoading}
            fullWidth
            sx={{
              ...buttonSx,
              '& .MuiButton-startIcon': {
                color: strategy.color,
              },
            }}
          >
            {strategy.label}
          </Button>
        ))}
      </Stack>
    </Box>
  );
}

export default SocialLoginButtons;
