import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: {
    default: 'WasiAI - Autenticación',
    template: '%s | WasiAI',
  },
  description: 'Accede a tu cuenta para comprar o vender modelos de IA en WasiAI.',
  robots: { index: false, follow: false },
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return children;
}
