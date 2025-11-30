const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const network = hre.network.name;
  console.log(`\n🚀 Deploying AgentRegistry to ${network}...\n`);

  // Load existing deployment to get Marketplace address
  const deployFile = path.join(__dirname, `../deploy.${network === 'avax' ? 'avax' : network}.json`);
  if (!fs.existsSync(deployFile)) {
    throw new Error(`Deployment file not found: ${deployFile}. Deploy Marketplace first.`);
  }
  
  const existingDeploy = JSON.parse(fs.readFileSync(deployFile, 'utf8'));
  const marketplaceAddress = existingDeploy.marketplace;
  
  if (!marketplaceAddress) {
    throw new Error('Marketplace address not found in deployment file');
  }
  
  console.log(`📋 Using Marketplace: ${marketplaceAddress}`);

  // Deploy AgentRegistry
  const AgentRegistry = await hre.ethers.getContractFactory("AgentRegistry");
  const agentRegistry = await AgentRegistry.deploy(marketplaceAddress);
  await agentRegistry.waitForDeployment();
  
  const agentRegistryAddress = await agentRegistry.getAddress();
  console.log(`✅ AgentRegistry deployed: ${agentRegistryAddress}`);

  // Update deployment file
  existingDeploy.agentRegistry = agentRegistryAddress;
  fs.writeFileSync(deployFile, JSON.stringify(existingDeploy, null, 2));
  console.log(`📝 Updated ${deployFile}`);

  // Verify on explorer (if API key available)
  if (process.env.SNOWTRACE_API_KEY && network === 'avax') {
    console.log('\n⏳ Waiting for block confirmations before verification...');
    await new Promise(r => setTimeout(r, 30000)); // Wait 30s for indexing
    
    try {
      await hre.run("verify:verify", {
        address: agentRegistryAddress,
        constructorArguments: [marketplaceAddress],
      });
      console.log('✅ Contract verified on Snowtrace');
    } catch (e) {
      console.log('⚠️ Verification failed (may already be verified):', e.message);
    }
  }

  console.log('\n🎉 Deployment complete!\n');
  console.log('Contract addresses:');
  console.log(`  Marketplace:     ${marketplaceAddress}`);
  console.log(`  LicenseNFT:      ${existingDeploy.licenseNFT}`);
  console.log(`  AgentRegistry:   ${agentRegistryAddress}`);
  console.log(`\nChain ID: ${existingDeploy.chainId}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
