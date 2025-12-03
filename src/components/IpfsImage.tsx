"use client";

import { useState, useEffect } from 'react'
import { Box, Skeleton } from '@mui/material'
import Image from 'next/image'

interface IpfsImageProps {
  cid?: string
  alt?: string
  width?: number
  height?: number
  aspectRatio?: number
  priority?: boolean
  style?: React.CSSProperties
  className?: string
  objectFit?: 'contain' | 'cover' | 'fill' | 'none' | 'scale-down'
  fallbackSrc?: string
}

/**
 * IpfsImage - Optimized image component for IPFS content
 * 
 * Features:
 * - Multiple IPFS gateways with automatic fallback
 * - Lazy loading with skeleton placeholder
 * - Blur placeholder for better UX
 * - Automatic error recovery
 * - next/image optimization (WebP, AVIF, responsive sizes)
 * 
 * Usage:
 * 1. With aspectRatio: Creates responsive container with padding-top technique
 *    <IpfsImage cid="QmXxx" aspectRatio={16/9} />
 * 
 * 2. With width AND height: Uses fixed dimensions
 *    <IpfsImage cid="QmXxx" width={400} height={300} />
 * 
 * 3. With only width OR height: Uses fill mode (parent must have dimensions!)
 *    <Box sx={{ position: 'relative', height: 200 }}>
 *      <IpfsImage cid="QmXxx" height={200} />
 *    </Box>
 */
export function IpfsImage({
  cid,
  alt = 'Image',
  width,
  height,
  aspectRatio,
  priority = false,
  style,
  className,
  objectFit = 'cover',
  fallbackSrc
}: IpfsImageProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(false)
  const [currentGateway, setCurrentGateway] = useState(0)
  
  // Use local API proxy for IPFS - avoids CORS and rate limiting issues
  // The /api/ipfs/[...path] route handles gateway fallbacks server-side

  // Convert IPFS URI or CID to HTTP URL via our proxy
  const getImageUrl = (cidOrUri?: string): string | null => {
    if (!cidOrUri) return fallbackSrc || null
    
    // Handle ipfs:// URIs - use our local proxy
    if (cidOrUri.startsWith('ipfs://')) {
      const extractedCid = cidOrUri.replace('ipfs://', '')
      return `/api/ipfs/${extractedCid}`
    }
    
    // Handle raw CIDs - use our local proxy
    if (cidOrUri.startsWith('Qm') || cidOrUri.startsWith('baf')) {
      return `/api/ipfs/${cidOrUri}`
    }
    
    // Handle /api/ipfs/ URLs (already proxied)
    if (cidOrUri.startsWith('/api/ipfs/')) {
      return cidOrUri
    }
    
    // Handle full URLs
    if (cidOrUri.startsWith('http')) {
      return cidOrUri
    }
    
    return fallbackSrc || null
  }

  const imageUrl = getImageUrl(cid)

  const handleLoad = () => {
    setIsLoading(false)
    setError(false)
  }

  const handleError = () => {
    // Gateway fallbacks are handled server-side by /api/ipfs/
    console.error('[IpfsImage] Failed to load image for CID:', cid)
    setIsLoading(false)
    setError(true)
  }

  // Reset gateway on CID change
  useEffect(() => {
    setCurrentGateway(0)
    setIsLoading(true)
    setError(false)
  }, [cid])

  // No CID provided and no fallback
  if (!imageUrl) {
    return (
      <Box
        sx={{
          width: '100%',
          height: aspectRatio ? 0 : height || '100%',
          paddingTop: aspectRatio ? `${(1 / aspectRatio) * 100}%` : 0,
          position: 'relative',
          bgcolor: 'rgba(255,255,255,0.05)',
          borderRadius: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Box sx={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.875rem', textAlign: 'center' }}>
          No image
        </Box>
      </Box>
    )
  }

  // Determine if we should use fill mode
  // Use fill when: aspectRatio is set OR when width/height are not both provided
  const useFillMode = Boolean(aspectRatio) || !width || !height

  return (
    <Box
      className={className}
      sx={{
        position: 'relative',
        width: '100%',
        height: useFillMode ? (aspectRatio ? 0 : height || '100%') : height,
        paddingTop: aspectRatio ? `${(1 / aspectRatio) * 100}%` : 0,
        overflow: 'hidden',
        borderRadius: 2,
      }}
    >
      {/* Skeleton loader */}
      {isLoading && (
        <Skeleton
          variant="rectangular"
          animation="wave"
          sx={{
            position: useFillMode ? 'absolute' : 'relative',
            top: 0,
            left: 0,
            width: '100%',
            height: useFillMode ? '100%' : height || '100%',
            bgcolor: 'rgba(255,255,255,0.08)',
            borderRadius: 2,
          }}
        />
      )}
      
      {/* Image */}
      {!error && imageUrl && (
        <Image
          src={imageUrl}
          alt={alt}
          fill={useFillMode}
          width={!useFillMode ? width : undefined}
          height={!useFillMode ? height : undefined}
          priority={priority}
          loading={priority ? undefined : 'lazy'}
          placeholder="blur"
          blurDataURL="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNzAwIiBoZWlnaHQ9IjQ3NSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB2ZXJzaW9uPSIxLjEiLz4="
          onLoad={handleLoad}
          onError={handleError}
          style={{
            objectFit,
            ...style,
            opacity: isLoading ? 0 : 1,
            transition: 'opacity 0.3s ease-in-out',
          }}
          sizes={priority ? "100vw" : "(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"}
          quality={85}
          unoptimized={imageUrl?.startsWith('/api/ipfs/') || false}
        />
      )}
      
      {/* Error fallback - Standard marketplace placeholder */}
      {error && (
        <Box
          sx={{
            position: aspectRatio ? 'absolute' : 'relative',
            top: 0,
            left: 0,
            width: '100%',
            height: aspectRatio ? '100%' : height || '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, rgba(124,92,255,0.15) 0%, rgba(46,160,255,0.15) 100%)',
            color: 'rgba(255,255,255,0.6)',
            gap: 1,
            borderRadius: 2,
            border: '1px solid rgba(124,92,255,0.2)',
          }}
        >
          {/* Marketplace logo/icon as fallback */}
          <Box 
            component="span" 
            sx={{ 
              fontSize: '2.5rem',
              opacity: 0.7,
              filter: 'grayscale(0.3)'
            }}
          >
            🤖
          </Box>
          <Box sx={{ fontSize: '0.7rem', textAlign: 'center', px: 2, opacity: 0.6 }}>
            AI Model
          </Box>
        </Box>
      )}
    </Box>
  )
}
