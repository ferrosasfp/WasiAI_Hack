"use client";
import React from 'react'
import { Box, Paper, Stack, Typography, Button } from '@mui/material'

export default function EvmModelDetailPage() {
  return (
    <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: 1000, mx: 'auto' }}>
      <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 }, borderRadius: 2 }}>
        <Stack spacing={1}>
          <Typography variant="h6" fontWeight={700}>EVM Model detail</Typography>
          <Typography color="text.secondary">
            Esta vista fue consolidada en la ruta localizada y estamos restaurando su implementación completa.
          </Typography>
          <Typography color="text.secondary">
            Mientras tanto, usa la página de modelos para continuar navegando.
          </Typography>
          <Box>
            <Button href="/en/models" variant="outlined" sx={{ mt: 1 }}>Ir a modelos</Button>
          </Box>
        </Stack>
      </Paper>
    </Box>
  )
}
