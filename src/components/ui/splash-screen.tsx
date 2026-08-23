"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

const SPLASH_MS = 5000;

export function SplashScreen({ onComplete }: { onComplete: () => void }) {
  const [show, setShow] = useState(false);
  const [phase, setPhase] = useState<"idle" | "logo" | "type" | "erase" | "exit">("idle");

  useEffect(() => {
    setShow(true);

    const t1 = setTimeout(() => setPhase("logo"), 200);
    const t2 = setTimeout(() => setPhase("type"), 1200);
    const t3 = setTimeout(() => setPhase("erase"), 3500);
    const t4 = setTimeout(() => setPhase("exit"), 4500);
    const t5 = setTimeout(() => {
      setShow(false);
      onComplete();
    }, SPLASH_MS);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
      clearTimeout(t5);
    };
  }, [onComplete]);

  if (!show) return null;

  const isErasing = phase === "erase" || phase === "exit";

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
              : isErasing
                ? "-translate-x-10 opacity-0"
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
          className={`font-display text-2xl font-semibold tracking-[-0.03em] text-ink transition-all duration-300 ${
            phase === "type"
              ? "max-w-[250px] opacity-100"
              : isErasing
                ? "max-w-0 opacity-0"
                : "max-w-0 opacity-0"
          } overflow-hidden whitespace-nowrap`}
        >
          <span className="inline-block">
            {"PayPort".split("").map((char, i) => (
              <span
                key={i}
                className={`inline-block transition-opacity duration-200 ${
                  isErasing ? "opacity-0" : "animate-[typewriter_0.4s_steps(1)_both]"
                }`}
                style={!isErasing ? { animationDelay: `${i * 0.07}s` } : { transitionDelay: `${(5 - i) * 0.04}s` }}
              >
                {char}
              </span>
            ))}
            {!isErasing && (
              <span className="ml-0.5 inline-block h-5 w-0.5 animate-pulse bg-ink" />
            )}
          </span>
        </span>
      </div>
    </div>
  );
}
