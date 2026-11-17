import "dotenv/config";
import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

const {
  DEPLOYER_PRIVATE_KEY,
  BASE_SEPOLIA_RPC_URL,
  BASE_MAINNET_RPC_URL,
  BASESCAN_API_KEY,
  COINMARKETCAP_API_KEY,
  REPORT_GAS,
} = process.env;

const accounts = DEPLOYER_PRIVATE_KEY ? [DEPLOYER_PRIVATE_KEY] : [];

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.19",
    settings: {
      optimizer: { enabled: true, runs: 200 },
    },
  },
  networks: {
    hardhat: {
      chainId: 31337,
    },
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 31337,
    },
    baseSepolia: {
      url: BASE_SEPOLIA_RPC_URL || "https://sepolia.base.org",
      chainId: 84532,
      accounts,
    },
    base: {
      url: BASE_MAINNET_RPC_URL || "https://mainnet.base.org",
      chainId: 8453,
      accounts,
    },
  },
  etherscan: {
    apiKey: BASESCAN_API_KEY || "",
  },
  gasReporter: {
    enabled: REPORT_GAS === "true",
    currency: "USD",
    coinmarketcap: COINMARKETCAP_API_KEY,
    excludeContracts: [
      "VulnerableEscrow",
      "ReentrancyAttacker",
      "ReentrantBuyer",
      "EtherRejecter",
    ],
  },
  typechain: {
    outDir: "typechain-types",
    target: "ethers-v6",
  },
  mocha: {
    timeout: 60_000,
  },
};

export default config;
