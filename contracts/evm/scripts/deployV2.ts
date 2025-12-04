import hre from "hardhat";

/**
 * Deploy MarketplaceV2 and AgentRegistryV2 contracts
 * 
 * Required environment variables:
 * - FEE_BPS: Marketplace fee in basis points (default: 500 = 5%)
 * - FEE_RECIPIENT: Address to receive marketplace fees
 * - MODELS_LIMIT: Maximum number of active models (0 = unlimited)
 * - LICENSE_NFT_OWNER: Owner of the LicenseNFT contract
 * - USDC_ADDRESS: Address of USDC token contract
 * 
 * Usage:
 * FEE_BPS=500 FEE_RECIPIENT=0x... LICENSE_NFT_OWNER=0x... USDC_ADDRESS=0x... npx hardhat run scripts/deployV2.ts --network fuji
 */
async function main() {
  const { ethers } = hre as any;
  
  // Configuration
  const feeBps = Number(process.env.FEE_BPS ?? '500'); // 5% default
  const feeRecipient = process.env.FEE_RECIPIENT as string | undefined;
  const modelsLimit = Number(process.env.MODELS_LIMIT ?? '0');
  const licenseOwner = process.env.LICENSE_NFT_OWNER as string | undefined;
  const usdcAddress = process.env.USDC_ADDRESS as string | undefined;
  
  if (!feeRecipient) throw new Error('Missing FEE_RECIPIENT');
  if (!licenseOwner) throw new Error('Missing LICENSE_NFT_OWNER');
  if (!usdcAddress) throw new Error('Missing USDC_ADDRESS');

  const [signer] = await ethers.getSigners();
  const deployerAddress = await signer.getAddress();
  console.log('='.repeat(60));
  console.log('Deploying MarketplaceV2 + AgentRegistryV2');
  console.log('='.repeat(60));
  console.log('Deployer:', deployerAddress);
  console.log('Network:', hre.network.name);
  console.log('Parameters:');
  console.log('  - feeBps:', feeBps);
  console.log('  - feeRecipient:', feeRecipient);
  console.log('  - modelsLimit:', modelsLimit);
  console.log('  - licenseOwner:', licenseOwner);
  console.log('  - usdcAddress:', usdcAddress);
  console.log('');

  // Step 1: Deploy MarketplaceV2 (without AgentRegistry initially)
  console.log('Step 1: Deploying MarketplaceV2...');
  const MarketplaceV2 = await ethers.getContractFactory('MarketplaceV2');
  const marketplace = await MarketplaceV2.deploy(
    feeBps,
    feeRecipient,
    modelsLimit,
    licenseOwner
  );
  console.log('  TX:', marketplace.deploymentTransaction()?.hash);
  await marketplace.waitForDeployment();
  const marketplaceAddress = await marketplace.getAddress();
  console.log('  MarketplaceV2 deployed at:', marketplaceAddress);
  
  // Get LicenseNFT address
  const licenseNFTAddress = await marketplace.licenseNFT();
  console.log('  LicenseNFT deployed at:', licenseNFTAddress);
  
  // Set payment token (USDC)
  console.log('  Setting payment token (USDC)...');
  const setTokenTx = await marketplace.setPaymentToken(usdcAddress);
  await setTokenTx.wait();
  console.log('  Payment token set to:', usdcAddress);
  console.log('');

  // Step 2: Deploy AgentRegistryV2 with MarketplaceV2 address
  console.log('Step 2: Deploying AgentRegistryV2...');
  const AgentRegistryV2 = await ethers.getContractFactory('AgentRegistryV2');
  const agentRegistry = await AgentRegistryV2.deploy(marketplaceAddress);
  console.log('  TX:', agentRegistry.deploymentTransaction()?.hash);
  await agentRegistry.waitForDeployment();
  const agentRegistryAddress = await agentRegistry.getAddress();
  console.log('  AgentRegistryV2 deployed at:', agentRegistryAddress);
  console.log('');

  // Step 3: Set AgentRegistry in MarketplaceV2
  console.log('Step 3: Linking AgentRegistryV2 to MarketplaceV2...');
  const setRegistryTx = await marketplace.setAgentRegistry(agentRegistryAddress);
  console.log('  TX:', setRegistryTx.hash);
  await setRegistryTx.wait();
  console.log('  AgentRegistry linked successfully');
  console.log('');

  // Summary
  console.log('='.repeat(60));
  console.log('DEPLOYMENT COMPLETE');
  console.log('='.repeat(60));
  console.log('');
  console.log('Add these to your .env file:');
  console.log('');
  console.log(`NEXT_PUBLIC_EVM_MARKET_43113=${marketplaceAddress}`);
  console.log(`NEXT_PUBLIC_EVM_LICENSE_43113=${licenseNFTAddress}`);
  console.log(`NEXT_PUBLIC_EVM_AGENT_REGISTRY_43113=${agentRegistryAddress}`);
  console.log('');
  console.log('Contract addresses:');
  console.log(`  MarketplaceV2:    ${marketplaceAddress}`);
  console.log(`  LicenseNFT:       ${licenseNFTAddress}`);
  console.log(`  AgentRegistryV2:  ${agentRegistryAddress}`);
  console.log('');
  
  // Verify on explorer (optional)
  console.log('To verify contracts on Snowtrace:');
  console.log(`npx hardhat verify --network fuji ${marketplaceAddress} ${feeBps} ${feeRecipient} ${modelsLimit} ${licenseOwner} ${usdcAddress}`);
  console.log(`npx hardhat verify --network fuji ${agentRegistryAddress} ${marketplaceAddress}`);
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
