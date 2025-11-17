import { notFound } from 'next/navigation'
import ModelPageClient from './ModelPageClient'
import { fetchEvmModelWithMetadata } from '@/lib/fetchEvmModel'
import { getUserEntitlementsEvm } from '@/adapters/evm/entitlements'
import { cookies } from 'next/headers'

type PageProps = {
  params: { id: string }
  searchParams?: { chainId?: string }
}

export default async function EvmModelDetailPage({ params, searchParams }: PageProps) {
  const modelId = Number(params.id)
  if (!Number.isFinite(modelId) || modelId < 0) {
    notFound()
  }

  const chainId = searchParams?.chainId ? Number(searchParams.chainId) : undefined
  
  // SSR: Fetch model data with metadata
  const initialModel = await fetchEvmModelWithMetadata({ id: modelId, chainId }).catch(() => null)
  
  if (!initialModel) {
    notFound()
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
