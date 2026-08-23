"use client";

import { useEffect, useState } from "react";
import { PayPortLogo } from "@/components/ui/payport-logo";

export function MobileGate({ children }: { children: React.ReactNode }) {
  const [isMobile, setIsMobile] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    setIsMobile(window.innerWidth < 768);
    setChecked(true);
  }, []);

  if (!checked) return null;

  if (isMobile) {
    return (
      <main className="grid min-h-screen place-items-center bg-background px-5 text-center">
        <div>
          <PayPortLogo />
          <h1 className="font-display mt-8 text-3xl tracking-[-0.045em]">
            Desktop only
          </h1>
          <p className="mt-4 max-w-sm text-sm leading-6 text-muted">
            PayPort is best experienced on a larger screen. Open this link on your
            computer to create and manage payment links.
          </p>
        </div>
      </main>
    );
  }

  return <>{children}</>;
}
