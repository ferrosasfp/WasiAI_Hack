'use client'

import { useEffect } from 'react'
import { useReportWebVitals } from 'next/web-vitals'

export function WebVitals() {
  useReportWebVitals((metric) => {
    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log('[Web Vitals]', {
        name: metric.name,
        value: Math.round(metric.value),
        rating: metric.rating,
        delta: Math.round(metric.delta),
      })
    }

    // Send to analytics in production
    if (typeof window !== 'undefined' && process.env.NODE_ENV === 'production') {
      const body = JSON.stringify({
        name: metric.name,
        value: metric.value,
        rating: metric.rating,
        delta: metric.delta,
        id: metric.id,
        navigationType: metric.navigationType,
      })

      // Send to your analytics endpoint
      if (navigator.sendBeacon) {
        navigator.sendBeacon('/api/web-vitals', body)
      } else {
        fetch('/api/web-vitals', {
          method: 'POST',
          body,
          headers: { 'Content-Type': 'application/json' },
          keepalive: true,
        }).catch(console.error)
      }
    }

    // Check thresholds and warn
    const thresholds = {
      CLS: { good: 0.1, needsImprovement: 0.25 },
      FID: { good: 100, needsImprovement: 300 },
      FCP: { good: 1800, needsImprovement: 3000 },
      LCP: { good: 1800, needsImprovement: 4000 },
      TTFB: { good: 200, needsImprovement: 500 },
      INP: { good: 200, needsImprovement: 500 },
    }

    const threshold = thresholds[metric.name as keyof typeof thresholds]
    if (threshold) {
      if (metric.value > threshold.needsImprovement) {
        console.warn(
          `⚠️ ${metric.name} needs improvement:`,
          Math.round(metric.value),
          `(target: ${threshold.good})`
        )
      }
    }
  })

  // Track custom navigation timing
  useEffect(() => {
    let navigationStart = performance.now()

    const handleStart = () => {
      navigationStart = performance.now()
    }

    const handleComplete = () => {
      const navTime = performance.now() - navigationStart
      
      if (process.env.NODE_ENV === 'development') {
        console.log('[Navigation Time]', Math.round(navTime), 'ms')
      }

      // Warn if over threshold
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      )
      const threshold = isMobile ? 300 : 200

      if (navTime > threshold) {
        console.warn(`⚠️ Slow navigation: ${Math.round(navTime)}ms (target: ${threshold}ms)`)
      }
    }

    // Listen for route changes (Next.js App Router)
    window.addEventListener('popstate', handleStart)
    
    // Listen for navigation completion
    if (typeof document !== 'undefined') {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'navigation') {
            handleComplete()
          }
        }
      })
      
      try {
        observer.observe({ entryTypes: ['navigation'] })
      } catch (e) {
        // Fallback for browsers without PerformanceObserver
      }

      return () => {
        observer.disconnect()
        window.removeEventListener('popstate', handleStart)
      }
    }
  }, [])

  return null
}
