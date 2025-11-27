'use client'

import { ReactNode } from 'react'
import { useLocale } from 'next-intl'
import { WizardGuardProvider } from '@/contexts/WizardGuardContext'

interface WizardLayoutProps {
  children: ReactNode
}

export default function WizardLayout({ children }: WizardLayoutProps) {
  const locale = useLocale()
  
  return (
    <WizardGuardProvider locale={locale}>
      {children}
    </WizardGuardProvider>
  )
}
