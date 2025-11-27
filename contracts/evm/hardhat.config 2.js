const path = require("path");
require("dotenv").config();
// Load root .env.local to get shared creds
require("dotenv").config({ path: path.resolve(__dirname, "../../.env.local") });
require("@nomicfoundation/hardhat-toolbox");
require("solidity-coverage");

const isCoverage = !!process.env.COVERAGE;

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: { enabled: true, runs: 200 },
      // solidity-coverage may cause stack-too-deep without viaIR; keep viaIR on
      viaIR: true,
    },
  },
  networks: {
    hardhat: {},
    // Base Sepolia testnet
    base: {
      url: process.env.RPC_BASE || "https://sepolia.base.org",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 84532,
    },
    // Avalanche Fuji testnet
    avax: {
      url: process.env.RPC_AVAX || "https://api.avax-test.network/ext/bc/C/rpc",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 43113,
    },
  },
  etherscan: {
    apiKey: {
      avalancheFuji: process.env.SNOWTRACE_API_KEY || '',
      avalanche: process.env.SNOWTRACE_API_KEY || '',
    },
    customChains: [
      {
        network: 'avalancheFuji',
        chainId: 43113,
        urls: {
          apiURL: 'https://api-testnet.snowtrace.io/api',
          browserURL: 'https://testnet.snowtrace.io',
        },
      },
      {
        network: 'avalanche',
        chainId: 43114,
        urls: {
          apiURL: 'https://api.snowtrace.io/api',
          browserURL: 'https://snowtrace.io',
        },
      },
    ],
  },
};
