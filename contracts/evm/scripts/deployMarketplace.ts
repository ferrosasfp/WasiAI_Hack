import hre from "hardhat";

async function main() {
  const { ethers } = hre as any;
  const feeBps = Number(process.env.FEE_BPS ?? '2000');
  const feeRecipient = process.env.FEE_RECIPIENT as string | undefined;
  const modelsLimit = Number(process.env.MODELS_LIMIT ?? '0');
  const licenseOwner = process.env.LICENSE_NFT_OWNER as string | undefined;
  if (!feeRecipient || !licenseOwner) throw new Error('Missing FEE_RECIPIENT or LICENSE_NFT_OWNER');

  const [signer] = await ethers.getSigners();
  console.log('deployer:', await signer.getAddress());
  console.log('params:', { feeBps, feeRecipient, modelsLimit, licenseOwner });

  const Market = await ethers.getContractFactory('Marketplace');
  const mkt = await Market.deploy(feeBps, feeRecipient, modelsLimit, licenseOwner);
  console.log('Marketplace tx:', mkt.deploymentTransaction()?.hash);
  const deployed = await mkt.waitForDeployment();
  const marketAddr = await deployed.getAddress();
  console.log('Marketplace address:', marketAddr);

  // read license address via view function
  const licAddr: string = await (await ethers.getContractAt('Marketplace', marketAddr)).licenseNFTAddress();
  console.log('LicenseNFT address:', licAddr);
}

main().catch((e)=>{ console.error(e); process.exitCode = 1; });
