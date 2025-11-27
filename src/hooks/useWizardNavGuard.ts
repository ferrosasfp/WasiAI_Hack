'use client'

import { useEffect } from 'react'
import { useWizardGuard } from '@/contexts/WizardGuardContext'

/**
 * Hook to integrate wizard steps with the guard context
 * 
 * Features:
 * - Registers upgrade mode info with the guard
 * - Marks wizard as dirty when data changes
 * - Provides navigation helpers
 */
export function useWizardNavGuard(
  upgradeMode: boolean,
  modelId?: string | null,
  enabled: boolean = true
) {
  const guard = useWizardGuard()
  
  // Register upgrade info on mount
  useEffect(() => {
    if (enabled) {
      guard.setUpgradeInfo(upgradeMode, modelId)
    }
  }, [enabled, upgradeMode, modelId, guard])
  
  return {
    /** Mark wizard as having unsaved changes */
    setDirty: guard.setDirty,
    /** Whether wizard has unsaved changes */
    isDirty: guard.isDirty,
    /** Navigate to external URL (will show confirmation if dirty) */
    requestNavigation: guard.requestNavigation,
    /** Navigate within wizard (no confirmation) */
    navigateWithinWizard: guard.navigateWithinWizard,
    /** Clear draft and reset state */
    clearDraftAndReset: guard.clearDraftAndReset,
  }
}
