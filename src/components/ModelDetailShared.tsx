"use client";
import React from 'react'
import { Box, Stack, Typography, Chip, ListItem } from '@mui/material'

/**
 * Shared components extracted from Step 5 for reuse in model detail page
 */

// Reusable Row component (from Step 5)
export function Row({ label, value }: { label: string | React.ReactNode; value?: string | number | React.ReactNode }) {
  return (
    <ListItem sx={{ px:0, py:0.5, alignItems:'flex-start' }}>
      <Box sx={{ display:'grid', gridTemplateColumns: { xs:'auto 1fr', md:'180px 1fr' }, alignItems:'start', columnGap: 1, width:'100%' }}>
        <Typography variant="body2" sx={{ fontWeight:600, color:'#ffffffb3' }}>{label}:</Typography>
        <Box>
          {typeof value === 'string' || typeof value === 'number' ? (
            <Typography variant="body2" sx={{ color:'#ffffffcc' }}>{value || '–'}</Typography>
          ) : (
            value || <Typography variant="body2" sx={{ fontStyle:'italic', fontSize:'0.85rem', color:'#ffffff99' }}>–</Typography>
          )}
        </Box>
      </Box>
    </ListItem>
  )
}

// Reusable ChipsShort component (from Step 5)
export function ChipsShort({ items, max = 6 }: { items?: string[]; max?: number }) {
  if (!items || items.length === 0) return <Typography variant="body2" sx={{ fontSize:'0.85rem', color:'#ffffff99' }}>–</Typography>
  const shown = items.slice(0, max)
  const remaining = items.length - shown.length
  return (
    <Box sx={{ display:'flex', flexWrap:'wrap', gap:0.5, alignItems:'center' }}>
      {shown.map((item, i) => (
        <Chip 
          key={i} 
          label={item} 
          size="small" 
          variant="outlined" 
          sx={{ 
            borderColor:'rgba(255,255,255,0.3)', 
            color:'#fff', 
            fontSize:'0.75rem',
            height:22,
            '& .MuiChip-label': { px:0.75 }
          }} 
        />
      ))}
      {remaining > 0 && (
        <Typography variant="caption" sx={{ ml:0.5, color:'#ffffffb3' }}>
          +{remaining} more
        </Typography>
      )}
    </Box>
  )
}

// Helper to display value or dash (from Step 5)
export const displayValue = (val: any, isNumber = false): string | React.ReactNode => {
  if (val === null || val === undefined || val === '') return '–'
  if (isNumber && (Number(val) === 0 || isNaN(Number(val)))) return '–'
  return val
}

// Price formatting helper
export const formatPriceDisplay = (raw: string): string => {
  try {
    if (!raw) return raw
    const m = raw.match(/^\s*([0-9]+(?:\.[0-9]+)?)\s*(.*)$/)
    if (!m) return raw
    const numPart = m[1]
    const rest = m[2] || ''
    const num = parseFloat(numPart)
    if (!isFinite(num)) return raw
    const hasDecimals = numPart.includes('.')
    const rounded = hasDecimals ? Math.ceil(num * 100) / 100 : num
    const formatted = hasDecimals ? rounded.toFixed(2) : String(rounded)
    return `${formatted}${rest ? ` ${rest}` : ''}`
  } catch { return raw }
}
