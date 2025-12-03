import { notFound } from 'next/navigation'
import ModelPageClient from './ModelPageClient'
import { fetchEvmModelWithMetadata } from '@/lib/fetchEvmModel'
import { getUserEntitlementsEvm } from '@/adapters/evm/entitlements'
import { cookies } from 'next/headers'
import { queryOne } from '@/lib/db'

type PageProps = {
  params?: { id?: string }
  searchParams?: { chainId?: string }
}

export default async function EvmModelDetailPage(props: PageProps) {
  const params = props?.params
  const searchParams = props?.searchParams
  const idParam = params?.id
  const modelId = idParam ? Number(idParam) : NaN
  if (!Number.isFinite(modelId) || modelId < 0) {
    notFound()
  }

  // Get chainId from searchParams, or undefined (client will detect from wallet)
  const chainId = searchParams?.chainId ? Number(searchParams.chainId) : undefined
  
  // SSR: Query DB directly (fast), fallback to blockchain (slow)
  let initialModel = null
  try {
    const data = await queryOne<any>(
      `SELECT 
        m.model_id,
        m.chain_id,
        m.owner,
        m.creator,
        m.name,
        m.uri,
        m.royalty_bps,
        m.listed,
        m.price_perpetual,
        m.price_subscription,
        m.default_duration_days,
        m.delivery_rights_default,
        m.delivery_mode_hint,
        m.terms_hash,
        m.version,
        m.agent_id,
        mm.metadata,
        mm.image_url,
        mm.categories,
        mm.tags
      FROM models m
      LEFT JOIN model_metadata mm ON m.model_id = mm.model_id
      WHERE m.model_id = $1${chainId ? ' AND m.chain_id = $2' : ''}`,
      chainId ? [modelId, chainId] : [modelId]
    )
    
    if (data) {
      // Transform DB response to match expected format
      // Keep snake_case for consistency with blockchain API response
      initialModel = {
        id: data.model_id,
        modelId: data.model_id,
        chainId: data.chain_id,
        owner: data.owner,
        creator: data.creator,
        name: data.name,
        uri: data.uri,
        royaltyBps: data.royalty_bps,
        listed: data.listed,
        price_perpetual: data.price_perpetual,
        price_subscription: data.price_subscription,
        default_duration_days: data.default_duration_days,
        delivery_rights_default: data.delivery_rights_default,
        delivery_mode_hint: data.delivery_mode_hint,
        version: data.version,
        terms_hash: data.terms_hash,
        imageUrl: data.image_url,
        metadata: data.metadata,
        categories: data.categories,
        tags: data.tags,
        agent_id: data.agent_id,
      }
    }
  } catch (error) {
    console.error('[SSR] DB query failed, falling back to blockchain:', error)
  }
  
  // Fallback: Fetch from blockchain if indexed API failed
  if (!initialModel) {
    initialModel = await fetchEvmModelWithMetadata({ id: modelId, chainId }).catch(() => null)
  }

  // SSR: Try to fetch entitlements if we can detect wallet from cookies
  let initialEntitlements = null
  try {
    const cookieStore = cookies()
    const walletCookie = cookieStore.get('wallet-address')
    const walletAddress = walletCookie?.value
    
    if (walletAddress && chainId) {
      initialEntitlements = await getUserEntitlementsEvm({
        modelId,
        user: walletAddress,
        evmChainId: chainId
      }).catch(() => null)
    }
  } catch {
    // Ignore cookie errors
  }

  const entitlementsEndpoint = `/api/models/evm/${modelId}/entitlements${chainId ? `?chainId=${chainId}` : ''}`

  return (
    <ModelPageClient 
      modelId={modelId}
      initialModel={initialModel}
      initialEntitlements={initialEntitlements}
      entitlementsEndpoint={entitlementsEndpoint}
      targetChainId={chainId}
    />
  )
}
