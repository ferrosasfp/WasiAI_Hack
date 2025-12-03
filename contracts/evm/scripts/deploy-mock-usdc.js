/**
 * Deploy MockUSDC for testing
 * 
 * Usage:
 *   npx hardhat run scripts/deploy-mock-usdc.js --network avax
 */

const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  
  console.log("=".repeat(60));
  console.log("Deploying MockUSDC");
  console.log("=".repeat(60));
  console.log(`Network: ${hre.network.name}`);
  console.log(`Deployer: ${deployer.address}`);
  console.log("");

  // Deploy MockUSDC
  console.log("📦 Deploying MockUSDC...");
  const MockUSDC = await hre.ethers.getContractFactory("MockUSDC");
  const usdc = await MockUSDC.deploy();
  await usdc.waitForDeployment();
  const usdcAddress = await usdc.getAddress();
  
  console.log(`   ✅ MockUSDC deployed at: ${usdcAddress}`);
  
  // Check balance
  const balance = await usdc.balanceOf(deployer.address);
  console.log(`   Deployer balance: ${hre.ethers.formatUnits(balance, 6)} USDC`);
  
  console.log("");
  console.log("=".repeat(60));
  console.log("NEXT STEPS:");
  console.log("=".repeat(60));
  console.log("");
  console.log("1. Update MarketplaceV2 to use this MockUSDC:");
  console.log(`   await marketplace.setPaymentToken("${usdcAddress}")`);
  console.log("");
  console.log("2. Or update .env.local:");
  console.log(`   NEXT_PUBLIC_EVM_USDC_43113=${usdcAddress}`);
  console.log("");
  console.log("3. Anyone can mint USDC for testing:");
  console.log(`   - Call faucet(amount) - max 10k USDC per call`);
  console.log(`   - Call mint(address, amount) - unlimited`);
  console.log("");
  
  return usdcAddress;
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
