import hre from "hardhat";

async function main() {
  const nftAddress = process.env.NFT_ADDRESS as string | undefined;
  const baseUri = process.env.BASE_URI as string | undefined;
  if (!nftAddress || !baseUri) {
    throw new Error("Missing NFT_ADDRESS or BASE_URI env var");
  }
  const { ethers } = hre as any;
  const nft = await ethers.getContractAt("LicenseNFT", nftAddress);
  const tx = await nft.setBaseURI(baseUri);
  console.log("setBaseURI tx:", tx.hash);
  const rc = await tx.wait();
  console.log("confirmed in block:", rc?.blockNumber);
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
