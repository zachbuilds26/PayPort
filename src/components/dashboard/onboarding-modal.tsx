"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/ui/icon";

const ONBOARDING_KEY = "payport:onboarded:v1";
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
      if (!localStorage.getItem(ONBOARDING_KEY)) {
        setShow(true);
      }
    } catch {
      // SSR or storage error — skip
    }
  }, []);

  function dismiss() {
    try {
      localStorage.setItem(ONBOARDING_KEY, "1");
    } catch {
      // storage full
    }
    setShow(false);
  }

  if (!show) return null;

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-5 backdrop-blur-sm">
      <section className="w-full max-w-sm border border-line bg-surface p-6 sm:p-8">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-semibold tracking-[0.15em] text-accent uppercase">
            Welcome to PayPort
          </p>
          <button
            type="button"
            onClick={dismiss}
            className="grid size-7 place-items-center border border-line text-xs text-muted hover:border-line-strong hover:text-ink"
            aria-label="Skip onboarding"
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
          <div className="flex gap-1.5">
            {STEPS.map((_, i) => (
              <span
                key={i}
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
