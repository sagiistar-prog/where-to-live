"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, CircleDashed, KeyRound, ShieldCheck } from "lucide-react";
import { Card } from "@/components/ui/card";

type ProviderStatus = {
  id: string;
  name: string;
  platform: string;
  purpose: string;
  configured: boolean;
  env: string;
  keyType: string;
  quotaNote: string;
  degradation: string;
};

type AuthStatus = {
  name: string;
  configured: boolean;
  secretConfigured: boolean;
  googleIdConfigured: boolean;
  googleSecretConfigured: boolean;
  nextAuthUrlConfigured: boolean;
  callbackUrl: string;
};

const providerCopy: Record<string, { label: string; detail: string }> = {
  openai: {
    label: "完整评估",
    detail: "用于截图理解、合同确认和房源评估；暂不可用时仍可使用快速评估。",
  },
  amap: {
    label: "地图与通勤",
    detail: "用于地址解析、通勤路线和周边生活信息。",
  },
  qweather: {
    label: "天气与舒适度",
    detail: "用于湿度、降雨、高温、空气质量和居住舒适度判断。",
  },
  resend: {
    label: "邮件验证码",
    detail: "用于邮箱验证码和后续重要提醒；暂不可用时可使用当前设备验证码。",
  },
};

export function ApiConnectionStatus() {
  const [providers, setProviders] = useState<ProviderStatus[]>([]);
  const [authStatus, setAuthStatus] = useState<AuthStatus | null>(null);
  const [checkedAt, setCheckedAt] = useState<string | null>(null);

  const refreshStatus = useCallback((mounted: () => boolean = () => true) => {
    fetch("/api/config/status")
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (!mounted() || !data?.providers) return;
        setProviders(data.providers);
        setAuthStatus(data.auth ?? null);
        setCheckedAt(data.checkedAt ?? null);
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    let mounted = true;

    refreshStatus(() => mounted);

    return () => {
      mounted = false;
    };
  }, [refreshStatus]);

  useEffect(() => {
    const handleConfigUpdate = () => refreshStatus();

    window.addEventListener("zhunaar-api-config-updated", handleConfigUpdate);
    return () => {
      window.removeEventListener("zhunaar-api-config-updated", handleConfigUpdate);
    };
  }, [refreshStatus]);

  return (
    <Card className="p-6">
      <div className="mb-5">
        <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-border bg-secondary px-3 py-1 text-xs text-muted-foreground">
          <KeyRound className="h-3.5 w-3.5 text-primary" />
          服务状态
        </div>
        <h2 className="text-lg font-semibold">当前服务状态</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          这里只显示服务是否可用。状态确认只读取服务端配置，不会向第三方发起请求，也不会消耗额度。
        </p>
      </div>

      <div className="grid gap-3">
        {authStatus ? (
          <div className="rounded-md border border-border bg-secondary p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  <p className="text-sm font-semibold">Google 登录</p>
                </div>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  用于账号登录、偏好同步和判断记录保存。
                </p>
                <details className="mt-2 text-xs leading-5 text-muted-foreground">
                  <summary className="cursor-pointer">查看本地开发信息</summary>
                  <p className="mt-1 break-all">回调地址：{authStatus.callbackUrl}</p>
                </details>
              </div>
              <StatusBadge configured={authStatus.configured} />
            </div>
            <details className="mt-3 rounded-md border border-border bg-card px-3 py-2">
              <summary className="cursor-pointer text-xs font-medium text-muted-foreground">
                开发环境字段
              </summary>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <MiniStatus label="AUTH_SECRET" configured={authStatus.secretConfigured} />
              <MiniStatus label="AUTH_GOOGLE_ID" configured={authStatus.googleIdConfigured} />
              <MiniStatus
                label="AUTH_GOOGLE_SECRET"
                configured={authStatus.googleSecretConfigured}
              />
              <MiniStatus label="NEXTAUTH_URL" configured={authStatus.nextAuthUrlConfigured} />
              </div>
            </details>
          </div>
        ) : null}

        {providers.length ? (
          providers.map((provider) => {
            const copy = providerCopy[provider.id] ?? {
              label: provider.name,
              detail: provider.purpose,
            };
            return (
              <div
                key={provider.id}
                className="rounded-md border border-border bg-secondary p-4"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold">{copy.label}</p>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">{copy.detail}</p>
                  </div>
                  <StatusBadge configured={provider.configured} />
                </div>
                <details className="mt-3 text-xs leading-5 text-muted-foreground">
                  <summary className="cursor-pointer">查看服务来源和额度说明</summary>
                  <p className="mt-2">{provider.platform} · {provider.keyType}</p>
                  <p className="mt-1">环境变量：{provider.env}</p>
                  <p className="mt-1">{provider.quotaNote}</p>
                </details>
              </div>
            );
          })
        ) : (
          <div className="rounded-md border border-border bg-secondary p-4 text-sm text-muted-foreground">
            正在读取服务端配置状态...
          </div>
        )}
      </div>

      {checkedAt ? (
        <p className="mt-4 text-xs text-muted-foreground">
          最近确认：{new Date(checkedAt).toLocaleString("zh-CN")}
        </p>
      ) : null}
    </Card>
  );
}

function StatusBadge({ configured }: { configured: boolean }) {
  const Icon = configured ? CheckCircle2 : CircleDashed;

  return (
    <span
      className={`inline-flex w-fit items-center gap-1 rounded-full border px-2.5 py-1 text-xs ${
        configured
          ? "border-emerald-300/30 bg-emerald-300/10 text-emerald-700"
          : "border-amber-300/30 bg-amber-300/10 text-amber-700"
      }`}
    >
      <Icon className="h-3.5 w-3.5" />
      {configured ? "可用" : "暂不可用"}
    </span>
  );
}

function MiniStatus({ label, configured }: { label: string; configured: boolean }) {
  return (
    <span className="flex min-w-0 items-center justify-between gap-2 rounded-md border border-border bg-card px-3 py-2 text-xs">
      <span className="truncate text-muted-foreground">{label}</span>
      <span className={configured ? "text-emerald-700" : "text-amber-700"}>
        {configured ? "已填" : "待填"}
      </span>
    </span>
  );
}

