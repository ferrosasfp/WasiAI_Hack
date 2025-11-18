'use client';

import React from 'react';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiConfig, createConfig, http } from 'wagmi';
import { base, baseSepolia, avalanche, avalancheFuji } from 'wagmi/chains';
import { injected } from 'wagmi/connectors';
import dynamic from 'next/dynamic';
import '@rainbow-me/rainbowkit/styles.css';
import { WalletEcosystemProvider } from '@/contexts/WalletEcosystemContext';
import theme from '@/styles/theme';
import { CACHE_TTLS, getExponentialBackoff } from '@/config';

// Use centralized cache and retry configuration
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: CACHE_TTLS.WAGMI_STALE,
      gcTime: CACHE_TTLS.WAGMI_GC,
      retry: 3,
      retryDelay: (attemptIndex) => getExponentialBackoff(attemptIndex, 1000),
    },
    mutations: { retry: 1 },
  },
});

interface ProvidersProps { children: React.ReactNode }

export function ProvidersEvm({ children }: ProvidersProps) {
  const isMainnet = (process.env.NEXT_PUBLIC_NETWORK_ENV || '').toLowerCase() === 'mainnet';
  const evmChainsArr = isMainnet ? [base, avalanche] : [baseSepolia, avalancheFuji];
  const transports = Object.fromEntries(evmChainsArr.map(c => [c.id, http()]));

  const wagmiConfig = React.useMemo(() => createConfig({
    chains: [evmChainsArr[0], ...evmChainsArr.slice(1)] as any,
    transports: transports as any,
    connectors: [injected()],
  }), [isMainnet]);

  const Noop: React.FC<{children: React.ReactNode}> = ({ children }) => <>{children}</>;
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => { setMounted(true) }, []);

  if (!mounted) {
    return (
      <QueryClientProvider client={queryClient}>
        <WagmiConfig config={wagmiConfig} reconnectOnMount={true}>
          <Noop>
            <WalletEcosystemProvider>
              <ThemeProvider theme={theme}>
                <CssBaseline />
                {children}
              </ThemeProvider>
            </WalletEcosystemProvider>
          </Noop>
        </WagmiConfig>
      </QueryClientProvider>
    );
  }

  const RainbowKitProvider = dynamic(() => import('@rainbow-me/rainbowkit').then(m => m.RainbowKitProvider), { ssr: false });

  return (
    <QueryClientProvider client={queryClient}>
      <WagmiConfig config={wagmiConfig} reconnectOnMount={true}>
        <RainbowKitProvider>
          <WalletEcosystemProvider>
            <ThemeProvider theme={theme}>
              <CssBaseline />
              {children}
            </ThemeProvider>
          </WalletEcosystemProvider>
        </RainbowKitProvider>
      </WagmiConfig>
    </QueryClientProvider>
  );
}
