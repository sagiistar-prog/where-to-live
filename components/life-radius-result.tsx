"use client";

import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Copy,
  LayoutDashboard,
  MapPin,
  PackageCheck,
  Route,
  ShieldAlert,
  WalletCards,
  type LucideIcon,
} from "lucide-react";
import { RiskBadge } from "@/components/risk-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type {
  LifeRadiusInput,
  LifeRadiusResult,
  LifeRiskItem,
  LifeRiskLevel,
} from "@/lib/life-radius";

type LifeQualitySignal = NonNullable<LifeRadiusResult["dataQuality"]>[number];

const levelVariant: Record<LifeRiskLevel, "destructive" | "warning" | "success"> = {
  高: "destructive",
  中: "warning",
  低: "success",
};

function qualityVariant(status: LifeQualitySignal["status"]): "success" | "warning" | "destructive" {
  if (status === "live") return "success";
  if (status === "failed" || status === "skipped_limit") return "destructive";
  return "warning";
}

function optionalLine(label: string, value: string | number | undefined) {
  if (value === undefined || value === "") return "";
  return `${label}${value}`;
}

export function buildLifeFieldPack(result: LifeRadiusResult, input?: LifeRadiusInput | null) {
  const listingTitle = input?.listingTitle?.trim() || "当前候选房源";
  const city = input?.city?.trim() || "待确认城市";
  const categoryLines = result.categories.map(
    (item, index) => `${index + 1}. ${item.label}：${item.evidence}；建议：${item.action}`,
  );
  const fieldChecks = result.fieldChecks.map((item, index) => `${index + 1}. ${item}`);
  const weeklyRoutine = result.weeklyRoutine.map((item, index) => `${index + 1}. ${item}`);
  const blockers = result.blockers.map((item, index) => `${index + 1}. ${item}`);
  const levers = result.negotiationLevers.map((item, index) => `${index + 1}. ${item}`);
  const nextActions = result.nextActions.map((item, index) => `${index + 1}. ${item}`);

  return [
    "住哪儿｜生活配套现场确认清单",
    "",
    `房源：${listingTitle}`,
    `城市：${city}`,
    optionalLine("目标生活配套：", input?.radiusMinutes ? `${input.radiusMinutes} 分钟` : undefined),
    "",
    `结论：${result.verdict}`,
    result.summary,
    `生活评分：${result.score}；核心短板：${result.coreGapCount} 个`,
    "",
    "一、生活配套拆解",
    ...categoryLines,
    "",
    "二、今天现场必须确认",
    ...fieldChecks,
    "",
    "三、一周日常压力测试",
    ...weeklyRoutine,
    "",
    "四、需要再次确认的情况",
    ...blockers,
    "",
    "五、可用于沟通/谈判的理由",
    ...levers,
    "",
    "六、后续确认",
    ...nextActions,
    "",
    "使用边界：这份文本只基于当前录入和可用周边信息，签约或付款前仍需在晚上、周末和雨天现场确认营业时间、照明、噪音、气味和实际步行路线。",
  ]
    .filter(Boolean)
    .join("\n");
}

export function LifeRadiusResultView({
  result,
  lastInput,
  copiedPack,
  shortfallText,
  visitHref,
  areaHref,
  analyzeHref,
  onCopyPack,
}: {
  result: LifeRadiusResult;
  lastInput: LifeRadiusInput | null;
  copiedPack: boolean;
  shortfallText: string;
  visitHref: string;
  areaHref: string;
  analyzeHref: string;
  onCopyPack: () => void;
}) {
  return (
    <>
      <Card className="min-w-0 p-6">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm text-primary/80">生活结论</p>
            <h2 className="mt-2 text-2xl font-semibold">生活配套结论</h2>
          </div>
          <RiskBadge status={result.status} tone="generic" />
        </div>
        <div className="space-y-5">
          <div>
            <h3 className="text-xl font-semibold">{result.verdict}</h3>
            <p className="mt-2 text-sm leading-7 text-muted-foreground">{result.summary}</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <SummaryTile icon={Clock3} label="目标半径" value={`${result.radiusMinutes} 分钟`} />
            <SummaryTile icon={ShieldAlert} label="核心短板" value={shortfallText} />
            <SummaryTile icon={MapPin} label="生活评分" value={`${result.score} 分`} />
          </div>
          <div className="rounded-md border border-border bg-secondary p-4">
            <div className="mb-3 flex items-center justify-between gap-4">
              <p className="text-sm font-medium">长期好住评分</p>
              <p className="text-2xl font-semibold">{result.score}</p>
            </div>
            <Progress value={result.score} />
            <div className="mt-3 grid gap-2 text-sm leading-6 text-muted-foreground">
              {result.assumptions.map((item) => (
                <p key={item}>{item}</p>
              ))}
            </div>
          </div>
          {result.poiEvidence ? (
            <div className="rounded-md border border-border bg-secondary p-4">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <Badge variant={result.poiEvidence.source === "amap" ? "success" : "warning"}>
                  {result.poiEvidence.source === "amap" ? "周边生活信息" : "按已填写信息判断"}
                </Badge>
                <h3 className="font-semibold">周边依据</h3>
              </div>
              <p className="text-sm leading-6 text-muted-foreground">{result.poiEvidence.detail}</p>
              {result.poiEvidence.categories?.length ? (
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {result.poiEvidence.categories.slice(0, 8).map((item) => (
                    <div key={item.label} className="rounded-md border border-border bg-background/40 p-3">
                      <p className="text-xs text-muted-foreground">{item.label}</p>
                      <p className="mt-1 text-sm font-medium">
                        {item.count} 个
                        {item.nearestMinutes ? ` · 最近约 ${item.nearestMinutes} 分钟` : ""}
                      </p>
                      {item.nearestName ? (
                        <p className="mt-1 truncate text-xs text-muted-foreground">{item.nearestName}</p>
                      ) : null}
                    </div>
                  ))}
                </div>
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
              <h3 className="font-semibold">生活配套待确认事项</h3>
            </div>
            <div className="grid gap-2 text-sm leading-6 text-amber-900/90">
              {result.blockers.map((item) => (
                <p key={item}>{item}</p>
              ))}
            </div>
          </div>

          <details className="rounded-md border border-border bg-secondary/55 p-4">
            <summary className="cursor-pointer text-sm font-medium text-foreground">
              查看现场确认清单
            </summary>
            <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <p className="text-sm leading-6 text-muted-foreground">
                用于看房当天核对买菜、医疗、快递、夜间照明、噪音气味和周末日常。
              </p>
              <Button type="button" variant="outline" onClick={onCopyPack}>
                <Copy className="mr-2 h-4 w-4" />
                {copiedPack ? "已复制" : "复制文本"}
              </Button>
            </div>
            <pre className="mt-4 max-h-[320px] overflow-auto whitespace-pre-wrap rounded-md border border-border bg-card p-4 text-sm leading-7 text-muted-foreground">
              {buildLifeFieldPack(result, lastInput)}
            </pre>
          </details>
        </div>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[0.64fr_0.36fr]">
        <Card className="min-w-0 p-6">
          <div className="mb-5 flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold">生活配套拆解</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-[760px] text-left text-sm">
              <thead className="text-muted-foreground">
                <tr className="border-b border-border">
                  <th className="px-4 py-3 font-medium">维度</th>
                  <th className="px-4 py-3 font-medium">评分</th>
                  <th className="px-4 py-3 font-medium">状态</th>
                  <th className="px-4 py-3 font-medium">依据</th>
                  <th className="px-4 py-3 font-medium">建议</th>
                </tr>
              </thead>
              <tbody>
                {result.categories.map((item) => (
                  <tr key={item.label} className="border-b border-border last:border-b-0">
                    <td className="px-4 py-4 font-medium">{item.label}</td>
                    <td className="px-4 py-4">{item.score}</td>
                    <td className="px-4 py-4">
                      <RiskBadge status={item.status} tone="generic" />
                    </td>
                    <td className="px-4 py-4 text-muted-foreground">{item.evidence}</td>
                    <td className="px-4 py-4 text-muted-foreground">{item.action}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <div className="space-y-4">
          <InfoPanel title="现场实测清单" icon={PackageCheck}>
            <ul className="grid gap-2 text-sm leading-6 text-muted-foreground">
              {result.fieldChecks.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </InfoPanel>

          <InfoPanel title="一周日常压力测试" icon={CheckCircle2}>
            <ul className="grid gap-2 text-sm leading-6 text-muted-foreground">
              {result.weeklyRoutine.map((item) => (
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
            <h2 className="text-xl font-semibold">生活风险拆解</h2>
          </div>
          <div className="grid gap-3">
            {result.riskItems.map((item) => (
              <RiskRow key={item.title} item={item} />
            ))}
          </div>
        </Card>

        <div className="space-y-4">
          <InfoPanel title="可协商事项" icon={WalletCards}>
            <ul className="grid gap-2 text-sm leading-6 text-muted-foreground">
              {result.negotiationLevers.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </InfoPanel>

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
                  <Link href={visitHref}>整理看房清单</Link>
                </Button>
                <Button asChild variant="secondary">
                  <Link href={areaHref}>回到片区</Link>
                </Button>
                <Button asChild>
                  <Link href={analyzeHref}>房源体检</Link>
                </Button>
              </div>
            </div>
          </InfoPanel>
        </div>
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

function RiskRow({ item }: { item: LifeRiskItem }) {
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
