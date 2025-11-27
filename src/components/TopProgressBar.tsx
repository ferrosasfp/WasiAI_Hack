'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { LinearProgress, Box } from '@mui/material'

export function TopProgressBar() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const startedRef = useRef(false)
  const startTimerRef = useRef<NodeJS.Timeout | null>(null)
  const tickTimerRef = useRef<NodeJS.Timeout | null>(null)
  const hideTimerRef = useRef<NodeJS.Timeout | null>(null)
  const displayStartRef = useRef<number | null>(null)
  const prevKeyRef = useRef<string | null>(null)

  const navKey = useMemo(() => {
    const query = searchParams ? searchParams.toString() : ''
    return `${pathname || ''}?${query}`
  }, [pathname, searchParams])

  useEffect(() => {
    if (!navKey || prevKeyRef.current === navKey) {
      return
    }
    prevKeyRef.current = navKey

    const clearTimers = () => {
      if (startTimerRef.current) { clearTimeout(startTimerRef.current); startTimerRef.current = null }
      if (tickTimerRef.current) { clearInterval(tickTimerRef.current); tickTimerRef.current = null }
      if (hideTimerRef.current) { clearTimeout(hideTimerRef.current); hideTimerRef.current = null }
    }
    clearTimers()
    startedRef.current = false

    // Start progress bar immediately (0ms threshold for instant feedback)
    startTimerRef.current = setTimeout(() => {
      startedRef.current = true
      displayStartRef.current = performance.now()
      setLoading(true)
      setProgress(10) // Start at 10% for immediate visual feedback

      // Simulate progress up to 90%
      let current = 10
      tickTimerRef.current = setInterval(() => {
        current = Math.min(current + Math.random() * 20, 90)
        setProgress(current)
        if (current >= 90 && tickTimerRef.current) {
          clearInterval(tickTimerRef.current)
          tickTimerRef.current = null
        }
      }, 150) // Faster ticks (150ms vs 200ms)
    }, 0) // Instant start (0ms vs 150ms)

    // Complete and cleanup on route change
    return () => {
      const completed = startedRef.current
      clearTimers()

      if (completed || loading) {
        setProgress(100)
        const elapsed = displayStartRef.current ? (performance.now() - displayStartRef.current) : 0
        const MIN_VISIBLE = 300
        const delay = Math.max(120, MIN_VISIBLE - elapsed)
        hideTimerRef.current = setTimeout(() => {
          setLoading(false)
          startedRef.current = false
          setProgress(0)
          displayStartRef.current = null
        }, delay)
      }
    }
  }, [navKey, loading])

  if (!loading) return null

  return (
    <Box sx={{ 
      position: 'fixed', 
      top: 0, 
      left: 0, 
      right: 0, 
      zIndex: 9999,
      height: 3
    }}>
      <LinearProgress 
        variant="determinate" 
        value={progress}
        sx={{
          height: 3,
          backgroundColor: 'rgba(255,255,255,0.1)',
          '& .MuiLinearProgress-bar': {
            backgroundColor: '#4fe1ff',
            transition: 'transform 0.2s ease-out'
          }
        }}
      />
    </Box>
  )
}
