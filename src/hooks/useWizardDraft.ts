/**
 * useWizardDraft Hook
 * 
 * React hook for wizard draft management with:
 * - Automatic loading on mount
 * - Optimistic updates
 * - Loading states
 * - Error handling
 * 
 * Usage:
 * ```tsx
 * const { draft, loading, saveStep, getStep } = useWizardDraft(upgradeMode, modelId)
 * 
 * // Read step data
 * const step1Data = getStep('step1')
 * 
 * // Save step data
 * await saveStep('step1', { name: 'My Model', ... })
 * ```
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  loadDraft,
  saveStep as saveStepService,
  getStepFromCache,
  clearDraft,
  refreshFromServer,
  DraftData,
  StepName
} from '@/lib/wizard-draft-service'

interface UseWizardDraftOptions {
  autoLoad?: boolean
}

interface UseWizardDraftReturn {
  draft: DraftData | null
  loading: boolean
  error: string | null
  saveStep: (step: StepName, data: Record<string, any>, immediate?: boolean) => Promise<boolean>
  getStep: (step: StepName) => Record<string, any> | null
  reload: () => Promise<void>
  clear: () => Promise<void>
}

export function useWizardDraft(
  upgradeMode: boolean,
  modelId?: string | null,
  options: UseWizardDraftOptions = {}
): UseWizardDraftReturn {
  const { autoLoad = true } = options
  
  const [draft, setDraft] = useState<DraftData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Track if component is mounted - start as true
  const mountedRef = useRef(true)
  
  // Set mounted on first render
  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])
  
  // Load draft on mount or when mode changes
  useEffect(() => {
    if (!autoLoad) {
      setLoading(false)
      return
    }
    
    let cancelled = false
    
    const load = async () => {
      setLoading(true)
      setError(null)
      
      try {
        const data = await loadDraft(upgradeMode, modelId)
        console.log('[useWizardDraft] Loaded data:', { 
          hasStep1: !!data?.step1, 
          hasStep2: !!data?.step2,
          hasStep3: !!data?.step3,
          hasStep4: !!data?.step4,
          cancelled,
          mounted: mountedRef.current
        })
        if (!cancelled && mountedRef.current) {
          setDraft(data)
          console.log('[useWizardDraft] State updated with draft')
        }
      } catch (e) {
        console.error('[useWizardDraft] Error loading:', e)
        if (!cancelled && mountedRef.current) {
          setError(e instanceof Error ? e.message : 'Failed to load draft')
        }
      } finally {
        if (!cancelled && mountedRef.current) {
          setLoading(false)
        }
      }
    }
    
    load()
    
    return () => {
      cancelled = true
    }
  }, [upgradeMode, modelId, autoLoad])
  
  // Save step with optimistic update
  const saveStep = useCallback(async (
    step: StepName,
    data: Record<string, any>,
    immediate = false
  ): Promise<boolean> => {
    // Optimistic update
    setDraft(prev => ({
      ...prev,
      [step]: data,
      updatedAt: Date.now()
    }))
    
    try {
      const ok = await saveStepService(step, data, upgradeMode, modelId, { immediate })
      return ok
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save')
      return false
    }
  }, [upgradeMode, modelId])
  
  // Get step from current draft
  const getStep = useCallback((step: StepName): Record<string, any> | null => {
    return draft?.[step] || getStepFromCache(step) || null
  }, [draft])
  
  // Reload from server
  const reload = useCallback(async () => {
    setLoading(true)
    try {
      const data = await refreshFromServer(upgradeMode, modelId)
      if (mountedRef.current) {
        setDraft(data)
      }
    } catch (e) {
      if (mountedRef.current) {
        setError(e instanceof Error ? e.message : 'Failed to reload')
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false)
      }
    }
  }, [upgradeMode, modelId])
  
  // Clear draft
  const clear = useCallback(async () => {
    try {
      await clearDraft(upgradeMode, modelId)
      if (mountedRef.current) {
        setDraft(null)
      }
    } catch (e) {
      if (mountedRef.current) {
        setError(e instanceof Error ? e.message : 'Failed to clear')
      }
    }
  }, [upgradeMode, modelId])
  
  return {
    draft,
    loading,
    error,
    saveStep,
    getStep,
    reload,
    clear
  }
}

export default useWizardDraft
