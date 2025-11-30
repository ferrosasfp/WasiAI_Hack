'use client'

import React from 'react'
import { Box, Chip, Tooltip, Typography, Stack } from '@mui/material'
import VerifiedIcon from '@mui/icons-material/Verified'
import SmartToyIcon from '@mui/icons-material/SmartToy'

interface ERC8004BadgeProps {
  agentId: number
  variant?: 'chip' | 'full' | 'compact'
  locale?: string
  showTooltip?: boolean
}

export default function ERC8004Badge({
  agentId,
  variant = 'chip',
  locale = 'en',
  showTooltip = true
}: ERC8004BadgeProps) {
  const isES = locale === 'es'
  
  const L = {
    badge: isES ? 'Agente ERC-8004' : 'ERC-8004 Agent',
    verified: isES ? 'Identidad verificada' : 'Verified Identity',
    tooltip: isES 
      ? 'Este agente tiene identidad verificada en blockchain siguiendo el estándar ERC-8004. Su historial y reputación son públicos y verificables.'
      : 'This agent has verified identity on blockchain following the ERC-8004 standard. Its history and reputation are public and verifiable.',
    learnMore: isES ? 'Más información' : 'Learn more'
  }
  
  if (variant === 'chip') {
    const chip = (
      <Chip
        icon={<VerifiedIcon sx={{ fontSize: 16 }} />}
        label={`${L.badge} #${agentId}`}
        size="small"
        sx={{
          bgcolor: 'rgba(79, 225, 255, 0.12)',
          color: '#4fe1ff',
          border: '1px solid rgba(79, 225, 255, 0.3)',
          fontWeight: 600,
          '& .MuiChip-icon': { color: '#4fe1ff' }
        }}
      />
    )
    
    if (showTooltip) {
      return (
        <Tooltip title={L.tooltip} arrow placement="top">
          {chip}
        </Tooltip>
      )
    }
    return chip
  }
  
  if (variant === 'compact') {
    const badge = (
      <Box sx={{ 
        display: 'inline-flex', 
        alignItems: 'center', 
        gap: 0.5,
        px: 1,
        py: 0.25,
        borderRadius: 1,
        bgcolor: 'rgba(79, 225, 255, 0.08)',
        border: '1px solid rgba(79, 225, 255, 0.2)'
      }}>
        <VerifiedIcon sx={{ fontSize: 14, color: '#4fe1ff' }} />
        <Typography variant="caption" sx={{ color: '#4fe1ff', fontWeight: 600 }}>
          #{agentId}
        </Typography>
      </Box>
    )
    
    if (showTooltip) {
      return (
        <Tooltip title={L.tooltip} arrow placement="top">
          {badge}
        </Tooltip>
      )
    }
    return badge
  }
  
  // Full variant
  return (
    <Box sx={{ 
      p: 2, 
      borderRadius: 2, 
      bgcolor: 'rgba(79, 225, 255, 0.06)',
      border: '1px solid rgba(79, 225, 255, 0.2)'
    }}>
      <Stack spacing={1.5}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{
            width: 36,
            height: 36,
            borderRadius: '50%',
            bgcolor: 'rgba(79, 225, 255, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <SmartToyIcon sx={{ color: '#4fe1ff', fontSize: 20 }} />
          </Box>
          <Box>
            <Typography variant="subtitle2" sx={{ color: '#fff', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 0.5 }}>
              {L.badge} #{agentId}
              <VerifiedIcon sx={{ fontSize: 16, color: '#4fe1ff' }} />
            </Typography>
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)' }}>
              {L.verified}
            </Typography>
          </Box>
        </Box>
        
        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.8rem' }}>
          {L.tooltip}
        </Typography>
        
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Chip 
            size="small" 
            label="x402" 
            sx={{ 
              bgcolor: 'rgba(124, 92, 255, 0.15)', 
              color: '#b8a3ff',
              fontSize: '0.7rem'
            }} 
          />
          <Chip 
            size="small" 
            label={isES ? 'Pago por uso' : 'Pay per use'} 
            sx={{ 
              bgcolor: 'rgba(46, 160, 255, 0.15)', 
              color: '#6eb8ff',
              fontSize: '0.7rem'
            }} 
          />
          <Chip 
            size="small" 
            label="Avalanche" 
            sx={{ 
              bgcolor: 'rgba(232, 65, 66, 0.15)', 
              color: '#ff6b6b',
              fontSize: '0.7rem'
            }} 
          />
        </Box>
      </Stack>
    </Box>
  )
}
