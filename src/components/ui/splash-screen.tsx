"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

const SPLASH_MS = 5000;

export function SplashScreen({ onComplete }: { onComplete: () => void }) {
  const [show, setShow] = useState(false);
  const [phase, setPhase] = useState<"idle" | "logo" | "type" | "exit">("idle");

  useEffect(() => {
    setShow(true);

    const t1 = setTimeout(() => setPhase("logo"), 200);
    const t2 = setTimeout(() => setPhase("type"), 1200);
    const t3 = setTimeout(() => setPhase("exit"), 4200);
    const t4 = setTimeout(() => {
      setShow(false);
      onComplete();
    }, SPLASH_MS);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, [onComplete]);

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-background">
      <div
        className={`flex items-center gap-3 overflow-hidden transition-all duration-700 ease-in ${
          phase === "exit" ? "-translate-x-[120%] opacity-0" : "translate-x-0 opacity-100"
        }`}
      >
        <div
          className={`transition-all duration-1000 ease-out ${
            phase === "idle"
              ? "translate-x-24 opacity-0"
              : "translate-x-0 opacity-100"
          }`}
        >
          <Image
            src="/payport-logo-mark.png"
            alt=""
            width={48}
            height={48}
            unoptimized
            priority
          />
        </div>
        <span
          className={`font-display text-2xl font-semibold tracking-[-0.03em] text-ink transition-all duration-500 ${
            phase === "type" || phase === "exit"
              ? "max-w-[200px] opacity-100"
              : "max-w-0 opacity-0"
          } overflow-hidden whitespace-nowrap`}
        >
          {phase === "type" || phase === "exit" ? (
            <span className="inline-block">
              {"PayPort".split("").map((char, i) => (
                <span
                  key={i}
                  className="inline-block animate-[typewriter_0.4s_steps(1)_both]"
                  style={{ animationDelay: `${i * 0.07}s` }}
                >
                  {char}
                </span>
              ))}
              <span className="ml-0.5 inline-block h-5 w-0.5 animate-pulse bg-ink" />
            </span>
          ) : null}
        </span>
      </div>
    </div>
  );
}
