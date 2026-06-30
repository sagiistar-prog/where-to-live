"use client";

import { useMemo, useState, type ComponentType } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BadgeDollarSign,
  Calculator,
  CheckCircle2,
  Copy,
  Handshake,
  KeyRound,
  LayoutDashboard,
  MessageSquareText,
  RefreshCw,
  Scale,
  ShieldAlert,
  TrendingUp,
  Truck,
  WalletCards,
  type LucideIcon,
} from "lucide-react";
import { RiskBadge } from "@/components/risk-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { RenewalDecisionResult, RenewalRiskItem, RenewalRiskLevel } from "@/lib/renewal-decision";
import { buildFlowHref, compactContext } from "@/lib/flow-links";

const levelVariant: Record<RenewalRiskLevel, "destructive" | "warning" | "success"> = {
  高: "destructive",
  中: "warning",
  低: "success",
};

const statusVariant: Record<"recommend" | "caution" | "reject", "success" | "warning" | "destructive"> = {
  recommend: "success",
  caution: "warning",
  reject: "destructive",
};

function formatMoney(value: number) {
  return `${Math.round(value).toLocaleString()} 元`;
}

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

function buildDepositHref(result: RenewalDecisionResult, reportId?: string) {
  return buildFlowHref("/deposit", {
    from: "renewal",
    reportId,
    city: result.city,
    monthlyRent: result.currentRent,
    depositAmount: result.currentRent,
    penaltyClaim: Math.max(0, result.rentIncrease),
    evidenceLevel: "部分材料",
    landlordReason: compactContext([
      "从续租方案带入：如果谈判失败或准备搬家，需要提前评估押金、违约金和退租通知期。",
      result.summary,
      result.blockers,
      result.movePrepChecklist,
    ]),
  });
}

function buildContractHref(result: RenewalDecisionResult, reportId?: string) {
  return buildFlowHref("/contract", {
    from: "renewal",
    reportId,
    city: result.city,
    contractText: compactContext([
      "以下内容来自续租方案，不等同于完整合同。请粘贴真实续租补充协议后再确认：",
      result.summary,
      `当前租金：${result.currentRent.toLocaleString()} 元；拟续租：${result.proposedRent.toLocaleString()} 元；建议上限：${result.maxAcceptableRent.toLocaleString()} 元。`,
      "续租清单：",
      result.renewalChecklist,
      "待确认事项：",
      result.blockers,
    ]),
  });
}

function buildCompareHref(result: RenewalDecisionResult, reportId?: string) {
  return buildFlowHref("/compare", {
    from: "renewal",
    reportId,
    city: result.city,
    currentTitle: result.listingTitle,
    currentRent: result.currentRent,
    proposedRent: result.proposedRent,
    marketRent: result.marketRent,
    reportContext: compactContext([result.summary, result.scenarios.map((item) => item.verdict)]),
  });
}

function buildPaymentHref(result: RenewalDecisionResult, reportId?: string) {
  return buildFlowHref("/payment", {
    from: "renewal",
    reportId,
    city: result.city,
    title: result.listingTitle,
    listingTitle: result.listingTitle,
    paymentType: result.rentIncrease > 0 ? "续租涨租首笔租金" : "续租首笔租金",
    amount: result.proposedRent,
    monthlyRent: result.proposedRent,
    stage: "续租补充协议付款前",
    contractStatus: "续租补充协议待确认",
    refundRule: `押金沿用或调整需书面确认；当前租金 ${result.currentRent.toLocaleString()} 元`,
    receiptStatus: "续租付款材料待确认",
    paymentChannel: "待确认",
    urgencyPressure: "房东要求先确认续租或先付新租金",
    notes: compactContext([
      "从续租涨租方案带入：续租付款前先确认补充协议、押金沿用/调整、付款周期、维修承诺和退租条款。",
      result.summary,
      result.blockers,
      result.renewalChecklist,
    ]),
    reportContext: compactContext([
      result.summary,
      result.negotiationScripts,
      result.nextActions,
      result.assumptions,
    ]),
  });
}

function buildRenewalMemo(result: RenewalDecisionResult) {
  const blockerLines =
    result.blockers.length && !result.blockers[0].includes("暂无高优先级")
      ? result.blockers.map((item, index) => `${index + 1}. ${item}`)
      : ["1. 当前没有高优先级待确认事项，但续租条件仍需写入补充协议。"];
  const scenarioLines = result.scenarios.map(
    (item, index) =>
      `${index + 1}. ${item.label}：月成本 ${item.monthlyCost.toLocaleString()} 元，12 个月总成本 ${item.twelveMonthCost.toLocaleString()} 元。${item.verdict}`,
  );

  return [
    `你好，关于${result.city}「${result.listingTitle}」续租，我这边先把预算和可接受条件说清楚。`,
    "",
    `当前租金 ${result.currentRent.toLocaleString()} 元，续租报价 ${result.proposedRent.toLocaleString()} 元，涨租 ${result.rentIncrease.toLocaleString()} 元。`,
    `我的续租上限是 ${result.maxAcceptableRent.toLocaleString()} 元；如果超过这个上限，我需要同步准备替代房和退租安排。`,
    "",
    "一、我暂不直接接受当前报价的原因",
    ...blockerLines,
    "",
    "二、可接受的续租条件",
    "1. 租金控制在上述续租上限内，或通过免租期、维修、保洁、家电维护等方式抵消涨租。",
    "2. 续租租期、租金、付款周期、押金、提前退租、维修责任写入补充协议。",
    "3. 已有房屋问题在续租前明确维修时间，避免后续再变成押金扣款。",
    "",
    "三、我已做过的方案对比",
    ...scenarioLines,
    "",
    "四、请确认或可协商的方案",
    ...result.negotiationScripts.map((item, index) => `${index + 1}. ${item}`),
    "",
    "如果价格和条款能在文字里确认，我会优先考虑续租；如果无法确认，我会按退租通知期准备替代房和押金交割。",
  ].join("\n");
}

export function RenewalDecisionResultView({
  result,
  reportId,
}: {
  result: RenewalDecisionResult;
  reportId?: string;
}) {
  const [copiedMemo, setCopiedMemo] = useState(false);
  const rentGapText = useMemo(
    () => formatMoney(result.proposedRent - result.maxAcceptableRent),
    [result.maxAcceptableRent, result.proposedRent],
  );

  async function copyRenewalMemo() {
    await navigator.clipboard.writeText(buildRenewalMemo(result));
    setCopiedMemo(true);
  }

  return (
    <div className="space-y-6">
      <Card className="min-w-0 p-6">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm text-primary/80">续租结果</p>
            <h2 className="mt-2 text-2xl font-semibold">续租结论</h2>
          </div>
          <RiskBadge status={result.status} tone="generic" />
        </div>
        <div className="space-y-5">
          <p className="text-sm leading-7 text-muted-foreground">{result.summary}</p>
          <div className="grid gap-3 sm:grid-cols-3">
            <SummaryTile icon={RefreshCw} label="建议" value={result.decision} />
            <SummaryTile icon={TrendingUp} label="涨租幅度" value={formatPercent(result.rentIncreaseRate)} />
            <SummaryTile icon={WalletCards} label="续租上限" value={formatMoney(result.maxAcceptableRent)} />
          </div>
          <div className="rounded-md border border-border bg-secondary p-4">
            <div className="mb-3 flex items-center justify-between gap-4">
              <p className="text-sm font-medium">续租可控评分</p>
              <p className="text-2xl font-semibold">{result.score}</p>
            </div>
            <Progress value={result.score} />
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              当前报价比建议上限高 {rentGapText}；搬家成本大约需要 {result.breakEvenMonths} 个月才能被租金差抵消。
            </p>
          </div>
          <div className="rounded-md border border-amber-300/20 bg-amber-300/10 p-4">
            <div className="mb-3 flex items-center gap-2 text-amber-700">
              <ShieldAlert className="h-4 w-4" />
              <h3 className="font-semibold">续租前待确认事项</h3>
            </div>
            <div className="grid gap-2 text-sm leading-6 text-amber-900/90">
              {result.blockers.map((item) => (
                <p key={item}>{item}</p>
              ))}
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <FlowButton href="/dashboard" icon={LayoutDashboard} label="回到工作台" />
            <FlowButton href={buildContractHref(result, reportId)} icon={Scale} label="审续租协议" />
            <FlowButton href={buildPaymentHref(result, reportId)} icon={BadgeDollarSign} label="确认续租付款条件" />
            <FlowButton href={buildDepositHref(result, reportId)} icon={KeyRound} label="测退租押金" />
            <FlowButton href={buildCompareHref(result, reportId)} icon={Calculator} label="对比替代房" />
          </div>

          <details className="rounded-md border border-border bg-secondary/55 p-4">
            <summary className="cursor-pointer text-sm font-medium text-foreground">查看续租谈判文本</summary>
            <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <p className="text-sm leading-6 text-muted-foreground">
                用于说明涨租幅度、续租上限、替代方案、条款要求和退租准备。
              </p>
              <Button type="button" variant="outline" onClick={copyRenewalMemo}>
                <Copy className="mr-2 h-4 w-4" />
                {copiedMemo ? "已复制" : "复制文本"}
              </Button>
            </div>
            <pre className="mt-4 max-h-[320px] overflow-auto whitespace-pre-wrap rounded-md border border-border bg-card p-4 text-sm leading-7 text-muted-foreground">
              {buildRenewalMemo(result)}
            </pre>
          </details>
        </div>
      </Card>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-[0.6fr_0.4fr]">
        <Card className="min-w-0 p-5">
          <h3 className="font-semibold">方案对比</h3>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-[700px] text-left text-sm">
              <thead className="text-xs text-muted-foreground">
                <tr className="border-b border-border">
                  <th className="px-3 py-3 font-medium">方案</th>
                  <th className="px-3 py-3 font-medium">月成本</th>
                  <th className="px-3 py-3 font-medium">一次性成本</th>
                  <th className="px-3 py-3 font-medium">12 个月总成本</th>
                  <th className="px-3 py-3 font-medium">判断</th>
                </tr>
              </thead>
              <tbody>
                {result.scenarios.map((item) => (
                  <tr key={item.label} className="border-b border-border last:border-0">
                    <td className="px-3 py-4 font-medium">{item.label}</td>
                    <td className="px-3 py-4">{formatMoney(item.monthlyCost)}</td>
                    <td className="px-3 py-4">{formatMoney(item.upfrontCost)}</td>
                    <td className="px-3 py-4">{formatMoney(item.twelveMonthCost)}</td>
                    <td className="px-3 py-4">
                      <Badge variant={statusVariant[item.status]}>{item.verdict}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card className="min-w-0 p-5">
          <div className="mb-3 flex items-center gap-2">
            <MessageSquareText className="h-4 w-4 text-primary" />
            <h3 className="font-semibold">谈判话术</h3>
          </div>
          <div className="grid gap-2 text-sm leading-6 text-muted-foreground">
            {result.negotiationScripts.map((item) => (
              <p key={item} className="rounded-md border border-border bg-secondary p-3">
                {item}
              </p>
            ))}
          </div>
        </Card>
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-[0.6fr_0.4fr]">
        <Card className="min-w-0 p-5">
          <h3 className="font-semibold">续租风险拆解</h3>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-[760px] text-left text-sm">
              <thead className="text-xs text-muted-foreground">
                <tr className="border-b border-border">
                  <th className="px-3 py-3 font-medium">风险</th>
                  <th className="px-3 py-3 font-medium">等级</th>
                  <th className="px-3 py-3 font-medium">为什么</th>
                  <th className="px-3 py-3 font-medium">事项</th>
                  <th className="px-3 py-3 font-medium">记录</th>
                </tr>
              </thead>
              <tbody>
                {result.riskItems.map((item) => (
                  <RiskRow key={item.title} item={item} />
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <InfoPanel title="续租清单" icon={Handshake} items={result.renewalChecklist} />
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <InfoPanel title="搬家准备" icon={Truck} items={result.movePrepChecklist} />
        <InfoPanel title="后续确认" icon={CheckCircle2} items={result.nextActions} />
        <InfoPanel title="判断假设" icon={Calculator} items={result.assumptions} />
      </section>
    </div>
  );
}

function FlowButton({
  href,
  icon: Icon,
  label,
}: {
  href: string;
  icon: ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <Button asChild variant="secondary" className="h-auto justify-between gap-3 py-3">
      <Link href={href}>
        <span className="flex min-w-0 items-center gap-2">
          <Icon className="h-4 w-4 shrink-0" />
          <span className="truncate">{label}</span>
        </span>
        <ArrowRight className="h-4 w-4 shrink-0" />
      </Link>
    </Button>
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
      <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-md bg-primary/15 text-primary">
        <Icon className="h-4 w-4" />
      </div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
    </div>
  );
}

function RiskRow({ item }: { item: RenewalRiskItem }) {
  return (
    <tr className="border-b border-border last:border-0">
      <td className="px-3 py-4 font-medium">{item.title}</td>
      <td className="px-3 py-4">
        <Badge variant={levelVariant[item.level]}>{item.level}</Badge>
      </td>
      <td className="px-3 py-4 text-muted-foreground">{item.why}</td>
      <td className="px-3 py-4 text-muted-foreground">{item.action}</td>
      <td className="px-3 py-4 text-muted-foreground">{item.proof}</td>
    </tr>
  );
}

function InfoPanel({
  title,
  icon: Icon,
  items,
}: {
  title: string;
  icon: LucideIcon;
  items: string[];
}) {
  return (
    <Card className="p-5">
      <div className="mb-3 flex items-center gap-2">
        <Icon className="h-4 w-4 text-primary" />
        <h3 className="font-semibold">{title}</h3>
      </div>
      <div className="grid gap-2 text-sm leading-6 text-muted-foreground">
        {items.map((item) => (
          <p key={item} className="rounded-md border border-border bg-secondary p-3">
            {item}
          </p>
        ))}
      </div>
    </Card>
  );
}
