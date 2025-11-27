import { notFound } from 'next/navigation';
import { NextIntlClientProvider } from 'next-intl';
import type { ReactNode } from 'react';
import { GlobalHeader } from '@/components/GlobalHeader';
import { GlobalHeaderEvm } from '@/components/GlobalHeaderEvm';
import EmotionRegistry from '@/app/emotion/registry'

const locales = ['en', 'es'] as const;
type Locale = (typeof locales)[number];

export const dynamic = 'force-dynamic'

async function getMessages(locale: Locale) {
  try {
    const messages = await import(`@/messages/${locale}.json`);
    return messages.default;
  } catch (e) {
    return null;
  }
}


export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: { locale: Locale };
}) {
  const { locale } = params;
  if (!locales.includes(locale)) notFound();

  const messages = await getMessages(locale);
  if (!messages) notFound();

  const enableSui = (process.env.NEXT_PUBLIC_ENABLE_SUI || '').toLowerCase() === 'true'
  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <EmotionRegistry>
        {enableSui ? <GlobalHeader /> : <GlobalHeaderEvm />}
        {children}
      </EmotionRegistry>
    </NextIntlClientProvider>
  );
}
