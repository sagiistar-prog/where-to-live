import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Clock,
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
import type { ComparisonListing } from "@/lib/mock-data";
import { listCaseEvents } from "@/lib/server/case-event-store";
import { getCurrentOwnerId } from "@/lib/server/current-owner";
import { listReports } from "@/lib/server/report-store";

export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;

const sourceLabels: Record<string, string> = {
  renewal: "已从续租方案带入",
  case: "已从房源记录带入",
  report: "已从报告带入",
  commute: "已从通勤成本带入",
  analyze: "已从房源体检带入",
  compare: "已从多房源对比带入",
  home: "已从首页输入带入",
  dashboard: "已从工作台输入带入",
};

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
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
  const focusListing = reportId ? realListings.find((item) => item.id === reportId) : undefined;
  const focusedTitle =
    focusListing?.name ||
    firstParam(params.currentTitle) ||
    firstParam(params.title);
  const sourceLabel = source ? sourceLabels[source] : undefined;
  const hasEnoughReports = realListings.length >= 2;

  return (
    <AppShell>
      <div className="mx-auto max-w-7xl space-y-7">
        <section className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div>
            <p className="text-sm text-primary">多房源对比</p>
            <h1 className="mt-3 text-3xl font-semibold sm:text-4xl">
              把候选房源放在同一张表里判断
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground">
              同时比较租金、真实月成本、通勤、付款风险和签约前确认事项。真实报告不足时，可以用快速表单补齐候选。
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild variant="secondary">
              <Link href="/dashboard">回到工作台</Link>
            </Button>
            <Button asChild>
              <Link href="/analyze">
                新增候选房源
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </section>

        <FocusedComparisonContext
          focusListing={focusListing}
          focusedTitle={focusedTitle}
          sourceLabel={sourceLabel}
          hasEnoughReports={hasEnoughReports}
        />

        {hasEnoughReports ? (
          <>
            <ComparisonDecisionWorkspace
              listings={realListings}
              activeListing={focusListing ?? realListings[0]}
            />
            <ComparisonValueLedger listings={realListings} />
            <ComparisonDecisionMemo listings={realListings} comparisonMode="real" />
            <ComparisonTable listings={realListings} focusId={reportId} />
          </>
        ) : (
          <>
            <InsufficientComparisonPanel
              reportCount={realListings.length}
              savedListing={focusListing ?? realListings[0]}
            />
            <ManualComparisonBuilder />
          </>
        )}
      </div>
    </AppShell>
  );
}

function InsufficientComparisonPanel({
  reportCount,
  savedListing,
}: {
  reportCount: number;
  savedListing?: ComparisonListing;
}) {
  return (
    <section className="rounded-lg border border-border bg-card p-5">
      <div className="grid gap-5 lg:grid-cols-[0.42fr_0.58fr]">
        <div className="min-w-0">
          <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-md bg-amber-300/10 text-amber-700">
            <ShieldAlert className="h-5 w-5" />
          </div>
          <p className="text-sm text-primary">候选不足</p>
          <h2 className="mt-2 text-xl font-semibold">
            {reportCount ? "还差一套候选，才能做正式对比" : "补两套候选，再做正式对比"}
          </h2>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">
            正式对比只使用你保存过的真实评估。也可以在下方表单填写手上的候选，快速判断哪套值得继续做完整体检。
          </p>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row lg:flex-col xl:flex-row">
            <Button asChild>
              <Link href="/analyze">
                评估一套真实房源
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href="#quick-compare">填写快速对比</Link>
            </Button>
          </div>
        </div>

        {savedListing ? (
          <SavedListingReference listing={savedListing} />
        ) : (
          <div className="rounded-lg border border-border bg-secondary/60 p-4">
            <p className="text-sm font-semibold">当前还没有保存的评估报告</p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              可以用快速表单比较候选，再把值得继续看的那套转成完整体检。
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

function SavedListingReference({ listing }: { listing: ComparisonListing }) {
  return (
    <div className="rounded-lg border border-border bg-secondary/60 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <RiskBadge status={listing.risk} />
        <ConfidencePill listing={listing} />
        <GatePill listing={listing} />
      </div>
      <h3 className="mt-3 text-lg font-semibold">{listing.name}</h3>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        {listing.decisionSummary ?? listing.reason}
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <CompareFact label="真实月成本" value={listing.trueMonthlyCost} />
        <CompareFact label="通勤" value={listing.commute} />
        <CompareFact label="签约前确认" value={listing.gateLabel ?? "待补充"} />
      </div>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        {listing.href ? (
          <Button asChild variant="secondary" size="sm">
            <Link href={listing.href}>回看报告</Link>
          </Button>
        ) : null}
        <Button asChild variant="outline" size="sm">
          <Link href="/analyze">补第二套候选</Link>
        </Button>
      </div>
    </div>
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
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <p className="text-sm text-primary">当前上下文</p>
          <h2 className="mt-2 text-xl font-semibold">
            {focusedTitle ? `围绕「${focusedTitle}」继续判断` : "承接上一轮结果"}
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
            {sourceLabel ? `${sourceLabel}。` : ""}
            {hasEnoughReports
              ? "对比会按真实报告、月成本、通勤和签约前确认排序。"
              : "真实报告不足时，先补候选，不生成正式排名。"}
          </p>
        </div>
        {focusListing?.href ? (
          <Button asChild variant="secondary" className="shrink-0">
            <Link href={focusListing.href}>回看当前报告</Link>
          </Button>
        ) : null}
      </div>
    </section>
  );
}

function buildCompareFocusHref(listing: ComparisonListing) {
  if (!listing.id) return "/compare";
  return `/compare?reportId=${encodeURIComponent(listing.id)}`;
}

function listingDecisionTone(listing: ComparisonListing) {
  if (listing.gateLevel === "stop" || listing.risk === "reject" || listing.canPay === false) {
    return {
      label: "先暂停",
      className: "border-rose-200 bg-rose-50 text-rose-700",
    };
  }
  if (listing.gateLevel === "review" || listing.risk === "caution") {
    return {
      label: "补充确认",
      className: "border-amber-200 bg-amber-50 text-amber-700",
    };
  }
  return {
    label: "可以继续比较",
    className: "border-primary/25 bg-primary/10 text-primary",
  };
}

function workspaceHeadline(listing: ComparisonListing) {
  if (listing.rank === 1) return "当前第一选择";
  if (listing.gateLevel === "stop" || listing.risk === "reject") return "先处理风险，再决定是否保留";
  return "作为备选继续比较";
}

function ComparisonDecisionWorkspace({
  listings,
  activeListing,
}: {
  listings: ComparisonListing[];
  activeListing?: ComparisonListing;
}) {
  if (!activeListing) return null;

  const activeTone = listingDecisionTone(activeListing);
  const activeBlockers = [
    ...(activeListing.blockers ?? []),
    ...(activeListing.confidenceGaps ?? []).map((item) => `信息待补充：${item}`),
    ...(activeListing.giveUp ?? []),
  ].filter(Boolean).slice(0, 4);

  return (
    <section
      id="compare-workspace"
      className="grid gap-4 rounded-lg border border-border bg-card/80 p-4 shadow-[0_24px_80px_oklch(var(--foreground)/0.07)] lg:grid-cols-[320px_minmax(0,1fr)]"
    >
      <aside className="rounded-lg border border-border bg-secondary/55 p-3">
        <div className="mb-3 flex items-center justify-between gap-3 px-1">
          <div>
            <p className="text-xs text-primary">候选顺序</p>
            <h2 className="mt-1 text-lg font-semibold">先比较哪一套</h2>
          </div>
          <span className="rounded-full border border-border bg-card px-2.5 py-1 text-xs text-muted-foreground">
            {listings.length} 套
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
                      {listing.trueMonthlyCost}，{listing.commute}
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

      <div className="min-w-0 rounded-lg border border-border bg-[oklch(0.955_0.006_155)] p-5">
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <RiskBadge status={activeListing.risk} />
              <ConfidencePill listing={activeListing} />
              <GatePill listing={activeListing} />
              <span className={`rounded-full border px-2.5 py-1 text-xs ${activeTone.className}`}>
                {activeTone.label}
              </span>
            </div>

            <h2 className="mt-3 text-3xl font-semibold">{activeListing.name}</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
              {activeListing.decisionSummary ?? activeListing.reason}
            </p>

            <div className="mt-5 rounded-lg border border-border bg-card/72 p-4 shadow-[0_18px_56px_oklch(var(--foreground)/0.06)]">
              <p className="text-xs text-primary">当前结论</p>
              <h3 className="mt-2 text-xl font-semibold">
                {workspaceHeadline(activeListing)}
              </h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {activeListing.tradeoff || activeListing.reason}
              </p>
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <CompareFact label="成本取舍" value={activeListing.monthlyCostDelta ?? "真实月成本待补充"} />
                <CompareFact label="通勤取舍" value={activeListing.commuteDelta ?? "通勤差额待补充"} />
                <CompareFact
                  label="选择标准"
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
                value={activeListing.gateLabel ?? "待补充"}
                detail={`${activeListing.canPay ? "可付款" : "不建议付款"}，${activeListing.canSign ? "可签约" : "不建议签约"}`}
                danger={activeListing.canPay === false || activeListing.canSign === false}
              />
            </div>
          </div>

          <aside className="grid min-w-0 gap-3">
            <div className="rounded-lg border border-border bg-card/72 p-4">
              <div className="mb-3 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold">排序依据</h3>
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
                <h3 className="text-sm font-semibold">继续前确认</h3>
              </div>
              <div className="grid gap-2">
                {(activeBlockers.length ? activeBlockers : ["付款前仍要确认授权、收款主体、押金、退款条件和合同版本。"]).map((item) => (
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

  const ledger = [
    {
      label: "月成本差距",
      value: typeof costGap === "number" ? formatMonthlyMoney(costGap) : "待补充",
      detail:
        typeof costGap === "number"
          ? `最贵候选每年约多支出 ${formatMoney(costGap * 12)}。`
          : "补齐月租和固定支出后再比较。",
      icon: WalletCards,
    },
    {
      label: "通勤时间差",
      value:
        typeof monthlyCommuteGapHours === "number"
          ? formatHours(monthlyCommuteGapHours)
          : "待补充",
      detail:
        typeof commuteGapMinutes === "number"
          ? `最慢候选比最快候选单程多 ${commuteGapMinutes} 分钟。`
          : "补齐通勤后再判断时间成本。",
      icon: Clock,
    },
    {
      label: "付款风险",
      value: paymentExposure ? formatMoney(paymentExposure) : "暂无明显风险",
      detail: blockedCount
        ? `${blockedCount} 套候选不适合直接付款。`
        : "仍需保留收款、合同和沟通记录。",
      icon: ShieldAlert,
    },
    {
      label: "签约前确认",
      value: `${blockerCount} 项`,
      detail: blockerCount
        ? "这些事项会影响付款或签约。"
        : "当前没有明显待确认事项，仍需做最后核对。",
      icon: CheckCircle2,
    },
  ];

  return (
    <Card className="p-5">
      <div className="grid gap-5 lg:grid-cols-[0.3fr_0.7fr]">
        <div className="min-w-0">
          <p className="text-sm text-primary">关键差异</p>
          <h2 className="mt-2 text-xl font-semibold">只看会影响决定的差距</h2>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">
            优先比较钱、时间、付款风险和签约前确认，避免被无关信息干扰。
          </p>
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
    </Card>
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
