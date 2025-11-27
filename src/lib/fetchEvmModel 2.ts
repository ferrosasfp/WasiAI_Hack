import { createViewModelFromPublished } from '@/viewmodels'
import { HTTP_TIMEOUTS } from '@/config'

type FetchModelOptions = {
  id: number
  chainId?: number
  origin?: string
  signal?: AbortSignal
}

function toApiFromIpfs(u: string): string {
  if (!u) return ''
  if (u.startsWith('http://') || u.startsWith('https://')) return u
  if (u.startsWith('ipfs://')) return `/api/ipfs/ipfs/${u.replace('ipfs://','')}`
  if (u.startsWith('/ipfs/')) return `/api/ipfs${u}`
  return `/api/ipfs/ipfs/${u}`
}

function stripIpfs(u: any): string {
  const s = String(u || '')
  if (!s) return ''
  if (s.startsWith('ipfs://')) return s.replace('ipfs://', '')
  if (s.startsWith('/ipfs/')) return s.replace('/ipfs/', '')
  return s
}

function strMeta(v: any): string {
  if (v == null) return ''
  if (typeof v === 'string') return v
  if (typeof v === 'object') {
    const n = (v as any).name || (v as any).framework || (v as any).arch || (v as any).type || ''
    const ver = (v as any).version || (v as any).ver || (v as any).v || ''
    return [String(n || '').trim(), String(ver || '').trim()].filter(Boolean).join(' ')
  }
  return String(v)
}

function toArray(x: any): any[] {
  if (!x) return []
  if (Array.isArray(x)) return x
  if (typeof x === 'object') {
    if (Array.isArray((x as any).items)) return (x as any).items
    try { return Object.values(x) } catch { return [] }
  }
  return []
}

async function fetchWithTimeout(url: string, init: RequestInit = {}, ms = HTTP_TIMEOUTS.DEFAULT): Promise<Response> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), ms)
  try {
    const res = await fetch(url, { ...init, signal: init.signal ?? controller.signal })
    return res
  } finally {
    clearTimeout(timeout)
  }
}

export async function fetchEvmModelWithMetadata(options: FetchModelOptions): Promise<any | null> {
  const { id, chainId, origin, signal } = options
  if (!Number.isFinite(id) || id <= 0) return null
  const qs = new URLSearchParams()
  if (typeof chainId === 'number') qs.set('chainId', String(chainId))
  const endpoint = `${origin || ''}/api/models/evm/${id}?${qs.toString()}`
  const res = await fetch(endpoint, { cache: 'no-store', signal })
  if (!res.ok) {
    throw new Error('model_fetch_failed')
  }
  const payload = await res.json().catch(() => null)
  let model = payload?.data
  if (!model) return null
  let enrichedData: any = { ...model }
  const uri = model?.uri
  if (uri && typeof uri === 'string' && !uri.includes('.enc')) {
    enrichedData.metadataUri = uri
    try {
      const metaUrl = origin ? `${origin}${toApiFromIpfs(uri)}` : toApiFromIpfs(uri)
      const meta = await fetchWithTimeout(metaUrl, { cache: 'no-store', signal }).then(r => r.json()).catch(() => null)
      if (meta) {
        const img = meta.image || meta.image_url || meta.thumbnail || meta?.cover?.thumbCid || meta?.cover?.cid
        if (img && typeof img === 'string') {
          enrichedData.imageUrl = toApiFromIpfs(img)
        }
        if (!enrichedData.name && typeof meta.name === 'string') enrichedData.name = meta.name
        const desc = typeof meta.description === 'string' ? meta.description : (typeof (meta as any).shortSummary === 'string' ? (meta as any).shortSummary : undefined)
        if (!enrichedData.description && typeof desc === 'string') enrichedData.description = desc
        const categories = Array.isArray(meta?.categories) ? meta.categories : []
        const tasks = Array.isArray(meta?.tasks) ? meta.tasks : (Array.isArray(meta?.capabilities?.tasks) ? meta.capabilities.tasks : [])
        const tagsA = Array.isArray(meta?.tags) ? meta.tags : []
        const tagsB = Array.isArray(meta?.capabilities?.tags) ? meta.capabilities.tags : []
        const mods = Array.isArray(meta?.modalities) ? meta.modalities : (Array.isArray(meta?.capabilities?.modalities) ? meta.capabilities.modalities : [])
        const tags = Array.from(new Set([...tagsA, ...tagsB, ...mods].filter(Boolean).map(String)))
        const architectures = Array.isArray(meta?.architectures) ? meta.architectures.map(strMeta)
          : (Array.isArray(meta?.architecture?.architectures) ? meta.architecture.architectures.map(strMeta) : [])
        const frameworks = Array.isArray(meta?.frameworks) ? meta.frameworks.map(strMeta)
          : (Array.isArray(meta?.architecture?.frameworks) ? meta.architecture.frameworks.map(strMeta) : [])
        const precision = Array.isArray(meta?.precision) ? meta.precision.map(strMeta)
          : (Array.isArray(meta?.architecture?.precisions) ? meta.architecture.precisions.map(strMeta) : [])
        const rights = (meta?.rights && typeof meta.rights === 'object') ? {
          api: !!meta.rights.api,
          download: !!meta.rights.download,
          transferable: !!meta.rights.transferable,
        } : (meta?.licensePolicy ? {
          api: Array.isArray(meta.licensePolicy.rights) ? meta.licensePolicy.rights.map((x: any) => String(x).toLowerCase()).includes('api') : undefined,
          download: Array.isArray(meta.licensePolicy.rights) ? meta.licensePolicy.rights.map((x: any) => String(x).toLowerCase()).includes('download') : undefined,
          transferable: !!meta.licensePolicy.transferable,
        } : undefined)
        const deliveryMode = (typeof meta?.deliveryMode === 'string' && meta.deliveryMode) || (typeof meta?.delivery?.mode === 'string' && meta.delivery.mode) || (Array.isArray(meta?.licensePolicy?.delivery) ? (() => {
          const d = meta.licensePolicy.delivery.map((x: any) => String(x).toLowerCase())
          return d.includes('api') && d.includes('download') ? 'both' : d.includes('api') ? 'api' : d.includes('download') ? 'download' : undefined
        })() : undefined)
        const rawArtifacts = [
          ...toArray((meta as any)?.artifacts),
          ...toArray((meta as any)?.files),
          ...toArray((meta as any)?.assets),
          ...toArray((meta as any)?.bundle?.files),
          ...toArray((meta as any)?.model?.artifacts),
        ]
        const normArtifact = (v: any) => {
          if (v == null) return null
          if (typeof v === 'string') {
            const cid = stripIpfs(v)
            return cid ? { cid, filename: '', size: '', sha256: '' } : null
          }
          if (typeof v === 'object') {
            const cidRaw = (v as any).cid || (v as any).hash || (v as any).ipfs || (v as any).ipfs_cid || (v as any).url
            const cid = stripIpfs(cidRaw)
            const filename = (v as any).filename || (v as any).name || (v as any).path || ''
            const size = (v as any).size || (v as any).bytes || (v as any).length || ''
            const sha256 = (v as any).sha256 || (v as any).hash256 || (v as any).sha || ''
            return cid ? { cid: String(cid), filename: String(filename || ''), size, sha256: String(sha256 || '') } : null
          }
          return null
        }
        const artifactsList = rawArtifacts.map(normArtifact).filter(Boolean).reduce((acc: any[], cur: any) => {
          const key = `${cur.cid}::${cur.filename || ''}`
          if (!acc.some(x => `${x.cid}::${x.filename || ''}` === key)) acc.push(cur)
          return acc
        }, [])
        const cust = (meta as any)?.customer || {}
        const listing = (meta as any)?.listing || {}
        const businessCategory = typeof listing.businessCategory === 'string' ? listing.businessCategory : (typeof cust.businessCategory === 'string' ? cust.businessCategory : (typeof (meta as any)?.businessCategory === 'string' ? (meta as any).businessCategory : undefined))
        const valueProposition = typeof cust.valueProp === 'string' ? cust.valueProp : (typeof (meta as any)?.valueProposition === 'string' ? (meta as any).valueProposition : undefined)
        const customerDescription = typeof cust.description === 'string' ? cust.description : undefined
        const expectedImpact = typeof cust.expectedImpact === 'string' ? cust.expectedImpact : (typeof cust.expectedOutcomes === 'string' ? cust.expectedOutcomes : undefined)
        const inputs = typeof cust.inputs === 'string' ? cust.inputs : undefined
        const outputs = typeof cust.outputs === 'string' ? cust.outputs : undefined
        const examples = Array.isArray(cust.examples) ? cust.examples : undefined
        const industries = Array.isArray(cust.industries) ? cust.industries : undefined
        const useCases = Array.isArray(cust.useCases) ? cust.useCases : undefined
        const limitations = typeof cust.limitations === 'string' ? cust.limitations : (typeof cust.risks === 'string' ? cust.risks : undefined)
        const prohibited = typeof cust.prohibited === 'string' ? cust.prohibited : undefined
        const privacy = typeof cust.privacy === 'string' ? cust.privacy : undefined
        const deploy = Array.isArray(cust.deploy) ? cust.deploy : undefined
        const support = typeof cust.support === 'string' ? cust.support : undefined
        const supportedLanguages = Array.isArray(cust.supportedLanguages) ? cust.supportedLanguages : undefined
        const primaryLanguage = typeof cust.primaryLanguage === 'string' ? cust.primaryLanguage : undefined
        const modelType = typeof cust.modelType === 'string' ? cust.modelType
          : (typeof listing.modelType === 'string' ? listing.modelType
          : (typeof (meta as any)?.modelType === 'string' ? (meta as any).modelType
          : (typeof (meta as any)?.modelTypeBusiness === 'string' ? (meta as any).modelTypeBusiness : undefined)))
        const metrics = typeof cust.metrics === 'string' ? cust.metrics : undefined
        const authorship = (meta as any)?.authorship || (meta as any)?.author || {}
        const authorName = typeof authorship.name === 'string' ? authorship.name : (typeof authorship.displayName === 'string' ? authorship.displayName : undefined)
        const authorLinks = (authorship.links && typeof authorship.links === 'object') ? authorship.links : (authorship.socials && typeof authorship.socials === 'object') ? authorship.socials : undefined
        const arch = (meta as any)?.architecture || {}
        const quantization = typeof arch.quantization === 'string' ? arch.quantization : undefined
        const fileFormats = Array.isArray(arch.modelFiles) ? arch.modelFiles : undefined
        const modelSize = (arch as any).modelSizeParams != null ? String((arch as any).modelSizeParams) : undefined
        const artifactSize = typeof (arch as any).artifactSizeGB === 'string' ? (arch as any).artifactSizeGB : undefined
        const runtime2 = (meta as any)?.runtime || {}
        const python = typeof (runtime2 as any).python === 'string' ? (runtime2 as any).python : undefined
        const cuda = typeof (runtime2 as any).cuda === 'string' ? (runtime2 as any).cuda : undefined
        const pytorch = typeof (runtime2 as any).torch === 'string' ? (runtime2 as any).torch : undefined
        const cudnn = typeof (runtime2 as any).cudnn === 'string' ? (runtime2 as any).cudnn : undefined
        const systems = Array.isArray((runtime2 as any).os) ? (runtime2 as any).os : undefined
        const accelerators = Array.isArray((runtime2 as any).accelerators) ? (runtime2 as any).accelerators : undefined
        const computeCapability = typeof (runtime2 as any).computeCapability === 'string' ? (runtime2 as any).computeCapability : undefined
        const deps2 = (meta as any)?.dependencies || {}
        const dependencies = Array.isArray((deps2 as any).pip) ? ((deps2 as any).pip as string[]).join('\n') : undefined
        const res2 = (meta as any)?.resources || {}
        const minVram = (res2 as any).vramGB != null ? Number((res2 as any).vramGB) : undefined
        const minCpu = (res2 as any).cpuCores != null ? Number((res2 as any).cpuCores) : undefined
        const recRam = (res2 as any).ramGB != null ? Number((res2 as any).ramGB) : undefined
        const inf2 = (meta as any)?.inference || {}
        const maxBatch = (inf2 as any).maxBatchSize != null ? Number((inf2 as any).maxBatchSize) : undefined
        const contextLength = (inf2 as any).contextLength != null ? Number((inf2 as any).contextLength) : undefined
        const maxTokens = (inf2 as any).maxTokens != null ? Number((inf2 as any).maxTokens) : undefined
        const imageResolution = typeof (inf2 as any).imageResolution === 'string' ? (inf2 as any).imageResolution : undefined
        const sampleRate = (inf2 as any).sampleRate != null ? String((inf2 as any).sampleRate) : undefined
        const triton = typeof (inf2 as any).triton === 'boolean' ? (inf2 as any).triton : undefined
        const gpuNotes = typeof (inf2 as any).referencePerf === 'string' ? (inf2 as any).referencePerf : undefined
        const termsText = typeof (meta as any)?.licensePolicy?.termsText === 'string' ? (meta as any).licensePolicy.termsText : undefined
        enrichedData = {
          ...enrichedData,
          categories,
          tasks,
          tags,
          architectures,
          frameworks,
          precision,
          rights,
          deliveryMode,
          modalities: mods,
          businessCategory,
          valueProposition,
          customerDescription,
          expectedImpact,
          inputs,
          outputs,
          examples,
          industries,
          useCases,
          limitations,
          prohibited,
          privacy,
          deploy,
          support,
          supportedLanguages,
          primaryLanguage,
          modelType,
          metrics,
          quantization,
          fileFormats,
          modelSize,
          artifactSize,
          python,
          cuda,
          pytorch,
          cudnn,
          systems,
          accelerators,
          computeCapability,
          dependencies,
          minVram,
          minCpu,
          recRam,
          maxBatch,
          contextLength,
          maxTokens,
          imageResolution,
          sampleRate,
          triton,
          gpuNotes,
          termsText,
          artifactsList,
          authorName,
          authorLinks,
          price_perpetual: meta?.pricing?.perpetual?.wei || meta?.price_perpetual || enrichedData.price_perpetual || 0,
          price_subscription: meta?.pricing?.subscription?.weiPerMonth || meta?.price_subscription || enrichedData.price_subscription || 0,
          terms_summary: meta?.licensing?.terms?.summaryBullets || meta?.terms?.summaryBullets || [],
          terms_text: meta?.licensing?.terms?.textMarkdown || meta?.terms?.textMarkdown || '',
          rights_info: meta?.licensing?.rights || meta?.rights || {},
          delivery_mode: meta?.licensing?.deliveryMode || meta?.deliveryMode || '',
          royalty_pct: meta?.licensing?.fees?.royaltyPct || meta?.fees?.royaltyPct || 0,
          marketplace_fee_pct: meta?.licensing?.fees?.marketplaceFeePct || meta?.fees?.marketplaceFeePct || 0,
          download_notes: meta?.demo?.downloadNotes || meta?.downloadNotes || '',
        }
      }
    } catch {}
  }
  try {
    const viewModel = createViewModelFromPublished({ ...enrichedData, artifacts: enrichedData.artifactsList || [] })
    enrichedData.viewModel = viewModel
  } catch {}
  return enrichedData
}
