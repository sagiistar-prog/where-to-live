import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  CircleAlert,
  ClipboardList,
  FileText,
  ShieldAlert,
  type LucideIcon,
} from "lucide-react";
import { RiskBadge } from "@/components/risk-badge";
import { Button } from "@/components/ui/button";
import type {
  DecisionCase,
  DecisionCaseGateItem,
  DecisionCasePriority,
} from "@/lib/decision-case";

const priorityCopy: Record<
  DecisionCasePriority,
  { label: string; className: string; icon: LucideIcon }
> = {
  blocker: {
    label: "不建议付款",
    className: "border-rose-200 bg-rose-50 text-rose-700",
    icon: ShieldAlert,
  },
  required: {
    label: "需要补充",
    className: "border-amber-200 bg-amber-50 text-amber-700",
    icon: CircleAlert,
  },
  recommended: {
    label: "建议确认",
    className: "border-primary/30 bg-primary/10 text-primary",
    icon: ClipboardList,
  },
};

const gateStateCopy: Record<
  DecisionCaseGateItem["state"],
  { label: string; className: string; icon: LucideIcon }
> = {
  done: {
    label: "已确认",
    className: "border-emerald-200 bg-emerald-50 text-emerald-700",
    icon: CheckCircle2,
  },
  attention: {
    label: "需要补充",
    className: "border-amber-200 bg-amber-50 text-amber-700",
    icon: CircleAlert,
  },
  blocked: {
    label: "不建议继续",
    className: "border-rose-200 bg-rose-50 text-rose-700",
    icon: ShieldAlert,
  },
  pending: {
    label: "还没确认",
    className: "border-border bg-secondary/60 text-muted-foreground",
    icon: ClipboardList,
  },
};

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

function buildCaseSelectHref(id: string) {
  const params = new URLSearchParams({ reportId: id });
  return `/case?${params.toString()}#case-workspace`;
}

function caseStatusCopy(item: DecisionCase) {
  if (item.preSignGate.level === "stop") return "不建议付款";
  if (item.preSignGate.level === "review") return "需要补充信息";
  if (item.preSignGate.canSign) return "可做签约前确认";
  return "可以继续比较";
}

function itemsToConfirm(item: DecisionCase) {
  return item.preSignGate.items
    .filter((gate) => gate.state !== "done")
    .slice(0, 5);
}

export function DecisionCaseBoard({
  cases,
  focusId,
}: {
  cases: DecisionCase[];
  focusId?: string;
}) {
  if (!cases.length) return null;

  const focusCase = focusId ? cases.find((item) => item.id === focusId) : undefined;
  const activeCase = focusCase ?? cases[0];
  const orderedCases = focusCase
    ? [focusCase, ...cases.filter((item) => item.id !== focusCase.id)]
    : cases;
  const confirmItems = itemsToConfirm(activeCase);
  const completed = activeCase.completedEvents.slice(0, 4);
  const PriorityIcon = priorityCopy[activeCase.nextBestAction.priority].icon;

  return (
    <section
      id="case-workspace"
      className="grid gap-4 rounded-lg border border-border bg-card/80 p-4 shadow-[0_24px_80px_oklch(var(--foreground)/0.07)] lg:grid-cols-[320px_minmax(0,1fr)]"
    >
      <aside className="rounded-lg border border-border bg-secondary/55 p-3">
        <div className="mb-3 flex items-center justify-between gap-3 px-1">
          <div>
            <p className="text-xs text-primary">候选房源</p>
            <h2 className="mt-1 text-lg font-semibold">当前关注哪一套</h2>
          </div>
          <span className="rounded-full border border-border bg-card px-2.5 py-1 text-xs text-muted-foreground">
            {cases.length} 套
          </span>
        </div>

        <div className="grid gap-2">
          {orderedCases.map((item) => {
            const active = item.id === activeCase.id;

            return (
              <Link
                key={item.id}
                href={buildCaseSelectHref(item.id)}
                className={
                  active
                    ? "rounded-lg border border-primary/35 bg-primary/10 p-3 shadow-sm"
                    : "rounded-lg border border-transparent bg-card/70 p-3 transition-colors hover:border-primary/25 hover:bg-card"
                }
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{item.title}</p>
                    <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
                      {item.address}
                    </p>
                  </div>
                  <span className="shrink-0 text-lg font-semibold">{item.score}</span>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  <span
                    className={
                      item.preSignGate.level === "stop"
                        ? "rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-[11px] text-rose-700"
                        : item.preSignGate.level === "review"
                          ? "rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] text-amber-700"
                          : "rounded-full border border-primary/25 bg-primary/10 px-2 py-0.5 text-[11px] text-primary"
                    }
                  >
                    {caseStatusCopy(item)}
                  </span>
                  <span className="rounded-full border border-border bg-secondary/60 px-2 py-0.5 text-[11px] text-muted-foreground">
                    {formatTime(item.generatedAt)}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </aside>

      <div className="min-w-0 rounded-lg border border-border bg-[oklch(0.955_0.006_155)] p-5">
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_250px]">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <RiskBadge status={activeCase.status} />
              <span className="rounded-full border border-border bg-card/80 px-2.5 py-1 text-xs text-muted-foreground">
                {caseStatusCopy(activeCase)}
              </span>
            </div>
            <h2 className="mt-3 text-2xl font-semibold tracking-normal">
              {activeCase.title}
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {activeCase.address}
            </p>
            <div className="mt-4 rounded-md border border-border bg-card/72 p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-sm font-medium">{activeCase.stage}</p>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    {activeCase.stageNote}
                  </p>
                </div>
                <div className="shrink-0 text-left md:text-right">
                  <p className="text-3xl font-semibold">{activeCase.score}</p>
                  <p className="text-xs text-muted-foreground">综合评分</p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-2">
            <Button asChild>
              <Link href={activeCase.nextBestAction.href}>
                继续确认
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href={activeCase.reportHref}>回看报告</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href="/compare">对比其他房源</Link>
            </Button>
          </div>
        </div>

        <Link
          href={activeCase.nextBestAction.href}
          className="group mt-5 block rounded-md border border-primary/20 bg-primary/10 p-4 transition-colors hover:bg-primary/15"
        >
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/15 text-primary">
                  <PriorityIcon className="h-4 w-4" />
                </span>
                <span
                  className={`rounded-full border px-2.5 py-1 text-xs ${
                    priorityCopy[activeCase.nextBestAction.priority].className
                  }`}
                >
                  {priorityCopy[activeCase.nextBestAction.priority].label}
                </span>
                <span className="rounded-full border border-border bg-secondary/60 px-2.5 py-1 text-xs text-muted-foreground">
                  当前最该做
                </span>
              </div>
              <h3 className="mt-3 text-lg font-semibold tracking-normal">
                {activeCase.nextBestAction.label}
              </h3>
              <p className="mt-2 max-w-4xl text-sm leading-6 text-muted-foreground">
                {activeCase.nextBestAction.reason}
              </p>
            </div>
            <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
          </div>
        </Link>

        <div className="mt-5 grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
          <div className="rounded-md border border-border bg-card/72 p-4">
            <div className="mb-3 flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold">付款和签约前确认</h3>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <PermissionPill
                label="付款"
                allowed={activeCase.preSignGate.canPay}
                ok="可付款"
                stop="不建议付款"
              />
              <PermissionPill
                label="签约"
                allowed={activeCase.preSignGate.canSign}
                ok="可签约"
                stop="不建议签约"
              />
            </div>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              {activeCase.preSignGate.summary}
            </p>
          </div>

          <InfoList
            title="需要确认"
            icon={FileText}
            items={confirmItems.map((item) => ({
              label: item.label,
              detail: item.reason,
              href: item.href,
              state: item.state,
            }))}
            empty="当前没有明显卡住付款或签约的事项。"
          />
        </div>

        {completed.length ? (
          <div className="mt-5">
            <InfoList
              title="已经处理过"
              icon={CheckCircle2}
              items={completed.map((event) => ({
                label: event.title,
                detail: event.summary,
                href: event.href || activeCase.reportHref,
                state: event.status === "recommend" ? "done" : event.status === "reject" ? "blocked" : "attention",
              }))}
              empty=""
            />
          </div>
        ) : null}
      </div>
    </section>
  );
}

function PermissionPill({
  label,
  allowed,
  ok,
  stop,
}: {
  label: string;
  allowed: boolean;
  ok: string;
  stop: string;
}) {
  return (
    <div className="rounded-md border border-border bg-secondary/60 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={allowed ? "mt-1 text-sm font-medium text-emerald-700" : "mt-1 text-sm font-medium text-rose-700"}>
        {allowed ? ok : stop}
      </p>
    </div>
  );
}

function InfoList({
  title,
  icon: Icon,
  items,
  empty,
}: {
  title: string;
  icon: LucideIcon;
  items: Array<{
    label: string;
    detail: string;
    href: string;
    state: DecisionCaseGateItem["state"];
  }>;
  empty: string;
}) {
  return (
    <div className="rounded-md border border-border bg-card/72 p-4">
      <div className="mb-3 flex items-center gap-2">
        <Icon className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold">{title}</h3>
      </div>
      {items.length ? (
        <div className="grid gap-2">
          {items.map((item) => {
            const state = gateStateCopy[item.state];
            const StateIcon = state.icon;

            return (
              <Link
                key={`${item.label}-${item.href}-${item.detail}`}
                href={item.href}
                className="group rounded-md border border-border bg-secondary/60 p-3 transition-colors hover:bg-card"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-medium">{item.label}</p>
                      <span
                        className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] ${state.className}`}
                      >
                        <StateIcon className="h-3 w-3" />
                        {state.label}
                      </span>
                    </div>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                      {item.detail}
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <p className="text-sm leading-6 text-muted-foreground">{empty}</p>
      )}
    </div>
  );
}
