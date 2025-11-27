'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useRef } from 'react'

/**
 * Smart prefetch hook with debouncing to avoid excessive prefetching
 */
export function usePrefetch(href: string, options?: { delay?: number; enabled?: boolean }) {
  const router = useRouter()
  const timeoutRef = useRef<NodeJS.Timeout>()
  const prefetchedRef = useRef(false)
  const delay = options?.delay ?? 300 // default 300ms delay
  const enabled = options?.enabled !== false

  const prefetch = () => {
    if (!enabled || prefetchedRef.current) return
    
    timeoutRef.current = setTimeout(() => {
      router.prefetch(href)
      prefetchedRef.current = true
    }, delay)
  }

  const cancel = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
  }

  useEffect(() => {
    return () => cancel()
  }, [])

  return { prefetch, cancel }
}

/**
 * Prefetch on mount for critical routes
 */
export function useInstantPrefetch(hrefs: string[]) {
  const router = useRouter()
  const prefetchedRef = useRef(false)

  useEffect(() => {
    if (prefetchedRef.current) return
    
    // Prefetch after a small delay to not block initial render
    const timer = setTimeout(() => {
      hrefs.forEach(href => router.prefetch(href))
      prefetchedRef.current = true
    }, 100)

    return () => clearTimeout(timer)
  }, [hrefs, router])
}

// Note: withPrefetch HOC removed - use usePrefetch hook directly in components for better type safety
