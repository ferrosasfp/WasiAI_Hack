'use client';

import React from 'react';
import { Box, Container, TextField, Stack, Button, Typography, Switch, FormControlLabel, Card, CardContent, Grid, Alert } from '@mui/material';
import { encryptAESGCM, exportRawKey, generateKey, toBase64 } from '@/lib/crypto';

async function uploadFile(file: File): Promise<{ cid: string }> {
  const buf = new Uint8Array(await file.arrayBuffer());
  const res = await fetch('/api/ipfs/upload', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ type: 'file', filename: file.name, contentBase64: toBase64(buf) }),
  });
  if (!res.ok) throw new Error('upload error');
  return await res.json();
}

async function uploadJson(obj: any, filename = 'metadata.json'): Promise<{ cid: string }> {
  const res = await fetch('/api/ipfs/upload', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ type: 'json', filename, json: obj }),
  });
  if (!res.ok) throw new Error('upload error');
  return await res.json();
}

export default function UploadModelPage() {
  const [name, setName] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [image, setImage] = React.useState<File | null>(null);
  const [protectedMode, setProtectedMode] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [result, setResult] = React.useState<any | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const handleSubmit = async () => {
    try {
      setError(null);
      setLoading(true);
      setResult(null);
      if (!name || !image) throw new Error('nombre e imagen requeridos');

      const imgUp = await uploadFile(image);
      const imageUri = `ipfs://${imgUp.cid}`;

      let encryptedCid: string | null = null;
      let exportedKeyB64: string | null = null;
      if (protectedMode) {
        const key = await generateKey();
        const data = new TextEncoder().encode(JSON.stringify({ protected: true, name, ts: Date.now() }));
        const { iv, cipher } = await encryptAESGCM(data, key);
        const payload = { iv: toBase64(iv), cipher: toBase64(cipher) };
        const encUp = await uploadJson(payload, 'model.enc.json');
        encryptedCid = encUp.cid;
        const raw = await exportRawKey(key);
        exportedKeyB64 = toBase64(new Uint8Array(raw));
      }

      const metadata = {
        name,
        description,
        image: imageUri,
        encrypted: protectedMode,
        encrypted_uri: protectedMode && encryptedCid ? `ipfs://${encryptedCid}` : undefined,
      };
      const metaUp = await uploadJson(metadata);
      const metadataUri = `ipfs://${metaUp.cid}`;

      setResult({ imageUri, metadataUri, protectedMode, encryptedCid, exportedKeyB64 });
    } catch (e: any) {
      setError(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', py: 6 }}>
      <Container maxWidth="sm">
        <Card>
          <CardContent>
            <Typography variant="h5" fontWeight="bold" sx={{ mb: 2 }}>Subir modelo</Typography>
            <Stack spacing={2}>
              <TextField label="Nombre" value={name} onChange={(e) => setName(e.target.value)} fullWidth />
              <TextField label="Descripción" value={description} onChange={(e) => setDescription(e.target.value)} fullWidth multiline rows={3} />
              <Button variant="outlined" component="label">
                Seleccionar imagen
                <input hidden type="file" accept="image/*" onChange={(e) => setImage(e.target.files?.[0] || null)} />
              </Button>
              <FormControlLabel control={<Switch checked={protectedMode} onChange={(e) => setProtectedMode(e.target.checked)} />} label="Proteger contenido (encriptar)" />
              <Button variant="contained" disabled={loading} onClick={handleSubmit}>{loading ? 'Subiendo…' : 'Subir'}</Button>
              {error && <Alert severity="error">{error}</Alert>}
              {result && (
                <Grid container spacing={1}>
                  <Grid item xs={12}><Typography variant="subtitle2">Resultado</Typography></Grid>
                  <Grid item xs={12}><Typography variant="body2">Imagen: {result.imageUri}</Typography></Grid>
                  <Grid item xs={12}><Typography variant="body2">Metadata: {result.metadataUri}</Typography></Grid>
                  {result.protectedMode && (
                    <>
                      <Grid item xs={12}><Typography variant="body2">Encrypted: ipfs://{result.encryptedCid}</Typography></Grid>
                      <Grid item xs={12}><Typography variant="body2">Key (raw base64): {result.exportedKeyB64}</Typography></Grid>
                    </>
                  )}
                </Grid>
              )}
            </Stack>
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
}
