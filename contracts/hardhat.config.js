const { readEnvValue } = require("./scripts/read-env");
require("@nomicfoundation/hardhat-ethers");

const deployerKey = readEnvValue("DEPLOYER_PRIVATE_KEY");
const xlayerAccounts = deployerKey ? [deployerKey] : [];

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.28",
    settings: {
      optimizer: { enabled: true, runs: 200 },
      evmVersion: "cancun",
    },
  },
  networks: {
    hardhat: {
      hardfork: "cancun",
    },
    xlayerTestnet: {
      url: "https://xlayertestrpc.okx.com/terigon",
      chainId: 1952,
      accounts: xlayerAccounts,
      timeout: 180000,
    },
    xlayer: {
      url: "https://rpc.xlayer.tech",
      chainId: 196,
      accounts: xlayerAccounts,
    },
  },
};
