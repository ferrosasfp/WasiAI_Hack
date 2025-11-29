"use client";
import { useMemo, useRef, useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  Box,
  Stack,
  TextField,
  Typography,
  Button,
  Avatar,
  Chip,
  Autocomplete,
  FormHelperText,
  Grid,
  Paper,
  Divider,
  Tooltip,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  LinearProgress,
  SvgIcon,
  Skeleton,
  Switch,
  FormControlLabel,
  CircularProgress
} from '@mui/material'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import { ipfsToHttp, getAllGateways } from '@/config'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import RefreshIcon from '@mui/icons-material/Refresh'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import GitHubIcon from '@mui/icons-material/GitHub'
import LanguageIcon from '@mui/icons-material/Language'
import LinkedInIcon from '@mui/icons-material/LinkedIn'
import { useWalletAddress } from '@/hooks/useWalletAddress'
import { BUSINESS_CATEGORIES, MODEL_TYPES as BUSINESS_MODEL_TYPES, MODEL_TYPES_BY_BUSINESS as MT_BY_BUSINESS, MODEL_TYPE_I18N, type BusinessCategoryValue, type ModelTypeValue } from '@/constants/business'
import { useLocale, useTranslations } from 'next-intl'
import { TECHNICAL_CATEGORIES, TECH_TAG_OPTIONS as ALL_TECH_TAGS, TECH_TAGS_BY_CATEGORY, TECH_TAG_I18N, type TechnicalCategoryValue } from '@/constants/classification'
import WizardFooter from '@/components/WizardFooter'
import SelectField from '@/components/SelectField'
import WizardThemeProvider from '@/components/WizardThemeProvider'
import { saveDraft as saveDraftUtil, loadDraft as loadDraftUtil, getDraftId } from '@/lib/draft-utils'
import { useWizardNavGuard } from '@/hooks/useWizardNavGuard'
import { saveStep as saveStepCentralized } from '@/lib/wizard-draft-service'

export const dynamic = 'force-dynamic'

// Session key to track if user came from within wizard
const WIZARD_SESSION_KEY = 'wizard_active_session'

const XIcon = (props: any) => (
  <SvgIcon {...props} viewBox="0 0 24 24">
    <path d="M3 2l8 10-8 10h3l6.5-8L19 22h3l-8-10 8-10h-3l-6.5 8L6 2H3z" fill="currentColor" />
  </SvgIcon>
)

export default function Step1BasicsLocalized() {
  const t = useTranslations()
  const locale = useLocale()
  const base = `/${locale}/publish/wizard`
  const searchParams = useSearchParams()
  const upgradeMode = searchParams.get('mode') === 'upgrade'
  const upgradeModelId = searchParams.get('modelId')
  
  // Helper to build URLs preserving upgrade query params
  const buildWizardUrl = (path: string) => {
    if (upgradeMode && upgradeModelId) {
      return `${path}?mode=upgrade&modelId=${upgradeModelId}`
    }
    return path
  }

  // Locale-based literals for microtexts (ES/EN)
  const isES = String(locale || '').toLowerCase().startsWith('es')
  const TXT = {
    upgradeOn: isES ? 'Actualizar modelo existente' : 'Upgrade existing model',
    upgradeOff: isES ? 'Nuevo modelo' : 'New model',
    slugLabel: isES ? 'Identificador del modelo (para URL)' : 'Model identifier (for URL)',
    statusAvailable: isES ? 'disponible' : 'available',
    statusTaken: isES ? 'ocupado' : 'taken',
    statusWillUpgrade: isES ? 'actualizará' : 'will upgrade',
    suggestion: isES ? 'sugerencia' : 'suggestion',
    use: isES ? 'Usar' : 'Use',
    slugHelper: isES ? 'autogenerado desde el nombre; puedes editarlo' : 'auto-generated from name; you can edit it'
  }
  const COMMON = {
    loadingDraft: isES ? 'Cargando borrador…' : 'Loading draft…',
    uploadInProgress: isES ? 'Subida en curso…' : 'Upload in progress…'
  }
  const isResetting = () => { try { return localStorage.getItem('wizard_resetting')==='1' || sessionStorage.getItem('wizard_resetting')==='1' } catch { return false } }

  const [saving, setSaving] = useState(false)
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [slugTouched, setSlugTouched] = useState(false)
  const [isUpgrade, setIsUpgrade] = useState(upgradeMode)
  const [upgradingModelId, setUpgradingModelId] = useState<string | null>(upgradeModelId)
  const [loadingExistingModel, setLoadingExistingModel] = useState(false)
  const [slugCheckLoading, setSlugCheckLoading] = useState(false)
  const [slugCheck, setSlugCheck] = useState<{ ok?: boolean; reserved?: boolean; reason?: string; error?: string; slug?: string; ttlMs?: number } | null>(null)
  const slugCheckTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [slugSuggestion, setSlugSuggestion] = useState<string>('')
  const [shortSummary, setShortSummary] = useState('')
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [coverPreview, setCoverPreview] = useState('')
  const [coverCid, setCoverCid] = useState<string>('')
  const [coverThumbCid, setCoverThumbCid] = useState<string>('')
  const [coverMime, setCoverMime] = useState<string>('')
  const [coverSize, setCoverSize] = useState<number>(0)
  const [coverUploading, setCoverUploading] = useState<boolean>(false)
  const [coverMsg, setCoverMsg] = useState<string>('')
  const [coverDisplayUrl, setCoverDisplayUrl] = useState<string>('')
  const [promoting, setPromoting] = useState<boolean>(false)
  const [coverVersion, setCoverVersion] = useState<number>(0)
  const [imgKey, setImgKey] = useState<string>('')
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null)
  const openMenu = Boolean(menuAnchor)
  // Technical classification (centralized constants + i18n labels)
  // Business profile constants (centralized with i18n)
  const SELECT_PAPER_SX = useMemo(() => ({
    borderRadius: 2,
    border: '2px solid',
    borderColor: 'oklch(0.30 0 0)',
    background: 'linear-gradient(180deg, rgba(38,46,64,0.92), rgba(20,26,42,0.92))',
    boxShadow: '0 0 0 1px rgba(255,255,255,0.05) inset, 0 16px 36px rgba(0,0,0,0.45)',
    backdropFilter: 'blur(10px)',
    color:'#fff',
    '& .MuiAutocomplete-listbox': { background: 'transparent' },
    '& .MuiAutocomplete-option': { color:'#fff' },
    '& .MuiAutocomplete-option.Mui-focused': { backgroundColor:'rgba(255,255,255,0.10)' }
  }), [])
  const BUSINESS_CATEGORY_OPTIONS = useMemo(() => BUSINESS_CATEGORIES.map(c=>c.value), [])
  const BUSINESS_CATEGORY_LABELS = useMemo(() => {
    const map: Record<string,string> = {}
    for (const c of BUSINESS_CATEGORIES) map[c.value] = t(c.i18nKey)
    return map
  }, [t])
  const MODEL_TYPES = useMemo(() => [...BUSINESS_MODEL_TYPES], [])
  const MODEL_TYPES_BY_BUSINESS = useMemo(() => MT_BY_BUSINESS, [])
  const MODEL_TYPE_SUGGESTIONS = useMemo(
  () =>
    Object.fromEntries(
      Object.entries(MODEL_TYPES_BY_BUSINESS).map(([category, types]) => [
        category,
        types.slice(0, 4), // por ejemplo, top 4 sugerencias
      ]),
    ) as Record<string, string[]>,
  [MODEL_TYPES_BY_BUSINESS],
)
  const TECH_CATEGORY_OPTIONS = useMemo(() => TECHNICAL_CATEGORIES.map(c=>c.value), [])
  const TECH_CATEGORY_LABELS = useMemo(() => {
    const map: Record<string,string> = {}
    for (const c of TECHNICAL_CATEGORIES) map[c.value] = t(c.i18nKey)
    return map
  }, [t])
  const [categoriesSel, setCategoriesSel] = useState<TechnicalCategoryValue[]>([])
  const [tagsSel, setTagsSel] = useState<string[]>([])
  const [businessCategory, setBusinessCategory] = useState<BusinessCategoryValue | ''>('')
  const [modelType, setModelType] = useState<string>('')
  const [modelTypeTouched, setModelTypeTouched] = useState<boolean>(false)
  const [showAllModelTypes, setShowAllModelTypes] = useState<boolean>(false)
  const [authorDisplay, setAuthorDisplay] = useState('')
  const SOCIALS = useMemo(() => [
    { key:'github', label:'GitHub', placeholder:'https://github.com/usuario', icon:<GitHubIcon fontSize="small" /> },
    { key:'website', label:'Website', placeholder:'https://tu-sitio.dev', icon:<LanguageIcon fontSize="small" /> },
    { key:'twitter', label:'X', placeholder:'https://x.com/usuario', icon:<XIcon fontSize="small" /> },
    { key:'linkedin', label:'LinkedIn', placeholder:'https://www.linkedin.com/in/usuario', icon:<LinkedInIcon fontSize="small" /> },
  ], [])
  const [socialValues, setSocialValues] = useState<Record<string,string>>({})
  const [msg, setMsg] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [errors, setErrors] = useState<{name?:string; slug?:string; categories?:string; businessCategory?:string}>({})
  const { walletAddress } = useWalletAddress()
  const didMountRef = useRef(false)
  const loadingFromDraftRef = useRef(false)
  const lastSavedRef = useRef<any>(null)
  const autoSaveDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [loadingDraft, setLoadingDraft] = useState(false)
  const [shouldFade, setShouldFade] = useState(true)
  const [loadedRemote, setLoadedRemote] = useState(false)
  // Reset the "view all" flag when business category changes, but do not clear user-entered modelType
  useEffect(() => { setShowAllModelTypes(false) }, [businessCategory])

  // Compute technical tag suggestions (union) based on selected technical categories
  const suggestedTechTags = useMemo(() => {
    if (!categoriesSel?.length) return [] as string[]
    const set = new Set<string>()
    for (const cat of categoriesSel) {
      const tags = TECH_TAGS_BY_CATEGORY[cat as TechnicalCategoryValue] || []
      tags.forEach(x => set.add(x))
    }
    return Array.from(set)
  }, [categoriesSel])
  const orderedTechTagOptions = useMemo(() => {
    const all = ALL_TECH_TAGS as readonly string[]
    if (!suggestedTechTags.length) return [...all]
    const rest = all.filter(x => !suggestedTechTags.includes(x))
    return [...suggestedTechTags, ...rest]
  }, [suggestedTechTags])

  // Auto-select a suggested model type when Business category changes.
  // Conditions to auto-select:
  // - user hasn't interacted yet, OR
  // - current value is empty, OR
  // - current value is not among the new suggestions
  useEffect(() => {
    if (!businessCategory) return
    const key = businessCategory as (typeof BUSINESS_CATEGORIES)[number]['value']
    const rawSugg = (MODEL_TYPE_SUGGESTIONS[key] || MODEL_TYPES_BY_BUSINESS[key] || []) as ModelTypeValue[]
    const sugg = rawSugg.filter(x => (MODEL_TYPES as ReadonlyArray<ModelTypeValue>).includes(x as ModelTypeValue))
    if (!sugg.length) return
    const shouldAutoselect = !modelTypeTouched || !modelType || !sugg.includes(modelType as ModelTypeValue)
    if (shouldAutoselect) setModelType(sugg[0])
  }, [businessCategory, modelTypeTouched, modelType, MODEL_TYPES_BY_BUSINESS])

  // Compute current suggested list and ordered options for Model type
  const currentSuggestedModelTypes = useMemo(() => {
    if (!businessCategory || showAllModelTypes) return [] as string[]
    const key = businessCategory as (typeof BUSINESS_CATEGORIES)[number]['value']
    const raw = (MODEL_TYPE_SUGGESTIONS[key] || MODEL_TYPES_BY_BUSINESS[key] || []) as ModelTypeValue[]
    return raw.filter(x => (MODEL_TYPES as ReadonlyArray<ModelTypeValue>).includes(x as ModelTypeValue))
  }, [businessCategory, showAllModelTypes, MODEL_TYPES_BY_BUSINESS, MODEL_TYPE_SUGGESTIONS, MODEL_TYPES])
  const modelTypeOptions = useMemo(() => {
    const baseAll = MODEL_TYPES
    if (!currentSuggestedModelTypes.length) return baseAll
    const rest = baseAll.filter(x => !currentSuggestedModelTypes.includes(x))
    return [...currentSuggestedModelTypes, ...rest]
  }, [MODEL_TYPES, currentSuggestedModelTypes])

  // Track if this is a fresh start (not coming from another wizard step)
  const freshStartCheckedRef = useRef(false)
  
  // Use navigation guard to warn when leaving wizard
  const { setDirty, clearDraftAndReset } = useWizardNavGuard(upgradeMode, upgradeModelId, true)
  
  // Check for fresh start and clear draft if needed (only for create mode)
  useEffect(() => {
    if (freshStartCheckedRef.current) return
    freshStartCheckedRef.current = true
    
    // Check if we have an active wizard session
    const hasActiveSession = sessionStorage.getItem(WIZARD_SESSION_KEY)
    
    if (!hasActiveSession && !upgradeMode) {
      // Fresh start in create mode - clear any existing draft
      console.log('[Wizard] Fresh start detected, clearing draft...')
      clearDraftAndReset()
    }
    
    // Mark session as active
    sessionStorage.setItem(WIZARD_SESSION_KEY, '1')
  }, [upgradeMode, clearDraftAndReset])
  
  // Mark as dirty when any field changes
  useEffect(() => {
    if (loadedRemote && (name || shortSummary || slug || categoriesSel.length > 0 || tagsSel.length > 0 || businessCategory || modelType)) {
      setDirty(true)
    }
  }, [name, shortSummary, slug, categoriesSel, tagsSel, businessCategory, modelType, loadedRemote, setDirty])

  // Autoload draft on mount and when wallet changes, with cache hydration (skips if resetting or fresh start)
  useEffect(() => {
    let alive = true
    
    // Check if this is a fresh start - skip loading draft
    const hasActiveSession = sessionStorage.getItem(WIZARD_SESSION_KEY)
    const isFreshCreateMode = !hasActiveSession && !upgradeMode
    
    if (!isResetting() && !isFreshCreateMode) {
      // Hydrate from local cache first to avoid empty initial render
      try {
        const draftId = getDraftId(upgradeMode, upgradeModelId)
        const raw = localStorage.getItem(`draft_step1_${draftId}`) || localStorage.getItem('draft_step1')
        if (raw) {
          const s1 = JSON.parse(raw)
          setName(s1?.name || '')
          setShortSummary(s1?.shortSummary || '')
          setSlug(s1?.slug || '')
          // Don't override isUpgrade if we're in upgrade mode from query param
          if (!upgradeMode) {
            setIsUpgrade(Boolean(s1?.upgrade))
          }
          setCategoriesSel(Array.isArray(s1?.technicalCategories) ? (s1.technicalCategories as TechnicalCategoryValue[]) : (Array.isArray(s1?.categories) ? (s1.categories as TechnicalCategoryValue[]) : []))
          setTagsSel(Array.isArray(s1?.technicalTags) ? s1.technicalTags : (Array.isArray(s1?.tags)? s1.tags : []))
          setBusinessCategory(typeof s1?.businessCategory === 'string' ? s1.businessCategory : '')
          setModelType(typeof s1?.modelType === 'string' ? s1.modelType : '')
          const disp = s1?.author?.displayName || ''
          setAuthorDisplay(disp)
          const links = (s1?.author?.links && typeof s1.author.links === 'object') ? s1.author.links : {}
          setSocialValues(links)
          const cov = s1?.cover
          if (cov?.cid || cov?.thumbCid) {
            setCoverCid(cov?.cid || '')
            setCoverThumbCid(cov?.thumbCid || '')
            setCoverMime(cov?.mime || '')
            setCoverSize(Number(cov?.size||0))
            const cid = cov?.thumbCid || cov?.cid
            if (cid) setCoverDisplayUrl(ipfsToHttp(cid))
          }
          try { lastSavedRef.current = s1 } catch {}
          setShouldFade(false)
        }
      } catch {}
    }
    loadingFromDraftRef.current = true
    setLoadingDraft(true)
    if (isResetting() || isFreshCreateMode) {
      // Skip server hydration while resetting or fresh start
      loadingFromDraftRef.current = false; setLoadingDraft(false); setLoadedRemote(true)
      return () => { alive = false }
    }
    loadDraftUtil(upgradeMode, upgradeModelId).then((r)=>{
      if (!alive) return
      const s1 = r?.data?.step1
      if (!s1) return
      setName(s1.name || '')
      setShortSummary(s1.shortSummary || '')
      setSlug(s1.slug || '')
      // Don't override isUpgrade if we're in upgrade mode from query param
      if (!upgradeMode) {
        setIsUpgrade(Boolean(s1?.upgrade))
      }
      setCategoriesSel(Array.isArray(s1.technicalCategories) ? (s1.technicalCategories as TechnicalCategoryValue[]) : (Array.isArray(s1.categories)? (s1.categories as TechnicalCategoryValue[]) : []))
      setTagsSel(Array.isArray(s1.technicalTags) ? s1.technicalTags : (Array.isArray(s1.tags)? s1.tags : []))
      setBusinessCategory(typeof s1?.businessCategory === 'string' ? s1.businessCategory : '')
      setModelType(typeof s1?.modelType === 'string' ? s1.modelType : '')
      const disp = s1?.author?.displayName || ''
      setAuthorDisplay(disp)
      const links = (s1?.author?.links && typeof s1.author.links === 'object') ? s1.author.links : {}
      setSocialValues(links)
      const cov = s1?.cover
      if (cov?.cid || cov?.thumbCid) {
        setCoverCid(cov?.cid || '')
        setCoverThumbCid(cov?.thumbCid || '')
        setCoverMime(cov?.mime || '')
        setCoverSize(Number(cov?.size||0))
        const cid = cov?.thumbCid || cov?.cid
        if (cid) setCoverDisplayUrl(ipfsToHttp(cid))
      }
      try { lastSavedRef.current = s1 } catch {}
    }).catch(()=>{})
    .finally(()=>{ loadingFromDraftRef.current = false; setLoadingDraft(false); setLoadedRemote(true) })
    return () => { alive = false }
  }, [walletAddress, upgradeMode])

  // Load existing model for upgrade mode and initialize draft if needed
  useEffect(() => {
    if (!upgradeMode || !upgradeModelId || !walletAddress) return
    
    let alive = true
    setLoadingExistingModel(true)
    
    const loadExistingModel = async () => {
      try {
        // First check if we already have a draft for this upgrade
        const existingDraft = await loadDraftUtil(true, upgradeModelId)
        
        // If draft already has data, don't reload from model (user has made edits)
        if (existingDraft?.ok && existingDraft.data && Object.keys(existingDraft.data).length > 0 && existingDraft.data.step1) {
          console.log('[Wizard Upgrade] Using existing draft, skipping model load')
          if (alive) setLoadingExistingModel(false)
          return
        }
        
        // No draft exists - load from model and initialize all steps
        console.log('[Wizard Upgrade] No draft found, loading from model:', upgradeModelId)
        
        const res = await fetch(`/api/indexed/models/${upgradeModelId}`)
        if (!res.ok) throw new Error('Failed to load model from database')
        
        const data = await res.json()
        if (!alive) return
        
        const model = data?.model
        const metadata = model?.metadata || {}
        
        if (!model) {
          throw new Error('Model not found in database')
        }
        
        console.log('[Wizard Upgrade] Loaded model from Neon:', { 
          modelId: model.model_id, 
          name: model.name,
          hasMetadata: !!metadata 
        })
        
        // Extract data for all steps from metadata
        const customer = metadata.customer || metadata.customerSheet || {}
        const listing = metadata.listing || metadata.businessProfile || {}
        const technical = metadata.technical || {}
        const caps = metadata.capabilities || technical.capabilities || {}
        const arch = metadata.architecture || technical.architecture || {}
        const runtime = metadata.runtime || technical.runtime || {}
        const resources = metadata.resources || technical.resources || {}
        const inference = metadata.inference || technical.inference || {}
        const deps = metadata.dependencies || technical.dependencies || {}
        const authorship = metadata.authorship || metadata.author || {}
        const cover = metadata.cover || metadata.coverImage || {}
        const licensePolicy = metadata.licensePolicy || {}
        
        const slugFromMetadata = metadata.slug || metadata.name?.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-') || `model-${model.model_id}`
        
        // Build step1 data
        const step1Data = {
          name: model.name || metadata.name || '',
          shortSummary: metadata.summary || metadata.tagline || metadata.shortSummary || '',
          slug: slugFromMetadata,
          upgrade: true,
          businessCategory: listing.businessCategory || customer.businessCategory || metadata.businessCategory || '',
          modelType: listing.modelType || customer.modelType || metadata.modelType || '',
          technicalCategories: metadata.technicalCategories || metadata.categories || [],
          technicalTags: metadata.technicalTags || metadata.tags || [],
          categories: metadata.technicalCategories || metadata.categories || [],
          tags: metadata.technicalTags || metadata.tags || [],
          author: {
            displayName: authorship.name || authorship.displayName || model.creator || '',
            links: authorship.links || authorship.socials || {}
          },
          cover: cover.cid ? { cid: cover.cid, thumbCid: cover.thumbCid || '', mime: cover.mime || '', size: cover.size || 0 } : undefined
        }
        
        // Build step2 data
        const step2Data = {
          capabilities: {
            tasks: caps.tasks || [],
            modalities: caps.modalities || [],
            technicalModelType: caps.technicalModelType || ''
          },
          architecture: {
            frameworks: arch.frameworks || [],
            architectures: arch.architectures || [],
            precisions: arch.precisions || [],
            quantization: arch.quantization || '',
            modelSizeParams: arch.modelSizeParams || '',
            modelFiles: arch.modelFiles || [],
            artifactSizeGB: arch.artifactSizeGB || '',
            embeddingDimension: arch.embeddingDimension || ''
          },
          runtime: {
            python: runtime.python || '',
            cuda: runtime.cuda || '',
            torch: runtime.torch || '',
            cudnn: runtime.cudnn || '',
            os: runtime.os || [],
            accelerators: runtime.accelerators || [],
            computeCapability: runtime.computeCapability || ''
          },
          dependencies: { pip: deps.pip || [] },
          resources: {
            vramGB: resources.vramGB || '',
            cpuCores: resources.cpuCores || '',
            ramGB: resources.ramGB || ''
          },
          inference: {
            maxBatchSize: inference.maxBatchSize || '',
            contextLength: inference.contextLength || '',
            maxTokens: inference.maxTokens || '',
            imageResolution: inference.imageResolution || '',
            sampleRate: inference.sampleRate || '',
            triton: inference.triton || false,
            referencePerf: inference.referencePerf || ''
          },
          customer: {
            valueProp: customer.valueProp || metadata.shortSummary || '',
            description: customer.description || metadata.customerDescription || '',
            expectedImpact: customer.expectedImpact || metadata.expectedImpact || '',
            industries: customer.industries || metadata.industries || [],
            useCases: customer.useCases || metadata.useCases || [],
            supportedLanguages: customer.supportedLanguages || metadata.supportedLanguages || [],
            inputs: customer.inputs || metadata.inputs || '',
            outputs: customer.outputs || metadata.outputs || '',
            examples: customer.examples || metadata.examples || [],
            risks: customer.risks || customer.limitations || metadata.limitations || '',
            prohibited: customer.prohibited || metadata.prohibited || '',
            privacy: customer.privacy || metadata.privacy || '',
            support: customer.support || metadata.support || '',
            deploy: customer.deploy || metadata.deploy || []
          }
        }
        
        // Build step3 data
        const step3Data = {
          artifacts: metadata.artifacts || [],
          demoPreset: metadata.demoPreset || metadata.demo?.preset || '',
          downloadNotes: metadata.downloadNotes || metadata.demo?.downloadNotes || ''
        }
        
        // Build step4 data
        const step4Data = {
          licensePolicy: {
            perpetual: {
              priceRef: model.price_perpetual || licensePolicy.perpetual?.price || '0'
            },
            subscription: {
              perMonthPriceRef: model.price_subscription || licensePolicy.subscription?.pricePerMonth || '0',
              baseDurationDays: model.default_duration_days || licensePolicy.subscription?.baseDurationMonths * 30 || 30
            },
            rights: licensePolicy.rights ? [
              ...(licensePolicy.rights.api ? ['API'] : []),
              ...(licensePolicy.rights.download ? ['Download'] : [])
            ] : ['API'],
            royaltyPct: (model.royalty_bps || 0) / 100,
            termsMarkdown: licensePolicy.termsText || ''
          }
        }
        
        // Save all steps to draft
        console.log('[Wizard Upgrade] Initializing draft with model data...')
        await Promise.all([
          saveDraftUtil('step1', step1Data, true, upgradeModelId),
          saveDraftUtil('step2', step2Data, true, upgradeModelId),
          saveDraftUtil('step3', step3Data, true, upgradeModelId),
          saveDraftUtil('step4', step4Data, true, upgradeModelId)
        ])
        console.log('[Wizard Upgrade] Draft initialized successfully')
        
        // Now set local state for Step 1
        setName(step1Data.name)
        setShortSummary(step1Data.shortSummary)
        setSlug(step1Data.slug)
        setSlugTouched(true)
        setCategoriesSel(step1Data.technicalCategories as TechnicalCategoryValue[])
        setTagsSel(step1Data.technicalTags)
        if (step1Data.businessCategory) setBusinessCategory(step1Data.businessCategory)
        if (step1Data.modelType) setModelType(step1Data.modelType)
        if (step1Data.author.displayName) setAuthorDisplay(step1Data.author.displayName)
        if (Object.keys(step1Data.author.links).length > 0) setSocialValues(step1Data.author.links)
        if (step1Data.cover?.cid) {
          setCoverCid(step1Data.cover.cid)
          setCoverThumbCid(step1Data.cover.thumbCid || '')
          setCoverMime(step1Data.cover.mime || '')
          setCoverSize(Number(step1Data.cover.size || 0))
          setCoverDisplayUrl(ipfsToHttp(step1Data.cover.thumbCid || step1Data.cover.cid))
        }
        
        // Store upgrade context in localStorage
        try {
          localStorage.setItem('wizard_upgrade_mode', '1')
          localStorage.setItem('wizard_upgrade_model_id', upgradeModelId)
          localStorage.setItem('wizard_upgrade_slug', slugFromMetadata)
        } catch {}
        
      } catch (err) {
        console.error('[Wizard Upgrade] Failed to load existing model:', err)
        setMsg(isES ? 'Error al cargar modelo existente' : 'Failed to load existing model')
      } finally {
        if (alive) setLoadingExistingModel(false)
      }
    }
    
    loadExistingModel()
    return () => { alive = false }
  }, [upgradeMode, upgradeModelId, walletAddress, isES])

  const onNameChange = (v: string) => {
    setName(v)
    if (!slugTouched) {
      const auto = v.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-')
      setSlug(auto)
    }
  }

  const probeImage = async (url: string, timeoutMs = 6000): Promise<boolean> => {
    return await new Promise((resolve) => {
      const img = new Image()
      let done = false
      const finish = (ok: boolean) => { if (!done) { done = true; resolve(ok) } }
      const tmo = setTimeout(()=>finish(false), timeoutMs)
      img.onload = () => { clearTimeout(tmo); finish(true) }
      img.onerror = () => { clearTimeout(tmo); finish(false) }
      img.src = url
    })
  }

  const promoteCoverToIPFS = async (version?: number) => {
    const thumb = coverThumbCid
    const main = coverCid
    const ts = Date.now()
    // Use centralized gateway configuration
    const gws = getAllGateways().map(gw => gw.endsWith('/') ? gw : `${gw}/`)
    const candidates: string[] = []
    if (thumb) gws.forEach(g=>candidates.push(`${g}ipfs/${thumb}?t=${ts}`))
    if (main) gws.forEach(g=>candidates.push(`${g}ipfs/${main}?t=${ts}`))
    for (const url of candidates) {
      const ok = await probeImage(url)
      if (ok) {
        if (version === undefined || version === coverVersion) {
          setCoverDisplayUrl(url)
        }
        return true as any
      }
    }
    return false as any
  }

  const onRefreshCover = async () => {
    if (coverPreview) setCoverDisplayUrl(coverPreview)
    setPromoting(true)
    await promoteCoverToIPFS(coverVersion)
    setPromoting(false)
  }

  const onRemoveCover = async () => {
    const ok = window.confirm(t('wizard.step1.confirm.removeCover'))
    if (!ok) return
    const prevMain = coverCid
    const prevThumb = coverThumbCid
    setCoverCid(''); setCoverThumbCid(''); setCoverDisplayUrl(''); setCoverPreview(''); setCoverMime(''); setCoverSize(0)
    try { await unpinCid(prevMain); await unpinCid(prevThumb); setCoverMsg(t('wizard.step1.cover.removed')) } catch { setCoverMsg(t('wizard.step1.cover.removedSlow')) }
  }

  const copyToClipboard = async (txt?: string) => { if (!txt) return; try { await navigator.clipboard.writeText(txt) } catch {} }

  const openCoverInIPFS = () => {
    const target = coverThumbCid || coverCid
    if (target) window.open(ipfsToHttp(target),'_blank')
  }

  const handleMenuOpen = (e: React.MouseEvent<HTMLElement>) => setMenuAnchor(e.currentTarget)
  const handleMenuClose = () => setMenuAnchor(null)

  const onSlugChange = (v: string) => {
    setSlugTouched(true)
    setSlug(v.toLowerCase().trim().replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-'))
  }

  // Debounced slug availability check and suggestion
  useEffect(() => {
    if (!slug) { setSlugCheck(null); setSlugSuggestion(''); return }
    if (slugCheckTimerRef.current) clearTimeout(slugCheckTimerRef.current)
    setSlugSuggestion('')
    const isValid = /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) && slug.length >= 3 && slug.length <= 40
    if (!isValid) { setSlugCheck(null); setSlugCheckLoading(false); return }
    setSlugCheckLoading(true)
    slugCheckTimerRef.current = setTimeout(async () => {
      try {
        const r = await fetch('/api/models/slug-available', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ slug }) })
        const j = await r.json().catch(()=>({ ok:false }))
        setSlugCheck(j)
        // For New model mode, if taken (reserved===false), try to compute a quick suggestion by probing a couple of suffixed variants
        if (j?.ok && j?.reserved === false && !isUpgrade) {
          const candidates: string[] = []
          const base1 = /(\d+)$/.test(slug) ? slug : `${slug}-1`
          candidates.push(base1)
          candidates.push(base1.replace(/-(\d+)$/, (_, n)=>'-'+(parseInt(n,10)+1)))
          for (const cand of candidates) {
            try {
              const r2 = await fetch('/api/models/slug-available', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ slug: cand }) })
              const j2 = await r2.json().catch(()=>({ ok:false }))
              if (j2?.ok && j2?.reserved === true) { setSlugSuggestion(cand); break }
            } catch {}
          }
        }
      } catch (e:any) {
        setSlugCheck({ ok:false, error: String(e?.message||e) })
      } finally {
        setSlugCheckLoading(false)
      }
    }, 450)
    return () => { if (slugCheckTimerRef.current) clearTimeout(slugCheckTimerRef.current) }
  }, [slug, isUpgrade])

  // Compute availability flags and auto-toggle Upgrade off when slug becomes available
  const slugIsAvailable = useMemo(() => {
    if (!slug || !slugCheck?.ok) return false
    return slugCheck?.reserved === true || slugCheck?.reason === 'reserved'
  }, [slug, slugCheck])

  useEffect(() => {
    // Don't auto-toggle upgrade off if we came from ?mode=upgrade query param
    if (upgradeMode) return
    
    if (slugIsAvailable && isUpgrade) {
      setIsUpgrade(false)
    }
  }, [slugIsAvailable, upgradeMode, isUpgrade])

  const toggleFrom = (arr: string[], val: string) => arr.includes(val) ? arr.filter(x=>x!==val) : [...arr, val]

  const onSelectCover = () => {
    const f = fileInputRef.current?.files?.[0] || null
    setCoverFile(f)
    if (f) {
      try { if (coverPreview?.startsWith('blob:')) URL.revokeObjectURL(coverPreview) } catch {}
      const nextVersion = coverVersion + 1
      setCoverVersion(nextVersion)
      const url = URL.createObjectURL(f)
      setCoverPreview(url)
      setCoverDisplayUrl(url)
      setImgKey(String(Date.now()))
      setCoverCid(''); setCoverThumbCid('')
      try { if (fileInputRef.current) (fileInputRef.current as any).value = '' } catch {}
      setCoverMsg('')
    } else {
      setCoverPreview('')
      setCoverDisplayUrl('')
    }
  }

  const pinFile = async (file: Blob, name?: string) => {
    const form = new FormData()
    form.append('file', file)
    if (name) form.append('name', name)
    const res = await fetch('/api/ipfs/pin-file', { method: 'POST', body: form as any })
    const out = await res.json()
    if (!out?.ok) throw new Error(out?.error || 'pin_failed')
    return out as { ok: boolean; cid: string; uri: string }
  }

  const unpinCid = async (cid?: string) => {
    if (!cid) return
    try { await fetch('/api/ipfs/unpin', { method: 'POST', headers: { 'content-type':'application/json' }, body: JSON.stringify({ cid }) }) } catch {}
  }

  const createThumbnail = async (file: File): Promise<Blob> => {
    const MAX_W = 480
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, MAX_W / bitmap.width)
    const w = Math.round(bitmap.width * scale)
    const h = Math.round(bitmap.height * scale)
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')!
    ctx.drawImage(bitmap, 0, 0, w, h)
    return await new Promise((resolve) => canvas.toBlob(b=>resolve(b as Blob), 'image/webp', 0.8))
  }

  const onUploadCover = async () => {
    const f = coverFile
    if (!f) { setCoverMsg(t('wizard.step1.cover.helper')); return }
    setCoverMsg('')
    const ALLOWED = ['image/png','image/jpeg','image/webp']
    if (!ALLOWED.includes(f.type)) { setCoverMsg(t('wizard.step1.cover.errorFormat')); return }
    const MAX = 5 * 1024 * 1024
    if (f.size > MAX) { setCoverMsg(t('wizard.step1.cover.errorSize')); return }
    setCoverUploading(true)
    try {
      const prevMain = coverCid
      const prevThumb = coverThumbCid
      const main = await pinFile(f, `cover-${slug||name||'model'}`)
      setCoverCid(main.cid)
      setCoverMime(f.type)
      setCoverSize(f.size)
      setCoverMsg(t('wizard.step1.cover.uploaded'))
      if (coverPreview) setCoverDisplayUrl(coverPreview)
      if (prevMain && prevMain!==main.cid) unpinCid(prevMain)
      try {
        const thumbBlob = await createThumbnail(f)
        const thumb = await pinFile(thumbBlob, `cover-thumb-${slug||name||'model'}`)
        setCoverThumbCid(thumb.cid)
        if (prevThumb && prevThumb!==thumb.cid) unpinCid(prevThumb)
      } catch {}
      setPromoting(true)
      promoteCoverToIPFS(coverVersion).finally(()=>setPromoting(false))
    } catch (e:any) {
      setCoverMsg(`Error: ${String(e?.message||e)}`)
    } finally {
      setCoverUploading(false)
    }
  }

  const isMeaningful = (d: any) => {
    const nameOk = (d?.name||'').trim()
    const sumOk = (d?.shortSummary||'').trim()
    const cats = Array.isArray(d?.categories) ? d.categories : []
    const tags = Array.isArray(d?.tags) ? d.tags : []
    const author = (d?.author?.displayName||'').trim()
    const cov = d?.cover
    const businessOk = (d?.businessCategory||'').trim()
    return Boolean(nameOk || sumOk || businessOk || cats.length>0 || tags.length>0 || author || (cov && (cov.cid || cov.thumbCid)))
  }

  const shallowEqualJSON = (a:any,b:any) => { try { return JSON.stringify(a)===JSON.stringify(b) } catch { return false } }

  const onSave = async (reason?: 'autosave'|'manual') => {
    const nextErrors: typeof errors = {}
    if (!name.trim()) nextErrors.name = t('wizard.step1.errors.required')
    if (!businessCategory) nextErrors.businessCategory = t('wizard.step1.errors.required')
    if (categoriesSel.length === 0) nextErrors.categories = t('wizard.step1.errors.categoriesRequired')
    setErrors(nextErrors)
    if (reason!== 'autosave' && Object.keys(nextErrors).length) { setMsg(t('wizard.step1.errors.fixMarked')); return }
    setSaving(true)
    setMsg('')
    const linksObj = Object.fromEntries(Object.entries(socialValues).filter(([_,v])=>v && v.trim()))

    const payload = {
      address: walletAddress,
      step: 'step1',
      data: {
        name, shortSummary,
        slug,
        upgrade: isUpgrade,
        businessCategory,
        modelType,
        // legacy fields for backward compatibility
        categories: categoriesSel,
        tags: tagsSel,
        // new technical fields
        technicalCategories: categoriesSel,
        technicalTags: tagsSel,
        author: { displayName: authorDisplay, links: linksObj },
        cover: coverCid ? { cid: coverCid, thumbCid: coverThumbCid, mime: coverMime, size: coverSize } : undefined
      }
    }
    if (reason==='autosave') {
      if (loadingFromDraftRef.current) { setSaving(false); return }
      if (!isMeaningful(payload.data)) { setSaving(false); return }
      if (lastSavedRef.current && shallowEqualJSON(lastSavedRef.current, payload.data)) { setSaving(false); return }
    }
    try {
      // Use centralized service (handles localStorage + server sync)
      await saveStepCentralized('step1', payload.data, upgradeMode, upgradeModelId)
      setMsg(t('wizard.common.saved'))
      lastSavedRef.current = payload.data
    } catch (e: any) {
      setMsg(t('wizard.common.errorSaving'))
    } finally {
      setSaving(false)
    }
  }

  const coverUrl = coverDisplayUrl || coverPreview || ipfsToHttp(coverThumbCid || coverCid || '')

  const isStepValid = () => {
    return Boolean(name.trim() && shortSummary.trim() && categoriesSel.length > 0 && coverCid)
  }

  const navigateAfterSave = async (e: React.MouseEvent<HTMLAnchorElement | HTMLButtonElement>, url: string) => {
    e.preventDefault()
    if (coverUploading) return
    await onSave()
    window.location.href = url
  }

  // Debounced autosave on important changes (skip if resetting)
  useEffect(() => {
    if (!didMountRef.current) { didMountRef.current = true; return }
    if (autoSaveDebounceRef.current) clearTimeout(autoSaveDebounceRef.current)
    autoSaveDebounceRef.current = setTimeout(() => {
      if (isResetting()) return
      if (!saving && !loadingFromDraftRef.current) onSave('autosave')
    }, 700)
    return () => { if (autoSaveDebounceRef.current) clearTimeout(autoSaveDebounceRef.current) }
  }, [name, slug, isUpgrade, shortSummary, businessCategory, modelType, categoriesSel, tagsSel, authorDisplay, socialValues, coverCid, coverThumbCid, coverMime, coverSize, saving])

  return (
    <WizardThemeProvider>
    <Box sx={{ minHeight: '100vh', background: 'linear-gradient(180deg, #0f2740 0%, #0b1626 30%, #0a111c 100%)' }}>
      <Box sx={{
        p: { xs: 2, md: 4 },
        maxWidth: 1000,
        mx: 'auto',
        color:'#fff',
        '& .MuiTypography-h6': { color:'#fff' },
        '& .MuiTypography-subtitle1': { color:'#fff' },
        '& .MuiTypography-subtitle2': { color:'#fff' },
        '& .MuiTypography-body2': { color:'#ffffffcc' },
        '& .MuiTypography-caption': { color:'#ffffff99' },
        '& .MuiFormLabel-root': { color:'#ffffffcc' },
        '& .MuiFormLabel-root.Mui-focused': { color:'#fff' },
        '& .MuiInputBase-input': { color:'#fff', WebkitTextFillColor:'#fff' },
        '& .MuiOutlinedInput-notchedOutline': { borderColor:'rgba(255,255,255,0.28)' },
        '& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline': { borderColor:'rgba(255,255,255,0.40)' },
        '& .MuiFormHelperText-root': { color:'#ffffffcc' },
        '& .MuiFormControlLabel-root': { color:'#fff' },
        '& .MuiSvgIcon-root': { color:'#fff' },
        '& .MuiIconButton-root': { color:'#fff' },
        '& .MuiAutocomplete-endAdornment .MuiSvgIcon-root': { color:'#fff' },
        '& .MuiChip-deleteIcon': { color:'#fff', opacity: 1 },
        '& .MuiChip-root': { color:'#fff', borderColor:'rgba(255,255,255,0.28)' },
        '& a': { color:'#fff' }
      }}>
      {(loadingDraft || coverUploading) && (
        <Box sx={{ mb: 1 }}>
          <LinearProgress />
        </Box>
      )}
      <Stack spacing={2} sx={{ mb: 2 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, color:'#fff' }}>{t('wizard.step1.title')}</Typography>
        <Typography variant="body1" sx={{ color:'#fff' }}>
          {t('wizard.step1.subtitle')}
        </Typography>
      </Stack>

      <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 }, mb: 3, borderRadius: '16px', border:'2px solid', borderColor:'oklch(0.30 0 0)', background:'linear-gradient(180deg, rgba(38,46,64,0.78), rgba(20,26,42,0.78))', boxShadow:'0 0 0 1px rgba(255,255,255,0.04) inset, 0 10px 28px rgba(0,0,0,0.40)', backdropFilter:'blur(10px)' }}>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 600, color:'#fff' }}>{t('wizard.step1.sections.identity.title')}</Typography>
          <Tooltip title={t('wizard.step1.sections.identity.help')}><InfoOutlinedIcon fontSize="small" color="action" /></Tooltip>
        </Stack>
        {loadingDraft ? (
          <Stack spacing={2}>
            <Skeleton animation="wave" variant="rounded" height={56} />
            <Skeleton animation="wave" variant="rounded" height={96} />
          </Stack>
        ) : (
          <Box sx={{ transition:'opacity 150ms ease 40ms', willChange:'opacity', opacity: shouldFade ? (loadedRemote ? 1 : 0) : 1, minHeight: 160 }}>
          <Stack spacing={2}>
            <TextField
              label={t('wizard.step1.fields.name.label')}
              value={name}
              onChange={(e)=>onNameChange(e.target.value)}
              placeholder={isES ? 'Asistente de churn para retail' : 'Retail churn prediction assistant'}
              fullWidth
              error={!!errors.name}
              helperText={errors.name || t('wizard.step1.fields.name.helper')}
            />

            <FormControlLabel
              control={<Switch checked={isUpgrade} onChange={(e)=>setIsUpgrade(e.target.checked)} disabled={upgradeMode || slugIsAvailable} />}
              label={isUpgrade ? TXT.upgradeOn : TXT.upgradeOff}
              sx={{
                '&.Mui-disabled .MuiFormControlLabel-label': { color: 'common.white' },
                '& .MuiFormControlLabel-label': { color: '#E0E0E0' }
              }}
            />

            <TextField
              label={TXT.slugLabel}
              value={slug}
              onChange={(e)=>onSlugChange(e.target.value)}
              placeholder={TXT.slugHelper}
              fullWidth
              InputProps={{
                endAdornment: (
                  <Box sx={{ display:'flex', alignItems:'center', gap: 1 }}>
                    {slugCheckLoading && <CircularProgress size={16} />}
                    {!slugCheckLoading && slug && slugCheck?.ok && (
                      (()=>{
                        const isAvailable = slugCheck?.reserved === true || slugCheck?.reason === 'reserved'
                        const isTaken = slugCheck?.reserved === false && (slugCheck?.reason === 'exists' || slugCheck?.reason === 'db-exists')
                        return (
                          <Typography variant="caption" color={isAvailable ? 'success.main' : (isTaken ? 'error.main' : 'text.secondary')}>
                            {isAvailable ? TXT.statusAvailable : (isTaken ? (isUpgrade ? TXT.statusWillUpgrade : TXT.statusTaken) : (slugCheck?.reason || ''))}
                          </Typography>
                        )
                      })()
                    )}
                  </Box>
                )
              }}
              helperText={
                slugSuggestion && !isUpgrade && (slugCheck?.ok && (slugCheck?.reserved===false && (slugCheck?.reason==='exists' || slugCheck?.reason==='db-exists'))) ? (
                  <Box sx={{ display:'flex', alignItems:'center', gap:1 }}>
                    <Typography variant="caption">{TXT.suggestion}: {slugSuggestion}</Typography>
                    <Button size="small" variant="text" onClick={()=>{ setSlug(slugSuggestion); setSlugTouched(true) }}>{TXT.use}</Button>
                  </Box>
                ) : (
                  slug ? (
                    <Typography variant="caption" sx={{ color:'#ffffff99' }}>
                      {(typeof window!=='undefined' ? window.location.origin : '') + `/${locale}/models/` + slug}
                    </Typography>
                  ) : TXT.slugHelper
                )
              }
            />

            <TextField
              label={t('wizard.step1.fields.summary.label')}
              value={shortSummary}
              onChange={(e)=>setShortSummary(e.target.value)}
              placeholder={isES ? 'Descripción breve para que compradores no técnicos entiendan el valor al instante.' : 'Short description so non-technical buyers instantly get the value.'}
              multiline rows={3}
              fullWidth
            />
          </Stack>
          </Box>
        )}
      </Paper>

      <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 }, mb: 3, borderRadius: '16px', border:'2px solid', borderColor:'oklch(0.30 0 0)', background:'linear-gradient(180deg, rgba(38,46,64,0.78), rgba(20,26,42,0.78))', boxShadow:'0 0 0 1px rgba(255,255,255,0.04) inset, 0 10px 28px rgba(0,0,0,0.40)', backdropFilter:'blur(10px)' }}>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 600, color:'#fff' }}>{t('wizard.step1.sections.cover.title')}</Typography>
          <Tooltip title={t('wizard.step1.sections.cover.help')}><InfoOutlinedIcon fontSize="small" color="action" /></Tooltip>
        </Stack>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
          <Button component="label" variant="outlined">
            {t('wizard.step1.buttons.chooseImage')}
            <input ref={fileInputRef} hidden type="file" accept="image/png,image/jpeg,image/webp" onChange={onSelectCover} />
          </Button>
          <Button
            variant="contained"
            onClick={onUploadCover}
            disabled={!coverFile || coverUploading}
            sx={{
              textTransform:'none',
              fontWeight:700,
              color:'#fff',
              border:'1px solid rgba(255,255,255,0.28)',
              backgroundColor:'rgba(255,255,255,0.08)',
              '&:hover':{ backgroundColor:'rgba(255,255,255,0.14)', borderColor:'rgba(255,255,255,0.40)' },
              '&.Mui-disabled':{ color:'rgba(255,255,255,0.5)', borderColor:'rgba(255,255,255,0.16)' }
            }}
          >
            {coverUploading? t('wizard.step1.cover.uploading') : t('wizard.step1.buttons.uploadCover')}
          </Button>
          <Tooltip title={t('wizard.step1.buttons.refresh')}>
            <IconButton onClick={handleMenuOpen} size="medium" sx={{ height: 40 }}>
              <MoreVertIcon />
            </IconButton>
          </Tooltip>
          <Menu
            anchorEl={menuAnchor}
            open={openMenu}
            onClose={handleMenuClose}
            anchorOrigin={{ vertical:'bottom', horizontal:'left' }}
            PaperProps={{
              sx: {
                borderRadius: 2,
                border: '2px solid',
                borderColor: 'oklch(0.30 0 0)',
                background: 'linear-gradient(180deg, rgba(38,46,64,0.90), rgba(20,26,42,0.90))',
                boxShadow: '0 0 0 1px rgba(255,255,255,0.05) inset, 0 14px 36px rgba(0,0,0,0.45)',
                backdropFilter: 'blur(10px)',
                color: '#fff',
                '& .MuiSvgIcon-root': { color:'#fff' },
                '& .MuiMenuItem-root.Mui-disabled': { color: 'rgba(255,255,255,0.5)' }
              }
            }}
            MenuListProps={{ sx: { color:'#fff' } }}
          >
            <MenuItem onClick={()=>{ handleMenuClose(); onRefreshCover() }} disabled={promoting}>
              <ListItemIcon><RefreshIcon fontSize="small"/></ListItemIcon>
              <ListItemText>{promoting? '...' : t('wizard.step1.buttons.refresh')}</ListItemText>
            </MenuItem>
            <MenuItem onClick={()=>{ handleMenuClose(); openCoverInIPFS() }} disabled={!(coverCid || coverThumbCid)}>
              <ListItemIcon><OpenInNewIcon fontSize="small"/></ListItemIcon>
              <ListItemText>{t('wizard.step1.buttons.viewInIPFS')}</ListItemText>
            </MenuItem>
            <MenuItem onClick={()=>{ handleMenuClose(); copyToClipboard(coverCid) }} disabled={!coverCid}>
              <ListItemIcon><ContentCopyIcon fontSize="small"/></ListItemIcon>
              <ListItemText>{t('wizard.step1.buttons.copyCid')}</ListItemText>
            </MenuItem>
            <MenuItem onClick={()=>{ handleMenuClose(); onRemoveCover() }} disabled={!(coverCid || coverThumbCid)}>
              <ListItemIcon><DeleteOutlineIcon fontSize="small"/></ListItemIcon>
              <ListItemText>{t('wizard.step1.buttons.remove')}</ListItemText>
            </MenuItem>
          </Menu>
        </Stack>

        <Stack direction={{ xs:'column', md:'row' }} spacing={3} alignItems={{ xs:'stretch', md:'center' }}>
          <Stack spacing={1} sx={{ flex: 1 }}>
            <FormHelperText>{t('wizard.step1.cover.helper')}</FormHelperText>
            {coverMsg && <FormHelperText sx={{ color: coverMsg.includes('Error')? 'error.main' : 'success.main' }}>{coverMsg}</FormHelperText>}
            {(coverCid || coverThumbCid) && (
              <Stack spacing={0.5}>
                <Typography variant="caption" color="text.secondary">{t('wizard.step1.cover.meta')}</Typography>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ flexWrap:'wrap' }}>
                  {coverMime && <Chip size="small" label={coverMime.replace('image/','').toUpperCase()} />}
                  {coverSize>0 && <Chip size="small" label={`${(coverSize/1024).toFixed(0)} KB`} />}
                  {coverThumbCid && <Chip size="small" label={t('wizard.step1.cover.thumb')} />}
                </Stack>
              </Stack>
            )}
          </Stack>
          <Box sx={{
            width: { xs: '100%', md: 560 },
            height: 120,
            borderRadius: '12px',
            overflow: 'hidden',
            border: '2px solid',
            borderColor: 'oklch(0.30 0 0)',
            background: 'linear-gradient(180deg, rgba(38,46,64,0.78), rgba(20,26,42,0.78))',
            boxShadow: '0 0 0 1px rgba(255,255,255,0.04) inset, 0 10px 28px rgba(0,0,0,0.40)',
            backdropFilter: 'blur(6px)',
            display:'flex',
            alignItems:'center',
            justifyContent:'center',
            position:'relative'
          }}>
            {loadingDraft && !coverUrl ? (
              <Skeleton animation="wave" variant="rounded" width="100%" height="100%" />
            ) : coverUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={imgKey}
                src={coverUrl}
                alt="cover"
                loading="lazy"
                style={{ width:'100%', height:'100%', objectFit:'contain', objectPosition:'center center', display:'block' }}
                onError={(e)=>{
                  const tried = (e.currentTarget as any)._gwTry || 0
                  ;(e.currentTarget as any)._gwTry = tried + 1
                  const cThumb = coverThumbCid
                  const cMain = coverCid
                  const fallbacks: string[] = []
                  if (cThumb) fallbacks.push(`https://dweb.link/ipfs/${cThumb}`, `https://cf-ipfs.com/ipfs/${cThumb}`)
                  if (cMain) fallbacks.push(`https://dweb.link/ipfs/${cMain}`, `https://cf-ipfs.com/ipfs/${cMain}`)
                  if (coverPreview) fallbacks.push(coverPreview)
                  if (tried < fallbacks.length) {
                    e.currentTarget.src = fallbacks[tried]
                  }
                }}
              />
            ) : (
              <Avatar variant="rounded" sx={{ width: 160, height: 120, fontSize: 16 }}>{t('wizard.step1.cover.placeholder')}</Avatar>
            )}
          </Box>
        </Stack>
      </Paper>

      <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 }, mb: 3, borderRadius: '16px', border:'2px solid', borderColor:'oklch(0.30 0 0)', background:'linear-gradient(180deg, rgba(38,46,64,0.78), rgba(20,26,42,0.78))', boxShadow:'0 0 0 1px rgba(255,255,255,0.04) inset, 0 10px 28px rgba(0,0,0,0.40)', backdropFilter:'blur(10px)' }}>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 600, color:'#fff' }}>{isES ? 'Perfil de negocio' : 'Business profile'}</Typography>
          <Tooltip title={isES ? 'Dónde en el negocio aporta valor este modelo (para compradores no técnicos).' : 'Where in the business this model creates value (for non-technical buyers).'}><InfoOutlinedIcon fontSize="small" color="action" /></Tooltip>
        </Stack>
        {loadingDraft ? (
          <Stack spacing={2}>
            <Skeleton animation="wave" variant="rounded" height={56} />
            <Skeleton animation="wave" variant="rounded" height={56} />
          </Stack>
        ) : (
          <Box sx={{ transition:'opacity 150ms ease 40ms', willChange:'opacity', opacity: shouldFade ? (loadedRemote ? 1 : 0) : 1, minHeight: 120 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <SelectField
                  options={BUSINESS_CATEGORY_OPTIONS}
                  isOptionEqualToValue={(opt, val)=>opt===val}
                  value={businessCategory || null}
                  onChange={(_, v)=>{
                    const next = v || ''
                    setBusinessCategory(next)
                    // proactively align model type suggestions on category change
                    const key = next as (typeof BUSINESS_CATEGORIES)[number]['value']
                    const rawSugg = next ? ((MODEL_TYPE_SUGGESTIONS[key] || MODEL_TYPES_BY_BUSINESS[key] || []) as ModelTypeValue[]) : []
                    const sugg = rawSugg.filter(x => (MODEL_TYPES as ReadonlyArray<ModelTypeValue>).includes(x as ModelTypeValue))
                    if (sugg.length) {
                      const keep = modelType && sugg.includes(modelType as ModelTypeValue)
                      if (!keep) {
                        setModelTypeTouched(false)
                        setModelType(sugg[0])
                      }
                    }
                  }}
                  label={isES ? 'Categoría de negocio' : 'Business category'}
                  placeholder={isES ? 'Selecciona una' : 'Select one'}
                  helperText={errors.businessCategory || (isES ? 'Dónde en el negocio crea valor (para compradores no técnicos).' : 'Where in the business this creates value (for non-technical buyers).')}
                  getOptionLabel={(opt)=> BUSINESS_CATEGORY_LABELS[opt] || opt}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <Stack spacing={0.5}>
                  <SelectField
                    freeSolo
                    isOptionEqualToValue={(opt, val)=>opt===val}
                    options={modelTypeOptions}
                    value={modelType || null}
                    onChange={(_, v)=>{ setModelTypeTouched(true); setModelType((v as string) || '') }}
                    onInputChange={(_, input)=>{ setModelTypeTouched(true); setModelType(input || '') }}
                    getOptionLabel={(opt)=> MODEL_TYPE_I18N[opt as keyof typeof MODEL_TYPE_I18N] ? t(MODEL_TYPE_I18N[opt as keyof typeof MODEL_TYPE_I18N]) : (opt as string)}
                    {...(currentSuggestedModelTypes.length ? {
                      groupBy: (opt: string) => currentSuggestedModelTypes.includes(opt)
                        ? (isES ? 'Sugeridos' : 'Suggested')
                        : (isES ? 'Otros tipos' : 'Other types')
                    } : {})}
                    label={isES ? 'Tipo de modelo (negocio)' : 'Model type (business)'}
                    placeholder={isES ? 'p. ej. "Segmentación de clientes", "Pronóstico de demanda"' : 'e.g. "Customer segmentation", "Demand forecasting"'}
                    helperText={isES ? 'Describe el modelo en términos de negocio.' : 'Describe the model in business terms.'}
                  />
                  <Typography variant="caption" sx={{ color: '#ffffff99' }}>
                    {businessCategory ? (
                      <>
                        {isES ? 'Mostrando tipos para' : 'Showing types for'} {businessCategory}
                        {' — '}
                        <Button size="small" variant="text" onClick={()=>setShowAllModelTypes(v=>!v)} sx={{ textTransform:'none', ml: 0, minWidth: 0, p: 0, color:'#fff' }}>
                          {showAllModelTypes ? (isES ? 'Ver sugeridos' : 'View suggested') : (isES ? 'Ver todos' : 'View all types')}
                        </Button>
                      </>
                    ) : (
                      isES ? 'Mostrando lista global de tipos' : 'Showing global list of types'
                    )}
                  </Typography>
                </Stack>
              </Grid>
            </Grid>
          </Box>
        )}
      </Paper>

      <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 }, mb: 3, borderRadius: '16px', border:'2px solid', borderColor:'oklch(0.30 0 0)', background:'linear-gradient(180deg, rgba(38,46,64,0.78), rgba(20,26,42,0.78))', boxShadow:'0 0 0 1px rgba(255,255,255,0.04) inset, 0 10px 28px rgba(0,0,0,0.40)', backdropFilter:'blur(10px)' }}>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 600, color:'#fff' }}>{t('wizard.step1.sections.technical.title')}</Typography>
          <Tooltip title={t('wizard.step1.sections.technical.help')}><InfoOutlinedIcon fontSize="small" color="action" /></Tooltip>
        </Stack>
        {loadingDraft ? (
          <Stack spacing={2}>
            <Skeleton animation="wave" variant="rounded" height={56} />
            <Skeleton animation="wave" variant="rounded" height={56} />
          </Stack>
        ) : (
          <Box sx={{ transition:'opacity 150ms ease 40ms', willChange:'opacity', opacity: shouldFade ? (loadedRemote ? 1 : 0) : 1, minHeight: 160 }}>
            <SelectField
              multiple
              options={TECH_CATEGORY_OPTIONS}
              isOptionEqualToValue={(opt, val)=>opt===val}
              value={categoriesSel}
              onChange={(_, v)=>setCategoriesSel(v as TechnicalCategoryValue[])}
              getOptionLabel={(opt)=>TECH_CATEGORY_LABELS[opt] || String(opt)}
              renderTags={(value, getTagProps) => value.map((option, index) => (
                <Chip variant="outlined" label={TECH_CATEGORY_LABELS[option] || String(option)} {...getTagProps({ index })} key={option} />
              ))}
              label={t('wizard.step1.fields.technicalCategories.label')}
              placeholder={t('wizard.step1.fields.technicalCategories.placeholder')}
              helperText={errors.categories || t('wizard.step1.fields.technicalCategories.helper')}
            />


      <SelectField
        multiple
        freeSolo
        isOptionEqualToValue={(opt, val)=>opt===val}
        options={orderedTechTagOptions}
        getOptionLabel={(opt)=> TECH_TAG_I18N[opt] ? t(TECH_TAG_I18N[opt]) : opt}
        value={tagsSel}
        onChange={(_, v)=>setTagsSel(v as string[])}
        renderTags={(value, getTagProps) => value.map((option, index) => (
          <Chip variant="outlined" label={TECH_TAG_I18N[option] ? t(TECH_TAG_I18N[option]) : option} {...getTagProps({ index })} key={option} />
        ))}
        label={t('wizard.step1.fields.technicalTags.label')}
        placeholder={t('wizard.step1.fields.technicalTags.placeholder')}
        helperText={categoriesSel.length ? (
          t('wizard.step1.fields.technicalTags.helperWithCatPrefix') + categoriesSel.map(c=>TECH_CATEGORY_LABELS[c] || String(c)).join(', ') + t('wizard.step1.fields.technicalTags.helperWithCatSuffix')
        ) : (
          t('wizard.step1.fields.technicalTags.helperNoCat')
        )}
        {...(suggestedTechTags.length ? {
          groupBy: (opt: string) => suggestedTechTags.includes(opt)
            ? t('wizard.step1.fields.technicalTags.groupSuggested')
            : t('wizard.step1.fields.technicalTags.groupOther')
        } : {})}
      />
          
          </Box>
        )}
      </Paper>

      <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 }, mb: 3, borderRadius: '16px', border:'2px solid', borderColor:'oklch(0.30 0 0)', background:'linear-gradient(180deg, rgba(38,46,64,0.78), rgba(20,26,42,0.78))', boxShadow:'0 0 0 1px rgba(255,255,255,0.04) inset, 0 10px 28px rgba(0,0,0,0.40)', backdropFilter:'blur(10px)' }}>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 600, color:'#fff' }}>{t('wizard.step1.sections.authorship.title')}</Typography>
          <Tooltip title={t('wizard.step1.sections.authorship.help')}><InfoOutlinedIcon fontSize="small" color="action" /></Tooltip>
        </Stack>
        {loadingDraft ? (
          <Stack spacing={2}>
            <Skeleton animation="wave" variant="rounded" height={56} />
            <Stack spacing={1}>
              <Skeleton animation="wave" variant="text" width={180} />
              <Grid container spacing={2}>
                {Array.from({ length: 4 }).map((_, i)=>(
                  <Grid item xs={12} md={6} key={i}>
                    <Skeleton animation="wave" variant="rounded" height={56} />
                  </Grid>
                ))}
              </Grid>
              <Skeleton animation="wave" variant="text" width={220} />
            </Stack>
          </Stack>
        ) : (
          <Box sx={{ transition:'opacity 150ms ease 40ms', willChange:'opacity', opacity: shouldFade ? (loadedRemote ? 1 : 0) : 1, minHeight: 200 }}>
          <Stack spacing={2}>
            <TextField
              label={t('wizard.step1.fields.author.label')}
              value={authorDisplay}
              onChange={(e)=>setAuthorDisplay(e.target.value)}
              fullWidth
            />
            <Stack spacing={1}>
              <Typography variant="subtitle1">{t('wizard.step1.fields.socials.title')}</Typography>
              <Grid container spacing={2}>
                {SOCIALS.map(s => (
                  <Grid item xs={12} md={6} key={s.key}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      {s.icon}
                      <TextField
                        fullWidth
                        label={s.label}
                        value={socialValues[s.key] || ''}
                        onChange={(e)=>setSocialValues(v=>({...v, [s.key]: e.target.value}))}
                        placeholder={s.placeholder}
                      />
                    </Stack>
                  </Grid>
                ))}
              </Grid>
              <FormHelperText>{t('wizard.step1.fields.socials.helper')}</FormHelperText>
            </Stack>
          </Stack>
          </Box>
        )}
      </Paper>

      <Divider sx={{ my: 2 }} />

      <Box sx={{ height: { xs: 76, md: 76 } }} />

      <WizardFooter
        currentStep={1}
        totalSteps={5}
        stepTitle={t('wizard.step1.title')}
        onBack={() => { if (!coverUploading) window.location.href = base }}
        onSaveDraft={() => onSave('manual')}
        onNext={() => { if (!isStepValid() || coverUploading) return; window.location.href = buildWizardUrl(`${base}/step2`) }}
        isNextDisabled={!isStepValid() || coverUploading}
        isSaving={saving}
        isLastStep={false}
        backLabel={t('wizard.common.back')}
        saveDraftLabel={t('wizard.common.saveDraft')}
        savingLabel={t('wizard.common.saving')}
        nextLabel={t('wizard.common.next')}
        publishLabel={t('wizard.index.publish')}
        leftStatusExtra={(loadingDraft || coverUploading) ? (
          <Typography variant="caption" sx={{ ml: 1, color: 'oklch(0.92 0 0)' }}>
            {loadingDraft ? COMMON.loadingDraft : COMMON.uploadInProgress}
          </Typography>
        ) : null}
      />

      {msg && <p>{msg}</p>}
      </Box>
    </Box>
    </WizardThemeProvider>
  )
}
