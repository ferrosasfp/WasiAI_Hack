'use client'

import React, { createContext, useContext, useState, useCallback, useRef, ReactNode } from 'react'
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography, Box } from '@mui/material'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import { deleteDraft, getDraftId } from '@/lib/draft-utils'

interface WizardGuardContextType {
  /** Whether the wizard has unsaved changes */
  isDirty: boolean
  /** Mark the wizard as having unsaved changes */
  setDirty: (dirty: boolean) => void
  /** Request navigation - will show confirmation if dirty */
  requestNavigation: (targetUrl: string, options?: { clearDraft?: boolean }) => void
  /** Confirm navigation without warning (for wizard internal navigation) */
  navigateWithinWizard: (targetUrl: string) => void
  /** Set upgrade mode info for draft cleanup */
  setUpgradeInfo: (upgradeMode: boolean, modelId?: string | null) => void
  /** Clear the draft and reset dirty state */
  clearDraftAndReset: () => Promise<void>
}

const WizardGuardContext = createContext<WizardGuardContextType | null>(null)

interface WizardGuardProviderProps {
  children: ReactNode
  locale?: string
}

export function WizardGuardProvider({ children, locale = 'en' }: WizardGuardProviderProps) {
  const [isDirty, setIsDirty] = useState(false)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [pendingNavigation, setPendingNavigation] = useState<{ url: string; clearDraft?: boolean } | null>(null)
  
  const upgradeInfoRef = useRef<{ upgradeMode: boolean; modelId?: string | null }>({ upgradeMode: false })
  
  const isES = locale.toLowerCase().startsWith('es')
  
  const L = {
    title: isES ? '¿Salir del asistente?' : 'Leave wizard?',
    message: isES 
      ? 'Tienes cambios sin publicar. Si sales ahora, perderás todo el progreso de este borrador.'
      : 'You have unpublished changes. If you leave now, you will lose all progress on this draft.',
    stay: isES ? 'Continuar editando' : 'Continue editing',
    leave: isES ? 'Salir y descartar' : 'Leave and discard',
    leaveKeepDraft: isES ? 'Salir (guardar borrador)' : 'Leave (keep draft)',
  }
  
  const setDirty = useCallback((dirty: boolean) => {
    setIsDirty(dirty)
  }, [])
  
  const setUpgradeInfo = useCallback((upgradeMode: boolean, modelId?: string | null) => {
    upgradeInfoRef.current = { upgradeMode, modelId }
  }, [])
  
  const clearDraftAndReset = useCallback(async () => {
    const { upgradeMode, modelId } = upgradeInfoRef.current
    try {
      await deleteDraft(upgradeMode, modelId)
      const draftId = getDraftId(upgradeMode, modelId)
      // Clear localStorage
      localStorage.removeItem(`draft_step1_${draftId}`)
      localStorage.removeItem(`draft_step2_${draftId}`)
      localStorage.removeItem(`draft_step3_${draftId}`)
      localStorage.removeItem(`draft_step4_${draftId}`)
      localStorage.removeItem(`draft_step5_${draftId}`)
      localStorage.removeItem('draft_step1')
      localStorage.removeItem('draft_step2')
      localStorage.removeItem('draft_step3')
      localStorage.removeItem('draft_step4')
      localStorage.removeItem('draft_step5')
      // Clear session
      sessionStorage.removeItem('wizard_active_session')
    } catch (err) {
      console.error('[WizardGuard] Failed to clear draft:', err)
    }
    setIsDirty(false)
  }, [])
  
  const requestNavigation = useCallback((targetUrl: string, options?: { clearDraft?: boolean }) => {
    if (isDirty) {
      setPendingNavigation({ url: targetUrl, clearDraft: options?.clearDraft })
      setShowConfirmDialog(true)
    } else {
      // Not dirty, navigate directly
      window.location.href = targetUrl
    }
  }, [isDirty])
  
  const navigateWithinWizard = useCallback((targetUrl: string) => {
    // Internal wizard navigation - no confirmation needed
    window.location.href = targetUrl
  }, [])
  
  const handleStay = useCallback(() => {
    setShowConfirmDialog(false)
    setPendingNavigation(null)
  }, [])
  
  const handleLeaveAndDiscard = useCallback(async () => {
    setShowConfirmDialog(false)
    await clearDraftAndReset()
    if (pendingNavigation) {
      window.location.href = pendingNavigation.url
    }
  }, [pendingNavigation, clearDraftAndReset])
  
  const handleLeaveKeepDraft = useCallback(() => {
    setShowConfirmDialog(false)
    setIsDirty(false)
    if (pendingNavigation) {
      window.location.href = pendingNavigation.url
    }
  }, [pendingNavigation])
  
  return (
    <WizardGuardContext.Provider value={{
      isDirty,
      setDirty,
      requestNavigation,
      navigateWithinWizard,
      setUpgradeInfo,
      clearDraftAndReset,
    }}>
      {children}
      
      {/* Confirmation Dialog */}
      <Dialog
        open={showConfirmDialog}
        onClose={handleStay}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: 'rgba(20, 26, 42, 0.98)',
            backgroundImage: 'linear-gradient(180deg, rgba(38,46,64,0.95), rgba(20,26,42,0.98))',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 3,
            boxShadow: '0 24px 48px rgba(0,0,0,0.5)',
          }
        }}
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <WarningAmberIcon sx={{ color: '#ffb74d', fontSize: 28 }} />
            <Typography variant="h6" sx={{ color: '#fff', fontWeight: 700 }}>
              {L.title}
            </Typography>
          </Box>
        </DialogTitle>
        
        <DialogContent>
          <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.8)', lineHeight: 1.6 }}>
            {L.message}
          </Typography>
        </DialogContent>
        
        <DialogActions sx={{ px: 3, pb: 3, gap: 1, flexWrap: 'wrap' }}>
          <Button
            onClick={handleStay}
            variant="contained"
            sx={{
              bgcolor: 'rgba(124, 92, 255, 0.9)',
              color: '#fff',
              fontWeight: 600,
              textTransform: 'none',
              '&:hover': { bgcolor: 'rgba(124, 92, 255, 1)' }
            }}
          >
            {L.stay}
          </Button>
          <Button
            onClick={handleLeaveKeepDraft}
            variant="outlined"
            sx={{
              borderColor: 'rgba(255,255,255,0.3)',
              color: 'rgba(255,255,255,0.8)',
              textTransform: 'none',
              '&:hover': { borderColor: 'rgba(255,255,255,0.5)', bgcolor: 'rgba(255,255,255,0.05)' }
            }}
          >
            {L.leaveKeepDraft}
          </Button>
          <Button
            onClick={handleLeaveAndDiscard}
            variant="text"
            sx={{
              color: '#ff6b6b',
              textTransform: 'none',
              '&:hover': { bgcolor: 'rgba(255,107,107,0.1)' }
            }}
          >
            {L.leave}
          </Button>
        </DialogActions>
      </Dialog>
    </WizardGuardContext.Provider>
  )
}

export function useWizardGuard() {
  const context = useContext(WizardGuardContext)
  if (!context) {
    // Return a no-op version if not within provider
    return {
      isDirty: false,
      setDirty: () => {},
      requestNavigation: (url: string) => { window.location.href = url },
      navigateWithinWizard: (url: string) => { window.location.href = url },
      setUpgradeInfo: () => {},
      clearDraftAndReset: async () => {},
    }
  }
  return context
}
