"use client";

import { ChangeEvent, DragEvent, FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  CircleDashed,
  FileSearch,
  Home,
  ImageIcon,
  Loader2,
  MapPinned,
  PenLine,
  SearchCheck,
  ShieldAlert,
  UploadCloud,
  WalletCards,
  WandSparkles,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { PreferenceSelector } from "@/components/preference-selector";
import { AnalysisPreflightPanel } from "@/components/analysis-preflight-panel";
import { ApiUsageGuardrail } from "@/components/api-usage-guardrail";
import {
  defaultUserPreferences,
  readUserPreferences,
  type UserPreferences,
} from "@/lib/user-preferences";
import { defaultAppSettings, readAppSettings, type AppSettings } from "@/lib/app-settings";
import { buildAnalysisPreflight } from "@/lib/analysis-preflight";

type SubmitState = "idle" | "loading" | "error";
type ExtractState = "idle" | "extracting" | "done" | "error";
type ListingFields = {
  title: string;
  rent: string;
  area: string;
  floor: string;
  address: string;
  description: string;
};
type DecisionFields = {
  city: string;
  income: string;
  workplace: string;
  budget: string;
  commuteLimit: string;
  fixedCost: string;
};
type ProviderStatus = {
  id: string;
  name: string;
  configured: boolean;
  keyType?: string;
  quotaNote?: string;
};

const providerAbilityCopy: Record<string, string> = {
  openai: "截图与报告整理",
  amap: "路线与周边数据",
  qweather: "天气舒适度",
  resend: "邮件提醒",
};

function providerAbilityName(provider: ProviderStatus) {
  return providerAbilityCopy[provider.id] ?? provider.name;
}

type ExtractResult = {
  mode?: "openai" | "fallback";
  fields?: Partial<ListingFields> & { city?: string };
  confidence?: number;
  missingFields?: string[];
  warnings?: string[];
  message?: string;
};
type FieldVerificationState = "extracted" | "manual" | "missing" | "waiting";
type FieldVerificationItem = {
  id: string;
  label: string;
  value?: string;
  extractedValue?: string;
  impact: string;
  critical: boolean;
};
type ListingScenarioTemplate = {
  id: string;
  title: string;
  description: string;
  cta: string;
  icon: LucideIcon;
  listing: ListingFields;
  decision: DecisionFields;
  preferences: string[];
  points: string[];
};

export type ListingFormInitialInput = Partial<ListingFields & DecisionFields> & {
  source?: string;
  sourceLabel?: string;
  sourceReportId?: string;
  reportContext?: string;
};

const emptyListingFields: ListingFields = {
  title: "",
  rent: "",
  area: "",
  floor: "",
  address: "",
  description: "",
};

const listingScenarioTemplates: ListingScenarioTemplate[] = [
  {
    id: "new-city",
    title: "刚到新城市",
    description: "先判断这套房会不会把工资、通勤和日常生活一起压垮。",
    cta: "套用城市成本样例",
    icon: MapPinned,
    listing: {
      title: "深圳南山科技园候选一居",
      rent: "6200",
      area: "38㎡",
      floor: "8/28 层",
      address: "深圳市南山区科技园附近",
      description:
        "中介说近地铁，押一付三，通勤方便。担心租金占比偏高、晚归路线和生活配套是否真的顺手。",
    },
    decision: {
      city: "深圳",
      income: "18000",
      workplace: "深圳湾科技生态园",
      budget: "6500",
      commuteLimit: "45 分钟",
      fixedCost: "3000",
    },
    preferences: ["独居", "必须近地铁", "怕吵", "怕潮湿"],
    points: ["租金收入比", "通勤稳定性", "夜间路线"],
  },
  {
    id: "rent-pressure",
    title: "房租压线",
    description: "租金刚好卡预算边界时，先看真实月成本和安全垫。",
    cta: "套用预算压线样例",
    icon: WalletCards,
    listing: {
      title: "上海徐汇万体馆老小区一居",
      rent: "5600",
      area: "35㎡",
      floor: "2/6 层",
      address: "上海市徐汇区万体馆附近",
      description:
        "老小区低楼层，租金略超预算。担心潮湿、隔音、维修责任和押金扣款，想知道是否还值得继续看。",
    },
    decision: {
      city: "上海",
      income: "16000",
      workplace: "徐家汇",
      budget: "5200",
      commuteLimit: "35 分钟",
      fixedCost: "3600",
    },
    preferences: ["独居", "怕潮湿", "怕吵", "经常做饭"],
    points: ["预算压力", "楼龄潮湿", "维修责任"],
  },
  {
    id: "pre-pay",
    title: "准备付定金",
    description: "被催付款时，先把材料、收款主体和可退条件查清楚。",
    cta: "套用签约前确认样例",
    icon: ShieldAlert,
    listing: {
      title: "杭州滨江近地铁合租主卧",
      rent: "3800",
      area: "18㎡",
      floor: "15/32 层",
      address: "杭州市滨江区江陵路附近",
      description:
        "中介说今天先交定金锁房，合同和授权明天补。担心二房东、押金退还、室友作息和公共费用分摊。",
    },
    decision: {
      city: "杭州",
      income: "13000",
      workplace: "滨江互联网园区",
      budget: "4000",
      commuteLimit: "40 分钟",
      fixedCost: "2800",
    },
    preferences: ["合租", "必须近地铁", "怕吵"],
    points: ["出租授权", "押金退还", "合租边界"],
  },
];

function decisionFieldsFromPreferences(preferences: UserPreferences): DecisionFields {
  return {
    city: preferences.defaultCity,
    income: preferences.monthlyIncome,
    workplace: preferences.defaultWorkplace,
    budget: preferences.budgetMax,
    commuteLimit: preferences.commuteLimit,
    fixedCost: preferences.fixedCost,
  };
}

function seedValue(value: string | undefined, fallback: string) {
  return value?.trim() || fallback;
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function ListingForm({ initialInput }: { initialInput?: ListingFormInitialInput }) {
  const router = useRouter();
  const [formSeedKey, setFormSeedKey] = useState("default");
  const [preferences, setPreferences] = useState<string[]>(
    defaultUserPreferences.livingPreferences,
  );
  const [appSettings, setAppSettings] = useState<AppSettings>(defaultAppSettings);
  const [providers, setProviders] = useState<ProviderStatus[]>([]);
  const [listingFields, setListingFields] =
    useState<ListingFields>(emptyListingFields);
  const [decisionFields, setDecisionFields] = useState<DecisionFields>(
    decisionFieldsFromPreferences(defaultUserPreferences),
  );
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [screenshotDataUrl, setScreenshotDataUrl] = useState<string>();
  const [extractState, setExtractState] = useState<ExtractState>("idle");
  const [extractResult, setExtractResult] = useState<ExtractResult | null>(null);
  const [state, setState] = useState<SubmitState>("idle");
  const [message, setMessage] = useState<string>(
    "先填租金、位置、工作地和预算。截图、生活配套和个人偏好会让判断更贴近真实生活。",
  );

  useEffect(() => {
    const saved = readUserPreferences();
    const behavior = readAppSettings();
    const seededListing: ListingFields = {
      title: initialInput?.title?.trim() || "",
      rent: initialInput?.rent?.trim() || "",
      area: initialInput?.area?.trim() || "",
      floor: initialInput?.floor?.trim() || "",
      address: initialInput?.address?.trim() || "",
      description: initialInput?.description?.trim() || initialInput?.reportContext?.trim() || "",
    };
    const seededDecision: DecisionFields = {
      city: seedValue(initialInput?.city, saved.defaultCity),
      income: seedValue(initialInput?.income, saved.monthlyIncome),
      workplace: seedValue(initialInput?.workplace, saved.defaultWorkplace),
      budget: seedValue(initialInput?.budget, saved.budgetMax),
      commuteLimit: seedValue(initialInput?.commuteLimit, saved.commuteLimit),
      fixedCost: seedValue(initialInput?.fixedCost, saved.fixedCost),
    };

    setPreferences(saved.livingPreferences);
    setAppSettings(behavior);
    setListingFields(seededListing);
    setDecisionFields(seededDecision);
    setFormSeedKey(JSON.stringify({ saved, initialInput }));
    setMessage(
      initialInput?.sourceLabel
        ? `已带入${initialInput.sourceLabel}的上下文；请先确认租金、位置、工作地和预算。`
      : "已带入设置页常用偏好；请先确认租金、位置、工作地和预算。",
    );
  }, [initialInput]);

  useEffect(() => {
    let mounted = true;

    fetch("/api/config/status")
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (!mounted || !Array.isArray(data?.providers)) return;
        setProviders(data.providers);
      })
      .catch(() => undefined);

    return () => {
      mounted = false;
    };
  }, []);

  function updateListingField(field: keyof ListingFields, value: string) {
    setListingFields((current) => ({ ...current, [field]: value }));
  }

  function updateDecisionField(field: keyof DecisionFields, value: string) {
    setDecisionFields((current) => ({ ...current, [field]: value }));
  }

  function applyScenarioTemplate(template: ListingScenarioTemplate) {
    setListingFields(template.listing);
    setDecisionFields(template.decision);
    setPreferences(template.preferences);
    setScreenshot(null);
    setScreenshotDataUrl(undefined);
    setExtractResult(null);
    setExtractState("idle");
    setState("idle");
    setMessage(`已套用“${template.title}”样例。你可以直接修改信息，再评估房源。`);
  }

  async function handleScreenshotFile(file: File | null) {
    if (!file) {
      setScreenshot(null);
      setScreenshotDataUrl(undefined);
      setExtractResult(null);
      setExtractState("idle");
      return;
    }

    if (!file.type.startsWith("image/")) {
      setState("error");
      setMessage("请上传图片格式的房源截图。");
      return;
    }

    if (file.size > 4 * 1024 * 1024) {
      setState("error");
      setMessage("截图暂时限制在 4MB 内，请压缩后重新上传。");
      return;
    }

    setScreenshot(file);
    setScreenshotDataUrl(undefined);
    setExtractResult(null);
    setExtractState("idle");
    setState("idle");
    setMessage(`已选择截图：${file.name}，可以先读取截图信息再确认。`);

    try {
      const dataUrl = await readFileAsDataUrl(file);
      setScreenshotDataUrl(dataUrl);
    } catch {
      setState("error");
      setMessage("截图读取失败，请重新选择图片。");
    }
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    void handleScreenshotFile(event.target.files?.[0] ?? null);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    void handleScreenshotFile(event.dataTransfer.files?.[0] ?? null);
  }

  function mergeExtractedFields(result: ExtractResult) {
    const fields = result.fields ?? {};
    setListingFields((current) => ({
      title: fields.title?.trim() || current.title,
      rent: fields.rent?.trim() || current.rent,
      area: fields.area?.trim() || current.area,
      floor: fields.floor?.trim() || current.floor,
      address: fields.address?.trim() || current.address,
      description: fields.description?.trim() || current.description,
    }));

    if (fields.city?.trim()) {
      updateDecisionField("city", fields.city.trim());
    }
  }

  function currentFieldVerificationItems(): FieldVerificationItem[] {
    return [
      {
        id: "rent",
        label: "月租金",
        value: listingFields.rent,
        extractedValue: extractResult?.fields?.rent,
        impact: "影响价格评分、预算压力和首笔支出。",
        critical: true,
      },
      {
        id: "address",
        label: "房源位置",
        value: listingFields.address,
        extractedValue: extractResult?.fields?.address,
    impact: "影响通勤、周边生活、天气舒适度和官方查询入口。",
        critical: true,
      },
      {
        id: "city",
        label: "城市",
        value: decisionFields.city,
        extractedValue: extractResult?.fields?.city,
        impact: "影响生活成本、天气舒适度和开放数据上下文。",
        critical: true,
      },
      {
        id: "workplace",
        label: "工作地点",
        value: decisionFields.workplace,
        impact: "影响通勤真实成本和片区筛选。",
        critical: true,
      },
      {
        id: "budget",
        label: "预算上限",
        value: decisionFields.budget,
        impact: "影响是否挤压预算和是否值得继续看房。",
        critical: true,
      },
      {
        id: "area",
        label: "面积",
        value: listingFields.area,
        extractedValue: extractResult?.fields?.area,
        impact: "影响单位租金、舒适度和长期可住性。",
        critical: false,
      },
      {
        id: "floor",
        label: "楼层",
        value: listingFields.floor,
        extractedValue: extractResult?.fields?.floor,
        impact: "影响潮湿、噪音、采光、独居安全和电梯等待。",
        critical: false,
      },
      {
        id: "income",
        label: "税后收入",
        value: decisionFields.income,
        impact: "影响租金收入比、押付结构和安全垫。",
        critical: false,
      },
    ];
  }

  async function handleExtractScreenshot() {
    if (!appSettings.screenshotExtractionEnabled) {
      setExtractState("error");
      setMessage("设置页已关闭截图读取。你仍可手动填写信息，或到设置页重新开启。");
      return;
    }

    if (!screenshotDataUrl) {
      setExtractState("error");
      setMessage("请先上传截图，再读取截图信息。");
      return;
    }

    setExtractState("extracting");
    setMessage("正在读取截图里的租金、面积、地址和费用说明...");

    try {
      const response = await fetch("/api/analyze/extract", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ screenshotDataUrl }),
      });
      const result = (await response.json()) as ExtractResult;
      if (!response.ok) {
        throw new Error(result.message ?? "截图读取失败。");
      }

      setExtractResult(result);
      mergeExtractedFields(result);
      setExtractState(result.mode === "openai" ? "done" : "error");
      setMessage(
        result.mode === "openai"
          ? "已读取截图信息，请确认表单内容后评估房源。"
          : result.message ?? "暂时读不出截图，请手动补充关键信息。",
      );
    } catch (error) {
      setExtractState("error");
      setExtractResult({
        warnings: [error instanceof Error ? error.message : "截图读取失败。"],
      });
      setMessage(error instanceof Error ? error.message : "截图读取失败。");
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState("loading");
    setMessage("正在整理房源、通勤、生活配套、天气和签约付款信息...");

    const form = new FormData(event.currentTarget);

    const payload = {
      title: String(form.get("title") || ""),
      rent: String(form.get("rent") || ""),
      area: String(form.get("area") || ""),
      floor: String(form.get("floor") || ""),
      address: String(form.get("address") || ""),
      description: String(form.get("description") || ""),
      city: String(form.get("city") || ""),
      income: String(form.get("income") || ""),
      workplace: String(form.get("workplace") || ""),
      budget: String(form.get("budget") || ""),
      commuteLimit: String(form.get("commuteLimit") || ""),
      fixedCost: String(form.get("fixedCost") || ""),
      lifeRadiusMinutes: String(form.get("lifeRadiusMinutes") || ""),
      groceryMinutes: String(form.get("groceryMinutes") || ""),
      restaurantCount: String(form.get("restaurantCount") || ""),
      pharmacyMinutes: String(form.get("pharmacyMinutes") || ""),
      hospitalMinutes: String(form.get("hospitalMinutes") || ""),
      parcelMinutes: String(form.get("parcelMinutes") || ""),
      laundryMinutes: String(form.get("laundryMinutes") || ""),
      gymMinutes: String(form.get("gymMinutes") || ""),
      parkMinutes: String(form.get("parkMinutes") || ""),
      lateFoodAvailable: form.get("lateFoodAvailable") === "on",
      nightLighting: String(form.get("nightLighting") || ""),
      cookingFrequency: String(form.get("cookingFrequency") || ""),
      noiseSources: String(form.get("noiseSources") || ""),
      lifestyle: String(form.get("lifestyle") || ""),
      lifeNotes: String(form.get("lifeNotes") || ""),
      source: String(form.get("source") || ""),
      sourceReportId: String(form.get("sourceReportId") || ""),
      reportContext: String(form.get("reportContext") || ""),
      preferences,
      screenshotDataUrl,
      reportDepth: appSettings.reportDepth,
      saveReportHistory: appSettings.saveReportHistory,
      personalizationEnabled: appSettings.personalizationEnabled,
      dataSourceSettings: {
        amapDataEnabled: appSettings.amapDataEnabled,
        weatherDataEnabled: appSettings.weatherDataEnabled,
        officialPromptEnabled: appSettings.officialPromptEnabled,
      },
      analysisPreflight: buildAnalysisPreflight({
        listing: listingFields,
        decision: decisionFields,
        preferences,
        providers,
        hasScreenshot: Boolean(screenshotDataUrl),
        extractResult,
      }),
    };

    try {
      const response = await fetch("/api/analyze/report", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error("房源评估失败，请稍后重试。");
      }

      const result = await response.json();
      sessionStorage.setItem("zhunaar:last-report", JSON.stringify(result));
      const isTemporaryReport = result.saved === false || !result.id;
      setMessage(
        isTemporaryReport
          ? result.mode === "openai"
            ? "房源评估已生成。由于你关闭了报告历史保存，本次只保留为当前会话报告，正在打开报告页。"
            : "已按现有信息生成当前会话评估。由于你关闭了报告历史保存，本次不会保存为房源记录。"
          : result.mode === "openai"
            ? "房源评估已保存为房源记录，正在打开报告与下一步。"
            : "已按已填写信息生成评估，并保存为房源记录，正在打开报告与下一步。",
      );
      router.push(result.id ? `/report/${result.id}` : "/report/latest");
    } catch (error) {
      setState("error");
      setMessage(error instanceof Error ? error.message : "房源评估失败，请稍后重试。");
    }
  }

  const verificationItems = currentFieldVerificationItems();
  const criticalMissingCount = verificationItems.filter(
    (item) => item.critical && !item.value?.trim(),
  ).length;
  const filledCriticalCount = verificationItems.filter(
    (item) => item.critical && item.value?.trim(),
  ).length;
  const readySummary =
    criticalMissingCount === 0
      ? "关键信息已具备，可以评估"
      : `还缺 ${criticalMissingCount} 个关键信息`;

  return (
    <form
      key={formSeedKey}
      onSubmit={handleSubmit}
      className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]"
    >
      <input type="hidden" name="source" value={initialInput?.source ?? ""} />
      <input type="hidden" name="sourceReportId" value={initialInput?.sourceReportId ?? ""} />
      <input type="hidden" name="reportContext" value={initialInput?.reportContext ?? ""} />
      <section className="grid gap-4 xl:col-span-2 xl:grid-cols-[0.36fr_0.64fr]">
        <Card className="p-5">
          <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-md bg-primary/15 text-primary">
            <Home className="h-5 w-5" />
          </div>
          <p className="text-sm text-primary/80">本次评估</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-normal">
            先判断能不能继续投入时间
          </h2>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">
            房源评估用来判断这套房是否值得继续看、能不能付款、签约前还需要确认什么。
          </p>
          <div className="mt-5 grid gap-2 sm:grid-cols-3 xl:grid-cols-1">
            <DecisionReadinessMetric
              icon={CheckCircle2}
              label="关键信息"
              value={`${filledCriticalCount}/5`}
              detail={readySummary}
              urgent={criticalMissingCount > 0}
            />
            <DecisionReadinessMetric
              icon={Clock3}
              label="通勤判断"
              value={decisionFields.workplace ? "可测算" : "待填工作地"}
              detail={decisionFields.commuteLimit || "建议写清通勤上限"}
              urgent={!decisionFields.workplace}
            />
            <DecisionReadinessMetric
              icon={WalletCards}
              label="预算判断"
              value={decisionFields.budget || "待填预算"}
              detail={decisionFields.income ? `收入 ${decisionFields.income}` : "建议补税后收入"}
              urgent={!decisionFields.budget}
            />
          </div>
          <Button type="submit" className="mt-5 w-full" disabled={state === "loading"}>
            {state === "loading" ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <WandSparkles className="mr-2 h-4 w-4" />
            )}
            {state === "loading" ? "正在评估房源" : "直接评估房源"}
          </Button>
        </Card>

        <Card className="p-5">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm text-primary/80">常见场景</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-normal">
                不知道怎么填时，先从真实场景开始
              </h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                套用后可以自由修改。它们覆盖新城市、预算压线、被催付款这三种最常见的租房压力。
              </p>
            </div>
          </div>
          <div className="grid gap-3 lg:grid-cols-3">
            {listingScenarioTemplates.map((template) => {
              const Icon = template.icon;

              return (
                <button
                  key={template.id}
                  type="button"
                  onClick={() => applyScenarioTemplate(template)}
                  className="group rounded-md border border-border bg-secondary p-4 text-left transition-colors hover:border-primary/50 hover:bg-card focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-background text-primary">
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="rounded-full border border-border px-2 py-0.5 text-[11px] text-muted-foreground transition-colors group-hover:text-foreground">
                      套用
                    </span>
                  </div>
                  <h3 className="text-base font-semibold">{template.title}</h3>
                  <p className="mt-2 min-h-[66px] text-sm leading-6 text-muted-foreground">
                    {template.description}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {template.points.map((point) => (
                      <span
                        key={point}
                        className="rounded-full border border-border bg-background/40 px-2 py-0.5 text-[11px] text-muted-foreground"
                      >
                        {point}
                      </span>
                    ))}
                  </div>
                  <p className="mt-4 text-xs font-medium text-primary">{template.cta}</p>
                </button>
              );
            })}
          </div>
        </Card>
      </section>
      {initialInput?.sourceLabel || initialInput?.reportContext ? (
        <div className="rounded-md border border-primary/20 bg-primary/10 p-4 text-sm leading-6 text-primary xl:col-span-2">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="font-medium">
                {initialInput?.sourceLabel ?? "已带入上一步记录"}
              </p>
              <p className="mt-1 text-primary/80">
                表单已优先使用上一步带来的城市、工作地、预算、房源标题、地址和风险上下文；评估后会把这些信息保存进房源记录。
              </p>
            </div>
            {initialInput?.sourceReportId ? (
              <span className="shrink-0 rounded-full border border-primary/25 bg-background/30 px-3 py-1 text-xs text-primary/80">
                已关联房源记录
              </span>
            ) : null}
          </div>
          {initialInput?.reportContext ? (
            <p className="mt-3 line-clamp-3 rounded-md border border-primary/15 bg-background/20 p-3 text-xs text-primary/75">
              {initialInput.reportContext}
            </p>
          ) : null}
        </div>
      ) : null}
      <Card className="p-6">
        <div className="mb-6">
          <p className="text-sm text-primary/80">
            第一步
          </p>
          <h2 className="mt-2 text-2xl font-semibold">先填能判断的信息</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            月租、位置、工作地和预算会直接决定这套房是否值得继续看。截图可以稍后作为补充材料。
          </p>
        </div>

        <Tabs defaultValue="manual">
          <TabsList className="w-full justify-start">
            <TabsTrigger value="manual">关键信息</TabsTrigger>
            <TabsTrigger value="upload">截图补充</TabsTrigger>
          </TabsList>
          <TabsContent value="manual">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="title">房源标题</Label>
                <Input
                  id="title"
                  name="title"
                  value={listingFields.title}
                  onChange={(event) => updateListingField("title", event.target.value)}
                  placeholder="例如：南山科技园一居室"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rent">月租金</Label>
                <Input
                  id="rent"
                  name="rent"
                  value={listingFields.rent}
                  onChange={(event) => updateListingField("rent", event.target.value)}
                  placeholder="例如：6200"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="area">面积</Label>
                <Input
                  id="area"
                  name="area"
                  value={listingFields.area}
                  onChange={(event) => updateListingField("area", event.target.value)}
                  placeholder="例如：42㎡"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="floor">楼层</Label>
                <Input
                  id="floor"
                  name="floor"
                  value={listingFields.floor}
                  onChange={(event) => updateListingField("floor", event.target.value)}
                  placeholder="例如：6/18 层"
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="address">房源位置</Label>
                <Input
                id="address"
                name="address"
                value={listingFields.address}
                onChange={(event) => updateListingField("address", event.target.value)}
                placeholder="例如：深圳南山科苑南路腾讯滨海大厦附近 / 徐汇万体馆某小区"
              />
              <p className="text-xs leading-5 text-muted-foreground">
                尽量写到小区、楼栋、写字楼、门牌或明确地标。只填“科技园”“市中心”时，路线和周边数据可能查不到。
              </p>
            </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="description">房源描述</Label>
                <Textarea
                  id="description"
                  name="description"
                  value={listingFields.description}
                  onChange={(event) => updateListingField("description", event.target.value)}
                  placeholder="粘贴中介描述、房东承诺、费用说明、你担心的问题..."
                />
              </div>
            </div>
          </TabsContent>
          <TabsContent value="upload">
            <div
              className="rounded-lg border border-dashed border-border bg-secondary p-5"
              onDragOver={(event) => event.preventDefault()}
              onDrop={handleDrop}
            >
              <div className="grid gap-5 lg:grid-cols-[0.72fr_0.28fr]">
                <div className="flex min-h-[236px] flex-col items-center justify-center text-center">
                  <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-md bg-primary/15 text-primary">
                    <UploadCloud className="h-7 w-7" />
                  </div>
                  <h3 className="text-lg font-semibold">上传截图补充信息</h3>
                  <p className="mt-3 max-w-md text-sm leading-6 text-muted-foreground">
                    支持房源截图、中介聊天截图、房屋照片。上传后可以提取租金、面积、地址和费用说明，但评估前仍以你确认后的信息为准。
                  </p>
                  <div className="mt-6 flex flex-col gap-2 sm:flex-row">
                    <Label className="inline-flex h-10 cursor-pointer items-center justify-center rounded-md border border-border bg-secondary px-4 py-2 text-sm font-medium transition-colors hover:bg-muted">
                      选择图片
                      <input
                        type="file"
                        accept="image/*"
                        className="sr-only"
                        onChange={handleFileChange}
                      />
                    </Label>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={handleExtractScreenshot}
                      disabled={
                        !screenshotDataUrl ||
                        extractState === "extracting" ||
                        !appSettings.screenshotExtractionEnabled
                      }
                    >
                      {extractState === "extracting" ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <SearchCheck className="mr-2 h-4 w-4" />
                      )}
                      {extractState === "extracting" ? "读取中" : "读取截图信息"}
                    </Button>
                  </div>
                  {!appSettings.screenshotExtractionEnabled ? (
                    <p className="mt-3 text-xs leading-5 text-amber-700">
                      设置页已关闭截图读取。截图仍可作为你手动确认的材料，住哪儿不会读取截图内容。
                    </p>
                  ) : null}
                  {screenshot ? (
                    <div className="mt-4 inline-flex max-w-full items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1 text-xs text-emerald-700">
                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{screenshot.name}</span>
                    </div>
                  ) : null}
                </div>

                <div className="min-w-0">
                  {screenshotDataUrl ? (
                    <div className="overflow-hidden rounded-md border border-border bg-secondary/70">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={screenshotDataUrl}
                        alt="房源截图预览"
                        className="h-44 w-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="flex h-44 items-center justify-center rounded-md border border-border bg-secondary/60 text-muted-foreground">
                      <div className="text-center">
                        <ImageIcon className="mx-auto mb-2 h-6 w-6" />
                        <p className="text-xs">截图预览</p>
                      </div>
                    </div>
                  )}
                  <ExtractionSummary result={extractResult} state={extractState} />
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </Card>

      <Card className="p-6">
        <div className="mb-6">
          <p className="text-sm text-primary/80">
            第二步
          </p>
          <h2 className="mt-2 text-2xl font-semibold">把判断尺调准</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            真实痛点通常藏在约束里：城市、收入、预算、通勤、生活方式和无法妥协的风险。
          </p>
        </div>

        <RuntimeStatusPanel providers={providers} decision={decisionFields} />

        <ApiUsageGuardrail
          mode="analyze"
          className="mb-5"
          hasScreenshot={Boolean(screenshotDataUrl)}
          hasAddress={Boolean(listingFields.address.trim())}
          hasWorkplace={Boolean(decisionFields.workplace.trim())}
        />

        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="city">目标城市</Label>
              <Input
                id="city"
                name="city"
                value={decisionFields.city}
                onChange={(event) => updateDecisionField("city", event.target.value)}
                placeholder="例如：上海 / 深圳 / 成都"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="income">税后月收入</Label>
              <Input
                id="income"
                name="income"
                value={decisionFields.income}
                onChange={(event) => updateDecisionField("income", event.target.value)}
                placeholder="例如：18000 元/月"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="workplace">工作地点</Label>
            <Input
              id="workplace"
              name="workplace"
              value={decisionFields.workplace}
              onChange={(event) => updateDecisionField("workplace", event.target.value)}
              placeholder="例如：上海徐家汇港汇恒隆 / 深圳南山腾讯滨海大厦"
            />
            <p className="text-xs leading-5 text-muted-foreground">
              尽量填公司楼宇、园区、地铁站或明确地标，后续通勤时间会更接近真实情况。
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="budget">预算上限</Label>
              <Input
                id="budget"
                name="budget"
                value={decisionFields.budget}
                onChange={(event) => updateDecisionField("budget", event.target.value)}
                placeholder="例如：6500 元/月"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="commute">通勤上限</Label>
              <Input
                id="commute"
                name="commuteLimit"
                value={decisionFields.commuteLimit}
                onChange={(event) => updateDecisionField("commuteLimit", event.target.value)}
                placeholder="例如：45 分钟"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fixed-cost">其他固定支出</Label>
              <Input
                id="fixed-cost"
                name="fixedCost"
                value={decisionFields.fixedCost}
                onChange={(event) => updateDecisionField("fixedCost", event.target.value)}
                placeholder="例如：3000 元/月"
              />
            </div>
          </div>
          <div className="space-y-3">
            <Label>居住偏好</Label>
            <PreferenceSelector value={preferences} onChange={setPreferences} />
          </div>
        </div>
      </Card>

      <Card className="p-6 xl:col-span-2">
        <div className="mb-6">
          <p className="text-sm text-primary/80">
            第三步
          </p>
          <h2 className="mt-2 text-2xl font-semibold">生活配套补充</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
            可选填写。它会直接影响报告里的生活配套评分，尤其适合你已经看过房、知道买菜远、药店远、夜路暗或楼下噪音的情况。
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <div className="space-y-2">
            <Label htmlFor="life-radius-minutes">目标生活配套</Label>
            <Input id="life-radius-minutes" name="lifeRadiusMinutes" placeholder="例如：15 分钟" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="grocery-minutes">最近买菜</Label>
            <Input id="grocery-minutes" name="groceryMinutes" placeholder="例如：8 分钟" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="restaurant-count">常用餐饮数量</Label>
            <Input id="restaurant-count" name="restaurantCount" placeholder="例如：6 个" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pharmacy-minutes">最近药店</Label>
            <Input id="pharmacy-minutes" name="pharmacyMinutes" placeholder="例如：7 分钟" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="hospital-minutes">最近医疗</Label>
            <Input id="hospital-minutes" name="hospitalMinutes" placeholder="例如：25 分钟" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="parcel-minutes">快递点</Label>
            <Input id="parcel-minutes" name="parcelMinutes" placeholder="例如：5 分钟" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="laundry-minutes">洗衣维修</Label>
            <Input id="laundry-minutes" name="laundryMinutes" placeholder="例如：12 分钟" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="gym-minutes">运动健身</Label>
            <Input id="gym-minutes" name="gymMinutes" placeholder="例如：18 分钟" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="park-minutes">公园散步</Label>
            <Input id="park-minutes" name="parkMinutes" placeholder="例如：20 分钟" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="night-lighting">夜间照明</Label>
            <select
              id="night-lighting"
              name="nightLighting"
              defaultValue=""
              className="h-11 w-full rounded-md border border-input bg-secondary px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">不确定</option>
              <option value="good">较好</option>
              <option value="normal">一般</option>
              <option value="poor">偏弱</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="cooking-frequency">做饭频率</Label>
            <select
              id="cooking-frequency"
              name="cookingFrequency"
              defaultValue=""
              className="h-11 w-full rounded-md border border-input bg-secondary px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">按偏好判断</option>
              <option value="often">经常做饭</option>
              <option value="sometimes">偶尔做饭</option>
              <option value="rarely">很少做饭</option>
            </select>
          </div>
          <label
            htmlFor="late-food-available"
            className="flex items-start gap-3 rounded-md border border-border bg-secondary p-4 md:col-span-2 xl:col-span-4"
          >
            <Checkbox
              id="late-food-available"
              name="lateFoodAvailable"
              defaultChecked
              className="mt-0.5"
            />
            <span className="min-w-0">
              <span className="block text-sm font-medium">22 点后仍有便利店或基础餐食</span>
              <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                加班晚归、生病和下雨时，夜间基础补给会明显影响这套房能不能长期住。
              </span>
            </span>
          </label>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="noise-sources">噪音或气味源</Label>
            <Input
              id="noise-sources"
              name="noiseSources"
              placeholder="例如：主干道、楼下烧烤、垃圾站、施工、菜场"
            />
          </div>
          <div className="space-y-2 md:col-span-2 xl:col-span-3">
            <Label htmlFor="lifestyle">你的生活方式</Label>
            <Textarea
              id="lifestyle"
              name="lifestyle"
              className="min-h-[96px]"
              placeholder="例如：工作日下班晚，经常做饭，周末希望运动，不想每天靠外卖。"
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="life-notes">生活配套备注</Label>
            <Textarea
              id="life-notes"
              name="lifeNotes"
              className="min-h-[96px]"
              placeholder="例如：白天看着安静，但担心晚上买菜、夜路和楼下噪音。"
            />
          </div>
        </div>

        <AnalysisPreflightPanel
          listing={listingFields}
          decision={decisionFields}
          preferences={preferences}
          providers={providers}
          hasScreenshot={Boolean(screenshotDataUrl)}
          extractResult={extractResult}
        />

        <FieldVerificationPanel
          items={verificationItems}
          hasScreenshot={Boolean(screenshotDataUrl)}
          extractResult={extractResult}
        />

        <AfterEvaluationPanel saveReportHistory={appSettings.saveReportHistory} />

        <div
          className={`mt-6 rounded-md border p-3 text-sm leading-6 ${
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
            <WandSparkles className="mr-2 h-5 w-5" />
          )}
          {state === "loading" ? "正在评估房源" : "评估房源"}
        </Button>
      </Card>
    </form>
  );
}

function AfterEvaluationPanel({ saveReportHistory }: { saveReportHistory: boolean }) {
  const items: Array<{
    icon: LucideIcon;
    label: string;
    title: string;
    description: string;
  }> = [
    {
      icon: CheckCircle2,
      label: "报告结论",
      title: "值不值得继续看",
      description: "看通勤、预算、舒适度、材料和付款风险，不只看房租。",
    },
    {
      icon: FileSearch,
      label: "房源记录",
      title: saveReportHistory ? "保存到同一套房" : "本次只看当前报告",
      description: saveReportHistory
        ? "后面付款、合同、交割、维修和押金都能接着确认。"
        : "你关闭了报告历史保存，结果会留在当前浏览器会话里。",
    },
    {
      icon: MapPinned,
      label: "多房源对比",
      title: "和备选房源放一起看",
      description: "按月成本、通勤损耗、签约风险和居住舒适度排序。",
    },
    {
      icon: WalletCards,
      label: "付款前确认",
      title: "先别急着转账",
      description: "把收款主体、合同、授权、退款条件和收据要求说清楚。",
    },
  ];

  return (
    <section className="mt-6 rounded-lg border border-border bg-secondary/55 p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-primary/80">评估后会得到什么</p>
          <h3 className="mt-1 text-lg font-semibold">评估后继续把判断做完整</h3>
        </div>
        <span className="rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground">
          报告 + 记录 + 对比 + 付款前确认
        </span>
      </div>
      <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.label}
              className="rounded-md border border-border bg-card/82 p-3 shadow-[0_12px_34px_oklch(var(--foreground)/0.04)]"
            >
              <div className="mb-3 flex items-center justify-between gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-md bg-secondary text-primary">
                  <Icon className="h-4 w-4" />
                </span>
                <span className="rounded-full border border-border bg-secondary/60 px-2 py-0.5 text-[11px] text-muted-foreground">
                  {item.label}
                </span>
              </div>
              <p className="text-sm font-semibold">{item.title}</p>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">
                {item.description}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function normalizeForCompare(value?: string) {
  return value?.replace(/\s+/g, "").trim().toLowerCase() ?? "";
}

function fieldVerificationState(
  item: FieldVerificationItem,
  hasScreenshot: boolean,
  extractResult: ExtractResult | null,
): FieldVerificationState {
  const value = item.value?.trim();
  if (!value) return "missing";

  const extractedValue = item.extractedValue?.trim();
  if (
    extractedValue &&
    normalizeForCompare(extractedValue) === normalizeForCompare(value)
  ) {
    return "extracted";
  }

  if (hasScreenshot && !extractResult) return "waiting";
  return "manual";
}

function fieldStateCopy(state: FieldVerificationState, critical: boolean) {
  if (state === "extracted") {
    return {
      label: "来自截图",
      icon: CheckCircle2,
      className: "border-emerald-300/25 bg-emerald-300/10 text-emerald-700",
    };
  }
  if (state === "manual") {
    return {
      label: "人工填写",
      icon: PenLine,
      className: "border-primary/25 bg-primary/10 text-primary",
    };
  }
  if (state === "waiting") {
    return {
      label: "待确认",
      icon: CircleDashed,
      className: "border-amber-300/25 bg-amber-300/10 text-amber-700",
    };
  }
  return {
    label: critical ? "还缺关键信息" : "建议补充",
    icon: AlertTriangle,
    className: critical
      ? "border-rose-300/25 bg-rose-300/10 text-rose-700"
      : "border-amber-300/25 bg-amber-300/10 text-amber-700",
  };
}

function FieldVerificationPanel({
  items,
  hasScreenshot,
  extractResult,
}: {
  items: FieldVerificationItem[];
  hasScreenshot: boolean;
  extractResult: ExtractResult | null;
}) {
  const states = items.map((item) => ({
    item,
    state: fieldVerificationState(item, hasScreenshot, extractResult),
  }));
  const missingCritical = states.filter(
    ({ item, state }) => item.critical && state === "missing",
  ).length;
  const extractedCount = states.filter(({ state }) => state === "extracted").length;
  const confirmedCount = states.filter(({ state }) => state !== "missing").length;

  return (
    <section className="mt-6 rounded-md border border-border bg-secondary p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground">
            <FileSearch className="h-3.5 w-3.5 text-primary" />
            信息确认
          </div>
          <h3 className="text-lg font-semibold">房源信息确认</h3>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
            先确认哪些信息能支撑结论。截图读取只作为凭据线索，最终报告仍以你确认后的表单为准。
          </p>
        </div>
        <div className="grid gap-2 text-sm sm:grid-cols-3 lg:min-w-[360px]">
          <MetricPill label="已确认" value={`${confirmedCount}/${items.length}`} />
          <MetricPill label="截图读取" value={`${extractedCount} 项`} />
          <MetricPill label="需要补充" value={`${missingCritical} 项`} urgent={missingCritical > 0} />
        </div>
      </div>

      <div className="mt-5 overflow-hidden rounded-md border border-border">
        <div className="grid grid-cols-[0.72fr_0.78fr_1fr] gap-3 border-b border-border bg-card px-4 py-3 text-xs font-medium text-muted-foreground max-md:hidden">
          <span>信息与来源</span>
          <span>当前值</span>
          <span>影响判断</span>
        </div>
        <div className="divide-y divide-border">
          {states.map(({ item, state }) => {
            const copy = fieldStateCopy(state, item.critical);
            const Icon = copy.icon;

            return (
              <div
                key={item.id}
                className="grid gap-3 px-4 py-4 text-sm md:grid-cols-[0.72fr_0.78fr_1fr] md:items-center"
              >
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <span className="font-medium">{item.label}</span>
                  <span
                    className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs ${copy.className}`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {copy.label}
                  </span>
                </div>
                <p className="min-w-0 break-words text-muted-foreground">
                  {item.value?.trim() || "未填写"}
                </p>
                <p className="text-xs leading-5 text-muted-foreground">{item.impact}</p>
              </div>
            );
          })}
        </div>
      </div>

      <p className="mt-3 text-xs leading-5 text-muted-foreground">
        {missingCritical
          ? "关键信息缺失时仍可评估，但结论会更像问题清单，不适合作为签约或付款依据。"
          : "关键信息已经具备，可以继续评估；签约前仍需在看房和官方查询中补充材料。"}
      </p>
    </section>
  );
}

function MetricPill({
  label,
  value,
  urgent,
}: {
  label: string;
  value: string;
  urgent?: boolean;
}) {
  return (
    <div
      className={`rounded-md border px-3 py-2 ${
        urgent
          ? "border-rose-300/25 bg-rose-300/10 text-rose-700"
          : "border-border bg-card text-muted-foreground"
      }`}
    >
      <p className="text-xs">{label}</p>
      <p className="mt-1 text-base font-semibold text-foreground">{value}</p>
    </div>
  );
}

function DecisionReadinessMetric({
  icon: Icon,
  label,
  value,
  detail,
  urgent,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  detail: string;
  urgent?: boolean;
}) {
  return (
    <div
      className={`rounded-md border p-3 ${
        urgent
          ? "border-amber-300/25 bg-amber-300/10"
          : "border-border bg-secondary"
      }`}
    >
      <div className="mb-2 flex items-center gap-2">
        <Icon className={urgent ? "h-4 w-4 text-amber-700" : "h-4 w-4 text-primary"} />
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
      <p className="text-base font-semibold">{value}</p>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">{detail}</p>
    </div>
  );
}

function RuntimeStatusPanel({
  providers,
  decision,
}: {
  providers: ProviderStatus[];
  decision: DecisionFields;
}) {
  const configuredCount = providers.filter((provider) => provider.configured).length;

  return (
    <div className="mb-5 rounded-md border border-border bg-secondary p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm font-medium">本次评估信息</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            {decision.city || "未填城市"} · {decision.workplace || "未填工作地"} · 预算上限 {decision.budget || "未填"} · 通勤上限 {decision.commuteLimit || "未填"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {providers.length ? (
            providers.map((provider) => (
              <span
                key={provider.id}
                className={`rounded-full border px-2.5 py-1 text-xs ${
                  provider.configured
                    ? "border-emerald-300/30 bg-emerald-300/10 text-emerald-700"
                    : "border-amber-300/30 bg-amber-300/10 text-amber-700"
                }`}
                  >
                {providerAbilityName(provider)} {provider.configured ? "可用" : "暂不可用"}
              </span>
            ))
          ) : (
            <span className="rounded-full border border-border bg-card px-2.5 py-1 text-xs text-muted-foreground">
              正在读取服务状态
            </span>
          )}
        </div>
      </div>
      <p className="mt-3 text-xs leading-5 text-muted-foreground">
        {providers.length
          ? `${configuredCount}/${providers.length} 项实时服务可用；暂不可用的部分会根据你填写的信息估算。`
          : "这里只查看当前可用服务，不会发起新的评估。"}
      </p>
      {providers.length ? (
        <div className="mt-3 grid gap-2 text-xs leading-5 text-muted-foreground sm:grid-cols-3">
          {providers.map((provider) => (
            <p key={`${provider.id}-quota`} className="min-w-0">
              <span className="font-medium text-foreground/80">{providerAbilityName(provider)}</span>
              {" · "}
              {provider.configured ? "可用" : "暂不可用"}
            </p>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function ExtractionSummary({
  result,
  state,
}: {
  result: ExtractResult | null;
  state: ExtractState;
}) {
  if (!result && state === "idle") {
    return (
      <div className="mt-3 rounded-md border border-border bg-secondary/60 p-3 text-xs leading-5 text-muted-foreground">
        读取后会先填入手动输入表单。请你再确认一遍，因为截图里的小字、遮挡和平台营销文案可能导致误读。
      </div>
    );
  }

  if (state === "extracting") {
    return (
      <div className="mt-3 rounded-md border border-primary/20 bg-primary/10 p-3 text-xs leading-5 text-primary">
        正在读取截图里的信息，只提取图片里明确可见的内容。
      </div>
    );
  }

  const fields = result?.fields ?? {};
  const chips = [
    fields.title ? `标题：${fields.title}` : "",
    fields.rent ? `租金：${fields.rent}` : "",
    fields.area ? `面积：${fields.area}` : "",
    fields.floor ? `楼层：${fields.floor}` : "",
    fields.address ? `位置：${fields.address}` : "",
    fields.city ? `城市：${fields.city}` : "",
  ].filter(Boolean);
  const warnings = [...(result?.warnings ?? []), ...(result?.missingFields ?? [])].slice(0, 3);

  return (
    <div
      className={`mt-3 rounded-md border p-3 text-xs leading-5 ${
        state === "done"
          ? "border-emerald-300/20 bg-emerald-300/10 text-emerald-900"
          : "border-amber-300/20 bg-amber-300/10 text-amber-900"
      }`}
    >
      <div className="mb-2 flex items-center gap-2">
        {state === "done" ? (
          <CheckCircle2 className="h-4 w-4" />
        ) : (
          <AlertTriangle className="h-4 w-4" />
        )}
        <p className="font-medium">
          {state === "done" ? "已读取到信息" : "需要手动确认"}
        </p>
      </div>
      {chips.length ? (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {chips.map((chip) => (
            <span
              key={chip}
              className="max-w-full truncate rounded-full border border-border bg-secondary/70 px-2 py-0.5"
            >
              {chip}
            </span>
          ))}
        </div>
      ) : null}
      <p>{result?.message ?? "请补充截图里无法确认的信息。"}</p>
      {typeof result?.confidence === "number" && result.confidence > 0 ? (
        <p className="mt-1 opacity-80">已读取到约 {Math.round(result.confidence * 100)}% 的可用信息。</p>
      ) : null}
      {warnings.length ? (
        <ul className="mt-2 space-y-1 opacity-90">
          {warnings.map((warning) => (
            <li key={warning}>· {warning}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

