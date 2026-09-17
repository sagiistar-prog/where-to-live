import Link from "next/link";
import { ArrowRight, Clock3, Route } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { StartIntent } from "@/lib/start-intents";

function formatTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function latestIntents(intents: StartIntent[]) {
  return [...intents]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 3);
}

function normalizeDestination(value: string) {
  return value
    .replaceAll("下一步" + "行动计划", "当前行动")
    .replaceAll("下一步" + "计划", "当前行动")
    .replaceAll("城市成本测算", "生活成本")
    .replaceAll("生活成本测算", "生活成本")
    .replaceAll("城市成本", "生活成本");
}

function fieldSummary(intent: StartIntent) {
  return intent.fields
    .slice(0, 3)
    .map((field) => `${normalizeDestination(field.label)}：${normalizeDestination(field.value)}`)
    .join(" / ");
}

export function RecentStartIntents({ intents }: { intents: StartIntent[] }) {
  const recent = latestIntents(intents);

  if (!recent.length) return null;

  return (
    <section>
      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm text-primary">最近记录</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-normal">
            最近判断
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-7 text-muted-foreground">
            回到最近启动过的判断，继续补充信息、查看结论或处理确认事项。
          </p>
        </div>
        <Badge variant="secondary">{intents.length} 条记录</Badge>
      </div>

      <div className="grid gap-3">
        {recent.map((intent) => (
          <article
            key={intent.id}
            className="rounded-lg border border-border bg-card p-4"
          >
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="flex h-9 w-9 items-center justify-center rounded-md bg-card text-primary">
                    <Route className="h-4 w-4" />
                  </span>
                  <Badge variant={intent.modeChanged ? "warning" : "success"}>
                    {intent.modeChanged ? "已匹配工具" : "已带入信息"}
                  </Badge>
                  <span className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-2.5 py-1 text-xs text-muted-foreground">
                    <Clock3 className="h-3.5 w-3.5" />
                    {formatTime(intent.createdAt)}
                  </span>
                </div>
                <h3 className="mt-3 text-lg font-semibold leading-7">
                  {normalizeDestination(intent.destination)}
                </h3>
                <p className="mt-2 max-w-4xl text-sm leading-6 text-muted-foreground [overflow-wrap:anywhere]">
                  {intent.prompt}
                </p>
                <div className="mt-3 grid gap-2 text-xs leading-5 text-muted-foreground">
                  <p>{normalizeDestination(intent.routeReason)}</p>
                  {fieldSummary(intent) ? (
                    <p className="rounded-md border border-border bg-secondary/55 px-3 py-2">
                      {fieldSummary(intent)}
                    </p>
                  ) : null}
                </div>
              </div>

              <Button asChild className="shrink-0">
                <Link href={intent.href}>
                  继续这次判断
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
