import { Suspense } from "react";
import { DashboardRailShell } from "@/components/dashboard/dashboard-rail-shell";
import { OnboardingModal } from "@/components/dashboard/onboarding-modal";

export default function DashboardLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <DashboardRailShell>{children}</DashboardRailShell>
      <OnboardingModal />
    </Suspense>
  );
}
