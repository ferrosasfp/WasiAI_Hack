import type { Metadata, Viewport } from 'next';
import { Roboto } from 'next/font/google';
import { Providers } from './providers';
import { ProvidersEvm } from './providers-evm';
import '@/styles/globals.css';
import '@mysten/dapp-kit/dist/index.css';

const roboto = Roboto({
  weight: ['300', '400', '500', '700'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-roboto',
});

export const metadata: Metadata = {
  title: 'MarketplaceAI - Decentralized AI Model Marketplace',
  description: 'Buy and sell AI models on Sui blockchain with IPFS storage',
  keywords: ['AI', 'Blockchain', 'Sui', 'IPFS', 'Marketplace', 'Machine Learning'],
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
    description: 'Decentralized AI Model Marketplace on Sui',
    siteName: 'MarketplaceAI',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'MarketplaceAI',
    description: 'Decentralized AI Model Marketplace on Sui',
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
  const enableSui = (process.env.NEXT_PUBLIC_ENABLE_SUI || '').toLowerCase() === 'true';
  return (
    <html lang="en" className={roboto.variable}>
      <body>
        {enableSui ? (
          <Providers>
            {children}
          </Providers>
        ) : (
          <ProvidersEvm>
            {children}
          </ProvidersEvm>
        )}
      </body>
    </html>
  );
}