import hre from "hardhat";

async function main() {
  const { ethers } = hre as any;
  const [signer] = await ethers.getSigners();
  const addr = await signer.getAddress();
  const bal = await ethers.provider.getBalance(addr);
  console.log("signer:", addr);
  console.log("balance:", bal.toString());
}

main().catch((e)=>{ console.error(e); process.exitCode = 1; });
