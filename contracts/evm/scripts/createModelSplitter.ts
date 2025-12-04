import hre from "hardhat";

/**
 * Create a splitter for a specific model
 * 
 * Usage:
 *   MODEL_ID=1 npx hardhat run scripts/createModelSplitter.ts --network avax
 */
async function main() {
  const { ethers } = hre as any;
  
  const modelId = process.env.MODEL_ID;
  if (!modelId) {
    console.error('❌ MODEL_ID environment variable is required');
    console.log('Usage: MODEL_ID=1 npx hardhat run scripts/createModelSplitter.ts --network avax');
    process.exit(1);
  }
  
  console.log('='.repeat(70));
  console.log(`CREATING SPLITTER FOR MODEL ${modelId}`);
  console.log('='.repeat(70));
  console.log('');
  
  // Contract addresses
  const FACTORY_ADDRESS = process.env.SPLITTER_FACTORY_ADDRESS || ''; // Set after deploy
  const MARKETPLACE_ADDRESS = '0x278E6E5417d7af738368dA4a105A0ca80b89C7db';
  
  if (!FACTORY_ADDRESS) {
    console.error('❌ SPLITTER_FACTORY_ADDRESS not set. Deploy factory first.');
    process.exit(1);
  }
  
  // Get contracts
  const factory = await ethers.getContractAt('SplitterFactory', FACTORY_ADDRESS);
  const marketplace = await ethers.getContractAt('MarketplaceV2', MARKETPLACE_ADDRESS);
  
  // Check if splitter already exists
  const existingSplitter = await factory.getSplitter(modelId);
  if (existingSplitter !== ethers.ZeroAddress) {
    console.log('⚠️  Splitter already exists for this model');
    console.log('   Address:', existingSplitter);
    
    // Show current config
    const splitter = await ethers.getContractAt('ModelSplitter', existingSplitter);
    const config = await splitter.getSplitConfig();
    console.log('');
    console.log('   Configuration:');
    console.log('     Seller:', config._seller);
    console.log('     Creator:', config._creator);
    console.log('     Royalty:', config._royaltyBps.toString(), 'bps');
    console.log('     Marketplace:', config._marketplaceBps.toString(), 'bps');
    return;
  }
  
  // Get model info from Marketplace
  console.log('Fetching model info from Marketplace...');
  const model = await marketplace.models(modelId);
  
  if (!model.listed) {
    console.error('❌ Model is not listed');
    process.exit(1);
  }
  
  console.log('');
  console.log('Model Info:');
  console.log('  Name:', model.name);
  console.log('  Owner (Seller):', model.owner);
  console.log('  Creator:', model.creator);
  console.log('  Royalty:', model.royaltyBps.toString(), 'bps (', Number(model.royaltyBps) / 100, '%)');
  console.log('');
  
  // Predict address
  const predictedAddress = await factory.predictSplitterAddress(modelId);
  console.log('Predicted splitter address:', predictedAddress);
  console.log('');
  
  // Create splitter
  console.log('Creating splitter...');
  const tx = await factory.createSplitter(
    modelId,
    model.owner,    // seller
    model.creator,  // creator
    model.royaltyBps
  );
  const receipt = await tx.wait();
  
  // Get actual address
  const splitterAddress = await factory.getSplitter(modelId);
  
  console.log('');
  console.log('✅ Splitter created!');
  console.log('   Address:', splitterAddress);
  console.log('   TX:', receipt.hash);
  console.log('   Gas used:', receipt.gasUsed.toString());
  console.log('');
  
  // Verify it matches prediction
  if (splitterAddress === predictedAddress) {
    console.log('✅ Address matches prediction (deterministic)');
  }
  console.log('');
  
  // Show split example
  const defaultMarketplaceBps = await factory.defaultMarketplaceBps();
  const sellerBps = 10000n - model.royaltyBps - defaultMarketplaceBps;
  
  console.log('─'.repeat(70));
  console.log('SPLIT CONFIGURATION');
  console.log('─'.repeat(70));
  console.log('');
  console.log('  For every $1.00 USDC received:');
  console.log(`    Seller:      $${(Number(sellerBps) / 10000).toFixed(4)} (${Number(sellerBps) / 100}%)`);
  console.log(`    Creator:     $${(Number(model.royaltyBps) / 10000).toFixed(4)} (${Number(model.royaltyBps) / 100}%)`);
  console.log(`    Marketplace: $${(Number(defaultMarketplaceBps) / 10000).toFixed(4)} (${Number(defaultMarketplaceBps) / 100}%)`);
  console.log('');
  
  console.log('─'.repeat(70));
  console.log('UPDATE x402 payTo');
  console.log('─'.repeat(70));
  console.log('');
  console.log(`  For Model ${modelId}, use this address as payTo:`);
  console.log(`  ${splitterAddress}`);
  console.log('');
  console.log('='.repeat(70));
}

main().catch(console.error);
