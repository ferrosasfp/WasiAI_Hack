"use client";
import { useMemo, useState, useRef, useEffect } from 'react'
import { Box, Stack, Typography, Paper, Tooltip, TextField, Autocomplete, Chip, Grid, Divider, Button, FormHelperText, Switch, FormControlLabel, Accordion, AccordionSummary, AccordionDetails, IconButton, Card, CardActionArea } from '@mui/material'
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
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew'
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined'

async function saveDraft(payload: any) {
  const res = await fetch('/api/models/draft', { method: 'POST', body: JSON.stringify(payload) })
  return res.json()
}

export default function Step2Compatibility() {
  const detectedLocale = typeof window !== 'undefined' ? (['en','es'].includes((window.location.pathname.split('/')[1]||'').toLowerCase()) ? window.location.pathname.split('/')[1] : 'en') : 'en'
  // Redirige esta ruta sin prefijo a la localización equivalente
  if (typeof window !== 'undefined' && !/^\/(en|es)\//.test(window.location.pathname)) {
    window.location.replace(`/${detectedLocale}/publish/wizard/step2`)
    return null
  }
  const base = `/${detectedLocale}/publish/wizard`
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const { walletAddress } = useWalletAddress()
  const [dirty, setDirty] = useState(false)
  const navigatingRef = useRef(false)

  const presetsRef = useRef<HTMLDivElement>(null)
  const scrollPresets = (dir: 'prev'|'next') => {
    const el = presetsRef.current
    if (!el) return
    const delta = Math.min(el.clientWidth * 0.9, 600)
    el.scrollBy({ left: dir==='next' ? delta : -delta, behavior: 'smooth' })
  }

  // Ocultar mensajes de validación tras 3s (mantener 'Guardado' breve)
  useEffect(() => {
    if (!msg) return
    const t = setTimeout(()=>setMsg(''), 3000)
    return () => clearTimeout(t)
  }, [msg])
  const onBack = (e: React.MouseEvent<HTMLAnchorElement | HTMLButtonElement>) => {
    // Autoguardar siempre al ir Atrás; no bloqueamos por validación
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
  const [quantization, setQuantization] = useState<string>('none')
  const [modelSizeParams, setModelSizeParams] = useState<string>('')
  const [modelFiles, setModelFiles] = useState<string[]>([])

  const [python, setPython] = useState('3.11')
  const [cuda, setCuda] = useState('')
  const [torch, setTorch] = useState('2.2')
  const [cudnn, setCudnn] = useState('')
  const [oses, setOses] = useState<string[]>(['linux'])
  const [accelerators, setAccelerators] = useState<string[]>(['nvidia-cuda'])
  const [computeCapability, setComputeCapability] = useState('')

  const [pipDeps, setPipDeps] = useState('')

  const [vramGB, setVramGB] = useState('0')
  const [cpuCores, setCpuCores] = useState('0')
  const [ramGB, setRamGB] = useState('0')

  const [maxBatch, setMaxBatch] = useState('1')
  const [contextLen, setContextLen] = useState('2048')
  const [maxTokens, setMaxTokens] = useState('512')
  const [imgResolution, setImgResolution] = useState('1024x1024')
  const [sampleRate, setSampleRate] = useState('16000')
  const [useTriton, setUseTriton] = useState(false)

  // Ficha para clientes (orientado a compradores)
  const INDUSTRIES = useMemo(() => [
    'retail','finanzas','salud','educación','legal','manufactura','logística','marketing','soporte','energía','rrhh','e‑commerce'
  ], [])
  const USECASES = useMemo(() => [
    'recomendación','predicción','predicción churn','forecast demanda','asistente estudio','Q&A documentos','clasificación','detección fraude','resumen',
    'generación texto','ideas campaña','optimización','ruteo','sentiment','tópicos','ranking','anomalías','forecast'
  ], [])
  const DEPLOY = useMemo(() => ['API SaaS','Docker on‑prem','Cloud (Base/AWS/GCP)','Edge'], [])
  const [valueProp, setValueProp] = useState('')
  const [customerDesc, setCustomerDesc] = useState('')
  const [industries, setIndustries] = useState<string[]>([])
  const [useCases, setUseCases] = useState<string[]>([])
  const [expectedOutcomes, setExpectedOutcomes] = useState('')
  const [inputsDesc, setInputsDesc] = useState('')
  const [outputsDesc, setOutputsDesc] = useState('')
  const [ioExamplesList, setIoExamplesList] = useState<Array<{ input: string; output: string; note?: string }>>([
    { input: '', output: '', note: '' }
  ])
  const [limitations, setLimitations] = useState('')
  const [privacy, setPrivacy] = useState('')
  const [deployOptions, setDeployOptions] = useState<string[]>([])
  const [support, setSupport] = useState('')
  const [activePreset, setActivePreset] = useState<string>('')
  const slugify = (s:string)=> s.toLowerCase().replace(/[^a-z0-9]+/g,'-')

  // Presets orientados a compradores
  type Preset = {
    name: string
    customer: Partial<{
      valueProp: string
      description: string
      industries: string[]
      useCases: string[]
      expectedOutcomes: string
      inputs: string
      outputs: string
      examples: string
      limitations: string
      privacy: string
      deploy: string[]
      support: string
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
    }>
  }

  const clearPreset = () => {
    setValueProp('')
    setCustomerDesc('')
    setIndustries([])
    setUseCases([])
    setExpectedOutcomes('')
    setInputsDesc('')
    setOutputsDesc('')
    setIoExamplesList([{ input: '', output: '', note: '' }])
    setLimitations('')
    setPrivacy('')
    setDeployOptions([])
    setSupport('')
    setActivePreset('')
    // limpiar sugerencias técnicas
    setTasks([])
    setModalities([])
    setFrameworks([])
    setArchitectures([])
    setPrecisions([])
    setQuantization('none')
    setModelFiles([])
    setVramGB('0')
    setCpuCores('0')
    setRamGB('0')
    setMsg('Ficha limpiada')
    setDirty(true)
  }

  const PRESETS: Preset[] = [
    {
      name: 'Retail — Recomendador',
      customer: {
        valueProp: 'Recomienda productos por temporada y comportamiento de compra',
        description: 'Optimiza ventas y retención con recomendaciones personalizadas con tus datos históricos.',
        industries: ['retail','marketing'],
        useCases: ['recomendación','forecast demanda'],
        expectedOutcomes: '+8–15% en conversión, +10% en retención',
        inputs: 'CSV ventas, catálogo (CSV/Excel), calendario de promociones',
        outputs: 'Top‑N productos recomendados por cliente',
        examples: 'Input: customer_id=123; Output: ["SKU-34","SKU-98","SKU-22"]',
        limitations: 'Puede perder precisión sin historial suficiente',
        privacy: 'Datos de clientes se procesan en entorno aislado; anonimización opcional',
        deploy: ['API SaaS','Docker on‑prem','Cloud (Base/AWS/GCP)'],
        support: 'Soporte comercial 8x5; onboarding guiado'
      },
      technical: {
        tasks: ['recommendation','classification'],
        modalities: ['tabular','text'],
        frameworks: ['PyTorch 2.2','ONNX'],
        architectures: ['T5'],
        precisions: ['fp16'],
        quantization: 'int8',
        modelFiles: ['onnx','safetensors'],
        vramGB: '8', cpuCores: '4', ramGB: '8'
      }
    },
    {
      name: 'Educación — Asistente de estudio',
      customer: {
        valueProp: 'Explica problemas complejos de química paso a paso',
        description: 'Asistente conversacional con razonamiento y ejemplos guiados.',
        industries: ['educación'],
        useCases: ['asistente estudio','Q&A documentos'],
        expectedOutcomes: '−30% tiempo de estudio, +20% tasa de aprobación (estimado)',
        inputs: 'Preguntas en texto; PDFs opcionales',
        outputs: 'Respuestas estructuradas con pasos',
        examples: 'Pregunta: balancear ecuación; Respuesta: pasos y resultado',
        limitations: 'Puede requerir verificación para cálculos numéricos',
        privacy: 'Sin PII; documentos locales opcionales',
        deploy: ['API SaaS','Cloud (Base/AWS/GCP)'],
        support: 'Foro y actualizaciones mensuales'
      },
      technical: {
        tasks: ['chat','instruction-following','embedding'],
        modalities: ['text'],
        frameworks: ['PyTorch 2.3'],
        architectures: ['Llama'],
        precisions: ['fp16'],
        quantization: 'int4',
        modelFiles: ['safetensors'],
        vramGB: '12', cpuCores: '4', ramGB: '16'
      }
    },
    {
      name: 'Soporte — Q&A PDFs',
      customer: {
        valueProp: 'Responde preguntas sobre tus documentos empresariales',
        description: 'Indexa PDFs y habilita búsqueda semántica + respuestas exactas.',
        industries: ['legal','finanzas','soporte'],
        useCases: ['Q&A documentos','resumen'],
        expectedOutcomes: '−40% tiempo de búsqueda de información',
        inputs: 'PDFs, DOCX',
        outputs: 'Respuestas citando fuentes',
        examples: 'Pregunta: política de devoluciones; Respuesta: cita de documento',
        limitations: 'Depende de la calidad del OCR',
        privacy: 'Datos permanecen en contenedor dedicado',
        deploy: ['API SaaS','Docker on‑prem'],
        support: 'SLA 99.5% opcional'
      },
      technical: {
        tasks: ['retrieval','embedding','chat'],
        modalities: ['text'],
        frameworks: ['PyTorch 2.2','ONNX'],
        architectures: ['Llama','T5'],
        precisions: ['fp16'],
        quantization: 'none',
        modelFiles: ['onnx','safetensors'],
        vramGB: '8', cpuCores: '4', ramGB: '16'
      }
    }
    ,
    {
      name: 'Salud — Triage',
      customer: {
        valueProp: 'Clasifica síntomas y sugiere nivel de urgencia',
        description: 'Asistente que prioriza casos y orienta siguientes pasos (no reemplaza diagnóstico médico).',
        industries: ['salud'],
        useCases: ['clasificación','Q&A documentos'],
        expectedOutcomes: 'Mejor priorización y tiempos de respuesta',
        inputs: 'Descripción de síntomas (texto)',
        outputs: 'Nivel de urgencia y recomendaciones generales',
        examples: 'Input: fiebre 39°C + tos; Output: urgencia media, consultar médico',
        limitations: 'No es diagnóstico; puede incurrir en falsos positivos/negativos',
        privacy: 'Datos sensibles; se recomienda entorno aislado y anonimización',
        deploy: ['API SaaS','Docker on‑prem'],
        support: 'Soporte 8x5; acuerdos específicos disponibles'
      },
      technical: {
        tasks: ['classification','chat'],
        modalities: ['text'],
        frameworks: ['PyTorch 2.2'],
        architectures: ['T5','Llama'],
        precisions: ['bf16','fp16'],
        quantization: 'int8',
        modelFiles: ['safetensors'],
        vramGB: '8', cpuCores: '4', ramGB: '8'
      }
    },
    {
      name: 'Legal — Asistente contratos',
      customer: {
        valueProp: 'Resume y destaca cláusulas clave en contratos',
        description: 'Búsqueda semántica y resúmenes con referencias.',
        industries: ['legal'],
        useCases: ['resumen','Q&A documentos'],
        expectedOutcomes: '−50% tiempo de revisión',
        inputs: 'PDF/DOCX de contratos',
        outputs: 'Resumen y cláusulas relevantes con citas',
        examples: 'Pregunta: obligaciones de proveedor; Respuesta: párrafo citado',
        limitations: 'Puede omitir matices legales; revisión humana recomendada',
        privacy: 'Documentos permanecen en repositorio privado',
        deploy: ['API SaaS','Docker on‑prem'],
        support: 'SLA 99.5% opcional'
      },
      technical: {
        tasks: ['retrieval','summarization','chat'],
        modalities: ['text'],
        frameworks: ['PyTorch 2.3','ONNX'],
        architectures: ['T5','Llama'],
        precisions: ['fp16'],
        quantization: 'none',
        modelFiles: ['onnx','safetensors'],
        vramGB: '8', cpuCores: '4', ramGB: '16'
      }
    },
    {
      name: 'Finanzas — Fraude',
      customer: {
        valueProp: 'Detecta transacciones sospechosas en tiempo real',
        description: 'Modelo de riesgo con señales tabulares y texto.',
        industries: ['finanzas'],
        useCases: ['detección fraude','clasificación'],
        expectedOutcomes: 'Reducción de pérdidas por fraude (según umbrales)',
        inputs: 'Transacciones (tabular), descripciones (texto)',
        outputs: 'Score de riesgo y alerta',
        examples: 'Input: txn #AB123; Output: score=0.93 (alto riesgo)',
        limitations: 'Puede requerir tuning por dataset; riesgo de sesgos',
        privacy: 'PII protegido; cifrado y retención mínima',
        deploy: ['API SaaS','Docker on‑prem','Cloud (Base/AWS/GCP)'],
        support: 'Soporte 24/7 opcional'
      },
      technical: {
        tasks: ['classification'],
        modalities: ['tabular','text'],
        frameworks: ['ONNX','PyTorch 2.2'],
        architectures: ['T5'],
        precisions: ['fp16'],
        quantization: 'int8',
        modelFiles: ['onnx'],
        vramGB: '4', cpuCores: '4', ramGB: '8'
      }
    },
    {
      name: 'Marketing — Copies',
      customer: {
        valueProp: 'Genera copys y slogans consistentes con tu marca',
        description: 'Plantillas y tonos predefinidos para campañas multi‑canal.',
        industries: ['marketing'],
        useCases: ['generación texto','ideas campaña'],
        expectedOutcomes: 'Acelera creatividades, consistencia de tono',
        inputs: 'Brief y tono',
        outputs: 'Variantes de copy',
        examples: 'Input: campaña verano; Output: 5 slogans',
        limitations: 'Puede repetir clichés si no se guía',
        deploy: ['API SaaS']
      },
      technical: {
        tasks: ['text-generation'],
        modalities: ['text'],
        frameworks: ['PyTorch 2.3'],
        architectures: ['Llama'],
        precisions: ['fp16'],
        modelFiles: ['safetensors'],
        vramGB: '8', cpuCores: '2', ramGB: '8'
      }
    },
    {
      name: 'Manufactura — Mantenimiento',
      customer: {
        valueProp: 'Predice fallas y programa mantenimiento preventivo',
        description: 'Modelos sobre sensores para reducir paradas.',
        industries: ['manufactura'],
        useCases: ['predicción','anomalías'],
        expectedOutcomes: '−20% downtime (estimado)',
        inputs: 'Series de tiempo sensores',
        outputs: 'Alertas/score de falla',
        examples: 'Input: vibración motor; Output: alerta 0.86',
        limitations: 'Requiere histórico suficiente',
        deploy: ['Docker on‑prem']
      },
      technical: {
        tasks: ['classification'], modalities: ['tabular'], frameworks: ['ONNX'], architectures: ['T5'], precisions: ['fp16'], modelFiles: ['onnx'], vramGB:'4', cpuCores:'4', ramGB:'8'
      }
    },
    {
      name: 'Logística — Ruteo',
      customer: {
        valueProp: 'Optimiza rutas y ventanas de entrega',
        description: 'Heurísticas + ML para última milla.',
        industries: ['logística'],
        useCases: ['optimización','ruteo'],
        expectedOutcomes: '−12% km recorridos',
        inputs: 'Órdenes, matriz distancias',
        outputs: 'Secuencia óptima',
        examples: 'Input: 40 stops; Output: ruta ordenada',
        limitations: 'Supone costos estáticos',
        deploy: ['API SaaS']
      },
      technical: {
        tasks: ['planning'], modalities: ['tabular'], frameworks: ['PyTorch 2.2'], architectures: ['T5'], precisions: ['fp16'], modelFiles: ['onnx'], vramGB:'4', cpuCores:'2', ramGB:'8'
      }
    },
    {
      name: 'E‑commerce — Reseñas',
      customer: {
        valueProp: 'Analiza sentimiento y temas en reseñas',
        description: 'Detección de insights por producto/categoría.',
        industries: ['retail'],
        useCases: ['sentiment','tópicos'],
        expectedOutcomes: 'Mejora NPS y catálogo',
        inputs: 'Texto reseñas',
        outputs: 'Sentimiento y temas',
        examples: 'Input: “lento envío”; Output: tema logístico',
        limitations: 'Ironía puede fallar',
        deploy: ['API SaaS']
      },
      technical: {
        tasks: ['classification'], modalities: ['text'], frameworks: ['PyTorch 2.3'], architectures: ['T5'], precisions: ['fp16'], modelFiles: ['safetensors'], vramGB:'6', cpuCores:'2', ramGB:'8'
      }
    },
    {
      name: 'RRHH — Matching',
      customer: {
        valueProp: 'Match candidato‑vacante por competencias',
        description: 'Embeddings y reglas para shortlist.',
        industries: ['rrhh'],
        useCases: ['ranking','clasificación'],
        expectedOutcomes: 'Acelera screening',
        inputs: 'CVs y descripciones',
        outputs: 'Ranking candidatos',
        examples: 'Input: 100 CVs; Output: top‑10',
        limitations: 'Sesgos si datos están sesgados',
        deploy: ['API SaaS']
      },
      technical: {
        tasks: ['embedding','ranking'], modalities: ['text'], frameworks: ['PyTorch 2.2'], architectures: ['Mistral'], precisions: ['fp16'], modelFiles: ['safetensors'], vramGB:'6', cpuCores:'2', ramGB:'8'
      }
    },
    {
      name: 'Energía — Forecast',
      customer: {
        valueProp: 'Pronostica demanda energética',
        description: 'Series de tiempo con estacionalidad y clima.',
        industries: ['energía'],
        useCases: ['forecast'],
        expectedOutcomes: 'Mejor planificación',
        inputs: 'Consumo histórico, clima',
        outputs: 'Curva de demanda',
        examples: 'Input: 24m series; Output: 7d forecast',
        limitations: 'Cambios de régimen afectan',
        deploy: ['Docker on‑prem']
      },
      technical: {
        tasks: ['forecasting'], modalities: ['tabular'], frameworks: ['ONNX'], architectures: ['T5'], precisions: ['fp16'], modelFiles: ['onnx'], vramGB:'4', cpuCores:'4', ramGB:'8'
      }
    }
  ]

  const getPresetIcon = (name: string) => {
    if (name.toLowerCase().startsWith('retail')) return <LocalMallIcon fontSize="small" />
    if (name.toLowerCase().startsWith('educación')) return <SchoolIcon fontSize="small" />
    if (name.toLowerCase().startsWith('soporte')) return <DescriptionIcon fontSize="small" />
    if (name.toLowerCase().startsWith('salud')) return <LocalHospitalIcon fontSize="small" />
    if (name.toLowerCase().startsWith('legal')) return <GavelIcon fontSize="small" />
    if (name.toLowerCase().startsWith('finanzas')) return <SavingsIcon fontSize="small" />
    if (name.toLowerCase().startsWith('marketing')) return <CampaignIcon fontSize="small" />
    if (name.toLowerCase().startsWith('manufactura')) return <PrecisionManufacturingIcon fontSize="small" />
    if (name.toLowerCase().startsWith('logística')) return <LocalShippingIcon fontSize="small" />
    if (name.toLowerCase().startsWith('e‑commerce')) return <ShoppingCartIcon fontSize="small" />
    if (name.toLowerCase().startsWith('rrhh')) return <WorkIcon fontSize="small" />
    if (name.toLowerCase().startsWith('energía')) return <BoltIcon fontSize="small" />
    return undefined
  }

  const parseExample = (s: string) => {
    // Intenta parsear formato "Input: ...; Output: ..." de forma simple
    const inputMatch = s.match(/Input:\s*(.*?)(;|$)/i)
    const outputMatch = s.match(/Output:\s*(.*)$/i)
    const input = inputMatch ? inputMatch[1].trim() : ''
    const output = outputMatch ? outputMatch[1].trim() : ''
    if (input || output) return { input, output }
    return { input: '', output: '', note: s }
  }

  const applyPreset = (p: Preset) => {
    if (p.customer.valueProp !== undefined) setValueProp(p.customer.valueProp)
    if (p.customer.description !== undefined) setCustomerDesc(p.customer.description)
    if (p.customer.industries) setIndustries(p.customer.industries)
    if (p.customer.useCases) setUseCases(p.customer.useCases)
    if (p.customer.expectedOutcomes !== undefined) setExpectedOutcomes(p.customer.expectedOutcomes)
    if (p.customer.inputs !== undefined) setInputsDesc(p.customer.inputs)
    if (p.customer.outputs !== undefined) setOutputsDesc(p.customer.outputs)
    if (p.customer.examples !== undefined) setIoExamplesList([parseExample(p.customer.examples)])
    if (p.customer.limitations !== undefined) setLimitations(p.customer.limitations)
    if (p.customer.privacy !== undefined) setPrivacy(p.customer.privacy)
    if (p.customer.deploy) setDeployOptions(p.customer.deploy)
    if (p.customer.support !== undefined) setSupport(p.customer.support)

    if (p.technical?.tasks) setTasks(p.technical.tasks)
    if (p.technical?.modalities) setModalities(p.technical.modalities)
    if (p.technical?.frameworks) setFrameworks(p.technical.frameworks)
    if (p.technical?.architectures) setArchitectures(p.technical.architectures)
    if (p.technical?.precisions) setPrecisions(p.technical.precisions)
    if (p.technical?.quantization) setQuantization(p.technical.quantization)
    if (p.technical?.modelFiles) setModelFiles(p.technical.modelFiles)
    if (p.technical?.vramGB) setVramGB(p.technical.vramGB)
    if (p.technical?.cpuCores) setCpuCores(p.technical.cpuCores)
    if (p.technical?.ramGB) setRamGB(p.technical.ramGB)
    setMsg('Preset aplicado')
    setActivePreset(p.name)
    setDirty(true)
  }

  // Auto-scroll al preset activo en carrusel
  useEffect(()=>{
    if (!activePreset) return
    const el = document.getElementById(`preset-${slugify(activePreset)}`)
    el?.scrollIntoView({ inline:'center', behavior:'smooth', block:'nearest' })
  }, [activePreset])

  // Marcar dirty en cambios de campos cliente clave
  useEffect(()=>{ setDirty(true) }, [valueProp, customerDesc, industries, useCases, expectedOutcomes, inputsDesc, outputsDesc, ioExamplesList, limitations, privacy, deployOptions, support])

  // Confirmación al salir si hay cambios sin guardar
  useEffect(()=>{
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!dirty || navigatingRef.current) return
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [dirty])

  // Validaciones suaves
  const isClientSheetValid = () => {
    return Boolean(
      valueProp.trim() &&
      customerDesc.trim() &&
      (industries.length>0 || useCases.length>0) &&
      inputsDesc.trim() &&
      outputsDesc.trim() &&
      limitations.trim()
    )
  }
  const onNext = (e: React.MouseEvent<HTMLAnchorElement | HTMLButtonElement>) => {
    // Validación suave: si falta, no navegamos y avisamos
    if (!isClientSheetValid()) {
      e.preventDefault()
      setMsg('Completa la ficha para clientes (título, descripción y al menos una industria o caso de uso)')
      const top = document.getElementById('client-sheet-top')
      top?.scrollIntoView({ behavior:'smooth', block:'start' })
      return
    }
    // Autoguardar y navegar
    e.preventDefault()
    navigatingRef.current = true
    onSave().finally(()=>{ window.location.href = '/publish/wizard/step3' })
  }

  const onSave = async () => {
    setSaving(true)
    setMsg('')
    const payload = {
      address: walletAddress,
      step: 'step2',
      data: {
        capabilities: { tasks, modalities },
        architecture: {
          frameworks,
          architectures,
          precisions,
          quantization,
          modelSizeParams: Number(modelSizeParams || 0),
          modelFiles,
        },
        runtime: {
          python, cuda, torch, cudnn,
          os: oses,
          accelerators,
          computeCapability,
        },
        dependencies: {
          pip: pipDeps.split(/[,\n]/g).map(s=>s.trim()).filter(Boolean)
        },
        resources: { vramGB: Number(vramGB||0), cpuCores: Number(cpuCores||0), ramGB: Number(ramGB||0) },
        inference: {
          maxBatchSize: Number(maxBatch||0),
          contextLength: Number(contextLen||0),
          maxTokens: Number(maxTokens||0),
          imageResolution: imgResolution,
          sampleRate: Number(sampleRate||0),
          triton: useTriton,
        },
        customer: {
          valueProp,
          description: customerDesc,
          industries,
          useCases,
          expectedOutcomes,
          inputs: inputsDesc,
          outputs: outputsDesc,
          examples: ioExamplesList,
          limitations,
          privacy,
          deploy: deployOptions,
          support
        }
      }
    }
    try {
      await saveDraft(payload)
      setMsg('Guardado')
      setDirty(false)
    } catch (e) {
      setMsg('Error al guardar')
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

  return (
    <Box sx={{ p: { xs:2, md:4 }, maxWidth: 1000, mx: 'auto' }}>
      <Stack spacing={2} sx={{ mb: 2 }}>
        <Typography variant="h4" fontWeight={700}>Paso 2 — Ficha del modelo para clientes</Typography>
        <Typography color="text.secondary">Describe el valor del modelo en lenguaje simple, casos de uso, entradas/salidas y resultados esperados. La configuración técnica queda disponible más abajo, de forma opcional.</Typography>
      </Stack>

      <Paper variant="outlined" sx={{ p: { xs:2, md:3 }, mb: 3, borderRadius:2 }}>
        <Stack id="client-sheet-top" direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
          <Typography variant="h6" fontWeight={600}>Ficha para clientes</Typography>
          <Tooltip title="Información pensada para compradores no técnicos"><InfoOutlinedIcon fontSize="small" color="action"/></Tooltip>
        </Stack>
        <Box sx={{ mb: 1, position: 'relative' }}>
          <Box sx={{ position:'absolute', inset: 0, pointerEvents:'none' }} />
          <IconButton aria-label="prev" onClick={()=>scrollPresets('prev')} sx={{ position:'absolute', left: -8, top: '50%', transform:'translateY(-50%)', zIndex:1, bgcolor:'background.paper', boxShadow:1 }}>
            <ArrowBackIosNewIcon fontSize="small" />
          </IconButton>
          <IconButton aria-label="next" onClick={()=>scrollPresets('next')} sx={{ position:'absolute', right: -8, top: '50%', transform:'translateY(-50%)', zIndex:1, bgcolor:'background.paper', boxShadow:1 }}>
            <ArrowForwardIosIcon fontSize="small" />
          </IconButton>
          <Box
            ref={presetsRef}
            sx={{
              overflowX: 'auto',
              display: 'flex',
              gap: 1,
              scrollSnapType: 'x mandatory',
              px: 1,
              '&::-webkit-scrollbar': { display: 'none' }
            }}
          >
            {PRESETS.map(p => {
              const active = activePreset === p.name
              return (
                <Box key={p.name} id={`preset-${slugify(p.name)}`} sx={{ scrollSnapAlign: 'start', minWidth: { xs: 240, sm: 280 }, maxWidth: 320, flex: '0 0 auto' }}>
                  <Card variant="outlined" sx={{ height: '100%', borderRadius: 2, borderColor: active ? 'primary.main' : 'divider', bgcolor: active ? 'action.selected' : 'background.paper' }}>
                    <Tooltip
                      arrow
                      placement="top"
                      enterDelay={400}
                      title={
                        <Box sx={{ maxWidth: 360 }}>
                          <Typography variant="subtitle2">{p.customer?.valueProp || p.name}</Typography>
                          {p.customer?.description && (
                            <Typography variant="caption" color="text.secondary">{p.customer.description}</Typography>
                          )}
                          {(p.customer?.industries || p.customer?.useCases) && (
                            <Stack direction="row" spacing={0.5} sx={{ mt: 0.5 }} flexWrap="wrap">
                              {(p.customer?.industries || []).slice(0,2).map((x: string) => (
                                <Chip key={`ind-${x}`} size="small" label={x} />
                              ))}
                              {(p.customer?.useCases || []).slice(0,2).map((x: string) => (
                                <Chip key={`use-${x}`} size="small" color="primary" label={x} />
                              ))}
                            </Stack>
                          )}
                        </Box>
                      }
                    >
                      <CardActionArea onClick={()=>applyPreset(p)} sx={{ p: 1.25 }}>
                        <Stack direction="row" spacing={1.25} alignItems="center">
                          <Box sx={{ color: 'text.secondary', display:'flex', alignItems:'center' }}>
                            {getPresetIcon(p.name)}
                          </Box>
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography
                              variant="body2"
                              sx={{
                                display: '-webkit-box',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden',
                                whiteSpace: 'normal'
                              }}
                            >
                              {p.name}
                            </Typography>
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
            <Button size="small" color="warning" onClick={clearPreset}>Limpiar ficha</Button>
          </Box>
        </Box>
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}><TextField label="Propuesta de valor (pitch)" value={valueProp} onChange={e=>setValueProp(e.target.value)} placeholder="¿Qué resuelve y por qué es mejor?" fullWidth /></Grid>
          <Grid item xs={12} md={6}><TextField label="Descripción para clientes" value={customerDesc} onChange={e=>setCustomerDesc(e.target.value)} placeholder="Explica en lenguaje simple cómo ayuda" fullWidth /></Grid>
          <Grid item xs={12} md={6}>
            <Autocomplete multiple options={INDUSTRIES} value={industries} onChange={(_,v)=>setIndustries(v)} renderTags={(value,getTagProps)=>value.map((o,i)=>(<Chip label={o} {...getTagProps({index:i})} key={o}/>))} renderInput={(p)=>(<TextField {...p} label="Industrias" placeholder="Selecciona"/>)} />
          </Grid>
          <Grid item xs={12} md={6}>
            <Autocomplete multiple options={USECASES} value={useCases} onChange={(_,v)=>setUseCases(v)} renderTags={(value,getTagProps)=>value.map((o,i)=>(<Chip label={o} {...getTagProps({index:i})} key={o}/>))} renderInput={(p)=>(<TextField {...p} label="Casos de uso" placeholder="Selecciona"/>)} />
          </Grid>
          <Grid item xs={12}><TextField label="Resultados esperados / KPIs" value={expectedOutcomes} onChange={e=>setExpectedOutcomes(e.target.value)} placeholder="Ej. +10% retención, -15% tiempo de respuesta" fullWidth /></Grid>
          <Grid item xs={12} md={6}><TextField label="Entradas (datos necesarios)" value={inputsDesc} onChange={e=>setInputsDesc(e.target.value)} placeholder="CSV ventas, PDFs facturas, imágenes, etc." fullWidth /></Grid>
          <Grid item xs={12} md={6}><TextField label="Salidas (qué entrega el modelo)" value={outputsDesc} onChange={e=>setOutputsDesc(e.target.value)} placeholder="Recomendaciones, predicciones, resúmenes" fullWidth /></Grid>
          <Grid item xs={12}>
            <Stack spacing={2}>
              {ioExamplesList.map((ex, idx) => (
                <Grid container spacing={{ xs: 0.5, md: 1 }} key={idx} alignItems="flex-start">
                  <Grid item xs={12} md={4}>
                    <TextField label="Entrada (input)" value={ex.input} onChange={e=>{ const next=[...ioExamplesList]; next[idx]={...next[idx], input:e.target.value}; setIoExamplesList(next) }} fullWidth />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <TextField label="Salida (output)" value={ex.output} onChange={e=>{ const next=[...ioExamplesList]; next[idx]={...next[idx], output:e.target.value}; setIoExamplesList(next) }} fullWidth />
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <TextField label="Nota (opcional)" value={ex.note || ''} onChange={e=>{ const next=[...ioExamplesList]; next[idx]={...next[idx], note:e.target.value}; setIoExamplesList(next) }} fullWidth />
                  </Grid>
                  <Grid item xs="auto" md={1} sx={{ display:'flex', alignItems:'center', justifyContent:{ xs:'flex-end', md:'center' }, px:{ xs:0, md:1 }, py:{ xs:0, md:0 } }}>
                    {ioExamplesList.length > 1 && (
                      <Tooltip title="Eliminar">
                        <IconButton
                          size="small"
                          aria-label="Eliminar ejemplo"
                          onClick={()=>{ const next=[...ioExamplesList]; next.splice(idx,1); setIoExamplesList(next.length? next : [{ input:'', output:'', note:'' }]) }}
                          sx={{ color: 'text.disabled', p:{ xs:0.5, md:1 }, '&:hover': { color: 'error.main', bgcolor: 'transparent' } }}
                        >
                          <CloseRoundedIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                  </Grid>
                </Grid>
              ))}
              <Button variant="outlined" onClick={()=> setIoExamplesList([...ioExamplesList, { input:'', output:'', note:'' }])}>Añadir ejemplo</Button>
            </Stack>
          </Grid>
          <Grid item xs={12}><TextField multiline rows={2} label="Limitaciones / Consideraciones éticas" value={limitations} onChange={e=>setLimitations(e.target.value)} placeholder="Dónde no usar, sesgos conocidos" fullWidth /></Grid>
          <Grid item xs={12} md={6}><TextField label="Privacidad y manejo de datos" value={privacy} onChange={e=>setPrivacy(e.target.value)} placeholder="PII, encriptación, retención" fullWidth /></Grid>
          <Grid item xs={12} md={6}>
            <Autocomplete multiple options={DEPLOY} value={deployOptions} onChange={(_,v)=>setDeployOptions(v)} renderTags={(value,getTagProps)=>value.map((o,i)=>(<Chip label={o} {...getTagProps({index:i})} key={o}/>))} renderInput={(p)=>(<TextField {...p} label="Despliegue disponible" placeholder="Selecciona"/>)} />
          </Grid>
          <Grid item xs={12}><TextField label="Soporte y contacto" value={support} onChange={e=>setSupport(e.target.value)} placeholder="SLA, correo, horario" fullWidth /></Grid>
        </Grid>
      </Paper>

      <Paper variant="outlined" sx={{ p: { xs:2, md:3 }, mb: 3, borderRadius:2 }}>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
          <Typography variant="h6" fontWeight={600}>Previsualización</Typography>
          <Tooltip title="Vista previa de la ficha pública del modelo"><InfoOutlinedIcon fontSize="small" color="action"/></Tooltip>
        </Stack>
        <Stack spacing={1}>
          <Typography variant="h5" fontWeight={600}>{valueProp || 'Título de valor del modelo'}</Typography>
          <Typography color="text.secondary">{customerDesc || 'Descripción breve orientada a clientes.'}</Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap">
            {industries.map(x=> <Chip key={x} label={x} size="small" />)}
            {useCases.map(x=> <Chip key={x} label={x} color="primary" size="small" />)}
          </Stack>
          <Divider sx={{ my:1 }} />
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2">Entradas</Typography>
              <Typography>{inputsDesc || '—'}</Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2">Salidas</Typography>
              <Typography>{outputsDesc || '—'}</Typography>
            </Grid>
            <Grid item xs={12}>
              <Typography variant="subtitle2">Ejemplos</Typography>
              {ioExamplesList && ioExamplesList.some(e=>e.input || e.output || e.note) ? (
                <Stack spacing={1}>
                  {ioExamplesList.map((ex, idx) => (
                    <Paper key={idx} variant="outlined" sx={{ p: 1.5 }}>
                      <Typography variant="body2"><strong>Entrada:</strong> {ex.input || '—'}</Typography>
                      <Typography variant="body2"><strong>Salida:</strong> {ex.output || '—'}</Typography>
                      {ex.note ? <Typography variant="caption" color="text.secondary">{ex.note}</Typography> : null}
                    </Paper>
                  ))}
                </Stack>
              ) : (
                <Typography sx={{ whiteSpace:'pre-wrap' }}>—</Typography>
              )}
            </Grid>
          </Grid>
          <Divider sx={{ my:1 }} />
          <Stack direction="row" spacing={1} flexWrap="wrap">
            {tasks.map(x=> <Chip key={x} label={x} variant="outlined" size="small" />)}
            {modalities.map(x=> <Chip key={x} label={x} variant="outlined" size="small" />)}
          </Stack>
          <Typography variant="body2" color="text.secondary">Infra sugerida: CPU {cpuCores || '—'} cores / RAM {ramGB || '—'} GB / VRAM {vramGB || '—'} GB</Typography>
          <Typography variant="body2" color="text.secondary">Despliegue: {(deployOptions&&deployOptions.length)? deployOptions.join(', ') : '—'}</Typography>
          {support && <Typography variant="body2" color="text.secondary">Soporte: {support}</Typography>}
        </Stack>
      </Paper>

      <Accordion sx={{ mb: 3 }} defaultExpanded={false}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography variant="h6" fontWeight={600}>Configuración técnica (opcional)</Typography>
            <Tooltip title="Completa solo si quieres ofrecer detalles técnicos"><InfoOutlinedIcon fontSize="small" color="action"/></Tooltip>
          </Stack>
        </AccordionSummary>
        <AccordionDetails>
          <Stack spacing={3}>
            <Paper variant="outlined" sx={{ p: { xs:2, md:3 }, borderRadius:2 }}>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                <Typography variant="subtitle1" fontWeight={600}>Capacidades</Typography>
                <Tooltip title="Tareas y modalidades que cubre el modelo"><InfoOutlinedIcon fontSize="small" color="action"/></Tooltip>
              </Stack>
              <Stack spacing={2}>
                <Autocomplete multiple options={TASKS} value={tasks} onChange={(_,v)=>setTasks(v)} renderTags={(value,getTagProps)=>value.map((o,i)=>(<Chip label={o} {...getTagProps({index:i})} key={o}/>))} renderInput={(p)=>(<TextField {...p} label="Tareas" placeholder="Selecciona"/>)} />
                <Autocomplete multiple options={MODALITIES} value={modalities} onChange={(_,v)=>setModalities(v)} renderTags={(value,getTagProps)=>value.map((o,i)=>(<Chip label={o} {...getTagProps({index:i})} key={o}/>))} renderInput={(p)=>(<TextField {...p} label="Modalidades" placeholder="Selecciona"/>)} />
              </Stack>
            </Paper>

            <Paper variant="outlined" sx={{ p: { xs:2, md:3 }, borderRadius:2 }}>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                <Typography variant="subtitle1" fontWeight={600}>Arquitectura</Typography>
                <Tooltip title="Detalles del modelo y formatos soportados"><InfoOutlinedIcon fontSize="small" color="action"/></Tooltip>
              </Stack>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Autocomplete multiple options={FRAMEWORKS} value={frameworks} onChange={(_,v)=>setFrameworks(v)} renderTags={(value,getTagProps)=>value.map((o,i)=>(<Chip label={o} {...getTagProps({index:i})} key={o}/>))} renderInput={(p)=>(<TextField {...p} label="Frameworks" placeholder="Selecciona"/>)} />
                </Grid>
                <Grid item xs={12} md={6}>
                  <Autocomplete multiple options={ARCHS} value={architectures} onChange={(_,v)=>setArchitectures(v)} renderTags={(value,getTagProps)=>value.map((o,i)=>(<Chip label={o} {...getTagProps({index:i})} key={o}/>))} renderInput={(p)=>(<TextField {...p} label="Arquitecturas" placeholder="Selecciona"/>)} />
                </Grid>
                <Grid item xs={12} md={6}>
                  <Autocomplete multiple options={PRECISIONS} value={precisions} onChange={(_,v)=>setPrecisions(v)} renderTags={(value,getTagProps)=>value.map((o,i)=>(<Chip label={o} {...getTagProps({index:i})} key={o}/>))} renderInput={(p)=>(<TextField {...p} label="Precisión" placeholder="fp16, int8, etc."/>)} />
                </Grid>
                <Grid item xs={12} md={6}>
                  <Autocomplete options={QUANT} value={quantization} onChange={(_,v)=>setQuantization(v||'none')} renderInput={(p)=>(<TextField {...p} label="Cuantización" placeholder="Selecciona"/>)} />
                </Grid>
                <Grid item xs={12} md={6}><TextField label="Parámetros (M)" value={modelSizeParams} onChange={e=>setModelSizeParams(e.target.value)} placeholder="Ej. 7, 13, 70" fullWidth /></Grid>
                <Grid item xs={12} md={6}>
                  <Autocomplete multiple options={FILES} value={modelFiles} onChange={(_,v)=>setModelFiles(v)} renderTags={(value,getTagProps)=>value.map((o,i)=>(<Chip label={o} {...getTagProps({index:i})} key={o}/>))} renderInput={(p)=>(<TextField {...p} label="Formatos de archivos" placeholder="safetensors, gguf, onnx"/>)} />
                </Grid>
              </Grid>
            </Paper>

            <Paper variant="outlined" sx={{ p: { xs:2, md:3 }, borderRadius:2 }}>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                <Typography variant="subtitle1" fontWeight={600}>Runtime</Typography>
                <Tooltip title="Versiones y aceleradores requeridos"><InfoOutlinedIcon fontSize="small" color="action"/></Tooltip>
              </Stack>
              <Grid container spacing={2}>
                <Grid item xs={12} md={3}><TextField label="Python" value={python} onChange={e=>setPython(e.target.value)} fullWidth /></Grid>
                <Grid item xs={12} md={3}><TextField label="CUDA" value={cuda} onChange={e=>setCuda(e.target.value)} placeholder="12.2" fullWidth /></Grid>
                <Grid item xs={12} md={3}><TextField label="PyTorch" value={torch} onChange={e=>setTorch(e.target.value)} placeholder="2.2" fullWidth /></Grid>
                <Grid item xs={12} md={3}><TextField label="cuDNN" value={cudnn} onChange={e=>setCudnn(e.target.value)} fullWidth /></Grid>
                <Grid item xs={12} md={6}>
                  <Autocomplete multiple options={OS} value={oses} onChange={(_,v)=>setOses(v)} renderTags={(value,getTagProps)=>value.map((o,i)=>(<Chip label={o} {...getTagProps({index:i})} key={o}/>))} renderInput={(p)=>(<TextField {...p} label="Sistemas" placeholder="linux, windows, macos"/>)} />
                </Grid>
                <Grid item xs={12} md={6}>
                  <Autocomplete multiple options={ACCELS} value={accelerators} onChange={(_,v)=>setAccelerators(v)} renderTags={(value,getTagProps)=>value.map((o,i)=>(<Chip label={o} {...getTagProps({index:i})} key={o}/>))} renderInput={(p)=>(<TextField {...p} label="Aceleradores" placeholder="nvidia-cuda, amd-rocm, apple-metal"/>)} />
                </Grid>
                <Grid item xs={12} md={6}><TextField label="Compute Capability / Nota GPU" value={computeCapability} onChange={e=>setComputeCapability(e.target.value)} placeholder="Ej. SM 8.0, ROCm 5.x, M-series" fullWidth /></Grid>
              </Grid>
            </Paper>

            <Paper variant="outlined" sx={{ p: { xs:2, md:3 }, borderRadius:2 }}>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                <Typography variant="subtitle1" fontWeight={600}>Dependencias</Typography>
                <Tooltip title="Paquetes Python requeridos (separados por coma o nueva línea)"><InfoOutlinedIcon fontSize="small" color="action"/></Tooltip>
              </Stack>
              <TextField multiline rows={3} value={pipDeps} onChange={e=>setPipDeps(e.target.value)} placeholder="torch==2.2.2, transformers>=4.42, onnxruntime-gpu" fullWidth />
              <FormHelperText>Incluye versiones mínimas recomendadas.</FormHelperText>
            </Paper>

            <Paper variant="outlined" sx={{ p: { xs:2, md:3 }, borderRadius:2 }}>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                <Typography variant="subtitle1" fontWeight={600}>Recursos mínimos</Typography>
                <Tooltip title="Requisitos base para una inferencia estable"><InfoOutlinedIcon fontSize="small" color="action"/></Tooltip>
              </Stack>
              <Grid container spacing={2}>
                <Grid item xs={12} md={4}><TextField type="number" label="VRAM (GB)" value={vramGB} onChange={e=>setVramGB(e.target.value)} fullWidth /></Grid>
                <Grid item xs={12} md={4}><TextField type="number" label="CPU Cores" value={cpuCores} onChange={e=>setCpuCores(e.target.value)} fullWidth /></Grid>
                <Grid item xs={12} md={4}><TextField type="number" label="RAM (GB)" value={ramGB} onChange={e=>setRamGB(e.target.value)} fullWidth /></Grid>
              </Grid>
            </Paper>

            <Paper variant="outlined" sx={{ p: { xs:2, md:3 }, borderRadius:2 }}>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                <Typography variant="subtitle1" fontWeight={600}>Opciones de inferencia</Typography>
                <Tooltip title="Límites y parámetros de ejecución"><InfoOutlinedIcon fontSize="small" color="action"/></Tooltip>
              </Stack>
              <Grid container spacing={2}>
                <Grid item xs={12} md={3}><TextField type="number" label="Max batch size" value={maxBatch} onChange={e=>setMaxBatch(e.target.value)} fullWidth /></Grid>
                <Grid item xs={12} md={3}><TextField type="number" label="Context length" value={contextLen} onChange={e=>setContextLen(e.target.value)} fullWidth /></Grid>
                <Grid item xs={12} md={3}><TextField type="number" label="Max tokens" value={maxTokens} onChange={e=>setMaxTokens(e.target.value)} fullWidth /></Grid>
                <Grid item xs={12} md={3}><TextField label="Imagen (px)" value={imgResolution} onChange={e=>setImgResolution(e.target.value)} placeholder="1024x1024" fullWidth /></Grid>
                <Grid item xs={12} md={3}><TextField type="number" label="Sample rate (Hz)" value={sampleRate} onChange={e=>setSampleRate(e.target.value)} fullWidth /></Grid>
                <Grid item xs={12} md={3}><FormControlLabel control={<Switch checked={useTriton} onChange={e=>setUseTriton(e.target.checked)} />} label="Triton" /></Grid>
              </Grid>
            </Paper>
          </Stack>
        </AccordionDetails>
      </Accordion>

      <Divider sx={{ my: 2 }} />

      <Box sx={{ height: { xs: 76, md: 72 } }} />

      <Box sx={{ position:'fixed', bottom: 0, left: 0, right: 0, zIndex: (t)=>t.zIndex.appBar + 1 }}>
        <Paper elevation={3} sx={{ borderRadius: 0, px: { xs:1.5, md:2 }, py: 1, backdropFilter:'saturate(180%) blur(8px)', bgcolor: (t)=> t.palette.mode==='dark' ? 'rgba(18,18,18,0.7)' : 'rgba(255,255,255,0.7)', borderTop: (t)=>`1px solid ${t.palette.divider}`, pb: 'max(env(safe-area-inset-bottom), 8px)' }}>
          <Box sx={{ maxWidth: 1000, mx: 'auto', width:'100%' }}>
            {/* Móvil: tres posiciones con Guardar centrado */}
            <Box sx={{ display:{ xs:'flex', md:'none' }, alignItems:'center', justifyContent:'space-between', width:'100%' }}>
              <Button size="small" href={`${base}/step1`} onClick={onBack as any} variant="text" color="inherit" startIcon={<ArrowBackIcon />} sx={{ borderRadius: 2, textTransform:'none', py: 0.75, whiteSpace:'nowrap', fontSize:{ xs:12, md:14 }, '& .MuiButton-startIcon': { mr: 0.5, '& svg': { fontSize: 18 } } }}>
                Atrás
              </Button>
              <Button size="small" onClick={onSave} disabled={saving} variant="text" color="primary" startIcon={<SaveOutlinedIcon />} sx={{ borderRadius: 2, textTransform:'none', py: 0.75, whiteSpace:'nowrap', fontSize:{ xs:12, md:14 }, '& .MuiButton-startIcon': { mr: 0.5, '& svg': { fontSize: 18 } } }}>
                {saving? 'Guardando...' : 'Guardar borrador'}
              </Button>
              <Button size="small" href={`${base}/step3`} onClick={(e)=>navigateAfterSave(e, `${base}/step3`)} disabled={!isClientSheetValid()} variant="text" color="inherit" endIcon={<ArrowForwardIcon />} sx={{ borderRadius: 2, textTransform:'none', py: 0.75, whiteSpace:'nowrap', fontSize:{ xs:12, md:14 }, '& .MuiButton-endIcon': { ml: 0.5, '& svg': { fontSize: 18 } } }}>
                Siguiente
              </Button>
            </Box>

            {/* Desktop: Atrás izquierda; Guardar + Siguiente a la derecha */}
            <Box sx={{ display:{ xs:'none', md:'flex' }, alignItems:'center', justifyContent:'space-between', gap: 1.25 }}>
              <Button href={`${base}/step1`} onClick={onBack as any} variant="text" color="inherit" startIcon={<ArrowBackIcon />} sx={{ borderRadius: 2, textTransform:'none', py: 1 }}>
                Atrás
              </Button>
              <Box sx={{ display:'flex', gap: 1.25 }}>
                <Button onClick={onSave} disabled={saving} variant="text" color="primary" startIcon={<SaveOutlinedIcon />} sx={{ borderRadius: 2, textTransform:'none', py: 1 }}>
                  {saving? 'Guardando...' : 'Guardar borrador'}
                </Button>
                <Button href={`${base}/step3`} onClick={(e)=>navigateAfterSave(e, `${base}/step3`)} disabled={!isClientSheetValid()} variant="text" color="inherit" endIcon={<ArrowForwardIcon />} sx={{ borderRadius: 2, textTransform:'none', py: 1 }}>
                  Siguiente
                </Button>
              </Box>
            </Box>
          </Box>
        </Paper>
      </Box>

      {msg && <Typography sx={{ mt:1 }} color={msg==='Guardado' ? 'success.main' : 'warning.main'}>{msg}</Typography>}
    </Box>
  )
}
