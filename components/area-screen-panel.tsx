"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Copy,
  Loader2,
  MapPinned,
  MessageSquareText,
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

const areaScenarioTemplates = [
  {
    label: "通勤优先",
    city: "深圳",
    workplace: "科技园",
    budget: "6500",
    commuteLimit: "45分钟",
    candidateAreas: "西丽\n后海\n白石洲\n宝安中心",
    preferences: ["独居", "必须近地铁", "晚归"],
  },
  {
    label: "预算优先",
    city: "上海",
    workplace: "静安寺",
    budget: "5200",
    commuteLimit: "55分钟",
    candidateAreas: "中山公园\n曹杨路\n大宁\n漕河泾",
    preferences: ["独居", "预算敏感", "必须近地铁"],
  },
  {
    label: "晚归安全",
    city: "杭州",
    workplace: "未来科技城",
    budget: "4800",
    commuteLimit: "45分钟",
    candidateAreas: "仓前\n良睦路\n五常\n文一西路",
    preferences: ["独居", "晚归", "门禁安全", "怕潮湿"],
  },
];

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
      ? `优先约看：${result.viewingQueue.priority.slice(0, 2).join("、")}`
      : "",
    result.viewingQueue.backup.length
      ? `备选观察：${result.viewingQueue.backup.slice(0, 2).join("、")}`
      : "",
    result.viewingQueue.pause.length
      ? `暂不约看：${result.viewingQueue.pause.slice(0, 2).join("、")}`
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
    `依据口径：${result.mode === "amap" ? "实时路线与周边生活信息" : "已填写信息"}`,
    `摘要：${result.summary}`,
    "",
    "一、本周看房顺序",
    `优先约看：${listOrNone(result.viewingQueue.priority)}`,
    `可以备选：${listOrNone(result.viewingQueue.backup)}`,
    `暂不约看：${listOrNone(result.viewingQueue.pause)}`,
    ...result.viewingQueue.dayPlan.map((item, index) => `${index + 1}. ${item}`),
    "",
    "二、片区确认事项",
    ...result.options.slice(0, 5).flatMap((area, index) => [
      `${index + 1}. ${area.name} | ${area.viewingPlan?.label ?? "待判断"} | ${area.commute} | ${area.rentRange}`,
      `依据：${area.viewingPlan?.reason ?? area.fit}`,
      `安排：${area.viewingPlan?.visitWindow ?? "补通勤和周边记录后，再决定是否约现场。"}`,
      `现场核验：${area.viewingPlan?.verify.length ? area.viewingPlan.verify.join("；") : "复核通勤、夜间路线、生活配套和楼栋状态。"}`,
      `暂停条件：${area.viewingPlan?.stopRule ?? "任一关键记录不完整，就换片区或补充材料。"}`,
      `风险：${area.risk}`,
      "",
    ]),
    "三、后续确认",
    ...result.nextSteps.map((step, index) => `${index + 1}. ${step}`),
    "",
    "四、使用边界",
    result.warnings.length
      ? result.warnings.join("；")
      : "当前结果用于片区筛选；现场看房、合同和官方公开入口仍需继续核对。",
    "具体房源需要由你主动输入或上传材料后再评估。",
  ];

  return lines.join("\n");
}

export function AreaScreenPanel({
  reportId,
  initialInput,
}: {
  reportId?: string;
  initialInput?: AreaScreenSeed;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [profile, setProfile] = useState(defaultUserPreferences);
  const [hasProfile, setHasProfile] = useState(false);
  const [profileReady, setProfileReady] = useState(false);
  const [preferences, setPreferences] = useState(defaultPreferences);
  const [result, setResult] = useState<AreaScreenResult | null>(null);
  const [state, setState] = useState<SubmitState>("idle");
  const [copiedMemo, setCopiedMemo] = useState(false);
  const autoSubmittedRef = useRef(false);
  const [message, setMessage] = useState(
    "填写城市、工作地点和候选片区后，用预算、通勤和生活半径排除不适合长期居住的区域。工作地点越具体，通勤判断越准。",
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
          city ? parseCandidateAreas(undefined, city).join("\n") : "",
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
          throw new Error("片区判断失败，请确认信息后重试。");
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
            : `已生成片区初筛；地址或片区还不够具体时，也能排除明显不合适的选择。${writebackNote}`,
        );

        void recordCaseEvent({
          reportId: reportId || "workspace",
          type: "area",
        title: "片区判断",
          status: statusFromAreaResult(data),
          summary: data.summary,
          highlights: buildAreaCaseHighlights(data),
          href: currentHref(),
        });
      } catch (error) {
        setState("error");
        setMessage(error instanceof Error ? error.message : "片区判断失败，请稍后重试。");
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
      `${sourceLabel || "已带入上一页输入"}，正在判断片区...`,
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

  function setFormValue(name: string, value: string) {
    const field = formRef.current?.elements.namedItem(name);
    if (
      field instanceof HTMLInputElement ||
      field instanceof HTMLTextAreaElement
    ) {
      field.value = value;
    }
  }

  function applyScenarioTemplate(scenario: (typeof areaScenarioTemplates)[number]) {
    setFormValue("city", scenario.city);
    setFormValue("workplace", scenario.workplace);
    setFormValue("budget", scenario.budget);
    setFormValue("commuteLimit", scenario.commuteLimit);
    setFormValue("candidateAreas", scenario.candidateAreas);
    setPreferences(scenario.preferences);
    setMessage(`已填入“${scenario.label}”场景。可以直接判断片区，也可以继续修改。`);
  }

  const displayedOptions = result?.options ?? [];
  const profileKey = hasProfile
    ? `${formDefaults.city}-${formDefaults.workplace}-${formDefaults.budget}-${formDefaults.commuteLimit}`
    : `empty-${formDefaults.city}-${formDefaults.budget}`;

  return (
    <div className="space-y-6">
      <form
        ref={formRef}
        onSubmit={handleSubmit}
        className="grid w-full max-w-3xl min-w-0 gap-4"
      >
        <Card className="w-full min-w-0 max-w-full p-5 sm:p-6">
          <div className="mb-6">
            <p className="text-sm text-primary/80">
              片区初筛
            </p>
            {sourceLabel ? (
              <Badge variant="secondary" className="mt-3">
                {sourceLabel}
              </Badge>
            ) : null}
            <h2 className="mt-2 text-2xl font-semibold">输入城市、工作地和候选片区</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              用城市、工作地点、预算和通勤上限排除不适合长期居住的区域，再进入具体房源体检。
            </p>
          </div>

          <ProfileDefaultNote hasProfile={hasProfile} summary={profileDefaultSummary(profile)} />

          <div key={profileKey} className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label>快速填入</Label>
              <div className="flex max-w-full gap-2 overflow-x-auto pb-1">
                {areaScenarioTemplates.map((scenario) => (
                  <button
                    key={scenario.label}
                    type="button"
                    onClick={() => applyScenarioTemplate(scenario)}
                    className="shrink-0 rounded-full border border-border bg-secondary px-3 py-2 text-sm font-medium transition hover:border-primary/40 hover:text-primary"
                  >
                    {scenario.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="city">目标城市</Label>
              <Input id="city" name="city" defaultValue={formDefaults.city} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="workplace">工作地点</Label>
              <Input id="workplace" name="workplace" defaultValue={formDefaults.workplace} />
              <p className="text-xs leading-5 text-muted-foreground">
                尽量填公司楼宇、园区、地铁站或明确地标；只填商圈时，通勤时间会更偏估算。
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
                每行一个片区，可写到商圈、地铁站或街道。前3个片区优先结合路线和周边生活信息，其余按已填写条件判断。
              </p>
            </div>
          </div>

          <details className="mt-5 rounded-md border border-border bg-secondary/45 p-4">
            <summary className="cursor-pointer text-sm font-medium text-foreground">
              补充居住偏好（选填）
            </summary>
            <div className="mt-4 space-y-3">
              <Label>居住偏好</Label>
              <PreferenceSelector value={preferences} onChange={setPreferences} />
            </div>
          </details>

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
            {state === "loading" ? "正在判断片区" : "判断片区"}
          </Button>
        </Card>
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

          <details className="mb-4 rounded-md border border-border bg-card p-4">
            <summary className="cursor-pointer text-sm font-medium text-foreground">
              查看可复制的片区看房安排
            </summary>
            <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-3xl">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-md bg-primary/15 text-primary">
                  <MessageSquareText className="h-5 w-5" />
                </div>
                <p className="text-sm leading-6 text-muted-foreground">
                  用于整理优先约看、备选、暂不约看和现场核验重点。
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
          </details>

          <div className="grid gap-4 lg:grid-cols-3">
            {displayedOptions.map((area) => (
              <AreaOptionCard key={`${area.city}-${area.name}`} area={area} reportId={reportId} />
            ))}
          </div>

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
      label: "暂不约看",
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
            排除通勤、租金或夜间路线不符合要求的片区，减少无效看房。
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
