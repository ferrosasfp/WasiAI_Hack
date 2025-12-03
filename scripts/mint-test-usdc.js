/**
 * Mint Test USDC on Avalanche Fuji
 * 
 * The USDC on Fuji (0x5425890298aed601595a70AB815c96711a31Bc65) is a test token
 * that may have a public mint function or require using Circle's faucet.
 * 
 * Usage:
 *   node scripts/mint-test-usdc.js [amount] [recipient]
 *   
 * Examples:
 *   node scripts/mint-test-usdc.js 1000        # Mint 1000 USDC to deployer
 *   node scripts/mint-test-usdc.js 500 0x123   # Mint 500 USDC to specific address
 */

const { ethers } = require('ethers')
require('dotenv').config({ path: '.env.local' })

const USDC_ADDRESS = '0xCDa6E1C8340550aC412Ee9BC59ae4Db46745C53e' // MockUSDC
const RPC_URL = process.env.NEXT_PUBLIC_AVALANCHE_FUJI_RPC || 'https://api.avax-test.network/ext/bc/C/rpc'

// Standard ERC20 + mint ABI
const ERC20_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function mint(address to, uint256 amount)',
  'function transfer(address to, uint256 amount) returns (bool)',
]

async function main() {
  const amount = process.argv[2] || '1000' // Default 1000 USDC
  const recipient = process.argv[3] || null // Default to deployer
  
  console.log('='.repeat(60))
  console.log('Mint Test USDC on Avalanche Fuji')
  console.log('='.repeat(60))
  
  // Setup provider and wallet
  const provider = new ethers.JsonRpcProvider(RPC_URL)
  const privateKey = process.env.PRIVATE_KEY
  
  if (!privateKey) {
    console.error('❌ PRIVATE_KEY not found in .env.local')
    console.log('\nAlternative: Use Circle Faucet')
    console.log('   https://faucet.circle.com/')
    console.log('   Select "Avalanche Fuji" and enter your wallet address')
    process.exit(1)
  }
  
  const wallet = new ethers.Wallet(privateKey, provider)
  const targetAddress = recipient || wallet.address
  
  console.log(`Wallet: ${wallet.address}`)
  console.log(`Target: ${targetAddress}`)
  console.log(`Amount: ${amount} USDC`)
  console.log('')
  
  // Connect to USDC contract
  const usdc = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, wallet)
  
  // Get current balance
  const decimals = await usdc.decimals()
  const symbol = await usdc.symbol()
  const balanceBefore = await usdc.balanceOf(targetAddress)
  
  console.log(`Token: ${symbol} (${decimals} decimals)`)
  console.log(`Balance before: ${ethers.formatUnits(balanceBefore, decimals)} ${symbol}`)
  console.log('')
  
  // Try to mint
  const amountWei = ethers.parseUnits(amount, decimals)
  
  try {
    console.log('📦 Attempting to mint...')
    const tx = await usdc.mint(targetAddress, amountWei)
    console.log(`   TX: ${tx.hash}`)
    await tx.wait()
    console.log('   ✅ Mint successful!')
    
    const balanceAfter = await usdc.balanceOf(targetAddress)
    console.log(`\nBalance after: ${ethers.formatUnits(balanceAfter, decimals)} ${symbol}`)
  } catch (e) {
    console.log('❌ Mint failed (contract may not have public mint)')
    console.log(`   Error: ${e.message?.slice(0, 100)}`)
    console.log('')
    console.log('📝 Alternative options:')
    console.log('   1. Circle Faucet: https://faucet.circle.com/')
    console.log('   2. Avalanche Faucet: https://core.app/tools/testnet-faucet/')
    console.log('   3. Ask in Discord for testnet USDC')
    console.log('')
    console.log('💡 Or deploy your own MockUSDC:')
    console.log('   npx hardhat run scripts/deploy-mock-usdc.js --network avax')
  }
}

main().catch(console.error)
