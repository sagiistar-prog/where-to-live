"use client";

import { useEffect, useState } from "react";
import { Activity, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Card } from "@/components/ui/card";
import type { ApiUsageItem } from "@/lib/api-usage-types";

const statusCopy = {
  healthy: {
    label: "余量充足",
    icon: CheckCircle2,
    className: "border-emerald-300/30 bg-emerald-300/10 text-emerald-700",
  },
  watch: {
    label: "接近提醒线",
    icon: AlertTriangle,
    className: "border-amber-300/30 bg-amber-300/10 text-amber-700",
  },
  limit: {
    label: "改用现有信息",
    icon: AlertTriangle,
    className: "border-rose-300/30 bg-rose-300/10 text-rose-700",
  },
};

export function ApiUsagePanel({
  items,
  initialUpdatedAt = null,
}: {
  items: ApiUsageItem[];
  initialUpdatedAt?: string | null;
}) {
  const [usageItems, setUsageItems] = useState(items);
  const [updatedAt, setUpdatedAt] = useState<string | null>(initialUpdatedAt);

  useEffect(() => {
    let mounted = true;

    fetch("/api/usage")
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (!mounted || !data?.items) return;
        setUsageItems(data.items);
        setUpdatedAt(data.updatedAt ?? null);
      })
      .catch(() => undefined);

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <Card className="p-6">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-border bg-secondary px-3 py-1 text-xs text-muted-foreground">
            <Activity className="h-3.5 w-3.5 text-primary" />
            免费用量
          </div>
          <h2 className="text-lg font-semibold">免费 API 用量标识</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
            高德和天气先使用免费个人 Key。这里展示产品侧自设提醒线和当前设备累计次数，用于避免测试时意外打满个人免费额度。
          </p>
        </div>
        <span className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs text-primary">
          当前设备累计
        </span>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        {usageItems.map((item) => {
          const percent = Math.min(Math.round((item.used / item.quota) * 100), 100);
          const StatusIcon = statusCopy[item.status].icon;

          return (
            <div
              key={`${item.provider}-${item.service}`}
              className="rounded-md border border-border bg-secondary p-4"
            >
              <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold">{item.provider}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {item.service} · {item.keyType}
                  </p>
                </div>
                <span
                  className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs ${statusCopy[item.status].className}`}
                >
                  <StatusIcon className="h-3.5 w-3.5" />
                  {statusCopy[item.status].label}
                </span>
              </div>

              <div className="mb-3 flex items-end justify-between gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">{item.period}已用</p>
                  <p className="mt-1 text-2xl font-semibold">
                    {item.used.toLocaleString()}
                    <span className="text-sm font-normal text-muted-foreground">
                      {" "}
                      / {item.quota.toLocaleString()} 次
                    </span>
                  </p>
                </div>
                <p className="text-sm text-muted-foreground">{percent}%</p>
              </div>

              <Progress value={percent} />

              <div className="mt-4 grid gap-2 text-xs leading-5 text-muted-foreground">
                <p>{item.note}</p>
                <p>重置规则：{item.resetAt}</p>
              </div>
            </div>
          );
        })}
      </div>
      {updatedAt ? (
        <p className="mt-4 text-xs text-muted-foreground">
          最近更新：{new Date(updatedAt).toLocaleString("zh-CN")}
        </p>
      ) : null}
    </Card>
  );
}

