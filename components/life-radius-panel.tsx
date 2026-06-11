"use client";

import { FormEvent, type ReactNode, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Calculator,
  CheckCircle2,
  Clock3,
  Copy,
  Loader2,
  MapPin,
  MessageSquareText,
  PackageCheck,
  Route,
  ShieldAlert,
  WalletCards,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { ProfileDefaultNote } from "@/components/profile-default-note";
import { RiskBadge } from "@/components/risk-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { defaultAppSettings, readAppSettings } from "@/lib/app-settings";
import type {
  LifeRadiusInput,
  LifeRadiusResult,
  LifeRiskItem,
  LifeRiskLevel,
} from "@/lib/life-radius";
import { recordCaseEvent } from "@/lib/client-case-events";
import { buildFlowHref, compactContext } from "@/lib/flow-links";
import { livingPreferenceText, profileDefaultSummary } from "@/lib/preference-derived-defaults";
import {
  defaultUserPreferences,
  hasStoredUserPreferences,
  readUserPreferences,
} from "@/lib/user-preferences";

type SubmitState = "idle" | "loading" | "error";
type LifeQualitySignal = NonNullable<LifeRadiusResult["dataQuality"]>[number];

type LifeRadiusSeed = Partial<Record<keyof LifeRadiusInput, string>> & {
  sourceLabel?: string;
  reportContext?: string;
};

const levelVariant: Record<LifeRiskLevel, "destructive" | "warning" | "success"> = {
  高: "destructive",
  中: "warning",
  低: "success",
};

const lightingOptions = [
  { value: "good", label: "较好" },
  { value: "normal", label: "一般" },
  { value: "poor", label: "偏弱" },
];

const cookingOptions = [
  { value: "often", label: "经常做饭" },
  { value: "sometimes", label: "偶尔做饭" },
  { value: "rarely", label: "很少做饭" },
];

function numberFrom(form: FormData, key: string) {
  return Number(form.get(key));
}

function boolFrom(form: FormData, key: string) {
  return form.get(key) === "on";
}

function qualityVariant(status: LifeQualitySignal["status"]): "success" | "warning" | "destructive" {
  if (status === "live") return "success";
  if (status === "failed" || status === "skipped_limit") return "destructive";
  return "warning";
}

function seedValue(value: string | undefined, fallback: string) {
  return value?.trim() || fallback;
}

function numericSeed(value: string | undefined, fallback: string) {
  const match = value?.replace(/,/g, "").match(/\d+(\.\d+)?/);
  return match?.[0] || fallback;
}

function booleanSeed(value: string | undefined, fallback: boolean) {
  if (!value) return fallback;
  return /true|1|yes|on|有|可用|便利/i.test(value);
}

function currentHref() {
  if (typeof window === "undefined") return undefined;
  return `${window.location.pathname}${window.location.search}`;
}

function optionalLine(label: string, value: string | number | undefined) {
  if (value === undefined || value === "") return "";
  return `${label}${value}`;
}

function buildLifeFieldPack(result: LifeRadiusResult, input?: LifeRadiusInput | null) {
  const listingTitle = input?.listingTitle?.trim() || "当前候选房源";
  const city = input?.city?.trim() || "待确认城市";
  const categoryLines = result.categories.map(
    (item, index) => `${index + 1}. ${item.label}：${item.evidence}；建议：${item.action}`,
  );
  const fieldChecks = result.fieldChecks.map((item, index) => `${index + 1}. ${item}`);
  const weeklyRoutine = result.weeklyRoutine.map((item, index) => `${index + 1}. ${item}`);
  const blockers = result.blockers.map((item, index) => `${index + 1}. ${item}`);
  const levers = result.negotiationLevers.map((item, index) => `${index + 1}. ${item}`);
  const nextActions = result.nextActions.map((item, index) => `${index + 1}. ${item}`);

  return [
    "住哪儿｜生活配套现场确认清单",
    "",
    `房源：${listingTitle}`,
    `城市：${city}`,
    optionalLine("目标生活配套：", input?.radiusMinutes ? `${input.radiusMinutes} 分钟` : undefined),
    "",
    `结论：${result.verdict}`,
    result.summary,
    `生活评分：${result.score}；核心短板：${result.coreGapCount} 个`,
    "",
    "一、生活配套拆解",
    ...categoryLines,
    "",
    "二、今天现场必须确认",
    ...fieldChecks,
    "",
    "三、一周日常压力测试",
    ...weeklyRoutine,
    "",
    "四、需要再次确认的情况",
    ...blockers,
    "",
    "五、可用于沟通/谈判的理由",
    ...levers,
    "",
    "六、下一步",
    ...nextActions,
    "",
    "使用边界：这份文本只基于当前录入和可用周边信息，签约或付款前仍需在晚上、周末和雨天现场确认营业时间、照明、噪音、气味和实际步行路线。",
  ]
    .filter(Boolean)
    .join("\n");
}

export function LifeRadiusPanel({
  reportId,
  initialInput,
}: {
  reportId?: string;
  initialInput?: LifeRadiusSeed;
}) {
  const [profile, setProfile] = useState(defaultUserPreferences);
  const [settings, setSettings] = useState(defaultAppSettings);
  const [hasProfile, setHasProfile] = useState(false);
  const [result, setResult] = useState<LifeRadiusResult | null>(null);
  const [lastInput, setLastInput] = useState<LifeRadiusInput | null>(null);
  const [copiedPack, setCopiedPack] = useState(false);
  const [state, setState] = useState<SubmitState>("idle");
  const [message, setMessage] = useState(
    "请尽量填到小区、楼栋、写字楼或明确地标。地址越具体，周边买菜、医疗、快递和夜间生活判断越准。",
  );

  useEffect(() => {
    setProfile(readUserPreferences());
    setHasProfile(hasStoredUserPreferences());
    setSettings(readAppSettings());
  }, []);

  const activeReportId = reportId?.trim() || "";

  const shortfallText = useMemo(() => {
    if (!result) return "0 个";
    if (result.coreGapCount === 0) return "暂无核心短板";
    return `${result.coreGapCount} 个核心短板`;
  }, [result]);

  const preferenceText = livingPreferenceText(profile);
  const cooksOften = profile.livingPreferences.some((item) => item.includes("做饭"));
  const fearsNoise = profile.livingPreferences.some((item) => item.includes("吵"));
  const formDefaults = useMemo(
    () => ({
      city: seedValue(initialInput?.city, profile.defaultCity),
      listingTitle: seedValue(initialInput?.listingTitle, "当前候选房源"),
      radiusMinutes: numericSeed(initialInput?.radiusMinutes, "15"),
      groceryMinutes: numericSeed(initialInput?.groceryMinutes, "18"),
      restaurantCount: numericSeed(initialInput?.restaurantCount, "3"),
      pharmacyMinutes: numericSeed(initialInput?.pharmacyMinutes, "16"),
      hospitalMinutes: numericSeed(initialInput?.hospitalMinutes, "42"),
      parcelMinutes: numericSeed(initialInput?.parcelMinutes, "10"),
      laundryMinutes: numericSeed(initialInput?.laundryMinutes, "18"),
      gymMinutes: numericSeed(initialInput?.gymMinutes, "25"),
      parkMinutes: numericSeed(initialInput?.parkMinutes, "30"),
      lateFoodAvailable: booleanSeed(
        initialInput?.lateFoodAvailable,
        profile.livingPreferences.includes("独居"),
      ),
      nightLighting: seedValue(
        initialInput?.nightLighting,
        fearsNoise ? "normal" : "poor",
      ),
      cookingFrequency: seedValue(
        initialInput?.cookingFrequency,
        cooksOften ? "often" : "sometimes",
      ),
      noiseSources: seedValue(initialInput?.noiseSources, "主干道、楼下烧烤、垃圾站"),
      lifestyle: seedValue(
        initialInput?.lifestyle,
        `居住偏好：${preferenceText}。工作日下班后需要日常补给顺手，周末要有可恢复的生活配套。`,
      ),
      notes: seedValue(
        initialInput?.notes,
        "白天看房觉得安静，但担心晚上吃饭、买菜和噪音。",
      ),
    }),
    [cooksOften, fearsNoise, initialInput, preferenceText, profile],
  );
  const profileKey = hasProfile
    ? `${formDefaults.city}-${formDefaults.listingTitle}-${profile.budgetMax}-${profile.livingPreferences.join("-")}`
    : `demo-${formDefaults.city}-${formDefaults.listingTitle}`;
  const sourceLabel = initialInput?.sourceLabel || (activeReportId ? "来自房源记录" : "");
  const submittedCity = lastInput?.city?.trim() || formDefaults.city;
  const submittedListingTitle = lastInput?.listingTitle?.trim() || formDefaults.listingTitle;

  const decisionContext = useMemo(() => {
    if (!result) return "";
    return compactContext([
      initialInput?.reportContext,
      "生活配套确认：",
      result.summary,
      `生活评分 ${result.score}`,
      `核心短板 ${result.coreGapCount} 个`,
      result.blockers,
      result.nextActions,
    ]);
  }, [initialInput?.reportContext, result]);

  const visitHref = result
    ? buildFlowHref("/visit", {
        from: "life",
        reportId: activeReportId,
        city: submittedCity,
        listingTitle: submittedListingTitle,
        reportContext: decisionContext,
      })
    : "/visit";

  const areaHref = result
    ? buildFlowHref("/area", {
        from: "life",
        reportId: activeReportId,
        city: submittedCity,
        reportContext: decisionContext,
      })
    : "/area";

  const analyzeHref = result
    ? buildFlowHref("/analyze", {
        from: "life",
        reportId: activeReportId,
        city: submittedCity,
        reportContext: decisionContext,
      })
    : "/analyze";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState("loading");
    setMessage("正在把买菜、医疗、快递、夜间动线和噪音转成长期居住判断...");

    const form = new FormData(event.currentTarget);
    const payload: LifeRadiusInput = {
      city: String(form.get("city") || ""),
      listingTitle: String(form.get("listingTitle") || ""),
      radiusMinutes: numberFrom(form, "radiusMinutes"),
      groceryMinutes: numberFrom(form, "groceryMinutes"),
      restaurantCount: numberFrom(form, "restaurantCount"),
      pharmacyMinutes: numberFrom(form, "pharmacyMinutes"),
      hospitalMinutes: numberFrom(form, "hospitalMinutes"),
      parcelMinutes: numberFrom(form, "parcelMinutes"),
      laundryMinutes: numberFrom(form, "laundryMinutes"),
      gymMinutes: numberFrom(form, "gymMinutes"),
      parkMinutes: numberFrom(form, "parkMinutes"),
      lateFoodAvailable: boolFrom(form, "lateFoodAvailable"),
      nightLighting: String(form.get("nightLighting") || "normal") as LifeRadiusInput["nightLighting"],
      cookingFrequency: String(
        form.get("cookingFrequency") || "often",
      ) as LifeRadiusInput["cookingFrequency"],
      noiseSources: String(form.get("noiseSources") || ""),
      lifestyle: String(form.get("lifestyle") || ""),
      notes: String(form.get("notes") || ""),
      dataSourceSettings: {
        amapDataEnabled: settings.amapDataEnabled,
      },
    };
    setLastInput(payload);

    try {
      const response = await fetch("/api/life/radius", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error("生活配套确认失败，请确认信息后重试。");
      }

      const data = (await response.json()) as LifeRadiusResult;
      setResult(data);
      setCopiedPack(false);
      setState("idle");
      setMessage(
        data.poiEvidence?.source === "amap"
          ? "已结合周边生活信息判断。先看日常是否顺手，再决定是否继续看房。"
          : data.poiEvidence?.detail ?? "生活配套已确认。先看日常是否顺手，再决定是否继续看房。",
      );

      if (activeReportId) {
        void recordCaseEvent({
          reportId: activeReportId,
          type: "life",
          title: "生活配套确认",
          status: data.status,
          summary: data.summary,
          highlights: [
            data.verdict,
            `评分 ${data.score}`,
            `核心短板 ${data.coreGapCount} 个`,
            ...data.blockers,
            ...data.fieldChecks,
            ...data.nextActions,
          ].slice(0, 6),
          href: currentHref(),
        });
      }
    } catch (error) {
      setState("error");
      setMessage(error instanceof Error ? error.message : "生活配套确认失败，请稍后重试。");
    }
  }

  async function copyLifePack() {
    if (!result) return;
    await navigator.clipboard.writeText(buildLifeFieldPack(result, lastInput));
    setCopiedPack(true);
  }

  return (
    <div className="space-y-6">
      <form
        onSubmit={handleSubmit}
        className="grid grid-cols-1 gap-4 xl:grid-cols-[0.42fr_0.58fr]"
      >
        <Card className="min-w-0 p-6">
          <div className="mb-6">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm text-primary/80">
                生活配套
              </p>
              {sourceLabel ? <Badge variant="secondary">{sourceLabel}</Badge> : null}
            </div>
            <h2 className="mt-2 text-2xl font-semibold">输入生活配套条件</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              很多房子白天看着方便，住进去才发现买菜、取快递、看病、夜路和噪音每天都在消耗你。
            </p>
          </div>

          <ProfileDefaultNote hasProfile={hasProfile} summary={profileDefaultSummary(profile)} />

          <div key={profileKey} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="城市" name="city" defaultValue={formDefaults.city} type="text" />
            <Field
              label="房源位置"
              name="listingTitle"
              defaultValue={formDefaults.listingTitle}
              type="text"
              placeholder="例如：深圳南山腾讯滨海大厦 / 徐汇万体馆某小区"
              description="用于查询周边生活配套；只填片区名时，结果可能只能按已知信息估算。"
            />
            <Field
              label="目标生活配套分钟"
              name="radiusMinutes"
              defaultValue={formDefaults.radiusMinutes}
            />
            <Field
              label="最近买菜分钟"
              name="groceryMinutes"
              defaultValue={formDefaults.groceryMinutes}
            />
            <Field
              label="常用餐饮数量"
              name="restaurantCount"
              defaultValue={formDefaults.restaurantCount}
            />
            <Field
              label="最近药店分钟"
              name="pharmacyMinutes"
              defaultValue={formDefaults.pharmacyMinutes}
            />
            <Field
              label="最近医院分钟"
              name="hospitalMinutes"
              defaultValue={formDefaults.hospitalMinutes}
            />
            <Field
              label="快递点分钟"
              name="parcelMinutes"
              defaultValue={formDefaults.parcelMinutes}
            />
            <Field
              label="洗衣维修分钟"
              name="laundryMinutes"
              defaultValue={formDefaults.laundryMinutes}
            />
            <Field label="健身分钟" name="gymMinutes" defaultValue={formDefaults.gymMinutes} />
            <Field label="公园散步分钟" name="parkMinutes" defaultValue={formDefaults.parkMinutes} />
            <div className="space-y-2">
              <Label htmlFor="nightLighting">夜间照明</Label>
              <select
                id="nightLighting"
                name="nightLighting"
                defaultValue={formDefaults.nightLighting}
                className="h-11 w-full rounded-md border border-input bg-secondary px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              >
                {lightingOptions.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="cookingFrequency">做饭频率</Label>
              <select
                id="cookingFrequency"
                name="cookingFrequency"
                defaultValue={formDefaults.cookingFrequency}
                className="h-11 w-full rounded-md border border-input bg-secondary px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              >
                {cookingOptions.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>
            <ToggleRow
              name="lateFoodAvailable"
              label="22 点后仍有便利店或基础餐食"
              description="晚归、加班、生病时，夜间基础补给会影响生活弹性。"
              defaultChecked={formDefaults.lateFoodAvailable}
            />
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="noiseSources">噪音或气味源</Label>
              <Input
                id="noiseSources"
                name="noiseSources"
                defaultValue={formDefaults.noiseSources}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="lifestyle">生活方式</Label>
              <Textarea
                id="lifestyle"
                name="lifestyle"
                className="min-h-[96px]"
                defaultValue={formDefaults.lifestyle}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="notes">补充说明</Label>
              <Textarea
                id="notes"
                name="notes"
                className="min-h-[96px]"
                defaultValue={formDefaults.notes}
              />
            </div>
          </div>

          <StatusMessage state={state} message={message} />

          <Button type="submit" size="lg" className="mt-5 w-full" disabled={state === "loading"}>
            {state === "loading" ? (
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            ) : (
              <Calculator className="mr-2 h-5 w-5" />
            )}
            {state === "loading" ? "正在确认" : "确认生活配套"}
          </Button>
        </Card>

        <Card className="min-w-0 p-6">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm text-primary/80">
                生活结论
              </p>
              <h2 className="mt-2 text-2xl font-semibold">生活配套结论</h2>
            </div>
            {result ? <RiskBadge status={result.status} tone="generic" /> : null}
          </div>

          {result ? (
            <div className="space-y-5">
              <div>
                <h3 className="text-xl font-semibold">{result.verdict}</h3>
                <p className="mt-2 text-sm leading-7 text-muted-foreground">{result.summary}</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <SummaryTile icon={Clock3} label="目标半径" value={`${result.radiusMinutes} 分钟`} />
                <SummaryTile icon={ShieldAlert} label="核心短板" value={shortfallText} />
                <SummaryTile icon={MapPin} label="生活评分" value={`${result.score} 分`} />
              </div>
              <div className="rounded-md border border-border bg-secondary p-4">
                <div className="mb-3 flex items-center justify-between gap-4">
                  <p className="text-sm font-medium">长期好住评分</p>
                  <p className="text-2xl font-semibold">{result.score}</p>
                </div>
                <Progress value={result.score} />
                <div className="mt-3 grid gap-2 text-sm leading-6 text-muted-foreground">
                  {result.assumptions.map((item) => (
                    <p key={item}>{item}</p>
                  ))}
                </div>
              </div>
              {result.poiEvidence ? (
                <div className="rounded-md border border-border bg-secondary p-4">
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <Badge variant={result.poiEvidence.source === "amap" ? "success" : "warning"}>
                      {result.poiEvidence.source === "amap" ? "周边生活信息" : "按已填写信息判断"}
                    </Badge>
                    <h3 className="font-semibold">周边依据</h3>
                  </div>
                  <p className="text-sm leading-6 text-muted-foreground">
                    {result.poiEvidence.detail}
                  </p>
                  {result.poiEvidence.categories?.length ? (
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      {result.poiEvidence.categories.slice(0, 8).map((item) => (
                        <div
                          key={item.label}
                          className="rounded-md border border-border bg-background/40 p-3"
                        >
                          <p className="text-xs text-muted-foreground">{item.label}</p>
                          <p className="mt-1 text-sm font-medium">
                            {item.count} 个
                            {item.nearestMinutes ? ` · 最近约 ${item.nearestMinutes} 分钟` : ""}
                          </p>
                          {item.nearestName ? (
                            <p className="mt-1 truncate text-xs text-muted-foreground">
                              {item.nearestName}
                            </p>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : null}
              {result.dataQuality?.length ? (
                <div className="grid gap-2">
                  {result.dataQuality.map((item) => (
                    <div
                      key={`${item.feature}-${item.label}`}
                      className="rounded-md border border-border bg-secondary p-3"
                    >
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <Badge variant={qualityVariant(item.status)}>{item.label}</Badge>
                        <p className="text-xs text-muted-foreground">{item.feature}</p>
                      </div>
                      <p className="text-xs leading-5 text-muted-foreground">{item.detail}</p>
                    </div>
                  ))}
                </div>
              ) : null}
              <div className="rounded-md border border-amber-300/20 bg-amber-300/10 p-4">
                <div className="mb-3 flex items-center gap-2 text-amber-700">
                  <ShieldAlert className="h-4 w-4" />
                  <h3 className="font-semibold">生活配套待确认事项</h3>
                </div>
                <div className="grid gap-2 text-sm leading-6 text-amber-900/90">
                  {result.blockers.map((item) => (
                    <p key={item}>{item}</p>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex min-h-[560px] flex-col justify-center rounded-md border border-border bg-secondary p-5">
              <Badge variant="secondary" className="mb-4 w-fit">
                真实生活便利度
              </Badge>
              <h3 className="text-xl font-semibold">确认下班后的真实日常</h3>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">
                看工作日晚上、周末、生病、下雨和独居晚归时是否仍然顺手。
              </p>
            </div>
          )}
        </Card>
      </form>

      {result ? (
        <Card className="min-w-0 p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <div className="mb-3 flex items-center gap-2">
                <MessageSquareText className="h-4 w-4 text-primary" />
                <h3 className="font-semibold">生活配套现场确认清单</h3>
              </div>
              <p className="max-w-3xl text-sm leading-7 text-muted-foreground">
                把买菜、医疗、快递、夜间照明、噪音气味和周末日常便利度整理成一段可直接带去看房或发给同住人的文本。
              </p>
            </div>
            <Button type="button" variant="outline" onClick={copyLifePack}>
              <Copy className="mr-2 h-4 w-4" />
              {copiedPack ? "已复制" : "复制确认清单"}
            </Button>
          </div>
          <pre className="mt-4 max-h-[360px] overflow-auto whitespace-pre-wrap rounded-md border border-border bg-secondary p-4 text-sm leading-7 text-muted-foreground">
            {buildLifeFieldPack(result, lastInput)}
          </pre>
        </Card>
      ) : null}

      {result ? (
        <div className="grid gap-4 xl:grid-cols-[0.64fr_0.36fr]">
          <Card className="min-w-0 p-6">
            <div className="mb-5 flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-semibold">生活配套拆解</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-[760px] text-left text-sm">
                <thead className="text-muted-foreground">
                  <tr className="border-b border-border">
                    <th className="px-4 py-3 font-medium">维度</th>
                    <th className="px-4 py-3 font-medium">评分</th>
                    <th className="px-4 py-3 font-medium">状态</th>
                    <th className="px-4 py-3 font-medium">依据</th>
                    <th className="px-4 py-3 font-medium">建议</th>
                  </tr>
                </thead>
                <tbody>
                  {result.categories.map((item) => (
                    <tr key={item.label} className="border-b border-border last:border-b-0">
                      <td className="px-4 py-4 font-medium">{item.label}</td>
                      <td className="px-4 py-4">{item.score}</td>
                      <td className="px-4 py-4">
                        <RiskBadge status={item.status} tone="generic" />
                      </td>
                      <td className="px-4 py-4 text-muted-foreground">{item.evidence}</td>
                      <td className="px-4 py-4 text-muted-foreground">{item.action}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <div className="space-y-4">
            <InfoPanel title="现场实测清单" icon={PackageCheck}>
              <ul className="grid gap-2 text-sm leading-6 text-muted-foreground">
                {result.fieldChecks.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </InfoPanel>

            <InfoPanel title="一周日常压力测试" icon={CheckCircle2}>
              <ul className="grid gap-2 text-sm leading-6 text-muted-foreground">
                {result.weeklyRoutine.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </InfoPanel>
          </div>
        </div>
      ) : null}

      {result ? (
        <div className="grid gap-4 lg:grid-cols-[0.58fr_0.42fr]">
          <Card className="min-w-0 p-6">
            <div className="mb-5 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-semibold">生活风险拆解</h2>
            </div>
            <div className="grid gap-3">
              {result.riskItems.map((item) => (
                <RiskRow key={item.title} item={item} />
              ))}
            </div>
          </Card>

          <div className="space-y-4">
            <InfoPanel title="谈判杠杆" icon={WalletCards}>
              <ul className="grid gap-2 text-sm leading-6 text-muted-foreground">
                {result.negotiationLevers.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </InfoPanel>

            <InfoPanel title="下一步" icon={Route}>
              <div className="grid gap-3">
                {result.nextActions.map((item) => (
                  <p
                    key={item}
                    className="rounded-md border border-border bg-secondary p-3 text-sm leading-6 text-muted-foreground"
                  >
                    {item}
                  </p>
                ))}
                <div className="grid gap-3 sm:grid-cols-3">
                  <Button asChild variant="secondary">
                    <Link href={visitHref}>整理看房清单</Link>
                  </Button>
                  <Button asChild variant="secondary">
                    <Link href={areaHref}>回到片区</Link>
                  </Button>
                  <Button asChild>
                    <Link href={analyzeHref}>评估房源</Link>
                  </Button>
                </div>
              </div>
            </InfoPanel>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Field({
  label,
  name,
  defaultValue,
  type = "number",
  placeholder,
  description,
}: {
  label: string;
  name: string;
  defaultValue: string;
  type?: "number" | "text";
  placeholder?: string;
  description?: string;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} type={type} defaultValue={defaultValue} placeholder={placeholder} />
      {description ? <p className="text-xs leading-5 text-muted-foreground">{description}</p> : null}
    </div>
  );
}

function ToggleRow({
  name,
  label,
  description,
  defaultChecked,
}: {
  name: string;
  label: string;
  description: string;
  defaultChecked?: boolean;
}) {
  return (
    <label
      htmlFor={name}
      className="flex items-start gap-3 rounded-md border border-border bg-secondary p-4 sm:col-span-2"
    >
      <Checkbox id={name} name={name} defaultChecked={defaultChecked} className="mt-0.5" />
      <span className="min-w-0">
        <span className="block text-sm font-medium">{label}</span>
        <span className="mt-1 block text-xs leading-5 text-muted-foreground">{description}</span>
      </span>
    </label>
  );
}

function StatusMessage({ state, message }: { state: SubmitState; message: string }) {
  const className =
    state === "error"
      ? "border-red-400/30 bg-red-500/10 text-red-100"
      : state === "loading"
        ? "border-primary/30 bg-primary/10 text-primary"
        : "border-border bg-secondary text-muted-foreground";

  return <div className={`mt-5 rounded-md border px-4 py-3 text-sm ${className}`}>{message}</div>;
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
      <Icon className="mb-3 h-4 w-4 text-primary" />
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 break-words text-lg font-semibold">{value}</p>
    </div>
  );
}

function RiskRow({ item }: { item: LifeRiskItem }) {
  return (
    <div className="rounded-md border border-border bg-secondary p-4">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Badge variant={levelVariant[item.level]}>{item.level}风险</Badge>
        <h3 className="font-semibold">{item.title}</h3>
      </div>
      <p className="text-sm leading-6 text-muted-foreground">{item.why}</p>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">建议：{item.action}</p>
    </div>
  );
}

function InfoPanel({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: LucideIcon;
  children: ReactNode;
}) {
  return (
    <Card className="min-w-0 p-5">
      <div className="mb-4 flex items-center gap-2">
        <Icon className="h-4 w-4 text-primary" />
        <h3 className="font-semibold">{title}</h3>
      </div>
      {children}
    </Card>
  );
}

