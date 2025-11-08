"use client";
import React from 'react'
import { useParams } from 'next/navigation'
import { useConfig } from 'wagmi'
import { Container, Box, Stack, Typography, Chip, Grid, Skeleton, Button, Divider } from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import Link from 'next/link'
import { useChainId as useEvmChainId } from 'wagmi'

function useEvmModel(id: number | undefined) {
  const evmChainId = useEvmChainId()
  const [data, setData] = React.useState<any | null>(null)
  const [loading, setLoading] = React.useState(false)

  React.useEffect(() => {
    if (!id) return
    let alive = true
    const load = async () => {
      setLoading(true)
      try {
        const qs = new URLSearchParams()
        if (typeof evmChainId === 'number') qs.set('chainId', String(evmChainId))
        const r = await fetch(`/api/models/evm/${id}?${qs.toString()}`, { cache: 'no-store' })
        const j = await r.json()
        let m = j?.data || null
        if (m && m.uri && typeof m.uri === 'string' && !m.uri.includes('.enc')) {
          try {
            const uri = m.uri as string
            const toApiFromIpfs = (u: string): string => {
              if (!u) return ''
              if (u.startsWith('http://') || u.startsWith('https://')) return u
              if (u.startsWith('ipfs://')) return `/api/ipfs/ipfs/${u.replace('ipfs://','')}`
              if (u.startsWith('/ipfs/')) return `/api/ipfs${u}`
              return `/api/ipfs/ipfs/${u}`
            }
            const httpUrl = toApiFromIpfs(uri)
            const meta = await fetch(httpUrl, { cache: 'no-store' }).then(r=>r.json()).catch(()=>null)
            if (meta) {
              const img = meta.image || meta.image_url || meta.thumbnail || meta?.cover?.thumbCid || meta?.cover?.cid
              if (img && typeof img === 'string') {
                if (img.startsWith('http://') || img.startsWith('https://')) {
                  m.imageUrl = img
                } else if (img.startsWith('ipfs://')) {
                  m.imageUrl = `${process.env.NEXT_PUBLIC_PINATA_GATEWAY || 'https://gateway.pinata.cloud'}/ipfs/${img.replace('ipfs://','')}`
                } else if (img.startsWith('/ipfs/')) {
                  m.imageUrl = `${process.env.NEXT_PUBLIC_PINATA_GATEWAY || 'https://gateway.pinata.cloud'}${img}`
                } else {
                  m.imageUrl = `${process.env.NEXT_PUBLIC_PINATA_GATEWAY || 'https://gateway.pinata.cloud'}/ipfs/${img}`
                }
              }
              if (!m.name && typeof meta.name === 'string') m.name = meta.name
              if (!m.description && typeof meta.description === 'string') m.description = meta.description
            }
          } catch {}
        }
        if (alive) setData(m)
      } catch {
        if (alive) setData(null)
      } finally {
        if (alive) setLoading(false)
      }
    }
    load()
    return () => { alive = false }
  }, [id, evmChainId])

  return { data, loading, evmChainId }
}

export default function EvmModelDetailPage() {
  const params = useParams() as { id?: string }
  const id = params?.id ? Number(params.id) : undefined
  const { data, loading, evmChainId } = useEvmModel(id)
  const { chains } = useConfig() as any
  const evmSymbol = React.useMemo(()=>{
    try {
      if (typeof evmChainId !== 'number') return 'ETH'
      const ch = Array.isArray(chains) ? chains.find((c:any)=> c?.id === evmChainId) : undefined
      const sym = ch?.nativeCurrency?.symbol
      return typeof sym === 'string' && sym ? sym : 'ETH'
    } catch {
      return 'ETH'
    }
  }, [evmChainId, chains])

  return (
    <Box>
      <Container maxWidth="lg" sx={{ py: { xs: 4, md: 6 } }}>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
          <Button component={Link} href="/" startIcon={<ArrowBackIcon />}>
            Back
          </Button>
        </Stack>
        {loading && (
          <Grid container spacing={3}>
            <Grid item xs={12} md={5}>
              <Skeleton variant="rounded" width="100%" height={300} />
            </Grid>
            <Grid item xs={12} md={7}>
              <Skeleton variant="text" height={44} />
              <Skeleton variant="text" height={28} width={240} />
              <Divider sx={{ my: 2 }} />
              <Skeleton variant="text" height={20} />
              <Skeleton variant="text" height={20} />
            </Grid>
          </Grid>
        )}
        {!loading && data && (
          <Grid container spacing={3}>
            <Grid item xs={12} md={5}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {data.imageUrl ? (
                <img src={data.imageUrl} alt={data.name || 'cover'} style={{ width:'100%', borderRadius: 12, display:'block' }} />
              ) : (
                <Box sx={{ border: '1px dashed rgba(0,0,0,0.2)', borderRadius: 2, height: 300, display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <Typography color="text.secondary">No cover</Typography>
                </Box>
              )}
            </Grid>
            <Grid item xs={12} md={7}>
              <Stack spacing={1}>
                <Typography variant="h4" fontWeight={800}>{data.name || `Model #${id}`}</Typography>
                {data.owner && (
                  <Typography variant="body2" color="text.secondary">Owner: {data.owner}</Typography>
                )}
                <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                  {typeof data.price_perpetual === 'number' && data.price_perpetual > 0 && (
                    <Chip label={`Perpetual: ${(data.price_perpetual/1e18).toFixed(2)} ${evmSymbol}`} color="primary" />
                  )}
                  {typeof data.price_subscription === 'number' && data.price_subscription > 0 && (
                    <Chip label={`Subscription: ${(data.price_subscription/1e18).toFixed(2)} ${evmSymbol}/mo`} />
                  )}
                  {typeof data.version === 'number' && data.version > 0 && (
                    <Chip label={`v${data.version}`} />)
                  }
                </Stack>
                <Divider sx={{ my: 2 }} />
                <Typography variant="body1" sx={{ whiteSpace:'pre-wrap' }}>{data.description || 'No description provided.'}</Typography>
                {data.uri && (
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>URI: {data.uri}</Typography>
                )}
              </Stack>
            </Grid>
          </Grid>
        )}
        {!loading && !data && (
          <Typography color="error">Model not found.</Typography>
        )}
      </Container>
    </Box>
  )
}
