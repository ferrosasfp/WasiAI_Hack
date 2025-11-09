"use client";
import React from 'react'
import { useAccount, useChainId as useEvmChainId, usePublicClient, useSwitchChain } from 'wagmi'
import {
  Container, Box, Stack, Typography, Button, Divider, Alert, Table, TableHead, TableRow, TableCell, TableBody, Chip, CircularProgress, Snackbar
} from '@mui/material'
import MARKET_ARTIFACT from '@/abis/Marketplace.json'

function useMarketAddress(chainId: number | undefined) {
  return React.useMemo(() => {
    try {
      if (typeof chainId !== 'number') return undefined
      const map: Record<number, `0x${string}` | undefined> = {
        43113: (process.env.NEXT_PUBLIC_EVM_MARKET_43113 as any),
        43114: (process.env.NEXT_PUBLIC_EVM_MARKET_43114 as any),
        84532: (process.env.NEXT_PUBLIC_EVM_MARKET_84532 as any),
        8453: (process.env.NEXT_PUBLIC_EVM_MARKET_8453 as any),
      }
      return map[chainId]
    } catch { return undefined }
  }, [chainId])
}

export default function EvmLicensesPage() {
  const { address, isConnected, chain } = useAccount()
  const evmChainId = useEvmChainId()
  const marketAddress = useMarketAddress(evmChainId)
  const publicClient = usePublicClient()
  const { switchChainAsync } = useSwitchChain()

  const [loading, setLoading] = React.useState(false)
  const [rows, setRows] = React.useState<any[]>([])
  const [snkOpen, setSnkOpen] = React.useState(false)
  const [snkMsg, setSnkMsg] = React.useState('')
  const [snkSev, setSnkSev] = React.useState<'success'|'error'|'info'|'warning'>('info')

  const load = React.useCallback(async () => {
    try {
      if (!publicClient) return
      if (!marketAddress) { setSnkSev('error'); setSnkMsg('Marketplace address is not configured for this network.'); setSnkOpen(true); return }
      setLoading(true)
      const abi: any = (MARKET_ARTIFACT as any).abi
      const lastId: bigint = await publicClient.readContract({ address: marketAddress as `0x${string}`, abi, functionName: 'lastLicenseId', args: [] }) as any
      const max = Number(lastId)
      const startFrom = Math.max(1, max - 199) // scan last 200 tokens
      const items: any[] = []
      for (let tokenId = max; tokenId >= startFrom; tokenId--) {
        try {
          const st: any = await publicClient.readContract({ address: marketAddress as `0x${string}`, abi, functionName: 'licenseStatus', args: [BigInt(tokenId)] })
          const owner: string = st?.[5]
          if (owner && address && owner.toLowerCase() === address.toLowerCase()) {
            items.push({
              tokenId,
              revoked: Boolean(st?.[0]),
              validApi: Boolean(st?.[1]),
              validDownload: Boolean(st?.[2]),
              kind: Number(st?.[3]) as 0|1,
              expiresAt: Number(st?.[4]) || 0,
              owner,
            })
          }
        } catch {}
      }
      setRows(items)
    } catch (e:any) {
      setSnkSev('error'); setSnkMsg(String(e?.message || e || 'Failed to load licenses')) ; setSnkOpen(true)
    } finally {
      setLoading(false)
    }
  }, [publicClient, marketAddress, address])

  React.useEffect(() => { if (isConnected) load() }, [isConnected, evmChainId, load])

  const needsSwitch = isConnected && chain?.id !== evmChainId

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 4, md: 6 } }}>
      <Stack spacing={2}>
        <Typography variant="h4" fontWeight={800}>My licenses</Typography>
        {!isConnected && (
          <Alert severity="info">Connect your wallet to view your licenses.</Alert>
        )}
        {isConnected && needsSwitch && (
          <Alert severity="warning" action={
            <Button color="inherit" size="small" onClick={async()=>{ try { await switchChainAsync({ chainId: evmChainId }) } catch {} }}>Switch</Button>
          }>You are on the wrong network. Please switch to the target network.</Alert>
        )}
        {isConnected && !needsSwitch && (
          <Box>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
              <Button variant="outlined" onClick={load} disabled={loading} startIcon={loading ? <CircularProgress size={16} /> : undefined}>Refresh</Button>
            </Stack>
            <Divider sx={{ mb: 2 }} />
            {loading ? (
              <Stack alignItems="center" sx={{ py: 4 }}>
                <CircularProgress />
              </Stack>
            ) : rows.length === 0 ? (
              <Typography variant="body2" color="text.secondary">No licenses found for this wallet in the last 200 issued licenses.</Typography>
            ) : (
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Token ID</TableCell>
                    <TableCell>Kind</TableCell>
                    <TableCell>Validity</TableCell>
                    <TableCell>Expires</TableCell>
                    <TableCell>Rights</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.map((r)=>{
                    const exp = r.expiresAt ? new Date(r.expiresAt * 1000) : null
                    return (
                      <TableRow key={r.tokenId}>
                        <TableCell>{r.tokenId}</TableCell>
                        <TableCell>{r.kind === 0 ? 'Perpetual' : 'Subscription'}</TableCell>
                        <TableCell>
                          {r.revoked ? (<Chip size="small" label="Revoked" color="error" />) : (
                            <Chip size="small" label={exp && exp.getTime() > Date.now() ? 'Active' : (r.kind===0 ? 'Active' : 'Expired')} color={exp && exp.getTime() > Date.now() ? 'success' : 'default'} />
                          )}
                        </TableCell>
                        <TableCell>{exp ? exp.toLocaleString() : '-'}</TableCell>
                        <TableCell>
                          <Stack direction="row" spacing={1}>
                            {r.validApi && <Chip size="small" label="API" />}
                            {r.validDownload && <Chip size="small" label="Download" />}
                          </Stack>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            )}
          </Box>
        )}
      </Stack>
      <Snackbar open={snkOpen} autoHideDuration={6000} onClose={()=> setSnkOpen(false)} anchorOrigin={{ vertical:'bottom', horizontal:'center' }}>
        <Alert onClose={()=> setSnkOpen(false)} severity={snkSev} sx={{ width: '100%' }}>
          {snkMsg}
        </Alert>
      </Snackbar>
    </Container>
  )
}
