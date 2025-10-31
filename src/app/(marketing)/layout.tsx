import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: {
    default: 'MarketplaceAI - Marketing',
    template: '%s | MarketplaceAI',
  },
  description: 'Descubre las ventajas de MarketplaceAI para comercializar modelos de IA.',
};

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
