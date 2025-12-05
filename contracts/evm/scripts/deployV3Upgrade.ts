import hre from "hardhat";

/**
 * Deploy upgraded contracts (AgentRegistryV2, SplitterFactory, MarketplaceV3)
 * 
 * This script deploys the updated contracts with:
 * - AgentRegistryV2: linkModelToAgent() for upgrade support
 * - SplitterFactory: aliasSplitter() for family splitter reuse
 * - MarketplaceV3: firstModelId tracking and proper upgrade handling
 * 
 * Usage:
 *   npx hardhat run scripts/deployV3Upgrade.ts --network avax
 */
async function main() {
  const { ethers } = hre as any;
  
  console.log('='.repeat(70));
  console.log('DEPLOYING V3 UPGRADE - Agent + Splitter + Marketplace');
  console.log('='.repeat(70));
  console.log('');
  
  const [deployer] = await ethers.getSigners();
  console.log('Deployer:', deployer.address);
  console.log('Balance:', ethers.formatEther(await ethers.provider.getBalance(deployer.address)), 'AVAX');
  console.log('');
  
  // Configuration (Fuji testnet)
  const USDC_ADDRESS = '0x5425890298aed601595a70AB815c96711a31Bc65';
  const FEE_BPS = 250; // 2.5%
  const MARKETPLACE_BPS = 250; // 2.5% marketplace fee for splitters
  
  console.log('Configuration:');
  console.log('  USDC:', USDC_ADDRESS);
  console.log('  Marketplace Fee:', FEE_BPS, 'bps (', FEE_BPS / 100, '%)');
  console.log('  Splitter Marketplace Fee:', MARKETPLACE_BPS, 'bps');
  console.log('');
  
  // ============ STEP 1: Deploy MarketplaceV3 (needed for AgentRegistry) ============
  console.log('─'.repeat(70));
  console.log('STEP 1: Deploy MarketplaceV3');
  console.log('─'.repeat(70));
  
  const MarketplaceV3 = await ethers.getContractFactory('MarketplaceV3');
  const marketplace = await MarketplaceV3.deploy(
    FEE_BPS,           // feeBps_ (2.5%)
    deployer.address,  // feeRecipient_ (marketplace wallet)
    0,                 // modelsLimit_ (0 = unlimited)
    deployer.address   // licenseNFTOwner
  );
  await marketplace.waitForDeployment();
  const marketplaceAddress = await marketplace.getAddress();
  
  console.log('✅ MarketplaceV3 deployed:', marketplaceAddress);
  
  const licenseNFT = await marketplace.licenseNFT();
  console.log('   LicenseNFT:', licenseNFT);
  console.log('');
  
  // ============ STEP 2: Deploy AgentRegistryV2 ============
  console.log('─'.repeat(70));
  console.log('STEP 2: Deploy AgentRegistryV2');
  console.log('─'.repeat(70));
  
  const AgentRegistryV2 = await ethers.getContractFactory('AgentRegistryV2');
  const agentRegistry = await AgentRegistryV2.deploy(marketplaceAddress);
  await agentRegistry.waitForDeployment();
  const agentRegistryAddress = await agentRegistry.getAddress();
  
  console.log('✅ AgentRegistryV2 deployed:', agentRegistryAddress);
  console.log('');
  
  // ============ STEP 3: Deploy SplitterFactory ============
  console.log('─'.repeat(70));
  console.log('STEP 3: Deploy SplitterFactory');
  console.log('─'.repeat(70));
  
  const SplitterFactory = await ethers.getContractFactory('SplitterFactory');
  const splitterFactory = await SplitterFactory.deploy(
    USDC_ADDRESS,        // USDC token
    deployer.address,    // marketplace wallet for fees
    MARKETPLACE_BPS      // default marketplace fee
  );
  await splitterFactory.waitForDeployment();
  const splitterFactoryAddress = await splitterFactory.getAddress();
  
  console.log('✅ SplitterFactory deployed:', splitterFactoryAddress);
  console.log('');
  
  // ============ STEP 4: Configure MarketplaceV3 ============
  console.log('─'.repeat(70));
  console.log('STEP 4: Configure MarketplaceV3');
  console.log('─'.repeat(70));
  
  // Set AgentRegistry
  console.log('Setting AgentRegistry...');
  const tx1 = await marketplace.setAgentRegistry(agentRegistryAddress);
  await tx1.wait();
  console.log('✅ AgentRegistry configured');
  
  // Set SplitterFactory
  console.log('Setting SplitterFactory...');
  const tx2 = await marketplace.setSplitterFactory(splitterFactoryAddress);
  await tx2.wait();
  console.log('✅ SplitterFactory configured');
  
  // Set Payment Token
  console.log('Setting Payment Token (USDC)...');
  const tx3 = await marketplace.setPaymentToken(USDC_ADDRESS);
  await tx3.wait();
  console.log('✅ Payment Token configured');
  console.log('');
  
  // ============ STEP 5: Authorize MarketplaceV3 in SplitterFactory ============
  console.log('─'.repeat(70));
  console.log('STEP 5: Authorize MarketplaceV3 in SplitterFactory');
  console.log('─'.repeat(70));
  
  const tx4 = await splitterFactory.setAuthorized(marketplaceAddress, true);
  await tx4.wait();
  console.log('✅ MarketplaceV3 authorized to create/alias splitters');
  console.log('');
  
  // ============ SUMMARY ============
  console.log('='.repeat(70));
  console.log('DEPLOYMENT COMPLETE');
  console.log('='.repeat(70));
  console.log('');
  console.log('Contract Addresses:');
  console.log('  MarketplaceV3:', marketplaceAddress);
  console.log('  LicenseNFT:', licenseNFT);
  console.log('  AgentRegistryV2:', agentRegistryAddress);
  console.log('  SplitterFactory:', splitterFactoryAddress);
  console.log('');
  console.log('─'.repeat(70));
  console.log('ADD TO .env.local:');
  console.log('─'.repeat(70));
  console.log(`NEXT_PUBLIC_EVM_MARKET_43113=${marketplaceAddress}`);
  console.log(`NEXT_PUBLIC_EVM_LICENSE_43113=${licenseNFT}`);
  console.log(`NEXT_PUBLIC_EVM_AGENT_REGISTRY_43113=${agentRegistryAddress}`);
  console.log(`NEXT_PUBLIC_EVM_SPLITTER_FACTORY_43113=${splitterFactoryAddress}`);
  console.log('');
  console.log('─'.repeat(70));
  console.log('VERIFY CONTRACTS:');
  console.log('─'.repeat(70));
  console.log(`npx hardhat verify --network avax ${marketplaceAddress} ${FEE_BPS} ${deployer.address} 0 ${deployer.address}`);
  console.log(`npx hardhat verify --network avax ${agentRegistryAddress} ${marketplaceAddress}`);
  console.log(`npx hardhat verify --network avax ${splitterFactoryAddress} ${USDC_ADDRESS} ${deployer.address} ${MARKETPLACE_BPS}`);
  console.log('');
  
  // Save deployment info
  const deployInfo = {
    network: hre.network.name,
    chainId: (await ethers.provider.getNetwork()).chainId.toString(),
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    contracts: {
      MarketplaceV3: marketplaceAddress,
      LicenseNFT: licenseNFT,
      AgentRegistryV2: agentRegistryAddress,
      SplitterFactory: splitterFactoryAddress
    },
    config: {
      feeBps: FEE_BPS,
      marketplaceBps: MARKETPLACE_BPS,
      usdc: USDC_ADDRESS
    }
  };
  
  const fs = require('fs');
  fs.writeFileSync(
    `deploy.${hre.network.name}.v3.json`,
    JSON.stringify(deployInfo, null, 2)
  );
  console.log(`Deployment info saved to deploy.${hre.network.name}.v3.json`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
