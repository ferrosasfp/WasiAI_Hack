/**
 * Wizard Draft Service
 * 
 * Centralized service for managing wizard drafts with:
 * - Server-first persistence (Redis via API)
 * - localStorage as offline cache only
 * - Consistent key generation
 * - Optimistic updates with server sync
 * - Debounced saves to prevent excessive API calls
 * 
 * Architecture:
 * 1. READ: Server (Redis) → localStorage cache
 * 2. WRITE: Optimistic localStorage → Debounced server sync
 * 3. CONFLICT: Server wins (last-write-wins with timestamp)
 */

import { getDraftId } from './draft-utils'

export type StepName = 'step1' | 'step2' | 'step3' | 'step4' | 'step5'

export interface DraftData {
  step1?: Record<string, any>
  step2?: Record<string, any>
  step3?: Record<string, any>
  step4?: Record<string, any>
  step5?: Record<string, any>
  updatedAt?: number
  draftId?: string
}

interface SaveOptions {
  immediate?: boolean // Skip debounce
}

// Debounce timers per step
const saveTimers: Record<string, ReturnType<typeof setTimeout>> = {}
const DEBOUNCE_MS = 800

// In-memory cache for current session
let memoryCache: DraftData | null = null
let currentDraftId: string | null = null

/**
 * Get wallet address from MetaMask
 */
async function getWalletAddress(): Promise<string | null> {
  try {
    const eth = (window as any)?.ethereum
    if (!eth) return null
    const accounts = await eth.request?.({ method: 'eth_accounts' })
    return accounts?.[0]?.toLowerCase() || null
  } catch {
    return null
  }
}

/**
 * Generate consistent localStorage key
 */
function getLocalStorageKey(draftId: string): string {
  return `wizard_draft_${draftId}`
}

/**
 * Read from localStorage cache
 */
function readLocalCache(draftId: string): DraftData | null {
  try {
    const key = getLocalStorageKey(draftId)
    const raw = localStorage.getItem(key)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

/**
 * Write to localStorage cache
 */
function writeLocalCache(draftId: string, data: DraftData): void {
  try {
    const key = getLocalStorageKey(draftId)
    localStorage.setItem(key, JSON.stringify(data))
  } catch (e) {
    console.warn('[WizardDraft] Failed to write localStorage:', e)
  }
}

/**
 * Load draft from server (Redis)
 */
async function loadFromServer(
  upgradeMode: boolean,
  modelId?: string | null
): Promise<DraftData> {
  const draftId = getDraftId(upgradeMode, modelId)
  const addr = await getWalletAddress()
  
  const params = new URLSearchParams({ draftId })
  if (addr) params.set('address', addr)
  
  const res = await fetch(`/api/models/draft?${params}`, {
    method: 'GET',
    headers: addr ? { 'X-Wallet-Address': addr } : {}
  })
  
  if (!res.ok) {
    throw new Error(`Failed to load draft: ${res.status}`)
  }
  
  const json = await res.json()
  return json.data || {}
}

/**
 * Save step to server (Redis)
 */
async function saveToServer(
  step: StepName,
  data: Record<string, any>,
  upgradeMode: boolean,
  modelId?: string | null
): Promise<boolean> {
  const draftId = getDraftId(upgradeMode, modelId)
  const addr = await getWalletAddress()
  
  const res = await fetch('/api/models/draft', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(addr ? { 'X-Wallet-Address': addr } : {})
    },
    body: JSON.stringify({
      step,
      data,
      draftId,
      ...(addr ? { address: addr } : {})
    })
  })
  
  return res.ok
}

/**
 * Load from legacy localStorage keys (draft_step1_{draftId}, etc.)
 * This is for backward compatibility with existing saved data
 */
function loadFromLegacyLocalStorage(draftId: string): DraftData {
  const result: DraftData = {}
  const steps: StepName[] = ['step1', 'step2', 'step3', 'step4']
  
  for (const step of steps) {
    try {
      // Try new format first: draft_step1_upgrade:14 or draft_step1_create
      let raw = localStorage.getItem(`draft_${step}_${draftId}`)
      
      // Fallback to legacy format without draftId: draft_step1
      if (!raw) {
        raw = localStorage.getItem(`draft_${step}`)
      }
      
      if (raw) {
        result[step] = JSON.parse(raw)
      }
    } catch (e) {
      console.warn(`[WizardDraft] Failed to load ${step} from legacy localStorage:`, e)
    }
  }
  
  if (Object.keys(result).length > 0) {
    result.updatedAt = Date.now()
    result.draftId = draftId
  }
  
  return result
}

/**
 * Load complete draft (all steps)
 * 
 * Strategy:
 * 1. Return memory cache immediately if available
 * 2. Load from localStorage (new format + legacy format)
 * 3. Load from server (source of truth)
 * 4. Merge all sources
 */
export async function loadDraft(
  upgradeMode: boolean,
  modelId?: string | null
): Promise<DraftData> {
  const draftId = getDraftId(upgradeMode, modelId)
  
  console.log('[WizardDraft] Loading draft:', { upgradeMode, modelId, draftId })
  
  // Return memory cache if same draft AND has ALL steps loaded
  const cacheHasAllSteps = memoryCache && 
    currentDraftId === draftId && 
    ['step1','step2','step3','step4'].every(k => memoryCache![k as keyof DraftData])
  
  if (cacheHasAllSteps && memoryCache) {
    console.log('[WizardDraft] Returning complete memory cache:', Object.keys(memoryCache))
    return memoryCache
  }
  
  // If cache is incomplete, clear it and reload
  if (currentDraftId !== draftId) {
    memoryCache = null
  }
  
  currentDraftId = draftId
  
  // Load from new localStorage format first
  let localData = readLocalCache(draftId)
  
  // If no data in new format, try legacy format
  if (!localData || Object.keys(localData).length === 0) {
    localData = loadFromLegacyLocalStorage(draftId)
    console.log('[WizardDraft] Loaded from legacy localStorage:', Object.keys(localData))
  }
  
  if (localData && Object.keys(localData).length > 0) {
    memoryCache = localData
  }
  
  // Load from server (source of truth)
  try {
    const serverData = await loadFromServer(upgradeMode, modelId)
    console.log('[WizardDraft] Server data:', { 
      hasStep1: !!serverData?.step1, 
      hasStep2: !!serverData?.step2,
      hasStep3: !!serverData?.step3,
      hasStep4: !!serverData?.step4
    })
    
    // Merge strategy: combine local and server, local takes priority for each step
    const merged: DraftData = { ...serverData }
    const steps: StepName[] = ['step1', 'step2', 'step3', 'step4']
    
    for (const step of steps) {
      if (localData?.[step]) {
        // Local has this step - use it (may have offline edits)
        merged[step] = { ...(serverData?.[step] || {}), ...localData[step] }
      }
    }
    
    merged.updatedAt = Math.max(localData?.updatedAt || 0, serverData?.updatedAt || 0, Date.now())
    merged.draftId = draftId
    
    console.log('[WizardDraft] Merged result:', { 
      hasStep1: !!merged?.step1, 
      hasStep2: !!merged?.step2,
      hasStep3: !!merged?.step3,
      hasStep4: !!merged?.step4
    })
    
    memoryCache = merged
    writeLocalCache(draftId, merged)
    
    return merged
  } catch (err) {
    console.warn('[WizardDraft] Server load failed, using local cache:', err)
    return localData || {}
  }
}

/**
 * Sync local data to server (background)
 */
async function syncLocalToServer(
  data: DraftData,
  upgradeMode: boolean,
  modelId?: string | null
): Promise<void> {
  const steps: StepName[] = ['step1', 'step2', 'step3', 'step4']
  
  for (const step of steps) {
    if (data[step]) {
      try {
        await saveToServer(step, data[step]!, upgradeMode, modelId)
      } catch (e) {
        console.warn(`[WizardDraft] Failed to sync ${step} to server:`, e)
      }
    }
  }
}

/**
 * Save a single step
 * 
 * Strategy:
 * 1. Update memory cache immediately
 * 2. Write to localStorage (optimistic)
 * 3. Debounced save to server
 */
export async function saveStep(
  step: StepName,
  data: Record<string, any>,
  upgradeMode: boolean,
  modelId?: string | null,
  options: SaveOptions = {}
): Promise<boolean> {
  const draftId = getDraftId(upgradeMode, modelId)
  currentDraftId = draftId
  
  // Update memory cache
  memoryCache = {
    ...memoryCache,
    [step]: data,
    updatedAt: Date.now(),
    draftId
  }
  
  // Write to localStorage immediately (optimistic)
  writeLocalCache(draftId, memoryCache)
  
  // Clear existing timer for this step
  if (saveTimers[step]) {
    clearTimeout(saveTimers[step])
  }
  
  // Debounced server save
  const doSave = async () => {
    try {
      const ok = await saveToServer(step, data, upgradeMode, modelId)
      if (!ok) {
        console.warn(`[WizardDraft] Server save failed for ${step}`)
      }
      return ok
    } catch (e) {
      console.error(`[WizardDraft] Server save error for ${step}:`, e)
      return false
    }
  }
  
  if (options.immediate) {
    return doSave()
  }
  
  // Debounce
  return new Promise((resolve) => {
    saveTimers[step] = setTimeout(async () => {
      const ok = await doSave()
      resolve(ok)
    }, DEBOUNCE_MS)
  })
}

/**
 * Get a single step from cache (sync)
 */
export function getStepFromCache(step: StepName): Record<string, any> | null {
  return memoryCache?.[step] || null
}

/**
 * Clear draft (local + server)
 */
export async function clearDraft(
  upgradeMode: boolean,
  modelId?: string | null
): Promise<void> {
  const draftId = getDraftId(upgradeMode, modelId)
  
  // Clear memory
  memoryCache = null
  currentDraftId = null
  
  // Clear localStorage
  try {
    localStorage.removeItem(getLocalStorageKey(draftId))
  } catch {}
  
  // Clear server
  const addr = await getWalletAddress()
  const params = new URLSearchParams({ draftId })
  if (addr) params.set('address', addr)
  
  try {
    await fetch(`/api/models/draft?${params}`, {
      method: 'DELETE',
      headers: addr ? { 'X-Wallet-Address': addr } : {}
    })
  } catch (e) {
    console.warn('[WizardDraft] Failed to delete from server:', e)
  }
}

/**
 * Force refresh from server
 */
export async function refreshFromServer(
  upgradeMode: boolean,
  modelId?: string | null
): Promise<DraftData> {
  memoryCache = null
  return loadDraft(upgradeMode, modelId)
}
