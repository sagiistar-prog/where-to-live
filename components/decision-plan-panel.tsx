"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  ListChecks,
  Loader2,
} from "lucide-react";
import { DecisionPlanResultCard } from "@/components/decision-plan-result";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { recordCaseEvent } from "@/lib/client-case-events";
import { buildFlowHref, compactContext } from "@/lib/flow-links";
import type { DecisionPlanResult } from "@/lib/decision-plan";
import { livingPreferenceText } from "@/lib/preference-derived-defaults";
import {
  defaultUserPreferences,
  readUserPreferences,
  userPreferencesUpdatedEvent,
  type UserPreferences,
} from "@/lib/user-preferences";

type SubmitState = "idle" | "loading" | "error";
type RecordState = "idle" | "saving" | "saved" | "error";

export type ReportTarget = {
  id: string;
  generatedAt: string;
  inputSummary?: {
    rent?: string;
    address?: string;
    city?: string;
    workplace?: string;
    budget?: string;
    commuteLimit?: string;
    source?: string;
    reportContext?: string;
    preferences?: string[];
  };
  summary: {
    title: string;
    address: string;
    status: "recommend" | "caution" | "reject";
    score: number;
    conclusion: string;
  };
};

type PlanFormDefaults = {
  city: string;
  stage: string;
  listingTitle: string;
  daysToDecision: string;
  monthlyIncome: string;
  rentBudget: string;
  targetRent: string;
  commuteMinutes: string;
  livingMode: string;
  riskFocus: string;
  notes: string;
};

type SubmittedPlanInput = {
  city: string;
  stage: string;
  listingTitle: string;
  daysToDecision: number;
  monthlyIncome: number;
  rentBudget: number;
  targetRent: number;
  commuteMinutes: number;
  livingMode: string;
  hasListing: boolean;
  hasContract: boolean;
  paymentPressure: boolean;
  evidenceReady: boolean;
  riskFocus: string;
  notes: string;
};

const stageOptions = [
  { value: "listing", label: "判断候选房源" },
  { value: "visit", label: "准备现场看房" },
  { value: "payment", label: "被催先付款" },
  { value: "contract", label: "准备签合同" },
  { value: "move", label: "准备入住付款" },
  { value: "handover", label: "拿钥匙交割" },
  { value: "living", label: "入住后出问题" },
  { value: "renewal", label: "租期快到涨租" },
  { value: "deposit", label: "准备退租" },
  { value: "area", label: "筛选居住片区" },
  { value: "city", label: "选择工作城市" },
];

const planScenarioTemplates = [
  {
    label: "被催付定金",
    notes: "中介催今晚交 3000 定金，但合同、收款主体、出租授权和退款条件还没确认。",
    stage: "payment",
    daysToDecision: "1",
    targetRent: "3000",
    hasListing: true,
    hasContract: false,
    paymentPressure: true,
  },
  {
    label: "offer 换城",
    notes: "刚拿到新城市 offer，需要判断收入、租金、通勤和片区后，再决定是否继续看房。",
    stage: "city",
    daysToDecision: "7",
    targetRent: "6500",
    hasListing: false,
    hasContract: false,
    paymentPressure: false,
  },
  {
    label: "看房太多",
    notes: "手里有几套候选房源，通勤、月租和风险点不一样，需要先排出看房顺序。",
    stage: "visit",
    daysToDecision: "3",
    targetRent: "6000",
    hasListing: true,
    hasContract: false,
    paymentPressure: false,
  },
  {
    label: "续租涨价",
    notes: "房东提出续租涨价，需要比较继续住、搬家成本、替代房源和谈判空间。",
    stage: "renewal",
    daysToDecision: "5",
    targetRent: "6200",
    hasListing: true,
    hasContract: true,
    paymentPressure: false,
  },
];

function numberFrom(form: FormData, key: string) {
  return Number(form.get(key));
}

function boolFrom(form: FormData, key: string) {
  return form.get(key) === "on";
}

function firstNumber(value?: string) {
  return value?.match(/\d[\d,]*(\.\d+)?/)?.[0]?.replace(/,/g, "");
}

function inferCityFromAddress(value?: string) {
  return value?.match(/([\u4e00-\u9fa5]{2,}市)/)?.[1]?.replace(/市$/, "") ?? "";
}

function defaultsFromReport(
  report?: ReportTarget,
  profile: UserPreferences = defaultUserPreferences,
  intake?: { prompt?: string; stage?: string },
): PlanFormDefaults {
  const rent = firstNumber(report?.inputSummary?.rent);
  const budget = firstNumber(report?.inputSummary?.budget);
  const commuteLimit = firstNumber(report?.inputSummary?.commuteLimit);
  const profileBudget = firstNumber(profile.budgetMax) || "";
  const profileIncome = firstNumber(profile.monthlyIncome) || "";
  const profileCommuteLimit = firstNumber(profile.commuteLimit) || "";
  const city =
    report?.inputSummary?.city ||
    inferCityFromAddress(report?.inputSummary?.address) ||
    inferCityFromAddress(report?.summary.address) ||
    profile.defaultCity ||
    "";
  const preferences = report?.inputSummary?.preferences?.filter(Boolean).slice(0, 5) ??
    profile.livingPreferences;
  const conclusion = report?.summary.conclusion || "";
  const profilePreferenceText = livingPreferenceText(profile);
  const prompt = intake?.prompt?.trim() ?? "";
  const stage = intake?.stage?.trim() || (report ? "payment" : "listing");

  return {
    city,
    stage,
    listingTitle:
      report?.summary.title || (prompt ? "首页输入的候选情况" : ""),
    daysToDecision: "",
    monthlyIncome: profileIncome,
    rentBudget: budget || (rent ? String(Math.ceil(Number(rent) * 1.12)) : profileBudget),
    targetRent: rent || (profileBudget ? String(Math.round(Number(profileBudget) * 0.92)) : ""),
    commuteMinutes: commuteLimit || profileCommuteLimit,
    livingMode: preferences.some((item) => /合租|室友/.test(item)) ? "shared" : "solo",
    riskFocus:
      report?.summary.status === "reject"
        ? "报告结论不建议租、付款和签约风险需要重新确认"
        : report
          ? "定金不退、授权材料、合同条款、通勤和生活配套"
          : prompt
          ? prompt.slice(0, 96)
          : profilePreferenceText
            ? `按我的偏好重点关注：${profilePreferenceText}、付款材料、合同和通勤成本`
            : "重点关注付款材料、合同、通勤和长期居住成本",
    notes: report
      ? [
          `这套房源：${report.summary.title}。`,
          report.summary.address ? `地址：${report.summary.address}。` : "",
          conclusion ? `报告结论：${conclusion}` : "",
        ]
          .filter(Boolean)
          .join("\n")
      : prompt,
  };
}

function numberFallback(value: number | undefined, fallback: string) {
  return Number.isFinite(value) && value !== undefined ? String(value) : fallback;
}

function buildPlanToolHref(
  rawHref: string,
  result: DecisionPlanResult,
  input: SubmittedPlanInput | null,
  defaults: PlanFormDefaults,
  report?: ReportTarget,
) {
  const [path, query = ""] = rawHref.split("?");
  const existingParams = Object.fromEntries(new URLSearchParams(query));
  const title = input?.listingTitle || defaults.listingTitle || report?.summary.title;
  const city = input?.city || defaults.city || report?.inputSummary?.city;
  const targetRent = numberFallback(input?.targetRent, defaults.targetRent);
  const rentBudget = numberFallback(input?.rentBudget, defaults.rentBudget);
  const monthlyIncome = numberFallback(input?.monthlyIncome, defaults.monthlyIncome);
  const commuteMinutes = numberFallback(input?.commuteMinutes, defaults.commuteMinutes);
  const riskFocus = input?.riskFocus || defaults.riskFocus;
  const notes = input?.notes || defaults.notes;
  const paymentPressure = input?.paymentPressure ?? false;
  const hasContract = input?.hasContract ?? false;
  const evidenceReady = input?.evidenceReady ?? false;
  const reportContext = compactContext([
    report?.summary.conclusion ? `房源报告结论：${report.summary.conclusion}` : undefined,
    result.stopLine ? `付款咨询：${result.stopLine}` : undefined,
    result.doneDefinition ? `做到什么程度：${result.doneDefinition}` : undefined,
    result.blockers.slice(0, 3).map((item) => `待确认事项：${item}`),
    riskFocus ? `关注风险：${riskFocus}` : undefined,
    notes,
  ]);
  const commonParams = {
    ...existingParams,
    from: "plan",
    reportId: report?.id,
    city,
    title,
    listingTitle: title,
    address: report?.summary.address || report?.inputSummary?.address,
    workplace: report?.inputSummary?.workplace,
    monthlyIncome,
    budget: rentBudget,
    rentBudget,
    monthlyRent: targetRent,
    rent: targetRent,
    targetRent,
    commuteLimit: commuteMinutes,
    commuteMinutes,
    preferences: report?.inputSummary?.preferences?.join("、"),
    stage: result.currentStage,
    concerns: riskFocus,
    risks: result.blockers.slice(0, 4).join("\n"),
    notes,
    reportContext,
  };
  const moduleParams: Record<string, string | number | boolean | null | undefined> = {};

  if (path === "/payment") {
    Object.assign(moduleParams, {
      paymentType: paymentPressure ? "被催先付款" : "付款咨询",
      amount: targetRent,
      contractStatus: hasContract ? "已看到合同或补充协议，仍需逐条确认" : "合同或补充协议待补充",
      authorizationStatus: "出租权或转租授权材料待补充",
      receiptStatus: evidenceReady ? "已有部分材料，付款记录仍需确认" : "关键材料待补充",
      refundRule: "押金、定金、服务费和退款条件需写清",
      urgencyPressure: paymentPressure ? "对方正在催付款，暂缓大额付款" : "付款前常规确认",
    });
  }

  if (path === "/move") {
    Object.assign(moduleParams, {
      upfrontCost: Number(targetRent) * 2,
      fixedMonthlyCost: Math.round(Number(monthlyIncome) * 0.32),
    });
  }

  if (path === "/handover") {
    Object.assign(moduleParams, { depositAmount: targetRent });
  }

  if (path === "/deposit") {
    Object.assign(moduleParams, {
      depositAmount: targetRent,
      evidenceLevel: evidenceReady ? "已有部分材料" : "待补充",
      landlordReason: compactContext([riskFocus, result.stopLine]),
    });
  }

  if (path === "/renewal") {
    Object.assign(moduleParams, {
      currentRent: targetRent,
      proposedRent: Math.round(Number(targetRent) * 1.08),
      depositRisk: "续租前需要确认押金沿用、调整和补充协议",
    });
  }

  if (path === "/repair") {
    Object.assign(moduleParams, {
      issueType: riskFocus || "维修责任待确认",
      evidenceLevel: evidenceReady ? "已有部分材料" : "待补充",
      landlordResponse: paymentPressure ? "对方要求租客先负责或先垫付" : "待确认维修时限和费用边界",
      depositConcern: "担心维修责任影响押金或付款判断",
    });
  }

  if (path === "/contract") {
    Object.assign(moduleParams, {
      contractText: compactContext([
        "以下内容来自当前行动，不等同于真实合同。请粘贴真实合同、补充协议或聊天确认后再确认。",
        reportContext,
      ]),
    });
  }

  if (path === "/evidence") {
    Object.assign(moduleParams, {
      paymentType: paymentPressure ? "催付款场景" : "签约前材料",
      amount: targetRent,
      contractStatus: hasContract ? "已看到合同或补充协议" : "合同或补充协议待补充",
      authorizationStatus: "出租权或转租授权材料待补充",
      receiptStatus: evidenceReady ? "已有部分材料" : "待补充",
    });
  }

  return buildFlowHref(path, {
    ...commonParams,
    ...moduleParams,
  });
}

export function DecisionPlanPanel({
  initialReports = [],
  initialReportId = "",
  initialPrompt = "",
  initialStage = "",
  initialSourceLabel = "",
}: {
  initialReports?: ReportTarget[];
  initialReportId?: string;
  initialPrompt?: string;
  initialStage?: string;
  initialSourceLabel?: string;
}) {
  const [result, setResult] = useState<DecisionPlanResult | null>(null);
  const [state, setState] = useState<SubmitState>("idle");
  const [recordState, setRecordState] = useState<RecordState>("idle");
  const [lastPlanInput, setLastPlanInput] = useState<SubmittedPlanInput | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [scenarioToggles, setScenarioToggles] = useState({
    hasListing: Boolean(initialReportId),
    hasContract: false,
    paymentPressure: false,
  });
  const [reports, setReports] = useState<ReportTarget[]>(initialReports);
  const [selectedReportId, setSelectedReportId] = useState(
    initialReports.some((report) => report.id === initialReportId) ? initialReportId : "",
  );
  const [profile, setProfile] = useState(defaultUserPreferences);
  const [message, setMessage] = useState(
    "写下当前问题，会整理今天先处理什么、什么时候暂停、接下来进入哪个工具。",
  );

  const selectedReport = useMemo(
    () => reports.find((report) => report.id === selectedReportId),
    [reports, selectedReportId],
  );
  const planDefaults = useMemo(() => defaultsFromReport(selectedReport, profile, {
    prompt: initialPrompt,
    stage: initialStage,
  }), [
    initialPrompt,
    initialStage,
    profile,
    selectedReport,
  ]);
  const profileSeed = `${profile.defaultCity}-${profile.defaultWorkplace}-${profile.budgetMax}-${profile.commuteLimit}-${profile.livingPreferences.join("-")}`;
  const formSeedKey =
    selectedReport?.id ??
    `profile-plan-intake-${profileSeed}-${initialStage}-${initialPrompt.slice(0, 48)}`;
  const nextModuleLinks = useMemo(() => {
    if (!result) return [];

    return result.nextModules.slice(0, 3).map((item) => ({
      name: item.name,
      reason: item.reason,
      href: buildPlanToolHref(item.href, result, lastPlanInput, planDefaults, selectedReport),
    }));
  }, [lastPlanInput, planDefaults, result, selectedReport]);

  useEffect(() => {
    let mounted = true;

    fetch("/api/reports")
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (!mounted || !Array.isArray(data?.reports)) return;
        const nextReports = data.reports.slice(0, 8) as ReportTarget[];
        const urlReportId =
          initialReportId ||
          (typeof window !== "undefined"
            ? new URLSearchParams(window.location.search).get("reportId")
            : "");
        setReports(nextReports);
        setSelectedReportId((current) => {
          if (current && nextReports.some((report) => report.id === current)) return current;
          if (urlReportId && nextReports.some((report) => report.id === urlReportId)) {
            return urlReportId;
          }
          return "";
        });
      })
      .catch(() => undefined);

    return () => {
      mounted = false;
    };
  }, [initialReportId]);

  useEffect(() => {
    function refreshProfile() {
      setProfile(readUserPreferences());
    }

    refreshProfile();
    window.addEventListener(userPreferencesUpdatedEvent, refreshProfile);
    window.addEventListener("storage", refreshProfile);
    window.addEventListener("focus", refreshProfile);

    return () => {
      window.removeEventListener(userPreferencesUpdatedEvent, refreshProfile);
      window.removeEventListener("storage", refreshProfile);
      window.removeEventListener("focus", refreshProfile);
    };
  }, []);

  useEffect(() => {
    setScenarioToggles((current) => ({
      ...current,
      hasListing: Boolean(selectedReport || planDefaults.listingTitle),
    }));
  }, [planDefaults.listingTitle, selectedReport]);

  function setFormValue(name: string, value: string) {
    const field = formRef.current?.elements.namedItem(name);
    if (
      field instanceof HTMLInputElement ||
      field instanceof HTMLTextAreaElement ||
      field instanceof HTMLSelectElement
    ) {
      field.value = value;
    }
  }

  function applyPlanScenario(scenario: (typeof planScenarioTemplates)[number]) {
    setFormValue("notes", scenario.notes);
    setFormValue("stage", scenario.stage);
    setFormValue("daysToDecision", scenario.daysToDecision);
    setFormValue("targetRent", scenario.targetRent);
    setFormValue("riskFocus", scenario.notes);
    setScenarioToggles({
      hasListing: scenario.hasListing,
      hasContract: scenario.hasContract,
      paymentPressure: scenario.paymentPressure,
    });
    setMessage(`已填入“${scenario.label}”场景，可以直接整理当前行动，也可以继续补充。`);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState("loading");
    setMessage("正在整理当前行动...");

    const form = new FormData(event.currentTarget);
    const notes = String(form.get("notes") || "");
    const payload: SubmittedPlanInput = {
      city: String(form.get("city") || ""),
      stage: String(form.get("stage") || "listing"),
      listingTitle: String(form.get("listingTitle") || ""),
      daysToDecision: numberFrom(form, "daysToDecision"),
      monthlyIncome: numberFrom(form, "monthlyIncome"),
      rentBudget: numberFrom(form, "rentBudget"),
      targetRent: numberFrom(form, "targetRent"),
      commuteMinutes: numberFrom(form, "commuteMinutes"),
      livingMode: String(form.get("livingMode") || "solo"),
      hasListing: boolFrom(form, "hasListing"),
      hasContract: boolFrom(form, "hasContract"),
      paymentPressure: boolFrom(form, "paymentPressure"),
      evidenceReady: boolFrom(form, "hasContract"),
      riskFocus: String(form.get("riskFocus") || notes || ""),
      notes,
    };
    setLastPlanInput(payload);

    try {
      const response = await fetch("/api/plan/build", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error("当前行动整理失败，请确认信息后重试。");
      }

      const data = (await response.json()) as DecisionPlanResult;
      setResult(data);
      setRecordState("idle");
      setState("idle");
      setMessage(
        data.mode === "openai"
          ? "已整理当前行动。先处理最重要的事项，再进入对应工具。"
          : data.warnings?.[0] ?? "已整理当前行动。先处理最重要的事项，再进入对应工具。",
      );
    } catch (error) {
      setState("error");
      setMessage(error instanceof Error ? error.message : "当前行动整理失败，请稍后重试。");
    }
  }

  async function handleRecordActionPack() {
    if (!result) return;
    if (!selectedReport) {
      setRecordState("error");
      setMessage("请先选择要保存到哪一份房源记录；如果还没有记录，先保存一份房源体检。");
      return;
    }

    setRecordState("saving");
    const saved = await recordCaseEvent({
      reportId: selectedReport.id,
      type: "plan",
      status: result.status,
      title: `当前行动：${result.currentStage}`,
      summary: result.stopLine,
      highlights: [
        `当前事项：${result.todayPlan[0] ?? result.headline}`,
        `做到什么程度：${result.doneDefinition}`,
        `剩余确认时间：${result.decisionDeadline}`,
        ...result.blockers.slice(0, 3),
      ],
      href: `/plan?reportId=${encodeURIComponent(selectedReport.id)}`,
    });

    if (saved) {
      setRecordState("saved");
      setMessage(`已把当前事项写入「${selectedReport.summary.title}」的房源记录。`);
      return;
    }

    setRecordState("error");
    setMessage("写入房源记录失败，请稍后重试。");
  }

  return (
    <div className="space-y-6">
      <form
        ref={formRef}
        onSubmit={handleSubmit}
        className="grid w-full max-w-3xl min-w-0 grid-cols-1 gap-4"
      >
        <Card className="w-full min-w-0 max-w-full p-5 sm:p-6">
          <div className="mb-6">
            <p className="text-sm text-primary/80">
              当前行动
            </p>
            <h2 className="mt-2 text-2xl font-semibold">描述当前问题</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              先写核心问题。城市、房源、付款和合同信息可以按需补充。
            </p>
          </div>

          <div key={formSeedKey} className="space-y-5">
            {selectedReport ? (
              <div className="rounded-md border border-primary/25 bg-primary/10 p-3 text-sm leading-6 text-muted-foreground">
                <p className="font-medium text-foreground">已带入房源体检</p>
                <p className="mt-0.5">
                  {selectedReport.summary.title}，{selectedReport.summary.score} 分
                </p>
              </div>
            ) : initialSourceLabel ? (
              <p className="rounded-md border border-primary/25 bg-primary/10 p-3 text-sm leading-6 text-muted-foreground">
                {initialSourceLabel}，会带入本次判断。
              </p>
            ) : null}

            <div className="space-y-2">
              <Label>快速填入</Label>
              <div className="flex max-w-full gap-2 overflow-x-auto pb-1">
                {planScenarioTemplates.map((scenario) => (
                  <button
                    key={scenario.label}
                    type="button"
                    onClick={() => applyPlanScenario(scenario)}
                    className="shrink-0 rounded-full border border-border bg-secondary px-3 py-2 text-sm font-medium transition hover:border-primary/40 hover:text-primary"
                  >
                    {scenario.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">当前问题</Label>
              <Textarea
                id="notes"
                name="notes"
                className="min-h-[132px]"
                placeholder="例如：中介催今晚交 3000 定金，但合同、收款主体和退款条件还没确认。"
                defaultValue={planDefaults.notes}
              />
              <input type="hidden" name="riskFocus" defaultValue={planDefaults.riskFocus} />
              <input type="hidden" name="monthlyIncome" defaultValue={planDefaults.monthlyIncome} />
              <input type="hidden" name="rentBudget" defaultValue={planDefaults.rentBudget} />
              <input type="hidden" name="livingMode" defaultValue={planDefaults.livingMode} />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="stage">当前阶段</Label>
                <select
                  id="stage"
                  name="stage"
                  defaultValue={planDefaults.stage}
                  className="h-11 w-full rounded-md border border-input bg-secondary px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                >
                  {stageOptions.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </div>
              <Field
                label="最晚几天内决定"
                name="daysToDecision"
                defaultValue={planDefaults.daysToDecision}
              />
            </div>

            <details className="rounded-md border border-border bg-secondary/70 p-4">
              <summary className="cursor-pointer text-sm font-medium text-foreground">
                补充信息（选填）
              </summary>
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="城市" name="city" defaultValue={planDefaults.city} type="text" />
                <Field
                  label="候选房源"
                  name="listingTitle"
                  defaultValue={planDefaults.listingTitle}
                  type="text"
                />
                <Field
                  label="目标房租或拟付款"
                  name="targetRent"
                  defaultValue={planDefaults.targetRent}
                />
                <Field
                  label="通勤上限"
                  name="commuteMinutes"
                  defaultValue={planDefaults.commuteMinutes}
                />
                <div className="grid gap-2 sm:col-span-2 sm:grid-cols-3">
                  <ToggleRow
                    name="hasListing"
                    label="已有明确候选房源"
                    checked={scenarioToggles.hasListing}
                    onCheckedChange={(checked) =>
                      setScenarioToggles((current) => ({
                        ...current,
                        hasListing: checked,
                      }))
                    }
                  />
                  <ToggleRow
                    name="hasContract"
                    label="已经看到合同或补充协议"
                    checked={scenarioToggles.hasContract}
                    onCheckedChange={(checked) =>
                      setScenarioToggles((current) => ({
                        ...current,
                        hasContract: checked,
                      }))
                    }
                  />
                  <ToggleRow
                    name="paymentPressure"
                    label="对方正在催我先付款"
                    checked={scenarioToggles.paymentPressure}
                    onCheckedChange={(checked) =>
                      setScenarioToggles((current) => ({
                        ...current,
                        paymentPressure: checked,
                      }))
                    }
                  />
                </div>
              </div>
            </details>
          </div>

          <StatusMessage state={state} message={message} />

          <Button type="submit" size="lg" className="mt-5 w-full" disabled={state === "loading"}>
            {state === "loading" ? (
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            ) : (
              <ListChecks className="mr-2 h-5 w-5" />
            )}
            {state === "loading" ? "正在整理" : "整理当前行动"}
          </Button>
        </Card>

      </form>

      {result ? (
        <DecisionPlanResultCard
          result={result}
          selectedReport={selectedReport}
          recordState={recordState}
          onRecord={handleRecordActionPack}
          nextModules={nextModuleLinks}
        />
      ) : null}
    </div>
  );
}

function Field({
  label,
  name,
  defaultValue,
  type = "number",
}: {
  label: string;
  name: string;
  defaultValue: string;
  type?: "number" | "text";
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} type={type} defaultValue={defaultValue} />
    </div>
  );
}

function ToggleRow({
  name,
  label,
  checked,
  onCheckedChange,
}: {
  name: string;
  label: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <label
      htmlFor={name}
      className="flex min-h-11 items-center gap-3 rounded-md border border-border bg-secondary/70 px-3 py-3"
    >
      <Checkbox
        id={name}
        name={name}
        checked={checked}
        onCheckedChange={(value) => onCheckedChange(value === true)}
      />
      <span className="min-w-0">
        <span className="block text-sm font-medium">{label}</span>
      </span>
    </label>
  );
}

function StatusMessage({ state, message }: { state: SubmitState; message: string }) {
  const className =
    state === "error"
      ? "border-rose-300/30 bg-rose-300/10 text-rose-700"
      : state === "loading"
        ? "border-primary/30 bg-primary/10 text-primary"
        : "border-border bg-secondary text-muted-foreground";

  return <div className={`mt-5 rounded-md border px-4 py-3 text-sm ${className}`}>{message}</div>;
}

