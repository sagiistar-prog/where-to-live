export type AnalysisPreflightLevel = "ready" | "review" | "limited";

export type AnalysisListingFields = {
  title?: string;
  rent?: string;
  area?: string;
  floor?: string;
  address?: string;
  description?: string;
};

export type AnalysisDecisionFields = {
  city?: string;
  income?: string;
  workplace?: string;
  budget?: string;
  commuteLimit?: string;
  fixedCost?: string;
};

export type AnalysisExtractResult = {
  mode?: "openai" | "fallback";
  confidence?: number;
  missingFields?: string[];
  warnings?: string[];
};

export type AnalysisPreflightCheck = {
  id: string;
  group: "listing" | "decision";
  ok: boolean;
  critical: boolean;
  message: string;
};

export type AnalysisPreflightResult = {
  level: AnalysisPreflightLevel;
  label: string;
  description: string;
  score: number;
  checks: AnalysisPreflightCheck[];
  missingCritical: string[];
  missingUseful: string[];
  degradation: string[];
  riskPrompts: string[];
  generatedAt: string;
};

export type BuildAnalysisPreflightInput = {
  listing: AnalysisListingFields;
  decision: AnalysisDecisionFields;
  preferences: string[];
  hasScreenshot?: boolean;
  extractResult?: AnalysisExtractResult | null;
};

const levelCopy: Record<
  AnalysisPreflightLevel,
  { label: string; description: string }
> = {
  ready: {
    label: "可以评估",
    description: "关键信息基本齐全，可以生成较完整的房源体检。",
  },
  review: {
    label: "建议补充",
    description: "可以继续评估，但部分结论需要谨慎参考，签约前还需要补充材料。",
  },
  limited: {
    label: "信息不足",
    description: "关键待补充信息较多，当前更适合先整理问题清单，暂时不适合直接做签约判断。",
  },
};

function hasValue(value?: string) {
  return Boolean(value?.trim());
}

export function buildAnalysisPreflightChecks(
  listing: AnalysisListingFields,
  decision: AnalysisDecisionFields,
): AnalysisPreflightCheck[] {
  return [
    {
      id: "rent",
      group: "listing",
      ok: hasValue(listing.rent),
      critical: true,
      message: "请填写月租和押付方式，否则只能按预算粗略判断价格压力。",
    },
    {
      id: "address",
      group: "listing",
      ok: hasValue(listing.address),
      critical: true,
      message: "请填写小区名、写字楼或附近地标，否则通勤、周边生活和天气舒适度只能按现有信息估算。",
    },
    {
      id: "area",
      group: "listing",
      ok: hasValue(listing.area),
      critical: false,
      message: "请补充面积，才能判断单位租金和居住舒适度是否合理。",
    },
    {
      id: "floor",
      group: "listing",
      ok: hasValue(listing.floor),
      critical: false,
      message: "请补充楼层信息，低楼层的潮湿、噪音、安全和采光风险会更容易判断。",
    },
    {
      id: "city",
      group: "decision",
      ok: hasValue(decision.city),
      critical: true,
      message: "请填写城市，生活成本、天气和通勤判断才有上下文。",
    },
    {
      id: "workplace",
      group: "decision",
      ok: hasValue(decision.workplace),
      critical: true,
      message: "请填写工作地点，否则无法判断通勤是否真的可承受。",
    },
    {
      id: "budget",
      group: "decision",
      ok: hasValue(decision.budget),
      critical: true,
      message: "请填写预算上限，否则无法判断这套房是否会挤压预算。",
    },
    {
      id: "income",
      group: "decision",
      ok: hasValue(decision.income),
      critical: false,
      message: "请补充税后月收入，才能计算租金收入比和签约后的安全垫。",
    },
    {
      id: "commuteLimit",
      group: "decision",
      ok: hasValue(decision.commuteLimit),
      critical: false,
      message: "请补充通勤上限，才能判断便宜房源是否被时间成本抵消。",
    },
  ];
}

export function scoreAnalysisPreflight(
  checks: AnalysisPreflightCheck[],
  hasScreenshot: boolean,
  preferenceCount: number,
) {
  const fulfilled = checks.filter((item) => item.ok);
  const base = fulfilled.reduce((sum, item) => sum + (item.critical ? 9 : 6), 18);
  const screenshotBonus = hasScreenshot ? 5 : 0;
  const preferenceBonus = Math.min(preferenceCount * 2, 8);
  return Math.min(96, base + screenshotBonus + preferenceBonus);
}

export function buildAnalysisDegradation({
  listing,
  decision,
  hasScreenshot = false,
  extractResult,
}: BuildAnalysisPreflightInput) {
  const items: string[] = [];

  if (!hasValue(listing.address)) {
    items.push("房源位置不完整：请补小区、写字楼、门牌或明确地标，通勤和周边生活判断才更可靠。");
  }
  if (!hasValue(decision.income)) {
    items.push("未填写税后收入：无法判断月租收入比、首笔支出和安全垫压力。");
  }
  if (hasScreenshot && extractResult?.mode === "fallback") {
    items.push("截图已上传，但租金、地址和费用说明仍需要你人工核对。");
  }

  return items;
}

export function buildAnalysisRiskPrompts(
  preferences: string[],
  listing: AnalysisListingFields,
) {
  const prompts: string[] = [];

  if (preferences.includes("独居")) {
    prompts.push("独居：现场确认夜间路线、门禁、楼道、电梯监控和维修上门边界。");
  }
  if (preferences.includes("怕吵")) {
    prompts.push("怕吵：补临街、楼下餐饮、施工、电梯井和隔音情况，晚上再看一次。");
  }
  if (preferences.includes("怕潮湿")) {
    prompts.push("怕潮湿：确认楼层、朝向、墙角霉点、卫生间通风和外墙渗水痕迹。");
  }
  if (preferences.includes("养宠")) {
    prompts.push("养宠：确认合同是否允许养宠、清洁责任和押金扣款边界。");
  }
  if (preferences.includes("经常做饭")) {
    prompts.push("经常做饭：确认燃气、排烟、台面空间、下水反味和楼下买菜便利度。");
  }
  if (preferences.includes("必须近地铁")) {
    prompts.push("近地铁：需要实测进站步行、过街、等车时间和末班车覆盖。");
  }
  if (preferences.includes("接受老小区")) {
    prompts.push("老小区：补电路容量、水压、门禁、楼道照明、外墙和历史维修记录。");
  }
  if (!hasValue(listing.floor)) {
    prompts.push("未填楼层：看房时先确认采光、潮湿、噪音、安全和电梯等待时间。");
  }

  return prompts;
}

export function buildAnalysisPreflight(
  input: BuildAnalysisPreflightInput,
): AnalysisPreflightResult {
  const checks = buildAnalysisPreflightChecks(input.listing, input.decision);
  const missingCritical = checks.filter((item) => !item.ok && item.critical);
  const missingUseful = checks.filter((item) => !item.ok && !item.critical);
  const score = scoreAnalysisPreflight(
    checks,
    Boolean(input.hasScreenshot),
    input.preferences.length,
  );
  const level: AnalysisPreflightLevel =
    missingCritical.length >= 4 ? "limited" : missingCritical.length >= 2 ? "review" : "ready";
  const copy = levelCopy[level];

  return {
    level,
    label: copy.label,
    description: copy.description,
    score,
    checks,
    missingCritical: missingCritical.map((item) => item.message),
    missingUseful: missingUseful.map((item) => item.message),
    degradation: buildAnalysisDegradation(input),
    riskPrompts: buildAnalysisRiskPrompts(input.preferences, input.listing),
    generatedAt: new Date().toISOString(),
  };
}

export function isAnalysisPreflightResult(value: unknown): value is AnalysisPreflightResult {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<AnalysisPreflightResult>;
  return (
    (candidate.level === "ready" ||
      candidate.level === "review" ||
      candidate.level === "limited") &&
    typeof candidate.label === "string" &&
    typeof candidate.description === "string" &&
    typeof candidate.score === "number" &&
    Array.isArray(candidate.checks) &&
    Array.isArray(candidate.missingCritical) &&
    Array.isArray(candidate.missingUseful) &&
    Array.isArray(candidate.degradation) &&
    Array.isArray(candidate.riskPrompts)
  );
}
