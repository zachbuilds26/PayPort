"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Icon } from "@/components/ui/icon";
import { Skeleton } from "@/components/ui/skeleton";
import { useWalletController } from "@/components/wallet/wallet-controller";
import { buildCheckoutPath, explorerAddress, xlayerChain, shortenAddress } from "@/lib/chain";
import { formatReadError } from "@/lib/payport-errors";
import { PAYPORT_ADDRESS } from "@/lib/contract-address";
import { USDC } from "@/lib/rails";
import {
  assetSymbol,
  formatAssetAmount,
  formatUsdCents,
  isExpired,
  PAYMENTS_COLLECT_LIMIT,
  useMerchantLedger,
  useNow,
  type MerchantLink,
} from "@/lib/use-payport";

function Status({ link, now }: { link: MerchantLink; now: bigint | undefined }) {
  const label = !link.active && link.paymentCount > 0
    ? "paid"
    : !link.active
      ? "closed"
      : isExpired(link.expiresAt, now)
        ? "expired"
        : "active";

  const styles = {
    active: "border-accent/30 bg-accent/10 text-accent",
    paid: "border-accent/30 bg-accent/10 text-accent",
    closed: "border-line bg-surface text-muted",
    expired: "border-line bg-surface text-muted",
  }[label];

  return (
    <span
      className={`inline-flex border px-2 py-1 text-[10px] font-semibold tracking-[0.12em] uppercase ${styles}`}
    >
      {label}
    </span>
  );
}

function formatSettlementAge(now: bigint | undefined, paidAt: bigint) {
  if (now === undefined || paidAt === 0n) return undefined;

  const seconds = Number(now - paidAt);
  if (!Number.isFinite(seconds) || seconds < 0) return undefined;
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.max(1, Math.round(seconds / 60))}m ago`;
  if (seconds < 86400) return `${Math.max(1, Math.round(seconds / 3600))}h ago`;
  return `${Math.max(1, Math.round(seconds / 86400))}d ago`;
}

/** "12.34 USDT settled", the exact token amount the merchant received. */
function formatSettledBreakdown(collectedToken: bigint) {
  if (collectedToken === 0n) return "0.00 settled";
  return `${formatAssetAmount(collectedToken, 1, 2)} ${assetSymbol(1)} settled`;
}

function LinkActions({
  link,
  copied,
  onCopy,
}: {
  link: MerchantLink;
  copied: boolean;
  onCopy: () => void;
}) {
  return (
    <div className="flex justify-end gap-2">
      <button
        type="button"
        onClick={onCopy}
        aria-label={`Copy the ${link.title} payment link`}
        className="grid size-9 place-items-center border border-line text-muted hover:border-line-strong hover:text-ink"
      >
        <Icon name={copied ? "check" : "copy"} className="size-3.5" />
      </button>
      <Link
        href={buildCheckoutPath(link.slug)}
        aria-label={`Open the ${link.title} payment link`}
        className="grid size-9 place-items-center border border-line text-muted hover:border-line-strong hover:text-ink"
      >
        <Icon name="arrow-up-right" className="size-3.5" />
      </Link>
      <Link
        href="/receipts"
        aria-label={`Download receipts for ${link.title}`}
        className="grid size-9 place-items-center border border-line text-muted hover:border-line-strong hover:text-ink"
      >
        <Icon name="receipt" className="size-3.5" />
      </Link>
    </div>
  );
}

export function DashboardOverview() {
  const { wallet } = useWalletController();
  const address = wallet.address;
  const [settlementLimit, setSettlementLimit] = useState(PAYMENTS_COLLECT_LIMIT);
  const {
    links,
    payments,
    hasMore,
    isLoading,
    error,
    refetch,
  } = useMerchantLedger(address, { collectLimit: settlementLimit });
  const now = useNow();
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);

  async function copyLinkAction(slug: string) {
    const url = `${window.location.origin}${buildCheckoutPath(slug)}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedSlug(slug);
      window.setTimeout(() => setCopiedSlug((current) => (current === slug ? null : current)), 1800);
    } catch {
      window.open(url, "_blank", "noopener");
    }
  }
  const [linksPage, setLinksPage] = useState(0);

  const LINKS_PAGE_SIZE = 7;

  // Deeper batches for the settlements panel, stepped so each click walks
  // further back rather than doubling forever.
  const SETTLEMENT_LIMITS = [6, 30, 100, 250];

  function loadMoreSettlements() {
    setSettlementLimit(
      (current) => SETTLEMENT_LIMITS.find((limit) => limit > current) ?? current,
    );
  }

  const totals = useMemo(() => {
    let collectedUsdCents = 0n;
    let collectedToken = 0n;
    for (const payment of payments) {
      collectedUsdCents += payment.priceUsdCents;
      collectedToken += payment.amountWei;
    }

    const active = links.filter(
      (link) => link.active && !isExpired(link.expiresAt, now),
    ).length;

    return { collectedUsdCents, collectedToken, active };
  }, [links, payments, now]);

  const linksTotalPages = Math.max(1, Math.ceil(links.length / LINKS_PAGE_SIZE));
  const safeLinksPage = Math.min(linksPage, linksTotalPages - 1);
  const visibleLinks = links.slice(
    safeLinksPage * LINKS_PAGE_SIZE,
    safeLinksPage * LINKS_PAGE_SIZE + LINKS_PAGE_SIZE,
  );

  function goPrevLinksPage() {
    setLinksPage((page) => Math.max(0, page - 1));
  }

  function goNextLinksPage() {
    setLinksPage((page) => Math.min(linksTotalPages - 1, page + 1));
  }

  if (!wallet.isReady && wallet.phase !== "disconnected") {
    return (
      <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:px-10">
        <p className="text-[10px] font-semibold tracking-[0.16em] text-faint uppercase">{xlayerChain.name}</p>
        <h1 className="font-display mt-2 text-3xl tracking-[-0.045em] sm:text-4xl">Merchant dashboard</h1>
        <p role="status" aria-live="polite" className="mt-3 text-sm text-muted">Restoring your wallet connection…</p>
      </div>
    );
  }

  if (!address) {
    return (
      <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:px-10">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <p className="text-[10px] font-semibold tracking-[0.16em] text-faint uppercase">
              {xlayerChain.name}
            </p>
            <h1 className="font-display mt-2 text-3xl tracking-[-0.045em] sm:text-4xl">
              Merchant dashboard
            </h1>
            <p className="mt-3 text-sm text-muted">
              Connect your wallet to view payment links and settlement history.
            </p>
            <a
              href={explorerAddress(PAYPORT_ADDRESS)}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-flex items-center gap-1.5 font-mono text-xs text-accent underline underline-offset-2 hover:text-white"
            >
              {shortenAddress(PAYPORT_ADDRESS)}
              <Icon name="arrow-up-right" className="size-3" />
            </a>
          </div>
        </div>

        <section className="mt-8 border border-line bg-surface p-6 sm:p-8">
          <p className="text-[10px] font-semibold tracking-[0.15em] text-faint uppercase">
            Private ledger
          </p>
          <h2 className="font-display mt-3 text-2xl tracking-[-0.045em]">
            Your merchant data appears only after you connect.
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">
            PayPort keeps the dashboard private until a wallet is connected. That way, each merchant sees only their own links and settlement activity.
          </p>
        </section>
      </div>
    );
  }

  const hasLedgerData = links.length > 0 || payments.length > 0;

  if (error && !hasLedgerData) {
    return (
      <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:px-10">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <p className="text-[10px] font-semibold tracking-[0.16em] text-faint uppercase">
              {xlayerChain.name}
            </p>
            <h1 className="font-display mt-2 text-3xl tracking-[-0.045em] sm:text-4xl">
              Merchant dashboard
            </h1>
            <p className="mt-3 text-sm text-muted">
              Connected as {shortenAddress(address)}.
            </p>
            <a
              href={explorerAddress(PAYPORT_ADDRESS)}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-flex items-center gap-1.5 font-mono text-xs text-accent underline underline-offset-2 hover:text-white"
            >
              {shortenAddress(PAYPORT_ADDRESS)}
              <Icon name="arrow-up-right" className="size-3" />
            </a>
          </div>
        </div>

        <section className="mt-8 border border-line bg-surface p-6 sm:p-8">
          <p className="text-[10px] font-semibold tracking-[0.15em] text-faint uppercase">
            Dashboard unavailable
          </p>
          <h2 className="font-display mt-3 text-2xl tracking-[-0.045em]">
            We could not load your dashboard.
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">
            {formatReadError(error, "PayPort could not load your dashboard right now. Try again in a moment.")}
          </p>
          <button
            type="button"
            onClick={() => refetch()}
            className="mt-5 inline-flex items-center gap-2 bg-accent px-4 py-2.5 text-sm font-semibold text-accent-ink hover:bg-white"
          >
            Retry
          </button>
        </section>
      </div>
    );
  }

  return (
    <>
      <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:px-10">
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="text-[10px] font-semibold tracking-[0.16em] text-faint uppercase">
            {xlayerChain.name}
          </p>
          <h1 className="font-display mt-2 text-3xl tracking-[-0.045em] sm:text-4xl">
            Merchant dashboard
          </h1>
          <p className="mt-3 text-sm text-muted">
            {address
              ? `Showing links for ${shortenAddress(address)}.`
              : "Connect a wallet to scope this view to your links."}
          </p>
          <a
            href={explorerAddress(PAYPORT_ADDRESS)}
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-flex items-center gap-1.5 font-mono text-xs text-accent underline underline-offset-2 hover:text-white"
          >
            {shortenAddress(PAYPORT_ADDRESS)}
            <Icon name="arrow-up-right" className="size-3" />
          </a>
        </div>
      </div>

      {error && hasLedgerData && (
        <div className="mt-6 flex flex-col gap-3 border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[10px] font-semibold tracking-[0.15em] uppercase">Live updates paused</p>
            <p className="mt-1 leading-6 text-warning/90">
              {formatReadError(error, "We could not load your merchant ledger right now. Try again in a moment.")}
            </p>
          </div>
          <button
            type="button"
            onClick={() => refetch()}
            className="inline-flex items-center gap-2 border border-warning/30 px-4 py-2 text-xs font-semibold text-warning hover:border-warning/60 hover:bg-warning/10"
          >
            Retry
          </button>
        </div>
      )}

      <section
        className="mt-8 grid gap-px overflow-hidden border border-line bg-line sm:grid-cols-3"
        aria-label="Settlement metrics"
      >
        <article className="bg-surface p-5">
          <p className="text-[10px] font-semibold tracking-[0.14em] text-faint uppercase">
            Settled
          </p>
          {isLoading ? (
            <Skeleton className="mt-5 h-8 w-28" />
          ) : (
            <p className="price-figure mt-5 text-xl sm:text-2xl">
              {formatUsdCents(totals.collectedUsdCents)}
            </p>
          )}
          {isLoading ? (
            <Skeleton className="mt-2 h-3 w-40" />
          ) : (
            <p className="mt-2 text-xs font-semibold text-muted tabular-nums">
              {formatSettledBreakdown(totals.collectedToken)}
            </p>
          )}
        </article>

        <article className="bg-surface p-5">
          <p className="text-[10px] font-semibold tracking-[0.14em] text-faint uppercase">
            Open links
          </p>
          {isLoading ? (
            <Skeleton className="mt-5 h-8 w-14" />
          ) : (
            <p className="price-figure mt-5 text-xl sm:text-2xl">
              {String(totals.active).padStart(2, "0")}
            </p>
          )}
          {isLoading ? (
            <Skeleton className="mt-2 h-3 w-20" />
          ) : (
            <p className="mt-2 text-xs font-semibold text-muted">
              {links.length} created
            </p>
          )}
        </article>

        <article className="bg-surface p-5">
          <p className="text-[10px] font-semibold tracking-[0.14em] text-faint uppercase">
            Settlement rail
          </p>
          <p className="price-figure mt-5 text-lg sm:text-xl">
            {USDC.symbol}
          </p>
          <p className="mt-2 text-xs font-semibold text-muted">
            Native USDC on {xlayerChain.name}
          </p>
        </article>
      </section>

      <div className="mt-8 grid gap-8 xl:grid-cols-[minmax(0,1.55fr)_minmax(280px,0.75fr)]">
        <section className="border border-line bg-surface" aria-labelledby="links-title">
          <div className="flex flex-col justify-between gap-4 border-b border-line p-5 sm:flex-row sm:items-center sm:p-6">
            <div>
              <p className="text-[10px] font-semibold tracking-[0.15em] text-faint uppercase">
                Payment links
              </p>
              <h2 id="links-title" className="mt-1 text-base font-medium">
                Payment links
              </h2>
            </div>
            <button
              type="button"
              onClick={() => window.dispatchEvent(new Event("payport:open-copilot"))}
              className="inline-flex items-center gap-2 text-xs font-semibold text-accent hover:text-white"
            >
              <Icon name="plus" className="size-3.5" />
              Create New Link
            </button>
          </div>

          {isLoading && (
            <div role="status" aria-live="polite" className="p-6">
              <p className="sr-only">Loading payment links from X Layer…</p>
              <div aria-hidden="true" className="flex flex-col gap-5">
                {Array.from({ length: 3 }, (_, index) => (
                  <div key={index} className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <Skeleton className="h-4 w-44" />
                      <Skeleton className="mt-2 h-3 w-28" />
                    </div>
                    <Skeleton className="h-5 w-16 shrink-0" />
                    <Skeleton className="h-4 w-14 shrink-0" />
                    <div className="flex gap-2">
                      <Skeleton className="size-8" />
                      <Skeleton className="size-8" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!isLoading && links.length === 0 && (
            <div className="p-6">
              <p className="text-sm text-muted">No payment links have been published yet.</p>
              <button
                type="button"
                onClick={() => window.dispatchEvent(new Event("payport:open-copilot"))}
                className="mt-4 inline-flex items-center gap-2 bg-accent px-4 py-2.5 text-sm font-semibold text-accent-ink hover:bg-white"
              >
                <Icon name="plus" className="size-4" />
                Create your first link with the copilot
              </button>
            </div>
          )}

          {links.length > 0 && (
            <>
              <ul className="divide-y divide-line md:hidden" aria-label="Payment links">
                {visibleLinks.map((link) => (
                  <li
                    key={link.slug}
                    className="flex items-center justify-between gap-3 p-4"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium">{link.title}</p>
                      <p className="mt-1 truncate text-xs text-muted">
                        <span className="price-figure">{formatUsdCents(link.priceUsdCents)}</span> · {link.paymentCount} payment
                        {link.paymentCount === 1 ? "" : "s"}
                      </p>
                      <div className="mt-2">
                        <Status link={link} now={now} />
                      </div>
                    </div>
                    <LinkActions
                      link={link}
                      copied={copiedSlug === link.slug} onCopy={() => void copyLinkAction(link.slug)}
                    />
                  </li>
                ))}
              </ul>
              <div className="hidden overflow-x-auto md:block">
              <table className="w-full border-collapse text-left text-sm">
                <caption className="sr-only">Payment links held by the contract</caption>
                <thead className="border-b border-line text-[10px] font-semibold tracking-[0.14em] text-faint uppercase">
                  <tr>
                    <th className="px-5 py-3 font-medium sm:px-6">Link</th>
                    <th className="px-5 py-3 font-medium">Status</th>
                    <th className="hidden px-5 py-3 font-medium md:table-cell">Settled</th>
                    <th className="px-5 py-3 text-right font-medium sm:px-6">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleLinks.map((link) => (
                    <tr
                      key={link.slug}
                      className="border-b border-line/70 last:border-0 hover:bg-surface-hover/40"
                    >
                      <td className="px-5 py-4 sm:px-6">
                        <p className="truncate font-medium">{link.title}</p>
                        <p className="mt-1 truncate text-xs text-muted">
                          <span className="price-figure">{formatUsdCents(link.priceUsdCents)}</span> · {link.paymentCount} payment
                          {link.paymentCount === 1 ? "" : "s"}
                        </p>
                      </td>
                      <td className="px-5 py-4">
                        <Status link={link} now={now} />
                      </td>
                      <td className="hidden px-5 py-4 price-figure text-sm md:table-cell">
                        {formatUsdCents(link.totalReceivedUsdCents)}
                      </td>
                      <td className="px-5 py-4 sm:px-6">
                        <LinkActions
                          link={link}
                          copied={copiedSlug === link.slug} onCopy={() => void copyLinkAction(link.slug)}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </>
          )}

          {links.length > LINKS_PAGE_SIZE && (
            <div className="flex items-center justify-between gap-3 border-t border-line px-5 py-3 sm:px-6">
              <p className="text-xs text-muted tabular-nums">
                Page {safeLinksPage + 1} of {linksTotalPages}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={goPrevLinksPage}
                  disabled={safeLinksPage === 0}
                  className="border border-line px-3 py-1.5 text-xs font-semibold text-muted hover:border-line-strong hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Previous
                </button>
                <button
                  type="button"
                  onClick={goNextLinksPage}
                  disabled={safeLinksPage === linksTotalPages - 1}
                  className="border border-line px-3 py-1.5 text-xs font-semibold text-muted hover:border-line-strong hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          )}

        </section>

        <section className="border border-line bg-surface p-5 sm:p-6" aria-labelledby="activity-title">
          <p className="text-[10px] font-semibold tracking-[0.15em] text-faint uppercase">
            Onchain ledger
          </p>
          <h2 id="activity-title" className="mt-1 text-base font-medium">
Recent settlements
          </h2>

          {isLoading && (
            <>
              <p role="status" aria-live="polite" className="sr-only">
                Reading settlement history…
              </p>
              <ul aria-hidden="true" className="mt-6 divide-y divide-line">
                {Array.from({ length: 3 }, (_, index) => (
                  <li key={index} className="flex items-start justify-between gap-4 py-4 first:pt-0">
                    <div className="min-w-0 flex-1">
                      <Skeleton className="h-4 w-40" />
                      <Skeleton className="mt-2 h-3 w-32" />
                      <Skeleton className="mt-2 h-2.5 w-20" />
                    </div>
                    <div className="shrink-0 text-right">
                      <Skeleton className="ml-auto h-4 w-14" />
                      <Skeleton className="mt-2 ml-auto h-3 w-24" />
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}

          {!isLoading && payments.length === 0 && (
            <p className="mt-6 text-sm leading-6 text-muted">
              No payments yet. Open a checkout link and complete a payment to see activity here.
            </p>
          )}

          {payments.length > 0 && (
            <ul className="mt-6 divide-y divide-line">
              {payments.map((payment) => (
                <li
                  key={`${payment.linkId}-${payment.paidAt}`}
                  className="flex items-start justify-between gap-4 py-4 first:pt-0"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm">{payment.title}</p>
                    <p className="mt-1 font-mono text-xs text-muted">
                      {shortenAddress(payment.payer)}
                    </p>
                    <p className="mt-1 flex items-center gap-2 text-[10px] text-faint">
                      <span className="font-semibold uppercase">
                        {assetSymbol(payment.asset)}
                      </span>
                      Settled {formatSettlementAge(now, payment.paidAt) ?? "onchain"}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="price-figure text-sm">
                      {formatUsdCents(payment.priceUsdCents)}
                    </p>
                    <p className="mt-1 text-xs text-muted tabular-nums">
                      {formatAssetAmount(payment.amountWei, payment.asset, 2)}{" "}
                      {assetSymbol(payment.asset)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {hasMore && (
            <button
              type="button"
              onClick={loadMoreSettlements}
              className="mt-4 inline-flex w-full items-center justify-center border border-line px-4 py-2.5 text-xs font-semibold text-muted hover:border-line-strong hover:text-ink"
            >
              Load more settlements
            </button>
          )}
        </section>
      </div>
    </div>
    </>
  );
}
