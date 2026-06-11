"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Copy,
  Gauge,
  Home,
  Loader2,
  MapPinned,
  MessageSquareText,
  Route,
  ShieldCheck,
  ShoppingBag,
  TrainFront,
} from "lucide-react";
import { AreaOptionCard } from "@/components/area-option-card";
import { PreferenceSelector } from "@/components/preference-selector";
import { ProfileDefaultNote } from "@/components/profile-default-note";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { recordCaseEvent } from "@/lib/client-case-events";
import { buildFlowHref, compactContext } from "@/lib/flow-links";
import { parseCandidateAreas, type AreaScreenInput, type AreaScreenResult } from "@/lib/area-fit";
import type { ReportStatus } from "@/lib/mock-data";
import { profileDefaultSummary, yuanPerMonth } from "@/lib/preference-derived-defaults";
import {
  defaultUserPreferences,
  hasStoredUserPreferences,
  readUserPreferences,
} from "@/lib/user-preferences";

type SubmitState = "idle" | "loading" | "error";

const defaultPreferences = ["独居", "必须近地铁", "怕潮湿"];

type AreaScreenSeed = Partial<AreaScreenInput> & {
  sourceLabel?: string;
  reportContext?: string;
  autoGenerate?: boolean;
};

function seedValue(value: string | undefined, fallback: string) {
  return value?.trim() || fallback;
}

function mergeLifestyle(preferences: string[], context?: string) {
  return [preferences.join("、"), context?.trim()].filter(Boolean).join("；");
}

function listOrNone(items: string[]) {
  return items.length ? items.join("、") : "暂无";
}

function currentHref() {
  if (typeof window === "undefined") return undefined;
  return `${window.location.pathname}${window.location.search}`;
}

function statusFromAreaResult(result: AreaScreenResult): ReportStatus {
  if (result.viewingQueue.priority.length) return "recommend";
  if (result.viewingQueue.backup.length) return "caution";
  return "reject";
}

function buildAreaCaseHighlights(result: AreaScreenResult) {
  const best = result.options[0];
  return [
    result.viewingQueue.priority.length
      ? `优先看：${result.viewingQueue.priority.slice(0, 2).join("、")}`
      : "",
    result.viewingQueue.backup.length
      ? `备选观察：${result.viewingQueue.backup.slice(0, 2).join("、")}`
      : "",
    result.viewingQueue.pause.length
      ? `先不约看：${result.viewingQueue.pause.slice(0, 2).join("、")}`
      : "",
    best ? `第一片区：${best.name}，评分 ${best.score}` : "",
    best?.viewingPlan?.reason,
    ...result.nextSteps.slice(0, 2),
  ]
    .filter((item): item is string => Boolean(item))
    .slice(0, 6);
}

function buildAreaViewingMemo(result: AreaScreenResult) {
  const lines = [
    "住哪儿｜片区看房安排",
    "",
    `城市：${result.city}`,
    `工作地点：${result.workplace}`,
    `判断理由：${result.mode === "amap" ? "实时路线与周边生活信息" : "已填写信息"}`,
    `结论摘要：${result.summary}`,
    "",
    "一、本周看房顺序",
    `优先约看：${listOrNone(result.viewingQueue.priority)}`,
    `可以备选：${listOrNone(result.viewingQueue.backup)}`,
    `先不约看：${listOrNone(result.viewingQueue.pause)}`,
    ...result.viewingQueue.dayPlan.map((item, index) => `${index + 1}. ${item}`),
    "",
    "二、片区确认事项",
    ...result.options.slice(0, 5).flatMap((area, index) => [
      `${index + 1}. ${area.name} | ${area.viewingPlan?.label ?? "待判断"} | ${area.commute} | ${area.rentRange}`,
      `判断：${area.viewingPlan?.reason ?? area.fit}`,
      `安排：${area.viewingPlan?.visitWindow ?? "补充通勤和周边凭据后再约现场。"}`,
      `现场确认：${area.viewingPlan?.verify.length ? area.viewingPlan.verify.join("；") : "再次确认通勤、夜间路线、生活配套和楼栋状态。"}`,
      `先不约看的情况：${area.viewingPlan?.stopRule ?? "任一关键凭据不达标就先别约看，优先换片区或补充材料。"}`,
      `风险：${area.risk}`,
      "",
    ]),
    "三、下一步",
    ...result.nextSteps.map((step, index) => `${index + 1}. ${step}`),
    "",
    "四、使用边界",
    result.warnings.length
      ? result.warnings.join("；")
      : "当前结果用于片区筛选；现场看房、合同确认和官方公开入口仍需继续确认。",
    "不抓取贝壳、链家、自如、安居客等房源平台数据；具体房源仍需要进入看房清单和房源评估。",
  ];

  return lines.join("\n");
}

function pickMainArea(result: AreaScreenResult) {
  const firstName =
    result.viewingQueue.priority[0] ||
    result.viewingQueue.backup[0] ||
    result.options[0]?.name;
  return result.options.find((area) => area.name === firstName) ?? result.options[0];
}

function buildAreaResultContext(result: AreaScreenResult) {
  const mainArea = pickMainArea(result);

  return compactContext([
    `片区筛选结果：${result.summary}`,
    mainArea ? `优先关注：${mainArea.name}` : "",
    mainArea ? `租金区间：${mainArea.rentRange}` : "",
    mainArea ? `通勤判断：${mainArea.commute}` : "",
    mainArea ? `生活配套：${mainArea.lifeRadius}` : "",
    mainArea ? `风险提示：${mainArea.risk}` : "",
    result.nextSteps.slice(0, 3).map((step, index) => `下一步 ${index + 1}：${step}`),
  ]);
}

function resultCommuteHref(result: AreaScreenResult, reportId?: string) {
  const mainArea = pickMainArea(result);

  return buildFlowHref("/commute", {
    reportId,
    from: "area",
    city: result.city,
    workplace: result.workplace,
    listingTitle: mainArea ? `${mainArea.name} 候选房源` : "候选片区房源",
    monthlyRent: mainArea?.rentRange,
    oneWayMinutes: mainArea?.commuteMinutes,
    reportContext: buildAreaResultContext(result),
  });
}

function resultLifeHref(result: AreaScreenResult, reportId?: string) {
  const mainArea = pickMainArea(result);

  return buildFlowHref("/life", {
    reportId,
    from: "area",
    city: result.city,
    listingTitle: mainArea ? `${mainArea.name} 候选房源` : "候选片区房源",
    lifestyle: mainArea?.lifeRadius,
    noiseSources: mainArea?.risk,
    notes: mainArea?.fit,
    reportContext: buildAreaResultContext(result),
  });
}

function resultAnalyzeHref(result: AreaScreenResult, reportId?: string) {
  const mainArea = pickMainArea(result);

  return buildFlowHref("/analyze", {
    reportId,
    from: "area",
    city: result.city,
    workplace: result.workplace,
    title: mainArea ? `${mainArea.name} 候选房源` : "候选片区房源",
    address: mainArea?.name,
    rent: mainArea?.rentRange,
    description: mainArea ? `${mainArea.risk}。${mainArea.lifeRadius}。${mainArea.fit}` : result.summary,
    reportContext: buildAreaResultContext(result),
  });
}

export function AreaScreenPanel({
  reportId,
  initialInput,
}: {
  reportId?: string;
  initialInput?: AreaScreenSeed;
}) {
  const [profile, setProfile] = useState(defaultUserPreferences);
  const [hasProfile, setHasProfile] = useState(false);
  const [profileReady, setProfileReady] = useState(false);
  const [preferences, setPreferences] = useState(defaultPreferences);
  const [result, setResult] = useState<AreaScreenResult | null>(null);
  const [state, setState] = useState<SubmitState>("idle");
  const [copiedMemo, setCopiedMemo] = useState(false);
  const autoSubmittedRef = useRef(false);
  const [message, setMessage] = useState(
    "填写城市、工作地点和候选片区后，就能先排除不适合长期居住的区域。工作地点越具体，通勤判断越准。",
  );

  useEffect(() => {
    const stored = readUserPreferences();
    setProfile(stored);
    setHasProfile(hasStoredUserPreferences());
    setPreferences(stored.livingPreferences);
    setProfileReady(true);
  }, []);

  const formDefaults = useMemo(
    () => {
      const city = seedValue(initialInput?.city, profile.defaultCity);

      return {
        city,
        workplace: seedValue(initialInput?.workplace, profile.defaultWorkplace),
        budget: seedValue(initialInput?.budget, yuanPerMonth(profile.budgetMax, 6500)),
        commuteLimit: seedValue(initialInput?.commuteLimit, profile.commuteLimit),
        candidateAreas: seedValue(
          initialInput?.candidateAreas,
          parseCandidateAreas(undefined, city).join("\n"),
        ),
      };
    },
    [initialInput, profile],
  );

  const sourceLabel = initialInput?.sourceLabel || (reportId ? "来自房源记录" : "");

  const submitAreaScreen = useCallback(
    async (
      payload: AreaScreenInput,
      loadingMessage = "正在判断片区、通勤、生活配套和风险...",
    ) => {
      setState("loading");
      setCopiedMemo(false);
      setMessage(loadingMessage);

      try {
        const response = await fetch("/api/area/screen", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          throw new Error("片区筛选失败，请确认信息后重试。");
        }

        const data = (await response.json()) as AreaScreenResult;
        setResult(data);
        setCopiedMemo(false);
        setState("idle");
        const writebackNote = reportId
          ? " 结果已保存到房源记录。"
          : " 结果已保存到工作台。";
        setMessage(
          data.mode === "amap"
            ? `已结合实时路线和周边生活信息。${writebackNote}`
            : `当前按已填写信息做了初筛；地址或片区还不够具体时，也能先排除明显不合适的选择。${writebackNote}`,
        );

        void recordCaseEvent({
          reportId: reportId || "workspace",
          type: "area",
          title: "片区与通勤",
          status: statusFromAreaResult(data),
          summary: data.summary,
          highlights: buildAreaCaseHighlights(data),
          href: currentHref(),
        });
      } catch (error) {
        setState("error");
        setMessage(error instanceof Error ? error.message : "片区筛选失败，请稍后重试。");
      }
    },
    [reportId],
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = new FormData(event.currentTarget);
    const payload = {
      city: String(form.get("city") || ""),
      workplace: String(form.get("workplace") || ""),
      budget: String(form.get("budget") || ""),
      commuteLimit: String(form.get("commuteLimit") || ""),
      candidateAreas: String(form.get("candidateAreas") || ""),
      lifestyle: mergeLifestyle(preferences, initialInput?.reportContext),
    };

    await submitAreaScreen(payload);
  }

  useEffect(() => {
    if (!profileReady || !initialInput?.autoGenerate || autoSubmittedRef.current) return;

    autoSubmittedRef.current = true;
    void submitAreaScreen(
      {
        city: formDefaults.city,
        workplace: formDefaults.workplace,
        budget: formDefaults.budget,
        commuteLimit: formDefaults.commuteLimit,
        candidateAreas: formDefaults.candidateAreas,
        lifestyle: mergeLifestyle(preferences, initialInput?.reportContext),
      },
      `${sourceLabel || "已带入上一页输入"}，正在筛选片区...`,
    );
  }, [
    formDefaults.budget,
    formDefaults.candidateAreas,
    formDefaults.city,
    formDefaults.commuteLimit,
    formDefaults.workplace,
    initialInput?.autoGenerate,
    initialInput?.reportContext,
    preferences,
    profileReady,
    sourceLabel,
    submitAreaScreen,
  ]);

  async function copyViewingMemo() {
    if (!result) return;
    await navigator.clipboard.writeText(buildAreaViewingMemo(result));
    setCopiedMemo(true);
  }

  const displayedOptions = result?.options ?? [];
  const profileKey = hasProfile
    ? `${formDefaults.city}-${formDefaults.workplace}-${formDefaults.budget}-${formDefaults.commuteLimit}`
    : `demo-${formDefaults.city}-${formDefaults.budget}`;

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="grid gap-4 xl:grid-cols-[0.42fr_0.58fr]">
        <Card className="p-6">
          <div className="mb-6">
            <p className="text-sm text-primary/80">
              筛选条件
            </p>
            {sourceLabel ? (
              <Badge variant="secondary" className="mt-3">
                {sourceLabel}
              </Badge>
            ) : null}
            <h2 className="mt-2 text-2xl font-semibold">你的片区条件</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              先用城市、工作地点、预算和通勤上限排除不适合长期居住的区域，再进入具体房源评估。
            </p>
          </div>

          <ProfileDefaultNote hasProfile={hasProfile} summary={profileDefaultSummary(profile)} />

          <div key={profileKey} className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="city">目标城市</Label>
              <Input id="city" name="city" defaultValue={formDefaults.city} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="workplace">工作地点</Label>
              <Input id="workplace" name="workplace" defaultValue={formDefaults.workplace} />
              <p className="text-xs leading-5 text-muted-foreground">
                建议填公司楼宇、园区、地铁站或明确地标；只填商圈时，通勤时间会更偏估算。
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="budget">月租预算上限</Label>
              <Input
                id="budget"
                name="budget"
                defaultValue={formDefaults.budget}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="commuteLimit">通勤上限</Label>
              <Input id="commuteLimit" name="commuteLimit" defaultValue={formDefaults.commuteLimit} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="candidateAreas">候选片区</Label>
              <Textarea
                id="candidateAreas"
                name="candidateAreas"
                className="min-h-[136px]"
                defaultValue={formDefaults.candidateAreas}
              />
              <p className="text-xs leading-5 text-muted-foreground">
                每行一个片区，可写到商圈、地铁站或街道。前 3 个片区会优先结合路线和周边生活信息，其余按已填写条件判断。
              </p>
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
              <MapPinned className="mr-2 h-5 w-5" />
            )}
            {state === "loading" ? "正在筛选片区" : "筛选片区"}
          </Button>
        </Card>

        <AreaDecisionGuide />
      </form>

      {result ? (
        <section>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="mb-2 flex flex-wrap gap-2">
                <Badge variant={result.mode === "amap" ? "success" : "secondary"}>
                  {result.mode === "amap" ? "实时路线与周边生活信息" : "按已填写信息判断"}
                </Badge>
                <Badge variant="outline">{result.city}</Badge>
                <Badge variant="outline">工作地点：{result.workplace}</Badge>
              </div>
              <h2 className="text-xl font-semibold">片区筛选结果</h2>
              <p className="mt-2 max-w-4xl text-sm leading-6 text-muted-foreground">
                {result.summary}
              </p>
            </div>
          </div>

          {result.warnings.length ? (
            <div className="mb-4 rounded-md border border-amber-300/20 bg-amber-300/10 p-3 text-sm leading-6 text-amber-700">
              {result.warnings.map((warning) => (
                <p key={warning}>{warning}</p>
              ))}
            </div>
          ) : null}

          <ViewingQueuePanel result={result} />

          <AreaNextUsePanel result={result} reportId={reportId} />

          <Card className="mb-4 p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-3xl">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-md bg-primary/15 text-primary">
                  <MessageSquareText className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-semibold">片区看房安排</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  把优先约看、可以备选、先不约看、现场确认重点和放弃条件整理成可带去周末看房的文本。
                </p>
              </div>
              <Button type="button" onClick={copyViewingMemo} className="shrink-0">
                <Copy className="mr-2 h-4 w-4" />
                {copiedMemo ? "已复制" : "复制看房安排"}
              </Button>
            </div>
            <pre className="mt-4 max-h-[320px] overflow-auto whitespace-pre-wrap rounded-md border border-border bg-secondary p-4 text-xs leading-6 text-muted-foreground">
              {buildAreaViewingMemo(result)}
            </pre>
          </Card>

          <div className="grid gap-4 lg:grid-cols-3">
            {displayedOptions.map((area) => (
              <AreaOptionCard key={`${area.city}-${area.name}`} area={area} reportId={reportId} />
            ))}
          </div>

          <Card className="mt-4 p-5">
            <h3 className="font-semibold">下一步</h3>
            <div className="mt-3 grid gap-2 text-sm leading-6 text-muted-foreground md:grid-cols-3">
              {result.nextSteps.map((step) => (
                <p key={step} className="rounded-md border border-border bg-secondary p-3">
                  {step}
                </p>
              ))}
            </div>
          </Card>
        </section>
      ) : null}
    </div>
  );
}

function ViewingQueuePanel({ result }: { result: AreaScreenResult }) {
  const queueGroups = [
    {
      label: "优先约看",
      value: result.viewingQueue.priority,
      className: "border-emerald-300/20 bg-emerald-300/10 text-emerald-900",
    },
    {
      label: "可以备选",
      value: result.viewingQueue.backup,
      className: "border-amber-300/20 bg-amber-300/10 text-amber-900",
    },
    {
      label: "先不约看",
      value: result.viewingQueue.pause,
      className: "border-rose-300/20 bg-rose-300/10 text-rose-900",
    },
  ];

  return (
    <Card className="mb-4 p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-md bg-primary/15 text-primary">
            <CalendarDays className="h-5 w-5" />
          </div>
          <h3 className="text-lg font-semibold">本周看房安排</h3>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            先把明显不合适的片区挡在现场看房之前，避免把周末耗在通勤超限、租金不稳或夜间动线存疑的地方。
          </p>
        </div>
        <div className="grid gap-2 sm:grid-cols-3 lg:w-[520px]">
          {queueGroups.map((group) => (
            <div key={group.label} className={`rounded-md border p-3 ${group.className}`}>
              <p className="text-xs text-current/65">{group.label}</p>
              <p className="mt-1 text-sm font-semibold">
                {group.value.length ? group.value.join("、") : "暂无"}
              </p>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-4 grid gap-2 text-sm leading-6 text-muted-foreground lg:grid-cols-3">
        {result.viewingQueue.dayPlan.map((item) => (
          <p key={item} className="rounded-md border border-border bg-secondary p-3">
            {item}
          </p>
        ))}
      </div>
    </Card>
  );
}

function AreaNextUsePanel({
  result,
  reportId,
}: {
  result: AreaScreenResult;
  reportId?: string;
}) {
  const mainArea = pickMainArea(result);
  const areaName = mainArea?.name ?? "优先片区";
  const actions = [
    {
      title: "测通勤成本",
      text: `把 ${areaName} 带入通勤页，核算每天多花的时间、换乘和晚归成本。`,
      href: resultCommuteHref(result, reportId),
      cta: "去测通勤",
      icon: TrainFront,
    },
    {
      title: "查生活配套",
      text: "确认买菜、药店、快递、夜路和噪音这些每天都会遇到的问题。",
      href: resultLifeHref(result, reportId),
      cta: "查生活配套",
      icon: ShoppingBag,
    },
    {
      title: "评估候选房源",
      text: "片区合适后，再进入具体房源，避免只因为低租金就冲动约看。",
      href: resultAnalyzeHref(result, reportId),
      cta: "进入房源评估",
      icon: Home,
    },
  ];

  return (
    <Card className="mb-4 p-5">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold">接下来怎么用这份结果</h3>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            先围绕 {areaName} 继续验证；如果任何关键条件不合适，再回到备选片区。
          </p>
        </div>
      </div>
      <div className="grid gap-3 lg:grid-cols-3">
        {actions.map((action) => {
          const Icon = action.icon;

          return (
            <div key={action.title} className="rounded-md border border-border bg-secondary p-4">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-md bg-primary/15 text-primary">
                <Icon className="h-5 w-5" />
              </div>
              <h4 className="font-semibold">{action.title}</h4>
              <p className="mt-2 min-h-[72px] text-sm leading-6 text-muted-foreground">
                {action.text}
              </p>
              <Button asChild variant="secondary" className="mt-4 w-full">
                <Link href={action.href}>
                  {action.cta}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function AreaDecisionGuide() {
  return (
    <Card className="overflow-hidden">
      <div className="border-b border-border p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm text-primary/80">片区判断面板</p>
            <h3 className="mt-1 text-lg font-semibold">把候选范围缩到能约看的程度</h3>
          </div>
          <span className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/15 text-primary">
            <MapPinned className="h-5 w-5" />
          </span>
        </div>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          先判断片区是否值得去现场，再决定具体看哪套房，避免把周末花在明显不合适的选择上。
        </p>
      </div>

      <div className="relative m-5 h-[220px] overflow-hidden rounded-md border border-border bg-secondary/65 shadow-[inset_0_1px_0_oklch(var(--background)/0.72)]">
        <div className="absolute left-[-8%] top-[36%] h-3 w-[120%] rotate-[-12deg] rounded-full bg-border/80" />
        <div className="absolute left-[10%] top-[62%] h-3 w-[100%] rotate-[18deg] rounded-full bg-border/70" />
        <div className="absolute left-[54%] top-[-10%] h-[120%] w-3 rotate-[7deg] rounded-full bg-border/70" />
        <div className="absolute left-[12%] top-[18%] rounded-md border border-border bg-card px-3 py-2 text-xs shadow-sm">
          候选片区 A
        </div>
        <div className="absolute right-[9%] top-[26%] rounded-md border border-border bg-card px-3 py-2 text-xs shadow-sm">
          工作地点
        </div>
        <div className="absolute bottom-[16%] left-[36%] rounded-md border border-border bg-card px-3 py-2 text-xs shadow-sm">
          备选片区 B
        </div>
        <div className="absolute left-[48%] top-[42%] flex h-11 w-11 items-center justify-center rounded-full border border-primary/25 bg-primary text-primary-foreground shadow-md">
          <TrainFront className="h-5 w-5" />
        </div>
      </div>

      <div className="grid gap-3 p-5 pt-0">
        <GuideStep
          icon={Route}
          title="先算通勤"
          text="把单程时间、换乘、最后一公里和夜间路线作为第一层过滤器。"
        />
        <GuideStep
          icon={Gauge}
          title="再算承受力"
          text="片区租金要看能否稳定覆盖独居、通勤和生活支出，最低价只能作为参考。"
        />
        <GuideStep
          icon={ShieldCheck}
          title="提前标风险"
          text="老小区、低楼层、潮湿、临街噪音和末班车都要在看房前看清。"
        />
      </div>
    </Card>
  );
}

function GuideStep({
  icon: Icon,
  title,
  text,
}: {
  icon: typeof Route;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-md border border-border bg-secondary p-4">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/15 text-primary">
          <Icon className="h-4 w-4" />
        </span>
        <div>
          <h4 className="text-sm font-semibold">{title}</h4>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">{text}</p>
        </div>
      </div>
    </div>
  );
}

