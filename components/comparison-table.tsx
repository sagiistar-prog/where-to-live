import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { RiskBadge } from "@/components/risk-badge";
import type { ComparisonListing } from "@/lib/mock-data";

export function ComparisonTable({
  listings,
  focusId,
}: {
  listings: ComparisonListing[];
  focusId?: string;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1440px] text-left text-sm">
          <thead className="border-b border-border bg-secondary text-xs text-muted-foreground">
            <tr>
              <th className="px-5 py-4">推荐</th>
              <th className="px-5 py-4">房源</th>
              <th className="px-5 py-4">租金</th>
              <th className="px-5 py-4">真实月成本</th>
              <th className="px-5 py-4">成本差</th>
              <th className="px-5 py-4">面积</th>
              <th className="px-5 py-4">通勤</th>
              <th className="px-5 py-4">通勤差</th>
              <th className="px-5 py-4">配套</th>
              <th className="px-5 py-4">风险</th>
              <th className="px-5 py-4">信息是否够用</th>
              <th className="px-5 py-4">签约前确认</th>
              <th className="px-5 py-4">评分</th>
              <th className="px-5 py-4">推荐理由</th>
              <th className="px-5 py-4">下一步</th>
            </tr>
          </thead>
          <tbody>
            {listings.map((listing) => {
              const isFocused = Boolean(focusId && listing.id === focusId);

              return (
              <tr
                key={listing.id ?? listing.name}
                className={
                  isFocused
                    ? "border-b border-primary/25 bg-primary/10 last:border-0"
                    : "border-b border-border last:border-0"
                }
              >
                <td className="px-5 py-5">
                  <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/15 font-semibold text-primary">
                    {listing.rank}
                  </span>
                </td>
                <td className="px-5 py-5 font-medium text-foreground">
                  <div className="space-y-1">
                    {listing.href ? (
                      <Link
                        href={listing.href}
                        className="inline-flex items-center gap-1 transition-colors hover:text-primary"
                      >
                        {listing.name}
                        <ArrowUpRight className="h-3.5 w-3.5" />
                      </Link>
                    ) : (
                      listing.name
                    )}
                    {listing.source ? (
                      <p className="text-xs font-normal text-muted-foreground">
                        {listing.source}
                        {isFocused ? " · 当前关注" : ""}
                      </p>
                    ) : null}
                  </div>
                </td>
                <td className="px-5 py-5 text-muted-foreground">{listing.rent}</td>
                <td className="px-5 py-5 text-muted-foreground">
                  {listing.trueMonthlyCost}
                </td>
                <td className="max-w-[180px] px-5 py-5 text-xs leading-5 text-muted-foreground">
                  {listing.monthlyCostDelta ?? "待补充"}
                </td>
                <td className="px-5 py-5 text-muted-foreground">{listing.area}</td>
                <td className="px-5 py-5 text-muted-foreground">{listing.commute}</td>
                <td className="max-w-[200px] px-5 py-5 text-xs leading-5 text-muted-foreground">
                  {listing.commuteDelta ?? "待补充"}
                </td>
                <td className="px-5 py-5 text-muted-foreground">{listing.amenities}</td>
                <td className="px-5 py-5">
                  <RiskBadge status={listing.risk} />
                </td>
                <td className="px-5 py-5">
                  <ConfidenceCell listing={listing} />
                </td>
                <td className="px-5 py-5">
                  <GateCell listing={listing} />
                </td>
                <td className="px-5 py-5 text-2xl font-semibold">{listing.score}</td>
                <td className="max-w-[260px] px-5 py-5 leading-6 text-muted-foreground">
                  <p>{listing.reason}</p>
                  {listing.tradeoff ? (
                    <p className="mt-2 text-xs leading-5 text-muted-foreground/80">
                      {listing.tradeoff}
                    </p>
                  ) : null}
                  {listing.decisionSummary ? (
                    <p className="mt-2 rounded-md border border-border bg-secondary/60 p-2 text-xs leading-5 text-muted-foreground">
                      {listing.decisionSummary}
                    </p>
                  ) : null}
                </td>
                <td className="px-5 py-5">
                  {listing.nextActionHref && listing.nextActionLabel ? (
                    <Button asChild variant="secondary" size="sm">
                      <Link href={listing.nextActionHref}>
                        {listing.nextActionLabel}
                        <ArrowUpRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  ) : listing.href ? (
                    <Button asChild variant="secondary" size="sm">
                      <Link href={listing.href}>
                        回看报告
                        <ArrowUpRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  ) : (
                    <span className="text-xs text-muted-foreground">先评估房源</span>
                  )}
                </td>
              </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="flex flex-col gap-3 border-t border-border p-5 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          对比结论优先看综合约束，不只看租金最低。
        </p>
        <Button asChild>
          <Link href="/analyze">
            新增房源
            <ArrowUpRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>
    </div>
  );
}

function GateCell({ listing }: { listing: ComparisonListing }) {
  if (!listing.gateLevel || !listing.gateLabel) {
    return <span className="text-xs text-muted-foreground">展示数据</span>;
  }

  const className =
    listing.gateLevel === "ready"
      ? "border-emerald-300/30 bg-emerald-300/10 text-emerald-700"
      : listing.gateLevel === "review"
        ? "border-amber-300/30 bg-amber-300/10 text-amber-700"
        : "border-rose-300/30 bg-rose-300/10 text-rose-700";

  return (
    <div className="space-y-2">
      <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs ${className}`}>
        {listing.gateLabel}
      </span>
      {typeof listing.gateProgress === "number" ? (
        <p className="text-xs text-muted-foreground">
          确认 {listing.gateProgress}% · {listing.canPay ? "可付款" : "先别付款"} · {listing.canSign ? "可签约" : "先别签约"}
        </p>
      ) : null}
    </div>
  );
}

function ConfidenceCell({ listing }: { listing: ComparisonListing }) {
  if (!listing.confidenceLevel || !listing.confidenceLabel) {
    return <span className="text-xs text-muted-foreground">展示数据</span>;
  }

  const className =
    listing.confidenceLevel === "ready"
      ? "border-emerald-300/30 bg-emerald-300/10 text-emerald-700"
      : listing.confidenceLevel === "limited"
        ? "border-rose-300/30 bg-rose-300/10 text-rose-700"
        : "border-amber-300/30 bg-amber-300/10 text-amber-700";

  return (
    <div className="max-w-[220px] space-y-2">
      <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs ${className}`}>
        {listing.confidenceLabel}
        {typeof listing.confidenceScore === "number" ? ` ${listing.confidenceScore}%` : ""}
      </span>
      {listing.confidenceGaps?.length ? (
        <p className="text-xs leading-5 text-muted-foreground">
          {listing.confidenceGaps[0]}
        </p>
      ) : listing.confidenceSummary ? (
        <p className="text-xs leading-5 text-muted-foreground">
          {listing.confidenceSummary}
        </p>
      ) : null}
    </div>
  );
}

