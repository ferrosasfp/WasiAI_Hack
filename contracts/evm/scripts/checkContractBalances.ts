import hre from "hardhat";

/**
 * Check USDC balances in marketplace contracts
 * 
 * Usage:
 *   npx hardhat run scripts/checkContractBalances.ts --network avax
 */
async function main() {
  const { ethers } = hre as any;
  
  const marketplaceAddress = process.env.MARKETPLACE_ADDRESS || '0x278E6E5417d7af738368dA4a105A0ca80b89C7db';
  const usdcAddress = '0xCDa6E1C8340550aC412Ee9BC59ae4Db46745C53e'; // Fuji testnet USDC
  
  console.log('='.repeat(70));
  console.log('CONTRACT BALANCES CHECK');
  console.log('='.repeat(70));
  console.log('');
  
  // Get contracts
  const marketplace = await ethers.getContractAt('MarketplaceV2', marketplaceAddress);
  const usdc = await ethers.getContractAt('IERC20', usdcAddress);
  
  // Get related addresses
  const agentRegistryAddress = await marketplace.agentRegistry();
  const licenseNFTAddress = await marketplace.licenseNFT();
  const feeRecipient = await marketplace.feeRecipient();
  const feeBps = await marketplace.feeBps();
  
  console.log('Contract Addresses:');
  console.log('  MarketplaceV2:', marketplaceAddress);
  console.log('  AgentRegistryV2:', agentRegistryAddress);
  console.log('  LicenseNFT:', licenseNFTAddress);
  console.log('  Fee Recipient:', feeRecipient);
  console.log('  Fee BPS:', feeBps.toString(), `(${Number(feeBps) / 100}%)`);
  console.log('');
  
  // Check USDC balances
  console.log('─'.repeat(70));
  console.log('USDC BALANCES');
  console.log('─'.repeat(70));
  
  const balances = [
    { name: 'MarketplaceV2', address: marketplaceAddress },
    { name: 'AgentRegistryV2', address: agentRegistryAddress },
    { name: 'LicenseNFT', address: licenseNFTAddress },
    { name: 'Fee Recipient', address: feeRecipient },
  ];
  
  let totalInContracts = 0n;
  
  for (const item of balances) {
    const balance = await usdc.balanceOf(item.address);
    const formatted = ethers.formatUnits(balance, 6);
    totalInContracts += balance;
    
    const status = balance > 0n ? '💰' : '✅';
    console.log(`  ${status} ${item.name.padEnd(20)}: ${formatted} USDC`);
    console.log(`     Address: ${item.address}`);
  }
  
  console.log('');
  console.log('─'.repeat(70));
  console.log('SUMMARY');
  console.log('─'.repeat(70));
  
  const totalFormatted = ethers.formatUnits(totalInContracts, 6);
  
  if (totalInContracts === 0n) {
    console.log('  ✅ No USDC stored in contracts');
    console.log('  → Payments are distributed immediately to recipients');
  } else {
    console.log(`  ⚠️  Total USDC in contracts: ${totalFormatted} USDC`);
    console.log('  → This may be stuck funds or pending sweep');
  }
  
  console.log('');
  console.log('─'.repeat(70));
  console.log('PAYMENT FLOW EXPLANATION');
  console.log('─'.repeat(70));
  console.log('');
  console.log('  When a license is purchased:');
  console.log('  1. Buyer approves MarketplaceV2 for USDC amount');
  console.log('  2. MarketplaceV2.buyLicense() is called');
  console.log('  3. USDC is transferred from buyer → MarketplaceV2 (temporary)');
  console.log('  4. IMMEDIATELY distributed:');
  console.log(`     - ${Number(feeBps) / 100}% → Fee Recipient (${feeRecipient.slice(0,10)}...)`);
  console.log('     - X% → Creator (royalty)');
  console.log('     - Rest → Seller');
  console.log('');
  console.log('  ⚠️  NO USDC is stored in the contract!');
  console.log('  → All funds are distributed in the same transaction');
  console.log('');
  console.log('='.repeat(70));
}

main().catch(console.error);
