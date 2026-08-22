"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { Skeleton } from "@/components/ui/skeleton";
import { ConnectWallet } from "@/components/wallet/connect-wallet";
import { useWalletController } from "@/components/wallet/wallet-controller";
import { xlayerChain, shortenAddress, explorerTx } from "@/lib/chain";

interface DbPayment {
  id: number;
  slug: string;
  amount_usdc: number;
  payer: string;
  merchant: string;
  tx_hash: string;
  status: string;
  created_at: string;
}

export default function PaymentsPage() {
  const { wallet } = useWalletController();
  const address = wallet.address;
  const [payments, setPayments] = useState<DbPayment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!address) return;
    setLoading(true);
    setError(null);
    fetch(`/api/payments?merchant=${address}`)
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load");
        return r.json();
      })
      .then((data) => setPayments(data))
      .catch(() => setError("Could not load payment history."))
      .finally(() => setLoading(false));
  }, [address]);

  return (
    <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:px-10">
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="text-[10px] font-semibold tracking-[0.16em] text-faint uppercase">
            {xlayerChain.name}
          </p>
          <h1 className="font-display mt-2 text-3xl tracking-[-0.045em] sm:text-4xl">
            Payment history
          </h1>
          <p className="mt-3 text-sm text-muted">
            {address
              ? `Payments received by ${shortenAddress(address)}.`
              : "Connect your wallet to view payment history."}
          </p>
        </div>
        <div className="sm:w-64">
          <ConnectWallet />
        </div>
      </div>

      {!address && (
        <section className="mt-8 border border-line bg-surface p-6 sm:p-8">
          <p className="text-[10px] font-semibold tracking-[0.15em] text-faint uppercase">
            Private data
          </p>
          <h2 className="font-display mt-3 text-2xl tracking-[-0.045em]">
            Connect your wallet first.
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">
            Payment history is tied to your merchant address. Connect your wallet to see all
            payments received through PayPort.
          </p>
        </section>
      )}

      {address && loading && (
        <div className="mt-8 border border-line bg-surface p-6">
          <p role="status" aria-live="polite" className="sr-only">Loading payments…</p>
          <div className="flex flex-col gap-4">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="flex items-center justify-between gap-4 border-b border-line/50 pb-4 last:border-0 last:pb-0">
                <div className="min-w-0 flex-1">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="mt-2 h-3 w-28" />
                </div>
                <Skeleton className="h-5 w-16" />
              </div>
            ))}
          </div>
        </div>
      )}

      {address && error && (
        <section className="mt-8 border border-warning/30 bg-warning/10 p-6 text-sm text-warning">
          {error}
        </section>
      )}

      {address && !loading && !error && payments.length === 0 && (
        <section className="mt-8 border border-line bg-surface p-6 sm:p-8">
          <p className="text-sm text-muted">No payments recorded yet.</p>
          <p className="mt-2 text-xs text-faint">
            Payments will appear here once a customer pays through one of your links.
          </p>
        </section>
      )}

      {address && !loading && payments.length > 0 && (
        <section className="mt-8 border border-line bg-surface">
          <div className="border-b border-line px-5 py-4 sm:px-6">
            <p className="text-[10px] font-semibold tracking-[0.15em] text-faint uppercase">
              {payments.length} payment{payments.length === 1 ? "" : "s"}
            </p>
          </div>

          <ul className="divide-y divide-line">
            {payments.map((p) => (
              <li
                key={p.id}
                className="flex items-center justify-between gap-4 px-5 py-4 sm:px-6"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{p.slug}</p>
                  <p className="mt-1 font-mono text-xs text-muted">
                    from {shortenAddress(p.payer)}
                  </p>
                  <p className="mt-1 text-[10px] text-faint">
                    {new Date(p.created_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="price-figure text-sm">
                    ${Number(p.amount_usdc).toFixed(2)}
                  </p>
                  <p className="mt-1 text-[10px] font-semibold uppercase text-success">
                    {p.status}
                  </p>
                  {p.tx_hash && (
                    <a
                      href={explorerTx(p.tx_hash)}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-1 inline-flex items-center gap-1 text-[10px] text-accent underline underline-offset-2 hover:text-white"
                    >
                      View tx
                      <Icon name="arrow-up-right" className="size-2.5" />
                    </a>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
