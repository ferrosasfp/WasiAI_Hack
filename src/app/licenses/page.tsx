"use client";

import React from 'react';
import NextDynamic from 'next/dynamic'
import { useCurrentAccount } from '@mysten/dapp-kit';
import { useQuery } from '@tanstack/react-query';
import { getSuiClient } from '@/lib/sui';
import { OBJECT_TYPES } from '@/lib/sui/constants';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Grid,
  Chip,
  Stack,
} from '@mui/material';

function useMyLicenses(address?: string | null) {
  return useQuery({
    queryKey: ['licenses', address],
    enabled: !!address,
    queryFn: async () => {
      if (!address) return [] as any[];
      const client = getSuiClient();
      const res = await client.getOwnedObjects({
        owner: address,
        filter: { StructType: OBJECT_TYPES.LICENSE },
        options: { showType: true, showContent: true, showDisplay: true },
      });
      return res.data;
    },
  });
}

export const dynamic = 'force-dynamic'

export default NextDynamic(() => Promise.resolve(LicensesPageImpl), { ssr: false })

function formatTimestamp(tsSec: number) {
  if (!tsSec) return '-';
  return new Date(tsSec * 1000).toLocaleString();
}

function SuiLicensesInner() {
  const account = useCurrentAccount();
  const { data, isLoading } = useMyLicenses(account?.address);

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', py: 6 }}>
      <Container maxWidth="lg">
        <Typography variant="h4" fontWeight="bold" gutterBottom>
          Mis licencias
        </Typography>
        {!account && (
          <Typography color="text.secondary">Conecta tu wallet para ver tus licencias.</Typography>
        )}
        {account && isLoading && (
          <Typography color="text.secondary">Cargando licencias…</Typography>
        )}
        {account && !isLoading && (
          <Grid container spacing={3}>
            {(data ?? []).map((obj: any) => {
              const content = obj.data?.content;
              const fields = content?.fields as any;
              const licenseId = Number(fields?.license_id ?? 0);
              const modelId = Number(fields?.model_id ?? 0);
              const kind = Number(fields?.license_kind ?? 0); // 0=perpetua, 1=sub
              const expiresAt = Number(fields?.expires_at ?? 0);
              const now = Math.floor(Date.now() / 1000);
              const isSubscription = kind === 1;
              const active = !isSubscription || (expiresAt > now);

              return (
                <Grid item xs={12} md={6} key={obj.data?.objectId}>
                  <Card>
                    <CardContent>
                      <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between">
                        <Typography variant="h6" fontWeight="bold">
                          Licencia #{licenseId}
                        </Typography>
                        <Chip label={active ? 'Activa' : 'Expirada'} color={active ? 'success' : 'default'} size="small" />
                      </Stack>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        Modelo ID: {modelId}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Tipo: {isSubscription ? 'Suscripción' : 'Perpetua'}
                      </Typography>
                      {isSubscription && (
                        <Typography variant="body2" color="text.secondary">
                          Expira: {formatTimestamp(expiresAt)}
                        </Typography>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
              );
            })}
            {Array.isArray(data) && data.length === 0 && (
              <Grid item xs={12}>
                <Typography color="text.secondary">No tienes licencias aún.</Typography>
              </Grid>
            )}
          </Grid>
        )}
      </Container>
    </Box>
  );
}

function LicensesPageImpl() {
  const enableSui = (process.env.NEXT_PUBLIC_ENABLE_SUI || '').toLowerCase() === 'true'
  if (!enableSui) {
    return (
      <Box sx={{ minHeight: '60vh', display:'flex', alignItems:'center', justifyContent:'center', px:2 }}>
        <Container maxWidth="md">
          <Card>
            <CardContent>
              <Stack spacing={1}>
                <Typography variant="h5" fontWeight={700}>Licencias (Sui) deshabilitadas</Typography>
                <Typography color="text.secondary">
                  Esta vista requiere el proveedor Sui. Habilítalo con NEXT_PUBLIC_ENABLE_SUI=true o cambia a la vista EVM correspondiente.
                </Typography>
              </Stack>
            </CardContent>
          </Card>
        </Container>
      </Box>
    )
  }
  return <SuiLicensesInner />
}
