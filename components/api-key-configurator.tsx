"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, CircleDashed, KeyRound, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type ProviderState = {
  id: "openai" | "amap" | "qweather" | "resend";
  name: string;
  env: string;
  keyType: string;
  setupHint: string;
  configured: boolean;
};

type ConfigState = {
  enabled: boolean;
  fileName: string;
  auth?: {
    name: string;
    configured: boolean;
    secretConfigured: boolean;
    googleIdConfigured: boolean;
    googleSecretConfigured: boolean;
    nextAuthUrlConfigured: boolean;
    callbackUrl: string;
  };
  providers: ProviderState[];
  error?: string;
  warnings?: string[];
  updatedAt?: string;
};

const fields = [
  {
    id: "authSecret",
    providerId: "google-auth",
    label: "登录会话密钥",
    env: "AUTH_SECRET",
    placeholder: "openssl rand -base64 32",
    helper: "用于保护登录会话。只保存在服务端环境变量，不会出现在浏览器里。",
  },
  {
    id: "authGoogleId",
    providerId: "google-auth",
    label: "Google 登录 Client ID",
    env: "AUTH_GOOGLE_ID",
    placeholder: "xxxxx.apps.googleusercontent.com",
    helper: "Google Cloud Console 的 Web OAuth Client ID，优先使用 AUTH_GOOGLE_ID。",
  },
  {
    id: "authGoogleSecret",
    providerId: "google-auth",
    label: "Google 登录 Client Secret",
    env: "AUTH_GOOGLE_SECRET",
    placeholder: "GOCSPX-...",
    helper: "Google OAuth Client Secret；旧变量 GOOGLE_CLIENT_SECRET 仍兼容，但推荐使用此项。",
  },
  {
    id: "nextAuthUrl",
    providerId: "google-auth",
    label: "登录回调 URL",
    env: "NEXTAUTH_URL",
    placeholder: "http://localhost:3000",
    helper: "当前开发地址先填 http://localhost:3000；Google 回调地址会按它设置。",
  },
  {
    id: "openaiApiKey",
    providerId: "openai",
    label: "完整评估服务 Key",
    env: "OPENAI_API_KEY",
    placeholder: "sk-proj-... 或 sk-...",
    helper: "用于截图理解、合同确认和房源评估，只写入服务端环境变量。",
  },
  {
    id: "amapWebServiceKey",
    providerId: "amap",
    label: "高德地图 Web服务 Key",
    env: "AMAP_WEB_SERVICE_KEY",
    placeholder: "高德开放平台 Web服务 Key",
    helper: "请选择“Web服务”，不是“Web端(JS API)”；用于服务端地址解析、通勤和周边生活信息。",
  },
  {
    id: "qweatherApiKey",
    providerId: "qweather",
    label: "天气服务 Key",
    env: "QWEATHER_API_KEY",
    placeholder: "和风天气开发服务 Key",
    helper: "用于湿度、降雨、高温、空气质量和居住舒适度判断。",
  },
  {
    id: "resendApiKey",
    providerId: "resend",
    label: "邮件验证码 Key",
    env: "RESEND_API_KEY",
    placeholder: "re_...",
    helper: "用于发送邮箱验证码；未配置时仍可使用当前设备验证码完成注册。",
  },
  {
    id: "resendFromEmail",
    providerId: "resend",
    label: "Resend 发件地址",
    env: "RESEND_FROM_EMAIL",
    placeholder: "住哪儿 AI <onboarding@yourdomain.com>",
    helper: "可选。建议使用 Resend 已验证域名；留空时后端会使用系统发件地址。",
  },
] as const;

type FieldId = (typeof fields)[number]["id"];

function initialValues(): Record<FieldId, string> {
  return {
    openaiApiKey: "",
    amapWebServiceKey: "",
    qweatherApiKey: "",
    resendApiKey: "",
    resendFromEmail: "",
    authSecret: "",
    authGoogleId: "",
    authGoogleSecret: "",
    nextAuthUrl: "",
  };
}

export function ApiKeyConfigurator() {
  const [values, setValues] = useState<Record<FieldId, string>>(initialValues);
  const [state, setState] = useState<ConfigState | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let mounted = true;

    fetch("/api/config/env")
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (!mounted || !data) return;
        setState(data);
      })
      .catch(() => undefined);

    return () => {
      mounted = false;
    };
  }, []);

  const configuredById = useMemo(() => {
    const map = new Map<string, boolean>();
    for (const provider of state?.providers ?? []) {
      map.set(provider.id, provider.configured);
    }
    return map;
  }, [state?.providers]);

  async function saveKeys() {
    setIsSaving(true);
    setMessage(null);

    try {
      const response = await fetch("/api/config/env", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await response.json().catch(() => null);

      if (!response.ok || !data) {
        setState(data ?? state);
        setMessage(data?.error ?? "保存失败，请确认当前服务是否正常运行。");
        return;
      }

      setState(data);
      setValues(initialValues());
      window.dispatchEvent(new CustomEvent("zhunaar-api-config-updated"));
      setMessage(
        data.warnings?.length
          ? `已保存，但需要确认：${data.warnings.join(" ")}`
          : "已保存到 .env.local，并已更新当前服务的服务端环境变量。",
      );
    } catch {
      setMessage("保存失败，请确认当前服务正常运行，或手动编辑根目录 .env.local。");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Card className="p-6">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-border bg-secondary px-3 py-1 text-xs text-muted-foreground">
            <KeyRound className="h-3.5 w-3.5 text-primary" />
            服务端密钥
          </div>
          <h2 className="text-lg font-semibold">开发环境密钥配置</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
            这里会写入项目根目录的 <code className="rounded bg-secondary px-1.5 py-0.5">.env.local</code>。
            密钥不会回显到页面；留空的项目会保持原值。正式部署时建议改用云平台的环境变量管理。
          </p>
        </div>
        <span
          className={`w-fit rounded-full border px-3 py-1 text-xs ${
            state?.enabled === false
              ? "border-amber-300/30 bg-amber-300/10 text-amber-700"
              : "border-emerald-300/30 bg-emerald-300/10 text-emerald-700"
          }`}
        >
          {state?.enabled === false ? "生产环境已关闭" : "当前环境可写入"}
        </span>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {fields.map((field) => {
          const configured =
            field.providerId === "google-auth"
              ? field.id === "authSecret"
                ? state?.auth?.secretConfigured
                : field.id === "authGoogleId"
                  ? state?.auth?.googleIdConfigured
                  : field.id === "authGoogleSecret"
                    ? state?.auth?.googleSecretConfigured
                    : state?.auth?.nextAuthUrlConfigured
              : configuredById.get(field.providerId);
          const StatusIcon = configured ? CheckCircle2 : CircleDashed;

          return (
            <div key={field.id} className="rounded-md border border-border bg-secondary p-4">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <Label htmlFor={field.id}>{field.label}</Label>
                  <p className="mt-1 text-xs text-muted-foreground">{field.env}</p>
                </div>
                <span
                  className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-1 text-[11px] ${
                    configured
                      ? "border-emerald-300/30 bg-emerald-300/10 text-emerald-700"
                      : "border-amber-300/30 bg-amber-300/10 text-amber-700"
                  }`}
                >
                  <StatusIcon className="h-3 w-3" />
                  {configured ? "已配置" : "未配置"}
                </span>
              </div>
              <Input
                id={field.id}
                type="password"
                autoComplete="off"
                placeholder={field.placeholder}
                value={values[field.id]}
                onChange={(event) =>
                  setValues((current) => ({
                    ...current,
                    [field.id]: event.target.value,
                  }))
                }
              />
              <p className="mt-3 text-xs leading-5 text-muted-foreground">{field.helper}</p>
            </div>
          );
        })}
      </div>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-xs leading-5 text-muted-foreground">
          <p>
            当前只保存登录、完整评估、地图、天气和邮件验证码的服务端配置；不会保存 Web端 JS API Key。
          </p>
          {state?.auth?.callbackUrl ? (
            <p className="mt-1">
              Google Cloud Console 回调地址：
              <code className="ml-1 rounded bg-secondary px-1.5 py-0.5 text-primary">
                {state.auth.callbackUrl}
              </code>
            </p>
          ) : null}
        </div>
        <Button type="button" onClick={saveKeys} disabled={isSaving || state?.enabled === false}>
          <Save className="mr-2 h-4 w-4" />
          {isSaving ? "正在保存" : "保存到 .env.local"}
        </Button>
      </div>

      {message ? (
        <div className="mt-4 rounded-md border border-primary/20 bg-primary/[0.08] p-3 text-sm leading-6 text-primary">
          {message}
        </div>
      ) : null}
    </Card>
  );
}

