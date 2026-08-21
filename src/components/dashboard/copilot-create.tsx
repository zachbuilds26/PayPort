"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useRef, useState } from "react";
import { Icon } from "@/components/ui/icon";

type CopilotMessage = {
  role: "merchant" | "copilot";
  text: string;
  actionHref?: string;
};

const suggestions = [
  "create a $5 payment link named shoepayment",
  "charge $12.50 for july guitar lessons",
  "make a $99 link for the workshop deposit",
];

export function CopilotCreate() {
  const router = useRouter();
  const [messages, setMessages] = useState<CopilotMessage[]>([
    {
      role: "copilot",
      text: "Tell me what to charge and I will draft the payment link. You review it before anything goes onchain.",
    },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  function scrollToBottom() {
    requestAnimationFrame(() => {
      listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
    });
  }

  async function send(event?: FormEvent<HTMLFormElement>, rawMessage?: string) {
    event?.preventDefault();
    const message = (rawMessage ?? input).trim();
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

      let actionHref: string | undefined;
      if (data.action?.type === "prefill_link") {
        const params = new URLSearchParams();
        if (data.action.title) params.set("title", data.action.title);
        if (data.action.amount) params.set("amount", data.action.amount);
        if (data.action.slug) params.set("slug", data.action.slug);
        actionHref = `/dashboard/links/new?${params.toString()}`;
      }

      setMessages((current) => [
        ...current,
        {
          role: "copilot",
          text: data.reply ?? "Something went wrong. Try again.",
          actionHref,
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
  }

  return (
    <div className="mx-auto flex h-[calc(100vh-8rem)] max-w-2xl flex-col px-5 pt-6 sm:px-8">
      <p className="text-[10px] font-semibold tracking-[0.16em] text-faint uppercase">
        PayPort copilot
      </p>
      <h1 className="font-display mt-2 text-3xl tracking-[-0.045em]">
        Describe the payment. Get a link.
      </h1>

      <div ref={listRef} className="mt-6 flex-1 space-y-4 overflow-y-auto pr-1">
        {messages.map((message, index) => (
          <div
            key={index}
            className={message.role === "merchant" ? "flex justify-end" : "flex justify-start"}
          >
            <div
              className={`max-w-[85%] px-4 py-3 text-sm leading-5 ${
                message.role === "merchant"
                  ? "border border-accent/30 bg-accent/10 text-ink"
                  : "border border-line bg-surface text-ink"
              }`}
            >
              <p>{message.text}</p>
              {message.actionHref && (
                <button
                  type="button"
                  onClick={() => router.push(message.actionHref!)}
                  className="mt-3 inline-flex w-full items-center justify-center gap-2 bg-accent px-4 py-2.5 text-xs font-semibold text-accent-ink hover:bg-white"
                >
                  Review &amp; publish link
                  <Icon name="arrow-up-right" className="size-3.5" />
                </button>
              )}
            </div>
          </div>
        ))}
        {busy && (
          <div className="flex justify-start">
            <p role="status" aria-live="polite" className="border border-line bg-surface px-4 py-3 text-sm text-muted">
              Drafting…
            </p>
          </div>
        )}
      </div>

      {messages.length <= 1 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {suggestions.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              disabled={busy}
              onClick={() => void send(undefined, suggestion)}
              className="border border-line px-3 py-1.5 text-left text-xs text-muted transition hover:border-line-strong hover:text-ink disabled:opacity-50"
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}

      <form onSubmit={send} className="sticky bottom-0 mt-4 bg-background pb-5 pt-3">
        <div className="flex border border-line bg-surface focus-within:border-accent">
          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="e.g. create a $20 link for logo design"
            aria-label="Message the copilot"
            className="min-w-0 flex-1 bg-transparent px-4 py-3.5 text-sm outline-none placeholder:text-faint"
            disabled={busy}
          />
          <button
            type="submit"
            disabled={busy || !input.trim()}
            className="shrink-0 border-l border-line px-5 text-sm font-semibold text-accent transition hover:bg-accent hover:text-accent-ink disabled:opacity-50"
          >
            Send
          </button>
        </div>
        <p className="mt-2 text-[10px] leading-4 text-faint">
          The copilot only drafts. Publishing always needs your wallet signature.
        </p>
      </form>
    </div>
  );
}
