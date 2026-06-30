import { AppShell } from "@/components/app-shell";
import { AccountStatusPanel } from "@/components/account-status-panel";
import { SettingsNextActions } from "@/components/settings-next-actions";
import { SubscriptionPlanPanel } from "@/components/subscription-plan-panel";
import { UserPreferenceSettings } from "@/components/user-preference-settings";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default function SettingsPage() {
  return (
    <AppShell>
      <div className="mx-auto w-full max-w-7xl min-w-0 space-y-8 overflow-x-hidden">
        <section>
          <p className="text-sm text-primary/80">
            账户与偏好
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-normal sm:text-4xl">
            常用信息与账号
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground">
            把常用城市、工作地点、预算和生活偏好保存下来，下一次判断可以少填重复信息。
          </p>
        </section>

        <section className="grid min-w-0 gap-4 lg:grid-cols-2">
          <div className="min-w-0">
            <AccountStatusPanel />
          </div>

          <SubscriptionPlanPanel />

          <UserPreferenceSettings />
        </section>

        <SettingsNextActions />
      </div>
    </AppShell>
  );
}
