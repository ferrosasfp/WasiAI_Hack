import hre from "hardhat";

/**
 * Check if a model has an associated agent
 */
async function main() {
  const { ethers } = hre as any;
  
  const marketplaceAddress = process.env.MARKETPLACE_ADDRESS || '0x278E6E5417d7af738368dA4a105A0ca80b89C7db';
  const modelId = Number(process.env.MODEL_ID || '1');
  
  console.log('='.repeat(60));
  console.log('Checking Model and Agent Status');
  console.log('='.repeat(60));
  console.log('MarketplaceV2:', marketplaceAddress);
  console.log('Model ID:', modelId);
  console.log('');
  
  // Get contract instances
  const marketplace = await ethers.getContractAt('MarketplaceV2', marketplaceAddress);
  const agentRegistryAddress = await marketplace.agentRegistry();
  const agentRegistry = await ethers.getContractAt('AgentRegistryV2', agentRegistryAddress);
  
  console.log('AgentRegistry:', agentRegistryAddress);
  console.log('');
  
  // Get model data
  console.log('--- MODEL DATA ---');
  const model = await marketplace.models(modelId);
  console.log('Owner:', model.owner);
  console.log('Creator:', model.creator);
  console.log('Name:', model.name);
  console.log('URI:', model.uri);
  console.log('Listed:', model.listed);
  console.log('Version:', model.version.toString());
  console.log('Price Perpetual:', ethers.formatUnits(model.pricePerpetual, 6), 'USDC');
  console.log('Price Subscription:', ethers.formatUnits(model.priceSubscription, 6), 'USDC/mo');
  console.log('Price Inference:', ethers.formatUnits(model.priceInference, 6), 'USDC');
  console.log('Inference Wallet:', model.inferenceWallet);
  console.log('Delivery Rights:', model.deliveryRightsDefault);
  console.log('Delivery Mode:', model.deliveryModeHint);
  console.log('Royalty BPS:', model.royaltyBps.toString());
  console.log('Terms Hash:', model.termsHash);
  console.log('');
  
  // Check if model has an agent via AgentRegistry
  console.log('--- AGENT STATUS ---');
  
  // Method 1: Check modelToAgent mapping
  const agentId = await agentRegistry.modelToAgent(modelId);
  console.log('Agent ID (from modelToAgent):', agentId.toString());
  
  if (agentId > 0) {
    // Get agent data
    const agent = await agentRegistry.agents(agentId);
    console.log('');
    console.log('Agent Data:');
    console.log('  - Model ID:', agent.modelId.toString());
    console.log('  - Wallet:', agent.wallet);
    console.log('  - Endpoint:', agent.endpoint);
    console.log('  - Registered At:', new Date(Number(agent.registeredAt) * 1000).toISOString());
    console.log('  - Active:', agent.active);
    
    // Get agent owner
    try {
      const agentOwner = await agentRegistry.ownerOf(agentId);
      console.log('  - Owner (NFT):', agentOwner);
    } catch (e) {
      console.log('  - Owner (NFT): Error reading');
    }
    
    // Get agent metadata URI
    try {
      const metadataUri = await agentRegistry.tokenURI(agentId);
      console.log('  - Metadata URI:', metadataUri);
    } catch (e) {
      console.log('  - Metadata URI: Error reading');
    }
  } else {
    console.log('');
    console.log('❌ NO AGENT REGISTERED for this model!');
  }
  
  // Method 2: Check family agent (for versioned models)
  console.log('');
  console.log('--- FAMILY AGENT CHECK ---');
  
  // Get slug from model name (approximate - we need the actual slug)
  // For now, let's check if there's a getFamilyAgent function
  try {
    // Try to get the slug hash - this is tricky without knowing the original slug
    // Let's check the nextAgentId to see total agents
    const nextAgentId = await agentRegistry.nextAgentId();
    console.log('Total Agents in Registry:', (nextAgentId - 1n).toString());
    
    // List all agents
    if (nextAgentId > 1) {
      console.log('');
      console.log('All Registered Agents:');
      for (let i = 1; i < Number(nextAgentId); i++) {
        try {
          const agent = await agentRegistry.agents(i);
          const owner = await agentRegistry.ownerOf(i);
          console.log(`  Agent #${i}:`);
          console.log(`    - Model ID: ${agent.modelId.toString()}`);
          console.log(`    - Owner: ${owner}`);
          console.log(`    - Wallet: ${agent.wallet}`);
          console.log(`    - Endpoint: ${agent.endpoint || '(empty)'}`);
          console.log(`    - Active: ${agent.active}`);
        } catch (e) {
          console.log(`  Agent #${i}: Error reading`);
        }
      }
    }
  } catch (e: any) {
    console.log('Error checking agents:', e.message);
  }
  
  console.log('');
  console.log('='.repeat(60));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
