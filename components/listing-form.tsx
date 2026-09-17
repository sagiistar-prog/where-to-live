"use client";

import { ChangeEvent, DragEvent, FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  WandSparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ListingScreenshotSection } from "@/components/listing-screenshot-section";
import { Textarea } from "@/components/ui/textarea";
import { PreferenceSelector } from "@/components/preference-selector";
import { AnalysisPreflightPanel } from "@/components/analysis-preflight-panel";
import {
  defaultUserPreferences,
  hasStoredUserPreferences,
  readUserPreferences,
  type UserPreferences,
} from "@/lib/user-preferences";
import { defaultAppSettings, readAppSettings, type AppSettings } from "@/lib/app-settings";
import { buildAnalysisPreflight } from "@/lib/analysis-preflight";
import {
  buildQuotaExceededHref,
  quotaExceededCode,
  quotaExceededHrefFromPayload,
} from "@/lib/quota-routing";

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

type ExtractResult = {
  mode?: "openai" | "fallback";
  fields?: Partial<ListingFields> & { city?: string };
  confidence?: number;
  missingFields?: string[];
  warnings?: string[];
  message?: string;
};
export type ListingFormInitialInput = Partial<ListingFields & DecisionFields> & {
  source?: string;
  sourceLabel?: string;
  sourceReportId?: string;
  reportContext?: string;
};

const quickScenarios: Array<{
  label: string;
  listing: Partial<ListingFields>;
  decision?: Partial<DecisionFields>;
}> = [
  {
    label: "中介催定金",
    listing: {
      title: "南山科技园一房一厅",
      rent: "6800，押一付三",
      area: "42 平",
      floor: "中楼层",
      address: "深圳南山区白石洲地铁站附近",
      description:
        "中介说今晚不交定金就没了，但合同、收款主体和退款条件还没确认。我担心定金退不回来。",
    },
    decision: {
      city: "深圳",
      workplace: "科技园",
      budget: "7000",
      commuteLimit: "45 分钟",
    },
  },
  {
    label: "通勤太远",
    listing: {
      title: "宝安中心整租一居",
      rent: "5200，押二付一",
      area: "38 平",
      floor: "高楼层",
      address: "深圳宝安中心地铁站附近",
      description:
        "房子看起来便宜，但到公司可能要换乘，担心长期通勤太累，也担心下雨和晚归不方便。",
    },
    decision: {
      city: "深圳",
      workplace: "南山科技园",
      budget: "6500",
      commuteLimit: "45 分钟",
    },
  },
  {
    label: "怕潮湿和噪音",
    listing: {
      title: "上海内环低楼层一居",
      rent: "5900，押一付三",
      area: "36 平",
      floor: "低楼层",
      address: "上海普陀区曹杨路附近",
      description:
        "房源价格能接受，但担心低楼层潮湿、临街噪音、采光不好，想判断还值不值得继续看。",
    },
    decision: {
      city: "上海",
      workplace: "静安寺",
      budget: "6200",
      commuteLimit: "45 分钟",
    },
  },
  {
    label: "合租边界不清",
    listing: {
      title: "杭州未来科技城合租主卧",
      rent: "3300，押一付一",
      area: "主卧 18 平",
      floor: "中楼层",
      address: "杭州余杭区良睦路地铁站附近",
      description:
        "这是合租房，租金合适，但室友、公共空间、费用分摊、押金和转租授权还没说清楚。",
    },
    decision: {
      city: "杭州",
      workplace: "未来科技城",
      budget: "4000",
      commuteLimit: "35 分钟",
    },
  },
];

const emptyListingFields: ListingFields = {
  title: "",
  rent: "",
  area: "",
  floor: "",
  address: "",
  description: "",
};

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
  const [listingFields, setListingFields] =
    useState<ListingFields>(emptyListingFields);
  const [decisionFields, setDecisionFields] = useState<DecisionFields>(
    decisionFieldsFromPreferences(defaultUserPreferences),
  );
  const screenshotVersion = useRef(0);
  const extractionRequest = useRef<AbortController | null>(null);
  const [uncachedReport, setUncachedReport] = useState<string | null>(null);
  useEffect(() => () => { screenshotVersion.current += 1; extractionRequest.current?.abort(); }, []);
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [screenshotDataUrl, setScreenshotDataUrl] = useState<string>();
  const [extractState, setExtractState] = useState<ExtractState>("idle");
  const [extractResult, setExtractResult] = useState<ExtractResult | null>(null);
  const [state, setState] = useState<SubmitState>("idle");
  const [message, setMessage] = useState<string>(
    "填写月租、预算、位置、工作地和你担心的问题；不确定的信息可以留空。",
  );

  useEffect(() => {
    const saved = readUserPreferences();
    const hasSavedPreferences = hasStoredUserPreferences();
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
        ? `已带入${initialInput.sourceLabel}的上下文；请确认租金、位置、工作地和预算。`
        : hasSavedPreferences
          ? "已带入设置页常用信息；请确认租金、位置、工作地和预算。"
          : "填写月租、预算、位置、工作地和你担心的问题；不确定的信息可以留空。",
    );
  }, [initialInput]);

  function updateListingField(field: keyof ListingFields, value: string) {
    setListingFields((current) => ({ ...current, [field]: value }));
  }

  function updateDecisionField(field: keyof DecisionFields, value: string) {
    setDecisionFields((current) => ({ ...current, [field]: value }));
  }

  function applyQuickScenario(scenario: (typeof quickScenarios)[number]) {
    setListingFields((current) => ({
      ...current,
      ...Object.fromEntries(
        Object.entries(scenario.listing).map(([key, value]) => [
          key,
          value || current[key as keyof ListingFields],
        ]),
      ) as Partial<ListingFields>,
    }));
    setDecisionFields((current) => ({
      ...current,
      ...Object.fromEntries(
        Object.entries(scenario.decision ?? {}).map(([key, value]) => [
          key,
          value || current[key as keyof DecisionFields],
        ]),
      ) as Partial<DecisionFields>,
    }));
    setMessage(`已填入“${scenario.label}”场景，可以直接生成房源体检，也可以继续修改。`);
  }

  async function handleScreenshotFile(file: File | null) {
    const version = ++screenshotVersion.current;
    extractionRequest.current?.abort();
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
      if (version !== screenshotVersion.current) return;
      setScreenshotDataUrl(dataUrl);
    } catch {
      if (version !== screenshotVersion.current) return;
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
      title: current.title.trim() ? current.title : fields.title?.trim() || "",
      rent: current.rent.trim() ? current.rent : fields.rent?.trim() || "",
      area: current.area.trim() ? current.area : fields.area?.trim() || "",
      floor: current.floor.trim() ? current.floor : fields.floor?.trim() || "",
      address: current.address.trim() ? current.address : fields.address?.trim() || "",
      description: current.description.trim() ? current.description : fields.description?.trim() || "",
    }));

    if (fields.city?.trim()) {
      setDecisionFields(current => ({ ...current, city: current.city.trim() ? current.city : fields.city!.trim() }));
    }
  }

  async function handleExtractScreenshot() {
    if (!appSettings.screenshotExtractionEnabled) {
      setExtractState("error");
      setMessage("当前没有开启截图读取。你仍可手动填写信息继续评估。");
      return;
    }

    if (!screenshotDataUrl) {
      setExtractState("error");
      setMessage("请先上传截图，再读取截图信息。");
      return;
    }

    const version = screenshotVersion.current;
    extractionRequest.current?.abort();
    const controller = new AbortController();
    extractionRequest.current = controller;
    setExtractState("extracting");
    setMessage("正在读取截图里的租金、面积、地址和费用说明...");

    try {
      const response = await fetch("/api/analyze/extract", {
        signal: controller.signal,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ screenshotDataUrl }),
      });
      const result = (await response.json()) as ExtractResult;
      if (version !== screenshotVersion.current || controller.signal.aborted) return;
      if (!response.ok) {
        throw new Error(result.message ?? "截图读取失败。");
      }

      setExtractResult(result);
      mergeExtractedFields(result);
      setExtractState(result.mode === "openai" ? "done" : "error");
      setMessage(
        result.mode === "openai"
          ? "已用截图补齐空白项；你填写的内容已保留，请核对后生成房源体检。"
          : result.message ?? "暂时读不出截图，请手动补充关键信息。",
      );
    } catch (error) {
      if (version !== screenshotVersion.current || controller.signal.aborted) return;
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
        const errorData = await response.json().catch(() => null);
        if (response.status === 402 && errorData?.error === quotaExceededCode) {
          const upgradeHref = quotaExceededHrefFromPayload({
            error: errorData.error,
            upgradeHref: typeof errorData.upgradeHref === "string" ? errorData.upgradeHref : undefined,
            from: "analyze",
          });
          setMessage(
            typeof errorData.message === "string"
              ? errorData.message
              : "本月判断额度已用完，需要调整方案后继续保存房源体检。",
          );
          router.push(upgradeHref ?? buildQuotaExceededHref({ from: "analyze" }));
          return;
        }

        const errorMessage =
          typeof errorData?.message === "string"
            ? errorData.message
            : "房源体检失败，请稍后重试。";
        throw new Error(errorMessage);
      }

      const result = await response.json();
      const isTemporaryReport = result.saved === false || !result.id;
      try { sessionStorage.setItem("zhunaar:last-report", JSON.stringify(result)); }
      catch {
        if (isTemporaryReport) {
          setUncachedReport(JSON.stringify(result, null, 2));
          setState("idle");
          setMessage("体检已生成，但浏览器无法保存。结果已保留在本页，请下载后再离开，无需重复提交。");
          return;
        }
      }
      setMessage(
        isTemporaryReport
          ? result.mode === "openai"
            ? "房源体检已生成。由于你关闭了报告历史保存，本次结果仅在当前浏览器会话保留，正在打开报告页。"
            : "已按现有信息生成评估。由于你关闭了报告历史保存，本次结果不会保存为房源记录。"
          : result.mode === "openai"
            ? "房源体检已保存为房源记录，正在打开报告。"
            : "已按已填写信息生成评估，并保存为房源记录，正在打开报告。",
      );
      router.push(!isTemporaryReport ? `/report/${result.id}` : "/report/latest");
    } catch (error) {
      setState("error");
      setMessage(error instanceof Error ? error.message : "房源体检失败，请稍后重试。");
    }
  }

  return (
    <form
      key={formSeedKey}
      onSubmit={handleSubmit}
      className="grid w-full max-w-3xl min-w-0 gap-6"
    >
      <input type="hidden" name="source" value={initialInput?.source ?? ""} />
      <input type="hidden" name="sourceReportId" value={initialInput?.sourceReportId ?? ""} />
      <input type="hidden" name="reportContext" value={initialInput?.reportContext ?? ""} />

      {uncachedReport ? (
        <section role="status" className="rounded-md border border-border bg-card p-5">
          <h2 className="font-semibold">体检结果已生成</h2>
          <p className="mt-2 text-sm text-muted-foreground">浏览器无法保存这份结果。可以展开查看或下载保留。</p>
          <Button type="button" className="mt-4" onClick={() => {
            const url = URL.createObjectURL(new Blob([uncachedReport], { type: "application/json" }));
            const link = document.createElement("a"); link.href = url; link.download = "housing-report.json"; link.click();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
          }}>下载体检结果</Button>
          <details className="mt-4"><summary>查看完整结果</summary><pre className="mt-3 whitespace-pre-wrap break-words text-sm">{uncachedReport}</pre></details>
        </section>
      ) : null}
      <Card className="w-full min-w-0 max-w-full p-5 sm:p-6">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm text-primary/80">
              房源体检
            </p>
            <h2 className="mt-2 text-2xl font-semibold">填写核心信息</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              先确认月租、预算、位置、工作地和主要顾虑，再判断这套房是否值得继续看。
            </p>
          </div>
          <Button type="submit" size="lg" className="shrink-0" disabled={state === "loading"}>
            {state === "loading" ? (
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            ) : (
              <WandSparkles className="mr-2 h-5 w-5" />
            )}
            {state === "loading" ? "正在判断" : "开始房源体检"}
          </Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label>快速填入</Label>
            <div className="flex max-w-full gap-2 overflow-x-auto pb-1">
              {quickScenarios.map((scenario) => (
                <button
                  key={scenario.label}
                  type="button"
                  onClick={() => applyQuickScenario(scenario)}
                  className="inline-flex min-h-9 shrink-0 items-center rounded-full border border-border bg-secondary/70 px-3 text-xs font-medium text-muted-foreground transition hover:border-primary/35 hover:bg-primary/10 hover:text-foreground"
                >
                  {scenario.label}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="rent">月租和押付</Label>
            <Input
              id="rent"
              name="rent"
              value={listingFields.rent}
              onChange={(event) => updateListingField("rent", event.target.value)}
              placeholder="填写月租金额和押付方式"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="budget">预算上限</Label>
            <Input
              id="budget"
              name="budget"
              value={decisionFields.budget}
              onChange={(event) => updateDecisionField("budget", event.target.value)}
              placeholder="填写可接受月租上限"
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="city">目标城市</Label>
            <Input
              id="city"
              name="city"
              value={decisionFields.city}
              onChange={(event) => updateDecisionField("city", event.target.value)}
              placeholder="填写租房城市"
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="address">房源位置</Label>
            <Input
              id="address"
              name="address"
              value={listingFields.address}
              onChange={(event) => updateListingField("address", event.target.value)}
              placeholder="填写小区、楼栋、写字楼、地铁站或明确地标"
            />
            <p className="text-xs leading-5 text-muted-foreground">
              尽量写到小区、楼栋、写字楼、门牌或明确地标。只填片区名时，通勤和周边判断会更粗略。
            </p>
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="workplace">工作地点</Label>
            <Input
              id="workplace"
              name="workplace"
              value={decisionFields.workplace}
              onChange={(event) => updateDecisionField("workplace", event.target.value)}
              placeholder="填写公司楼宇、园区、学校、地铁站或明确地标"
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="description">主要顾虑</Label>
            <Textarea
              id="description"
              name="description"
              value={listingFields.description}
              onChange={(event) => updateListingField("description", event.target.value)}
              placeholder="例如：中介催签、房东承诺、额外费用、噪音、潮湿、采光、退租或付款顾虑..."
            />
          </div>
        </div>

        <AnalysisPreflightPanel
          listing={listingFields}
          decision={decisionFields}
          preferences={preferences}
          hasScreenshot={Boolean(screenshotDataUrl)}
          extractResult={extractResult}
        />

        {state !== "idle" || extractState !== "idle" ? (
          <div
            className={`mt-6 rounded-md border p-3 text-sm leading-6 ${
              state === "error" || extractState === "error"
                ? "border-rose-300/20 bg-rose-300/10 text-rose-700"
                : "border-border bg-secondary text-muted-foreground"
            }`}
          >
            <div className="flex gap-2">
              {state === "error" || extractState === "error" ? (
                <AlertTriangle className="mt-1 h-4 w-4 shrink-0" />
              ) : (
                <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-primary" />
              )}
              <span>{message}</span>
            </div>
          </div>
        ) : null}

        <details className="mt-5 rounded-md border border-border bg-secondary/45 p-4">
          <summary className="cursor-pointer text-sm font-medium text-foreground">
            房源细节（选填）
          </summary>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <div className="space-y-2 sm:col-span-3">
              <Label htmlFor="title">房源标题</Label>
              <Input
                id="title"
                name="title"
                value={listingFields.title}
                onChange={(event) => updateListingField("title", event.target.value)}
                placeholder="填写房源名称或户型"
              />
            </div>
            <div className="grid gap-4 sm:col-span-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="area">面积</Label>
                <Input
                  id="area"
                  name="area"
                  value={listingFields.area}
                  onChange={(event) => updateListingField("area", event.target.value)}
                  placeholder="填写房源面积"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="floor">楼层</Label>
                <Input
                  id="floor"
                  name="floor"
                  value={listingFields.floor}
                  onChange={(event) => updateListingField("floor", event.target.value)}
                  placeholder="填写楼层信息"
                />
              </div>
            </div>
          </div>
        </details>

        <details className="mt-3 rounded-md border border-border bg-secondary/45 p-4">
          <summary className="cursor-pointer text-sm font-medium text-foreground">
            个人条件（选填）
          </summary>
          <div className="mt-4 space-y-5">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="income">税后月收入</Label>
                <Input
                  id="income"
                  name="income"
                  value={decisionFields.income}
                  onChange={(event) => updateDecisionField("income", event.target.value)}
                  placeholder="填写每月实际到手收入"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="commute">通勤上限</Label>
                <Input
                  id="commute"
                  name="commuteLimit"
                  value={decisionFields.commuteLimit}
                  onChange={(event) => updateDecisionField("commuteLimit", event.target.value)}
                  placeholder="填写可接受通勤上限"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fixed-cost">其他固定支出</Label>
                <Input
                  id="fixed-cost"
                  name="fixedCost"
                  value={decisionFields.fixedCost}
                  onChange={(event) => updateDecisionField("fixedCost", event.target.value)}
                  placeholder="填写其他固定支出"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>居住偏好</Label>
              <PreferenceSelector value={preferences} onChange={setPreferences} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="life-notes">补充说明</Label>
              <Textarea
                id="life-notes"
                name="lifeNotes"
                className="min-h-[104px]"
                placeholder="填写会影响长期居住的补充信息，例如噪音、采光、气味、夜间安全或做饭需求。"
              />
            </div>
          </div>
        </details>

        <ListingScreenshotSection
          screenshot={screenshot}
          screenshotDataUrl={screenshotDataUrl}
          extractState={extractState}
          extractResult={extractResult}
          screenshotExtractionEnabled={appSettings.screenshotExtractionEnabled}
          onFileChange={handleFileChange}
          onDrop={handleDrop}
          onExtractScreenshot={handleExtractScreenshot}
        />

        <div className="mt-5 flex flex-col gap-3 rounded-md border border-border bg-secondary/45 p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm leading-6 text-muted-foreground">
            核心信息确认后即可开始体检；选填内容可以之后再补。
          </p>
          <Button type="submit" size="lg" className="shrink-0" disabled={state === "loading"}>
            {state === "loading" ? (
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            ) : (
              <WandSparkles className="mr-2 h-5 w-5" />
            )}
            {state === "loading" ? "正在判断" : "开始房源体检"}
          </Button>
        </div>
      </Card>
    </form>
  );
}


