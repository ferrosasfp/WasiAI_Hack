import { NextResponse } from 'next/server'
import { buildAgentMetadata, DEFAULT_PRICE_PER_INFERENCE } from '@/lib/erc8004'

export const dynamic = 'force-dynamic'

async function pinJSONToIPFS(payload: any) {
  const jwt = process.env.PINATA_JWT
  const key = process.env.PINATA_API_KEY
  const secret = process.env.PINATA_SECRET_KEY
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (jwt) headers['Authorization'] = `Bearer ${jwt}`
  else if (key && secret) {
    headers['pinata_api_key'] = key
    headers['pinata_secret_api_key'] = secret
  } else {
    throw new Error('pinata_credentials_missing')
  }
  const res = await fetch('https://api.pinata.cloud/pinning/pinJSONToIPFS', {
    method: 'POST',
    headers,
    body: JSON.stringify({ pinataContent: payload })
  })
  if (!res.ok) {
    const txt = await res.text()
    throw new Error(`pin_failed:${res.status}:${txt}`)
  }
  const out = await res.json() as any
  const cid = out.IpfsHash || out.cid || out.hash
  if (!cid) throw new Error('pin_no_cid')
  return { cid, uri: `ipfs://${cid}` }
}

/**
 * POST /api/agents/metadata
 * 
 * Creates and pins ERC-8004 compliant agent metadata to IPFS.
 * Called after Marketplace.listOrUpgrade to get the modelId.
 * 
 * Body:
 * - modelId: number - The model ID from Marketplace
 * - chainId: number - Chain ID (43113 for Fuji)
 * - wallet: string - Agent's payment wallet
 * - name: string - Agent name
 * - description: string - Agent description
 * - pricePerInference: string - Price in wei
 * - image?: string - IPFS URI to agent image
 * - capabilities?: object - Agent capabilities
 * - creator?: object - Creator info
 * - marketplaceAddress: string - Marketplace contract address
 * - agentRegistryAddress: string - AgentRegistry contract address
 * 
 * Returns:
 * - cid: IPFS CID
 * - uri: Full IPFS URI
 * - metadata: The full ERC-8004 metadata object
 */
export async function POST(req: Request) {
  try {
    const body = await req.json()
    
    const {
      modelId,
      chainId,
      wallet,
      name,
      description,
      pricePerInference = DEFAULT_PRICE_PER_INFERENCE,
      image,
      capabilities,
      creator,
      marketplaceAddress,
      agentRegistryAddress,
      agentId = 0 // Will be updated after registration
    } = body
    
    if (!modelId || !chainId || !wallet || !name || !marketplaceAddress || !agentRegistryAddress) {
      return NextResponse.json(
        { ok: false, error: 'Missing required fields: modelId, chainId, wallet, name, marketplaceAddress, agentRegistryAddress' },
        { status: 400 }
      )
    }
    
    // Build ERC-8004 compliant metadata
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://wasiai.com'
    
    const agentMetadata = buildAgentMetadata({
      name,
      description: description || `AI Agent: ${name}`,
      wallet,
      modelId: Number(modelId),
      chainId: Number(chainId),
      marketplaceAddress,
      agentRegistryAddress,
      agentId: Number(agentId),
      pricePerInference: String(pricePerInference),
      image,
      capabilities,
      creator,
      baseUrl
    })
    
    // Pin to IPFS
    const pinned = await pinJSONToIPFS(agentMetadata)
    
    return NextResponse.json({
      ok: true,
      ...pinned,
      metadata: agentMetadata
    })
  } catch (e: any) {
    console.error('Agent metadata error:', e)
    return NextResponse.json(
      { ok: false, error: String(e?.message || e) },
      { status: 500 }
    )
  }
}
