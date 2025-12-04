import hre from "hardhat";

async function main() {
  const { ethers } = hre as any;
  
  const agentRegistryAddress = '0xb617dfC3FFD0FE1145AE84B0B5d1C915Dcad87dD';
  const agentRegistry = await ethers.getContractAt('AgentRegistryV2', agentRegistryAddress);
  
  console.log('='.repeat(60));
  console.log('Verifying Agent #2 exists on-chain');
  console.log('='.repeat(60));
  
  // Check nextAgentId
  const nextId = await agentRegistry.nextAgentId();
  console.log('Next Agent ID:', nextId.toString());
  console.log('Total Agents:', (nextId - 1n).toString());
  
  // Check Agent #2 directly
  console.log('');
  console.log('--- Agent #2 Data ---');
  const agent2 = await agentRegistry.agents(2);
  console.log('Model ID:', agent2.modelId.toString());
  console.log('Wallet:', agent2.wallet);
  console.log('Endpoint:', agent2.endpoint);
  console.log('Registered At:', new Date(Number(agent2.registeredAt) * 1000).toISOString());
  console.log('Active:', agent2.active);
  
  // Check owner of NFT #2
  console.log('');
  console.log('--- NFT Ownership ---');
  try {
    const owner = await agentRegistry.ownerOf(2);
    console.log('Owner of Agent NFT #2:', owner);
  } catch (e: any) {
    console.log('Error getting owner:', e.message);
  }
  
  // Check modelToAgent mapping
  console.log('');
  console.log('--- Model to Agent Mapping ---');
  const agentForModel2 = await agentRegistry.modelToAgent(2);
  console.log('Agent ID for Model #2:', agentForModel2.toString());
  
  // Verify the endpoint is correct
  console.log('');
  console.log('--- Endpoint Verification ---');
  const expectedEndpoint = 'https://router.huggingface.co/hf-inference/models/cardiffnlp/twitter-xlm-roberta-base-sentiment';
  console.log('Expected:', expectedEndpoint);
  console.log('Actual:', agent2.endpoint);
  console.log('Match:', agent2.endpoint === expectedEndpoint ? '✅ YES' : '❌ NO');
  
  console.log('');
  console.log('='.repeat(60));
}

main().catch(console.error);
