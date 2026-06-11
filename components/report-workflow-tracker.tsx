"use client";

import { useEffect, useMemo, useState, type ComponentType } from "react";
import Link from "next/link";
import {
  Archive,
  ArrowRight,
  BadgeDollarSign,
  CheckCircle2,
  CircleDashed,
  ClipboardList,
  KeyRound,
  Home,
  Landmark,
  MapPin,
  MapPinned,
  PackageCheck,
  RefreshCw,
  Scale,
  ShieldAlert,
  ShieldCheck,
  TrainFront,
  Truck,
  UsersRound,
  Wrench,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { CaseEvent, CaseEventType } from "@/lib/case-events";

export type ReportWorkflowStep = {
  type: CaseEventType;
  label: string;
  title: string;
  description: string;
  href: string;
  cta: string;
  state?: WorkflowState;
  reason?: string;
};

type WorkflowState = "done" | "attention" | "blocked" | "pending";

const stepIcons: Record<CaseEventType, ComponentType<{ className?: string }>> = {
  plan: ClipboardList,
  city: MapPinned,
  area: MapPin,
  commute: TrainFront,
  life: MapPin,
  buy: Home,
  visit: ClipboardList,
  official: Landmark,
  evidence: Archive,
  payment: BadgeDollarSign,
  contract: Scale,
  safety: ShieldCheck,
  shared: UsersRound,
  move: Truck,
  handover: PackageCheck,
  repair: Wrench,
  renewal: RefreshCw,
  deposit: KeyRound,
};

const stateCopy: Record<
  WorkflowState,
  {
    label: string;
    badge: "success" | "warning" | "destructive" | "outline";
    className: string;
  }
> = {
  done: {
    label: "已确认",
    badge: "success",
    className: "border-emerald-300/30 bg-emerald-300/10 text-emerald-700",
  },
  attention: {
    label: "需确认",
    badge: "warning",
    className: "border-amber-300/30 bg-amber-300/10 text-amber-700",
  },
  blocked: {
    label: "先确认",
    badge: "destructive",
    className: "border-rose-300/30 bg-rose-300/10 text-rose-700",
  },
  pending: {
    label: "还没确认",
    badge: "outline",
    className: "border-border bg-secondary/60 text-muted-foreground",
  },
};

function isOfficialHardGateEvent(event: CaseEvent | undefined) {
  return Boolean(event?.title.includes("官方查询必须确认"));
}

function eventState(type: CaseEventType, event?: CaseEvent): WorkflowState {
  if (!event) return "pending";
  if (event.status === "reject") return "blocked";
  if (event.status === "caution") return "attention";
  if (type === "official" && !isOfficialHardGateEvent(event)) return "attention";
  return "done";
}

function latestEvent(events: CaseEvent[], type: CaseEventType) {
  return events
    .filter((event) => event.type === type)
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))[0];
}

function defaultReason(step: ReportWorkflowStep, state: WorkflowState) {
  if (state === "pending") {
    if (step.type === "visit") return "还没有把报告风险转成现场可确认事项。";
    if (step.type === "official") return "出租权、备案办理办法、合同示范文本和公共服务影响还没有查清。";
    if (step.type === "evidence") return "授权、押金、维修、付款和交割凭据还没有准备齐。";
    if (step.type === "payment") return "定金、押金、服务费、收款主体和退款条件还没有确认清楚。";
    if (step.type === "safety") return "夜间路线、门禁楼道和隐私边界还没有单独确认。";
    if (step.type === "shared") return "室友、公共空间、费用和押金边界还没有写清楚。";
    if (step.type === "move") return "首笔支出、签约后剩余现金和发薪前安全垫还没有算清。";
    if (step.type === "handover") return "钥匙门禁、表读数、旧损坏、家具家电和历史欠费还没有固定成凭据。";
    if (step.type === "repair") return "入住后的维修责任、报修凭据和费用边界还没有形成记录。";
    if (step.type === "renewal") return "涨租、替代房、搬家成本和续租谈判底线还没有一起算。";
    if (step.type === "deposit") return "退租扣款、凭据材料和押金返还截止日还没有形成计划。";
    return "真实合同还没有确认，押金、维修、退租和转租授权条款还需要确认。";
  }
  if (state === "done") return "这一项已经有可参考记录，可以继续下一项确认。";
  if (state === "attention") return "这一项还有提醒，继续前需要补充材料或现场确认。";
  return "这一项风险较高，不建议继续付款或签约。";
}

function reasonForStep(step: ReportWorkflowStep, event: CaseEvent | undefined, state: WorkflowState) {
  if (
    step.type === "official" &&
    event?.status === "recommend" &&
    !isOfficialHardGateEvent(event)
  ) {
    return "已整理官方查询步骤，但高优先级官方查询还没有逐项确认。先确认官方入口、出租权、备案办理办法、合同底线和付款主体必须确认，再进入付款或签约。";
  }

  return event?.summary || defaultReason(step, state);
}

export function ReportWorkflowTracker({
  reportId,
  steps,
  initialEvents = [],
  eyebrow = "签约前确认",
  title = "报告后的签约前确认",
  description = "房源评估只是第一步。真正减少损失，要把报告里的风险变成现场确认、官方材料、凭据材料、付款和合同确认。",
  progressLabel = "签约前确认情况",
}: {
  reportId?: string;
  steps: ReportWorkflowStep[];
  initialEvents?: CaseEvent[];
  eyebrow?: string;
  title?: string;
  description?: string;
  progressLabel?: string;
}) {
  const [events, setEvents] = useState(initialEvents);

  useEffect(() => {
    if (!reportId) return;
    let mounted = true;

    fetch("/api/case-events")
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (!mounted || !Array.isArray(data?.events)) return;
        setEvents(
          data.events.filter(
            (event: CaseEvent) => event && event.reportId === reportId,
          ),
        );
      })
      .catch(() => undefined);

    return () => {
      mounted = false;
    };
  }, [reportId]);

  const items = useMemo(
    () =>
      steps.map((step) => {
        const event = latestEvent(events, step.type);
        const state = step.state ?? eventState(step.type, event);
        return {
          ...step,
          event,
          state,
          reason: step.reason ?? reasonForStep(step, event, state),
        };
      }),
    [events, steps],
  );
  const doneCount = items.filter((item) => item.state === "done").length;
  const blockedCount = items.filter((item) => item.state === "blocked").length;
  const attentionCount = items.filter((item) => item.state === "attention").length;
  const progress = steps.length ? Math.round((doneCount / steps.length) * 100) : 0;
  const focusItem =
    items.find((item) => item.state === "blocked") ??
    items.find((item) => item.state === "attention") ??
    items.find((item) => item.state === "pending") ??
    items[items.length - 1];

  return (
    <Card className="min-w-0 p-6">
      <div className="grid gap-6 xl:grid-cols-[0.34fr_0.66fr]">
        <div className="min-w-0">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-border bg-secondary px-3 py-1 text-xs text-muted-foreground">
            <ShieldAlert className="h-3.5 w-3.5 text-primary" />
            {eyebrow}
          </div>
          <h2 className="text-xl font-semibold">{title}</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {description}
          </p>

          <div className="mt-5 rounded-md border border-border bg-secondary/60 p-4">
            <div className="mb-2 flex items-center justify-between gap-3">
              <span className="text-sm font-medium">{progressLabel}</span>
              <span className="text-sm text-muted-foreground">{progress}%</span>
            </div>
            <Progress value={progress} />
            <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-muted-foreground">
              <span>已确认 {doneCount}</span>
              <span>需确认 {attentionCount}</span>
              <span>先确认 {blockedCount}</span>
            </div>
          </div>

          {focusItem ? (
            <div className="mt-4 rounded-md border border-primary/20 bg-primary/10 p-4">
              <p className="text-xs text-primary/80">当前最该确认</p>
              <h3 className="mt-2 text-base font-semibold">{focusItem.title}</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{focusItem.reason}</p>
              <Button asChild className="mt-4 w-full">
                <Link href={focusItem.href}>
                  {focusItem.cta}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          ) : null}
        </div>

        <div className="grid min-w-0 gap-3 lg:grid-cols-2">
          {items.map((item, index) => {
            const Icon = stepIcons[item.type];
            const copy = stateCopy[item.state];

            return (
              <div
                key={`${item.type}-${item.href}`}
                className="min-w-0 rounded-md border border-border bg-secondary p-4"
              >
                <div className="mb-4 flex items-start justify-between gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/15 text-primary">
                    <Icon className="h-5 w-5" />
                  </span>
                  <div className="flex items-center gap-2">
                    <Badge variant={copy.badge}>{copy.label}</Badge>
                    <span className="rounded-full border border-border bg-card px-2 py-0.5 text-[11px] text-muted-foreground">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">{item.label}</p>
                <h3 className="mt-1 font-semibold">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {item.description}
                </p>
                <div className={`mt-4 rounded-md border p-3 text-xs leading-5 ${copy.className}`}>
                  <div className="mb-1 flex items-center gap-2 font-medium">
                    {item.state === "done" ? (
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    ) : (
                      <CircleDashed className="h-3.5 w-3.5" />
                    )}
                    {item.event ? "最新结果" : "需要补充"}
                  </div>
                  <p>{item.reason}</p>
                  {item.event?.createdAt ? (
                    <p className="mt-1 opacity-75">
                      {new Date(item.event.createdAt).toLocaleString("zh-CN")}
                    </p>
                  ) : null}
                </div>
                <Button asChild variant="outline" className="mt-4 w-full">
                  <Link href={item.href}>
                    {item.event ? "查看或更新" : item.cta}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            );
          })}
        </div>
      </div>

      {!reportId ? (
        <div className="mt-4 rounded-md border border-amber-300/20 bg-amber-300/10 p-3 text-xs leading-5 text-amber-700">
          示例报告不会保存进你的房源记录，所以这里只展示整体顺序。真实评估并保存后，会显示每一项的最新结果。
        </div>
      ) : null}
    </Card>
  );
}

