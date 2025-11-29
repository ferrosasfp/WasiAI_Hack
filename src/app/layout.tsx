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
  title: 'MarketplaceAI - Decentralized AI Model Marketplace',
  description: 'Buy and sell AI models on Avalanche blockchain with IPFS storage',
  keywords: ['AI', 'Blockchain', 'Avalanche', 'AVAX', 'IPFS', 'Marketplace', 'Machine Learning'],
  authors: [{ name: 'MarketplaceAI Team' }],
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://marketplaceai.com',
    title: 'MarketplaceAI',
    description: 'Decentralized AI Model Marketplace on Avalanche',
    siteName: 'MarketplaceAI',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'MarketplaceAI',
    description: 'Decentralized AI Model Marketplace on Avalanche',
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