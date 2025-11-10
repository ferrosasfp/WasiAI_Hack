"use client";
import React from 'react'
import { useMemo, useState, useEffect, useRef } from 'react'
import { useWalletAddress } from '@/hooks/useWalletAddress'
import { Box, Stack, Typography, Paper, Tooltip, TextField, Grid, InputAdornment, IconButton, Alert, FormGroup, FormControlLabel, Checkbox, FormControl, InputLabel, Select, MenuItem, Button, List, ListItem, ListItemText, SvgIcon, Switch } from '@mui/material'
import FormatBoldIcon from '@mui/icons-material/FormatBold'
import FormatItalicIcon from '@mui/icons-material/FormatItalic'
import TitleIcon from '@mui/icons-material/Title'
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted'
import FormatListNumberedIcon from '@mui/icons-material/FormatListNumbered'
import InsertLinkIcon from '@mui/icons-material/InsertLink'
import FormatQuoteIcon from '@mui/icons-material/FormatQuote'
import CodeIcon from '@mui/icons-material/Code'
import ClearIcon from '@mui/icons-material/Clear'
import CheckBoxIcon from '@mui/icons-material/CheckBox'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'

import VisibilityIcon from '@mui/icons-material/Visibility'
import EditIcon from '@mui/icons-material/Edit'
import { useLocale, useTranslations } from 'next-intl'

export const dynamic = 'force-dynamic'

async function saveDraft(payload: any) {
  let addr: string | null = null
  try { addr = await (window as any)?.ethereum?.request?.({ method: 'eth_accounts' }).then((a: string[]) => a?.[0] || null) } catch {}
  const res = await fetch('/api/models/draft', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(addr ? { 'X-Wallet-Address': addr } : {}) },
    body: JSON.stringify(addr ? { ...payload, address: addr } : payload)
  })
  return res.json()
}

async function loadDraft() {
  let addr: string | null = null
  try { addr = await (window as any)?.ethereum?.request?.({ method: 'eth_accounts' }).then((a: string[]) => a?.[0] || null) } catch {}
  const res = await fetch('/api/models/draft' + (addr ? `?address=${addr}` : ''), { method: 'GET', headers: addr ? { 'X-Wallet-Address': addr } : {} })
  return res.json()
}

export default function Step4LicensesTermsLocalized() {
  const t = useTranslations()
  const locale = useLocale()
  const base = `/${locale}/publish/wizard`
  const [saving, setSaving] = useState(false)
  const [pricePerpetual, setPricePerpetual] = useState('0')
  const [priceSubscription, setPriceSubscription] = useState('0')
  const [defaultDurationDays, setDefaultDurationDays] = useState('1')
  const [royaltyPercent, setRoyaltyPercent] = useState('0')
  const [transferable, setTransferable] = useState(false)
  const [rightsAPI, setRightsAPI] = useState(true)
  const [rightsDownload, setRightsDownload] = useState(false)
  const [deliveryModeHint, setDeliveryModeHint] = useState<'API'|'Download'|'Both'|'none'>('API')
  const [termsText, setTermsText] = useState('')
  const [termsHash, setTermsHash] = useState('')
  const termsRef = useRef<HTMLTextAreaElement | null>(null)
  const termsSectionRef = useRef<HTMLDivElement | null>(null)
  const [showPreview, setShowPreview] = useState(false)
  const [mustSignError, setMustSignError] = useState(false)
  const [msg, setMsg] = useState('')
  const { walletAddress } = useWalletAddress()
  const didMountRef = useRef(false)
  const autoSaveDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastSavedRef = useRef<any>(null)
  const loadingFromDraftRef = useRef(false)
  const lastErrorAtRef = useRef<number | null>(null)
  const [unit, setUnit] = useState<'AVAX'|'ETH'>('AVAX')
  const [chainId, setChainId] = useState<number | null>(null)
  const [feeBpsOnChain, setFeeBpsOnChain] = useState<number | null>(null)
  const [shouldFade, setShouldFade] = useState(true)
  const [loadedRemote, setLoadedRemote] = useState(false)
  const isResetting = () => { try { return localStorage.getItem('wizard_resetting')==='1' || sessionStorage.getItem('wizard_resetting')==='1' } catch { return false } }

  const MARKET_ADDRS: Record<number, string> = useMemo(() => ({
    84532: process.env.NEXT_PUBLIC_EVM_MARKET_84532 || '',
    8453: process.env.NEXT_PUBLIC_EVM_MARKET_8453 || '',
    43113: process.env.NEXT_PUBLIC_EVM_MARKET_43113 || '',
    43114: process.env.NEXT_PUBLIC_EVM_MARKET_43114 || '',
  }), [])

  const rightsMask = useMemo(() => {
    const r:string[] = []
    if (rightsAPI) r.push('API')
    if (rightsDownload) r.push('Download')
    return r
  }, [rightsAPI, rightsDownload])

  const pPerp = Number(pricePerpetual || 0)
  const pSub = Number(priceSubscription || 0)
  const dMonths = Number(defaultDurationDays || 0)
  const dDays = dMonths > 0 ? dMonths * 30 : 0
  const feeBpsEnv = parseInt(process.env.NEXT_PUBLIC_MARKETPLACE_FEE_BPS || process.env.NEXT_PUBLIC_MARKET_FEE_BPS || '1000') || 1000
  const feeBpsEff = feeBpsOnChain ?? feeBpsEnv
  const royaltyBps = Math.max(0, Math.min(10000, Math.round(Number(royaltyPercent || '0') * 100)))
  const atLeastOnePrice = pPerp > 0 || pSub > 0
  const subNeedsDuration = pSub > 0 && dMonths <= 0
  const invalidPerp = !Number.isFinite(pPerp) || pPerp < 0
  const invalidSub = !Number.isFinite(pSub) || pSub < 0
  const invalidDur = !Number.isFinite(dMonths) || dMonths < 0 || !Number.isInteger(dMonths) || dMonths > 12 || subNeedsDuration
  const noRights = !(rightsAPI || rightsDownload)
  const isValid = atLeastOnePrice && !invalidPerp && !invalidSub && !invalidDur && !noRights
  const subDisabled = pSub <= 0

  const splitFor = (amount: number) => {
    const fee = (amount * feeBpsEff) / 10000
    const royalty = (amount * royaltyBps) / 10000
    const seller = Math.max(0, amount - fee - royalty)
    return { fee, royalty, seller }
  }

  const fmt2Up = (v:number) => (Math.ceil(v * 100) / 100).toFixed(2)

  const withSelection = (fn: (value: string, start: number, end: number) => { next: string, selStart?: number, selEnd?: number }) => {
    const el = termsRef.current
    if (!el) return
    const value = termsText
    const start = el.selectionStart ?? 0
    const end = el.selectionEnd ?? 0
    const { next, selStart, selEnd } = fn(value, start, end)
    setTermsText(next)
    requestAnimationFrame(()=>{
      try {
        if (selStart != null && selEnd != null) {
          el.selectionStart = selStart
          el.selectionEnd = selEnd
        }
        el.focus()
      } catch {}
    })
  }

  const wrap = (prefix: string, suffix?: string) => withSelection((v, s, e) => {
    const suf = suffix ?? prefix
    const before = v.slice(0, s)
    const sel = v.slice(s, e)
    const after = v.slice(e)
    const wrapped = `${prefix}${sel || ''}${suf}`
    const next = before + wrapped + after
    const ns = before.length + prefix.length
    const ne = ns + (sel || '').length
    return { next, selStart: ns, selEnd: ne }
  })

  const numberedList = () => withSelection((v, s, e) => {
    const before = v.slice(0, s)
    const sel = v.slice(s, e) || ''
    const after = v.slice(e)
    const lines = (sel || '').split(/\n/)
    const changed = lines.map((l, i) => `${i + 1}. ${l}`.trimEnd()).join('\n')
    const next = before + changed + after
    const ns = before.length
    const ne = ns + changed.length
    return { next, selStart: ns, selEnd: ne }
  })

  const mdPreviewLines = (text: string) => {
    const lines = (text || '').split(/\n/)
    return lines.map((ln, idx) => {
      let content = ln
      let variant: 'body2' | 'subtitle1' | 'h6' = 'body2'
      if (content.startsWith('### ')) { content = content.slice(4); variant = 'subtitle1' }
      else if (content.startsWith('## ')) { content = content.slice(3); variant = 'h6' }
      if (content.startsWith('- [ ] ')) content = `☐ ${content.slice(6)}`
      else if (content.startsWith('- [x] ') || content.startsWith('- [X] ')) content = `☑ ${content.slice(6)}`
      else if (content.startsWith('- ')) content = `• ${content.slice(2)}`
      return (
        <Typography key={idx} variant={variant} sx={{ whiteSpace: 'pre-wrap', fontFamily: variant === 'body2' ? 'inherit' : undefined }}>
          {content}
        </Typography>
      )
    })
  }

  const prefixEachLine = (prefix: string) => withSelection((v, s, e) => {
    const before = v.slice(0, s)
    const sel = v.slice(s, e)
    const after = v.slice(e)
    const block = sel || ''
    const lines = block.split(/\n/)
    const changed = lines.map(l => l ? `${prefix}${l}` : prefix).join('\n')
    const next = before + changed + after
    const ns = before.length
    const ne = ns + changed.length
    return { next, selStart: ns, selEnd: ne }
  })

  const makeLink = () => withSelection((v, s, e) => {
    const before = v.slice(0, s)
    const sel = v.slice(s, e) || (locale==='es' ? 'texto' : 'text')
    const after = v.slice(e)
    const url = (typeof window !== 'undefined') ? (window.prompt(locale==='es' ? 'URL del enlace:' : 'Link URL:', 'https://') || 'https://') : 'https://'
    const inserted = `[${sel}](${url})`
    const next = before + inserted + after
    const ns = before.length + 1
    const ne = ns + sel.length
    return { next, selStart: ns, selEnd: ne }
  })

  const clearMd = () => withSelection((v, s, e) => {
    const before = v.slice(0, s)
    const sel = v.slice(s, e) || ''
    const after = v.slice(e)
    const cleaned = sel
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/`{1,3}([\s\S]*?)`{1,3}/g, '$1')
      .replace(/^>\s?/gm, '')
      .replace(/^[-*+]\s?/gm, '')
      .replace(/^#{1,6}\s?/gm, '')
      .replace(/\[(.*?)\]\((.*?)\)/g, '$1')
    const next = before + cleaned + after
    const ns = before.length
    const ne = ns + cleaned.length
    return { next, selStart: ns, selEnd: ne }
  })

  useEffect(() => {
    if (pSub <= 0 && defaultDurationDays !== '0') {
      setDefaultDurationDays('0')
    }
  }, [pSub, defaultDurationDays])

  useEffect(() => {
    if (deliveryModeHint === 'API') {
      if (!rightsAPI || rightsDownload) { setRightsAPI(true); setRightsDownload(false) }
    } else if (deliveryModeHint === 'Download') {
      if (rightsAPI || !rightsDownload) { setRightsAPI(false); setRightsDownload(true) }
    } else if (deliveryModeHint === 'Both') {
      if (!rightsAPI || !rightsDownload) { setRightsAPI(true); setRightsDownload(true) }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deliveryModeHint])

  useEffect(() => {
    if (rightsAPI && rightsDownload && deliveryModeHint !== 'Both') {
      setDeliveryModeHint('Both')
    } else if (rightsAPI && !rightsDownload && deliveryModeHint !== 'API') {
      setDeliveryModeHint('API')
    } else if (!rightsAPI && rightsDownload && deliveryModeHint !== 'Download') {
      setDeliveryModeHint('Download')
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rightsAPI, rightsDownload])

  const onHashTerms = async () => {
    try {
      const enc = new TextEncoder().encode((termsText || '').trim())
      const buf = await crypto.subtle.digest('SHA-256', enc)
      const hex = Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,'0')).join('')
      setTermsHash('0x'+hex)
      setMustSignError(false)
    } catch {
      setTermsHash('')
    }
  }

  const hashForText = async (text: string): Promise<string> => {
    const enc = new TextEncoder().encode(text || '')
    const buf = await crypto.subtle.digest('SHA-256', enc)
    return '0x' + Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,'0')).join('')
  }

  const onSave = async (reason?: 'autosave'|'manual'): Promise<boolean> => {
    setMsg('')
    if (reason === 'manual') {
      const text = (termsText || '').trim()
      if (text.length > 0) {
        try {
          const current = await hashForText(text)
          if (!termsHash || termsHash.toLowerCase() !== current.toLowerCase()) {
            setMsg(t('wizard.step4.validation.termsMustBeSigned'))
            setMustSignError(true)
            try { termsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }) } catch {}
            return false
          }
          setMustSignError(false)
        } catch {}
      }
    }
    const payload = {
      address: walletAddress,
      step: 'step4',
      data: {
        licensePolicy: {
          rights: rightsMask,
          subscription: { perMonthPriceRef: priceSubscription },
          perpetual: { priceRef: pricePerpetual },
          defaultDurationDays: dDays,
          transferable,
          termsText,
          termsHash,
          royaltyBps,
          feeBps: feeBpsEff,
          delivery: rightsMask
        }
      }
    }
    if (reason === 'autosave') {
      if (saving) return true
      try { if (lastSavedRef.current && JSON.stringify(lastSavedRef.current) === JSON.stringify(payload.data)) return true } catch {}
    }
    setSaving(true)
    try {
      await saveDraft(payload)
      setMsg(t('wizard.common.saved'))
      lastSavedRef.current = payload.data
      try { localStorage.setItem('draft_step4', JSON.stringify(payload.data)) } catch {}
      return true
    } catch {
      setMsg(t('wizard.common.errorSaving'))
      lastErrorAtRef.current = Date.now()
      return false
    } finally {
      setSaving(false)
    }
  }

  const navigateAfterSave = async (e: React.MouseEvent<HTMLAnchorElement | HTMLButtonElement>, url: string) => {
    e.preventDefault()
    const ok = await onSave('manual')
    if (ok) window.location.href = url
  }

  useEffect(() => {
    if (!didMountRef.current) { didMountRef.current = true; return }
    if (autoSaveDebounceRef.current) clearTimeout(autoSaveDebounceRef.current)
    autoSaveDebounceRef.current = setTimeout(() => {
      if (isResetting()) return
      if (loadingFromDraftRef.current) return
      const cooldownMs = 25000
      if (lastErrorAtRef.current && (Date.now() - lastErrorAtRef.current) < cooldownMs) return
      onSave('autosave')
    }, 700)
    return () => { if (autoSaveDebounceRef.current) clearTimeout(autoSaveDebounceRef.current) }
  }, [pricePerpetual, priceSubscription, defaultDurationDays, transferable, rightsAPI, rightsDownload, deliveryModeHint, termsText, termsHash])

  useEffect(() => {
    const text = (termsText || '').trim()
    if (text.length === 0) setMustSignError(false)
  }, [termsText])

  useEffect(() => {
    let alive = true
    // Hydrate from cache first to avoid empty initial render
    if (!isResetting()) {
      try {
        const raw = localStorage.getItem('draft_step4')
        if (raw) {
          const c = JSON.parse(raw)
          const lp = c?.licensePolicy || {}
          const rights = Array.isArray(lp.rights) ? lp.rights : (Array.isArray(lp.delivery) ? lp.delivery : [])
          setRightsAPI(rights.includes('API'))
          setRightsDownload(rights.includes('Download'))
          const sub = lp.subscription || {}
          const perp = lp.perpetual || {}
          setPriceSubscription(String(sub.perMonthPriceRef ?? '0'))
          setPricePerpetual(String(perp.priceRef ?? '0'))
          const rbps = Number(lp.royaltyBps || 0)
          const rInt = Math.max(0, Math.min(20, Math.round(rbps/100)))
          setRoyaltyPercent(String(rInt))
          const dd = Number(lp.defaultDurationDays || 0)
          setDefaultDurationDays(String(Math.max(0, Math.round(dd/30))))
          setTransferable(Boolean(lp.transferable))
          setTermsHash(String(lp.termsHash || ''))
          setTermsText(String(lp.termsText || ''))
          if (rights.includes('API') && rights.includes('Download')) setDeliveryModeHint('Both')
          else if (rights.includes('API')) setDeliveryModeHint('API')
          else if (rights.includes('Download')) setDeliveryModeHint('Download')
          else setDeliveryModeHint('none')
          lastSavedRef.current = { licensePolicy: lp }
          setShouldFade(false)
        }
      } catch {}
    }
    loadingFromDraftRef.current = true
    loadDraft().then((r)=>{
      if (!alive) return
      const s4 = r?.data?.step4
      if (!s4) return
      try {
        const lp = s4.licensePolicy || {}
        const rights = Array.isArray(lp.rights) && lp.rights.length > 0
          ? lp.rights
          : (Array.isArray(lp.delivery) ? lp.delivery : [])
        setRightsAPI(rights.includes('API'))
        setRightsDownload(rights.includes('Download'))
        const sub = lp.subscription || {}
        const perp = lp.perpetual || {}
        setPriceSubscription(String(sub.perMonthPriceRef ?? '0'))
        setPricePerpetual(String(perp.priceRef ?? '0'))
        const rbps = Number(lp.royaltyBps || 0)
        const rInt = Math.max(0, Math.min(20, Math.round(rbps/100)))
        setRoyaltyPercent(String(rInt))
        const dd = Number(lp.defaultDurationDays || 0)
        setDefaultDurationDays(String(Math.max(0, Math.round(dd/30))))
        setTransferable(Boolean(lp.transferable))
        setTermsHash(String(lp.termsHash || ''))
        setTermsText(String(lp.termsText || ''))
        if (rights.includes('API') && rights.includes('Download')) setDeliveryModeHint('Both')
        else if (rights.includes('API')) setDeliveryModeHint('API')
        else if (rights.includes('Download')) setDeliveryModeHint('Download')
        else setDeliveryModeHint('none')
        lastSavedRef.current = {
          licensePolicy: {
            rights,
            subscription: { perMonthPriceRef: String(sub.perMonthPriceRef ?? '0') },
            perpetual: { priceRef: String(perp.priceRef ?? '0') },
            defaultDurationDays: Number(lp.defaultDurationDays || 0),
            transferable: Boolean(lp.transferable),
            termsText: String(lp.termsText || ''),
            termsHash: String(lp.termsHash || ''),
            royaltyBps: rbps,
            feeBps: Number(lp.feeBps || feeBpsEnv),
            delivery: rights
          }
        }
      } catch {}
    }).catch(()=>{}).finally(()=>{ loadingFromDraftRef.current = false; setLoadedRemote(true) })
    return () => { alive = false }
  }, [])

  useEffect(() => {
    let mounted = true
    const eth = (window as any)?.ethereum
    const applyByChain = (chainIdHex?: string) => {
      try {
        const id = chainIdHex ? parseInt(chainIdHex, 16) : null
        if (id) setChainId(id)
        // Base: mainnet 8453, sepolia 84532 -> ETH
        // Avalanche: mainnet 43114, fuji 43113 -> AVAX
        if (id === 43114 || id === 43113) setUnit('AVAX')
        else if (id === 8453 || id === 84532) setUnit('ETH')
        else setUnit('ETH')
      } catch { setUnit('ETH') }
    }
    const init = async () => {
      try {
        if (eth?.request) {
          const chainId = await eth.request({ method: 'eth_chainId' })
          if (!mounted) return
          applyByChain(chainId)
        } else {
          // No wallet: fallback to default env chainId
          const defId = Number(process.env.NEXT_PUBLIC_EVM_CHAIN_ID || 0) || null
          if (defId) {
            setChainId(defId)
            if (defId === 43114 || defId === 43113) setUnit('AVAX')
            else if (defId === 8453 || defId === 84532) setUnit('ETH')
            else setUnit('ETH')
          }
        }
      } catch {}
    }
    init()
    const onChainChanged = (cid: string) => applyByChain(cid)
    try { eth?.on?.('chainChanged', onChainChanged) } catch {}
    return () => { mounted = false; try { eth?.removeListener?.('chainChanged', onChainChanged) } catch {} }
  }, [])

  const getMarketAddressFor = (cid?: number | null): string | null => {
    if (!cid) return null
    const addr = MARKET_ADDRS[cid]
    return addr && addr.length > 0 ? addr : null
  }

  useEffect(() => {
    let alive = true
    const loadFee = async () => {
      try {
        const addr = getMarketAddressFor(chainId)
        if (!addr) { setFeeBpsOnChain(null); return }
        const eth = (window as any)?.ethereum
        const { BrowserProvider, JsonRpcProvider, Contract } = await import('ethers')
        let provider: any
        if (eth?.request) {
          provider = new BrowserProvider(eth)
        } else {
          // Public RPC fallback by chainId
          let url = ''
          if (chainId === 8453 || chainId === 84532) url = process.env.RPC_BASE || 'https://sepolia.base.org'
          if (chainId === 43114 || chainId === 43113) url = process.env.RPC_AVAX || 'https://api.avax-test.network/ext/bc/C/rpc'
          if (!url) { setFeeBpsOnChain(null); return }
          provider = new JsonRpcProvider(url, chainId || undefined)
        }
        const abi = ["function feeBps() view returns (uint256)"]
        const c = new Contract(addr, abi, provider)
        const v = await c.feeBps()
        if (!alive) return
        const num = Number(v)
        if (Number.isFinite(num)) setFeeBpsOnChain(num)
      } catch {
        if (alive) setFeeBpsOnChain(null)
      }
    }
    loadFee()
    return () => { alive = false }
  }, [chainId])

  return (
    <Box sx={{ minHeight: '100vh', background: 'linear-gradient(180deg, #0f2740 0%, #0b1626 30%, #0a111c 100%)' }}>
      <Box sx={{
      p: 3,
      maxWidth: 900,
      mx: 'auto',
      color:'#ffffffd6',
      '& .MuiTypography-h6': { color:'#fff' },
      '& .MuiTypography-subtitle2': { color:'#fff' },
      '& .MuiTypography-body2': { color:'#ffffffcc' },
      '& .MuiTypography-caption': { color:'#ffffff99' },
      '& .MuiFormLabel-root': { color:'#ffffffcc' },
      '& .MuiFormLabel-root.Mui-focused': { color:'#fff' },
      '& .MuiInputBase-input': { color:'#fff', WebkitTextFillColor:'#fff' },
      '& .MuiInputBase-input.Mui-disabled': { color:'#ffffffb3', WebkitTextFillColor:'#ffffffb3' },
      '& .MuiOutlinedInput-notchedOutline': { borderColor:'rgba(255,255,255,0.28)' },
      '& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline': { borderColor:'rgba(255,255,255,0.40)' },
      '& .MuiOutlinedInput-root.Mui-disabled .MuiOutlinedInput-notchedOutline': { borderColor:'rgba(255,255,255,0.20)' },
      '& .MuiFormHelperText-root': { color:'#ffffffcc' },
      '& .MuiFormControlLabel-root': { color:'#fff' },
      '& .MuiInputLabel-root.Mui-disabled': { color:'#ffffffb3' },
      '& .MuiInputAdornment-root': { color:'#fff' },
      '& .MuiIconButton-root': { color:'#fff' },
      '& .MuiSvgIcon-root': { color:'#fff' },
      '& .MuiPaper-outlined': {
        borderRadius: '16px',
        border:'2px solid',
        borderColor:'oklch(0.30 0 0)',
        background:'linear-gradient(180deg, rgba(38,46,64,0.78), rgba(20,26,42,0.78))',
        boxShadow:'0 0 0 1px rgba(255,255,255,0.04) inset, 0 10px 28px rgba(0,0,0,0.40)',
        backdropFilter:'blur(10px)'
      }
    }}>
      <Typography variant="h5" sx={{ fontWeight:700, color:'#fff' }}>{t('wizard.step4.title')}</Typography>
      <Typography variant="body2" sx={{ mt:0.5, mb:1.5, color:'#ffffffcc' }}>
        {t('wizard.step4.subtitle')}
      </Typography>

      <Paper variant="outlined" sx={{ p:{ xs:2, md:3 }, mb:2, borderRadius:2 }} ref={termsSectionRef}>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight:600 }}>{t('wizard.step4.sections.prices.title')}</Typography>
          <Tooltip title={t('wizard.step4.sections.prices.help')}><InfoOutlinedIcon fontSize="small" color="action" /></Tooltip>
        </Stack>
        {!atLeastOnePrice && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            {t('wizard.step4.alerts.onePrice')}
          </Alert>
        )}
        <Box sx={{ transition:'opacity 150ms ease 60ms', willChange:'opacity', opacity: shouldFade ? (loadedRemote ? 1 : 0) : 1, minHeight: 220 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} md={4}>
            <TextField
              label={t('wizard.step4.fields.perpetual')}
              type="number"
              fullWidth
              value={pricePerpetual}
              onChange={(e)=>setPricePerpetual(e.target.value)}
              error={invalidPerp}
              helperText={invalidPerp ? t('wizard.step4.validation.intNonNegative') : ' '}
              inputProps={{ step: '0.0001' }}
              InputProps={{ endAdornment: <InputAdornment position="end" sx={{ color:'#fff', '& .MuiTypography-root': { color:'#fff' } }}>{unit}</InputAdornment> }}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              label={t('wizard.step4.fields.subscriptionPerMonth')}
              type="number"
              fullWidth
              value={priceSubscription}
              onChange={(e)=>setPriceSubscription(e.target.value)}
              error={invalidSub}
              helperText={invalidSub ? t('wizard.step4.validation.intNonNegative') : ' '}
              inputProps={{ step: '0.0001' }}
              InputProps={{ endAdornment: <InputAdornment position="end" sx={{ color:'#fff', '& .MuiTypography-root': { color:'#fff' } }}>{unit}</InputAdornment> }}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              label={locale==='es' ? 'Duración base' : 'Base duration'}
              type="number"
              fullWidth
              value={defaultDurationDays}
              onChange={(e)=>setDefaultDurationDays(String(e.target.value))}
              error={invalidDur}
              disabled={subDisabled}
              inputProps={{ step: '1', min: 0, max: 12 }}
              InputProps={{ endAdornment: <InputAdornment position="end" sx={{ color:'#fff', '& .MuiTypography-root': { color:'#fff' } }}>{locale==='es' ? 'MES(es)' : 'MONTH(s)'}</InputAdornment> }}
              helperText={subNeedsDuration ? t('wizard.step4.validation.durationRequired') : invalidDur ? t('wizard.step4.validation.durationRange') : ' '}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              label={locale==='es' ? 'Royalty del creador (%)' : 'Creator royalty (%)'}
              type="text"
              fullWidth
              value={royaltyPercent}
              onChange={(e)=>{
                const raw = (e.target.value || '').replace(/[^0-9]/g, '')
                const n = Math.max(0, Math.min(20, raw === '' ? 0 : parseInt(raw, 10)))
                setRoyaltyPercent(String(n))
              }}
              onBlur={()=>{
                const n = Math.max(0, Math.min(20, parseInt(String(royaltyPercent||'0'), 10) || 0))
                setRoyaltyPercent(String(n))
              }}
              inputProps={{ inputMode: 'numeric', pattern: '[0-9]*', min: 0, max: 20 }}
              InputProps={{ endAdornment: (<InputAdornment position="end" sx={{ color:'#fff', '& .MuiTypography-root': { color:'#fff' } }}>%</InputAdornment>) }}
              helperText={locale==='es' ? '0–20%' : '0–20%'}
            />
          </Grid>
        </Grid>
        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            {t('wizard.step4.sections.revenueSplit') || 'Revenue Split'}
          </Typography>
          <Grid container spacing={1.5}>
            {pPerp > 0 && (
              <Grid item xs={12} md={6}>
                <Paper variant="outlined" sx={{ p:1.5, borderRadius:2 }}>
                  <Typography variant="caption" color="text.secondary">{t('wizard.step4.labels.perpetual')} ({unit})</Typography>
                  {(() => { const s = splitFor(pPerp); return (
                    <List dense>
                      <ListItem><ListItemText primary={`${t('wizard.step4.revenue.marketplace')}: ${fmt2Up(s.fee)} ${unit} (${(feeBpsEff/100).toFixed(2)}%)`} /></ListItem>
                      <ListItem><ListItemText primary={`${t('wizard.step4.revenue.creator')}: ${fmt2Up(s.royalty)} ${unit} (${(royaltyBps/100).toFixed(2)}%)`} /></ListItem>
                      <ListItem><ListItemText primary={`${t('wizard.step4.revenue.seller')}: ${fmt2Up(s.seller)} ${unit}`} /></ListItem>
                    </List>
                  ) })()}
                </Paper>
              </Grid>
            )}
            {pSub > 0 && (
              <Grid item xs={12} md={6}>
                <Paper variant="outlined" sx={{ p:1.5, borderRadius:2 }}>
                  <Typography variant="caption" color="text.secondary">{t('wizard.step4.labels.subscriptionPerMonth')} ({unit})</Typography>
                  {(() => { const s = splitFor(pSub); return (
                    <List dense>
                      <ListItem><ListItemText primary={`${t('wizard.step4.revenue.marketplace')}: ${fmt2Up(s.fee)} ${unit} (${(feeBpsEnv/100).toFixed(2)}%)`} /></ListItem>
                      <ListItem><ListItemText primary={`${t('wizard.step4.revenue.creator')}: ${fmt2Up(s.royalty)} ${unit} (${(royaltyBps/100).toFixed(2)}%)`} /></ListItem>
                      <ListItem><ListItemText primary={`${t('wizard.step4.revenue.seller')}: ${fmt2Up(s.seller)} ${unit}`} /></ListItem>
                    </List>
                  ) })()}
                </Paper>
              </Grid>
            )}
          </Grid>
        </Box>
        </Box>
      </Paper>

      <Paper variant="outlined" sx={{ p:{ xs:2, md:3 }, mb:2, borderRadius:2 }}>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight:600 }}>{t('wizard.step4.sections.rights.title')}</Typography>
          <Tooltip title={t('wizard.step4.legends.rightsDelivery')}><InfoOutlinedIcon fontSize="small" color="action" /></Tooltip>
        </Stack>
        <Box sx={{ transition:'opacity 150ms ease 40ms', willChange:'opacity', opacity: shouldFade ? (loadedRemote ? 1 : 0) : 1 }}>
        <FormGroup row sx={{ mb: 2 }}>
          <FormControlLabel control={<Checkbox checked={rightsAPI} onChange={(e)=>setRightsAPI(e.target.checked)} />} label="API" />
          <FormControlLabel control={<Checkbox checked={rightsDownload} onChange={(e)=>setRightsDownload(e.target.checked)} />} label="Download" />
          <FormControlLabel control={<Switch checked={transferable} onChange={(e)=>setTransferable(e.target.checked)} />} label={t('wizard.step4.fields.transferable')} />
        </FormGroup>
        
        <FormControl fullWidth>
          <InputLabel id="delivery-mode-label">{t('wizard.step4.fields.deliveryMode')}</InputLabel>
          <Select labelId="delivery-mode-label" label={t('wizard.step4.fields.deliveryMode')} value={!(rightsAPI||rightsDownload) ? 'none' : deliveryModeHint} onChange={(e)=>{
            const v = String(e.target.value||'') as 'API'|'Download'|'Both'|'none'
            if (v === 'API') { setDeliveryModeHint('API'); setRightsAPI(true); setRightsDownload(false) }
            else if (v === 'Download') { setDeliveryModeHint('Download'); setRightsAPI(false); setRightsDownload(true) }
            else if (v === 'Both') { setDeliveryModeHint('Both'); setRightsAPI(true); setRightsDownload(true) }
            else { setRightsAPI(false); setRightsDownload(false) }
          }}>
            <MenuItem value="none">{t('wizard.step4.delivery.none')}</MenuItem>
            <MenuItem value="API">API</MenuItem>
            <MenuItem value="Download">Download</MenuItem>
            <MenuItem value="Both">Both</MenuItem>
          </Select>
        </FormControl>
        {noRights && (
          <Alert severity="error" sx={{ mt: 1 }}>{t('wizard.step4.validation.chooseRight')}</Alert>
        )}
        </Box>
      </Paper>

      <Paper variant="outlined" sx={{ p:{ xs:2, md:3 }, mb:2, borderRadius:2 }}>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight:600 }}>{t('wizard.step4.sections.terms.title')}</Typography>
          <Tooltip title={t('wizard.step4.sections.terms.help')}><InfoOutlinedIcon fontSize="small" color="action" /></Tooltip>
        </Stack>
        <Box sx={{ transition:'opacity 150ms ease 40ms', willChange:'opacity', opacity: loadingFromDraftRef.current ? 0 : 1 }}>
        <Stack spacing={2}>
          <Stack direction="row" spacing={0.5} sx={{ alignItems:'center' }}>
            <Tooltip title={t('wizard.step4.termsEditor.bold')}><IconButton size="small" onClick={()=>wrap('**')}><FormatBoldIcon fontSize="small" /></IconButton></Tooltip>
            <Tooltip title={t('wizard.step4.termsEditor.italic')}><IconButton size="small" onClick={()=>wrap('*')}><FormatItalicIcon fontSize="small" /></IconButton></Tooltip>
            <Tooltip title={t('wizard.step4.termsEditor.heading')}><IconButton size="small" onClick={()=>withSelection((v,s,e)=>{ const before=v.slice(0,s), sel=v.slice(s,e)||''; const next=before+`## ${sel}`+v.slice(e); const ns=before.length+3, ne=ns+sel.length; return { next, selStart: ns, selEnd: ne } })}><TitleIcon fontSize="small" /></IconButton></Tooltip>
            <Tooltip title={t('wizard.step4.termsEditor.list')}><IconButton size="small" onClick={()=>prefixEachLine('- ')}><FormatListBulletedIcon fontSize="small" /></IconButton></Tooltip>
            <Tooltip title={t('wizard.step4.termsEditor.ordered')}><IconButton size="small" onClick={numberedList}><FormatListNumberedIcon fontSize="small" /></IconButton></Tooltip>
            <Tooltip title={t('wizard.step4.termsEditor.checklist')}><IconButton size="small" onClick={()=>prefixEachLine('- [ ] ')}><CheckBoxIcon fontSize="small" /></IconButton></Tooltip>
            <Tooltip title={t('wizard.step4.termsEditor.link')}><IconButton size="small" onClick={makeLink}><InsertLinkIcon fontSize="small" /></IconButton></Tooltip>
            <Tooltip title={t('wizard.step4.termsEditor.quote')}><IconButton size="small" onClick={()=>prefixEachLine('> ')}><FormatQuoteIcon fontSize="small" /></IconButton></Tooltip>
            <Tooltip title={t('wizard.step4.termsEditor.code')}><IconButton size="small" onClick={()=>wrap('`')}><CodeIcon fontSize="small" /></IconButton></Tooltip>
            <Tooltip title={t('wizard.step4.termsEditor.clear')}><IconButton size="small" onClick={clearMd}><ClearIcon fontSize="small" /></IconButton></Tooltip>
            <Tooltip title={showPreview ? t('wizard.step4.termsEditor.edit') : t('wizard.step4.termsEditor.preview')}><IconButton size="small" onClick={()=>setShowPreview(p=>!p)}>{showPreview ? <EditIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}</IconButton></Tooltip>
          </Stack>
          {mustSignError && (
            <Alert severity="error" sx={{ mt: 1 }}>{t('wizard.step4.validation.termsMustBeSigned')}</Alert>
          )}
          {showPreview ? (
            <Paper variant="outlined" sx={{ p:1.5, borderRadius:2 }}>
              {mdPreviewLines(termsText)}
            </Paper>
          ) : (
            <TextField inputRef={termsRef} label={t('wizard.step4.fields.termsText')} value={termsText} onChange={(e)=>setTermsText(e.target.value)} multiline rows={4} fullWidth helperText={t('wizard.step4.helpers.termsText')} />
          )}
          <Stack direction="row" spacing={1} alignItems="center">
            <Button variant="outlined" onClick={onHashTerms}>{t('wizard.step4.actions.computeHash')}</Button>
            <TextField label={t('wizard.step4.fields.termsHash')} value={termsHash} InputProps={{ readOnly: true, endAdornment: (
              <IconButton size="small" onClick={()=>{ if(termsHash) navigator.clipboard.writeText(termsHash) }}><ContentCopyIcon fontSize="small" /></IconButton>
            ) }} placeholder="0x..." fullWidth />
          </Stack>
        </Stack>
        </Box>
      </Paper>

      <Box sx={{ height: { xs: 76, md: 72 }, mt: 2 }} />

      <Box sx={{ position:'fixed', bottom: 0, left: 0, right: 0, zIndex: (t)=>t.zIndex.appBar + 1 }}>
        <Paper elevation={3} sx={{ borderRadius: 0, px: { xs:1.5, md:2 }, py: 1 }}>
          <Box sx={{ maxWidth: 1000, mx: 'auto', width:'100%' }}>
            <Box sx={{ display:{ xs:'flex', md:'none' }, alignItems:'center', justifyContent:'space-between', width:'100%' }}>
              <Button size="small" href={`${base}/step3`} onClick={(e)=>navigateAfterSave(e, `${base}/step3`)} variant="text" color="inherit" startIcon={<ArrowBackIcon />} sx={{ borderRadius: 2, textTransform:'none', py: 0.75, whiteSpace:'nowrap', fontSize:{ xs:12, md:14 }, '& .MuiButton-startIcon': { mr: 0.5, '& svg': { fontSize: 18 } }, transition:'opacity 120ms ease' }}>
                {t('wizard.common.back')}
              </Button>
              <Button size="small" onClick={()=>onSave('manual')} disabled={saving} variant="text" color="primary" startIcon={<SaveOutlinedIcon />} sx={{ borderRadius: 2, textTransform:'none', py: 0.75, whiteSpace:'nowrap', fontSize:{ xs:12, md:14 }, '& .MuiButton-startIcon': { mr: 0.5, '& svg': { fontSize: 18 } }, transition:'opacity 120ms ease', opacity: saving ? 0.85 : 1 }}>
                {saving? t('wizard.common.saving') : t('wizard.common.saveDraft')}
              </Button>
              <Button size="small" href={`${base}/step5`} onClick={(e)=>navigateAfterSave(e, `${base}/step5`)} disabled={!isValid} variant="text" color="inherit" endIcon={<ArrowForwardIcon />} sx={{ borderRadius: 2, textTransform:'none', py: 0.75, whiteSpace:'nowrap', fontSize:{ xs:12, md:14 }, '& .MuiButton-endIcon': { ml: 0.5, '& svg': { fontSize: 18 } }, transition:'opacity 120ms ease', opacity: !isValid ? 0.85 : 1 }}>
                {t('wizard.common.next')}
              </Button>
            </Box>

            <Box sx={{ display:{ xs:'none', md:'flex' }, alignItems:'center', justifyContent:'space-between', gap: 1.25 }}>
              <Button href={`${base}/step3`} onClick={(e)=>navigateAfterSave(e, `${base}/step3`)} variant="text" color="inherit" startIcon={<ArrowBackIcon />} sx={{ borderRadius: 2, textTransform:'none', py: 1, transition:'opacity 120ms ease' }}>
                {t('wizard.common.back')}
              </Button>
              <Box sx={{ display:'flex', gap: 1.25 }}>
                <Button onClick={()=>onSave('manual')} disabled={saving} variant="text" color="primary" startIcon={<SaveOutlinedIcon />} sx={{ borderRadius: 2, textTransform:'none', py: 1, transition:'opacity 120ms ease', opacity: saving ? 0.85 : 1 }}>
                  {saving? t('wizard.common.saving') : t('wizard.common.saveDraft')}
                </Button>
                <Button href={`${base}/step5`} onClick={(e)=>navigateAfterSave(e, `${base}/step5`)} disabled={!isValid} variant="text" color="inherit" endIcon={<ArrowForwardIcon />} sx={{ borderRadius: 2, textTransform:'none', py: 1, transition:'opacity 120ms ease', opacity: !isValid ? 0.85 : 1 }}>
                  {t('wizard.common.next')}
                </Button>
              </Box>
            </Box>
          </Box>
        </Paper>
      </Box>

      {msg && <p>{msg}</p>}
    </Box>
    </Box>
  )
}
