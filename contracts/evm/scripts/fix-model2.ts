import hre from "hardhat";

const ethers = (hre as any).ethers;

async function main() {
  const [signer] = await ethers.getSigners();
  console.log("Executing with wallet:", signer.address);

  const AGENT_REGISTRY = "0xb53c55682eAfa759AfD4000EbcB6436D389812fe";
  const SPLITTER_FACTORY = "0x4e7a74A7015d0c1d0687d9083e675E1F3A2F8dCA";

  // ABI fragments
  const agentAbi = ["function linkModelToAgent(uint256 modelId, uint256 agentId) external"];
  const splitterAbi = ["function aliasSplitter(uint256 newModelId, uint256 existingModelId) external"];

  const agentRegistry = new ethers.Contract(AGENT_REGISTRY, agentAbi, signer);
  const splitterFactory = new ethers.Contract(SPLITTER_FACTORY, splitterAbi, signer);

  console.log("\n=== TX 1: linkModelToAgent(2, 1) ===");
  try {
    const tx1 = await agentRegistry.linkModelToAgent(2, 1);
    console.log("TX Hash:", tx1.hash);
    const receipt1 = await tx1.wait();
    console.log("✅ Confirmed in block:", receipt1.blockNumber);
  } catch (e: any) {
    console.log("❌ Error:", e.reason || e.message);
  }

  console.log("\n=== TX 2: aliasSplitter(2, 1) ===");
  try {
    const tx2 = await splitterFactory.aliasSplitter(2, 1);
    console.log("TX Hash:", tx2.hash);
    const receipt2 = await tx2.wait();
    console.log("✅ Confirmed in block:", receipt2.blockNumber);
  } catch (e: any) {
    console.log("❌ Error:", e.reason || e.message);
  }

  console.log("\n=== DONE ===");
}

main().catch(console.error);
