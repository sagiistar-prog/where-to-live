"use client";

import Link from "next/link";
import {
  AlertTriangle,
  Clock3,
  Copy,
  LayoutDashboard,
  MapPin,
  Route,
  ShieldAlert,
  TrainFront,
  Umbrella,
  WalletCards,
  type LucideIcon,
} from "lucide-react";
import { RiskBadge } from "@/components/risk-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type {
  CommuteCostInput,
  CommuteCostResult,
  CommuteRiskItem,
  CommuteRiskLevel,
} from "@/lib/commute-cost";

type CommuteQualitySignal = NonNullable<CommuteCostResult["dataQuality"]>[number];

const levelVariant: Record<CommuteRiskLevel, "destructive" | "warning" | "success"> = {
  高: "destructive",
  中: "warning",
  低: "success",
};

export function formatMoney(value: number) {
  return `${Math.round(value).toLocaleString()} 元`;
}

export function formatHours(value: number) {
  return `${value.toFixed(1)} 小时`;
}

function formatDays(value: number) {
  return `${value.toFixed(1)} 天`;
}

function qualityVariant(
  status: CommuteQualitySignal["status"],
): "success" | "warning" | "destructive" {
  if (status === "live") return "success";
  if (status === "failed" || status === "skipped_limit") return "destructive";
  return "warning";
}

function optionalLine(label: string, value: string | number | undefined) {
  if (value === undefined || value === "") return "";
  return `${label}${value}`;
}

export function buildCommuteFieldPack(result: CommuteCostResult, input?: CommuteCostInput | null) {
  const listingTitle = input?.listingTitle?.trim() || "当前候选房源";
  const city = input?.city?.trim() || "待确认城市";
  const workplace = input?.workplace?.trim() || "待确认工作地";
  const highPriorityChecks = result.fieldChecks.map((item, index) => `${index + 1}. ${item}`);
  const blockers = result.blockers.map((item, index) => `${index + 1}. ${item}`);
  const levers = result.negotiationLevers.map((item, index) => `${index + 1}. ${item}`);
  const nextActions = result.nextActions.map((item, index) => `${index + 1}. ${item}`);

  return [
    "住哪儿｜通勤现场确认清单",
    "",
    `房源：${listingTitle}`,
    `城市：${city}`,
    `工作地：${workplace}`,
    optionalLine("当前月租：", input?.monthlyRent ? formatMoney(input.monthlyRent) : undefined),
    optionalLine("单程通勤：", input?.oneWayMinutes ? `${input.oneWayMinutes} 分钟` : undefined),
    optionalLine(
      "通勤上限：",
      input?.commuteLimitMinutes ? `${input.commuteLimitMinutes} 分钟` : undefined,
    ),
    "",
    `结论：${result.verdict}`,
    result.summary,
    `每月通勤：${formatHours(result.monthlyCommuteHours)}；真实月成本：${formatMoney(result.trueMonthlyCost)}；通勤评分：${result.score}`,
    "",
    "一、今天现场必须确认",
    ...highPriorityChecks,
    "",
    "二、需要再次确认的情况",
    ...blockers,
    "",
    "三、可用于沟通/谈判的理由",
    ...levers,
    "",
    "四、后续确认",
    ...nextActions,
    "",
    "使用边界：这份文本只基于当前录入和可用路线信息，签约或付款前仍需用早晚高峰、晚归和雨天场景现场复测。",
  ]
    .filter(Boolean)
    .join("\n");
}

export function CommuteCostResultView({
  result,
  lastInput,
  copiedPack,
  rentTradeoffText,
  areaHref,
  compareHref,
  analyzeHref,
  onCopyPack,
}: {
  result: CommuteCostResult;
  lastInput: CommuteCostInput | null;
  copiedPack: boolean;
  rentTradeoffText: string;
  areaHref: string;
  compareHref: string;
  analyzeHref: string;
  onCopyPack: () => void;
}) {
  return (
    <>
      <Card className="min-w-0 p-6">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm text-primary/80">通勤结论</p>
            <h2 className="mt-2 text-2xl font-semibold">通勤结论</h2>
          </div>
          <RiskBadge status={result.status} tone="generic" />
        </div>
        <div className="space-y-5">
          <div>
            <h3 className="text-xl font-semibold">{result.verdict}</h3>
            <p className="mt-2 text-sm leading-7 text-muted-foreground">{result.summary}</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <SummaryTile icon={Clock3} label="每月通勤" value={formatHours(result.monthlyCommuteHours)} />
            <SummaryTile icon={Umbrella} label="年度折算" value={formatDays(result.yearlyCommuteDays)} />
            <SummaryTile icon={WalletCards} label="真实月成本" value={formatMoney(result.trueMonthlyCost)} />
          </div>
          <div className="rounded-md border border-border bg-secondary p-4">
            <div className="mb-3 flex items-center justify-between gap-4">
              <p className="text-sm font-medium">通勤可承受评分</p>
              <p className="text-2xl font-semibold">{result.score}</p>
            </div>
            <Progress value={result.score} />
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              直接通勤现金 {formatMoney(result.directMonthlyCost)}，时间机会成本约{" "}
              {formatMoney(result.hiddenTimeValue)}；{rentTradeoffText}。
            </p>
          </div>
          {result.routeEvidence ? (
            <div className="rounded-md border border-border bg-secondary p-4">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <Badge variant={result.routeEvidence.source === "amap" ? "success" : "warning"}>
                  {result.routeEvidence.source === "amap" ? "实时路线" : "手动输入"}
                </Badge>
                <h3 className="font-semibold">路线依据</h3>
              </div>
              <p className="text-sm leading-6 text-muted-foreground">{result.routeEvidence.detail}</p>
              {result.routeEvidence.origin || result.routeEvidence.destination ? (
                <p className="mt-2 text-xs leading-5 text-muted-foreground">
                  {result.routeEvidence.origin ?? "房源起点未解析"} →{" "}
                  {result.routeEvidence.destination ?? "工作终点未解析"}
                </p>
              ) : null}
            </div>
          ) : null}
          {result.dataQuality?.length ? (
            <div className="grid gap-2">
              {result.dataQuality.map((item) => (
                <div key={`${item.feature}-${item.label}`} className="rounded-md border border-border bg-secondary p-3">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <Badge variant={qualityVariant(item.status)}>{item.label}</Badge>
                    <p className="text-xs text-muted-foreground">{item.feature}</p>
                  </div>
                  <p className="text-xs leading-5 text-muted-foreground">{item.detail}</p>
                </div>
              ))}
            </div>
          ) : null}
          <div className="rounded-md border border-amber-300/20 bg-amber-300/10 p-4">
            <div className="mb-3 flex items-center gap-2 text-amber-700">
              <ShieldAlert className="h-4 w-4" />
              <h3 className="font-semibold">通勤待确认事项</h3>
            </div>
            <div className="grid gap-2 text-sm leading-6 text-amber-900/90">
              {result.blockers.map((item) => (
                <p key={item}>{item}</p>
              ))}
            </div>
          </div>

          <details className="rounded-md border border-border bg-secondary/55 p-4">
            <summary className="cursor-pointer text-sm font-medium text-foreground">
              查看通勤现场确认清单
            </summary>
            <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <p className="text-sm leading-6 text-muted-foreground">
                用于看房当天核对早晚高峰、晚归路线、雨天路线和付款前需要确认的事项。
              </p>
              <Button type="button" variant="outline" onClick={onCopyPack}>
                <Copy className="mr-2 h-4 w-4" />
                {copiedPack ? "已复制" : "复制文本"}
              </Button>
            </div>
            <pre className="mt-4 max-h-[320px] overflow-auto whitespace-pre-wrap rounded-md border border-border bg-card p-4 text-sm leading-7 text-muted-foreground">
              {buildCommuteFieldPack(result, lastInput)}
            </pre>
          </details>
        </div>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[0.64fr_0.36fr]">
        <Card className="min-w-0 p-6">
          <div className="mb-5 flex items-center gap-2">
            <TrainFront className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold">租金与通勤取舍</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-[760px] text-left text-sm">
              <thead className="text-muted-foreground">
                <tr className="border-b border-border">
                  <th className="px-4 py-3 font-medium">方案</th>
                  <th className="px-4 py-3 font-medium">月租</th>
                  <th className="px-4 py-3 font-medium">单程</th>
                  <th className="px-4 py-3 font-medium">月通勤</th>
                  <th className="px-4 py-3 font-medium">直接成本</th>
                  <th className="px-4 py-3 font-medium">结论</th>
                </tr>
              </thead>
              <tbody>
                {result.scenarios.map((item) => (
                  <tr key={item.label} className="border-b border-border last:border-b-0">
                    <td className="px-4 py-4 font-medium">{item.label}</td>
                    <td className="px-4 py-4">{formatMoney(item.monthlyRent)}</td>
                    <td className="px-4 py-4">{item.oneWayMinutes} 分钟</td>
                    <td className="px-4 py-4">{formatHours(item.monthlyTimeHours)}</td>
                    <td className="px-4 py-4">{formatMoney(item.directMonthlyCost)}</td>
                    <td className="px-4 py-4 text-muted-foreground">{item.verdict}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <div className="space-y-4">
          <InfoPanel title="现场实测清单" icon={MapPin}>
            <ul className="grid gap-2 text-sm leading-6 text-muted-foreground">
              {result.fieldChecks.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </InfoPanel>

          <InfoPanel title="可协商事项" icon={WalletCards}>
            <ul className="grid gap-2 text-sm leading-6 text-muted-foreground">
              {result.negotiationLevers.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </InfoPanel>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[0.58fr_0.42fr]">
        <Card className="min-w-0 p-6">
          <div className="mb-5 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold">通勤风险拆解</h2>
          </div>
          <div className="grid gap-3">
            {result.riskItems.map((item) => (
              <RiskRow key={item.title} item={item} />
            ))}
          </div>
        </Card>

        <InfoPanel title="后续确认" icon={Route}>
          <div className="grid gap-3">
            {result.nextActions.map((item) => (
              <p key={item} className="rounded-md border border-border bg-secondary p-3 text-sm leading-6 text-muted-foreground">
                {item}
              </p>
            ))}
            <div className="grid gap-3 sm:grid-cols-2">
              <Button asChild variant="outline">
                <Link href="/dashboard">
                  <LayoutDashboard className="mr-2 h-4 w-4" />
                  回到工作台
                </Link>
              </Button>
              <Button asChild variant="secondary">
                <Link href={areaHref}>继续筛片区</Link>
              </Button>
              <Button asChild variant="secondary">
                <Link href={compareHref}>加入对比</Link>
              </Button>
              <Button asChild>
                <Link href={analyzeHref}>房源体检</Link>
              </Button>
            </div>
          </div>
        </InfoPanel>
      </div>
    </>
  );
}

function SummaryTile({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-md border border-border bg-secondary p-4">
      <Icon className="mb-3 h-4 w-4 text-primary" />
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 break-words text-lg font-semibold">{value}</p>
    </div>
  );
}

function RiskRow({ item }: { item: CommuteRiskItem }) {
  return (
    <div className="rounded-md border border-border bg-secondary p-4">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Badge variant={levelVariant[item.level]}>{item.level}风险</Badge>
        <h3 className="font-semibold">{item.title}</h3>
      </div>
      <p className="text-sm leading-6 text-muted-foreground">{item.why}</p>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">建议：{item.action}</p>
    </div>
  );
}

function InfoPanel({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: LucideIcon;
  children: React.ReactNode;
}) {
  return (
    <Card className="min-w-0 p-5">
      <div className="mb-4 flex items-center gap-2">
        <Icon className="h-4 w-4 text-primary" />
        <h3 className="font-semibold">{title}</h3>
      </div>
      {children}
    </Card>
  );
}
