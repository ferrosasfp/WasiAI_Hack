import { NextResponse } from 'next/server'
import { buildAgentMetadata, DEFAULT_PRICE_PER_INFERENCE } from '@/lib/erc8004'

export const dynamic = 'force-dynamic'

async function pinJSONToIPFS(payload: any) {
  const jwt = process.env.PINATA_JWT
  const key = process.env.PINATA_API_KEY
  const secret = process.env.PINATA_SECRET_KEY
  const headers: Record<string,string> = { 'Content-Type': 'application/json' }
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
 * POST /api/models/publish
 * 
 * This API only uploads metadata to IPFS and returns transaction parameters.
 * The actual blockchain transaction must be signed by the user's wallet in the frontend.
 * 
 * Returns:
 * - cid: IPFS CID of the metadata
 * - uri: Full IPFS URI (ipfs://<cid>)
 * - txParams: Parameters for the listOrUpgrade smart contract call
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({})) as any
  const metadata = body?.metadata
  if (!metadata || typeof metadata !== 'object') {
    return NextResponse.json({ ok: false, error: 'invalid_metadata' }, { status: 400 })
  }
  try {
    // Ensure slug exists: derive from name if missing
    const toSlug = (s: any) => String(s || '')
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[^\w\s-]/g, '')
      .trim()
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 64)
    try {
      const raw = String((metadata as any)?.slug || '').trim()
      if (!raw) {
        const nm = String((metadata as any)?.name || '').trim()
        if (nm) (metadata as any).slug = toSlug(nm)
      } else {
        (metadata as any).slug = toSlug(raw)
      }
    } catch {}

    const pinned = await pinJSONToIPFS(metadata)

    const chain = String(body?.chain || '')
    const network = String(body?.network || '')

    if (chain === 'evm') {
      const { parseUnits } = await import('ethers') as any
      const fs = await import('fs')
      const path = await import('path')
      const ROOT = process.cwd()
      
      // Map network to chainId
      const chainIdMap: Record<string, string> = {
        'avax': '43113',
        'base': '84532'
      }
      const chainId = chainIdMap[network] || ''
      
      // 1. Try .env.local first (source of truth)
      let marketAddr: string | null = chainId ? (process.env[`NEXT_PUBLIC_EVM_MARKET_${chainId}`] || null) : null
      
      // 2. Fallback to deploy.{network}.json if env var not found
      if (!marketAddr) {
        const deployPath = path.join(ROOT, `contracts/evm/deploy.${network}.json`)
        if (fs.existsSync(deployPath)) {
          const deploy = JSON.parse(fs.readFileSync(deployPath, 'utf8'))
          marketAddr = deploy.marketplace
        }
      }
      
      // 3. Final fallback to generic NEXT_PUBLIC_EVM_MARKET
      if (!marketAddr) {
        marketAddr = process.env.NEXT_PUBLIC_EVM_MARKET || null
      }
      
      if (!marketAddr) throw new Error(`evm_market_address_missing:${network}`)

      // Build transaction parameters - DO NOT execute transaction here
      // The frontend will use wagmi/viem to have the user sign the transaction
      const slug: string = metadata.slug || ''
      const name: string = metadata.name || ''
      const uri: string = pinned.uri
      
      // royaltyBps comes from step 4 under licensePolicy.royaltyBps (basis points)
      const royaltyBps: string = String(Number(metadata.licensePolicy?.royaltyBps || 0))
      
      // Convert price to USDC base units (6 decimals)
      const toUsdc = (v:any): string => {
        try { 
          const parsed = parseUnits(String(v ?? '0').replace(/,/g,'').trim() || '0', 6)
          return parsed.toString()
        } catch { return '0' }
      }
      
      const pricePerpetual: string = toUsdc(metadata.licensePolicy?.perpetual?.priceRef)
      const priceSubscription: string = toUsdc(metadata.licensePolicy?.subscription?.perMonthPriceRef)
      const defaultDurationDays: string = String(Number(metadata.licensePolicy?.defaultDurationDays || 0))
      
      const rightsArr: string[] = Array.isArray(metadata.licensePolicy?.rights) ? metadata.licensePolicy.rights : []
      const rightsMask: number = (rightsArr.includes('API') ? 1 : 0) | (rightsArr.includes('Download') ? 2 : 0)
      
      // Derive deliveryModeHint from rightsMask
      const deliveryModeHint: number = rightsMask === 1 ? 1 : rightsMask === 2 ? 2 : 3
      
      let termsHash: string = String(metadata.licensePolicy?.termsHash || '0x')
      if (!termsHash.startsWith('0x')) termsHash = '0x' + termsHash
      if (termsHash.length !== 66) {
        // fallback hash of termsUrl or empty
        const enc = new TextEncoder().encode(String(metadata.licensePolicy?.termsUrl || ''))
        const buf = await crypto.subtle.digest('SHA-256', enc)
        termsHash = '0x' + Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,'0')).join('')
      }

      // Get wallet address and inference price
      const walletAddress = body?.address || ''
      const pricePerInference = metadata.licensePolicy?.inference?.pricePerCall || metadata.pricePerInference || DEFAULT_PRICE_PER_INFERENCE
      
      // Add pricePerInference to model metadata for x402 endpoint
      metadata.pricePerInference = pricePerInference
      if (!metadata.licensePolicy) metadata.licensePolicy = {}
      if (!metadata.licensePolicy.pricing) metadata.licensePolicy.pricing = {}
      metadata.licensePolicy.pricing.inference = { pricePerCall: pricePerInference }
      
      // Re-pin metadata with pricePerInference included
      const pinnedWithPrice = await pinJSONToIPFS(metadata)
      
      // Build agent metadata and pin to IPFS
      const agentMetadata = {
        name,
        description: metadata.summary || metadata.description || `AI Agent: ${name}`,
        wallet: walletAddress,
        pricePerInference,
        image: metadata.cover?.uri || metadata.image,
        capabilities: {
          tasks: metadata.technicalCategories || metadata.categories || [],
          inputModalities: metadata.customer?.inputs ? [metadata.customer.inputs] : [],
          outputModalities: metadata.customer?.outputs ? [metadata.customer.outputs] : []
        },
        creator: metadata.author || {}
      }
      
      // Pin agent metadata to IPFS
      const agentMetadataPinned = await pinJSONToIPFS(agentMetadata)
      
      // Get inference endpoint from demo config or build default
      const inferenceEndpoint = metadata.demo?.endpoint || 
        `${process.env.NEXT_PUBLIC_APP_URL || 'https://wasiai.com'}/api/inference/{modelId}`
      
      // Convert inference price to USDC base units (6 decimals)
      // pricePerInference is in dollars (e.g., "0.01" = $0.01)
      const priceInferenceUsdc = Math.floor(Number(pricePerInference) * 1e6).toString()

      // Return transaction parameters for SINGLE-SIGNATURE flow
      // Uses listOrUpgradeWithAgent to create model + agent in one TX
      const txParams = {
        functionName: 'listOrUpgradeWithAgent',
        args: [
          slug,
          name,
          pinnedWithPrice.uri, // Use updated URI with inference price
          royaltyBps,
          pricePerpetual,
          priceSubscription,
          defaultDurationDays,
          rightsMask,
          deliveryModeHint,
          termsHash,
          // Inference fields
          priceInferenceUsdc,
          walletAddress || '0x0000000000000000000000000000000000000000', // inferenceWallet
          // AgentParams struct
          {
            endpoint: inferenceEndpoint,
            wallet: walletAddress || '0x0000000000000000000000000000000000000000',
            metadataUri: agentMetadataPinned.uri
          }
        ],
        contractAddress: marketAddr,
        chainId: Number(chainId)
      }
      
      // Also provide legacy txParams for backward compatibility (without agent)
      const legacyTxParams = {
        functionName: 'listOrUpgrade',
        args: [
          slug,
          name,
          pinnedWithPrice.uri,
          royaltyBps,
          pricePerpetual,
          priceSubscription,
          defaultDurationDays,
          rightsMask,
          deliveryModeHint,
          termsHash
        ],
        contractAddress: marketAddr,
        chainId: Number(chainId)
      }

      return NextResponse.json({ 
        ok: true, 
        ...pinnedWithPrice, 
        chain, 
        network, 
        txParams,           // Single-signature flow (model + agent)
        legacyTxParams,     // Backward compatible (model only)
        // Include metadata for reference
        metadata: {
          slug,
          name,
          uri: pinnedWithPrice.uri,
          pricePerInference,
          agentMetadataUri: agentMetadataPinned.uri
        }
      })
    }

    // Sui support removed - EVM only
    if (chain === 'sui') {
      return NextResponse.json({ ok: false, error: 'sui_not_supported' }, { status: 400 })
    }

    // Non-EVM chains: just return IPFS data
    return NextResponse.json({ ok: true, ...pinned, chain, network })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 })
  }
}
