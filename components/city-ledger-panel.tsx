"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  Calculator,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { CityComparisonCards } from "@/components/city-comparison-cards";
import { CityLedgerResultCard } from "@/components/city-ledger-result";
import { ProfileDefaultNote } from "@/components/profile-default-note";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { recordCaseEvent } from "@/lib/client-case-events";
import {
  estimateMonthlyIncomeFromAnnualPackage,
  type CityLedgerResult,
} from "@/lib/city-ledger";
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
} from "@/lib/user-preferences";

type SubmitState = "idle" | "loading" | "error";

export type CityLedgerSeed = {
  mode?: "city" | "buy";
  reportId?: string;
  currentCity?: string;
  candidateCities?: string;
  monthlyIncome?: string;
  annualPackage?: string;
  industry?: string;
  rentBudget?: string;
  fixedCost?: string;
  savingGoal?: string;
  commuteLimit?: string;
  workplace?: string;
  downPayment?: string;
  mortgagePayment?: string;
  homePrice?: string;
  notes?: string;
  reportContext?: string;
  sourceLabel?: string;
};

type CityLedgerPanelProps = {
  reportId?: string;
  initialInput?: CityLedgerSeed;
};

const cityScenarioTemplates: Array<{
  label: string;
  candidateCities: string;
  rentBudget: string;
  fixedCost: string;
  savingGoal: string;
  commuteLimit: string;
  industry: string;
  notes: string;
}> = [
  {
    label: "多城市offer",
    candidateCities: "深圳18000\n苏州15500\n西安12000",
    rentBudget: "5200",
    fixedCost: "3200",
    savingGoal: "25%",
    commuteLimit: "45分钟",
    industry: "产品/运营",
    notes: "刚拿到几个offer，想比较去哪个城市后的月结余和储蓄率。",
  },
  {
    label: "应届找工作",
    candidateCities: "重庆11000\n长沙10500\n合肥12000",
    rentBudget: "2800",
    fixedCost: "2600",
    savingGoal: "20%",
    commuteLimit: "50分钟",
    industry: "互联网运营",
    notes: "正在找工作，想把城市机会、生活成本和真实到手结余放在一起看。",
  },
  {
    label: "长三角制造岗",
    candidateCities: "苏州16000\n无锡14500\n宁波15000",
    rentBudget: "3800",
    fixedCost: "3000",
    savingGoal: "30%",
    commuteLimit: "50分钟",
    industry: "制造/研发",
    notes: "岗位集中在长三角，想比较税后offer、租金和片区选择空间。",
  },
];

const buyScenarioTemplates: Array<{
  label: string;
  candidateCities: string;
  rentBudget: string;
  fixedCost: string;
  savingGoal: string;
  commuteLimit: string;
  industry: string;
  downPayment: string;
  mortgagePayment: string;
  homePrice: string;
  notes: string;
}> = [
  {
    label: "月供压力",
    candidateCities: "杭州18000",
    rentBudget: "5000",
    fixedCost: "3500",
    savingGoal: "20%",
    commuteLimit: "50分钟",
    industry: "互联网产品",
    downPayment: "800000",
    mortgagePayment: "9000",
    homePrice: "2800000",
    notes: "想判断月供是否明显压缩生活质量，以及是否继续租房或降低总价。",
  },
  {
    label: "两城买房比较",
    candidateCities: "苏州17000\n杭州19000",
    rentBudget: "5000",
    fixedCost: "3300",
    savingGoal: "25%",
    commuteLimit: "50分钟",
    industry: "制造/研发",
    downPayment: "900000",
    mortgagePayment: "8500",
    homePrice: "2600000",
    notes: "想比较两座城市的收入、月供、片区和长期现金流，再决定买房城市。",
  },
];

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

function formatMoney(value: number) {
  return `${Math.round(value)}元`;
}

function buildCityDecisionMemo(result: CityLedgerResult) {
  const rankedLines = result.options.slice(0, 4).map((option, index) => {
    const incomeGap =
      option.incomeGapToGoal > 0 ? `谈薪差额${formatMoney(option.incomeGapToGoal)}` : "收入已达目标";
    const rentGap =
      option.rentGapToGoal > 0 ? `需降租${formatMoney(option.rentGapToGoal)}` : "租金未超储蓄线";
    return `${index + 1}. ${option.city}：综合分${option.score}，税后收入${formatMoney(option.monthlyIncome)}，真实月成本${formatMoney(option.trueMonthlyCost)}，月结余${formatMoney(option.monthlySavings)}，储蓄率${formatPercent(option.savingRate)}；${incomeGap}，${rentGap}。`;
  });
  const best = result.options[0];
  const actionLines = result.nextSteps.map((item, index) => `${index + 1}. ${item}`);
  const assumptionLines = result.assumptions.map((item, index) => `${index + 1}. ${item}`);
  const tradeoffLines =
    best?.tradeoffs.slice(0, 6).map((item, index) => `${index + 1}. ${item}`) ?? [];

  return [
    "住哪儿｜城市与offer对比备忘录",
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
          `跨城offer口径：${best.offerGate.summary}`,
          `谈判条件：${best.offerGate.negotiation}`,
          `安全租金上限：${formatMoney(best.maxSafeRentForGoal)}。`,
        ]
      : ["请输入至少一个候选城市，并填写税后月收入或税前年包。"]),
    "",
    "三、主要影响因素",
    ...(tradeoffLines.length ? tradeoffLines : ["1. 暂无取舍项，请先完成生活成本判断。"]),
    "",
    "四、后续确认",
    ...actionLines,
    "",
    "五、测算边界",
    ...assumptionLines,
    "",
    "以上基于当前样本和用户输入，不代表官方数据或薪资承诺。决定前，建议继续核对目标城市、片区、具体offer、通勤和首笔预算。",
  ].join("\n");
}

function seedValue(value: string | undefined, fallback: string) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : fallback;
}

function hasIncomeSource(input: {
  candidateCities: string;
  monthlyIncome: string;
  annualPackage: string;
}) {
  return Boolean(
      input.monthlyIncome.trim() ||
      input.annualPackage.trim() ||
      /(\d+(\.\d+)?\s*(万|w|W|k|K|千|元)?|[一二两三四五六七八九十]{1,4}\s*(万|千|元))/.test(input.candidateCities),
  );
}

function inputHasIncomeSource(input?: CityLedgerSeed) {
  if (!input) return false;
  return hasIncomeSource({
    candidateCities: input.candidateCities ?? "",
    monthlyIncome: input.monthlyIncome ?? "",
    annualPackage: input.annualPackage ?? "",
  });
}

type CityOption = CityLedgerResult["options"][number];

export function CityLedgerPanel({ reportId, initialInput }: CityLedgerPanelProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const activeReportId = reportId || initialInput?.reportId || "";
  const isBuyMode = initialInput?.mode === "buy";
  const [profile, setProfile] = useState(defaultUserPreferences);
  const [hasProfile, setHasProfile] = useState(false);
  const [result, setResult] = useState<CityLedgerResult | null>(null);
  const [workplaceInput, setWorkplaceInput] = useState(initialInput?.workplace ?? "");
  const [annualPackageInput, setAnnualPackageInput] = useState(initialInput?.annualPackage ?? "");
  const [buyInput, setBuyInput] = useState({
    downPayment: initialInput?.downPayment ?? "",
    mortgagePayment: initialInput?.mortgagePayment ?? "",
    homePrice: initialInput?.homePrice ?? "",
  });
  const [copiedMemo, setCopiedMemo] = useState(false);
  const [state, setState] = useState<SubmitState>("idle");
  const [message, setMessage] = useState(
    isBuyMode
      ? "把收入、首付、月供、通勤和日常开销放在一起看，判断长期压力是否可承受。"
      : "把多城市offer、税后收入、租金、日常开销和储蓄率放在同一张账里。输入越接近真实生活，结果越有用。",
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
      defaultWorkplace: seedValue(initialInput?.workplace, storedProfile.defaultWorkplace),
    });
    setWorkplaceInput(initialInput?.workplace ?? storedProfile.defaultWorkplace);
    setAnnualPackageInput(initialInput?.annualPackage ?? "");
    setBuyInput({
      downPayment: initialInput?.downPayment ?? "",
      mortgagePayment: initialInput?.mortgagePayment ?? "",
      homePrice: initialInput?.homePrice ?? "",
    });
    setHasProfile(hasStoredUserPreferences());
  }, [initialInput]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = new FormData(event.currentTarget);
    const nextBuyInput = {
      downPayment: String(form.get("downPayment") || ""),
      mortgagePayment: String(form.get("mortgagePayment") || ""),
      homePrice: String(form.get("homePrice") || ""),
    };
    const nextWorkplace = String(form.get("workplace") || "");
    setBuyInput(nextBuyInput);
    setWorkplaceInput(nextWorkplace);
    const payload = {
      currentCity: String(form.get("currentCity") || ""),
      candidateCities: String(form.get("candidateCities") || ""),
      monthlyIncome: String(form.get("monthlyIncome") || profile.monthlyIncome),
      annualPackage: String(form.get("annualPackage") || ""),
      industry: String(form.get("industry") || ""),
      rentBudget: String(form.get("rentBudget") || ""),
      fixedCost: String(form.get("fixedCost") || ""),
      savingGoal: String(form.get("savingGoal") || ""),
      commuteLimit: String(form.get("commuteLimit") || ""),
      workplace: nextWorkplace,
      notes: String(form.get("notes") || ""),
    };

    if (!payload.candidateCities.trim() && !payload.currentCity.trim()) {
      setState("error");
      setMessage("请至少输入一个候选城市。");
      return;
    }

    if (!hasIncomeSource(payload)) {
      setState("error");
      setMessage("请填写税后月收入，或填写税前年包后再测算。");
      return;
    }

    setState("loading");
    setMessage(isBuyMode ? "正在计算长期现金流、月供压力和城市差异..." : "正在计算月度生活成本、结余和城市差异...");

    try {
      const response = await fetch("/api/city/ledger", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error("生活成本判断失败，请确认信息后重试。");
      }

      const data = (await response.json()) as CityLedgerResult;
      setResult(data);
      setCopiedMemo(false);
      setState("idle");
      setMessage(
        isBuyMode
          ? "买房大致判断已更新。保留压力可控的城市和片区，再继续查具体楼盘与合同。"
          : "城市对比已更新。建议只把前2个城市带入片区筛选，减少无效比较。",
      );
      const best = data.options[0];
      if (best) {
        void recordCaseEvent({
          reportId: activeReportId || "workspace",
          type: "city",
          title: isBuyMode ? "买房大致判断" : "选城市/生活成本",
          status: best.pressure,
          summary: data.summary,
          highlights: [
            best.offerGate.summary,
            `真实月成本${formatMoney(best.trueMonthlyCost)}`,
            `预计月结余${formatMoney(best.monthlySavings)}`,
            `安全租金上限${formatMoney(best.maxSafeRentForGoal)}`,
            nextBuyInput.homePrice ? `目标总价${nextBuyInput.homePrice}` : "",
            nextBuyInput.downPayment ? `首付${nextBuyInput.downPayment}` : "",
            nextBuyInput.mortgagePayment ? `月供上限${nextBuyInput.mortgagePayment}` : "",
            nextWorkplace ? `工作地点${nextWorkplace}` : "",
            ...best.tradeoffs,
          ].filter(Boolean).slice(0, 6),
          href:
            typeof window !== "undefined"
              ? `${window.location.pathname}${window.location.search}`
              : undefined,
        });
      }
    } catch (error) {
      setState("error");
      setMessage(error instanceof Error ? error.message : "生活成本判断失败，请稍后重试。");
    }
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

  function applyScenarioTemplate(
    scenario: (typeof cityScenarioTemplates)[number] | (typeof buyScenarioTemplates)[number],
  ) {
    setFormValue("candidateCities", scenario.candidateCities);
    setFormValue("rentBudget", scenario.rentBudget);
    setFormValue("fixedCost", scenario.fixedCost);
    setFormValue("savingGoal", scenario.savingGoal);
    setFormValue("commuteLimit", scenario.commuteLimit);
    setFormValue("industry", scenario.industry);
    setFormValue("notes", scenario.notes);

    if ("downPayment" in scenario) {
      setFormValue("downPayment", scenario.downPayment);
      setFormValue("mortgagePayment", scenario.mortgagePayment);
      setFormValue("homePrice", scenario.homePrice);
      setBuyInput({
        downPayment: scenario.downPayment,
        mortgagePayment: scenario.mortgagePayment,
        homePrice: scenario.homePrice,
      });
    }

    setMessage(`已填入“${scenario.label}”场景，可以直接查看结果，也可以继续修改数字。`);
  }

  async function copyDecisionMemo() {
    if (!result) return;
    await navigator.clipboard.writeText(buildCityDecisionMemo(result));
    setCopiedMemo(true);
  }

  const best = result?.options[0];
  const decisionContext = best
    ? compactContext([
        "生活成本：",
        result?.summary,
        best.offerGate.summary,
        `推荐城市：${best.city}`,
        `税后月收入：${formatMoney(best.monthlyIncome)}`,
        `行业/岗位：${best.industry}`,
        `估算租金：${formatMoney(best.rentEstimate)}`,
        `真实月成本：${formatMoney(best.trueMonthlyCost)}`,
        `预计月结余：${formatMoney(best.monthlySavings)}`,
        `安全租金上限：${formatMoney(best.maxSafeRentForGoal)}`,
        workplaceInput ? `工作地点：${workplaceInput}` : "",
        isBuyMode && buyInput.homePrice ? `目标总价：${buyInput.homePrice}` : "",
        isBuyMode && buyInput.downPayment ? `首付：${buyInput.downPayment}` : "",
        isBuyMode && buyInput.mortgagePayment ? `月供上限：${buyInput.mortgagePayment}` : "",
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
        workplace: workplaceInput || profile.defaultWorkplace,
        reportContext: decisionContext,
      })
    : "/area";
  const analyzeHref = best
    ? buildFlowHref("/analyze", {
        from: "city",
        reportId: activeReportId,
        city: best.city,
        budget: best.maxSafeRentForGoal || best.rentEstimate,
        workplace: workplaceInput || profile.defaultWorkplace,
        monthlyIncome: best.monthlyIncome,
        fixedCost: best.fixedCost,
        reportContext: decisionContext,
      })
    : "/analyze";
  const paymentHref = best
    ? buildFlowHref("/payment", {
        from: "city",
        reportId: activeReportId,
        city: best.city,
        monthlyIncome: best.monthlyIncome,
        reportContext: decisionContext,
        notes: "买房前确认合同、付款、退款和交易相关法律风险。",
      })
    : "/payment";
  const buyHref = best
    ? buildFlowHref("/city", {
        from: "city",
        mode: "buy",
        reportId: activeReportId,
        city: best.city,
        candidateCities: `${best.city} ${best.monthlyIncome}`,
        monthlyIncome: best.monthlyIncome,
        rentBudget: best.maxSafeRentForGoal || best.rentEstimate,
        fixedCost: best.fixedCost,
        commuteLimit: profile.commuteLimit,
        workplace: workplaceInput || profile.defaultWorkplace,
        reportContext: decisionContext,
      })
    : "/city?mode=buy";
  const profileCityLine =
    profile.defaultCity.trim() && profile.monthlyIncome.trim()
      ? `${profile.defaultCity} ${profile.monthlyIncome}`
      : "";
  const candidateCities = initialInput?.candidateCities?.trim() || profileCityLine;
  const needsIncomeBeforeCalculation =
    Boolean(candidateCities) && !inputHasIncomeSource(initialInput) && !profile.monthlyIncome.trim();
  const preferenceText = livingPreferenceText(profile);
  const profileKey = [
    hasProfile ? "profile" : "empty",
    profile.defaultCity,
    profile.defaultWorkplace,
    profile.monthlyIncome,
    initialInput?.annualPackage ?? "",
    initialInput?.industry ?? "",
    profile.budgetMax,
    profile.fixedCost,
    profile.commuteLimit,
    profile.defaultWorkplace,
    initialInput?.candidateCities ?? "",
    initialInput?.savingGoal ?? "",
    initialInput?.downPayment ?? "",
    initialInput?.mortgagePayment ?? "",
    initialInput?.homePrice ?? "",
    initialInput?.workplace ?? "",
    initialInput?.notes ?? "",
    initialInput?.reportContext ?? "",
  ].join("|");
  const rawSourceNote = compactContext([
    initialInput?.sourceLabel,
    initialInput?.reportContext,
  ]);
  const sourceNote =
    rawSourceNote.length > 280 ? `${rawSourceNote.slice(0, 277)}...` : rawSourceNote;
  const estimatedMonthlyNet = estimateMonthlyIncomeFromAnnualPackage(annualPackageInput);

  function fillEstimatedMonthlyIncome() {
    if (!estimatedMonthlyNet) return;
    setFormValue("monthlyIncome", String(estimatedMonthlyNet));
    setMessage(`已填入估算税后月收入${formatMoney(estimatedMonthlyNet)}。正式决策前请替换为offer里的真实到手收入。`);
  }

  function buildOptionContext(option: CityOption) {
    return compactContext([
      "生活成本：",
      result?.summary,
      option.offerGate.summary,
      `候选城市：${option.city}`,
      `税后月收入：${formatMoney(option.monthlyIncome)}`,
      `估算租金：${formatMoney(option.rentEstimate)}`,
      `真实月成本：${formatMoney(option.trueMonthlyCost)}`,
      `预计月结余：${formatMoney(option.monthlySavings)}`,
      `安全租金上限：${formatMoney(option.maxSafeRentForGoal)}`,
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

  function optionPaymentHref(option: CityOption) {
    return buildFlowHref("/payment", {
      from: "city",
      reportId: activeReportId,
      city: option.city,
      monthlyIncome: option.monthlyIncome,
      notes: "买房前确认合同、付款、退款和交易相关法律风险。",
      reportContext: buildOptionContext(option),
    });
  }

  return (
    <div className="space-y-6">
      <form
        ref={formRef}
        id="city-ledger-form"
        onSubmit={handleSubmit}
        className="grid max-w-3xl gap-4"
      >
        <Card className="p-6">
          <div className="mb-6">
            <p className="text-sm font-medium text-primary/80">
              {isBuyMode ? "买房大致判断" : "选城市/生活成本"}
            </p>
            <h2 className="mt-2 text-2xl font-semibold">
              {isBuyMode ? "输入城市、收入和购房预算" : "找工作选城市，对比多城市offer"}
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {isBuyMode
                ? "判断首付、月供、租金和通勤是否会长期压缩生活质量。"
                : "把不同城市的offer、租金、生活成本和通勤放在一起，看真实月结余和储蓄率。"}
            </p>
          </div>

          <ProfileDefaultNote hasProfile={hasProfile} summary={profileDefaultSummary(profile)} />

          {sourceNote ? (
            <div className="mt-4 rounded-md border border-primary/25 bg-primary/10 p-3 text-sm leading-6 text-primary/90">
              <p className="font-medium">已带入上一页记录</p>
              <p className="mt-1 text-primary/75">{sourceNote}</p>
            </div>
          ) : null}

          {needsIncomeBeforeCalculation ? (
            <div className="mt-4 rounded-md border border-amber-300/35 bg-amber-50 px-3 py-2 text-sm leading-6 text-amber-800">
              候选城市已填好。继续测算前，请补充税后月收入；如果只有税前年包，也可以填写税前年包。
            </div>
          ) : null}

          <div key={profileKey} className="grid gap-4 sm:grid-cols-2">
            <input type="hidden" name="currentCity" defaultValue={profile.defaultCity} />
            <div className="space-y-2 sm:col-span-2">
              <Label>快速填入</Label>
              <div className="scrollbar-none flex max-w-full gap-2 overflow-x-auto pb-1">
                {(isBuyMode ? buyScenarioTemplates : cityScenarioTemplates).map((scenario) => (
                  <button
                    key={scenario.label}
                    type="button"
                    onClick={() => applyScenarioTemplate(scenario)}
                    disabled={state === "loading"}
                    className="inline-flex min-h-9 shrink-0 items-center rounded-full border border-border bg-secondary/70 px-3 text-xs font-medium text-muted-foreground transition hover:border-primary/35 hover:bg-primary/10 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {scenario.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="candidateCities">候选城市</Label>
              <Textarea
                id="candidateCities"
                name="candidateCities"
                className="min-h-[136px]"
                defaultValue={candidateCities}
                placeholder={"例如：苏州15500\n西安12000\n合肥13000"}
              />
              <p className="text-xs leading-5 text-muted-foreground">
                每行一个城市。不同城市到手offer不同时，直接在城市后写税后月收入。
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="monthlyIncome">税后月收入</Label>
              <Input
                id="monthlyIncome"
                name="monthlyIncome"
                defaultValue={profile.monthlyIncome}
                placeholder="例如：18000"
                inputMode="decimal"
              />
              <p className="text-xs leading-5 text-muted-foreground">
                已有offer时填到手月收入；不同城市收入不同，可直接写在候选城市后面。
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="annualPackage">税前年包（选填）</Label>
              <Input
                id="annualPackage"
                name="annualPackage"
                value={annualPackageInput}
                onChange={(event) => setAnnualPackageInput(event.target.value)}
                placeholder="例如：28万、320000"
                inputMode="decimal"
              />
              {estimatedMonthlyNet ? (
                <div className="rounded-md border border-border bg-secondary/60 px-3 py-2 text-xs leading-5 text-muted-foreground">
                  <p>
                    税前年包粗估税后月到手约{formatMoney(estimatedMonthlyNet)}，已扣入五险一金和个税估算。
                  </p>
                  <button
                    type="button"
                    onClick={fillEstimatedMonthlyIncome}
                    className="mt-2 text-xs font-medium text-primary underline-offset-4 hover:underline"
                  >
                    填入税后月收入
                  </button>
                </div>
              ) : (
                <p className="text-xs leading-5 text-muted-foreground">
                  只有税前年包时，可用这里换算税后月收入；具体以offer社保公积金基数为准。
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="industry">行业/岗位</Label>
              <Input
                id="industry"
                name="industry"
                defaultValue={initialInput?.industry ?? ""}
                placeholder="例如：互联网产品、外贸运营、研发"
              />
              <p className="text-xs leading-5 text-muted-foreground">
                暂无该城市该岗位数据时，会明确按通用机会面判断。
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="rentBudget">
                {isBuyMode ? "当前租金或居住预算" : "租金上限"}
              </Label>
              <Input
                id="rentBudget"
                name="rentBudget"
                defaultValue={yuanPerMonth(profile.budgetMax, 6500)}
                placeholder={isBuyMode ? "填写当前月租或计划居住预算" : "填写租金上限"}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="commuteLimit">通勤上限</Label>
              <Input
                id="commuteLimit"
                name="commuteLimit"
                defaultValue={profile.commuteLimit}
                placeholder="例如：45分钟内"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="workplace">工作地点</Label>
              <Input
                id="workplace"
                name="workplace"
                defaultValue={profile.defaultWorkplace}
                placeholder="填写公司、园区或常去办公地点"
              />
            </div>
            {isBuyMode ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="downPayment">首付</Label>
                  <Input
                    id="downPayment"
                    name="downPayment"
                    defaultValue={buyInput.downPayment}
                    placeholder="填写可用首付"
                    inputMode="decimal"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mortgagePayment">月供上限</Label>
                  <Input
                    id="mortgagePayment"
                    name="mortgagePayment"
                    defaultValue={buyInput.mortgagePayment}
                    placeholder="填写可接受月供"
                    inputMode="decimal"
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="homePrice">目标总价</Label>
                  <Input
                    id="homePrice"
                    name="homePrice"
                    defaultValue={buyInput.homePrice}
                    placeholder="填写目标总价或心理上限"
                    inputMode="decimal"
                  />
                </div>
              </>
            ) : null}
          </div>

          <details className="mt-4 rounded-md border border-border bg-secondary/45 p-4">
            <summary className="cursor-pointer text-sm font-medium text-foreground">
              补充条件（选填）
            </summary>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="fixedCost">其他固定支出</Label>
                <Input
                  id="fixedCost"
                  name="fixedCost"
                  defaultValue={yuanPerMonth(profile.fixedCost, 3000)}
                  placeholder="例如：吃饭、交通、还款等"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="savingGoal">目标储蓄率</Label>
                <Input
                  id="savingGoal"
                  name="savingGoal"
                  placeholder="例如：20%"
                  defaultValue={initialInput?.savingGoal?.trim() || ""}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="notes">其他要求</Label>
                <Textarea
                  id="notes"
                  name="notes"
                  className="min-h-[96px]"
                  placeholder="填写储蓄目标、居住偏好、工作变动和通勤限制"
                  defaultValue={compactContext([
                    initialInput?.notes,
                    initialInput?.reportContext,
                    preferenceText ? `当前偏好：${preferenceText}。` : "",
                  ])}
                />
              </div>
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
              <Calculator className="mr-2 h-5 w-5" />
            )}
            {state === "loading"
              ? isBuyMode
                ? "正在计算买房压力"
                : "正在比较多城市offer"
              : isBuyMode
                ? "查看买房大致判断"
                : "查看多城市对比"}
          </Button>
        </Card>

      </form>

      {result && best ? (
        <CityLedgerResultCard
          result={result}
          option={best}
          isBuyMode={isBuyMode}
          buyInput={buyInput}
          areaHref={areaHref}
          secondaryHref={isBuyMode ? paymentHref : analyzeHref}
          secondaryLabel={isBuyMode ? "付款咨询" : "房源体检"}
          buyHref={isBuyMode ? undefined : buyHref}
          copiedMemo={copiedMemo}
          onCopyDecisionMemo={copyDecisionMemo}
        />
      ) : null}

      {result ? (
        <section className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold">多城市offer：税后→真实月结余/储蓄率</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {isBuyMode
                ? "看长期现金流是否承受得住，再决定哪些城市和片区值得继续查。"
                : "按每个城市自己的offer算税后月收入，横向比较真实月成本、月结余和储蓄率。"}
            </p>
          </div>

          <CityComparisonCards
            options={result.options}
            formatMoney={formatMoney}
            formatPercent={formatPercent}
            optionAreaHref={optionAreaHref}
            optionSecondaryHref={isBuyMode ? optionPaymentHref : optionAnalyzeHref}
            secondaryLabel={isBuyMode ? "付款咨询" : "房源体检"}
          />

        </section>
      ) : null}
    </div>
  );
}


