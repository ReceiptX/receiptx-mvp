require("@nomicfoundation/hardhat-toolbox");
require("@openzeppelin/hardhat-upgrades");
require("dotenv").config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  networks: {
    "supra-testnet": {
      url: process.env.SUPRA_TESTNET_RPC || "https://rpc-testnet.supra.com",
      chainId: 6, // Supra testnet chain ID
      accounts: process.env.DEPLOYER_PRIVATE_KEY ? [process.env.DEPLOYER_PRIVATE_KEY] : [],
      gasPrice: 20000000000, // 20 gwei
      gas: 6000000
    },
    hardhat: {
      chainId: 31337
    }
  },
  etherscan: {
    apiKey: {
      "supra-testnet": process.env.SUPRA_API_KEY || "YOUR_API_KEY"
    },
    customChains: [
      {
        network: "supra-testnet",
        chainId: 6,
        urls: {
          apiURL: "https://testnet.suprascan.io/api",
          browserURL: "https://testnet.suprascan.io"
        }
      }
    ]
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  }
};
