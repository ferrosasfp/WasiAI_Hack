import hre from "hardhat";

/**
 * Verify x402 inference configuration and test payment flow
 * 
 * Usage:
 *   MODEL_ID=2 npx hardhat run scripts/verifyX402.ts --network avax
 */
async function main() {
  const { ethers } = hre as any;
  
  const modelId = Number(process.env.MODEL_ID);
  if (!modelId) {
    console.error('ERROR: MODEL_ID environment variable is required');
    process.exit(1);
  }
  
  const marketplaceAddress = process.env.MARKETPLACE_ADDRESS || '0x278E6E5417d7af738368dA4a105A0ca80b89C7db';
  
  console.log('='.repeat(70));
  console.log('x402 INFERENCE VERIFICATION');
  console.log('='.repeat(70));
  console.log('Model ID:', modelId);
  console.log('');
  
  const marketplace = await ethers.getContractAt('MarketplaceV2', marketplaceAddress);
  const agentRegistryAddress = await marketplace.agentRegistry();
  const agentRegistry = await ethers.getContractAt('AgentRegistryV2', agentRegistryAddress);
  const paymentToken = await marketplace.paymentToken();
  
  // Get model and agent data
  const model = await marketplace.models(modelId);
  const agentId = await agentRegistry.modelToAgent(modelId);
  
  console.log('─'.repeat(70));
  console.log('1. x402 CONFIGURATION');
  console.log('─'.repeat(70));
  
  const priceInference = model.priceInference;
  const inferenceWallet = model.inferenceWallet;
  
  console.log(`  Price per Inference: ${ethers.formatUnits(priceInference, 6)} USDC`);
  console.log(`  Inference Wallet: ${inferenceWallet}`);
  console.log(`  Payment Token (USDC): ${paymentToken}`);
  
  if (priceInference === 0n) {
    console.log('');
    console.log('  ❌ x402 is DISABLED (price is 0)');
    console.log('     To enable, set a price > 0 in Step 4 of the wizard');
  } else {
    console.log('');
    console.log('  ✅ x402 is ENABLED');
  }
  
  // Agent endpoint
  console.log('');
  console.log('─'.repeat(70));
  console.log('2. AGENT ENDPOINT');
  console.log('─'.repeat(70));
  
  if (agentId > 0n) {
    const agent = await agentRegistry.agents(agentId);
    console.log(`  Agent ID: ${agentId.toString()}`);
    console.log(`  Endpoint: ${agent.endpoint || '(empty)'}`);
    console.log(`  Wallet: ${agent.wallet}`);
    
    if (agent.endpoint && !agent.endpoint.includes('localhost')) {
      console.log('');
      console.log('  ✅ External endpoint configured');
      
      // Test endpoint availability
      console.log('');
      console.log('  Testing endpoint availability...');
      try {
        const response = await fetch(agent.endpoint, {
          method: 'HEAD',
          signal: AbortSignal.timeout(5000)
        });
        console.log(`  Response status: ${response.status}`);
        if (response.status === 200 || response.status === 405 || response.status === 401) {
          console.log('  ✅ Endpoint is reachable');
        } else {
          console.log('  ⚠️  Endpoint returned non-200 status');
        }
      } catch (e: any) {
        console.log(`  ⚠️  Could not reach endpoint: ${e.message}`);
      }
    } else {
      console.log('');
      console.log('  ❌ No valid external endpoint');
    }
  } else {
    console.log('  ❌ No agent registered');
  }
  
  // x402 Payment Flow
  console.log('');
  console.log('─'.repeat(70));
  console.log('3. x402 PAYMENT FLOW');
  console.log('─'.repeat(70));
  
  console.log('  Payment flow for inference:');
  console.log('');
  console.log('  1. Client calls inference endpoint with x402 payment header');
  console.log('  2. Server validates payment (USDC transfer to inference wallet)');
  console.log('  3. If valid, server processes inference request');
  console.log('  4. Response returned to client');
  console.log('');
  console.log('  Required headers for x402:');
  console.log('    X-Payment-Token: <USDC contract address>');
  console.log('    X-Payment-Amount: <amount in base units>');
  console.log('    X-Payment-Signature: <signed payment authorization>');
  
  // Example curl command
  console.log('');
  console.log('─'.repeat(70));
  console.log('4. EXAMPLE INFERENCE REQUEST');
  console.log('─'.repeat(70));
  
  if (agentId > 0n) {
    const agent = await agentRegistry.agents(agentId);
    if (agent.endpoint && !agent.endpoint.includes('localhost')) {
      console.log('');
      console.log('  # Direct inference (no x402 - for testing)');
      console.log(`  curl -X POST "${agent.endpoint}" \\`);
      console.log('    -H "Content-Type: application/json" \\');
      console.log('    -d \'{"inputs": "Your test input here"}\'');
      console.log('');
      console.log('  # Via WasiAI proxy (with x402)');
      console.log(`  curl -X POST "https://wasiai.com/api/inference/${modelId}" \\`);
      console.log('    -H "Content-Type: application/json" \\');
      console.log('    -H "Authorization: Bearer <your-api-key>" \\');
      console.log('    -d \'{"inputs": "Your test input here"}\'');
    }
  }
  
  console.log('');
  console.log('='.repeat(70));
}

main().catch(console.error);
