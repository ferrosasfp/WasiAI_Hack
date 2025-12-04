import hre from "hardhat";

/**
 * Deploy InferenceSplitter contract
 * 
 * Usage:
 *   npx hardhat run scripts/deployInferenceSplitter.ts --network avax
 * 
 * Environment variables:
 *   MARKETPLACE_ADDRESS - MarketplaceV2 contract address
 *   MARKETPLACE_WALLET - Wallet to receive marketplace fees
 */
async function main() {
  const { ethers } = hre as any;
  
  console.log('='.repeat(70));
  console.log('DEPLOYING INFERENCESPLITTER');
  console.log('='.repeat(70));
  console.log('');
  
  // Get deployer
  const [deployer] = await ethers.getSigners();
  console.log('Deployer:', deployer.address);
  
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log('Balance:', ethers.formatEther(balance), 'AVAX');
  console.log('');
  
  // Contract addresses for Fuji
  // x402 uses this USDC on Avalanche Fuji
  const USDC_X402 = '0x5425890298aed601595a70AB815c96711a31Bc65';
  
  // MarketplaceV2 address
  const MARKETPLACE_ADDRESS = process.env.MARKETPLACE_ADDRESS || '0x278E6E5417d7af738368dA4a105A0ca80b89C7db';
  
  // Marketplace wallet (receives fees)
  const MARKETPLACE_WALLET = process.env.MARKETPLACE_WALLET || '0xfb652f4506731aC58E51b39DCa4F5ECDcb2C1543';
  
  console.log('Configuration:');
  console.log('  USDC (x402):', USDC_X402);
  console.log('  MarketplaceV2:', MARKETPLACE_ADDRESS);
  console.log('  Marketplace Wallet:', MARKETPLACE_WALLET);
  console.log('');
  
  // Deploy InferenceSplitter
  console.log('Deploying InferenceSplitter...');
  
  const InferenceSplitter = await ethers.getContractFactory('InferenceSplitter');
  const splitter = await InferenceSplitter.deploy(
    USDC_X402,
    MARKETPLACE_WALLET,
    MARKETPLACE_ADDRESS
  );
  
  await splitter.waitForDeployment();
  const splitterAddress = await splitter.getAddress();
  
  console.log('');
  console.log('✅ InferenceSplitter deployed!');
  console.log('   Address:', splitterAddress);
  console.log('');
  
  // Verify configuration
  console.log('Verifying configuration...');
  const usdc = await splitter.usdc();
  const marketplaceWallet = await splitter.marketplaceWallet();
  const marketplace = await splitter.marketplace();
  
  console.log('  USDC:', usdc);
  console.log('  Marketplace Wallet:', marketplaceWallet);
  console.log('  Marketplace:', marketplace);
  console.log('');
  
  // Output for .env
  console.log('─'.repeat(70));
  console.log('ADD TO .env.local:');
  console.log('─'.repeat(70));
  console.log('');
  console.log(`NEXT_PUBLIC_INFERENCE_SPLITTER_43113=${splitterAddress}`);
  console.log(`X402_SPLITTER_ADDRESS=${splitterAddress}`);
  console.log('');
  
  // Output for verification
  console.log('─'.repeat(70));
  console.log('VERIFY ON SNOWTRACE:');
  console.log('─'.repeat(70));
  console.log('');
  console.log(`npx hardhat verify --network avax ${splitterAddress} ${USDC_X402} ${MARKETPLACE_WALLET} ${MARKETPLACE_ADDRESS}`);
  console.log('');
  console.log('='.repeat(70));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
