import Image, { ImageProps } from 'next/image'
import { useState } from 'react'
import { Box, Skeleton } from '@mui/material'

interface OptimizedImageProps extends Omit<ImageProps, 'onLoad'> {
  aspectRatio?: number
  priority?: boolean
  showSkeleton?: boolean
}

export function OptimizedImage({
  aspectRatio,
  priority = false,
  showSkeleton = true,
  ...props
}: OptimizedImageProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(false)

  const handleLoad = () => {
    setIsLoading(false)
  }

  const handleError = () => {
    setIsLoading(false)
    setError(true)
  }

  return (
    <Box
      sx={{
        position: 'relative',
        width: '100%',
        paddingTop: aspectRatio ? `${(1 / aspectRatio) * 100}%` : 0,
        overflow: 'hidden',
      }}
    >
      {showSkeleton && isLoading && (
        <Skeleton
          variant="rectangular"
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            bgcolor: 'rgba(255,255,255,0.08)',
          }}
        />
      )}
      
      {!error ? (
        <Image
          {...props}
          fill={aspectRatio ? true : props.fill}
          priority={priority}
          loading={priority ? undefined : 'lazy'}
          onLoad={handleLoad}
          onError={handleError}
          style={{
            objectFit: props.style?.objectFit || 'cover',
            ...props.style,
          }}
        />
      ) : (
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: 'rgba(255,255,255,0.05)',
            color: 'rgba(255,255,255,0.5)',
          }}
        >
          Image failed to load
        </Box>
      )}
    </Box>
  )
}
