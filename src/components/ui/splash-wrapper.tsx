"use client";

import { useCallback, useState } from "react";
import { SplashScreen } from "@/components/ui/splash-screen";

export function SplashWrapper({ children }: { children: React.ReactNode }) {
  const [done, setDone] = useState(false);
  const handleComplete = useCallback(() => setDone(true), []);

  return (
    <>
      {!done && <SplashScreen onComplete={handleComplete} />}
      <div className={done ? "" : "invisible"}>{children}</div>
    </>
  );
}
