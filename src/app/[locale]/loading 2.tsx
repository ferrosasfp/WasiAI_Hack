import { Box, Container, Grid, Stack, Skeleton } from '@mui/material'

export default function HomeLoading() {
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#050710' }}>
      {/* Hero section */}
      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Stack spacing={4} alignItems="center" textAlign="center">
          <Skeleton 
            variant="text" 
            width={600} 
            height={80} 
            sx={{ bgcolor: 'rgba(155,140,255,0.2)' }} 
          />
          <Skeleton 
            variant="text" 
            width={480} 
            height={32} 
            sx={{ bgcolor: 'rgba(255,255,255,0.08)' }} 
          />
          <Stack direction="row" spacing={2}>
            <Skeleton 
              variant="rounded" 
              width={160} 
              height={48} 
              sx={{ bgcolor: 'rgba(124,92,255,0.3)', borderRadius: '12px' }} 
            />
            <Skeleton 
              variant="rounded" 
              width={160} 
              height={48} 
              sx={{ bgcolor: 'rgba(255,255,255,0.08)', borderRadius: '12px' }} 
            />
          </Stack>
        </Stack>
      </Container>

      {/* Featured models section */}
      <Container maxWidth="lg" sx={{ py: 6 }}>
        <Skeleton 
          variant="text" 
          width={200} 
          height={40} 
          sx={{ mb: 3, bgcolor: 'rgba(255,255,255,0.1)' }} 
        />
        <Grid container spacing={3}>
          {[...Array(3)].map((_, i) => (
            <Grid item xs={12} sm={6} md={4} key={i}>
              <Box sx={{ 
                border: '1px solid rgba(255,255,255,0.1)', 
                borderRadius: 2, 
                p: 2,
                bgcolor: 'rgba(10,17,28,0.4)'
              }}>
                <Skeleton 
                  variant="rounded" 
                  width="100%" 
                  height={180} 
                  sx={{ mb: 2, bgcolor: 'rgba(255,255,255,0.08)' }} 
                />
                <Skeleton variant="text" width="80%" height={28} sx={{ mb: 1, bgcolor: 'rgba(255,255,255,0.1)' }} />
                <Skeleton variant="text" width="100%" sx={{ bgcolor: 'rgba(255,255,255,0.08)' }} />
                <Skeleton variant="text" width="90%" sx={{ bgcolor: 'rgba(255,255,255,0.08)' }} />
                <Box sx={{ mt: 2 }}>
                  <Skeleton variant="text" width={120} height={32} sx={{ bgcolor: 'rgba(79,225,255,0.2)' }} />
                </Box>
              </Box>
            </Grid>
          ))}
        </Grid>
      </Container>
    </Box>
  )
}
