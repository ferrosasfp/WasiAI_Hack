import hre from "hardhat";

/**
 * Check InferenceSplitter balances and pending withdrawals
 * 
 * Usage:
 *   npx hardhat run scripts/checkSplitterBalances.ts --network avax
 */
async function main() {
  const { ethers } = hre as any;
  
  const SPLITTER_ADDRESS = process.env.INFERENCE_SPLITTER_ADDRESS || '0x42124B2962eE92524aD37800537F9876621D81B6';
  const USDC_ADDRESS = '0x5425890298aed601595a70AB815c96711a31Bc65';
  
  console.log('='.repeat(70));
  console.log('INFERENCE SPLITTER BALANCES');
  console.log('='.repeat(70));
  console.log('');
  console.log('InferenceSplitter:', SPLITTER_ADDRESS);
  console.log('');
  
  // Get contracts
  const splitter = await ethers.getContractAt('InferenceSplitter', SPLITTER_ADDRESS);
  const usdc = await ethers.getContractAt('IERC20', USDC_ADDRESS);
  
  // Get contract state
  const marketplaceWallet = await splitter.marketplaceWallet();
  const totalAccumulated = await splitter.totalAccumulated();
  const contractBalance = await usdc.balanceOf(SPLITTER_ADDRESS);
  const unallocated = await splitter.getUnallocatedBalance();
  
  console.log('─'.repeat(70));
  console.log('CONTRACT STATE');
  console.log('─'.repeat(70));
  console.log('');
  console.log('  Marketplace Wallet:', marketplaceWallet);
  console.log('  Total USDC in contract:', ethers.formatUnits(contractBalance, 6), 'USDC');
  console.log('  Total allocated:', ethers.formatUnits(totalAccumulated, 6), 'USDC');
  console.log('  Unallocated (pending):', ethers.formatUnits(unallocated, 6), 'USDC');
  console.log('');
  
  // Check balances for known addresses
  console.log('─'.repeat(70));
  console.log('PENDING WITHDRAWALS');
  console.log('─'.repeat(70));
  console.log('');
  
  // Get unique addresses from configured splits
  const addressesToCheck = new Set<string>();
  addressesToCheck.add(marketplaceWallet);
  
  // Check models 1-5 for configured splits
  for (let modelId = 1; modelId <= 5; modelId++) {
    try {
      const split = await splitter.getSplit(modelId);
      if (split.configured) {
        addressesToCheck.add(split.seller);
        addressesToCheck.add(split.creator);
      }
    } catch (e) {
      // Model doesn't exist
    }
  }
  
  let totalPending = 0n;
  for (const addr of addressesToCheck) {
    const balance = await splitter.getBalance(addr);
    if (balance > 0n) {
      console.log(`  ${addr.slice(0, 10)}...${addr.slice(-8)}: ${ethers.formatUnits(balance, 6)} USDC`);
      totalPending += balance;
    }
  }
  
  if (totalPending === 0n) {
    console.log('  No pending withdrawals');
  } else {
    console.log('');
    console.log('  Total pending:', ethers.formatUnits(totalPending, 6), 'USDC');
  }
  
  // Show configured splits
  console.log('');
  console.log('─'.repeat(70));
  console.log('CONFIGURED SPLITS');
  console.log('─'.repeat(70));
  console.log('');
  
  for (let modelId = 1; modelId <= 5; modelId++) {
    try {
      const split = await splitter.getSplit(modelId);
      if (split.configured) {
        console.log(`  Model ${modelId}:`);
        console.log(`    Seller: ${split.seller}`);
        console.log(`    Creator: ${split.creator}`);
        console.log(`    Royalty: ${split.royaltyBps.toString()} bps (${Number(split.royaltyBps) / 100}%)`);
        console.log(`    Marketplace: ${split.marketplaceBps.toString()} bps (${Number(split.marketplaceBps) / 100}%)`);
        
        // Calculate example split for $1.00
        const example = 1_000_000n; // $1.00 in USDC base units
        const marketplaceAmount = (example * split.marketplaceBps) / 10000n;
        const creatorAmount = (example * split.royaltyBps) / 10000n;
        const sellerAmount = example - marketplaceAmount - creatorAmount;
        
        console.log(`    Example $1.00 split:`);
        console.log(`      Seller: $${ethers.formatUnits(sellerAmount, 6)}`);
        console.log(`      Creator: $${ethers.formatUnits(creatorAmount, 6)}`);
        console.log(`      Marketplace: $${ethers.formatUnits(marketplaceAmount, 6)}`);
        console.log('');
      }
    } catch (e) {
      // Model doesn't exist
    }
  }
  
  // Pending payments queue
  console.log('─'.repeat(70));
  console.log('PENDING PAYMENTS QUEUE');
  console.log('─'.repeat(70));
  console.log('');
  
  try {
    const [total, pending] = await splitter.getPendingPaymentsCount();
    console.log(`  Total registered: ${total.toString()}`);
    console.log(`  Pending to process: ${pending.toString()}`);
    
    if (pending > 0n) {
      console.log('');
      console.log('  Recent pending payments:');
      const start = Number(total) - Math.min(Number(pending), 5);
      for (let i = start; i < Number(total); i++) {
        const [modelId, amount, txHash, processed] = await splitter.getPendingPayment(i);
        console.log(`    #${i}: Model ${modelId}, $${ethers.formatUnits(amount, 6)} USDC, ${processed ? '✅' : '⏳'}`);
      }
    }
  } catch (e) {
    console.log('  Queue not available (older contract version)');
  }
  
  // Instructions
  console.log('');
  console.log('─'.repeat(70));
  console.log('HOW IT WORKS');
  console.log('─'.repeat(70));
  console.log('');
  console.log('  1. x402 Facilitator sends USDC to InferenceSplitter');
  console.log('  2. API calls registerPendingPayment(modelId, amount, txHash)');
  console.log('  3. Anyone calls processPendingPayments(100) to distribute');
  console.log('  4. Each recipient calls withdraw() to claim their balance');
  console.log('');
  console.log('  Commands:');
  console.log('    splitter.processPendingPayments(100)  // Process up to 100 payments');
  console.log('    splitter.withdraw()                   // Claim your balance');
  console.log('');
  console.log('='.repeat(70));
}

main().catch(console.error);
