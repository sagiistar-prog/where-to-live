import type { ApiUsageItem } from "@/lib/api-usage-types";
import fs from "node:fs";
import path from "node:path";
import { parseJsonText } from "@/lib/server/json-utils";

type UsageEvent = {
  provider: string;
  endpoint: string;
  feature: string;
  success: boolean;
  createdAt: string;
};

const usageEvents: UsageEvent[] = [];
let loaded = false;
const usageFilePath = path.join(process.cwd(), ".data", "api-usage-events.json");

const quotaConfig = {
  amap: {
    provider: "实时地图",
    service: "路线与周边信息",
    keyType: "内部服务",
    quota: 5000,
    resetAt: "每月 1 日重置",
    note: "用于地址解析、通勤路线、周边生活信息和行政区划。这里是产品侧统计。",
  },
  qweather: {
    provider: "实时天气",
    service: "天气与环境信息",
    keyType: "内部服务",
    quota: 1000,
    resetAt: "按订阅周期重置",
    note: "用于湿度、降雨、高温、空气质量和居住舒适度判断。超过提醒线时报告会改用城市气候常识。",
  },
} as const;

export type UsageProvider = keyof typeof quotaConfig;

function loadUsageEvents() {
  if (loaded) return;
  loaded = true;

  try {
    if (!fs.existsSync(usageFilePath)) return;
    const stored = parseJsonText(fs.readFileSync(usageFilePath, "utf8")) as UsageEvent[];
    if (!Array.isArray(stored)) return;
    usageEvents.push(
      ...stored.filter(
        (event) =>
          typeof event.provider === "string" &&
          typeof event.endpoint === "string" &&
          typeof event.feature === "string" &&
          typeof event.success === "boolean" &&
          typeof event.createdAt === "string",
      ),
    );
  } catch {
    usageEvents.length = 0;
  }
}

function persistUsageEvents() {
  try {
    fs.mkdirSync(path.dirname(usageFilePath), { recursive: true });
    fs.writeFileSync(usageFilePath, JSON.stringify(usageEvents.slice(-2000), null, 2));
  } catch {
    // 用量标识不能影响用户拿到报告；写入失败时只丢失本地统计。
  }
}

export function recordApiUsage(event: Omit<UsageEvent, "createdAt">) {
  loadUsageEvents();
  usageEvents.push({ ...event, createdAt: new Date().toISOString() });
  if (usageEvents.length > 2000) usageEvents.shift();
  persistUsageEvents();
}

function statusFromPercent(percent: number): ApiUsageItem["status"] {
  if (percent >= 95) return "limit";
  if (percent >= 75) return "watch";
  return "healthy";
}

function currentMonthEventsFor(provider: UsageProvider) {
  loadUsageEvents();
  return usageEvents.filter(
    (event) => event.provider === provider && isCurrentMonth(event.createdAt),
  );
}

export function getProviderUsageState(provider: UsageProvider): {
  provider: string;
  service: string;
  used: number;
  quota: number;
  percent: number;
  status: ApiUsageItem["status"];
  canCall: boolean;
  reason?: string;
} {
  const config = quotaConfig[provider];
  const used = currentMonthEventsFor(provider).length;
  const percent = Math.round((used / config.quota) * 100);
  const status = statusFromPercent(percent);

  return {
    provider: config.provider,
    service: config.service,
    used,
    quota: config.quota,
    percent,
    status,
    canCall: status !== "limit",
    reason:
      status === "limit"
        ? `${config.provider}暂不使用，本次改用现有信息。`
        : status === "watch"
          ? `${config.provider}使用量接近提醒线，本次仍可继续。`
          : undefined,
  };
}

export function getApiUsageItems(): ApiUsageItem[] {
  return getApiUsageSnapshot().items;
}

function isCurrentMonth(value: string) {
  const date = new Date(value);
  const now = new Date();
  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
}

export function getApiUsageSnapshot(): {
  items: ApiUsageItem[];
  source: "tracked";
} {
  loadUsageEvents();

  const currentMonthEvents = usageEvents.filter((event) => isCurrentMonth(event.createdAt));
  const items = Object.entries(quotaConfig).map(([key, config]) => {
    const used = currentMonthEvents.filter((event) =>
      key === "amap" ? event.provider === "amap" : event.provider === "qweather",
    ).length;
    const failed = currentMonthEvents.filter((event) =>
      key === "amap" ? event.provider === "amap" : event.provider === "qweather",
    ).filter((event) => !event.success).length;
    const percent = Math.round((used / config.quota) * 100);

    return {
      provider: config.provider,
      service: config.service,
      keyType: config.keyType,
      used,
      quota: config.quota,
      period: "本月",
      resetAt: config.resetAt,
      status: statusFromPercent(percent),
      note: failed > 0 ? `${config.note} 本月有 ${failed} 次请求失败，已改用现有信息处理。` : config.note,
    };
  });

  return { items, source: "tracked" };
}
