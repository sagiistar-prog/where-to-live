import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  BadgeDollarSign,
  CheckCircle2,
  ClipboardList,
  FileText,
  FolderKanban,
  Gauge,
  KeyRound,
  ShieldAlert,
  ShieldCheck,
  UsersRound,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { caseEventLabels } from "@/lib/case-events";
import { CaseActionPack } from "@/components/case-action-pack";
import { CaseTriageQueue } from "@/components/case-triage-queue";
import { RiskBadge } from "@/components/risk-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type {
  DecisionCase,
  DecisionCaseGateLevel,
  DecisionCaseGateState,
  DecisionCasePriority,
} from "@/lib/decision-case";

const priorityCopy: Record<
  DecisionCasePriority,
  { label: string; className: string }
> = {
  blocker: {
    label: "先别付款",
    className: "border-rose-200 bg-rose-50 text-rose-700",
  },
  required: {
    label: "需要补充",
    className: "border-amber-200 bg-amber-50 text-amber-700",
  },
  recommended: {
    label: "建议确认",
    className: "border-primary/30 bg-primary/10 text-primary",
  },
};

const gateLevelCopy: Record<
  DecisionCaseGateLevel,
  { eyebrow: string; className: string; dotClassName: string }
> = {
  stop: {
    eyebrow: "先确认",
    className: "border-rose-200 bg-rose-50 text-rose-700",
    dotClassName: "bg-rose-300",
  },
  review: {
    eyebrow: "补充材料",
    className: "border-amber-200 bg-amber-50 text-amber-700",
    dotClassName: "bg-amber-300",
  },
  ready: {
    eyebrow: "可以继续",
    className: "border-emerald-200 bg-emerald-50 text-emerald-700",
    dotClassName: "bg-emerald-300",
  },
};

const gateStateCopy: Record<
  DecisionCaseGateState,
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
    icon: AlertTriangle,
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

export function DecisionCaseBoard({
  cases,
  focusId,
}: {
  cases: DecisionCase[];
  focusId?: string;
}) {
  const riskyCases = cases.filter((item) => item.status !== "recommend").length;
  const stopGateCount = cases.filter((item) => item.preSignGate.level === "stop").length;
  const readyGateCount = cases.filter((item) => item.preSignGate.level === "ready").length;
  const lowConfidenceCount = cases.filter(
    (item) =>
      item.dataConfidence.level === "limited" || item.dataConfidence.level === "review",
  ).length;
  const blockerCount = cases.reduce(
    (total, item) =>
      total + item.preSignGate.items.filter((gate) => gate.state === "blocked").length,
    0,
  );
  const lifecyclePendingCount = cases.reduce(
    (total, item) =>
      total +
      item.lifecycleGate.items.filter((gate) => gate.state !== "done").length,
    0,
  );
  const averageScore = cases.length
    ? Math.round(cases.reduce((total, item) => total + item.score, 0) / cases.length)
    : 0;
  const completedEventCount = cases.reduce(
    (total, item) => total + item.completedEvents.length,
    0,
  );
  const focusCase = focusId ? cases.find((item) => item.id === focusId) : undefined;
  const orderedCases = focusCase
    ? [focusCase, ...cases.filter((item) => item.id !== focusCase.id)]
    : cases;

  if (!cases.length) {
    return (
      <Card className="p-6 sm:p-8">
        <div className="grid gap-8 lg:grid-cols-[0.58fr_0.42fr] lg:items-center">
          <div>
            <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-md bg-primary/15 text-primary">
              <FolderKanban className="h-6 w-6" />
            </div>
            <h2 className="text-2xl font-semibold">还没有房源记录</h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground">
              先从一套候选房源开始。评估后，这里会整理看房确认、官方查询、凭据、付款、合同、交割、维修、续租和押金退还。
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Button asChild>
                <Link href="/analyze">
                  开始房源评估
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="secondary">
                <Link href="/demo">看 3 分钟演示</Link>
              </Button>
            </div>
          </div>

          <div className="rounded-lg border border-border bg-secondary/60 p-4">
            <p className="text-sm font-semibold">第一次使用建议这样走</p>
            <div className="mt-4 grid gap-3">
              {[
                ["01", "先填一套真实候选房源"],
                ["02", "看完评估，判断能不能继续投入时间"],
                ["03", "再回到记录页确认付款、合同和凭据"],
              ].map(([step, label]) => (
                <div key={step} className="flex items-center gap-3 rounded-md border border-border bg-secondary p-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
                    {step}
                  </span>
                  <span className="text-sm leading-6 text-muted-foreground">{label}</span>
                </div>
              ))}
            </div>
            <Button asChild variant="outline" className="mt-4 w-full">
              <Link href="/report/demo">先看一份示例报告</Link>
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
        <CaseMetric icon={FolderKanban} label="候选房源" value={`${cases.length} 套`} />
        <CaseMetric icon={ShieldAlert} label="需谨慎/不建议" value={`${riskyCases} 套`} />
        <CaseMetric icon={Gauge} label="信息待补充" value={`${lowConfidenceCount} 套`} />
        <CaseMetric icon={BadgeDollarSign} label="需先确认" value={`${stopGateCount} 套`} />
        <CaseMetric icon={CheckCircle2} label="可签约前确认" value={`${readyGateCount} 套`} />
        <CaseMetric icon={KeyRound} label="入住退租" value={`${lifecyclePendingCount} 项`} />
      </section>

      {focusId && !focusCase ? <FocusedCaseContext item={focusCase} focusId={focusId} /> : null}

      <CaseCommandWorkspace cases={orderedCases} activeCase={focusCase ?? orderedCases[0]} />

      <CaseTriageQueue cases={cases} />

      <section className="rounded-md border border-border bg-secondary p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-medium">整体判断 {averageScore}</p>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">
              这里关注一件事：这套房从付款、签约、入住到退租，还有哪些凭据、官方查询、合同风险和预算问题没确认清楚。当前已有 {completedEventCount} 次判断结果保存，{blockerCount} 个签约前确认事项需要先看清。
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button asChild variant="secondary">
              <Link href="/compare">进入多房源对比</Link>
            </Button>
            <Button asChild>
              <Link href="/analyze">新增候选房源</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="grid gap-4">
        {orderedCases.map((item) => (
          <article
            key={item.id}
            id={`case-${item.id}`}
            className={
              item.id === focusId
                ? "rounded-lg border border-primary/35 bg-primary/[0.08] p-5 shadow-[0_18px_70px_oklch(var(--foreground)/0.06)]"
                : "rounded-lg border border-border/80 bg-card p-5"
            }
          >
            {(() => {
              return (
            <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <RiskBadge status={item.status} />
                  <span className="rounded-full border border-border bg-secondary px-2.5 py-1 text-xs text-muted-foreground">
                    {item.dataMode === "openai" ? "完整评估" : "快速评估"}
                  </span>
                  <span className="rounded-full border border-border bg-secondary px-2.5 py-1 text-xs text-muted-foreground">
                    {formatTime(item.generatedAt)}
                  </span>
                  {item.id === focusId ? (
                    <span className="rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs text-primary">
                      当前报告
                    </span>
                  ) : null}
                </div>
                <h2 className="mt-3 text-2xl font-semibold tracking-normal">
                  {item.title}
                </h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {item.address}
                </p>
                <div className="mt-4 rounded-md border border-border bg-secondary p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="text-sm font-medium">{item.stage}</p>
                      <p className="mt-1 text-sm leading-6 text-muted-foreground">
                        {item.stageNote}
                      </p>
                    </div>
                    <div className="shrink-0 text-left md:text-right">
                      <p className="text-3xl font-semibold">{item.score}</p>
                      <p className="text-xs text-muted-foreground">综合评分</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid gap-2 sm:grid-cols-2 xl:w-[420px] xl:grid-cols-1">
                <Button asChild>
                  <Link href={item.nextBestAction.href}>
                    继续确认
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild variant="secondary">
                  <Link href={item.reportHref}>
                    回看完整报告
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
              );
            })()}

            <NextBestActionPanel item={item} />

            <CaseActionPack item={item} />

            <PreSignGatePanel item={item} />

            <SpecialRiskStatusPanel item={item} />

            <LifecycleGatePanel item={item} />

            <DataConfidencePanel item={item} />

            <div className="mt-5 grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
              <InfoColumn
                title="当前不要忽略"
                icon={AlertTriangle}
                items={item.blockers}
                empty="暂无明确待确认事项，但仍需做签约前确认。"
              />
              <div className="rounded-md border border-border bg-secondary p-4">
                <div className="mb-3 flex items-center gap-2">
                  <ClipboardList className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold">接下来先做什么</h3>
                </div>
                <div className="grid gap-2">
                  {item.nextActions.slice(1).map((action) => (
                    <Link
                      key={`${item.id}-${action.label}`}
                      href={action.href}
                      className="group rounded-md border border-border bg-secondary/60 p-3 transition-colors hover:bg-card"
                    >
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-medium">{action.label}</p>
                            <span
                              className={`rounded-full border px-2 py-0.5 text-[11px] ${priorityCopy[action.priority].className}`}
                            >
                              {priorityCopy[action.priority].label}
                            </span>
                          </div>
                          <p className="mt-1 text-xs leading-5 text-muted-foreground">
                            {action.reason}
                          </p>
                        </div>
                        <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <InfoColumn
                title="已确认内容"
                icon={CheckCircle2}
                items={item.completedEvents.slice(0, 4).map((event) =>
                  `${caseEventLabels[event.type]}：${event.summary}`,
                )}
                empty="还没有保存过判断结果。先从通勤成本、生活配套、看房清单、官方查询、凭据材料或付款前确认开始。"
              />
              <InfoColumn
                title="待补充凭据"
                icon={FileText}
                items={item.evidenceGaps}
                empty="暂无明显待补充凭据。"
              />
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <InfoColumn
                title="需要补充的信息"
                icon={CheckCircle2}
                items={item.dataGaps}
                empty="地图、天气和报告依据没有明显待补充信息。"
              />
              <InfoColumn
                title="最新提醒"
                icon={AlertTriangle}
                items={item.completedEvents.flatMap((event) => event.highlights).slice(0, 4)}
                empty="后续确认后，这里会显示最新提醒。"
              />
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}

function buildCaseSelectHref(id: string) {
  const params = new URLSearchParams({ reportId: id });
  return `/case?${params.toString()}#case-workspace`;
}

function caseStatusCopy(item: DecisionCase) {
  if (item.preSignGate.level === "stop") return "先别付款";
  if (item.preSignGate.level === "review") return "补充材料";
  if (item.preSignGate.canSign) return "可做签约前确认";
  return "可以继续比较";
}

function CaseCommandWorkspace({
  cases,
  activeCase,
}: {
  cases: DecisionCase[];
  activeCase: DecisionCase;
}) {
  const activeGaps = uniqueShortList([
    ...activeCase.evidenceGaps,
    ...activeCase.dataGaps,
    ...activeCase.blockers,
  ], 4);
  const completedLabels = activeCase.completedEvents
    .slice(0, 3)
    .map((event) => caseEventLabels[event.type]);

  return (
    <section
      id="case-workspace"
        className="grid gap-4 rounded-lg border border-border bg-card/80 p-4 shadow-[0_24px_80px_oklch(var(--foreground)/0.07)] lg:grid-cols-[340px_minmax(0,1fr)]"
    >
      <aside className="rounded-lg border border-border bg-secondary/55 p-3">
        <div className="mb-3 flex items-center justify-between gap-3 px-1">
          <div>
            <p className="text-xs text-primary">候选房源</p>
            <h2 className="mt-1 text-lg font-semibold">先看哪一套</h2>
          </div>
          <span className="rounded-full border border-border bg-card px-2.5 py-1 text-xs text-muted-foreground">
            {cases.length} 套
          </span>
        </div>

        <div className="grid gap-2">
          {cases.map((item) => {
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
                    {item.preSignGate.progress}%
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </aside>

      <div className="min-w-0 rounded-lg border border-border bg-[oklch(0.955_0.01_92)] p-5">
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <RiskBadge status={activeCase.status} />
              <span className="rounded-full border border-border bg-card/80 px-2.5 py-1 text-xs text-muted-foreground">
                {formatTime(activeCase.generatedAt)}
              </span>
              <span className="rounded-full border border-primary/25 bg-primary/10 px-2.5 py-1 text-xs text-primary">
                {caseStatusCopy(activeCase)}
              </span>
            </div>

            <h2 className="mt-3 text-3xl font-semibold tracking-normal">
              {activeCase.title}
            </h2>
            <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground">
              {activeCase.address}
            </p>

            <div className="mt-5 rounded-lg border border-border bg-card/72 p-4 shadow-[0_18px_56px_oklch(var(--foreground)/0.06)]">
              <p className="text-xs text-primary">现在先做</p>
              <h3 className="mt-2 text-xl font-semibold">
                {activeCase.nextBestAction.label}
              </h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {activeCase.nextBestAction.reason}
              </p>
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <DecisionFact label="为什么做" value={activeCase.nextBestAction.intent} />
                <DecisionFact label="确认到什么程度" value={activeCase.nextBestAction.doneCriteria} />
                <DecisionFact label="付款底线" value={activeCase.nextBestAction.stopRule} />
              </div>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <WorkspaceMiniCard
                icon={BadgeDollarSign}
                label="付款判断"
                value={activeCase.preSignGate.canPay ? "可确认后付款" : "先别付款"}
                danger={!activeCase.preSignGate.canPay}
              />
              <WorkspaceMiniCard
                icon={FileText}
                label="签约判断"
                value={activeCase.preSignGate.canSign ? "可做最终确认" : "先别签约"}
                danger={!activeCase.preSignGate.canSign}
              />
              <WorkspaceMiniCard
                icon={Gauge}
                label="信息是否够用"
                value={activeCase.dataConfidence.label}
                danger={activeCase.dataConfidence.level !== "ready"}
              />
            </div>
          </div>

          <aside className="grid min-w-0 gap-3">
            <div className="rounded-lg border border-border bg-card/72 p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <span className="text-sm font-semibold">签约前确认情况</span>
                <span className="text-sm text-muted-foreground">
                  {activeCase.preSignGate.progress}%
                </span>
              </div>
              <Progress value={activeCase.preSignGate.progress} />
              <p className="mt-3 line-clamp-3 text-xs leading-5 text-muted-foreground">
                {activeCase.preSignGate.summary}
              </p>
            </div>

            <div className="rounded-lg border border-border bg-card/72 p-4">
              <div className="mb-3 flex items-center gap-2">
                <ClipboardList className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold">还要确认什么</h3>
              </div>
              <div className="grid gap-2">
                {(activeGaps.length ? activeGaps : ["暂无明显待补充材料，进入签约前确认时仍要核对原件、收款主体和收据。"]).map((item) => (
                  <p
                    key={item}
                    className="rounded-md border border-border bg-secondary/55 px-3 py-2 text-xs leading-5 text-muted-foreground"
                  >
                    {item}
                  </p>
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-border bg-card/72 p-4">
              <div className="mb-3 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold">已经有的判断</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {(completedLabels.length ? completedLabels : ["尚未保存更多判断"]).map((label) => (
                  <span
                    key={label}
                    className="rounded-full border border-border bg-secondary/55 px-2.5 py-1 text-xs text-muted-foreground"
                  >
                    {label}
                  </span>
                ))}
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
                <Link href={activeCase.reportHref}>回看完整报告</Link>
              </Button>
              <Button asChild variant="secondary">
                <Link href={buildFocusedCompareHref(activeCase)}>加入多房源对比</Link>
              </Button>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}

function uniqueShortList(items: string[], max: number) {
  return Array.from(new Set(items.map((item) => item.trim()).filter(Boolean))).slice(0, max);
}

function WorkspaceMiniCard({
  icon: Icon,
  label,
  value,
  danger,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  danger?: boolean;
}) {
  return (
    <div className="rounded-lg border border-border bg-card/72 p-4">
      <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-md bg-primary/15 text-primary">
        <Icon className="h-4 w-4" />
      </div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={danger ? "mt-1 text-sm font-semibold text-rose-700" : "mt-1 text-sm font-semibold text-foreground"}>
        {value}
      </p>
    </div>
  );
}

function buildFocusedCompareHref(item: DecisionCase) {
  const params = new URLSearchParams({
    from: "case",
    reportId: item.id,
    currentTitle: item.title,
  });

  return `/compare?${params.toString()}`;
}

function FocusedCaseContext({
  item,
  focusId,
}: {
  item?: DecisionCase;
  focusId: string;
}) {
  if (!item) {
    return (
      <Card className="border-amber-300/20 bg-amber-300/10 p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs text-amber-700/80">
              当前房源
            </p>
            <h2 className="mt-2 text-lg font-semibold text-amber-900">
              没有找到这套房的记录
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-amber-900/80">
              传入的报告 ID 是 {focusId}。可能是报告历史被清空，或这份报告未保存到房源记录。可以重新评估房源，或回到工作台查看仍然存在的候选房源。
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button asChild variant="secondary">
              <Link href="/dashboard">回工作台</Link>
            </Button>
            <Button asChild>
              <Link href="/analyze">重新评估</Link>
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <section className="rounded-lg border border-primary/25 bg-primary/[0.08] p-5">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs text-primary">
              当前报告已带入
            </span>
            <RiskBadge status={item.status} />
            <span className="rounded-full border border-border bg-secondary/60 px-2.5 py-1 text-xs text-muted-foreground">
              签约前进度 {item.preSignGate.progress}%
            </span>
          </div>
          <h2 className="text-2xl font-semibold tracking-normal">{item.title}</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
            {item.address}
          </p>
          <p className="mt-3 max-w-4xl text-sm leading-7 text-muted-foreground">
            当前这套房能不能付款、能不能签约、还要补充什么、哪些钱先别转、哪些字先别签，会跟随报告、通勤成本、生活配套、看房清单、官方查询、凭据材料、付款前确认和合同确认一起更新。
          </p>
        </div>

        <div className="grid w-full shrink-0 gap-3 xl:w-[380px]">
          <div className="rounded-md border border-border bg-background/70 p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <span className="text-sm font-medium">{item.preSignGate.label}</span>
              <span className="text-xs text-muted-foreground">
                {item.preSignGate.canPay ? "可付款" : "先别付款"} · {item.preSignGate.canSign ? "可签约" : "先别签约"}
              </span>
            </div>
            <Progress value={item.preSignGate.progress} />
            <p className="mt-3 line-clamp-3 text-xs leading-5 text-muted-foreground">
              {item.preSignGate.summary}
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-3 xl:grid-cols-1">
            <Button asChild>
              <Link href={item.nextBestAction.href}>
                继续确认
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href={item.reportHref}>回看报告</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href={buildFocusedCompareHref(item)}>对比替代房源</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

function PreSignGatePanel({ item }: { item: DecisionCase }) {
  const gate = item.preSignGate;
  const levelCopy = gateLevelCopy[gate.level];

  return (
    <div className="mt-5 rounded-md border border-border bg-secondary p-4">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs ${levelCopy.className}`}
            >
              <span
                className={`mr-1.5 h-1.5 w-1.5 rounded-full ${levelCopy.dotClassName}`}
              />
              {levelCopy.eyebrow}
            </span>
            <span className="rounded-full border border-border bg-secondary/60 px-2.5 py-1 text-xs text-muted-foreground">
              签约前进度 {gate.progress}%
            </span>
          </div>
          <h3 className="mt-3 text-lg font-semibold tracking-normal">
            签约前确认：{gate.label}
          </h3>
          <p className="mt-2 max-w-4xl text-sm leading-6 text-muted-foreground">
            {gate.summary}
          </p>
        </div>

        <div className="grid shrink-0 grid-cols-2 gap-2 sm:min-w-[260px]">
          <GatePermission label="付款判断" allowed={gate.canPay} ok="可付款" stop="先别付款" />
          <GatePermission label="签约判断" allowed={gate.canSign} ok="可签约" stop="先别签约" />
        </div>
      </div>

      <div className="mt-4">
        <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
          <span>签约前材料确认进度</span>
          <span>{gate.progress}%</span>
        </div>
        <Progress value={gate.progress} className="bg-secondary" />
      </div>

      <div className="mt-4 grid gap-2 lg:grid-cols-5">
        {gate.items.map((gateItem) => {
          const stateCopy = gateStateCopy[gateItem.state];
          const Icon = stateCopy.icon;

          return (
            <Link
              key={`${item.id}-${gateItem.label}-${gateItem.type}`}
              href={gateItem.href}
              className="group flex min-h-[148px] flex-col rounded-md border border-border bg-secondary/60 p-3 transition-colors hover:bg-card"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-md bg-secondary/70 text-primary">
                    <Icon className="h-4 w-4" />
                  </span>
                  <p className="text-sm font-medium">{gateItem.label}</p>
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
              </div>
              <span
                className={`mt-3 w-fit rounded-full border px-2 py-0.5 text-[11px] ${stateCopy.className}`}
              >
                {stateCopy.label}
              </span>
              <p className="mt-2 line-clamp-3 text-xs leading-5 text-muted-foreground">
                {gateItem.reason}
              </p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function buildSpecialRiskHref(pathname: "/safety" | "/shared", item: DecisionCase) {
  const params = new URLSearchParams({
    from: "case",
    reportId: item.id,
    title: item.title,
    reportContext: `来自房源记录：${item.title}\n${item.address}\n${item.stageNote}`,
  });

  if (pathname === "/shared") {
    params.set("concerns", "室友作息、公共空间、费用分摊、押金连带和转租授权需要付款前写清。");
  } else {
    params.set("concerns", "夜间路线、门禁楼道、低楼层窗户、快递外卖和维修上门边界需要在签约前单独确认。");
  }

  return `${pathname}?${params.toString()}`;
}

function eventStateCopy(status: "recommend" | "caution" | "reject" | undefined) {
  if (status === "recommend") return gateStateCopy.done;
  if (status === "caution") return gateStateCopy.attention;
  if (status === "reject") return gateStateCopy.blocked;
  return gateStateCopy.pending;
}

function SpecialRiskStatusPanel({ item }: { item: DecisionCase }) {
  const safetyEvent = item.completedEvents.find((event) => event.type === "safety");
  const sharedEvent = item.completedEvents.find((event) => event.type === "shared");

  return (
    <div className="mt-5 rounded-md border border-border bg-secondary p-4">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs text-primary">居住关注点</p>
          <h3 className="mt-2 text-lg font-semibold tracking-normal">独居与合租边界</h3>
        </div>
        <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
          独居安全和合租边界会直接影响长期居住安心感。这里单独放在一处看，不让它们淹没在通用看房清单里。
        </p>
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        <SpecialRiskStatusCard
          icon={ShieldCheck}
          title="独居安全"
          eventSummary={safetyEvent?.summary}
          highlights={safetyEvent?.highlights}
          href={buildSpecialRiskHref("/safety", item)}
          cta={safetyEvent ? "回看安全确认" : "确认独居安全"}
          status={safetyEvent?.status}
          empty="夜间路线、门禁楼道、低楼层窗户和维修上门边界还没有单独确认。"
        />
        <SpecialRiskStatusCard
          icon={UsersRound}
          title="合租边界"
          eventSummary={sharedEvent?.summary}
          highlights={sharedEvent?.highlights}
          href={buildSpecialRiskHref("/shared", item)}
          cta={sharedEvent ? "回看边界确认" : "确认合租边界"}
          status={sharedEvent?.status}
          empty="室友规则、公共空间、费用分摊、押金连带和转租授权还没有单独确认。"
        />
      </div>
    </div>
  );
}

function SpecialRiskStatusCard({
  icon: Icon,
  title,
  eventSummary,
  highlights = [],
  href,
  cta,
  status,
  empty,
}: {
  icon: LucideIcon;
  title: string;
  eventSummary?: string;
  highlights?: string[];
  href: string;
  cta: string;
  status?: "recommend" | "caution" | "reject";
  empty: string;
}) {
  const state = eventStateCopy(status);

  return (
    <Link
      href={href}
      className="group flex min-w-0 flex-col rounded-md border border-border bg-secondary/60 p-4 transition-colors hover:bg-card"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-secondary/70 text-primary">
            <Icon className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="font-medium">{title}</p>
            <span className={`mt-2 inline-flex rounded-full border px-2 py-0.5 text-[11px] ${state.className}`}>
              {state.label}
            </span>
          </div>
        </div>
        <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
      </div>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">
        {eventSummary || empty}
      </p>
      {highlights.length ? (
        <div className="mt-3 grid gap-1.5 text-xs leading-5 text-muted-foreground">
          {highlights.slice(0, 3).map((highlight) => (
            <p key={highlight}>{highlight}</p>
          ))}
        </div>
      ) : null}
      <span className="mt-4 text-sm font-medium text-primary">{cta}</span>
    </Link>
  );
}

function NextBestActionPanel({ item }: { item: DecisionCase }) {
  const action = item.nextBestAction;
  const priority = priorityCopy[action.priority];

  return (
    <Link
      href={action.href}
      className="group mt-5 block rounded-md border border-primary/20 bg-primary/10 p-4 transition-colors hover:bg-primary/15"
    >
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/15 text-primary">
              <ClipboardList className="h-4 w-4" />
            </span>
            <span className={`rounded-full border px-2.5 py-1 text-xs ${priority.className}`}>
              {priority.label}
            </span>
            <span className="rounded-full border border-border bg-secondary/60 px-2.5 py-1 text-xs text-muted-foreground">
              当前最该确认
            </span>
          </div>
          <h3 className="mt-3 text-lg font-semibold tracking-normal">{action.label}</h3>
          <p className="mt-2 max-w-4xl text-sm leading-6 text-muted-foreground">
            {action.reason}
          </p>
        </div>
        <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
      </div>
      <div className="mt-4 grid gap-3 lg:grid-cols-3">
        <DecisionFact label="为什么要先做" value={action.intent} />
        <DecisionFact label="确认到什么程度" value={action.doneCriteria} />
        <DecisionFact label="付款底线" value={action.stopRule} />
      </div>
    </Link>
  );
}

function LifecycleGatePanel({ item }: { item: DecisionCase }) {
  const gate = item.lifecycleGate;

  return (
    <div className="mt-5 rounded-md border border-border bg-secondary p-4">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs text-primary">
              入住到退租
            </span>
            <span className="rounded-full border border-border bg-secondary/60 px-2.5 py-1 text-xs text-muted-foreground">
              入住退租确认情况 {gate.progress}%
            </span>
          </div>
          <h3 className="mt-3 text-lg font-semibold tracking-normal">
            签约后的居住安排
          </h3>
          <p className="mt-2 max-w-4xl text-sm leading-6 text-muted-foreground">
            这里会整理入住预算、交割凭据、维修责任、续租涨租和押金退还，让这套房从“能不能租”继续走到“住进去以后会不会后悔”。
          </p>
        </div>

        <div className="grid shrink-0 grid-cols-3 gap-2 sm:min-w-[300px]">
          <LifecycleMetric label="已确认" value={gate.completedCount} tone="ok" />
          <LifecycleMetric label="需要补充" value={gate.attentionCount} tone="warn" />
          <LifecycleMetric label="不建议继续" value={gate.blockedCount} tone="stop" />
        </div>
      </div>

      <div className="mt-4">
        <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
          <span>入住退租确认情况</span>
          <span>{gate.progress}%</span>
        </div>
        <Progress value={gate.progress} className="bg-secondary" />
      </div>

      <div className="mt-4 grid gap-2 lg:grid-cols-5">
        {gate.items.map((gateItem) => {
          const stateCopy = gateStateCopy[gateItem.state];
          const Icon = stateCopy.icon;

          return (
            <Link
              key={`${item.id}-lifecycle-${gateItem.label}-${gateItem.type}`}
              href={gateItem.href}
              className="group flex min-h-[148px] flex-col rounded-md border border-border bg-secondary/60 p-3 transition-colors hover:bg-card"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-md bg-secondary/70 text-primary">
                    <Icon className="h-4 w-4" />
                  </span>
                  <p className="text-sm font-medium">{gateItem.label}</p>
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
              </div>
              <span
                className={`mt-3 w-fit rounded-full border px-2 py-0.5 text-[11px] ${stateCopy.className}`}
              >
                {stateCopy.label}
              </span>
              <p className="mt-2 line-clamp-3 text-xs leading-5 text-muted-foreground">
                {gateItem.reason}
              </p>
            </Link>
          );
        })}
      </div>

      {gate.nextItem ? (
        <Link
          href={gate.nextItem.href}
          className="group mt-4 flex flex-col gap-3 rounded-md border border-primary/20 bg-primary/10 p-4 transition-colors hover:bg-primary/15 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/15 text-primary">
              <KeyRound className="h-4 w-4" />
            </span>
            <div>
              <p className="text-sm font-semibold">入住后下一步：{gate.nextItem.label}</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                {gate.nextItem.reason}
              </p>
            </div>
          </div>
          <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
        </Link>
      ) : null}
    </div>
  );
}

function DataConfidencePanel({ item }: { item: DecisionCase }) {
  const confidence = item.dataConfidence;
  const levelClassName =
    confidence.level === "ready"
      ? "border-emerald-300/30 bg-emerald-300/10 text-emerald-700"
      : confidence.level === "limited"
        ? "border-rose-300/30 bg-rose-300/10 text-rose-700"
        : "border-amber-300/30 bg-amber-300/10 text-amber-700";
  const visibleGaps = confidence.gaps.slice(0, 4);
  const visiblePrompts = confidence.riskPrompts.slice(0, 4);

  return (
    <div className="mt-5 rounded-md border border-border bg-secondary p-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full border px-2.5 py-1 text-xs ${levelClassName}`}>
              {confidence.label}
            </span>
            {confidence.score > 0 ? (
              <span className="rounded-full border border-border bg-secondary/60 px-2.5 py-1 text-xs text-muted-foreground">
                信息完整度 {confidence.score}%
              </span>
            ) : null}
          </div>
          <h3 className="mt-3 text-lg font-semibold tracking-normal">
            信息是否够用
          </h3>
          <p className="mt-2 max-w-4xl text-sm leading-6 text-muted-foreground">
            {confidence.summary}
          </p>
        </div>
        <Button asChild variant="secondary" className="shrink-0">
          <Link href={confidence.href}>
            查看补充说明
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <InfoColumn
          title="信息不足或需谨慎判断的来源"
          icon={Gauge}
          items={visibleGaps}
          empty="本报告没有明显缺少的关键信息。"
        />
        <InfoColumn
          title="现场优先确认"
          icon={ClipboardList}
          items={visiblePrompts}
          empty="至少确认出租权、押金、维修责任和付款条件。"
        />
      </div>
    </div>
  );
}

function GatePermission({
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

function DecisionFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-secondary/60 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 line-clamp-3 text-xs leading-5 text-foreground/85">{value}</p>
    </div>
  );
}

function LifecycleMetric({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "ok" | "warn" | "stop";
}) {
  const className =
    tone === "ok"
      ? "text-emerald-700"
      : tone === "warn"
        ? "text-amber-700"
        : "text-rose-700";

  return (
    <div className="rounded-md border border-border bg-secondary/60 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`mt-1 text-2xl font-semibold ${className}`}>{value}</p>
    </div>
  );
}

function CaseMetric({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-md border border-border bg-card p-4">
      <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-md bg-primary/15 text-primary">
        <Icon className="h-4 w-4" />
      </div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  );
}

function InfoColumn({
  title,
  icon: Icon,
  items,
  empty,
}: {
  title: string;
  icon: LucideIcon;
  items: string[];
  empty: string;
}) {
  return (
    <div className="rounded-md border border-border bg-secondary p-4">
      <div className="mb-3 flex items-center gap-2">
        <Icon className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold">{title}</h3>
      </div>
      <ul className="space-y-2 text-sm leading-6 text-muted-foreground">
        {(items.length ? items : [empty]).map((item) => (
          <li key={item} className="flex gap-2">
            <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}


