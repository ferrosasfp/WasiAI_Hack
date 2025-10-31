import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: {
    default: 'MarketplaceAI - Autenticación',
    template: '%s | MarketplaceAI',
  },
  description: 'Accede a tu cuenta para comprar o vender modelos de IA en MarketplaceAI.',
  robots: { index: false, follow: false },
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return children;
}
