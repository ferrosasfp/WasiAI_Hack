import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

// Root page redirects to default locale
export default function RootPage() {
  redirect('/en');
}
