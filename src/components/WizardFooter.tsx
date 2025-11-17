"use client";
import React from 'react'
import { Box, Paper, Container, Stack, Typography, Button, CircularProgress } from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined'

export type WizardFooterProps = {
  currentStep: number
  totalSteps: number
  stepTitle: string
  onBack: () => void
  onNext: () => void
  onSaveDraft: () => void
  isNextDisabled?: boolean
  isSaving?: boolean
  isLastStep?: boolean
  leftStatusExtra?: React.ReactNode
  backLabel?: string
  saveDraftLabel?: string
  savingLabel?: string
  nextLabel?: string
  publishLabel?: string
  hideSaveDraft?: boolean
  hideNext?: boolean
  hideBack?: boolean
}

export default function WizardFooter(props: WizardFooterProps) {
  const {
    currentStep,
    totalSteps,
    stepTitle,
    onBack,
    onNext,
    onSaveDraft,
    isNextDisabled,
    isSaving,
    isLastStep,
    leftStatusExtra,
    backLabel = 'Back',
    saveDraftLabel = 'Save draft',
    savingLabel = 'Saving...',
    nextLabel = 'Next',
    publishLabel = 'Publish',
    hideSaveDraft,
    hideNext,
    hideBack
  } = props

  return (
    <Box sx={{ position:'fixed', bottom: 0, left: 0, right: 0, zIndex: (t)=>t.zIndex.appBar + 2 }}>
      <Paper elevation={0} square sx={{
        borderTop: '1px solid',
        borderColor: 'oklch(0.20 0 0)',
        bgcolor: 'rgba(5,7,12,0.70)',
        backgroundImage: 'none',
        boxShadow: 'none',
        backdropFilter: 'blur(8px)'
      }}>
        <Container maxWidth="lg" sx={{ py: { xs: 1, md: 1.25 } }}>
          <Stack direction={{ xs:'column', md:'row' }} spacing={{ xs: 1, md: 2 }} alignItems={{ xs:'stretch', md:'center' }} justifyContent="space-between">
            <Stack direction="row" spacing={1} alignItems="center" sx={{ color: 'oklch(0.92 0 0)' }}>
              <Typography variant="body2" sx={{ fontSize: { xs: 13, md: 14 }, fontWeight: 600, color: 'oklch(0.92 0 0)' }}>
                {`Step ${currentStep} of ${totalSteps}`} · {stepTitle}
              </Typography>
              {leftStatusExtra}
            </Stack>
            <Stack direction={{ xs:'column', md:'row' }} spacing={{ xs: 1, md: 1.25 }} alignItems={{ xs:'stretch', md:'center' }} justifyContent="flex-end">
              {!hideBack && (
                <Button
                  onClick={onBack}
                  variant="text"
                  color="inherit"
                  startIcon={<ArrowBackIcon />}
                  sx={{
                    textTransform:'none',
                    fontSize: 15,
                    fontWeight: 600,
                    color: 'oklch(0.92 0 0)',
                    '&:hover': { color: 'oklch(0.98 0 0)' }
                  }}
                >
                  {backLabel}
                </Button>
              )}
              {!hideSaveDraft && (
                <Button
                  onClick={onSaveDraft}
                  variant="outlined"
                  color="inherit"
                  startIcon={isSaving ? <CircularProgress size={16} /> : <SaveOutlinedIcon />}
                  disabled={!!isSaving}
                  sx={{
                    textTransform:'none',
                    fontSize: 15,
                    fontWeight: 600,
                    color: 'oklch(0.92 0 0)',
                    borderColor: 'oklch(0.22 0 0)',
                    '&:hover': { borderColor: 'oklch(0.28 0 0)', color: 'oklch(0.98 0 0)' }
                  }}
                >
                  {isSaving ? savingLabel : saveDraftLabel}
                </Button>
              )}
              {!hideNext && (
                <Button
                  onClick={onNext}
                  variant="contained"
                  endIcon={<ArrowForwardIcon />}
                  disabled={!!isNextDisabled}
                  sx={{
                    textTransform:'none',
                    fontSize: 15,
                    fontWeight: 700,
                    color: '#fff',
                    borderRadius: '10px',
                    px: 2,
                    backgroundImage: 'linear-gradient(90deg, #7c5cff, #2ea0ff)',
                    boxShadow: '0 6px 20px rgba(46,160,255,0.25)',
                    '&:hover': { filter: 'brightness(1.05)', backgroundImage: 'linear-gradient(90deg, #7c5cff, #2ea0ff)' },
                    '&.Mui-disabled': { opacity: 0.5, backgroundImage: 'linear-gradient(90deg, #7c5cff, #2ea0ff)' }
                  }}
                >
                  {isLastStep ? publishLabel : nextLabel}
                </Button>
              )}
            </Stack>
          </Stack>
        </Container>
      </Paper>
    </Box>
  )
}
