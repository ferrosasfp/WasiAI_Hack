import hre from "hardhat";

/**
 * Advance nextId in MarketplaceV3 to avoid collision with existing agents
 * 
 * Usage:
 *   npx hardhat run scripts/advanceNextId.ts --network avax
 */
async function main() {
  const { ethers } = hre as any;
  
  console.log('='.repeat(70));
  console.log('CHECKING AGENT REGISTRY STATE');
  console.log('='.repeat(70));
  
  const MARKETPLACE_V3 = '0xf1eA59d71C67e9E6Ea481Aa26911641a6c97370C';
  const AGENT_REGISTRY = '0xb617dfC3FFD0FE1145AE84B0B5d1C915Dcad87dD';
  
  const marketplace = await ethers.getContractAt('MarketplaceV3', MARKETPLACE_V3);
  const agentRegistry = await ethers.getContractAt('AgentRegistryV2', AGENT_REGISTRY);
  
  const marketNextId = await marketplace.nextId();
  const agentNextId = await agentRegistry.nextAgentId();
  
  console.log('MarketplaceV3 nextId:', marketNextId.toString());
  console.log('AgentRegistry nextAgentId:', agentNextId.toString());
  
  // Check which modelIds already have agents
  console.log('\nChecking existing agent mappings...');
  for (let i = 1; i <= 10; i++) {
    const agentId = await agentRegistry.modelToAgent(i);
    if (agentId > 0) {
      console.log(`  modelId ${i} -> agentId ${agentId}`);
    }
  }
  
  // Find the highest modelId with an agent
  let highestModelId = 0;
  for (let i = 1; i <= 100; i++) {
    try {
      const agentId = await agentRegistry.modelToAgent(i);
      if (agentId > 0) {
        highestModelId = i;
      }
    } catch {
      break;
    }
  }
  
  console.log('\nHighest modelId with agent:', highestModelId);
  
  if (marketNextId <= highestModelId) {
    console.log('\n⚠️  COLLISION DETECTED!');
    console.log(`   MarketplaceV3 will create modelId ${marketNextId}`);
    console.log(`   But AgentRegistry already has agent for modelId ${marketNextId}`);
    console.log('\nTo fix this, you need to either:');
    console.log('  1. Clear the agent mappings in AgentRegistry (requires contract modification)');
    console.log('  2. Deploy a new AgentRegistry');
    console.log('  3. Manually advance nextId in MarketplaceV3 (if function exists)');
  } else {
    console.log('\n✅ No collision - MarketplaceV3 nextId is higher than existing agents');
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
