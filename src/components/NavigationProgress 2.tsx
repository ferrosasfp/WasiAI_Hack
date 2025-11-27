"use client";

import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import NProgress from 'nprogress';

// Configure NProgress
if (typeof window !== 'undefined') {
  NProgress.configure({
    showSpinner: false,
    trickleSpeed: 100,
    minimum: 0.1,
    easing: 'ease',
    speed: 300,
  });
}

/**
 * NavigationProgress
 * 
 * Shows a loading bar at the top when navigating between pages.
 * Provides instant visual feedback that something is happening.
 */
export function NavigationProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Start progress when component mounts (page loading)
    NProgress.start();
    
    // Complete progress when route changes
    const timer = setTimeout(() => {
      NProgress.done();
    }, 100);

    return () => {
      clearTimeout(timer);
      NProgress.done();
    };
  }, [pathname, searchParams]);

  return null;
}
