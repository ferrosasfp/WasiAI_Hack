/**
 * Script de utilidad para verificar ownership de un modelo en testnet
 * 
 * Uso:
 * npx tsx scripts/verify-model-ownership.ts <modelId> <walletAddress>
 * 
 * Ejemplo:
 * npx tsx scripts/verify-model-ownership.ts 1 0xYourWalletAddress
 */

import { createPublicClient, http, formatEther } from 'viem'
import { avalancheFuji, baseSepolia } from 'viem/chains'
import { config } from 'dotenv'
import { resolve } from 'path'

// Cargar variables de entorno desde .env.local
config({ path: resolve(process.cwd(), '.env.local') })

// ABI mínimo necesario
const MARKETPLACE_ABI = [
  {
    inputs: [{ name: 'modelId', type: 'uint256' }],
    name: 'getModel',
    outputs: [
      { name: 'owner', type: 'address' },
      { name: 'uri', type: 'string' },
      { name: 'listed', type: 'bool' },
      { name: 'pricePerpetual', type: 'uint256' },
      { name: 'priceSubscription', type: 'uint256' },
      { name: 'defaultDuration', type: 'uint256' },
      { name: 'deliveryRights', type: 'uint8' },
      { name: 'deliveryMode', type: 'uint8' },
      { name: 'termsHash', type: 'bytes32' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
] as const

// Función para obtener contract address desde env vars
function getMarketAddress(chainId: number): string | undefined {
  const key = `NEXT_PUBLIC_EVM_MARKET_${chainId}`
  return process.env[key]
}

// Helper para formatear rights bitmask
function formatRights(bitmask: number): string {
  const rights: string[] = []
  if (bitmask & 1) rights.push('API')
  if (bitmask & 2) rights.push('Download')
  if (bitmask & 4) rights.push('Transferable')
  return rights.join(' + ') || 'None'
}

// Helper para formatear delivery mode
function formatDeliveryMode(mode: number): string {
  switch (mode) {
    case 1: return 'API only'
    case 2: return 'Download only'
    case 3: return 'Both (API + Download)'
    default: return 'Unknown'
  }
}

async function main() {
  // Parsear argumentos
  const args = process.argv.slice(2)
  if (args.length < 2) {
    console.error('❌ Uso: npx tsx scripts/verify-model-ownership.ts <modelId> <walletAddress>')
    console.error('   Ejemplo: npx tsx scripts/verify-model-ownership.ts 1 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb')
    process.exit(1)
  }

  const modelId = BigInt(args[0])
  const walletAddress = args[1].toLowerCase()

  // Seleccionar chain (default Fuji)
  const chainId = parseInt(process.env.NEXT_PUBLIC_EVM_DEFAULT_CHAIN_ID || '43113')
  const chain = chainId === 84532 ? baseSepolia : avalancheFuji
  const contractAddress = getMarketAddress(chainId)

  if (!contractAddress) {
    console.error(`❌ Error: Contract address no configurado para chainId ${chainId}`)
    console.error(`   Por favor configura NEXT_PUBLIC_EVM_MARKET_${chainId} en .env.local`)
    process.exit(1)
  }

  console.log('\n🔍 Verificando ownership del modelo...\n')
  console.log(`Chain: ${chain.name} (${chainId})`)
  console.log(`Contract: ${contractAddress}`)
  console.log(`Model ID: ${modelId}`)
  console.log(`Wallet: ${walletAddress}\n`)

  // Crear client
  const client = createPublicClient({
    chain,
    transport: http(),
  })

  try {
    // Leer datos del modelo
    const model = await client.readContract({
      address: contractAddress as `0x${string}`,
      abi: MARKETPLACE_ABI,
      functionName: 'getModel',
      args: [modelId],
    })

    const [owner, uri, listed, pricePerpetual, priceSubscription, defaultDuration, deliveryRights, deliveryMode, termsHash] = model

    // Verificar ownership
    const isOwner = owner.toLowerCase() === walletAddress
    const symbol = chainId === 43113 ? 'AVAX' : 'ETH'

    console.log('═══════════════════════════════════════════════════════')
    console.log(`📊 INFORMACIÓN DEL MODELO #${modelId}`)
    console.log('═══════════════════════════════════════════════════════\n')

    console.log(`🔑 Owner:          ${owner}`)
    console.log(`👤 Tu wallet:      ${walletAddress}`)
    console.log(`${isOwner ? '✅' : '❌'} Eres owner:      ${isOwner ? 'SÍ' : 'NO'}\n`)

    console.log(`📋 Estado:         ${listed ? '✅ Listado' : '❌ No listado'}`)
    console.log(`📄 URI:            ${uri.substring(0, 50)}${uri.length > 50 ? '...' : ''}`)
    console.log(`🔗 Terms Hash:     ${termsHash}\n`)

    console.log(`💰 Precios:`)
    console.log(`   Perpetual:      ${formatEther(pricePerpetual)} ${symbol}`)
    console.log(`   Subscription:   ${formatEther(priceSubscription)} ${symbol}/month`)
    console.log(`   Duración base:  ${defaultDuration} días\n`)

    console.log(`🎯 Derechos y Entrega:`)
    console.log(`   Rights:         ${formatRights(deliveryRights)} (bitmask: ${deliveryRights})`)
    console.log(`   Delivery Mode:  ${formatDeliveryMode(deliveryMode)}\n`)

    console.log('═══════════════════════════════════════════════════════')

    if (isOwner) {
      console.log('\n✅ AUTORIZADO: Puedes editar este modelo\n')
      console.log('📝 Acciones disponibles:')
      console.log('   1. Quick Edit → Cambiar precios, duración, derechos, terms')
      console.log('   2. Toggle Listed → Listar/Deslistar modelo')
      console.log('   3. Upgrade → Crear nueva versión con mismo slug\n')
    } else {
      console.log('\n❌ NO AUTORIZADO: No eres el owner de este modelo\n')
      console.log('💡 Para testear la funcionalidad de edición:')
      console.log('   1. Publica un nuevo modelo con tu wallet actual')
      console.log('   2. O usa una wallet que sea owner del modelo existente\n')
    }

    // Verificar balance de wallet
    const balance = await client.getBalance({ address: walletAddress as `0x${string}` })
    console.log(`💳 Balance de wallet: ${formatEther(balance)} ${symbol}`)
    
    if (balance < BigInt(1e16)) { // < 0.01 ETH/AVAX
      console.log(`⚠️  WARNING: Balance bajo. Considera obtener más fondos del faucet\n`)
    }

  } catch (error: any) {
    console.error('\n❌ Error al leer el modelo:\n')
    
    if (error.message?.includes('execution reverted')) {
      console.error('El modelo probablemente no existe.')
      console.error(`Verifica que el modelId ${modelId} esté publicado en la red.\n`)
    } else if (error.message?.includes('ECONNREFUSED') || error.message?.includes('fetch failed')) {
      console.error('No se pudo conectar al RPC.')
      console.error('Verifica tu conexión a internet o prueba con otro RPC endpoint.\n')
    } else {
      console.error(error.message)
    }
    
    console.error('\n💡 Troubleshooting:')
    console.error('   - Verifica que el contract address sea correcto')
    console.error('   - Verifica que estés en la red correcta')
    console.error('   - Verifica que el modelo exista on-chain\n')
    
    process.exit(1)
  }
}

main()
