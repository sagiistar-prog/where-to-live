import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  BadgeDollarSign,
  BriefcaseBusiness,
  CheckCircle2,
  ClipboardList,
  Clock3,
  Gauge,
  KeyRound,
  ListChecks,
  MapPinned,
  ShieldAlert,
  ShieldCheck,
  TrainFront,
  UsersRound,
} from "lucide-react";
import type { DecisionCase, DecisionCaseGateItem } from "@/lib/decision-case";
import { RiskBadge } from "@/components/risk-badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

const gateLevelRank: Record<DecisionCase["preSignGate"]["level"], number> = {
  stop: 0,
  review: 1,
  ready: 2,
};

const gateLevelStyle: Record<
  DecisionCase["preSignGate"]["level"],
  { label: string; className: string }
> = {
  stop: {
    label: "先确认",
    className: "border-rose-300/30 bg-rose-300/10 text-rose-700",
  },
  review: {
    label: "补充材料",
    className: "border-amber-300/30 bg-amber-300/10 text-amber-700",
  },
  ready: {
    label: "可签约前确认",
    className: "border-emerald-300/30 bg-emerald-300/10 text-emerald-700",
  },
};

type UpstreamReviewType = "area" | "commute" | "life" | "buy";
type UpstreamReviewState = DecisionCase["completedEvents"][number]["status"] | "pending";

const upstreamStateStyle: Record<UpstreamReviewState, { label: string; className: string }> = {
  recommend: {
    label: "已确认",
    className: "border-emerald-300/30 bg-emerald-300/10 text-emerald-700",
  },
  caution: {
    label: "需确认",
    className: "border-amber-300/30 bg-amber-300/10 text-amber-700",
  },
  reject: {
    label: "不建议继续",
    className: "border-rose-300/30 bg-rose-300/10 text-rose-700",
  },
  pending: {
    label: "未保存",
    className: "border-border bg-secondary/60 text-muted-foreground",
  },
};

const upstreamReviewItems = [
  {
    type: "area",
    label: "片区筛选",
    icon: MapPinned,
    pathname: "/area",
    missing: "还没保存片区优先约看、可以备选和先不约看的判断；容易继续在不合适的片区耗时间。",
    extra: (item: DecisionCase) => ({
      candidateAreas: item.address,
    }),
  },
  {
    type: "commute",
    label: "通勤成本",
    icon: TrainFront,
    pathname: "/commute",
    missing: "还没把早晚高峰、晚归打车、雨天步行和换乘成本折成真实月成本。",
    extra: (item: DecisionCase) => ({
      listingTitle: item.title,
    }),
  },
  {
    type: "life",
    label: "生活配套",
    icon: Clock3,
    pathname: "/life",
    missing: "还没保存买菜、医疗、快递、夜间照明、噪音和周末日常便利度。",
    extra: (item: DecisionCase) => ({
      listingTitle: item.title,
      radiusMinutes: "15",
    }),
  },
  {
    type: "buy",
    label: "买房压力",
    icon: BadgeDollarSign,
    pathname: "/buy",
    missing: "还没保存买房后的预算、首付后安全垫和租售取舍；租售判断还没有同一套房的预算参考。",
    extra: () => ({}),
  },
] satisfies Array<{
  type: UpstreamReviewType;
  label: string;
  icon: typeof BadgeDollarSign;
  pathname: string;
  missing: string;
  extra: (item: DecisionCase) => Record<string, string>;
}>;

function getFocusGate(item: DecisionCase): DecisionCaseGateItem | undefined {
  return (
    item.preSignGate.items.find((gate) => gate.state === "blocked") ??
    item.preSignGate.items.find((gate) => gate.state === "pending" && gate.type !== "visit") ??
    item.preSignGate.items.find((gate) => gate.state === "attention") ??
    item.preSignGate.items.find((gate) => gate.state === "pending")
  );
}

function buildSpecialReviewHref(pathname: "/safety" | "/shared", item: DecisionCase) {
  const type = pathname === "/safety" ? "safety" : "shared";
  const gateHref = item.preSignGate.items.find((gate) => gate.type === type)?.href;
  if (gateHref) return gateHref;

  const params = new URLSearchParams({
    from: "case",
    reportId: item.id,
    title: item.title,
    listingTitle: item.title,
    address: item.address,
    reportContext: [
      `来自工作台居住关注点确认：${item.title}`,
      item.address,
      item.stageNote,
      item.nextBestAction.stopRule,
    ].join("\n"),
  });

  params.set(
    "concerns",
    pathname === "/safety"
      ? "夜间路线、门禁楼道、低楼层窗户、快递外卖和维修上门边界需要签约前确认。"
      : "室友作息、公共空间、访客过夜、费用分摊、押金连带和转租授权需要付款前写清。",
  );

  return `${pathname}?${params.toString()}`;
}

function sortCases(cases: DecisionCase[]) {
  return [...cases].sort((a, b) => {
    const gateDiff = gateLevelRank[a.preSignGate.level] - gateLevelRank[b.preSignGate.level];
    if (gateDiff !== 0) return gateDiff;
    return b.score - a.score;
  });
}

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

function latestFocusEvent(item: DecisionCase, type: UpstreamReviewType) {
  return item.completedEvents.find((event) => event.type === type);
}

function gateItemByType(item: DecisionCase, type: UpstreamReviewType) {
  return item.preSignGate.items.find((gate) => gate.type === type);
}

function buildUpstreamReviewHref(
  pathname: string,
  item: DecisionCase,
  extra: Record<string, string> = {},
) {
  const params = new URLSearchParams({
    from: "dashboard",
    reportId: item.id,
    title: item.title,
    listingTitle: item.title,
    address: item.address,
    reportContext: [
      `来自工作台前置确认：${item.title}`,
      item.address,
      item.stageNote,
      item.nextBestAction.stopRule,
    ].join("\n"),
    ...extra,
  });

  return `${pathname}?${params.toString()}`;
}

export function DashboardDecisionSnapshot({ cases }: { cases: DecisionCase[] }) {
  const sortedCases = sortCases(cases);
  const focusCase = sortedCases[0];
  const stopCount = cases.filter((item) => item.preSignGate.level === "stop").length;
  const payableCount = cases.filter((item) => item.preSignGate.canPay).length;
  const signableCount = cases.filter((item) => item.preSignGate.canSign).length;
  const lowConfidenceCount = cases.filter(
    (item) =>
      item.dataConfidence.level === "limited" || item.dataConfidence.level === "review",
  ).length;
  const completedEventCount = cases.reduce(
    (total, item) => total + item.completedEvents.length,
    0,
  );
  const specialReviewEvents = cases.flatMap((item) =>
    item.completedEvents.filter((event) => event.type === "safety" || event.type === "shared"),
  );
  const specialRiskCount = specialReviewEvents.filter((event) => event.status !== "recommend").length;

  if (!focusCase) {
    return (
      <section className="rounded-lg border border-border bg-card p-6">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-3xl">
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-md bg-primary/15 text-primary">
              <BriefcaseBusiness className="h-5 w-5" />
            </div>
            <p className="text-sm text-primary/80">
              当前重点
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-normal">
              还没有保存候选记录
            </h2>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">
              你可以先判断这座城市值不值得去，也可以先比较片区通勤，或者从第一套候选房源开始。保存结果后，这里会汇总下一步该做什么、哪一步需要先确认。
            </p>
          </div>

          <div className="grid gap-2 sm:grid-cols-3 lg:w-[520px]">
            <Button asChild>
              <Link href="/city">
                先算城市成本
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href="/area">比较片区通勤</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href="/analyze">评估候选房源</Link>
            </Button>
          </div>
        </div>
      </section>
    );
  }

  const focusLifecycle = focusCase.lifecycleGate;
  const nextBestAction = focusCase.nextBestAction;
  const levelStyle = gateLevelStyle[focusCase.preSignGate.level];
  const focusSafetyEvent = focusCase.completedEvents.find((event) => event.type === "safety");
  const focusSharedEvent = focusCase.completedEvents.find((event) => event.type === "shared");
  const focusPlanEvent = focusCase.completedEvents.find((event) => event.type === "plan");

  return (
    <section className="rounded-lg border border-border bg-card p-5 sm:p-6">
      <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full border px-2.5 py-1 text-xs ${levelStyle.className}`}
            >
              {levelStyle.label}
            </span>
            <RiskBadge status={focusCase.status} />
            <span
              className={`rounded-full border px-2.5 py-1 text-xs ${
                focusCase.dataConfidence.level === "ready"
                  ? "border-emerald-300/30 bg-emerald-300/10 text-emerald-700"
                  : focusCase.dataConfidence.level === "limited"
                    ? "border-rose-300/30 bg-rose-300/10 text-rose-700"
                    : "border-amber-300/30 bg-amber-300/10 text-amber-700"
              }`}
            >
              信息完整度 {focusCase.dataConfidence.score || "-"}%
            </span>
            <span className="rounded-full border border-border bg-secondary px-2.5 py-1 text-xs text-muted-foreground">
              {formatTime(focusCase.generatedAt)}
            </span>
          </div>

          <p className="mt-5 text-sm text-primary/80">
            当前最该确认
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-normal sm:text-3xl">
            {focusCase.title}
          </h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {focusCase.address}
          </p>

          <div className="mt-5 rounded-md border border-border bg-secondary p-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  {focusCase.preSignGate.level === "stop" ? (
                    <ShieldAlert className="h-4 w-4 text-rose-700" />
                  ) : focusCase.preSignGate.level === "review" ? (
                    <AlertTriangle className="h-4 w-4 text-amber-700" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4 text-emerald-700" />
                  )}
                  <p className="text-sm font-semibold">
                    {focusCase.preSignGate.label}
                  </p>
                </div>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {focusCase.preSignGate.summary}
                </p>
              </div>
              <div className="grid shrink-0 grid-cols-2 gap-2 lg:w-[260px]">
                <GateVerdict
                  label="付款"
                  allowed={focusCase.preSignGate.canPay}
                  allowedText="可付款"
                  blockedText="先别付款"
                />
                <GateVerdict
                  label="签约"
                  allowed={focusCase.preSignGate.canSign}
                  allowedText="可签约"
                  blockedText="先别签约"
                />
              </div>
            </div>

            <div className="mt-4">
              <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
                <span>签约前确认情况</span>
                <span>{focusCase.preSignGate.progress}%</span>
              </div>
              <Progress value={focusCase.preSignGate.progress} className="bg-background/70" />
            </div>
          </div>

          <Link
            href={nextBestAction.href}
            className="group mt-4 block rounded-md border border-primary/20 bg-primary/10 p-4 transition-colors hover:bg-primary/15"
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/15 text-primary">
                    <ClipboardList className="h-4 w-4" />
                  </span>
                  <span
                    className={`rounded-full border px-2.5 py-1 text-xs ${
                      nextBestAction.priority === "blocker"
                        ? "border-rose-300/30 bg-rose-300/10 text-rose-700"
                        : nextBestAction.priority === "required"
                          ? "border-amber-300/30 bg-amber-300/10 text-amber-700"
                          : "border-primary/30 bg-primary/10 text-primary"
                    }`}
                  >
                    现在先做
                  </span>
                  <p className="text-sm font-semibold">{nextBestAction.label}</p>
                </div>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {nextBestAction.reason}
                </p>
                <div className="mt-3 grid gap-2 md:grid-cols-3">
                  <ActionFact label="为什么做" value={nextBestAction.intent} />
                  <ActionFact label="确认到什么程度" value={nextBestAction.doneCriteria} />
                  <ActionFact label="付款底线" value={nextBestAction.stopRule} />
                </div>
              </div>
              <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
            </div>
          </Link>

          {focusLifecycle.nextItem ? (
            <Link
              href={focusLifecycle.nextItem.href}
              className="group mt-3 flex flex-col gap-3 rounded-md border border-primary/20 bg-primary/10 p-4 transition-colors hover:bg-primary/15 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/15 text-primary">
                    <KeyRound className="h-4 w-4" />
                  </span>
                  <p className="text-sm font-semibold">
                    入住后下一步：{focusLifecycle.nextItem.label}
                  </p>
                </div>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {focusLifecycle.nextItem.reason}
                </p>
              </div>
              <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
            </Link>
          ) : null}
        </div>

        <div className="grid gap-3 xl:w-[360px]">
            <div className="grid grid-cols-2 gap-3">
              <SnapshotMetric label="候选房源" value={`${cases.length} 套`} />
              <SnapshotMetric label="需先确认" value={`${stopCount} 套`} />
              <SnapshotMetric label="信息要补充" value={`${lowConfidenceCount} 套`} />
              <SnapshotMetric label="可付款" value={`${payableCount} 套`} />
              <SnapshotMetric label="可签约" value={`${signableCount} 套`} />
            </div>
          <div className="rounded-md border border-border bg-secondary p-4">
            <div className="flex items-center gap-2">
              <Gauge className="h-4 w-4 text-primary" />
              <p className="text-sm font-semibold">信息还差什么</p>
            </div>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {focusCase.dataConfidence.summary}
            </p>
            {focusCase.dataConfidence.gaps.length ? (
              <p className="mt-2 text-xs leading-5 text-muted-foreground">
                补充：{focusCase.dataConfidence.gaps.slice(0, 2).join("；")}
              </p>
            ) : null}
          </div>
          <UpstreamReviewPanel item={focusCase} />
          <div className="rounded-md border border-border bg-secondary p-4">
            <div className="flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-primary" />
              <p className="text-sm font-semibold">入住退租</p>
            </div>
            <div className="mt-3">
              <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
                <span>入住退租确认情况</span>
                <span>{focusLifecycle.progress}%</span>
              </div>
              <Progress value={focusLifecycle.progress} className="bg-background/70" />
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2">
              <SnapshotMetric label="已确认" value={`${focusLifecycle.completedCount}`} />
              <SnapshotMetric label="材料要补充" value={`${focusLifecycle.attentionCount}`} />
              <SnapshotMetric label="还要确认" value={`${focusLifecycle.blockedCount}`} />
            </div>
          </div>
          <div className="rounded-md border border-border bg-secondary p-4">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" />
              <p className="text-sm font-semibold">居住关注点</p>
            </div>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              已保存 {specialReviewEvents.length} 次独居安全或合租边界判断，{specialRiskCount} 次仍建议再确认或先别付款签约。
            </p>
            <div className="mt-3 grid gap-2">
              <SpecialReviewRow
                icon={ShieldCheck}
                label="独居安全"
                href={buildSpecialReviewHref("/safety", focusCase)}
                summary={focusSafetyEvent?.summary}
              />
              <SpecialReviewRow
                icon={UsersRound}
                label="合租边界"
                href={buildSpecialReviewHref("/shared", focusCase)}
                summary={focusSharedEvent?.summary}
              />
            </div>
          </div>
          <PlanEventPanel
            reportId={focusCase.id}
            title={focusCase.title}
            summary={focusPlanEvent?.summary}
            highlights={focusPlanEvent?.highlights}
            href={focusPlanEvent?.href}
          />
          <div className="rounded-md border border-border bg-secondary p-4">
            <div className="flex items-center gap-2">
              <BadgeDollarSign className="h-4 w-4 text-primary" />
              <p className="text-sm font-semibold">已保存判断</p>
            </div>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              已有 {completedEventCount} 次看房、官方查询、凭据、付款、合同、居住关注点、交割、维修、续租或押金结果保存。所有候选房源都可以在房源记录里继续查看。
            </p>
            <Button asChild className="mt-4 w-full" variant="secondary">
              <Link href="/case">
                打开房源记录
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {sortedCases.length > 1 ? (
        <div className="mt-5 border-t border-border pt-5">
          <div className="mb-3 flex items-center justify-between gap-4">
            <p className="text-sm font-semibold">其他候选房源</p>
            <Button asChild variant="ghost" size="sm">
              <Link href="/compare">进入对比</Link>
            </Button>
          </div>
          <div className="grid gap-3 lg:grid-cols-2">
            {sortedCases.slice(1, 3).map((item) => {
              const gate = getFocusGate(item);
              return (
                <Link
                  key={item.id}
                  href={gate?.href ?? item.reportHref}
                  className="group rounded-md border border-border bg-secondary/60 p-4 transition-colors hover:bg-card"
                >
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[11px] ${gateLevelStyle[item.preSignGate.level].className}`}
                    >
                      {gateLevelStyle[item.preSignGate.level].label}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {item.preSignGate.progress}% 确认
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{item.title}</p>
                      <p className="mt-1 truncate text-xs text-muted-foreground">
                        {item.nextBestAction.label || gate?.label || "查看报告"}
                      </p>
                    </div>
                    <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      ) : null}
    </section>
  );
}

function GateVerdict({
  label,
  allowed,
  allowedText,
  blockedText,
}: {
  label: string;
  allowed: boolean;
  allowedText: string;
  blockedText: string;
}) {
  return (
    <div className="rounded-md border border-border bg-secondary/60 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={allowed ? "mt-1 text-sm font-medium text-emerald-700" : "mt-1 text-sm font-medium text-rose-700"}>
        {allowed ? allowedText : blockedText}
      </p>
    </div>
  );
}

function UpstreamReviewPanel({ item }: { item: DecisionCase }) {
  return (
    <div className="rounded-md border border-border bg-secondary p-4">
      <div className="flex items-center gap-2">
        <MapPinned className="h-4 w-4 text-primary" />
        <p className="text-sm font-semibold">前面还要确认什么</p>
      </div>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        片区、通勤、生活配套和买房压力会改变“这套房到底值不值得继续投入”。这里直接显示已保存的判断，避免只盯着签约材料。
      </p>
      <div className="mt-3 grid gap-2">
        {upstreamReviewItems.map((config) => {
          const event = latestFocusEvent(item, config.type);
          const gate = gateItemByType(item, config.type);
          const state = event?.status ?? "pending";
          const stateStyle = upstreamStateStyle[state];
          const href =
            event?.href ||
            gate?.href ||
            buildUpstreamReviewHref(config.pathname, item, config.extra(item));
          const Icon = config.icon;

          return (
            <Link
              key={config.type}
              href={href}
              className="group block rounded-md border border-border bg-secondary/60 p-3 transition-colors hover:bg-card"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Icon className="h-3.5 w-3.5 text-primary" />
                    <p className="text-xs font-medium">{config.label}</p>
                    <span className={`rounded-full border px-2 py-0.5 text-[11px] ${stateStyle.className}`}>
                      {stateStyle.label}
                    </span>
                  </div>
                  <p className="mt-2 line-clamp-2 text-xs leading-5 text-muted-foreground">
                    {event?.summary || gate?.reason || config.missing}
                  </p>
                  {event?.highlights?.length ? (
                    <p className="mt-1 line-clamp-1 text-[11px] leading-5 text-muted-foreground">
                      {event.highlights.slice(0, 2).join("；")}
                    </p>
                  ) : null}
                </div>
                <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function ActionFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-secondary/60 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 line-clamp-3 text-xs leading-5 text-foreground/85">{value}</p>
    </div>
  );
}

function PlanEventPanel({
  reportId,
  title,
  summary,
  highlights = [],
  href,
}: {
  reportId: string;
  title: string;
  summary?: string;
  highlights?: string[];
  href?: string;
}) {
  const targetHref = href || `/plan?reportId=${encodeURIComponent(reportId)}`;

  return (
    <div className="rounded-md border border-border bg-secondary p-4">
      <div className="flex items-center gap-2">
        <ListChecks className="h-4 w-4 text-primary" />
        <p className="text-sm font-semibold">接下来先做什么</p>
      </div>
      {summary ? (
        <>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{summary}</p>
          <div className="mt-3 grid gap-2 text-xs leading-5 text-muted-foreground">
            {highlights.slice(0, 3).map((item) => (
              <p key={item} className="rounded-md border border-border bg-secondary/60 px-3 py-2">
                {item}
              </p>
            ))}
          </div>
        </>
      ) : (
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          这套「{title}」还没有保存过下一步。被催付款、材料变化或只剩一两天确认时间时，先整理今天要确认的事项。
        </p>
      )}
      <Button asChild className="mt-4 w-full" variant="secondary">
        <Link href={targetHref}>
          {summary ? "更新下一步" : "整理下一步"}
          <ArrowRight className="ml-2 h-4 w-4" />
        </Link>
      </Button>
    </div>
  );
}

function SnapshotMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-secondary p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  );
}

function SpecialReviewRow({
  icon: Icon,
  label,
  href,
  summary,
}: {
  icon: typeof ShieldCheck;
  label: string;
  href: string;
  summary?: string;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center justify-between gap-3 rounded-md border border-border bg-secondary/60 p-3 transition-colors hover:bg-card"
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <Icon className="h-3.5 w-3.5 text-primary" />
          <p className="text-xs font-medium">{label}</p>
        </div>
        <p className="mt-1 truncate text-xs text-muted-foreground">
          {summary || "还没确认，点击进入"}
        </p>
      </div>
      <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
    </Link>
  );
}

