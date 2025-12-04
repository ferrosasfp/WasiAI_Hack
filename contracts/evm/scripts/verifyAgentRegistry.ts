import hre from "hardhat";

/**
 * Verify that AgentRegistry is properly linked to MarketplaceV2
 */
async function main() {
  const { ethers } = hre as any;
  
  const marketplaceAddress = process.env.MARKETPLACE_ADDRESS;
  if (!marketplaceAddress) {
    throw new Error('Missing MARKETPLACE_ADDRESS environment variable');
  }
  
  console.log('='.repeat(60));
  console.log('Verifying AgentRegistry Configuration');
  console.log('='.repeat(60));
  console.log('MarketplaceV2 address:', marketplaceAddress);
  console.log('');
  
  // Get contract instance
  const marketplace = await ethers.getContractAt('MarketplaceV2', marketplaceAddress);
  
  // Check agentRegistry
  const agentRegistryAddress = await marketplace.agentRegistry();
  console.log('AgentRegistry address:', agentRegistryAddress);
  
  if (agentRegistryAddress === '0x0000000000000000000000000000000000000000') {
    console.log('');
    console.log('❌ ERROR: AgentRegistry is NOT configured!');
    console.log('');
    console.log('To fix this, run:');
    console.log('  npx hardhat run scripts/setAgentRegistry.ts --network fuji');
    console.log('');
    process.exit(1);
  }
  
  console.log('✅ AgentRegistry is configured');
  
  // Verify AgentRegistry contract
  const agentRegistry = await ethers.getContractAt('AgentRegistryV2', agentRegistryAddress);
  const marketplaceInRegistry = await agentRegistry.marketplace();
  console.log('');
  console.log('AgentRegistry.marketplace():', marketplaceInRegistry);
  
  if (marketplaceInRegistry.toLowerCase() !== marketplaceAddress.toLowerCase()) {
    console.log('');
    console.log('❌ ERROR: AgentRegistry.marketplace() does not match MarketplaceV2 address!');
    process.exit(1);
  }
  
  console.log('✅ AgentRegistry.marketplace() matches MarketplaceV2');
  
  // Check payment token
  const paymentToken = await marketplace.paymentToken();
  console.log('');
  console.log('PaymentToken (USDC):', paymentToken);
  
  if (paymentToken === '0x0000000000000000000000000000000000000000') {
    console.log('');
    console.log('❌ ERROR: PaymentToken is NOT configured!');
    process.exit(1);
  }
  
  console.log('✅ PaymentToken is configured');
  
  // Check other important settings
  const feeBps = await marketplace.feeBps();
  const feeRecipient = await marketplace.feeRecipient();
  const nextId = await marketplace.nextId();
  const activeModels = await marketplace.activeModels();
  
  console.log('');
  console.log('Contract State:');
  console.log('  - feeBps:', feeBps.toString());
  console.log('  - feeRecipient:', feeRecipient);
  console.log('  - nextId:', nextId.toString());
  console.log('  - activeModels:', activeModels.toString());
  
  console.log('');
  console.log('='.repeat(60));
  console.log('All checks passed! Contract is properly configured.');
  console.log('='.repeat(60));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
