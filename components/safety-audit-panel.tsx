"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import {
  CheckCircle2,
  Copy,
  Footprints,
  Loader2,
  LockKeyhole,
  Moon,
  ShieldCheck,
  ShieldQuestion,
  Siren,
  type LucideIcon,
} from "lucide-react";
import { ProfileDefaultNote } from "@/components/profile-default-note";
import { RiskBadge } from "@/components/risk-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { recordCaseEvent } from "@/lib/client-case-events";
import { livingPreferenceText, profileDefaultSummary } from "@/lib/preference-derived-defaults";
import {
  defaultUserPreferences,
  hasStoredUserPreferences,
  readUserPreferences,
} from "@/lib/user-preferences";
import type { SafetyAuditInput, SafetyAuditResult, SafetyLevel, SafetyTask } from "@/lib/safety-audit";

type SubmitState = "idle" | "loading" | "error";

export type SafetyAuditSeed = {
  city?: string;
  listingTitle?: string;
  floor?: string;
  preferences?: string;
  reportContext?: string;
  concerns?: string;
  reportId?: string;
  autoGenerate?: boolean;
  sourceLabel?: string;
};

const severityVariant: Record<SafetyLevel, "destructive" | "warning" | "success"> = {
  高: "destructive",
  中: "warning",
  低: "success",
};

function buildSafetyMemo(result: SafetyAuditResult) {
  const highTasks = result.tasks
    .filter((task) => task.severity === "高")
    .slice(0, 8)
    .map((task, index) => `${index + 1}. ${task.title}：${task.action}通过标准：${task.passStandard}`);
  const redFlagLines = result.redFlags.slice(0, 6).map((item, index) => `${index + 1}. ${item}`);
  const routeLines = result.routeActions.map((item, index) => `${index + 1}. ${item}`);
  const privacyLines = result.privacyBoundaries.map((item, index) => `${index + 1}. ${item}`);
  const questionLines = result.questions.map((item, index) => `${index + 1}. ${item}`);

  return [
    `你好，关于${result.city}「${result.listingTitle}」这套房，我需要先确认独居和晚归安全边界。`,
    "",
    `当前安全评分 ${result.score}/100，高风险项 ${result.highRiskCount} 项。高风险项确认前，我不会付款或签约。`,
    "",
    "一、必须先现场确认的安全项",
    ...(highTasks.length ? highTasks : ["1. 当前没有高优先级安全项，但仍需确认夜间路线和钥匙边界。"]),
    "",
    "二、当前安全风险",
    ...redFlagLines,
    "",
    "三、夜间路线确认",
    ...routeLines,
    "",
    "四、隐私和进入边界",
    ...privacyLines,
    "",
    "五、请明确回复的问题",
    ...questionLines,
    "",
    "以上内容请尽量用文字确认，尤其是门禁、钥匙数量、能否换锁、维修上门是否预约、快递外卖是否需要送到门口。确认前暂不付款或签约。",
  ].join("\n");
}

function seedValue(value: string | undefined, fallback: string) {
  return value?.trim() || fallback;
}

export function SafetyAuditPanel({ initialInput }: { initialInput?: SafetyAuditSeed }) {
  const autoSubmittedRef = useRef(false);
  const [profile, setProfile] = useState(defaultUserPreferences);
  const [hasProfile, setHasProfile] = useState(false);
  const [result, setResult] = useState<SafetyAuditResult | null>(null);
  const [copiedMemo, setCopiedMemo] = useState(false);
  const [state, setState] = useState<SubmitState>("idle");
  const [message, setMessage] = useState(
    "填写晚归路线、门禁楼道和上门维修等情况，生成独居安全确认事项。",
  );

  useEffect(() => {
    setProfile(readUserPreferences());
    setHasProfile(hasStoredUserPreferences());
  }, []);

  const preferenceText = [initialInput?.preferences, livingPreferenceText(profile)]
    .filter(Boolean)
    .join("、");
  const prefersPet = preferenceText.includes("养宠");
  const fearsNoise = preferenceText.includes("怕吵") || preferenceText.includes("晚归");
  const sourceLabel = initialInput?.sourceLabel || "";
  const seedKey = [
    hasProfile ? "profile" : "empty",
    profile.defaultCity,
    profile.defaultWorkplace,
    initialInput?.city,
    initialInput?.listingTitle,
    initialInput?.floor,
    initialInput?.reportContext,
  ].join("-");
  const concernsDefault =
    initialInput?.concerns ||
    initialInput?.reportContext ||
    (preferenceText ? `当前偏好：${preferenceText}。` : "");

  const submitPayload = useCallback(
    async (payload: SafetyAuditInput, loadingMessage = "正在确认独居安全...") => {
    setState("loading");
    setMessage(loadingMessage);

    try {
      const response = await fetch("/api/safety/audit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error("独居安全确认失败，请确认信息后重试。");
      }

      const data = (await response.json()) as SafetyAuditResult;
      setResult(data);
      setCopiedMemo(false);
      setState("idle");
      setMessage("独居安全确认已整理。先确认高优先级风险点，再进入付款和签约。");
      void recordCaseEvent({
        reportId: initialInput?.reportId || "workspace",
        type: "safety",
        title: "独居安全确认",
        status: data.status,
        summary: data.summary,
        highlights: [...data.redFlags, ...data.nextActions].slice(0, 6),
        href: typeof window !== "undefined" ? `${window.location.pathname}${window.location.search}` : undefined,
      });
    } catch (error) {
      setState("error");
      setMessage(error instanceof Error ? error.message : "独居安全确认失败，请稍后重试。");
    }
    },
    [initialInput?.reportId],
  );

  useEffect(() => {
    if (!initialInput?.autoGenerate || autoSubmittedRef.current) return;
    autoSubmittedRef.current = true;
    void submitPayload(
      {
        city: seedValue(initialInput.city, profile.defaultCity),
        listingTitle: seedValue(initialInput.listingTitle, "首页输入的候选房源"),
        floor: Number(seedValue(initialInput.floor, "0")),
        buildingAccess: "不确定",
        hallwayLighting: "不确定",
        elevatorSecurity: "不确定",
        nightReturnTime: fearsNoise ? "22:30 后" : "不确定",
        walkFromTransit: 0,
        routeDescription: seedValue(
          initialInput.concerns || initialInput.reportContext,
          "晚归路线、门禁楼道和维修上门边界需要先确认。",
        ),
        deliveryMode: "不确定",
        roommateMode: "独居",
        landlordContact: "不确定",
        windowSecurity: "不确定",
        userProfile: seedValue(preferenceText, ""),
        concerns: concernsDefault,
      },
      `${sourceLabel || "已带入首页输入"}，正在确认独居安全...`,
    );
  }, [concernsDefault, fearsNoise, initialInput, preferenceText, profile.defaultCity, sourceLabel, submitPayload]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = new FormData(event.currentTarget);
    await submitPayload({
      city: String(form.get("city") || ""),
      listingTitle: String(form.get("listingTitle") || ""),
      floor: Number(form.get("floor")),
      buildingAccess: String(form.get("buildingAccess") || ""),
      hallwayLighting: String(form.get("hallwayLighting") || ""),
      elevatorSecurity: String(form.get("elevatorSecurity") || ""),
      nightReturnTime: String(form.get("nightReturnTime") || ""),
      walkFromTransit: Number(form.get("walkFromTransit")),
      routeDescription: String(form.get("routeDescription") || ""),
      deliveryMode: String(form.get("deliveryMode") || ""),
      roommateMode: String(form.get("roommateMode") || ""),
      landlordContact: String(form.get("landlordContact") || ""),
      windowSecurity: String(form.get("windowSecurity") || ""),
      userProfile: String(form.get("userProfile") || ""),
      concerns: String(form.get("concerns") || ""),
    });
  }

  async function copySafetyMemo() {
    if (!result) return;
    await navigator.clipboard.writeText(buildSafetyMemo(result));
    setCopiedMemo(true);
  }

  return (
    <div className="space-y-6">
      <form
        onSubmit={handleSubmit}
        className={`grid grid-cols-1 gap-4 ${state === "loading" || result ? "xl:grid-cols-[0.42fr_0.58fr]" : "max-w-3xl"}`}
      >
        <Card className="min-w-0 p-6">
          <div className="mb-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm font-medium text-primary">
                  独居安全
                </p>
                <h2 className="mt-2 text-2xl font-semibold">输入独居安全条件</h2>
              </div>
              {sourceLabel ? (
                <Badge variant="outline" className="w-fit border-primary/30 text-primary">
                  {sourceLabel}
                </Badge>
              ) : null}
            </div>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              安全要拆开看楼层、门禁、夜间路线、快递外卖、室友和房东接触，判断这套房是否适合独居。
            </p>
          </div>

          <ProfileDefaultNote hasProfile={hasProfile} summary={profileDefaultSummary(profile)} />

          <div key={seedKey} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field
              label="城市"
              name="city"
              defaultValue={initialInput?.city || profile.defaultCity}
              placeholder="填写租房城市"
              type="text"
            />
            <Field
              label="房源名称"
              name="listingTitle"
              defaultValue={initialInput?.listingTitle || ""}
              placeholder="填写小区、房源名称或位置"
              type="text"
            />
            <Field label="楼层" name="floor" defaultValue={initialInput?.floor || ""} placeholder="填写所在楼层" />
            <Field
              label="地铁/公交到家步行分钟"
              name="walkFromTransit"
              defaultValue=""
              placeholder="填写夜间步行分钟"
            />
            <SelectField
              label="门禁情况"
              name="buildingAccess"
              defaultValue="不确定"
              options={["不确定", "门禁严格", "有门禁但可尾随", "门禁松散", "开放式楼栋无门禁"]}
            />
            <SelectField
              label="楼道照明"
              name="hallwayLighting"
              defaultValue="不确定"
              options={["不确定", "照明稳定", "部分楼层偏暗", "楼道偏暗", "照明损坏"]}
            />
            <SelectField
              label="电梯/楼梯安全"
              name="elevatorSecurity"
              defaultValue="不确定"
              options={["不确定", "电梯有监控", "电梯无明显监控", "楼梯间偏僻", "无电梯且楼梯照明弱"]}
            />
            <SelectField
              label="常见晚归时间"
              name="nightReturnTime"
              defaultValue={fearsNoise ? "22:30 后" : "不确定"}
              options={["不确定", "20:00 前", "21:30 左右", "22:30 后", "经常凌晨"]}
            />
            <SelectField
              label="快递外卖"
              name="deliveryMode"
              defaultValue="不确定"
              options={["不确定", "有快递柜/驿站", "小区门口取", "快递外卖可送到门口", "代收混乱"]}
            />
            <SelectField
              label="居住关系"
              name="roommateMode"
              defaultValue="独居"
              options={["独居", "熟人合租", "陌生人合租", "异性混住"]}
            />
            <SelectField
              label="看房接触"
              name="landlordContact"
              defaultValue="不确定"
              options={["不确定", "白天公开看房", "房东/中介要求单独看房", "晚上临时看房", "付款前频繁私聊催促"]}
            />
            <SelectField
              label="窗户防护"
              name="windowSecurity"
              defaultValue="不确定"
              options={["不确定", "窗户可反锁且有防护", "普通窗锁", "低楼层窗户无额外防护", "窗外有可攀爬平台"]}
            />
            <SelectField
              label="居住偏好"
              name="userProfile"
              defaultValue={prefersPet ? "独居且养宠" : fearsNoise ? "经常晚归" : "普通独居"}
              options={["普通独居", "女生独居", "经常晚归", "独居且养宠"]}
            />
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="routeDescription">夜间路线描述</Label>
              <Textarea
                id="routeDescription"
                name="routeDescription"
                className="min-h-[96px]"
                defaultValue=""
                placeholder="填写夜间从地铁、公交或停车位置回家的路线情况"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="concerns">最担心的问题</Label>
              <Textarea
                id="concerns"
                name="concerns"
                className="min-h-[96px]"
                defaultValue={concernsDefault}
                placeholder="填写你最担心的安全问题，例如门禁、楼道、晚归路线、维修上门或隐私边界"
              />
            </div>
          </div>

          <StatusMessage state={state} message={message} />

          <Button type="submit" size="lg" className="mt-5 w-full" disabled={state === "loading"}>
            {state === "loading" ? (
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            ) : (
              <ShieldCheck className="mr-2 h-5 w-5" />
            )}
            {state === "loading" ? "正在确认" : "确认独居安全"}
          </Button>
        </Card>

        {state === "loading" || result ? (
          <Card className="min-w-0 p-6">
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm text-primary/80">
                  安全结果
                </p>
                <h2 className="mt-2 text-2xl font-semibold">独居安全结论</h2>
              </div>
              {result ? <RiskBadge status={result.status} tone="generic" /> : null}
            </div>

            {state === "loading" ? (
            <div className="flex min-h-[560px] flex-col justify-center rounded-md border border-border bg-secondary p-5">
              <Badge variant="secondary" className="mb-4 w-fit">
                正在整理
              </Badge>
              <Loader2 className="mb-4 h-6 w-6 animate-spin text-primary" />
              <h3 className="text-xl font-semibold">正在把安全担忧拆成确认项</h3>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">
                会优先看晚归路线、门禁楼道、低楼层窗户、维修上门和隐私边界，再决定是否继续看房、付款或签约。
              </p>
            </div>
          ) : result ? (
            <div className="space-y-5">
              <p className="text-sm leading-7 text-muted-foreground">{result.summary}</p>
              <div className="grid gap-3 sm:grid-cols-3">
                <SummaryTile icon={ShieldCheck} label="安全评分" value={`${result.score}`} />
                <SummaryTile icon={Siren} label="高风险项" value={`${result.highRiskCount} 项`} />
                <SummaryTile icon={Footprints} label="路线确认" value="必须夜间确认" />
              </div>
              <div className="rounded-md border border-border bg-secondary p-4">
                <div className="mb-3 flex items-center justify-between gap-4">
                  <p className="text-sm font-medium">安全可控度</p>
                  <p className="text-2xl font-semibold">{result.score}</p>
                </div>
                <Progress value={result.score} />
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  高风险项越多，越应该推迟定金和签约，先确认夜间路线、门禁和钥匙边界。
                </p>
              </div>
              <div className="rounded-md border border-amber-300/20 bg-amber-300/10 p-4">
                <div className="mb-3 flex items-center gap-2 text-amber-700">
                  <Siren className="h-4 w-4" />
                  <h3 className="font-semibold">安全风险</h3>
                </div>
                <div className="grid gap-2 text-sm leading-6 text-amber-900/90">
                  {result.redFlags.map((item) => (
                    <p key={item}>{item}</p>
                  ))}
                </div>
              </div>

              <details className="rounded-md border border-border bg-secondary/55 p-4">
                <summary className="cursor-pointer text-sm font-medium text-foreground">
                  查看独居安全确认文本
                </summary>
                <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <p className="text-sm leading-6 text-muted-foreground">
                    用于确认晚归路线、门禁楼道、钥匙换锁、维修上门、快递外卖和隐私边界。
                  </p>
                  <Button type="button" variant="outline" onClick={copySafetyMemo}>
                    <Copy className="mr-2 h-4 w-4" />
                    {copiedMemo ? "已复制" : "复制文本"}
                  </Button>
                </div>
                <pre className="mt-4 max-h-[320px] overflow-auto whitespace-pre-wrap rounded-md border border-border bg-card p-4 text-sm leading-7 text-muted-foreground">
                  {buildSafetyMemo(result)}
                </pre>
              </details>
            </div>
            ) : null}
          </Card>
        ) : null}
      </form>

      {result ? (
        <>
          <section className="grid grid-cols-1 gap-4 lg:grid-cols-[0.58fr_0.42fr]">
            <Card className="min-w-0 p-5">
              <h3 className="font-semibold">安全确认事项</h3>
              <div className="mt-4 overflow-x-auto">
                <table className="min-w-[840px] text-left text-sm">
                  <thead className="text-xs text-muted-foreground">
                    <tr className="border-b border-border">
                      <th className="px-3 py-3 font-medium">分组</th>
                      <th className="px-3 py-3 font-medium">确认项</th>
                      <th className="px-3 py-3 font-medium">优先级</th>
                      <th className="px-3 py-3 font-medium">事项</th>
                      <th className="px-3 py-3 font-medium">通过标准</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.tasks.map((task) => (
                      <TaskRow key={`${task.group}-${task.title}`} task={task} />
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            <InfoPanel title="夜间路线事项" icon={Moon} items={result.routeActions} />
          </section>

          <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <InfoPanel title="隐私边界" icon={LockKeyhole} items={result.privacyBoundaries} />
            <InfoPanel title="必须问清" icon={ShieldQuestion} items={result.questions} />
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
          <Siren className="mt-1 h-4 w-4 shrink-0" />
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
      <p className="mt-1 text-xl font-semibold">{value}</p>
    </div>
  );
}

function TaskRow({ task }: { task: SafetyTask }) {
  return (
    <tr className="border-b border-border last:border-0">
      <td className="px-3 py-4 text-muted-foreground">{task.group}</td>
      <td className="px-3 py-4 font-medium">{task.title}</td>
      <td className="px-3 py-4">
        <Badge variant={severityVariant[task.severity]}>{task.severity}</Badge>
      </td>
      <td className="px-3 py-4 text-muted-foreground">{task.action}</td>
      <td className="px-3 py-4 text-muted-foreground">{task.passStandard}</td>
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
    <Card className="min-w-0 p-5">
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

