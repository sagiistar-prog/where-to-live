"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  ArrowRight,
  BadgeDollarSign,
  Calculator,
  CheckCircle2,
  Copy,
  Loader2,
  MapPin,
  MessageSquareText,
  PiggyBank,
  Route,
  ShieldCheck,
  WalletCards,
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
import type { CityLedgerResult } from "@/lib/city-ledger";
import { buildFlowHref, compactContext } from "@/lib/flow-links";
import {
  livingPreferenceText,
  profileDefaultSummary,
  yuanPerMonth,
} from "@/lib/preference-derived-defaults";
import {
  defaultUserPreferences,
  hasStoredUserPreferences,
  readUserPreferences,
  type UserPreferences,
} from "@/lib/user-preferences";

type SubmitState = "idle" | "loading" | "error";

export type CityLedgerSeed = {
  reportId?: string;
  currentCity?: string;
  candidateCities?: string;
  monthlyIncome?: string;
  rentBudget?: string;
  fixedCost?: string;
  savingGoal?: string;
  commuteLimit?: string;
  notes?: string;
  reportContext?: string;
  sourceLabel?: string;
};

type CityLedgerPanelProps = {
  reportId?: string;
  initialInput?: CityLedgerSeed;
};

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

function formatMoney(value: number) {
  return `${Math.round(value).toLocaleString("zh-CN")} 元`;
}

function buildCityDecisionMemo(result: CityLedgerResult) {
  const rankedLines = result.options.slice(0, 4).map((option, index) => {
    const incomeGap =
      option.incomeGapToGoal > 0 ? `谈薪差额 ${formatMoney(option.incomeGapToGoal)}` : "收入已达目标";
    const rentGap =
      option.rentGapToGoal > 0 ? `需降租 ${formatMoney(option.rentGapToGoal)}` : "租金未超储蓄线";
    return `${index + 1}. ${option.city}：综合分 ${option.score}，税后收入 ${formatMoney(option.monthlyIncome)}，真实月成本 ${formatMoney(option.trueMonthlyCost)}，月结余 ${formatMoney(option.monthlySavings)}，储蓄率 ${formatPercent(option.savingRate)}；${incomeGap}，${rentGap}。`;
  });
  const best = result.options[0];
  const actionLines = result.nextSteps.map((item, index) => `${index + 1}. ${item}`);
  const assumptionLines = result.assumptions.map((item, index) => `${index + 1}. ${item}`);
  const tradeoffLines =
    best?.tradeoffs.slice(0, 6).map((item, index) => `${index + 1}. ${item}`) ?? [];

  return [
    "住哪儿｜城市选择备忘录",
    "",
    result.summary,
    "",
    "一、候选城市排序",
    ...rankedLines,
    "",
    best ? `二、当前第一选择：${best.city}` : "二、当前第一选择：暂无",
    ...(best
      ? [
          `结论：${best.verdict}`,
          `薪资底线：${best.offerGate.summary}`,
          `谈判口径：${best.offerGate.negotiation}`,
          `安全租金上限：${formatMoney(best.maxSafeRentForGoal)}。`,
        ]
      : ["请先输入至少一个候选城市和税后月收入。"]),
    "",
    "三、关键取舍",
    ...(tradeoffLines.length ? tradeoffLines : ["1. 暂无取舍项，请先做城市成本测算。"]),
    "",
    "四、下一步",
    ...actionLines,
    "",
    "五、测算边界",
    ...assumptionLines,
    "",
    "以上为基础估算，不代表官方实时数据或薪资承诺。真正决定前，还需要把目标城市、片区、具体房源、通勤和首笔预算放在同一张判断里继续确认。",
  ].join("\n");
}

function seedValue(value: string | undefined, fallback: string) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : fallback;
}

function parseMoneyLike(value: string | undefined, fallback = 0) {
  const match = value?.replace(/,/g, "").match(/\d+(\.\d+)?/);
  return match ? Number(match[0]) : fallback;
}

type CityOption = CityLedgerResult["options"][number];

export function CityLedgerPanel({ reportId, initialInput }: CityLedgerPanelProps) {
  const activeReportId = reportId || initialInput?.reportId || "";
  const [profile, setProfile] = useState(defaultUserPreferences);
  const [hasProfile, setHasProfile] = useState(false);
  const [result, setResult] = useState<CityLedgerResult | null>(null);
  const [copiedMemo, setCopiedMemo] = useState(false);
  const [state, setState] = useState<SubmitState>("idle");
  const [message, setMessage] = useState(
    "先把税后收入、租金、日常开销和储蓄率放在同一张账里。输入越接近真实生活，结论越有用。",
  );

  useEffect(() => {
    const storedProfile = readUserPreferences();
    setProfile({
      ...storedProfile,
      defaultCity: seedValue(initialInput?.currentCity, storedProfile.defaultCity),
      monthlyIncome: seedValue(initialInput?.monthlyIncome, storedProfile.monthlyIncome),
      budgetMax: seedValue(initialInput?.rentBudget, storedProfile.budgetMax),
      fixedCost: seedValue(initialInput?.fixedCost, storedProfile.fixedCost),
      commuteLimit: seedValue(initialInput?.commuteLimit, storedProfile.commuteLimit),
    });
    setHasProfile(hasStoredUserPreferences());
  }, [initialInput]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState("loading");
    setMessage("正在计算真实月成本、储蓄率和城市取舍...");

    const form = new FormData(event.currentTarget);
    const payload = {
      currentCity: String(form.get("currentCity") || ""),
      candidateCities: String(form.get("candidateCities") || ""),
      rentBudget: String(form.get("rentBudget") || ""),
      fixedCost: String(form.get("fixedCost") || ""),
      savingGoal: String(form.get("savingGoal") || ""),
      commuteLimit: String(form.get("commuteLimit") || ""),
      notes: String(form.get("notes") || ""),
    };

    try {
      const response = await fetch("/api/city/ledger", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error("城市账本计算失败，请确认信息后重试。");
      }

      const data = (await response.json()) as CityLedgerResult;
      setResult(data);
      setCopiedMemo(false);
      setState("idle");
      setMessage("城市账本已更新。建议只把前 2 个城市带入片区筛选，避免选择过载。");
      const best = data.options[0];
      if (best) {
        void recordCaseEvent({
          reportId: activeReportId || "workspace",
          type: "city",
          title: "城市真实账本",
          status: best.pressure,
          summary: data.summary,
          highlights: [
            best.offerGate.summary,
            `真实月成本 ${formatMoney(best.trueMonthlyCost)}`,
            `预计月结余 ${formatMoney(best.monthlySavings)}`,
            `安全租金上限 ${formatMoney(best.maxSafeRentForGoal)}`,
            ...best.tradeoffs,
          ].slice(0, 6),
          href:
            typeof window !== "undefined"
              ? `${window.location.pathname}${window.location.search}`
              : undefined,
        });
      }
    } catch (error) {
      setState("error");
      setMessage(error instanceof Error ? error.message : "城市账本计算失败，请稍后重试。");
    }
  }

  async function copyDecisionMemo() {
    if (!result) return;
    await navigator.clipboard.writeText(buildCityDecisionMemo(result));
    setCopiedMemo(true);
  }

  const best = result?.options[0];
  const decisionContext = best
    ? compactContext([
        "城市真实账本：",
        result?.summary,
        best.offerGate.summary,
        `推荐城市：${best.city}`,
        `税后月收入：${best.monthlyIncome} 元`,
        `估算租金：${best.rentEstimate} 元`,
        `真实月成本：${best.trueMonthlyCost} 元`,
        `预计月结余：${best.monthlySavings} 元`,
        `安全租金上限：${best.maxSafeRentForGoal} 元`,
        best.tradeoffs,
      ])
    : "";
  const areaHref = best
    ? buildFlowHref("/area", {
        from: "city",
        reportId: activeReportId,
        city: best.city,
        budget: best.maxSafeRentForGoal || best.rentEstimate,
        commuteLimit: profile.commuteLimit,
        reportContext: decisionContext,
      })
    : "/area";
  const buyHref = best
    ? buildFlowHref("/buy", {
        from: "city",
        reportId: activeReportId,
        city: best.city,
        householdIncome: best.monthlyIncome,
        currentRent: best.rentEstimate,
        fixedCost: best.livingCostEstimate + best.fixedCost,
        reportContext: decisionContext,
      })
    : "/buy";
  const analyzeHref = best
    ? buildFlowHref("/analyze", {
        from: "city",
        reportId: activeReportId,
        city: best.city,
        budget: best.maxSafeRentForGoal || best.rentEstimate,
        monthlyIncome: best.monthlyIncome,
        fixedCost: best.fixedCost,
        reportContext: decisionContext,
      })
    : "/analyze";
  const candidateCities =
    initialInput?.candidateCities?.trim() ||
    [
      `${profile.defaultCity} ${profile.monthlyIncome}`,
      "杭州 16500",
      "成都 13500",
    ]
      .filter((item, index, list) => list.indexOf(item) === index)
      .join("\n");
  const profileKey = [
    hasProfile ? "profile" : "demo",
    profile.defaultCity,
    profile.defaultWorkplace,
    profile.monthlyIncome,
    profile.budgetMax,
    profile.fixedCost,
    profile.commuteLimit,
    initialInput?.candidateCities ?? "",
    initialInput?.savingGoal ?? "",
    initialInput?.notes ?? "",
    initialInput?.reportContext ?? "",
  ].join("|");
  const rawSourceNote = compactContext([
    initialInput?.sourceLabel,
    initialInput?.reportContext,
  ]);
  const sourceNote =
    rawSourceNote.length > 280 ? `${rawSourceNote.slice(0, 277)}...` : rawSourceNote;
  function buildOptionContext(option: CityOption) {
    return compactContext([
      "城市真实账本：",
      result?.summary,
      option.offerGate.summary,
      `候选城市：${option.city}`,
      `税后月收入：${option.monthlyIncome} 元`,
      `估算租金：${option.rentEstimate} 元`,
      `真实月成本：${option.trueMonthlyCost} 元`,
      `预计月结余：${option.monthlySavings} 元`,
      `安全租金上限：${option.maxSafeRentForGoal} 元`,
      option.tradeoffs.slice(0, 4),
    ]);
  }

  function optionAreaHref(option: CityOption) {
    return buildFlowHref("/area", {
      from: "city",
      reportId: activeReportId,
      city: option.city,
      budget: option.maxSafeRentForGoal || option.rentEstimate,
      commuteLimit: profile.commuteLimit,
      reportContext: buildOptionContext(option),
    });
  }

  function optionAnalyzeHref(option: CityOption) {
    return buildFlowHref("/analyze", {
      from: "city",
      reportId: activeReportId,
      city: option.city,
      budget: option.maxSafeRentForGoal || option.rentEstimate,
      monthlyIncome: option.monthlyIncome,
      fixedCost: option.fixedCost,
      description: buildOptionContext(option),
      reportContext: buildOptionContext(option),
    });
  }

  return (
    <div className="space-y-6">
      <CityDecisionWorkspace
        profile={profile}
        hasProfile={hasProfile}
        best={best}
        areaHref={areaHref}
        analyzeHref={analyzeHref}
        buyHref={buyHref}
      />

      <form
        id="city-ledger-form"
        onSubmit={handleSubmit}
        className="grid gap-4 xl:grid-cols-[0.42fr_0.58fr]"
      >
        <Card className="p-6">
          <div className="mb-6">
            <p className="text-sm font-medium text-primary/80">城市情景</p>
            <h2 className="mt-2 text-2xl font-semibold">输入工作城市情景</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              用税后收入、租金红线、固定支出和储蓄目标判断一个城市是否真的值得去。
            </p>
          </div>

          <ProfileDefaultNote hasProfile={hasProfile} summary={profileDefaultSummary(profile)} />

          {sourceNote ? (
            <div className="mt-4 rounded-md border border-primary/25 bg-primary/10 p-3 text-sm leading-6 text-primary/90">
              <p className="font-medium">已带入上一页记录</p>
              <p className="mt-1 text-primary/75">{sourceNote}</p>
            </div>
          ) : null}

          <div key={profileKey} className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="currentCity">当前城市</Label>
              <Input id="currentCity" name="currentCity" defaultValue={profile.defaultCity} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rentBudget">租金红线</Label>
              <Input
                id="rentBudget"
                name="rentBudget"
                defaultValue={yuanPerMonth(profile.budgetMax, 6500)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fixedCost">其他固定支出</Label>
              <Input
                id="fixedCost"
                name="fixedCost"
                defaultValue={yuanPerMonth(profile.fixedCost, 3000)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="savingGoal">目标储蓄率</Label>
              <Input
                id="savingGoal"
                name="savingGoal"
                defaultValue={seedValue(initialInput?.savingGoal, "30%")}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="commuteLimit">通勤上限</Label>
              <Input id="commuteLimit" name="commuteLimit" defaultValue={profile.commuteLimit} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="candidateCities">候选城市和税后月收入</Label>
              <Textarea
                id="candidateCities"
                name="candidateCities"
                className="min-h-[136px]"
                defaultValue={candidateCities}
              />
              <p className="text-xs leading-5 text-muted-foreground">
                每行一个城市和税后月收入，例如“深圳 18000”。如果只有税前年包，先保守换算成税后月收入。
              </p>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="notes">个人约束</Label>
              <Textarea
                id="notes"
                name="notes"
                className="min-h-[96px]"
                placeholder="例如：希望一年存 8 万、想独居、可能一年内跳槽、不接受 1 小时以上通勤..."
                defaultValue={compactContext([
                  initialInput?.notes,
                  initialInput?.reportContext,
                  `当前偏好：${livingPreferenceText(profile)}。`,
                ])}
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
              <Calculator className="mr-2 h-5 w-5" />
            )}
            {state === "loading" ? "正在整理账本" : "查看城市账本"}
          </Button>
        </Card>

        <Card className="p-6">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-medium text-primary/80">判断结果</p>
              <h2 className="mt-2 text-2xl font-semibold">预算结论</h2>
            </div>
            {best ? <RiskBadge status={best.pressure} tone="generic" /> : null}
          </div>

          {result && best ? (
            <div className="space-y-5">
              <p className="text-sm leading-7 text-muted-foreground">{result.summary}</p>

              <div className="grid gap-3 sm:grid-cols-3">
                <Metric
                  icon={WalletCards}
                  label="真实月成本"
                  value={formatMoney(best.trueMonthlyCost)}
                />
                <Metric
                  icon={PiggyBank}
                  label="预计月结余"
                  value={formatMoney(best.monthlySavings)}
                />
                <Metric icon={Route} label="储蓄率" value={formatPercent(best.savingRate)} />
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <Metric
                  icon={BadgeDollarSign}
                  label="达标税后收入"
                  value={formatMoney(best.requiredIncomeForGoal)}
                />
                <Metric
                  icon={WalletCards}
                  label="安全租金上限"
                  value={formatMoney(best.maxSafeRentForGoal)}
                />
                <Metric
                  icon={AlertTriangle}
                  label="当前差额"
                  value={
                    best.incomeGapToGoal > 0
                      ? formatMoney(best.incomeGapToGoal)
                      : "已达标"
                  }
                />
              </div>

              <OfferGateCard option={best} />

              <div className="rounded-md border border-border bg-secondary p-4">
                <div className="mb-3 flex items-center justify-between gap-4">
                  <p className="text-sm font-medium">综合适配分</p>
                  <p className="text-2xl font-semibold">{best.score}</p>
                </div>
                <Progress value={best.score} />
                <p className="mt-3 text-sm leading-6 text-muted-foreground">{best.verdict}</p>
              </div>

              <div>
                <h3 className="font-semibold">关键取舍</h3>
                <div className="mt-3 grid gap-2">
                  {best.tradeoffs.map((item) => (
                    <p
                      key={item}
                      className="rounded-md border border-border bg-secondary px-3 py-2 text-sm leading-6 text-muted-foreground"
                    >
                      {item}
                    </p>
                  ))}
                </div>
              </div>

              <div className="rounded-md border border-primary/25 bg-primary/10 p-4">
                <p className="text-sm leading-6 text-primary">{best.nextStep}</p>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <Button asChild>
                    <Link href={areaHref}>
                      筛选片区
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                  <Button asChild variant="secondary">
                    <Link href={analyzeHref}>
                      评估候选房源
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                  <Button asChild variant="secondary">
                    <Link href={buyHref}>
                      测买房压力
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </div>

              <div className="rounded-md border border-border bg-secondary p-4">
                <h3 className="font-semibold">这份城市成本接下来怎么用</h3>
                <div className="mt-3 grid gap-3 md:grid-cols-3">
                  <NextUseCard
                    label="先定片区"
                    detail="把安全租金上限、通勤上限和候选城市带进片区筛选。"
                    href={areaHref}
                    cta="筛选片区"
                  />
                  <NextUseCard
                    label="再看具体房"
                    detail="看房源时直接按这座城市的预算线判断，不被标价带偏。"
                    href={analyzeHref}
                    cta="评估房源"
                  />
                  <NextUseCard
                    label="租售犹豫"
                    detail="如果想买房，先看月供和首付后现金是否会压垮生活。"
                    href={buyHref}
                    cta="测买房压力"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="flex min-h-[420px] flex-col justify-center rounded-md border border-border bg-secondary p-5">
              <Badge variant="secondary" className="mb-4 w-fit">
                基础测算
              </Badge>
              <h3 className="text-xl font-semibold">先判断城市，再判断房子</h3>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">
                房源是否适合长期居住，先看城市预算能不能成立。输入候选城市后，会一起计算到手收入、租金、生活成本、通勤和储蓄率。
              </p>
            </div>
          )}
        </Card>
      </form>

      {result ? (
        <section className="space-y-4">
          <Card className="p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="mb-3 flex items-center gap-2">
                  <MessageSquareText className="h-4 w-4 text-primary" />
                  <h2 className="text-xl font-semibold">城市选择备忘录</h2>
                </div>
                <p className="max-w-3xl text-sm leading-7 text-muted-foreground">
                  把候选城市排序、真实月成本、谈薪差额、降租底线和下一步整理成可复制文本，方便发给同住人、家人或自己复盘。
                </p>
              </div>
              <Button type="button" variant="outline" onClick={copyDecisionMemo}>
                <Copy className="mr-2 h-4 w-4" />
                {copiedMemo ? "已复制" : "复制备忘录"}
              </Button>
            </div>
            <pre className="mt-4 max-h-[360px] overflow-auto whitespace-pre-wrap rounded-md border border-border bg-secondary p-4 text-sm leading-7 text-muted-foreground">
              {buildCityDecisionMemo(result)}
            </pre>
          </Card>

          <div>
            <h2 className="text-xl font-semibold">候选城市放在一起比</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              分数只是一部分，更重要的是看每个城市牺牲什么、换来什么。
            </p>
          </div>

          <div className="overflow-hidden rounded-lg border border-border bg-card">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1220px] text-left text-sm">
                <thead className="border-b border-border bg-secondary text-xs text-muted-foreground">
                  <tr>
                    <th className="px-5 py-4">排序</th>
                    <th className="px-5 py-4">城市</th>
                    <th className="px-5 py-4">税后收入</th>
                    <th className="px-5 py-4">估算租金</th>
                    <th className="px-5 py-4">真实月成本</th>
                    <th className="px-5 py-4">月结余</th>
                    <th className="px-5 py-4">储蓄率</th>
                    <th className="px-5 py-4">租金占比</th>
                    <th className="px-5 py-4">薪资底线</th>
                    <th className="px-5 py-4">安全租金</th>
                    <th className="px-5 py-4">结论</th>
                    <th className="px-5 py-4">下一步</th>
                  </tr>
                </thead>
                <tbody>
                  {result.options.map((option, index) => (
                    <tr key={option.city} className="border-b border-border last:border-0">
                      <td className="px-5 py-5 text-muted-foreground">#{index + 1}</td>
                      <td className="px-5 py-5 text-base font-semibold">{option.city}</td>
                      <td className="px-5 py-5 text-muted-foreground">
                        {formatMoney(option.monthlyIncome)}
                      </td>
                      <td className="px-5 py-5 text-muted-foreground">
                        {formatMoney(option.rentEstimate)}
                      </td>
                      <td className="px-5 py-5 text-muted-foreground">
                        {formatMoney(option.trueMonthlyCost)}
                      </td>
                      <td className="px-5 py-5 text-lg font-semibold">
                        {formatMoney(option.monthlySavings)}
                      </td>
                      <td className="px-5 py-5 text-lg font-semibold">
                        {formatPercent(option.savingRate)}
                      </td>
                      <td className="px-5 py-5 text-muted-foreground">
                        {formatPercent(option.rentIncomeRatio)}
                      </td>
                      <td className="px-5 py-5">
                        <div className="grid gap-1">
                          <span className="text-sm font-semibold">
                            {option.incomeGapToGoal > 0
                              ? `差 ${formatMoney(option.incomeGapToGoal)}`
                              : "已达标"}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            达标税后 {formatMoney(option.requiredIncomeForGoal)}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-5">
                        <div className="grid gap-1">
                          <span className="text-sm font-semibold">
                            {formatMoney(option.maxSafeRentForGoal)}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {option.rentGapToGoal > 0
                              ? `需降 ${formatMoney(option.rentGapToGoal)}`
                              : "租金未超线"}
                          </span>
                        </div>
                      </td>
                      <td className="max-w-[300px] px-5 py-5">
                        <div className="mb-2">
                          <RiskBadge status={option.pressure} tone="generic" />
                        </div>
                        <p className="leading-6 text-muted-foreground">{option.verdict}</p>
                      </td>
                      <td className="px-5 py-5">
                        <div className="grid gap-2">
                          <Button asChild variant="secondary" size="sm">
                            <Link href={optionAreaHref(option)}>
                              筛片区
                              <ArrowRight className="ml-2 h-4 w-4" />
                            </Link>
                          </Button>
                          <Button asChild variant="ghost" size="sm">
                            <Link href={optionAnalyzeHref(option)}>
                              评估房源
                            </Link>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid gap-3 lg:grid-cols-2">
            <div className="rounded-md border border-border bg-secondary p-4">
              <h3 className="font-semibold">测算假设</h3>
              <div className="mt-3 grid gap-2 text-sm leading-6 text-muted-foreground">
                {result.assumptions.map((item) => (
                  <p key={item}>{item}</p>
                ))}
              </div>
            </div>
            <div className="rounded-md border border-border bg-secondary p-4">
              <h3 className="font-semibold">下一步</h3>
              <div className="mt-3 grid gap-2 text-sm leading-6 text-muted-foreground">
                {result.nextSteps.map((item) => (
                  <p key={item}>{item}</p>
                ))}
              </div>
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}

function CityDecisionWorkspace({
  profile,
  hasProfile,
  best,
  areaHref,
  analyzeHref,
  buyHref,
}: {
  profile: UserPreferences;
  hasProfile: boolean;
  best: CityOption | undefined;
  areaHref: string;
  analyzeHref: string;
  buyHref: string;
}) {
  const income = parseMoneyLike(profile.monthlyIncome);
  const rentBudget = parseMoneyLike(profile.budgetMax);
  const rentRatio = income && rentBudget ? rentBudget / income : 0;
  const baselineCity = profile.defaultCity || "目标城市";
  const headline = best ? `${best.city} 当前更值得优先考虑` : "先确认这座城市值不值得去";
  const summary = best
    ? best.verdict
    : "先同时比较到手收入、租金上限、生活成本和通勤压力，排除明显不适合的城市选择。";

  return (
    <Card className="overflow-hidden border-border/80 bg-card/90 shadow-[0_22px_80px_oklch(var(--foreground)/0.08)]">
      <div className="grid gap-0 lg:grid-cols-[0.36fr_0.64fr]">
        <div className="border-b border-border bg-secondary/70 p-5 lg:border-b-0 lg:border-r">
          <Badge variant="secondary" className="mb-5 w-fit">
            城市成本
          </Badge>
          <h2 className="text-2xl font-semibold leading-tight">先看城市，再看房子</h2>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">
            适合的城市，要让收入、房租、通勤和储蓄都站得住。
          </p>

          <div className="mt-6 grid gap-2">
            <WorkspaceFact
              icon={WalletCards}
              label="税后月收入"
              value={income ? formatMoney(income) : "待填写"}
              detail={hasProfile ? "来自你的个人偏好" : "示例数据，可在下方修改"}
            />
            <WorkspaceFact
              icon={ShieldCheck}
              label="租金红线"
              value={rentBudget ? formatMoney(rentBudget) : "待填写"}
              detail={rentRatio ? `约占收入 ${formatPercent(rentRatio)}` : "建议先设一个不透支的上限"}
            />
            <WorkspaceFact
              icon={Route}
              label="通勤上限"
              value={profile.commuteLimit || "待填写"}
              detail="超过上限的片区先不放进比较"
            />
          </div>
        </div>

        <div className="p-5">
          <div className="rounded-md border border-border bg-background/80 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="text-sm font-medium text-primary/80">
                  {best ? "当前结论" : `${baselineCity} 基准`}
                </p>
                <h3 className="mt-2 text-2xl font-semibold leading-tight">{headline}</h3>
                <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground">
                  {summary}
                </p>
              </div>
              {best ? <RiskBadge status={best.pressure} tone="generic" /> : null}
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-3">
              <Metric
                icon={PiggyBank}
                label="预计月结余"
                value={best ? formatMoney(best.monthlySavings) : "待计算"}
              />
              <Metric
                icon={BadgeDollarSign}
                label={best ? "安全租金上限" : "当前租金红线"}
                value={best ? formatMoney(best.maxSafeRentForGoal) : rentBudget ? formatMoney(rentBudget) : "待填写"}
              />
              <Metric
                icon={MapPin}
                label={best ? "下一步城市" : "候选城市"}
                value={best?.city ?? baselineCity}
              />
            </div>
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_auto] lg:items-end">
            <div className="rounded-md border border-border bg-secondary/70 p-4">
              <p className="text-sm font-semibold">先确认这三件事</p>
              <div className="mt-3 grid gap-2 text-sm leading-6 text-muted-foreground md:grid-cols-3">
                <p>这份工作的税后收入是否足够支撑目标城市。</p>
                <p>租金是否压在收入三成左右，不牺牲安全和通勤。</p>
                <p>如果要换城市，是否还保留应急储蓄和调整空间。</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 lg:justify-end">
              <Button asChild>
                <a href="#city-ledger-form">
                  填写城市账本
                  <ArrowRight className="ml-2 h-4 w-4" />
                </a>
              </Button>
              <Button asChild variant="secondary">
                <Link href={best ? areaHref : "/area"}>筛选片区</Link>
              </Button>
              <Button asChild variant="ghost">
                <Link href={best ? analyzeHref : buyHref}>
                  {best ? "评估房源" : "测买房压力"}
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

function WorkspaceFact({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-md border border-border bg-background/70 p-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Icon className="h-3.5 w-3.5 text-primary" />
        <span>{label}</span>
      </div>
      <p className="mt-2 text-lg font-semibold">{value}</p>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">{detail}</p>
    </div>
  );
}

function Metric({
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

function NextUseCard({
  label,
  detail,
  href,
  cta,
}: {
  label: string;
  detail: string;
  href: string;
  cta: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-md border border-border bg-secondary/60 p-3 transition-colors hover:border-primary/35 hover:bg-primary/10"
    >
      <p className="text-sm font-semibold">{label}</p>
      <p className="mt-2 text-xs leading-5 text-muted-foreground">{detail}</p>
      <span className="mt-3 inline-flex items-center text-xs font-medium text-primary">
        {cta}
        <ArrowRight className="ml-1.5 h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
      </span>
    </Link>
  );
}

function OfferGateCard({
  option,
}: {
  option: CityLedgerResult["options"][number];
}) {
  const tone =
    option.offerGate.level === "ready"
      ? {
          className: "border-emerald-300/25 bg-emerald-300/10 text-emerald-900",
          iconClassName: "text-emerald-700",
          Icon: CheckCircle2,
        }
      : option.offerGate.level === "stop"
        ? {
            className: "border-rose-300/25 bg-rose-300/10 text-rose-900",
            iconClassName: "text-rose-700",
            Icon: AlertTriangle,
          }
        : {
            className: "border-amber-300/25 bg-amber-300/10 text-amber-900",
            iconClassName: "text-amber-700",
            Icon: AlertTriangle,
          };
  const Icon = tone.Icon;

  return (
    <div className={`rounded-md border p-4 ${tone.className}`}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Icon className={`h-4 w-4 ${tone.iconClassName}`} />
            <p className="text-sm font-semibold">{option.offerGate.label}</p>
          </div>
          <p className="mt-2 text-sm leading-6 text-current/80">
            {option.offerGate.summary}
          </p>
        </div>
        <div className="grid shrink-0 grid-cols-2 gap-2 sm:w-[260px]">
          <GateFact
            label="谈薪差额"
            value={option.incomeGapToGoal > 0 ? formatMoney(option.incomeGapToGoal) : "已达标"}
          />
          <GateFact
            label="降租差额"
            value={option.rentGapToGoal > 0 ? formatMoney(option.rentGapToGoal) : "未超线"}
          />
        </div>
      </div>
      <p className="mt-3 rounded-md border border-border bg-secondary/60 px-3 py-2 text-sm leading-6 text-current/85">
        {option.offerGate.negotiation}
      </p>
    </div>
  );
}

function GateFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-secondary/60 p-3">
      <p className="text-xs text-current/60">{label}</p>
      <p className="mt-1 text-sm font-semibold">{value}</p>
    </div>
  );
}

