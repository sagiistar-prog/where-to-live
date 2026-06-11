import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  GitCompareArrows,
  ShieldAlert,
  ShieldCheck,
  WalletCards,
  type LucideIcon,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { ComparisonDecisionMemo } from "@/components/comparison-decision-memo";
import { ComparisonTable } from "@/components/comparison-table";
import { ManualComparisonBuilder } from "@/components/manual-comparison-builder";
import { RiskBadge } from "@/components/risk-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { buildComparisonListingsFromReports } from "@/lib/comparison";
import { buildFlowHref, compactContext } from "@/lib/flow-links";
import { comparisonListings, type ComparisonListing } from "@/lib/mock-data";
import { listReports } from "@/lib/server/report-store";
import { listCaseEvents } from "@/lib/server/case-event-store";
import { getCurrentOwnerId } from "@/lib/server/current-owner";

export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;

const sourceLabels: Record<string, string> = {
  renewal: "已从续租方案带入",
  case: "已从房源记录带入",
  report: "已从报告带入",
  commute: "已从通勤成本带入",
  analyze: "已从房源评估带入",
  compare: "已从多房源对比带入",
  home: "已从首页输入带入",
  dashboard: "已从工作台输入带入",
};

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

type ComparisonMode = "real" | "hybrid" | "demo";

function alternativeAnalyzeHref({
  listing,
  focusListing,
  reportId,
}: {
  listing: ComparisonListing;
  focusListing?: ComparisonListing;
  reportId?: string;
}) {
  const templateContext = compactContext([
    "来自多房源对比：把示例替代方案转成真实候选房源评估。",
    focusListing ? `当前关注房源：${focusListing.name}` : undefined,
    focusListing ? `当前房源取舍：${focusListing.decisionSummary ?? focusListing.reason}` : undefined,
    `参考取舍模板：${listing.name}`,
    `目标：${listing.decisionSummary ?? listing.reason}`,
    listing.monthlyCostDelta ? `成本参考：${listing.monthlyCostDelta}` : undefined,
    listing.commuteDelta ? `通勤参考：${listing.commuteDelta}` : undefined,
    "请把这里当作找真实备选的判断标准，不要把示例房源当成真实房源。",
  ]);

  return buildFlowHref("/analyze", {
    from: "compare",
    reportId,
    title: `待填真实备选：参考${listing.name}`,
    rent: listing.rent,
    area: listing.area,
    description: templateContext,
    reportContext: templateContext,
  });
}

function buildHybridListings(realListings: ComparisonListing[], reportId?: string) {
  const focusListing =
    (reportId ? realListings.find((listing) => listing.id === reportId) : undefined) ??
    realListings[0];
  const usedNames = new Set(realListings.map((listing) => listing.name.trim()));
  const alternatives = comparisonListings
    .filter((listing) => !usedNames.has(listing.name.trim()))
    .slice(0, Math.max(0, 3 - realListings.length))
    .map((listing, index) => ({
      ...listing,
      id: `demo-alternative-${index + 1}`,
      source: "示例替代方案",
      href: undefined,
      nextActionHref: alternativeAnalyzeHref({ listing, focusListing, reportId }),
      nextActionLabel: "评估真实替代房",
      decisionSummary: `${listing.decisionSummary ?? listing.reason}（示例替代，只用于提醒你还需要补充真实候选。）`,
    }));

  return [...realListings, ...alternatives].map((listing, index) => ({
    ...listing,
    rank: index + 1,
    source:
      index < realListings.length
        ? `${listing.source ?? "真实报告"} · 已保存报告`
        : listing.source,
  }));
}

export default async function ComparePage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const params = searchParams ? await searchParams : {};
  const ownerId = await getCurrentOwnerId();
  const [reports, caseEvents] = await Promise.all([listReports(ownerId), listCaseEvents(ownerId)]);
  const reportId = firstParam(params.reportId);
  const source = firstParam(params.from);
  const realListings = buildComparisonListingsFromReports(reports, caseEvents);
  const hasEnoughReports = realListings.length >= 2;
  const comparisonMode: ComparisonMode = hasEnoughReports
    ? "real"
    : realListings.length
      ? "hybrid"
      : "demo";
  const listings =
    comparisonMode === "real"
      ? realListings
      : comparisonMode === "hybrid"
        ? buildHybridListings(realListings, reportId)
        : comparisonListings;
  const focusListing = reportId ? listings.find((item) => item.id === reportId) : undefined;
  const focusedTitle =
    focusListing?.name ||
    firstParam(params.currentTitle) ||
    firstParam(params.title);
  const sourceLabel = source ? sourceLabels[source] : undefined;

  return (
    <AppShell>
      <div className="mx-auto max-w-7xl space-y-8">
        <section className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <div>
            <p className="text-sm text-primary">
              多房源对比
            </p>
            <h1 className="mt-3 text-3xl font-semibold sm:text-4xl">
              把候选房源放在一起比
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground">
              选房要同时看预算、通勤、生活便利、风险和未来退租成本，避免只被最低月租吸引。
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild variant="secondary">
              <Link href="/commute">折算通勤</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href="/renewal">续租或搬家</Link>
            </Button>
            <Button asChild>
              <Link href="/analyze">
                新增候选房源
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </section>

        {comparisonMode !== "real" ? (
          <Card className="p-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-amber-300/10 text-amber-700">
                  <AlertTriangle className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="font-semibold">
                    {comparisonMode === "hybrid"
                      ? "已带入 1 份真实报告，先用示例替代方案辅助比较"
                      : "需要至少 2 份真实报告才能形成你的专属对比"}
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {comparisonMode === "hybrid"
                      ? "当前表格会保留你的真实房源并高亮当前关注对象，另外加入示例替代方案，帮助你看清还需要哪类候选。保存第二份真实评估后，示例会退出。"
                      : `当前已保存 ${realListings.length} 份报告。下面先展示示例对比；真实对比会按你的报告评分、通勤、成本和风险排列。`}
                  </p>
                </div>
              </div>
              <Button asChild variant="secondary" className="shrink-0">
                <Link href="/analyze">评估真实候选</Link>
              </Button>
            </div>
          </Card>
        ) : (
          <Card className="p-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/15 text-primary">
                  <GitCompareArrows className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="font-semibold">已根据 {realListings.length} 份真实报告整理推荐顺序</h2>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    推荐顺序同时考虑报告结论、真实月成本、通勤差额、信息是否够用和签约前确认情况。点击房源名称可以回看完整评估报告。
                  </p>
                </div>
              </div>
              <Button asChild variant="secondary" className="shrink-0">
                <Link href="/dashboard">查看记录</Link>
              </Button>
            </div>
          </Card>
        )}

        <FocusedComparisonContext
          focusListing={focusListing}
          focusedTitle={focusedTitle}
          sourceLabel={sourceLabel}
          hasEnoughReports={hasEnoughReports}
        />

        <ComparisonDecisionWorkspace
          listings={listings}
          activeListing={focusListing ?? listings[0]}
          comparisonMode={comparisonMode}
        />

        <ManualComparisonBuilder />

        <NextCandidatePanel
          comparisonMode={comparisonMode}
          focusListing={focusListing ?? realListings[0]}
          focusedTitle={focusedTitle}
          reportId={reportId}
        />

        <ComparisonCompass listings={listings} />

        <ComparisonValueLedger listings={listings} />

        <ComparisonDecisionMemo listings={listings} comparisonMode={comparisonMode} />

        <ComparisonDecisionStrip listings={listings} isReal={comparisonMode === "real"} />

        <ComparisonTable listings={listings} focusId={reportId} />
      </div>
    </AppShell>
  );
}

const riskRank = {
  recommend: 0,
  caution: 1,
  reject: 2,
};

const nextCandidateTemplates = [
  {
    id: "cost",
    icon: WalletCards,
    title: "添加一套低月成本备选",
    label: "预算",
    seedTitle: "待填真实备选：低月成本",
    description:
      "找一套名义租金或真实月成本低于当前房的真实候选，用来验证是否值得牺牲面积、装修或独居体验。",
    checklist: ["租金和押付结构更轻", "通勤不能明显超上限", "付款和授权材料仍要完整"],
  },
  {
    id: "commute",
    icon: Clock,
    title: "添加一套短通勤备选",
    label: "通勤",
    seedTitle: "待填真实备选：短通勤",
    description:
      "找一套离工作地更近、换乘更少或夜间最后一公里更稳的真实候选，用来判断多付租金是否值得。",
    checklist: ["晚高峰通勤更短", "夜间路线更亮更顺", "不要用高租金覆盖合同风险"],
  },
  {
    id: "risk",
    icon: ShieldCheck,
    title: "添加一套低签约风险备选",
    label: "风险提示",
    seedTitle: "待填真实备选：低签约风险",
    description:
      "找一套出租主体、收款主体、押金条款和维修责任更清楚的真实候选，用来对冲当前房的签约前不确定性。",
    checklist: ["出租权更好确认", "收款主体更一致", "押金和维修条款更容易写清"],
  },
] satisfies Array<{
  id: "cost" | "commute" | "risk";
  icon: LucideIcon;
  title: string;
  label: string;
  seedTitle: string;
  description: string;
  checklist: string[];
}>;

function templateSeedHref({
  template,
  focusListing,
  focusedTitle,
  reportId,
}: {
  template: (typeof nextCandidateTemplates)[number];
  focusListing?: ComparisonListing;
  focusedTitle?: string;
  reportId?: string;
}) {
  const currentRent = parseMoneyText(focusListing?.rent);
  const currentCommute = focusListing?.commuteMinutes;
  const targetRent =
    template.id === "cost" && currentRent
      ? `${Math.max(1000, Math.round(currentRent * 0.9))} 元/月`
      : undefined;
  const targetCommute =
    template.id === "commute" && currentCommute
      ? `${Math.max(20, currentCommute - 10)} 分钟`
      : undefined;
  const context = compactContext([
    "来自多房源对比：添加一套真实候选房源。",
    focusListing || focusedTitle
      ? `当前关注：${focusListing?.name ?? focusedTitle}`
      : "当前还没有真实候选，先保存第一套真实评估。",
    focusListing ? `当前取舍：${focusListing.decisionSummary ?? focusListing.reason}` : undefined,
    `本次补充方向：${template.title}`,
    template.description,
    template.checklist.map((item) => `确认重点：${item}`),
    "请把标题、租金、地址和截图替换为你手上的真实房源，不要把模板文字当成真实房源信息。",
  ]);

  return buildFlowHref("/analyze", {
    from: "compare",
    reportId,
    title: template.seedTitle,
    rent: targetRent,
    budget: targetRent,
    commuteLimit: targetCommute,
    description: context,
    reportContext: context,
  });
}

function NextCandidatePanel({
  comparisonMode,
  focusListing,
  focusedTitle,
  reportId,
}: {
  comparisonMode: ComparisonMode;
  focusListing?: ComparisonListing;
  focusedTitle?: string;
  reportId?: string;
}) {
  if (comparisonMode === "real") return null;

  return (
    <section className="rounded-lg border border-border bg-card p-5">
      <div className="grid gap-5 xl:grid-cols-[0.34fr_0.66fr]">
        <div className="min-w-0">
          <p className="text-sm text-primary">
            添加真实候选
          </p>
          <h2 className="mt-2 text-xl font-semibold">下一套真实候选怎么选</h2>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">
                  示例替代只负责提醒取舍方向，不能替你做真实选择。现在最该做的是按一个明确目标再评估一套真实房源，让对比变成能直接参考的判断。
          </p>
          <div className="mt-4 rounded-md border border-amber-300/20 bg-amber-300/10 p-3 text-xs leading-5 text-amber-700">
            {comparisonMode === "hybrid"
              ? "当前已有 1 份真实报告。再添加 1 套真实候选后，示例替代会退出，对比页会改用真实报告排序。"
              : "当前还没有真实报告。先按一个方向评估第一套房，再回到这里评估第二套。"}
          </div>
        </div>

        <div className="grid gap-3 lg:grid-cols-3">
          {nextCandidateTemplates.map((template) => {
            const Icon = template.icon;
            const href = templateSeedHref({
              template,
              focusListing,
              focusedTitle,
              reportId,
            });

            return (
              <Link
                key={template.id}
                href={href}
                className="group rounded-md border border-border bg-secondary/60 p-4 transition-colors hover:border-primary/30 hover:bg-primary/10"
              >
                <div className="mb-4 flex items-start justify-between gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/15 text-primary">
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="rounded-full border border-border bg-secondary px-2.5 py-1 text-xs text-muted-foreground">
                    {template.label}
                  </span>
                </div>
                <h3 className="font-semibold transition-colors group-hover:text-primary">
                  {template.title}
                </h3>
                <p className="mt-2 text-xs leading-5 text-muted-foreground">
                  {template.description}
                </p>
                <div className="mt-3 space-y-1.5">
                  {template.checklist.map((item) => (
                    <p key={item} className="text-xs leading-5 text-muted-foreground">
                      {item}
                    </p>
                  ))}
                </div>
                <p className="mt-4 inline-flex items-center text-xs font-medium text-primary">
                  用这个方向评估真实房源
                  <ArrowRight className="ml-1 h-3.5 w-3.5" />
                </p>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function FocusedComparisonContext({
  focusListing,
  focusedTitle,
  sourceLabel,
  hasEnoughReports,
}: {
  focusListing?: ComparisonListing;
  focusedTitle?: string;
  sourceLabel?: string;
  hasEnoughReports: boolean;
}) {
  if (!focusListing && !focusedTitle && !sourceLabel) return null;

  return (
    <section className="rounded-lg border border-primary/20 bg-primary/10 p-5">
      <div className="grid gap-5 lg:grid-cols-[0.38fr_0.62fr]">
        <div className="min-w-0">
          <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-md bg-primary/15 text-primary">
            <GitCompareArrows className="h-5 w-5" />
          </div>
          <p className="text-sm text-primary">
            当前对比
          </p>
          <h2 className="mt-2 text-xl font-semibold">
            {focusedTitle ? `正在围绕「${focusedTitle}」做取舍` : "正在承接上一轮结果"}
          </h2>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">
            {sourceLabel ? `${sourceLabel}。` : ""}
                          对比页会保留当前上下文，但不会因为它是“当前房”就直接推荐。排序仍然按结论、真实月成本、通勤差额、信息是否够用和签约前确认判断。
          </p>
        </div>

        {focusListing ? (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <FocusFact
              icon={CheckCircle2}
              label="当前排序"
              value={`第 ${focusListing.rank} 位`}
              detail={focusListing.decisionSummary ?? focusListing.reason}
            />
            <FocusFact
              icon={WalletCards}
              label="成本取舍"
              value={focusListing.trueMonthlyCost}
              detail={focusListing.monthlyCostDelta ?? "真实月成本仍需补充"}
            />
            <FocusFact
              icon={Clock}
              label="通勤取舍"
              value={focusListing.commute}
              detail={focusListing.commuteDelta ?? "通勤差额仍需补充"}
            />
            <FocusFact
              icon={ShieldAlert}
              label="当前确认"
              value={focusListing.gateLabel ?? "示例确认"}
              detail={
                focusListing.blockers?.[0] ??
                focusListing.nextActionLabel ??
                "继续保存签约前确认"
              }
              tone="warning"
            />
          </div>
        ) : (
          <div className="rounded-md border border-border bg-secondary/60 p-4">
            <p className="text-sm font-medium">
              {hasEnoughReports
                ? "没有在已保存报告中匹配到这套房"
                : "真实报告还不足，先展示示例对比"}
            </p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              继续保存至少两份真实评估后，对比页会按你的候选房源排序，并把当前房源高亮出来。
            </p>
          </div>
        )}
      </div>

      {focusListing ? (
        <div className="mt-4 flex flex-col gap-3 border-t border-primary/20 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm leading-6 text-muted-foreground">
            下一步不要只看排名：先确认会影响付款或签约的风险，再决定是否为了通勤、面积或成本做妥协。
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            {focusListing.nextActionHref && focusListing.nextActionLabel ? (
              <Button asChild>
                <Link href={focusListing.nextActionHref}>
                  {focusListing.nextActionLabel}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            ) : null}
            {focusListing.href ? (
              <Button asChild variant="secondary">
                <Link href={focusListing.href}>回看报告</Link>
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}

function FocusFact({
  icon: Icon,
  label,
  value,
  detail,
  tone = "default",
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  detail: string;
  tone?: "default" | "warning";
}) {
  return (
    <div className="rounded-md border border-border bg-secondary/60 p-4">
      <div
        className={
          tone === "warning"
            ? "mb-4 flex h-9 w-9 items-center justify-center rounded-md bg-amber-300/10 text-amber-700"
            : "mb-4 flex h-9 w-9 items-center justify-center rounded-md bg-primary/15 text-primary"
        }
      >
        <Icon className="h-4 w-4" />
      </div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 break-words text-lg font-semibold">{value}</p>
      <p className="mt-2 line-clamp-3 text-xs leading-5 text-muted-foreground">
        {detail}
      </p>
    </div>
  );
}

function buildCompareFocusHref(listing: ComparisonListing) {
  if (!listing.id) return "#compare-workspace";
  const params = new URLSearchParams({
    from: "compare",
    reportId: listing.id,
  });
  return `/compare?${params.toString()}#compare-workspace`;
}

function comparisonModeLabel(mode: ComparisonMode) {
  if (mode === "real") return "真实报告对比";
  if (mode === "hybrid") return "真实报告 + 示例替代";
  return "示例对比";
}

function listingDecisionTone(listing: ComparisonListing) {
  if (listing.gateLevel === "stop" || listing.risk === "reject" || listing.canPay === false) {
    return {
      label: "先别直接付款",
      className: "border-rose-200 bg-rose-50 text-rose-700",
    };
  }
  if (listing.gateLevel === "review" || listing.risk === "caution") {
    return {
      label: "补充材料",
      className: "border-amber-200 bg-amber-50 text-amber-700",
    };
  }
  return {
    label: "可以继续比较",
    className: "border-primary/25 bg-primary/10 text-primary",
  };
}

function workspaceHeadline(listing: ComparisonListing, mode: ComparisonMode) {
  if (mode === "hybrid" && !listing.id?.startsWith("demo-")) {
    return "先用这套真实房源建立比较基准";
  }
  if (mode === "demo") return "先看懂取舍方式，再换成真实房源";
  if (listing.rank === 1) return "可以作为第一选择继续判断";
  return "先看清它的主要问题";
}

function ComparisonDecisionWorkspace({
  listings,
  activeListing,
  comparisonMode,
}: {
  listings: ComparisonListing[];
  activeListing?: ComparisonListing;
  comparisonMode: ComparisonMode;
}) {
  if (!activeListing) return null;

  const activeTone = listingDecisionTone(activeListing);
  const activeBlockers = [
    ...(activeListing.blockers ?? []),
    ...(activeListing.confidenceGaps ?? []).map((item) => `信息需补充：${item}`),
    ...(activeListing.giveUp ?? []),
  ].filter(Boolean).slice(0, 4);

  return (
    <section
      id="compare-workspace"
            className="grid gap-4 rounded-lg border border-border bg-card/80 p-4 shadow-[0_24px_80px_oklch(var(--foreground)/0.07)] lg:grid-cols-[340px_minmax(0,1fr)]"
    >
      <aside className="rounded-lg border border-border bg-secondary/55 p-3">
        <div className="mb-3 flex items-center justify-between gap-3 px-1">
          <div>
            <p className="text-xs text-primary">候选顺序</p>
            <h2 className="mt-1 text-lg font-semibold">先比较哪一套</h2>
          </div>
          <span className="rounded-full border border-border bg-card px-2.5 py-1 text-xs text-muted-foreground">
            {comparisonModeLabel(comparisonMode)}
          </span>
        </div>

        <div className="grid gap-2">
          {listings.map((listing) => {
            const active = listing.id === activeListing.id;
            const tone = listingDecisionTone(listing);

            return (
              <Link
                key={listing.id ?? listing.name}
                href={buildCompareFocusHref(listing)}
                className={
                  active
                    ? "rounded-lg border border-primary/35 bg-primary/10 p-3 shadow-sm"
                    : "rounded-lg border border-transparent bg-card/70 p-3 transition-colors hover:border-primary/25 hover:bg-card"
                }
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">
                      {listing.rank}. {listing.name}
                    </p>
                    <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
                      {listing.trueMonthlyCost} · {listing.commute}
                    </p>
                  </div>
                  <span className="shrink-0 text-lg font-semibold">{listing.score}</span>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  <span className={`rounded-full border px-2 py-0.5 text-[11px] ${tone.className}`}>
                    {tone.label}
                  </span>
                  {listing.source ? (
                    <span className="rounded-full border border-border bg-secondary/60 px-2 py-0.5 text-[11px] text-muted-foreground">
                      {listing.source}
                    </span>
                  ) : null}
                </div>
              </Link>
            );
          })}
        </div>
      </aside>

      <div className="min-w-0 rounded-lg border border-border bg-[oklch(0.955_0.01_92)] p-5">
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_310px]">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <RiskBadge status={activeListing.risk} />
              <ConfidencePill listing={activeListing} />
              <GatePill listing={activeListing} />
              <span className={`rounded-full border px-2.5 py-1 text-xs ${activeTone.className}`}>
                {activeTone.label}
              </span>
            </div>

            <h2 className="mt-3 text-3xl font-semibold">
              {activeListing.name}
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
              {activeListing.decisionSummary ?? activeListing.reason}
            </p>

            <div className="mt-5 rounded-lg border border-border bg-card/72 p-4 shadow-[0_18px_56px_oklch(var(--foreground)/0.06)]">
              <p className="text-xs text-primary">当前结论</p>
              <h3 className="mt-2 text-xl font-semibold">
                {workspaceHeadline(activeListing, comparisonMode)}
              </h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {activeListing.tradeoff || activeListing.reason}
              </p>
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <CompareFact label="成本取舍" value={activeListing.monthlyCostDelta ?? "真实月成本待补充"} />
                <CompareFact label="通勤取舍" value={activeListing.commuteDelta ?? "通勤差额待补充"} />
                <CompareFact
                  label="选择底线"
                  value={
                    activeListing.blockers?.[0] ??
                    activeListing.nextActionLabel ??
                    "先保存签约前确认，再决定是否付款或签约。"
                  }
                />
              </div>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <WorkspaceDecisionCard
                icon={WalletCards}
                label="真实月成本"
                value={activeListing.trueMonthlyCost}
                detail={activeListing.monthlyCostDelta ?? "补充月支出后再判断。"}
              />
              <WorkspaceDecisionCard
                icon={Clock}
                label="通勤"
                value={activeListing.commute}
                detail={activeListing.commuteDelta ?? "补充高峰通勤后再判断。"}
              />
              <WorkspaceDecisionCard
                icon={ShieldCheck}
                label="付款与签约"
                value={activeListing.gateLabel ?? "待确认"}
                detail={`${activeListing.canPay ? "可付款" : "先别付款"} · ${activeListing.canSign ? "可签约" : "先别签约"}`}
                danger={activeListing.canPay === false || activeListing.canSign === false}
              />
            </div>
          </div>

          <aside className="grid min-w-0 gap-3">
            <div className="rounded-lg border border-border bg-card/72 p-4">
              <div className="mb-3 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold">为什么排在这里</h3>
              </div>
              <div className="grid gap-2">
                {(activeListing.whyThisRank?.length ? activeListing.whyThisRank : [activeListing.reason]).slice(0, 4).map((item) => (
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
                <ShieldAlert className="h-4 w-4 text-amber-700" />
                <h3 className="text-sm font-semibold">继续前先看</h3>
              </div>
              <div className="grid gap-2">
                {(activeBlockers.length ? activeBlockers : ["暂无明显高风险项，但付款前仍要确认授权、收款主体、押金和合同版本。"]).map((item) => (
                  <p
                    key={item}
                    className="rounded-md border border-border bg-secondary/55 px-3 py-2 text-xs leading-5 text-muted-foreground"
                  >
                    {item}
                  </p>
                ))}
              </div>
            </div>

            <div className="grid gap-2">
              {activeListing.nextActionHref && activeListing.nextActionLabel ? (
                <Button asChild>
                  <Link href={activeListing.nextActionHref}>
                    {activeListing.nextActionLabel}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              ) : null}
              {activeListing.href ? (
                <Button asChild variant="secondary">
                  <Link href={activeListing.href}>回看完整报告</Link>
                </Button>
              ) : null}
              <Button asChild variant="secondary">
                <Link href="/analyze">再评估一套真实房源</Link>
              </Button>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}

function CompareFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-secondary/60 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 line-clamp-3 text-xs leading-5 text-foreground/85">{value}</p>
    </div>
  );
}

function WorkspaceDecisionCard({
  icon: Icon,
  label,
  value,
  detail,
  danger,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  detail: string;
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
      <p className="mt-2 line-clamp-2 text-xs leading-5 text-muted-foreground">
        {detail}
      </p>
    </div>
  );
}

function parseMoneyText(value: string | undefined) {
  if (!value) return undefined;
  const match = value.replaceAll(",", "").match(/\d{3,6}/);
  if (!match) return undefined;

  const parsed = Number(match[0]);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function formatMoney(value: number) {
  return `${Math.round(value).toLocaleString("zh-CN")} 元`;
}

function formatMonthlyMoney(value: number) {
  return `${formatMoney(value)}/月`;
}

function formatHours(value: number) {
  return `${value.toFixed(value >= 10 ? 0 : 1)} 小时/月`;
}

function ComparisonValueLedger({ listings }: { listings: ComparisonListing[] }) {
  const costs = listings
    .map((item) => item.trueMonthlyCostValue)
    .filter((value): value is number => typeof value === "number");
  const commutes = listings
    .map((item) => item.commuteMinutes)
    .filter((value): value is number => typeof value === "number");
  const rents = listings
    .map((item) => parseMoneyText(item.rent))
    .filter((value): value is number => typeof value === "number");

  const costGap = costs.length >= 2 ? Math.max(...costs) - Math.min(...costs) : undefined;
  const commuteGapMinutes =
    commutes.length >= 2 ? Math.max(...commutes) - Math.min(...commutes) : undefined;
  const monthlyCommuteGapHours =
    typeof commuteGapMinutes === "number" ? (commuteGapMinutes * 2 * 22) / 60 : undefined;

  const blockedCount = listings.filter(
    (item) => item.gateLevel === "stop" || item.risk === "reject" || item.canPay === false,
  ).length;
  const blockerCount = listings.reduce(
    (sum, item) =>
      sum +
      (item.blockers?.length ?? 0) +
      (item.gateLevel && item.gateLevel !== "ready" ? 1 : 0),
    0,
  );
  const paymentExposure = listings.reduce((sum, item, index) => {
    const rent = parseMoneyText(item.rent) ?? rents[index] ?? 0;
    if (item.gateLevel === "stop" || item.risk === "reject" || item.canPay === false) {
      return sum + rent;
    }
    if (item.gateLevel === "review" || item.risk === "caution") {
      return sum + Math.round(rent * 0.5);
    }
    return sum;
  }, 0);

  const mostExpensive = [...listings]
    .filter((item) => typeof item.trueMonthlyCostValue === "number")
    .sort((a, b) => (b.trueMonthlyCostValue ?? 0) - (a.trueMonthlyCostValue ?? 0))[0];
  const slowest = [...listings]
    .filter((item) => typeof item.commuteMinutes === "number")
    .sort((a, b) => (b.commuteMinutes ?? 0) - (a.commuteMinutes ?? 0))[0];
  const mostBlocked =
    listings.find((item) => item.gateLevel === "stop" || item.canPay === false) ??
    listings.find((item) => item.blockers?.length) ??
    listings.find((item) => item.risk !== "recommend");

  const ledger = [
    {
      label: "月成本差距",
      value: typeof costGap === "number" ? formatMonthlyMoney(costGap) : "待补充真实月成本",
      detail:
        typeof costGap === "number"
          ? `最贵候选会让预算每年多承压约 ${formatMoney(costGap * 12)}。`
          : "真实月成本不足时，容易被低名义租金误导。",
      icon: WalletCards,
    },
    {
      label: "通勤时间差",
      value:
        typeof monthlyCommuteGapHours === "number"
          ? formatHours(monthlyCommuteGapHours)
          : "待补充通勤",
      detail:
        typeof commuteGapMinutes === "number"
          ? `最慢候选比最快候选单程多 ${commuteGapMinutes} 分钟，影响睡眠、晚归和恢复。`
          : "通勤信息补充前，不建议只按租金排序。",
      icon: Clock,
    },
    {
      label: "付款风险",
      value: paymentExposure ? formatMoney(paymentExposure) : "暂无明显风险",
      detail: blockedCount
        ? `${blockedCount} 套候选仍不适合直接付款，补充授权、收款主体或退款条件。`
        : "当前候选未触发明显付款风险，但仍要保留凭据。",
      icon: ShieldAlert,
    },
    {
      label: "签约前待确认事项",
      value: `${blockerCount} 项`,
      detail: blockerCount
        ? "这是付款或签约前必须确认的事。"
        : "当前对比样本没有明显待确认事项，可继续做最后确认。",
      icon: CheckCircle2,
    },
  ];

  return (
    <Card className="p-5">
      <div className="grid gap-5 xl:grid-cols-[0.34fr_0.66fr]">
        <div className="min-w-0">
          <p className="text-sm text-primary">
            对比依据
          </p>
          <h2 className="mt-2 text-xl font-semibold">这轮对比真正帮你看住什么</h2>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">
            这里展示选错房源可能多花的钱、耗掉的时间，以及需要提前确认的付款风险。
          </p>
          <div className="mt-4 rounded-md border border-amber-300/20 bg-amber-300/10 p-3 text-xs leading-5 text-amber-700">
            把待确认事项说清楚，再谈喜欢哪套。被催付款时，这张账本比“综合评分”更重要。
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {ledger.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.label} className="rounded-md border border-border bg-secondary/55 p-4">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-md bg-primary/15 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <p className="text-xs text-muted-foreground">{item.label}</p>
                <p className="mt-1 break-words text-xl font-semibold">{item.value}</p>
                <p className="mt-3 text-xs leading-5 text-muted-foreground">{item.detail}</p>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-4 grid gap-3 border-t border-border pt-4 md:grid-cols-3">
        <MiniDecision
          label="最贵预算"
          title={mostExpensive?.name ?? "待补充成本"}
          detail={mostExpensive?.monthlyCostDelta ?? "补充真实月成本后再判断。"}
        />
        <MiniDecision
          label="最耗时间"
          title={slowest?.name ?? "待补充通勤"}
          detail={slowest?.commuteDelta ?? "补充通勤后再判断。"}
        />
        <MiniDecision
          label="最该先确认"
          title={mostBlocked?.name ?? "暂无高风险候选"}
          detail={
            mostBlocked?.blockers?.[0] ??
            mostBlocked?.decisionSummary ??
            "当前没有明显待确认事项，继续保存签约前确认。"
          }
          href={mostBlocked?.nextActionHref ?? mostBlocked?.href}
        />
      </div>
    </Card>
  );
}

function MiniDecision({
  label,
  title,
  detail,
  href,
}: {
  label: string;
  title: string;
  detail: string;
  href?: string;
}) {
  const content = (
    <div className="rounded-md border border-border bg-secondary/60 p-3 transition-colors hover:bg-card">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-medium">{title}</p>
      <p className="mt-2 line-clamp-2 text-xs leading-5 text-muted-foreground">{detail}</p>
    </div>
  );

  return href ? <Link href={href}>{content}</Link> : content;
}

function ComparisonCompass({ listings }: { listings: ComparisonListing[] }) {
  const withCost = listings.filter(
    (item) => typeof item.trueMonthlyCostValue === "number",
  );
  const withCommute = listings.filter(
    (item) => typeof item.commuteMinutes === "number",
  );
  const cheapest = [...withCost].sort(
    (a, b) => (a.trueMonthlyCostValue ?? Infinity) - (b.trueMonthlyCostValue ?? Infinity),
  )[0];
  const fastest = [...withCommute].sort(
    (a, b) => (a.commuteMinutes ?? Infinity) - (b.commuteMinutes ?? Infinity),
  )[0];
  const safest =
    [...listings].sort((a, b) => {
      const gateDelta =
        (a.gateLevel === "ready" ? 0 : a.gateLevel === "review" ? 1 : 2) -
        (b.gateLevel === "ready" ? 0 : b.gateLevel === "review" ? 1 : 2);
      if (gateDelta !== 0) return gateDelta;
      return riskRank[a.risk] - riskRank[b.risk];
    })[0] ?? listings[0];
  const blocked =
    listings.find((item) => item.gateLevel === "stop" || item.risk === "reject") ??
    listings.find((item) => item.blockers?.length) ??
    listings[listings.length - 1];

  return (
    <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      <CompassTile
        icon={WalletCards}
        label="省钱优先"
        title={cheapest?.name ?? "待补充成本"}
        value={cheapest?.trueMonthlyCost ?? "补充真实月成本"}
        detail={cheapest?.decisionSummary ?? "真实月成本不足时，不建议只按名义租金排序。"}
      />
      <CompassTile
        icon={Clock}
        label="通勤优先"
        title={fastest?.name ?? "待补充通勤"}
        value={fastest?.commute ?? "补充通勤时间"}
        detail={fastest?.commuteDelta ?? "通勤信息待补充会直接影响睡眠、晚归和工作日恢复。"}
      />
      <CompassTile
        icon={ShieldCheck}
        label="签约前安全"
        title={safest?.name ?? "材料待确认"}
        value={safest?.gateLabel ?? "还没确认清楚"}
        detail={safest?.decisionSummary ?? "签约前材料还没确认清楚时，不能用低租金覆盖授权和付款风险。"}
      />
      <CompassTile
        icon={ShieldAlert}
        label="先确认"
        title={blocked?.name ?? "暂无高风险候选"}
        value={blocked?.nextActionLabel ?? "查看报告"}
        detail={blocked?.blockers?.[0] ?? blocked?.decisionSummary ?? "优先确认会影响付款或签约的项目。"}
        tone="warning"
      />
    </section>
  );
}

function CompassTile({
  icon: Icon,
  label,
  title,
  value,
  detail,
  tone = "default",
}: {
  icon: LucideIcon;
  label: string;
  title: string;
  value: string;
  detail: string;
  tone?: "default" | "warning";
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="mb-4 flex items-start justify-between gap-3">
        <span
          className={
            tone === "warning"
              ? "flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-amber-300/10 text-amber-700"
              : "flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/15 text-primary"
          }
        >
          <Icon className="h-5 w-5" />
        </span>
        <span className="rounded-full border border-border bg-secondary px-2.5 py-1 text-xs text-muted-foreground">
          {label}
        </span>
      </div>
      <h2 className="line-clamp-1 font-semibold">{title}</h2>
      <p className="mt-2 text-sm font-medium text-foreground">{value}</p>
      <p className="mt-2 line-clamp-3 text-xs leading-5 text-muted-foreground">{detail}</p>
    </div>
  );
}

function ComparisonDecisionStrip({
  listings,
  isReal,
}: {
  listings: ComparisonListing[];
  isReal: boolean;
}) {
  const top = listings[0];
  const backup = listings[1];
  const weakest = [...listings].sort((a, b) => a.score - b.score)[0];

  if (!top) return null;

  return (
    <section className="grid gap-4 lg:grid-cols-3">
      <Card className="min-w-0 p-5">
        <div className="mb-4 flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-primary" />
          <h2 className="font-semibold">当前第一选择</h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-lg font-semibold">{top.name}</h3>
          <RiskBadge status={top.risk} />
          <ConfidencePill listing={top} />
          <GatePill listing={top} />
        </div>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">{top.reason}</p>
        {top.decisionSummary ? (
          <p className="mt-2 rounded-md border border-primary/20 bg-primary/10 p-3 text-sm leading-6 text-primary">
            {top.decisionSummary}
          </p>
        ) : null}
        {top.tradeoff ? (
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {top.tradeoff}
          </p>
        ) : null}
        <InsightList title="为什么排第一" items={top.whyThisRank} />
        <InsightList title="你要放弃什么" items={top.giveUp} muted />
        <PaySignRow listing={top} />
        {top.href ? (
          <Button asChild variant="outline" className="mt-4 w-full">
            <Link href={top.href}>
              回看报告
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        ) : null}
      </Card>

      <Card className="min-w-0 p-5">
        <div className="mb-4 flex items-center gap-2">
          <GitCompareArrows className="h-5 w-5 text-primary" />
          <h2 className="font-semibold">备选判断</h2>
        </div>
        {backup ? (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-lg font-semibold">{backup.name}</h3>
              <RiskBadge status={backup.risk} />
              <ConfidencePill listing={backup} />
              <GatePill listing={backup} />
            </div>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">{backup.reason}</p>
            {backup.decisionSummary ? (
              <p className="mt-2 rounded-md border border-border bg-secondary/60 p-3 text-sm leading-6 text-muted-foreground">
                {backup.decisionSummary}
              </p>
            ) : null}
            {backup.tradeoff ? (
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {backup.tradeoff}
              </p>
            ) : null}
            <InsightList title="备选成立条件" items={backup.whyThisRank} />
            <InsightList title="主要代价" items={backup.giveUp} muted />
          </>
        ) : (
          <p className="text-sm leading-6 text-muted-foreground">
            {isReal
              ? "再保存一份候选房源评估后，可以看到备选和第一选择之间的真实取舍。"
              : "展示数据仅用于说明对比方式，对比真实房源前请先保存至少两份评估。"}
          </p>
        )}
        <Button asChild variant="outline" className="mt-4 w-full">
          <Link href="/analyze">
            新增候选房源
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </Card>

      <Card className="min-w-0 p-5">
        <div className="mb-4 flex items-center gap-2">
          <ShieldAlert className="h-5 w-5 text-amber-700" />
          <h2 className="font-semibold">先别忽略的风险</h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-lg font-semibold">{weakest.name}</h3>
          <RiskBadge status={weakest.risk} />
          <ConfidencePill listing={weakest} />
          <GatePill listing={weakest} />
        </div>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          {weakest.blockers?.[0] ?? weakest.reason}
        </p>
        <InsightList title="不要忽略" items={weakest.giveUp ?? weakest.blockers} muted />
        <Button asChild variant="outline" className="mt-4 w-full">
          <Link href={weakest.nextActionHref ?? weakest.href ?? "/payment"}>
            确认高风险项
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </Card>
    </section>
  );
}

function InsightList({
  title,
  items,
  muted,
}: {
  title: string;
  items?: string[];
  muted?: boolean;
}) {
  if (!items?.length) return null;

  return (
    <div className="mt-4">
      <p className="mb-2 text-xs text-muted-foreground">{title}</p>
      <div className="grid gap-2">
        {items.slice(0, 3).map((item) => (
          <p
            key={item}
            className={
              muted
                ? "rounded-md border border-border bg-secondary/60 p-2 text-xs leading-5 text-muted-foreground"
                : "rounded-md border border-primary/20 bg-primary/10 p-2 text-xs leading-5 text-primary"
            }
          >
            {item}
          </p>
        ))}
      </div>
    </div>
  );
}

function GatePill({ listing }: { listing: ComparisonListing }) {
  if (!listing.gateLevel || !listing.gateLabel) return null;

  const className =
    listing.gateLevel === "ready"
      ? "border-emerald-300/30 bg-emerald-300/10 text-emerald-700"
      : listing.gateLevel === "review"
        ? "border-amber-300/30 bg-amber-300/10 text-amber-700"
        : "border-rose-300/30 bg-rose-300/10 text-rose-700";

  return (
    <span className={`rounded-full border px-2.5 py-1 text-xs ${className}`}>
      {listing.gateLabel}
    </span>
  );
}

function ConfidencePill({ listing }: { listing: ComparisonListing }) {
  if (!listing.confidenceLevel || !listing.confidenceLabel) return null;

  const className =
    listing.confidenceLevel === "ready"
      ? "border-emerald-300/30 bg-emerald-300/10 text-emerald-700"
      : listing.confidenceLevel === "limited"
        ? "border-rose-300/30 bg-rose-300/10 text-rose-700"
        : "border-amber-300/30 bg-amber-300/10 text-amber-700";

  return (
    <span className={`rounded-full border px-2.5 py-1 text-xs ${className}`}>
      信息完整度 {listing.confidenceScore || "-"}%
    </span>
  );
}

function PaySignRow({ listing }: { listing: ComparisonListing }) {
  if (typeof listing.canPay !== "boolean" && typeof listing.canSign !== "boolean") {
    return null;
  }

  return (
    <div className="mt-4 grid grid-cols-2 gap-2">
      <div className="rounded-md border border-border bg-secondary/60 p-3">
        <p className="text-xs text-muted-foreground">付款</p>
        <p className={listing.canPay ? "mt-1 text-sm font-medium text-emerald-700" : "mt-1 text-sm font-medium text-rose-700"}>
          {listing.canPay ? "可付款" : "先别付款"}
        </p>
      </div>
      <div className="rounded-md border border-border bg-secondary/60 p-3">
        <p className="text-xs text-muted-foreground">签约</p>
        <p className={listing.canSign ? "mt-1 text-sm font-medium text-emerald-700" : "mt-1 text-sm font-medium text-rose-700"}>
          {listing.canSign ? "可签约" : "先别签约"}
        </p>
      </div>
    </div>
  );
}

