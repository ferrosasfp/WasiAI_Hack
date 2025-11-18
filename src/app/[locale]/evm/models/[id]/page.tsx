import { notFound } from 'next/navigation'
import ModelPageClient from './ModelPageClient'
import { fetchEvmModelWithMetadata } from '@/lib/fetchEvmModel'
import { getUserEntitlementsEvm } from '@/adapters/evm/entitlements'
import { cookies } from 'next/headers'

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
  
  // SSR: Try indexed API first (fast), fallback to blockchain (slow)
  let initialModel = null
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const apiUrl = `${baseUrl}/api/indexed/models/${modelId}${chainId ? `?chainId=${chainId}` : ''}`
    const res = await fetch(apiUrl, { 
      cache: 'no-store',
      next: { revalidate: 60 } // Revalidate every 60s
    })
    
    if (res.ok) {
      const data = await res.json()
      if (data?.model) {
        // Transform indexed API response to match expected format
        initialModel = {
          id: data.model.model_id,
          modelId: data.model.model_id,
          owner: data.model.owner,
          creator: data.model.creator,
          name: data.model.name,
          uri: data.model.uri,
          royaltyBps: data.model.royalty_bps,
          listed: data.model.listed,
          pricePerpetual: data.model.price_perpetual,
          priceSubscription: data.model.price_subscription,
          defaultDurationDays: data.model.default_duration_days,
          deliveryRightsDefault: data.model.delivery_rights_default,
          deliveryModeHint: data.model.delivery_mode_hint,
          version: data.model.version,
          termsHash: data.model.terms_hash,
          imageUrl: data.model.image_url,
          metadata: data.model.metadata,
          categories: data.model.categories,
          tags: data.model.tags
        }
      }
    }
  } catch (error) {
    console.log('Indexed API failed, falling back to blockchain:', error)
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
