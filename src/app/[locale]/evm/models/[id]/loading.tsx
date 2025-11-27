import { Box, Paper, Grid, Skeleton, Stack } from '@mui/material'

export default function ModelDetailLoading() {
  return (
    <Box sx={{ minHeight: '100vh', background: 'linear-gradient(180deg, #0f2740 0%, #0b1626 30%, #0a111c 100%)' }}>
      <Box sx={{ p: 3, maxWidth: 1000, mx: 'auto' }}>
        {/* Back button skeleton */}
        <Skeleton 
          variant="rectangular" 
          width={140} 
          height={40} 
          sx={{ 
            mb: 3, 
            bgcolor: 'rgba(255,255,255,0.08)',
            borderRadius: '10px',
            animation: 'pulse 1.5s ease-in-out infinite'
          }} 
        />
        
        {/* Main content skeleton */}
        <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 }, mb: 2, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.02)' }}>
          <Grid container spacing={3}>
            {/* Left column */}
            <Grid item xs={12} md={8}>
              <Stack spacing={2.5}>
                {/* Title */}
                <Skeleton 
                  variant="text" 
                  width="85%" 
                  height={56} 
                  sx={{ 
                    bgcolor: 'rgba(155,140,255,0.15)',
                    borderRadius: '8px' 
                  }} 
                />
                {/* Tagline */}
                <Skeleton 
                  variant="text" 
                  width="65%" 
                  height={32} 
                  sx={{ 
                    bgcolor: 'rgba(79,225,255,0.1)',
                    borderRadius: '6px' 
                  }} 
                />
                {/* Summary */}
                <Box>
                  <Skeleton variant="text" width="100%" sx={{ bgcolor: 'rgba(255,255,255,0.08)' }} />
                  <Skeleton variant="text" width="100%" sx={{ bgcolor: 'rgba(255,255,255,0.08)' }} />
                  <Skeleton variant="text" width="70%" sx={{ bgcolor: 'rgba(255,255,255,0.08)' }} />
                </Box>
                {/* Chips */}
                <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
                  <Skeleton variant="rounded" width={120} height={32} sx={{ bgcolor: 'rgba(124,92,255,0.2)', borderRadius: '16px' }} />
                  <Skeleton variant="rounded" width={100} height={32} sx={{ bgcolor: 'rgba(46,160,255,0.2)', borderRadius: '16px' }} />
                  <Skeleton variant="rounded" width={90} height={32} sx={{ bgcolor: 'rgba(79,225,255,0.15)', borderRadius: '16px' }} />
                  <Skeleton variant="rounded" width={80} height={32} sx={{ bgcolor: 'rgba(255,255,255,0.08)', borderRadius: '16px' }} />
                </Stack>
                {/* Business profile */}
                <Box>
                  <Skeleton variant="text" width={150} height={20} sx={{ mb: 1.5, bgcolor: 'rgba(255,255,255,0.08)' }} />
                  <Grid container spacing={1.5}>
                    <Grid item xs={12} sm={6}>
                      <Skeleton variant="rounded" width="100%" height={70} sx={{ bgcolor: 'rgba(124,92,255,0.08)' }} />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Skeleton variant="rounded" width="100%" height={70} sx={{ bgcolor: 'rgba(46,160,255,0.08)' }} />
                    </Grid>
                  </Grid>
                </Box>
                {/* Technical classification */}
                <Box>
                  <Skeleton variant="text" width={180} height={20} sx={{ mb: 1.5, bgcolor: 'rgba(255,255,255,0.08)' }} />
                  <Stack direction="row" spacing={1}>
                    <Skeleton variant="rounded" width={180} height={28} sx={{ bgcolor: 'rgba(255,255,255,0.06)' }} />
                    <Skeleton variant="rounded" width={150} height={28} sx={{ bgcolor: 'rgba(255,255,255,0.06)' }} />
                    <Skeleton variant="rounded" width={80} height={28} sx={{ bgcolor: 'rgba(255,255,255,0.06)' }} />
                  </Stack>
                </Box>
                {/* Pricing */}
                <Box>
                  <Skeleton variant="text" width={150} height={20} sx={{ mb: 1.5, bgcolor: 'rgba(255,255,255,0.08)' }} />
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <Skeleton variant="rounded" width="100%" height={120} sx={{ bgcolor: 'rgba(46,160,255,0.08)' }} />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Skeleton variant="rounded" width="100%" height={120} sx={{ bgcolor: 'rgba(255,255,255,0.08)' }} />
                    </Grid>
                  </Grid>
                </Box>
                {/* Action buttons */}
                <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
                  <Skeleton 
                    variant="rounded" 
                    width={160} 
                    height={48} 
                    sx={{ 
                      bgcolor: 'rgba(124,92,255,0.3)',
                      borderRadius: '12px',
                      boxShadow: '0 4px 12px rgba(124,92,255,0.2)' 
                    }} 
                  />
                  <Skeleton 
                    variant="rounded" 
                    width={160} 
                    height={48} 
                    sx={{ 
                      bgcolor: 'rgba(79,225,255,0.15)',
                      borderRadius: '12px',
                      border: '2px solid rgba(79,225,255,0.3)' 
                    }} 
                  />
                </Stack>
              </Stack>
            </Grid>
            
            {/* Right column - Cover */}
            <Grid item xs={12} md={4}>
              <Skeleton variant="rounded" width="100%" height={200} sx={{ bgcolor: 'rgba(255,255,255,0.08)' }} />
            </Grid>
          </Grid>
        </Paper>
        
        {/* Customer sheet skeleton */}
        <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 }, mb: 2, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.02)' }}>
          <Skeleton variant="text" width={150} height={24} sx={{ mb: 2, bgcolor: 'rgba(255,255,255,0.1)' }} />
          <Grid container spacing={3}>
            <Grid item xs={12} md={7}>
              <Stack spacing={2}>
                <Skeleton variant="rounded" width="100%" height={100} sx={{ bgcolor: 'rgba(255,255,255,0.04)' }} />
                <Skeleton variant="rounded" width="100%" height={80} sx={{ bgcolor: 'rgba(255,255,255,0.04)' }} />
              </Stack>
            </Grid>
            <Grid item xs={12} md={5}>
              <Skeleton variant="rounded" width="100%" height={150} sx={{ bgcolor: 'rgba(255,255,255,0.04)' }} />
            </Grid>
          </Grid>
        </Paper>
      </Box>
    </Box>
  )
}
