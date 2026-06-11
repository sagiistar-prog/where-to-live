"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BadgeDollarSign,
  CheckCircle2,
  ClipboardCheck,
  Copy,
  CreditCard,
  Loader2,
  MessageSquareText,
  ReceiptText,
  ShieldAlert,
  WalletCards,
  type LucideIcon,
} from "lucide-react";
import { RiskBadge } from "@/components/risk-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { recordCaseEvent } from "@/lib/client-case-events";
import { buildFlowHref, compactContext } from "@/lib/flow-links";
import type {
  PaymentGateInput,
  PaymentGateResult,
  PaymentRiskItem,
  PaymentRiskLevel,
} from "@/lib/payment-gate";

type SubmitState = "idle" | "loading" | "error";
type PaymentSeed = Partial<PaymentGateInput> & {
  autoGenerate?: boolean;
  sourceLabel?: string;
  reportId?: string;
};

const levelVariant: Record<PaymentRiskLevel, "destructive" | "warning" | "success"> = {
  高: "destructive",
  中: "warning",
  低: "success",
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

function buildPaymentMemo(result: PaymentGateResult) {
  const blockerLines =
    result.blockers.length && !result.blockers[0].includes("暂无高优先级")
      ? result.blockers.map((item, index) => `${index + 1}. ${item}`)
      : ["1. 当前没有高优先级待确认事项，但仍需保存付款前基础凭据。"];
  const checklistLines = result.beforePayChecklist.map((item, index) => `${index + 1}. ${item}`);

  return [
    `你好，关于${result.city}「${result.listingTitle}」的${result.paymentType}付款，我这边先把付款前材料和条件确认清楚。`,
    "",
    `当前拟付款金额为 ${result.amount.toLocaleString()} 元，住哪儿建议锁房类小额付款上限约 ${result.maxReasonableHold.toLocaleString()} 元；当前判断是：${result.verdict}。`,
    "",
    "一、目前不能直接付款的原因",
    ...blockerLines,
    "",
    "二、付款前请补充或确认",
    ...checklistLines,
    "",
    "三、如确实需要先锁房，我只能接受以下条件",
    `1. 金额控制在 ${result.maxReasonableHold.toLocaleString()} 元以内，且写明款项性质、可退条件、退还期限和退回账户。`,
    "2. 收款人必须与合同主体一致；如不一致，请先提供授权收款说明。",
    "3. 合同草稿、出租权/转租授权、收据或电子确认先发我核对。",
    "",
    "四、付款备注我会写为",
    result.paymentNoteTemplate,
    "",
  "在上述材料说清前，我先不转账。请尽量用文字回复，方便双方后续核对。",
  ].join("\n");
}

function buildEvidenceHref(
  result: PaymentGateResult,
  input?: Partial<PaymentGateInput> | null,
  reportId?: string,
) {
  return buildFlowHref("/evidence", {
    from: "payment",
    reportId,
    city: result.city,
    title: result.listingTitle,
    listingTitle: result.listingTitle,
    stage: input?.stage,
    paymentType: result.paymentType,
    amount: result.amount,
    monthlyRent: input?.monthlyRent,
    contractStatus: input?.contractStatus,
    authorizationStatus: input?.authorizationStatus,
    identityStatus: input?.identityStatus,
    payeeType: input?.payeeType,
    payeeMatchesContract: input?.payeeMatchesContract,
    refundRule: input?.refundRule,
    receiptStatus: input?.receiptStatus,
    paymentChannel: input?.paymentChannel,
    urgencyPressure: input?.urgencyPressure,
    notes: compactContext([
      `来自付款前确认：${result.verdict}`,
      result.summary,
      ...result.blockers.slice(0, 4).map((item) => `先别付款：${item}`),
      input?.notes,
    ]),
    reportContext: compactContext([
      input?.reportContext,
      ...result.beforePayChecklist.slice(0, 4).map((item) => `付款前待确认：${item}`),
      ...result.receiptChecklist.slice(0, 3).map((item) => `收据要素：${item}`),
    ]),
  });
}

export function PaymentGatePanel({ initialInput }: { initialInput?: PaymentSeed }) {
  const autoSubmittedRef = useRef(false);
  const [result, setResult] = useState<PaymentGateResult | null>(null);
  const [lastInput, setLastInput] = useState<Partial<PaymentGateInput> | null>(
    initialInput ?? null,
  );
  const [checkedHardGates, setCheckedHardGates] = useState<string[]>([]);
  const [copiedMemo, setCopiedMemo] = useState(false);
  const [state, setState] = useState<SubmitState>("idle");
  const [message, setMessage] = useState(
    "这里只整理付款前必须确认的材料，不读取支付账户，也不会替你发起转账。",
  );

  const riskRatio = useMemo(() => {
    if (!result?.amount || !result?.maxReasonableHold) return 0;
    return Math.round((result.amount / result.maxReasonableHold) * 100);
  }, [result]);
  const hardGateItems = result?.beforePayChecklist ?? [];
  const missingHardGates = hardGateItems.filter((item) => !checkedHardGates.includes(item));
  const hardGateProgress = hardGateItems.length
    ? Math.round(((hardGateItems.length - missingHardGates.length) / hardGateItems.length) * 100)
    : 0;
  const hardGateReady = Boolean(
    result && result.status !== "reject" && hardGateItems.length && !missingHardGates.length,
  );

  const submitPayload = useCallback(
    async (payload: PaymentGateInput, loadingMessage = "正在拦截付款风险...") => {
      setState("loading");
      setMessage(loadingMessage);
      setLastInput(payload);

      try {
        const response = await fetch("/api/payment/gate", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          throw new Error("付款前确认失败，请确认信息后重试。");
        }

        const data = (await response.json()) as PaymentGateResult;
        setResult(data);
        setCheckedHardGates([]);
        setCopiedMemo(false);
        setState("idle");
        setMessage("付款前确认已保存。把待确认事项说清楚，再决定是否转账。");
        void recordCaseEvent({
          reportId: initialInput?.reportId || "workspace",
          type: "payment",
          title: "付款前确认",
          status: data.status,
          summary: data.summary,
          highlights: [...data.blockers, ...data.beforePayChecklist].slice(0, 6),
          href: typeof window !== "undefined" ? `${window.location.pathname}${window.location.search}` : undefined,
        });
      } catch (error) {
        setState("error");
        setMessage(error instanceof Error ? error.message : "付款前确认失败，请稍后重试。");
      }
    },
    [initialInput?.reportId],
  );

  useEffect(() => {
    if (!initialInput?.autoGenerate || autoSubmittedRef.current) return;
    autoSubmittedRef.current = true;
    void submitPayload(
      {
        city: initialInput.city,
        listingTitle: seedValue(initialInput.listingTitle, "上下文带入房源"),
        paymentType: seedValue(initialInput.paymentType, "定金"),
        amount: initialInput.amount ?? 2000,
        monthlyRent: initialInput.monthlyRent ?? 5200,
        stage: seedValue(initialInput.stage, "看房后，未签合同"),
        contractStatus: seedValue(initialInput.contractStatus, "未看到合同"),
        identityStatus: seedValue(initialInput.identityStatus, "未确认身份证明"),
        authorizationStatus: seedValue(initialInput.authorizationStatus, "未看到产权/转租授权"),
        payeeType: seedValue(initialInput.payeeType, "中介个人账户"),
        payeeMatchesContract: seedValue(initialInput.payeeMatchesContract, "主体不一致"),
        refundRule: seedValue(initialInput.refundRule, "口头承诺可退"),
        receiptStatus: seedValue(initialInput.receiptStatus, "只说转账截图即可"),
        paymentChannel: seedValue(initialInput.paymentChannel, "微信/支付宝私人转账"),
        urgencyPressure: seedValue(initialInput.urgencyPressure, "对方催今天必须付"),
        notes: seedValue(initialInput.notes, "上下文提示付款、授权、押金和合同材料需要补充。"),
        reportContext: initialInput.reportContext,
      },
      `${initialInput.sourceLabel ?? "已带入上下文"}，正在确认付款风险...`,
    );
  }, [initialInput, submitPayload]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = new FormData(event.currentTarget);
    const payload = {
      city: String(form.get("city") || ""),
      listingTitle: String(form.get("listingTitle") || ""),
      paymentType: String(form.get("paymentType") || ""),
      amount: Number(form.get("amount")),
      monthlyRent: Number(form.get("monthlyRent")),
      stage: String(form.get("stage") || ""),
      contractStatus: String(form.get("contractStatus") || ""),
      identityStatus: String(form.get("identityStatus") || ""),
      authorizationStatus: String(form.get("authorizationStatus") || ""),
      payeeType: String(form.get("payeeType") || ""),
      payeeMatchesContract: String(form.get("payeeMatchesContract") || ""),
      refundRule: String(form.get("refundRule") || ""),
      receiptStatus: String(form.get("receiptStatus") || ""),
      paymentChannel: String(form.get("paymentChannel") || ""),
      urgencyPressure: String(form.get("urgencyPressure") || ""),
      notes: String(form.get("notes") || ""),
      reportContext: String(form.get("reportContext") || ""),
    };

    await submitPayload(payload);
  }

  function toggleHardGate(item: string) {
    setCheckedHardGates((current) =>
      current.includes(item) ? current.filter((value) => value !== item) : [...current, item],
    );
  }

  async function copyPaymentMemo() {
    if (!result) return;
    await navigator.clipboard.writeText(buildPaymentMemo(result));
    setCopiedMemo(true);
  }

  async function syncPaymentReadiness() {
    if (!result) return;

    await recordCaseEvent({
      reportId: initialInput?.reportId || "workspace",
      type: "payment",
      title: "付款必须确认",
      status: hardGateReady ? result.status : "reject",
      summary: hardGateReady
        ? `转账前必须确认已全部确认，当前结论：${result.verdict}。`
        : `仍缺 ${missingHardGates.length} 项转账前必须确认，当前不建议付款。`,
      highlights: (missingHardGates.length
        ? missingHardGates.map((item) => `未确认：${item}`)
        : [result.paymentNoteTemplate, ...result.receiptChecklist]
      ).slice(0, 6),
      href:
        typeof window !== "undefined"
          ? `${window.location.pathname}${window.location.search}`
          : undefined,
    });
    setMessage(initialInput?.reportId ? "付款必须确认状态已保存到房源记录。" : "付款必须确认状态已保存到工作台。");
  }

  return (
    <div className="space-y-6">
      <form
        onSubmit={handleSubmit}
        className="grid grid-cols-1 gap-4 xl:grid-cols-[0.42fr_0.58fr]"
      >
        <Card className="min-w-0 p-6">
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-medium text-primary">
                付款前确认
              </p>
              <h2 className="mt-2 text-2xl font-semibold">输入拟付款条件</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                把“先交定金”“先转服务费”“合同明天补”这类高风险付款拆开看。住哪儿会判断哪些凭据还没准备好，哪些钱不该先打出去。
              </p>
            </div>
            {initialInput?.sourceLabel ? (
              <Badge variant="outline" className="w-fit border-primary/30 text-primary">
                {initialInput.sourceLabel}
              </Badge>
            ) : null}
          </div>

          <input type="hidden" name="reportContext" value={initialInput?.reportContext ?? ""} />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="城市" name="city" defaultValue={seedValue(initialInput?.city, "上海")} type="text" />
            <Field
              label="房源名称"
              name="listingTitle"
              defaultValue={seedValue(initialInput?.listingTitle, "徐汇一居室")}
              type="text"
            />
            <Field label="月租" name="monthlyRent" defaultValue={seedNumber(initialInput?.monthlyRent, "5200")} />
            <Field label="拟付款金额" name="amount" defaultValue={seedNumber(initialInput?.amount, "2000")} />
            <SelectField
              label="付款类型"
              name="paymentType"
              defaultValue={seedValue(initialInput?.paymentType, "定金")}
              options={["定金", "意向金", "订金", "押金", "首笔租金", "中介费", "服务费"]}
            />
            <SelectField
              label="当前阶段"
              name="stage"
              defaultValue={seedValue(initialInput?.stage, "看房后，未签合同")}
              options={["未看房，只看线上图", "看房后，未签合同", "已确认合同草稿", "签约当天", "交割确认前"]}
            />
            <SelectField
              label="合同状态"
              name="contractStatus"
              defaultValue={seedValue(initialInput?.contractStatus, "未看到合同")}
              options={["未看到合同", "只看到聊天承诺", "已看到合同草稿", "合同关键条款完整", "合同与房源信息不一致"]}
            />
            <SelectField
              label="身份确认"
              name="identityStatus"
              defaultValue={seedValue(initialInput?.identityStatus, "未确认身份证明")}
              options={["未确认身份证明", "只看过名片", "已确认房东/代理身份", "身份与合同主体不一致"]}
            />
            <SelectField
              label="出租授权"
              name="authorizationStatus"
              defaultValue={seedValue(initialInput?.authorizationStatus, "未看到产权/转租授权")}
              options={["未看到产权/转租授权", "口头说有授权", "已看到产权或委托", "已看到转租授权且覆盖租期", "对方拒绝提供授权"]}
            />
            <SelectField
              label="收款主体"
              name="payeeType"
              defaultValue={seedValue(initialInput?.payeeType, "中介个人账户")}
              options={["房东本人账户", "合同公司账户", "授权收款方", "中介个人账户", "室友/二房东个人账户"]}
            />
            <SelectField
              label="收款与合同"
              name="payeeMatchesContract"
              defaultValue={seedValue(initialInput?.payeeMatchesContract, "主体不一致")}
              options={["主体一致", "有书面授权", "主体不一致", "待确认"]}
            />
            <SelectField
              label="退款规则"
              name="refundRule"
              defaultValue={seedValue(initialInput?.refundRule, "口头承诺可退")}
              options={["写清可退条件和期限", "聊天写明可退", "口头承诺可退", "没写清", "明确不退"]}
            />
            <SelectField
              label="收据材料"
              name="receiptStatus"
              defaultValue={seedValue(initialInput?.receiptStatus, "只说转账截图即可")}
              options={["可开收据/电子确认", "有平台订单", "只说转账截图即可", "没有收据", "不开发票不收据"]}
            />
            <SelectField
              label="付款渠道"
              name="paymentChannel"
              defaultValue={seedValue(initialInput?.paymentChannel, "微信/支付宝私人转账")}
              options={["银行转账到合同主体", "平台担保/订单支付", "微信/支付宝私人转账", "现金", "中介代收"]}
            />
            <SelectField
              label="催付情况"
              name="urgencyPressure"
              defaultValue={seedValue(initialInput?.urgencyPressure, "对方催今天必须付")}
              options={["无催付", "说房源很抢手", "对方催今天必须付", "马上不付就没了", "倒计时优惠"]}
            />
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="notes">上下文说明</Label>
              <Textarea
                id="notes"
                name="notes"
                className="min-h-[112px]"
                defaultValue={seedValue(
                  initialInput?.notes,
                  "中介说房子很抢手，先交定金锁房，合同和授权明天再补。",
                )}
              />
            </div>
          </div>

          <StatusMessage state={state} message={message} />

          <Button type="submit" size="lg" className="mt-5 w-full" disabled={state === "loading"}>
            {state === "loading" ? (
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            ) : (
              <BadgeDollarSign className="mr-2 h-5 w-5" />
            )}
            {state === "loading" ? "正在确认" : "确认付款风险"}
          </Button>
        </Card>

        <Card className="min-w-0 p-6">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm text-primary/80">
                付款结果
              </p>
              <h2 className="mt-2 text-2xl font-semibold">付款结论</h2>
            </div>
            {result ? <RiskBadge status={result.status} tone="generic" /> : null}
          </div>

          {result ? (
            <div className="space-y-5">
              <p className="text-sm leading-7 text-muted-foreground">{result.summary}</p>
              <div className="grid gap-3 sm:grid-cols-3">
                <SummaryTile icon={CreditCard} label="付款结论" value={result.verdict} />
                <SummaryTile icon={WalletCards} label="拟付款" value={formatMoney(result.amount)} />
                <SummaryTile
                  icon={ReceiptText}
                  label="建议锁房上限"
                  value={formatMoney(result.maxReasonableHold)}
                />
              </div>
              <div className="rounded-md border border-border bg-secondary p-4">
                <div className="mb-3 flex items-center justify-between gap-4">
                  <p className="text-sm font-medium">付款安全评分</p>
                  <p className="text-2xl font-semibold">{result.score}</p>
                </div>
                <Progress value={result.score} />
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  本次拟付款约为建议锁房上限的 {riskRatio}%；金额越高，越需要合同、授权、收款主体和退款条件同时确认。
                </p>
              </div>
              <div
                className={`rounded-md border p-4 ${
                  hardGateReady
                    ? "border-emerald-300/25 bg-emerald-300/10"
                    : "border-rose-300/25 bg-rose-300/10"
                }`}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <ShieldAlert
                        className={`h-4 w-4 ${
                          hardGateReady ? "text-emerald-700" : "text-rose-700"
                        }`}
                      />
                      <h3 className="font-semibold">转账前必须确认</h3>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      这些是转账前必须确认的底线。任何一项没勾选，都先别付款。
                    </p>
                  </div>
                  <Badge variant={hardGateReady ? "success" : "destructive"}>
                    {hardGateReady ? "必须确认已通过" : "先别转账"}
                  </Badge>
                </div>
                <div className="mt-4">
                  <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
                    <span>必须确认进度</span>
                    <span>{hardGateProgress}%</span>
                  </div>
                  <Progress value={hardGateProgress} />
                </div>
                <div className="mt-4 grid gap-2">
                  {hardGateItems.map((item) => (
                    <Label
                      key={item}
                      className="flex cursor-pointer items-start gap-3 rounded-md border border-border bg-secondary/60 p-3 text-sm leading-6 text-muted-foreground"
                    >
                      <Checkbox
                        checked={checkedHardGates.includes(item)}
                        onCheckedChange={() => toggleHardGate(item)}
                        aria-label={item}
                      />
                      <span>{item}</span>
                    </Label>
                  ))}
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  className="mt-4 w-full"
                  onClick={syncPaymentReadiness}
                >
                  保存付款确认状态
                </Button>
                <Button asChild variant="secondary" className="mt-3 w-full">
                  <Link href={buildEvidenceHref(result, lastInput, initialInput?.reportId)}>
                    <ClipboardCheck className="mr-2 h-4 w-4" />
                    整理本次付款凭据
                  </Link>
                </Button>
              </div>
              <div className="rounded-md border border-amber-300/20 bg-amber-300/10 p-4">
                <div className="mb-3 flex items-center gap-2 text-amber-700">
                  <ShieldAlert className="h-4 w-4" />
                  <h3 className="font-semibold">付款前待确认事项</h3>
                </div>
                <div className="grid gap-2 text-sm leading-6 text-amber-900/90">
                  {result.blockers.map((item) => (
                    <p key={item}>{item}</p>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="min-h-[360px] rounded-md border border-border bg-secondary p-5">
              <Badge variant="secondary" className="w-fit">
                付款前置
              </Badge>
              <h3 className="mt-4 text-xl font-semibold">钱一打出去，谈判位置就变了</h3>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">
                付款前先确认合同版本、出租授权、收款主体、退款规则和收据材料。任何一个环节靠口头承诺，都应该先别转账。
              </p>
              <div className="mt-5 grid gap-3 text-sm leading-6">
                {[
                  ["01", "填清左侧付款条件"],
                  ["02", "整理必须确认清单"],
                  ["03", "补充凭据后再付款"],
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
                  <h3 className="font-semibold">付款前材料清单</h3>
                </div>
                <p className="max-w-3xl text-sm leading-7 text-muted-foreground">
                  把不能直接付款的原因、对方必须补的材料、小额锁房条件和付款备注整理成可发送文本，保护用户在转账前的谈判位置。
                </p>
              </div>
              <Button type="button" variant="outline" onClick={copyPaymentMemo}>
                <Copy className="mr-2 h-4 w-4" />
                {copiedMemo ? "已复制" : "复制材料包"}
              </Button>
            </div>
            <pre className="mt-4 max-h-[360px] overflow-auto whitespace-pre-wrap rounded-md border border-border bg-secondary p-4 text-sm leading-7 text-muted-foreground">
              {buildPaymentMemo(result)}
            </pre>
          </Card>

          <section className="grid grid-cols-1 gap-4 lg:grid-cols-[0.6fr_0.4fr]">
            <Card className="min-w-0 p-5">
              <h3 className="font-semibold">付款风险拆解</h3>
              <div className="mt-4 overflow-x-auto">
                <table className="min-w-[760px] text-left text-sm">
                  <thead className="text-xs text-muted-foreground">
                    <tr className="border-b border-border">
                      <th className="px-3 py-3 font-medium">风险</th>
                      <th className="px-3 py-3 font-medium">等级</th>
                      <th className="px-3 py-3 font-medium">为什么</th>
                      <th className="px-3 py-3 font-medium">付款前事项</th>
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

            <Card className="min-w-0 p-5">
              <div className="mb-3 flex items-center gap-2">
                <ReceiptText className="h-4 w-4 text-primary" />
                <h3 className="font-semibold">付款备注模板</h3>
              </div>
              <p className="rounded-md border border-border bg-secondary p-4 text-sm leading-7 text-muted-foreground">
                {result.paymentNoteTemplate}
              </p>
            </Card>
          </section>

          <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <InfoPanel title="付款前清单" icon={ClipboardCheck} items={result.beforePayChecklist} />
            <InfoPanel title="收据要素" icon={ReceiptText} items={result.receiptChecklist} />
            <InfoPanel title="沟通话术" icon={MessageSquareText} items={result.negotiationScripts} />
          </section>

          <section className="grid grid-cols-1 gap-4 lg:grid-cols-[0.5fr_0.5fr]">
            <InfoPanel title="下一步" icon={CheckCircle2} items={result.nextActions} />
            <InfoPanel title="判断假设" icon={ShieldAlert} items={result.assumptions} />
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

function SelectField({
  label,
  name,
  defaultValue,
  options,
}: {
  label: string;
  name: string;
  defaultValue: string;
  options: string[];
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}</Label>
      <select
        id={name}
        name={name}
        defaultValue={defaultValue}
        className="h-11 w-full rounded-md border border-input bg-secondary px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
      >
        {options.map((option) => (
          <option key={option}>{option}</option>
        ))}
      </select>
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

function RiskRow({ item }: { item: PaymentRiskItem }) {
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

