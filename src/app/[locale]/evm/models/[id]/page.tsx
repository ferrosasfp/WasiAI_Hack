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
  
  // SSR: Fetch model data with metadata
  const initialModel = await fetchEvmModelWithMetadata({ id: modelId, chainId }).catch(() => null)

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
