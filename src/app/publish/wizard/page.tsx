import { redirect } from 'next/navigation'
import { useWalletAddress } from '@/hooks/useWalletAddress'

export const dynamic = 'force-dynamic'

export default function WizardIndex() {
  "use client";
  redirect('/en/publish/wizard')
}
