import hre from "hardhat";

/**
 * Deploy MarketplaceV3 with integrated SplitterFactory
 * 
 * Usage:
 *   npx hardhat run scripts/deployMarketplaceV3.ts --network avax
 */
async function main() {
  const { ethers } = hre as any;
  
  console.log('='.repeat(70));
  console.log('DEPLOYING MARKETPLACEV3');
  console.log('='.repeat(70));
  console.log('');
  
  const [deployer] = await ethers.getSigners();
  console.log('Deployer:', deployer.address);
  console.log('Balance:', ethers.formatEther(await ethers.provider.getBalance(deployer.address)), 'AVAX');
  console.log('');
  
  // Existing contract addresses (Fuji)
  const USDC_ADDRESS = '0x5425890298aed601595a70AB815c96711a31Bc65';
  const SPLITTER_FACTORY = '0xf8d8C220181CAe9A748b8e817BFE337AB5b74731';
  const AGENT_REGISTRY = '0xYOUR_AGENT_REGISTRY_ADDRESS'; // Update this
  const FEE_BPS = 250; // 2.5%
  
  console.log('Configuration:');
  console.log('  USDC:', USDC_ADDRESS);
  console.log('  SplitterFactory:', SPLITTER_FACTORY);
  console.log('  Fee:', FEE_BPS, 'bps (', FEE_BPS / 100, '%)');
  console.log('');
  
  // Deploy MarketplaceV3
  // Constructor: (feeBps_, feeRecipient_, modelsLimit_, licenseNFTOwner)
  console.log('Deploying MarketplaceV3...');
  const MarketplaceV3 = await ethers.getContractFactory('MarketplaceV3');
  const marketplace = await MarketplaceV3.deploy(
    FEE_BPS,           // feeBps_ (2.5%)
    deployer.address,  // feeRecipient_ (marketplace wallet)
    0,                 // modelsLimit_ (0 = unlimited)
    deployer.address   // licenseNFTOwner
  );
  await marketplace.waitForDeployment();
  const marketplaceAddress = await marketplace.getAddress();
  
  console.log('');
  console.log('✅ MarketplaceV3 deployed!');
  console.log('   Address:', marketplaceAddress);
  console.log('');
  
  // Get LicenseNFT address
  const licenseNFT = await marketplace.licenseNFT();
  console.log('   LicenseNFT:', licenseNFT);
  console.log('');
  
  // Configure SplitterFactory
  console.log('Configuring SplitterFactory...');
  const tx1 = await marketplace.setSplitterFactory(SPLITTER_FACTORY);
  await tx1.wait();
  console.log('✅ SplitterFactory configured');
  
  // Configure Payment Token
  console.log('Configuring Payment Token (USDC)...');
  const tx2 = await marketplace.setPaymentToken(USDC_ADDRESS);
  await tx2.wait();
  console.log('✅ Payment Token configured');
  
  // Authorize MarketplaceV3 in SplitterFactory
  console.log('');
  console.log('Authorizing MarketplaceV3 in SplitterFactory...');
  const factory = await ethers.getContractAt('SplitterFactory', SPLITTER_FACTORY);
  const tx3 = await factory.setAuthorized(marketplaceAddress, true);
  await tx3.wait();
  console.log('✅ MarketplaceV3 authorized to create splitters');
  
  console.log('');
  console.log('─'.repeat(70));
  console.log('ADD TO .env.local:');
  console.log('─'.repeat(70));
  console.log('');
  console.log(`NEXT_PUBLIC_MARKETPLACE_V3_43113=${marketplaceAddress}`);
  console.log(`NEXT_PUBLIC_LICENSE_NFT_43113=${licenseNFT}`);
  console.log('');
  
  console.log('─'.repeat(70));
  console.log('VERIFY ON SNOWTRACE:');
  console.log('─'.repeat(70));
  console.log('');
  console.log(`npx hardhat verify --network avax ${marketplaceAddress} ${FEE_BPS} ${deployer.address} 0 ${deployer.address}`);
  console.log('');
  
  console.log('─'.repeat(70));
  console.log('NEXT STEPS:');
  console.log('─'.repeat(70));
  console.log('');
  console.log('  1. Update frontend to use MarketplaceV3 address');
  console.log('  2. Configure AgentRegistry if needed:');
  console.log(`     marketplace.setAgentRegistry("${AGENT_REGISTRY}")`);
  console.log('  3. Test model publication with automatic splitter creation');
  console.log('');
  console.log('='.repeat(70));
}

main().catch(console.error);
