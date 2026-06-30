import type { ReportStatus } from "@/lib/mock-data";

export type LifeRadiusInput = {
  city?: string;
  listingTitle?: string;
  radiusMinutes?: number;
  groceryMinutes?: number;
  restaurantCount?: number;
  pharmacyMinutes?: number;
  hospitalMinutes?: number;
  parcelMinutes?: number;
  laundryMinutes?: number;
  gymMinutes?: number;
  parkMinutes?: number;
  lateFoodAvailable?: boolean;
  nightLighting?: "good" | "normal" | "poor";
  noiseSources?: string;
  cookingFrequency?: "often" | "sometimes" | "rarely";
  lifestyle?: string;
  notes?: string;
  dataSourceSettings?: {
    amapDataEnabled?: boolean;
  };
  poiEvidence?: LifePoiEvidence;
  dataQuality?: LifeDataQualitySignal[];
};

export type LifeRiskLevel = "高" | "中" | "低";

export type LifeDataQualitySignal = {
  provider: "amap";
  feature: string;
  status: "live" | "fallback" | "missing_input" | "skipped_limit" | "failed";
  label: string;
  detail: string;
};

export type LifePoiCategoryEvidence = {
  label: string;
  count: number;
  nearestMinutes?: number;
  nearestName?: string;
};

export type LifePoiEvidence = {
  source: "amap" | "manual";
  label: string;
  detail: string;
  locationLabel?: string;
  categories?: LifePoiCategoryEvidence[];
};

export type LifeRiskItem = {
  title: string;
  level: LifeRiskLevel;
  why: string;
  action: string;
};

export type LifeRadiusCategory = {
  label: string;
  score: number;
  status: ReportStatus;
  evidence: string;
  action: string;
};

export type LifeRadiusResult = {
  status: ReportStatus;
  score: number;
  verdict: "生活配套友好" | "需要取舍" | "不适合长期住";
  summary: string;
  radiusMinutes: number;
  coreGapCount: number;
  categories: LifeRadiusCategory[];
  riskItems: LifeRiskItem[];
  blockers: string[];
  fieldChecks: string[];
  weeklyRoutine: string[];
  negotiationLevers: string[];
  nextActions: string[];
  assumptions: string[];
  poiEvidence?: LifePoiEvidence;
  dataQuality?: LifeDataQualitySignal[];
};

function asNumber(value: number | undefined, fallback: number) {
  return Number.isFinite(value) && value !== undefined ? value : fallback;
}

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function statusFromScore(score: number): ReportStatus {
  if (score >= 78) return "recommend";
  if (score >= 52) return "caution";
  return "reject";
}

function verdictFromStatus(status: ReportStatus): LifeRadiusResult["verdict"] {
  if (status === "recommend") return "生活配套友好";
  if (status === "caution") return "需要取舍";
  return "不适合长期住";
}

function categoryStatus(score: number): ReportStatus {
  return statusFromScore(score);
}

function minuteScore(minutes: number, target: number, hardLimit: number) {
  if (minutes <= target) return 92;
  if (minutes <= hardLimit) return 72;
  return 42;
}

function addRisk(risks: LifeRiskItem[], risk: LifeRiskItem) {
  risks.push(risk);
}

function hasAny(value: string, keywords: string[]) {
  return keywords.some((keyword) => value.includes(keyword));
}

export function buildLifeRadius(input: LifeRadiusInput): LifeRadiusResult {
  const city = input.city?.trim() || "目标城市";
  const listingTitle = input.listingTitle?.trim() || "当前候选房源";
  const radiusMinutes = asNumber(input.radiusMinutes, 15);
  const groceryMinutes = asNumber(input.groceryMinutes, 12);
  const restaurantCount = asNumber(input.restaurantCount, 6);
  const pharmacyMinutes = asNumber(input.pharmacyMinutes, 9);
  const hospitalMinutes = asNumber(input.hospitalMinutes, 22);
  const parcelMinutes = asNumber(input.parcelMinutes, 8);
  const laundryMinutes = asNumber(input.laundryMinutes, 15);
  const gymMinutes = asNumber(input.gymMinutes, 18);
  const parkMinutes = asNumber(input.parkMinutes, 20);
  const lateFoodAvailable = input.lateFoodAvailable ?? true;
  const nightLighting = input.nightLighting || "normal";
  const cookingFrequency = input.cookingFrequency || "often";
  const noiseSources = input.noiseSources?.trim() || "临街、楼下餐饮、垃圾站";
  const lifestyle =
    input.lifestyle?.trim() || "工作日下班较晚，周末做饭，希望能运动和低成本生活。";
  const notes = input.notes?.trim() || "房源租金合适，但不确定周边生活是否方便。";
  const poiEvidence = input.poiEvidence;
  const dataQuality = input.dataQuality;

  const eatingScore = clamp(
    (cookingFrequency === "often" ? minuteScore(groceryMinutes, 8, radiusMinutes) : 74) * 0.55 +
      Math.min(100, 45 + restaurantCount * 7) * 0.45,
  );
  const healthScore = clamp(
    minuteScore(pharmacyMinutes, 8, radiusMinutes) * 0.55 +
      minuteScore(hospitalMinutes, 20, 35) * 0.45,
  );
  const errandScore = clamp(
    minuteScore(parcelMinutes, 8, radiusMinutes) * 0.55 +
      minuteScore(laundryMinutes, 10, radiusMinutes + 5) * 0.45,
  );
  const recoveryScore = clamp(
    minuteScore(gymMinutes, 15, 25) * 0.55 +
      minuteScore(parkMinutes, 15, 30) * 0.45,
  );
  const nightScore = clamp(
    (lateFoodAvailable ? 82 : 48) +
      (nightLighting === "good" ? 10 : nightLighting === "poor" ? -22 : 0),
  );

  const categories: LifeRadiusCategory[] = [
    {
      label: "吃饭与买菜",
      score: Math.round(eatingScore),
      status: categoryStatus(eatingScore),
      evidence: `买菜约 ${groceryMinutes} 分钟，常用餐饮约 ${restaurantCount} 个。`,
      action: cookingFrequency === "often" ? "实测下班后买菜路线和菜价。" : "确认晚饭和外卖选择是否稳定。",
    },
    {
      label: "医疗与应急",
      score: Math.round(healthScore),
      status: categoryStatus(healthScore),
      evidence: `药店约 ${pharmacyMinutes} 分钟，医院或社区卫生服务约 ${hospitalMinutes} 分钟。`,
      action: "确认夜间药店、发热门诊或急诊的实际距离。",
    },
    {
      label: "快递与洗衣",
      score: Math.round(errandScore),
      status: categoryStatus(errandScore),
      evidence: `快递点约 ${parcelMinutes} 分钟，洗衣约 ${laundryMinutes} 分钟。`,
      action: "确认快递是否能送上楼，洗衣和维修小店是否营业到下班后。",
    },
    {
      label: "运动与恢复",
      score: Math.round(recoveryScore),
      status: categoryStatus(recoveryScore),
      evidence: `健身约 ${gymMinutes} 分钟，公园或散步空间约 ${parkMinutes} 分钟。`,
      action: "确认周末运动、夜跑和散步路线是否安全安静。",
    },
    {
      label: "夜间生活支持",
      score: Math.round(nightScore),
      status: categoryStatus(nightScore),
      evidence: `夜宵/便利店${lateFoodAvailable ? "可用" : "不足"}，夜间照明为${nightLighting === "good" ? "较好" : nightLighting === "poor" ? "偏弱" : "一般"}。`,
      action: "晚上 9 点后实走地铁口、便利店、小区门口和楼栋入口。",
    },
  ];

  const riskItems: LifeRiskItem[] = [];
  let score =
    eatingScore * 0.24 +
    healthScore * 0.22 +
    errandScore * 0.18 +
    recoveryScore * 0.16 +
    nightScore * 0.2;

  if (groceryMinutes > radiusMinutes && cookingFrequency === "often") {
    score -= 8;
    addRisk(riskItems, {
      title: "买菜距离超出生活配套",
      level: "中",
      why: "经常做饭时，买菜距离会影响晚饭、预算和下班后的恢复时间。",
      action: "看房当天绕到最近菜场/超市，记录步行时间、营业时间和价格。",
    });
  }

  if (restaurantCount < 4 && cookingFrequency !== "often") {
    score -= 8;
    addRisk(riskItems, {
      title: "下班餐饮选择不足",
      level: "中",
      why: "不常做饭时，餐饮不足会提高外卖成本和晚饭不确定性。",
      action: "确认工作日晚餐时段是否有堂食、外卖和便利店选择。",
    });
  }

  if (pharmacyMinutes > radiusMinutes || hospitalMinutes > 35) {
    score -= 10;
    addRisk(riskItems, {
      title: "医疗应急不够近",
      level: hospitalMinutes > 35 ? "高" : "中",
      why: "感冒、急性肠胃、扭伤和夜间不适时，药店和社区医疗距离会直接影响安全感。",
      action: "确认最近 24 小时药店、社区卫生服务和急诊路线。",
    });
  }

  if (nightLighting === "poor") {
    score -= 12;
    addRisk(riskItems, {
      title: "夜间照明偏弱",
      level: "高",
      why: "夜间照明差会放大晚归、取快递、倒垃圾和外卖取餐的安全风险。",
      action: "晚上实走小区门口到楼栋路线，必要时回到独居安全确认。",
    });
  }

  if (!lateFoodAvailable) {
    score -= 6;
    addRisk(riskItems, {
      title: "夜间基础补给不足",
      level: "中",
      why: "加班晚归时，便利店、药店和简单餐食不足会降低生活弹性。",
      action: "确认 22 点后的便利店、外卖覆盖和打车落点。",
    });
  }

  if (hasAny(noiseSources, ["酒吧", "烧烤", "夜宵", "主干道", "高架", "施工", "垃圾站", "菜场"])) {
    score -= 9;
    addRisk(riskItems, {
      title: "周边噪音或气味源需要实测",
      level: "中",
      why: "餐饮、主干道、垃圾站和施工会在晚上或清晨影响睡眠，比白天看房更难发现。",
      action: "晚上和清晨各观察一次噪音、油烟、垃圾清运和车流。",
    });
  }

  if (riskItems.length === 0) {
    addRisk(riskItems, {
      title: "生活配套基础可控",
      level: "低",
      why: "吃饭、买菜、医疗、快递、运动和夜间支持没有明显短板。",
      action: "仍建议晚上实走一次，确认照明、噪音和营业时间。",
    });
  }

  score = clamp(score);
  const status = statusFromScore(score);
  const blockers = riskItems
    .filter((item) => item.level === "高")
    .map((item) => `${item.title}：${item.action}`);
  const coreGapCount = categories.filter((item) => item.status === "reject").length;

  return {
    status,
    score: Math.round(score),
    verdict: verdictFromStatus(status),
    summary:
      status === "recommend"
        ? "这套房的生活配套比较完整，适合进入房源体检和签约前确认。"
        : status === "caution"
          ? "这套房的基础生活能覆盖，但存在买菜、医疗、夜间或噪音短板，需要看房时实测。"
          : "这套房的日常生活支持不足，不建议只因为租金合适就长期接受。",
    radiusMinutes,
    coreGapCount,
    categories,
    riskItems,
    blockers: blockers.length ? blockers : ["暂无硬性生活配套待确认事项，但仍需做夜间和周末实测。"],
    fieldChecks: [
      "工作日 20:30 后实走地铁/公交站到小区门口，再到楼栋入口。",
      "从楼下步行到最近超市、菜场、便利店，记录实际时间和营业时间。",
      "确认最近药店是否夜间营业，社区医院或急诊路线是否清楚。",
      "观察楼下餐饮、垃圾站、主干道、施工点在夜间和清晨的噪音气味。",
      "确认快递柜、外卖取餐点、洗衣维修小店是否方便，且不容易泄露隐私。",
    ],
    weeklyRoutine: [
      cookingFrequency === "often"
        ? "工作日晚饭：下班后买菜 + 做饭路线必须顺。"
        : "工作日晚饭：堂食/外卖/便利店至少要有两种稳定方案。",
      "生病应急：药店、社区医院和打车路线提前存好。",
      "周末恢复：保留一个能散步、运动或低成本放松的去处。",
      "夜间安全：晚归后取快递、倒垃圾、回楼栋的路线要明亮。",
    ],
    negotiationLevers: [
      "如果生活配套存在明显短板，可用买菜、医疗、噪音或夜间支持不足作为降租理由。",
      "若房源其他条件好，要求补充门禁、照明、纱窗、隔音或清洁维护承诺。",
      "如果楼下餐饮或主干道噪音明显，优先谈短租期或可提前退租条款。",
    ],
    nextActions: [
      status === "reject" ? "先回到片区筛选，找生活配套更完整的替代片区。" : "把这套房加入房源体检，继续确认通勤和合同风险。",
      "进入看房清单，按生活配套短板整理现场确认事项。",
      "如果夜间照明或晚归路线有问题，进入独居安全确认。",
      "把这套房和生活配套更完整的房源放进多房源对比。",
    ],
    assumptions: [
      `城市：${city}；房源：${listingTitle}；目标生活配套：${radiusMinutes} 分钟。`,
      poiEvidence
        ? `${poiEvidence.label}：${poiEvidence.detail}`
        : "本次未拿到实时周边生活信息，按你填写的生活配套情况判断。",
      `生活方式：${lifestyle}`,
      `补充说明：${notes}`,
      "即使拿到实时周边信息，也仍需现场确认步行路线、营业时间、夜间照明、噪音和实际可用性。",
    ],
    poiEvidence,
    dataQuality,
  };
}
