"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  Calculator,
  Loader2,
} from "lucide-react";
import {
  buildLifeFieldPack,
  LifeRadiusResultView,
} from "@/components/life-radius-result";
import { ProfileDefaultNote } from "@/components/profile-default-note";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { defaultAppSettings, readAppSettings } from "@/lib/app-settings";
import type {
  LifeRadiusInput,
  LifeRadiusResult,
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

type LifeRadiusSeed = Partial<Record<keyof LifeRadiusInput, string>> & {
  sourceLabel?: string;
  reportContext?: string;
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
  const formDefaults = useMemo(
    () => ({
      city: seedValue(initialInput?.city, profile.defaultCity),
      listingTitle: seedValue(initialInput?.listingTitle, ""),
      radiusMinutes: numericSeed(initialInput?.radiusMinutes, ""),
      groceryMinutes: numericSeed(initialInput?.groceryMinutes, ""),
      restaurantCount: numericSeed(initialInput?.restaurantCount, ""),
      pharmacyMinutes: numericSeed(initialInput?.pharmacyMinutes, ""),
      hospitalMinutes: numericSeed(initialInput?.hospitalMinutes, ""),
      parcelMinutes: numericSeed(initialInput?.parcelMinutes, ""),
      laundryMinutes: numericSeed(initialInput?.laundryMinutes, ""),
      gymMinutes: numericSeed(initialInput?.gymMinutes, ""),
      parkMinutes: numericSeed(initialInput?.parkMinutes, ""),
      lateFoodAvailable: booleanSeed(
        initialInput?.lateFoodAvailable,
        profile.livingPreferences.includes("独居"),
      ),
      nightLighting: seedValue(initialInput?.nightLighting, ""),
      cookingFrequency: seedValue(initialInput?.cookingFrequency, cooksOften ? "often" : ""),
      noiseSources: seedValue(initialInput?.noiseSources, ""),
      lifestyle: seedValue(
        initialInput?.lifestyle,
        preferenceText ? `居住偏好：${preferenceText}。` : "",
      ),
      notes: seedValue(initialInput?.notes, ""),
    }),
    [cooksOften, initialInput, preferenceText, profile],
  );
  const profileKey = hasProfile
    ? `${formDefaults.city}-${formDefaults.listingTitle}-${profile.budgetMax}-${profile.livingPreferences.join("-")}`
    : `empty-${formDefaults.city}-${formDefaults.listingTitle}`;
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
        className="grid max-w-3xl grid-cols-1 gap-4"
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
              先确认日常高频需求是否方便，再判断这套房是否适合长期居住。
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
              placeholder="填写小区、楼栋、写字楼或明确地标"
              description="用于查询周边生活配套；只填片区名时，结果可能只能按已知信息估算。"
            />
            <Field
              label="目标生活配套分钟"
              name="radiusMinutes"
              defaultValue={formDefaults.radiusMinutes}
              placeholder="填写可接受步行时间"
            />
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="lifestyle">生活方式</Label>
              <Textarea
                id="lifestyle"
                name="lifestyle"
                className="min-h-[96px]"
                defaultValue={formDefaults.lifestyle}
                placeholder="填写做饭、晚归、独居、宠物、运动等长期居住需求"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="notes">补充说明</Label>
              <Textarea
                id="notes"
                name="notes"
                className="min-h-[96px]"
                defaultValue={formDefaults.notes}
                placeholder="填写你最担心的生活不便或现场观察"
              />
            </div>
            <details className="rounded-md border border-border bg-secondary/55 p-4 sm:col-span-2">
              <summary className="cursor-pointer text-sm font-medium text-foreground">
                补充生活配套细节（选填）
              </summary>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
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
                  description="晚归、加班、生病时，夜间基础补给会影响生活安排。"
                  defaultChecked={formDefaults.lateFoodAvailable}
                />
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="noiseSources">噪音或气味源</Label>
                  <Input
                    id="noiseSources"
                    name="noiseSources"
                    defaultValue={formDefaults.noiseSources}
                    placeholder="填写临街、餐饮、垃圾站、施工等情况"
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
              <Calculator className="mr-2 h-5 w-5" />
            )}
            {state === "loading" ? "正在确认" : "确认生活配套"}
          </Button>
        </Card>

      </form>

      {result ? (
        <LifeRadiusResultView
          result={result}
          lastInput={lastInput}
          copiedPack={copiedPack}
          shortfallText={shortfallText}
          visitHref={visitHref}
          areaHref={areaHref}
          analyzeHref={analyzeHref}
          onCopyPack={copyLifePack}
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
      ? "border-rose-300/30 bg-rose-300/10 text-rose-700"
      : state === "loading"
        ? "border-primary/30 bg-primary/10 text-primary"
        : "border-border bg-secondary text-muted-foreground";

  return <div className={`mt-5 rounded-md border px-4 py-3 text-sm ${className}`}>{message}</div>;
}

