import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: {
    default: 'WasiAI - Marketing',
    template: '%s | WasiAI',
  },
  description: 'Descubre las ventajas de WasiAI para comercializar modelos de IA.',
};

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
