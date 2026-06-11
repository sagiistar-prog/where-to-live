"use client";

import { FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BadgeDollarSign,
  Calculator,
  CheckCircle2,
  Copy,
  Handshake,
  KeyRound,
  Loader2,
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { recordCaseEvent } from "@/lib/client-case-events";
import { buildRenewalCaseEventDetails } from "@/lib/lifecycle-case-event-details";
import type {
  RenewalDecisionInput,
  RenewalDecisionResult,
  RenewalRiskItem,
  RenewalRiskLevel,
} from "@/lib/renewal-decision";
import { buildFlowHref, compactContext } from "@/lib/flow-links";

type SubmitState = "idle" | "loading" | "error";
type RenewalSeed = Partial<RenewalDecisionInput> & {
  reportId?: string;
  sourceLabel?: string;
  reportContext?: string;
};

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

function seedValue(value: string | undefined, fallback: string) {
  return value?.trim() || fallback;
}

function seedNumber(value: number | undefined, fallback: string) {
  return Number.isFinite(value) ? String(value) : fallback;
}

function buildDepositHref(result: RenewalDecisionResult, reportId?: string) {
  return buildFlowHref("/deposit", {
    from: "renewal",
    reportId,
    city: result.city,
    monthlyRent: result.currentRent,
    depositAmount: result.currentRent,
    penaltyClaim: Math.max(0, result.rentIncrease),
    evidenceLevel: "部分凭据",
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

export function RenewalDecisionPanel({
  reportId,
  initialInput,
}: {
  reportId?: string;
  initialInput?: RenewalSeed;
}) {
  const activeReportId = reportId || initialInput?.reportId || "";
  const [result, setResult] = useState<RenewalDecisionResult | null>(null);
  const [copiedMemo, setCopiedMemo] = useState(false);
  const [state, setState] = useState<SubmitState>("idle");
  const [message, setMessage] = useState(
    "这里只整理续租涨租方案，不抓取租房平台数据。",
  );

  const rentGapText = useMemo(() => {
    if (!result) return "0 元";
    return formatMoney(result.proposedRent - result.maxAcceptableRent);
  }, [result]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState("loading");
    setMessage("正在计算续租、谈判和搬家成本...");

    const form = new FormData(event.currentTarget);
    const payload = {
      city: String(form.get("city") || ""),
      listingTitle: String(form.get("listingTitle") || ""),
      currentRent: Number(form.get("currentRent")),
      proposedRent: Number(form.get("proposedRent")),
      marketRent: Number(form.get("marketRent")),
      monthlyIncome: Number(form.get("monthlyIncome")),
      movingCost: Number(form.get("movingCost")),
      agencyFee: Number(form.get("agencyFee")),
      depositRisk: Number(form.get("depositRisk")),
      commuteMinutes: Number(form.get("commuteMinutes")),
      alternativeCommuteMinutes: Number(form.get("alternativeCommuteMinutes")),
      contractLengthMonths: Number(form.get("contractLengthMonths")),
      noticeDays: Number(form.get("noticeDays")),
      houseIssues: String(form.get("houseIssues") || ""),
      landlordBehavior: String(form.get("landlordBehavior") || ""),
      renewalTerms: String(form.get("renewalTerms") || ""),
      alternativeQuality: String(form.get("alternativeQuality") || ""),
      workStability: String(form.get("workStability") || ""),
      notes: String(form.get("notes") || ""),
    };

    try {
      const response = await fetch("/api/renewal/decision", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error("续租涨租方案整理失败，请确认信息后重试。");
      }

      const data = (await response.json()) as RenewalDecisionResult;
      setResult(data);
      setCopiedMemo(false);
      setState("idle");
      setMessage("续租涨租方案已整理。先看上限，再谈价格和条款。");
      if (activeReportId) {
        const caseEventDetails = buildRenewalCaseEventDetails(data);
        void recordCaseEvent({
          reportId: activeReportId,
          type: "renewal",
          title: "续租涨租",
          status: data.status,
          summary: caseEventDetails.summary,
          highlights: caseEventDetails.highlights,
          href:
            typeof window !== "undefined"
              ? `${window.location.pathname}${window.location.search}`
              : undefined,
        });
      }
    } catch (error) {
      setState("error");
      setMessage(error instanceof Error ? error.message : "续租涨租方案整理失败，请稍后重试。");
    }
  }

  async function copyRenewalMemo() {
    if (!result) return;
    await navigator.clipboard.writeText(buildRenewalMemo(result));
    setCopiedMemo(true);
  }

  return (
    <div className="space-y-6">
      <form
        onSubmit={handleSubmit}
        className="grid grid-cols-1 gap-4 xl:grid-cols-[0.42fr_0.58fr]"
      >
        <Card className="min-w-0 p-6">
          <div className="mb-6">
            <p className="text-sm text-primary/80">
              续租判断
            </p>
            <h2 className="mt-2 text-2xl font-semibold">输入续租条件</h2>
            {initialInput?.sourceLabel ? (
              <Badge variant="outline" className="mt-3 w-fit border-primary/30 text-primary">
                {initialInput.sourceLabel}
              </Badge>
            ) : null}
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              一起计算涨租、同片区替代、搬家成本、押金风险和通勤变化。不要只因为怕麻烦就接受不合理涨租。
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="城市" name="city" defaultValue={seedValue(initialInput?.city, "上海")} type="text" />
            <Field
              label="当前房源"
              name="listingTitle"
              defaultValue={seedValue(initialInput?.listingTitle, "徐汇一居室")}
              type="text"
            />
            <Field label="当前租金" name="currentRent" defaultValue={seedNumber(initialInput?.currentRent, "5200")} />
            <Field label="拟续租租金" name="proposedRent" defaultValue={seedNumber(initialInput?.proposedRent, "5900")} />
            <Field label="同片区替代租金" name="marketRent" defaultValue={seedNumber(initialInput?.marketRent, "5600")} />
            <Field label="税后月收入" name="monthlyIncome" defaultValue={seedNumber(initialInput?.monthlyIncome, "18000")} />
            <Field label="搬家费" name="movingCost" defaultValue={seedNumber(initialInput?.movingCost, "2600")} />
            <Field label="新房中介费" name="agencyFee" defaultValue={seedNumber(initialInput?.agencyFee, "2500")} />
            <Field label="押金损失风险" name="depositRisk" defaultValue={seedNumber(initialInput?.depositRisk, "1800")} />
            <Field label="当前通勤分钟" name="commuteMinutes" defaultValue={seedNumber(initialInput?.commuteMinutes, "35")} />
            <Field
              label="替代房通勤分钟"
              name="alternativeCommuteMinutes"
              defaultValue={seedNumber(initialInput?.alternativeCommuteMinutes, "45")}
            />
            <Field
              label="续租月数"
              name="contractLengthMonths"
              defaultValue={seedNumber(initialInput?.contractLengthMonths, "12")}
            />
            <Field label="剩余确认天数" name="noticeDays" defaultValue={seedNumber(initialInput?.noticeDays, "7")} />
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="houseIssues">房屋问题</Label>
              <Input
                id="houseIssues"
                name="houseIssues"
                defaultValue={seedValue(initialInput?.houseIssues, "卫生间潮湿、空调老旧、楼道噪音")}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="landlordBehavior">出租方表现</Label>
              <Input
                id="landlordBehavior"
                name="landlordBehavior"
                defaultValue={seedValue(initialInput?.landlordBehavior, "维修响应慢，但愿意沟通")}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="renewalTerms">续租条件</Label>
              <Textarea
                id="renewalTerms"
                name="renewalTerms"
                className="min-h-[88px]"
                defaultValue={seedValue(initialInput?.renewalTerms, "涨租 700 元，要求再签 12 个月，押金不变")}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="alternativeQuality">替代房情况</Label>
              <Input
                id="alternativeQuality"
                name="alternativeQuality"
                defaultValue={seedValue(initialInput?.alternativeQuality, "同片区可选房源一般，搬家会多 10 分钟通勤")}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="workStability">工作稳定性</Label>
              <Input
                id="workStability"
                name="workStability"
                defaultValue={seedValue(initialInput?.workStability, "工作地点未来 12 个月稳定")}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="notes">补充说明</Label>
              <Textarea
                id="notes"
                name="notes"
                className="min-h-[112px]"
                defaultValue={seedValue(
                  initialInput?.notes || initialInput?.reportContext,
                  "房东说市场都涨了，希望下周前决定是否续租。用户担心涨租后预算变紧，也担心搬家成本和押金扣款。",
                )}
              />
            </div>
          </div>

          <StatusMessage state={state} message={message} />

          <Button type="submit" size="lg" className="mt-5 w-full" disabled={state === "loading"}>
            {state === "loading" ? (
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-5 w-5" />
            )}
            {state === "loading" ? "正在整理方案" : "整理续租方案"}
          </Button>
        </Card>

        <Card className="min-w-0 p-6">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm text-primary/80">
                续租结果
              </p>
              <h2 className="mt-2 text-2xl font-semibold">续租结论</h2>
            </div>
            {result ? <RiskBadge status={result.status} tone="generic" /> : null}
          </div>

          {result ? (
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
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <Button asChild variant="secondary" className="h-auto justify-between gap-3 py-3">
                  <Link href={buildContractHref(result, activeReportId)}>
                    <span className="flex min-w-0 items-center gap-2">
                      <Scale className="h-4 w-4 shrink-0" />
                      <span className="truncate">审续租协议</span>
                    </span>
                    <ArrowRight className="h-4 w-4 shrink-0" />
                  </Link>
                </Button>
                <Button asChild variant="secondary" className="h-auto justify-between gap-3 py-3">
                  <Link href={buildPaymentHref(result, activeReportId)}>
                    <span className="flex min-w-0 items-center gap-2">
                      <BadgeDollarSign className="h-4 w-4 shrink-0" />
                      <span className="truncate">确认续租付款条件</span>
                    </span>
                    <ArrowRight className="h-4 w-4 shrink-0" />
                  </Link>
                </Button>
                <Button asChild variant="secondary" className="h-auto justify-between gap-3 py-3">
                  <Link href={buildDepositHref(result, activeReportId)}>
                    <span className="flex min-w-0 items-center gap-2">
                      <KeyRound className="h-4 w-4 shrink-0" />
                      <span className="truncate">测退租押金</span>
                    </span>
                    <ArrowRight className="h-4 w-4 shrink-0" />
                  </Link>
                </Button>
                <Button asChild variant="secondary" className="h-auto justify-between gap-3 py-3">
                  <Link href={buildCompareHref(result, activeReportId)}>
                    <span className="flex min-w-0 items-center gap-2">
                      <Calculator className="h-4 w-4 shrink-0" />
                      <span className="truncate">对比替代房</span>
                    </span>
                    <ArrowRight className="h-4 w-4 shrink-0" />
                  </Link>
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex min-h-[560px] flex-col justify-center rounded-md border border-border bg-secondary p-5">
              <Badge variant="secondary" className="mb-4 w-fit">
                租期到期前
              </Badge>
              <h3 className="text-xl font-semibold">续租前先算涨价是否合理</h3>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">
                把涨租、搬家成本、押金风险、通勤变化和维修问题放在同一张表里，再决定要不要续、怎么谈、什么时候准备搬。
              </p>
            </div>
          )}
        </Card>
      </form>

      {result ? (
        <>
          <Card className="min-w-0 p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <div className="mb-3 flex items-center gap-2">
                  <MessageSquareText className="h-4 w-4 text-primary" />
                  <h3 className="font-semibold">续租谈判包</h3>
                </div>
                <p className="max-w-3xl text-sm leading-7 text-muted-foreground">
                  把涨租幅度、续租上限、替代方案、房屋问题、条款要求和退租准备整理成可直接发送的谈判文本，避免在时间压力下口头答应。
                </p>
              </div>
              <Button type="button" variant="outline" onClick={copyRenewalMemo}>
                <Copy className="mr-2 h-4 w-4" />
                {copiedMemo ? "已复制" : "复制谈判包"}
              </Button>
            </div>
            <pre className="mt-4 max-h-[360px] overflow-auto whitespace-pre-wrap rounded-md border border-border bg-secondary p-4 text-sm leading-7 text-muted-foreground">
              {buildRenewalMemo(result)}
            </pre>
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
                      <th className="px-3 py-3 font-medium">凭据</th>
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
            <InfoPanel title="下一步" icon={CheckCircle2} items={result.nextActions} />
            <InfoPanel title="判断假设" icon={Calculator} items={result.assumptions} />
          </section>
        </>
      ) : null}
    </div>
  );
}

function Field({
  label,
  name,
  defaultValue,
  type = "number",
}: {
  label: string;
  name: string;
  defaultValue: string;
  type?: string;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} type={type} defaultValue={defaultValue} />
    </div>
  );
}

function StatusMessage({ state, message }: { state: SubmitState; message: string }) {
  return (
    <div
      className={`mt-5 rounded-md border p-3 text-sm leading-6 ${
        state === "error"
          ? "border-rose-300/20 bg-rose-300/10 text-rose-700"
          : "border-border bg-secondary text-muted-foreground"
      }`}
    >
      <div className="flex gap-2">
        {state === "error" ? (
          <ShieldAlert className="mt-1 h-4 w-4 shrink-0" />
        ) : (
          <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-primary" />
        )}
        <span>{message}</span>
      </div>
    </div>
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

