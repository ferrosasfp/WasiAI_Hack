"use client";
import React, { useMemo, useState } from 'react'
import { notFound } from 'next/navigation'
import { useLocale, useTranslations } from 'next-intl'
import { Box, Container, Grid, Stack, Typography, Chip, Button, Paper, List, IconButton, Tooltip, Table, TableBody, TableCell, TableRow, TableHead, Divider, Alert } from '@mui/material'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import CheckIcon from '@mui/icons-material/Check'
import CloudDoneIcon from '@mui/icons-material/CloudDone'
import DownloadDoneIcon from '@mui/icons-material/DownloadDone'
import SwapHorizIcon from '@mui/icons-material/SwapHoriz'
import ScienceIcon from '@mui/icons-material/Science'
import GitHubIcon from '@mui/icons-material/GitHub'
import LanguageIcon from '@mui/icons-material/Language'
import LinkedInIcon from '@mui/icons-material/LinkedIn'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile'
import FolderZipIcon from '@mui/icons-material/FolderZip'
import CodeIcon from '@mui/icons-material/Code'
import DescriptionIcon from '@mui/icons-material/Description'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import { SvgIcon } from '@mui/material'
import { mockModels } from '@/data/mockModels'
import { Row, ChipsShort, displayValue, formatPriceDisplay } from '@/components/ModelDetailShared'

const XIcon = (props: any) => (
  <SvgIcon {...props} viewBox="0 0 24 24">
    <path d="M3 2l8 10-8 10h3l6.5-8L19 22h3l-8-10 8-10h-3l-6.5 8L6 2H3z" fill="currentColor" />
  </SvgIcon>
)

// Reuse Step 5 design for public buyer model detail view
export default function ModelDetailPage({ params }: { params: { slug: string } }) {
  const locale = useLocale()
  const t = useTranslations()
  const isES = String(locale||'').startsWith('es')
  const m = useMemo(()=> mockModels.find(mm => mm.slug === params.slug), [params.slug])
  const [copiedCid, setCopiedCid] = useState<string | null>(null)
  const [showFullInstructions, setShowFullInstructions] = useState(false)

  if (!m) return notFound()

  // Mock metadata structure similar to Step 5 draft
  const metadata = useMemo(() => ({
    name: m.name,
    tagline: m.valueProposition || m.summary,
    cover: m.cover ? { cid: m.cover.replace('https://ipfs.io/ipfs/', '') } : undefined,
    businessCategory: (m.categories && m.categories[0]) || undefined,
    modelType: (m.tasks && m.tasks[0]) || undefined,
    author: {
      displayName: m.author || 'Unknown',
      links: {} as Record<string, string>
    },
    customer: {
      valueProp: m.valueProposition,
      description: m.summary,
      expectedImpact: m.expectedBusinessImpact,
      inputs: m.inputs,
      outputs: m.outputs,
      risks: m.knownLimitations,
      prohibited: m.prohibitedUses,
      industries: m.industries || [],
      useCases: m.useCases || [],
      supportedLanguages: (m as any).supportedLanguages || [],
      examples: []
    },
    capabilities: {
      tasks: m.tasks || [],
      modalities: []
    },
    architecture: {
      frameworks: m.frameworks || [],
      architectures: m.architectures || [],
      precisions: m.precision || [],
      modelFiles: m.fileFormats || []
    },
    runtime: {
      os: m.runtimeSystems || []
    },
    artifacts: [] as any[],
    licensePolicy: {
      perpetual: { priceRef: m.pricePerpetual },
      subscription: { perMonthPriceRef: m.priceSubscription },
      rights: [
        ...(m.rights?.api ? ['API usage'] : []),
        ...(m.rights?.download ? ['Model download'] : []),
        ...(m.rights?.transferable ? ['Transferable'] : [])
      ],
      delivery: m.deliveryMode ? [m.deliveryMode] : []
    }
  }), [m])

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

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#0a111c' }}>
      <Container maxWidth="lg" sx={{ py: { xs: 3, md: 5 } }}>
        {/* HERO SECTION - Reuse Step 1 layout from Step 5 */}
        <Paper variant="outlined" sx={{ p:{ xs:2, md:3 }, mb:3, borderRadius:2 }}>
          <Grid container spacing={3}>
            {/* Left: Model info */}
            <Grid item xs={12} md={8}>
              <Stack spacing={2}>
                <Box>
                  <Typography variant="h4" sx={{ color:'#fff', fontWeight:800, mb:1 }}>
                    {metadata.name}
                  </Typography>
                  <Typography variant="h6" sx={{ color:'#ffffffb3', fontWeight:400, mb:1 }}>
                    {metadata.tagline}
                  </Typography>
                  <Typography variant="body2" sx={{ color:'#ffffffcc', mb:1.5 }}>
                    {metadata.customer.description}
                  </Typography>
                  {/* Model metadata line */}
                  <Typography variant="body2" sx={{ color:'text.secondary', fontSize:'0.85rem' }}>
                    {[metadata.businessCategory, metadata.modelType, 'Avalanche (AVAX)', 'English'].filter(Boolean).join(' • ')}
                  </Typography>
                </Box>

                {/* Prices - Reuse formatting from Step 5 */}
                {(metadata.licensePolicy.perpetual?.priceRef || metadata.licensePolicy.subscription?.perMonthPriceRef) && (
                  <Box>
                    <Stack spacing={1}>
                      {metadata.licensePolicy.perpetual?.priceRef && (
                        <Typography variant="body2" sx={{ color:'#4fe1ff', fontWeight:700, fontSize:'1.1rem' }}>
                          {formatPriceDisplay(metadata.licensePolicy.perpetual.priceRef)} • {isES ? 'compra única' : 'one-time purchase'}
                        </Typography>
                      )}
                      {metadata.licensePolicy.subscription?.perMonthPriceRef && (
                        <Typography variant="body2" sx={{ color:'#ffffffcc', fontSize:'0.95rem' }}>
                          {formatPriceDisplay(metadata.licensePolicy.subscription.perMonthPriceRef)} {isES ? '/mes suscripción' : '/mo subscription'}
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
                    sx={{ 
                      backgroundImage: 'linear-gradient(90deg, #7c5cff, #2ea0ff)', 
                      color: '#fff', 
                      textTransform: 'none', 
                      fontWeight: 600,
                      boxShadow: '0 4px 12px rgba(46,160,255,0.25)',
                      '&:hover': { filter: 'brightness(1.1)' }
                    }}
                  >
                    {isES ? 'Comprar licencia' : 'Buy license'}
                  </Button>
                  {m.demoPreset && (
                    <Button variant="outlined" size="large" sx={{ textTransform: 'none' }}>
                      {isES ? 'Probar demo' : 'Try demo'}
                    </Button>
                  )}
                </Stack>

                {/* Author section - Reuse from Step 5 */}
                <Box sx={{ pt:1.5, borderTop:'1px solid rgba(255,255,255,0.1)' }}  >
                  <Typography variant="body2" sx={{ color:'#ffffffcc', mb:1 }}>
                    {isES ? 'Por' : 'By'} <strong>{metadata.author.displayName}</strong>
                  </Typography>
                  {Object.keys(metadata.author.links).length > 0 && (
                    <Stack direction="row" spacing={0.5} sx={{ flexWrap:'wrap' }}>
                      {Object.entries(metadata.author.links).filter(([,v])=>!!v).map(([k,v], i) => {
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
              </Stack>
            </Grid>

            {/* Right: Cover image + badges */}
            <Grid item xs={12} md={4}>
              <Stack spacing={2}>
                {metadata.cover?.cid ? (
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
                      src={`https://ipfs.io/ipfs/${metadata.cover.cid}`}
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
                  {metadata.businessCategory && (
                    <Chip 
                      size="small" 
                      label={`${isES ? 'Categoría' : 'Category'}: ${metadata.businessCategory}`}
                      variant="outlined"
                      sx={{ borderColor:'rgba(255,255,255,0.3)', color:'#fff', fontSize:'0.75rem' }}
                    />
                  )}
                  {metadata.modelType && (
                    <Chip 
                      size="small" 
                      label={`${isES ? 'Tipo' : 'Model type'}: ${metadata.modelType}`}
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
        {(metadata.customer.valueProp || metadata.customer.expectedImpact) && (
          <Paper variant="outlined" sx={{ p:{ xs:2, md:3 }, mb:3, borderRadius:2 }}>
            <Typography variant="h6" sx={{ color:'#fff', fontWeight:700, mb:2 }}>
              {isES ? 'Qué hace este modelo' : 'What this model does'}
            </Typography>
            <Stack spacing={1.5}>
              {metadata.customer.valueProp && (
                <Typography variant="body1" sx={{ color:'#fff', fontWeight:600 }}>
                  {metadata.customer.valueProp}
                </Typography>
              )}
              {metadata.customer.description && (
                <Typography variant="body2" sx={{ color:'#ffffffcc' }}>
                  {metadata.customer.description}
                </Typography>
              )}
              {metadata.customer.expectedImpact && (
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ display:'block', mb:0.5, fontWeight:600 }}>
                    {isES ? 'Impacto esperado' : 'Expected impact'}
                  </Typography>
                  <Typography variant="body2" sx={{ color:'#ffffffcc' }}>
                    {metadata.customer.expectedImpact}
                  </Typography>
                </Box>
              )}
            </Stack>
          </Paper>
        )}

        {/* CUSTOMER SHEET - Reuse Step 2 Customer layout from Step 5 */}
        <Paper variant="outlined" sx={{ p:{ xs:2, md:3 }, mb:3, borderRadius:2 }}>
          <Typography variant="h6" sx={{ color:'#fff', fontWeight:700, mb:2 }}>
            {isES ? 'Ficha para clientes' : 'Customer sheet'}
          </Typography>
          <Grid container spacing={3}>
            {/* Left column - narrative */}
            <Grid item xs={12} md={7}>
              <Stack spacing={2}>
                {/* Inputs/Outputs */}
                {(metadata.customer.inputs || metadata.customer.outputs) && (
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ display:'block', mb:1, fontWeight:600, textTransform:'uppercase', fontSize:'0.7rem' }}>
                      {isES ? 'Cómo se usa' : 'How this is used'}
                    </Typography>
                    <List dense sx={{ p:0 }}>
                      {metadata.customer.inputs && (
                        <Row label={isES ? 'Entradas' : 'Inputs'} value={metadata.customer.inputs} />
                      )}
                      {metadata.customer.outputs && (
                        <Row label={isES ? 'Salidas' : 'Outputs'} value={metadata.customer.outputs} />
                      )}
                    </List>
                  </Box>
                )}

                {/* Limitations */}
                {metadata.customer.risks && (
                  <Box>
                    <Typography variant="caption" sx={{ display:'block', mb:0.5, fontWeight:600, color:'warning.main' }}>
                      ⚠️ {isES ? 'Limitaciones conocidas' : 'Known limitations'}
                    </Typography>
                    <Typography variant="body2" sx={{ color:'#ffffffcc' }}>
                      {metadata.customer.risks}
                    </Typography>
                  </Box>
                )}

                {/* Prohibited uses */}
                {metadata.customer.prohibited && (
                  <Box>
                    <Typography variant="caption" sx={{ display:'block', mb:0.5, fontWeight:600, color:'error.main' }}>
                      🚫 {isES ? 'Usos prohibidos' : 'Do not use for'}
                    </Typography>
                    <Typography variant="body2" sx={{ color:'#ffffffcc' }}>
                      {metadata.customer.prohibited}
                    </Typography>
                  </Box>
                )}
              </Stack>
            </Grid>

            {/* Right column - chips/badges */}
            <Grid item xs={12} md={5}>
              <Stack spacing={2}>
                {/* Industries & Use cases */}
                {(metadata.customer.industries?.length > 0 || metadata.customer.useCases?.length > 0) && (
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ display:'block', mb:1, fontWeight:600, textTransform:'uppercase', fontSize:'0.7rem' }}>
                      {isES ? 'Ajuste de negocio' : 'Business fit'}
                    </Typography>
                    <Stack spacing={1.5}>
                      {metadata.customer.industries.length > 0 && (
                        <Box>
                          <Typography variant="caption" color="text.secondary" sx={{ display:'block', mb:0.5, fontSize:'0.75rem' }}>
                            {isES ? 'Industrias' : 'Industries'}
                          </Typography>
                          <Box sx={{ display:'flex', flexWrap:'wrap', gap:0.5 }}>
                            {metadata.customer.industries.map((item: string, i: number) => (
                              <Chip key={i} label={item} size="small" variant="outlined" sx={{ borderColor:'rgba(255,255,255,0.3)', color:'#fff', fontSize:'0.75rem' }} />
                            ))}
                          </Box>
                        </Box>
                      )}
                      {metadata.customer.useCases.length > 0 && (
                        <Box>
                          <Typography variant="caption" color="text.secondary" sx={{ display:'block', mb:0.5, fontSize:'0.75rem' }}>
                            {isES ? 'Casos de uso' : 'Use cases'}
                          </Typography>
                          <Box sx={{ display:'flex', flexWrap:'wrap', gap:0.5 }}>
                            {metadata.customer.useCases.map((item: string, i: number) => (
                              <Chip key={i} label={item} size="small" variant="outlined" sx={{ borderColor:'rgba(255,255,255,0.3)', color:'#fff', fontSize:'0.75rem' }} />
                            ))}
                          </Box>
                        </Box>
                      )}
                    </Stack>
                  </Box>
                )}

                {/* Languages */}
                {metadata.customer.supportedLanguages?.length > 0 && (
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ display:'block', mb:0.5, fontSize:'0.75rem' }}>
                      {isES ? 'Idiomas' : 'Languages'}
                    </Typography>
                    <Typography variant="body2" sx={{ color:'#ffffffcc', fontSize:'0.85rem' }}>
                      {metadata.customer.supportedLanguages.join(', ')}
                    </Typography>
                  </Box>
                )}
              </Stack>
            </Grid>
          </Grid>
        </Paper>

        {/* TECHNICAL CONFIGURATION - Reuse Step 2 Technical from Step 5 */}
        <Paper variant="outlined" sx={{ p:{ xs:2, md:3 }, mb:3, borderRadius:2 }}>
          <Typography variant="h6" sx={{ color:'#fff', fontWeight:700, mb:2 }}>
            {isES ? 'Configuración técnica' : 'Technical configuration'}
          </Typography>

          {/* Capabilities */}
          {(metadata.capabilities.tasks?.length > 0 || metadata.capabilities.modalities?.length > 0) && (
            <Box sx={{ mb:2 }}>
              <Typography variant="caption" color="text.secondary" sx={{ display:'block', mb:1, fontWeight:600, textTransform:'uppercase', fontSize:'0.7rem' }}>
                {isES ? 'Capacidades' : 'Capabilities'}
              </Typography>
              <List dense>
                {metadata.capabilities.tasks.length > 0 && (
                  <Row label={isES ? 'Tareas' : 'Tasks'} value={<ChipsShort items={metadata.capabilities.tasks} />} />
                )}
                {metadata.capabilities.modalities.length > 0 && (
                  <Row label={isES ? 'Modalidades' : 'Modalities'} value={<ChipsShort items={metadata.capabilities.modalities} />} />
                )}
              </List>
            </Box>
          )}

          {/* Architecture */}
          <Box sx={{ mb:2 }}>
            <Typography variant="caption" color="text.secondary" sx={{ display:'block', mb:1, fontWeight:600, textTransform:'uppercase', fontSize:'0.7rem' }}>
              {isES ? 'Arquitectura' : 'Architecture'}
            </Typography>
            <List dense>
              {metadata.architecture.frameworks?.length > 0 && (
                <Row label="Frameworks" value={<ChipsShort items={metadata.architecture.frameworks} />} />
              )}
              {metadata.architecture.architectures?.length > 0 && (
                <Row label={isES ? 'Arquitecturas' : 'Architectures'} value={<ChipsShort items={metadata.architecture.architectures} />} />
              )}
              {metadata.architecture.precisions?.length > 0 && (
                <Row label={isES ? 'Precisiones' : 'Precisions'} value={<ChipsShort items={metadata.architecture.precisions} />} />
              )}
              {metadata.architecture.modelFiles?.length > 0 && (
                <Row label={isES ? 'Archivos del modelo' : 'Model files'} value={<ChipsShort items={metadata.architecture.modelFiles} />} />
              )}
            </List>
          </Box>

          {/* Runtime */}
          {metadata.runtime.os?.length > 0 && (
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ display:'block', mb:1, fontWeight:600, textTransform:'uppercase', fontSize:'0.7rem' }}>
                Runtime
              </Typography>
              <List dense>
                <Row label={isES ? 'Sistemas operativos' : 'Operating systems'} value={<ChipsShort items={metadata.runtime.os} />} />
              </List>
            </Box>
          )}
        </Paper>

        {/* ARTIFACTS & DEMO - Reuse Step 3 from Step 5 */}
        <Paper variant="outlined" sx={{ p:{ xs:2, md:3 }, mb:3, borderRadius:2 }}>
          <Typography variant="h6" sx={{ color:'#fff', fontWeight:700, mb:2 }}>
            {isES ? 'Artefactos y demo' : 'Artifacts & demo'}
          </Typography>
          
          {metadata.artifacts.length === 0 ? (
            <Alert severity="info">
              {isES ? 'Este modelo no tiene artifacts IPFS disponibles en este momento.' : 'This model has no IPFS artifacts available at this time.'}
            </Alert>
          ) : (
            <Box>
              <Typography variant="body2" color="text.secondary">
                {isES ? 'Artifacts disponibles (simulado)' : 'Artifacts available (mock)'}
              </Typography>
            </Box>
          )}

          {m.demoPreset && (
            <Box sx={{ mt:2 }}>
              <Divider sx={{ my:2 }} />
              <Typography variant="subtitle2" sx={{ color:'#fff', fontWeight:600, mb:1 }}>
                Demo
              </Typography>
              <Button variant="outlined" startIcon={<OpenInNewIcon />}>
                {isES ? 'Abrir demo' : 'Open demo'}
              </Button>
            </Box>
          )}
        </Paper>

        {/* LICENSES AND TERMS - Reuse Step 4 from Step 5 */}
        <Paper variant="outlined" sx={{ p:{ xs:2, md:3 }, mb:3, borderRadius:2 }}>
          <Typography variant="h6" sx={{ color:'#fff', fontWeight:700, mb:2 }}>
            {isES ? 'Licencias y términos' : 'Licenses and terms'}
          </Typography>

          <Stack spacing={2}>
            {/* Prices */}
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ display:'block', mb:1, fontWeight:600, textTransform:'uppercase', fontSize:'0.7rem' }}>
                {isES ? 'Precios' : 'Prices'}
              </Typography>
              <List dense>
                {metadata.licensePolicy.perpetual?.priceRef && (
                  <Row label={isES ? 'Precio perpetuo' : 'Perpetual price'} value={`${formatPriceDisplay(metadata.licensePolicy.perpetual.priceRef)} AVAX`} />
                )}
                {metadata.licensePolicy.subscription?.perMonthPriceRef && (
                  <Row label={isES ? 'Suscripción/mes' : 'Subscription/month'} value={`${formatPriceDisplay(metadata.licensePolicy.subscription.perMonthPriceRef)} AVAX`} />
                )}
              </List>
            </Box>

            <Divider />

            {/* Rights & Delivery */}
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ display:'block', mb:1, fontWeight:600, textTransform:'uppercase', fontSize:'0.7rem' }}>
                {isES ? 'Derechos y entrega' : 'Rights & delivery'}
              </Typography>
              <Stack direction="row" spacing={1} sx={{ flexWrap:'wrap', gap:1 }}>
                {metadata.licensePolicy.rights.map((right, i) => {
                  const icon = right.includes('API') ? <CloudDoneIcon /> 
                    : right.includes('download') ? <DownloadDoneIcon /> 
                    : right.includes('Transferable') ? <SwapHorizIcon /> 
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
          </Stack>
        </Paper>
      </Container>
    </Box>
  )
}
