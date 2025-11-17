export const INDUSTRIES_ES = [
  'retail',
  'finanzas',
  'salud',
  'educación',
  'legal',
  'manufactura',
  'logística',
  'marketing',
  'soporte',
  'energía',
  'rrhh',
  'e‑commerce',
] as const

export const INDUSTRIES_EN = [
  'retail',
  'finance',
  'healthcare',
  'education',
  'legal',
  'manufacturing',
  'logistics',
  'marketing',
  'support',
  'energy',
  'hr',
  'e‑commerce',
] as const

export const USE_CASES_ES = [
  'recomendación',
  'predicción',
  'predicción churn',
  'forecast demanda',
  'asistente estudio',
  'Q&A documentos',
  'clasificación',
  'detección fraude',
  'resumen',
  'generación texto',
  'ideas campaña',
  'optimización',
  'ruteo',
  'sentiment',
  'tópicos',
  'ranking',
  'anomalías',
  'forecast',
] as const

export const USE_CASES_EN = [
  'recommendation',
  'prediction',
  'churn prediction',
  'demand forecast',
  'study assistant',
  'documents Q&A',
  'classification',
  'fraud detection',
  'summarization',
  'text generation',
  'campaign ideas',
  'optimization',
  'routing',
  'sentiment',
  'topics',
  'ranking',
  'anomalies',
  'forecast',
] as const

export const SUPPORTED_LANGS = [
  'en', 'es', 'pt', 'fr', 'de', 'it', 'zh', 'ja', 'ko'
] as const

export type IndustryEs = typeof INDUSTRIES_ES[number]
export type IndustryEn = typeof INDUSTRIES_EN[number]
export type UseCaseEs = typeof USE_CASES_ES[number]
export type UseCaseEn = typeof USE_CASES_EN[number]
export type LangCode = typeof SUPPORTED_LANGS[number]

// Delivery options (How this model is delivered)
export const DEPLOY_ES = ['API SaaS','Docker on‑prem','Cloud (Base/AWS/GCP)','Edge'] as const
export const DEPLOY_EN = ['SaaS API','Docker on‑prem','Cloud (Base/AWS/GCP)','Edge'] as const

// Tasks and Modalities used in Capabilities
export const TASKS = [
  'text-generation','instruction-following','chat','embedding','classification','detection','segmentation','tts','asr','translation',
  'retrieval','summarization','recommendation','planning','forecasting','ranking'
] as const

export const MODALITIES = ['text','image','audio','video','multimodal','tabular'] as const

export type TaskValue = typeof TASKS[number]
export type ModalityValue = typeof MODALITIES[number]
export type DeployValue = typeof DEPLOY_ES[number] | typeof DEPLOY_EN[number]

// Frameworks, file formats, systems and accelerators used in Step 2
export const FRAMEWORKS = ['PyTorch 2.2','PyTorch 2.3','ONNX','TensorRT','JAX/Flax','TensorFlow 2.x'] as const
export const FILE_FORMATS = ['safetensors','gguf','onnx','pt','ckpt'] as const
export const OS = ['linux','windows','macos'] as const
export const ACCELERATORS = ['nvidia-cuda','amd-rocm','apple-metal'] as const

export type FrameworkValue = typeof FRAMEWORKS[number]
export type FileFormatValue = typeof FILE_FORMATS[number]
export type OsValue = typeof OS[number]
export type AcceleratorValue = typeof ACCELERATORS[number]

// Technical model types - architectural categorization (Step 2)
// This is different from business modelType (Step 1)
// Used to classify the underlying architecture at a high level
export const TECHNICAL_MODEL_TYPES = [
  'decoder-only',        // GPT, Llama, Mistral, Falcon
  'encoder-decoder',     // T5, BART, mT5, Flan
  'encoder-only',        // BERT, RoBERTa, DistilBERT
  'vision-encoder',      // ViT, CLIP-vision, DeiT, Swin
  'diffusion',           // Stable Diffusion, DALL-E, Imagen
  'multimodal',          // CLIP, LLaVA, GPT-4V, Flamingo
  'embedding',           // sentence-transformers, ada-002
  'other'                // Custom or non-standard architectures
] as const

export type TechnicalModelType = typeof TECHNICAL_MODEL_TYPES[number]
