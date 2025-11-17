import { Box, Container, Stack, Skeleton, Grid } from '@mui/material'

export default function LicensesLoading() {
  return (
    <Box sx={{
      minHeight: '100vh',
      background: [
        'radial-gradient(900px 520px at 88% -140px, rgba(46,160,255,0.22), rgba(46,160,255,0) 60%)',
        'radial-gradient(700px 420px at -120px 240px, rgba(124,92,255,0.16), rgba(124,92,255,0) 55%)',
        'linear-gradient(180deg, #0b1422 0%, #0a111c 50%, #070b12 80%, #05080d 100%)'
      ].join(', '),
      color: 'oklch(0.985 0 0)'
    }}>
      <Container maxWidth="lg" sx={{ py: { xs: 6, md: 8 } }}>
        <Stack spacing={3}>
          <Skeleton variant="text" width={220} height={48} sx={{ bgcolor: 'rgba(255,255,255,0.12)' }} />
          <Box sx={{
            borderRadius: '16px',
            border: '1px solid',
            borderColor: 'oklch(0.22 0 0)',
            background: 'linear-gradient(180deg, rgba(22,26,36,0.6), rgba(12,15,24,0.6))',
            boxShadow: '0 0 0 1px rgba(255,255,255,0.02) inset, 0 8px 24px rgba(0,0,0,0.35)',
            backdropFilter: 'blur(8px)',
            p: { xs: 2, md: 3 }
          }}>
            <Stack spacing={2}>
              {[...Array(4)].map((_, idx) => (
                <Grid container spacing={2} key={idx} sx={{
                  border: '1px solid rgba(255,255,255,0.05)',
                  borderRadius: 2,
                  p: 2,
                  bgcolor: 'rgba(255,255,255,0.02)'
                }}>
                  <Grid item xs={12} md={3}>
                    <Skeleton variant="text" width="80%" sx={{ bgcolor: 'rgba(255,255,255,0.08)' }} />
                    <Skeleton variant="text" width="60%" sx={{ bgcolor: 'rgba(255,255,255,0.06)' }} />
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <Skeleton variant="rectangular" height={40} sx={{ bgcolor: 'rgba(124,92,255,0.15)', borderRadius: 1 }} />
                  </Grid>
                  <Grid item xs={12} md={2}>
                    <Skeleton variant="rectangular" height={40} sx={{ bgcolor: 'rgba(46,160,255,0.15)', borderRadius: 1 }} />
                  </Grid>
                  <Grid item xs={12} md={2}>
                    <Skeleton variant="rectangular" height={40} sx={{ bgcolor: 'rgba(255,255,255,0.08)', borderRadius: 1 }} />
                  </Grid>
                  <Grid item xs={12} md={2}>
                    <Skeleton variant="rectangular" height={42} sx={{ bgcolor: 'rgba(255,255,255,0.1)', borderRadius: 999 }} />
                  </Grid>
                </Grid>
              ))}
            </Stack>
          </Box>
        </Stack>
      </Container>
    </Box>
  )
}
