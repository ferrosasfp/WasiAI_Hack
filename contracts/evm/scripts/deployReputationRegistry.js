const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const network = hre.network.name;
  console.log(`\n🚀 Deploying ReputationRegistry to ${network}...\n`);

  // Load existing deployment to get AgentRegistry address
  const deployFile = path.join(__dirname, `../deploy.${network === 'avax' ? 'avax' : network}.json`);
  if (!fs.existsSync(deployFile)) {
    throw new Error(`Deployment file not found: ${deployFile}. Deploy Marketplace and AgentRegistry first.`);
  }
  
  const existingDeploy = JSON.parse(fs.readFileSync(deployFile, 'utf8'));
  const agentRegistryAddress = existingDeploy.agentRegistry;
  
  if (!agentRegistryAddress) {
    throw new Error('AgentRegistry address not found in deployment file. Deploy AgentRegistry first.');
  }
  
  console.log(`📋 Using AgentRegistry: ${agentRegistryAddress}`);

  // Deploy ReputationRegistry
  const ReputationRegistry = await hre.ethers.getContractFactory("ReputationRegistry");
  const reputationRegistry = await ReputationRegistry.deploy(agentRegistryAddress);
  await reputationRegistry.waitForDeployment();
  
  const reputationRegistryAddress = await reputationRegistry.getAddress();
  console.log(`✅ ReputationRegistry deployed: ${reputationRegistryAddress}`);

  // Update deployment file
  existingDeploy.reputationRegistry = reputationRegistryAddress;
  fs.writeFileSync(deployFile, JSON.stringify(existingDeploy, null, 2));
  console.log(`📝 Updated ${deployFile}`);

  // Verify on explorer (if API key available)
  if (process.env.SNOWTRACE_API_KEY && network === 'avax') {
    console.log('\n⏳ Waiting for block confirmations before verification...');
    await new Promise(r => setTimeout(r, 30000)); // Wait 30s for indexing
    
    try {
      await hre.run("verify:verify", {
        address: reputationRegistryAddress,
        constructorArguments: [agentRegistryAddress],
      });
      console.log('✅ Contract verified on Snowtrace');
    } catch (e) {
      console.log('⚠️ Verification failed (may already be verified):', e.message);
    }
  }

  console.log('\n🎉 Deployment complete!\n');
  console.log('Contract addresses:');
  console.log(`  Marketplace:          ${existingDeploy.marketplace}`);
  console.log(`  LicenseNFT:           ${existingDeploy.licenseNFT}`);
  console.log(`  AgentRegistry:        ${agentRegistryAddress}`);
  console.log(`  ReputationRegistry:   ${reputationRegistryAddress}`);
  console.log(`\nChain ID: ${existingDeploy.chainId}`);
  console.log(`\n📋 Add to .env.local:`);
  console.log(`NEXT_PUBLIC_REPUTATION_REGISTRY_ADDRESS=${reputationRegistryAddress}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
