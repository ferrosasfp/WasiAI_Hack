import hre from "hardhat";
import MARKET_ABI from "../artifacts/contracts/Marketplace.sol/Marketplace.json" assert { type: "json" };

async function main() {
  const txHash = process.env.DEPLOY_TX as string | undefined;
  const market = process.env.MARKETPLACE as string | undefined;
  const { ethers } = hre as any;
  if (!txHash && !market) throw new Error('Provide DEPLOY_TX or MARKETPLACE');

  const iface = new (ethers as any).Interface(MARKET_ABI.abi);

  if (txHash) {
    const rc = await ethers.provider.getTransactionReceipt(txHash);
    if (!rc) throw new Error('No receipt for tx');
    for (const log of rc.logs) {
      try {
        const parsed = iface.parseLog({ data: log.data, topics: log.topics });
        if (parsed && parsed.name === 'LicenseNFTCreated') {
          const addr: string = parsed.args[0];
          console.log('LicenseNFT from event:', addr);
          return;
        }
      } catch {}
    }
    console.log('Event not found in tx logs');
  }

  if (market) {
    const c = new (ethers as any).Contract(market, MARKET_ABI.abi, ethers.provider);
    const lic = await c.licenseNFTAddress();
    console.log('LicenseNFT from view():', lic);
  }
}

main().catch((e)=>{ console.error(e); process.exitCode = 1; });
