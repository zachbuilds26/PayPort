"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { useAccount, useBalance, useReadContract } from "wagmi";
import { Icon } from "@/components/ui/icon";
import { PayPortLogo } from "@/components/ui/payport-logo";
import { ConnectWallet } from "@/components/wallet/connect-wallet";
import { explorerTx, xlayerChain } from "@/lib/chain";
import { formatReadError } from "@/lib/payport-errors";
import { USDC } from "@/lib/rails";
import { saveStoredReceipt } from "@/lib/receipt-history";
import {
  assetSymbol,
  formatAssetAmount,
  formatUsdCents,
  isExpired,
  useNow,
  usePaymentLink,
  usePaymentQuote,
  usePayLink,
  withQuoteBuffer,
  type OnchainLink,
  type SettlementAsset,
} from "@/lib/use-payport";

export function CheckoutExperience({ slug }: { slug: string }) {
  const { link, isLoading, error, notFound, refetch } = usePaymentLink(slug);
  const now = useNow();
  const [paidHash, setPaidHash] = useState<`0x${string}` | undefined>();

  if (paidHash && link) {
    return (
      <CheckoutShell>
        <PaidReceipt link={link} slug={slug} hash={paidHash} />
      </CheckoutShell>
    );
  }

  if (isLoading) {
    return (
      <CheckoutShell>
        <div role="status" aria-live="polite" className="border border-line bg-surface p-8 text-center text-sm text-muted">
          Loading payment link…
        </div>
      </CheckoutShell>
    );
  }

  if (error && !notFound) {
    return (
      <CheckoutShell>
        <ReadFailure
          title="We could not load this checkout."
          copy={formatReadError(error)}
          onRetry={() => refetch()}
        />
      </CheckoutShell>
    );
  }

  if (notFound || !link) {
    return <Unavailable reason="missing" />;
  }

  if (!link.active && link.paymentCount > 0) return <Unavailable reason="paid" />;
  if (!link.active) return <Unavailable reason="closed" />;
  if (isExpired(link.expiresAt, now)) return <Unavailable reason="expired" />;

  return (
    <CheckoutShell>
      <CheckoutCard slug={slug} link={link} onPaid={setPaidHash} />
    </CheckoutShell>
  );
}

function CheckoutCard({
  slug,
  link,
  onPaid,
}: {
  slug: string;
  link: OnchainLink;
  onPaid: (hash: `0x${string}`) => void;
}) {
  const { isConnected, chainId, address } = useAccount();
  const onCorrectChain = isConnected && chainId === xlayerChain.id;

  const quote = usePaymentQuote(slug, onCorrectChain);
  const now = useNow();
  const payment = usePayLink(slug);
  const { refetch: refetchLink } = usePaymentLink(slug);

  const {
    data: nativeBalance,
    isLoading: nativeBalanceLoading,
    error: nativeBalanceError,
    refetch: refetchNativeBalance,
  } = useBalance({
    address,
    chainId: xlayerChain.id,
    query: { enabled: Boolean(address) },
  });

  const {
    data: tokenBalance,
    isLoading: tokenBalanceLoading,
    error: tokenBalanceError,
    refetch: refetchTokenBalance,
  } = useReadContract({
    abi: [
      {
        type: "function",
        name: "balanceOf",
        stateMutability: "view",
        inputs: [{ name: "account", type: "address" }],
        outputs: [{ name: "", type: "uint256" }],
      },
    ],
    address: USDC.address,
    functionName: "balanceOf",
    args: [address ?? "0x0000000000000000000000000000000000000000"],
    chainId: xlayerChain.id,
    query: {
      enabled: Boolean(address),
      refetchInterval: 12000,
    },
  });

  const [failure, setFailure] = useState<string | undefined>();

  useEffect(() => {
    if (payment.isConfirmed && payment.hash) {
      saveStoredReceipt({
        slug,
        title: link.title,
        hash: payment.hash,
        priceUsdCents: link.priceUsdCents.toString(),
        paidAt: Math.floor(Date.now() / 1000),
      });
      fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          amount_usdc: Number(link.priceUsdCents) / 100,
          payer: address ?? "unknown",
          merchant: link.merchant,
          tx_hash: payment.hash,
          status: "settled",
        }),
      }).catch((err) => console.error("Failed to record payment:", err));
      onPaid(payment.hash);
    }
  }, [payment.isConfirmed, payment.hash, onPaid, slug, link.title, link.priceUsdCents, link.merchant, address]);

  if (payment.isConfirmed && payment.hash) {
    return <PaidReceipt link={link} slug={slug} hash={payment.hash} />;
  }

  const required = quote.requiredToken;
  const bufferedRequired = required === undefined ? undefined : withQuoteBuffer(required);
  const quoteError = quote.error;
  const quoteFetching = quote.isFetching;

  const balance = tokenBalance as bigint | undefined;
  const balanceLoading = tokenBalanceLoading;
  const balanceError = tokenBalanceError;
  const balanceReady = Boolean(balance !== undefined) && !balanceLoading && !balanceError;
  const insufficient =
    bufferedRequired !== undefined && balanceReady && balance !== undefined && balance < bufferedRequired;
  const lowGas =
    nativeBalanceLoading === false &&
    !nativeBalanceError &&
    nativeBalance?.value !== undefined &&
    nativeBalance.value === 0n;
  const canPay =
    onCorrectChain &&
    bufferedRequired !== undefined &&
    balanceReady &&
    !insufficient &&
    !quoteError &&
    !quoteFetching;

  async function handlePay() {
    if (required === undefined || quoteError || quoteFetching) return;

    setFailure(undefined);

    const latestLink = await refetchLink();
    if (latestLink.error || !latestLink.data) {
      setFailure(
        formatReadError(
          latestLink.error,
          "PayPort could not verify this checkout right now. Try again in a moment.",
        ),
      );
      return;
    }

    if (!latestLink.data.active || isExpired(latestLink.data.expiresAt, now)) {
      setFailure("This checkout is no longer available.");
      return;
    }

    const refreshedQuote = await quote.refetch();
    const freshRequired = refreshedQuote.data?.[0];
    if (refreshedQuote.error || freshRequired === undefined) {
      setFailure(
        formatReadError(
          refreshedQuote.error ?? quoteError,
          "PayPort could not refresh the checkout quote right now. Try again in a moment.",
        ),
      );
      return;
    }

    try {
      await payment.pay(freshRequired);
    } catch (error) {
      setFailure(readableError(error));
    }
  }

  const busy = payment.isSubmitting || payment.isConfirming;
  const settlementAsset: SettlementAsset = 1;
  const paySymbol = assetSymbol(settlementAsset);

  return (
    <section className="border border-line bg-surface">
      <div className="flex items-center justify-between border-b border-line px-5 py-4 sm:px-7">
        <span className="truncate text-xs text-muted">Checkout</span>
        <span className="inline-flex shrink-0 items-center gap-1.5 text-[10px] font-semibold tracking-[0.12em] text-accent uppercase">
          <span className="size-1.5 bg-accent" />
          {xlayerChain.name}
        </span>
      </div>

      <div className="p-5 sm:p-7">
        <h1 className="text-2xl font-medium tracking-[-0.045em]">{link.title}</h1>

        <div className="mt-5">
          <p className="text-[10px] font-semibold tracking-[0.14em] text-faint uppercase">
            Settles in
          </p>
          <div className="mt-2 border px-4 py-3 text-left">
            <span className="block text-sm font-semibold">{paySymbol}</span>
            <span className="mt-0.5 block text-[10px] font-medium tracking-[0.08em] text-faint uppercase">
              Native USDC on {xlayerChain.name}
            </span>
          </div>
        </div>

        <div className="mt-7 border-y border-line py-5">
          <p className="text-[10px] font-semibold tracking-[0.14em] text-faint uppercase">
            Amount due
          </p>
          <p className="price-figure mt-2 text-xl sm:text-2xl">
            {formatUsdCents(link.priceUsdCents)}
          </p>

          <div className="mt-4 flex items-baseline justify-between gap-3 border-t border-line pt-4">
            <span className="text-xs text-muted">Exact amount in {paySymbol}</span>
            <span className="text-right text-base font-semibold tabular-nums">
              {onCorrectChain ? (
                quoteError ? (
                  <span className="text-sm text-muted">Quote unavailable</span>
                ) : bufferedRequired === undefined ? (
                  <span className="text-sm text-muted">Reading ledger…</span>
                ) : (
                  <>
                    {formatAssetAmount(bufferedRequired, settlementAsset)}{" "}
                    <span className="text-xs text-muted">{paySymbol}</span>
                  </>
                )
              ) : (
                <span className="text-sm text-muted">Connect a wallet to view the amount</span>
              )}
            </span>
          </div>
        </div>

        <div className="mt-5 border border-line bg-background-deep px-4 py-3">
          <p className="text-[10px] font-semibold tracking-[0.14em] text-faint uppercase">
            Fixed-price settlement
          </p>
          <p className="mt-2 text-xs leading-5 text-muted">
            This link is priced in dollars and settles in {paySymbol}, Circle-issued native USDC on X Layer.
            A small buffer covers rounding and any surplus is refunded in the same transaction.
          </p>
        </div>

        <div className="mt-7">
          <ConnectWallet />
        </div>

        {onCorrectChain && (
          <>
            {!nativeBalanceLoading && nativeBalanceError && (
              <ReadFailure
                className="mt-4"
                title="We could not read your wallet right now."
                copy={formatReadError(nativeBalanceError, "PayPort could not read your wallet right now. Try again.")}
                onRetry={() => refetchNativeBalance()}
              />
            )}

            {!balanceLoading && balanceError && (
              <ReadFailure
                className="mt-4"
                title="We could not read your token balance."
                copy={formatReadError(balanceError, "PayPort could not read your {paySymbol} balance. Try again.")}
                onRetry={() => refetchTokenBalance()}
              />
            )}

            {(balanceLoading || nativeBalanceLoading) && <p role="status" aria-live="polite" className="mt-4 text-xs leading-5 text-muted">Checking your balances…</p>}

            {lowGas && (
              <p className="mt-4 text-xs leading-5 text-warning">
                This wallet has no {xlayerChain.nativeCurrency.symbol} for gas.{" "}
                <a href="https://web3.okx.com/xlayer/faucet/xlayerfaucet" target="_blank" rel="noreferrer" className="underline underline-offset-2">Claim OKB from the X Layer faucet</a>.
              </p>
            )}

            {insufficient && bufferedRequired !== undefined && (
              <p className="mt-4 text-xs leading-5 text-warning">
                This wallet holds {formatAssetAmount(balance, settlementAsset)} {paySymbol}.
                The checkout needs {formatAssetAmount(bufferedRequired, settlementAsset)}.{" "}
                <a href="https://faucet.circle.com/" target="_blank" rel="noreferrer" className="underline underline-offset-2">
                  Get free test USDC from Circle&apos;s faucet
                </a>.
              </p>
            )}

            {!busy && !payment.hash && (
              <p className="mt-3 text-[10px] leading-4 text-faint">
                Paying takes two wallet signatures the first time: one USDC approval, then the
                payment itself.
              </p>
            )}
            <button
              type="button"
              disabled={busy || !canPay}
              onClick={handlePay}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 bg-accent px-5 py-3.5 text-sm font-semibold text-accent-ink hover:bg-white disabled:opacity-60"
            >
              {payment.isSubmitting && "Approving and paying…"}
              {payment.isConfirming && "Processing payment…"}
              {!busy && (
                <>
                  Pay <span className="price-figure">{formatUsdCents(link.priceUsdCents)}</span>
                  <Icon name="arrow-up-right" className="size-4" />
                </>
              )}
            </button>

            {payment.hash && payment.isConfirming && (
              <a
                href={explorerTx(payment.hash)}
                target="_blank"
                rel="noreferrer"
                className="mt-3 block text-center text-xs text-accent underline underline-offset-2 hover:text-white"
              >
                Track the transaction
              </a>
            )}

            {(failure || payment.error) && (
              <ReadFailure
                className="mt-4"
                title="The payment could not be completed."
                copy={failure ?? readableError(payment.error)}
              />
            )}
          </>
        )}
      </div>
    </section>
  );
}

function PaidReceipt({ link, slug, hash }: { link: OnchainLink; slug: string; hash: `0x${string}` }) {
  const receiptHref = `/pay/${slug}/receipt?tx=${hash}`;

  return (
    <section className="border border-line bg-surface p-5 text-center sm:p-7">
        <span className="mx-auto grid size-12 place-items-center bg-success text-background">
          <Icon name="check" className="size-6" />
        </span>
        <p className="mt-6 text-[10px] font-semibold tracking-[0.15em] text-success uppercase">
          Payment complete
        </p>
        <h1 className="price-figure mt-3 text-xl sm:text-2xl">
          {formatUsdCents(link.priceUsdCents)} confirmed.
        </h1>
        <p className="mt-3 text-sm text-muted">{link.title}</p>

        <div className="mt-7 border-y border-line py-4 text-left text-sm">
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted">Transaction hash</span>
            <a
              href={explorerTx(hash)}
              target="_blank"
              rel="noreferrer"
              className="truncate font-mono text-xs text-accent underline underline-offset-2 hover:text-white"
            >
              {hash.slice(0, 10)}…{hash.slice(-8)}
            </a>
          </div>
          <div className="mt-3 flex items-center justify-between gap-3">
            <span className="text-muted">Network</span>
            <span>{xlayerChain.name}</span>
          </div>
        </div>

        <div className="mt-7 flex flex-col gap-3">
          <Link
            href={receiptHref}
            className="inline-flex w-full items-center justify-center bg-accent py-3 text-sm font-semibold text-accent-ink hover:bg-white"
          >
            View receipt
            <Icon name="arrow-up-right" className="ml-2 size-4" />
          </Link>
        </div>
      </section>
  );
}

function Unavailable({ reason }: { reason: "missing" | "expired" | "closed" | "paid" }) {
  const copy = {
    missing: {
      heading: "This payment link was not found.",
      body: "We could not find a record for this URL. Check the link or ask the merchant to send a new one.",
    },
    expired: {
      heading: "This payment link has expired.",
      body: "The merchant set an end date that has passed. Ask for a new link.",
    },
    closed: {
      heading: "This payment link is closed.",
      body: "The merchant is no longer accepting payments through this link.",
    },
    paid: {
      heading: "This payment link has already been completed.",
      body: "The merchant has already closed it after payment was confirmed.",
    },
  }[reason];

  return (
    <CheckoutShell>
      <section className="border border-line bg-surface p-8 text-center sm:p-10">
        <span className="mx-auto grid size-11 place-items-center border border-line text-muted">
          <Icon name="link" className="size-5" />
        </span>
        <p className="mt-6 text-[10px] font-semibold tracking-[0.15em] text-faint uppercase">
          Checkout unavailable
        </p>
        <h1 className="font-display mt-3 text-3xl tracking-[-0.045em]">{copy.heading}</h1>
        <p className="mx-auto mt-4 max-w-sm text-sm leading-6 text-muted">{copy.body}</p>
        <Link
          href="/dashboard"
          className="mt-7 inline-flex border border-line px-4 py-2.5 text-sm font-semibold hover:border-line-strong hover:bg-surface-raised"
        >
          Return home
        </Link>
      </section>
    </CheckoutShell>
  );
}

function CheckoutShell({ children }: { children: ReactNode }) {
  return (
    <main className="grid min-h-screen place-items-center bg-background-deep px-5 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <PayPortLogo />
        </div>
        {children}
      </div>
    </main>
  );
}

/** Turns wallet and contract errors into something a customer can act on. */
function readableError(error: unknown): string {
  if (!error) return "";

  const message =
    error instanceof Error ? error.message : typeof error === "string" ? error : "";

  if (/user rejected|user denied/i.test(message)) {
    return "You cancelled the payment.";
  }

  if (/insufficient funds/i.test(message)) {
    return `This wallet needs more ${xlayerChain.nativeCurrency.symbol} to cover gas.`;
  }

  if (/Underpaid/i.test(message)) {
    return "The amount sent was below the price. Try again at the current amount.";
  }

  if (/LinkExpired/i.test(message)) return "This link expired before payment was confirmed.";
  if (/LinkInactive/i.test(message)) return "The merchant closed this link.";

  if (/InsufficientAllowance|ERC20InsufficientAllowance/i.test(message)) {
    return `This wallet has not approved enough ${paySymbolSafe()}. Try paying again so the approval step can complete.`;
  }

  return formatReadError(error, message.split("\n")[0] || "The payment could not be completed.");
}

function paySymbolSafe() {
  return USDC.symbol;
}

function ReadFailure({
  title,
  copy,
  onRetry,
  className = "",
}: {
  title: string;
  copy: string;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <section className={`border border-line bg-background-deep p-5 sm:p-6 ${className}`} role="alert">
      <p className="text-[10px] font-semibold tracking-[0.15em] text-faint uppercase">Issue</p>
      <h2 className="mt-2 text-lg font-medium tracking-[-0.03em]">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-muted">{copy}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 inline-flex border border-line px-4 py-2 text-sm font-semibold hover:border-line-strong hover:bg-surface-raised"
        >
          Try again
        </button>
      )}
    </section>
  );
}
