const hre = require("hardhat");

async function main() {
  const args = process.argv.slice(2);
  const getArg = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i+1] : undefined };
  const addr = getArg('--address') || process.env.MARKET_ADDRESS;
  if (!addr) throw new Error('Missing --address');
  const abi = [
    "function feeBps() view returns (uint256)",
    "function feeRecipient() view returns (address)",
    "function owner() view returns (address)"
  ];
  const provider = hre.ethers.provider;
  const c = new hre.ethers.Contract(addr, abi, provider);
  const [fee, recipient, owner] = await Promise.all([
    c.feeBps(), c.feeRecipient(), c.owner()
  ]);
  console.log(`Network: ${hre.network.name} chainId=${hre.network.config.chainId}`);
  console.log('Address:', addr);
  console.log('feeBps:', fee.toString());
  console.log('feeRecipient:', recipient);
  console.log('owner:', owner);
}

main().catch((e)=>{ console.error(e); process.exit(1); });
