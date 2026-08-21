import { createConfig, http } from "wagmi";
import { injected } from "wagmi/connectors";
import {
  buildCheckoutPath,
  buildExplorerAddressUrl,
  buildExplorerTxUrl,
  buildFaucetUrl,
  getRail,
  isRailKey,
  rails,
  type RailConfig,
  type RailKey,
} from "@/lib/rails";

export const xlayerChain = rails["xlayer-testnet"].chain;

export const EXPLORER_URL = rails["xlayer-testnet"].explorerUrl;
export const FAUCET_URL = rails["xlayer-testnet"].faucetUrl;

export const wagmiConfig = createConfig({
  chains: [xlayerChain],
  connectors: [injected({ shimDisconnect: false })],
  multiInjectedProviderDiscovery: true,
  transports: {
    [xlayerChain.id]: http(
      xlayerChain.rpcUrls.default.http[0] ?? "https://testrpc.xlayer.tech/terigon",
    ),
  },
  ssr: true,
});

export function explorerTx(hash: string) {
  return buildExplorerTxUrl("xlayer-testnet", hash);
}

export function explorerAddress(address: string) {
  return buildExplorerAddressUrl("xlayer-testnet", address);
}

export function shortenAddress(address: string) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export {
  buildCheckoutPath,
  buildExplorerAddressUrl,
  buildExplorerTxUrl,
  buildFaucetUrl,
  getRail,
  isRailKey,
  rails,
  type RailConfig,
  type RailKey,
};

declare module "wagmi" {
  interface Register {
    config: typeof wagmiConfig;
  }
}
