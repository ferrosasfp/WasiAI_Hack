"use client";
import { useMemo, useState, useRef, useEffect } from 'react'
 
import { Box, Stack, Typography, Paper, Tooltip, TextField, Autocomplete, Chip, Grid, Divider, Button, FormHelperText, Switch, FormControlLabel, Accordion, AccordionSummary, AccordionDetails, IconButton, Card, CardActionArea, CircularProgress, Skeleton, GlobalStyles } from '@mui/material'
import { useWalletAddress } from '@/hooks/useWalletAddress'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import CloseRoundedIcon from '@mui/icons-material/CloseRounded'
import LocalMallIcon from '@mui/icons-material/LocalMall'
import SchoolIcon from '@mui/icons-material/School'
import DescriptionIcon from '@mui/icons-material/Description'
import LocalHospitalIcon from '@mui/icons-material/LocalHospital'
import GavelIcon from '@mui/icons-material/Gavel'
import SavingsIcon from '@mui/icons-material/Savings'
import CampaignIcon from '@mui/icons-material/Campaign'
import PrecisionManufacturingIcon from '@mui/icons-material/PrecisionManufacturing'
import LocalShippingIcon from '@mui/icons-material/LocalShipping'
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart'
import WorkIcon from '@mui/icons-material/Work'
import BoltIcon from '@mui/icons-material/Bolt'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined'
import WizardFooter from '@/components/WizardFooter'
import { useLocale, useTranslations } from 'next-intl'
import WizardThemeProvider from '@/components/WizardThemeProvider'
import { INDUSTRIES_ES, INDUSTRIES_EN, USE_CASES_ES, USE_CASES_EN, SUPPORTED_LANGS, DEPLOY_ES, DEPLOY_EN, TASKS as TASK_OPTIONS, MODALITIES as MODALITY_OPTIONS, FRAMEWORKS as FRAMEWORK_OPTIONS, FILE_FORMATS as FILE_FORMAT_OPTIONS, OS as OS_OPTIONS, ACCELERATORS as ACCELERATOR_OPTIONS, TECHNICAL_MODEL_TYPES, TaskValue, ModalityValue, DeployValue, FrameworkValue, FileFormatValue, OsValue, AcceleratorValue, TechnicalModelType } from '@/constants/step2'
import { saveDraft as saveDraftUtil, loadDraft as loadDraftUtil, getDraftId } from '@/lib/draft-utils'
import { useWizardNavGuard } from '@/hooks/useWizardNavGuard'

export const dynamic = 'force-dynamic'

export default function Step2CompatibilityLocalized() {
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
  
  // Local labels for new fields (from i18n)
  const L = useMemo(() => ({
    client: {
      expectedImpact: t('wizard.step2.clientSheetMicrocopy.headers.expectedImpactLabel'),
      risks: t('wizard.step2.clientSheetMicrocopy.risks.label'),
      supportedLangs: t('wizard.step2.clientSheetMicrocopy.context.supportedLangsLabel'),
      primaryLang: t('wizard.step2.tech.training.labels.primaryLanguage'),
      metrics: t('wizard.step2.tech.training.labels.metrics'),
      prohibited: t('wizard.step2.clientSheetMicrocopy.prohibited.label')
    },
    tech: {
      modelSize: t('wizard.step2.tech.labels.modelSize'),
      artifactSize: t('wizard.step2.tech.labels.artifactSize'),
      embedDim: t('wizard.step2.tech.labels.embedDim'),
      refPerf: t('wizard.step2.tech.labels.refPerf')
    }
  }), [t])
  // Title without optional suffix for technical section
  const techTitle = useMemo(() => {
    const raw = t('wizard.step2.tech.accordionTitle') as string
    return raw
      .replace(/\s*\(optional\)\s*/i, ' ')
      .replace(/\s*\(opcional\)\s*/i, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  }, [t])
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const { walletAddress } = useWalletAddress()
  const [dirty, setDirty] = useState(false)
  const [showErr, setShowErr] = useState(false)
  const navigatingRef = useRef(false)
  const didMountRef = useRef(false)
  const loadingFromDraftRef = useRef(false)
  const lastSavedRef = useRef<any>(null)
  const autoSaveDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [nextLoading, setNextLoading] = useState(false)
  const [draftLoading, setDraftLoading] = useState(true)
  const [shouldFade, setShouldFade] = useState(true)
  const [loadedRemote, setLoadedRemote] = useState(false)

  // Sync local dirty state with wizard guard
  useEffect(() => {
    setWizardDirty(dirty)
  }, [dirty, setWizardDirty])

  const presetsRef = useRef<HTMLDivElement>(null)
  const scrollPresets = (dir: 'prev'|'next') => {
    const el = presetsRef.current
    if (!el) return
    const delta = Math.min(el.clientWidth * 0.9, 600)
    el.scrollBy({ left: dir==='next' ? delta : -delta, behavior: 'smooth' })
  }

  // Load existing model data for upgrade mode
  useEffect(() => {
    if (!upgradeMode || !upgradeModelId || !walletAddress) return
    
    let alive = true
    setDraftLoading(true)
    
    const loadExistingModel = async () => {
      try {
        const res = await fetch(`/api/indexed/models/${upgradeModelId}`)
        if (!res.ok) throw new Error('Failed to load model from database')
        
        const data = await res.json()
        const modelData = data?.model
        const meta = modelData?.metadata || {}
        
        if (!alive) return
        
        console.log('[Step2] Loading model data:', {
          hasMetadata: !!meta,
          hasCustomer: !!meta.customer,
          hasTechnical: !!meta.technical,
          metaKeys: Object.keys(meta).slice(0, 20)
        })
        
        // Load Customer Sheet fields
        // Try both direct access and nested in customer object
        const customer = meta.customer || {}
        
        // "In one sentence, what does this model do?" - valueProp
        // Try: customer.valueProp, shortSummary (root level), or other variations
        if (customer.valueProp) setValueProp(customer.valueProp)
        else if (meta.shortSummary) setValueProp(meta.shortSummary)
        else if (meta.valueProposition) setValueProp(meta.valueProposition)
        else if (customer.valueProposition) setValueProp(customer.valueProposition)
        
        // Customer description
        if (customer.description) setCustomerDesc(customer.description)
        else if (meta.customerDescription) setCustomerDesc(meta.customerDescription)
        
        // Industries and use cases
        if (Array.isArray(customer.industries)) setIndustries(customer.industries)
        else if (Array.isArray(meta.industries)) setIndustries(meta.industries)
        if (Array.isArray(customer.useCases)) setUseCases(customer.useCases)
        else if (Array.isArray(meta.useCases)) setUseCases(meta.useCases)
        
        // Expected impact
        if (customer.expectedImpact) setExpectedImpact(customer.expectedImpact)
        else if (meta.expectedImpact) setExpectedImpact(meta.expectedImpact)
        
        // Inputs/Outputs
        if (customer.inputs) setInputsDesc(customer.inputs)
        else if (meta.inputs) setInputsDesc(meta.inputs)
        if (customer.outputs) setOutputsDesc(customer.outputs)
        else if (meta.outputs) setOutputsDesc(meta.outputs)
        
        // Examples
        if (Array.isArray(customer.examples)) setIoExamplesList(customer.examples)
        else if (Array.isArray(meta.examples)) setIoExamplesList(meta.examples)
        
        // "Known limitations and risks" - risks
        // Try: customer.risks, customer.limitations, or root level
        if (customer.risks) setRisks(customer.risks)
        else if (customer.limitations) setRisks(customer.limitations)
        else if (meta.limitations) setRisks(meta.limitations)
        else if (meta.risks) setRisks(meta.risks)
        
        // Prohibited uses
        if (customer.prohibited) setProhibited(customer.prohibited)
        else if (meta.prohibited) setProhibited(meta.prohibited)
        
        // Privacy
        if (customer.privacy) setPrivacy(customer.privacy)
        else if (meta.privacy) setPrivacy(meta.privacy)
        
        // Deploy options
        if (Array.isArray(customer.deploy)) setDeployOptions(customer.deploy)
        else if (Array.isArray(meta.deploy)) setDeployOptions(meta.deploy)
        
        // Support
        if (customer.support) setSupport(customer.support)
        else if (meta.support) setSupport(meta.support)
        
        // Supported languages
        if (Array.isArray(customer.supportedLanguages)) setSupportedLangs(customer.supportedLanguages)
        else if (Array.isArray(meta.supportedLanguages)) setSupportedLangs(meta.supportedLanguages)
        
        // Load Capabilities (try both meta.capabilities and meta.technical.capabilities)
        const technical = meta.technical || {}
        const caps = meta.capabilities || technical.capabilities || {}
        if (Array.isArray(caps.tasks)) setTasks(caps.tasks)
        if (Array.isArray(caps.modalities)) setModalities(caps.modalities)
        if (caps.technicalModelType) setTechnicalModelType(caps.technicalModelType)
        
        // Load Architecture
        const arch = meta.architecture || technical.architecture || {}
        if (Array.isArray(arch.frameworks)) setFrameworks(arch.frameworks)
        if (Array.isArray(arch.architectures)) setArchitectures(arch.architectures)
        if (Array.isArray(arch.precisions)) setPrecisions(arch.precisions)
        if (arch.quantization) setQuantization(arch.quantization)
        if (arch.modelSizeParams) setModelSizeParams(String(arch.modelSizeParams))
        if (Array.isArray(arch.modelFiles)) setModelFiles(arch.modelFiles)
        if (arch.artifactSizeGB) setArtifactSize(arch.artifactSizeGB)
        if (arch.embeddingDimension) setEmbedDim(String(arch.embeddingDimension))
        
        // Load Runtime
        const runtime = meta.runtime || technical.runtime || {}
        if (runtime.python) setPython(runtime.python)
        if (runtime.cuda) setCuda(runtime.cuda)
        if (runtime.torch) setTorch(runtime.torch)
        if (runtime.cudnn) setCudnn(runtime.cudnn)
        if (Array.isArray(runtime.os)) setOses(runtime.os)
        if (Array.isArray(runtime.accelerators)) setAccelerators(runtime.accelerators)
        if (runtime.computeCapability) setComputeCapability(runtime.computeCapability)
        
        // Load Dependencies (dependencies is at root level, not in technical)
        const deps = meta.dependencies || technical.dependencies || {}
        console.log('[Step2] Dependencies debug:', {
          hasDeps: !!deps,
          pipType: typeof deps.pip,
          pipIsArray: Array.isArray(deps.pip),
          pipLength: Array.isArray(deps.pip) ? deps.pip.length : 'N/A',
          pipValue: deps.pip,
          depsFullObject: deps
        })
        if (Array.isArray(deps.pip) && deps.pip.length > 0) {
          setPipDeps(deps.pip.join('\n'))
        } else if (typeof deps.pip === 'string' && deps.pip.trim()) {
          setPipDeps(deps.pip)
        }
        
        // Load Resources
        const resources = meta.resources || technical.resources || {}
        if (resources.vramGB != null) setVramGB(String(resources.vramGB))
        if (resources.cpuCores != null) setCpuCores(String(resources.cpuCores))
        if (resources.ramGB != null) setRamGB(String(resources.ramGB))
        
        // Load Inference
        const inference = meta.inference || technical.inference || {}
        if (inference.maxBatchSize != null) setMaxBatch(String(inference.maxBatchSize))
        if (inference.contextLength != null) setContextLen(String(inference.contextLength))
        if (inference.maxTokens != null) setMaxTokens(String(inference.maxTokens))
        if (inference.imageResolution) setImgResolution(inference.imageResolution)
        if (inference.sampleRate != null) setSampleRate(String(inference.sampleRate))
        if (inference.referencePerf) setRefPerf(inference.referencePerf)
        if (typeof inference.triton === 'boolean') setUseTriton(inference.triton)
        
        // Load Training fields
        const training = meta.training || technical.training || {}
        if (training.primaryLanguage) setPrimaryLanguage(training.primaryLanguage)
        if (training.metrics) setMetrics(training.metrics)
        
        console.log('[Step2] Loaded fields:', {
          // Customer fields
          valueProp: !!(customer.valueProp || meta.shortSummary || meta.valueProposition),
          valuePropValue: customer.valueProp || meta.shortSummary || meta.valueProposition || 'NOT FOUND',
          customerDesc: !!(customer.description || meta.customerDescription),
          industries: Array.isArray(customer.industries) || Array.isArray(meta.industries),
          useCases: Array.isArray(customer.useCases) || Array.isArray(meta.useCases),
          supportedLangs: Array.isArray(customer.supportedLanguages) || Array.isArray(meta.supportedLanguages),
          inputs: !!(customer.inputs || meta.inputs),
          outputs: !!(customer.outputs || meta.outputs),
          examples: Array.isArray(customer.examples) || Array.isArray(meta.examples),
          risks: !!(customer.risks || customer.limitations || meta.limitations || meta.risks),
          prohibited: !!(customer.prohibited || meta.prohibited),
          privacy: !!(customer.privacy || meta.privacy),
          support: !!(customer.support || meta.support),
          // Technical fields
          tasks: Array.isArray(caps.tasks),
          modalities: Array.isArray(caps.modalities),
          frameworks: Array.isArray(arch.frameworks),
          modelFiles: Array.isArray(arch.modelFiles),
          python: !!runtime.python,
          oses: Array.isArray(runtime.os),
          accelerators: Array.isArray(runtime.accelerators),
          vramGB: resources.vramGB,
          cpuCores: resources.cpuCores,
          ramGB: resources.ramGB,
          maxBatch: inference.maxBatchSize,
          contextLen: inference.contextLength,
          maxTokens: inference.maxTokens,
          // Data structure
          customerKeys: Object.keys(customer).slice(0, 20),
          metaKeys: Object.keys(meta).slice(0, 20)
        })
        
      } catch (err) {
        console.error('[Step2] Failed to load existing model:', err)
      } finally {
        if (alive) {
          setDraftLoading(false)
          setLoadedRemote(true)
        }
      }
    }
    
    loadExistingModel()
    return () => { alive = false }
  }, [upgradeMode, upgradeModelId, walletAddress])

  // Autoload del borrador al montar (localizado)
  useEffect(() => {
    // Skip if in upgrade mode (data loaded above)
    if (upgradeMode && upgradeModelId) return
    
    let alive = true
    // Hydrate from cache first to avoid empty initial render
    try {
      const raw = localStorage.getItem('draft_step2')
      if (raw) {
        const s2 = JSON.parse(raw)
        try {
          const cap = s2.capabilities || {}
          setTasks((Array.isArray(cap.tasks)? cap.tasks : []) as TaskValue[])
          setModalities((Array.isArray(cap.modalities)? cap.modalities : []) as ModalityValue[])
          // Technical modelType - read from capabilities (new location)
          if (typeof cap.technicalModelType === 'string') setTechnicalModelType(cap.technicalModelType as TechnicalModelType)
          const arch = s2.architecture || {}
          setFrameworks((Array.isArray(arch.frameworks)? arch.frameworks : []) as FrameworkValue[])
          setArchitectures(Array.isArray(arch.architectures)? arch.architectures : [])
          setPrecisions(Array.isArray(arch.precisions)? arch.precisions : [])
          if (typeof arch.quantization === 'string') setQuantization(arch.quantization)
          if (arch.modelSizeParams != null) setModelSizeParams(String(arch.modelSizeParams))
          setModelFiles((Array.isArray(arch.modelFiles)? arch.modelFiles : []) as FileFormatValue[])
          if (typeof (arch as any).artifactSizeGB === 'string') setArtifactSize((arch as any).artifactSizeGB)
          if ((arch as any).embeddingDimension != null) setEmbedDim(String((arch as any).embeddingDimension))
          const rt = s2.runtime || {}
          if (typeof rt.python === 'string') setPython(rt.python)
          if (typeof rt.cuda === 'string') setCuda(rt.cuda)
          if (typeof rt.torch === 'string') setTorch(rt.torch)
          if (typeof rt.cudnn === 'string') setCudnn(rt.cudnn)
          setOses((Array.isArray(rt.os)? rt.os : []) as OsValue[])
          setAccelerators((Array.isArray(rt.accelerators)? rt.accelerators : []) as AcceleratorValue[])
          if (typeof rt.computeCapability === 'string') setComputeCapability(rt.computeCapability)
          const deps = s2.dependencies || {}
          const pip = Array.isArray(deps.pip)? deps.pip : []
          setPipDeps(pip.join('\n'))
          const resrc = s2.resources || {}
          if (resrc.vramGB!=null) setVramGB(String(resrc.vramGB))
          if (resrc.cpuCores!=null) setCpuCores(String(resrc.cpuCores))
          if (resrc.ramGB!=null) setRamGB(String(resrc.ramGB))
          const inf = s2.inference || {}
          if (inf.maxBatchSize!=null) setMaxBatch(String(inf.maxBatchSize))
          if (inf.contextLength!=null) setContextLen(String(inf.contextLength))
          if (inf.maxTokens!=null) setMaxTokens(String(inf.maxTokens))
          if (typeof inf.imageResolution === 'string') setImgResolution(inf.imageResolution)
          if (inf.sampleRate!=null) setSampleRate(String(inf.sampleRate))
          if (typeof (inf as any).referencePerf === 'string') setRefPerf((inf as any).referencePerf)
          if (typeof inf.triton === 'boolean') setUseTriton(inf.triton)
          const training = s2.training || {}
          const cust = s2.customer || {}
          if (typeof cust.valueProp === 'string') setValueProp(cust.valueProp)
          if (typeof cust.description === 'string') setCustomerDesc(cust.description)
          setIndustries(Array.isArray(cust.industries)? cust.industries : [])
          setUseCases(Array.isArray(cust.useCases)? cust.useCases : [])
          if (typeof cust.expectedOutcomes === 'string') setExpectedImpact(cust.expectedOutcomes)
          if (typeof cust.expectedImpact === 'string') setExpectedImpact(cust.expectedImpact)
          if (typeof cust.inputs === 'string') setInputsDesc(cust.inputs)
          if (typeof cust.outputs === 'string') setOutputsDesc(cust.outputs)
          if (Array.isArray(cust.examples)) setIoExamplesList(cust.examples)
          if (typeof cust.risks === 'string') setRisks(cust.risks)
          else if (typeof cust.limitations === 'string') setRisks(cust.limitations)
          if (typeof cust.privacy === 'string') setPrivacy(cust.privacy)
          setDeployOptions((Array.isArray(cust.deploy)? cust.deploy : []) as DeployValue[])
          if (typeof cust.support === 'string') setSupport(cust.support)
          setSupportedLangs(Array.isArray(cust.supportedLanguages)? cust.supportedLanguages : [])
          // Training fields (optional) - read from training block with legacy fallback
          if (typeof training.primaryLanguage === 'string') setPrimaryLanguage(training.primaryLanguage)
          else if (typeof cust.primaryLanguage === 'string') setPrimaryLanguage(cust.primaryLanguage)
          if (typeof training.metrics === 'string') setMetrics(training.metrics)
          else if (typeof cust.metrics === 'string') setMetrics(cust.metrics)
          if (typeof cust.prohibited === 'string') setProhibited(cust.prohibited)
          // Legacy: old drafts had modelType in customer, ignore it (managed in Step 1 now)
          lastSavedRef.current = s2
          setShouldFade(false)
        } catch {}
      }
    } catch {}
    loadingFromDraftRef.current = true
    setDraftLoading(true)
    loadDraftUtil(upgradeMode, upgradeModelId).then((r: any)=>{
      if (!alive) return
      const s2 = r?.data?.step2
      if (!s2) return
      try {
        const cap = s2.capabilities || {}
        setTasks((Array.isArray(cap.tasks)? cap.tasks : []) as TaskValue[])
        setModalities((Array.isArray(cap.modalities)? cap.modalities : []) as ModalityValue[])
        // Technical modelType - read from capabilities (new location)
        if (typeof cap.technicalModelType === 'string') setTechnicalModelType(cap.technicalModelType as TechnicalModelType)
        const arch = s2.architecture || {}
        setFrameworks(Array.isArray(arch.frameworks)? arch.frameworks : [])
        setArchitectures(Array.isArray(arch.architectures)? arch.architectures : [])
        setPrecisions(Array.isArray(arch.precisions)? arch.precisions : [])
        if (typeof arch.quantization === 'string') setQuantization(arch.quantization)
        if (arch.modelSizeParams != null) setModelSizeParams(String(arch.modelSizeParams))
        setModelFiles(Array.isArray(arch.modelFiles)? arch.modelFiles : [])
        if (typeof (arch as any).artifactSizeGB === 'string') setArtifactSize((arch as any).artifactSizeGB)
        if ((arch as any).embeddingDimension != null) setEmbedDim(String((arch as any).embeddingDimension))
        const rt = s2.runtime || {}
        if (typeof rt.python === 'string') setPython(rt.python)
        if (typeof rt.cuda === 'string') setCuda(rt.cuda)
        if (typeof rt.torch === 'string') setTorch(rt.torch)
        if (typeof rt.cudnn === 'string') setCudnn(rt.cudnn)
        setOses((Array.isArray(rt.os)? rt.os : []) as OsValue[])
        setAccelerators((Array.isArray(rt.accelerators)? rt.accelerators : []) as AcceleratorValue[])
        if (typeof rt.computeCapability === 'string') setComputeCapability(rt.computeCapability)
        const deps = s2.dependencies || {}
        const pip = Array.isArray(deps.pip)? deps.pip : []
        setPipDeps(pip.join('\n'))
        const resrc = s2.resources || {}
        if (resrc.vramGB!=null) setVramGB(String(resrc.vramGB))
        if (resrc.cpuCores!=null) setCpuCores(String(resrc.cpuCores))
        if (resrc.ramGB!=null) setRamGB(String(resrc.ramGB))
        const inf = s2.inference || {}
        if (inf.maxBatchSize!=null) setMaxBatch(String(inf.maxBatchSize))
        if (inf.contextLength!=null) setContextLen(String(inf.contextLength))
        if (inf.maxTokens!=null) setMaxTokens(String(inf.maxTokens))
        if (typeof inf.imageResolution === 'string') setImgResolution(inf.imageResolution)
        if (inf.sampleRate!=null) setSampleRate(String(inf.sampleRate))
        if (typeof (inf as any).referencePerf === 'string') setRefPerf((inf as any).referencePerf)
        if (typeof inf.triton === 'boolean') setUseTriton(inf.triton)
        const training = s2.training || {}
        const cust = s2.customer || {}
        if (typeof cust.valueProp === 'string') setValueProp(cust.valueProp)
        if (typeof cust.description === 'string') setCustomerDesc(cust.description)
        setIndustries(Array.isArray(cust.industries)? cust.industries : [])
        setUseCases(Array.isArray(cust.useCases)? cust.useCases : [])
        if (typeof cust.expectedOutcomes === 'string') setExpectedImpact(cust.expectedOutcomes)
        if (typeof cust.expectedImpact === 'string') setExpectedImpact(cust.expectedImpact)
        if (typeof cust.inputs === 'string') setInputsDesc(cust.inputs)
        if (typeof cust.outputs === 'string') setOutputsDesc(cust.outputs)
        if (Array.isArray(cust.examples)) setIoExamplesList(cust.examples)
        if (typeof cust.risks === 'string') setRisks(cust.risks)
        else if (typeof cust.limitations === 'string') setRisks(cust.limitations)
        if (typeof cust.privacy === 'string') setPrivacy(cust.privacy)
        setDeployOptions(Array.isArray(cust.deploy)? cust.deploy : [])
        if (typeof cust.support === 'string') setSupport(cust.support)
        setSupportedLangs(Array.isArray(cust.supportedLanguages)? cust.supportedLanguages : [])
        // Training fields (optional) - read from training block with legacy fallback
        if (typeof training.primaryLanguage === 'string') setPrimaryLanguage(training.primaryLanguage)
        else if (typeof cust.primaryLanguage === 'string') setPrimaryLanguage(cust.primaryLanguage)
        if (typeof training.metrics === 'string') setMetrics(training.metrics)
        else if (typeof cust.metrics === 'string') setMetrics(cust.metrics)
        if (typeof cust.prohibited === 'string') setProhibited(cust.prohibited)
        // Legacy: old drafts had modelType in customer, ignore it (managed in Step 1 now)
        setDirty(false)
        lastSavedRef.current = s2
      } catch {}
    }).catch(()=>{})
    .finally(()=>{ loadingFromDraftRef.current = false; setDraftLoading(false); setLoadedRemote(true) })
    return () => { alive = false }
  }, [upgradeMode, upgradeModelId])

  useEffect(() => {
    if (!msg) return
    const tmo = setTimeout(()=>setMsg(''), 3000)
    return () => clearTimeout(tmo)
  }, [msg])
  const onBack = (e?: React.MouseEvent<HTMLAnchorElement | HTMLButtonElement>) => {
    try { if (e && typeof (e as any).preventDefault === 'function') (e as any).preventDefault() } catch {}
    navigatingRef.current = true
    onSave().finally(()=>{ window.location.href = buildWizardUrl(`${base}/step1`) })
  }

  const TASKS = useMemo(() => [...TASK_OPTIONS], [])
  const MODALITIES = useMemo(() => [...MODALITY_OPTIONS], [])
  const ARCHS = useMemo(() => ['Llama','Mistral','GPT-NeoX','T5','ViT','CLIP','UNet','Whisper','Stable-Diffusion'], [])
  const FRAMEWORKS = useMemo(() => [...FRAMEWORK_OPTIONS], [])
  const PRECISIONS = useMemo(() => ['fp32','bf16','fp16','int8','int4'], [])
  const QUANT = useMemo(() => ['none','QLoRA','GPTQ','AWQ','GGUF','int8','int4'], [])
  const FILES = useMemo(() => [...FILE_FORMAT_OPTIONS], [])
  const OS = useMemo(() => [...OS_OPTIONS], [])
  const ACCELS = useMemo(() => [...ACCELERATOR_OPTIONS], [])

  const [tasks, setTasks] = useState<TaskValue[]>([])
  const [modalities, setModalities] = useState<ModalityValue[]>([])
  const [architectures, setArchitectures] = useState<string[]>([])
  const [frameworks, setFrameworks] = useState<FrameworkValue[]>([])
  const [precisions, setPrecisions] = useState<string[]>([])
  const [quantization, setQuantization] = useState<string>('')
  const [modelSizeParams, setModelSizeParams] = useState<string>('')
  const [modelFiles, setModelFiles] = useState<FileFormatValue[]>([])

  const [python, setPython] = useState('')
  const [cuda, setCuda] = useState('')
  const [torch, setTorch] = useState('')
  const [cudnn, setCudnn] = useState('')
  const [oses, setOses] = useState<OsValue[]>([])
  const [accelerators, setAccelerators] = useState<AcceleratorValue[]>([])
  const [computeCapability, setComputeCapability] = useState('')

  const [pipDeps, setPipDeps] = useState('')

  const [vramGB, setVramGB] = useState('0')
  const [cpuCores, setCpuCores] = useState('0')
  const [ramGB, setRamGB] = useState('0')

  const [maxBatch, setMaxBatch] = useState('')
  const [contextLen, setContextLen] = useState('')
  const [maxTokens, setMaxTokens] = useState('')
  const [imgResolution, setImgResolution] = useState('')
  const [sampleRate, setSampleRate] = useState('')
  const [useTriton, setUseTriton] = useState(false)

  // New client-facing fields
  const [expectedImpact, setExpectedImpact] = useState('')
  const [risks, setRisks] = useState('')
  const [supportedLangs, setSupportedLangs] = useState<string[]>([])
  const [primaryLanguage, setPrimaryLanguage] = useState('')
  const [metrics, setMetrics] = useState('')
  const [prohibited, setProhibited] = useState('')
  
  // Technical model type (architectural classification - Step 2)
  // This is DIFFERENT from business modelType (managed in Step 1)
  // Optional field that classifies the underlying architecture (decoder-only, encoder-decoder, etc.)
  const [technicalModelType, setTechnicalModelType] = useState<TechnicalModelType | ''>('')

  // New technical fields
  const [artifactSize, setArtifactSize] = useState('')
  const [embedDim, setEmbedDim] = useState('')
  const [refPerf, setRefPerf] = useState('')


  const INDUSTRIES = useMemo(() => (locale === 'es' ? [...INDUSTRIES_ES] : [...INDUSTRIES_EN]), [locale])

  const USECASES = useMemo(() => (locale === 'es' ? [...USE_CASES_ES] : [...USE_CASES_EN]), [locale])

  const DEPLOY = useMemo(() => (locale === 'es' ? DEPLOY_ES : DEPLOY_EN), [locale])
  const [valueProp, setValueProp] = useState('')
  const [customerDesc, setCustomerDesc] = useState('')
  const [industries, setIndustries] = useState<string[]>([])
  const [useCases, setUseCases] = useState<string[]>([])
  const [expectedOutcomes, setExpectedOutcomes] = useState('') // kept for backward compat (mapped to expectedImpact)
  const [inputsDesc, setInputsDesc] = useState('')
  const [outputsDesc, setOutputsDesc] = useState('')
  const [ioExamplesList, setIoExamplesList] = useState<Array<{ input: string; output: string; note?: string }>>([
    { input: '', output: '', note: '' }
  ])
  const [limitations, setLimitations] = useState('') // legacy -> risks
  const [privacy, setPrivacy] = useState('')
  const [deployOptions, setDeployOptions] = useState<DeployValue[]>([])
  const [support, setSupport] = useState('')
  const [activePreset, setActivePreset] = useState<string>('')
  const slugify = (s:string)=> s.toLowerCase().replace(/[^a-z0-9]+/g,'-')

  type Preset = {
    name: string
    customer: Partial<{
      valueProp: string
      description: string
      industries: string[]
      useCases: string[]
      expectedOutcomes: string
      expectedImpact: string
      inputs: string
      outputs: string
      examples: string
      limitations: string
      risks: string
      privacy: string
      deploy: string[]
      support: string
      supportedLanguages: string[]
      primaryLanguage: string
      metrics: string
      prohibited: string
    }>
    technical?: Partial<{
      tasks: string[]
      modalities: string[]
      frameworks: string[]
      architectures: string[]
      precisions: string[]
      quantization: string
      modelFiles: string[]
      vramGB: string
      cpuCores: string
      ramGB: string
      python: string
      cuda: string
      torch: string
      cudnn: string
      os: string[]
      accelerators: string[]
      computeCapability: string
      maxBatchSize: number
      contextLength: number
      maxTokens: number
      imageResolution: string
      sampleRate: number
      triton: boolean
      embeddingDimension: number
    }>
  }

  const clearPreset = () => {
    setValueProp('')
    setCustomerDesc('')
    setIndustries([])
    setUseCases([])
    setExpectedOutcomes('')
    setExpectedImpact('')
    setInputsDesc('')
    setOutputsDesc('')
    setIoExamplesList([{ input: '', output: '', note: '' }])
    setLimitations('')
    setRisks('')
    setPrivacy('')
    setDeployOptions([])
    setSupport('')
    setSupportedLangs([])
    setPrimaryLanguage('')
    setTechnicalModelType('')
    setMetrics('')
    setProhibited('')
    setActivePreset('')
    setTasks([] as TaskValue[]); setModalities([] as ModalityValue[]); setFrameworks([] as FrameworkValue[]); setArchitectures([]); setPrecisions([])
    setQuantization(''); setModelFiles([] as FileFormatValue[])
    setModelSizeParams('')
    setArtifactSize('')
    setEmbedDim('')
    setVramGB('0'); setCpuCores('0'); setRamGB('0')
    setPython(''); setCuda(''); setTorch(''); setCudnn(''); setOses([]); setAccelerators([]); setComputeCapability('')
    setMaxBatch(''); setContextLen(''); setMaxTokens(''); setImgResolution(''); setSampleRate(''); setUseTriton(false)
    setRefPerf('')
    setPipDeps('')
    setMsg(t('wizard.step2.cleared'))
    setDirty(true)
  }

  // Minimal, valid preset lists per locale
  const PRESETS_ES: Preset[] = [
    {
      name: 'Retail — Recomendador',
      customer: {
        valueProp: 'Recomienda productos por temporada y comportamiento de compra',
        description: 'Optimiza ventas y retención con recomendaciones personalizadas.',
        industries: ['retail','marketing'],
        useCases: ['recomendación'],
        expectedOutcomes: '+10% retención',
        inputs: 'CSV ventas',
        outputs: 'Top‑N por cliente',
        examples: 'Input: customer_id=123; Output: SKU-34',
        privacy: 'Entorno aislado',
        deploy: ['API SaaS'],
        support: 'Soporte 8x5'
      },
      technical: { tasks: ['recommendation'], modalities: ['tabular'], frameworks: ['ONNX'], modelFiles: ['onnx'], vramGB: '8', cpuCores: '4', ramGB: '8' }
    },
    {
      name: 'Educación — Asistente',
      customer: {
        valueProp: 'Explica problemas paso a paso',
        description: 'Asistente conversacional con ejemplos.',
        industries: ['educación'],
        useCases: ['asistente estudio'],
        expectedOutcomes: '−30% tiempo de estudio',
        inputs: 'Preguntas en texto',
        outputs: 'Respuestas con pasos',
        examples: 'Input: balancear ecuación; Output: pasos',
        privacy: 'Sin PII',
        deploy: ['API SaaS'], support: 'Foro'
      },
      technical: { tasks: ['chat'], modalities: ['text'], frameworks: ['PyTorch 2.3'], modelFiles: ['safetensors'], vramGB: '12', cpuCores: '4', ramGB: '16' }
    },
    {
      name: 'Soporte — Q&A PDFs',
      customer: {
        valueProp: 'Responde preguntas sobre documentos internos',
        description: 'Búsqueda semántica y respuestas con citas.',
        industries: ['soporte','legal'],
        useCases: ['Q&A documentos','resumen'],
        expectedOutcomes: '−40% tiempo de búsqueda',
        inputs: 'PDFs, DOCX',
        outputs: 'Respuesta con citas',
        examples: 'Pregunta: política de devoluciones; Respuesta: cita de documento',
        privacy: 'Datos en entorno aislado',
        deploy: ['API SaaS'],
        support: 'Soporte 8x5'
      },
      technical: { tasks: ['retrieval','chat'], modalities: ['text'], frameworks: ['ONNX','PyTorch 2.3'], architectures: ['T5'], precisions: ['fp16'], modelFiles: ['onnx','safetensors'], vramGB: '8', cpuCores: '4', ramGB: '8' }
    },
    {
      name: 'Finanzas — Fraude',
      customer: {
        valueProp: 'Detecta transacciones sospechosas',
        description: 'Modelo de riesgo en datos tabulares y notas.',
        industries: ['finanzas'],
        useCases: ['detección fraude','clasificación'],
        expectedOutcomes: 'Reducción de pérdidas por fraude',
        inputs: 'Transacciones (CSV), descripciones',
        outputs: 'Score de riesgo y alerta',
        examples: 'Input: txn AB123; Output: score=0.93',
        privacy: 'PII protegido',
        deploy: ['API SaaS','Docker on‑prem'],
        support: '24/7 opcional'
      },
      technical: { tasks: ['classification'], modalities: ['tabular','text'], frameworks: ['ONNX'], precisions: ['fp16'], modelFiles: ['onnx'], vramGB: '4', cpuCores: '4', ramGB: '8' }
    }
  ]

  const PRESETS_EN: Preset[] = [
    {
      name: 'Retail — Recommender',
      customer: {
        valueProp: 'Recommend products by shopping behavior',
        description: 'Personalized recommendations.',
        industries: ['retail','marketing'],
        useCases: ['recommendation'],
        expectedOutcomes: '+10% retention',
        inputs: 'Sales CSV',
        outputs: 'Top‑N per customer',
        examples: 'Input: customer_id=123; Output: SKU-34',
        privacy: 'Isolated environment',
        deploy: ['SaaS API'],
        support: 'Business 8x5'
      },
      technical: { tasks: ['recommendation'], modalities: ['tabular'], frameworks: ['ONNX'], modelFiles: ['onnx'], vramGB: '8', cpuCores: '4', ramGB: '8' }
    },
    {
      name: 'Education — Study assistant',
      customer: {
        valueProp: 'Explains problems step by step',
        description: 'Conversational assistant with examples.',
        industries: ['education'],
        useCases: ['study assistant'],
        expectedOutcomes: '−30% study time',
        inputs: 'Text questions',
        outputs: 'Answers with steps',
        examples: 'Question: balance equation; Answer: steps',
        privacy: 'No PII',
        deploy: ['SaaS API'], support: 'Forum'
      },
      technical: { tasks: ['chat'], modalities: ['text'], frameworks: ['PyTorch 2.3'], modelFiles: ['safetensors'], vramGB: '12', cpuCores: '4', ramGB: '16' }
    },
    {
      name: 'Support — PDFs Q&A',
      customer: {
        valueProp: 'Answers questions over your internal docs',
        description: 'Semantic search with cited answers.',
        industries: ['support','legal'],
        useCases: ['documents Q&A','summarization'],
        expectedOutcomes: '−40% time to find information',
        inputs: 'PDFs, DOCX',
        outputs: 'Answer with citations',
        examples: 'Question: return policy; Answer: cited paragraph',
        privacy: 'Isolated environment',
        deploy: ['SaaS API'],
        support: 'Business 8x5'
      },
      technical: { tasks: ['retrieval','chat'], modalities: ['text'], frameworks: ['ONNX','PyTorch 2.3'], architectures: ['T5'], precisions: ['fp16'], modelFiles: ['onnx','safetensors'], vramGB: '8', cpuCores: '4', ramGB: '8' }
    },
    {
      name: 'Finance — Fraud detection',
      customer: {
        valueProp: 'Detect suspicious transactions',
        description: 'Risk model over tabular and text signals.',
        industries: ['finance'],
        useCases: ['fraud detection','classification'],
        expectedOutcomes: 'Lower fraud losses',
        inputs: 'Transactions CSV, descriptions',
        outputs: 'Risk score and alert',
        examples: 'Input: txn AB123; Output: score=0.93',
        privacy: 'PII protected',
        deploy: ['SaaS API','Docker on‑prem'],
        support: '24/7 optional'
      },
      technical: { tasks: ['classification'], modalities: ['tabular','text'], frameworks: ['ONNX'], precisions: ['fp16'], modelFiles: ['onnx'], vramGB: '4', cpuCores: '4', ramGB: '8' }
    }
  ]

  const PRESETS: Preset[] = useMemo(() => (locale === 'es' ? PRESETS_ES : PRESETS_EN), [locale])

  const getPresetIcon = (name: string) => {
    const n = name.toLowerCase()
    if (n.startsWith('retail')) return <LocalMallIcon fontSize="small" />
    if (n.startsWith('educación') || n.startsWith('education')) return <SchoolIcon fontSize="small" />
    if (n.startsWith('soporte') || n.startsWith('support')) return <DescriptionIcon fontSize="small" />
    if (n.startsWith('salud') || n.startsWith('healthcare')) return <LocalHospitalIcon fontSize="small" />
    if (n.startsWith('legal')) return <GavelIcon fontSize="small" />
    if (n.startsWith('finanzas') || n.startsWith('finance')) return <SavingsIcon fontSize="small" />
    if (n.startsWith('marketing')) return <CampaignIcon fontSize="small" />
    if (n.startsWith('manufactura') || n.startsWith('manufacturing')) return <PrecisionManufacturingIcon fontSize="small" />
    if (n.startsWith('logística') || n.startsWith('logistics')) return <LocalShippingIcon fontSize="small" />
    if (n.startsWith('e‑commerce') || n.startsWith('e-commerce')) return <ShoppingCartIcon fontSize="small" />
    if (n.startsWith('rrhh') || n.startsWith('hr')) return <WorkIcon fontSize="small" />
    if (n.startsWith('energía') || n.startsWith('energy')) return <BoltIcon fontSize="small" />
    return undefined
  }

  const parseExample = (s: string) => {
    const inputMatch = s.match(/Input:\s*(.*?)(;|$)/i)
    const outputMatch = s.match(/Output:\s*(.*)$/i)
    const input = inputMatch ? inputMatch[1].trim() : ''
    const output = outputMatch ? outputMatch[1].trim() : ''
    if (input || output) return { input, output }
    return { input: '', output: '', note: s }
  }

  const applyPreset = (p: Preset, mode: 'minimal'|'full' = 'full') => {
    const minimal = mode === 'minimal'
    if (p.customer.valueProp !== undefined) setValueProp(p.customer.valueProp)
    if (p.customer.description !== undefined) setCustomerDesc(p.customer.description)
    if (p.customer.industries) setIndustries(p.customer.industries)
    if (p.customer.useCases) setUseCases(p.customer.useCases)
    // Prefer setting expectedImpact to satisfy validation directly; fallback to expectedOutcomes
    if ((p.customer as any).expectedImpact !== undefined) setExpectedImpact((p.customer as any).expectedImpact as any)
    else if (p.customer.expectedOutcomes !== undefined) setExpectedImpact(p.customer.expectedOutcomes)
    if (p.customer.inputs !== undefined) setInputsDesc(p.customer.inputs)
    if (p.customer.outputs !== undefined) setOutputsDesc(p.customer.outputs)
    if (p.customer.examples !== undefined) setIoExamplesList([parseExample(p.customer.examples)])
    if ((p.customer as any).risks !== undefined) setRisks((p.customer as any).risks as any)
    else if (p.customer.limitations !== undefined) setRisks(p.customer.limitations)
    if (p.customer.privacy !== undefined) setPrivacy(p.customer.privacy)
    if (p.customer.deploy) setDeployOptions(p.customer.deploy as DeployValue[])
    if (p.customer.support !== undefined) setSupport(p.customer.support)
    if ((p.customer as any).supportedLanguages) setSupportedLangs((p.customer as any).supportedLanguages as any)
    if ((p.customer as any).primaryLanguage !== undefined && !minimal) setPrimaryLanguage((p.customer as any).primaryLanguage as any)
    if ((p.customer as any).metrics !== undefined && !minimal) setMetrics((p.customer as any).metrics as any)
    // Technical modelType from capabilities (if provided in preset)
    if ((p as any).technicalModelType) setTechnicalModelType((p as any).technicalModelType as TechnicalModelType)
    if ((p.customer as any).prohibited !== undefined) setProhibited((p.customer as any).prohibited as any)

    if (p.technical?.tasks) setTasks(p.technical.tasks as TaskValue[])
    if (p.technical?.modalities) setModalities(p.technical.modalities as ModalityValue[])
    if (p.technical?.frameworks) setFrameworks(p.technical.frameworks as FrameworkValue[])
    if (!minimal && p.technical?.architectures) setArchitectures(p.technical.architectures)
    if (!minimal && p.technical?.precisions) setPrecisions(p.technical.precisions)
    if (!minimal && p.technical?.quantization) setQuantization(p.technical.quantization)
    if (p.technical?.modelFiles) setModelFiles(p.technical.modelFiles as FileFormatValue[])
    if (p.technical?.vramGB) setVramGB(p.technical.vramGB)
    if (p.technical?.cpuCores) setCpuCores(p.technical.cpuCores)
    if (p.technical?.ramGB) setRamGB(p.technical.ramGB)
    if ((p.technical as any)?.python) setPython((p.technical as any).python)
    if ((p.technical as any)?.os) setOses(((p.technical as any).os) as OsValue[])
    if ((p.technical as any)?.accelerators) setAccelerators(((p.technical as any).accelerators) as AcceleratorValue[])
    if ((p.technical as any)?.maxBatchSize) setMaxBatch(String((p.technical as any).maxBatchSize))
    if ((p.technical as any)?.contextLength) setContextLen(String((p.technical as any).contextLength))
    if ((p.technical as any)?.maxTokens) setMaxTokens(String((p.technical as any).maxTokens))
    if (!minimal && (p.technical as any)?.embeddingDimension) setEmbedDim(String((p.technical as any).embeddingDimension))
    if (!minimal && (p.technical as any)?.imageResolution) setImgResolution((p.technical as any).imageResolution)
    if (!minimal && (p.technical as any)?.sampleRate) setSampleRate(String((p.technical as any).sampleRate))
    if (!minimal && (p.technical as any)?.triton !== undefined) setUseTriton(Boolean((p.technical as any).triton))
    // Backfill for FULL mode: ensure all mandatory fields are populated with sensible defaults
    if (!minimal) {
      // Examples backfill
      const hasEx = (arr: Array<{input:string;output:string;note?:string}>) => Array.isArray(arr) && arr.some(e => (e.input||'').trim() && (e.output||'').trim())
      const exInput = locale==='es' ? 'Pregunta: balancear ecuación H2 + O2' : 'Question: balance chemical equation H2 + O2'
      const exOutput = locale==='es' ? 'Pasos y resultado: 2H2 + O2 → 2H2O' : 'Steps and result: 2H2 + O2 → 2H2O'
      if (!hasEx(ioExamplesList)) {
        const note = locale==='es' ? 'Ejemplo de formato de I/O para validación' : 'Example I/O format for validation'
        setIoExamplesList([{ input: exInput, output: exOutput, note }])
      } else {
        // Ensure at least first example has a note
        setIoExamplesList((prev)=>{
          const note = locale==='es' ? 'Ejemplo de formato de I/O para validación' : 'Example I/O format for validation'
          const list = Array.isArray(prev)? [...prev] : []
          if (list.length>0) {
            const e0 = list[0]
            if (!((e0.note||'').trim())) list[0] = { ...e0, note }
          }
          return list
        })
      }
      const defLang = locale === 'es' ? 'es' : 'en'
      // Customer defaults
      if (!supportedLangs.length) setSupportedLangs([defLang])
      if (!primaryLanguage.trim()) setPrimaryLanguage(defLang)
      // Auto-infer technical modelType if not set
      if (!technicalModelType) {
        if (tasks.includes('embedding')) setTechnicalModelType('embedding')
        else if (tasks.includes('chat') || tasks.includes('text-generation') || tasks.includes('instruction-following')) setTechnicalModelType('decoder-only')
      }
      if (!expectedImpact.trim()) setExpectedImpact(locale==='es' ? 'Impacto esperado: mejora de productividad' : 'Expected impact: productivity improvement')
      if (!risks.trim()) setRisks(locale==='es' ? 'Revisar exactitud antes de producción' : 'Review accuracy before production')
      if (!metrics.trim()) setMetrics('N/A')
      if (!prohibited.trim()) {
        const inds = (p.customer.industries||[]).map(x=>x.toLowerCase())
        const nm = p.name.toLowerCase()
        const isRetail = inds.includes('retail') || inds.includes('marketing') || nm.includes('retail')
        const isEdu = inds.includes('educación') || inds.includes('education') || nm.includes('educa')
        const prohibitedDefault = isRetail
          ? (locale==='es' ? 'No usar para precios/stock automatizados sin supervisión humana ni para decisiones sobre PII sensible' : 'Do not use for automated pricing/stock decisions without human oversight or on sensitive PII')
          : isEdu
          ? (locale==='es' ? 'No usar para calificar exámenes automáticamente ni para facilitar fraude académico' : 'Do not use for automatic grading or facilitating academic dishonesty')
          : (locale==='es' ? 'No usar para decisiones críticas sin revisión humana' : 'Do not use for critical decisions without human review')
        setProhibited(prohibitedDefault)
      }
      // Technical defaults
      if (!frameworks.length) setFrameworks(['PyTorch 2.3'])
      if (!architectures.length) setArchitectures(['Llama'])
      if (!precisions.length) setPrecisions(['fp16'])
      if (!quantization.trim()) setQuantization('none')
      if (!modelFiles.length) setModelFiles(['safetensors'])
      if (!(modelSizeParams||'').trim()) setModelSizeParams('7B')
      if (!(artifactSize||'').trim()) setArtifactSize(locale==='es' ? '≈4.2 GB' : '≈4.2 GB')
      if (!python.trim()) setPython('3.10')
      if (!oses.length) setOses(['linux'])
      if (!accelerators.length) setAccelerators(['nvidia-cuda'])
      if (!computeCapability.trim()) setComputeCapability('sm_80')
      if (!(Number(vramGB)||0)) setVramGB('8')
      if (!(Number(cpuCores)||0)) setCpuCores('4')
      if (!(Number(ramGB)||0)) setRamGB('16')
      if (!(Number(maxBatch)||0)) setMaxBatch('1')
      if (!(Number(contextLen)||0)) setContextLen('2048')
      if (!(Number(maxTokens)||0)) setMaxTokens('512')
      if (modalities.includes('image') && !imgResolution.trim()) setImgResolution('1024x1024')
      if (modalities.includes('audio') && !(Number(sampleRate)||0)) setSampleRate('16000')
      if (tasks.includes('embedding') && !(Number(embedDim)||0)) setEmbedDim('768')
      // Dependencies and inference backfill
      if (!(pipDeps||'').trim()) setPipDeps('torch\ntransformers')
      if (!useTriton) setUseTriton(true)
      if (!(refPerf||'').trim()) setRefPerf(locale==='es' ? '~40 tok/s en A100 80GB, batch=4' : '~40 tok/s on A100 80GB, batch=4')
    }
    // Inject sensible defaults for minimal presets to pass validation
    if (minimal) {
      // Customer minimal defaults required by validation
      const defLang = locale === 'es' ? 'es' : 'en'
      if (!supportedLangs.length) setSupportedLangs([defLang])
      if (!risks.trim()) setRisks(locale==='es' ? 'Limitaciones conocidas: revisar exactitud y sesgos' : 'Known limitations: review accuracy and bias')
      if (!prohibited.trim()) {
        const inds = (p.customer.industries||[]).map(x=>x.toLowerCase())
        const nm = p.name.toLowerCase()
        const isRetail = inds.includes('retail') || inds.includes('marketing') || nm.includes('retail')
        const isEdu = inds.includes('educación') || inds.includes('education') || nm.includes('educa')
        const prohibitedDefault = isRetail
          ? (locale==='es' ? 'No usar para precios/stock automatizados sin supervisión humana ni para decisiones sobre PII sensible' : 'Do not use for automated pricing/stock decisions without human oversight or on sensitive PII')
          : isEdu
          ? (locale==='es' ? 'No usar para calificar exámenes automáticamente ni para facilitar fraude académico' : 'Do not use for automatic grading or facilitating academic dishonesty')
          : (locale==='es' ? 'No usar para decisiones críticas sin revisión humana' : 'Do not use for critical decisions without human review')
        setProhibited(prohibitedDefault)
      }

      // Technical minimal defaults
      if (!python) setPython('3.10')
      if (!oses.length) setOses(['linux'])
      if (!accelerators.length) setAccelerators(['nvidia-cuda'])
      if (!(Number(vramGB)||0)) setVramGB('4')
      if (!(Number(cpuCores)||0)) setCpuCores('2')
      if (!(Number(ramGB)||0)) setRamGB('8')
      if (!(Number(maxBatch)||0)) setMaxBatch('1')
      if (!(Number(contextLen)||0)) setContextLen('2048')
      if (!(Number(maxTokens)||0)) setMaxTokens('256')
    }
    setMsg(t('wizard.step2.presetApplied'))
    setActivePreset(p.name)
    setDirty(true)
    setTimeout(()=>{ onSave('preset') }, 250)
  }

  // Marcar dirty y autoguardar con debounce cuando cambian campos importantes
  useEffect(()=>{
    if (!didMountRef.current) { didMountRef.current = true; return }
    setDirty(true)
    if (autoSaveDebounceRef.current) clearTimeout(autoSaveDebounceRef.current)
    autoSaveDebounceRef.current = setTimeout(() => {
      if (!navigatingRef.current && !saving && !loadingFromDraftRef.current) {
        onSave('autosave')
      }
    }, 700)
    return () => { if (autoSaveDebounceRef.current) clearTimeout(autoSaveDebounceRef.current) }
  }, [
    // Cliente
    valueProp, customerDesc, industries, useCases, expectedImpact, risks, inputsDesc, outputsDesc, ioExamplesList, privacy, deployOptions, support,
    supportedLangs, primaryLanguage, metrics, prohibited,
    // Capacidades
    tasks, modalities, technicalModelType,
    // Arquitectura
    frameworks, architectures, precisions, quantization, modelSizeParams, modelFiles, artifactSize, embedDim,
    // Runtime
    python, cuda, torch, cudnn, oses, accelerators, computeCapability,
    // Recursos
    vramGB, cpuCores, ramGB,
    // Inferencia
    maxBatch, contextLen, maxTokens, imgResolution, sampleRate, useTriton, refPerf
  ])

  // Removed native beforeunload guard: autosave (700ms debounce) and onSave() before navigation already protect against data loss.

  const hasValidExample = useMemo(()=> (ioExamplesList||[]).some(e=> (e.input||'').trim() && (e.output||'').trim() ), [ioExamplesList])
  
  // Get list of missing required fields for better UX feedback
  const getMissingClientFields = (): string[] => {
    const missing: string[] = []
    const isES = locale === 'es'
    if (!valueProp.trim()) missing.push(isES ? 'Propuesta de valor' : 'Value proposition')
    if (!customerDesc.trim()) missing.push(isES ? 'Descripción para el cliente' : 'Customer description')
    if (!expectedImpact.trim()) missing.push(isES ? 'Impacto esperado' : 'Expected impact')
    if (industries.length === 0) missing.push(isES ? 'Industrias' : 'Industries')
    if (useCases.length === 0) missing.push(isES ? 'Casos de uso' : 'Use cases')
    if (supportedLangs.length === 0) missing.push(isES ? 'Idiomas soportados' : 'Supported languages')
    if (!inputsDesc.trim()) missing.push(isES ? 'Descripción de entradas' : 'Inputs description')
    if (!outputsDesc.trim()) missing.push(isES ? 'Descripción de salidas' : 'Outputs description')
    if (!hasValidExample) missing.push(isES ? 'Al menos un ejemplo válido' : 'At least one valid example')
    if (!risks.trim()) missing.push(isES ? 'Limitaciones y riesgos' : 'Limitations and risks')
    if (!prohibited.trim()) missing.push(isES ? 'Usos prohibidos' : 'Prohibited uses')
    if (!privacy.trim()) missing.push(isES ? 'Privacidad' : 'Privacy')
    if (!support.trim()) missing.push(isES ? 'Soporte' : 'Support')
    return missing
  }
  
  const getMissingTechFields = (): string[] => {
    const missing: string[] = []
    const isES = locale === 'es'
    if (!tasks || tasks.length === 0) missing.push(isES ? 'Tareas' : 'Tasks')
    if (!modalities || modalities.length === 0) missing.push(isES ? 'Modalidades' : 'Modalities')
    if (!frameworks || frameworks.length === 0) missing.push(isES ? 'Frameworks' : 'Frameworks')
    if (!modelFiles || modelFiles.length === 0) missing.push(isES ? 'Formatos de archivo' : 'Model files')
    if (!python.trim()) missing.push('Python')
    if (!oses || oses.length === 0) missing.push(isES ? 'Sistemas operativos' : 'Operating systems')
    if (!accelerators || accelerators.length === 0) missing.push(isES ? 'Aceleradores' : 'Accelerators')
    if (Number(vramGB || 0) <= 0) missing.push('VRAM (GB)')
    if (Number(cpuCores || 0) <= 0) missing.push(isES ? 'Núcleos CPU' : 'CPU cores')
    if (Number(ramGB || 0) <= 0) missing.push('RAM (GB)')
    if (Number(maxBatch || 0) <= 0) missing.push(isES ? 'Tamaño de batch máx.' : 'Max batch size')
    if (Number(contextLen || 0) <= 0) missing.push(isES ? 'Longitud de contexto' : 'Context length')
    if (Number(maxTokens || 0) <= 0) missing.push(isES ? 'Tokens máx.' : 'Max tokens')
    if (tasks.includes('embedding') && (!embedDim || Number(embedDim) <= 0)) {
      missing.push(isES ? 'Dimensión de embedding' : 'Embedding dimension')
    }
    return missing
  }
  
  const isClientSheetValid = () => getMissingClientFields().length === 0
  const isTechValid = () => getMissingTechFields().length === 0
  const onNext = (e?: React.MouseEvent<HTMLAnchorElement | HTMLButtonElement>) => {
    setShowErr(true)
    setNextLoading(true)
    const missingClient = getMissingClientFields()
    const missingTech = getMissingTechFields()
    
    if (missingClient.length > 0) {
      if (e && typeof (e as any).preventDefault === 'function') (e as any).preventDefault()
      const isES = locale === 'es'
      const prefix = isES ? 'Campos faltantes: ' : 'Missing fields: '
      // Show up to 3 missing fields, then "and X more"
      const shown = missingClient.slice(0, 3).join(', ')
      const extra = missingClient.length > 3 ? (isES ? ` y ${missingClient.length - 3} más` : ` and ${missingClient.length - 3} more`) : ''
      setMsg(prefix + shown + extra)
      const top = document.getElementById('client-sheet-top')
      top?.scrollIntoView({ behavior:'smooth', block:'start' })
      setNextLoading(false)
      return
    }
    if (missingTech.length > 0) {
      if (e && typeof (e as any).preventDefault === 'function') (e as any).preventDefault()
      const isES = locale === 'es'
      const prefix = isES ? 'Campos técnicos faltantes: ' : 'Missing technical fields: '
      const shown = missingTech.slice(0, 3).join(', ')
      const extra = missingTech.length > 3 ? (isES ? ` y ${missingTech.length - 3} más` : ` and ${missingTech.length - 3} more`) : ''
      setMsg(prefix + shown + extra)
      const el = document.querySelector('[data-step2-tech-root]') as HTMLElement | null
      el?.scrollIntoView({ behavior:'smooth', block:'start' })
      setNextLoading(false)
      return
    }
    if (e && typeof (e as any).preventDefault === 'function') (e as any).preventDefault()
    navigatingRef.current = true
    onSave().finally(()=>{ window.location.href = buildWizardUrl(`${base}/step3`) })
  }

  const isMeaningful = (p: any) => {
    const d = p?.data || {}
    const cust = d.customer || {}
    const arch = d.architecture || {}
    const cap = d.capabilities || {}
    const rt = d.runtime || {}
    const dep = d.dependencies || {}
    const res = d.resources || {}
    const inf = d.inference || {}
    const nonZero = (n: any) => Number(n||0) > 0
    return Boolean(
      (cust.valueProp && cust.valueProp.trim()) ||
      (cust.description && cust.description.trim()) ||
      (Array.isArray(cust.industries) && cust.industries.length) ||
      (Array.isArray(cust.useCases) && cust.useCases.length) ||
      (Array.isArray(cap.tasks) && cap.tasks.length) ||
      (Array.isArray(cap.modalities) && cap.modalities.length) ||
      (Array.isArray(arch.frameworks) && arch.frameworks.length) ||
      (Array.isArray(arch.architectures) && arch.architectures.length) ||
      (Array.isArray(arch.precisions) && arch.precisions.length) ||
      (Array.isArray(arch.modelFiles) && arch.modelFiles.length) ||
      (Array.isArray(rt.os) && rt.os.length) ||
      (Array.isArray(rt.accelerators) && rt.accelerators.length) ||
      (Array.isArray(dep.pip) && dep.pip.length) ||
      nonZero(res.vramGB) || nonZero(res.cpuCores) || nonZero(res.ramGB) ||
      nonZero(inf.maxBatchSize) || nonZero(inf.contextLength) || nonZero(inf.maxTokens) || (inf.imageResolution && inf.imageResolution.trim())
    )
  }

  const shallowEqualJSON = (a: any, b: any) => {
    try { return JSON.stringify(a) === JSON.stringify(b) } catch { return false }
  }

  const onSave = async (reason?: 'autosave'|'preset'|'manual') => {
    setSaving(true)
    setMsg('')
    const ns = (s: any) => String(s ?? '').trim()
    const ua = (arr: any[]) => Array.from(new Map((Array.isArray(arr)?arr:[]).map((x)=>{ const v=ns(x); return [v.toLowerCase(), v] })).values()).filter(Boolean)
    const exs = (list: Array<{input:string;output:string;note?:string}>) => (Array.isArray(list)?list:[]).map(e=>({ input: ns(e.input), output: ns(e.output), note: ns(e.note||'') || undefined }))
    const nTasks = ua(tasks)
    const nModalities = ua(modalities)
    const nFrameworks = ua(frameworks)
    const nArchitectures = ua(architectures)
    const nPrecisions = ua(precisions)
    const nModelFiles = ua(modelFiles)
    const nOses = ua(oses)
    const nAccelerators = ua(accelerators)
    const nIndustries = ua(industries)
    const nUseCases = ua(useCases)
    const nDeploy = ua(deployOptions)
    const nExamples = exs(ioExamplesList)
    const nValueProp = ns(valueProp)
    const nCustomerDesc = ns(customerDesc)
    const nExpected = ns(expectedImpact || expectedOutcomes)
    const nInputs = ns(inputsDesc)
    const nOutputs = ns(outputsDesc)
    const nRisks = ns(risks || limitations)
    const nPrivacy = ns(privacy)
    const nSupport = ns(support)
    const nImgRes = ns(imgResolution)
    const nQuant = ns(quantization)
    const nPython = ns(python)
    const nCuda = ns(cuda)
    const nTorch = ns(torch)
    const nCudnn = ns(cudnn)
    const nCompute = ns(computeCapability)
    const nSupportedLangs = ua(supportedLangs)
    const nPrimaryLang = ns(primaryLanguage)
    const nMetrics = ns(metrics)
    const nProhibited = ns(prohibited)
    const nTechnicalModelType = ns(technicalModelType)
    const nArtifactSize = ns(artifactSize)
    const nEmbedDim = ns(embedDim)
    const nRefPerf = ns(refPerf)
    const nPip = pipDeps.split(/[\,\n]/g).map(s=>ns(s)).filter(Boolean)
    const payload = {
      address: walletAddress,
      step: 'step2',
      data: {
        capabilities: { tasks: nTasks, modalities: nModalities, technicalModelType: nTechnicalModelType || undefined },
        architecture: { frameworks: nFrameworks, architectures: nArchitectures, precisions: nPrecisions, quantization: nQuant, modelSizeParams: ns(modelSizeParams) || undefined, modelFiles: nModelFiles, artifactSizeGB: nArtifactSize || undefined, embeddingDimension: nEmbedDim ? Number(nEmbedDim) : undefined },
        runtime: { python: nPython, cuda: nCuda, torch: nTorch || undefined, cudnn: nCudnn || undefined, os: nOses, accelerators: nAccelerators, computeCapability: nCompute },
        dependencies: { pip: nPip },
        resources: { vramGB: Number(vramGB||0), cpuCores: Number(cpuCores||0), ramGB: Number(ramGB||0) },
        inference: { maxBatchSize: Number(maxBatch||0), contextLength: Number(contextLen||0), maxTokens: Number(maxTokens||0), imageResolution: nImgRes, sampleRate: Number(sampleRate||0), triton: useTriton, referencePerf: nRefPerf || undefined },
        training: { primaryLanguage: nPrimaryLang || undefined, metrics: nMetrics || undefined },
        customer: {
          valueProp: nValueProp,
          description: nCustomerDesc,
          industries: nIndustries,
          useCases: nUseCases,
          expectedImpact: nExpected,
          inputs: nInputs,
          outputs: nOutputs,
          examples: nExamples,
          risks: nRisks,
          privacy: nPrivacy,
          deploy: nDeploy,
          support: nSupport,
          supportedLanguages: nSupportedLangs,
          prohibited: nProhibited || undefined
        }
      }
    }
    // Guardas defensivas para autosave: evitar sobreescribir con vacío o sin cambios
    if (reason === 'autosave') {
      if (!isMeaningful(payload)) {
        setSaving(false)
        return
      }
      if (lastSavedRef.current && shallowEqualJSON(lastSavedRef.current, payload.data)) {
        setSaving(false)
        return
      }
    }
    try { console.log('[step2] payload to save:', payload) } catch {}
    try {
      const r = await saveDraftUtil('step2', payload.data, upgradeMode, upgradeModelId)
      setMsg(r?.ok ? t('wizard.common.saved') : t('wizard.common.errorSaving'))
      lastSavedRef.current = payload.data
      const localStorageKey = `draft_step2_${getDraftId(upgradeMode, upgradeModelId)}`
      try { localStorage.setItem(localStorageKey, JSON.stringify(payload.data)) } catch {}
      setDirty(false)
      return !!r?.ok
    } catch (e) {
      setMsg(t('wizard.common.errorSaving'))
    } finally {
      setSaving(false)
    }
  }

  const navigateAfterSave = async (e: React.MouseEvent<HTMLAnchorElement | HTMLButtonElement>, url: string) => {
    e.preventDefault()
    navigatingRef.current = true
    await onSave()
    window.location.href = url
  }

  // Step 2 completeness selector (placed after all state declarations)
  const isStep2FullyFilled = useMemo(() => {
    const isStr = (v: any) => typeof v === 'string' && v.trim().length > 0
    const asNumFilled = (v: any) => v != null && v !== '' && !Number.isNaN(Number(v))
    const isArrStr = (a: any) => Array.isArray(a) && a.length > 0 && a.every((s: any) => typeof s === 'string' && s.trim().length > 0)
    const examplesFilled = Array.isArray(ioExamplesList) && ioExamplesList.length > 0 && ioExamplesList.every(e => isStr(e.input) && isStr(e.output))
    const pipArr = String(pipDeps || '').split(/\r?\n|,/).map(s => s.trim()).filter(Boolean)

    const capOk = isArrStr(tasks) && isArrStr(modalities)
    // technicalModelType is optional - useful but not required
    const archOk = isArrStr(frameworks)
      && isArrStr(architectures)
      && isArrStr(precisions)
      && isStr(quantization)
      && isStr(modelSizeParams)
      && isArrStr(modelFiles)
      && isStr(artifactSize)
      && asNumFilled(embedDim)
    const rtOk = isStr(python)
      && isStr(cuda)
      && isStr(torch)
      && isStr(cudnn)
      && isArrStr(oses)
      && isArrStr(accelerators)
      && isStr(computeCapability)
    const depsOk = Array.isArray(pipArr) && pipArr.length > 0 && pipArr.every(s => s.length > 0)
    const resOk = asNumFilled(vramGB) && asNumFilled(cpuCores) && asNumFilled(ramGB)
    const infNumbersOk = asNumFilled(maxBatch) && asNumFilled(contextLen) && asNumFilled(maxTokens)
    const needImg = modalities.includes('image')
    const needAud = modalities.includes('audio')
    const imgOk = !needImg || isStr(imgResolution)
    const audOk = !needAud || asNumFilled(sampleRate)
    const tritonOk = typeof useTriton === 'boolean'
    const refOk = isStr(refPerf) || asNumFilled(refPerf)
    const infOk = infNumbersOk && imgOk && audOk && tritonOk && refOk
    const custOk = isStr(valueProp)
      && isStr(customerDesc)
      && isArrStr(industries)
      && isArrStr(useCases)
      && isStr(expectedImpact)
      && isStr(inputsDesc)
      && isStr(outputsDesc)
      && examplesFilled
      && isStr(risks)
      && isStr(privacy)
      && isArrStr(deployOptions)
      && isStr(support)
      && isArrStr(supportedLangs)
      && isStr(primaryLanguage)
      && isStr(metrics)
      && isStr(prohibited)

    return capOk && archOk && rtOk && depsOk && resOk && infOk && custOk
  }, [tasks, modalities, technicalModelType, frameworks, architectures, precisions, quantization, modelSizeParams, modelFiles, artifactSize, embedDim, python, cuda, torch, cudnn, oses, accelerators, computeCapability, pipDeps, vramGB, cpuCores, ramGB, maxBatch, contextLen, maxTokens, imgResolution, sampleRate, useTriton, refPerf, valueProp, customerDesc, industries, useCases, expectedImpact, inputsDesc, outputsDesc, ioExamplesList, risks, privacy, deployOptions, support, supportedLangs, primaryLanguage, metrics, prohibited])
  ;
  return (
    <WizardThemeProvider>
    <Box sx={{ minHeight: '100vh', background: 'linear-gradient(180deg, #0f2740 0%, #0b1626 30%, #0a111c 100%)' }}>
      <Box sx={{
        p: { xs:2, md:4 },
        maxWidth: 1000,
        mx: 'auto',
        color:'#ffffffd6',
        '& .MuiTypography-h6': { color:'#fff' },
        '& .MuiTypography-subtitle1': { color:'#fff' },
        '& .MuiTypography-subtitle2': { color:'#fff' },
        '& .MuiTypography-body2': { color:'#ffffffcc' },
        '& .MuiTypography-caption': { color:'#ffffff99' },
        '& .MuiFormLabel-root': { color:'#ffffffcc' },
        '& .MuiFormLabel-root.Mui-focused': { color:'#fff' },
        '& .MuiSvgIcon-root': { color:'#fff' },
        '& .MuiIconButton-root': { color:'#fff' },
        '& .MuiSelect-select': { color:'#fff' },
        '& .MuiSelect-icon': { color:'#fff' },
        '& .MuiAutocomplete-endAdornment .MuiSvgIcon-root': { color:'#fff' },
        '& .MuiAutocomplete-popupIndicator .MuiSvgIcon-root': { color:'#fff' },
        '& .MuiAutocomplete-clearIndicator .MuiSvgIcon-root': { color:'#fff' },
        '& .MuiChip-deleteIcon': { color:'#fff', opacity: 1 },
        '& .MuiChip-root .MuiChip-deleteIcon:hover': { color:'#fff', opacity: 1 },
        '& .MuiChip-root': { color:'#fff', borderColor:'rgba(255,255,255,0.28)' },
        '& .MuiInputBase-input': { color:'#fff', WebkitTextFillColor:'#fff' },
        '& .MuiOutlinedInput-notchedOutline': { borderColor:'rgba(255,255,255,0.28)' },
        '& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline': { borderColor:'rgba(255,255,255,0.40)' },
        '& .MuiFormHelperText-root': { color:'#ffffffcc' },
        '& .MuiFormControlLabel-root': { color:'#fff' },
        '& .MuiAccordion-root': { background:'transparent', boxShadow:'none' },
        '& .MuiAccordionSummary-content': { color:'#fff' },
        '& .MuiAccordionSummary-expandIconWrapper .MuiSvgIcon-root': { color:'#fff' },
        '& .MuiPaper-outlined': {
          borderRadius: '16px',
          border:'2px solid',
          borderColor:'oklch(0.30 0 0)',
          background:'linear-gradient(180deg, rgba(38,46,64,0.78), rgba(20,26,42,0.78))',
          boxShadow:'0 0 0 1px rgba(255,255,255,0.04) inset, 0 10px 28px rgba(0,0,0,0.40)',
          backdropFilter:'blur(10px)'
        }
      }}>
      <GlobalStyles styles={{
        '.MuiPopover-root .MuiPaper, .MuiMenu-paper, .MuiAutocomplete-popper .MuiPaper, .MuiAutocomplete-paper': {
          borderRadius: 12,
          border: '2px solid oklch(0.30 0 0)',
          background: 'linear-gradient(180deg, rgba(38,46,64,0.92), rgba(20,26,42,0.92))',
          boxShadow: '0 0 0 1px rgba(255,255,255,0.05) inset, 0 16px 36px rgba(0,0,0,0.45)',
          backdropFilter: 'blur(10px)',
          color: '#fff'
        },
        '.MuiAutocomplete-listbox': { background: 'transparent' },
        '.MuiMenuItem-root, .MuiAutocomplete-option': { color: '#fff' },
        '.MuiMenuItem-root .MuiSvgIcon-root, .MuiAutocomplete-option .MuiSvgIcon-root': { color: '#fff' },
        '.MuiMenuItem-root.Mui-selected, .MuiAutocomplete-option.Mui-focused': { backgroundColor: 'rgba(255,255,255,0.10)' }
      }} />
      <Stack spacing={2} sx={{ mb: 2 }}>
        <Typography variant="h4" fontWeight={700} sx={{ color:'#fff' }}>{t('wizard.step2.title')}</Typography>
        <Typography sx={{ color:'#ffffffcc' }}>{t('wizard.step2.subtitle')}</Typography>
        {draftLoading && (
          <Typography variant="body2" color="text.secondary">
            {locale==='es' ? 'Cargando tu borrador…' : 'Loading your draft…'}
          </Typography>
        )}
        {isStep2FullyFilled && (
          <Chip
            color="success"
            size="small"
            label={locale==='es' ? 'Paso 2 • Completo' : 'Step 2 • All fields filled'}
          />
        )}
      </Stack>

      <Paper variant="outlined" sx={{ p: { xs:2, md:3 }, mb: 3, borderRadius:2 }}>
        <Stack id="client-sheet-top" direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
          <Typography variant="h6" fontWeight={600}>{t('wizard.step2.clientSheet.title')}</Typography>
          <Tooltip title={t('wizard.step2.clientSheet.help')}><InfoOutlinedIcon fontSize="small" color="action"/></Tooltip>
        </Stack>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {t('wizard.step2.clientSheetMicrocopy.intro')}
        </Typography>
        <Box sx={{ mb: 1, position: 'relative' }}>
          <Box sx={{ position:'absolute', inset: 0, pointerEvents:'none' }} />
          <IconButton aria-label="prev" onClick={()=>scrollPresets('prev')} sx={{ position:'absolute', left: -8, top: '50%', transform:'translateY(-50%)', zIndex:1, bgcolor:'background.paper', boxShadow:1, '& .MuiSvgIcon-root': { color: 'text.primary' } }}>
            <ArrowBackIcon fontSize="small" sx={{ color: 'text.primary' }} />
          </IconButton>
          <IconButton aria-label="next" onClick={()=>scrollPresets('next')} sx={{ position:'absolute', right: -8, top: '50%', transform:'translateY(-50%)', zIndex:1, bgcolor:'background.paper', boxShadow:1, '& .MuiSvgIcon-root': { color: 'text.primary' } }}>
            <ArrowForwardIcon fontSize="small" sx={{ color: 'text.primary' }} />
          </IconButton>
          <Box ref={presetsRef} sx={{ overflowX: 'auto', display: 'flex', gap: 1, scrollSnapType: 'x mandatory', px: 1, '&::-webkit-scrollbar': { display: 'none' } }}>
            {PRESETS.map((p, idx) => {
              const active = activePreset === p.name
              const mode = idx < Math.ceil(PRESETS.length/2) ? 'minimal' : 'full'
              return (
                <Box key={p.name} id={`preset-${slugify(p.name)}`} sx={{ scrollSnapAlign: 'start', minWidth: { xs: 240, sm: 280 }, maxWidth: 320, flex: '0 0 auto' }}>
                  <Card variant="outlined" sx={{ height: '100%', borderRadius: 2, borderColor: active ? 'primary.main' : 'divider', bgcolor: active ? 'action.selected' : 'background.paper' }}>
                    <Tooltip arrow placement="top" enterDelay={400} title={<Box sx={{ maxWidth: 360 }}><Typography variant="subtitle2">{p.customer?.valueProp || p.name}</Typography>{p.customer?.description && (<Typography variant="caption" color="text.secondary">{p.customer.description}</Typography>)}{(p.customer?.industries || p.customer?.useCases) && (<Stack direction="row" spacing={0.5} sx={{ mt: 0.5 }} flexWrap="wrap">{(p.customer?.industries || []).slice(0,2).map((x: string) => (<Chip label={x} key={`ind-${x}`} size="small" />))}{(p.customer?.useCases || []).slice(0,2).map((x: string) => (<Chip label={x} key={`use-${x}`} size="small" color="primary" />))}</Stack>)}</Box>}>
                      <CardActionArea onClick={()=>applyPreset(p, mode)} sx={{ p: 1.25 }}>
                        <Stack direction="row" spacing={1.25} alignItems="center">
                          <Box sx={{ color: 'text.secondary', display:'flex', alignItems:'center' }}>{getPresetIcon(p.name)}</Box>
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography variant="body2" sx={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', whiteSpace: 'normal' }}>{p.name}</Typography>
                          </Box>
                        </Stack>
                      </CardActionArea>
                    </Tooltip>
                  </Card>
                </Box>
              )
            })}
          </Box>
          <Box sx={{ mt: 1, textAlign: 'right' }}>
            <Button size="small" color="warning" onClick={clearPreset}>{t('wizard.step2.clearSheet')}</Button>
          </Box>
        </Box>
        {draftLoading ? (
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}><Skeleton animation="wave" variant="rounded" height={56} /></Grid>
            <Grid item xs={12} md={6}><Skeleton animation="wave" variant="rounded" height={56} /></Grid>
            <Grid item xs={12}><Skeleton animation="wave" variant="rounded" height={56} /></Grid>
            <Grid item xs={12} md={6}><Skeleton animation="wave" variant="rounded" height={56} /></Grid>
            <Grid item xs={12} md={6}><Skeleton animation="wave" variant="rounded" height={56} /></Grid>
            <Grid item xs={12} md={8}><Skeleton animation="wave" variant="rounded" height={56} /></Grid>
            <Grid item xs={12} md={4}><Skeleton animation="wave" variant="rounded" height={56} /></Grid>
            <Grid item xs={12} md={6}><Skeleton animation="wave" variant="rounded" height={56} /></Grid>
            <Grid item xs={12} md={6}><Skeleton animation="wave" variant="rounded" height={56} /></Grid>
            <Grid item xs={12}>
              <Stack spacing={1}>
                <Skeleton animation="wave" variant="rounded" height={56} />
                <Skeleton animation="wave" variant="rounded" height={56} />
                <Skeleton animation="wave" variant="rounded" height={56} />
              </Stack>
            </Grid>
            <Grid item xs={12}><Skeleton animation="wave" variant="rounded" height={72} /></Grid>
            <Grid item xs={12}><Skeleton animation="wave" variant="rounded" height={72} /></Grid>
            <Grid item xs={12} md={6}><Skeleton animation="wave" variant="rounded" height={56} /></Grid>
            <Grid item xs={12} md={6}><Skeleton animation="wave" variant="rounded" height={56} /></Grid>
            <Grid item xs={12}><Skeleton animation="wave" variant="rounded" height={56} /></Grid>
          </Grid>
        ) : (
        <Box sx={{ position:'relative', minHeight:220 }}>
          {shouldFade && !loadedRemote && (
            <Box sx={{ position:'absolute', inset:0, p:0.5, pointerEvents:'none', opacity:1, transition:'opacity 150ms ease 40ms' }}>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}><Skeleton animation="wave" variant="rounded" height={56} /></Grid>
                <Grid item xs={12} md={6}><Skeleton animation="wave" variant="rounded" height={56} /></Grid>
                <Grid item xs={12}><Skeleton animation="wave" variant="rounded" height={56} /></Grid>
                <Grid item xs={12} md={6}><Skeleton animation="wave" variant="rounded" height={40} /></Grid>
                <Grid item xs={12} md={6}><Skeleton animation="wave" variant="rounded" height={40} /></Grid>
              </Grid>
            </Box>
          )}
          <Box sx={{ transition:'opacity 150ms ease 40ms', willChange:'opacity', opacity: shouldFade ? (loadedRemote ? 1 : 0.6) : 1 }}>
          <Grid container spacing={2}>
          <Grid item xs={12} md={6}><TextField label={t('wizard.step2.clientSheetMicrocopy.headers.valuePropLabel')} value={valueProp} onChange={e=>setValueProp(e.target.value)} placeholder={t('wizard.step2.clientSheetMicrocopy.headers.valuePropPh')} error={showErr && !valueProp.trim()} helperText={showErr && !valueProp.trim() ? (locale==='es'?'Ingrese la propuesta de valor':'Please enter the value proposition') : ''} fullWidth /></Grid>
          <Grid item xs={12} md={6}><TextField label={t('wizard.step2.clientSheetMicrocopy.headers.descriptionLabel')} value={customerDesc} onChange={e=>setCustomerDesc(e.target.value)} placeholder={t('wizard.step2.clientSheetMicrocopy.headers.descriptionPh')} error={showErr && !customerDesc.trim()} helperText={showErr && !customerDesc.trim() ? (locale==='es'?'Ingrese una descripción para clientes':'Please enter a customer description') : ''} fullWidth /></Grid>
          <Grid item xs={12}><TextField label={t('wizard.step2.clientSheetMicrocopy.headers.expectedImpactLabel')} value={expectedImpact} onChange={e=>setExpectedImpact(e.target.value)} placeholder={t('wizard.step2.clientSheetMicrocopy.headers.expectedImpactPh')} error={showErr && !expectedImpact.trim()} helperText={showErr && !expectedImpact.trim() ? (locale==='es'?'Ingrese el impacto esperado':'Please specify expected impact') : ''} fullWidth /></Grid>
          <Grid item xs={12} md={6}><Autocomplete multiple freeSolo selectOnFocus clearOnBlur handleHomeEndKeys options={INDUSTRIES} value={industries} onChange={(_,v)=>setIndustries(v)} renderTags={(value,getTagProps)=>value.map((o,i)=>(<Chip label={o} {...getTagProps({index:i})} key={o}/>))} renderInput={(p)=>(<TextField {...p} label={t('wizard.step2.clientSheetMicrocopy.context.industriesLabel')} placeholder={t('wizard.step2.clientSheetMicrocopy.context.industriesPh')} error={showErr && industries.length===0} helperText={showErr && industries.length===0 ? (locale==='es'?'Agrega al menos 1 industria':'Please add at least one industry') : ''}/>)} /></Grid>
          <Grid item xs={12} md={6}><Autocomplete multiple freeSolo selectOnFocus clearOnBlur handleHomeEndKeys options={USECASES} value={useCases} onChange={(_,v)=>setUseCases(v)} renderTags={(value,getTagProps)=>value.map((o,i)=>(<Chip label={o} {...getTagProps({index:i})} key={o}/>))} renderInput={(p)=>(<TextField {...p} label={t('wizard.step2.clientSheetMicrocopy.context.useCasesLabel')} placeholder={t('wizard.step2.clientSheetMicrocopy.context.useCasesPh')} error={showErr && useCases.length===0} helperText={showErr && useCases.length===0 ? (locale==='es'?'Agrega al menos 1 caso de uso':'Please add at least one use case') : ''}/>)} /></Grid>
          <Grid item xs={12} md={8}><Autocomplete multiple freeSolo selectOnFocus clearOnBlur handleHomeEndKeys options={[...SUPPORTED_LANGS]} value={supportedLangs} onChange={(_,v)=>setSupportedLangs(v)} renderTags={(value,getTagProps)=>value.map((o,i)=>(<Chip label={o} {...getTagProps({index:i})} key={o}/>))} renderInput={(p)=>(<TextField {...p} label={t('wizard.step2.clientSheetMicrocopy.context.supportedLangsLabel')} placeholder={t('wizard.step2.clientSheetMicrocopy.context.supportedLangsPh')} error={showErr && supportedLangs.length===0} helperText={showErr && supportedLangs.length===0 ? (locale==='es'?'Agrega al menos 1 idioma':'Please add at least one language') : ''}/>)} /></Grid>
          <Grid item xs={12}><Typography variant="subtitle1" fontWeight={600}>{t('wizard.step2.clientSheetMicrocopy.io.title')}</Typography><Typography variant="body2" color="text.secondary">{t('wizard.step2.clientSheetMicrocopy.io.helper')}</Typography></Grid>
          <Grid item xs={12} md={6}><TextField label={t('wizard.step2.clientSheetMicrocopy.io.inputsLabel')} value={inputsDesc} onChange={e=>setInputsDesc(e.target.value)} placeholder={t('wizard.step2.clientSheetMicrocopy.io.inputsPh')} error={showErr && !inputsDesc.trim()} helperText={showErr && !inputsDesc.trim() ? (locale==='es'?'Describe entradas':'Please describe inputs') : ''} fullWidth /></Grid>
          <Grid item xs={12} md={6}><TextField label={t('wizard.step2.clientSheetMicrocopy.io.outputsLabel')} value={outputsDesc} onChange={e=>setOutputsDesc(e.target.value)} placeholder={t('wizard.step2.clientSheetMicrocopy.io.outputsPh')} error={showErr && !outputsDesc.trim()} helperText={showErr && !outputsDesc.trim() ? (locale==='es'?'Describe salidas':'Please describe outputs') : ''} fullWidth /></Grid>
          <Grid item xs={12}>
            <Stack spacing={2}>
              {ioExamplesList.map((ex, idx) => (
                <Grid container spacing={{ xs: 0.5, md: 1 }} key={idx} alignItems="flex-start">
                  <Grid item xs={12} md={4}><TextField label={t('wizard.step2.clientSheetMicrocopy.examples.inputLabel')} placeholder={t('wizard.step2.clientSheetMicrocopy.examples.inputPh')} value={ex.input} onChange={e=>{ const next=[...ioExamplesList]; next[idx]={...next[idx], input:e.target.value}; setIoExamplesList(next) }} fullWidth /></Grid>
                  <Grid item xs={12} md={4}><TextField label={t('wizard.step2.clientSheetMicrocopy.examples.outputLabel')} placeholder={t('wizard.step2.clientSheetMicrocopy.examples.outputPh')} value={ex.output} onChange={e=>{ const next=[...ioExamplesList]; next[idx]={...next[idx], output:e.target.value}; setIoExamplesList(next) }} fullWidth /></Grid>
                  <Grid item xs={12} md={3}><TextField label={t('wizard.step2.clientSheetMicrocopy.examples.noteLabel')} placeholder={t('wizard.step2.clientSheetMicrocopy.examples.notePh')} value={ex.note || ''} onChange={e=>{ const next=[...ioExamplesList]; next[idx]={...next[idx], note:e.target.value}; setIoExamplesList(next) }} fullWidth /></Grid>
                  <Grid item xs="auto" md={1} sx={{ display:'flex', alignItems:'center', justifyContent:{ xs:'flex-end', md:'center' }, px:{ xs:0, md:1 }, py:{ xs:0, md:0 } }}>
                    {ioExamplesList.length > 1 && (
                      <Tooltip title={t('wizard.step2.examples.remove')}><IconButton size="small" aria-label={t('wizard.step2.examples.remove')} onClick={()=>{ const next=[...ioExamplesList]; next.splice(idx,1); setIoExamplesList(next.length? next : [{ input:'', output:'', note:'' }]) }} sx={{ color: 'text.disabled', p:{ xs:0.5, md:1 }, '&:hover': { color: 'error.main', bgcolor: 'transparent' } }}><CloseRoundedIcon fontSize="small" /></IconButton></Tooltip>
                    )}
                  </Grid>
                </Grid>
              ))}
              <Button variant="outlined" onClick={()=> setIoExamplesList([...ioExamplesList, { input:'', output:'', note:'' }])}>{t('wizard.step2.examples.add')}</Button>
              {!hasValidExample && showErr && (
                <FormHelperText error>{locale==='es'?'Agrega al menos 1 ejemplo con Entrada y Salida':'Please add at least one example with Input and Output'}</FormHelperText>
              )}
            </Stack>
          </Grid>
          <Grid item xs={12}><TextField multiline rows={2} label={t('wizard.step2.clientSheetMicrocopy.risks.label')} value={risks} onChange={e=>setRisks(e.target.value)} placeholder={t('wizard.step2.clientSheetMicrocopy.risks.ph')} error={showErr && !risks.trim()} helperText={showErr && !risks.trim() ? (locale==='es'?'Ingresa limitaciones y riesgos':'Please enter limitations and risks') : ''} fullWidth /></Grid>
          <Grid item xs={12}><TextField multiline rows={2} label={t('wizard.step2.clientSheetMicrocopy.prohibited.label')} value={prohibited} onChange={e=>setProhibited(e.target.value)} placeholder={t('wizard.step2.clientSheetMicrocopy.prohibited.ph')} error={showErr && !prohibited.trim()} helperText={showErr && !prohibited.trim() ? (locale==='es'?'Ingresa usos prohibidos':'Please enter prohibited uses') : ''} fullWidth /></Grid>
          <Grid item xs={12} md={6}><TextField label={t('wizard.step2.clientSheetMicrocopy.privacy.label')} value={privacy} onChange={e=>setPrivacy(e.target.value)} placeholder={t('wizard.step2.clientSheetMicrocopy.privacy.ph')} error={showErr && !privacy.trim()} helperText={showErr && !privacy.trim() ? (locale==='es'?'Describe privacidad/PII/logs':'Please describe privacy/PII/logs') : ''} fullWidth /></Grid>
          <Grid item xs={12} md={6}><Autocomplete multiple freeSolo selectOnFocus clearOnBlur handleHomeEndKeys options={DEPLOY} value={deployOptions} onChange={(_,v)=>setDeployOptions(v as DeployValue[])} renderTags={(value,getTagProps)=>value.map((o,i)=>(<Chip label={o} {...getTagProps({index:i})} key={o}/>))} renderInput={(p)=>(<TextField {...p} label={t('wizard.step2.clientSheetMicrocopy.deploy.label')} placeholder={t('wizard.step2.clientSheetMicrocopy.deploy.ph')}/>)} /></Grid>
          <Grid item xs={12}><TextField label={t('wizard.step2.clientSheetMicrocopy.support.label')} value={support} onChange={e=>setSupport(e.target.value)} placeholder={t('wizard.step2.clientSheetMicrocopy.support.ph')} error={showErr && !support.trim()} helperText={showErr && !support.trim() ? (locale==='es'?'Describe cómo brindar soporte':'Please describe how buyers get support') : ''} fullWidth /></Grid>
        </Grid>
        </Box>
        </Box>
        )}
      </Paper>

      

      {/* Secciones técnicas */}
      {draftLoading ? (
        <Paper variant="outlined" sx={{ p: { xs:2, md:3 }, mb: 3, borderRadius:'16px', border:'2px solid', borderColor:'oklch(0.30 0 0)', background:'linear-gradient(180deg, rgba(38,46,64,0.78), rgba(20,26,42,0.78))', boxShadow:'0 0 0 1px rgba(255,255,255,0.04) inset, 0 10px 28px rgba(0,0,0,0.40)', backdropFilter:'blur(10px)' }}>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
            <Skeleton animation="wave" variant="rounded" width={180} height={24} />
          </Stack>
          <Stack spacing={1.2}>
            <Skeleton animation="wave" variant="rounded" height={56} />
            <Skeleton animation="wave" variant="rounded" height={56} />
            <Skeleton animation="wave" variant="rounded" height={56} />
          </Stack>
        </Paper>
      ) : (
      <Accordion sx={{ mb: 3, transition:'opacity 150ms ease 40ms', willChange:'opacity', opacity: shouldFade ? (loadedRemote ? 1 : 0) : 1 }} defaultExpanded={false} data-step2-tech-root>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography variant="h6" fontWeight={600}>{techTitle}</Typography>
            <Tooltip title={t('wizard.step2.tech.helps.inference')}><InfoOutlinedIcon fontSize="small" color="action"/></Tooltip>
          </Stack>
        </AccordionSummary>
        <AccordionDetails>
          {/* Capacidades, Arquitectura, Runtime, Dependencias, Recursos, Inferencia: bloques del original */}
          <Stack spacing={3}>
            <Paper variant="outlined" sx={{ p: { xs:2, md:3 }, borderRadius:'16px', border:'2px solid', borderColor:'oklch(0.30 0 0)', background:'linear-gradient(180deg, rgba(38,46,64,0.78), rgba(20,26,42,0.78))', boxShadow:'0 0 0 1px rgba(255,255,255,0.04) inset, 0 10px 28px rgba(0,0,0,0.40)', backdropFilter:'blur(10px)' }}>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                <Typography variant="subtitle1" fontWeight={600}>{t('wizard.step2.tech.titles.capabilities')}</Typography>
                <Tooltip title={t('wizard.step2.tech.helps.capabilities')}><InfoOutlinedIcon fontSize="small" color="action"/></Tooltip>
              </Stack>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>{t('wizard.step2.tech.helps.capabilities')}</Typography>
              <Stack spacing={2}>
                <Autocomplete multiple freeSolo selectOnFocus clearOnBlur handleHomeEndKeys options={TASKS} value={tasks} onChange={(_,v)=>setTasks(v as TaskValue[])} renderTags={(value,getTagProps)=>value.map((o,i)=>(<Chip label={o} {...getTagProps({index:i})} key={o}/>))} renderInput={(p)=>(<TextField {...p} label={t('wizard.step2.tech.labels.tasks')} placeholder={t('wizard.step2.tech.placeholders.select')} error={showErr && tasks.length===0} helperText={showErr && tasks.length===0 ? (locale==='es'?'Agrega al menos 1 tarea':'Please add at least one task') : ''}/>)} />
                <Autocomplete multiple freeSolo selectOnFocus clearOnBlur handleHomeEndKeys options={MODALITIES} value={modalities} onChange={(_,v)=>setModalities(v as ModalityValue[])} renderTags={(value,getTagProps)=>value.map((o,i)=>(<Chip label={o} {...getTagProps({index:i})} key={o}/>))} renderInput={(p)=>(<TextField {...p} label={t('wizard.step2.tech.labels.modalities')} placeholder={t('wizard.step2.tech.placeholders.select')} error={showErr && modalities.length===0} helperText={showErr && modalities.length===0 ? (locale==='es'?'Agrega al menos 1 modalidad':'Please add at least one modality') : ''}/>)} />
                <Autocomplete
                  freeSolo
                  selectOnFocus
                  clearOnBlur
                  handleHomeEndKeys
                  options={[...TECHNICAL_MODEL_TYPES]}
                  getOptionLabel={(opt)=> t(`wizard.step2.tech.technicalModelTypes.${opt}` as any) || String(opt)}
                  value={technicalModelType || null}
                  onChange={(_,v)=>setTechnicalModelType((v || '') as TechnicalModelType | '')}
                  renderInput={(p)=>(
                    <TextField
                      {...p}
                      label={t('wizard.step2.tech.labels.technicalModelType')}
                      placeholder={t('wizard.step2.tech.placeholders.technicalModelType')}
                      helperText={t('wizard.step2.tech.helpers.technicalModelType')}
                    />
                  )}
                />
              </Stack>
            </Paper>

            <Paper variant="outlined" sx={{ p: { xs:2, md:3 }, borderRadius:2 }}>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                <Typography variant="subtitle1" fontWeight={600}>{t('wizard.step2.tech.titles.architecture')}</Typography>
                <Tooltip title={t('wizard.step2.tech.helps.architecture')}><InfoOutlinedIcon fontSize="small" color="action"/></Tooltip>
              </Stack>
              {/* Basic architecture */}
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}><Autocomplete multiple freeSolo selectOnFocus clearOnBlur handleHomeEndKeys options={FRAMEWORKS} value={frameworks} onChange={(_,v)=>setFrameworks(v as FrameworkValue[])} renderTags={(value,getTagProps)=>value.map((o,i)=>(<Chip label={o} {...getTagProps({index:i})} key={o}/>))} renderInput={(p)=>(<TextField {...p} label={t('wizard.step2.tech.labels.frameworks')} placeholder={t('wizard.step2.tech.placeholders.select')} error={showErr && frameworks.length===0} helperText={showErr && frameworks.length===0 ? (locale==='es'?'Selecciona al menos 1 framework':'Please select at least one framework') : ''}/>)} /></Grid>
                <Grid item xs={12} md={6}><Autocomplete multiple freeSolo selectOnFocus clearOnBlur handleHomeEndKeys options={FILES} value={modelFiles} onChange={(_,v)=>setModelFiles(v as FileFormatValue[])} renderTags={(value,getTagProps)=>value.map((o,i)=>(<Chip label={o} {...getTagProps({index:i})} key={o}/>))} renderInput={(p)=>(<TextField {...p} label={t('wizard.step2.tech.labels.fileFormats')} placeholder="safetensors, gguf, onnx" error={showErr && modelFiles.length===0} helperText={showErr && modelFiles.length===0 ? (locale==='es'?'Selecciona al menos 1 formato':'Please select at least one format') : ''}/>)} /></Grid>
                <Grid item xs={12} md={3}><TextField label={L.tech.modelSize} value={modelSizeParams} onChange={e=>setModelSizeParams(e.target.value)} placeholder={locale==='es'?'Ej.: 7B, 13B':'e.g., 7B, 13B'} fullWidth /></Grid>
                <Grid item xs={12} md={3}><TextField label={L.tech.artifactSize} value={artifactSize} onChange={e=>setArtifactSize(e.target.value)} placeholder={locale==='es'?'~8 GB, 30–40 GB':'~8 GB, 30–40 GB'} fullWidth /></Grid>
              </Grid>
              {/* Advanced architecture */}
              <Accordion sx={{ mt: 2 }} defaultExpanded={false}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}> 
                  <Typography variant="subtitle2" fontWeight={600}>{locale==='es' ? 'Arquitectura avanzada' : 'Advanced architecture'}</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={6}><Autocomplete multiple freeSolo selectOnFocus clearOnBlur handleHomeEndKeys options={ARCHS} value={architectures} onChange={(_,v)=>setArchitectures(v)} renderTags={(value,getTagProps)=>value.map((o,i)=>(<Chip label={o} {...getTagProps({index:i})} key={o}/>))} renderInput={(p)=>(<TextField {...p} label={t('wizard.step2.tech.labels.architectures')} placeholder={t('wizard.step2.tech.placeholders.select')}/>)} /></Grid>
                    <Grid item xs={12} md={6}><Autocomplete multiple freeSolo selectOnFocus clearOnBlur handleHomeEndKeys options={PRECISIONS} value={precisions} onChange={(_,v)=>setPrecisions(v)} renderTags={(value,getTagProps)=>value.map((o,i)=>(<Chip label={o} {...getTagProps({index:i})} key={o}/>))} renderInput={(p)=>(<TextField {...p} label={t('wizard.step2.tech.labels.precision')} placeholder={t('wizard.step2.tech.placeholders.precision')}/>)} /></Grid>
                    <Grid item xs={12} md={6}><Autocomplete freeSolo selectOnFocus clearOnBlur handleHomeEndKeys options={QUANT} value={quantization || null} onChange={(_,v)=>setQuantization(v || '')} renderInput={(p)=>(<TextField {...p} label={t('wizard.step2.tech.labels.quantization')} placeholder={t('wizard.step2.tech.placeholders.select')}/>)} /></Grid>
                    {tasks.includes('embedding') && (
                      <Grid item xs={12} md={3}><TextField type="number" label={L.tech.embedDim} value={embedDim} onChange={e=>setEmbedDim(e.target.value)} placeholder={locale==='es'?'p.ej., 768':'e.g., 768'} error={showErr && !(embedDim && Number(embedDim)>0)} helperText={showErr && !(embedDim && Number(embedDim)>0) ? (locale==='es'?'Requerido para modelos de embeddings':'Required for embedding models') : ''} fullWidth /></Grid>
                    )}
                  </Grid>
                </AccordionDetails>
              </Accordion>
            </Paper>

            <Paper variant="outlined" sx={{ p: { xs:2, md:3 }, borderRadius:2 }}>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                <Typography variant="subtitle1" fontWeight={600}>{locale==='es' ? 'Entrenamiento y evaluación (opcional)' : 'Training & evaluation (optional)'}</Typography>
                <Tooltip title={locale==='es' ? 'Idioma de entrenamiento y métricas de evaluación' : 'Training language and evaluation metrics'}><InfoOutlinedIcon fontSize="small" color="action"/></Tooltip>
              </Stack>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}><TextField label={L.client.primaryLang} value={primaryLanguage} onChange={e=>setPrimaryLanguage(e.target.value)} placeholder={locale==='es'?'Ej.: es':'e.g., en'} fullWidth /></Grid>
                <Grid item xs={12} md={6}><TextField label={L.client.metrics} value={metrics} onChange={e=>setMetrics(e.target.value)} placeholder={locale==='es'?'Ej.: Accuracy 89% en dataset X; MMLU 68':'e.g., Accuracy 89% on dataset X; MMLU 68'} fullWidth /></Grid>
              </Grid>
            </Paper>

            <Paper variant="outlined" sx={{ p: { xs:2, md:3 }, borderRadius:2 }}>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                <Typography variant="subtitle1" fontWeight={600}>{t('wizard.step2.tech.titles.runtime')}</Typography>
                <Tooltip title={t('wizard.step2.tech.helps.runtime')}><InfoOutlinedIcon fontSize="small" color="action"/></Tooltip>
              </Stack>
              {/* Basic runtime */}
              <Grid container spacing={2}>
                <Grid item xs={12} md={3}><TextField label={t('wizard.step2.tech.labels.python')} value={python} onChange={e=>setPython(e.target.value)} error={showErr && !python.trim()} helperText={showErr && !python.trim() ? (locale==='es'?'Indica versión de runtime (p.ej., 3.10)':'Please specify runtime version (e.g., 3.10)') : ''} fullWidth /></Grid>
                <Grid item xs={12} md={6}><Autocomplete multiple freeSolo selectOnFocus clearOnBlur handleHomeEndKeys options={OS} value={oses} onChange={(_,v)=>setOses(v as OsValue[])} renderTags={(value,getTagProps)=>value.map((o,i)=>(<Chip label={o} {...getTagProps({index:i})} key={o}/>))} renderInput={(p)=>(<TextField {...p} label={t('wizard.step2.tech.labels.systems')} placeholder="linux, windows, macos" error={showErr && oses.length===0} helperText={showErr && oses.length===0 ? (locale==='es'?'Selecciona al menos 1 sistema':'Please select at least one system') : ''}/>)} /></Grid>
                <Grid item xs={12} md={6}><Autocomplete multiple freeSolo selectOnFocus clearOnBlur handleHomeEndKeys options={ACCELS} value={accelerators} onChange={(_,v)=>setAccelerators(v as AcceleratorValue[])} renderTags={(value,getTagProps)=>value.map((o,i)=>(<Chip label={o} {...getTagProps({index:i})} key={o}/>))} renderInput={(p)=>(<TextField {...p} label={t('wizard.step2.tech.labels.accelerators')} placeholder="nvidia-cuda, amd-rocm, apple-metal" error={showErr && accelerators.length===0} helperText={showErr && accelerators.length===0 ? (locale==='es'?'Selecciona al menos 1 acelerador o CPU only':'Please select at least one accelerator or CPU only') : ''}/>)} /></Grid>
              </Grid>
              {/* Advanced runtime */}
              <Accordion sx={{ mt: 2 }} defaultExpanded={false}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}> 
                  <Typography variant="subtitle2" fontWeight={600}>{locale==='es' ? 'Runtime avanzado (versiones de framework)' : 'Advanced runtime (framework versions)'}</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={3}><TextField label={t('wizard.step2.tech.labels.cuda')} value={cuda} onChange={e=>setCuda(e.target.value)} placeholder={t('wizard.step2.tech.placeholders.cuda')} fullWidth /></Grid>
                    <Grid item xs={12} md={3}><TextField label={t('wizard.step2.tech.labels.torch')} value={torch} onChange={e=>setTorch(e.target.value)} placeholder={t('wizard.step2.tech.placeholders.torch')} fullWidth /></Grid>
                    <Grid item xs={12} md={3}><TextField label={t('wizard.step2.tech.labels.cudnn')} value={cudnn} onChange={e=>setCudnn(e.target.value)} fullWidth /></Grid>
                    <Grid item xs={12} md={6}><TextField label={t('wizard.step2.tech.labels.computeCapability')} value={computeCapability} onChange={e=>setComputeCapability(e.target.value)} placeholder={t('wizard.step2.tech.placeholders.compute')} fullWidth /></Grid>
                  </Grid>
                </AccordionDetails>
              </Accordion>
            </Paper>

            <Paper variant="outlined" sx={{ p: { xs:2, md:3 }, borderRadius:2 }}>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                <Typography variant="subtitle1" fontWeight={600}>{t('wizard.step2.tech.titles.dependencies')}</Typography>
                <Tooltip title={t('wizard.step2.tech.helps.dependencies')}><InfoOutlinedIcon fontSize="small" color="action"/></Tooltip>
              </Stack>
              <TextField multiline rows={3} value={pipDeps} onChange={e=>setPipDeps(e.target.value)} placeholder={t('wizard.step2.tech.placeholders.packages')} fullWidth />
              <FormHelperText>{t('wizard.step2.tech.helps.dependencies')}</FormHelperText>
            </Paper>

            <Paper variant="outlined" sx={{ p: { xs:2, md:3 }, borderRadius:2 }}>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                <Typography variant="subtitle1" fontWeight={600}>{t('wizard.step2.tech.titles.resources')}</Typography>
                <Tooltip title={t('wizard.step2.tech.helps.resources')}><InfoOutlinedIcon fontSize="small" color="action"/></Tooltip>
              </Stack>
              <Grid container spacing={2}>
                <Grid item xs={12} md={4}><TextField type="number" label={t('wizard.step2.tech.labels.vramGB')} value={vramGB} onChange={e=>setVramGB(e.target.value)} error={showErr && !(Number(vramGB||0)>0)} helperText={showErr && !(Number(vramGB||0)>0) ? (locale==='es'?'Ingresa VRAM en GB':'Please enter VRAM (GB)') : ''} fullWidth /></Grid>
                <Grid item xs={12} md={4}><TextField type="number" label={t('wizard.step2.tech.labels.cpuCores')} value={cpuCores} onChange={e=>setCpuCores(e.target.value)} error={showErr && !(Number(cpuCores||0)>0)} helperText={showErr && !(Number(cpuCores||0)>0) ? (locale==='es'?'Ingresa núcleos CPU':'Please enter CPU cores') : ''} fullWidth /></Grid>
                <Grid item xs={12} md={4}><TextField type="number" label={t('wizard.step2.tech.labels.ramGB')} value={ramGB} onChange={e=>setRamGB(e.target.value)} error={showErr && !(Number(ramGB||0)>0)} helperText={showErr && !(Number(ramGB||0)>0) ? (locale==='es'?'Ingresa RAM en GB':'Please enter RAM (GB)') : ''} fullWidth /></Grid>
              </Grid>
            </Paper>

            <Paper variant="outlined" sx={{ p: { xs:2, md:3 }, borderRadius:2 }}>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                <Typography variant="subtitle1" fontWeight={600}>{t('wizard.step2.tech.titles.inference')}</Typography>
                <Tooltip title={t('wizard.step2.tech.helps.inference')}><InfoOutlinedIcon fontSize="small" color="action"/></Tooltip>
              </Stack>
              {/* Basic inference */}
              <Grid container spacing={2}>
                <Grid item xs={12} md={3}><TextField type="number" label={t('wizard.step2.tech.labels.maxBatch')} value={maxBatch} onChange={e=>setMaxBatch(e.target.value)} error={showErr && !(Number(maxBatch||0)>0)} helperText={showErr && !(Number(maxBatch||0)>0) ? (locale==='es'?'Requerido':'Required') : ''} fullWidth /></Grid>
                <Grid item xs={12} md={3}><TextField type="number" label={t('wizard.step2.tech.labels.contextLen')} value={contextLen} onChange={e=>setContextLen(e.target.value)} error={showErr && !(Number(contextLen||0)>0)} helperText={showErr && !(Number(contextLen||0)>0) ? (locale==='es'?'Requerido':'Required') : ''} fullWidth /></Grid>
                <Grid item xs={12} md={3}><TextField type="number" label={t('wizard.step2.tech.labels.maxTokens')} value={maxTokens} onChange={e=>setMaxTokens(e.target.value)} error={showErr && !(Number(maxTokens||0)>0)} helperText={showErr && !(Number(maxTokens||0)>0) ? (locale==='es'?'Requerido':'Required') : ''} fullWidth /></Grid>
              </Grid>
              {/* Advanced inference options */}
              <Accordion sx={{ mt: 2 }} defaultExpanded={false}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}> 
                  <Typography variant="subtitle2" fontWeight={600}>{locale==='es' ? 'Opciones avanzadas de inferencia' : 'Advanced inference options'}</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Grid container spacing={2}>
                    {modalities.includes('image') && (
                      <Grid item xs={12} md={3}><TextField label={t('wizard.step2.tech.labels.imagePx')} value={imgResolution} onChange={e=>setImgResolution(e.target.value)} placeholder={t('wizard.step2.tech.placeholders.imagePx')} fullWidth /></Grid>
                    )}
                    {modalities.includes('audio') && (
                      <Grid item xs={12} md={3}><TextField type="number" label={t('wizard.step2.tech.labels.sampleRate')} value={sampleRate} onChange={e=>setSampleRate(e.target.value)} fullWidth /></Grid>
                    )}
                    <Grid item xs={12} md={3}><FormControlLabel control={<Switch checked={useTriton} onChange={e=>setUseTriton(e.target.checked)} />} label={t('wizard.step2.tech.labels.triton')} /></Grid>
                    <Grid item xs={12}><TextField label={L.tech.refPerf} value={refPerf} onChange={e=>setRefPerf(e.target.value)} placeholder={locale==='es'? 'p.ej., ~40 tok/s en A100 80GB, batch=4':'e.g., ~40 tok/s on A100 80GB, batch=4'} fullWidth /></Grid>
                  </Grid>
                </AccordionDetails>
              </Accordion>
            </Paper>
          </Stack>
        </AccordionDetails>
      </Accordion>
      )}

      <Box sx={{ height: { xs: 76, md: 76 } }} />

      {/* Missing fields indicator - show always in upgrade mode after loading, or after showErr in normal mode */}
      {!draftLoading && loadedRemote && (upgradeMode || showErr) && (!isClientSheetValid() || !isTechValid()) && (
        <Paper 
          elevation={0} 
          sx={{ 
            p: 2, 
            mb: 2, 
            bgcolor: 'rgba(255, 152, 0, 0.1)', 
            border: '1px solid', 
            borderColor: 'warning.main',
            borderRadius: 2 
          }}
        >
          <Typography variant="subtitle2" color="warning.main" sx={{ mb: 1, fontWeight: 600 }}>
            {locale === 'es' ? '⚠️ Campos obligatorios faltantes:' : '⚠️ Missing required fields:'}
          </Typography>
          {getMissingClientFields().length > 0 && (
            <Box sx={{ mb: 1 }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
                {locale === 'es' ? 'Ficha del cliente:' : 'Customer sheet:'}
              </Typography>
              <Typography variant="body2" color="warning.light" sx={{ ml: 1 }}>
                {getMissingClientFields().join(', ')}
              </Typography>
            </Box>
          )}
          {getMissingTechFields().length > 0 && (
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
                {locale === 'es' ? 'Configuración técnica:' : 'Technical configuration:'}
              </Typography>
              <Typography variant="body2" color="warning.light" sx={{ ml: 1 }}>
                {getMissingTechFields().join(', ')}
              </Typography>
            </Box>
          )}
        </Paper>
      )}

      <WizardFooter
        currentStep={2}
        totalSteps={5}
        stepTitle={t('wizard.step2.title')}
        onBack={onBack}
        onSaveDraft={()=> onSave('manual')}
        onNext={onNext}
        isNextDisabled={nextLoading || !isClientSheetValid() || !isTechValid()}
        isSaving={saving}
        isLastStep={false}
        backLabel={t('wizard.common.back')}
        saveDraftLabel={t('wizard.common.saveDraft')}
        savingLabel={t('wizard.common.saving')}
        nextLabel={t('wizard.common.next')}
        publishLabel={t('wizard.index.publish')}
      />

      {msg && <Typography sx={{ mt:1 }} color={msg===t('wizard.common.saved') ? 'success.main' : 'warning.main'}>{msg}</Typography>}
    </Box>
    </Box>
    </WizardThemeProvider>
  )
}
