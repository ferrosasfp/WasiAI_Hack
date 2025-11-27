import hre from "hardhat";

async function main() {
  const addr = process.env.NFT_ADDRESS as string | undefined;
  if (!addr) throw new Error("Missing NFT_ADDRESS");
  const { ethers } = hre as any;
  const nft = await ethers.getContractAt("LicenseNFT", addr);
  const owner = await nft.owner();
  console.log("owner:", owner);
}

main().catch((e)=>{ console.error(e); process.exitCode = 1; });
