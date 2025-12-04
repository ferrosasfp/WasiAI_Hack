import hre from "hardhat";

/**
 * Verify model and agent registration on blockchain
 * 
 * Usage:
 *   MODEL_ID=2 npx hardhat run scripts/verifyModelAgent.ts --network avax
 * 
 * Environment variables:
 *   MODEL_ID - The model ID to verify (required)
 *   MARKETPLACE_ADDRESS - Override marketplace address (optional)
 */
async function main() {
  const { ethers } = hre as any;
  
  const modelId = Number(process.env.MODEL_ID);
  if (!modelId) {
    console.error('ERROR: MODEL_ID environment variable is required');
    console.log('Usage: MODEL_ID=2 npx hardhat run scripts/verifyModelAgent.ts --network avax');
    process.exit(1);
  }
  
  const marketplaceAddress = process.env.MARKETPLACE_ADDRESS || '0x278E6E5417d7af738368dA4a105A0ca80b89C7db';
  
  console.log('='.repeat(70));
  console.log('MODEL & AGENT VERIFICATION');
  console.log('='.repeat(70));
  console.log('Model ID:', modelId);
  console.log('Marketplace:', marketplaceAddress);
  console.log('');
  
  // Get contracts
  const marketplace = await ethers.getContractAt('MarketplaceV2', marketplaceAddress);
  const agentRegistryAddress = await marketplace.agentRegistry();
  const agentRegistry = await ethers.getContractAt('AgentRegistryV2', agentRegistryAddress);
  const licenseAddress = await marketplace.licenseNFT();
  
  console.log('AgentRegistry:', agentRegistryAddress);
  console.log('LicenseNFT:', licenseAddress);
  console.log('');
  
  // ========== MODEL VERIFICATION ==========
  console.log('─'.repeat(70));
  console.log('1. MODEL DATA (MarketplaceV2)');
  console.log('─'.repeat(70));
  
  const model = await marketplace.models(modelId);
  
  const modelChecks = {
    'Owner': model.owner,
    'Creator': model.creator,
    'Name': model.name,
    'URI': model.uri,
    'Listed': model.listed ? '✅ Yes' : '❌ No',
    'Version': model.version.toString(),
    'Price Perpetual': `${ethers.formatUnits(model.pricePerpetual, 6)} USDC`,
    'Price Subscription': `${ethers.formatUnits(model.priceSubscription, 6)} USDC/mo`,
    'Price Inference': `${ethers.formatUnits(model.priceInference, 6)} USDC`,
    'Inference Wallet': model.inferenceWallet,
    'Delivery Rights': model.deliveryRightsDefault.toString(),
    'Delivery Mode': model.deliveryModeHint.toString(),
    'Royalty BPS': `${model.royaltyBps.toString()} (${Number(model.royaltyBps) / 100}%)`,
    'Terms Hash': model.termsHash,
  };
  
  for (const [key, value] of Object.entries(modelChecks)) {
    console.log(`  ${key.padEnd(20)}: ${value}`);
  }
  
  // ========== AGENT VERIFICATION ==========
  console.log('');
  console.log('─'.repeat(70));
  console.log('2. AGENT DATA (AgentRegistryV2)');
  console.log('─'.repeat(70));
  
  const agentId = await agentRegistry.modelToAgent(modelId);
  
  if (agentId > 0n) {
    const agent = await agentRegistry.agents(agentId);
    const agentOwner = await agentRegistry.ownerOf(agentId);
    let metadataUri = '';
    try {
      metadataUri = await agentRegistry.tokenURI(agentId);
    } catch (e) {
      metadataUri = '(not available)';
    }
    
    const agentChecks = {
      'Agent ID': agentId.toString(),
      'NFT Owner': agentOwner,
      'Model ID': agent.modelId.toString(),
      'Wallet': agent.wallet,
      'Endpoint': agent.endpoint || '(empty)',
      'Registered At': new Date(Number(agent.registeredAt) * 1000).toISOString(),
      'Active': agent.active ? '✅ Yes' : '❌ No',
      'Metadata URI': metadataUri,
    };
    
    for (const [key, value] of Object.entries(agentChecks)) {
      console.log(`  ${key.padEnd(20)}: ${value}`);
    }
    
    // Endpoint validation
    console.log('');
    console.log('  Endpoint Check:');
    if (!agent.endpoint || agent.endpoint === '') {
      console.log('    ❌ EMPTY - Agent has no inference endpoint configured');
    } else if (agent.endpoint.includes('localhost')) {
      console.log('    ⚠️  WARNING - Endpoint is localhost (fallback used during publish)');
      console.log('    → This means Step 3 inferenceConfig was not passed correctly');
    } else if (agent.endpoint.startsWith('https://')) {
      console.log('    ✅ VALID - External HTTPS endpoint configured');
    } else {
      console.log('    ⚠️  CHECK - Endpoint format may be incorrect');
    }
  } else {
    console.log('  ❌ NO AGENT REGISTERED for this model');
    console.log('');
    console.log('  Possible causes:');
    console.log('    - Model was published without inference endpoint in Step 3');
    console.log('    - AgentRegistry was not linked to Marketplace during publish');
    console.log('    - Transaction failed silently');
  }
  
  // ========== NFT VERIFICATION ==========
  console.log('');
  console.log('─'.repeat(70));
  console.log('3. NFT VERIFICATION');
  console.log('─'.repeat(70));
  
  // Check if agent NFT exists
  if (agentId > 0n) {
    console.log(`  Agent NFT #${agentId}:`);
    try {
      const owner = await agentRegistry.ownerOf(agentId);
      console.log(`    ✅ Exists - Owner: ${owner}`);
    } catch (e) {
      console.log(`    ❌ Does not exist or burned`);
    }
  }
  
  // Check total agents
  const nextAgentId = await agentRegistry.nextAgentId();
  console.log(`  Total Agents in Registry: ${(nextAgentId - 1n).toString()}`);
  
  // ========== SUMMARY ==========
  console.log('');
  console.log('='.repeat(70));
  console.log('VERIFICATION SUMMARY');
  console.log('='.repeat(70));
  
  const issues: string[] = [];
  
  if (!model.listed) issues.push('Model is not listed');
  if (agentId === 0n) issues.push('No agent registered');
  if (agentId > 0n) {
    const agent = await agentRegistry.agents(agentId);
    if (!agent.endpoint) issues.push('Agent endpoint is empty');
    if (agent.endpoint?.includes('localhost')) issues.push('Agent endpoint is localhost (should be external)');
    if (!agent.active) issues.push('Agent is not active');
  }
  if (model.priceInference === 0n) issues.push('Inference price is 0 (x402 disabled)');
  
  if (issues.length === 0) {
    console.log('✅ All checks passed!');
  } else {
    console.log('⚠️  Issues found:');
    issues.forEach(issue => console.log(`   - ${issue}`));
  }
  
  console.log('='.repeat(70));
}

main().catch(console.error);
