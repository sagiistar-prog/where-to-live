import type { ReportStatus } from "@/lib/mock-data";

export type CommuteCostInput = {
  city?: string;
  listingTitle?: string;
  workplace?: string;
  monthlyIncome?: number;
  monthlyRent?: number;
  oneWayMinutes?: number;
  walkMinutes?: number;
  transferCount?: number;
  transitFareOneWay?: number;
  workdaysPerMonth?: number;
  commuteLimitMinutes?: number;
  lateNightsPerMonth?: number;
  taxiCostPerLateNight?: number;
  badWeatherDaysPerMonth?: number;
  alternativeOneWayMinutes?: number;
  alternativeMonthlyRent?: number;
  notes?: string;
  dataSourceSettings?: {
    amapDataEnabled?: boolean;
  };
  routeEvidence?: CommuteRouteEvidence;
  dataQuality?: CommuteDataQualitySignal[];
};

export type CommuteRiskLevel = "高" | "中" | "低";

export type CommuteDataQualitySignal = {
  provider: "amap";
  feature: string;
  status: "live" | "fallback" | "missing_input" | "skipped_limit" | "failed";
  label: string;
  detail: string;
};

export type CommuteRouteEvidence = {
  source: "amap" | "manual";
  label: string;
  detail: string;
  origin?: string;
  destination?: string;
  durationMinutes?: number;
  walkingDistanceMeters?: number;
  transferCount?: number;
  transitFareOneWay?: number;
};

export type CommuteRiskItem = {
  title: string;
  level: CommuteRiskLevel;
  why: string;
  action: string;
};

export type CommuteScenario = {
  label: string;
  monthlyRent: number;
  oneWayMinutes: number;
  monthlyTimeHours: number;
  directMonthlyCost: number;
  hiddenTimeValue: number;
  verdict: string;
  status: ReportStatus;
};

export type CommuteCostResult = {
  status: ReportStatus;
  score: number;
  verdict: "通勤可接受" | "谨慎接受" | "不建议长期住";
  summary: string;
  monthlyCommuteHours: number;
  yearlyCommuteDays: number;
  directMonthlyCost: number;
  hiddenTimeValue: number;
  trueMonthlyCost: number;
  maxExtraRentWorthPaying: number;
  rentGapToAlternative: number;
  savedHoursWithAlternative: number;
  scenarios: CommuteScenario[];
  riskItems: CommuteRiskItem[];
  blockers: string[];
  fieldChecks: string[];
  negotiationLevers: string[];
  nextActions: string[];
  assumptions: string[];
  routeEvidence?: CommuteRouteEvidence;
  dataQuality?: CommuteDataQualitySignal[];
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

function verdictFromStatus(status: ReportStatus): CommuteCostResult["verdict"] {
  if (status === "recommend") return "通勤可接受";
  if (status === "caution") return "谨慎接受";
  return "不建议长期住";
}

function addRisk(risks: CommuteRiskItem[], risk: CommuteRiskItem) {
  risks.push(risk);
}

function scenarioStatus(minutes: number, limit: number, directCost: number, rent: number, income: number) {
  const ratio = income > 0 ? (rent + directCost) / income : 1;
  if (minutes <= limit && ratio <= 0.35) return "recommend";
  if (minutes <= limit + 15 && ratio <= 0.42) return "caution";
  return "reject";
}

function monthlyTimeHours(oneWayMinutes: number, workdays: number) {
  return (oneWayMinutes * 2 * workdays) / 60;
}

export function buildCommuteCost(input: CommuteCostInput): CommuteCostResult {
  const city = input.city?.trim() || "目标城市";
  const listingTitle = input.listingTitle?.trim() || "当前候选房源";
  const workplace = input.workplace?.trim() || "工作地待确认";
  const monthlyIncome = asNumber(input.monthlyIncome, 0);
  const monthlyRent = asNumber(input.monthlyRent, 0);
  const oneWayMinutes = asNumber(input.oneWayMinutes, 0);
  const walkMinutes = asNumber(input.walkMinutes, 14);
  const transferCount = asNumber(input.transferCount, 2);
  const transitFareOneWay = asNumber(input.transitFareOneWay, 6);
  const workdaysPerMonth = asNumber(input.workdaysPerMonth, 22);
  const commuteLimitMinutes = asNumber(input.commuteLimitMinutes, 45);
  const lateNightsPerMonth = asNumber(input.lateNightsPerMonth, 6);
  const taxiCostPerLateNight = asNumber(input.taxiCostPerLateNight, 58);
  const badWeatherDaysPerMonth = asNumber(input.badWeatherDaysPerMonth, 5);
  const alternativeOneWayMinutes = asNumber(input.alternativeOneWayMinutes, 32);
  const alternativeMonthlyRent = asNumber(input.alternativeMonthlyRent, 6100);
  const notes =
    input.notes?.trim() ||
    "这套房租金更低，但单程接近 1 小时，且下班晚时可能需要打车。";
  const routeEvidence = input.routeEvidence;
  const dataQuality = input.dataQuality;

  const hourlyValue = monthlyIncome / 176;
  const commuteHours = monthlyTimeHours(oneWayMinutes, workdaysPerMonth);
  const yearlyCommuteDays = (commuteHours * 12) / 24;
  const directMonthlyCost = transitFareOneWay * 2 * workdaysPerMonth + lateNightsPerMonth * taxiCostPerLateNight;
  const hiddenTimeValue = commuteHours * hourlyValue * 0.65;
  const trueMonthlyCost = monthlyRent + directMonthlyCost + hiddenTimeValue;
  const savedHoursWithAlternative = Math.max(
    0,
    monthlyTimeHours(oneWayMinutes, workdaysPerMonth) -
      monthlyTimeHours(alternativeOneWayMinutes, workdaysPerMonth),
  );
  const maxExtraRentWorthPaying = savedHoursWithAlternative * hourlyValue * 0.65;
  const rentGapToAlternative = alternativeMonthlyRent - monthlyRent;
  const rentIncomeRatio = monthlyIncome > 0 ? monthlyRent / monthlyIncome : 1;
  const trueCostRatio = monthlyIncome > 0 ? trueMonthlyCost / monthlyIncome : 1;

  let score = 88;
  const riskItems: CommuteRiskItem[] = [];

  if (oneWayMinutes > commuteLimitMinutes) {
    score -= oneWayMinutes > commuteLimitMinutes + 20 ? 20 : 12;
    addRisk(riskItems, {
      title: "单程通勤超过自设上限",
      level: oneWayMinutes > commuteLimitMinutes + 20 ? "高" : "中",
      why: "通勤超上限会侵占睡眠、运动、做饭和社交时间，长期会变成工作成本。",
      action: "要求至少做一次早高峰和一次晚高峰实测，再和近一些但更贵的房源比较。",
    });
  }

  if (oneWayMinutes >= 60) {
    score -= 12;
    addRisk(riskItems, {
      title: "单程接近或超过 1 小时",
      level: "高",
    why: "每天往返 2 小时会显著影响加班后的恢复状态，也会压缩生活配套。",
      action: "除非租金明显低于同片区替代，否则不建议把它作为长期主选。",
    });
  }

  if (walkMinutes >= 15) {
    score -= 8;
    addRisk(riskItems, {
      title: "步行到站时间偏长",
      level: "中",
      why: "步行距离在雨天、高温、晚归和拿重物时会被放大，不只是地图上的几分钟。",
      action: "实测从楼下到站台的时间，确认是否有共享单车、遮雨路线和夜间照明。",
    });
  }

  if (transferCount >= 2) {
    score -= transferCount >= 3 ? 12 : 7;
    addRisk(riskItems, {
      title: "换乘次数偏多",
      level: transferCount >= 3 ? "高" : "中",
      why: "换乘多会增加误点、拥挤和末班车风险，实际疲劳高于单程分钟数。",
      action: "确认最拥挤换乘站、末班车衔接和替代路线。",
    });
  }

  if (lateNightsPerMonth >= 4) {
    score -= 9;
    addRisk(riskItems, {
      title: "加班晚归会产生打车成本",
      level: "中",
      why: "晚归频率高时，通勤成本会从地铁票价变成打车现金支出和夜间安全风险。",
      action: "把每月晚归打车费放进真实月成本，并确认小区门口下车点是否安全。",
    });
  }

  if (badWeatherDaysPerMonth >= 5) {
    score -= 5;
    addRisk(riskItems, {
      title: "雨天和高温场景需要单独验证",
      level: "低",
      why: "天气会放大步行、换乘和排队的不确定性，尤其是低频公交或长步行路线。",
      action: "看房时补一条雨天路线预案，确认是否需要打车、骑行或绕路。",
    });
  }

  if (trueCostRatio > 0.42) {
    score -= 15;
    addRisk(riskItems, {
      title: "真实居住成本占收入偏高",
      level: "高",
      why: "把通勤时间价值和晚归打车算进去后，这套房不再只是租金便宜。",
      action: "优先比较通勤更短但租金更高的替代房，看节省时间是否抵消租金差。",
    });
  } else if (rentIncomeRatio > 0.35) {
    score -= 8;
  }

  if (rentGapToAlternative > 0 && rentGapToAlternative <= maxExtraRentWorthPaying) {
    score -= 0;
  } else if (rentGapToAlternative > maxExtraRentWorthPaying && alternativeOneWayMinutes < oneWayMinutes) {
    score += 3;
  }

  if (riskItems.length === 0) {
    addRisk(riskItems, {
      title: "通勤基础条件可控",
      level: "低",
      why: "当前通勤时间、步行、换乘和成本没有明显超出常规承受范围。",
      action: "仍建议做一次早晚高峰实测，并确认雨天、晚归和末班车方案。",
    });
  }

  score = clamp(score);
  const status = statusFromScore(score);
  const scenarioDirectCost = transitFareOneWay * 2 * workdaysPerMonth + lateNightsPerMonth * taxiCostPerLateNight;
  const alternativeLateTaxiCost = Math.max(0, lateNightsPerMonth - 2) * Math.max(0, taxiCostPerLateNight - 20);
  const alternativeDirectCost = transitFareOneWay * 2 * workdaysPerMonth + alternativeLateTaxiCost;
  const currentScenarioStatus = scenarioStatus(
    oneWayMinutes,
    commuteLimitMinutes,
    scenarioDirectCost,
    monthlyRent,
    monthlyIncome,
  );
  const alternativeScenarioStatus = scenarioStatus(
    alternativeOneWayMinutes,
    commuteLimitMinutes,
    alternativeDirectCost,
    alternativeMonthlyRent,
    monthlyIncome,
  );

  const scenarios: CommuteScenario[] = [
    {
      label: "当前候选房",
      monthlyRent,
      oneWayMinutes,
      monthlyTimeHours: commuteHours,
      directMonthlyCost: scenarioDirectCost,
      hiddenTimeValue,
      verdict:
        currentScenarioStatus === "recommend"
          ? "通勤和预算基本可控。"
          : currentScenarioStatus === "caution"
            ? "能住，但需要实测晚高峰和晚归路线。"
            : "不适合作为长期主选，除非租金优势非常明显。",
      status: currentScenarioStatus,
    },
    {
      label: "近通勤替代房",
      monthlyRent: alternativeMonthlyRent,
      oneWayMinutes: alternativeOneWayMinutes,
      monthlyTimeHours: monthlyTimeHours(alternativeOneWayMinutes, workdaysPerMonth),
      directMonthlyCost: alternativeDirectCost,
      hiddenTimeValue: monthlyTimeHours(alternativeOneWayMinutes, workdaysPerMonth) * hourlyValue * 0.65,
      verdict:
        rentGapToAlternative <= maxExtraRentWorthPaying
          ? "租金差小于节省时间价值，值得优先看。"
          : "租金差偏高，但仍可作为通勤舒适度标尺。",
      status: alternativeScenarioStatus,
    },
  ];

  const blockers = riskItems
    .filter((item) => item.level === "高")
    .map((item) => `${item.title}：${item.action}`);

  return {
    status,
    score,
    verdict: verdictFromStatus(status),
    summary:
      status === "recommend"
        ? "这套房的通勤条件基本可控，但仍建议实测高峰和晚归场景。"
        : status === "caution"
          ? "这套房可以继续看，但通勤会持续消耗时间、现金或安全感，需要和替代房做取舍。"
          : "当前通勤成本已经明显偏高，不建议只因为租金低就长期接受。",
    monthlyCommuteHours: commuteHours,
    yearlyCommuteDays,
    directMonthlyCost,
    hiddenTimeValue,
    trueMonthlyCost,
    maxExtraRentWorthPaying,
    rentGapToAlternative,
    savedHoursWithAlternative,
    scenarios,
    riskItems,
    blockers: blockers.length ? blockers : ["暂无硬性通勤待确认事项，但仍需完成早晚高峰和雨天预案确认。"],
    fieldChecks: [
      "工作日早高峰从小区门口到公司工位全程实测一次。",
      "晚高峰从公司到小区门口实测一次，记录站内换乘和排队时间。",
      "确认最晚下班时是否还能赶上末班车，错过后打车约多少钱。",
      "雨天或高温时，步行到站路线是否有遮挡、积水、黑路或绕行。",
      "晚归下车点到楼栋门口是否明亮、有门禁、有物业或保安。",
    ],
    negotiationLevers: [
      `如果坚持这套房，建议用通勤超上限和晚归打车成本争取租金降到 ${Math.max(0, Math.round(monthlyRent - directMonthlyCost * 0.6)).toLocaleString()} 元附近。`,
      `近通勤替代房每月最多值得多付约 ${Math.round(maxExtraRentWorthPaying).toLocaleString()} 元，超过这个差价就要看房屋质量和安全是否明显更好。`,
      "如果无法降租，可以谈月付、减少押付周期或要求补充家具家电，抵消通勤带来的长期损耗。",
    ],
    nextActions: [
      "把这套房加入多房源对比，按真实月成本排序。",
      "进入片区筛选，找 2 个通勤更短的替代片区作为标尺。",
      "看房时优先确认晚归路线、楼下下车点、门禁和雨天步行路线。",
      status === "reject" ? "不要当天交定金，先比较近通勤替代房。" : "如果其他风险可控，再进入房源体检和付款咨询。",
    ],
    assumptions: [
      `城市：${city}；房源：${listingTitle}；工作地点：${workplace}。`,
      routeEvidence
        ? `${routeEvidence.label}：${routeEvidence.detail}`
        : "本次未拿到实时地图路线，按用户手动输入的通勤时间、步行、换乘和票价折算。",
      `时间价值按税后月收入 / 176 小时，再按 65% 折算为通勤机会成本。`,
      `补充说明：${notes}`,
      "即使拿到实时路线，也仍需高峰、晚归和雨天实测，因为拥堵、排队、末班车和楼下动线会显著改变体感成本。",
    ],
    routeEvidence,
    dataQuality,
  };
}
