import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";

dotenv.config();

const PRIVATE_KEY = process.env.PRIVATE_KEY ?? "0x" + "0".repeat(64);
const FEVM_RPC = process.env.FEVM_CALIBRATION_RPC ?? "https://api.calibration.node.glif.io/rpc/v1";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    hardhat: {},
    localhost: {
      url: "http://127.0.0.1:8545",
    },
    calibration: {
      url: FEVM_RPC,
      chainId: 314159,
      accounts: [PRIVATE_KEY],
      timeout: 120000,
    },
    filecoin: {
      url: "https://api.node.glif.io/rpc/v1",
      chainId: 314,
      accounts: [PRIVATE_KEY],
    },
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
};

export default config;
