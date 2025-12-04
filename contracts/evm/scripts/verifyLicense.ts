import hre from "hardhat";

/**
 * Verify license purchases for a model
 * 
 * Usage:
 *   MODEL_ID=2 npx hardhat run scripts/verifyLicense.ts --network avax
 *   LICENSE_ID=1 npx hardhat run scripts/verifyLicense.ts --network avax
 */
async function main() {
  const { ethers } = hre as any;
  
  const modelId = Number(process.env.MODEL_ID) || 0;
  const licenseId = Number(process.env.LICENSE_ID) || 0;
  
  if (!modelId && !licenseId) {
    console.error('ERROR: MODEL_ID or LICENSE_ID environment variable is required');
    console.log('Usage:');
    console.log('  MODEL_ID=2 npx hardhat run scripts/verifyLicense.ts --network avax');
    console.log('  LICENSE_ID=1 npx hardhat run scripts/verifyLicense.ts --network avax');
    process.exit(1);
  }
  
  const marketplaceAddress = process.env.MARKETPLACE_ADDRESS || '0x278E6E5417d7af738368dA4a105A0ca80b89C7db';
  
  console.log('='.repeat(70));
  console.log('LICENSE VERIFICATION');
  console.log('='.repeat(70));
  
  const marketplace = await ethers.getContractAt('MarketplaceV2', marketplaceAddress);
  const licenseAddress = await marketplace.licenseNFT();
  const licenseNFT = await ethers.getContractAt('LicenseNFT', licenseAddress);
  
  console.log('Marketplace:', marketplaceAddress);
  console.log('LicenseNFT:', licenseAddress);
  console.log('');
  
  if (licenseId > 0) {
    // Verify specific license
    console.log('─'.repeat(70));
    console.log(`LICENSE #${licenseId}`);
    console.log('─'.repeat(70));
    
    await verifyLicense(marketplace, licenseNFT, licenseId, ethers);
  } else if (modelId > 0) {
    // Find all licenses for model
    console.log('─'.repeat(70));
    console.log(`LICENSES FOR MODEL #${modelId}`);
    console.log('─'.repeat(70));
    
    // Get total supply and check each license
    const totalSupply = await licenseNFT.totalSupply();
    console.log(`Total licenses minted: ${totalSupply.toString()}`);
    console.log('');
    
    let found = 0;
    for (let i = 1; i <= Number(totalSupply); i++) {
      try {
        const license = await marketplace.licenses(i);
        if (Number(license.modelId) === modelId) {
          found++;
          console.log(`\n--- License #${i} ---`);
          await verifyLicense(marketplace, licenseNFT, i, ethers);
        }
      } catch (e) {
        // License doesn't exist or was burned
      }
    }
    
    if (found === 0) {
      console.log('No licenses found for this model');
    } else {
      console.log(`\nTotal licenses for model #${modelId}: ${found}`);
    }
  }
  
  console.log('');
  console.log('='.repeat(70));
}

async function verifyLicense(marketplace: any, licenseNFT: any, licenseId: number, ethers: any) {
  try {
    // Get license data from marketplace
    const license = await marketplace.licenses(licenseId);
    const status = await marketplace.licenseStatus(licenseId);
    
    // Get NFT owner
    let owner = '(burned or not minted)';
    try {
      owner = await licenseNFT.ownerOf(licenseId);
    } catch (e) {}
    
    // Get token URI
    let tokenUri = '(not available)';
    try {
      tokenUri = await licenseNFT.tokenURI(licenseId);
    } catch (e) {}
    
    const kindNames = ['Perpetual', 'Subscription'];
    
    console.log(`  Model ID: ${license.modelId.toString()}`);
    console.log(`  Owner: ${owner}`);
    console.log(`  Kind: ${kindNames[Number(license.kind)] || 'Unknown'}`);
    console.log(`  Minted At: ${new Date(Number(license.mintedAt) * 1000).toISOString()}`);
    console.log(`  Expires At: ${license.expiresAt > 0 ? new Date(Number(license.expiresAt) * 1000).toISOString() : 'Never (Perpetual)'}`);
    console.log(`  Transferable: ${license.transferable ? '✅ Yes' : '❌ No'}`);
    console.log(`  Token URI: ${tokenUri}`);
    console.log('');
    console.log('  Status:');
    console.log(`    Revoked: ${status[0] ? '❌ Yes' : '✅ No'}`);
    console.log(`    Valid for API: ${status[1] ? '✅ Yes' : '❌ No'}`);
    console.log(`    Valid for Download: ${status[2] ? '✅ Yes' : '❌ No'}`);
    
    // Check if license is valid
    const isValid = !status[0] && (status[1] || status[2]);
    console.log('');
    console.log(`  Overall: ${isValid ? '✅ VALID' : '❌ INVALID'}`);
    
  } catch (e: any) {
    console.log(`  ❌ Error: ${e.message}`);
  }
}

main().catch(console.error);
