import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@openzeppelin/hardhat-upgrades";
import "dotenv/config";

const config: HardhatUserConfig = {
  solidity: "0.8.28",
  networks: {
    Ethereum_SEPOLIA: {
      url: process.env.Ethereum_SEPOLIA_RPC_URL || "",
      accounts: [
        process.env.DEPLOYER_PRIVATE_KEY!,
        process.env.EXECUTOR_PRIVATE_KEY!,
        process.env.USER_PRIVATE_KEY!,
        process.env.ATTACKER_PRIVATE_KEY!,
        process.env.SAME_ADDRESS_ALL_PRIVATE_KEY!
      ],
    },
    BSC_SEPOLIA: {
      url: process.env.BSC_SEPOLIA_RPC_URL || "",
      accounts: [
        process.env.DEPLOYER_PRIVATE_KEY!,
        process.env.EXECUTOR_PRIVATE_KEY!,
        process.env.USER_PRIVATE_KEY!,
        process.env.ATTACKER_PRIVATE_KEY!,
        process.env.SAME_ADDRESS_ALL_PRIVATE_KEY!
      ],
    },
    BASE_SEPOLIA: {
      url: process.env.BASE_SEPOLIA_RPC_URL || "",
      accounts: [
        process.env.DEPLOYER_PRIVATE_KEY!,
        process.env.EXECUTOR_PRIVATE_KEY!,
        process.env.USER_PRIVATE_KEY!,
        process.env.ATTACKER_PRIVATE_KEY!,
        process.env.SAME_ADDRESS_ALL_PRIVATE_KEY!
      ],
    },
    ARBITRUM_SEPOLIA: {
      url: process.env.ARBITRUM_SEPOLIA_RPC_URL || "",
      accounts: [
        process.env.DEPLOYER_PRIVATE_KEY!,
        process.env.EXECUTOR_PRIVATE_KEY!,
        process.env.USER_PRIVATE_KEY!,
        process.env.ATTACKER_PRIVATE_KEY!,
        process.env.SAME_ADDRESS_ALL_PRIVATE_KEY!
      ],
      loggingEnabled: true,
    },
    Optimism_Sepolia: {
      url: process.env.Optimism_SEPOLIA_RPC_URL || "",
      accounts: [
        process.env.DEPLOYER_PRIVATE_KEY!,
        process.env.EXECUTOR_PRIVATE_KEY!,
        process.env.USER_PRIVATE_KEY!,
        process.env.ATTACKER_PRIVATE_KEY!,
        process.env.SAME_ADDRESS_ALL_PRIVATE_KEY!
      ],
      loggingEnabled: true,
    },
    Ethereum_Mainnet: {
      url: process.env.Ethereum_Mainnet_RPC_URL || "",
      accounts: [
        process.env.DEPLOYER_PRIVATE_KEY!,
        process.env.EXECUTOR_PRIVATE_KEY!,
        process.env.USER_PRIVATE_KEY!,
        process.env.ATTACKER_PRIVATE_KEY!,
        process.env.SAME_ADDRESS_ALL_PRIVATE_KEY!
      ],
    },
    BSC_Mainnet: {
      url: process.env.BSC_Mainnet_RPC_URL || "",
      accounts: [
        process.env.DEPLOYER_PRIVATE_KEY!,
        process.env.EXECUTOR_PRIVATE_KEY!,
        process.env.USER_PRIVATE_KEY!,
        process.env.ATTACKER_PRIVATE_KEY!,
        process.env.SAME_ADDRESS_ALL_PRIVATE_KEY!
      ],
    },
    Base_Mainnet: {
      url: process.env.Base_Mainnet_RPC_URL || "",
      accounts: [
        process.env.DEPLOYER_PRIVATE_KEY!,
        process.env.EXECUTOR_PRIVATE_KEY!,
        process.env.USER_PRIVATE_KEY!,
        process.env.ATTACKER_PRIVATE_KEY!,
        process.env.SAME_ADDRESS_ALL_PRIVATE_KEY!
      ],
    },
    Arbitrum_Mainnet: {
      url: process.env.Arbitrum_Mainnet_RPC_URL || "",
      accounts: [
        process.env.DEPLOYER_PRIVATE_KEY!,
        process.env.EXECUTOR_PRIVATE_KEY!,
        process.env.USER_PRIVATE_KEY!,
        process.env.ATTACKER_PRIVATE_KEY!,
        process.env.SAME_ADDRESS_ALL_PRIVATE_KEY!
      ],
      loggingEnabled: true,
    },
    Optimism_Mainnet: {
      url: process.env.Optimism_Mainnet_RPC_URL || "",
      accounts: [
        process.env.DEPLOYER_PRIVATE_KEY!,
        process.env.EXECUTOR_PRIVATE_KEY!,
        process.env.USER_PRIVATE_KEY!,
        process.env.ATTACKER_PRIVATE_KEY!,
        process.env.SAME_ADDRESS_ALL_PRIVATE_KEY!
      ],
      loggingEnabled: true,
    },

  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY || "",
  },
};

export default config;