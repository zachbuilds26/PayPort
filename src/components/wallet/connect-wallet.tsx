"use client";

import { WalletConnectionCard } from "@/components/wallet/wallet-connection-card";

/** Connects a browser wallet for the X Layer payment rail. */
export function ConnectWallet({ compact = false }: { compact?: boolean }) {
  return <WalletConnectionCard railKey="xlayer-testnet" compact={compact} />;
}
