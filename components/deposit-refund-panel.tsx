"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Archive,
  ArrowRight,
  BadgeDollarSign,
  CalendarClock,
  CheckCircle2,
  Copy,
  FileText,
  KeyRound,
  Landmark,
  Loader2,
  ReceiptText,
  ShieldAlert,
  WalletCards,
  Wrench,
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
import { buildDepositCaseEventDetails } from "@/lib/lifecycle-case-event-details";
import type {
  DepositDeductionItem,
  DepositRefundInput,
  DepositRefundResult,
} from "@/lib/deposit-refund";
import { buildFlowHref, compactContext } from "@/lib/flow-links";

type SubmitState = "idle" | "loading" | "error";
type DepositSeed = Partial<DepositRefundInput> & {
  autoGenerate?: boolean;
  sourceLabel?: string;
  reportId?: string;
  title?: string;
};

const confidenceVariant: Record<
  DepositDeductionItem["confidence"],
  "success" | "warning" | "destructive"
> = {
  明确: "success",
  需确认: "warning",
  可争议: "destructive",
};

function formatMoney(value: number) {
  return `${Math.round(value).toLocaleString()} 元`;
}

function seedValue(value: string | undefined, fallback: string) {
  return value?.trim() || fallback;
}

function seedNumber(value: number | undefined, fallback: string) {
  return Number.isFinite(value) ? String(value) : fallback;
}

function buildEvidenceHref(result: DepositRefundResult, reportId?: string, title?: string) {
  return buildFlowHref("/evidence", {
    from: "deposit",
    reportId,
    stage: "退租押金",
    city: result.city,
    title,
    listingTitle: title,
    deposit: `押金 ${result.depositAmount.toLocaleString()} 元`,
    risks: compactContext(result.risks),
    reportContext: compactContext([
      result.summary,
      `目标退还：${result.targetRefund.toLocaleString()} 元；最低可接受退还：${result.suggestedRefundFloor.toLocaleString()} 元。`,
      "扣款拆解：",
      result.deductions.map((item) => `${item.label} ${item.amount.toLocaleString()} 元：${item.action}`),
      "材料清单：",
      result.evidenceChecklist,
    ]),
  });
}

function buildRepairHref(result: DepositRefundResult, reportId?: string, title?: string) {
  return buildFlowHref("/repair", {
    from: "deposit",
    reportId,
    city: result.city,
    listingTitle: title,
    evidenceLevel: "部分材料",
    depositConcern: "已经进入退租扣款争议",
    notes: compactContext([
      "从押金退还带入：对方可能把维修、清洁或旧损坏作为扣款理由。",
      result.summary,
      result.risks,
      result.deductions.map((item) => `${item.label}：${item.reason}`),
    ]),
  });
}

function buildOfficialHref(result: DepositRefundResult, reportId?: string, title?: string) {
  return buildFlowHref("/official", {
    from: "deposit",
    reportId,
    city: result.city,
    title,
    listingTitle: title,
    stage: "退租押金争议/扣款依据确认",
    contractStatus: "押金返还、扣款条件和维修责任条款待确认",
    concerns: compactContext([
      "从押金退还带入：对方未提供扣款依据、押金未按期返还或要求确认争议扣款时，需要准备官方投诉/调解材料。",
      result.summary,
      `目标退还：${result.targetRefund.toLocaleString()} 元；最低可接受退还：${result.suggestedRefundFloor.toLocaleString()} 元；返还截止：${result.returnDeadlineText}。`,
      result.risks,
      result.deductions.map((item) => `${item.label} ${item.amount.toLocaleString()} 元：${item.reason}`),
      result.evidenceChecklist,
    ]),
    reportContext: compactContext([result.nextActions, result.assumptions]),
  });
}

function buildPaymentHref(result: DepositRefundResult, reportId?: string, title?: string) {
  return buildFlowHref("/payment", {
    from: "deposit",
    reportId,
    city: result.city,
    title,
    listingTitle: title,
    paymentType: "押金扣款确认/补付争议",
    amount: result.claimedDeduction || result.disputedDeduction || result.depositAmount,
    monthlyRent: result.depositAmount,
    stage: "退租押金扣款确认前",
    contractStatus: "押金返还和扣款依据待确认",
    refundRule: `目标退还 ${result.targetRefund.toLocaleString()} 元；最低可接受退还 ${result.suggestedRefundFloor.toLocaleString()} 元；返还截止 ${result.returnDeadlineText}`,
    receiptStatus: "退租交割、扣款依据和返还凭证待补充",
    urgencyPressure: "对方要求先签扣款确认、接受少退押金或补付费用",
    notes: compactContext([
      "从押金退还带入：扣款依据未拆清前，不建议签署扣款确认、放弃追偿或补付费用。",
      result.summary,
      result.risks,
      result.deductions.map((item) => `${item.label} ${item.amount.toLocaleString()} 元：${item.action}`),
    ]),
    reportContext: compactContext([result.evidenceChecklist, result.nextActions, result.assumptions]),
  });
}

function buildDepositMemo(result: DepositRefundResult) {
  const disputedItems = result.deductions.filter((item) => item.confidence === "可争议");
  const clearItems = result.deductions.filter((item) => item.confidence === "明确" && item.amount > 0);
  const disputedLines = disputedItems.length
    ? disputedItems.map(
        (item, index) =>
          `${index + 1}. ${item.label}：${item.amount.toLocaleString()} 元。${item.action}`,
      )
    : ["1. 当前还没看到明确可争议扣款，但仍请提供所有扣款明细和合同依据。"];
  const clearLines = clearItems.length
    ? clearItems.map((item, index) => `${index + 1}. ${item.label}：${item.amount.toLocaleString()} 元。`)
    : ["1. 暂无已确认扣款，请以交割记录和账单为准。"];

  return [
    `你好，关于${result.city}这套房的退租押金 ${result.depositAmount.toLocaleString()} 元，我根据合同、交割和现有扣款说明先做了拆分。`,
    "",
    `我认可需要按实际账单结清的费用，但目标退还金额应按 ${result.targetRefund.toLocaleString()} 元核算；即使双方协商，返还金额也不应低于 ${result.suggestedRefundFloor.toLocaleString()} 元。`,
    `请在 ${result.returnDeadlineText} 返还或提供完整扣款依据。`,
    "",
    "一、已确认或可核对的费用",
    ...clearLines,
    "",
    "二、我暂不确认的争议扣款",
    ...disputedLines,
    "",
    "三、请补充的扣款依据",
    "1. 每项扣款对应的合同条款或双方书面约定。",
    "2. 损坏位置照片、入住前后对比、维修报价或正式票据。",
    "3. 退租当天表读数、交割确认和钥匙门禁交还记录。",
    "",
    "以上材料确认前，我暂不签署扣款确认或放弃追偿的文字。请尽量用文字或可截图留存的方式回复，方便双方后续核对。",
  ].join("\n");
}

export function DepositRefundPanel({ initialInput }: { initialInput?: DepositSeed }) {
  const reportId = initialInput?.reportId || "";
  const activeTitle = initialInput?.title || "";
  const autoSubmittedRef = useRef(false);
  const [result, setResult] = useState<DepositRefundResult | null>(null);
  const [copiedMemo, setCopiedMemo] = useState(false);
  const [state, setState] = useState<SubmitState>("idle");
  const [message, setMessage] = useState(
    "这里只整理押金退还计划，不读取聊天记录或支付账户。",
  );

  const disputePercent = useMemo(() => {
    if (!result?.depositAmount) return 0;
    return Math.min(Math.round((result.disputedDeduction / result.depositAmount) * 100), 100);
  }, [result]);

  const submitPayload = useCallback(async (payload: DepositRefundInput, loadingMessage: string) => {
    setState("loading");
    setMessage(loadingMessage);

    try {
      const response = await fetch("/api/deposit/refund", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error("押金退还方案整理失败，请确认信息后重试。");
      }

      const data = (await response.json()) as DepositRefundResult;
      setResult(data);
      setCopiedMemo(false);
      setState("idle");
      setMessage("押金退还方案已整理。先分清明确费用和争议扣款。");
      const caseEventDetails = buildDepositCaseEventDetails(data);
      void recordCaseEvent({
        reportId: reportId || "workspace",
        type: "deposit",
        title: "押金退还",
        status: data.status,
        summary: caseEventDetails.summary,
        highlights: caseEventDetails.highlights,
        href:
          typeof window !== "undefined"
            ? `${window.location.pathname}${window.location.search}`
            : undefined,
      });
    } catch (error) {
      setState("error");
      setMessage(error instanceof Error ? error.message : "押金退还方案整理失败，请稍后重试。");
    }
  }, [reportId]);

  useEffect(() => {
    if (!initialInput?.autoGenerate || autoSubmittedRef.current) return;
    autoSubmittedRef.current = true;
    void submitPayload(
      {
        city: seedValue(initialInput.city, ""),
        monthlyRent: initialInput.monthlyRent,
        depositAmount: initialInput.depositAmount,
        noticeDate: initialInput.noticeDate,
        moveOutDate: initialInput.moveOutDate,
        requiredNoticeDays: initialInput.requiredNoticeDays,
        contractReturnDays: initialInput.contractReturnDays,
        unpaidRent: initialInput.unpaidRent,
        utilityBalance: initialInput.utilityBalance,
        cleaningFee: initialInput.cleaningFee,
        damageClaim: initialInput.damageClaim,
        penaltyClaim: initialInput.penaltyClaim,
        evidenceLevel: seedValue(initialInput.evidenceLevel, "不确定"),
        landlordReason: seedValue(
          initialInput.landlordReason,
          "已从上一步带入，需要把争议扣款、交割材料和返还截止日拆清楚。",
        ),
      },
      "已带入上一步上下文，正在整理押金退还方案...",
    );
  }, [initialInput, submitPayload]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = new FormData(event.currentTarget);
    const payload = {
      city: String(form.get("city") || ""),
      monthlyRent: Number(form.get("monthlyRent")),
      depositAmount: Number(form.get("depositAmount")),
      noticeDate: String(form.get("noticeDate") || ""),
      moveOutDate: String(form.get("moveOutDate") || ""),
      requiredNoticeDays: Number(form.get("requiredNoticeDays")),
      contractReturnDays: Number(form.get("contractReturnDays")),
      unpaidRent: Number(form.get("unpaidRent")),
      utilityBalance: Number(form.get("utilityBalance")),
      cleaningFee: Number(form.get("cleaningFee")),
      damageClaim: Number(form.get("damageClaim")),
      penaltyClaim: Number(form.get("penaltyClaim")),
      evidenceLevel: String(form.get("evidenceLevel") || ""),
      landlordReason: String(form.get("landlordReason") || ""),
    };

    await submitPayload(payload, "正在整理押金退还方案...");
  }

  async function copyDepositMemo() {
    if (!result) return;

    try {
      await navigator.clipboard.writeText(buildDepositMemo(result));
      setCopiedMemo(true);
      window.setTimeout(() => setCopiedMemo(false), 1600);
    } catch {
      setCopiedMemo(false);
    }
  }

  return (
    <div className="space-y-6">
      <form
        onSubmit={handleSubmit}
        className={`grid grid-cols-1 gap-4 ${result ? "xl:grid-cols-[0.42fr_0.58fr]" : "max-w-3xl"}`}
      >
        <Card className="min-w-0 p-6">
          <div className="mb-6">
            <p className="text-sm text-primary/80">
              押金退还
            </p>
            <h2 className="mt-2 text-2xl font-semibold">输入退租扣款情况</h2>
            {initialInput?.sourceLabel ? (
              <Badge variant="outline" className="mt-3 w-fit border-primary/30 text-primary">
                {initialInput.sourceLabel}
              </Badge>
            ) : null}
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              填写押金、通知期、拟扣款和材料情况，拆分明确费用、可争议扣款、退款目标和沟通文本。
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field
              label="城市"
              name="city"
              defaultValue={seedValue(initialInput?.city, "")}
              placeholder="填写租房城市"
              type="text"
            />
            <Field
              label="月租"
              name="monthlyRent"
              defaultValue={seedNumber(initialInput?.monthlyRent, "")}
              placeholder="填写月租金额"
            />
            <Field
              label="押金金额"
              name="depositAmount"
              defaultValue={seedNumber(initialInput?.depositAmount, "")}
              placeholder="填写已交押金金额"
            />
            <Field
              label="合同要求提前通知天数"
              name="requiredNoticeDays"
              defaultValue={seedNumber(initialInput?.requiredNoticeDays, "")}
              placeholder="填写合同要求的提前通知天数"
            />
            <Field
              label="通知退租日期"
              name="noticeDate"
              defaultValue={seedValue(initialInput?.noticeDate, "")}
              type="date"
            />
            <Field
              label="计划退租日期"
              name="moveOutDate"
              defaultValue={seedValue(initialInput?.moveOutDate, "")}
              type="date"
            />
            <Field
              label="合同约定返还天数"
              name="contractReturnDays"
              defaultValue={seedNumber(initialInput?.contractReturnDays, "")}
              placeholder="填写合同约定押金返还天数"
            />
            <Field
              label="未结清租金"
              name="unpaidRent"
              defaultValue={seedNumber(initialInput?.unpaidRent, "")}
              placeholder="没有可留空"
            />
            <Field
              label="水电燃气结算"
              name="utilityBalance"
              defaultValue={seedNumber(initialInput?.utilityBalance, "")}
              placeholder="没有可留空"
            />
            <Field
              label="清洁费"
              name="cleaningFee"
              defaultValue={seedNumber(initialInput?.cleaningFee, "")}
              placeholder="没有可留空"
            />
            <Field
              label="房东主张维修扣款"
              name="damageClaim"
              defaultValue={seedNumber(initialInput?.damageClaim, "")}
              placeholder="填写对方主张扣款金额"
            />
            <Field
              label="提前退租违约金"
              name="penaltyClaim"
              defaultValue={seedNumber(initialInput?.penaltyClaim, "")}
              placeholder="没有可留空"
            />
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="evidenceLevel">材料完整度</Label>
              <select
                id="evidenceLevel"
                name="evidenceLevel"
                defaultValue={seedValue(initialInput?.evidenceLevel, "不确定")}
                className="h-11 w-full rounded-md border border-input bg-secondary px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              >
                <option>不确定</option>
                <option>材料完整</option>
                <option>部分材料</option>
                <option>几乎没有材料</option>
              </select>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="landlordReason">对方扣款理由</Label>
              <Textarea
                id="landlordReason"
                name="landlordReason"
                className="min-h-[116px]"
                defaultValue={seedValue(initialInput?.landlordReason, "")}
                placeholder="填写对方说明的扣款理由、扣款金额和你不认可的地方"
              />
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
              <KeyRound className="mr-2 h-5 w-5" />
            )}
            {state === "loading" ? "正在整理方案" : "整理押金退还方案"}
          </Button>
        </Card>

        {result ? (
          <Card className="min-w-0 p-6">
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm text-primary/80">
                  押金结果
                </p>
                <h2 className="mt-2 text-2xl font-semibold">押金退还结论</h2>
              </div>
              <RiskBadge status={result.status} tone="generic" />
            </div>
            <div className="space-y-5">
              <p className="text-sm leading-7 text-muted-foreground">{result.summary}</p>
              <div className="grid gap-3 sm:grid-cols-3">
                <SummaryTile icon={WalletCards} label="押金金额" value={formatMoney(result.depositAmount)} />
                <SummaryTile icon={ReceiptText} label="目标退还" value={formatMoney(result.targetRefund)} />
                <SummaryTile icon={ShieldAlert} label="最低可接受退还" value={formatMoney(result.suggestedRefundFloor)} />
              </div>
              <div className="rounded-md border border-border bg-secondary p-4">
                <div className="mb-3 flex items-center justify-between gap-4">
                  <p className="text-sm font-medium">回收评分</p>
                  <p className="text-2xl font-semibold">{result.score}</p>
                </div>
                <Progress value={result.score} />
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  争议扣款占押金约 {disputePercent}%，预计返还截止：{result.returnDeadlineText}。
                </p>
              </div>
              <div className="rounded-md border border-amber-300/20 bg-amber-300/10 p-4">
                <div className="mb-3 flex items-center gap-2 text-amber-700">
                  <ShieldAlert className="h-4 w-4" />
                  <h3 className="font-semibold">押金风险</h3>
                </div>
                <div className="grid gap-2 text-sm leading-6 text-amber-900/90">
                  {result.risks.map((risk) => (
                    <p key={risk}>{risk}</p>
                  ))}
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <Button asChild variant="secondary" className="h-auto justify-between gap-3 py-3">
                  <Link href={buildEvidenceHref(result, reportId, activeTitle)}>
                    <span className="flex min-w-0 items-center gap-2">
                      <Archive className="h-4 w-4 shrink-0" />
                      <span className="truncate">同步押金材料</span>
                    </span>
                    <ArrowRight className="h-4 w-4 shrink-0" />
                  </Link>
                </Button>
                <Button asChild variant="secondary" className="h-auto justify-between gap-3 py-3">
                  <Link href={buildOfficialHref(result, reportId, activeTitle)}>
                    <span className="flex min-w-0 items-center gap-2">
                      <Landmark className="h-4 w-4 shrink-0" />
                      <span className="truncate">查看投诉办法</span>
                    </span>
                    <ArrowRight className="h-4 w-4 shrink-0" />
                  </Link>
                </Button>
                <Button asChild variant="secondary" className="h-auto justify-between gap-3 py-3">
                  <Link href={buildPaymentHref(result, reportId, activeTitle)}>
                    <span className="flex min-w-0 items-center gap-2">
                      <BadgeDollarSign className="h-4 w-4 shrink-0" />
                      <span className="truncate">确认扣款依据</span>
                    </span>
                    <ArrowRight className="h-4 w-4 shrink-0" />
                  </Link>
                </Button>
                <Button asChild variant="secondary" className="h-auto justify-between gap-3 py-3">
                  <Link href={buildRepairHref(result, reportId, activeTitle)}>
                    <span className="flex min-w-0 items-center gap-2">
                      <Wrench className="h-4 w-4 shrink-0" />
                      <span className="truncate">拆维修扣款</span>
                    </span>
                    <ArrowRight className="h-4 w-4 shrink-0" />
                  </Link>
                </Button>
              </div>

              <details className="rounded-md border border-border bg-secondary/55 p-4">
                <summary className="cursor-pointer text-sm font-medium text-foreground">
                  查看押金催退文本
                </summary>
                <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <p className="text-sm leading-6 text-muted-foreground">
                    用于列明不认可的扣款、要求提供依据，并保留书面催告记录。
                  </p>
                  <Button type="button" variant="outline" onClick={copyDepositMemo}>
                    <Copy className="mr-2 h-4 w-4" />
                    {copiedMemo ? "已复制" : "复制文本"}
                  </Button>
                </div>
                <pre className="mt-4 max-h-[320px] overflow-auto whitespace-pre-wrap break-words rounded-md border border-border bg-card p-4 text-xs leading-6 text-muted-foreground">
                  {buildDepositMemo(result)}
                </pre>
              </details>
            </div>
          </Card>
        ) : null}
      </form>

      {result ? (
        <>
          <section className="grid grid-cols-1 gap-4 lg:grid-cols-[0.58fr_0.42fr]">
            <Card className="min-w-0 p-5">
              <h3 className="font-semibold">扣款拆解</h3>
              <div className="mt-4 overflow-x-auto">
                <table className="min-w-[720px] text-left text-sm">
                  <thead className="text-xs text-muted-foreground">
                    <tr className="border-b border-border">
                      <th className="px-3 py-3 font-medium">项目</th>
                      <th className="px-3 py-3 font-medium">金额</th>
                      <th className="px-3 py-3 font-medium">判断</th>
                      <th className="px-3 py-3 font-medium">依据</th>
                      <th className="px-3 py-3 font-medium">事项</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.deductions.map((item) => (
                      <tr key={item.label} className="border-b border-border last:border-0">
                        <td className="px-3 py-4 font-medium">{item.label}</td>
                        <td className="px-3 py-4">{formatMoney(item.amount)}</td>
                        <td className="px-3 py-4">
                          <Badge variant={confidenceVariant[item.confidence]}>{item.confidence}</Badge>
                        </td>
                        <td className="px-3 py-4 text-muted-foreground">{item.reason}</td>
                        <td className="px-3 py-4 text-muted-foreground">{item.action}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            <Card className="min-w-0 p-5">
              <h3 className="font-semibold">沟通话术</h3>
              <div className="mt-3 grid gap-2 text-sm leading-6 text-muted-foreground">
                {result.messageTemplates.map((item) => (
                  <p key={item} className="rounded-md border border-border bg-secondary p-3">
                    {item}
                  </p>
                ))}
              </div>
            </Card>
          </section>

          <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <InfoPanel title="材料清单" icon={FileText} items={result.evidenceChecklist} />
            <InfoPanel
              title="退租时间线"
              icon={CalendarClock}
              items={result.timeline.map((item) => `${item.dateLabel}：${item.title}。${item.action}`)}
            />
            <InfoPanel title="后续确认" icon={CheckCircle2} items={result.nextActions} />
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
  placeholder,
  type = "number",
}: {
  label: string;
  name: string;
  defaultValue: string;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} type={type} defaultValue={defaultValue} placeholder={placeholder} />
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
      <p className="mt-1 text-xl font-semibold">{value}</p>
    </div>
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

