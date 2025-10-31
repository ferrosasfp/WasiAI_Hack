import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: {
    default: 'MarketplaceAI - Dashboard',
    template: '%s | MarketplaceAI',
  },
  description: 'Administra tus modelos, compras y ventas en el dashboard de MarketplaceAI.',
  robots: { index: false, follow: true },
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return children;
}
