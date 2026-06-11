"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import {
  Archive,
  ArrowRight,
  Calculator,
  CheckCircle2,
  Copy,
  FileCheck2,
  Loader2,
  MessageSquareText,
  PiggyBank,
  ReceiptText,
  ShieldAlert,
  Truck,
  WalletCards,
} from "lucide-react";
import { RiskBadge } from "@/components/risk-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { recordCaseEvent } from "@/lib/client-case-events";
import { buildMoveCaseEventDetails } from "@/lib/lifecycle-case-event-details";
import type { MoveBudgetInput, MoveBudgetLineItem, MoveBudgetResult } from "@/lib/move-budget";

type SubmitState = "idle" | "loading" | "error";
type MoveBudgetSeed = Partial<MoveBudgetInput> & {
  reportId?: string;
  sourceLabel?: string;
  reportContext?: string;
  listingTitle?: string;
};

const itemTypeCopy: Record<MoveBudgetLineItem["type"], string> = {
  required: "刚性支出",
  negotiable: "可谈判",
  deferrable: "可延后",
};

const itemTypeVariant: Record<MoveBudgetLineItem["type"], "destructive" | "warning" | "secondary"> =
  {
    required: "destructive",
    negotiable: "warning",
    deferrable: "secondary",
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

function buildMoveNegotiationMemo(result: MoveBudgetResult, input?: MoveBudgetInput | null) {
  const monthlyRent = input?.monthlyRent ?? 0;
  const paymentStructure =
    input?.depositMonths && input?.prepaidMonths
      ? `押 ${input.depositMonths} 付 ${input.prepaidMonths}`
      : "押付方式待确认";
  const riskLines = result.risks.map((item, index) => `${index + 1}. ${item}`);
  const leverLines = result.negotiationLevers.map((item, index) => `${index + 1}. ${item}`);

  return [
    `你好，关于${result.city}这套房的签约首笔支出，我先做了入住预算测算。`,
    "",
    `当前月租${monthlyRent ? ` ${Math.round(monthlyRent).toLocaleString()} 元` : ""}，付款结构为${paymentStructure}。`,
    `按当前条件，首笔支出约 ${result.upfrontCost.toLocaleString()} 元，签约后剩余现金约 ${result.cashAfterMove.toLocaleString()} 元；我需要保留的最低安全垫约 ${result.minimumSafeCash.toLocaleString()} 元。`,
    `当前现金安全垫约 ${result.safetyMonths.toFixed(1)} 个月。`,
    "",
    "一、当前预算风险",
    ...riskLines,
    "",
    "二、希望先协商的付款条件",
    ...leverLines,
    "",
    "三、我可以继续确认的前提",
    "1. 付款周期、押金、预付租金、中介费、服务费和收款主体写进合同或聊天确认。",
    "2. 中介费/服务费能提供收据或电子确认，写明收费主体、用途和是否可退。",
    "3. 如需先付款，请先做付款前确认：合同、授权、收款主体、退款条件和收据材料全部确认。",
    "4. 非必要添置我会延后购买，优先保证安全、卫生和发薪前生活缓冲。",
    "",
    "在以上条件确认前，我先不直接支付完整首笔款项。请尽量用文字回复，方便双方后续核对。",
  ].join("\n");
}

export function MoveBudgetPanel({
  reportId,
  initialInput,
}: {
  reportId?: string;
  initialInput?: MoveBudgetSeed;
}) {
  const activeReportId = reportId || initialInput?.reportId || "";
  const [result, setResult] = useState<MoveBudgetResult | null>(null);
  const [lastInput, setLastInput] = useState<MoveBudgetInput | null>(null);
  const [copiedMemo, setCopiedMemo] = useState(false);
  const [state, setState] = useState<SubmitState>("idle");
  const [message, setMessage] = useState(
    "这里只做入住预算测算，不读取账单账户或支付账户。",
  );

  const requiredCost = useMemo(
    () =>
      result?.lineItems
        .filter((item) => item.type === "required")
        .reduce((sum, item) => sum + item.amount, 0) ?? 0,
    [result],
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState("loading");
    setMessage("正在计算入住预算...");

    const form = new FormData(event.currentTarget);
    const payload: MoveBudgetInput = {
      city: String(form.get("city") || ""),
      monthlyIncome: Number(form.get("monthlyIncome")),
      cashOnHand: Number(form.get("cashOnHand")),
      monthlyRent: Number(form.get("monthlyRent")),
      depositMonths: Number(form.get("depositMonths")),
      prepaidMonths: Number(form.get("prepaidMonths")),
      agencyFee: Number(form.get("agencyFee")),
      serviceFee: Number(form.get("serviceFee")),
      movingCost: Number(form.get("movingCost")),
      setupCost: Number(form.get("setupCost")),
      utilityDeposit: Number(form.get("utilityDeposit")),
      fixedMonthlyCost: Number(form.get("fixedMonthlyCost")),
      daysUntilSalary: Number(form.get("daysUntilSalary")),
    };
    setLastInput(payload);

    try {
      const response = await fetch("/api/move/budget", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error("入住预算测算失败，请确认信息后重试。");
      }

      const data = (await response.json()) as MoveBudgetResult;
      setResult(data);
      setCopiedMemo(false);
      setState("idle");
      setMessage("入住预算已计算。先看明显风险，再决定是否付款。");
      if (activeReportId) {
        const caseEventDetails = buildMoveCaseEventDetails(data);
        void recordCaseEvent({
          reportId: activeReportId,
          type: "move",
          title: "入住预算",
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
      setMessage(error instanceof Error ? error.message : "入住预算测算失败，请稍后重试。");
    }
  }

  async function copyMoveMemo() {
    if (!result) return;
    await navigator.clipboard.writeText(buildMoveNegotiationMemo(result, lastInput));
    setCopiedMemo(true);
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="grid gap-4 xl:grid-cols-[0.42fr_0.58fr]">
        <Card className="p-6">
          <div className="mb-6">
            <p className="text-sm text-primary/80">
              入住预算
            </p>
            <h2 className="mt-2 text-2xl font-semibold">输入签约预算</h2>
            {initialInput?.sourceLabel ? (
              <Badge variant="outline" className="mt-3 w-fit border-primary/30 text-primary">
                {initialInput.sourceLabel}
              </Badge>
            ) : null}
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              用于判断今天签下这套房后，手头现金是否还安全。重点看首笔支出后还能撑多久。
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="城市" name="city" defaultValue={seedValue(initialInput?.city, "上海")} type="text" />
            <Field label="税后月收入" name="monthlyIncome" defaultValue={seedNumber(initialInput?.monthlyIncome, "18000")} />
            <Field label="手头可用现金" name="cashOnHand" defaultValue={seedNumber(initialInput?.cashOnHand, "42000")} />
            <Field label="月租" name="monthlyRent" defaultValue={seedNumber(initialInput?.monthlyRent, "5200")} />
            <Field label="押几个月" name="depositMonths" defaultValue={seedNumber(initialInput?.depositMonths, "1")} />
            <Field label="付几个月" name="prepaidMonths" defaultValue={seedNumber(initialInput?.prepaidMonths, "3")} />
            <Field label="中介费" name="agencyFee" defaultValue={seedNumber(initialInput?.agencyFee, "2600")} />
            <Field label="服务/管理费" name="serviceFee" defaultValue={seedNumber(initialInput?.serviceFee, "0")} />
            <Field label="搬家费用" name="movingCost" defaultValue={seedNumber(initialInput?.movingCost, "1200")} />
            <Field label="基础添置" name="setupCost" defaultValue={seedNumber(initialInput?.setupCost, "2600")} />
            <Field label="水电宽带预存" name="utilityDeposit" defaultValue={seedNumber(initialInput?.utilityDeposit, "600")} />
            <Field label="每月固定支出" name="fixedMonthlyCost" defaultValue={seedNumber(initialInput?.fixedMonthlyCost, "6200")} />
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="daysUntilSalary">距离下一次发薪</Label>
              <Input id="daysUntilSalary" name="daysUntilSalary" type="number" defaultValue={seedNumber(initialInput?.daysUntilSalary, "18")} />
            </div>
          </div>

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

          <Button type="submit" size="lg" className="mt-5 w-full" disabled={state === "loading"}>
            {state === "loading" ? (
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            ) : (
              <Calculator className="mr-2 h-5 w-5" />
            )}
            {state === "loading" ? "正在测算" : "计算入住预算"}
          </Button>
        </Card>

        <Card className="p-6">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm text-primary/80">
                搬家预算
              </p>
              <h2 className="mt-2 text-2xl font-semibold">预算结论</h2>
            </div>
            {result ? <RiskBadge status={result.status} tone="generic" /> : null}
          </div>

          {result ? (
            <div className="space-y-5">
              <p className="text-sm leading-7 text-muted-foreground">{result.summary}</p>
              <div className="grid gap-3 sm:grid-cols-3">
                <SummaryTile icon={ReceiptText} label="首笔支出" value={formatMoney(result.upfrontCost)} />
                <SummaryTile icon={WalletCards} label="签约后余额" value={formatMoney(result.cashAfterMove)} />
                <SummaryTile icon={PiggyBank} label="安全垫" value={`${result.safetyMonths.toFixed(1)} 个月`} />
              </div>
              <div className="rounded-md border border-border bg-secondary p-4">
                <div className="mb-3 flex items-center justify-between gap-4">
                  <p className="text-sm font-medium">预算评分</p>
                  <p className="text-2xl font-semibold">{result.score}</p>
                </div>
                <Progress value={result.score} />
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  刚性支出 {formatMoney(requiredCost)}，最低建议安全垫 {formatMoney(result.minimumSafeCash)}。
                </p>
              </div>
              <div className="rounded-md border border-amber-300/20 bg-amber-300/10 p-4">
                <div className="mb-3 flex items-center gap-2 text-amber-700">
                  <ShieldAlert className="h-4 w-4" />
                  <h3 className="font-semibold">预算风险</h3>
                </div>
                <div className="grid gap-2 text-sm leading-6 text-amber-900/90">
                  {result.risks.map((risk) => (
                    <p key={risk}>{risk}</p>
                  ))}
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <Button asChild variant="secondary">
                  <Link href={buildPaymentHref(result, lastInput, activeReportId)}>
                    <WalletCards className="mr-2 h-4 w-4" />
                    做付款前确认
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild variant="secondary">
                  <Link href={buildEvidenceHref(result, lastInput, activeReportId)}>
                    <Archive className="mr-2 h-4 w-4" />
                    补首笔凭据
                  </Link>
                </Button>
                <Button asChild variant="secondary">
                  <Link href={buildContractHref(result, lastInput, activeReportId)}>
                    <FileCheck2 className="mr-2 h-4 w-4" />
                    审付款条款
                  </Link>
                </Button>
              </div>
            </div>
          ) : (
            <div className="min-h-[340px] rounded-md border border-border bg-secondary p-5">
              <Badge variant="secondary" className="w-fit">
                签约前置
              </Badge>
              <h3 className="mt-4 text-xl font-semibold">别只看月租，要看首笔现金</h3>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">
                押一付三、中介费、搬家和添置会一起发生。预算测算会告诉你：能签、要谈，还是先停。
              </p>
              <div className="mt-5 grid gap-3 text-sm leading-6">
                {[
                  ["01", "算清签约当天要付多少"],
                  ["02", "看签约后现金是否安全"],
                  ["03", "再决定付款或继续谈"],
                ].map(([step, label]) => (
                  <div key={step} className="flex items-center gap-3 rounded-md border border-border bg-secondary/60 p-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
                      {step}
                    </span>
                    <span className="text-muted-foreground">{label}</span>
                  </div>
                ))}
              </div>
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
                  <h3 className="font-semibold">预算谈判包</h3>
                </div>
                <p className="max-w-3xl text-sm leading-7 text-muted-foreground">
                  把首笔支出、安全垫、付款周期、中介费/服务费、收据要求和付款前确认整理成可直接发送的协商文本，避免在签约当天被一次性打穿现金。
                </p>
              </div>
              <Button type="button" variant="outline" onClick={copyMoveMemo}>
                <Copy className="mr-2 h-4 w-4" />
                {copiedMemo ? "已复制" : "复制谈判包"}
              </Button>
            </div>
            <pre className="mt-4 max-h-[360px] overflow-auto whitespace-pre-wrap rounded-md border border-border bg-secondary p-4 text-sm leading-7 text-muted-foreground">
              {buildMoveNegotiationMemo(result, lastInput)}
            </pre>
          </Card>

          <section className="grid gap-4 lg:grid-cols-[0.58fr_0.42fr]">
            <Card className="p-5">
              <h3 className="font-semibold">支出拆解</h3>
              <div className="mt-4 overflow-x-auto">
                <table className="min-w-[720px] text-left text-sm">
                  <thead className="text-xs text-muted-foreground">
                    <tr className="border-b border-border">
                      <th className="px-3 py-3 font-medium">项目</th>
                      <th className="px-3 py-3 font-medium">金额</th>
                      <th className="px-3 py-3 font-medium">时间</th>
                      <th className="px-3 py-3 font-medium">属性</th>
                      <th className="px-3 py-3 font-medium">说明</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.lineItems.map((item) => (
                      <tr key={item.label} className="border-b border-border last:border-0">
                        <td className="px-3 py-4 font-medium">{item.label}</td>
                        <td className="px-3 py-4">{formatMoney(item.amount)}</td>
                        <td className="px-3 py-4 text-muted-foreground">{item.timing}</td>
                        <td className="px-3 py-4">
                          <Badge variant={itemTypeVariant[item.type]}>{itemTypeCopy[item.type]}</Badge>
                        </td>
                        <td className="px-3 py-4 text-muted-foreground">{item.note}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            <Card className="p-5">
              <h3 className="font-semibold">谈判杠杆</h3>
              <div className="mt-3 grid gap-2 text-sm leading-6 text-muted-foreground">
                {result.negotiationLevers.map((item) => (
                  <p key={item} className="rounded-md border border-border bg-secondary p-3">
                    {item}
                  </p>
                ))}
              </div>
            </Card>
          </section>

          <section className="grid gap-4 lg:grid-cols-3">
            {result.scenarios.map((scenario) => (
              <Card key={scenario.label} className="p-5">
                <div className="mb-4 flex items-start justify-between gap-4">
                  <h3 className="font-semibold">{scenario.label}</h3>
                  <RiskBadge status={scenario.status} tone="generic" />
                </div>
                <div className="grid gap-3 text-sm">
                  <Metric label="首笔支出" value={formatMoney(scenario.upfrontCost)} />
                  <Metric label="签约后余额" value={formatMoney(scenario.cashAfterMove)} />
                  <Metric label="安全垫" value={`${scenario.safetyMonths.toFixed(1)} 个月`} />
                  <Metric label="月租收入比" value={formatPercent(scenario.rentIncomeRatio)} />
                </div>
                <p className="mt-4 text-sm leading-6 text-muted-foreground">{scenario.verdict}</p>
              </Card>
            ))}
          </section>

          <section className="grid gap-4 lg:grid-cols-2">
            <InfoPanel title="下一步" items={result.nextActions} />
            <InfoPanel title="测算假设" items={result.assumptions} />
          </section>
        </>
      ) : null}
    </div>
  );
}

function buildMoveContext(result: MoveBudgetResult, input?: MoveBudgetInput | null) {
  return [
    "入住预算测算结果",
    `城市：${result.city}`,
    input?.monthlyIncome ? `税后月收入：${Math.round(input.monthlyIncome).toLocaleString()} 元` : "",
    input?.cashOnHand ? `手头现金：${Math.round(input.cashOnHand).toLocaleString()} 元` : "",
    input?.monthlyRent ? `月租：${Math.round(input.monthlyRent).toLocaleString()} 元` : "",
    input?.depositMonths && input?.prepaidMonths
      ? `付款结构：押 ${input.depositMonths} 付 ${input.prepaidMonths}`
      : "",
    `首笔支出：${Math.round(result.upfrontCost).toLocaleString()} 元`,
    `签约后剩余现金：${Math.round(result.cashAfterMove).toLocaleString()} 元`,
    `最低建议安全垫：${Math.round(result.minimumSafeCash).toLocaleString()} 元`,
    `安全垫：${result.safetyMonths.toFixed(1)} 个月`,
    `结论：${result.summary}`,
    ...result.risks.slice(0, 6).map((item) => `预算风险：${item}`),
    ...result.negotiationLevers.slice(0, 4).map((item) => `谈判杠杆：${item}`),
    ...result.nextActions.slice(0, 4).map((item) => `下一步：${item}`),
  ]
    .filter(Boolean)
    .join("\n");
}

function buildPaymentHref(
  result: MoveBudgetResult,
  input?: MoveBudgetInput | null,
  reportId?: string,
) {
  const monthlyRent = input?.monthlyRent ?? 5200;
  const params = new URLSearchParams({
    from: "move",
    title: "入住预算带入房源",
    city: result.city,
    listingTitle: "入住预算带入房源",
    paymentType: "首笔租金",
    amount: String(result.upfrontCost),
    monthlyRent: String(monthlyRent),
    stage: "签约当天付款前",
    contractStatus:
      result.status === "reject"
        ? "预算风险较高，付款条件未确认"
        : "付款周期和合同条款待最终确认",
    identityStatus: "待确认出租人身份",
    authorizationStatus: "待确认产权/转租授权",
    payeeType: "待确认收款主体",
    payeeMatchesContract: "暂不清楚",
    refundRule: "押金、定金、服务费和提前退租条件待写清",
    receiptStatus: "需要收据/电子确认",
    paymentChannel: "待确认",
    urgencyPressure:
      result.status === "reject" ? "预算不足，先别付款" : "首笔支出较大，需要付款前确认",
    notes: [...result.risks, ...result.negotiationLevers].slice(0, 8).join("；"),
    reportContext: buildMoveContext(result, input),
  });
  if (reportId) params.set("reportId", reportId);
  return `/payment?${params.toString()}`;
}

function buildEvidenceHref(
  result: MoveBudgetResult,
  input?: MoveBudgetInput | null,
  reportId?: string,
) {
  const params = new URLSearchParams({
    from: "move",
    stage: "签约前",
    title: "入住预算带入房源",
    city: result.city,
    deposit: `首笔支出 ${Math.round(result.upfrontCost).toLocaleString()} 元，押金、预付租金、中介费和服务费需逐项保存凭据`,
    paymentCycle: input?.depositMonths && input?.prepaidMonths
      ? `押 ${input.depositMonths} 付 ${input.prepaidMonths}，付款周期需写入合同或聊天确认`
      : "押付方式、付款周期和服务费需写入合同或聊天确认",
    risks: [...result.risks, ...result.nextActions].slice(0, 8).join("；"),
    reportContext: buildMoveContext(result, input),
  });
  if (reportId) params.set("reportId", reportId);
  return `/evidence?${params.toString()}`;
}

function buildContractHref(
  result: MoveBudgetResult,
  input?: MoveBudgetInput | null,
  reportId?: string,
) {
  const params = new URLSearchParams({
    from: "move",
    city: result.city,
    contractText: [
      "以下内容来自入住预算测算，不等同于完整合同。请粘贴真实合同后重点确认付款周期、押金、服务费、中介费、提前退租和收款主体：",
      buildMoveContext(result, input),
    ].join("\n\n"),
  });
  if (reportId) params.set("reportId", reportId);
  return `/contract?${params.toString()}`;
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

function SummaryTile({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Truck;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-md border border-border bg-secondary p-4">
      <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-md bg-primary/15 text-primary">
        <Icon className="h-4 w-4" />
      </div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-semibold">{value}</p>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-md border border-border bg-secondary px-3 py-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function InfoPanel({ title, items }: { title: string; items: string[] }) {
  return (
    <Card className="p-5">
      <h3 className="font-semibold">{title}</h3>
      <div className="mt-3 grid gap-2 text-sm leading-6 text-muted-foreground">
        {items.map((item) => (
          <p key={item} className="rounded-md border border-border bg-secondary p-3">
            {item}
          </p>
        ))}
      </div>
    </Card>
  );
}

