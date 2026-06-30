"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Archive,
  ArrowRight,
  BadgeDollarSign,
  Camera,
  CheckCircle2,
  ClipboardCheck,
  Copy,
  Loader2,
  ShieldAlert,
  Timer,
} from "lucide-react";
import { PreferenceSelector } from "@/components/preference-selector";
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
import type { VisitCheckInput, VisitCheckItem, VisitCheckResult } from "@/lib/visit-check";

type SubmitState = "idle" | "loading" | "error";
type VisitCheckSeed = Partial<VisitCheckInput> & {
  autoGenerate?: boolean;
  sourceLabel?: string;
  reportId?: string;
};

const defaultPreferences: string[] = [];

function priorityVariant(priority: VisitCheckItem["priority"]) {
  if (priority === "高") return "destructive";
  if (priority === "中") return "warning";
  return "secondary";
}

function seedValue(value: string | undefined, fallback: string) {
  return value?.trim() || fallback;
}

function buildVisitMemo(result: VisitCheckResult, input?: VisitCheckInput | null) {
  const highItems = result.sections
    .flatMap((section) => section.items)
    .filter((item) => item.priority === "高")
    .slice(0, 8)
    .map((item, index) => `${index + 1}. ${item.title}：${item.method}通过标准：${item.passCriteria}`);
  const questionLines = result.questions.slice(0, 7).map((item, index) => `${index + 1}. ${item}`);
  const evidenceLines = result.evidencePack.slice(0, 7).map((item, index) => `${index + 1}. ${item}`);
  const stopLines = result.stopSignals.slice(0, 7).map((item, index) => `${index + 1}. ${item}`);

  return [
    `你好，关于「${result.title}」这套房，我看房时会按以下清单现场确认。`,
    ...(input?.address ? [`房源位置：${input.address}`] : []),
    ...(input?.rent ? [`当前租金：${input.rent}`] : []),
    ...(input?.commute ? [`通勤描述：${input.commute}`] : []),
    "",
    `本次预计需要 ${result.estimatedMinutes} 分钟，优先确认高风险项后再谈定金或签约。`,
    "",
    "一、现场必须优先确认",
    ...highItems,
    "",
    "二、请现场或聊天中确认的问题",
    ...questionLines,
    "",
    "三、我会保存的材料",
    ...evidenceLines,
    "",
    "四、出现以下情况暂不付定金或签约",
    ...stopLines,
    "",
  "以上问题请尽量用文字确认，尤其是出租权、押金、维修、费用边界和交割清单。高优先级项说清前，我不会口头确认签约或付款。",
  ].join("\n");
}

export function VisitCheckPanel({ initialInput }: { initialInput?: VisitCheckSeed }) {
  const initialPreferences = useMemo(
    () => (initialInput?.preferences?.length ? initialInput.preferences : defaultPreferences),
    [initialInput?.preferences],
  );
  const autoSubmittedRef = useRef(false);
  const [preferences, setPreferences] = useState(initialPreferences);
  const [result, setResult] = useState<VisitCheckResult | null>(null);
  const [lastInput, setLastInput] = useState<VisitCheckInput | null>(initialInput ?? null);
  const [checked, setChecked] = useState<string[]>([]);
  const [copiedMemo, setCopiedMemo] = useState(false);
  const [state, setState] = useState<SubmitState>("idle");
  const [message, setMessage] = useState(
    "确认后可以按现场情况勾选，没确认的项目先不要付款或签字。",
  );

  const allItems = useMemo(
    () => result?.sections.flatMap((section) => section.items) ?? [],
    [result],
  );
  const completedPercent = allItems.length
    ? Math.round((checked.length / allItems.length) * 100)
    : 0;

  const submitPayload = useCallback(
    async (payload: VisitCheckInput, loadingMessage = "正在整理现场确认事项...") => {
      setState("loading");
      setMessage(loadingMessage);
      setLastInput(payload);

      try {
        const response = await fetch("/api/visit/checklist", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          throw new Error("看房清单整理失败，请确认信息后重试。");
        }

        const data = (await response.json()) as VisitCheckResult;
        setResult(data);
        setChecked([]);
        setCopiedMemo(false);
        setState("idle");
        setMessage("看房清单已整理。先确认高优先级项目，再考虑定金或签约。");
        void recordCaseEvent({
          reportId: initialInput?.reportId || "workspace",
          type: "visit",
          title: "看房清单",
          status: data.status,
          summary: data.summary,
          highlights: [...data.stopSignals, ...data.questions].slice(0, 6),
          href: typeof window !== "undefined" ? `${window.location.pathname}${window.location.search}` : undefined,
        });
      } catch (error) {
        setState("error");
        setMessage(error instanceof Error ? error.message : "看房清单整理失败，请稍后重试。");
      }
    },
    [initialInput?.reportId],
  );

  useEffect(() => {
    if (!initialInput?.autoGenerate || autoSubmittedRef.current) return;
    autoSubmittedRef.current = true;
    setPreferences(initialPreferences);
    void submitPayload(
      {
        title: seedValue(initialInput.title, "上下文带入看房对象"),
        city: initialInput.city,
        address: initialInput.address,
        floor: initialInput.floor,
        buildingAge: initialInput.buildingAge,
        orientation: initialInput.orientation,
        rent: initialInput.rent,
        commute: initialInput.commute,
        description: seedValue(initialInput.description, ""),
        reportContext: initialInput.reportContext,
        preferences: initialPreferences,
      },
      `${initialInput.sourceLabel ?? "已带入上下文"}，正在整理现场确认事项...`,
    );
  }, [initialInput, initialPreferences, submitPayload]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = new FormData(event.currentTarget);
    const payload = {
      title: String(form.get("title") || ""),
      city: String(form.get("city") || ""),
      address: String(form.get("address") || ""),
      floor: String(form.get("floor") || ""),
      buildingAge: String(form.get("buildingAge") || ""),
      orientation: String(form.get("orientation") || ""),
      rent: String(form.get("rent") || ""),
      commute: String(form.get("commute") || ""),
      description: String(form.get("description") || ""),
      reportContext: String(form.get("reportContext") || ""),
      preferences,
    };

    await submitPayload(payload);
  }

  function toggle(id: string) {
    setChecked((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  }

  async function copyVisitMemo() {
    if (!result) return;
    await navigator.clipboard.writeText(buildVisitMemo(result, lastInput));
    setCopiedMemo(true);
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="grid gap-4 xl:grid-cols-[0.42fr_0.58fr]">
        <Card className="p-6">
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm text-primary/80">
                看房对象
              </p>
              <h2 className="mt-2 text-2xl font-semibold">输入看房对象</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                把房源特征、楼层、朝向、楼龄和你的偏好填进来，整理现场该测什么、问什么、拍什么。
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
            <Field
              label="房源标题"
              name="title"
              defaultValue={seedValue(initialInput?.title, "")}
              placeholder="填写房源名称或户型"
            />
            <Field
              label="目标城市"
              name="city"
              defaultValue={seedValue(initialInput?.city, "")}
              placeholder="填写目标城市"
            />
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="address">房源位置</Label>
              <Input
                id="address"
                name="address"
                defaultValue={seedValue(initialInput?.address, "")}
                placeholder="填写小区、楼栋、街道、地铁站或明确地标"
              />
            </div>
            <Field
              label="楼层"
              name="floor"
              defaultValue={seedValue(initialInput?.floor, "")}
              placeholder="填写楼层信息"
            />
            <Field
              label="楼龄"
              name="buildingAge"
              defaultValue={seedValue(initialInput?.buildingAge, "")}
              placeholder="不确定可以留空"
            />
            <Field
              label="朝向"
              name="orientation"
              defaultValue={seedValue(initialInput?.orientation, "")}
              placeholder="不确定可以留空"
            />
            <Field
              label="月租"
              name="rent"
              defaultValue={seedValue(initialInput?.rent, "")}
              placeholder="填写月租金额"
            />
            <Field
              label="通勤描述"
              name="commute"
              defaultValue={seedValue(initialInput?.commute, "")}
              placeholder="填写到工作地的大致通勤情况"
            />
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="description">房源描述和担心点</Label>
              <Textarea
                id="description"
                name="description"
                className="min-h-[120px]"
                placeholder="填写你担心的潮湿、噪音、采光、楼道、门禁、费用或合同问题。"
                defaultValue={seedValue(initialInput?.description, "")}
              />
            </div>
          </div>

          <div className="mt-5 space-y-3">
            <Label>居住偏好</Label>
            <PreferenceSelector value={preferences} onChange={setPreferences} />
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
                <AlertTriangle className="mt-1 h-4 w-4 shrink-0" />
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
              <ClipboardCheck className="mr-2 h-5 w-5" />
            )}
            {state === "loading" ? "正在整理清单" : "整理看房清单"}
          </Button>
        </Card>

        <Card className="p-6">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm text-primary/80">
                现场进度
              </p>
              <h2 className="mt-2 text-2xl font-semibold">看房确认进度</h2>
            </div>
            {result ? <RiskBadge status={result.status} tone="generic" /> : null}
          </div>

          {result ? (
            <div className="space-y-5">
              <p className="text-sm leading-7 text-muted-foreground">{result.summary}</p>
              <div className="grid gap-3 sm:grid-cols-3">
                <SummaryTile icon={ClipboardCheck} label="确认项" value={`${allItems.length} 项`} />
                <SummaryTile icon={Timer} label="预计耗时" value={`${result.estimatedMinutes} 分钟`} />
                <SummaryTile icon={Camera} label="材料清单" value={`${result.evidencePack.length} 类`} />
              </div>
              <div className="rounded-md border border-border bg-secondary p-4">
                <div className="mb-3 flex items-center justify-between gap-4">
                  <p className="text-sm font-medium">确认情况</p>
                  <p className="text-2xl font-semibold">{completedPercent}%</p>
                </div>
                <Progress value={completedPercent} />
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  高优先级项目没有确认前，不建议交定金或口头确认签约。
                </p>
              </div>
              <div className="rounded-md border border-rose-300/20 bg-rose-300/10 p-4">
                <div className="mb-3 flex items-center gap-2 text-rose-700">
                  <ShieldAlert className="h-4 w-4" />
                  <h3 className="font-semibold">暂不签约的情况</h3>
                </div>
                <div className="grid gap-2 text-sm leading-6 text-rose-900/90">
                  {result.stopSignals.map((item) => (
                    <p key={item}>{item}</p>
                  ))}
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Button asChild variant="secondary">
                  <Link href={buildEvidenceHref(result, lastInput, initialInput?.reportId)}>
                    <Archive className="mr-2 h-4 w-4" />
                    把现场问题转成材料清单
                  </Link>
                </Button>
                <Button asChild variant="secondary">
                  <Link href={buildPaymentHref(result, lastInput, initialInput?.reportId)}>
                    <BadgeDollarSign className="mr-2 h-4 w-4" />
                    带着这些问题做付款咨询
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>

              <details className="rounded-md border border-border bg-secondary/55 p-4">
                <summary className="cursor-pointer text-sm font-medium text-foreground">
                  查看现场确认文本
                </summary>
                <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <p className="text-sm leading-6 text-muted-foreground">
                    用于看房当天核对高优先级事项、必须问清的问题、材料留存和暂不签约的情况。
                  </p>
                  <Button type="button" variant="outline" onClick={copyVisitMemo}>
                    <Copy className="mr-2 h-4 w-4" />
                    {copiedMemo ? "已复制" : "复制文本"}
                  </Button>
                </div>
                <pre className="mt-4 max-h-[320px] overflow-auto whitespace-pre-wrap rounded-md border border-border bg-card p-4 text-sm leading-7 text-muted-foreground">
                  {buildVisitMemo(result, lastInput)}
                </pre>
              </details>
            </div>
          ) : (
            <div className="flex min-h-[460px] flex-col justify-center rounded-md border border-border bg-secondary p-5">
              <Badge variant="secondary" className="mb-4 w-fit">
                现场确认安排
              </Badge>
              <h3 className="text-xl font-semibold">把经验变成事项</h3>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">
                按房屋质量、舒适度、安全动线和签约材料整理确认事项，明确检查方法、通过标准和记录方式。
              </p>
            </div>
          )}
        </Card>
      </form>

      {result ? (
        <>
          <section className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold">现场确认事项</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                勾选只保存在当前设备，用于现场确认。签约前请把关键记录保存到合同和聊天记录里。
              </p>
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              {result.sections.map((section) => (
                <Card key={section.title} className="p-5">
                  <h3 className="text-lg font-semibold">{section.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {section.summary}
                  </p>
                  <div className="mt-4 space-y-3">
                    {section.items.map((check) => {
                      const done = checked.includes(check.id);
                      return (
                        <div
                          key={check.id}
                          className="rounded-md border border-border bg-secondary p-4"
                        >
                          <div className="mb-3 flex items-start justify-between gap-4">
                            <Label className="flex cursor-pointer items-start gap-3">
                              <Checkbox
                                checked={done}
                                onCheckedChange={() => toggle(check.id)}
                                aria-label={check.title}
                              />
                              <span>
                                <span className="block text-sm font-semibold">{check.title}</span>
                                <span className="mt-1 block text-xs text-muted-foreground">
                                  {check.timing}
                                </span>
                              </span>
                            </Label>
                            <Badge variant={priorityVariant(check.priority)}>
                              {check.priority}优先级
                            </Badge>
                          </div>
                          <div className="grid gap-2 text-xs leading-5 text-muted-foreground">
                            <p>
                              <span className="text-foreground/90">怎么测：</span>
                              {check.method}
                            </p>
                            <p>
                              <span className="text-foreground/90">通过标准：</span>
                              {check.passCriteria}
                            </p>
                            <p>
                              <span className="text-foreground/90">记录：</span>
                              {check.evidence}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </Card>
              ))}
            </div>
          </section>

          <section className="grid gap-4 lg:grid-cols-3">
            <InfoPanel title="必须问清的问题" items={result.questions} />
            <InfoPanel title="材料清单" items={result.evidencePack} />
            <InfoPanel title="后续确认" items={result.nextSteps} />
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
}: {
  label: string;
  name: string;
  defaultValue: string;
  placeholder?: string;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} defaultValue={defaultValue} placeholder={placeholder} />
    </div>
  );
}

function firstNumber(value?: string) {
  const match = value?.replace(/,/g, "").match(/\d+(\.\d+)?/);
  return match ? Number(match[0]) : undefined;
}

function buildVisitContext(result: VisitCheckResult, input?: VisitCheckInput | null) {
  return [
    `看房清单：${result.title}`,
    result.summary,
    input?.address ? `房源位置：${input.address}` : "",
    input?.commute ? `通勤描述：${input.commute}` : "",
    ...result.sections.map((section) => `${section.title}：${section.summary}`),
    ...result.stopSignals.slice(0, 5).map((item) => `暂不签约：${item}`),
    ...result.evidencePack.slice(0, 5).map((item) => `需保存材料：${item}`),
  ]
    .filter(Boolean)
    .join("\n");
}

function buildEvidenceHref(
  result: VisitCheckResult,
  input?: VisitCheckInput | null,
  reportId?: string,
) {
  const params = new URLSearchParams({
    from: "visit",
    stage: "看房后",
    title: result.title,
    city: input?.city ?? "",
    address: input?.address ?? "",
    deposit: input?.rent ? `月租 ${input.rent}，押金待确认` : "押金待确认",
    risks: [...result.stopSignals, ...result.questions].slice(0, 8).join("；"),
    reportContext: buildVisitContext(result, input),
  });
  if (reportId) params.set("reportId", reportId);
  return `/evidence?${params.toString()}`;
}

function buildPaymentHref(
  result: VisitCheckResult,
  input?: VisitCheckInput | null,
  reportId?: string,
) {
  const rent = firstNumber(input?.rent);
  const params = new URLSearchParams({
    from: "visit",
    title: result.title,
    city: input?.city ?? "",
    listingTitle: result.title,
    paymentType: "定金",
    amount: "0",
    monthlyRent: rent ? String(rent) : "0",
    stage: "看房后，未签合同",
    contractStatus: "未看到完整合同",
    identityStatus: "未确认身份证明",
    authorizationStatus: "未看到产权/转租授权",
    payeeType: "待确认收款主体",
    payeeMatchesContract: "暂不清楚",
    refundRule: "未写清",
    receiptStatus: "未确认收据",
    paymentChannel: "待确认",
    urgencyPressure: "看房后可能被催定金",
    notes: result.stopSignals.slice(0, 5).join("；"),
    reportContext: buildVisitContext(result, input),
  });
  if (reportId) params.set("reportId", reportId);
  return `/payment?${params.toString()}`;
}

function SummaryTile({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof ClipboardCheck;
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

