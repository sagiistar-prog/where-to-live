"use client";

import { FormEvent, type ReactNode, useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  ClipboardCopy,
  ClipboardList,
  ListChecks,
  Loader2,
  MessageSquareText,
  Route,
  Save,
  ShieldAlert,
  TimerReset,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { ProfileDefaultNote } from "@/components/profile-default-note";
import { RiskBadge } from "@/components/risk-badge";
import { recordCaseEvent } from "@/lib/client-case-events";
import { buildFlowHref, compactContext } from "@/lib/flow-links";
import type { DecisionPlanResult, PlanPriority } from "@/lib/decision-plan";
import { livingPreferenceText, profileDefaultSummary } from "@/lib/preference-derived-defaults";
import {
  defaultUserPreferences,
  hasStoredUserPreferences,
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

const priorityVariant: Record<PlanPriority, "destructive" | "warning" | "success"> = {
  必须先做: "destructive",
  高优先级: "warning",
  可按计划: "success",
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
  { value: "buy", label: "考虑买房" },
];

const livingModeOptions = [
  { value: "solo", label: "独居" },
  { value: "shared", label: "合租" },
  { value: "couple", label: "情侣同住" },
  { value: "family", label: "家庭同住" },
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
  const profileBudget = firstNumber(profile.budgetMax) || "6500";
  const profileIncome = firstNumber(profile.monthlyIncome) || "18000";
  const profileCommuteLimit = firstNumber(profile.commuteLimit) || "45";
  const city =
    report?.inputSummary?.city ||
    inferCityFromAddress(report?.inputSummary?.address) ||
    inferCityFromAddress(report?.summary.address) ||
    profile.defaultCity ||
    "上海";
  const preferences = report?.inputSummary?.preferences?.filter(Boolean).slice(0, 5) ??
    profile.livingPreferences;
  const conclusion = report?.summary.conclusion || "";
  const profileSummary = profileDefaultSummary(profile);
  const profilePreferenceText = livingPreferenceText(profile);
  const prompt = intake?.prompt?.trim() ?? "";
  const stage = intake?.stage?.trim() || (report ? "payment" : "payment");

  return {
    city,
    stage,
    listingTitle:
      report?.summary.title || (prompt ? "首页输入的候选情况" : `${profile.defaultCity || "当前城市"}候选房源`),
    daysToDecision: "2",
    monthlyIncome: profileIncome,
    rentBudget: budget || (rent ? String(Math.ceil(Number(rent) * 1.12)) : profileBudget),
    targetRent: rent || String(Math.round(Number(profileBudget) * 0.92)),
    commuteMinutes: commuteLimit || profileCommuteLimit,
    livingMode: preferences.some((item) => /合租|室友/.test(item)) ? "shared" : "solo",
    riskFocus:
      report?.summary.status === "reject"
        ? "报告结论不建议租、付款和签约风险需要重新确认"
        : report
          ? "定金不退、授权材料、合同条款、通勤和生活配套"
          : prompt
            ? prompt.slice(0, 96)
          : `按我的偏好重点关注：${profilePreferenceText}、付款凭据、合同和通勤成本`,
    notes: report
      ? [
          `来自房源评估报告：${report.summary.title}。`,
          `地址：${report.summary.address || report.inputSummary?.address || "待补充"}。`,
          conclusion ? `报告结论：${conclusion}` : "",
          report.inputSummary?.reportContext ? `前面记录：${report.inputSummary.reportContext}` : "",
          prompt ? `首页输入：${prompt}` : "",
        ]
          .filter(Boolean)
          .join("\n")
      : prompt
        ? [
            `来自首页输入：${prompt}`,
            `当前偏好：${profileSummary}。`,
            `居住偏好：${profilePreferenceText}。`,
            "请先判断今天必须做什么、哪些事先别急着做、做到什么程度，再继续下一步。",
          ].join("\n")
      : [
          `当前偏好：${profileSummary}。`,
          `居住偏好：${profilePreferenceText}。`,
          "如果还没有明确房源，先用这份偏好判断片区、通勤、预算和付款底线；如果已经被催付款，必须补充出租权、合同、收款主体和退款条件。",
        ].join("\n"),
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
    result.stopLine ? `付款底线：${result.stopLine}` : undefined,
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
      paymentType: paymentPressure ? "被催先付款" : "付款前确认",
      amount: targetRent,
      contractStatus: hasContract ? "已看到合同或补充协议，仍需逐条确认" : "合同或补充协议待补充",
      authorizationStatus: "出租权或转租授权材料待补充",
      receiptStatus: evidenceReady ? "已有部分凭据，付款记录仍需确认" : "关键凭据待补充",
      refundRule: "押金、定金、服务费和退款条件需写清",
      urgencyPressure: paymentPressure ? "对方正在催付款，先别大额转账" : "付款前常规确认",
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
      evidenceLevel: evidenceReady ? "已有部分凭据" : "待补充",
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
      evidenceLevel: evidenceReady ? "已有部分凭据" : "待补充",
      landlordResponse: paymentPressure ? "对方要求租客先负责或先垫付" : "待确认维修时限和费用边界",
      depositConcern: "担心维修责任影响押金或付款判断",
    });
  }

  if (path === "/contract") {
    Object.assign(moduleParams, {
      contractText: compactContext([
        "以下内容来自下一步，不等同于真实合同。请粘贴真实合同、补充协议或聊天确认后再确认。",
        reportContext,
      ]),
    });
  }

  if (path === "/evidence") {
    Object.assign(moduleParams, {
      paymentType: paymentPressure ? "催付款场景" : "签约前凭据",
      amount: targetRent,
      contractStatus: hasContract ? "已看到合同或补充协议" : "合同或补充协议待补充",
      authorizationStatus: "出租权或转租授权材料待补充",
      receiptStatus: evidenceReady ? "已有部分凭据" : "待补充",
    });
  }

  if (path === "/buy") {
    Object.assign(moduleParams, {
      householdIncome: monthlyIncome,
      currentRent: targetRent,
      fixedCost: Math.round(Number(monthlyIncome) * 0.35),
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
  const [copied, setCopied] = useState(false);
  const [recordState, setRecordState] = useState<RecordState>("idle");
  const [lastPlanInput, setLastPlanInput] = useState<SubmittedPlanInput | null>(null);
  const [reports, setReports] = useState<ReportTarget[]>(initialReports);
  const [selectedReportId, setSelectedReportId] = useState(
    initialReports.some((report) => report.id === initialReportId) ? initialReportId : "",
  );
  const [profile, setProfile] = useState(defaultUserPreferences);
  const [hasProfile, setHasProfile] = useState(false);
  const [message, setMessage] = useState(
    "写下你现在卡在哪一步、多久内必须决定、对方在催什么，就能整理出今天先做什么和哪些事先别急着做。",
  );

  const criticalCount = useMemo(() => {
    if (!result) return 0;
    return result.phases
      .flatMap((phase) => phase.tasks)
      .filter((task) => task.priority === "必须先做").length;
  }, [result]);
  const actionPackText = useMemo(() => (result ? buildDecisionPlanCopy(result) : ""), [result]);
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
      setHasProfile(hasStoredUserPreferences());
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

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState("loading");
    setMessage("正在整理今天先做什么...");

    const form = new FormData(event.currentTarget);
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
      evidenceReady: boolFrom(form, "evidenceReady"),
      riskFocus: String(form.get("riskFocus") || ""),
      notes: String(form.get("notes") || ""),
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
        throw new Error("下一步整理失败，请确认信息后重试。");
      }

      const data = (await response.json()) as DecisionPlanResult;
      setResult(data);
      setCopied(false);
      setRecordState("idle");
      setState("idle");
      setMessage(
        data.mode === "openai"
          ? "已整理下一步。先确认重点风险，再按建议继续。"
          : data.warnings?.[0] ?? "已整理下一步。先确认重点风险，再按建议继续。",
      );
    } catch (error) {
      setState("error");
      setMessage(error instanceof Error ? error.message : "下一步整理失败，请稍后重试。");
    }
  }

  async function handleRecordActionPack() {
    if (!result) return;
    if (!selectedReport) {
      setRecordState("error");
      setMessage("请先选择要保存到哪一份房源记录；如果还没有记录，先保存一份房源评估。");
      return;
    }

    setRecordState("saving");
    const saved = await recordCaseEvent({
      reportId: selectedReport.id,
      type: "plan",
      status: result.status,
      title: `下一步：${result.currentStage}`,
      summary: result.stopLine,
      highlights: [
        `今日事项：${result.todayPlan[0] ?? result.headline}`,
        `做到什么程度：${result.doneDefinition}`,
        `剩余确认时间：${result.decisionDeadline}`,
        ...result.blockers.slice(0, 3),
      ],
      href: `/plan?reportId=${encodeURIComponent(selectedReport.id)}`,
    });

    if (saved) {
      setRecordState("saved");
      setMessage(`已把今日事项写入「${selectedReport.summary.title}」的房源记录。`);
      return;
    }

    setRecordState("error");
    setMessage("写入房源记录失败，请稍后重试。");
  }

  async function handleCopyActionPack() {
    if (!actionPackText) return;

    try {
      await navigator.clipboard.writeText(actionPackText);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setMessage("复制失败，请手动选中今日事项内容。");
    }
  }

  return (
    <div className="space-y-6">
      <form
        onSubmit={handleSubmit}
        className="grid grid-cols-1 gap-4 xl:grid-cols-[0.42fr_0.58fr]"
      >
        <Card className="min-w-0 p-6">
          <div className="mb-6">
            <p className="text-sm text-primary/80">
              当前情况
            </p>
            <h2 className="mt-2 text-2xl font-semibold">输入当前情况</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              不需要一次填完所有资料。先告诉住哪儿你卡在哪一步、多久内要决定、钱和凭据材料是否稳妥。
            </p>
          </div>

          {selectedReport ? (
            <div className="mb-5 rounded-md border border-primary/25 bg-primary/10 p-3 text-sm leading-6 text-muted-foreground">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium text-foreground">已带入房源评估报告</p>
                  <p className="mt-0.5">
                    会优先使用这套房源的租金、预算、通勤上限和报告结论。
                  </p>
                </div>
                <Badge variant="outline" className="w-fit max-w-full whitespace-normal text-left">
                  {selectedReport.summary.title} · {selectedReport.summary.score} 分
                </Badge>
              </div>
            </div>
          ) : (
            <>
              {initialSourceLabel ? (
                <div className="mb-5 rounded-md border border-primary/25 bg-primary/10 p-3 text-sm leading-6 text-muted-foreground">
                  <p className="font-medium text-foreground">{initialSourceLabel}</p>
                  <p className="mt-0.5">
                    已把这次输入写入补充说明，整理时会一起判断付款、凭据材料、通勤和签约顺序。
                  </p>
                </div>
              ) : null}
              <ProfileDefaultNote hasProfile={hasProfile} summary={profileDefaultSummary(profile)} />
            </>
          )}

          <div key={formSeedKey}>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="城市" name="city" defaultValue={planDefaults.city} type="text" />
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
                label="候选房源"
                name="listingTitle"
                defaultValue={planDefaults.listingTitle}
                type="text"
              />
              <Field
                label="剩余确认天数"
                name="daysToDecision"
                defaultValue={planDefaults.daysToDecision}
              />
              <Field
                label="税后月收入"
                name="monthlyIncome"
                defaultValue={planDefaults.monthlyIncome}
              />
              <Field label="预算上限" name="rentBudget" defaultValue={planDefaults.rentBudget} />
              <Field label="目标房租" name="targetRent" defaultValue={planDefaults.targetRent} />
              <Field
                label="单程通勤分钟"
                name="commuteMinutes"
                defaultValue={planDefaults.commuteMinutes}
              />
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="livingMode">居住方式</Label>
                <select
                  id="livingMode"
                  name="livingMode"
                  defaultValue={planDefaults.livingMode}
                  className="h-11 w-full rounded-md border border-input bg-secondary px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                >
                  {livingModeOptions.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-5 grid gap-3">
              <ToggleRow
                name="hasListing"
                label="已有明确候选房源"
                description="至少知道地址范围、租金、面积、楼层和付款周期。"
                defaultChecked
              />
              <ToggleRow
                name="hasContract"
                label="已经看到合同或补充协议"
                description="如果还没看到合同，不适合先转大额费用。"
              />
              <ToggleRow
                name="paymentPressure"
                label="对方正在催我先付款"
                description="定金、意向金、押金、服务费都算付款压力。"
                defaultChecked
              />
              <ToggleRow
                name="evidenceReady"
                label="关键凭据材料已准备好"
                description="出租权、押金条款、聊天确认、收款主体和付款备注。"
              />
            </div>

            <div className="mt-5 grid gap-4">
              <div className="space-y-2">
                <Label htmlFor="riskFocus">最担心的风险</Label>
                <Input id="riskFocus" name="riskFocus" defaultValue={planDefaults.riskFocus} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">补充说明</Label>
                <Textarea
                  id="notes"
                  name="notes"
                  className="min-h-[156px]"
                  defaultValue={planDefaults.notes}
                />
              </div>
            </div>
          </div>

          <CaseTargetSelector
            reports={reports}
            selectedReportId={selectedReportId}
            onChange={(value) => {
              setSelectedReportId(value);
              setRecordState("idle");
            }}
          />

          <StatusMessage state={state} message={message} />

          <Button type="submit" size="lg" className="mt-5 w-full" disabled={state === "loading"}>
            {state === "loading" ? (
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            ) : (
              <ListChecks className="mr-2 h-5 w-5" />
            )}
            {state === "loading" ? "正在整理" : "整理下一步"}
          </Button>
        </Card>

        <Card className="min-w-0 p-6">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm text-primary/80">
                判断结果
              </p>
              <h2 className="mt-2 text-2xl font-semibold">今天先做什么</h2>
            </div>
            {result ? <RiskBadge status={result.status} tone="generic" /> : null}
          </div>

          {result ? (
            <div className="space-y-5">
              <div>
                <h3 className="text-xl font-semibold">{result.headline}</h3>
                <p className="mt-2 text-sm leading-7 text-muted-foreground">{result.summary}</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <SummaryTile icon={Route} label="当前阶段" value={result.currentStage} />
                <SummaryTile icon={TimerReset} label="剩余确认时间" value={result.decisionDeadline} />
                <SummaryTile icon={ShieldAlert} label="必须先做" value={`${criticalCount} 项`} />
              </div>
              <div className="rounded-md border border-border bg-secondary p-4">
                <div className="mb-3 flex items-center justify-between gap-4">
                  <p className="text-sm font-medium">继续确认评分</p>
                  <p className="text-2xl font-semibold">{result.score}</p>
                </div>
                <Progress value={result.score} />
                <div className="mt-3 grid gap-2 text-sm leading-6 text-muted-foreground">
                  {result.guardrails.map((item) => (
                    <p key={item}>{item}</p>
                  ))}
                </div>
              </div>
              <div className="rounded-md border border-amber-300/20 bg-amber-300/10 p-4">
                <div className="mb-3 flex items-center gap-2 text-amber-700">
                  <ShieldAlert className="h-4 w-4" />
                  <h3 className="font-semibold">先确认这些待确认事项</h3>
                </div>
                <div className="grid gap-2 text-sm leading-6 text-amber-900/90">
                  {result.blockers.map((item) => (
                    <p key={item}>{item}</p>
                  ))}
                </div>
              </div>
              <ActionPackPanel
                result={result}
                copied={copied}
                onCopy={handleCopyActionPack}
                selectedReport={selectedReport}
                recordState={recordState}
                onRecord={handleRecordActionPack}
              />
            </div>
          ) : (
            <div className="flex min-h-[560px] flex-col justify-center rounded-md border border-border bg-secondary p-5">
              <Badge variant="secondary" className="mb-4 w-fit">
                当前最缺的是顺序
              </Badge>
              <h3 className="text-xl font-semibold">别把所有风险一起想</h3>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">
                先判断现在处于哪一步，再把预算、凭据材料、确认、付款、签约拆开。住哪儿会告诉你先做哪几项，做完后继续哪里。
              </p>
            </div>
          )}
        </Card>
      </form>

      {result ? (
        <div className="grid gap-4 xl:grid-cols-[0.64fr_0.36fr]">
          <Card className="min-w-0 p-6">
            <div className="mb-5 flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-semibold">分阶段确认</h2>
            </div>
            <div className="space-y-5">
              {result.phases.map((phase) => (
                <section key={phase.title} className="rounded-md border border-border bg-secondary p-4">
                  <div className="mb-4">
                    <h3 className="font-semibold">{phase.title}</h3>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">{phase.purpose}</p>
                  </div>
                  <div className="grid gap-3">
                    {phase.tasks.map((item) => (
                      <TaskRow
                        key={`${phase.title}-${item.title}`}
                        task={item}
                        href={buildPlanToolHref(item.href, result, lastPlanInput, planDefaults, selectedReport)}
                      />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </Card>

          <div className="space-y-4">
            <InfoPanel title="建议继续看" icon={ListChecks}>
              <div className="grid gap-3">
                {result.nextModules.map((item) => {
                  const href = buildPlanToolHref(
                    item.href,
                    result,
                    lastPlanInput,
                    planDefaults,
                    selectedReport,
                  );

                  return (
                    <Link
                      key={item.href}
                      href={href}
                      className="group rounded-md border border-border bg-secondary p-4 transition hover:border-primary/50"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold">{item.name}</p>
                        <ArrowRight className="h-4 w-4 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-primary" />
                      </div>
                      <p className="mt-2 text-xs leading-5 text-muted-foreground">{item.reason}</p>
                    </Link>
                  );
                })}
              </div>
            </InfoPanel>

            <InfoPanel title="凭据材料" icon={CheckCircle2}>
              <ul className="grid gap-2 text-sm leading-6 text-muted-foreground">
                {result.evidenceChecklist.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </InfoPanel>

            <InfoPanel title="可复制话术" icon={ShieldAlert}>
              <p className="text-sm leading-7 text-muted-foreground">{result.handoffScript}</p>
            </InfoPanel>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function CaseTargetSelector({
  reports,
  selectedReportId,
  onChange,
}: {
  reports: ReportTarget[];
  selectedReportId: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="mt-5 rounded-md border border-border bg-secondary p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <Label htmlFor="caseTarget">保存到房源记录</Label>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            可选。选择已有报告后，整理出的今日事项可以保存到房源记录，方便后续继续查看。
          </p>
        </div>
        <Button asChild type="button" variant="secondary" size="sm" className="shrink-0">
          <Link href="/analyze">先评估一套房源</Link>
        </Button>
      </div>
      <select
        id="caseTarget"
        value={selectedReportId}
        onChange={(event) => onChange(event.target.value)}
        className="mt-3 h-11 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
      >
        <option value="">只用我的需求整理，暂不保存到记录</option>
        {reports.length
          ? reports.map((report) => (
            <option key={report.id} value={report.id}>
              {report.summary.title} · {report.summary.address} · {report.summary.score} 分
            </option>
          ))
          : null}
      </select>
    </div>
  );
}

function buildDecisionPlanCopy(result: DecisionPlanResult) {
  return [
    "住哪儿｜今日租房确认事项",
    `结论：${result.headline}`,
    `当前阶段：${result.currentStage}`,
    `剩余确认时间：${result.decisionDeadline}`,
    "",
    "今天只做：",
    ...result.todayPlan.map((item) => item),
    "",
    `付款底线：${result.stopLine}`,
    `做到什么程度：${result.doneDefinition}`,
    "",
    "待补充凭据材料：",
    ...result.evidenceChecklist.slice(0, 4).map((item) => `- ${item}`),
    "",
    "对外话术：",
    result.handoffScript,
    "",
    "使用提醒：本清单只基于你主动输入的信息、公开确认思路和已接入服务整理；付款、签约和维权前仍需回到原始材料与官方入口确认。",
  ].join("\n");
}

function ActionPackPanel({
  result,
  copied,
  onCopy,
  selectedReport,
  recordState,
  onRecord,
}: {
  result: DecisionPlanResult;
  copied: boolean;
  onCopy: () => void;
  selectedReport?: ReportTarget;
  recordState: RecordState;
  onRecord: () => void;
}) {
  return (
    <section className="rounded-md border border-primary/25 bg-primary/10 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-primary">
            <MessageSquareText className="h-4 w-4" />
            <h3 className="font-semibold">今日确认事项</h3>
          </div>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            只保留今天该确认的事项、付款底线和做到什么程度才稳妥。
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button type="button" variant="secondary" className="shrink-0" onClick={onCopy}>
            <ClipboardCopy className="mr-2 h-4 w-4" />
            {copied ? "已复制" : "复制清单"}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="shrink-0"
            onClick={onRecord}
            disabled={!selectedReport || recordState === "saving"}
          >
            <Save className="mr-2 h-4 w-4" />
            {recordState === "saving"
              ? "正在写入"
              : recordState === "saved"
                ? "已保存到记录"
                : "保存到记录"}
          </Button>
        </div>
      </div>

      {selectedReport ? (
        <p className="mt-4 rounded-md border border-border/70 bg-background/45 px-3 py-2 text-xs leading-5 text-muted-foreground">
          当前将写入：{selectedReport.summary.title} · {selectedReport.summary.address}
        </p>
      ) : (
        <p className="mt-4 rounded-md border border-amber-300/20 bg-amber-300/10 px-3 py-2 text-xs leading-5 text-amber-900/90">
          暂无可写入的房源记录。先保存一份房源评估，再把今日事项保存到同一套房源。
        </p>
      )}

      <ol className="mt-4 grid gap-2 text-sm leading-6 text-foreground/90">
        {result.todayPlan.map((item) => (
          <li key={item} className="rounded-md border border-border/70 bg-background/45 px-3 py-2">
            {item}
          </li>
        ))}
      </ol>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-md border border-amber-300/20 bg-amber-300/10 p-3">
          <p className="text-xs text-amber-700/80">付款底线</p>
          <p className="mt-1 text-sm leading-6 text-amber-900">{result.stopLine}</p>
        </div>
        <div className="rounded-md border border-emerald-300/20 bg-emerald-300/10 p-3">
          <p className="text-xs text-emerald-700/80">做到什么程度</p>
          <p className="mt-1 text-sm leading-6 text-emerald-900">{result.doneDefinition}</p>
        </div>
      </div>
    </section>
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
      className="flex items-start gap-3 rounded-md border border-border bg-secondary p-4"
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

function TaskRow({
  task,
  href,
}: {
  task: DecisionPlanResult["phases"][number]["tasks"][number];
  href: string;
}) {
  return (
    <div className="rounded-md border border-border bg-card p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <Badge variant={priorityVariant[task.priority]}>{task.priority}</Badge>
            <Badge variant="outline">{task.timeBox}</Badge>
          </div>
          <h4 className="font-semibold">{task.title}</h4>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{task.why}</p>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">产出：{task.output}</p>
        </div>
        <Button asChild variant="secondary" className="w-full shrink-0 sm:w-auto">
          <Link href={href}>{task.moduleName}</Link>
        </Button>
      </div>
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

