import { Box, Container, Grid, Skeleton, Stack } from '@mui/material'

export default function ModelsLoading() {
  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Stack spacing={3}>
        {/* Header */}
        <Box>
          <Skeleton variant="text" width={200} height={48} sx={{ bgcolor: 'rgba(255,255,255,0.1)' }} />
          <Skeleton variant="text" width={300} height={24} sx={{ bgcolor: 'rgba(255,255,255,0.08)' }} />
        </Box>

        {/* Filters */}
        <Stack direction="row" spacing={2}>
          <Skeleton variant="rounded" width={150} height={40} sx={{ bgcolor: 'rgba(255,255,255,0.08)' }} />
          <Skeleton variant="rounded" width={120} height={40} sx={{ bgcolor: 'rgba(255,255,255,0.08)' }} />
          <Skeleton variant="rounded" width={120} height={40} sx={{ bgcolor: 'rgba(255,255,255,0.08)' }} />
        </Stack>

        {/* Model cards grid */}
        <Grid container spacing={3}>
          {[...Array(6)].map((_, i) => (
            <Grid item xs={12} sm={6} md={4} key={i}>
              <Box sx={{ 
                border: '1px solid rgba(255,255,255,0.1)', 
                borderRadius: 2, 
                p: 2,
                bgcolor: 'rgba(255,255,255,0.02)'
              }}>
                {/* Image */}
                <Skeleton 
                  variant="rounded" 
                  width="100%" 
                  height={180} 
                  sx={{ mb: 2, bgcolor: 'rgba(255,255,255,0.08)' }} 
                />
                {/* Title */}
                <Skeleton variant="text" width="80%" height={28} sx={{ mb: 1, bgcolor: 'rgba(255,255,255,0.1)' }} />
                {/* Description */}
                <Skeleton variant="text" width="100%" sx={{ bgcolor: 'rgba(255,255,255,0.08)' }} />
                <Skeleton variant="text" width="90%" sx={{ bgcolor: 'rgba(255,255,255,0.08)' }} />
                {/* Tags */}
                <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
                  <Skeleton variant="rounded" width={80} height={24} sx={{ bgcolor: 'rgba(124,92,255,0.15)' }} />
                  <Skeleton variant="rounded" width={100} height={24} sx={{ bgcolor: 'rgba(46,160,255,0.15)' }} />
                </Stack>
                {/* Price */}
                <Box sx={{ mt: 2 }}>
                  <Skeleton variant="text" width={120} height={32} sx={{ bgcolor: 'rgba(255,255,255,0.1)' }} />
                </Box>
              </Box>
            </Grid>
          ))}
        </Grid>
      </Stack>
    </Container>
  )
}
