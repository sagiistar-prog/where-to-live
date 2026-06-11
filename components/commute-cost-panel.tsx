"use client";

import { FormEvent, type ReactNode, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Calculator,
  Clock3,
  Copy,
  Loader2,
  MapPin,
  MessageSquareText,
  Route,
  ShieldAlert,
  TrainFront,
  Umbrella,
  WalletCards,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { ProfileDefaultNote } from "@/components/profile-default-note";
import { RiskBadge } from "@/components/risk-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { defaultAppSettings, readAppSettings } from "@/lib/app-settings";
import type {
  CommuteCostInput,
  CommuteCostResult,
  CommuteRiskItem,
  CommuteRiskLevel,
} from "@/lib/commute-cost";
import { recordCaseEvent } from "@/lib/client-case-events";
import { buildFlowHref, compactContext } from "@/lib/flow-links";
import {
  commuteLimitMinutes,
  numberFromPreference,
  profileDefaultSummary,
} from "@/lib/preference-derived-defaults";
import {
  defaultUserPreferences,
  hasStoredUserPreferences,
  readUserPreferences,
} from "@/lib/user-preferences";

type SubmitState = "idle" | "loading" | "error";
type CommuteQualitySignal = NonNullable<CommuteCostResult["dataQuality"]>[number];

type CommuteCostSeed = Partial<Record<keyof CommuteCostInput, string>> & {
  sourceLabel?: string;
  reportContext?: string;
};

const levelVariant: Record<CommuteRiskLevel, "destructive" | "warning" | "success"> = {
  高: "destructive",
  中: "warning",
  低: "success",
};

function formatMoney(value: number) {
  return `${Math.round(value).toLocaleString()} 元`;
}

function formatHours(value: number) {
  return `${value.toFixed(1)} 小时`;
}

function formatDays(value: number) {
  return `${value.toFixed(1)} 天`;
}

function qualityVariant(
  status: CommuteQualitySignal["status"],
): "success" | "warning" | "destructive" {
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

function currentHref() {
  if (typeof window === "undefined") return undefined;
  return `${window.location.pathname}${window.location.search}`;
}

function optionalLine(label: string, value: string | number | undefined) {
  if (value === undefined || value === "") return "";
  return `${label}${value}`;
}

function buildCommuteFieldPack(result: CommuteCostResult, input?: CommuteCostInput | null) {
  const listingTitle = input?.listingTitle?.trim() || "当前候选房源";
  const city = input?.city?.trim() || "待确认城市";
  const workplace = input?.workplace?.trim() || "待确认工作地";
  const highPriorityChecks = result.fieldChecks.map((item, index) => `${index + 1}. ${item}`);
  const blockers = result.blockers.map((item, index) => `${index + 1}. ${item}`);
  const levers = result.negotiationLevers.map((item, index) => `${index + 1}. ${item}`);
  const nextActions = result.nextActions.map((item, index) => `${index + 1}. ${item}`);

  return [
    "住哪儿｜通勤现场确认清单",
    "",
    `房源：${listingTitle}`,
    `城市：${city}`,
    `工作地：${workplace}`,
    optionalLine("当前月租：", input?.monthlyRent ? formatMoney(input.monthlyRent) : undefined),
    optionalLine("单程通勤：", input?.oneWayMinutes ? `${input.oneWayMinutes} 分钟` : undefined),
    optionalLine(
      "通勤上限：",
      input?.commuteLimitMinutes ? `${input.commuteLimitMinutes} 分钟` : undefined,
    ),
    "",
    `结论：${result.verdict}`,
    result.summary,
    `每月通勤：${formatHours(result.monthlyCommuteHours)}；真实月成本：${formatMoney(result.trueMonthlyCost)}；通勤评分：${result.score}`,
    "",
    "一、今天现场必须确认",
    ...highPriorityChecks,
    "",
    "二、需要再次确认的情况",
    ...blockers,
    "",
    "三、可用于沟通/谈判的理由",
    ...levers,
    "",
    "四、下一步",
    ...nextActions,
    "",
    "使用边界：这份文本只基于当前录入和可用路线信息，签约或付款前仍需用早晚高峰、晚归和雨天场景现场复测。",
  ]
    .filter(Boolean)
    .join("\n");
}

export function CommuteCostPanel({
  reportId,
  initialInput,
}: {
  reportId?: string;
  initialInput?: CommuteCostSeed;
}) {
  const [profile, setProfile] = useState(defaultUserPreferences);
  const [settings, setSettings] = useState(defaultAppSettings);
  const [hasProfile, setHasProfile] = useState(false);
  const [result, setResult] = useState<CommuteCostResult | null>(null);
  const [lastInput, setLastInput] = useState<CommuteCostInput | null>(null);
  const [copiedPack, setCopiedPack] = useState(false);
  const [state, setState] = useState<SubmitState>("idle");
  const [message, setMessage] = useState(
    "请尽量填到小区、写字楼、门牌或明确地标。只填“科技园”“市中心”这类范围时，可能需要先用手动时间判断。",
  );

  useEffect(() => {
    setProfile(readUserPreferences());
    setHasProfile(hasStoredUserPreferences());
    setSettings(readAppSettings());
  }, []);

  const activeReportId = reportId?.trim() || "";

  const rentTradeoffText = useMemo(() => {
    if (!result) return "0 元";
    if (result.rentGapToAlternative <= result.maxExtraRentWorthPaying) {
      return `近通勤替代房多付 ${formatMoney(result.rentGapToAlternative)} 在可接受范围内`;
    }
    return `近通勤替代房租金差超出时间价值 ${formatMoney(result.rentGapToAlternative - result.maxExtraRentWorthPaying)}`;
  }, [result]);

  const commuteLimit = commuteLimitMinutes(profile);
  const monthlyRent = numberFromPreference(profile.budgetMax, 5200);
  const alternativeRent = Math.round(monthlyRent * 1.12);
  const formDefaults = useMemo(
    () => ({
      city: seedValue(initialInput?.city, profile.defaultCity),
      listingTitle: seedValue(initialInput?.listingTitle, "当前候选房源"),
      workplace: seedValue(initialInput?.workplace, profile.defaultWorkplace),
      monthlyIncome: numericSeed(initialInput?.monthlyIncome, profile.monthlyIncome),
      monthlyRent: numericSeed(initialInput?.monthlyRent, String(monthlyRent)),
      oneWayMinutes: numericSeed(initialInput?.oneWayMinutes, "58"),
      walkMinutes: numericSeed(initialInput?.walkMinutes, "14"),
      transferCount: numericSeed(initialInput?.transferCount, "2"),
      transitFareOneWay: numericSeed(initialInput?.transitFareOneWay, "6"),
      workdaysPerMonth: numericSeed(initialInput?.workdaysPerMonth, "22"),
      commuteLimitMinutes: numericSeed(initialInput?.commuteLimitMinutes, String(commuteLimit)),
      lateNightsPerMonth: numericSeed(initialInput?.lateNightsPerMonth, "6"),
      taxiCostPerLateNight: numericSeed(initialInput?.taxiCostPerLateNight, "58"),
      badWeatherDaysPerMonth: numericSeed(initialInput?.badWeatherDaysPerMonth, "5"),
      alternativeOneWayMinutes: numericSeed(
        initialInput?.alternativeOneWayMinutes,
        String(Math.max(20, commuteLimit - 13)),
      ),
      alternativeMonthlyRent: numericSeed(
        initialInput?.alternativeMonthlyRent,
        String(alternativeRent),
      ),
      notes: seedValue(
        initialInput?.notes,
        "这套房租金更低，但单程接近 1 小时，且下班晚时可能需要打车。",
      ),
    }),
    [alternativeRent, commuteLimit, initialInput, monthlyRent, profile],
  );
  const profileKey = hasProfile
    ? `${formDefaults.city}-${formDefaults.workplace}-${formDefaults.monthlyIncome}-${formDefaults.monthlyRent}-${formDefaults.commuteLimitMinutes}`
    : `demo-${formDefaults.city}-${formDefaults.monthlyRent}`;
  const sourceLabel = initialInput?.sourceLabel || (activeReportId ? "来自房源记录" : "");
  const submittedCity = lastInput?.city?.trim() || formDefaults.city;
  const submittedListingTitle = lastInput?.listingTitle?.trim() || formDefaults.listingTitle;
  const submittedWorkplace = lastInput?.workplace?.trim() || formDefaults.workplace;
  const submittedRent = String(lastInput?.monthlyRent || formDefaults.monthlyRent);
  const submittedCommuteLimit = String(
    lastInput?.commuteLimitMinutes || formDefaults.commuteLimitMinutes,
  );

  const decisionContext = useMemo(() => {
    if (!result) return "";
    return compactContext([
      initialInput?.reportContext,
      "通勤真实成本：",
      result.summary,
      `通勤评分 ${result.score}`,
      `每月通勤 ${formatHours(result.monthlyCommuteHours)}`,
      `真实月成本 ${formatMoney(result.trueMonthlyCost)}`,
      result.blockers,
      result.nextActions,
    ]);
  }, [initialInput?.reportContext, result]);

  const areaHref = result
    ? buildFlowHref("/area", {
        from: "commute",
        reportId: activeReportId,
        city: submittedCity,
        workplace: submittedWorkplace,
        budget: submittedRent,
        commuteLimit: submittedCommuteLimit,
        reportContext: decisionContext,
      })
    : "/area";

  const compareHref = result
    ? buildFlowHref("/compare", {
        from: "commute",
        reportId: activeReportId,
        currentTitle: submittedListingTitle,
        reportContext: decisionContext,
      })
    : "/compare";

  const analyzeHref = result
    ? buildFlowHref("/analyze", {
        from: "commute",
        reportId: activeReportId,
        city: submittedCity,
        workplace: submittedWorkplace,
        budget: submittedRent,
        commuteLimit: submittedCommuteLimit,
        reportContext: decisionContext,
      })
    : "/analyze";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState("loading");
    setMessage("正在折算通勤时间、现金和晚归风险...");

    const form = new FormData(event.currentTarget);
    const payload: CommuteCostInput = {
      city: String(form.get("city") || ""),
      listingTitle: String(form.get("listingTitle") || ""),
      workplace: String(form.get("workplace") || ""),
      monthlyIncome: Number(form.get("monthlyIncome")),
      monthlyRent: Number(form.get("monthlyRent")),
      oneWayMinutes: Number(form.get("oneWayMinutes")),
      walkMinutes: Number(form.get("walkMinutes")),
      transferCount: Number(form.get("transferCount")),
      transitFareOneWay: Number(form.get("transitFareOneWay")),
      workdaysPerMonth: Number(form.get("workdaysPerMonth")),
      commuteLimitMinutes: Number(form.get("commuteLimitMinutes")),
      lateNightsPerMonth: Number(form.get("lateNightsPerMonth")),
      taxiCostPerLateNight: Number(form.get("taxiCostPerLateNight")),
      badWeatherDaysPerMonth: Number(form.get("badWeatherDaysPerMonth")),
      alternativeOneWayMinutes: Number(form.get("alternativeOneWayMinutes")),
      alternativeMonthlyRent: Number(form.get("alternativeMonthlyRent")),
      notes: String(form.get("notes") || ""),
      dataSourceSettings: {
        amapDataEnabled: settings.amapDataEnabled,
      },
    };
    setLastInput(payload);

    try {
      const response = await fetch("/api/commute/cost", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error("通勤真实成本测算失败，请确认信息后重试。");
      }

      const data = (await response.json()) as CommuteCostResult;
      setResult(data);
      setCopiedPack(false);
      setState("idle");
      setMessage(
        data.routeEvidence?.source === "amap"
          ? "已使用高德路线增强通勤成本。先看时间账，再决定租金取舍。"
          : data.routeEvidence?.detail ?? "通勤真实成本已测算。先看时间账，再决定租金取舍。",
      );

      void recordCaseEvent({
        reportId: activeReportId || "workspace",
        type: "commute",
        title: "通勤成本",
        status: data.status,
        summary: data.summary,
        highlights: [
          data.verdict,
          `评分 ${data.score}`,
          `每月通勤 ${formatHours(data.monthlyCommuteHours)}`,
          `真实月成本 ${formatMoney(data.trueMonthlyCost)}`,
          ...data.blockers,
          ...data.nextActions,
        ].slice(0, 6),
        href: currentHref(),
      });
    } catch (error) {
      setState("error");
      setMessage(error instanceof Error ? error.message : "通勤真实成本测算失败，请稍后重试。");
    }
  }

  async function copyCommutePack() {
    if (!result) return;
    await navigator.clipboard.writeText(buildCommuteFieldPack(result, lastInput));
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
                通勤条件
              </p>
              {sourceLabel ? <Badge variant="secondary">{sourceLabel}</Badge> : null}
            </div>
            <h2 className="mt-2 text-2xl font-semibold">输入通勤条件</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              房租便宜不一定真的划算。把单程时间、步行、换乘、晚归打车和雨天路线一起算，才知道这套房是否会偷走生活。
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
              description="用于查询通勤路线，越具体越容易拿到真实公交、地铁和步行时间。"
            />
            <Field
              label="工作地点"
              name="workplace"
              defaultValue={formDefaults.workplace}
              type="text"
              placeholder="例如：深圳市民中心 / 上海徐家汇港汇恒隆"
              description="建议填公司楼宇、园区、地铁站或明确地标。"
            />
            <Field label="税后月收入" name="monthlyIncome" defaultValue={formDefaults.monthlyIncome} />
            <Field label="当前月租" name="monthlyRent" defaultValue={formDefaults.monthlyRent} />
            <Field label="单程通勤分钟" name="oneWayMinutes" defaultValue={formDefaults.oneWayMinutes} />
            <Field label="步行到站分钟" name="walkMinutes" defaultValue={formDefaults.walkMinutes} />
            <Field label="换乘次数" name="transferCount" defaultValue={formDefaults.transferCount} />
            <Field
              label="单程交通费"
              name="transitFareOneWay"
              defaultValue={formDefaults.transitFareOneWay}
            />
            <Field
              label="每月工作日"
              name="workdaysPerMonth"
              defaultValue={formDefaults.workdaysPerMonth}
            />
            <Field
              label="通勤上限分钟"
              name="commuteLimitMinutes"
              defaultValue={formDefaults.commuteLimitMinutes}
            />
            <Field
              label="每月晚归次数"
              name="lateNightsPerMonth"
              defaultValue={formDefaults.lateNightsPerMonth}
            />
            <Field
              label="晚归打车单次"
              name="taxiCostPerLateNight"
              defaultValue={formDefaults.taxiCostPerLateNight}
            />
            <Field
              label="每月坏天气天数"
              name="badWeatherDaysPerMonth"
              defaultValue={formDefaults.badWeatherDaysPerMonth}
            />
            <Field
              label="替代房单程分钟"
              name="alternativeOneWayMinutes"
              defaultValue={formDefaults.alternativeOneWayMinutes}
            />
            <Field
              label="替代房月租"
              name="alternativeMonthlyRent"
              defaultValue={formDefaults.alternativeMonthlyRent}
            />
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="notes">补充说明</Label>
              <Textarea
                id="notes"
                name="notes"
                className="min-h-[112px]"
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
            {state === "loading" ? "正在测算" : "测算通勤成本"}
          </Button>
        </Card>

        <Card className="min-w-0 p-6">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm text-primary/80">
                通勤结论
              </p>
              <h2 className="mt-2 text-2xl font-semibold">通勤结论</h2>
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
                <SummaryTile icon={Clock3} label="每月通勤" value={formatHours(result.monthlyCommuteHours)} />
                <SummaryTile icon={Umbrella} label="年度折算" value={formatDays(result.yearlyCommuteDays)} />
                <SummaryTile icon={WalletCards} label="真实月成本" value={formatMoney(result.trueMonthlyCost)} />
              </div>
              <div className="rounded-md border border-border bg-secondary p-4">
                <div className="mb-3 flex items-center justify-between gap-4">
                  <p className="text-sm font-medium">通勤可承受评分</p>
                  <p className="text-2xl font-semibold">{result.score}</p>
                </div>
                <Progress value={result.score} />
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  直接通勤现金 {formatMoney(result.directMonthlyCost)}，时间机会成本约{" "}
                  {formatMoney(result.hiddenTimeValue)}；{rentTradeoffText}。
                </p>
              </div>
              {result.routeEvidence ? (
                <div className="rounded-md border border-border bg-secondary p-4">
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <Badge variant={result.routeEvidence.source === "amap" ? "success" : "warning"}>
                      {result.routeEvidence.source === "amap" ? "高德路线" : "手动参数"}
                    </Badge>
                    <h3 className="font-semibold">路线依据</h3>
                  </div>
                  <p className="text-sm leading-6 text-muted-foreground">
                    {result.routeEvidence.detail}
                  </p>
                  {result.routeEvidence.origin || result.routeEvidence.destination ? (
                    <p className="mt-2 text-xs leading-5 text-muted-foreground">
                      {result.routeEvidence.origin ?? "房源起点未解析"} →{" "}
                      {result.routeEvidence.destination ?? "工作终点未解析"}
                    </p>
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
                  <h3 className="font-semibold">通勤待确认事项</h3>
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
                时间也是租金
              </Badge>
              <h3 className="text-xl font-semibold">别让低房租偷走工作日</h3>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">
                通勤要看晚归、换乘、坏天气和步行距离，便宜房源也可能变成长期成本。
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
                <h3 className="font-semibold">通勤现场确认清单</h3>
              </div>
              <p className="max-w-3xl text-sm leading-7 text-muted-foreground">
                把通勤结论、早晚高峰实测、晚归/雨天路线、付款底线和谈判理由整理成一段可直接带去看房或发给同住人的文本。
              </p>
            </div>
            <Button type="button" variant="outline" onClick={copyCommutePack}>
              <Copy className="mr-2 h-4 w-4" />
              {copiedPack ? "已复制" : "复制确认清单"}
            </Button>
          </div>
          <pre className="mt-4 max-h-[360px] overflow-auto whitespace-pre-wrap rounded-md border border-border bg-secondary p-4 text-sm leading-7 text-muted-foreground">
            {buildCommuteFieldPack(result, lastInput)}
          </pre>
        </Card>
      ) : null}

      {result ? (
        <div className="grid gap-4 xl:grid-cols-[0.64fr_0.36fr]">
          <Card className="min-w-0 p-6">
            <div className="mb-5 flex items-center gap-2">
              <TrainFront className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-semibold">租金与通勤取舍</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-[760px] text-left text-sm">
                <thead className="text-muted-foreground">
                  <tr className="border-b border-border">
                    <th className="px-4 py-3 font-medium">方案</th>
                    <th className="px-4 py-3 font-medium">月租</th>
                    <th className="px-4 py-3 font-medium">单程</th>
                    <th className="px-4 py-3 font-medium">月通勤</th>
                    <th className="px-4 py-3 font-medium">直接成本</th>
                    <th className="px-4 py-3 font-medium">结论</th>
                  </tr>
                </thead>
                <tbody>
                  {result.scenarios.map((item) => (
                    <tr key={item.label} className="border-b border-border last:border-b-0">
                      <td className="px-4 py-4 font-medium">{item.label}</td>
                      <td className="px-4 py-4">{formatMoney(item.monthlyRent)}</td>
                      <td className="px-4 py-4">{item.oneWayMinutes} 分钟</td>
                      <td className="px-4 py-4">{formatHours(item.monthlyTimeHours)}</td>
                      <td className="px-4 py-4">{formatMoney(item.directMonthlyCost)}</td>
                      <td className="px-4 py-4 text-muted-foreground">{item.verdict}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <div className="space-y-4">
            <InfoPanel title="现场实测清单" icon={MapPin}>
              <ul className="grid gap-2 text-sm leading-6 text-muted-foreground">
                {result.fieldChecks.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </InfoPanel>

            <InfoPanel title="谈判杠杆" icon={WalletCards}>
              <ul className="grid gap-2 text-sm leading-6 text-muted-foreground">
                {result.negotiationLevers.map((item) => (
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
              <h2 className="text-xl font-semibold">通勤风险拆解</h2>
            </div>
            <div className="grid gap-3">
              {result.riskItems.map((item) => (
                <RiskRow key={item.title} item={item} />
              ))}
            </div>
          </Card>

          <InfoPanel title="下一步" icon={Route}>
            <div className="grid gap-3">
              {result.nextActions.map((item) => (
                <p key={item} className="rounded-md border border-border bg-secondary p-3 text-sm leading-6 text-muted-foreground">
                  {item}
                </p>
              ))}
              <div className="grid gap-3 sm:grid-cols-3">
                <Button asChild variant="secondary">
                  <Link href={areaHref}>继续筛片区</Link>
                </Button>
                <Button asChild variant="secondary">
                  <Link href={compareHref}>加入对比</Link>
                </Button>
                <Button asChild>
                  <Link href={analyzeHref}>评估房源</Link>
                </Button>
              </div>
            </div>
          </InfoPanel>
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

function RiskRow({ item }: { item: CommuteRiskItem }) {
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

