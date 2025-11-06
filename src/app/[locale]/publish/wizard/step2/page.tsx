"use client";
import { useMemo, useState, useRef, useEffect } from 'react'
 
import { Box, Stack, Typography, Paper, Tooltip, TextField, Autocomplete, Chip, Grid, Divider, Button, FormHelperText, Switch, FormControlLabel, Accordion, AccordionSummary, AccordionDetails, IconButton, Card, CardActionArea, CircularProgress, Skeleton } from '@mui/material'
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
import { useLocale, useTranslations } from 'next-intl'

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

export default function Step2CompatibilityLocalized() {
  const t = useTranslations()
  const locale = useLocale()
  const base = `/${locale}/publish/wizard`
  // Local labels for new fields (EN/ES)
  const L = useMemo(() => (
    locale === 'es' ? {
      client: {
        expectedImpact: 'Impacto esperado en el negocio',
        risks: 'Limitaciones y riesgos conocidos',
        supportedLangs: 'Idiomas soportados',
        primaryLang: 'Idioma principal de entrenamiento (opcional)',
        modelType: 'Tipo / familia de modelo',
        metrics: 'Métricas / evaluación (opcional)',
        prohibited: 'Usos prohibidos / No usar para'
      },
      tech: {
        modelSize: 'Tamaño del modelo (parámetros)',
        artifactSize: 'Tamaño del artefacto del modelo',
        embedDim: 'Dimensión de embeddings',
        refPerf: 'Latencia / rendimiento de referencia (opcional)'
      }
    } : {
      client: {
        expectedImpact: 'Expected business impact',
        risks: 'Known limitations and risks',
        supportedLangs: 'Supported languages',
        primaryLang: 'Primary training language (optional)',
        modelType: 'Model type / family',
        metrics: 'Metrics / evaluation (optional)',
        prohibited: 'Prohibited uses / Do not use for'
      },
      tech: {
        modelSize: 'Model size (parameters)',
        artifactSize: 'Model artifact size',
        embedDim: 'Embedding dimension',
        refPerf: 'Reference latency / throughput (optional)'
      }
    }
  ), [locale])
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

  const presetsRef = useRef<HTMLDivElement>(null)
  const scrollPresets = (dir: 'prev'|'next') => {
    const el = presetsRef.current
    if (!el) return
    const delta = Math.min(el.clientWidth * 0.9, 600)
    el.scrollBy({ left: dir==='next' ? delta : -delta, behavior: 'smooth' })
  }

  // Autoload del borrador al montar (localizado)
  useEffect(() => {
    let alive = true
    // Hydrate from cache first to avoid empty initial render
    try {
      const raw = localStorage.getItem('draft_step2')
      if (raw) {
        const s2 = JSON.parse(raw)
        try {
          const cap = s2.capabilities || {}
          setTasks(Array.isArray(cap.tasks)? cap.tasks : [])
          setModalities(Array.isArray(cap.modalities)? cap.modalities : [])
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
          setOses(Array.isArray(rt.os)? rt.os : [])
          setAccelerators(Array.isArray(rt.accelerators)? rt.accelerators : [])
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
          if (typeof cust.primaryLanguage === 'string') setPrimaryLanguage(cust.primaryLanguage)
          if (typeof cust.modelType === 'string') setModelType(cust.modelType)
          if (typeof cust.metrics === 'string') setMetrics(cust.metrics)
          if (typeof cust.prohibited === 'string') setProhibited(cust.prohibited)
          lastSavedRef.current = s2
          setShouldFade(false)
        } catch {}
      }
    } catch {}
    loadingFromDraftRef.current = true
    setDraftLoading(true)
    loadDraft().then((r: any)=>{
      if (!alive) return
      const s2 = r?.data?.step2
      if (!s2) return
      try {
        const cap = s2.capabilities || {}
        setTasks(Array.isArray(cap.tasks)? cap.tasks : [])
        setModalities(Array.isArray(cap.modalities)? cap.modalities : [])
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
        setOses(Array.isArray(rt.os)? rt.os : [])
        setAccelerators(Array.isArray(rt.accelerators)? rt.accelerators : [])
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
        if (typeof cust.primaryLanguage === 'string') setPrimaryLanguage(cust.primaryLanguage)
        if (typeof cust.modelType === 'string') setModelType(cust.modelType)
        if (typeof cust.metrics === 'string') setMetrics(cust.metrics)
        if (typeof cust.prohibited === 'string') setProhibited(cust.prohibited)
        setDirty(false)
        lastSavedRef.current = s2
      } catch {}
    }).catch(()=>{})
    .finally(()=>{ loadingFromDraftRef.current = false; setDraftLoading(false); setLoadedRemote(true) })
    return () => { alive = false }
  }, [])

  useEffect(() => {
    if (!msg) return
    const tmo = setTimeout(()=>setMsg(''), 3000)
    return () => clearTimeout(tmo)
  }, [msg])
  const onBack = (e: React.MouseEvent<HTMLAnchorElement | HTMLButtonElement>) => {
    e.preventDefault()
    navigatingRef.current = true
    onSave().finally(()=>{ window.location.href = `${base}/step1` })
  }

  const TASKS = useMemo(() => [
    'text-generation','instruction-following','chat','embedding','classification','detection','segmentation','tts','asr','translation',
    'retrieval','summarization','recommendation','planning','forecasting','ranking'
  ], [])
  const MODALITIES = useMemo(() => ['text','image','audio','video','multimodal','tabular'], [])
  const ARCHS = useMemo(() => ['Llama','Mistral','GPT-NeoX','T5','ViT','CLIP','UNet','Whisper','Stable-Diffusion'], [])
  const FRAMEWORKS = useMemo(() => ['PyTorch 2.2','PyTorch 2.3','ONNX','TensorRT','JAX/Flax','TensorFlow 2.x'], [])
  const PRECISIONS = useMemo(() => ['fp32','bf16','fp16','int8','int4'], [])
  const QUANT = useMemo(() => ['none','QLoRA','GPTQ','AWQ','GGUF','int8','int4'], [])
  const FILES = useMemo(() => ['safetensors','gguf','onnx','pt','ckpt'], [])
  const OS = useMemo(() => ['linux','windows','macos'], [])
  const ACCELS = useMemo(() => ['nvidia-cuda','amd-rocm','apple-metal'], [])

  const [tasks, setTasks] = useState<string[]>([])
  const [modalities, setModalities] = useState<string[]>([])
  const [architectures, setArchitectures] = useState<string[]>([])
  const [frameworks, setFrameworks] = useState<string[]>([])
  const [precisions, setPrecisions] = useState<string[]>([])
  const [quantization, setQuantization] = useState<string>('')
  const [modelSizeParams, setModelSizeParams] = useState<string>('')
  const [modelFiles, setModelFiles] = useState<string[]>([])

  const [python, setPython] = useState('')
  const [cuda, setCuda] = useState('')
  const [torch, setTorch] = useState('')
  const [cudnn, setCudnn] = useState('')
  const [oses, setOses] = useState<string[]>([])
  const [accelerators, setAccelerators] = useState<string[]>([])
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
  const [modelType, setModelType] = useState('')
  const [metrics, setMetrics] = useState('')
  const [prohibited, setProhibited] = useState('')

  // New technical fields
  const [artifactSize, setArtifactSize] = useState('')
  const [embedDim, setEmbedDim] = useState('')
  const [refPerf, setRefPerf] = useState('')


  const INDUSTRIES_ES = ['retail','finanzas','salud','educación','legal','manufactura','logística','marketing','soporte','energía','rrhh','e‑commerce']
  const INDUSTRIES_EN = ['retail','finance','healthcare','education','legal','manufacturing','logistics','marketing','support','energy','hr','e‑commerce']
  const INDUSTRIES = useMemo(() => (locale === 'es' ? INDUSTRIES_ES : INDUSTRIES_EN), [locale])

  const USECASES_ES = ['recomendación','predicción','predicción churn','forecast demanda','asistente estudio','Q&A documentos','clasificación','detección fraude','resumen','generación texto','ideas campaña','optimización','ruteo','sentiment','tópicos','ranking','anomalías','forecast']
  const USECASES_EN = ['recommendation','prediction','churn prediction','demand forecast','study assistant','documents Q&A','classification','fraud detection','summarization','text generation','campaign ideas','optimization','routing','sentiment','topics','ranking','anomalies','forecast']
  const USECASES = useMemo(() => (locale === 'es' ? USECASES_ES : USECASES_EN), [locale])

  const DEPLOY_ES = ['API SaaS','Docker on‑prem','Cloud (Base/AWS/GCP)','Edge']
  const DEPLOY_EN = ['SaaS API','Docker on‑prem','Cloud (Base/AWS/GCP)','Edge']
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
  const [deployOptions, setDeployOptions] = useState<string[]>([])
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
      modelType: string
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
    setModelType('')
    setMetrics('')
    setProhibited('')
    setActivePreset('')
    setTasks([]); setModalities([]); setFrameworks([]); setArchitectures([]); setPrecisions([])
    setQuantization(''); setModelFiles([])
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
    if (p.customer.deploy) setDeployOptions(p.customer.deploy)
    if (p.customer.support !== undefined) setSupport(p.customer.support)
    if ((p.customer as any).supportedLanguages) setSupportedLangs((p.customer as any).supportedLanguages as any)
    if ((p.customer as any).primaryLanguage !== undefined && !minimal) setPrimaryLanguage((p.customer as any).primaryLanguage as any)
    if ((p.customer as any).modelType !== undefined) setModelType((p.customer as any).modelType as any)
    if ((p.customer as any).metrics !== undefined && !minimal) setMetrics((p.customer as any).metrics as any)
    if ((p.customer as any).prohibited !== undefined) setProhibited((p.customer as any).prohibited as any)

    if (p.technical?.tasks) setTasks(p.technical.tasks)
    if (p.technical?.modalities) setModalities(p.technical.modalities)
    if (p.technical?.frameworks) setFrameworks(p.technical.frameworks)
    if (!minimal && p.technical?.architectures) setArchitectures(p.technical.architectures)
    if (!minimal && p.technical?.precisions) setPrecisions(p.technical.precisions)
    if (!minimal && p.technical?.quantization) setQuantization(p.technical.quantization)
    if (p.technical?.modelFiles) setModelFiles(p.technical.modelFiles)
    if (p.technical?.vramGB) setVramGB(p.technical.vramGB)
    if (p.technical?.cpuCores) setCpuCores(p.technical.cpuCores)
    if (p.technical?.ramGB) setRamGB(p.technical.ramGB)
    if ((p.technical as any)?.python) setPython((p.technical as any).python)
    if ((p.technical as any)?.os) setOses(((p.technical as any).os) as any)
    if ((p.technical as any)?.accelerators) setAccelerators(((p.technical as any).accelerators) as any)
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
      if (!modelType.trim()) {
        const inferred = (tasks.includes('chat') || tasks.includes('text-generation')) ? 'llm' : (tasks.includes('embedding') ? 'embedding' : 'model')
        setModelType(inferred)
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
      if (!modelType.trim()) {
        const inferred = (tasks.includes('chat') || tasks.includes('text-generation')) ? 'llm' : (tasks.includes('embedding') ? 'embedding' : 'model')
        setModelType(inferred)
      }
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
    supportedLangs, primaryLanguage, modelType, metrics, prohibited,
    // Capacidades
    tasks, modalities,
    // Arquitectura
    frameworks, architectures, precisions, quantization, modelSizeParams, modelFiles, artifactSize, embedDim,
    // Runtime
    python, cuda, torch, cudnn, oses, accelerators, computeCapability,
    // Recursos
    vramGB, cpuCores, ramGB,
    // Inferencia
    maxBatch, contextLen, maxTokens, imgResolution, sampleRate, useTriton, refPerf
  ])
  useEffect(()=>{
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!dirty || navigatingRef.current) return
      e.preventDefault(); e.returnValue = ''
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload as any)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dirty])

  const hasValidExample = useMemo(()=> (ioExamplesList||[]).some(e=> (e.input||'').trim() && (e.output||'').trim() ), [ioExamplesList])
  const isClientSheetValid = () => {
    return Boolean(
      valueProp.trim() &&
      customerDesc.trim() &&
      expectedImpact.trim() &&
      industries.length>0 &&
      useCases.length>0 &&
      supportedLangs.length>0 &&
      (modelType||'').trim() &&
      inputsDesc.trim() &&
      outputsDesc.trim() &&
      hasValidExample &&
      risks.trim() &&
      prohibited.trim() &&
      privacy.trim() &&
      support.trim()
    )
  }
  const onNext = (e: React.MouseEvent<HTMLAnchorElement | HTMLButtonElement>) => {
    setShowErr(true)
    setNextLoading(true)
    if (!isClientSheetValid()) {
      e.preventDefault()
      setMsg(t('wizard.step2.validationFillClientSheet'))
      const top = document.getElementById('client-sheet-top')
      top?.scrollIntoView({ behavior:'smooth', block:'start' })
      setNextLoading(false)
      return
    }
    if (!isTechValid()) {
      e.preventDefault()
      const message = locale==='es' ? 'Completa la configuración técnica mínima.' : 'Please fill the minimum technical configuration.'
      setMsg(message)
      const el = document.querySelector('[data-step2-tech-root]') as HTMLElement | null
      el?.scrollIntoView({ behavior:'smooth', block:'start' })
      setNextLoading(false)
      return
    }
    e.preventDefault()
    navigatingRef.current = true
    onSave().finally(()=>{ window.location.href = `${base}/step3` })
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

  // Technical minimal validation (now mandatory)
  const isTechValid = () => {
    const needsEmbedDim = tasks.includes('embedding')
    const okTasks = tasks && tasks.length>0
    const okModalities = modalities && modalities.length>0
    const okFrameworks = frameworks && frameworks.length>0
    const okFormats = modelFiles && modelFiles.length>0
    const okRuntime = Boolean(python.trim()) && (oses&&oses.length>0) && (accelerators&&accelerators.length>0)
    const okResources = Number(vramGB||0)>0 && Number(cpuCores||0)>0 && Number(ramGB||0)>0
    const okInference = Number(maxBatch||0)>0 && Number(contextLen||0)>0 && Number(maxTokens||0)>0
    const okEmbed = !needsEmbedDim || (embedDim && Number(embedDim)>0)
    return Boolean(okTasks && okModalities && okFrameworks && okFormats && okRuntime && okResources && okInference && okEmbed)
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
    const nModelType = ns(modelType)
    const nMetrics = ns(metrics)
    const nProhibited = ns(prohibited)
    const nArtifactSize = ns(artifactSize)
    const nEmbedDim = ns(embedDim)
    const nRefPerf = ns(refPerf)
    const nPip = pipDeps.split(/[\,\n]/g).map(s=>ns(s)).filter(Boolean)
    const payload = {
      address: walletAddress,
      step: 'step2',
      data: {
        capabilities: { tasks: nTasks, modalities: nModalities, modelType: nModelType },
        architecture: { frameworks: nFrameworks, architectures: nArchitectures, precisions: nPrecisions, quantization: nQuant, modelSizeParams: ns(modelSizeParams) || undefined, modelFiles: nModelFiles, artifactSizeGB: nArtifactSize || undefined, embeddingDimension: nEmbedDim ? Number(nEmbedDim) : undefined },
        runtime: { python: nPython, cuda: nCuda, torch: nTorch || undefined, cudnn: nCudnn || undefined, os: nOses, accelerators: nAccelerators, computeCapability: nCompute },
        dependencies: { pip: nPip },
        resources: { vramGB: Number(vramGB||0), cpuCores: Number(cpuCores||0), ramGB: Number(ramGB||0) },
        inference: { maxBatchSize: Number(maxBatch||0), contextLength: Number(contextLen||0), maxTokens: Number(maxTokens||0), imageResolution: nImgRes, sampleRate: Number(sampleRate||0), triton: useTriton, referencePerf: nRefPerf || undefined },
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
          primaryLanguage: nPrimaryLang || undefined,
          modelType: nModelType || undefined,
          metrics: nMetrics || undefined,
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
      const r = await saveDraft(payload)
      setMsg(r?.ok ? t('wizard.common.saved') : t('wizard.common.errorSaving'))
      lastSavedRef.current = payload.data
      try { localStorage.setItem('draft_step2', JSON.stringify(payload.data)) } catch {}
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

    const capOk = isArrStr(tasks) && isArrStr(modalities) && isStr(modelType)
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
      && isStr(modelType)
      && isStr(metrics)
      && isStr(prohibited)

    return capOk && archOk && rtOk && depsOk && resOk && infOk && custOk
  }, [tasks, modalities, modelType, frameworks, architectures, precisions, quantization, modelSizeParams, modelFiles, artifactSize, embedDim, python, cuda, torch, cudnn, oses, accelerators, computeCapability, pipDeps, vramGB, cpuCores, ramGB, maxBatch, contextLen, maxTokens, imgResolution, sampleRate, useTriton, refPerf, valueProp, customerDesc, industries, useCases, expectedImpact, inputsDesc, outputsDesc, ioExamplesList, risks, privacy, deployOptions, support, supportedLangs, primaryLanguage, metrics, prohibited])
  ;
  return (
    <Box sx={{ p: { xs:2, md:4 }, maxWidth: 1000, mx: 'auto' }}>
      <Stack spacing={2} sx={{ mb: 2 }}>
        <Typography variant="h4" fontWeight={700}>{t('wizard.step2.title')}</Typography>
        <Typography color="text.secondary">{t('wizard.step2.subtitle')}</Typography>
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
        <Box sx={{ mb: 1, position: 'relative' }}>
          <Box sx={{ position:'absolute', inset: 0, pointerEvents:'none' }} />
          <IconButton aria-label="prev" onClick={()=>scrollPresets('prev')} sx={{ position:'absolute', left: -8, top: '50%', transform:'translateY(-50%)', zIndex:1, bgcolor:'background.paper', boxShadow:1 }}>
            <ArrowBackIcon fontSize="small" />
          </IconButton>
          <IconButton aria-label="next" onClick={()=>scrollPresets('next')} sx={{ position:'absolute', right: -8, top: '50%', transform:'translateY(-50%)', zIndex:1, bgcolor:'background.paper', boxShadow:1 }}>
            <ArrowForwardIcon fontSize="small" />
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
          <Grid item xs={12} md={6}><TextField label={t('wizard.step2.fields.valueProp')} value={valueProp} onChange={e=>setValueProp(e.target.value)} placeholder={t('wizard.step2.placeholders.valueProp')} error={showErr && !valueProp.trim()} helperText={showErr && !valueProp.trim() ? (locale==='es'?'Ingrese la propuesta de valor':'Please enter the value proposition') : ''} fullWidth /></Grid>
          <Grid item xs={12} md={6}><TextField label={t('wizard.step2.fields.description')} value={customerDesc} onChange={e=>setCustomerDesc(e.target.value)} placeholder={t('wizard.step2.placeholders.description')} error={showErr && !customerDesc.trim()} helperText={showErr && !customerDesc.trim() ? (locale==='es'?'Ingrese una descripción para clientes':'Please enter a customer description') : ''} fullWidth /></Grid>
          <Grid item xs={12}><TextField label={L.client.expectedImpact} value={expectedImpact} onChange={e=>setExpectedImpact(e.target.value)} placeholder={locale==='es'?'Ej.: −30% tiempo, +15% tasa de resolución, 2x triage':'e.g., −30% study time, +15% resolution rate, 2x faster triage'} error={showErr && !expectedImpact.trim()} helperText={showErr && !expectedImpact.trim() ? (locale==='es'?'Ingrese el impacto esperado':'Please specify expected impact') : ''} fullWidth /></Grid>
          <Grid item xs={12} md={6}><Autocomplete multiple freeSolo selectOnFocus clearOnBlur handleHomeEndKeys options={INDUSTRIES} value={industries} onChange={(_,v)=>setIndustries(v)} renderTags={(value,getTagProps)=>value.map((o,i)=>(<Chip label={o} {...getTagProps({index:i})} key={o}/>))} renderInput={(p)=>(<TextField {...p} label={t('wizard.step2.fields.industries')} placeholder={t('wizard.step2.placeholders.select')} error={showErr && industries.length===0} helperText={showErr && industries.length===0 ? (locale==='es'?'Agrega al menos 1 industria':'Please add at least one industry') : ''}/>)} /></Grid>
          <Grid item xs={12} md={6}><Autocomplete multiple freeSolo selectOnFocus clearOnBlur handleHomeEndKeys options={USECASES} value={useCases} onChange={(_,v)=>setUseCases(v)} renderTags={(value,getTagProps)=>value.map((o,i)=>(<Chip label={o} {...getTagProps({index:i})} key={o}/>))} renderInput={(p)=>(<TextField {...p} label={t('wizard.step2.fields.useCases')} placeholder={t('wizard.step2.placeholders.select')} error={showErr && useCases.length===0} helperText={showErr && useCases.length===0 ? (locale==='es'?'Agrega al menos 1 caso de uso':'Please add at least one use case') : ''}/>)} /></Grid>
          <Grid item xs={12} md={8}><Autocomplete multiple freeSolo selectOnFocus clearOnBlur handleHomeEndKeys options={['en','es','pt','fr','de','it','zh','ja','ko']} value={supportedLangs} onChange={(_,v)=>setSupportedLangs(v)} renderTags={(value,getTagProps)=>value.map((o,i)=>(<Chip label={o} {...getTagProps({index:i})} key={o}/>))} renderInput={(p)=>(<TextField {...p} label={L.client.supportedLangs} placeholder="en, es, pt" error={showErr && supportedLangs.length===0} helperText={showErr && supportedLangs.length===0 ? (locale==='es'?'Agrega al menos 1 idioma':'Please add at least one language') : ''}/>)} /></Grid>
          <Grid item xs={12} md={4}><TextField label={L.client.primaryLang} value={primaryLanguage} onChange={e=>setPrimaryLanguage(e.target.value)} placeholder={locale==='es'?'Ej.: es':'e.g., en'} fullWidth /></Grid>
          <Grid item xs={12} md={6}><Autocomplete freeSolo selectOnFocus clearOnBlur handleHomeEndKeys options={['llm-chat','embeddings','classification','summarization','vision','audio','multimodal']} value={modelType || null} onChange={(_,v)=>setModelType(v||'')} renderInput={(p)=>(<TextField {...p} label={L.client.modelType} placeholder={locale==='es'?'selecciona o escribe':'select or type'} error={showErr && !(modelType||'').trim()} helperText={showErr && !(modelType||'').trim() ? (locale==='es'?'Selecciona el tipo de modelo':'Please select a model type') : ''} />)} /></Grid>
          <Grid item xs={12} md={6}><TextField label={L.client.metrics} value={metrics} onChange={e=>setMetrics(e.target.value)} placeholder={locale==='es'?'Ej.: Accuracy 89% en dataset X; MMLU 68':'e.g., Accuracy 89% on dataset X; MMLU 68'} fullWidth /></Grid>
          <Grid item xs={12} md={6}><TextField label={t('wizard.step2.fields.inputs')} value={inputsDesc} onChange={e=>setInputsDesc(e.target.value)} placeholder={t('wizard.step2.placeholders.inputs')} error={showErr && !inputsDesc.trim()} helperText={showErr && !inputsDesc.trim() ? (locale==='es'?'Describe entradas':'Please describe inputs') : ''} fullWidth /></Grid>
          <Grid item xs={12} md={6}><TextField label={t('wizard.step2.fields.outputs')} value={outputsDesc} onChange={e=>setOutputsDesc(e.target.value)} placeholder={t('wizard.step2.placeholders.outputs')} error={showErr && !outputsDesc.trim()} helperText={showErr && !outputsDesc.trim() ? (locale==='es'?'Describe salidas':'Please describe outputs') : ''} fullWidth /></Grid>
          <Grid item xs={12}>
            <Stack spacing={2}>
              {ioExamplesList.map((ex, idx) => (
                <Grid container spacing={{ xs: 0.5, md: 1 }} key={idx} alignItems="flex-start">
                  <Grid item xs={12} md={4}><TextField label={t('wizard.step2.examples.input')} value={ex.input} onChange={e=>{ const next=[...ioExamplesList]; next[idx]={...next[idx], input:e.target.value}; setIoExamplesList(next) }} fullWidth /></Grid>
                  <Grid item xs={12} md={4}><TextField label={t('wizard.step2.examples.output')} value={ex.output} onChange={e=>{ const next=[...ioExamplesList]; next[idx]={...next[idx], output:e.target.value}; setIoExamplesList(next) }} fullWidth /></Grid>
                  <Grid item xs={12} md={3}><TextField label={t('wizard.step2.examples.note') } value={ex.note || ''} onChange={e=>{ const next=[...ioExamplesList]; next[idx]={...next[idx], note:e.target.value}; setIoExamplesList(next) }} fullWidth /></Grid>
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
          <Grid item xs={12}><TextField multiline rows={2} label={L.client.risks} value={risks} onChange={e=>setRisks(e.target.value)} placeholder={locale==='es'? 'No usar para decisiones médicas/legales; puede alucinar en cálculos': 'Not for medical/legal decisions; may hallucinate on complex math'} error={showErr && !risks.trim()} helperText={showErr && !risks.trim() ? (locale==='es'?'Ingresa limitaciones y riesgos':'Please enter limitations and risks') : ''} fullWidth /></Grid>
          <Grid item xs={12}><TextField multiline rows={2} label={L.client.prohibited} value={prohibited} onChange={e=>setProhibited(e.target.value)} placeholder={locale==='es'? 'Ej.: No usar con datos de menores; no para decisiones financieras de alto riesgo':'e.g., No minors data; not for high-stakes financial decisions'} error={showErr && !prohibited.trim()} helperText={showErr && !prohibited.trim() ? (locale==='es'?'Ingresa usos prohibidos':'Please enter prohibited uses') : ''} fullWidth /></Grid>
          <Grid item xs={12} md={6}><TextField label={t('wizard.step2.fields.privacy')} value={privacy} onChange={e=>setPrivacy(e.target.value)} placeholder={t('wizard.step2.placeholders.privacy')} error={showErr && !privacy.trim()} helperText={showErr && !privacy.trim() ? (locale==='es'?'Describe privacidad/PII/logs':'Please describe privacy/PII/logs') : ''} fullWidth /></Grid>
          <Grid item xs={12} md={6}><Autocomplete multiple freeSolo selectOnFocus clearOnBlur handleHomeEndKeys options={DEPLOY} value={deployOptions} onChange={(_,v)=>setDeployOptions(v)} renderTags={(value,getTagProps)=>value.map((o,i)=>(<Chip label={o} {...getTagProps({index:i})} key={o}/>))} renderInput={(p)=>(<TextField {...p} label={t('wizard.step2.fields.support').replace('Support','Deploy')} placeholder={t('wizard.step2.placeholders.select')}/>)} /></Grid>
          <Grid item xs={12}><TextField label={t('wizard.step2.fields.support')} value={support} onChange={e=>setSupport(e.target.value)} placeholder={t('wizard.step2.placeholders.support')} error={showErr && !support.trim()} helperText={showErr && !support.trim() ? (locale==='es'?'Describe cómo brindar soporte':'Please describe how buyers get support') : ''} fullWidth /></Grid>
        </Grid>
        </Box>
        </Box>
        )}
      </Paper>

      

      {/* Secciones técnicas */}
      {draftLoading ? (
        <Paper variant="outlined" sx={{ p: { xs:2, md:3 }, mb: 3, borderRadius:2 }}>
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
            <Paper variant="outlined" sx={{ p: { xs:2, md:3 }, borderRadius:2 }}>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                <Typography variant="subtitle1" fontWeight={600}>{t('wizard.step2.tech.titles.capabilities')}</Typography>
                <Tooltip title={t('wizard.step2.tech.helps.capabilities')}><InfoOutlinedIcon fontSize="small" color="action"/></Tooltip>
              </Stack>
              <Stack spacing={2}>
                <Autocomplete multiple freeSolo selectOnFocus clearOnBlur handleHomeEndKeys options={TASKS} value={tasks} onChange={(_,v)=>setTasks(v)} renderTags={(value,getTagProps)=>value.map((o,i)=>(<Chip label={o} {...getTagProps({index:i})} key={o}/>))} renderInput={(p)=>(<TextField {...p} label={t('wizard.step2.tech.labels.tasks')} placeholder={t('wizard.step2.tech.placeholders.select')} error={showErr && tasks.length===0} helperText={showErr && tasks.length===0 ? (locale==='es'?'Agrega al menos 1 tarea':'Please add at least one task') : ''}/>)} />
                <Autocomplete multiple freeSolo selectOnFocus clearOnBlur handleHomeEndKeys options={MODALITIES} value={modalities} onChange={(_,v)=>setModalities(v)} renderTags={(value,getTagProps)=>value.map((o,i)=>(<Chip label={o} {...getTagProps({index:i})} key={o}/>))} renderInput={(p)=>(<TextField {...p} label={t('wizard.step2.tech.labels.modalities')} placeholder={t('wizard.step2.tech.placeholders.select')} error={showErr && modalities.length===0} helperText={showErr && modalities.length===0 ? (locale==='es'?'Agrega al menos 1 modalidad':'Please add at least one modality') : ''}/>)} />
              </Stack>
            </Paper>

            <Paper variant="outlined" sx={{ p: { xs:2, md:3 }, borderRadius:2 }}>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                <Typography variant="subtitle1" fontWeight={600}>{t('wizard.step2.tech.titles.architecture')}</Typography>
                <Tooltip title={t('wizard.step2.tech.helps.architecture')}><InfoOutlinedIcon fontSize="small" color="action"/></Tooltip>
              </Stack>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}><Autocomplete multiple freeSolo selectOnFocus clearOnBlur handleHomeEndKeys options={FRAMEWORKS} value={frameworks} onChange={(_,v)=>setFrameworks(v)} renderTags={(value,getTagProps)=>value.map((o,i)=>(<Chip label={o} {...getTagProps({index:i})} key={o}/>))} renderInput={(p)=>(<TextField {...p} label={t('wizard.step2.tech.labels.frameworks')} placeholder={t('wizard.step2.tech.placeholders.select')} error={showErr && frameworks.length===0} helperText={showErr && frameworks.length===0 ? (locale==='es'?'Selecciona al menos 1 framework':'Please select at least one framework') : ''}/>)} /></Grid>
                <Grid item xs={12} md={6}><Autocomplete multiple freeSolo selectOnFocus clearOnBlur handleHomeEndKeys options={ARCHS} value={architectures} onChange={(_,v)=>setArchitectures(v)} renderTags={(value,getTagProps)=>value.map((o,i)=>(<Chip label={o} {...getTagProps({index:i})} key={o}/>))} renderInput={(p)=>(<TextField {...p} label={t('wizard.step2.tech.labels.architectures')} placeholder={t('wizard.step2.tech.placeholders.select')}/>)} /></Grid>
                <Grid item xs={12} md={6}><Autocomplete multiple freeSolo selectOnFocus clearOnBlur handleHomeEndKeys options={PRECISIONS} value={precisions} onChange={(_,v)=>setPrecisions(v)} renderTags={(value,getTagProps)=>value.map((o,i)=>(<Chip label={o} {...getTagProps({index:i})} key={o}/>))} renderInput={(p)=>(<TextField {...p} label={t('wizard.step2.tech.labels.precision')} placeholder={t('wizard.step2.tech.placeholders.precision')}/>)} /></Grid>
                <Grid item xs={12} md={6}><Autocomplete freeSolo selectOnFocus clearOnBlur handleHomeEndKeys options={QUANT} value={quantization || null} onChange={(_,v)=>setQuantization(v || '')} renderInput={(p)=>(<TextField {...p} label={t('wizard.step2.tech.labels.quantization')} placeholder={t('wizard.step2.tech.placeholders.select')}/>)} /></Grid>
                <Grid item xs={12} md={6}><Autocomplete multiple freeSolo selectOnFocus clearOnBlur handleHomeEndKeys options={FILES} value={modelFiles} onChange={(_,v)=>setModelFiles(v)} renderTags={(value,getTagProps)=>value.map((o,i)=>(<Chip label={o} {...getTagProps({index:i})} key={o}/>))} renderInput={(p)=>(<TextField {...p} label={t('wizard.step2.tech.labels.fileFormats')} placeholder="safetensors, gguf, onnx" error={showErr && modelFiles.length===0} helperText={showErr && modelFiles.length===0 ? (locale==='es'?'Selecciona al menos 1 formato':'Please select at least one format') : ''}/>)} /></Grid>
                <Grid item xs={12} md={3}><TextField label={L.tech.modelSize} value={modelSizeParams} onChange={e=>setModelSizeParams(e.target.value)} placeholder={locale==='es'?'Ej.: 7B, 13B':'e.g., 7B, 13B'} fullWidth /></Grid>
                <Grid item xs={12} md={3}><TextField label={L.tech.artifactSize} value={artifactSize} onChange={e=>setArtifactSize(e.target.value)} placeholder={locale==='es'?'~8 GB, 30–40 GB':'~8 GB, 30–40 GB'} fullWidth /></Grid>
                {tasks.includes('embedding') && (
                  <Grid item xs={12} md={3}><TextField type="number" label={L.tech.embedDim} value={embedDim} onChange={e=>setEmbedDim(e.target.value)} placeholder={locale==='es'?'p.ej., 768':'e.g., 768'} error={showErr && !(embedDim && Number(embedDim)>0)} helperText={showErr && !(embedDim && Number(embedDim)>0) ? (locale==='es'?'Requerido para modelos de embeddings':'Required for embedding models') : ''} fullWidth /></Grid>
                )}
              </Grid>
            </Paper>

            <Paper variant="outlined" sx={{ p: { xs:2, md:3 }, borderRadius:2 }}>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                <Typography variant="subtitle1" fontWeight={600}>{t('wizard.step2.tech.titles.runtime')}</Typography>
                <Tooltip title={t('wizard.step2.tech.helps.runtime')}><InfoOutlinedIcon fontSize="small" color="action"/></Tooltip>
              </Stack>
              <Grid container spacing={2}>
                <Grid item xs={12} md={3}><TextField label={t('wizard.step2.tech.labels.python')} value={python} onChange={e=>setPython(e.target.value)} error={showErr && !python.trim()} helperText={showErr && !python.trim() ? (locale==='es'?'Indica versión de runtime (p.ej., 3.10)':'Please specify runtime version (e.g., 3.10)') : ''} fullWidth /></Grid>
                <Grid item xs={12} md={3}><TextField label={t('wizard.step2.tech.labels.cuda')} value={cuda} onChange={e=>setCuda(e.target.value)} placeholder={t('wizard.step2.tech.placeholders.cuda')} fullWidth /></Grid>
                <Grid item xs={12} md={3}><TextField label={t('wizard.step2.tech.labels.torch')} value={torch} onChange={e=>setTorch(e.target.value)} placeholder={t('wizard.step2.tech.placeholders.torch')} fullWidth /></Grid>
                <Grid item xs={12} md={3}><TextField label={t('wizard.step2.tech.labels.cudnn')} value={cudnn} onChange={e=>setCudnn(e.target.value)} fullWidth /></Grid>
                <Grid item xs={12} md={6}><Autocomplete multiple freeSolo selectOnFocus clearOnBlur handleHomeEndKeys options={OS} value={oses} onChange={(_,v)=>setOses(v)} renderTags={(value,getTagProps)=>value.map((o,i)=>(<Chip label={o} {...getTagProps({index:i})} key={o}/>))} renderInput={(p)=>(<TextField {...p} label={t('wizard.step2.tech.labels.systems')} placeholder="linux, windows, macos" error={showErr && oses.length===0} helperText={showErr && oses.length===0 ? (locale==='es'?'Selecciona al menos 1 sistema':'Please select at least one system') : ''}/>)} /></Grid>
                <Grid item xs={12} md={6}><Autocomplete multiple freeSolo selectOnFocus clearOnBlur handleHomeEndKeys options={ACCELS} value={accelerators} onChange={(_,v)=>setAccelerators(v)} renderTags={(value,getTagProps)=>value.map((o,i)=>(<Chip label={o} {...getTagProps({index:i})} key={o}/>))} renderInput={(p)=>(<TextField {...p} label={t('wizard.step2.tech.labels.accelerators')} placeholder="nvidia-cuda, amd-rocm, apple-metal" error={showErr && accelerators.length===0} helperText={showErr && accelerators.length===0 ? (locale==='es'?'Selecciona al menos 1 acelerador o CPU only':'Please select at least one accelerator or CPU only') : ''}/>)} /></Grid>
                <Grid item xs={12} md={6}><TextField label={t('wizard.step2.tech.labels.computeCapability')} value={computeCapability} onChange={e=>setComputeCapability(e.target.value)} placeholder={t('wizard.step2.tech.placeholders.compute')} fullWidth /></Grid>
              </Grid>
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
              <Grid container spacing={2}>
                <Grid item xs={12} md={3}><TextField type="number" label={t('wizard.step2.tech.labels.maxBatch')} value={maxBatch} onChange={e=>setMaxBatch(e.target.value)} error={showErr && !(Number(maxBatch||0)>0)} helperText={showErr && !(Number(maxBatch||0)>0) ? (locale==='es'?'Requerido':'Required') : ''} fullWidth /></Grid>
                <Grid item xs={12} md={3}><TextField type="number" label={t('wizard.step2.tech.labels.contextLen')} value={contextLen} onChange={e=>setContextLen(e.target.value)} error={showErr && !(Number(contextLen||0)>0)} helperText={showErr && !(Number(contextLen||0)>0) ? (locale==='es'?'Requerido':'Required') : ''} fullWidth /></Grid>
                <Grid item xs={12} md={3}><TextField type="number" label={t('wizard.step2.tech.labels.maxTokens')} value={maxTokens} onChange={e=>setMaxTokens(e.target.value)} error={showErr && !(Number(maxTokens||0)>0)} helperText={showErr && !(Number(maxTokens||0)>0) ? (locale==='es'?'Requerido':'Required') : ''} fullWidth /></Grid>
                {modalities.includes('image') && (
                  <Grid item xs={12} md={3}><TextField label={t('wizard.step2.tech.labels.imagePx')} value={imgResolution} onChange={e=>setImgResolution(e.target.value)} placeholder={t('wizard.step2.tech.placeholders.imagePx')} fullWidth /></Grid>
                )}
                {modalities.includes('audio') && (
                  <Grid item xs={12} md={3}><TextField type="number" label={t('wizard.step2.tech.labels.sampleRate')} value={sampleRate} onChange={e=>setSampleRate(e.target.value)} fullWidth /></Grid>
                )}
                <Grid item xs={12} md={3}><FormControlLabel control={<Switch checked={useTriton} onChange={e=>setUseTriton(e.target.checked)} />} label={t('wizard.step2.tech.labels.triton')} /></Grid>
                <Grid item xs={12}><TextField label={L.tech.refPerf} value={refPerf} onChange={e=>setRefPerf(e.target.value)} placeholder={locale==='es'? 'p.ej., ~40 tok/s en A100 80GB, batch=4':'e.g., ~40 tok/s on A100 80GB, batch=4'} fullWidth /></Grid>
              </Grid>
            </Paper>
          </Stack>
        </AccordionDetails>
      </Accordion>
      )}

      <Divider sx={{ my: 2 }} />

      <Box sx={{ height: { xs: 76, md: 72 } }} />

      <Box sx={{ position:'fixed', bottom: 0, left: 0, right: 0, zIndex: (t)=>t.zIndex.appBar + 1 }}>
        <Paper elevation={3} sx={{ borderRadius: 0, px: { xs:1.5, md:2 }, py: 1, backdropFilter:'saturate(180%) blur(8px)', bgcolor: (t)=> t.palette.mode==='dark' ? 'rgba(18,18,18,0.7)' : 'rgba(255,255,255,0.7)', borderTop: (t)=>`1px solid ${t.palette.divider}`, pb: 'max(env(safe-area-inset-bottom), 8px)' }}>
          <Box sx={{ maxWidth: 1000, mx: 'auto', width:'100%' }}>
            <Box sx={{ display:{ xs:'flex', md:'none' }, alignItems:'center', justifyContent:'space-between', width:'100%' }}>
              <Button size="small" href={`${base}/step1`} onClick={onBack as any} variant="text" color="inherit" startIcon={<ArrowBackIcon />} sx={{ borderRadius: 2, textTransform:'none', py: 0.75, whiteSpace:'nowrap', fontSize:{ xs:12, md:14 }, '& .MuiButton-startIcon': { mr: 0.5, '& svg': { fontSize: 18 } }, '&:active':{ transform:'scale(0.98)' } }}>
                {t('wizard.common.back')}
              </Button>
              <Button size="small" onClick={()=>onSave('manual')} disabled={saving || nextLoading} variant="text" color="primary" startIcon={saving? undefined : <SaveOutlinedIcon />} sx={{ borderRadius: 2, textTransform:'none', py: 0.75, whiteSpace:'nowrap', fontSize:{ xs:12, md:14 }, '& .MuiButton-startIcon': { mr: 0.5, '& svg': { fontSize: 18 } }, '&:active':{ transform:'scale(0.98)' } }}>
                {saving? (<><CircularProgress size={14} sx={{ mr: 1 }} /> {t('wizard.common.saving')}</>) : t('wizard.common.saveDraft')}
              </Button>
              <Button size="small" href={`${base}/step3`} onClick={onNext} disabled={nextLoading || !isClientSheetValid() || !isTechValid()} variant="text" color="inherit" endIcon={nextLoading? undefined : <ArrowForwardIcon />} sx={{ borderRadius: 2, textTransform:'none', py: 0.75, whiteSpace:'nowrap', fontSize:{ xs:12, md:14 }, '& .MuiButton-endIcon': { ml: 0.5, '& svg': { fontSize: 18 } }, transition:'transform 80ms', '&:active':{ transform:'scale(0.98)' } }}>
                {nextLoading ? (<><CircularProgress size={14} sx={{ mr: 1 }} /> {locale==='es'?'Cargando…':'Loading…'}</>) : t('wizard.common.next')}
              </Button>
            </Box>

            <Box sx={{ display:{ xs:'none', md:'flex' }, alignItems:'center', justifyContent:'space-between', gap: 1.25 }}>
              <Button href={`${base}/step1`} onClick={onBack as any} variant="text" color="inherit" startIcon={<ArrowBackIcon />} sx={{ borderRadius: 2, textTransform:'none', py: 1, '&:active':{ transform:'scale(0.98)' } }}>
                {t('wizard.common.back')}
              </Button>
              <Box sx={{ display:'flex', gap: 1.25 }}>
                <Button onClick={()=>onSave('manual')} disabled={saving || nextLoading} variant="text" color="primary" startIcon={saving? undefined : <SaveOutlinedIcon />} sx={{ borderRadius: 2, textTransform:'none', py: 1, '&:active':{ transform:'scale(0.98)' } }}>
                  {saving? (<><CircularProgress size={16} sx={{ mr: 1 }} /> {t('wizard.common.saving')}</>) : t('wizard.common.saveDraft')}
                </Button>
                <Button href={`${base}/step3`} onClick={onNext} disabled={nextLoading || !isClientSheetValid() || !isTechValid()} variant="text" color="inherit" endIcon={nextLoading? undefined : <ArrowForwardIcon />} sx={{ borderRadius: 2, textTransform:'none', py: 1, transition:'transform 80ms', '&:active':{ transform:'scale(0.98)' } }}>
                  {nextLoading ? (<><CircularProgress size={16} sx={{ mr: 1 }} /> {locale==='es'?'Cargando…':'Loading…'}</>) : t('wizard.common.next')}
                </Button>
              </Box>
            </Box>
          </Box>
        </Paper>
      </Box>

      {msg && <Typography sx={{ mt:1 }} color={msg===t('wizard.common.saved') ? 'success.main' : 'warning.main'}>{msg}</Typography>}
    </Box>
  )
}
