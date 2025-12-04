import hre from "hardhat";

/**
 * Configure splits for existing models in InferenceSplitter
 * 
 * Usage:
 *   npx hardhat run scripts/configureSplits.ts --network avax
 * 
 * Environment variables:
 *   INFERENCE_SPLITTER_ADDRESS - InferenceSplitter contract address
 */
async function main() {
  const { ethers } = hre as any;
  
  console.log('='.repeat(70));
  console.log('CONFIGURING SPLITS FOR MODELS');
  console.log('='.repeat(70));
  console.log('');
  
  // Contract addresses
  const SPLITTER_ADDRESS = process.env.INFERENCE_SPLITTER_ADDRESS || '0x42124B2962eE92524aD37800537F9876621D81B6';
  const MARKETPLACE_ADDRESS = process.env.MARKETPLACE_ADDRESS || '0x278E6E5417d7af738368dA4a105A0ca80b89C7db';
  
  console.log('InferenceSplitter:', SPLITTER_ADDRESS);
  console.log('MarketplaceV2:', MARKETPLACE_ADDRESS);
  console.log('');
  
  // Get contracts
  const splitter = await ethers.getContractAt('InferenceSplitter', SPLITTER_ADDRESS);
  const marketplace = await ethers.getContractAt('MarketplaceV2', MARKETPLACE_ADDRESS);
  
  // Get marketplace fee
  const marketplaceFeeBps = await marketplace.feeBps();
  console.log('Marketplace Fee:', marketplaceFeeBps.toString(), 'bps', `(${Number(marketplaceFeeBps) / 100}%)`);
  console.log('');
  
  // Known model IDs (from database or manual list)
  // In production, this would come from the indexer/database
  const MODEL_IDS = [1, 2, 14, 20, 23]; // Add your model IDs here
  
  console.log('Models to configure:', MODEL_IDS.join(', '));
  console.log('');
  
  // Configure splits for each model
  console.log('─'.repeat(70));
  console.log('CONFIGURING SPLITS');
  console.log('─'.repeat(70));
  
  for (const modelId of MODEL_IDS) {
    try {
      // Check if already configured
      const existingSplit = await splitter.getSplit(modelId);
      if (existingSplit.configured) {
        console.log(`  Model ${modelId}: Already configured ✓`);
        continue;
      }
      
      // Get model data from marketplace
      const model = await marketplace.models(modelId);
      
      // Skip unlisted models
      if (!model.listed) {
        console.log(`  Model ${modelId}: Not listed, skipping`);
        continue;
      }
      
      const seller = model.owner;
      const creator = model.creator;
      const royaltyBps = model.royaltyBps;
      
      console.log(`  Model ${modelId}:`);
      console.log(`    Seller: ${seller}`);
      console.log(`    Creator: ${creator}`);
      console.log(`    Royalty: ${royaltyBps.toString()} bps (${Number(royaltyBps) / 100}%)`);
      console.log(`    Marketplace Fee: ${marketplaceFeeBps.toString()} bps`);
      
      // Configure split
      const tx = await splitter.configureSplit(
        modelId,
        seller,
        creator,
        royaltyBps,
        marketplaceFeeBps
      );
      
      await tx.wait();
      console.log(`    ✅ Split configured! TX: ${tx.hash}`);
      console.log('');
      
    } catch (e: any) {
      console.error(`  Model ${modelId}: Error - ${e.message}`);
    }
  }
  
  console.log('');
  console.log('─'.repeat(70));
  console.log('VERIFICATION');
  console.log('─'.repeat(70));
  
  // Verify all splits
  for (const modelId of MODEL_IDS) {
    const split = await splitter.getSplit(modelId);
    if (split.configured) {
      console.log(`  Model ${modelId}: ✅ Configured`);
      console.log(`    Seller: ${split.seller}`);
      console.log(`    Creator: ${split.creator}`);
      console.log(`    Royalty: ${split.royaltyBps.toString()} bps`);
      console.log(`    Marketplace: ${split.marketplaceBps.toString()} bps`);
    } else {
      console.log(`  Model ${modelId}: ❌ Not configured`);
    }
  }
  
  console.log('');
  console.log('='.repeat(70));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
