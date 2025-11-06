const hre = require("hardhat");

async function main() {
  const [signer] = await hre.ethers.getSigners();
  const args = process.argv.slice(2);
  // Usage: node set-fees.js --address <market> --bps <feeBps> --recipient <addr>
  const getArg = (k) => {
    const i = args.indexOf(k);
    return i >= 0 ? args[i+1] : undefined;
  };
  const marketAddr = getArg('--address') || process.env.MARKET_ADDRESS;
  const feeBps = parseInt(getArg('--bps') || process.env.MARKET_FEE_BPS, 10);
  const recipient = getArg('--recipient') || process.env.MARKET_FEE_RECIPIENT || signer.address;
  if (!marketAddr) throw new Error('Missing --address');
  if (!Number.isFinite(feeBps)) throw new Error('Missing/invalid --bps');

  const abi = [
    "function setFees(uint256 newFeeBps, address newRecipient) external",
    "function feeBps() view returns (uint256)",
    "function feeRecipient() view returns (address)"
  ];

  const c = new hre.ethers.Contract(marketAddr, abi, signer);
  console.log(`Network: ${hre.network.name} chainId=${hre.network.config.chainId}`);
  console.log(`Signer: ${signer.address}`);
  console.log(`Setting fees on ${marketAddr} -> feeBps=${feeBps}, recipient=${recipient}`);
  const tx = await c.setFees(feeBps, recipient);
  console.log('Tx sent:', tx.hash);
  const rc = await tx.wait();
  console.log('Tx mined in block', rc.blockNumber);
  const onchainFee = await c.feeBps();
  const onchainRec = await c.feeRecipient();
  console.log('On-chain feeBps:', onchainFee.toString());
  console.log('On-chain recipient:', onchainRec);
}

main().catch((e) => { console.error(e); process.exit(1); });
