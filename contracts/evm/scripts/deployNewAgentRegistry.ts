import hre from "hardhat";

/**
 * Deploy a new AgentRegistryV2 for MarketplaceV3
 * 
 * Usage:
 *   npx hardhat run scripts/deployNewAgentRegistry.ts --network avax
 */
async function main() {
  const { ethers } = hre as any;
  
  console.log('='.repeat(70));
  console.log('DEPLOYING NEW AGENT REGISTRY V2');
  console.log('='.repeat(70));
  console.log('');
  
  const [deployer] = await ethers.getSigners();
  console.log('Deployer:', deployer.address);
  console.log('Balance:', ethers.formatEther(await ethers.provider.getBalance(deployer.address)), 'AVAX');
  console.log('');
  
  const MARKETPLACE_V3 = '0xf1eA59d71C67e9E6Ea481Aa26911641a6c97370C';
  
  console.log('MarketplaceV3:', MARKETPLACE_V3);
  console.log('');
  
  // Deploy new AgentRegistryV2
  console.log('Deploying AgentRegistryV2...');
  const AgentRegistryV2 = await ethers.getContractFactory('AgentRegistryV2');
  const agentRegistry = await AgentRegistryV2.deploy(MARKETPLACE_V3);
  await agentRegistry.waitForDeployment();
  
  const agentRegistryAddress = await agentRegistry.getAddress();
  console.log('✅ AgentRegistryV2 deployed at:', agentRegistryAddress);
  console.log('');
  
  // Configure MarketplaceV3 to use new AgentRegistry
  console.log('Configuring MarketplaceV3 to use new AgentRegistry...');
  const marketplace = await ethers.getContractAt('MarketplaceV3', MARKETPLACE_V3);
  const tx = await marketplace.setAgentRegistry(agentRegistryAddress);
  console.log('TX:', tx.hash);
  await tx.wait();
  console.log('✅ MarketplaceV3 configured with new AgentRegistry');
  console.log('');
  
  // Verify configuration
  const configuredRegistry = await marketplace.agentRegistry();
  console.log('Verification:');
  console.log('  MarketplaceV3.agentRegistry():', configuredRegistry);
  console.log('  Match:', configuredRegistry.toLowerCase() === agentRegistryAddress.toLowerCase());
  console.log('');
  
  console.log('─'.repeat(70));
  console.log('UPDATE .env.local:');
  console.log('─'.repeat(70));
  console.log('');
  console.log(`NEXT_PUBLIC_EVM_AGENT_REGISTRY_43113=${agentRegistryAddress}`);
  console.log('');
  
  console.log('─'.repeat(70));
  console.log('VERIFY ON SNOWTRACE:');
  console.log('─'.repeat(70));
  console.log('');
  console.log(`npx hardhat verify --network avax ${agentRegistryAddress} ${MARKETPLACE_V3}`);
  console.log('');
  
  console.log('='.repeat(70));
  console.log('DONE! You can now publish models.');
  console.log('='.repeat(70));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
