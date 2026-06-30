"use client";

import Link from "next/link";
import {
  Calculator,
  ClipboardCheck,
  Copy,
  CreditCard,
  FileCheck2,
  Landmark,
  LayoutDashboard,
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
import { Label } from "@/components/ui/label";
import { buildFlowHref, compactContext } from "@/lib/flow-links";
import type {
  PaymentGateInput,
  PaymentGateResult,
} from "@/lib/payment-gate";

function formatMoney(value: number) {
  return `${Math.round(value).toLocaleString()} 元`;
}

function formatOptionalMoney(value: number) {
  return value > 0 ? formatMoney(value) : "待确认";
}

export function buildPaymentMemo(result: PaymentGateResult) {
  const blockerLines =
    result.blockers.length && !result.blockers[0].includes("暂无高优先级")
      ? result.blockers.map((item, index) => `${index + 1}. ${item}`)
      : ["1. 当前没有明显付款阻断项，但仍需保存付款前基础材料。"];
  const checklistLines = result.beforePayChecklist.map((item, index) => `${index + 1}. ${item}`);

  return [
    `你好，关于「${result.city}」「${result.listingTitle}」的${result.paymentType}付款，我这边先把付款前材料和条件确认清楚。`,
    "",
    `当前拟付款金额为 ${result.amount > 0 ? `${result.amount.toLocaleString()} 元` : "待确认"}，建议锁房类小额付款上限为 ${result.maxReasonableHold > 0 ? `${result.maxReasonableHold.toLocaleString()} 元` : "待确认"}；当前判断是：${result.verdict}。`,
    "",
    "一、目前不能直接付款的原因",
    ...blockerLines,
    "",
    "二、付款前请补充或确认",
    ...checklistLines,
    "",
    "三、如确实需要先锁房，我只能接受以下条件",
    result.maxReasonableHold > 0
      ? `1. 金额控制在 ${result.maxReasonableHold.toLocaleString()} 元以内，且写明款项性质、可退条件、退还期限和退回账户。`
      : "1. 先补充月租和付款金额，再确认可接受的付款上限、款项性质、可退条件、退还期限和退回账户。",
    "2. 收款人必须与合同主体一致；如不一致，请先提供授权收款说明。",
    "3. 合同草稿、出租权/转租授权、收据或电子确认先发我核对。",
    "",
    "四、付款备注我会写为",
    result.paymentNoteTemplate,
    "",
    "在上述材料确认前，暂不转账。请尽量用文字回复，方便双方后续核对。",
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
      `来自付款咨询：${result.verdict}`,
      result.summary,
      ...result.blockers.slice(0, 4).map((item) => `暂不付款：${item}`),
      input?.notes,
    ]),
    reportContext: compactContext([
      input?.reportContext,
      ...result.beforePayChecklist.slice(0, 4).map((item) => `付款前待确认：${item}`),
      ...result.receiptChecklist.slice(0, 3).map((item) => `收据要素：${item}`),
    ]),
  });
}

function buildContractHref(
  result: PaymentGateResult,
  input?: Partial<PaymentGateInput> | null,
  reportId?: string,
) {
  return buildFlowHref("/contract", {
    from: "payment",
    reportId,
    city: result.city,
    title: result.listingTitle,
    listingTitle: result.listingTitle,
    stage: input?.stage || "付款前",
    contractText: compactContext([
      "以下内容来自付款咨询，不等同于完整合同。请粘贴真实合同、补充协议或聊天确认后再确认：",
      `付款结论：${result.verdict}`,
      result.summary,
      ...result.blockers.slice(0, 4).map((item) => `需确认：${item}`),
      ...result.beforePayChecklist.slice(0, 4).map((item) => `付款前确认：${item}`),
      input?.notes,
      input?.reportContext,
    ]),
    reportContext: compactContext([
      input?.reportContext,
      `付款类型：${result.paymentType}`,
      result.paymentNoteTemplate,
    ]),
  });
}

function buildOfficialHref(
  result: PaymentGateResult,
  input?: Partial<PaymentGateInput> | null,
  reportId?: string,
) {
  return buildFlowHref("/official", {
    from: "payment",
    reportId,
    city: result.city,
    title: result.listingTitle,
    listingTitle: result.listingTitle,
    stage: input?.stage || "付款前",
    landlordType: input?.authorizationStatus || input?.identityStatus || input?.payeeType,
    authorizationStatus: input?.authorizationStatus,
    identityStatus: input?.identityStatus,
    contractStatus: input?.contractStatus,
    risks: compactContext([
      result.summary,
      ...result.blockers.slice(0, 4),
      input?.notes,
    ]),
    concerns: compactContext([
      ...result.beforePayChecklist.slice(0, 4),
      input?.payeeMatchesContract ? `收款主体：${input.payeeMatchesContract}` : undefined,
      input?.refundRule ? `退款规则：${input.refundRule}` : undefined,
    ]),
    reportContext: compactContext([
      input?.reportContext,
      `付款结论：${result.verdict}`,
      result.paymentNoteTemplate,
    ]),
  });
}

function buildMoveHref(
  result: PaymentGateResult,
  input?: Partial<PaymentGateInput> | null,
  reportId?: string,
) {
  return buildFlowHref("/move", {
    from: "payment",
    reportId,
    city: result.city,
    title: result.listingTitle,
    listingTitle: result.listingTitle,
    monthlyRent: input?.monthlyRent,
    amount: result.amount,
    upfrontCost: result.amount,
    fixedMonthlyCost: input?.monthlyRent,
    risks: compactContext(result.blockers.slice(0, 4)),
    notes: compactContext([
      "付款咨询已提示合同、授权、收款主体、退款条件和收据材料需要确认。",
      result.summary,
      input?.notes,
    ]),
    reportContext: compactContext([
      input?.reportContext,
      `付款结论：${result.verdict}`,
      result.paymentNoteTemplate,
    ]),
  });
}

export function PaymentGateResultCard({
  result,
  lastInput,
  reportId,
  hardGateReady,
  hardGateItems,
  checkedHardGates,
  copiedMemo,
  onToggleHardGate,
  onSaveReadiness,
  onCopyMemo,
}: {
  result: PaymentGateResult;
  lastInput?: Partial<PaymentGateInput> | null;
  reportId?: string;
  hardGateReady: boolean;
  hardGateItems: string[];
  checkedHardGates: string[];
  copiedMemo: boolean;
  onToggleHardGate: (item: string) => void;
  onSaveReadiness: () => void;
  onCopyMemo: () => void;
}) {
  return (
    <Card className="min-w-0 p-6">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm text-primary/80">付款结果</p>
          <h2 className="mt-2 text-2xl font-semibold">付款结论</h2>
        </div>
        <RiskBadge status={result.status} tone="generic" />
      </div>
      <div className="space-y-5">
        <p className="text-sm leading-7 text-muted-foreground">{result.summary}</p>
        <div className="grid gap-3 sm:grid-cols-3">
          <SummaryTile icon={CreditCard} label="付款结论" value={result.verdict} />
          <SummaryTile icon={WalletCards} label="拟付款" value={formatOptionalMoney(result.amount)} />
          <SummaryTile
            icon={ReceiptText}
            label="建议锁房上限"
            value={formatOptionalMoney(result.maxReasonableHold)}
          />
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
                  className={`h-4 w-4 ${hardGateReady ? "text-emerald-700" : "text-rose-700"}`}
                />
                <h3 className="font-semibold">转账前确认</h3>
              </div>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                这些条件没有确认前，不建议付款。
              </p>
            </div>
            <Badge variant={hardGateReady ? "success" : "destructive"}>
              {hardGateReady ? "确认完成" : "不建议转账"}
            </Badge>
          </div>
          <div className="mt-4 grid gap-2">
            {hardGateItems.map((item) => (
              <Label
                key={item}
                className="flex cursor-pointer items-start gap-3 rounded-md border border-border bg-secondary/60 p-3 text-sm leading-6 text-muted-foreground"
              >
                <Checkbox
                  checked={checkedHardGates.includes(item)}
                  onCheckedChange={() => onToggleHardGate(item)}
                  aria-label={item}
                />
                <span>{item}</span>
              </Label>
            ))}
          </div>
          {result.blockers.length ? (
            <div className="mt-4 border-t border-rose-200/70 pt-4">
              <p className="text-sm font-semibold text-rose-900">当前不建议直接付款的原因</p>
              <div className="mt-2 grid gap-2 text-sm leading-6 text-rose-900/90">
                {result.blockers.map((item) => (
                  <p key={item}>{item}</p>
                ))}
              </div>
            </div>
          ) : null}
          <Button type="button" variant="secondary" className="mt-4 w-full" onClick={onSaveReadiness}>
            保存确认结果
          </Button>
        </div>

        <div className="rounded-md border border-border bg-secondary/50 p-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h3 className="font-semibold">后续确认</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                本次付款咨询可以带入合同确认、官方核验、材料清单和入住预算。
              </p>
            </div>
            <Badge variant="outline" className="w-fit">
              已带入上下文
            </Badge>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <Button asChild variant="outline" className="justify-start">
              <Link href={buildContractHref(result, lastInput, reportId)}>
                <FileCheck2 className="mr-2 h-4 w-4" />
                确认合同条款
              </Link>
            </Button>
            <Button asChild variant="outline" className="justify-start">
              <Link href={buildOfficialHref(result, lastInput, reportId)}>
                <Landmark className="mr-2 h-4 w-4" />
                官方核验
              </Link>
            </Button>
            <Button asChild variant="outline" className="justify-start">
              <Link href={buildEvidenceHref(result, lastInput, reportId)}>
                <ClipboardCheck className="mr-2 h-4 w-4" />
                整理付款材料
              </Link>
            </Button>
            <Button asChild variant="outline" className="justify-start">
              <Link href={buildMoveHref(result, lastInput, reportId)}>
                <Calculator className="mr-2 h-4 w-4" />
                测算首笔支出
              </Link>
            </Button>
            <Button asChild variant="outline" className="justify-start">
              <Link href="/dashboard">
                <LayoutDashboard className="mr-2 h-4 w-4" />
                回到工作台
              </Link>
            </Button>
          </div>
        </div>

        <details className="rounded-md border border-border bg-secondary/60 p-4">
          <summary className="cursor-pointer text-sm font-medium text-foreground">
            查看可发送确认文本
          </summary>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <p className="text-sm leading-6 text-muted-foreground">
              用于向房东、中介或合租人确认材料、退款规则和付款备注。
            </p>
            <Button type="button" variant="outline" onClick={onCopyMemo}>
              <Copy className="mr-2 h-4 w-4" />
              {copiedMemo ? "已复制" : "复制文本"}
            </Button>
          </div>
          <pre className="mt-4 max-h-[320px] overflow-auto whitespace-pre-wrap rounded-md border border-border bg-card p-4 text-sm leading-7 text-muted-foreground">
            {buildPaymentMemo(result)}
          </pre>
        </details>
      </div>
    </Card>
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
