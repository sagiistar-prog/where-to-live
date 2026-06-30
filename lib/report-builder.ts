import { buildLifeRadius, type LifeRadiusResult } from "@/lib/life-radius";
import type { AnalysisPreflightResult } from "@/lib/analysis-preflight";
import type { ReportData, ReportStatus } from "@/lib/mock-data";

export type ListingAnalysisInput = {
  title?: string;
  rent?: string;
  area?: string;
  floor?: string;
  address?: string;
  description?: string;
  city?: string;
  income?: string;
  workplace?: string;
  budget?: string;
  commuteLimit?: string;
  fixedCost?: string;
  source?: string;
  sourceReportId?: string;
  reportContext?: string;
  lifeRadiusMinutes?: string;
  groceryMinutes?: string;
  restaurantCount?: string;
  pharmacyMinutes?: string;
  hospitalMinutes?: string;
  parcelMinutes?: string;
  laundryMinutes?: string;
  gymMinutes?: string;
  parkMinutes?: string;
  lateFoodAvailable?: boolean;
  nightLighting?: "good" | "normal" | "poor";
  cookingFrequency?: "often" | "sometimes" | "rarely";
  noiseSources?: string;
  lifestyle?: string;
  lifeNotes?: string;
  preferences: string[];
  screenshotDataUrl?: string;
  reportDepth?: "standard" | "deep-risk" | "pre-sign";
  saveReportHistory?: boolean;
  personalizationEnabled?: boolean;
  dataSourceSettings?: {
    amapDataEnabled?: boolean;
    weatherDataEnabled?: boolean;
    officialPromptEnabled?: boolean;
  };
  analysisPreflight?: AnalysisPreflightResult;
};

export type ExternalAnalysisContext = {
  dataQuality?: Array<{
    provider: "amap" | "qweather";
    feature: string;
    status: "live" | "fallback" | "missing_input" | "skipped_limit" | "failed";
    label: string;
    detail: string;
  }>;
  degradationNotes?: string[];
  listingLocation?: {
    formattedAddress?: string;
    location?: string;
    adcode?: string;
    citycode?: string;
  };
  workplaceLocation?: {
    formattedAddress?: string;
    location?: string;
    citycode?: string;
  };
  commute?: {
    durationMinutes?: number;
    walkingDistanceMeters?: number;
    segments?: number;
    summary?: string;
  };
  nearby?: {
    metroCount?: number;
    groceryCount?: number;
    medicalCount?: number;
    mallCount?: number;
  };
  weather?: {
    text?: string;
    temp?: string;
    feelsLike?: string;
    humidity?: string;
    precip?: string;
    windDir?: string;
    windScale?: string;
  };
};

export type GeneratedReportPayload = {
  id?: string;
  report: ReportData;
  mode: "openai" | "fallback";
  generatedAt: string;
  dataSources: string[];
  dataQuality?: ExternalAnalysisContext["dataQuality"];
  warnings: string[];
  analysisPreflight?: AnalysisPreflightResult;
};

function parseNumber(value?: string) {
  if (!value) return undefined;
  const match = value.replace(/,/g, "").match(/\d+(\.\d+)?/);
  return match ? Number(match[0]) : undefined;
}

function clampScore(score: number) {
  return Math.max(0, Math.min(100, Math.round(score)));
}

function statusFromScore(score: number): ReportStatus {
  if (score >= 80) return "recommend";
  if (score >= 62) return "caution";
  return "reject";
}

function statusCopy(status: ReportStatus) {
  if (status === "recommend") return "建议租";
  if (status === "reject") return "不建议租";
  return "谨慎考虑";
}

export function normalizeVisibleReportCopy(text: string) {
  return text
    .replaceAll("不能只看平台照片", "应结合现场确认")
    .replaceAll("报告可生成", "可以继续评估")
    .replaceAll("生成报告", "保存评估")
    .replaceAll("重新生成", "重新评估")
    .replaceAll("提交前信息确认", "提交前信息确认")
    .replaceAll("生成结果", "整理结果")
    .replaceAll("生成时间", "整理时间")
    .replaceAll("整理结果", "确认结果")
    .replaceAll("本工具", "这一步")
    .replaceAll("对应页面", "对应内容")
    .replaceAll("工具", "功能")
    .replaceAll("信息" + "已补", "信息完整度")
    .replaceAll("补充", "补充")
    .replaceAll("补充", "补充")
    .replaceAll("补充材料", "补充材料")
    .replaceAll("材料清单", "材料清单")
    .replaceAll("凭据记录", "材料记录")
    .replaceAll("待补充凭据", "待补充材料")
    .replaceAll("待补充信息", "待补充信息")
    .replaceAll("待补充材料", "待补充材料")
    .replaceAll("通勤信息待补充", "通勤信息待补充")
    .replaceAll("现金差额", "现金差额")
    .replaceAll("待补充项过大", "需要补充的材料太多")
    .replaceAll("待补充项较多", "需要补充的信息较多")
    .replaceAll("待补充项", "待补充信息")
    .replaceAll(`处理${"清单"}`, "确认事项")
    .replaceAll(`待${"办"}顺序`, "确认顺序")
    .replaceAll("下一步", "下一步")
    .replaceAll("可确认事项", "可确认事项")
    .replaceAll("确认事项", "确认事项")
    .replaceAll("处理" + "办法", "应对办法")
    .replaceAll("事项", "事项")
    .replaceAll("付款" + "底线", "付款咨询")
    .replaceAll("继续确认", "继续确认")
    .replaceAll("凭据", "材料")
    .replaceAll("未配置 " + "OPENAI" + "_API_KEY", "截图与合同自动整理暂不可用")
    .replaceAll("高德" + " Web 服务未配置", "位置与通勤信息会按已填写内容估算")
    .replaceAll("未配置 " + "AMAP" + "_WEB_SERVICE_KEY", "位置与通勤信息会按已填写内容估算")
    .replaceAll("未配置 " + "QWEATHER" + "_API_KEY", "居住舒适度会按城市气候和现场条件保守判断")
    .replaceAll("地址解析、路线通勤和周边生活信息 会按已填写信息估算", "地址解析、通勤路线和周边生活信息会按已填写信息估算")
    .replaceAll("跳过地址解析、通勤路线和周边生活信息，改用用户输入和已填写信息", "会按用户输入估算地址、通勤和周边生活")
    .replaceAll("通勤、周边生活信息 和天气定位只能按已填写信息估算", "通勤、周边生活和天气舒适度会按现有信息估算")
    .replaceAll("根据周边生活信息 数量估算", "根据周边生活信息数量估算")
    .replaceAll("地铁相关 周边生活信息", "地铁相关地点")
    .replaceAll("周边生活信息", "周边生活信息")
    .replaceAll("周边生活信息", "周边生活信息")
    .replaceAll("已填写信息", "已填写信息")
    .replaceAll("降级", "改用已填写信息");
}

function normalizeStringList(items?: string[]) {
  return items?.map(normalizeVisibleReportCopy) ?? [];
}

function normalizeReportSection(section: ReportData["commute"]) {
  return {
    title: normalizeVisibleReportCopy(section.title),
    points: normalizeStringList(section.points),
  };
}

function neutralSection(title: string, point: string): ReportData["commute"] {
  return {
    title,
    points: [point],
  };
}

const neutralReport: ReportData = {
  title: "候选房源体检报告",
  address: "地址待补充",
  status: "caution",
  conclusion: "信息还不完整，建议补充租金、通勤、付款和合同信息后再判断。",
  score: 60,
  scores: [
    { label: "通勤评分", score: 60, summary: "需要补充工作地、通勤方式和可接受时长。" },
    { label: "价格评分", score: 60, summary: "需要补充月租、收入和固定支出。" },
    { label: "配套评分", score: 60, summary: "需要补充片区和日常生活需求。" },
    { label: "舒适度评分", score: 60, summary: "需要补充楼层、朝向、噪音和潮湿情况。" },
    { label: "风险评分", score: 60, summary: "需要补充出租主体、付款方式和合同条款。" },
  ],
  commute: neutralSection("通勤判断", "补充工作地、通勤方式和可接受时长后再判断。"),
  amenities: neutralSection("生活配套", "补充片区、步行范围和日常生活需求后再判断。"),
  lifeRadius: neutralSection("生活半径", "补充买菜、就医、快递和夜间路线后再判断。"),
  comfort: neutralSection("居住舒适度", "补充楼层、朝向、采光、噪音和潮湿情况后再判断。"),
  livingCost: neutralSection("月度成本", "补充月租、收入、固定支出和首笔付款后再判断。"),
  contractRisk: neutralSection("合同与付款风险", "补充出租主体、付款方式、押金和合同条款后再判断。"),
  visitChecklist: ["补充地址、租金、通勤、付款和合同信息后再生成看房清单。"],
  finalAdvice: "先补齐关键信息，再决定是否看房、付款或签约。",
};

function reportDepthProfile(depth: ListingAnalysisInput["reportDepth"]) {
  if (depth === "pre-sign") {
    return {
      label: "签约前确认",
      scoreAdjustment: -5,
      conclusionNote: "本次按签约前确认口径整理，评分会更保守，并把付款、授权、合同和待补充材料作为必须确认。",
      contractRiskPoints: [
        "签约前必须确认合同主体、收款主体、身份证明、出租授权和房源地址完全一致；任一项不一致都不建议付款。",
        "付款前要求对方给出可保存的押金退还、维修责任、提前退租、转租授权和费用明细条款，不接受只在聊天里口头承诺。",
      ],
      visitChecklistItems: [
        "签约前把身份证明、产权或转租授权、收款账户、合同主体逐项拍照或留存电子版。",
        "付款备注写清房源地址、款项用途、可退条件和日期，避免只写“房租”或“定金”。",
      ],
      finalAdvicePrefix: "按签约前确认口径，未补充授权、材料、付款和合同必须确认前不要付款。",
    };
  }

  if (depth === "deep-risk") {
    return {
      label: "深度风险提示",
      scoreAdjustment: -3,
      conclusionNote: "本次按深度风险提示口径整理，会优先说清低频但损失较高的押金、维修、噪音、潮湿和授权风险。",
      contractRiskPoints: [
        "把押金扣款、维修费用垫付、家电自然损耗、转租授权和服务费边界列为重点确认项。",
        "如果对方催促当天付款，应先做付款咨询并整理材料清单，再根据合同、收款信息和退款条件决定。",
      ],
      visitChecklistItems: [
        "看房时补拍墙角、柜体背后、卫生间地漏、窗边和空调排水，作为潮湿与旧损坏记录。",
        "晚高峰和夜间各确认一次楼道照明、门禁、电梯等待和最后一公里路线。",
      ],
      finalAdvicePrefix: "按深度风险提示口径，这套房必须补充高损失风险材料，再决定是否继续。",
    };
  }

  return {
    label: "标准评估",
    scoreAdjustment: 0,
    conclusionNote: "本次按标准评估口径整理，重点判断预算、通勤、生活配套、舒适度和基础签约风险。",
    contractRiskPoints: [],
    visitChecklistItems: [],
    finalAdvicePrefix: "",
  };
}

function officialPromptProfile(enabled: boolean | undefined) {
  if (enabled === false) {
    return {
      contractRiskPoints: [],
      visitChecklistItems: [],
      finalAdviceSuffix: "",
    };
  }

  return {
    contractRiskPoints: [
      "备案入口、出租权、合同示范文本和公共服务影响要回到住建、政务服务或市场监管等官方公开入口确认；查不到或对方不配合时不建议付款。",
    ],
    visitChecklistItems: [
      "看房后保存官方备案入口、示范合同对照页、出租方授权材料和对方回复截图，作为签约前材料。",
    ],
    finalAdviceSuffix:
      "官方入口能查询的事项应以可核验信息判断；签约前至少确认出租权、备案办理办法、合同要求和付款主体。",
  };
}

function personalizationProfile(enabled: boolean | undefined, preferences: string[]) {
  if (!enabled || !preferences.length) {
    return {
      contractRiskPoints: [],
      visitChecklistItems: [],
      finalAdviceSuffix: "",
    };
  }

  const focus = preferences.slice(0, 4).join("、");
  const contractRiskPoints = [
    preferences.includes("养宠")
      ? "你标记了养宠，必须把宠物入住、清洁责任、损坏赔付和押金扣款边界写进合同或补充约定。"
      : "",
    preferences.includes("经常做饭")
      ? "你经常做饭，厨房排烟、燃气安全、下水和公共清洁责任要作为长期居住成本确认。"
      : "",
    preferences.includes("独居")
      ? "你标记了独居，签约前要把门锁更换、门禁权限、快递外卖送达边界和房东进入房屋规则说清楚。"
      : "",
  ].filter(Boolean);

  return {
    contractRiskPoints,
    visitChecklistItems: [
      `按你的长期偏好重点确认：${focus}。这些会长期影响睡眠、预算和安全感。`,
    ],
    finalAdviceSuffix: `本次已按你的长期偏好强化判断，优先确认 ${focus} 是否真的满足。`,
  };
}

function deriveMinutesFromPoi(count: number | undefined, close: number, normal: number, far: number) {
  if (count === undefined) return normal;
  if (count >= 6) return close;
  if (count >= 2) return normal;
  return far;
}

function deriveRestaurantCount(context: ExternalAnalysisContext) {
  if (!context.nearby) return 6;
  return Math.max(2, Math.min(12, (context.nearby.groceryCount ?? 0) + (context.nearby.mallCount ?? 0)));
}

function valueOrFallback(value: string | undefined, fallback: number) {
  return parseNumber(value) ?? fallback;
}

function buildLifeRadiusForReport(
  input: ListingAnalysisInput,
  context: ExternalAnalysisContext,
): LifeRadiusResult {
  const description = `${input.description ?? ""} ${input.reportContext ?? ""} ${input.floor ?? ""} ${input.address ?? ""}`;
  const hasNearby = Boolean(context.nearby);
  const inferredNoiseSources =
    input.description && /临街|高架|主干道|夜市|烧烤|酒吧|施工|垃圾|菜场|商圈/.test(input.description)
      ? input.description
      : input.preferences.includes("怕吵")
        ? "噪音源待确认，重点观察临街、主干道、餐饮和垃圾清运。"
        : "暂无明确噪音源，仍需晚上再看一次。";
  const groceryFallback = hasNearby
    ? deriveMinutesFromPoi(context.nearby?.groceryCount, 8, 12, 18)
    : 12;
  const pharmacyFallback = hasNearby
    ? deriveMinutesFromPoi(context.nearby?.medicalCount, 8, 14, 20)
    : 10;
  const hospitalFallback = hasNearby
    ? deriveMinutesFromPoi(context.nearby?.medicalCount, 22, 30, 42)
    : 25;
  const lateFoodFallback = hasNearby
    ? (context.nearby?.groceryCount ?? 0) + (context.nearby?.mallCount ?? 0) >= 3
    : true;

  return buildLifeRadius({
    city: input.city,
    listingTitle: input.title,
    radiusMinutes: valueOrFallback(input.lifeRadiusMinutes, 15),
    groceryMinutes: valueOrFallback(input.groceryMinutes, groceryFallback),
    restaurantCount: valueOrFallback(input.restaurantCount, deriveRestaurantCount(context)),
    pharmacyMinutes: valueOrFallback(input.pharmacyMinutes, pharmacyFallback),
    hospitalMinutes: valueOrFallback(input.hospitalMinutes, hospitalFallback),
    parcelMinutes: valueOrFallback(input.parcelMinutes, 10),
    laundryMinutes: valueOrFallback(input.laundryMinutes, 14),
    gymMinutes: valueOrFallback(input.gymMinutes, input.preferences.includes("必须近地铁") ? 18 : 20),
    parkMinutes: valueOrFallback(input.parkMinutes, 22),
    lateFoodAvailable: input.lateFoodAvailable ?? lateFoodFallback,
    nightLighting:
      input.nightLighting ??
      (/暗|无门禁|城中村|巷|低楼层|一楼|1楼/.test(description) || input.preferences.includes("独居")
        ? "normal"
        : "good"),
    noiseSources: input.noiseSources?.trim() || inferredNoiseSources,
    cookingFrequency: input.cookingFrequency ?? (input.preferences.includes("经常做饭") ? "often" : "sometimes"),
    lifestyle: input.lifestyle?.trim() || (input.preferences.length
      ? `居住偏好：${input.preferences.join("、")}。`
      : "未填写细分生活方式，按普通工作日和周末生活判断。"),
    notes: input.lifeNotes?.trim() || (hasNearby
      ? "已结合周边生活点数量做生活配套估算，仍需现场实测距离和营业时间。"
      : "未查询到实时周边生活信息，本段按用户输入保守估算。"),
  });
}

function lifeRadiusSection(lifeRadius: LifeRadiusResult) {
  const weakCategories = lifeRadius.categories
    .filter((item) => item.status !== "recommend")
    .map((item) => `${item.label} ${item.score} 分`)
    .slice(0, 3);

  return {
    title: "生活配套与夜间可用性",
    points: [
      `${lifeRadius.verdict}，长期好住评分 ${lifeRadius.score} 分；${lifeRadius.summary}`,
      weakCategories.length
        ? `主要短板：${weakCategories.join("、")}。`
        : "买菜、医疗、快递、夜间补给和恢复空间没有明显核心短板。",
      lifeRadius.blockers[0] ?? "暂无硬性生活配套待确认事项，但仍需做夜间和周末实测。",
      lifeRadius.fieldChecks[0],
      lifeRadius.negotiationLevers[0],
    ],
  };
}

export function normalizeReportData(report: ReportData): ReportData {
  const normalizedScore = clampScore(Number.isFinite(report.score) ? report.score : neutralReport.score);
  const status = report.status ?? statusFromScore(normalizedScore);
  return {
    ...neutralReport,
    ...report,
    title: normalizeVisibleReportCopy(report.title || neutralReport.title),
    address: normalizeVisibleReportCopy(report.address || neutralReport.address),
    conclusion: normalizeVisibleReportCopy(report.conclusion || neutralReport.conclusion),
    status,
    score: normalizedScore,
    scores: (report.scores?.length ? report.scores : neutralReport.scores).map((item) => ({
      ...item,
      label: normalizeVisibleReportCopy(item.label),
      summary: normalizeVisibleReportCopy(item.summary),
    })),
    commute: normalizeReportSection(report.commute ?? neutralReport.commute),
    amenities: normalizeReportSection(report.amenities ?? neutralReport.amenities),
    lifeRadius: report.lifeRadius ? normalizeReportSection(report.lifeRadius) : neutralReport.lifeRadius,
    comfort: normalizeReportSection(report.comfort ?? neutralReport.comfort),
    livingCost: normalizeReportSection(report.livingCost ?? neutralReport.livingCost),
    contractRisk: normalizeReportSection(report.contractRisk ?? neutralReport.contractRisk),
    visitChecklist: report.visitChecklist?.length
      ? normalizeStringList(report.visitChecklist)
      : neutralReport.visitChecklist,
    finalAdvice: normalizeVisibleReportCopy(report.finalAdvice || neutralReport.finalAdvice),
  };
}

export function normalizeGeneratedReportPayload(
  payload: GeneratedReportPayload,
): GeneratedReportPayload {
  return {
    ...payload,
    report: normalizeReportData(payload.report),
    dataSources: normalizeStringList(payload.dataSources),
    dataQuality: payload.dataQuality?.map((item) => ({
      ...item,
      feature: normalizeVisibleReportCopy(item.feature),
      label: normalizeVisibleReportCopy(item.label),
      detail: normalizeVisibleReportCopy(item.detail),
    })),
    warnings: normalizeStringList(payload.warnings),
    analysisPreflight: payload.analysisPreflight
      ? {
          ...payload.analysisPreflight,
          label: normalizeVisibleReportCopy(payload.analysisPreflight.label),
          description: normalizeVisibleReportCopy(payload.analysisPreflight.description),
          checks: payload.analysisPreflight.checks.map((check) => ({
            ...check,
            message: normalizeVisibleReportCopy(check.message),
          })),
          missingCritical: normalizeStringList(payload.analysisPreflight.missingCritical),
          missingUseful: normalizeStringList(payload.analysisPreflight.missingUseful),
          degradation: normalizeStringList(payload.analysisPreflight.degradation),
          riskPrompts: normalizeStringList(payload.analysisPreflight.riskPrompts),
        }
      : undefined,
  };
}

export function buildFallbackReport(
  input: ListingAnalysisInput,
  context: ExternalAnalysisContext,
): ReportData {
  const rent = parseNumber(input.rent);
  const income = parseNumber(input.income);
  const budget = parseNumber(input.budget);
  const commuteLimit = parseNumber(input.commuteLimit);
  const commuteMinutes = context.commute?.durationMinutes;
  const fixedCost = parseNumber(input.fixedCost) ?? 0;
  const lifeRadius = buildLifeRadiusForReport(input, context);
  const depthProfile = reportDepthProfile(input.reportDepth ?? "standard");
  const officialProfile = officialPromptProfile(input.dataSourceSettings?.officialPromptEnabled);
  const preferenceProfile = personalizationProfile(input.personalizationEnabled, input.preferences);
  const officialAdviceSuffix = officialProfile.finalAdviceSuffix
    ? ` ${officialProfile.finalAdviceSuffix}`
    : "";
  const preferenceAdviceSuffix = preferenceProfile.finalAdviceSuffix
    ? ` ${preferenceProfile.finalAdviceSuffix}`
    : "";
  const contextNote = input.reportContext
    ? ` 已带入上一步记录：${input.reportContext.split(/\n/)[0]}`
    : "";
  const riskText = `${input.description ?? ""} ${input.reportContext ?? ""}`;

  const rentPressure = rent && income ? (rent + fixedCost * 0.25) / income : undefined;
  let score = 78 + depthProfile.scoreAdjustment;

  if (rent && budget && rent > budget) score -= 12;
  if (rentPressure && rentPressure > 0.4) score -= 12;
  if (rentPressure && rentPressure <= 0.3) score += 6;
  if (commuteMinutes && commuteLimit && commuteMinutes > commuteLimit) score -= 14;
  if (commuteMinutes && commuteMinutes <= 35) score += 5;
  if (input.preferences.includes("必须近地铁") && !context.nearby?.metroCount) score -= 8;
  if (input.preferences.includes("怕潮湿")) score -= 4;
  if (input.preferences.includes("怕吵") && /临街|高架|主干道|商圈/.test(riskText)) {
    score -= 8;
  }
  if (/二房东|转租|押金不退|服务费|中介费|定金/.test(riskText)) {
    score -= 8;
  }
  if (lifeRadius.score < 52) score -= 8;
  if (lifeRadius.score >= 78) score += 4;

  const finalScore = clampScore(score);
  const status = statusFromScore(finalScore);
  const title = input.title || "候选房源体检报告";
  const address =
    context.listingLocation?.formattedAddress ||
    input.address ||
    "暂未识别到完整地址，建议补充小区名或附近地标。";
  const commuteText = commuteMinutes
    ? `预计通勤约 ${commuteMinutes} 分钟。`
    : "通勤路线还不够明确，建议补充更精确的房源地址和工作地点。";
  const rentText = rent
    ? `月租金约 ${rent.toLocaleString()} 元。`
    : "暂未识别到明确月租金。";
  const pressureText =
    rentPressure && income
      ? `租金和固定支出压力约占税后收入 ${(rentPressure * 100).toFixed(0)}%。`
      : "暂未填写税后收入，无法判断预算压力。";

  return normalizeReportData({
    title,
    address,
    status,
    conclusion: `${statusCopy(status)}。${rentText}${commuteText}${pressureText}${depthProfile.conclusionNote}${contextNote} 这份报告已根据你输入的预算、通勤上限和居住偏好形成初步判断；若要提高准确度，建议补充截图、小区名、楼层、朝向和合同条款。`,
    score: finalScore,
    scores: [
      {
        label: "通勤评分",
        score: clampScore(commuteMinutes ? 95 - Math.max(0, commuteMinutes - 25) : 68),
        summary: commuteText,
      },
      {
        label: "价格评分",
        score: clampScore(rentPressure ? 100 - rentPressure * 120 : 70),
        summary: pressureText,
      },
      {
        label: "配套评分",
        score: clampScore(
          62 +
            (context.nearby?.metroCount ? 8 : 0) +
            (context.nearby?.groceryCount ? 7 : 0) +
            (context.nearby?.medicalCount ? 5 : 0),
        ),
        summary: "根据周边生活点数量估算日常便利度，后续可加入更精细的步行距离和营业时间。",
      },
      {
        label: "生活配套评分",
        score: lifeRadius.score,
        summary: `${lifeRadius.verdict}。${lifeRadius.coreGapCount ? `存在 ${lifeRadius.coreGapCount} 个核心短板。` : "暂无核心短板。"}`,
      },
      {
        label: "舒适度评分",
        score: clampScore(76 - (input.preferences.includes("怕潮湿") ? 8 : 0)),
        summary: context.weather?.humidity
          ? `当前湿度 ${context.weather.humidity}%，需结合楼层、朝向和通风现场确认。`
          : "先按城市气候和用户偏好做保守判断，看房时再确认通风、潮湿、采光和噪音。",
      },
      {
        label: "风险评分",
        score: clampScore(/二房东|转租|押金|定金|服务费/.test(riskText) ? 62 : 78),
        summary: "重点确认出租主体、押金退还、维修责任、转租授权和费用边界。",
      },
    ],
    commute: {
      title: "通勤时间",
      points: [
        commuteText,
        commuteLimit
          ? `你的通勤上限是 ${commuteLimit} 分钟，超过上限会直接影响长期稳定性。`
          : "建议填写通勤上限，住哪儿才能判断这个房子是否牺牲过多生活时间。",
        "晚归、雨天、最后一公里步行和末班车风险应在看房前单独确认。",
      ],
    },
    amenities: {
      title: "周边配套",
      points: [
        `地铁相关地点：${context.nearby?.metroCount ?? 0} 个；生活购物：${context.nearby?.groceryCount ?? 0} 个；医疗：${context.nearby?.medicalCount ?? 0} 个。`,
        "配套要看是否适合日常生活，餐饮密集也可能意味着夜间噪音和人流。",
        "建议现场步行 10 分钟验证便利店、菜场、快递点和夜间照明。",
      ],
    },
    lifeRadius: lifeRadiusSection(lifeRadius),
    comfort: {
      title: "天气与居住舒适度",
      points: [
        context.weather?.text
          ? `当前天气 ${context.weather.text}，体感 ${context.weather.feelsLike ?? context.weather.temp ?? "-"}°C，湿度 ${context.weather.humidity ?? "-"}%。`
          : "先按用户偏好做保守提醒，看房时再确认通风、潮湿、采光和噪音。",
        input.preferences.includes("怕潮湿")
          ? "你标记了怕潮湿，看房时必须检查墙角、衣柜背板、窗边和卫生间返味。"
          : "仍建议检查通风、采光、空调排水和卫生间干湿分离。",
        "舒适度最终取决于楼层、朝向、临街程度和物业维护，要结合现场情况判断。",
      ],
    },
    livingCost: {
      title: "真实月成本",
      points: [
        rentText,
        pressureText,
        "除月租外，还要一起计算水电燃气、网费、物业费、通勤和搬家成本。",
      ],
    },
    contractRisk: {
      title: "合同与签约风险提示",
      points: [
        "签约前确认房东身份、产权或转租授权，避免只和无授权中间人付款。",
        "押金退还、提前退租、维修责任、家具家电清单必须写入合同。",
        "暂缓通过私人转账支付大额定金；付款备注写清房源地址、款项用途和日期。",
        ...depthProfile.contractRiskPoints,
        ...officialProfile.contractRiskPoints,
        ...preferenceProfile.contractRiskPoints,
      ],
    },
    visitChecklist: [
      "白天和晚上各看一次，验证采光、噪音和夜间安全。",
      "打开所有水龙头，测试水压、排水和热水稳定性。",
      "检查墙角、窗边、柜体背面是否有霉斑或返潮。",
      "拍照记录家具家电、门锁、墙面、地板和水电表读数。",
      "要求出租方提供产权证明、身份证明或转租授权。",
      "把押金退还和维修责任写成合同条款，不接受口头承诺。",
      ...depthProfile.visitChecklistItems,
      ...officialProfile.visitChecklistItems,
      ...preferenceProfile.visitChecklistItems,
    ],
    finalAdvice:
      status === "recommend"
        ? `${depthProfile.finalAdvicePrefix ? `${depthProfile.finalAdvicePrefix} ` : ""}可以进入优先看房清单，但仍需确认合同和现场情况后再付款。${officialAdviceSuffix}${preferenceAdviceSuffix}`
        : status === "reject"
          ? `${depthProfile.finalAdvicePrefix ? `${depthProfile.finalAdvicePrefix} ` : ""}当前信息显示风险或成本偏高，不建议作为首选；除非价格明显下降或关键风险被书面解决。${officialAdviceSuffix}${preferenceAdviceSuffix}`
          : `${depthProfile.finalAdvicePrefix ? `${depthProfile.finalAdvicePrefix} ` : ""}可以谨慎保留为备选，不要当天冲动签约。建议再把至少 2 套同片区房源放在一起比较。${officialAdviceSuffix}${preferenceAdviceSuffix}`,
  });
}
