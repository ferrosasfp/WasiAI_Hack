/**
 * Deploy Script for V2 Contracts
 * 
 * Deploys:
 * - MarketplaceV2 (with inference support + single-signature)
 * - AgentRegistryV2 (ERC-8004 with delegated registration)
 * - InferenceSplitter (Pull Pattern for x402 payments)
 * 
 * Usage:
 *   npx hardhat run scripts/deploy-v2.js --network avax
 *   npx hardhat run scripts/deploy-v2.js --network base
 */

const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const network = hre.network.name;
  
  console.log("=".repeat(60));
  console.log("Deploying V2 Contracts");
  console.log("=".repeat(60));
  console.log(`Network: ${network}`);
  console.log(`Deployer: ${deployer.address}`);
  console.log(`Balance: ${hre.ethers.formatEther(await hre.ethers.provider.getBalance(deployer.address))} ETH`);
  console.log("=".repeat(60));

  // Configuration
  const FEE_BPS = 250; // 2.5% marketplace fee
  const FEE_RECIPIENT = deployer.address; // Fee recipient (can be changed later)
  const MODELS_LIMIT = 0; // 0 = unlimited
  
  // USDC addresses per network (for InferenceSplitter)
  const USDC_ADDRESSES = {
    avax: "0x5425890298aed601595a70AB815c96711a31Bc65", // USDC on Fuji testnet
    base: "0x036CbD53842c5426634e7929541eC2318f3dCF7e", // USDC on Base Sepolia
    hardhat: "", // Will deploy mock
  };

  let usdcAddress = USDC_ADDRESSES[network];
  
  // Deploy MockERC20 for local testing
  if (network === "hardhat" || network === "localhost" || !usdcAddress) {
    console.log("\n📦 Deploying MockERC20 (USDC)...");
    const MockERC20 = await hre.ethers.getContractFactory("MockERC20");
    const mockUsdc = await MockERC20.deploy("USD Coin", "USDC", 6);
    await mockUsdc.waitForDeployment();
    usdcAddress = await mockUsdc.getAddress();
    console.log(`   MockUSDC deployed at: ${usdcAddress}`);
  }

  // 1. Deploy MarketplaceV2
  console.log("\n📦 Deploying MarketplaceV2...");
  const MarketplaceV2 = await hre.ethers.getContractFactory("MarketplaceV2");
  const marketplace = await MarketplaceV2.deploy(
    FEE_BPS,
    FEE_RECIPIENT,
    MODELS_LIMIT,
    deployer.address // LicenseNFT owner
  );
  await marketplace.waitForDeployment();
  const marketplaceAddress = await marketplace.getAddress();
  console.log(`   MarketplaceV2 deployed at: ${marketplaceAddress}`);
  
  // Get LicenseNFT address (created by MarketplaceV2 constructor)
  const licenseNFTAddress = await marketplace.licenseNFT();
  console.log(`   LicenseNFT deployed at: ${licenseNFTAddress}`);

  // 2. Deploy AgentRegistryV2
  console.log("\n📦 Deploying AgentRegistryV2...");
  const AgentRegistryV2 = await hre.ethers.getContractFactory("AgentRegistryV2");
  const agentRegistry = await AgentRegistryV2.deploy(marketplaceAddress);
  await agentRegistry.waitForDeployment();
  const agentRegistryAddress = await agentRegistry.getAddress();
  console.log(`   AgentRegistryV2 deployed at: ${agentRegistryAddress}`);

  // 3. Deploy InferenceSplitter
  console.log("\n📦 Deploying InferenceSplitter...");
  const InferenceSplitter = await hre.ethers.getContractFactory("InferenceSplitter");
  const splitter = await InferenceSplitter.deploy(
    usdcAddress,
    FEE_RECIPIENT, // Marketplace wallet
    marketplaceAddress // Authorized caller (Marketplace)
  );
  await splitter.waitForDeployment();
  const splitterAddress = await splitter.getAddress();
  console.log(`   InferenceSplitter deployed at: ${splitterAddress}`);

  // 4. Configure MarketplaceV2 with AgentRegistry, InferenceSplitter, and PaymentToken
  console.log("\n⚙️  Configuring MarketplaceV2...");
  console.log("   Setting AgentRegistry...");
  const setAgentTx = await marketplace.setAgentRegistry(agentRegistryAddress);
  await setAgentTx.wait();
  console.log(`   ✅ AgentRegistry set to: ${agentRegistryAddress}`);
  
  console.log("   Setting InferenceSplitter...");
  const setSplitterTx = await marketplace.setInferenceSplitter(splitterAddress);
  await setSplitterTx.wait();
  console.log(`   ✅ InferenceSplitter set to: ${splitterAddress}`);
  
  console.log("   Setting PaymentToken (USDC)...");
  const setPaymentTokenTx = await marketplace.setPaymentToken(usdcAddress);
  await setPaymentTokenTx.wait();
  console.log(`   ✅ PaymentToken set to: ${usdcAddress}`);

  // 5. Authorize Marketplace in InferenceSplitter
  console.log("\n⚙️  Configuring InferenceSplitter...");
  console.log("   Authorizing Marketplace as caller...");
  const authTx = await splitter.setAuthorizedCaller(marketplaceAddress, true);
  await authTx.wait();
  console.log(`   ✅ Marketplace authorized`);

  // 6. Save deployment info
  const deployInfo = {
    network,
    chainId: (await hre.ethers.provider.getNetwork()).chainId.toString(),
    deployer: deployer.address,
    deployedAt: new Date().toISOString(),
    contracts: {
      MarketplaceV2: marketplaceAddress,
      LicenseNFT: licenseNFTAddress,
      AgentRegistryV2: agentRegistryAddress,
      InferenceSplitter: splitterAddress,
      USDC: usdcAddress,
    },
    config: {
      feeBps: FEE_BPS,
      feeRecipient: FEE_RECIPIENT,
      modelsLimit: MODELS_LIMIT,
    }
  };

  // Save to deploy file
  const deployPath = path.join(__dirname, `../deploy.${network}.v2.json`);
  fs.writeFileSync(deployPath, JSON.stringify(deployInfo, null, 2));
  console.log(`\n📄 Deployment info saved to: ${deployPath}`);

  // Print summary
  console.log("\n" + "=".repeat(60));
  console.log("DEPLOYMENT SUMMARY");
  console.log("=".repeat(60));
  console.log(`Network:           ${network}`);
  console.log(`Chain ID:          ${deployInfo.chainId}`);
  console.log(`MarketplaceV2:     ${marketplaceAddress}`);
  console.log(`LicenseNFT:        ${licenseNFTAddress}`);
  console.log(`AgentRegistryV2:   ${agentRegistryAddress}`);
  console.log(`InferenceSplitter: ${splitterAddress}`);
  console.log(`USDC:              ${usdcAddress}`);
  console.log("=".repeat(60));

  // Print env vars to add
  console.log("\n📝 Add these to your .env.local:");
  console.log("─".repeat(60));
  console.log(`NEXT_PUBLIC_EVM_MARKET_${deployInfo.chainId}=${marketplaceAddress}`);
  console.log(`NEXT_PUBLIC_EVM_LICENSE_${deployInfo.chainId}=${licenseNFTAddress}`);
  console.log(`NEXT_PUBLIC_EVM_AGENT_REGISTRY_${deployInfo.chainId}=${agentRegistryAddress}`);
  console.log(`NEXT_PUBLIC_EVM_SPLITTER_${deployInfo.chainId}=${splitterAddress}`);
  console.log(`NEXT_PUBLIC_EVM_USDC_${deployInfo.chainId}=${usdcAddress}`);
  console.log("─".repeat(60));

  // Verify contracts on explorer (if not local)
  if (network !== "hardhat" && network !== "localhost") {
    console.log("\n🔍 To verify contracts on explorer, run:");
    console.log(`npx hardhat verify --network ${network} ${marketplaceAddress} ${FEE_BPS} ${FEE_RECIPIENT} ${MODELS_LIMIT} ${deployer.address}`);
    console.log(`npx hardhat verify --network ${network} ${agentRegistryAddress} ${marketplaceAddress}`);
    console.log(`npx hardhat verify --network ${network} ${splitterAddress} ${usdcAddress} ${FEE_RECIPIENT} ${marketplaceAddress}`);
  }

  return deployInfo;
}

main()
  .then((deployInfo) => {
    console.log("\n✅ Deployment completed successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Deployment failed:", error);
    process.exit(1);
  });
