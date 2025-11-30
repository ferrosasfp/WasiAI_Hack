import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: {
    default: 'WasiAI - Dashboard',
    template: '%s | WasiAI',
  },
  description: 'Administra tus modelos, compras y ventas en el dashboard de WasiAI.',
  robots: { index: false, follow: true },
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return children;
}
