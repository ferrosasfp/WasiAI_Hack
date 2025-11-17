"use client";
import React from 'react'
import { Box, Grid, Stack, Typography, Chip, Button, Paper, List, IconButton, Tooltip, Table, TableBody, TableCell, TableRow, TableHead, Divider, Alert } from '@mui/material'
import CloudDoneIcon from '@mui/icons-material/CloudDone'
import DownloadDoneIcon from '@mui/icons-material/DownloadDone'
import SwapHorizIcon from '@mui/icons-material/SwapHoriz'
import ScienceIcon from '@mui/icons-material/Science'
import GitHubIcon from '@mui/icons-material/GitHub'
import LanguageIcon from '@mui/icons-material/Language'
import LinkedInIcon from '@mui/icons-material/LinkedIn'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import CheckIcon from '@mui/icons-material/Check'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile'
import FolderZipIcon from '@mui/icons-material/FolderZip'
import CodeIcon from '@mui/icons-material/Code'
import DescriptionIcon from '@mui/icons-material/Description'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import { SvgIcon } from '@mui/material'
import { Row, ChipsShort, displayValue, formatPriceDisplay } from '@/components/ModelDetailShared'

const XIcon = (props: any) => (
  <SvgIcon {...props} viewBox="0 0 24 24">
    <path d="M3 2l8 10-8 10h3l6.5-8L19 22h3l-8-10 8-10h-3l-6.5 8L6 2H3z" fill="currentColor" />
  </SvgIcon>
)

// Shared type for model detail data
export type ModelDetailData = {
  name: string
  tagline?: string
  description?: string
  cover?: { cid?: string; url?: string }
  businessCategory?: string
  modelType?: string
  chainName?: string
  chainSymbol?: string
  author?: {
    displayName?: string
    links?: Record<string, string>
  }
  customer?: {
    valueProp?: string
    description?: string
    expectedImpact?: string
    inputs?: string
    outputs?: string
    examples?: Array<{ input: string; output: string; note?: string }>
    risks?: string
    prohibited?: string
    industries?: string[]
    useCases?: string[]
    supportedLanguages?: string[]
    privacy?: string
    deploy?: string[]
    support?: string[]
  }
  capabilities?: {
    tasks?: string[]
    modalities?: string[]
  }
  architecture?: {
    frameworks?: string[]
    architectures?: string[]
    precisions?: string[]
    modelFiles?: string[]
    quantization?: string
    modelSize?: string
    artifactSize?: string
    embeddingDimension?: string
  }
  runtime?: {
    python?: string
    cuda?: string
    pytorch?: string
    cudnn?: string
    os?: string[]
    accelerators?: string[]
    computeCapability?: string
  }
  dependencies?: {
    pip?: string[]
  }
  resources?: {
    vramGB?: string
    cpuCores?: string
    ramGB?: string
  }
  inference?: {
    maxBatchSize?: string
    contextLength?: string
    maxTokens?: string
    imageResolution?: string
    sampleRate?: string
    triton?: boolean
    referencePerf?: string
  }
  artifacts?: Array<{
    cid: string
    filename: string
    size?: string
    sha256?: string
    role?: string
  }>
  downloadNotes?: string
  licensePolicy?: {
    perpetual?: { priceRef?: string }
    subscription?: { perMonthPriceRef?: string }
    rights?: string[]
    delivery?: string[]
    termsText?: string
  }
  demoPreset?: boolean
}

type ModelDetailViewProps = {
  data: ModelDetailData
  isES: boolean
  labels: {
    whatItDoes: string
    valueProp: string
    expectedImpact: string
    customerSheet: string
    howUsed: string
    inputs: string
    outputs: string
    knownLimits: string
    prohibited: string
    businessFit: string
    industries: string
    useCases: string
    languages: string
    techConfig: string
    capabilities: string
    tasks: string
    modalities: string
    architecture: string
    frameworks: string
    architectures: string
    precisions: string
    modelFiles: string
    runtime: string
    systems: string
    artifactsDemo: string
    noArtifacts: string
    openDemo: string
    licensesTerms: string
    prices: string
    perpetualPrice: string
    subscriptionPrice: string
    rightsDelivery: string
    buyLicense: string
    tryDemo: string
  }
  onBuyLicense?: () => void
  onTryDemo?: () => void
  sectionSx?: object  // Custom sx for Paper sections
  showArtifactsDemo?: boolean // Control visibility of Artifacts & demo section
}

// Reusable ModelDetailView component following Step 5 design
export default function ModelDetailView({ data, isES, labels, onBuyLicense, onTryDemo, sectionSx = {}, showArtifactsDemo = true }: ModelDetailViewProps) {
  const [copiedCid, setCopiedCid] = React.useState<string | null>(null)
  const [showFullInstructions, setShowFullInstructions] = React.useState(false)

  const copyCid = (cid: string) => {
    try {
      navigator.clipboard.writeText(cid)
      setCopiedCid(cid)
      setTimeout(() => setCopiedCid(null), 2000)
    } catch {}
  }

  const getFileIcon = (filename: string) => {
    const ext = filename.split('.').pop()?.toLowerCase() || ''
    if (['zip', 'tar', 'gz', 'bz2', 'xz', '7z'].includes(ext)) return <FolderZipIcon fontSize="small" />
    if (['py', 'js', 'ts', 'jsx', 'tsx', 'cpp', 'c', 'java', 'sh'].includes(ext)) return <CodeIcon fontSize="small" />
    if (['pdf', 'md', 'txt', 'doc', 'docx'].includes(ext)) return <DescriptionIcon fontSize="small" />
    return <InsertDriveFileIcon fontSize="small" />
  }

  const coverUrl = data.cover?.url || (data.cover?.cid ? `https://ipfs.io/ipfs/${data.cover.cid}` : undefined)

  return (
    <>
        {/* HERO SECTION - Reuse Step 1 layout from Step 5 */}
        <Paper variant="outlined" sx={{ p:{ xs:2, md:3 }, mb:2, borderRadius:2, ...sectionSx }}>
          <Grid container spacing={3}>
            {/* Left: Model info */}
            <Grid item xs={12} md={8}>
              <Stack spacing={2}>
                <Box>
                  {/* Name - Same as Step 5 */}
                  <Typography variant="h6" sx={{ fontWeight:700, color:'#fff', mb:0.5 }}>
                    {data.name}
                  </Typography>
                  
                  {/* Tagline as subtitle */}
                  {data.tagline && (
                    <Typography variant="body2" sx={{ color:'#ffffffcc', mb:1, fontSize:'0.95rem' }}>
                      {data.tagline}
                    </Typography>
                  )}
                  
                  {/* Summary with line clamp like Step 5 */}
                  {data.description && (
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        color:'#ffffffcc',
                        display: '-webkit-box',
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        mb: 1.5
                      }}
                    >
                      {data.description}
                    </Typography>
                  )}
                  
                  {/* Model metadata line */}
                  <Typography variant="body2" sx={{ color:'#fff', fontSize:'0.85rem', mb:1.5 }}>
                    {[data.businessCategory, data.modelType, data.chainName, 'English'].filter(Boolean).join(' • ')}
                  </Typography>
                </Box>

                {/* Prices - Reuse formatting from Step 5 */}
                {(data.licensePolicy?.perpetual?.priceRef || data.licensePolicy?.subscription?.perMonthPriceRef) && (
                  <Box>
                    <Stack spacing={1}>
                      {data.licensePolicy?.perpetual?.priceRef && (
                        <Typography variant="body2" sx={{ color:'#4fe1ff', fontWeight:700, fontSize:'1.1rem' }}>
                          {formatPriceDisplay(data.licensePolicy.perpetual.priceRef)} {data.chainSymbol || ''} • {isES ? 'compra única' : 'one-time purchase'}
                        </Typography>
                      )}
                      {data.licensePolicy?.subscription?.perMonthPriceRef && (
                        <Typography variant="body2" sx={{ color:'#ffffffcc', fontSize:'0.95rem' }}>
                          {formatPriceDisplay(data.licensePolicy.subscription.perMonthPriceRef)} {data.chainSymbol || ''} {isES ? '/mes suscripción' : '/mo subscription'}
                        </Typography>
                      )}
                    </Stack>
                  </Box>
                )}

                {/* Action buttons */}
                <Stack direction={{ xs:'column', sm:'row' }} spacing={1.5}>
                  <Button 
                    variant="contained" 
                    size="large"
                    onClick={onBuyLicense}
                    sx={{ 
                      backgroundImage: 'linear-gradient(90deg, #7c5cff, #2ea0ff)', 
                      color: '#fff', 
                      textTransform: 'none', 
                      fontWeight: 600,
                      boxShadow: '0 4px 12px rgba(46,160,255,0.25)',
                      '&:hover': { filter: 'brightness(1.1)' }
                    }}
                  >
                    {labels.buyLicense}
                  </Button>
                  {data.demoPreset && (
                    <Button variant="outlined" size="large" onClick={onTryDemo} sx={{ textTransform: 'none' }}>
                      {labels.tryDemo}
                    </Button>
                  )}
                </Stack>

                {/* Author section - Reuse from Step 5 */}
                {data.author && (
                  <Box sx={{ pt:1.5, borderTop:'1px solid rgba(255,255,255,0.1)' }}>
                    <Typography variant="body2" sx={{ color:'#ffffffcc', mb:1 }}>
                      {isES ? 'Por' : 'By'} <strong>{data.author.displayName || 'Unknown'}</strong>
                    </Typography>
                    {data.author.links && Object.keys(data.author.links).length > 0 && (
                      <Stack direction="row" spacing={0.5} sx={{ flexWrap:'wrap' }}>
                        {Object.entries(data.author.links).filter(([,v])=>!!v).map(([k,v], i) => {
                          const label = k==='github'? 'GitHub' : k==='website'? 'Website' : k==='twitter'? 'X' : k==='linkedin'? 'LinkedIn' : k
                          const icon = k==='github'? <GitHubIcon fontSize="small" /> : k==='website'? <LanguageIcon fontSize="small" /> : k==='twitter'? <XIcon fontSize="small" /> : k==='linkedin'? <LinkedInIcon fontSize="small" /> : undefined
                          return (
                            <Tooltip key={`${k}-${i}`} title={`${label}: ${v}`}>
                              <IconButton size="small" aria-label={label} onClick={()=>{ try { if (v) window.open(String(v), '_blank', 'noopener,noreferrer') } catch {} }}>
                                {icon}
                              </IconButton>
                            </Tooltip>
                          )
                        })}
                      </Stack>
                    )}
                  </Box>
                )}
              </Stack>
            </Grid>

            {/* Right: Cover image + badges */}
            <Grid item xs={12} md={4}>
              <Stack spacing={2}>
                {coverUrl ? (
                  <Box sx={{ 
                    display:'flex', 
                    alignItems:'center', 
                    justifyContent:'center', 
                    width:'100%', 
                    borderRadius:2,
                    overflow:'hidden',
                    border:'1px solid rgba(255,255,255,0.1)'
                  }}>
                    <img
                      src={coverUrl}
                      alt="Model cover"
                      style={{ maxWidth: '100%', width: '100%', height: 'auto', maxHeight: 200, borderRadius: 8, objectFit: 'cover', display: 'block' }}
                    />
                  </Box>
                ) : (
                  <Box sx={{ width:'100%', height:200, borderRadius:2, border:'1px solid rgba(255,255,255,0.1)', bgcolor:'rgba(255,255,255,0.05)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <ScienceIcon sx={{ fontSize: 48, color:'text.secondary' }} />
                  </Box>
                )}

                {/* Metadata badges */}
                <Stack spacing={1}>
                  {data.businessCategory && (
                    <Chip 
                      size="small" 
                      label={`${isES ? 'Categoría' : 'Category'}: ${data.businessCategory}`}
                      variant="outlined"
                      sx={{ borderColor:'rgba(255,255,255,0.3)', color:'#fff', fontSize:'0.75rem' }}
                    />
                  )}
                  {data.modelType && (
                    <Chip 
                      size="small" 
                      label={`${isES ? 'Tipo' : 'Model type'}: ${data.modelType}`}
                      variant="outlined"
                      sx={{ borderColor:'rgba(255,255,255,0.3)', color:'#fff', fontSize:'0.75rem' }}
                    />
                  )}
                </Stack>
              </Stack>
            </Grid>
          </Grid>
        </Paper>

        {/* WHAT THIS MODEL DOES */}
        {(data.customer?.valueProp || data.customer?.description || data.customer?.expectedImpact) && (
          <Paper variant="outlined" sx={{ p:{ xs:2, md:3 }, mb:2, borderRadius:2, ...sectionSx }}>
            <Typography variant="h6" sx={{ color:'#fff', fontWeight:700, mb:2 }}>
              {labels.whatItDoes}
            </Typography>
            <Stack spacing={1.5}>
              {data.customer.valueProp && (
                <Typography variant="body1" sx={{ color:'#fff', fontWeight:600 }}>
                  {data.customer.valueProp}
                </Typography>
              )}
              {data.customer.description && (
                <Typography variant="body2" sx={{ color:'#ffffffcc' }}>
                  {data.customer.description}
                </Typography>
              )}
              {data.customer.expectedImpact && (
                <Box>
                  <Typography variant="caption" sx={{ display:'block', mb:0.5, fontWeight:600, color:'#ffffffb3' }}>
                    {labels.expectedImpact}
                  </Typography>
                  <Typography variant="body2" sx={{ color:'#ffffffcc' }}>
                    {data.customer.expectedImpact}
                  </Typography>
                </Box>
              )}
            </Stack>
          </Paper>
        )}

        {/* CUSTOMER SHEET - Reuse Step 2 Customer layout from Step 5 */}
        {data.customer && (
          <Paper variant="outlined" sx={{ p:{ xs:2, md:3 }, mb:2, borderRadius:2, ...sectionSx }}>
            <Typography variant="h6" sx={{ color:'#fff', fontWeight:700, mb:2 }}>
              {labels.customerSheet}
            </Typography>
            <Grid container spacing={3}>
              {/* Left column - narrative */}
              <Grid item xs={12} md={7}>
                <Stack spacing={2}>
                  {/* Inputs/Outputs */}
                  {(data.customer.inputs || data.customer.outputs) && (
                    <Box>
                      <Typography variant="caption" sx={{ display:'block', mb:1, fontWeight:600, textTransform:'uppercase', fontSize:'0.7rem', color:'#ffffffb3' }}>
                        {labels.howUsed}
                      </Typography>
                      <List dense sx={{ p:0 }}>
                        {data.customer.inputs && (
                          <Row label={labels.inputs} value={data.customer.inputs} />
                        )}
                        {data.customer.outputs && (
                          <Row label={labels.outputs} value={data.customer.outputs} />
                        )}
                      </List>
                    </Box>
                  )}

                  {/* I/O Examples */}
                  {data.customer.examples && Array.isArray(data.customer.examples) && data.customer.examples.length > 0 && (
                    <Box>
                      <Typography variant="caption" sx={{ display:'block', mb:1, fontWeight:600, color:'#ffffffb3' }}>
                        {isES ? 'Ejemplos de entrada/salida' : 'I/O Examples'}
                      </Typography>
                      <Box sx={{ p:1.5, bgcolor:'rgba(255,255,255,0.03)', borderRadius:1, border:'1px solid rgba(255,255,255,0.1)' }}>
                        {/* First example */}
                        <Box>
                          <Typography variant="caption" color="text.secondary" sx={{ fontWeight:600 }}>#1</Typography>
                          <Box sx={{ mt:0.5 }}>
                            <Typography variant="body2" sx={{ color:'#ffffffcc', fontSize:'0.85rem' }}>
                              <strong>{isES ? 'Entrada' : 'Input'}:</strong> {data.customer.examples[0].input}
                            </Typography>
                            <Typography variant="body2" sx={{ color:'#ffffffcc', fontSize:'0.85rem', mt:0.5 }}>
                              <strong>{isES ? 'Salida' : 'Output'}:</strong> {data.customer.examples[0].output}
                            </Typography>
                            {data.customer.examples[0].note && (
                              <Typography variant="body2" sx={{ color:'text.secondary', fontSize:'0.8rem', mt:0.5, fontStyle:'italic' }}>
                                {data.customer.examples[0].note}
                              </Typography>
                            )}
                          </Box>
                        </Box>
                        {/* More examples indicator */}
                        {data.customer.examples.length > 1 && (
                          <Typography variant="caption" color="primary.main" sx={{ display:'block', mt:1 }}>
                            + {data.customer.examples.length - 1} {isES ? 'ejemplos más' : 'more examples'}
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  )}

                  {/* Limitations */}
                  {data.customer.risks && (
                    <Box>
                      <Typography variant="caption" sx={{ display:'block', mb:0.5, fontWeight:600, color:'warning.main' }}>
                        ⚠️ {labels.knownLimits}
                      </Typography>
                      <Typography variant="body2" sx={{ color:'#ffffffcc' }}>
                        {data.customer.risks}
                      </Typography>
                    </Box>
                  )}

                  {/* Prohibited uses */}
                  {data.customer.prohibited && (
                    <Box>
                      <Typography variant="caption" sx={{ display:'block', mb:0.5, fontWeight:600, color:'error.main' }}>
                        🚫 {labels.prohibited}
                      </Typography>
                      <Typography variant="body2" sx={{ color:'#ffffffcc' }}>
                        {data.customer.prohibited}
                      </Typography>
                    </Box>
                  )}

                  {/* Privacy & data */}
                  {data.customer.privacy && (
                    <Box>
                      <Typography variant="caption" sx={{ display:'block', mb:0.5, fontWeight:600, color:'#ffffffb3' }}>
                        {isES ? 'Privacidad y datos' : 'Privacy & data'}
                      </Typography>
                      <Typography variant="body2" sx={{ color:'#ffffffcc' }}>
                        {data.customer.privacy}
                      </Typography>
                    </Box>
                  )}

                  {/* Support & service */}
                  {data.customer.support && Array.isArray(data.customer.support) && data.customer.support.length > 0 && (
                    <Box>
                      <Typography variant="caption" sx={{ display:'block', mb:0.5, fontWeight:600, color:'#ffffffb3' }}>
                        {isES ? 'Soporte y servicio' : 'Support & service'}
                      </Typography>
                      <Typography variant="body2" sx={{ color:'#ffffffcc' }}>
                        {data.customer.support.join(', ')}
                      </Typography>
                    </Box>
                  )}
                </Stack>
              </Grid>

              {/* Right column - chips/badges */}
              <Grid item xs={12} md={5}>
                <Stack spacing={2}>
                  {/* Industries & Use cases */}
                  {(data.customer.industries && data.customer.industries.length > 0 || data.customer.useCases && data.customer.useCases.length > 0) && (
                    <Box>
                      <Typography variant="caption" sx={{ display:'block', mb:1, fontWeight:600, textTransform:'uppercase', fontSize:'0.7rem', color:'#ffffffb3' }}>
                        {labels.businessFit}
                      </Typography>
                      <Stack spacing={1.5}>
                        {data.customer.industries && data.customer.industries.length > 0 && (
                          <Box>
                            <Typography variant="caption" sx={{ display:'block', mb:0.5, fontSize:'0.75rem', color:'#ffffffb3' }}>
                              {labels.industries}
                            </Typography>
                            <Box sx={{ display:'flex', flexWrap:'wrap', gap:0.5 }}>
                              {data.customer.industries.map((item: string, i: number) => (
                                <Chip key={i} label={item} size="small" variant="outlined" sx={{ borderColor:'rgba(255,255,255,0.3)', color:'#fff', fontSize:'0.75rem' }} />
                              ))}
                            </Box>
                          </Box>
                        )}
                        {data.customer.useCases && data.customer.useCases.length > 0 && (
                          <Box>
                            <Typography variant="caption" sx={{ display:'block', mb:0.5, fontSize:'0.75rem', color:'#ffffffb3' }}>
                              {labels.useCases}
                            </Typography>
                            <Box sx={{ display:'flex', flexWrap:'wrap', gap:0.5 }}>
                              {data.customer.useCases.map((item: string, i: number) => (
                                <Chip key={i} label={item} size="small" variant="outlined" sx={{ borderColor:'rgba(255,255,255,0.3)', color:'#fff', fontSize:'0.75rem' }} />
                              ))}
                            </Box>
                          </Box>
                        )}
                      </Stack>
                    </Box>
                  )}

                  {/* Delivery & deploy */}
                  {data.customer.deploy && data.customer.deploy.length > 0 && (
                    <Box>
                      <Typography variant="caption" sx={{ display:'block', mb:0.5, fontSize:'0.75rem', color:'#ffffffb3' }}>
                        {isES ? 'Entrega y despliegue' : 'Delivery & deploy'}
                      </Typography>
                      <Box sx={{ display:'flex', flexWrap:'wrap', gap:0.5 }}>
                        {data.customer.deploy.map((item: string, i: number) => (
                          <Chip key={i} label={item} size="small" variant="outlined" sx={{ borderColor:'rgba(255,255,255,0.3)', color:'#fff', fontSize:'0.75rem' }} />
                        ))}
                      </Box>
                    </Box>
                  )}

                  {/* Languages */}
                  {data.customer.supportedLanguages && data.customer.supportedLanguages.length > 0 && (
                    <Box>
                      <Typography variant="caption" sx={{ display:'block', mb:0.5, fontSize:'0.75rem', color:'#ffffffb3' }}>
                        {labels.languages}
                      </Typography>
                      <Typography variant="body2" sx={{ color:'#ffffffcc', fontSize:'0.85rem' }}>
                        {data.customer.supportedLanguages.join(', ')}
                      </Typography>
                    </Box>
                  )}
                </Stack>
              </Grid>
            </Grid>
          </Paper>
        )}

        {/* TECHNICAL CONFIGURATION - Reuse Step 2 Technical from Step 5 */}
        {(data.capabilities || data.architecture || data.runtime) && (
          <Paper variant="outlined" sx={{ p:{ xs:2, md:3 }, mb:2, borderRadius:2, ...sectionSx }}>
            <Typography variant="h6" sx={{ color:'#fff', fontWeight:700, mb:2 }}>
              {labels.techConfig}
            </Typography>

            {/* Capabilities */}
            {data.capabilities && (data.capabilities.tasks && data.capabilities.tasks.length > 0 || data.capabilities.modalities && data.capabilities.modalities.length > 0) && (
              <Box sx={{ mb:2 }}>
                <Typography variant="caption" sx={{ display:'block', mb:1, fontWeight:600, textTransform:'uppercase', fontSize:'0.7rem', color:'#ffffffb3' }}>
                  {labels.capabilities}
                </Typography>
                <List dense>
                  {data.capabilities.tasks && data.capabilities.tasks.length > 0 && (
                    <Row label={labels.tasks} value={<ChipsShort items={data.capabilities.tasks} />} />
                  )}
                  {data.capabilities.modalities && data.capabilities.modalities.length > 0 && (
                    <Row label={labels.modalities} value={<ChipsShort items={data.capabilities.modalities} />} />
                  )}
                </List>
              </Box>
            )}

            {/* Architecture */}
            {data.architecture && (
              <Box sx={{ mb:2 }}>
                <Typography variant="caption" sx={{ display:'block', mb:1, fontWeight:600, textTransform:'uppercase', fontSize:'0.7rem', color:'#ffffffb3' }}>
                  {labels.architecture}
                </Typography>
                <List dense>
                  {data.architecture.frameworks && data.architecture.frameworks.length > 0 && (
                    <Row label={labels.frameworks} value={<ChipsShort items={data.architecture.frameworks} />} />
                  )}
                  {data.architecture.architectures && data.architecture.architectures.length > 0 && (
                    <Row label={labels.architectures} value={<ChipsShort items={data.architecture.architectures} />} />
                  )}
                  {data.architecture.precisions && data.architecture.precisions.length > 0 && (
                    <Row label={labels.precisions} value={<ChipsShort items={data.architecture.precisions} />} />
                  )}
                  {data.architecture.modelFiles && data.architecture.modelFiles.length > 0 && (
                    <Row label={labels.modelFiles} value={<ChipsShort items={data.architecture.modelFiles} />} />
                  )}
                  {data.architecture.quantization && (
                    <Row label={isES ? 'Cuantización' : 'Quantization'} value={data.architecture.quantization} />
                  )}
                  {data.architecture.modelSize && (
                    <Row label={isES ? 'Parámetros del modelo' : 'Model size (params)'} value={data.architecture.modelSize} />
                  )}
                  {data.architecture.artifactSize && (
                    <Row label={isES ? 'Tamaño de artefacto (GB)' : 'Artifact size (GB)'} value={data.architecture.artifactSize} />
                  )}
                  {data.architecture.embeddingDimension && (
                    <Row label={isES ? 'Dimensión de embedding' : 'Embedding dimension'} value={data.architecture.embeddingDimension} />
                  )}
                </List>
              </Box>
            )}

            {/* Runtime */}
            {data.runtime && (
              <Box sx={{ mb:2 }}>
                <Typography variant="caption" sx={{ display:'block', mb:1, fontWeight:600, textTransform:'uppercase', fontSize:'0.7rem', color:'#ffffffb3' }}>
                  {labels.runtime}
                </Typography>
                <List dense>
                  {data.runtime.python && (
                    <Row label="Python" value={data.runtime.python} />
                  )}
                  {data.runtime.os && data.runtime.os.length > 0 && (
                    <Row label={labels.systems} value={<ChipsShort items={data.runtime.os} />} />
                  )}
                  {data.runtime.accelerators && data.runtime.accelerators.length > 0 && (
                    <Row label={isES ? 'Aceleradores' : 'Accelerators'} value={<ChipsShort items={data.runtime.accelerators} />} />
                  )}
                  {data.runtime.cuda && (
                    <Row label="CUDA" value={data.runtime.cuda} />
                  )}
                  {data.runtime.pytorch && (
                    <Row label="PyTorch" value={data.runtime.pytorch} />
                  )}
                  {data.runtime.cudnn && (
                    <Row label="cuDNN" value={data.runtime.cudnn} />
                  )}
                  {data.runtime.computeCapability && (
                    <Row label={isES ? 'Capacidad de cómputo' : 'Compute capability'} value={data.runtime.computeCapability} />
                  )}
                </List>
              </Box>
            )}

            {/* Dependencies */}
            {data.dependencies && data.dependencies.pip && data.dependencies.pip.length > 0 && (
              <Box sx={{ mb:2 }}>
                <Typography variant="caption" sx={{ display:'block', mb:1, fontWeight:600, textTransform:'uppercase', fontSize:'0.7rem', color:'#ffffffb3' }}>
                  {isES ? 'Dependencias' : 'Dependencies'}
                </Typography>
                <List dense>
                  <Row label={isES ? 'Paquetes pip' : 'pip packages'} value={data.dependencies.pip.join(' · ')} />
                </List>
              </Box>
            )}

            {/* Resources */}
            {data.resources && (
              <Box sx={{ mb:2 }}>
                <Typography variant="caption" sx={{ display:'block', mb:1, fontWeight:600, textTransform:'uppercase', fontSize:'0.7rem', color:'#ffffffb3' }}>
                  {isES ? 'Recursos' : 'Resources'}
                </Typography>
                <List dense>
                  <Row label={isES ? 'VRAM (GB)' : 'VRAM (GB)'} value={data.resources.vramGB || '–'} />
                  <Row label={isES ? 'Núcleos CPU' : 'CPU cores'} value={data.resources.cpuCores || '–'} />
                  <Row label={isES ? 'RAM (GB)' : 'RAM (GB)'} value={data.resources.ramGB || '–'} />
                </List>
              </Box>
            )}

            {/* Inference */}
            {data.inference && (
              <Box>
                <Typography variant="caption" sx={{ display:'block', mb:1, fontWeight:600, textTransform:'uppercase', fontSize:'0.7rem', color:'#ffffffb3' }}>
                  {isES ? 'Inferencia' : 'Inference'}
                </Typography>
                <List dense>
                  <Row label={isES ? 'Tamaño de batch máx.' : 'Max batch size'} value={data.inference.maxBatchSize || '–'} />
                  <Row label={isES ? 'Longitud de contexto' : 'Context length'} value={data.inference.contextLength || '–'} />
                  <Row label={isES ? 'Tokens máx.' : 'Max tokens'} value={data.inference.maxTokens || '–'} />
                  {data.inference.imageResolution && (
                    <Row label={isES ? 'Resolución de imagen' : 'Image resolution'} value={data.inference.imageResolution} />
                  )}
                  {data.inference.sampleRate && (
                    <Row label={isES ? 'Frecuencia de muestreo' : 'Sample rate'} value={data.inference.sampleRate} />
                  )}
                  {data.inference.triton != null && (
                    <Row label="Triton" value={data.inference.triton ? (isES ? 'Habilitado' : 'Enabled') : (isES ? 'Deshabilitado' : 'Disabled')} />
                  )}
                  {data.inference.referencePerf && (
                    <Row label={isES ? 'Rendimiento de referencia' : 'Reference performance'} value={data.inference.referencePerf} />
                  )}
                </List>
              </Box>
            )}
          </Paper>
        )}

        {/* ARTIFACTS & DEMO - Reuse Step 3 from Step 5 */}
        {showArtifactsDemo && (((data.artifacts && data.artifacts.length > 0) || data.demoPreset)) && (
          <Paper variant="outlined" sx={{ p:{ xs:2, md:3 }, mb:2, borderRadius:2, ...sectionSx }}>
            <Typography variant="h6" sx={{ color:'#fff', fontWeight:700, mb:2 }}>
              {labels.artifactsDemo}
            </Typography>

            {data.artifacts && data.artifacts.length > 0 && (
              <Box>
                <Typography variant="body2" sx={{ mb: 2, color:'#ffffffcc' }}>
                  {isES ? 'Artifacts disponibles' : 'Artifacts available'}
                </Typography>
                {/* TODO: Add full table when needed */}
              </Box>
            )}

            {data.demoPreset && (
              <Box sx={{ mt:2 }}>
                <Divider sx={{ my:2 }} />
                <Typography variant="subtitle2" sx={{ color:'#fff', fontWeight:600, mb:1 }}>
                  Demo
                </Typography>
                <Button variant="outlined" startIcon={<OpenInNewIcon />} onClick={onTryDemo}>
                  {labels.openDemo}
                </Button>
              </Box>
            )}
          </Paper>
        )}

        {/* LICENSES AND TERMS - Reuse Step 4 from Step 5 */}
        {data.licensePolicy && (
          <Paper variant="outlined" sx={{ p:{ xs:2, md:3 }, mb:2, borderRadius:2, ...sectionSx }}>
            <Typography variant="h6" sx={{ color:'#fff', fontWeight:700, mb:2 }}>
              {labels.licensesTerms}
            </Typography>

            <Stack spacing={2}>
              {/* Prices */}
              <Box>
                <Typography variant="caption" sx={{ display:'block', mb:1, fontWeight:600, textTransform:'uppercase', fontSize:'0.7rem', color:'#ffffffb3' }}>
                  {labels.prices}
                </Typography>
                <List dense>
                  {data.licensePolicy.perpetual?.priceRef && (
                    <Row label={labels.perpetualPrice} value={`${formatPriceDisplay(data.licensePolicy.perpetual.priceRef)} ${data.chainSymbol || ''}`} />
                  )}
                  {data.licensePolicy.subscription?.perMonthPriceRef && (
                    <Row label={labels.subscriptionPrice} value={`${formatPriceDisplay(data.licensePolicy.subscription.perMonthPriceRef)} ${data.chainSymbol || ''}`} />
                  )}
                </List>
              </Box>

              <Divider />

              {/* Rights & Delivery */}
              {data.licensePolicy.rights && data.licensePolicy.rights.length > 0 && (
                <Box>
                  <Typography variant="caption" sx={{ display:'block', mb:1, fontWeight:600, textTransform:'uppercase', fontSize:'0.7rem', color:'#ffffffb3' }}>
                    {labels.rightsDelivery}
                  </Typography>
                  <Stack direction="row" spacing={1} sx={{ flexWrap:'wrap', gap:1 }}>
                    {data.licensePolicy.rights.map((right, i) => {
                      const icon = right.toLowerCase().includes('api') ? <CloudDoneIcon /> 
                        : right.toLowerCase().includes('download') ? <DownloadDoneIcon /> 
                        : right.toLowerCase().includes('transfer') ? <SwapHorizIcon /> 
                        : undefined
                      return (
                        <Chip 
                          key={i}
                          icon={icon} 
                          label={right} 
                          size="small" 
                          variant="outlined"
                          sx={{ borderColor:'rgba(255,255,255,0.3)', color:'#fff' }}
                        />
                      )
                    })}
                  </Stack>
                </Box>
              )}
            </Stack>
          </Paper>
        )}
    </>
  )
}
