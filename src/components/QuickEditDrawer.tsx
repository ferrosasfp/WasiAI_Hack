/**
 * Quick Edit Drawer
 * 
 * Allows model owner to quickly edit licensing parameters
 * without creating a new version. Changes:
 * - Prices (perpetual, subscription) - with smart decimal formatting
 * - Base duration (months)
 * - Rights & delivery (unified: API and/or Download checkboxes auto-apply to both)
 * - Listed status
 * 
 * After save, automatically syncs changes to Neon database and reloads page.
 * 
 * @module components/QuickEditDrawer
 */

'use client'

import React from 'react'
import {
  Drawer, Box, Typography, Stack, TextField, Button, Divider,
  FormControlLabel, Checkbox, Switch, Alert, CircularProgress,
  InputAdornment, Snackbar,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import SaveIcon from '@mui/icons-material/Save'
import { useLocale } from 'next-intl'
import { useWriteContract, useWaitForTransactionReceipt, usePublicClient } from 'wagmi'
import { formatAmount, ROYALTY_LIMITS, MARKETPLACE_FEE_BPS } from '@/config'
import { rightsArrayToBitmask, rightsBitmaskToArray } from '@/adapters/evm/write'

export interface QuickEditDrawerProps {
  /** Whether drawer is open */
  open: boolean
  
  /** Callback to close drawer */
  onClose: () => void
  
  /** Model ID */
  modelId: number
  
  /** Chain ID */
  chainId: number
  
  /** Chain symbol (AVAX, ETH, etc.) */
  chainSymbol: string
  
  /** Initial values from current model */
  initialValues: {
    pricePerpetual: string // wei
    priceSubscription: string // wei
    defaultDurationMonths: number
    rights: string[] // ['API', 'Download']
    deliveryMode: string // 'API' | 'Download' | 'Both'
    termsHash: string
    listed: boolean
  }
  
  /** Callback after successful update */
  onSuccess?: () => void
}

export function QuickEditDrawer({
  open,
  onClose,
  modelId,
  chainId,
  chainSymbol,
  initialValues,
  onSuccess,
}: QuickEditDrawerProps) {
  const locale = useLocale()
  const isES = locale === 'es'
  
  // Helper functions for price formatting (wei to token units, smart decimal display)
  const weiToTokenDisplay = React.useCallback((weiValue: string): string => {
    if (!weiValue || weiValue === '0') return '0'
    try {
      const wei = BigInt(weiValue)
      const eth = Number(wei) / 1e18
      
      // Round up to 2 decimals (ceiling)
      const rounded = Math.ceil(eth * 100) / 100
      
      // Show decimals only if they exist
      if (rounded % 1 === 0) {
        return rounded.toString() // Integer: "1" not "1.00"
      } else {
        return rounded.toFixed(2) // Decimals: "1.50"
      }
    } catch {
      return weiValue
    }
  }, [])
  
  const tokenToWei = React.useCallback((tokenValue: string): string => {
    if (!tokenValue || tokenValue === '0' || tokenValue === '0.00') return '0'
    try {
      const num = parseFloat(tokenValue)
      if (isNaN(num)) return '0'
      const wei = BigInt(Math.floor(num * 1e18))
      return wei.toString()
    } catch {
      return '0'
    }
  }, [])
  
  // Form state
  const [pricePerpetual, setPricePerpetual] = React.useState(initialValues.pricePerpetual)
  const [priceSubscription, setPriceSubscription] = React.useState(initialValues.priceSubscription)
  const [durationMonths, setDurationMonths] = React.useState(String(initialValues.defaultDurationMonths))
  
  // Display values (in token units with 2 decimals)
  const [displayPerpetual, setDisplayPerpetual] = React.useState(() => weiToTokenDisplay(initialValues.pricePerpetual))
  const [displaySubscription, setDisplaySubscription] = React.useState(() => weiToTokenDisplay(initialValues.priceSubscription))
  const [rightsAPI, setRightsAPI] = React.useState(initialValues.rights.includes('API'))
  const [rightsDownload, setRightsDownload] = React.useState(initialValues.rights.includes('Download'))
  const [termsHash, setTermsHash] = React.useState(initialValues.termsHash)
  const [listed, setListed] = React.useState(initialValues.listed)
  
  // UI state
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState('')
  const [showSuccess, setShowSuccess] = React.useState(false)
  
  // Wagmi hooks
  const { writeContractAsync } = useWriteContract()
  const publicClient = usePublicClient()
  
  // Reset form when drawer opens
  React.useEffect(() => {
    if (open) {
      setPricePerpetual(initialValues.pricePerpetual)
      setPriceSubscription(initialValues.priceSubscription)
      setDisplayPerpetual(weiToTokenDisplay(initialValues.pricePerpetual))
      setDisplaySubscription(weiToTokenDisplay(initialValues.priceSubscription))
      setDurationMonths(String(initialValues.defaultDurationMonths))
      setRightsAPI(initialValues.rights.includes('API'))
      setRightsDownload(initialValues.rights.includes('Download'))
      setTermsHash(initialValues.termsHash)
      setListed(initialValues.listed)
      setError('')
    }
  }, [open, initialValues, weiToTokenDisplay])
  
  // Validation
  const validate = () => {
    const pPerp = BigInt(pricePerpetual || '0')
    const pSub = BigInt(priceSubscription || '0')
    
    if (pPerp === 0n && pSub === 0n) {
      return isES 
        ? 'Debe configurar al menos un precio (perpetuo o suscripción)'
        : 'At least one pricing option must be set'
    }
    
    if (pSub > 0n && Number(durationMonths) <= 0) {
      return isES
        ? 'Precio de suscripción requiere duración >= 1 mes'
        : 'Subscription pricing requires duration >= 1 month'
    }
    
    if (!rightsAPI && !rightsDownload) {
      return isES
        ? 'Debe seleccionar al menos un derecho (API o Descarga)'
        : 'At least one right must be selected (API or Download)'
    }
    
    return null
  }
  
  const handleSave = async () => {
    const errorMsg = validate()
    if (errorMsg) {
      setError(errorMsg)
      return
    }
    
    setLoading(true)
    setError('')
    
    try {
      // Build rights array and delivery mode based on checkboxes
      const rights: string[] = []
      if (rightsAPI) rights.push('API')
      if (rightsDownload) rights.push('Download')
      
      // Auto-determine delivery mode based on selected rights
      let deliveryMode: 'API' | 'Download' | 'Both'
      if (rightsAPI && rightsDownload) {
        deliveryMode = 'Both'
      } else if (rightsAPI) {
        deliveryMode = 'API'
      } else {
        deliveryMode = 'Download'
      }
      
      const licensingRes = await fetch(`/api/models/evm/${modelId}/licensing`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          chainId,
          pricePerpetual,
          priceSubscription,
          defaultDurationMonths: Number(durationMonths),
          deliveryRightsDefault: rightsArrayToBitmask(rights),
          deliveryModeHint: deliveryMode === 'API' ? 1 : deliveryMode === 'Download' ? 2 : 3,
          termsHash,
        }),
      })
      
      if (!licensingRes.ok) {
        const errorData = await licensingRes.json()
        throw new Error(errorData.error || 'Licensing API error')
      }
      
      const licensingData = await licensingRes.json()
      
      // 2. Convert string args back to BigInt for wagmi
      const txWithBigInt = {
        ...licensingData.tx,
        args: licensingData.tx.args?.map((arg: any) => {
          // Try to convert string numbers to BigInt
          if (typeof arg === 'string' && /^\d+$/.test(arg)) {
            return BigInt(arg)
          }
          return arg
        }),
      }
      
      // 3. Execute licensing tx
      const licensingTxHash = await writeContractAsync(txWithBigInt)
      console.log('[QuickEdit] Licensing tx sent:', licensingTxHash)
      
      // 4. Wait for licensing tx confirmation
      if (publicClient) {
        console.log('[QuickEdit] Waiting for licensing tx confirmation...')
        const receipt = await publicClient.waitForTransactionReceipt({ 
          hash: licensingTxHash,
          confirmations: 1
        })
        console.log('[QuickEdit] Licensing tx confirmed:', receipt.status)
        
        // 4.1. Sync to Neon database immediately
        try {
          console.log('[QuickEdit] Syncing model to database...')
          const indexRes = await fetch(`/api/indexer/models/${modelId}`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ chainId }),
          })
          
          if (indexRes.ok) {
            console.log('[QuickEdit] Model synced to database successfully')
          } else {
            console.warn('[QuickEdit] Database sync failed, but blockchain update succeeded')
          }
        } catch (indexErr) {
          console.warn('[QuickEdit] Database sync error (non-critical):', indexErr)
        }
      }
      
      // 5. If listed status changed, update it
      if (listed !== initialValues.listed) {
        const listedRes = await fetch(`/api/models/evm/${modelId}/listed`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            chainId,
            listed,
          }),
        })
        
        if (!listedRes.ok) {
          const errorData = await listedRes.json()
          throw new Error(errorData.error || 'Listed API error')
        }
        
        const listedData = await listedRes.json()
        
        // Convert string args back to BigInt for wagmi
        const listedTxWithBigInt = {
          ...listedData.tx,
          args: listedData.tx.args?.map((arg: any) => {
            if (typeof arg === 'string' && /^\d+$/.test(arg)) {
              return BigInt(arg)
            }
            return arg
          }),
        }
        
        const listedTxHash = await writeContractAsync(listedTxWithBigInt)
        console.log('[QuickEdit] Listed tx sent:', listedTxHash)
        
        // Wait for listed tx confirmation
        if (publicClient) {
          console.log('[QuickEdit] Waiting for listed tx confirmation...')
          const receipt = await publicClient.waitForTransactionReceipt({ 
            hash: listedTxHash,
            confirmations: 1
          })
          console.log('[QuickEdit] Listed tx confirmed:', receipt.status)
          
          // Sync to Neon database immediately
          try {
            console.log('[QuickEdit] Syncing listed status to database...')
            const indexRes = await fetch(`/api/indexer/models/${modelId}`, {
              method: 'POST',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify({ chainId }),
            })
            
            if (indexRes.ok) {
              console.log('[QuickEdit] Listed status synced to database successfully')
            } else {
              console.warn('[QuickEdit] Database sync failed, but blockchain update succeeded')
            }
          } catch (indexErr) {
            console.warn('[QuickEdit] Database sync error (non-critical):', indexErr)
          }
        }
      }
      
      setShowSuccess(true)
      setTimeout(() => {
        onSuccess?.()
        onClose()
      }, 2000)
      
    } catch (err: any) {
      console.error('Quick edit error:', err)
      setError(err.message || (isES ? 'Error al actualizar' : 'Update error'))
    } finally {
      setLoading(false)
    }
  }
  
  return (
    <>
      <Drawer
        anchor="right"
        open={open}
        onClose={onClose}
        PaperProps={{
          sx: {
            width: { xs: '100%', sm: 500 },
            bgcolor: '#0a111c',
            backgroundImage: 'linear-gradient(rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0.05))',
          },
        }}
      >
        <Box sx={{ p: 3 }}>
          {/* Header */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, color: '#fff' }}>
              {isES ? 'Edición rápida' : 'Quick edit'}
            </Typography>
            <Button
              onClick={onClose}
              disabled={loading}
              sx={{ minWidth: 'auto', color: 'rgba(255,255,255,0.6)' }}
            >
              <CloseIcon />
            </Button>
          </Box>
          
          <Divider sx={{ mb: 3, borderColor: 'rgba(255,255,255,0.1)' }} />
          
          {/* Form */}
          <Stack spacing={3}>
            {/* Prices */}
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 600, color: '#fff' }}>
                {isES ? 'Precios' : 'Prices'}
              </Typography>
              
              <Stack spacing={2}>
                <TextField
                  label={isES ? 'Precio perpetuo' : 'Perpetual price'}
                  type="text"
                  fullWidth
                  value={displayPerpetual}
                  onChange={(e) => {
                    const value = e.target.value
                    // Allow only numbers and decimal point
                    if (value === '' || /^\d*\.?\d{0,2}$/.test(value)) {
                      setDisplayPerpetual(value)
                      setPricePerpetual(tokenToWei(value))
                    }
                  }}
                  onBlur={() => {
                    // Format intelligently on blur (integers or 2 decimals)
                    const num = parseFloat(displayPerpetual || '0')
                    const rounded = Math.ceil(num * 100) / 100
                    if (rounded % 1 === 0) {
                      setDisplayPerpetual(rounded.toString())
                    } else {
                      setDisplayPerpetual(rounded.toFixed(2))
                    }
                  }}
                  InputLabelProps={{ sx: { color: '#fff' } }}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <Typography sx={{ color: '#fff', fontSize: '0.875rem' }}>
                          {chainSymbol}
                        </Typography>
                      </InputAdornment>
                    ),
                    sx: { color: '#fff' }
                  }}
                  FormHelperTextProps={{ sx: { color: 'rgba(255,255,255,0.6)' } }}
                  helperText={isES ? 'Precio en token (0 para deshabilitar)' : 'Price in tokens (0 to disable)'}
                />
                
                <TextField
                  label={isES ? 'Precio suscripción (mensual)' : 'Subscription price (monthly)'}
                  type="text"
                  fullWidth
                  value={displaySubscription}
                  onChange={(e) => {
                    const value = e.target.value
                    // Allow only numbers and decimal point
                    if (value === '' || /^\d*\.?\d{0,2}$/.test(value)) {
                      setDisplaySubscription(value)
                      setPriceSubscription(tokenToWei(value))
                    }
                  }}
                  onBlur={() => {
                    // Format intelligently on blur (integers or 2 decimals)
                    const num = parseFloat(displaySubscription || '0')
                    const rounded = Math.ceil(num * 100) / 100
                    if (rounded % 1 === 0) {
                      setDisplaySubscription(rounded.toString())
                    } else {
                      setDisplaySubscription(rounded.toFixed(2))
                    }
                  }}
                  InputLabelProps={{ sx: { color: '#fff' } }}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <Typography sx={{ color: '#fff', fontSize: '0.875rem' }}>
                          {chainSymbol}/mo
                        </Typography>
                      </InputAdornment>
                    ),
                    sx: { color: '#fff' }
                  }}
                  FormHelperTextProps={{ sx: { color: 'rgba(255,255,255,0.6)' } }}
                  helperText={isES ? 'Precio mensual en tokens (0 para deshabilitar)' : 'Monthly price in tokens (0 to disable)'}
                />
                
                <TextField
                  label={isES ? 'Duración base' : 'Base duration'}
                  type="number"
                  fullWidth
                  value={durationMonths}
                  onChange={(e) => setDurationMonths(e.target.value)}
                  InputLabelProps={{ sx: { color: '#fff' } }}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <Typography sx={{ color: '#fff', fontSize: '0.875rem' }}>
                          {isES ? 'meses' : 'months'}
                        </Typography>
                      </InputAdornment>
                    ),
                    sx: { color: '#fff' }
                  }}
                  inputProps={{ min: 1, max: 12 }}
                  FormHelperTextProps={{ sx: { color: 'rgba(255,255,255,0.6)' } }}
                  helperText={isES ? 'Solo para suscripción' : 'For subscription only'}
                />
              </Stack>
            </Box>
            
            {/* Rights & Delivery */}
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 600, color: '#fff' }}>
                {isES ? 'Derechos y entrega' : 'Rights & delivery'}
              </Typography>
              
              <Stack spacing={1}>
                <FormControlLabel
                  control={<Checkbox checked={rightsAPI} onChange={(e) => setRightsAPI(e.target.checked)} />}
                  label={isES ? 'Uso de API' : 'API usage'}
                  sx={{ '& .MuiFormControlLabel-label': { color: '#fff' } }}
                />
                
                <FormControlLabel
                  control={<Checkbox checked={rightsDownload} onChange={(e) => setRightsDownload(e.target.checked)} />}
                  label={isES ? 'Descarga del modelo' : 'Model download'}
                  sx={{ '& .MuiFormControlLabel-label': { color: '#fff' } }}
                />
                
                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)', mt: 0.5, display: 'block' }}>
                  {isES 
                    ? 'La selección se aplica automáticamente a derechos y modo de entrega' 
                    : 'Selection automatically applies to rights and delivery mode'}
                </Typography>
              </Stack>
            </Box>
            
            {/* Listed */}
            <FormControlLabel
              control={
                <Switch
                  checked={listed}
                  onChange={(e) => setListed(e.target.checked)}
                  color="primary"
                />
              }
              label={isES ? 'Modelo listado (visible)' : 'Model listed (visible)'}
              sx={{ '& .MuiFormControlLabel-label': { color: '#fff' } }}
            />
            
            {/* Error */}
            {error && (
              <Alert severity="error" onClose={() => setError('')}>
                {error}
              </Alert>
            )}
            
            {/* Actions */}
            <Stack direction="row" spacing={2}>
              <Button
                fullWidth
                variant="outlined"
                onClick={onClose}
                disabled={loading}
              >
                {isES ? 'Cancelar' : 'Cancel'}
              </Button>
              
              <Button
                fullWidth
                variant="contained"
                onClick={handleSave}
                disabled={loading}
                startIcon={loading ? <CircularProgress size={16} /> : <SaveIcon />}
                sx={{
                  background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                }}
              >
                {loading ? (isES ? 'Guardando...' : 'Saving...') : (isES ? 'Guardar' : 'Save')}
              </Button>
            </Stack>
          </Stack>
        </Box>
      </Drawer>
      
      {/* Success snackbar */}
      <Snackbar
        open={showSuccess}
        autoHideDuration={2000}
        onClose={() => setShowSuccess(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="success" sx={{ width: '100%' }}>
          {isES ? 'Cambios aplicados exitosamente' : 'Changes applied successfully'}
        </Alert>
      </Snackbar>
    </>
  )
}
