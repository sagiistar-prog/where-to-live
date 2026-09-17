"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Archive,
  ArrowRight,
  BadgeCheck,
  BadgeDollarSign,
  Building2,
  CheckCircle2,
  Copy,
  ExternalLink,
  FileSearch,
  Landmark,
  Loader2,
  ShieldAlert,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { recordCaseEvent } from "@/lib/client-case-events";
import type {
  OfficialVerificationInput,
  OfficialSource,
  OfficialVerificationResult,
  VerificationTask,
} from "@/lib/official-verification";

type SubmitState = "idle" | "loading" | "error";
type OfficialSeed = Partial<OfficialVerificationInput> & {
  autoGenerate?: boolean;
  sourceLabel?: string;
  reportId?: string;
};

const statusCopy = {
  recommend: { label: "可继续确认", variant: "success" as const },
  caution: { label: "补充材料", variant: "warning" as const },
  reject: { label: "不建议签约", variant: "destructive" as const },
};

function priorityVariant(priority: VerificationTask["priority"]) {
  if (priority === "高") return "destructive";
  if (priority === "中") return "warning";
  return "secondary";
}

function seedValue(value: string | undefined, fallback: string) {
  return value?.trim() || fallback;
}

function buildEvidenceHref(
  input: OfficialVerificationInput,
  result: OfficialVerificationResult,
  reportId?: string,
) {
  const proofLines = result.sections.flatMap((section) =>
    section.tasks.map((task) => `${task.title}: ${task.proofToSave}`),
  );
  const params = new URLSearchParams({
    from: "official",
    stage: "签约前",
    title: input.title || "官方查询带入房源",
    city: result.city,
    address: input.address || "",
    landlordType: input.landlordType || "出租方类型待确认",
    deposit: "押金和付款方式待确认",
    paymentCycle: "付款周期、收款主体和退款条件待确认",
    risks: [
  "官方查询提示需要补充出租权、备案办理办法、合同要求和付款主体材料。",
      ...result.warnings,
      ...proofLines,
    ].join("\n"),
    reportContext: [input.reportContext, ...result.nextActions].filter(Boolean).join("\n"),
  });
  if (reportId) params.set("reportId", reportId);

  return `/evidence?${params.toString()}`;
}

function buildPaymentHref(
  input: OfficialVerificationInput,
  result: OfficialVerificationResult,
  reportId?: string,
) {
  const params = new URLSearchParams({
    from: "official",
    city: result.city,
    listingTitle: input.title || "官方查询带入房源",
    paymentType: "定金",
    amount: "0",
    monthlyRent: "0",
    stage: input.stage || "签约前",
    contractStatus: input.contractStatus || "未看到合同",
    identityStatus: "未确认身份证明",
    authorizationStatus: input.landlordType?.includes("二房东")
      ? "未看到产权/转租授权"
      : "未看到产权/转租授权",
    payeeType: "待确认",
    payeeMatchesContract: "暂不清楚",
    refundRule: "没写清",
    receiptStatus: "只说转账截图即可",
    paymentChannel: "待确认",
    urgencyPressure: "对方要求先付款或先签约",
    notes: "官方查询风险点未确认前，不建议先付款。",
    reportContext: [input.reportContext, ...result.warnings, ...result.nextActions]
      .filter(Boolean)
      .join("\n"),
  });
  if (reportId) params.set("reportId", reportId);

  return `/payment?${params.toString()}`;
}

export function OfficialVerificationPanel({ initialInput }: { initialInput?: OfficialSeed }) {
  const autoSubmittedRef = useRef(false);
  const [result, setResult] = useState<OfficialVerificationResult | null>(null);
  const [submittedInput, setSubmittedInput] = useState<OfficialVerificationInput | null>(null);
  const [checkedOfficialTasks, setCheckedOfficialTasks] = useState<string[]>([]);
  const [state, setState] = useState<SubmitState>("idle");
  const [message, setMessage] = useState(
    "这里整理官方查询入口和确认事项，产权真假仍以官方材料为准。",
  );

  const tasks = useMemo(
    () => result?.sections.flatMap((section) => section.tasks) ?? [],
    [result],
  );
  const highCount = tasks.filter((task) => task.priority === "高").length;
  const officialGateTasks = useMemo(
    () => tasks.filter((task) => task.priority === "高"),
    [tasks],
  );
  const missingOfficialGateTasks = useMemo(
    () => officialGateTasks.filter((task) => !checkedOfficialTasks.includes(task.id)),
    [checkedOfficialTasks, officialGateTasks],
  );
  const officialGateProgress = officialGateTasks.length
    ? Math.round(
        ((officialGateTasks.length - missingOfficialGateTasks.length) /
          officialGateTasks.length) *
          100,
      )
    : 0;
  const officialGateReady = Boolean(
    result && officialGateTasks.length && !missingOfficialGateTasks.length,
  );

  const submitPayload = useCallback(
    async (payload: OfficialVerificationInput, loadingMessage = "正在整理官方查询步骤...") => {
      setState("loading");
      setMessage(loadingMessage);
      setSubmittedInput(payload);

      try {
        const response = await fetch("/api/official/verification", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          throw new Error("官方查询步骤整理失败，请确认信息后重试。");
        }

        const data = (await response.json()) as OfficialVerificationResult;
        const proofHighlights = data.sections
          .flatMap((section) => section.tasks)
          .filter((task) => task.priority === "高")
          .map((task) => `保存材料：${task.title} - ${task.proofToSave}`);
        setResult(data);
        setCheckedOfficialTasks([]);
        setState("idle");
        setMessage("官方查询步骤已整理。关键风险点确认前，不要付款或签约。");
        void recordCaseEvent({
          reportId: initialInput?.reportId || "workspace",
          type: "official",
          title: "官方查询确认计划",
          status: data.status === "reject" ? "reject" : "caution",
          summary:
            data.status === "reject"
              ? data.summary
              : `${data.summary} 已整理计划不等于已确认，后续需要逐项确认高优先级事项。`,
          highlights: [
            "待确认：高优先级官方信息",
            ...data.warnings,
            ...data.nextActions,
            ...proofHighlights,
          ].slice(0, 6),
          href: typeof window !== "undefined" ? `${window.location.pathname}${window.location.search}` : undefined,
        });
      } catch (error) {
        setState("error");
        setMessage(error instanceof Error ? error.message : "官方查询步骤整理失败，请稍后重试。");
      }
    },
    [initialInput?.reportId],
  );

  useEffect(() => {
    if (!initialInput?.autoGenerate || autoSubmittedRef.current) return;
    autoSubmittedRef.current = true;
    void submitPayload(
      {
        title: initialInput.title,
        city: initialInput.city,
        stage: seedValue(initialInput.stage, "签约前"),
        address: initialInput.address,
        landlordType: initialInput.landlordType,
        contractStatus: initialInput.contractStatus,
        concerns: seedValue(
          initialInput.concerns,
          "报告提示需要确认出租权、转租授权、备案办理办法、合同要求和付款主体。",
        ),
        reportContext: initialInput.reportContext,
      },
      "已从报告带入风险点，正在整理官方查询步骤...",
    );
  }, [initialInput, submitPayload]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = new FormData(event.currentTarget);
    const payload = {
      title: String(form.get("title") || ""),
      city: String(form.get("city") || ""),
      stage: String(form.get("stage") || ""),
      address: String(form.get("address") || ""),
      landlordType: String(form.get("landlordType") || ""),
      contractStatus: String(form.get("contractStatus") || ""),
      concerns: String(form.get("concerns") || ""),
      reportContext: String(form.get("reportContext") || ""),
    };

    await submitPayload(payload);
  }

  function toggleOfficialTask(id: string) {
    setCheckedOfficialTasks((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  }

  async function syncOfficialGate() {
    if (!result) return;

    const saved = await recordCaseEvent({
      reportId: initialInput?.reportId || "workspace",
      type: "official",
      title: "官方查询关键事项",
      status: officialGateReady ? "recommend" : "reject",
      summary: officialGateReady
        ? "高优先级官方查询事项已确认，可以继续确认付款条件或合同条款。"
        : `仍有 ${missingOfficialGateTasks.length} 项高优先级官方查询待确认，当前不建议付款或签约。`,
      highlights: (missingOfficialGateTasks.length
        ? missingOfficialGateTasks.map((task) => `未确认：${task.title}；需保存材料：${task.proofToSave}`)
        : [
            "出租权、备案办理办法、合同要求和付款主体等高优先级官方查询已确认。",
            ...officialGateTasks.map((task) => `已保存材料：${task.title} - ${task.proofToSave}`),
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
          ? "官方查询必须确认状态已保存到房源记录。"
          : "官方查询必须确认状态已保存到工作台。"
        : "已带入官方核验信息，请先查看本页确认项。",
    );
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="grid max-w-3xl gap-4">
        <Card className="p-6">
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm text-primary/80">
                官方查询
              </p>
              <h2 className="mt-2 text-2xl font-semibold">输入确认场景</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                适合交定金前、签约前、办理备案前使用。它不会替你查产权真假，但会告诉你该打开哪个官方入口、该让出租方补什么材料。
              </p>
            </div>
            {initialInput?.sourceLabel ? (
              <Badge variant="outline" className="w-fit border-primary/30 text-primary">
                {initialInput.sourceLabel}
              </Badge>
            ) : null}
          </div>

          <input type="hidden" name="title" value={initialInput?.title ?? ""} />
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
                <option>看房前</option>
                <option>交定金前</option>
                <option>签约前</option>
                <option>备案前</option>
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
              label="房源地址"
              name="address"
              defaultValue={seedValue(initialInput?.address, "")}
              placeholder="填写小区、楼栋、门牌或明确地标"
            />
            <Field
              label="出租方类型"
              name="landlordType"
              defaultValue={seedValue(initialInput?.landlordType, "")}
              placeholder="填写房东、中介、代理或你不确定的情况"
            />
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="contractStatus">合同状态</Label>
              <Input
                id="contractStatus"
                name="contractStatus"
                defaultValue={seedValue(
                  initialInput?.contractStatus,
                  "",
                )}
                placeholder="填写当前合同、补充协议或聊天确认情况"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="concerns">担心的问题</Label>
              <Textarea
                id="concerns"
                name="concerns"
                className="min-h-[128px]"
                defaultValue={seedValue(initialInput?.concerns, "")}
                placeholder="填写你担心的出租权、备案、收款主体、合同或其他官方确认问题"
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
              <FileSearch className="mr-2 h-5 w-5" />
            )}
            {state === "loading" ? "正在整理步骤" : "整理官方查询步骤"}
          </Button>
        </Card>

      </form>

      {result ? (
        <Card className="p-6">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm text-primary/80">
                确认结果
              </p>
              <h2 className="mt-2 text-2xl font-semibold">确认结论</h2>
            </div>
            {result ? (
              <Badge variant={statusCopy[result.status].variant}>
                {statusCopy[result.status].label}
              </Badge>
            ) : null}
          </div>

          <div className="space-y-5">
              <p className="text-sm leading-7 text-muted-foreground">{result.summary}</p>
              <div className="grid gap-3 sm:grid-cols-3">
                <SummaryTile icon={FileSearch} label="确认事项" value={`${tasks.length} 项`} />
                <SummaryTile icon={ShieldAlert} label="高优先级" value={`${highCount} 项`} />
                <SummaryTile icon={Landmark} label="官方入口" value={`${result.sources.length} 个`} />
              </div>
              <div className="rounded-md border border-border bg-secondary p-4">
                <div className="mb-3 flex items-center gap-2 text-primary">
                  <BadgeCheck className="h-4 w-4" />
                  <h3 className="font-semibold">使用范围</h3>
                </div>
                <p className="text-sm leading-6 text-muted-foreground">{result.limitation}</p>
              </div>
              <div className="rounded-md border border-primary/20 bg-primary/10 p-4">
                <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex items-center gap-2 text-primary">
                      <BadgeCheck className="h-4 w-4" />
                  <h3 className="font-semibold">关键事项确认</h3>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    这些事项要回到官方入口、政府/住建/市场监管公开信息或出租方可留存材料确认，本页不能替你判断真假。
                    </p>
                  </div>
                  <Badge variant={officialGateReady ? "success" : "warning"} className="w-fit">
                    {officialGateReady ? "可以继续" : "仍需确认"}
                  </Badge>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>高优先级确认进度</span>
                    <span>{officialGateProgress}%</span>
                  </div>
                  <Progress value={officialGateProgress} />
                </div>
                <div className="mt-4 grid gap-3">
                  {officialGateTasks.map((taskItem) => (
                    <label
                      key={taskItem.id}
                      className="flex cursor-pointer gap-3 rounded-md border border-border bg-background/45 p-3 text-sm transition-colors hover:bg-card"
                    >
                      <Checkbox
                        checked={checkedOfficialTasks.includes(taskItem.id)}
                        onCheckedChange={() => toggleOfficialTask(taskItem.id)}
                        aria-label={`确认${taskItem.title}`}
                      />
                      <span className="grid gap-1 leading-6">
                        <span className="font-medium text-foreground">{taskItem.title}</span>
                        <span className="text-xs text-muted-foreground">
                          {taskItem.sourceName}，通过信号：{taskItem.passSignal}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          保存材料：{taskItem.proofToSave}
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
                {missingOfficialGateTasks.length ? (
                  <div className="mt-4 rounded-md border border-amber-300/20 bg-amber-300/10 p-3 text-xs leading-5 text-amber-900/90">
                    当前仍缺 {missingOfficialGateTasks.length} 项高优先级确认。任一关键项没确认，都不建议进入付款或签约。
                  </div>
                ) : null}
                <Button
                  type="button"
                  variant="outline"
                  className="mt-4 w-full"
                  onClick={syncOfficialGate}
                >
                  把官方查询状态保存到记录
                </Button>
              </div>
              <div className="rounded-md border border-amber-300/20 bg-amber-300/10 p-4">
                <div className="mb-3 flex items-center gap-2 text-amber-700">
                  <ShieldAlert className="h-4 w-4" />
                    <h3 className="font-semibold">风险提醒</h3>
                </div>
                <div className="grid gap-2 text-sm leading-6 text-amber-900/90">
                  {result.warnings.map((warning) => (
                    <p key={warning}>{warning}</p>
                  ))}
                </div>
              </div>
              {submittedInput ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  <Button asChild variant="outline" className="w-full">
                    <Link href={buildEvidenceHref(submittedInput, result, initialInput?.reportId)}>
                      <Archive className="mr-2 h-4 w-4" />
                      同步到材料清单
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                  <Button asChild variant="outline" className="w-full">
                    <Link href={buildPaymentHref(submittedInput, result, initialInput?.reportId)}>
                      <BadgeDollarSign className="mr-2 h-4 w-4" />
                      进入付款咨询
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              ) : null}
          </div>
        </Card>
      ) : null}

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
                  {section.tasks.map((taskItem) => (
                    <TaskCard key={taskItem.id} task={taskItem} />
                  ))}
                </div>
              </Card>
            ))}
          </section>

          <section className="grid gap-4 lg:grid-cols-[0.58fr_0.42fr]">
            <Card className="p-5">
              <h3 className="font-semibold">后续确认</h3>
              <div className="mt-3 grid gap-2 text-sm leading-6 text-muted-foreground">
                {result.nextActions.map((action) => (
                  <p key={action} className="rounded-md border border-border bg-secondary p-3">
                    {action}
                  </p>
                ))}
              </div>
            </Card>
            <Card className="p-5">
              <h3 className="font-semibold">官方信息源</h3>
              <div className="mt-3 grid gap-3">
                {result.sources.map((source) => (
                  <SourceLink key={source.url} source={source} />
                ))}
              </div>
            </Card>
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

function SummaryTile({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof FileSearch;
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

function TaskCard({ task }: { task: VerificationTask }) {
  const [copied, setCopied] = useState(false);

  async function copyAskScript() {
    try {
      await navigator.clipboard.writeText(task.askScript);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="rounded-md border border-border bg-secondary p-4">
      <div className="mb-3 flex items-start justify-between gap-4">
        <div>
          <h4 className="text-sm font-semibold">{task.title}</h4>
          <p className="mt-1 text-xs text-muted-foreground">{task.sourceName}</p>
        </div>
        <Badge variant={priorityVariant(task.priority)}>{task.priority}优先级</Badge>
      </div>
      <div className="grid gap-2 text-xs leading-5 text-muted-foreground">
        <p>
          <span className="text-foreground/90">怎么做：</span>
          {task.action}
        </p>
        <p>
          <span className="text-foreground/90">准备材料：</span>
          {task.userNeeds}
        </p>
        <p>
          <span className="text-foreground/90">通过信号：</span>
          {task.passSignal}
        </p>
        <p>
          <span className="text-foreground/90">风险点：</span>
          {task.redFlag}
        </p>
        <p>
          <span className="text-foreground/90">应保存材料：</span>
          {task.proofToSave}
        </p>
      </div>
      <div className="mt-4 rounded-md border border-border bg-background/45 p-3 text-xs leading-5 text-muted-foreground">
        <p className="mb-2 text-foreground/90">可复制询问：</p>
        <p>{task.askScript}</p>
      </div>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        {task.sourceUrl ? (
          <Button asChild variant="outline" size="sm">
            <a href={task.sourceUrl} target="_blank" rel="noreferrer">
              打开官方入口
              <ExternalLink className="ml-2 h-4 w-4" />
            </a>
          </Button>
        ) : null}
        <Button type="button" variant="outline" size="sm" onClick={copyAskScript}>
          <Copy className="mr-2 h-4 w-4" />
          {copied ? "已复制" : "复制询问话术"}
        </Button>
      </div>
    </div>
  );
}

function SourceLink({ source }: { source: OfficialSource }) {
  return (
    <a
      href={source.url}
      target="_blank"
      rel="noreferrer"
      className="rounded-md border border-border bg-secondary p-4 transition-colors hover:bg-primary/5"
    >
      <div className="mb-3 flex items-center gap-2 text-primary">
        <Building2 className="h-4 w-4" />
        <span className="text-xs">{source.provider}</span>
      </div>
      <h4 className="text-sm font-semibold">{source.title}</h4>
      <p className="mt-2 text-xs leading-5 text-muted-foreground">{source.note}</p>
      <div className="mt-3 inline-flex items-center text-xs text-primary">
        {source.scope}
        <ExternalLink className="ml-2 h-3.5 w-3.5" />
      </div>
    </a>
  );
}

