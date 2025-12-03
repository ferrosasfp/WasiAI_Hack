/**
 * Update MarketplaceV2 payment token to MockUSDC
 */

const { ethers } = require('ethers')
require('dotenv').config({ path: '.env.local' })

const MARKETPLACE_ADDRESS = '0xdDF773Bb0a9a6F186175fB39CA166DA17994491E'

// Toggle between MockUSDC and Circle USDC:
const MOCK_USDC_ADDRESS = '0xCDa6E1C8340550aC412Ee9BC59ae4Db46745C53e'    // MockUSDC (unlimited mint)
const CIRCLE_USDC_ADDRESS = '0x5425890298aed601595a70AB815c96711a31Bc65'  // Circle USDC (faucet only)

// ⬇️ CHANGE THIS TO SWITCH TOKENS ⬇️
const USE_CIRCLE_USDC = false  // true = Circle USDC, false = MockUSDC
const TARGET_USDC = USE_CIRCLE_USDC ? CIRCLE_USDC_ADDRESS : MOCK_USDC_ADDRESS
const RPC_URL = process.env.NEXT_PUBLIC_AVALANCHE_FUJI_RPC || 'https://api.avax-test.network/ext/bc/C/rpc'

const MARKETPLACE_ABI = [
  'function setPaymentToken(address _token) external',
  'function paymentToken() view returns (address)',
  'function owner() view returns (address)',
]

async function main() {
  console.log('='.repeat(60))
  console.log('Update MarketplaceV2 Payment Token')
  console.log('='.repeat(60))
  
  const provider = new ethers.JsonRpcProvider(RPC_URL)
  const privateKey = process.env.PRIVATE_KEY
  
  if (!privateKey) {
    console.error('❌ PRIVATE_KEY not found in .env.local')
    process.exit(1)
  }
  
  const wallet = new ethers.Wallet(privateKey, provider)
  const marketplace = new ethers.Contract(MARKETPLACE_ADDRESS, MARKETPLACE_ABI, wallet)
  
  console.log(`Wallet: ${wallet.address}`)
  console.log(`Marketplace: ${MARKETPLACE_ADDRESS}`)
  console.log(`Target USDC: ${TARGET_USDC}`)
  console.log(`Type: ${USE_CIRCLE_USDC ? 'Circle USDC (faucet)' : 'MockUSDC (unlimited)'}`)
  console.log('')
  
  // Check current token
  const currentToken = await marketplace.paymentToken()
  console.log(`Current payment token: ${currentToken}`)
  
  if (currentToken.toLowerCase() === TARGET_USDC.toLowerCase()) {
    console.log(`✅ Already set to ${USE_CIRCLE_USDC ? 'Circle USDC' : 'MockUSDC'}!`)
    return
  }
  
  // Update token
  console.log('')
  console.log('📦 Updating payment token...')
  const tx = await marketplace.setPaymentToken(TARGET_USDC)
  console.log(`   TX: ${tx.hash}`)
  await tx.wait()
  console.log('   ✅ Payment token updated!')
  
  // Verify
  const newToken = await marketplace.paymentToken()
  console.log(`   New payment token: ${newToken}`)
}

main().catch(console.error)
