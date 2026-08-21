import type { Chain } from "viem";
import { PAYPORT_ADDRESS, SETTLEMENT_TOKEN_ADDRESS } from "@/lib/contract-address";

export type RailKey = "xlayer-testnet" | "xlayer";

export type RailConfig = {
  key: RailKey;
  label: string;
  chain: Chain;
  nativeSymbol: string;
  explorerUrl: string;
  faucetUrl: string;
  contractAddress: `0x${string}`;
};

export const xlayerTestnet: Chain = {
  id: 1952,
  name: "X Layer Testnet",
  nativeCurrency: { name: "OKB", symbol: "OKB", decimals: 18 },
  rpcUrls: {
    default: {
      http: ["https://testrpc.xlayer.tech/terigon"],
    },
  },
  blockExplorers: {
    default: {
      name: "OKX Explorer",
      url: "https://www.okx.com/web3/explorer/xlayer-test",
    },
  },
};

export const xlayerMainnet: Chain = {
  id: 196,
  name: "X Layer",
  nativeCurrency: { name: "OKB", symbol: "OKB", decimals: 18 },
  rpcUrls: {
    default: {
      http: ["https://rpc.xlayer.tech"],
    },
  },
  blockExplorers: {
    default: {
      name: "OKX Explorer",
      url: "https://www.okx.com/web3/explorer/xlayer",
    },
  },
};

/**
 * Circle-issued native USDC is the settlement rail on X Layer.
 * Testnet: 0xDec90b78111Ba2fc6FC6d84d8B9ec159A2d4b9B3. Mainnet: 0xB6CEceAB302E2E4948951eE7843FC24E92933061.
 */
export const USDC = {
  address: SETTLEMENT_TOKEN_ADDRESS,
  symbol: "USDC",
  name: "USD Coin",
  decimals: 6,
};

export const rails = {
  "xlayer-testnet": {
    key: "xlayer-testnet",
    label: xlayerTestnet.name,
    chain: xlayerTestnet,
    nativeSymbol: xlayerTestnet.nativeCurrency.symbol,
    explorerUrl: "https://www.okx.com/web3/explorer/xlayer-test",
    faucetUrl: "https://faucet.circle.com/",
    contractAddress: PAYPORT_ADDRESS,
  },
  xlayer: {
    key: "xlayer",
    label: xlayerMainnet.name,
    chain: xlayerMainnet,
    nativeSymbol: xlayerMainnet.nativeCurrency.symbol,
    explorerUrl: "https://www.okx.com/web3/explorer/xlayer",
    faucetUrl: "",
    contractAddress: PAYPORT_ADDRESS,
  },
} as const satisfies Record<RailKey, RailConfig>;

export function isRailKey(value: string | null | undefined): value is RailKey {
  return value === "xlayer-testnet" || value === "xlayer";
}

export function getRail(railKey: string | null | undefined = "xlayer-testnet") {
  return isRailKey(railKey) ? rails[railKey] : rails["xlayer-testnet"];
}

export function buildCheckoutPath(slug: string) {
  return `/pay/${slug}`;
}

export function buildExplorerTxUrl(railKey: RailKey, hash: string) {
  return `${getRail(railKey).explorerUrl}/tx/${hash}`;
}

export function buildExplorerAddressUrl(railKey: RailKey, address: string) {
  return `${getRail(railKey).explorerUrl}/address/${address}`;
}

export function buildFaucetUrl(railKey: RailKey) {
  return getRail(railKey).faucetUrl;
}
