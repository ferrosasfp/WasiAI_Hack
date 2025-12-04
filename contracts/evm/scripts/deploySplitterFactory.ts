import hre from "hardhat";

/**
 * Deploy SplitterFactory for creating per-model splitter clones
 * 
 * Usage:
 *   npx hardhat run scripts/deploySplitterFactory.ts --network avax
 */
async function main() {
  const { ethers } = hre as any;
  
  console.log('='.repeat(70));
  console.log('DEPLOYING SPLITTER FACTORY');
  console.log('='.repeat(70));
  console.log('');
  
  const [deployer] = await ethers.getSigners();
  console.log('Deployer:', deployer.address);
  console.log('Balance:', ethers.formatEther(await ethers.provider.getBalance(deployer.address)), 'AVAX');
  console.log('');
  
  // Configuration
  const USDC_ADDRESS = '0x5425890298aed601595a70AB815c96711a31Bc65'; // Fuji x402 USDC
  const MARKETPLACE_WALLET = deployer.address; // Change in production
  const DEFAULT_MARKETPLACE_BPS = 250; // 2.5%
  
  console.log('Configuration:');
  console.log('  USDC:', USDC_ADDRESS);
  console.log('  Marketplace Wallet:', MARKETPLACE_WALLET);
  console.log('  Default Marketplace Fee:', DEFAULT_MARKETPLACE_BPS, 'bps (', DEFAULT_MARKETPLACE_BPS / 100, '%)');
  console.log('');
  
  // Deploy Factory
  console.log('Deploying SplitterFactory...');
  const Factory = await ethers.getContractFactory('SplitterFactory');
  const factory = await Factory.deploy(
    USDC_ADDRESS,
    MARKETPLACE_WALLET,
    DEFAULT_MARKETPLACE_BPS
  );
  await factory.waitForDeployment();
  const factoryAddress = await factory.getAddress();
  
  console.log('');
  console.log('✅ SplitterFactory deployed!');
  console.log('   Address:', factoryAddress);
  console.log('');
  
  // Get implementation address
  const implementationAddress = await factory.implementation();
  console.log('   Implementation (ModelSplitter):', implementationAddress);
  console.log('');
  
  // Authorize the Marketplace contract to create splitters
  const MARKETPLACE_ADDRESS = '0x278E6E5417d7af738368dA4a105A0ca80b89C7db';
  console.log('Authorizing Marketplace to create splitters...');
  const tx = await factory.setAuthorized(MARKETPLACE_ADDRESS, true);
  await tx.wait();
  console.log('✅ Marketplace authorized');
  console.log('');
  
  // Example: Predict address for Model 1
  const predictedModel1 = await factory.predictSplitterAddress(1);
  console.log('Predicted splitter address for Model 1:', predictedModel1);
  console.log('');
  
  console.log('─'.repeat(70));
  console.log('ADD TO .env.local:');
  console.log('─'.repeat(70));
  console.log('');
  console.log(`SPLITTER_FACTORY_ADDRESS=${factoryAddress}`);
  console.log(`MODEL_SPLITTER_IMPL=${implementationAddress}`);
  console.log('');
  
  console.log('─'.repeat(70));
  console.log('VERIFY ON SNOWTRACE:');
  console.log('─'.repeat(70));
  console.log('');
  console.log(`npx hardhat verify --network avax ${factoryAddress} ${USDC_ADDRESS} ${MARKETPLACE_WALLET} ${DEFAULT_MARKETPLACE_BPS}`);
  console.log('');
  
  console.log('─'.repeat(70));
  console.log('USAGE:');
  console.log('─'.repeat(70));
  console.log('');
  console.log('  // Create splitter for a model');
  console.log('  factory.createSplitter(modelId, seller, creator, royaltyBps)');
  console.log('');
  console.log('  // Get splitter address');
  console.log('  const splitter = await factory.getSplitter(modelId)');
  console.log('');
  console.log('  // Use splitter address as payTo in x402');
  console.log('  payTo: splitter');
  console.log('');
  console.log('='.repeat(70));
}

main().catch(console.error);
