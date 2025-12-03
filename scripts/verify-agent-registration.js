/**
 * Verify Agent Registration
 * 
 * Checks if agents were actually registered in AgentRegistryV2
 */

const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');

const CONFIG = {
  rpc: 'https://api.avax-test.network/ext/bc/C/rpc',
  marketplace: '0x9d2f3bF0Dee6a84ba426c912C841f3FAcB2F56DE',
  agentRegistry: '0x21e8ea27D93F523080FCf053331c1fa2d1DEE2d3',
};

const agentRegistryAbi = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../src/abis/AgentRegistryV2.json'), 'utf8')
).abi;

const marketplaceAbi = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../src/abis/MarketplaceV2.json'), 'utf8')
).abi;

async function main() {
  const provider = new ethers.JsonRpcProvider(CONFIG.rpc);
  
  const agentRegistry = new ethers.Contract(CONFIG.agentRegistry, agentRegistryAbi, provider);
  const marketplace = new ethers.Contract(CONFIG.marketplace, marketplaceAbi, provider);
  
  console.log('='.repeat(60));
  console.log('🔍 Verifying Agent Registration');
  console.log('='.repeat(60));
  
  // Check AgentRegistry state
  console.log('\n📊 AgentRegistry State:');
  
  try {
    const nextAgentId = await agentRegistry.nextAgentId();
    console.log(`   nextAgentId: ${nextAgentId}`);
    
    const marketplaceAddr = await agentRegistry.marketplace();
    console.log(`   marketplace: ${marketplaceAddr}`);
    console.log(`   Expected:    ${CONFIG.marketplace}`);
    console.log(`   Match: ${marketplaceAddr.toLowerCase() === CONFIG.marketplace.toLowerCase() ? '✅' : '❌'}`);
  } catch (e) {
    console.log(`   Error reading AgentRegistry: ${e.message}`);
  }
  
  // Check Marketplace state
  console.log('\n📊 Marketplace State:');
  
  try {
    const nextModelId = await marketplace.nextId();
    console.log(`   nextId (models): ${nextModelId}`);
    
    const agentRegistryAddr = await marketplace.agentRegistry();
    console.log(`   agentRegistry: ${agentRegistryAddr}`);
    console.log(`   Expected:      ${CONFIG.agentRegistry}`);
    console.log(`   Match: ${agentRegistryAddr.toLowerCase() === CONFIG.agentRegistry.toLowerCase() ? '✅' : '❌'}`);
  } catch (e) {
    console.log(`   Error reading Marketplace: ${e.message}`);
  }
  
  // Check models 1 and 2
  console.log('\n📋 Checking Models and Agents:');
  
  for (let modelId = 1; modelId <= 2; modelId++) {
    console.log(`\n--- Model #${modelId} ---`);
    
    try {
      // Get model from Marketplace
      const model = await marketplace.models(modelId);
      console.log(`   Model owner: ${model.owner}`);
      console.log(`   Model URI: ${model.uri}`);
      console.log(`   Price Inference: ${model.priceInference.toString()}`);
      
      // Check if agent exists in AgentRegistry
      try {
        const agentId = await agentRegistry.modelToAgent(modelId);
        console.log(`   AgentRegistry.modelToAgent(${modelId}): ${agentId}`);
        
        if (agentId > 0n) {
          const agent = await agentRegistry.agents(agentId);
          console.log(`   Agent #${agentId}:`);
          console.log(`     - owner: ${agent.owner}`);
          console.log(`     - modelId: ${agent.modelId}`);
          console.log(`     - endpoint: ${agent.endpoint}`);
          console.log(`     - wallet: ${agent.wallet}`);
          console.log(`     - metadataUri: ${agent.metadataUri}`);
          console.log(`   ✅ Agent found in AgentRegistry`);
        } else {
          console.log(`   ❌ No agent registered for this model`);
        }
      } catch (e) {
        console.log(`   ❌ Error checking agent: ${e.message}`);
      }
      
    } catch (e) {
      console.log(`   Error: ${e.message}`);
    }
  }
  
  // Check recent events on AgentRegistry
  console.log('\n📜 Recent AgentRegistry Events:');
  
  try {
    const filter = agentRegistry.filters.AgentRegistered();
    const events = await agentRegistry.queryFilter(filter, -1000); // Last 1000 blocks
    
    if (events.length === 0) {
      console.log('   ❌ No AgentRegistered events found');
    } else {
      for (const event of events) {
        console.log(`   Event in block ${event.blockNumber}:`);
        console.log(`     agentId: ${event.args[0]}`);
        console.log(`     modelId: ${event.args[1]}`);
        console.log(`     owner: ${event.args[2]}`);
      }
    }
  } catch (e) {
    console.log(`   Error querying events: ${e.message}`);
  }
  
  console.log('\n' + '='.repeat(60));
}

main().catch(console.error);
