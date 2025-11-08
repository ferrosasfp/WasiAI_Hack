export type MockModel = {
  slug: string
  name: string
  summary: string
  cover?: string
  categories: string[]
  tags: string[]
  author: string
  valueProposition?: string
  industries?: string[]
  useCases?: string[]
  expectedBusinessImpact?: string
  inputs?: string
  outputs?: string
  knownLimitations?: string
  prohibitedUses?: string
  tasks?: string[]
  frameworks?: string[]
  architectures?: string[]
  precision?: string[]
  fileFormats?: string[]
  minResources?: string
  runtimeSystems?: string[]
  pricePerpetual?: string
  priceSubscription?: string
  creatorRoyaltyBps?: number
  rights?: { api?: boolean; download?: boolean; transferable?: boolean }
  deliveryMode?: string
  artifacts?: boolean
  demoPreset?: boolean
}

export const mockModels: MockModel[] = [
  {
    slug: 'educhat-llm',
    name: 'EduChat LLM',
    summary: 'Asistente conversacional especializado en educación.',
    cover: '/illustrations/cards/educhat.png',
    categories: ['Chat','Education'],
    tags: ['pytorch','llama','fp16'],
    author: 'Ana',
    valueProposition: 'Reduce en 30% el tiempo de respuesta en soporte académico.',
    industries: ['Education'],
    useCases: ['Helpdesk','Tutoring'],
    expectedBusinessImpact: '-30% tiempo de respuesta',
    inputs: 'Texto, PDFs',
    outputs: 'Respuestas estructuradas',
    knownLimitations: 'Puede fallar en cálculos numéricos complejos',
    prohibitedUses: 'No usar para asesoría médica o legal',
    tasks: ['chat','instruction-following'],
    frameworks: ['PyTorch 2.3'],
    architectures: ['Llama 3'],
    precision: ['fp16'],
    fileFormats: ['safetensors'],
    minResources: 'VRAM 12 GB · 4 CPU · 16 GB RAM',
    runtimeSystems: ['Linux','NVIDIA CUDA'],
    pricePerpetual: '49 AVAX',
    priceSubscription: '9 AVAX / mes',
    rights: { api: true, download: true },
    deliveryMode: 'API + Download',
    artifacts: true,
    demoPreset: true,
  },
  {
    slug: 'image-cleaner',
    name: 'ImageCleaner',
    summary: 'Limpieza y validación de datasets de imágenes.',
    cover: '/illustrations/cards/imagecleaner.png',
    categories: ['Vision','Data'],
    tags: ['onnx','int8'],
    author: 'Luis',
    valueProposition: 'Acelera el pipeline de datos.',
    industries: ['Data'],
    useCases: ['Dataset QA'],
    expectedBusinessImpact: '+20% calidad dataset',
    inputs: 'Carpetas de imágenes',
    outputs: 'Dataset filtrado',
    knownLimitations: 'No detecta sesgos de alto nivel',
    tasks: ['classification','cleaning'],
    frameworks: ['ONNX Runtime'],
    architectures: ['ResNet'],
    precision: ['int8'],
    fileFormats: ['onnx'],
    minResources: 'VRAM 4 GB · 2 CPU · 8 GB RAM',
    runtimeSystems: ['Linux','Windows'],
    priceSubscription: '3 AVAX / mes',
    rights: { download: true },
    deliveryMode: 'Download',
    artifacts: true,
  },
  {
    slug: 'audio2text-pro',
    name: 'Audio2Text Pro',
    summary: 'Transcripción multi-idioma de alta precisión.',
    categories: ['Audio','NLP'],
    tags: ['whisper','fp16'],
    author: 'Caro',
    valueProposition: 'Reduce costos de transcripción masiva.',
    tasks: ['asr'],
    frameworks: ['PyTorch'],
    architectures: ['Whisper'],
    precision: ['fp16'],
    fileFormats: ['gguf'],
    minResources: 'VRAM 8 GB · 4 CPU',
    runtimeSystems: ['Linux','CUDA'],
    priceSubscription: '5 AVAX / mes',
    rights: { api: true },
    deliveryMode: 'API',
    artifacts: false,
    demoPreset: true,
  },
  {
    slug: 'fraud-guard',
    name: 'FraudGuard',
    summary: 'Detección de fraude en tiempo real para fintech.',
    categories: ['Finance','Tabular'],
    tags: ['xgboost'],
    author: 'Rafael',
    tasks: ['classification'],
    frameworks: ['XGBoost'],
    architectures: ['GBDT'],
    precision: ['fp32'],
    minResources: '2 CPU · 4 GB RAM',
    runtimeSystems: ['Linux'],
    pricePerpetual: '199 AVAX',
    rights: { api: true },
    deliveryMode: 'API',
    artifacts: false,
  },
  {
    slug: 'style-transfer-fx',
    name: 'StyleTransferFX',
    summary: 'Transferencia de estilo para imágenes en tiempo real.',
    categories: ['Vision','Creative'],
    tags: ['tensorflow','fp16'],
    author: 'Vale',
    tasks: ['style-transfer'],
    frameworks: ['TensorFlow'],
    architectures: ['Custom'],
    precision: ['fp16'],
    fileFormats: ['tf'],
    minResources: 'VRAM 6 GB',
    priceSubscription: '1 AVAX / mes',
    rights: { download: true },
    deliveryMode: 'Download',
    artifacts: true,
  },
  {
    slug: 'docqa-small',
    name: 'DocQA Small',
    summary: 'Preguntas y respuestas sobre documentos PDF.',
    categories: ['NLP','Search'],
    tags: ['retrieval','gguf'],
    author: 'Iman',
    valueProposition: 'Mejora tiempos de búsqueda en knowledge bases.',
    tasks: ['qa','retrieval'],
    frameworks: ['PyTorch'],
    architectures: ['Mistral'],
    precision: ['int4','fp16'],
    fileFormats: ['gguf','safetensors'],
    minResources: 'VRAM 12 GB',
    runtimeSystems: ['Linux','CUDA'],
    pricePerpetual: '39 AVAX',
    rights: { api: true, download: true, transferable: true },
    deliveryMode: 'API + Download',
    artifacts: true,
    demoPreset: true,
  }
]
