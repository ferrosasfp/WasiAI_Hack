/**
 * Model Edit Controls Component
 * 
 * Shows edit buttons only to the model owner.
 * Provides two paths:
 * - Quick Edit: drawer for licensing/listing changes
 * - New Version: navigates to wizard in upgrade mode
 * 
 * @module components/ModelEditControls
 */

'use client'

import React from 'react'
import { Button, Box, Stack, Tooltip } from '@mui/material'
import EditIcon from '@mui/icons-material/Edit'
import UpgradeIcon from '@mui/icons-material/Upgrade'
import { useRouter } from 'next/navigation'
import { useLocale } from 'next-intl'

export interface ModelEditControlsProps {
  /** Model ID */
  modelId: number
  
  /** Model owner address (from on-chain) */
  ownerAddress: string
  
  /** Current user address (connected wallet) */
  currentAddress?: string
  
  /** Callback when quick edit is clicked */
  onQuickEdit: () => void
  
  /** Optional: disable controls */
  disabled?: boolean
}

export function ModelEditControls({
  modelId,
  ownerAddress,
  currentAddress,
  onQuickEdit,
  disabled = false,
}: ModelEditControlsProps) {
  const router = useRouter()
  const locale = useLocale()
  const isES = locale === 'es'
  
  // Only show controls if current user is the owner
  const isOwner = React.useMemo(() => {
    if (!currentAddress || !ownerAddress) return false
    return currentAddress.toLowerCase() === ownerAddress.toLowerCase()
  }, [currentAddress, ownerAddress])
  
  if (!isOwner) return null
  
  const handleUpgrade = () => {
    router.push(`/${locale}/publish/wizard?mode=upgrade&modelId=${modelId}`)
  }
  
  return (
    <Box
      sx={{
        p: 2,
        borderRadius: 2,
        bgcolor: 'rgba(139, 92, 246, 0.08)',
        border: '1px solid rgba(139, 92, 246, 0.2)',
        mb: 3,
      }}
    >
      <Stack spacing={2}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <EditIcon sx={{ color: '#8b5cf6', fontSize: 20 }} />
          <Box>
            <Box sx={{ fontWeight: 700, color: '#fff', fontSize: '0.95rem' }}>
              {isES ? 'Opciones de edición' : 'Edit options'}
            </Box>
            <Box sx={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)' }}>
              {isES 
                ? 'Actualiza tu modelo publicado'
                : 'Update your published model'}
            </Box>
          </Box>
        </Box>
        
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
          <Tooltip
            title={
              isES
                ? 'Precios, duración, derechos, términos y estado de listado'
                : 'Pricing, duration, rights, terms and listing status'
            }
          >
            <Button
              variant="contained"
              startIcon={<EditIcon />}
              onClick={onQuickEdit}
              disabled={disabled}
              sx={{
                flex: 1,
                background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                color: '#fff',
                textTransform: 'none',
                fontWeight: 600,
                '&:hover': {
                  background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                  transform: 'translateY(-1px)',
                },
                transition: 'all 0.2s',
              }}
            >
              {isES ? 'Edición rápida' : 'Quick edit'}
            </Button>
          </Tooltip>
          
          <Tooltip
            title={
              isES
                ? 'Cambios de ficha técnica, artefactos o imagen → crea nueva versión'
                : 'Changes to tech sheet, artifacts or cover → creates new version'
            }
          >
            <Button
              variant="outlined"
              startIcon={<UpgradeIcon />}
              onClick={handleUpgrade}
              disabled={disabled}
              sx={{
                flex: 1,
                borderColor: '#8b5cf6',
                color: '#8b5cf6',
                textTransform: 'none',
                fontWeight: 600,
                '&:hover': {
                  borderColor: '#7c3aed',
                  bgcolor: 'rgba(139, 92, 246, 0.1)',
                  transform: 'translateY(-1px)',
                },
                transition: 'all 0.2s',
              }}
            >
              {isES ? 'Nueva versión' : 'New version'}
            </Button>
          </Tooltip>
        </Stack>
      </Stack>
    </Box>
  )
}
