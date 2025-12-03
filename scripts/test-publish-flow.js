/**
 * Test Script: Single-Signature Publish Flow
 * 
 * Tests the listOrUpgradeWithAgent function on MarketplaceV2
 * 
 * Usage: node scripts/test-publish-flow.js
 */

const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  rpc: 'https://api.avax-test.network/ext/bc/C/rpc',
  chainId: 43113,
  marketplace: '0x9d2f3bF0Dee6a84ba426c912C841f3FAcB2F56DE',
  agentRegistry: '0x21e8ea27D93F523080FCf053331c1fa2d1DEE2d3',
  privateKey: process.env.PRIVATE_KEY || '0x6b8234f2afe07348859e3146fd0b4750a0714dbc5b5372038841dbc02e869cb7'
};

// Load ABIs
const marketplaceAbi = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../src/abis/MarketplaceV2.json'), 'utf8')
).abi;

const agentRegistryAbi = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../src/abis/AgentRegistryV2.json'), 'utf8')
).abi;

async function main() {
  console.log('='.repeat(60));
  console.log('🧪 Testing Single-Signature Publish Flow');
  console.log('='.repeat(60));
  
  // Setup provider and wallet
  const provider = new ethers.JsonRpcProvider(CONFIG.rpc);
  const wallet = new ethers.Wallet(CONFIG.privateKey, provider);
  
  console.log(`\n📍 Network: Avalanche Fuji (${CONFIG.chainId})`);
  console.log(`👛 Wallet: ${wallet.address}`);
  
  const balance = await provider.getBalance(wallet.address);
  console.log(`💰 Balance: ${ethers.formatEther(balance)} AVAX`);
  
  if (balance < ethers.parseEther('0.01')) {
    console.error('❌ Insufficient balance. Need at least 0.01 AVAX');
    process.exit(1);
  }
  
  // Connect to contracts
  const marketplace = new ethers.Contract(CONFIG.marketplace, marketplaceAbi, wallet);
  const agentRegistry = new ethers.Contract(CONFIG.agentRegistry, agentRegistryAbi, wallet);
  
  // Check AgentRegistry is set
  console.log('\n🔍 Checking contract configuration...');
  const registryAddr = await marketplace.agentRegistry();
  console.log(`   AgentRegistry: ${registryAddr}`);
  
  if (registryAddr === ethers.ZeroAddress) {
    console.error('❌ AgentRegistry not set in Marketplace!');
    process.exit(1);
  }
  
  // Get current model count
  const nextIdBefore = await marketplace.nextId();
  console.log(`   Current nextId: ${nextIdBefore}`);
  
  // Prepare test data
  const timestamp = Date.now();
  const testSlug = `test-model-${timestamp}`;
  const testName = `Test Model ${timestamp}`;
  const testUri = `ipfs://QmTest${timestamp}`;
  const termsHash = ethers.keccak256(ethers.toUtf8Bytes('MIT License'));
  
  console.log('\n📝 Test Model Data:');
  console.log(`   Slug: ${testSlug}`);
  console.log(`   Name: ${testName}`);
  console.log(`   URI: ${testUri}`);
  
  // Agent params
  const agentParams = {
    endpoint: `https://api.wasiai.com/inference/${testSlug}`,
    wallet: wallet.address,
    metadataUri: `ipfs://QmAgent${timestamp}`
  };
  
  console.log('\n🤖 Agent Params:');
  console.log(`   Endpoint: ${agentParams.endpoint}`);
  console.log(`   Wallet: ${agentParams.wallet}`);
  console.log(`   MetadataUri: ${agentParams.metadataUri}`);
  
  // Execute listOrUpgradeWithAgent
  console.log('\n🚀 Executing listOrUpgradeWithAgent...');
  
  try {
    // Rights values: 1=API, 2=DOWNLOAD, 3=BOTH
    const RIGHTS_API = 1;
    const RIGHTS_DOWNLOAD = 2;
    const RIGHTS_BOTH = 3;
    
    const tx = await marketplace.listOrUpgradeWithAgent(
      testSlug,                    // slug
      testName,                    // name
      testUri,                     // uri
      500,                         // royaltyBps (5%)
      ethers.parseEther('10'),     // pricePerpetual (10 AVAX)
      ethers.parseEther('1'),      // priceSubscription (1 AVAX/month)
      30,                          // defaultDurationDays
      RIGHTS_BOTH,                 // deliveryRightsDefault (API + Download)
      RIGHTS_BOTH,                 // deliveryModeHint (API + Download)
      termsHash,                   // termsHash
      10000n,                      // priceInference (0.01 USDC)
      wallet.address,              // inferenceWallet
      agentParams                  // agentParams struct
    );
    
    console.log(`   TX Hash: ${tx.hash}`);
    console.log('   Waiting for confirmation...');
    
    const receipt = await tx.wait();
    console.log(`   ✅ Confirmed in block ${receipt.blockNumber}`);
    console.log(`   Gas used: ${receipt.gasUsed.toString()}`);
    
    // Parse events
    console.log('\n📊 Events emitted:');
    
    for (const log of receipt.logs) {
      try {
        // Try to parse as Marketplace event
        const parsed = marketplace.interface.parseLog({
          topics: log.topics,
          data: log.data
        });
        if (parsed) {
          console.log(`   [Marketplace] ${parsed.name}:`, parsed.args);
        }
      } catch {
        try {
          // Try to parse as AgentRegistry event
          const parsed = agentRegistry.interface.parseLog({
            topics: log.topics,
            data: log.data
          });
          if (parsed) {
            console.log(`   [AgentRegistry] ${parsed.name}:`, parsed.args);
          }
        } catch {
          // Unknown event, skip
        }
      }
    }
    
    // Verify model was created
    const nextIdAfter = await marketplace.nextId();
    const modelId = Number(nextIdAfter) - 1;
    console.log(`\n✅ Model created with ID: ${modelId}`);
    
    // Get model details
    const model = await marketplace.models(modelId);
    console.log('\n📋 Model Details:');
    console.log(`   Owner: ${model.owner}`);
    console.log(`   Slug: ${model.slug}`);
    console.log(`   URI: ${model.uri}`);
    console.log(`   Royalty: ${Number(model.royaltyBps) / 100}%`);
    console.log(`   Price Inference: ${model.priceInference.toString()} (USDC base units)`);
    
    // Check if agent was created
    const agentId = await agentRegistry.modelToAgent(modelId);
    if (agentId > 0n) {
      console.log(`\n🤖 Agent created with ID: ${agentId}`);
      
      const agent = await agentRegistry.agents(agentId);
      console.log('   Agent Details:');
      console.log(`   - Owner: ${agent.owner}`);
      console.log(`   - ModelId: ${agent.modelId}`);
      console.log(`   - Endpoint: ${agent.endpoint}`);
      console.log(`   - Wallet: ${agent.wallet}`);
      console.log(`   - MetadataUri: ${agent.metadataUri}`);
    } else {
      console.log('\n⚠️ No agent was created (agentId = 0)');
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ TEST PASSED: Single-signature publish flow works!');
    console.log('='.repeat(60));
    
    // Print explorer links
    console.log('\n🔗 Explorer Links:');
    console.log(`   TX: https://testnet.snowtrace.io/tx/${tx.hash}`);
    console.log(`   Model: https://testnet.snowtrace.io/address/${CONFIG.marketplace}#readContract`);
    
  } catch (error) {
    console.error('\n❌ Transaction failed:', error.message);
    
    if (error.data) {
      try {
        const decoded = marketplace.interface.parseError(error.data);
        console.error('   Error:', decoded.name, decoded.args);
      } catch {
        console.error('   Raw error data:', error.data);
      }
    }
    
    process.exit(1);
  }
}

main().catch(console.error);
