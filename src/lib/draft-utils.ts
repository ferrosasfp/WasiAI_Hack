/**
 * Draft utilities for the publish wizard
 * 
 * Handles separation of drafts between:
 * - "create" - New model creation flow
 * - "upgrade:{modelId}" - Upgrade existing model flow
 */

/**
 * Get the draftId based on the current mode
 * @param upgradeMode - Whether we're in upgrade mode
 * @param modelId - The model ID being upgraded (only used in upgrade mode)
 * @returns The draftId to use for API calls
 */
export function getDraftId(upgradeMode: boolean, modelId?: string | null): string {
  if (upgradeMode && modelId) {
    return `upgrade:${modelId}`
  }
  return 'create'
}

/**
 * Build the draft API URL with the appropriate draftId
 * @param baseUrl - The base URL (e.g., '/api/models/draft')
 * @param upgradeMode - Whether we're in upgrade mode
 * @param modelId - The model ID being upgraded
 * @param address - Optional wallet address
 * @returns The full URL with query params
 */
export function buildDraftUrl(
  baseUrl: string,
  upgradeMode: boolean,
  modelId?: string | null,
  address?: string | null
): string {
  const params = new URLSearchParams()
  const draftId = getDraftId(upgradeMode, modelId)
  params.set('draftId', draftId)
  if (address) {
    params.set('address', address)
  }
  return `${baseUrl}?${params.toString()}`
}

/**
 * Save draft data for a specific step
 * @param step - The step name (e.g., 'step1', 'step2')
 * @param data - The data to save
 * @param upgradeMode - Whether we're in upgrade mode
 * @param modelId - The model ID being upgraded
 * @returns The API response
 */
export async function saveDraft(
  step: string,
  data: any,
  upgradeMode: boolean = false,
  modelId?: string | null
): Promise<{ ok: boolean; draftId?: string; error?: string }> {
  let addr: string | null = null
  try {
    addr = await (window as any)?.ethereum?.request?.({ method: 'eth_accounts' })
      .then((a: string[]) => a?.[0] || null)
  } catch {}
  
  const draftId = getDraftId(upgradeMode, modelId)
  
  const res = await fetch('/api/models/draft', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(addr ? { 'X-Wallet-Address': addr } : {})
    },
    body: JSON.stringify({
      step,
      data,
      draftId,
      ...(addr ? { address: addr } : {})
    })
  })
  return res.json()
}

/**
 * Load draft data
 * @param upgradeMode - Whether we're in upgrade mode
 * @param modelId - The model ID being upgraded
 * @returns The draft data
 */
export async function loadDraft(
  upgradeMode: boolean = false,
  modelId?: string | null
): Promise<{ ok: boolean; data: any; draftId?: string }> {
  let addr: string | null = null
  try {
    addr = await (window as any)?.ethereum?.request?.({ method: 'eth_accounts' })
      .then((a: string[]) => a?.[0] || null)
  } catch {}
  
  const url = buildDraftUrl('/api/models/draft', upgradeMode, modelId, addr)
  
  const res = await fetch(url, {
    method: 'GET',
    headers: addr ? { 'X-Wallet-Address': addr } : {}
  })
  return res.json()
}

/**
 * Delete draft data
 * @param upgradeMode - Whether we're in upgrade mode
 * @param modelId - The model ID being upgraded
 * @returns The API response
 */
export async function deleteDraft(
  upgradeMode: boolean = false,
  modelId?: string | null
): Promise<{ ok: boolean; draftId?: string }> {
  let addr: string | null = null
  try {
    addr = await (window as any)?.ethereum?.request?.({ method: 'eth_accounts' })
      .then((a: string[]) => a?.[0] || null)
  } catch {}
  
  const url = buildDraftUrl('/api/models/draft', upgradeMode, modelId, addr)
  
  const res = await fetch(url, {
    method: 'DELETE',
    headers: addr ? { 'X-Wallet-Address': addr } : {}
  })
  return res.json()
}
