import hre from "hardhat";

/**
 * Set the payment token for MarketplaceV3
 * 
 * Usage:
 *   npx hardhat run scripts/setPaymentToken.ts --network avax
 */
async function main() {
  const { ethers } = hre as any;
  
  console.log('='.repeat(70));
  console.log('SET PAYMENT TOKEN FOR MARKETPLACE V3');
  console.log('='.repeat(70));
  console.log('');
  
  const MARKETPLACE_V3 = '0xf1eA59d71C67e9E6Ea481Aa26911641a6c97370C';
  const MOCK_USDC = '0xCDa6E1C8340550aC412Ee9BC59ae4Db46745C53e'; // MockUSDC for licenses
  
  const marketplace = await ethers.getContractAt('MarketplaceV3', MARKETPLACE_V3);
  
  const currentToken = await marketplace.paymentToken();
  console.log('Current paymentToken:', currentToken);
  console.log('Target paymentToken:', MOCK_USDC);
  console.log('');
  
  if (currentToken.toLowerCase() === MOCK_USDC.toLowerCase()) {
    console.log('✅ Already configured correctly!');
    return;
  }
  
  console.log('Setting new payment token...');
  const tx = await marketplace.setPaymentToken(MOCK_USDC);
  console.log('TX:', tx.hash);
  await tx.wait();
  
  const newToken = await marketplace.paymentToken();
  console.log('');
  console.log('✅ Payment token updated!');
  console.log('New paymentToken:', newToken);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
