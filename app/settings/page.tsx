import { AppShell } from "@/components/app-shell";
import { SettingsPanel } from "@/components/settings-panel";
import { ApiUsagePanel } from "@/components/api-usage-panel";
import { ApiConnectionStatus } from "@/components/api-connection-status";
import { ApiSetupGuide } from "@/components/api-setup-guide";
import { ApiKeyConfigurator } from "@/components/api-key-configurator";
import { AppBehaviorSettings } from "@/components/app-behavior-settings";
import { AccountStatusPanel } from "@/components/account-status-panel";
import { DataManagementActions } from "@/components/data-management-actions";
import { UserPreferenceSettings } from "@/components/user-preference-settings";
import { getApiUsageSnapshot } from "@/lib/server/api-usage";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default function SettingsPage() {
  const usageSnapshot = getApiUsageSnapshot();

  return (
    <AppShell>
      <div className="mx-auto max-w-7xl space-y-8">
        <section>
          <p className="text-sm text-primary/80">
            个人设置
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-normal sm:text-4xl">
            个人设置
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground">
            把常用城市、工作地点、预算和生活偏好保存下来，下一次评估就能更快进入真实选择。
          </p>
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <div className="lg:col-span-2">
            <AccountStatusPanel />
          </div>

          <UserPreferenceSettings />

          <AppBehaviorSettings />

          <div className="lg:col-span-2">
            <SettingsPanel
              title="数据管理"
              description="导出或清空当前设备上的判断记录，让用户能掌控自己的数据。"
            >
              <DataManagementActions />
            </SettingsPanel>
          </div>

          <div className="lg:col-span-2">
            <SettingsPanel
              title="服务接入"
              description="查看账号登录、地图通勤、天气舒适度、邮件验证码和完整评估是否可用。普通用户只需要知道服务状态。"
            >
              <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
                <ApiConnectionStatus />
                <ApiUsagePanel
                  items={usageSnapshot.items}
                  initialUpdatedAt={new Date().toISOString()}
                />
              </div>

              <details className="group mt-4 rounded-md border border-border bg-secondary/70 p-4">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-medium [&::-webkit-details-marker]:hidden">
                  <span>本地开发配置</span>
                  <span className="text-xs text-muted-foreground transition group-open:rotate-180">
                    展开
                  </span>
                </summary>
                <div className="mt-5 grid gap-4">
                  <ApiKeyConfigurator />
                  <ApiSetupGuide />
                </div>
              </details>
            </SettingsPanel>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
