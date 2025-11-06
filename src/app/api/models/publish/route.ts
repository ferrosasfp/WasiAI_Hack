import { NextResponse } from 'next/server'
import { prisma } from '../../../../server/db'

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

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({})) as any
  const metadata = body?.metadata
  if (!metadata || typeof metadata !== 'object') {
    return NextResponse.json({ ok: false, error: 'invalid_metadata' }, { status: 400 })
  }
  try {
    const pinned = await pinJSONToIPFS(metadata)

    const chain = String(body?.chain || '')
    const network = String(body?.network || '')
    let onchain: any = null

    if (chain === 'evm') {
      // Lazy import ethers to keep edge compatibility if not used
      const { JsonRpcProvider, Wallet, Contract } = await import('ethers') as any
      const fs = await import('fs')
      const path = await import('path')
      const ROOT = process.cwd()
      const deployPath = path.join(ROOT, `contracts/evm/deploy.${network}.json`)
      let marketAddr: string | null = null
      if (fs.existsSync(deployPath)) {
        const deploy = JSON.parse(fs.readFileSync(deployPath, 'utf8'))
        marketAddr = deploy.marketplace
      } else {
        // Fallback a env actual si no hay archivo por red
        marketAddr = process.env.NEXT_PUBLIC_EVM_MARKET || null
      }
      if (!marketAddr) throw new Error(`evm_market_address_missing:${network}`)

      const rpc = network === 'base' ? (process.env.RPC_BASE || '') : network === 'avax' ? (process.env.RPC_AVAX || '') : ''
      if (!rpc) throw new Error('evm_rpc_missing')
      const pk = process.env.PRIVATE_KEY
      if (!pk) throw new Error('evm_private_key_missing')

      const provider = new JsonRpcProvider(rpc)
      const wallet = new Wallet(pk, provider)

      const abi = [
        'function listOrUpgrade(string slug,string name,string uri,uint256 royaltyBps,uint256 pricePerpetual,uint256 priceSubscription,uint256 defaultDurationDays,uint8 deliveryRightsDefault,uint8 deliveryModeHint,bytes32 termsHash)'
      ]
      const market = new Contract(marketAddr, abi, wallet)

      // Map metadata to params
      const slug: string = metadata.slug || ''
      const name: string = metadata.name || ''
      const uri: string = pinned.uri
      const royaltyBps: bigint = BigInt(Number(metadata.royalty_bps || 0))
      const pricePerpetual: bigint = BigInt(Number(metadata.licensePolicy?.perpetual?.priceRef || 0))
      const priceSubscription: bigint = BigInt(Number(metadata.licensePolicy?.subscription?.perMonthPriceRef || 0))
      const defaultDurationDays: bigint = BigInt(Number(metadata.licensePolicy?.defaultDurationDays || 0))
      const rightsArr: string[] = Array.isArray(metadata.licensePolicy?.rights) ? metadata.licensePolicy.rights : []
      const rightsMask: number = (rightsArr.includes('API') ? 1 : 0) | (rightsArr.includes('Download') ? 2 : 0)
      const hintStr: string = (metadata.delivery?.hint || '').toLowerCase()
      const deliveryModeHint: number = hintStr === 'api' ? 1 : hintStr === 'download' ? 2 : 3
      let termsHash: string = String(metadata.licensePolicy?.termsHash || '0x')
      if (!termsHash.startsWith('0x')) termsHash = '0x' + termsHash
      if (termsHash.length !== 66) {
        // fallback hash of termsUrl or empty
        const enc = new TextEncoder().encode(String(metadata.licensePolicy?.termsUrl || ''))
        const buf = await crypto.subtle.digest('SHA-256', enc)
        termsHash = '0x' + Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,'0')).join('')
      }

      const tx = await market.listOrUpgrade(
        slug, name, uri,
        royaltyBps,
        pricePerpetual,
        priceSubscription,
        defaultDurationDays,
        rightsMask,
        deliveryModeHint,
        termsHash
      )
      const receipt = await tx.wait()
      onchain = { network, market: marketAddr, txHash: receipt?.hash }

      // Index in DB
      try {
        await prisma.modelIndex.create({ data: {
          chain: 'evm', network,
          modelId: null, slug, name, uri,
          version: null,
          owner: await wallet.getAddress(),
          txHash: receipt?.hash || null,
        }})
      } catch {}
    }

    if (chain === 'sui') {
      const pkg = process.env.NEXT_PUBLIC_PACKAGE_ID
      const marketId = process.env.NEXT_PUBLIC_MARKET_ID
      const suiRpc = process.env.SUI_RPC_URL || process.env.NEXT_PUBLIC_SUI_RPC_URL || 'https://fullnode.testnet.sui.io:443'
      const suiPriv = process.env.SUI_PRIVATE_KEY
      if (!pkg || !marketId) throw new Error('sui_ids_missing')
      if (!suiPriv) throw new Error('sui_private_key_missing')

      const { SuiClient } = await import('@mysten/sui/client')
      const { Transaction } = await import('@mysten/sui/transactions')
      const { decodeSuiPrivateKey } = await import('@mysten/sui/cryptography')
      const { Ed25519Keypair } = await import('@mysten/sui/keypairs/ed25519')

      const client = new SuiClient({ url: suiRpc })
      const decoded = decodeSuiPrivateKey(suiPriv)
      const kp = Ed25519Keypair.fromSecretKey(decoded.secretKey)

      // Map metadata to params for Move
      const slug: string = metadata.slug || ''
      const name: string = metadata.name || ''
      const uri: string = pinned.uri
      const royalty_bps: bigint = BigInt(Number(metadata.royalty_bps || 0))
      const pricePerpetual: bigint = BigInt(Number(metadata.licensePolicy?.perpetual?.priceRef || 0))
      const priceSubscription: bigint = BigInt(Number(metadata.licensePolicy?.subscription?.perMonthPriceRef || 0))
      const defaultDurationDays: bigint = BigInt(Number(metadata.licensePolicy?.defaultDurationDays || 0))
      const rightsArr: string[] = Array.isArray(metadata.licensePolicy?.rights) ? metadata.licensePolicy.rights : []
      const rightsMask: number = (rightsArr.includes('API') ? 1 : 0) | (rightsArr.includes('Download') ? 2 : 0)
      const hintStr: string = (metadata.delivery?.hint || '').toLowerCase()
      const deliveryModeHint: number = hintStr === 'api' ? 1 : hintStr === 'download' ? 2 : 3
      let termsHash: string = String(metadata.licensePolicy?.termsHash || '0x')
      if (!termsHash.startsWith('0x')) termsHash = '0x' + termsHash
      if (termsHash.length !== 66) {
        const enc = new TextEncoder().encode(String(metadata.licensePolicy?.termsUrl || ''))
        const buf = await crypto.subtle.digest('SHA-256', enc)
        termsHash = '0x' + Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,'0')).join('')
      }
      const termsBytes = Uint8Array.from(Buffer.from(termsHash.slice(2), 'hex'))

      const tx = new Transaction()
      tx.moveCall({
        target: `${pkg}::marketplace::list_or_upgrade`,
        arguments: [
          tx.object(marketId),
          tx.pure.string(slug),
          tx.pure.string(name),
          tx.pure.string(uri),
          tx.pure.u64(royalty_bps),
          tx.pure.u64(pricePerpetual),
          tx.pure.u64(priceSubscription),
          tx.pure.u64(defaultDurationDays),
          tx.pure.u8(rightsMask),
          tx.pure.u8(deliveryModeHint),
          tx.pure.vector('u8', termsBytes),
        ],
      })
      const resp = await client.signAndExecuteTransaction({ signer: kp, transaction: tx, options: { showEffects: true } })
      onchain = { network: 'testnet', digest: (resp as any)?.digest }

      // Index in DB
      try {
        await prisma.modelIndex.create({ data: {
          chain: 'sui', network: 'testnet',
          modelId: null, slug, name, uri,
          version: Number(metadata.version || 1),
          owner: kp.getPublicKey().toSuiAddress(),
          txHash: (resp as any)?.digest || null,
        }})
      } catch {}
    }

    return NextResponse.json({ ok: true, ...pinned, chain, network, onchain })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 })
  }
}
