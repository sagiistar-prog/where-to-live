import Link from "next/link";
import { ArrowRight, ClipboardCheck, TrainFront } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { buildFlowHref, compactContext } from "@/lib/flow-links";
import type { AreaOption } from "@/lib/mock-data";

export function AreaOptionCard({
  area,
  reportId,
}: {
  area: AreaOption;
  reportId?: string;
}) {
  const planTone =
    area.viewingPlan?.level === "priority"
      ? "border-emerald-300/25 bg-emerald-300/10 text-emerald-900"
      : area.viewingPlan?.level === "pause"
        ? "border-rose-300/25 bg-rose-300/10 text-rose-900"
        : "border-amber-300/25 bg-amber-300/10 text-amber-900";

  return (
    <Card className="p-5">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <p className="text-xs text-muted-foreground">
            {area.city}
          </p>
          <h3 className="mt-1 text-xl font-semibold">{area.name}</h3>
        </div>
        <div className="text-right">
          <p className="text-3xl font-semibold">{area.score}</p>
          <p className="text-xs text-muted-foreground">适配分</p>
        </div>
      </div>
      <Progress value={area.score} />
      {area.tags?.length ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {area.tags.map((tag) => (
            <Badge key={tag} variant="secondary">
              {tag}
            </Badge>
          ))}
        </div>
      ) : null}
      {area.viewingPlan ? (
        <div className={`mt-4 rounded-md border p-3 ${planTone}`}>
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold">{area.viewingPlan.label}</p>
            <span className="rounded-full border border-border bg-secondary/60 px-2 py-0.5 text-[11px] text-current/75">
              看房安排
            </span>
          </div>
          <p className="mt-2 text-xs leading-5 text-current/80">
            {area.viewingPlan.reason}
          </p>
          <p className="mt-2 text-xs leading-5 text-current/80">
            {area.viewingPlan.visitWindow}
          </p>
        </div>
      ) : null}
      <div className="mt-5 grid gap-3 text-sm">
        <InfoRow label="租金" value={area.rentRange} />
        <InfoRow label="通勤" value={area.commute} />
        <InfoRow label="生活" value={area.lifeRadius} />
        <InfoRow label="风险" value={area.risk} />
      </div>
      <p className="mt-5 rounded-md border border-border bg-secondary p-3 text-sm leading-6 text-muted-foreground">
        {area.fit}
      </p>
      {area.viewingPlan?.verify.length ? (
        <div className="mt-4 space-y-2 rounded-md border border-border bg-secondary p-3">
          <p className="text-xs text-muted-foreground">
            现场确认
          </p>
          {area.viewingPlan.verify.map((item) => (
            <p key={item} className="text-xs leading-5 text-muted-foreground">
              {item}
            </p>
          ))}
          <p className="border-t border-border pt-2 text-xs leading-5 text-muted-foreground">
            {area.viewingPlan.stopRule}
          </p>
        </div>
      ) : null}
      {area.evidence?.length ? (
        <div className="mt-4 space-y-2 border-t border-border pt-4">
          <p className="text-xs text-muted-foreground">
            判断理由
          </p>
          {area.evidence.map((item) => (
            <p key={item} className="text-xs leading-5 text-muted-foreground">
              {item}
            </p>
          ))}
        </div>
      ) : null}
      <div className="mt-4 grid gap-2 border-t border-border pt-4 sm:grid-cols-3">
        <Button asChild className="w-full" size="sm">
          <Link href={visitHref(area, reportId)}>
            <ClipboardCheck className="mr-2 h-4 w-4" />
            整理看房清单
          </Link>
        </Button>
        <Button asChild className="w-full" variant="secondary" size="sm">
          <Link href={commuteHref(area, reportId)}>
            <TrainFront className="mr-2 h-4 w-4" />
            测通勤成本
          </Link>
        </Button>
        <Button asChild className="w-full" variant="secondary" size="sm">
          <Link href={analyzeHref(area, reportId)}>
            房源评估
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>
    </Card>
  );
}

function areaReportContext(area: AreaOption) {
  return compactContext([
    `片区筛选：${area.name}`,
    `租金区间：${area.rentRange}`,
    `通勤判断：${area.commute}`,
    `生活配套：${area.lifeRadius}`,
    `风险提示：${area.risk}`,
    area.viewingPlan ? `看房安排：${area.viewingPlan.label}。${area.viewingPlan.reason}` : "",
    area.viewingPlan ? `现场确认：${area.viewingPlan.verify.join("；")}` : "",
    area.viewingPlan ? `先不约看的情况：${area.viewingPlan.stopRule}` : "",
  ]);
}

function visitHref(area: AreaOption, reportId?: string) {
  return buildFlowHref("/visit", {
    reportId,
    from: "area",
    title: `${area.name} 片区看房清单`,
    city: area.city,
    address: area.name,
    commute: area.commute,
    description: `${area.name}：${area.risk}。${area.lifeRadius}。${area.fit}`,
    reportContext: areaReportContext(area),
    auto: "1",
  });
}

function commuteHref(area: AreaOption, reportId?: string) {
  return buildFlowHref("/commute", {
    reportId,
    from: "area",
    city: area.city,
    listingTitle: `${area.name} 候选房源`,
    address: area.name,
    monthlyRent: area.rentRange,
    oneWayMinutes: area.commuteMinutes,
    reportContext: areaReportContext(area),
  });
}

function analyzeHref(area: AreaOption, reportId?: string) {
  return buildFlowHref("/analyze", {
    reportId,
    from: "area",
    city: area.city,
    title: `${area.name} 候选房源`,
    address: area.name,
    description: `${area.name}：${area.risk}。${area.lifeRadius}。${area.fit}`,
    reportContext: areaReportContext(area),
  });
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className="text-right text-foreground/90">{value}</span>
    </div>
  );
}

