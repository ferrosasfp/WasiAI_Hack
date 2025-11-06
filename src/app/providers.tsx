'use client';

import React from 'react';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { SuiClientProvider, WalletProvider } from '@mysten/dapp-kit';
import { getFullnodeUrl } from '@mysten/sui/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiConfig, createConfig, http } from 'wagmi'
import { base, baseSepolia, avalanche, avalancheFuji } from 'wagmi/chains'
import { injected } from 'wagmi/connectors'
import dynamic from 'next/dynamic'
import '@rainbow-me/rainbowkit/styles.css'
import { WalletEcosystemProvider } from '@/contexts/WalletEcosystemContext'

import theme from '@/styles/theme';

// Configuración de redes Sui
const networks = {
  testnet: { url: getFullnodeUrl('testnet') },
  mainnet: { url: getFullnodeUrl('mainnet') },
  devnet: { url: getFullnodeUrl('devnet') },
};

// QueryClient para @mysten/dapp-kit
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 1 minuto
      gcTime: 5 * 60 * 1000, // 5 minutos
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
    mutations: {
      retry: 1,
    },
  },
});

interface ProvidersProps {
  children: React.ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  const isMainnet = (process.env.NEXT_PUBLIC_NETWORK_ENV || '').toLowerCase() === 'mainnet'
  const evmChainsArr = isMainnet ? [base, avalanche] : [baseSepolia, avalancheFuji]
  const transports = Object.fromEntries(evmChainsArr.map(c => [c.id, http()]))

  const wagmiConfig = React.useMemo(() => createConfig({
    chains: [evmChainsArr[0], ...evmChainsArr.slice(1)] as any,
    transports: transports as any,
    connectors: [injected({ shimDisconnect: true })],
  }), [isMainnet])

  // Evita ejecutar RainbowKit/Wagmi en SSR (acceso a localStorage)
  const Noop: React.FC<{children: React.ReactNode}> = ({ children }) => <>{children}</>
  const [mounted, setMounted] = React.useState(false)
  React.useEffect(() => { setMounted(true) }, [])
  if (!mounted) {
    return (
      <QueryClientProvider client={queryClient}>
        <WagmiConfig config={wagmiConfig} reconnectOnMount={false}>
          {/* Mantener la forma del árbol sin ejecutar RainbowKit (usa localStorage en mount) */}
          <Noop>
            <SuiClientProvider networks={networks} defaultNetwork={(process.env.NEXT_PUBLIC_SUI_NETWORK as any) || 'testnet'}>
              <WalletProvider autoConnect>
                <WalletEcosystemProvider>
                  <ThemeProvider theme={theme}>
                    <CssBaseline />
                    {children}
                  </ThemeProvider>
                </WalletEcosystemProvider>
              </WalletProvider>
            </SuiClientProvider>
          </Noop>
        </WagmiConfig>
      </QueryClientProvider>
    )
  }

  const RainbowKitProvider = dynamic(() => import('@rainbow-me/rainbowkit').then(m => m.RainbowKitProvider), { ssr: false })

  return (
    <QueryClientProvider client={queryClient}>
      <WagmiConfig config={wagmiConfig} reconnectOnMount={false}>
        <RainbowKitProvider>
          <SuiClientProvider networks={networks} defaultNetwork={(process.env.NEXT_PUBLIC_SUI_NETWORK as any) || 'testnet'}>
            <WalletProvider autoConnect>
              <WalletEcosystemProvider>
                <ThemeProvider theme={theme}>
                  <CssBaseline />
                  {children}
                </ThemeProvider>
              </WalletEcosystemProvider>
            </WalletProvider>
          </SuiClientProvider>
        </RainbowKitProvider>
      </WagmiConfig>
    </QueryClientProvider>
  );
}