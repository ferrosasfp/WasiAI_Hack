import hre from "hardhat";

async function main() {
  const { ethers } = hre as any;
  
  const AGENT_REGISTRY = '0xb617dfC3FFD0FE1145AE84B0B5d1C915Dcad87dD';
  const MARKETPLACE_V3 = '0xf1eA59d71C67e9E6Ea481Aa26911641a6c97370C';
  
  console.log('Checking AgentRegistry marketplace configuration...');
  
  const agentRegistry = await ethers.getContractAt('AgentRegistryV2', AGENT_REGISTRY);
  const currentMarketplace = await agentRegistry.marketplace();
  
  console.log('Current marketplace:', currentMarketplace);
  console.log('Target marketplace:', MARKETPLACE_V3);
  
  if (currentMarketplace.toLowerCase() === MARKETPLACE_V3.toLowerCase()) {
    console.log('✅ Already configured correctly!');
    return;
  }
  
  console.log('Setting new marketplace...');
  const tx = await agentRegistry.setMarketplace(MARKETPLACE_V3);
  console.log('TX:', tx.hash);
  await tx.wait();
  
  console.log('✅ MarketplaceV3 authorized in AgentRegistry!');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
