"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  Calculator,
  Loader2,
} from "lucide-react";
import {
  buildCommuteFieldPack,
  CommuteCostResultView,
  formatHours,
  formatMoney,
} from "@/components/commute-cost-result";
import { ProfileDefaultNote } from "@/components/profile-default-note";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { defaultAppSettings, readAppSettings } from "@/lib/app-settings";
import type {
  CommuteCostInput,
  CommuteCostResult,
} from "@/lib/commute-cost";
import { recordCaseEvent } from "@/lib/client-case-events";
import { buildFlowHref, compactContext } from "@/lib/flow-links";
import { numberFromPreference, profileDefaultSummary } from "@/lib/preference-derived-defaults";
import {
  defaultUserPreferences,
  hasStoredUserPreferences,
  readUserPreferences,
} from "@/lib/user-preferences";

type SubmitState = "idle" | "loading" | "error";

type CommuteCostSeed = Partial<Record<keyof CommuteCostInput, string>> & {
  sourceLabel?: string;
  reportContext?: string;
};

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
    "请尽量填到小区、写字楼、门牌或明确地标。只填“科技园”“市中心”这类范围时，可能需要改用手动时间判断。",
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

  const commuteLimit = numberFromPreference(profile.commuteLimit, 0);
  const monthlyRent = numberFromPreference(profile.budgetMax, 0);
  const alternativeRent = monthlyRent ? Math.round(monthlyRent * 1.12) : 0;
  const formDefaults = useMemo(
    () => ({
      city: seedValue(initialInput?.city, profile.defaultCity),
      listingTitle: seedValue(initialInput?.listingTitle, ""),
      workplace: seedValue(initialInput?.workplace, profile.defaultWorkplace),
      monthlyIncome: numericSeed(initialInput?.monthlyIncome, profile.monthlyIncome),
      monthlyRent: numericSeed(initialInput?.monthlyRent, monthlyRent ? String(monthlyRent) : ""),
      oneWayMinutes: numericSeed(initialInput?.oneWayMinutes, ""),
      walkMinutes: numericSeed(initialInput?.walkMinutes, ""),
      transferCount: numericSeed(initialInput?.transferCount, ""),
      transitFareOneWay: numericSeed(initialInput?.transitFareOneWay, ""),
      workdaysPerMonth: numericSeed(initialInput?.workdaysPerMonth, ""),
      commuteLimitMinutes: numericSeed(
        initialInput?.commuteLimitMinutes,
        commuteLimit ? String(commuteLimit) : "",
      ),
      lateNightsPerMonth: numericSeed(initialInput?.lateNightsPerMonth, ""),
      taxiCostPerLateNight: numericSeed(initialInput?.taxiCostPerLateNight, ""),
      badWeatherDaysPerMonth: numericSeed(initialInput?.badWeatherDaysPerMonth, ""),
      alternativeOneWayMinutes: numericSeed(initialInput?.alternativeOneWayMinutes, ""),
      alternativeMonthlyRent: numericSeed(
        initialInput?.alternativeMonthlyRent,
        alternativeRent ? String(alternativeRent) : "",
      ),
      notes: seedValue(initialInput?.notes, ""),
    }),
    [alternativeRent, commuteLimit, initialInput, monthlyRent, profile],
  );
  const profileKey = hasProfile
    ? `${formDefaults.city}-${formDefaults.workplace}-${formDefaults.monthlyIncome}-${formDefaults.monthlyRent}-${formDefaults.commuteLimitMinutes}`
    : `empty-${formDefaults.city}-${formDefaults.monthlyRent}`;
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
          ? "已结合实时路线测算通勤成本。先看通勤和租金是否匹配，再决定是否继续。"
          : data.routeEvidence?.detail ?? "通勤真实成本已测算。先看通勤和租金是否匹配，再决定是否继续。",
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
        className="grid max-w-3xl grid-cols-1 gap-4"
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
              房租便宜不代表整体成本更低。先确认单程时间、当前月租和可接受上限，再判断是否值得继续看。
            </p>
          </div>

          <ProfileDefaultNote hasProfile={hasProfile} summary={profileDefaultSummary(profile)} />

          <div key={profileKey} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field
              label="城市"
              name="city"
              defaultValue={formDefaults.city}
              type="text"
              placeholder="填写目标城市"
            />
            <Field
              label="房源位置"
              name="listingTitle"
              defaultValue={formDefaults.listingTitle}
              type="text"
              placeholder="填写小区、楼栋、写字楼或明确地标"
              description="用于查询通勤路线，越具体越容易拿到真实公交、地铁和步行时间。"
            />
            <Field
              label="工作地点"
              name="workplace"
              defaultValue={formDefaults.workplace}
              type="text"
              placeholder="填写公司楼宇、园区、学校、地铁站或明确地标"
              description="建议填公司楼宇、园区、地铁站或明确地标。"
            />
            <Field
              label="当前月租"
              name="monthlyRent"
              defaultValue={formDefaults.monthlyRent}
              placeholder="填写当前月租金额"
            />
            <Field
              label="单程通勤分钟"
              name="oneWayMinutes"
              defaultValue={formDefaults.oneWayMinutes}
              placeholder="填写单程通勤分钟数"
            />
            <Field
              label="通勤上限分钟"
              name="commuteLimitMinutes"
              defaultValue={formDefaults.commuteLimitMinutes}
              placeholder="填写可接受通勤上限"
            />
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="notes">补充说明</Label>
              <Textarea
                id="notes"
                name="notes"
                className="min-h-[112px]"
                defaultValue={formDefaults.notes}
                placeholder="填写通勤、晚归、天气或替代房相关顾虑"
              />
            </div>
            <details className="rounded-md border border-border bg-secondary/55 p-4 sm:col-span-2">
              <summary className="cursor-pointer text-sm font-medium text-foreground">
                补充通勤成本（选填）
              </summary>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <Field
                  label="税后月收入"
                  name="monthlyIncome"
                  defaultValue={formDefaults.monthlyIncome}
                  placeholder="填写每月实际到手收入"
                />
                <Field
                  label="步行到站分钟"
                  name="walkMinutes"
                  defaultValue={formDefaults.walkMinutes}
                  placeholder="填写步行分钟数"
                />
                <Field
                  label="换乘次数"
                  name="transferCount"
                  defaultValue={formDefaults.transferCount}
                  placeholder="填写换乘次数"
                />
                <Field
                  label="单程交通费"
                  name="transitFareOneWay"
                  defaultValue={formDefaults.transitFareOneWay}
                  placeholder="填写单程交通费"
                />
                <Field
                  label="每月工作日"
                  name="workdaysPerMonth"
                  defaultValue={formDefaults.workdaysPerMonth}
                  placeholder="填写每月工作日数量"
                />
                <Field
                  label="每月晚归次数"
                  name="lateNightsPerMonth"
                  defaultValue={formDefaults.lateNightsPerMonth}
                  placeholder="填写每月晚归次数"
                />
                <Field
                  label="晚归打车单次"
                  name="taxiCostPerLateNight"
                  defaultValue={formDefaults.taxiCostPerLateNight}
                  placeholder="填写单次打车费用"
                />
                <Field
                  label="每月坏天气天数"
                  name="badWeatherDaysPerMonth"
                  defaultValue={formDefaults.badWeatherDaysPerMonth}
                  placeholder="填写每月坏天气天数"
                />
                <Field
                  label="替代房单程分钟"
                  name="alternativeOneWayMinutes"
                  defaultValue={formDefaults.alternativeOneWayMinutes}
                  placeholder="填写替代房单程分钟数"
                />
                <Field
                  label="替代房月租"
                  name="alternativeMonthlyRent"
                  defaultValue={formDefaults.alternativeMonthlyRent}
                  placeholder="填写替代房月租"
                />
              </div>
            </details>
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

      </form>

      {result ? (
        <CommuteCostResultView
          result={result}
          lastInput={lastInput}
          copiedPack={copiedPack}
          rentTradeoffText={rentTradeoffText}
          areaHref={areaHref}
          compareHref={compareHref}
          analyzeHref={analyzeHref}
          onCopyPack={copyCommutePack}
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
      ? "border-rose-300/30 bg-rose-300/10 text-rose-700"
      : state === "loading"
        ? "border-primary/30 bg-primary/10 text-primary"
        : "border-border bg-secondary text-muted-foreground";

  return <div className={`mt-5 rounded-md border px-4 py-3 text-sm ${className}`}>{message}</div>;
}

