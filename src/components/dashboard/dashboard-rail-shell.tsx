"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createContext, useContext, useMemo, type ReactNode } from "react";
import { Icon } from "@/components/ui/icon";
import { PayPortLogo } from "@/components/ui/payport-logo";
import { CopilotPanel } from "@/components/dashboard/copilot-panel";
import { getRail, type RailConfig, type RailKey } from "@/lib/chain";

type DashboardRailContextValue = {
  railKey: RailKey;
  rail: RailConfig;
};

const DashboardRailContext = createContext<DashboardRailContextValue | null>(null);

function DashboardChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isOverview = pathname === "/dashboard";
  const isPayments = pathname === "/payments";

  return (
    <div className="min-h-screen bg-background text-ink">
      <header className="sticky top-0 z-20 border-b border-line bg-background/95 px-4 backdrop-blur sm:px-6">
        <div className="relative mx-auto flex max-w-7xl items-center py-3">
          <PayPortLogo compact />
          <nav
            className="absolute left-1/2 flex -translate-x-1/2 items-center gap-2"
            aria-label="Merchant navigation"
          >
            <Link
              href="/dashboard"
              className={`inline-flex items-center gap-2 px-3 py-2 text-xs font-semibold transition sm:px-4 ${
                isOverview ? "text-ink" : "text-muted hover:text-ink"
              }`}
            >
              <Icon name="grid" className="size-3.5" />
              Overview
            </Link>
            <Link
              href="/payments"
              className={`inline-flex items-center gap-2 px-3 py-2 text-xs font-semibold transition sm:px-4 ${
                isPayments ? "text-ink" : "text-muted hover:text-ink"
              }`}
            >
              <Icon name="receipt" className="size-3.5" />
              Payments
            </Link>
            <button
              type="button"
              onClick={() => window.dispatchEvent(new Event("payport:open-copilot"))}
              className="inline-flex items-center gap-2 px-3 py-2 text-xs font-semibold text-muted transition hover:text-ink sm:px-4"
            >
              <Icon name="plus" className="size-3.5" />
              Create New Link
            </button>
          </nav>
        </div>
      </header>
      <main className="pb-16">{children}</main>
      <CopilotPanel />
    </div>
  );
}

export function DashboardRailShell({ children }: { children: ReactNode }) {
  const rail = getRail("xlayer-testnet");
  const value = useMemo<DashboardRailContextValue>(() => ({ railKey: rail.key, rail }), [rail]);

  return (
    <DashboardRailContext.Provider value={value}>
      <DashboardChrome>{children}</DashboardChrome>
    </DashboardRailContext.Provider>
  );
}

export function useDashboardRail() {
  const context = useContext(DashboardRailContext);
  if (!context) throw new Error("useDashboardRail must be used inside DashboardRailShell.");
  return context;
}
