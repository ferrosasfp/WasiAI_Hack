import hre from "hardhat";

async function main() {
  const [signer] = await (hre as any).ethers.getSigners();
  console.log("signer:", await signer.getAddress());
}

main().catch((e)=>{ console.error(e); process.exitCode = 1; });
