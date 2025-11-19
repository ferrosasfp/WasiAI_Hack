/**
 * Quick Edit Drawer Component
 * 
 * Allows model owner to quickly update licensing/listing parameters
 * without creating a new version. Changes:
 * - Prices (perpetual, subscription)
 * - Base duration (months)
 * - Rights & delivery mode
 * - Terms hash
 * - Listed status
 * 
 * @module components/QuickEditDrawer
 */

'use client'

import React from 'react'
import {
  Drawer, Box, Typography, Stack, TextField, Button, Divider,
  FormControlLabel, Checkbox, Switch, Alert, CircularProgress,
  InputAdornment, MenuItem, Snackbar,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import SaveIcon from '@mui/icons-material/Save'
import { useLocale } from 'next-intl'
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
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
  
  // Form state
  const [pricePerpetual, setPricePerpetual] = React.useState(initialValues.pricePerpetual)
  const [priceSubscription, setPriceSubscription] = React.useState(initialValues.priceSubscription)
  const [durationMonths, setDurationMonths] = React.useState(String(initialValues.defaultDurationMonths))
  const [rightsAPI, setRightsAPI] = React.useState(initialValues.rights.includes('API'))
  const [rightsDownload, setRightsDownload] = React.useState(initialValues.rights.includes('Download'))
  const [deliveryMode, setDeliveryMode] = React.useState(initialValues.deliveryMode)
  const [termsHash, setTermsHash] = React.useState(initialValues.termsHash)
  const [listed, setListed] = React.useState(initialValues.listed)
  
  // UI state
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState('')
  const [showSuccess, setShowSuccess] = React.useState(false)
  
  // Wagmi hooks
  const { writeContractAsync } = useWriteContract()
  
  // Reset form when drawer opens
  React.useEffect(() => {
    if (open) {
      setPricePerpetual(initialValues.pricePerpetual)
      setPriceSubscription(initialValues.priceSubscription)
      setDurationMonths(String(initialValues.defaultDurationMonths))
      setRightsAPI(initialValues.rights.includes('API'))
      setRightsDownload(initialValues.rights.includes('Download'))
      setDeliveryMode(initialValues.deliveryMode)
      setTermsHash(initialValues.termsHash)
      setListed(initialValues.listed)
      setError('')
    }
  }, [open, initialValues])
  
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
    const validationError = validate()
    if (validationError) {
      setError(validationError)
      return
    }
    
    setLoading(true)
    setError('')
    
    try {
      // 1. Prepare licensing update
      const rights = []
      if (rightsAPI) rights.push('API')
      if (rightsDownload) rights.push('Download')
      
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
      
      // 2. Execute licensing tx
      const licensingTxHash = await writeContractAsync(licensingData.tx)
      
      // 3. If listed status changed, update it
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
        await writeContractAsync(listedData.tx)
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
                  value={pricePerpetual}
                  onChange={(e) => setPricePerpetual(e.target.value)}
                  InputLabelProps={{ sx: { color: '#fff' } }}
                  InputProps={{
                    endAdornment: <InputAdornment position="end">{chainSymbol}</InputAdornment>,
                    sx: { color: '#fff' }
                  }}
                  FormHelperTextProps={{ sx: { color: 'rgba(255,255,255,0.6)' } }}
                  helperText={isES ? 'Precio en wei (0 para deshabilitar)' : 'Price in wei (0 to disable)'}
                />
                
                <TextField
                  label={isES ? 'Precio suscripción (mensual)' : 'Subscription price (monthly)'}
                  type="text"
                  fullWidth
                  value={priceSubscription}
                  onChange={(e) => setPriceSubscription(e.target.value)}
                  InputLabelProps={{ sx: { color: '#fff' } }}
                  InputProps={{
                    endAdornment: <InputAdornment position="end">{`${chainSymbol}/mo`}</InputAdornment>,
                    sx: { color: '#fff' }
                  }}
                  FormHelperTextProps={{ sx: { color: 'rgba(255,255,255,0.6)' } }}
                  helperText={isES ? 'Precio mensual en wei (0 para deshabilitar)' : 'Monthly price in wei (0 to disable)'}
                />
                
                <TextField
                  label={isES ? 'Duración base (meses)' : 'Base duration (months)'}
                  type="number"
                  fullWidth
                  value={durationMonths}
                  onChange={(e) => setDurationMonths(e.target.value)}
                  InputLabelProps={{ sx: { color: '#fff' } }}
                  InputProps={{ sx: { color: '#fff' } }}
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
              
              <Stack spacing={1.5}>
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
                
                <TextField
                  select
                  label={isES ? 'Modo de entrega' : 'Delivery mode'}
                  fullWidth
                  value={deliveryMode}
                  onChange={(e) => setDeliveryMode(e.target.value)}
                  InputLabelProps={{ sx: { color: '#fff' } }}
                  InputProps={{ sx: { color: '#fff' } }}
                  SelectProps={{
                    MenuProps: {
                      PaperProps: {
                        sx: { bgcolor: '#1a2332', color: '#fff' }
                      }
                    }
                  }}
                >
                  <MenuItem value="API">API</MenuItem>
                  <MenuItem value="Download">{isES ? 'Descarga' : 'Download'}</MenuItem>
                  <MenuItem value="Both">{isES ? 'Ambos' : 'Both'}</MenuItem>
                </TextField>
              </Stack>
            </Box>
            
            {/* Terms */}
            <TextField
              label={isES ? 'Hash de términos' : 'Terms hash'}
              fullWidth
              value={termsHash}
              onChange={(e) => setTermsHash(e.target.value)}
              InputLabelProps={{ sx: { color: '#fff' } }}
              InputProps={{ sx: { color: '#fff' } }}
              FormHelperTextProps={{ sx: { color: 'rgba(255,255,255,0.6)' } }}
              helperText={isES ? 'Hash de los términos legales' : 'Legal terms hash'}
            />
            
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
