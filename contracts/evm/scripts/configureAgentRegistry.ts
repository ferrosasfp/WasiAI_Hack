import hre from "hardhat";

/**
 * Configure AgentRegistry in MarketplaceV3
 * 
 * Usage:
 *   npx hardhat run scripts/configureAgentRegistry.ts --network avax
 */
async function main() {
  const { ethers } = hre as any;
  
  console.log('='.repeat(70));
  console.log('CONFIGURING AGENT REGISTRY IN MARKETPLACEV3');
  console.log('='.repeat(70));
  console.log('');
  
  const [deployer] = await ethers.getSigners();
  console.log('Deployer:', deployer.address);
  console.log('');
  
  // Contract addresses (Fuji)
  const MARKETPLACE_V3 = '0xf1eA59d71C67e9E6Ea481Aa26911641a6c97370C';
  const AGENT_REGISTRY = '0xb617dfC3FFD0FE1145AE84B0B5d1C915Dcad87dD';
  
  console.log('MarketplaceV3:', MARKETPLACE_V3);
  console.log('AgentRegistry:', AGENT_REGISTRY);
  console.log('');
  
  // Get MarketplaceV3 contract
  const marketplace = await ethers.getContractAt('MarketplaceV3', MARKETPLACE_V3);
  
  // Check current agentRegistry
  const currentRegistry = await marketplace.agentRegistry();
  console.log('Current AgentRegistry:', currentRegistry);
  
  if (currentRegistry === AGENT_REGISTRY) {
    console.log('✅ AgentRegistry already configured correctly!');
    return;
  }
  
  if (currentRegistry !== ethers.ZeroAddress) {
    console.log('⚠️  AgentRegistry already set to different address');
    console.log('   This requires a timelock change');
    return;
  }
  
  // Set AgentRegistry
  console.log('');
  console.log('Setting AgentRegistry...');
  const tx = await marketplace.setAgentRegistry(AGENT_REGISTRY);
  console.log('TX:', tx.hash);
  await tx.wait();
  
  console.log('');
  console.log('✅ AgentRegistry configured successfully!');
  console.log('');
  
  // Verify
  const newRegistry = await marketplace.agentRegistry();
  console.log('New AgentRegistry:', newRegistry);
  
  // Also need to authorize MarketplaceV3 in AgentRegistry
  console.log('');
  console.log('Authorizing MarketplaceV3 in AgentRegistry...');
  const agentRegistry = await ethers.getContractAt('AgentRegistryV2', AGENT_REGISTRY);
  
  try {
    const isAuthorized = await agentRegistry.authorizedCallers(MARKETPLACE_V3);
    if (isAuthorized) {
      console.log('✅ MarketplaceV3 already authorized in AgentRegistry');
    } else {
      const tx2 = await agentRegistry.setAuthorized(MARKETPLACE_V3, true);
      console.log('TX:', tx2.hash);
      await tx2.wait();
      console.log('✅ MarketplaceV3 authorized in AgentRegistry');
    }
  } catch (error) {
    console.log('⚠️  Could not authorize in AgentRegistry:', error);
    console.log('   You may need to call setAuthorized manually');
  }
  
  console.log('');
  console.log('='.repeat(70));
  console.log('DONE! You can now publish models with agent registration.');
  console.log('='.repeat(70));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
