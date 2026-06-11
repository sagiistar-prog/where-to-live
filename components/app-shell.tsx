import { ReactNode } from "react";
import { AccountPreferenceSync } from "@/components/account-preference-sync";
import { SideNav } from "@/components/side-nav";
import { TopNav } from "@/components/top-nav";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen overflow-x-hidden bg-[oklch(0.982_0.008_92)]">
      <AccountPreferenceSync />
      <div className="min-h-screen overflow-x-hidden">
        <TopNav />
        <div className="flex min-w-0">
          <SideNav />
          <main className="min-h-[calc(100vh-4rem)] w-full min-w-0 flex-1 overflow-x-hidden px-4 py-8 sm:px-6 lg:px-10">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
