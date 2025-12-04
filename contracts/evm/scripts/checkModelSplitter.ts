import hre from "hardhat";

/**
 * Check the status and balances of a model's splitter
 * 
 * Usage:
 *   MODEL_ID=1 npx hardhat run scripts/checkModelSplitter.ts --network avax
 */
async function main() {
  const { ethers } = hre as any;
  
  const modelId = process.env.MODEL_ID;
  if (!modelId) {
    console.error('❌ MODEL_ID environment variable is required');
    console.log('Usage: MODEL_ID=1 npx hardhat run scripts/checkModelSplitter.ts --network avax');
    process.exit(1);
  }
  
  console.log('='.repeat(70));
  console.log(`MODEL ${modelId} SPLITTER STATUS`);
  console.log('='.repeat(70));
  console.log('');
  
  const FACTORY_ADDRESS = process.env.SPLITTER_FACTORY_ADDRESS || '';
  const USDC_ADDRESS = '0x5425890298aed601595a70AB815c96711a31Bc65';
  
  if (!FACTORY_ADDRESS) {
    console.error('❌ SPLITTER_FACTORY_ADDRESS not set');
    process.exit(1);
  }
  
  const factory = await ethers.getContractAt('SplitterFactory', FACTORY_ADDRESS);
  const usdc = await ethers.getContractAt('IERC20', USDC_ADDRESS);
  
  // Check if splitter exists
  const splitterAddress = await factory.getSplitter(modelId);
  
  if (splitterAddress === ethers.ZeroAddress) {
    console.log('❌ No splitter exists for this model');
    console.log('');
    console.log('Create one with:');
    console.log(`  MODEL_ID=${modelId} npx hardhat run scripts/createModelSplitter.ts --network avax`);
    return;
  }
  
  console.log('Splitter Address:', splitterAddress);
  console.log('');
  
  const splitter = await ethers.getContractAt('ModelSplitter', splitterAddress);
  
  // Get configuration
  const config = await splitter.getSplitConfig();
  
  console.log('─'.repeat(70));
  console.log('CONFIGURATION');
  console.log('─'.repeat(70));
  console.log('');
  console.log('  Model ID:', config._modelId.toString());
  console.log('  Seller:', config._seller);
  console.log('  Creator:', config._creator);
  console.log('  Marketplace:', config._marketplaceWallet);
  console.log('  Royalty:', config._royaltyBps.toString(), 'bps (', Number(config._royaltyBps) / 100, '%)');
  console.log('  Marketplace Fee:', config._marketplaceBps.toString(), 'bps (', Number(config._marketplaceBps) / 100, '%)');
  console.log('');
  
  // Get balances
  const allBalances = await splitter.getAllBalances();
  const totalInContract = await usdc.balanceOf(splitterAddress);
  const totalDistributed = await splitter.totalDistributed();
  
  console.log('─'.repeat(70));
  console.log('BALANCES');
  console.log('─'.repeat(70));
  console.log('');
  console.log('  Total USDC in contract:', ethers.formatUnits(totalInContract, 6), 'USDC');
  console.log('  Total distributed:', ethers.formatUnits(totalDistributed, 6), 'USDC');
  console.log('  Pending distribution:', ethers.formatUnits(allBalances.pendingToDistribute, 6), 'USDC');
  console.log('');
  console.log('  Pending Withdrawals:');
  console.log('    Seller:', ethers.formatUnits(allBalances.sellerBalance, 6), 'USDC');
  console.log('    Creator:', ethers.formatUnits(allBalances.creatorBalance, 6), 'USDC');
  console.log('    Marketplace:', ethers.formatUnits(allBalances.marketplaceBalance, 6), 'USDC');
  console.log('');
  
  // Show split example
  const sellerBps = 10000n - config._royaltyBps - config._marketplaceBps;
  
  console.log('─'.repeat(70));
  console.log('SPLIT EXAMPLE ($1.00 USDC)');
  console.log('─'.repeat(70));
  console.log('');
  console.log(`  Seller:      $${(Number(sellerBps) / 10000).toFixed(4)} (${Number(sellerBps) / 100}%)`);
  console.log(`  Creator:     $${(Number(config._royaltyBps) / 10000).toFixed(4)} (${Number(config._royaltyBps) / 100}%)`);
  console.log(`  Marketplace: $${(Number(config._marketplaceBps) / 10000).toFixed(4)} (${Number(config._marketplaceBps) / 100}%)`);
  console.log('');
  
  // Instructions
  console.log('─'.repeat(70));
  console.log('ACTIONS');
  console.log('─'.repeat(70));
  console.log('');
  if (allBalances.pendingToDistribute > 0n) {
    console.log('  📦 There are funds to distribute!');
    console.log('     Call: splitter.distribute()');
    console.log('');
  }
  console.log('  💰 To withdraw (as seller/creator/marketplace):');
  console.log('     Call: splitter.withdraw()');
  console.log('');
  console.log('  🚀 To distribute AND withdraw in one TX:');
  console.log('     Call: splitter.distributeAndWithdraw()');
  console.log('');
  console.log('='.repeat(70));
}

main().catch(console.error);
