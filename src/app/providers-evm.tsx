'use client';

import React from 'react';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider, createConfig, createStorage, http } from 'wagmi';
import { avalanche, avalancheFuji } from 'wagmi/chains';
import { injected } from 'wagmi/connectors';
import { RainbowKitProvider } from '@rainbow-me/rainbowkit';
import '@rainbow-me/rainbowkit/styles.css';
import { WalletEcosystemProvider } from '@/contexts/WalletEcosystemContext';
import theme from '@/styles/theme';
import { CACHE_TTLS, getExponentialBackoff } from '@/config';

// Avalanche chain selection based on NEXT_PUBLIC_EVM_DEFAULT_CHAIN_ID
// 43114 = Avalanche Mainnet, 43113 = Avalanche Fuji (testnet)
const defaultChainId = parseInt(process.env.NEXT_PUBLIC_EVM_DEFAULT_CHAIN_ID || '43113', 10);
const isMainnet = defaultChainId === 43114;
const evmChainsArr = isMainnet ? [avalanche] as const : [avalancheFuji] as const;

// Create wagmi config once at module level for stability
// This ensures the config is not recreated on each render
const wagmiConfig = createConfig({
  chains: evmChainsArr as any,
  transports: {
    [evmChainsArr[0].id]: http(),
  },
  connectors: [injected()],
  ssr: true,
  // Use noopStorage for SSR, real localStorage on client
  storage: createStorage({
    storage: typeof window !== 'undefined' ? window.localStorage : {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {},
    },
  }),
});

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
  const [mounted, setMounted] = React.useState(false);
  
  React.useEffect(() => {
    setMounted(true);
  }, []);

  // Always render the full provider tree to avoid context errors
  // Use CSS to hide content during hydration if needed
  return (
    <WagmiProvider config={wagmiConfig} reconnectOnMount={true}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>
          <WalletEcosystemProvider>
            <ThemeProvider theme={theme}>
              <CssBaseline />
              <div style={{ visibility: mounted ? 'visible' : 'hidden' }}>
                {children}
              </div>
            </ThemeProvider>
          </WalletEcosystemProvider>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
