import type { Metadata, Viewport } from 'next';
import dynamic from 'next/dynamic';
import { Roboto } from 'next/font/google';
import { TopProgressBar } from '@/components/TopProgressBar';
import { WebVitals } from '@/components/WebVitals';
import '@/styles/globals.css';

// Dynamic import with SSR disabled to avoid wagmi SSR issues
const ProvidersEvm = dynamic(() => import('./providers-evm').then(mod => ({ default: mod.ProvidersEvm })), {
  ssr: false,
});

const roboto = Roboto({
  weight: ['300', '400', '500', '700'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-roboto',
  preload: true,
});

export const metadata: Metadata = {
  title: 'WasiAI - AI Agent Marketplace on Avalanche',
  description: 'The home of AI agents on Avalanche. Monetize models with x402 pay-per-inference and ERC-8004 identity.',
  keywords: ['AI', 'Blockchain', 'Avalanche', 'AVAX', 'IPFS', 'Marketplace', 'Machine Learning', 'x402', 'ERC-8004', 'AI Agents'],
  authors: [{ name: 'WasiAI Team' }],
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://wasiai.com',
    title: 'WasiAI',
    description: 'AI Agent Marketplace on Avalanche',
    siteName: 'WasiAI',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'WasiAI',
    description: 'AI Agent Marketplace on Avalanche',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#1976d2',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={roboto.variable}>
      <body>
        <TopProgressBar />
        <WebVitals />
        <ProvidersEvm>
          {children}
        </ProvidersEvm>
      </body>
    </html>
  );
}