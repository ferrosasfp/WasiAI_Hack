"use client";
import React from 'react'
import { useMemo, useState, useEffect, useRef } from 'react'
import { useWalletAddress } from '@/hooks/useWalletAddress'
import { Box, Stack, Typography, Paper, Tooltip, TextField, Grid, InputAdornment, IconButton, Alert, FormGroup, FormControlLabel, Checkbox, FormControl, InputLabel, Select, MenuItem, Button, List, ListItem, ListItemText, SvgIcon, Switch, ToggleButtonGroup, ToggleButton, FormHelperText, Dialog, DialogTitle, DialogContent, DialogActions, Autocomplete } from '@mui/material'
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
import WizardFooter from '@/components/WizardFooter'

import VisibilityIcon from '@mui/icons-material/Visibility'
import EditIcon from '@mui/icons-material/Edit'
import { useLocale, useTranslations } from 'next-intl'
import WizardThemeProvider from '@/components/WizardThemeProvider'
import { CHAIN_IDS, getChainConfig, getNativeSymbol, getMarketAddress, getRpcUrl, MARKETPLACE_FEE_BPS, ROYALTY_LIMITS, percentToBps, validateRoyaltyPercent, calculateRevenueSplit, formatAmount } from '@/config'
import { getDraftId } from '@/lib/draft-utils'
import { useWizardNavGuard } from '@/hooks/useWizardNavGuard'
import { saveStep as saveStepCentralized, loadDraft as loadDraftCentralized } from '@/lib/wizard-draft-service'

export const dynamic = 'force-dynamic'

export default function Step4LicensesTermsLocalized() {
  const t = useTranslations()
  const locale = useLocale()
  const base = `/${locale}/publish/wizard`
  
  // Helper to build URLs preserving upgrade query params
  const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null
  const upgradeMode = searchParams?.get('mode') === 'upgrade'
  const upgradeModelId = searchParams?.get('modelId')
  const buildWizardUrl = (path: string) => {
    if (upgradeMode && upgradeModelId) {
      return `${path}?mode=upgrade&modelId=${upgradeModelId}`
    }
    return path
  }
  
  // Use navigation guard to warn when leaving wizard
  const { setDirty: setWizardDirty } = useWizardNavGuard(upgradeMode, upgradeModelId, true)
  
  const [saving, setSaving] = useState(false)
  const [pricePerpetual, setPricePerpetual] = useState('0')
  const [priceSubscription, setPriceSubscription] = useState('0')
  const [priceInference, setPriceInference] = useState('0.01') // x402 inference price in USDC
  const [defaultDurationDays, setDefaultDurationDays] = useState('1')
  const [royaltyPercent, setRoyaltyPercent] = useState('0')
  const [transferable, setTransferable] = useState(false)
  const [rightsAPI, setRightsAPI] = useState(true)
  const [rightsDownload, setRightsDownload] = useState(false)
  const [deliveryModeHint, setDeliveryModeHint] = useState<'API'|'Download'|'Both'|'none'>('API')
  const [termsText, setTermsText] = useState('')
  const [termsHash, setTermsHash] = useState('')
  const [termsSummary, setTermsSummary] = useState('')
  const [pricingMode, setPricingMode] = useState<'perpetual'|'subscription'|'both'>('both')
  const [selectedTemplate, setSelectedTemplate] = useState<string>('')
  const [confirmTemplateDialog, setConfirmTemplateDialog] = useState(false)
  const [pendingTemplate, setPendingTemplate] = useState<string | null>(null)
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
  const [unit, setUnit] = useState<'USDC'>('USDC') // License payments are now in USDC
  const [chainId, setChainId] = useState<number | null>(null)
  const [feeBpsOnChain, setFeeBpsOnChain] = useState<number | null>(null)
  const [shouldFade, setShouldFade] = useState(true)
  const [loadedRemote, setLoadedRemote] = useState(false)
  const isResetting = () => { try { return localStorage.getItem('wizard_resetting')==='1' || sessionStorage.getItem('wizard_resetting')==='1' } catch { return false } }
  
  // Sync dirty state with wizard guard when pricing/terms change
  useEffect(() => {
    if (loadedRemote && (pricePerpetual !== '0' || priceSubscription !== '0' || termsText)) {
      setWizardDirty(true)
    }
  }, [pricePerpetual, priceSubscription, termsText, loadedRemote, setWizardDirty])

  const MARKET_ADDRS: Record<number, string> = useMemo(() => {
    // Use centralized chain configuration (Avalanche only)
    const ids = [CHAIN_IDS.AVALANCHE_FUJI, CHAIN_IDS.AVALANCHE_MAINNET]
    return Object.fromEntries(ids.map(id => [id, getMarketAddress(id) || '']))
  }, [])

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
  // Use centralized fee configuration
  const feeBpsEnv = MARKETPLACE_FEE_BPS
  const feeBpsEff = feeBpsOnChain ?? feeBpsEnv
  const royaltyBps = percentToBps(validateRoyaltyPercent(royaltyPercent))
  
  // Validation based on pricing mode
  const atLeastOnePrice = (
    pricingMode === 'perpetual' ? pPerp > 0 :
    pricingMode === 'subscription' ? pSub > 0 :
    /* both */ (pPerp > 0 || pSub > 0)
  )
  const subNeedsDuration = pSub > 0 && dMonths <= 0
  const invalidPerp = !Number.isFinite(pPerp) || pPerp < 0
  const invalidSub = !Number.isFinite(pSub) || pSub < 0
  const invalidDur = !Number.isFinite(dMonths) || dMonths < 0 || !Number.isInteger(dMonths) || dMonths > 12 || subNeedsDuration
  const noRights = !(rightsAPI || rightsDownload)
  const isValid = atLeastOnePrice && !invalidPerp && !invalidSub && !invalidDur && !noRights
  const subDisabled = pSub <= 0 || pricingMode === 'perpetual'

  const splitFor = (amount: number) => calculateRevenueSplit(amount, royaltyBps, feeBpsEff)

  const fmt2Up = (v:number) => formatAmount(v)
  // Format to 4 decimals rounded up for USDC inference amounts
  const fmt4Up = (v:number) => {
    const rounded = Math.ceil(v * 10000) / 10000
    return rounded.toFixed(4)
  }

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

  const onApplyTemplate = (template: string) => {
    const templateKey = template as 'standard' | 'eval' | 'opensource'
    const content = t(`wizard.step4.templatesContent.${templateKey}`)
    if (termsText.trim().length > 0) {
      setPendingTemplate(content)
      setConfirmTemplateDialog(true)
    } else {
      setTermsText(content)
      setSelectedTemplate(template)
    }
  }

  const confirmApplyTemplate = () => {
    if (pendingTemplate) {
      setTermsText(pendingTemplate)
      setPendingTemplate(null)
    }
    setConfirmTemplateDialog(false)
  }

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
        pricingMode,
        termsSummary,
        licensePolicy: {
          rights: rightsMask,
          subscription: { perMonthPriceRef: priceSubscription },
          perpetual: { priceRef: pricePerpetual },
          inference: { 
            pricePerCall: priceInference  // x402 price in USDC (endpoint configured in Step 3)
          },
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
      // Use centralized service (handles localStorage + server sync)
      await saveStepCentralized('step4', payload.data, upgradeMode, upgradeModelId)
      setMsg(t('wizard.common.saved'))
      lastSavedRef.current = payload.data
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
  }, [pricePerpetual, priceSubscription, priceInference, defaultDurationDays, transferable, rightsAPI, rightsDownload, deliveryModeHint, termsText, termsHash, pricingMode, termsSummary])

  useEffect(() => {
    const text = (termsText || '').trim()
    if (text.length === 0) setMustSignError(false)
  }, [termsText])

  // Load data: In upgrade mode, ALWAYS load from existing model first
  useEffect(() => {
    let alive = true
    loadingFromDraftRef.current = true
    
    // Helper: Convert USDC (6 decimals) to human-readable
    const usdcToHuman = (usdc: string | number | bigint): string => {
      try {
        const usdcBig = BigInt(String(usdc || '0'))
        if (usdcBig === 0n) return '0'
        const usdcStr = usdcBig.toString().padStart(7, '0')
        const intPart = usdcStr.slice(0, -6) || '0'
        const decPart = usdcStr.slice(-6).replace(/0+$/, '')
        if (!decPart) return intPart
        return `${intPart}.${decPart}`
      } catch {
        return '0'
      }
    }
    
    // UPGRADE MODE: First check for saved draft, then fall back to original model
    if (upgradeMode && upgradeModelId) {
      const draftId = getDraftId(true, upgradeModelId)
      
      // Check if there's a saved draft first (user may have edited and navigated away)
      let hasSavedDraft = false
      try {
        const savedDraft = localStorage.getItem(`draft_step4_${draftId}`)
        if (savedDraft) {
          const parsed = JSON.parse(savedDraft)
          if (parsed?.licensePolicy) {
            console.log('[Step4] UPGRADE MODE - Found saved draft, loading from localStorage')
            const lp = parsed.licensePolicy || {}
            const rights = Array.isArray(lp.rights) ? lp.rights : (Array.isArray(lp.delivery) ? lp.delivery : [])
            setRightsAPI(rights.includes('API'))
            setRightsDownload(rights.includes('Download'))
            setPriceSubscription(String(lp.subscription?.perMonthPriceRef ?? '0'))
            setPricePerpetual(String(lp.perpetual?.priceRef ?? '0'))
            setPriceInference(String(lp.inference?.pricePerCall ?? '0.01'))
            setRoyaltyPercent(String(validateRoyaltyPercent(Number(lp.royaltyBps || 0) / 100)))
            const dd = Number(lp.defaultDurationDays || 0)
            setDefaultDurationDays(String(Math.max(0, Math.round(dd/30))))
            setTransferable(Boolean(lp.transferable))
            setTermsHash(String(lp.termsHash || ''))
            setTermsText(String(lp.termsText || ''))
            setPricingMode(((parsed.pricingMode as any) === 'free' ? 'both' : (parsed.pricingMode as any)) || 'both')
            setTermsSummary(String(parsed.termsSummary || ''))
            if (rights.includes('API') && rights.includes('Download')) setDeliveryModeHint('Both')
            else if (rights.includes('API')) setDeliveryModeHint('API')
            else if (rights.includes('Download')) setDeliveryModeHint('Download')
            else setDeliveryModeHint('none')
            lastSavedRef.current = parsed
            hasSavedDraft = true
            setShouldFade(false)
            setLoadedRemote(true)
            loadingFromDraftRef.current = false
          }
        }
      } catch (e) {
        console.warn('[Step4] Failed to load draft from localStorage:', e)
      }
      
      // If no saved draft, load from original model
      if (!hasSavedDraft) {
        console.log('[Step4] UPGRADE MODE - No saved draft, loading from model:', upgradeModelId)
        fetch(`/api/indexed/models/${upgradeModelId}`)
        .then(res => res.json())
        .then(data => {
          if (!alive) return
          const modelData = data?.model
          if (!modelData) {
            console.error('[Step4] Model not found')
            return
          }
          const meta = modelData?.metadata || {}
          
          // === PRICES (convert from USDC 6 decimals) ===
          const pricePerpUsdc = String(modelData?.price_perpetual || '0')
          const priceSubUsdc = String(modelData?.price_subscription || '0')
          const perpHuman = usdcToHuman(pricePerpUsdc)
          const subHuman = usdcToHuman(priceSubUsdc)
          
          console.log('[Step4] Prices:', { pricePerpUsdc, priceSubUsdc, perpHuman, subHuman })
          setPricePerpetual(perpHuman)
          setPriceSubscription(subHuman)
          
          // === DURATION (days to months) ===
          const durationDays = Number(modelData?.default_duration_days || 0)
          const durationMonths = durationDays > 0 ? Math.max(1, Math.round(durationDays / 30)) : 1
          console.log('[Step4] Duration:', { durationDays, durationMonths })
          setDefaultDurationDays(String(durationMonths))
          
          // === ROYALTY (bps to percent) ===
          const royaltyBps = Number(modelData?.royalty_bps || 0)
          const royaltyPct = validateRoyaltyPercent(royaltyBps / 100)
          console.log('[Step4] Royalty:', { royaltyBps, royaltyPct })
          setRoyaltyPercent(String(royaltyPct))
          
          // === RIGHTS & DELIVERY ===
          const deliveryRightsMask = Number(modelData?.delivery_rights_default || 0)
          const hasAPI = (deliveryRightsMask & 1) !== 0
          const hasDownload = (deliveryRightsMask & 2) !== 0
          console.log('[Step4] Rights:', { deliveryRightsMask, hasAPI, hasDownload })
          setRightsAPI(hasAPI)
          setRightsDownload(hasDownload)
          
          const deliveryModeHintValue = Number(modelData?.delivery_mode_hint || 1)
          if (hasAPI && hasDownload) setDeliveryModeHint('Both')
          else if (hasDownload) setDeliveryModeHint('Download')
          else setDeliveryModeHint('API')
          
          // === TRANSFERABLE ===
          const lp = meta?.licensePolicy || {}
          const isTransferable = lp.transferable === true || (lp.rights?.transferable === true)
          setTransferable(isTransferable)
          
          // === TERMS ===
          const termsObj = lp.terms || {}
          const termsTextValue = termsObj.textMarkdown || lp.termsText || meta.termsText || ''
          const rawSummary = termsObj.summaryBullets || lp.termsSummary || meta.termsSummary || ''
          const termsSummaryValue = Array.isArray(rawSummary) ? rawSummary.join('\n') : String(rawSummary || '')
          const termsHashValue = termsObj.termsHash || lp.termsHash || modelData?.terms_hash || ''
          
          console.log('[Step4] Terms:', { 
            termsTextValue: termsTextValue?.substring(0, 50), 
            termsSummaryValue: termsSummaryValue?.substring(0, 50), 
            termsHashValue 
          })
          
          setTermsText(termsTextValue)
          setTermsSummary(termsSummaryValue)
          setTermsHash(termsHashValue)
          
          // === PRICING MODE ===
          const hasPerpPrice = BigInt(pricePerpUsdc) > 0n
          const hasSubPrice = BigInt(priceSubUsdc) > 0n
          if (hasPerpPrice && hasSubPrice) setPricingMode('both')
          else if (hasPerpPrice) setPricingMode('perpetual')
          else if (hasSubPrice) setPricingMode('subscription')
          else setPricingMode('both')
          
          setShouldFade(false)
          setLoadedRemote(true)
        })
        .catch(err => {
          console.error('[Step4] Failed to load model:', err)
        })
        .finally(() => {
          loadingFromDraftRef.current = false
        })
      } // end if (!hasSavedDraft)
      return () => { alive = false }
    }
    
    // NON-UPGRADE MODE: Load from draft/localStorage
    const draftId = getDraftId(false, null)
    if (!isResetting()) {
      try {
        const raw = localStorage.getItem(`draft_step4_${draftId}`) || localStorage.getItem('draft_step4')
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
          const inf = lp.inference || {}
          setPriceInference(String(inf.pricePerCall ?? '0.01'))
          const rbps = Number(lp.royaltyBps || 0)
          setRoyaltyPercent(String(validateRoyaltyPercent(rbps / 100)))
          const dd = Number(lp.defaultDurationDays || 0)
          setDefaultDurationDays(String(Math.max(0, Math.round(dd/30))))
          setTransferable(Boolean(lp.transferable))
          setTermsHash(String(lp.termsHash || ''))
          setTermsText(String(lp.termsText || ''))
          setPricingMode(((c.pricingMode as any) === 'free' ? 'both' : (c.pricingMode as any)) || 'both')
          setTermsSummary(String(c.termsSummary || ''))
          if (rights.includes('API') && rights.includes('Download')) setDeliveryModeHint('Both')
          else if (rights.includes('API')) setDeliveryModeHint('API')
          else if (rights.includes('Download')) setDeliveryModeHint('Download')
          else setDeliveryModeHint('none')
          lastSavedRef.current = { licensePolicy: lp }
          setShouldFade(false)
        }
      } catch {}
    }
    
    loadDraftCentralized(upgradeMode, upgradeModelId).then(async (draftData) => {
      if (!alive) return
      const s4 = draftData?.step4
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
        const inf = lp.inference || {}
        setPriceInference(String(inf.pricePerCall ?? '0.01'))
        setRoyaltyPercent(String(validateRoyaltyPercent(Number(lp.royaltyBps || 0) / 100)))
        const dd = Number(lp.defaultDurationDays || 0)
        setDefaultDurationDays(String(Math.max(0, Math.round(dd/30))))
        setTransferable(Boolean(lp.transferable))
        setTermsHash(String(lp.termsHash || ''))
        setTermsText(String(lp.termsText || ''))
        setPricingMode(((s4.pricingMode as any) === 'free' ? 'both' : (s4.pricingMode as any)) || 'both')
        setTermsSummary(String(s4.termsSummary || ''))
        if (rights.includes('API') && rights.includes('Download')) setDeliveryModeHint('Both')
        else if (rights.includes('API')) setDeliveryModeHint('API')
        else if (rights.includes('Download')) setDeliveryModeHint('Download')
        else setDeliveryModeHint('none')
      } catch {}
    }).catch(() => {}).finally(() => { 
      loadingFromDraftRef.current = false
      setLoadedRemote(true) 
    })
    
    return () => { alive = false }
  }, [upgradeMode, upgradeModelId])

  useEffect(() => {
    let mounted = true
    const eth = (window as any)?.ethereum
    const applyByChain = (chainIdHex?: string) => {
      try {
        const id = chainIdHex ? parseInt(chainIdHex, 16) : null
        if (id) {
          setChainId(id)
          // License payments are always in USDC now
        }
      } catch {}
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
          // Public RPC fallback using centralized config
          const url = chainId ? getRpcUrl(chainId) : null
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
    <WizardThemeProvider>
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
        
        {/* Pricing Mode - Simplified: Only perpetual + x402 pay-per-use */}
        {/* Subscription mode hidden for hackathon MVP - kept in code for future use */}
        {false && (
        <FormControl component="fieldset" sx={{ mb: 3 }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>{t('wizard.step4.pricingMode.label')}</Typography>
          <ToggleButtonGroup
            value={pricingMode}
            exclusive
            onChange={(_, value) => {
              if (!value) return
              setPricingMode(value)
              if (value === 'perpetual') {
                setPriceSubscription('0')
                setDefaultDurationDays('0')
              } else if (value === 'subscription') {
                setPricePerpetual('0')
              }
            }}
            aria-label={t('wizard.step4.pricingMode.label')}
            sx={{
              flexWrap: 'wrap',
              '& .MuiToggleButton-root': {
                color: '#fff',
                borderColor: 'rgba(255,255,255,0.6)',
              },
              // Selected default (no hover): black text on white background
              '& .MuiToggleButton-root.Mui-selected': {
                color: '#000',
                backgroundColor: '#fff',
                borderColor: '#fff',
              },
              // While pointer is interacting (hover/active/focus), keep white text and transparent bg
              '& .MuiToggleButton-root.Mui-selected:hover': {
                color: '#e6e6e3',
                backgroundColor: 'transparent',
                borderColor: '#fff',
              },
              '& .MuiToggleButton-root.Mui-selected.Mui-focusVisible': {
                color: '#e6e6e6',
                backgroundColor: 'transparent',
                borderColor: '#fff',
              },
              '& .MuiToggleButton-root.Mui-selected.Mui-active': {
                color: '#e6e6e6',
                backgroundColor: 'transparent',
                borderColor: '#fff',
              }
            }}
          >
            <ToggleButton value="perpetual" aria-label={t('wizard.step4.pricingMode.perpetual')}>
              {t('wizard.step4.pricingMode.perpetual')}
            </ToggleButton>
            <ToggleButton value="subscription" aria-label={t('wizard.step4.pricingMode.subscription')}>
              {t('wizard.step4.pricingMode.subscription')}
            </ToggleButton>
            <ToggleButton value="both" aria-label={t('wizard.step4.pricingMode.both')}>
              {t('wizard.step4.pricingMode.both')}
            </ToggleButton>
          </ToggleButtonGroup>
        </FormControl>
        )}

        <Grid container spacing={2}>
          <Grid item xs={12} md={4}>
            <TextField
              label={t('wizard.step4.fields.perpetual')}
              type="number"
              fullWidth
              value={pricePerpetual}
              onChange={(e)=>setPricePerpetual(e.target.value)}
              error={invalidPerp}
              disabled={pricingMode === 'subscription'}
              helperText={invalidPerp ? t('wizard.step4.validation.intNonNegative') : ' '}
              inputProps={{ step: '0.01' }}
              InputProps={{ 
                startAdornment: <InputAdornment position="start" sx={{ color:'#fff', '& .MuiTypography-root': { color:'#fff' } }}>$</InputAdornment>,
                endAdornment: <InputAdornment position="end" sx={{ color:'#fff', '& .MuiTypography-root': { color:'#fff' } }}>{unit}</InputAdornment> 
              }}
            />
          </Grid>
          {/* Subscription fields hidden for hackathon MVP - only perpetual + x402 */}
          {false && (
          <>
          <Grid item xs={12} md={4}>
            <TextField
              label={t('wizard.step4.fields.subscriptionPerMonth')}
              type="number"
              fullWidth
              value={priceSubscription}
              onChange={(e)=>setPriceSubscription(e.target.value)}
              error={invalidSub}
              disabled={pricingMode === 'perpetual'}
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
          </>
          )}
          <Grid item xs={12} md={4}>
            <TextField
              label={locale==='es' ? 'Royalty del creador (%)' : 'Creator royalty (%)'}
              type="text"
              fullWidth
              value={royaltyPercent}
              onChange={(e)=>{
                const raw = (e.target.value || '').replace(/[^0-9]/g, '')
                const n = validateRoyaltyPercent(raw === '' ? 0 : parseInt(raw, 10))
                setRoyaltyPercent(String(n))
              }}
              onBlur={()=>{
                const n = validateRoyaltyPercent(parseInt(String(royaltyPercent||'0'), 10) || 0)
                setRoyaltyPercent(String(n))
              }}
              inputProps={{ inputMode: 'numeric', pattern: '[0-9]*', min: ROYALTY_LIMITS.MIN_PERCENT, max: ROYALTY_LIMITS.MAX_PERCENT }}
              InputProps={{ endAdornment: (<InputAdornment position="end" sx={{ color:'#fff', '& .MuiTypography-root': { color:'#fff' } }}>%</InputAdornment>) }}
              helperText={`${ROYALTY_LIMITS.MIN_PERCENT}–${ROYALTY_LIMITS.MAX_PERCENT}%`}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              label={locale==='es' ? 'Precio por inferencia (x402)' : 'Price per inference (x402)'}
              type="number"
              fullWidth
              value={priceInference}
              onChange={(e)=>setPriceInference(e.target.value)}
              inputProps={{ step: '0.01', min: 0 }}
              InputProps={{ endAdornment: <InputAdornment position="end" sx={{ color:'#4fe1ff', '& .MuiTypography-root': { color:'#4fe1ff' } }}>USDC</InputAdornment> }}
              helperText={locale==='es' ? 'Pago por uso via protocolo x402 (gasless)' : 'Pay-per-use via x402 protocol (gasless)'}
              sx={{ '& .MuiOutlinedInput-root': { borderColor: 'rgba(79, 225, 255, 0.3)' } }}
            />
          </Grid>
        </Grid>
        
        {/* x402 Inference Configuration */}
        {/* Note: Inference endpoint is configured in Step 3 */}
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
                    <Box sx={{ mt: 1 }}>
                      <Typography variant="h6" sx={{ fontWeight: 700, color: '#4caf50', mb: 1 }}>
                        {t('wizard.step4.revenue.seller')}: {fmt2Up(s.seller)} {unit} ({((s.seller/pPerp)*100).toFixed(1)}%)
                      </Typography>
                      <Stack spacing={0.5}>
                        <Typography variant="caption" color="text.secondary">
                          {t('wizard.step4.revenue.marketplace')}: {fmt2Up(s.fee)} {unit} ({(feeBpsEff/100).toFixed(2)}%)
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {t('wizard.step4.revenue.creator')}: {fmt2Up(s.royalty)} {unit} ({(royaltyBps/100).toFixed(2)}%)
                        </Typography>
                      </Stack>
                    </Box>
                  ) })()}
                </Paper>
              </Grid>
            )}
            {/* Subscription split - Hidden for hackathon */}
            
            {/* x402 Inference Revenue Split */}
            {Number(priceInference) > 0 && (
              <Grid item xs={12} md={6}>
                <Paper variant="outlined" sx={{ p:1.5, borderRadius:2, border: '1px solid rgba(79, 225, 255, 0.3)', bgcolor: 'rgba(79, 225, 255, 0.02)' }}>
                  <Typography variant="caption" sx={{ color: '#4fe1ff' }}>
                    ⚡ {locale === 'es' ? 'Inferencia x402 (USDC)' : 'x402 Inference (USDC)'}
                  </Typography>
                  {(() => { 
                    const pInf = Number(priceInference || 0)
                    const s = splitFor(pInf)
                    return (
                      <Box sx={{ mt: 1 }}>
                        <Typography variant="h6" sx={{ fontWeight: 700, color: '#4fe1ff', mb: 1 }}>
                          {t('wizard.step4.revenue.seller')}: ${fmt4Up(s.seller)} ({((s.seller/pInf)*100).toFixed(1)}%)
                        </Typography>
                        <Stack spacing={0.5}>
                          <Typography variant="caption" color="text.secondary">
                            {t('wizard.step4.revenue.marketplace')}: ${fmt4Up(s.fee)} ({(feeBpsEff/100).toFixed(2)}%)
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {t('wizard.step4.revenue.creator')}: ${fmt4Up(s.royalty)} ({(royaltyBps/100).toFixed(2)}%)
                          </Typography>
                        </Stack>
                      </Box>
                    )
                  })()}
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
        <Stack spacing={1} sx={{ mb: 2 }}>
          <FormControlLabel 
            control={<Checkbox checked={rightsAPI} onChange={(e)=>setRightsAPI(e.target.checked)} />} 
            label={
              <Box>
                <Typography variant="body2">API</Typography>
                <Typography variant="caption" color="text.secondary">{t('wizard.step4.rightsHelpers.api')}</Typography>
              </Box>
            } 
          />
          <FormControlLabel 
            control={<Checkbox checked={rightsDownload} onChange={(e)=>setRightsDownload(e.target.checked)} />} 
            label={
              <Box>
                <Typography variant="body2">Download</Typography>
                <Typography variant="caption" color="text.secondary">{t('wizard.step4.rightsHelpers.download')}</Typography>
              </Box>
            } 
          />
          <FormControlLabel 
            control={<Switch checked={transferable} onChange={(e)=>setTransferable(e.target.checked)} />} 
            label={
              <Box>
                <Typography variant="body2">{t('wizard.step4.fields.transferable')}</Typography>
                <Typography variant="caption" color="text.secondary">{t('wizard.step4.rightsHelpers.transferable')}</Typography>
              </Box>
            } 
          />
        </Stack>
        {rightsDownload && transferable && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            {t('wizard.step4.alerts.downloadTransferable')}
          </Alert>
        )}
        
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
          
          {/* Terms Summary Field */}
          <TextField
            label={t('wizard.step4.fields.termsSummary')}
            value={termsSummary}
            onChange={(e)=>setTermsSummary(e.target.value)}
            multiline
            rows={3}
            fullWidth
            helperText={t('wizard.step4.helpers.termsSummary')}
            placeholder={locale === 'es' ? 'Ej:\n- Sin uso en producción\n- Atribución requerida\n- 30 días de soporte' : 'E.g.:\n- No production use\n- Attribution required\n- 30 days support'}
          />

          {/* Terms Template Selector */}
          <FormControl fullWidth>
            <InputLabel>{t('wizard.step4.templates.label')}</InputLabel>
            <Select
              value={selectedTemplate}
              onChange={(e) => {
                const val = e.target.value
                setSelectedTemplate(val)
                if (val) onApplyTemplate(val)
              }}
              label={t('wizard.step4.templates.label')}
            >
              <MenuItem value="">{t('wizard.step4.templates.placeholder')}</MenuItem>
              <MenuItem value="standard">{t('wizard.step4.templates.standard')}</MenuItem>
              <MenuItem value="eval">{t('wizard.step4.templates.eval')}</MenuItem>
              <MenuItem value="opensource">{t('wizard.step4.templates.opensource')}</MenuItem>
            </Select>
            <FormHelperText>{locale === 'es' ? 'Opcional. Selecciona una plantilla para llenar el editor de términos.' : 'Optional. Select a template to fill the terms editor.'}</FormHelperText>
          </FormControl>
        
        
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
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
              {t('wizard.step4.helpers.signExplanation')}
            </Typography>
            <Stack direction="row" spacing={1} alignItems="center">
              <Button variant="outlined" onClick={onHashTerms}>{t('wizard.step4.actions.computeHash')}</Button>
              <TextField label={t('wizard.step4.fields.termsHash')} value={termsHash} InputProps={{ readOnly: true, endAdornment: (
                <IconButton size="small" onClick={()=>{ if(termsHash) navigator.clipboard.writeText(termsHash) }}><ContentCopyIcon fontSize="small" /></IconButton>
              ) }} placeholder="0x..." fullWidth />
            </Stack>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
              {t('wizard.step4.helpers.hashExplanation')}
            </Typography>
          </Box>
        </Stack>
        </Box>
      </Paper>

      {/* Template Confirmation Dialog */}
      <Dialog open={confirmTemplateDialog} onClose={() => setConfirmTemplateDialog(false)}>
        <DialogTitle>{locale === 'es' ? '¿Reemplazar términos?' : 'Replace terms?'}</DialogTitle>
        <DialogContent>
          <Typography>
            {locale === 'es' 
              ? 'Ya tienes texto en el editor. ¿Quieres reemplazarlo con la plantilla seleccionada?' 
              : 'You already have text in the editor. Do you want to replace it with the selected template?'}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setConfirmTemplateDialog(false); setPendingTemplate(null); setSelectedTemplate('') }}>
            {locale === 'es' ? 'Cancelar' : 'Cancel'}
          </Button>
          <Button onClick={confirmApplyTemplate} variant="contained">
            {locale === 'es' ? 'Reemplazar' : 'Replace'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Final Reminder */}
      <Alert severity="info" icon={<InfoOutlinedIcon />} sx={{ mb: 2 }}>
        {t('wizard.step4.finalReminder')}
      </Alert>

      <Box sx={{ height: { xs: 76, md: 76 }, mt: 2 }} />

      <WizardFooter
        currentStep={4}
        totalSteps={5}
        stepTitle={t('wizard.step4.title')}
        onBack={( )=>{ /* keep save before back */ navigateAfterSave({ preventDefault:()=>{} } as any, buildWizardUrl(`${base}/step3`)) }}
        onSaveDraft={()=> onSave('manual')}
        onNext={( )=>{ navigateAfterSave({ preventDefault:()=>{} } as any, buildWizardUrl(`${base}/step5`)) }}
        isNextDisabled={!isValid}
        isSaving={saving}
        isLastStep={false}
        backLabel={t('wizard.common.back')}
        saveDraftLabel={t('wizard.common.saveDraft')}
        savingLabel={t('wizard.common.saving')}
        nextLabel={t('wizard.common.next')}
        publishLabel={t('wizard.index.publish')}
      />

      {msg && <p>{msg}</p>}
    </Box>
    </Box>
    </WizardThemeProvider>
  )
}
