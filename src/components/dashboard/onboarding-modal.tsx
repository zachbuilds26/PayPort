"use client";

import { useCallback, useEffect, useState } from "react";
import { Icon } from "@/components/ui/icon";

const STEPS = [
  {
    icon: "wallet" as const,
    title: "Connect your wallet",
    body: "Link MetaMask or OKX Wallet to X Layer Testnet. You need a little OKB for gas.",
  },
  {
    icon: "plus" as const,
    title: "Create a payment link",
    body: "Open the copilot and say something like: create a $5 payment link named shoepayment.",
  },
  {
    icon: "arrow-up-right" as const,
    title: "Share it",
    body: "Copy the checkout URL and send it to your customer. They pay in USDC, you receive it directly.",
  },
] as const;

export function OnboardingModal() {
  const [show, setShow] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    try {
      if (!localStorage.getItem("payport:onboarded")) {
        setShow(true);
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (!show) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") dismiss();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [show]);

  const dismiss = useCallback(() => {
    try { localStorage.setItem("payport:onboarded", "1"); } catch {}
    setShow(false);
  }, []);

  if (!show) return null;

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Welcome to PayPort"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-5 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) dismiss(); }}
    >
      <section className="w-full max-w-sm border border-line bg-surface p-6 sm:p-8">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-semibold tracking-[0.15em] text-accent uppercase">
            Welcome to PayPort
          </p>
          <button
            type="button"
            onClick={dismiss}
            className="grid size-7 place-items-center border border-line text-xs text-muted hover:border-line-strong hover:text-ink"
            aria-label="Close"
          >
            &times;
          </button>
        </div>

        <div className="mt-8 grid place-items-center">
          <span className="grid size-14 place-items-center border border-line bg-background-deep text-accent">
            <Icon name={current.icon} className="size-6" />
          </span>
        </div>

        <h2 className="font-display mt-6 text-center text-xl tracking-[-0.03em]">
          {current.title}
        </h2>
        <p className="mt-3 text-center text-sm leading-6 text-muted">{current.body}</p>

        <div className="mt-8 flex items-center justify-between gap-3">
          <div className="flex gap-1.5" role="group" aria-label={`Step ${step + 1} of ${STEPS.length}`}>
            {STEPS.map((_, i) => (
              <span
                key={i}
                aria-current={i === step ? "step" : undefined}
                className={`size-1.5 ${i === step ? "bg-accent" : "bg-line"}`}
              />
            ))}
          </div>

          <div className="flex gap-2">
            {step > 0 && (
              <button
                type="button"
                onClick={() => setStep((s) => s - 1)}
                className="border border-line px-3 py-2 text-xs font-semibold text-muted hover:border-line-strong hover:text-ink"
              >
                Back
              </button>
            )}
            <button
              type="button"
              onClick={() => (isLast ? dismiss() : setStep((s) => s + 1))}
              className="bg-accent px-4 py-2 text-xs font-semibold text-accent-ink hover:bg-white"
            >
              {isLast ? "Get started" : "Next"}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
