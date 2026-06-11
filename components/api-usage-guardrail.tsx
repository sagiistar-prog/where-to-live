"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  CircleDashed,
  CloudSun,
  MailCheck,
  MapPinned,
  ShieldCheck,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import type { ApiUsageItem } from "@/lib/api-usage-types";
import { apiProviders, type ApiProviderConfig } from "@/lib/api-providers";
import { cn } from "@/lib/utils";

type ProviderStatus = {
  id: ApiProviderConfig["id"];
  name: string;
  configured: boolean;
  keyType?: string;
  quotaNote?: string;
};

type DataQualitySignal = {
  provider: "amap" | "qweather";
  feature: string;
  status: "live" | "fallback" | "missing_input" | "skipped_limit" | "failed";
  label: string;
  detail: string;
};

type ApiUsageGuardrailProps = {
  mode: "analyze" | "report";
  className?: string;
  hasScreenshot?: boolean;
  hasAddress?: boolean;
  hasWorkplace?: boolean;
  dataQuality?: DataQualitySignal[];
};

const providerIcon: Record<ApiProviderConfig["id"], LucideIcon> = {
  openai: Sparkles,
  amap: MapPinned,
  qweather: CloudSun,
  resend: MailCheck,
};

const providerDisplayCopy: Record<ApiProviderConfig["id"], { name: string; purpose: string; note: string }> = {
  openai: {
    name: "截图与报告整理",
    purpose: "整理截图、合同文本和居住判断报告",
    note: "只在你点击读取截图、确认合同或保存评估后使用主动提供的内容。",
  },
  amap: {
    name: "路线与周边数据",
    purpose: "补充通勤路线、步行距离、换乘和周边生活配套",
    note: "地址足够明确时才会查询路线和周边，地址不清楚时会提示你补充。",
  },
  qweather: {
    name: "天气舒适度",
    purpose: "补充潮湿、高温、雨天和空气等居住舒适度提醒",
    note: "只用于判断居住舒适度，不读取私人行程或定位记录。",
  },
  resend: {
    name: "邮件通知",
    purpose: "发送注册验证码和后续重要提醒",
    note: "只用于你主动请求的邮箱验证或提醒，不会发送营销邮件。",
  },
};

const usageStatusCopy = {
  healthy: {
    label: "余量充足",
    className: "border-emerald-300/30 bg-emerald-300/10 text-emerald-700",
  },
  watch: {
    label: "接近提醒线",
    className: "border-amber-300/30 bg-amber-300/10 text-amber-700",
  },
  limit: {
    label: "用量提醒",
    className: "border-rose-300/30 bg-rose-300/10 text-rose-700",
  },
};

function usageMatchesProvider(item: ApiUsageItem, providerId: ApiProviderConfig["id"]) {
  if (providerId === "amap") return item.provider.includes("高德");
  if (providerId === "qweather") return item.provider.includes("天气") || item.provider.includes("和风");
  return false;
}

function qualityStatusLabel(status: DataQualitySignal["status"]) {
  if (status === "live") return "实时";
  if (status === "missing_input") return "缺输入";
  if (status === "skipped_limit") return "用量提醒";
  if (status === "failed") return "未取得实时结果";
  return "按现有信息估算";
}

function qualityClassName(status: DataQualitySignal["status"]) {
  if (status === "live") return "border-emerald-300/30 bg-emerald-300/10 text-emerald-700";
  if (status === "failed" || status === "skipped_limit") {
    return "border-rose-300/30 bg-rose-300/10 text-rose-700";
  }
  return "border-amber-300/30 bg-amber-300/10 text-amber-700";
}

function buildExpectedCalls({
  mode,
  hasScreenshot,
  hasAddress,
  hasWorkplace,
}: Pick<ApiUsageGuardrailProps, "mode" | "hasScreenshot" | "hasAddress" | "hasWorkplace">) {
  if (mode === "report") {
    return [
      "查看、导出和回看报告不会重新评估。",
      "看房清单、官方查询、凭据材料和付款前确认会复用这份报告里的信息。",
      "合同确认只有在你粘贴真实合同、聊天记录或上传合同截图并点击确认时才会开始判断。",
      "本报告会保存数据来源和需要人工确认的问题，方便后续复盘。",
    ];
  }

  return [
    hasScreenshot
      ? "只有点击“读取截图信息”时才会读取截图；评估房源时会再整理一次完整结论。"
      : "未上传截图时，报告会根据你手动填写的信息生成。",
    hasAddress && hasWorkplace
      ? "地址和工作地点完整时，会结合路线、通勤和周边生活数据判断。"
      : "房源地址或工作地点不完整时，会先用你手动输入的信息估算。",
    hasAddress
      ? "拿到房源位置后，会补充潮湿、高温、雨天和空气等居住舒适度提醒。"
      : "没有可解析地址时不会调用天气服务，报告只给保守的潮湿、通风和季节性提醒。",
    "提交前信息确认、看房清单、官方查询、凭据材料和付款前确认不会读取你的私人账号。",
  ];
}

export function ApiUsageGuardrail({
  mode,
  className,
  hasScreenshot = false,
  hasAddress = false,
  hasWorkplace = false,
  dataQuality = [],
}: ApiUsageGuardrailProps) {
  const [providers, setProviders] = useState<ProviderStatus[]>([]);
  const [usageItems, setUsageItems] = useState<ApiUsageItem[]>([]);

  useEffect(() => {
    let mounted = true;

    Promise.all([
      fetch("/api/config/status")
        .then((response) => (response.ok ? response.json() : null))
        .catch(() => null),
      fetch("/api/usage")
        .then((response) => (response.ok ? response.json() : null))
        .catch(() => null),
    ]).then(([statusData, usageData]) => {
      if (!mounted) return;
      if (Array.isArray(statusData?.providers)) {
        setProviders(statusData.providers);
      }
      if (Array.isArray(usageData?.items)) {
        setUsageItems(usageData.items);
      }
    });

    return () => {
      mounted = false;
    };
  }, []);

  const expectedCalls = useMemo(
    () => buildExpectedCalls({ mode, hasScreenshot, hasAddress, hasWorkplace }),
    [mode, hasScreenshot, hasAddress, hasWorkplace],
  );
  const providerStatusById = new Map(providers.map((provider) => [provider.id, provider]));
  const qualityHighlights = dataQuality.slice(0, 4);

  return (
    <section className={cn("rounded-md border border-border bg-secondary p-4", className)}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5 text-primary" />
            数据来源
          </div>
          <h3 className="text-sm font-semibold">
            {mode === "analyze" ? "本次评估会用到哪些信息" : "本报告的数据来源说明"}
          </h3>
          <p className="mt-2 max-w-3xl text-xs leading-5 text-muted-foreground">
            住哪儿只使用你主动上传、手动输入的信息，以及公开可查询的路线、周边和天气数据。信息不足时，会明确告诉你哪些结论需要人工确认。
          </p>
        </div>
        <span className="w-fit rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs text-primary">
          数据边界清楚
        </span>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {apiProviders.map((provider) => {
          const status = providerStatusById.get(provider.id);
          const usage = usageItems.find((item) => usageMatchesProvider(item, provider.id));
          const Icon = providerIcon[provider.id];
          const displayCopy = providerDisplayCopy[provider.id];
          const percent = usage
            ? Math.min(Math.round((usage.used / usage.quota) * 100), 100)
            : undefined;

          return (
            <div key={provider.id} className="rounded-md border border-border bg-card p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 shrink-0 text-primary" />
                    <p className="truncate text-xs font-medium">{displayCopy.name}</p>
                  </div>
                  <p className="mt-1 line-clamp-2 text-[11px] leading-4 text-muted-foreground">
                    {displayCopy.purpose}
                  </p>
                </div>
                <span
                  className={cn(
                    "shrink-0 rounded-full border px-2 py-0.5 text-[11px]",
                    !status
                      ? "border-border bg-secondary/60 text-muted-foreground"
                      : status.configured
                        ? "border-emerald-300/30 bg-emerald-300/10 text-emerald-700"
                        : "border-amber-300/30 bg-amber-300/10 text-amber-700",
                  )}
                >
                  {!status ? "读取中" : status.configured ? "已配置" : "未配置"}
                </span>
              </div>

              {usage && percent !== undefined ? (
                <div className="mt-3">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <span
                      className={cn(
                        "rounded-full border px-2 py-0.5 text-[11px]",
                        usageStatusCopy[usage.status].className,
                      )}
                    >
                      {usageStatusCopy[usage.status].label}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      {usage.used.toLocaleString()} / {usage.quota.toLocaleString()} 次
                    </span>
                  </div>
                  <Progress value={percent} />
                  <p className="mt-2 text-[11px] leading-4 text-muted-foreground">
                    {usage.period}产品侧累计，{usage.resetAt}
                  </p>
                </div>
              ) : (
                <p className="mt-3 text-[11px] leading-4 text-muted-foreground">
                  {displayCopy.note}
                </p>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <div className="rounded-md border border-border bg-card p-3">
          <div className="mb-2 flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            <p className="text-xs font-medium">
              {mode === "analyze" ? "评估前用量说明" : "后续确认用量说明"}
            </p>
          </div>
          <ul className="space-y-1.5 text-[11px] leading-5 text-muted-foreground">
            {expectedCalls.map((item) => (
              <li key={item} className="flex gap-2">
                <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-primary" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-md border border-border bg-card p-3">
          <div className="mb-2 flex items-center gap-2">
            {qualityHighlights.length ? (
              <CheckCircle2 className="h-4 w-4 text-primary" />
            ) : (
              <CircleDashed className="h-4 w-4 text-amber-700" />
            )}
            <p className="text-xs font-medium">
              {mode === "report" ? "本报告的数据依据" : "提交后会写入报告"}
            </p>
          </div>
          {qualityHighlights.length ? (
            <div className="space-y-2">
              {qualityHighlights.map((item) => (
                <div key={`${item.provider}-${item.feature}-${item.label}`} className="grid gap-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={cn(
                        "rounded-full border px-2 py-0.5 text-[11px]",
                        qualityClassName(item.status),
                      )}
                    >
                      {qualityStatusLabel(item.status)}
                    </span>
                    <span className="text-[11px] font-medium text-foreground">
                      {item.label}
                    </span>
                  </div>
                  <p className="text-[11px] leading-4 text-muted-foreground">{item.detail}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[11px] leading-5 text-muted-foreground">
              评估保存后会保存数据来源、未使用实时数据的原因和必须人工确认的问题；这样用户能判断哪些结论可直接参考，哪些只能作为看房问题清单。
            </p>
          )}
        </div>
      </div>

      {providers.length > 0 && providers.some((provider) => !provider.configured) ? (
        <div className="mt-4 flex gap-2 rounded-md border border-amber-300/20 bg-amber-300/10 p-3 text-xs leading-5 text-amber-700">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            当前有些实时服务不可用，但仍可以继续评估。住哪儿会明确说明哪些内容按现有信息估算，不会抓取租房平台，也不会读取私人账号。
          </p>
        </div>
      ) : null}
    </section>
  );
}

