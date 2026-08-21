"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { useAccount, useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { Icon } from "@/components/ui/icon";
import { ConnectWallet } from "@/components/wallet/connect-wallet";
import { buildCheckoutPath, explorerTx, xlayerChain } from "@/lib/chain";
import { PAYPORT_ADDRESS } from "@/lib/contract-address";
import { formatWriteError } from "@/lib/payport-errors";
import { PAYPORT_ABI } from "@/lib/payport-abi";
import {
  formatAssetAmount,
  formatUsdCents,
  PAY_TOKEN_SYMBOL,
} from "@/lib/use-payport";

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const MAX_PRICE_USD_CENTS = (1n << 64n) - 1n;

function parseUsdAmountToCents(value: string) {
  const normalized = value.trim().replace(/,/g, "");

  if (!normalized) {
    return { error: "Enter an amount greater than zero." };
  }

  if (!/^\d+(?:\.\d{0,2})?$/.test(normalized)) {
    return { error: "Use a dollar amount with up to two decimal places." };
  }

  const [wholePart, fractionalPart = ""] = normalized.split(".");
  const cents = BigInt(wholePart) * 100n + BigInt((fractionalPart + "00").slice(0, 2));

  if (cents <= 0n) {
    return { error: "Enter an amount greater than zero." };
  }

  if (cents > MAX_PRICE_USD_CENTS) {
    return { error: "That amount is too large." };
  }

  return { cents };
}

export function PaymentLinkForm({
  prefilledTitle,
  prefilledAmount,
  prefilledSlug,
}: {
  prefilledTitle?: string;
  prefilledAmount?: string;
  prefilledSlug?: string;
}) {
  const router = useRouter();
  const { isConnected, chainId } = useAccount();
  const onCorrectChain = isConnected && chainId === xlayerChain.id;

  const safePrefillAmount =
    prefilledAmount && !parseUsdAmountToCents(prefilledAmount).error
      ? prefilledAmount
      : "";
  const safePrefillSlug =
    prefilledSlug && slugPattern.test(prefilledSlug) ? prefilledSlug : "";

  const [title, setTitle] = useState(prefilledTitle?.slice(0, 200) ?? "");
  const [amount, setAmount] = useState(safePrefillAmount);
  const [slug, setSlug] = useState(safePrefillSlug);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [failure, setFailure] = useState("");
  const [submittedLink, setSubmittedLink] = useState<{
    title: string;
    slug: string;
    cents: bigint;
  } | null>(null);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);

  const { writeContractAsync, isPending } = useWriteContract();
  const [hash, setHash] = useState<`0x${string}` | undefined>();
  const receipt = useWaitForTransactionReceipt({ hash, chainId: xlayerChain.id });

  const receiptFailure = hash && receipt.isError ? formatWriteError(receipt.error) : "";
  const publishFailure = failure || receiptFailure;

  const parsedAmount = parseUsdAmountToCents(amount);
  const priceUsdCents = parsedAmount.cents ?? 0n;
  const validAmount = parsedAmount.cents !== undefined;

  const preview = {
    title: title.trim() || "Untitled payment",
    cents: priceUsdCents,
    slug: slug || "your-payment-link",
  };

  if (receipt.isSuccess && hash) {
    const liveSlug = submittedLink?.slug ?? slug;
    const liveTitle = submittedLink?.title ?? preview.title;
    const liveCents = submittedLink?.cents ?? preview.cents;
    const checkoutPath = buildCheckoutPath(liveSlug);
    const checkoutUrl = `${window.location.origin}${checkoutPath}`;

    async function copyInvoiceLink() {
      try {
        await navigator.clipboard.writeText(checkoutUrl);
        setCopiedUrl(true);
        setCopyFailed(false);
        window.setTimeout(() => setCopiedUrl(false), 1800);
      } catch {
        setCopyFailed(true);
      }
    }

    return (
      <div className="mx-auto max-w-2xl px-5 py-16 text-center sm:px-8">
        <span className="mx-auto grid size-12 place-items-center bg-success text-background">
          <Icon name="check" className="size-6" />
        </span>
        <h1 className="font-display mt-6 text-3xl tracking-[-0.045em]">Your payment link is live.</h1>
        <p className="mt-3 text-sm text-muted">
          {liveTitle + " at "}
          <span className="price-figure">{formatUsdCents(liveCents)}</span>
        </p>
        <a
          href={explorerTx(hash)}
          target="_blank"
          rel="noreferrer"
          className="mt-4 inline-block font-mono text-xs text-accent underline underline-offset-2 hover:text-white"
        >
          {hash.slice(0, 12)}…{hash.slice(-10)}
        </a>

        <div className="mx-auto mt-9 max-w-lg border border-line bg-surface p-6 text-left sm:p-7">
          <div className="flex flex-col justify-center">
            <p className="text-[10px] font-semibold tracking-[0.15em] text-faint uppercase">
              Share this invoice
            </p>
            <p className="mt-3 break-all text-xs leading-5 text-muted">{checkoutUrl}</p>
            <button
              type="button"
              onClick={() => void copyInvoiceLink()}
              className="mt-4 inline-flex items-center justify-center gap-2 border border-line px-4 py-2.5 text-sm font-semibold hover:border-line-strong hover:bg-surface-raised"
            >
              <Icon name={copiedUrl ? "check" : "copy"} className="size-4" />
              {copiedUrl ? "Invoice link copied" : "Copy invoice link"}
            </button>
            {copyFailed && (
              <p role="alert" className="mt-3 border border-danger/40 bg-danger/10 p-3 text-xs leading-5 text-danger">
                Could not copy the link. Copy it manually from above.
              </p>
            )}
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={() => router.push(checkoutPath)}
            className="bg-accent px-5 py-3 text-sm font-semibold text-accent-ink hover:bg-white"
          >
            View checkout
          </button>
          <button
            type="button"
            onClick={() => router.push("/dashboard")}
            className="border border-line px-5 py-3 text-sm font-semibold hover:border-line-strong hover:bg-surface"
          >
            Back to dashboard
          </button>
        </div>
      </div>
    );
  }

  function validate() {
    const next: Record<string, string> = {};

    if (!title.trim()) next.title = "Enter a title your customer will recognise.";
    if (!validAmount) next.amount = parsedAmount.error ?? "Enter an amount greater than zero.";
    if (!slugPattern.test(slug)) {
      next.slug = "Use lowercase letters, numbers, and single hyphens only.";
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFailure("");

    if (!validate()) return;

    const nextLink = {
      title: title.trim(),
      slug,
      cents: priceUsdCents,
    };

    try {
      const txHash = await writeContractAsync({
        address: PAYPORT_ADDRESS,
        abi: PAYPORT_ABI,
        chainId: xlayerChain.id,
        functionName: "createPaymentLink",
        args: [slug, title.trim(), priceUsdCents, 0n],
      });

      setSubmittedLink(nextLink);
      setHash(txHash);
    } catch (error) {
      setSubmittedLink(null);
      setFailure(formatWriteError(error));
    }
  }

  const busy = isPending || receipt.isLoading;

  return (
    <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8 lg:px-10">
      <div className="max-w-2xl">
        <p className="text-[10px] font-semibold tracking-[0.16em] text-faint uppercase">
          Payment links / review
        </p>
        <h1 className="font-display mt-3 text-4xl tracking-[-0.045em]">
          {prefilledTitle ? "Review your drafted link." : "Publish a payment link."}
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted">
          {prefilledTitle
            ? "The copilot drafted this from your message. Adjust anything, then publish with one signature."
            : "Choose a dollar price, then publish a link customers can pay from any wallet."}
        </p>
      </div>

      <div className="mt-9 grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
        <form onSubmit={submit} noValidate className="border border-line bg-surface p-5 sm:p-7">
          <div className="grid gap-6">
            <label className="grid gap-2 text-sm">
              <span>Payment title</span>
              <input
                value={title}
                onChange={(event) => {
                  const nextTitle = event.target.value;
                  setTitle(nextTitle);
                  setSlug(nextTitle.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, ""));
                }}
                className="border border-line bg-background px-3.5 py-3 text-sm outline-none placeholder:text-faint focus:border-accent"
                placeholder="e.g. July retainer"
                aria-invalid={Boolean(errors.title)}
                aria-describedby={errors.title ? "title-error" : undefined}
                disabled={busy}
              />
              {errors.title && (
                <span id="title-error" className="text-xs text-danger">
                  {errors.title}
                </span>
              )}
            </label>

            <label className="grid gap-2 text-sm">
              <span>Price in US dollars</span>
              <div className="flex border border-line bg-background focus-within:border-accent">
                <span className="shrink-0 border-r border-line px-3.5 py-3 text-sm text-muted">
                  $
                </span>
                <input
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  inputMode="decimal"
                  className="min-w-0 flex-1 bg-transparent px-3.5 py-3 text-sm outline-none tabular-nums"
                  aria-invalid={Boolean(errors.amount)}
                  aria-describedby={errors.amount ? "amount-error" : "amount-hint"}
                  disabled={busy}
                />
              </div>
              {errors.amount ? (
                <span id="amount-error" className="text-xs text-danger">
                  {errors.amount}
                </span>
              ) : (
                <span id="amount-hint" className="text-xs leading-5 text-muted">
                  Stored onchain as {priceUsdCents.toString()} cents and settled in {PAY_TOKEN_SYMBOL}.
                </span>
              )}
            </label>

            <div className="border-y border-line py-5">
              <p className="text-[10px] font-semibold tracking-[0.14em] text-faint uppercase">
                Settlement rail
              </p>
              <p className="mt-2 text-sm">{PAY_TOKEN_SYMBOL} on {xlayerChain.name}</p>
              <p className="mt-2 text-xs leading-5 text-muted">
                Customers pay the exact dollar price in {PAY_TOKEN_SYMBOL}. The payment settles directly
                to your connected wallet. PayPort never holds funds.
              </p>
            </div>

            <label className="grid gap-2 text-sm">
              <span>Payment URL</span>
              <div className="flex border border-line bg-background focus-within:border-accent">
                <span className="shrink-0 border-r border-line px-3.5 py-3 text-xs text-muted">
                  /pay/
                </span>
                <input
                  value={slug}
                  onChange={(event) =>
                    setSlug(event.target.value.toLowerCase().replace(/\s+/g, "-"))
                  }
                  className="min-w-0 flex-1 bg-transparent px-3.5 py-3 text-sm outline-none"
                  aria-invalid={Boolean(errors.slug)}
                  aria-describedby={errors.slug ? "slug-error" : undefined}
                  disabled={busy}
                />
              </div>
              {errors.slug && (
                <span id="slug-error" className="text-xs text-danger">
                  {errors.slug}
                </span>
              )}
            </label>
          </div>

          {!onCorrectChain && (
            <div className="mt-7 border border-line bg-background-deep p-4">
              <p className="text-sm">
                {isConnected
                  ? `Switch to ${xlayerChain.name} to publish the link.`
                  : "Connect a wallet to publish the link."}
              </p>
              <p className="mt-2 text-xs leading-5 text-muted">
                Publishing a link is a transaction, so it needs wallet approval and a little{" "}
                {xlayerChain.nativeCurrency.symbol} for gas.
              </p>
              <div className="mt-4">
                <ConnectWallet />
              </div>
            </div>
          )}

          {publishFailure && (
            <p
              role="alert"
              className="mt-5 border border-danger/40 bg-danger/10 p-3 text-sm leading-5 text-danger"
            >
              {publishFailure}
            </p>
          )}

          {hash && (
            <p className="mt-3 text-xs leading-5 text-muted">
              Waiting for the network to confirm the transaction.{" "}
              <a
                href={explorerTx(hash)}
                target="_blank"
                rel="noreferrer"
                className="text-accent underline underline-offset-2 hover:text-white"
              >
                Track it on the explorer
              </a>
              .
            </p>
          )}

          <div className="mt-8 flex flex-col-reverse gap-3 border-t border-line pt-5 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => router.push("/dashboard")}
              className="px-4 py-3 text-sm text-muted hover:text-ink"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy || !onCorrectChain}
              className="inline-flex items-center justify-center gap-2 bg-accent px-5 py-3 text-sm font-semibold text-accent-ink hover:bg-white disabled:opacity-60"
            >
              <Icon name="link" className="size-4" />
              {isPending && "Approve in your wallet…"}
              {receipt.isLoading && "Publishing…"}
              {!busy && "Publish payment link"}
            </button>
          </div>
        </form>

        <aside className="h-fit border border-line bg-background-deep p-5 sm:p-6">
          <p className="text-[10px] font-semibold tracking-[0.15em] text-faint uppercase">
            Live preview
          </p>
          <div className="mt-5 border border-line bg-surface p-5">
            <h2 className="text-lg font-medium">{preview.title}</h2>
            <div className="mt-6 border-y border-line py-4">
              <p className="text-[10px] font-semibold tracking-[0.14em] text-faint uppercase">
                Amount due
              </p>
              <p className="price-figure mt-2 text-xl sm:text-2xl">
                {formatUsdCents(preview.cents)}
              </p>
              {validAmount && priceUsdCents > 0 && (
                <p className="mt-2 text-xs text-muted tabular-nums">
                  Settles as exactly {formatAssetAmount((priceUsdCents * 10000n), 1, 2)} {PAY_TOKEN_SYMBOL}
                </p>
              )}
            </div>
            <div className="mt-5 flex items-center justify-between text-xs">
              <span className="text-muted">Network</span>
              <span>{xlayerChain.name}</span>
            </div>
            <div className="mt-5 bg-accent py-3 text-center text-sm font-semibold text-accent-ink">
              Pay <span className="price-figure">{formatUsdCents(preview.cents)}</span>
            </div>
          </div>
          <p className="mt-4 break-all text-xs leading-5 text-muted">{buildCheckoutPath(preview.slug)}</p>
        </aside>
      </div>
    </div>
  );
}
