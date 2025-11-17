"use client";
import React from 'react'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import useTheme from '@mui/material/styles/useTheme'

// Scopes wizard-only style adjustments without affecting the global app
// Do NOT introduce new colors; rely on palette and action tokens
export default function WizardThemeProvider({ children }: { children: React.ReactNode }) {
  const base = useTheme()
  const wizardTheme = React.useMemo(()=> createTheme(base, {
    typography: {
      button: { textTransform: base.typography.button?.textTransform || 'none', fontWeight: 600 },
    },
    components: {
      MuiPaper: {
        styleOverrides: {
          outlined: {
            borderRadius: base.shape.borderRadius,
            boxShadow: base.shadows[1],
            // Keep default background to match cards
            // No gradients or custom colors
          },
        },
      },
      MuiAutocomplete: {
        styleOverrides: {
          paper: {
            borderRadius: base.shape.borderRadius,
            boxShadow: base.shadows[6],
            backgroundColor: base.palette.background.paper,
          },
          option: {
            // Unified row height and hover/selected using action tokens
            minHeight: 40,
            '&[aria-selected="true"]': { backgroundColor: base.palette.action.selected },
            '&.Mui-focused': { backgroundColor: base.palette.action.hover },
          },
          tag: {
            // chips inside input
            margin: 4,
          }
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            borderRadius: (base.shape.borderRadius as number) / 1.3,
            // Ensure delete icon color matches label
            '& .MuiChip-deleteIcon': { color: 'inherit' },
          },
        },
      },
      MuiTextField: {
        styleOverrides: {
          root: {
            '& .MuiOutlinedInput-root': {
              borderRadius: base.shape.borderRadius,
            },
          },
        },
      },
    }
  }), [base])

  return (
    <ThemeProvider theme={wizardTheme}>{children}</ThemeProvider>
  )
}
