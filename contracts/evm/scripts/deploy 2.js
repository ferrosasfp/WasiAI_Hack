const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deployer:", deployer.address);

  const feeBps = parseInt(process.env.MARKET_FEE_BPS || "500", 10);
  const modelsLimit = parseInt(process.env.MARKET_MODELS_LIMIT || "0", 10);
  const feeRecipient = process.env.MARKET_FEE_RECIPIENT || deployer.address;

  const Marketplace = await hre.ethers.getContractFactory("Marketplace");
  const market = await Marketplace.deploy(feeBps, feeRecipient, modelsLimit, deployer.address);
  await market.waitForDeployment();
  const marketAddr = await market.getAddress();
  console.log("Marketplace deployed:", marketAddr);
  // Read constructor event for LicenseNFT address
  const deployTx = market.deploymentTransaction();
  const receipt = await deployTx.wait();
  let licenseAddr = null;
  const iface = new hre.ethers.Interface([
    "event LicenseNFTCreated(address license)"
  ]);
  for (const log of receipt.logs) {
    try {
      const parsed = iface.parseLog({ topics: log.topics, data: log.data });
      if (parsed && parsed.name === 'LicenseNFTCreated') {
        licenseAddr = parsed.args.license;
        break;
      }
    } catch (_) {}
  }
  console.log("LicenseNFT:", licenseAddr || '(not found in logs)');

  // Write deploy output JSON for env sync
  const out = {
    network: hre.network.name,
    chainId: hre.network.config.chainId,
    marketplace: marketAddr,
    licenseNFT: licenseAddr,
    feeBps,
    feeRecipient,
    modelsLimit
  };
  const outPath = path.join(__dirname, "../deploy.out.json");
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
  console.log("Saved", outPath);

  const perNetPath = path.join(__dirname, `../deploy.${hre.network.name}.json`);
  fs.writeFileSync(perNetPath, JSON.stringify(out, null, 2));
  console.log("Saved", perNetPath);
}

main().catch((e) => { console.error(e); process.exit(1); });
