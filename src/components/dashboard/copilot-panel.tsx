"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAccount, useWriteContract } from "wagmi";
import { waitForTransactionReceipt } from "wagmi/actions";
import { Icon } from "@/components/ui/icon";
import { buildCheckoutPath, xlayerChain, wagmiConfig } from "@/lib/chain";
import { PAYPORT_ADDRESS } from "@/lib/contract-address";
import { formatWriteError } from "@/lib/payport-errors";
import { PAYPORT_ABI } from "@/lib/payport-abi";

type PublishDraft = {
  title?: string;
  slug: string;
  amountUsdCents: number;
};

type CopilotMessage = {
  role: "merchant" | "copilot";
  text: string;
  draft?: PublishDraft;
  status?: "idle" | "publishing" | "published" | "failed";
  failure?: string;
  txHash?: `0x${string}`;
  editHref?: string;
};

function toCents(amount: string | undefined) {
  const n = Number(amount);
  if (!Number.isFinite(n) || n <= 0) return undefined;
  return Math.round(n * 100);
}

export function CopilotPanel() {
  const router = useRouter();
  const { address, isConnected, chainId } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const onCorrectChain = isConnected && chainId === xlayerChain.id;

  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<CopilotMessage[]>([
    {
      role: "copilot",
      text: "Tell me what to charge. Try: create a $5 payment link named shoepayment.",
    },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function open() {
      setOpen(true);
    }
    window.addEventListener("payport:open-copilot", open);
    return () => window.removeEventListener("payport:open-copilot", open);
  }, []);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("copilot") === "1") {
      setOpen(true); // eslint-disable-line react-hooks/set-state-in-effect
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, []);

  function scrollToBottom() {
    requestAnimationFrame(() => {
      listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
    });
  }

  function patchMessage(index: number, patch: Partial<CopilotMessage>) {
    setMessages((current) =>
      current.map((message, i) => (i === index ? { ...message, ...patch } : message)),
    );
  }

  async function publish(draft: PublishDraft, index: number) {
    if (!isConnected || !address) return;
    if (!onCorrectChain) {
      patchMessage(index, { failure: `Switch to ${xlayerChain.name} first.` });
      return;
    }

    patchMessage(index, { status: "publishing", failure: undefined });

    try {
      const txHash = await writeContractAsync({
        address: PAYPORT_ADDRESS,
        abi: PAYPORT_ABI,
        chainId: xlayerChain.id,
        functionName: "createPaymentLink",
        args: [draft.slug, draft.title ?? draft.slug, BigInt(draft.amountUsdCents), 0n],
      });

      await waitForTransactionReceipt(wagmiConfig, {
        hash: txHash,
        chainId: xlayerChain.id,
        confirmations: 1,
        timeout: 90_000,
      });

      patchMessage(index, {
        status: "published",
        txHash,
        text: `${draft.title ? `"${draft.title}"` : "Your link"} is live at $${(draft.amountUsdCents / 100).toFixed(2)}.`,
      });
    } catch (error) {
      patchMessage(index, {
        status: "failed",
        failure: formatWriteError(error),
      });
    } finally {
      scrollToBottom();
    }
  }

  const send = useCallback(async (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    const message = input.trim();
    if (!message || busy) return;

    setInput("");
    setMessages((current) => [...current, { role: "merchant", text: message }]);
    setBusy(true);
    scrollToBottom();

    try {
      const response = await fetch("/api/copilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
      const data = (await response.json()) as {
        reply?: string;
        action?: { type: string; amount?: string; title?: string; slug?: string };
      };

      if (data.action?.type === "prefill_link") {
        const action = data.action;
        const cents = toCents(action.amount);
        const draftSlug: string | undefined =
          typeof action.slug === "string" && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(action.slug)
            ? action.slug
            : undefined;

        if (cents && draftSlug) {
          const draftTitle: string | undefined = action.title?.trim()
            ? action.title.trim().slice(0, 200)
            : undefined;
          const editParams = new URLSearchParams();
          if (draftTitle) editParams.set("title", draftTitle);
          if (action.amount) editParams.set("amount", action.amount);
          editParams.set("slug", draftSlug);

          setMessages((current) => [
            ...current,
            {
              role: "copilot",
              text:
                data.reply ??
                `Ready to publish${draftTitle ? ` "${draftTitle}"` : ""}.`,
              draft: {
                title: draftTitle,
                slug: draftSlug,
                amountUsdCents: cents,
              },
              status: "idle",
              editHref: `/dashboard/links/new?${editParams.toString()}`,
            },
          ]);
          scrollToBottom();
          return;
        }
      }

      setMessages((current) => [
        ...current,
        {
          role: "copilot",
          text:
            data.reply ??
            "Something went wrong. Try again.",
        },
      ]);
    } catch {
      setMessages((current) => [
        ...current,
        { role: "copilot", text: "The copilot could not be reached. Try again in a moment." },
      ]);
    } finally {
      setBusy(false);
      scrollToBottom();
    }
  }, [input, busy]);

  return (
    <div className="fixed right-5 bottom-6 z-40 flex flex-col items-end gap-3">
      {open && (
        <section
          aria-label="PayPort copilot"
          className="flex h-[460px] w-[min(92vw,380px)] flex-col border border-line bg-surface"
        >
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <div>
              <p className="text-[10px] font-semibold tracking-[0.15em] text-accent uppercase">
                AI copilot
              </p>
              <p className="mt-0.5 text-xs text-muted">Draft links by chatting</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close the copilot"
              className="border border-line px-2 py-1 text-xs font-semibold text-muted hover:border-line-strong hover:text-ink"
            >
              ×
            </button>
          </div>

          <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {messages.map((message, index) => (
              <div key={index} className={message.role === "merchant" ? "flex justify-end" : "flex justify-start"}>
                <div
                  className={`max-w-[88%] border px-3 py-2 text-sm leading-5 ${
                    message.role === "merchant"
                      ? "border-accent/30 bg-accent/10 text-ink"
                      : "border-line bg-background-deep text-ink"
                  }`}
                >
                  <p>{message.text}</p>

                  {message.draft && message.status !== "published" && (
                    <div className="mt-2 border border-line bg-surface px-3 py-2">
                      <p className="text-[10px] font-semibold tracking-[0.12em] text-faint uppercase">
                        Draft payment link
                      </p>
                      <p className="mt-1 text-sm font-medium">{message.draft.title ?? message.draft.slug}</p>
                      <p className="price-figure mt-0.5 text-base">
                        ${(message.draft.amountUsdCents / 100).toFixed(2)}
                        <span className="ml-1 text-xs font-normal text-muted">USDC</span>
                      </p>
                      <p className="mt-1 break-all font-mono text-[10px] text-muted">
                        /pay/{message.draft.slug}
                      </p>

                      {message.status === "publishing" && (
                        <p role="status" className="mt-2 text-xs text-muted">
                          Approve in your wallet…
                        </p>
                      )}

                      {message.failure && (
                        <p role="alert" className="mt-2 text-xs leading-4 text-danger">
                          {message.failure}
                        </p>
                      )}

                      <button
                        type="button"
                        disabled={message.status === "publishing"}
                        onClick={() => void publish(message.draft!, index)}
                        className="mt-2 inline-flex w-full items-center justify-center gap-2 bg-accent px-3 py-2 text-xs font-semibold text-accent-ink hover:bg-white disabled:opacity-60"
                      >
                        {message.status === "publishing" ? (
                          "Publishing…"
                        ) : message.status === "failed" ? (
                          <>
                            Try again <Icon name="arrow-up-right" className="size-3.5" />
                          </>
                        ) : (
                          <>
                            Confirm &amp; publish{" "}
                            {(message.draft.amountUsdCents / 100).toFixed(2)} USD
                          </>
                        )}
                      </button>

                      {message.editHref && message.status !== "publishing" && (
                        <button
                          type="button"
                          onClick={() => router.push(message.editHref!)}
                          className="mt-1.5 w-full text-center text-[10px] text-muted underline underline-offset-2 hover:text-ink"
                        >
                          Edit before publishing instead
                        </button>
                      )}
                    </div>
                  )}

                  {message.status === "published" && message.txHash && (
                    <CopyButton slug={message.draft!.slug} />
                  )}
                </div>
              </div>
            ))}
            {busy && (
              <div className="flex justify-start">
                <p role="status" className="border border-line bg-background-deep px-3 py-2 text-sm text-muted">
                  Thinking…
                </p>
              </div>
            )}
          </div>

          {!isConnected && (
            <p className="border-t border-line px-4 pt-2 text-[10px] text-warning">
              Connect your wallet first. The copilot drafts, your wallet publishes.
            </p>
          )}

          <form onSubmit={send} className="border-t border-line p-3">
            <div className="flex border border-line bg-background focus-within:border-accent">
              <input
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder={isConnected ? "create a $5 payment link…" : "Connect wallet to use copilot"}
                aria-label="Message the copilot"
                className="min-w-0 flex-1 bg-transparent px-3 py-2.5 text-sm outline-none placeholder:text-faint"
                disabled={busy || !isConnected}
              />
              <button
                type="submit"
                disabled={busy || !input.trim() || !isConnected}
                className="shrink-0 border-l border-line px-3 text-xs font-semibold text-accent hover:bg-accent hover:text-accent-ink disabled:opacity-50"
              >
                Send
              </button>
            </div>
          </form>
        </section>
      )}
    </div>
  );
}

function CopyButton({ slug }: { slug: string }) {
  const [copied, setCopied] = useState(false);
  const router = useRouter();

  function handleCopy() {
    const url = `${window.location.origin}${buildCheckoutPath(slug)}`;
    void navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="mt-2 border border-line bg-surface px-3 py-2">
      <p className="text-xs font-semibold text-success">Live on X Layer.</p>
      <button
        type="button"
        onClick={handleCopy}
        className="mt-2 w-full border border-line px-2 py-1.5 text-xs font-semibold hover:border-line-strong hover:text-ink"
      >
        {copied ? "Copied!" : "Copy checkout URL"}
      </button>
      <button
        type="button"
        onClick={() => router.push(buildCheckoutPath(slug))}
        className="mt-1.5 w-full bg-accent px-2 py-1.5 text-xs font-semibold text-accent-ink hover:bg-white"
      >
        View checkout
      </button>
    </div>
  );
}
