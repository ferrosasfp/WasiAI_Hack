import hre from "hardhat";

async function main() {
  const txHash = process.env.DEPLOY_TX as string | undefined;
  const market = process.env.MARKETPLACE as string | undefined;
  const { ethers, artifacts } = hre as any;
  const art = await artifacts.readArtifact('Marketplace');
  const iface = new (ethers as any).Interface(art.abi);

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
    const c = new (ethers as any).Contract(market, art.abi, ethers.provider);
    const lic = await c.licenseNFTAddress();
    console.log('LicenseNFT from view():', lic);
  }
}

main().catch((e)=>{ console.error(e); process.exitCode = 1; });
