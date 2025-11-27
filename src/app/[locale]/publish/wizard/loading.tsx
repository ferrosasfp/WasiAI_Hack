import { Box, Container, Stack, Skeleton, Paper } from '@mui/material'

export default function WizardLoading() {
  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Stack spacing={4}>
        {/* Wizard steps indicator */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, justifyContent: 'center' }}>
          {[...Array(5)].map((_, i) => (
            <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Skeleton 
                variant="circular" 
                width={40} 
                height={40} 
                sx={{ bgcolor: 'rgba(79,225,255,0.2)' }} 
              />
              {i < 4 && (
                <Box sx={{ width: 60, height: 2, bgcolor: 'rgba(255,255,255,0.1)' }} />
              )}
            </Box>
          ))}
        </Box>

        {/* Main form area */}
        <Paper 
          variant="outlined"
          sx={{ 
            p: 4, 
            bgcolor: 'rgba(10,17,28,0.4)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 2
          }}
        >
          <Stack spacing={3}>
            {/* Title */}
            <Skeleton 
              variant="text" 
              width={300} 
              height={36} 
              sx={{ bgcolor: 'rgba(255,255,255,0.1)' }} 
            />

            {/* Form fields */}
            {[...Array(4)].map((_, i) => (
              <Box key={i}>
                <Skeleton 
                  variant="text" 
                  width={150} 
                  height={20} 
                  sx={{ mb: 1, bgcolor: 'rgba(255,255,255,0.08)' }} 
                />
                <Skeleton 
                  variant="rounded" 
                  width="100%" 
                  height={56} 
                  sx={{ bgcolor: 'rgba(255,255,255,0.05)' }} 
                />
              </Box>
            ))}

            {/* Action buttons */}
            <Stack direction="row" spacing={2} sx={{ mt: 3, justifyContent: 'space-between' }}>
              <Skeleton 
                variant="rounded" 
                width={120} 
                height={40} 
                sx={{ bgcolor: 'rgba(255,255,255,0.08)' }} 
              />
              <Skeleton 
                variant="rounded" 
                width={120} 
                height={40} 
                sx={{ bgcolor: 'rgba(79,225,255,0.2)' }} 
              />
            </Stack>
          </Stack>
        </Paper>
      </Stack>
    </Container>
  )
}
