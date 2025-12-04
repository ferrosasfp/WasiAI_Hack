import hre from "hardhat";

/**
 * Check x402 USDC balances and payment history
 * 
 * Usage:
 *   npx hardhat run scripts/checkX402Balances.ts --network avax
 */
async function main() {
  const { ethers } = hre as any;
  
  // x402 uses different USDC address on Fuji
  // This is the official x402 USDC on Avalanche Fuji
  const USDC_X402 = '0x5425890298aed601595a70AB815c96711a31Bc65';
  
  // Marketplace USDC (for license purchases)
  const USDC_MARKETPLACE = '0xCDa6E1C8340550aC412Ee9BC59ae4Db46745C53e';
  
  // Your wallet (seller/recipient)
  const SELLER_WALLET = process.env.SELLER_WALLET || '0xfb652f4506731aC58E51b39DCa4F5ECDcb2C1543';
  
  console.log('='.repeat(70));
  console.log('x402 INFERENCE PAYMENT CHECK');
  console.log('='.repeat(70));
  console.log('');
  console.log('Seller Wallet:', SELLER_WALLET);
  console.log('');
  
  // Check x402 USDC balance
  console.log('─'.repeat(70));
  console.log('USDC BALANCES');
  console.log('─'.repeat(70));
  
  const usdcX402 = await ethers.getContractAt('IERC20', USDC_X402);
  const usdcMarketplace = await ethers.getContractAt('IERC20', USDC_MARKETPLACE);
  
  const balanceX402 = await usdcX402.balanceOf(SELLER_WALLET);
  const balanceMarketplace = await usdcMarketplace.balanceOf(SELLER_WALLET);
  
  console.log('');
  console.log('  x402 USDC (inference payments):');
  console.log(`    Contract: ${USDC_X402}`);
  console.log(`    Balance: ${ethers.formatUnits(balanceX402, 6)} USDC`);
  console.log('');
  console.log('  Marketplace USDC (license purchases):');
  console.log(`    Contract: ${USDC_MARKETPLACE}`);
  console.log(`    Balance: ${ethers.formatUnits(balanceMarketplace, 6)} USDC`);
  
  // Explain the flow
  console.log('');
  console.log('─'.repeat(70));
  console.log('x402 PAYMENT FLOW');
  console.log('─'.repeat(70));
  console.log('');
  console.log('  x402 payments go DIRECTLY to the seller wallet:');
  console.log('');
  console.log('  1. Client requests inference → 402 Payment Required');
  console.log('  2. Client signs EIP-3009 transferWithAuthorization');
  console.log('  3. Client sends X-PAYMENT header with signed payload');
  console.log('  4. Server sends to Facilitator (Ultravioleta DAO)');
  console.log('  5. Facilitator executes on-chain transfer:');
  console.log('     USDC.transferWithAuthorization(client → seller)');
  console.log('  6. USDC goes DIRECTLY to seller wallet');
  console.log('');
  console.log('  ⚠️  NO USDC is stored in any WasiAI contract!');
  console.log('  → All x402 payments are peer-to-peer via the Facilitator');
  console.log('');
  
  // Check Facilitator
  console.log('─'.repeat(70));
  console.log('FACILITATOR INFO');
  console.log('─'.repeat(70));
  console.log('');
  console.log('  Current Facilitator: Ultravioleta DAO');
  console.log('  URL: https://facilitator.ultravioletadao.xyz');
  console.log('  Network: Avalanche Fuji (43113)');
  console.log('');
  console.log('  The Facilitator:');
  console.log('    ✅ Verifies payment signatures');
  console.log('    ✅ Executes on-chain transfers');
  console.log('    ✅ Returns transaction hash');
  console.log('    ❌ Does NOT hold any funds');
  console.log('');
  
  // Summary
  console.log('─'.repeat(70));
  console.log('SUMMARY');
  console.log('─'.repeat(70));
  console.log('');
  
  if (balanceX402 > 0n) {
    console.log(`  💰 You have received ${ethers.formatUnits(balanceX402, 6)} USDC from x402 inference payments`);
  } else {
    console.log('  ℹ️  No x402 USDC received yet (or different USDC contract used)');
  }
  
  console.log('');
  console.log('  To see payment history, check:');
  console.log('  1. Snowtrace: https://testnet.snowtrace.io/address/' + SELLER_WALLET);
  console.log('  2. Filter by USDC transfers TO your address');
  console.log('  3. Or call: curl http://localhost:3000/api/inference/history');
  console.log('');
  console.log('='.repeat(70));
}

main().catch(console.error);
