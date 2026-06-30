"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Archive,
  ArrowRight,
  BadgeDollarSign,
  CheckCircle2,
  Copy,
  FileText,
  Loader2,
  MessageSquareWarning,
  ReceiptText,
  ShieldCheck,
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
import type { EvidenceItem, EvidencePackInput, EvidencePackResult } from "@/lib/evidence-pack";

type SubmitState = "idle" | "loading" | "error";
type EvidenceSeed = Partial<EvidencePackInput> & {
  autoGenerate?: boolean;
  sourceLabel?: string;
  reportId?: string;
};

function priorityVariant(priority: EvidenceItem["priority"]) {
  if (priority === "高") return "destructive";
  if (priority === "中") return "warning";
  return "secondary";
}

function seedValue(value: string | undefined, fallback: string) {
  return value?.trim() || fallback;
}

export function EvidenceVaultPanel({ initialInput }: { initialInput?: EvidenceSeed }) {
  const autoSubmittedRef = useRef(false);
  const [result, setResult] = useState<EvidencePackResult | null>(null);
  const [lastInput, setLastInput] = useState<Partial<EvidencePackInput> | null>(initialInput ?? null);
  const [checked, setChecked] = useState<string[]>([]);
  const [state, setState] = useState<SubmitState>("idle");
  const [message, setMessage] = useState(
    "填写当前阶段和已有材料，生成付款、签约或退租前需要核对的清单。",
  );

  const allItems = useMemo(
    () => result?.sections.flatMap((section) => section.items) ?? [],
    [result],
  );
  const progress = allItems.length ? Math.round((checked.length / allItems.length) * 100) : 0;
  const highPriorityItems = useMemo(
    () => allItems.filter((item) => item.priority === "高"),
    [allItems],
  );
  const missingHighPriorityItems = useMemo(
    () => highPriorityItems.filter((item) => !checked.includes(item.id)),
    [checked, highPriorityItems],
  );
  const requiredProgress = highPriorityItems.length
    ? Math.round(
        ((highPriorityItems.length - missingHighPriorityItems.length) /
          highPriorityItems.length) *
          100,
      )
    : 0;
  const evidenceGateReady = Boolean(
    result && highPriorityItems.length && !missingHighPriorityItems.length,
  );

  const submitPayload = useCallback(
    async (payload: EvidencePackInput, loadingMessage = "正在整理材料清单...") => {
      setState("loading");
      setMessage(loadingMessage);
      setLastInput(payload);

      try {
        const response = await fetch("/api/evidence/pack", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          throw new Error("材料清单整理失败，请确认信息后重试。");
        }

        const data = (await response.json()) as EvidencePackResult;
        setResult(data);
        setChecked([]);
        setState("idle");
        setMessage("材料清单已整理。补充高优先级材料，再进入付款或签约。");
        void recordCaseEvent({
          reportId: initialInput?.reportId || "workspace",
          type: "evidence",
          title: "材料清单",
          status: data.status,
          summary: data.summary,
          highlights: [...data.missingWarnings, ...data.timeline].slice(0, 6),
          href: typeof window !== "undefined" ? `${window.location.pathname}${window.location.search}` : undefined,
        });
      } catch (error) {
        setState("error");
        setMessage(error instanceof Error ? error.message : "材料清单整理失败，请稍后重试。");
      }
    },
    [initialInput?.reportId],
  );

  useEffect(() => {
    if (!initialInput?.autoGenerate || autoSubmittedRef.current) return;
    autoSubmittedRef.current = true;
    void submitPayload(
      {
        stage: seedValue(initialInput.stage, "签约前"),
        title: seedValue(initialInput.title, "上下文带入房源"),
        city: initialInput.city,
        address: initialInput.address,
        landlordType: initialInput.landlordType,
        deposit: initialInput.deposit,
        paymentCycle: initialInput.paymentCycle,
        risks: seedValue(initialInput.risks, "需要确认出租权、押金、维修、付款和交割材料。"),
        reportContext: initialInput.reportContext,
      },
      `${initialInput.sourceLabel ?? "已带入上下文"}，正在整理签约前材料清单...`,
    );
  }, [initialInput, submitPayload]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = new FormData(event.currentTarget);
    const payload = {
      stage: String(form.get("stage") || ""),
      title: String(form.get("title") || ""),
      city: String(form.get("city") || ""),
      address: String(form.get("address") || ""),
      landlordType: String(form.get("landlordType") || ""),
      deposit: String(form.get("deposit") || ""),
      paymentCycle: String(form.get("paymentCycle") || ""),
      risks: String(form.get("risks") || ""),
      reportContext: String(form.get("reportContext") || ""),
    };

    await submitPayload(payload);
  }

  async function copyExportText() {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.exportText);
      setMessage("已复制材料清单文本。");
    } catch {
      setMessage("复制失败，可以手动选中文本复制。");
    }
  }

  function toggle(id: string) {
    setChecked((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  }

  async function syncEvidenceProgress() {
    if (!result) return;

    const missingLabels = missingHighPriorityItems.map((item) => item.title);
    const status = evidenceGateReady
      ? "recommend"
      : missingLabels.length <= 2
        ? "caution"
        : "reject";

    const saved = await recordCaseEvent({
      reportId: initialInput?.reportId || "workspace",
      type: "evidence",
      title: "材料清单确认情况",
      status,
      summary: evidenceGateReady
        ? "高优先级材料已确认，可以继续确认付款条件或合同条款。"
        : `仍有 ${missingLabels.length} 项高优先级材料待补充，付款或签约前需要先确认。`,
      highlights: (missingLabels.length
        ? missingLabels.map((label) => `待补充：${label}`)
        : [
            "出租权、地址一致性、交割视频、表读数、押金条款、付款备注和关键承诺均已勾选。",
          ]
      ).slice(0, 6),
      href:
        typeof window !== "undefined"
          ? `${window.location.pathname}${window.location.search}`
          : undefined,
    });
    setMessage(
      saved
        ? initialInput?.reportId
          ? "当前材料清单确认情况已保存到房源记录。"
          : "当前材料清单确认情况已保存到工作台。"
        : "已带入材料清单信息，请先查看本页确认项。",
    );
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="grid gap-4 xl:grid-cols-[0.42fr_0.58fr]">
        <Card className="p-6">
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm text-primary/80">
                材料场景
              </p>
              <h2 className="mt-2 text-2xl font-semibold">输入材料场景</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                适合看房后、交定金前、签约当天、交割确认和退租前使用。重点是知道该保留哪些材料，无需上传敏感文件。
              </p>
            </div>
            {initialInput?.sourceLabel ? (
              <Badge variant="outline" className="w-fit border-primary/30 text-primary">
                {initialInput.sourceLabel}
              </Badge>
            ) : null}
          </div>

          <input type="hidden" name="reportContext" value={initialInput?.reportContext ?? ""} />
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="stage">当前阶段</Label>
              <select
                id="stage"
                name="stage"
                defaultValue={seedValue(initialInput?.stage, "签约前")}
                className="h-11 w-full rounded-md border border-input bg-secondary px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              >
                <option>看房后</option>
                <option>交定金前</option>
                <option>签约前</option>
                <option>交割确认</option>
                <option>退租前</option>
              </select>
            </div>
            <Field
              label="目标城市"
              name="city"
              defaultValue={seedValue(initialInput?.city, "")}
              placeholder="填写目标城市"
            />
            <Field
              label="房源标题"
              name="title"
              defaultValue={seedValue(initialInput?.title, "")}
              placeholder="填写房源名称或户型"
            />
            <Field
              label="房源地址"
              name="address"
              defaultValue={seedValue(initialInput?.address, "")}
              placeholder="填写小区、楼栋、街道、地铁站或明确地标"
            />
            <Field
              label="出租人类型"
              name="landlordType"
              defaultValue={seedValue(initialInput?.landlordType, "")}
              placeholder="填写房东、二房东、中介或公司"
            />
            <Field
              label="押金和付款"
              name="deposit"
              defaultValue={seedValue(initialInput?.deposit, "")}
              placeholder="填写押付方式、已付金额或待付款项"
              className="sm:col-span-2"
            />
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="paymentCycle">付款周期</Label>
              <Input
                id="paymentCycle"
                name="paymentCycle"
                defaultValue={seedValue(initialInput?.paymentCycle, "")}
                placeholder="填写付款周期、收款方式或你还没确认的地方"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="risks">担心的风险</Label>
              <Textarea
                id="risks"
                name="risks"
                className="min-h-[128px]"
                defaultValue={seedValue(initialInput?.risks, "")}
                placeholder="填写你担心的授权、押金、维修、付款、交割或退租材料问题"
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
                <MessageSquareWarning className="mt-1 h-4 w-4 shrink-0" />
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
              <Archive className="mr-2 h-5 w-5" />
            )}
            {state === "loading" ? "正在整理记录" : "整理材料清单"}
          </Button>
        </Card>

        <Card className="p-6">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm text-primary/80">
                材料结果
              </p>
              <h2 className="mt-2 text-2xl font-semibold">材料确认情况</h2>
            </div>
            {result ? <RiskBadge status={result.status} tone="generic" /> : null}
          </div>

          {result ? (
            <div className="space-y-5">
              <p className="text-sm leading-7 text-muted-foreground">{result.summary}</p>
              <div className="grid gap-3 sm:grid-cols-3">
                <SummaryTile icon={Archive} label="记录名" value={result.archiveName} compact />
                <SummaryTile icon={FileText} label="材料项" value={`${allItems.length} 项`} />
                <SummaryTile icon={ReceiptText} label="付款备注" value={`${result.paymentNotes.length} 条`} />
              </div>
              <div className="rounded-md border border-border bg-secondary p-4">
                <div className="mb-3 flex items-center justify-between gap-4">
                  <p className="text-sm font-medium">确认情况</p>
                  <p className="text-2xl font-semibold">{progress}%</p>
                </div>
                <Progress value={progress} />
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  高优先级材料未准备好前，不建议付款、签约或退租交割。
                </p>
              </div>
              <div
                className={`rounded-md border p-4 ${
                  evidenceGateReady
                    ? "border-emerald-300/25 bg-emerald-300/10"
                    : "border-amber-300/25 bg-amber-300/10"
                }`}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <ShieldCheck
                        className={`h-4 w-4 ${
                          evidenceGateReady ? "text-emerald-700" : "text-amber-700"
                        }`}
                      />
                      <h3 className="font-semibold">付款和签约前必须准备好的材料</h3>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      先看高优先级材料是否准备好。这些材料没确认前，不建议付款或签约。
                    </p>
                  </div>
                  <Badge variant={evidenceGateReady ? "success" : "warning"}>
                    {evidenceGateReady ? "可以继续确认" : "补充材料"}
                  </Badge>
                </div>
                <div className="mt-4">
                  <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
                    <span>高优先级材料确认</span>
                    <span>{requiredProgress}%</span>
                  </div>
                  <Progress value={requiredProgress} />
                </div>
                <div className="mt-4 grid gap-2 text-sm leading-6 text-muted-foreground">
                  {(missingHighPriorityItems.length
                    ? missingHighPriorityItems
                        .slice(0, 6)
                        .map((item) => `待补充：${item.title}`)
                    : ["高优先级材料已确认，继续确认其他材料和付款备注。"]
                  ).map((item) => (
                    <p key={item} className="rounded-md border border-border bg-secondary/60 p-3">
                      {item}
                    </p>
                  ))}
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  className="mt-4 w-full"
                  onClick={syncEvidenceProgress}
                >
                  把当前材料确认情况保存到记录
                </Button>
                <Button asChild variant="secondary" className="mt-3 w-full">
                  <Link href={buildPaymentHref(result, lastInput, initialInput?.reportId)}>
                    <BadgeDollarSign className="mr-2 h-4 w-4" />
                    带去付款咨询
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
              <div className="rounded-md border border-amber-300/20 bg-amber-300/10 p-4">
                <div className="mb-3 flex items-center gap-2 text-amber-700">
                  <ShieldCheck className="h-4 w-4" />
                  <h3 className="font-semibold">待补充材料</h3>
                </div>
                <div className="grid gap-2 text-sm leading-6 text-amber-900/90">
                  {result.missingWarnings.map((warning) => (
                    <p key={warning}>{warning}</p>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex min-h-[460px] flex-col justify-center rounded-md border border-border bg-secondary p-5">
              <Badge variant="secondary" className="mb-4 w-fit">
                付款咨询
              </Badge>
              <h3 className="text-xl font-semibold">签约前先确认材料</h3>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">
                押金、维修、转租授权和付款备注需要在签约前确认清楚。先整理一套最小可用材料。
              </p>
            </div>
          )}
        </Card>
      </form>

      {result ? (
        <>
          <section className="grid gap-4 lg:grid-cols-2">
            {result.sections.map((section) => (
              <Card key={section.title} className="p-5">
                <h3 className="text-lg font-semibold">{section.title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {section.summary}
                </p>
                <div className="mt-4 space-y-3">
                  {section.items.map((entry) => {
                    const done = checked.includes(entry.id);
                    return (
                      <div key={entry.id} className="rounded-md border border-border bg-secondary p-4">
                        <div className="mb-3 flex items-start justify-between gap-4">
                          <Label className="flex cursor-pointer items-start gap-3">
                            <Checkbox
                              checked={done}
                              onCheckedChange={() => toggle(entry.id)}
                              aria-label={entry.title}
                            />
                            <span>
                              <span className="block text-sm font-semibold">{entry.title}</span>
                              <span className="mt-1 block text-xs text-muted-foreground">
                                {entry.format}
                              </span>
                            </span>
                          </Label>
                          <Badge variant={priorityVariant(entry.priority)}>
                            {entry.priority}优先级
                          </Badge>
                        </div>
                        <div className="grid gap-2 text-xs leading-5 text-muted-foreground">
                          <p>
                            <span className="text-foreground/90">怎么留：</span>
                            {entry.capture}
                          </p>
                          <p>
                            <span className="text-foreground/90">文件名：</span>
                            {entry.filenameHint}
                          </p>
                          <p>
                            <span className="text-foreground/90">为什么：</span>
                            {entry.reason}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            ))}
          </section>

          <section className="grid gap-4 lg:grid-cols-3">
            <InfoPanel title="材料时间线" items={result.timeline} />
            <InfoPanel title="付款备注建议" items={result.paymentNotes} />
            <Card className="p-5">
              <div className="mb-4 flex items-center justify-between gap-4">
                <h3 className="font-semibold">可复制清单</h3>
                <Button type="button" variant="outline" size="sm" onClick={copyExportText}>
                  <Copy className="mr-2 h-4 w-4" />
                  复制
                </Button>
              </div>
              <Textarea
                readOnly
                value={result.exportText}
                className="min-h-[280px] text-xs leading-5"
              />
            </Card>
          </section>
        </>
      ) : null}
    </div>
  );
}

function firstNumber(value?: string) {
  const match = value?.replace(/,/g, "").match(/\d+(\.\d+)?/);
  return match ? Number(match[0]) : undefined;
}

function buildPaymentContext(result: EvidencePackResult, input?: Partial<EvidencePackInput> | null) {
  return [
    `材料清单：${result.title}`,
    `记录名：${result.archiveName}`,
    result.summary,
    input?.address ? `房源位置：${input.address}` : "",
    input?.landlordType ? `出租人类型：${input.landlordType}` : "",
    ...result.missingWarnings.slice(0, 5).map((item) => `待补充材料：${item}`),
    ...result.paymentNotes.slice(0, 4).map((item) => `付款备注建议：${item}`),
  ]
    .filter(Boolean)
    .join("\n");
}

function buildPaymentHref(
  result: EvidencePackResult,
  input?: Partial<EvidencePackInput> | null,
  reportId?: string,
) {
  const monthlyRent = firstNumber(input?.deposit);
  const params = new URLSearchParams({
    from: "evidence",
    title: result.title,
    city: input?.city ?? "",
    listingTitle: result.title,
    paymentType: "待确认付款",
    amount: "0",
    monthlyRent: monthlyRent ? String(monthlyRent) : "0",
    stage: "材料待补充，未签合同",
    contractStatus: "待确认合同关键页",
    identityStatus: "待确认出租人身份",
    authorizationStatus: "待确认产权/转租授权",
    payeeType: "待确认收款主体",
    payeeMatchesContract: "暂不清楚",
    refundRule: "待确认定金/押金退还条件",
    receiptStatus: "需要收据/电子确认",
    paymentChannel: "待确认",
    urgencyPressure: "补充关键材料再付款",
    notes: [...result.missingWarnings, ...result.paymentNotes].slice(0, 6).join("；"),
    reportContext: buildPaymentContext(result, input),
  });
  if (reportId) params.set("reportId", reportId);
  return `/payment?${params.toString()}`;
}

function Field({
  label,
  name,
  defaultValue,
  placeholder,
  className,
}: {
  label: string;
  name: string;
  defaultValue: string;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className={`space-y-2 ${className ?? ""}`}>
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} defaultValue={defaultValue} placeholder={placeholder} />
    </div>
  );
}

function SummaryTile({
  icon: Icon,
  label,
  value,
  compact = false,
}: {
  icon: typeof Archive;
  label: string;
  value: string;
  compact?: boolean;
}) {
  return (
    <div className="rounded-md border border-border bg-secondary p-4">
      <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-md bg-primary/15 text-primary">
        <Icon className="h-4 w-4" />
      </div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`mt-1 font-semibold ${compact ? "break-all text-sm" : "text-xl"}`}>
        {value}
      </p>
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

