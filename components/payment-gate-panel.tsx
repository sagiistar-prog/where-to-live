"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import {
  BadgeDollarSign,
  CheckCircle2,
  Loader2,
  ShieldAlert,
} from "lucide-react";
import {
  buildPaymentMemo,
  PaymentGateResultCard,
} from "@/components/payment-gate-result";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { recordCaseEvent } from "@/lib/client-case-events";
import type {
  PaymentGateInput,
  PaymentGateResult,
} from "@/lib/payment-gate";

type SubmitState = "idle" | "loading" | "error";
type PaymentSeed = Partial<PaymentGateInput> & {
  autoGenerate?: boolean;
  sourceLabel?: string;
  reportId?: string;
};

function seedValue(value: string | undefined, fallback: string) {
  return value?.trim() || fallback;
}

function seedNumber(value: number | undefined, fallback: string) {
  return Number.isFinite(value) ? String(value) : fallback;
}

function numberFromForm(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  if (!text) return undefined;
  const numberValue = Number(text);
  return Number.isFinite(numberValue) ? numberValue : undefined;
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
    "请输入您担心的合同及其他法律风险。",
  );

  const hardGateItems = result?.beforePayChecklist ?? [];
  const missingHardGates = hardGateItems.filter((item) => !checkedHardGates.includes(item));
  const hardGateReady = Boolean(
    result && result.status !== "reject" && hardGateItems.length && !missingHardGates.length,
  );

  const submitPayload = useCallback(
    async (payload: PaymentGateInput, loadingMessage = "正在确认付款风险...") => {
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
          throw new Error("付款咨询失败，请确认信息后重试。");
        }

        const data = (await response.json()) as PaymentGateResult;
        setResult(data);
        setCheckedHardGates([]);
        setCopiedMemo(false);
        setState("idle");
        setMessage("付款咨询已生成。先把转账前确认项说清楚，再决定是否付款。");
        void recordCaseEvent({
          reportId: initialInput?.reportId || "workspace",
          type: "payment",
          title: "付款咨询",
          status: data.status,
          summary: data.summary,
          highlights: [...data.blockers, ...data.beforePayChecklist].slice(0, 6),
          href: typeof window !== "undefined" ? `${window.location.pathname}${window.location.search}` : undefined,
        });
      } catch (error) {
        setState("error");
        setMessage(error instanceof Error ? error.message : "付款咨询失败，请稍后重试。");
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
        listingTitle: seedValue(initialInput.listingTitle, ""),
        paymentType: seedValue(initialInput.paymentType, "不确定"),
        amount: initialInput.amount ?? 0,
        monthlyRent: initialInput.monthlyRent ?? 0,
        stage: seedValue(initialInput.stage, "不确定"),
        contractStatus: seedValue(initialInput.contractStatus, "不确定"),
        identityStatus: seedValue(initialInput.identityStatus, "不确定"),
        authorizationStatus: seedValue(initialInput.authorizationStatus, "不确定"),
        payeeType: seedValue(initialInput.payeeType, "不确定"),
        payeeMatchesContract: seedValue(initialInput.payeeMatchesContract, "不确定"),
        refundRule: seedValue(initialInput.refundRule, "不确定"),
        receiptStatus: seedValue(initialInput.receiptStatus, "不确定"),
        paymentChannel: seedValue(initialInput.paymentChannel, "不确定"),
        urgencyPressure: seedValue(initialInput.urgencyPressure, "不确定"),
        notes: seedValue(initialInput.notes, ""),
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
      paymentType: "不确定",
      amount: numberFromForm(form.get("amount")),
      monthlyRent: numberFromForm(form.get("monthlyRent")),
      stage: "不确定",
      contractStatus: "不确定",
      identityStatus: "不确定",
      authorizationStatus: "不确定",
      payeeType: "不确定",
      payeeMatchesContract: "不确定",
      refundRule: "不确定",
      receiptStatus: "不确定",
      paymentChannel: "不确定",
      urgencyPressure: "不确定",
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

    const saved = await recordCaseEvent({
      reportId: initialInput?.reportId || "workspace",
      type: "payment",
      title: "转账前确认",
      status: hardGateReady ? result.status : "reject",
      summary: hardGateReady
        ? `转账前确认项已全部确认，当前结论：${result.verdict}。`
        : `仍缺 ${missingHardGates.length} 项转账前确认，当前不建议付款。`,
      highlights: (missingHardGates.length
        ? missingHardGates.map((item) => `未确认：${item}`)
        : [result.paymentNoteTemplate, ...result.receiptChecklist]
      ).slice(0, 6),
      href:
        typeof window !== "undefined"
          ? `${window.location.pathname}${window.location.search}`
          : undefined,
    });
    setMessage(
      saved
        ? initialInput?.reportId
          ? "转账前确认状态已保存到房源记录。"
          : "转账前确认状态已保存到工作台。"
        : "已带入付款前信息，请先查看本页判断后再决定是否付款。",
    );
  }

  return (
    <div className="space-y-6">
      <form
        onSubmit={handleSubmit}
        className="grid w-full max-w-3xl min-w-0 grid-cols-1 gap-4"
      >
        <Card className="w-full min-w-0 max-w-full p-5 sm:p-6">
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-medium text-primary">
                付款咨询
              </p>
              <h2 className="mt-2 text-2xl font-semibold">输入风险问题</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                先描述合同、收款、退款或授权风险。金额、房源和收款信息可作为补充。
              </p>
            </div>
            {initialInput?.sourceLabel ? (
              <Badge variant="outline" className="w-fit border-primary/30 text-primary">
                {initialInput.sourceLabel}
              </Badge>
            ) : null}
          </div>

          <input type="hidden" name="reportContext" value={initialInput?.reportContext ?? ""} />
          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="notes">风险说明</Label>
              <Textarea
                id="notes"
                name="notes"
                className="min-h-[112px]"
                defaultValue={seedValue(initialInput?.notes, "")}
                placeholder="请输入您担心的合同及其他法律风险"
                required
              />
            </div>

            <Button type="submit" size="lg" className="w-full sm:col-span-2" disabled={state === "loading"}>
              {state === "loading" ? (
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              ) : (
                <BadgeDollarSign className="mr-2 h-5 w-5" />
              )}
              {state === "loading" ? "正在确认" : "确认付款风险"}
            </Button>

            <details className="rounded-md border border-border bg-secondary/45 p-4 sm:col-span-2">
              <summary className="cursor-pointer text-sm font-medium text-foreground">
                补充信息（选填）
              </summary>
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field
                  label="城市"
                  name="city"
                  defaultValue={seedValue(initialInput?.city, "")}
                  placeholder="填写租房城市"
                  type="text"
                />
                <Field
                  label="房源名称"
                  name="listingTitle"
                  defaultValue={seedValue(initialInput?.listingTitle, "")}
                  placeholder="填写小区、房源名称或位置"
                  type="text"
                />
                <Field
                  label="月租"
                  name="monthlyRent"
                  defaultValue={seedNumber(initialInput?.monthlyRent, "")}
                  placeholder="不确定可留空"
                />
                <Field
                  label="拟付款金额"
                  name="amount"
                  defaultValue={seedNumber(initialInput?.amount, "")}
                  placeholder="不确定可留空"
                />
              </div>
            </details>
          </div>

          {state !== "idle" || result ? (
            <StatusMessage state={state} message={message} />
          ) : null}
        </Card>

      </form>
      {result ? (
        <PaymentGateResultCard
          result={result}
          lastInput={lastInput}
          reportId={initialInput?.reportId}
          hardGateReady={hardGateReady}
          hardGateItems={hardGateItems}
          checkedHardGates={checkedHardGates}
          copiedMemo={copiedMemo}
          onToggleHardGate={toggleHardGate}
          onSaveReadiness={syncPaymentReadiness}
          onCopyMemo={copyPaymentMemo}
        />
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
