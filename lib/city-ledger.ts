import type { ReportStatus } from "@/lib/mock-data";

export type CityLedgerInput = {
  currentCity?: string;
  candidateCities?: string;
  rentBudget?: string;
  fixedCost?: string;
  savingGoal?: string;
  commuteLimit?: string;
  notes?: string;
};

export type CityLedgerOption = {
  city: string;
  monthlyIncome: number;
  rentEstimate: number;
  livingCostEstimate: number;
  commuteCost: number;
  fixedCost: number;
  trueMonthlyCost: number;
  monthlySavings: number;
  savingRate: number;
  rentIncomeRatio: number;
  requiredIncomeForGoal: number;
  incomeGapToGoal: number;
  maxSafeRentForGoal: number;
  rentGapToGoal: number;
  offerGate: {
    level: "ready" | "review" | "stop";
    label: string;
    summary: string;
    negotiation: string;
  };
  score: number;
  pressure: ReportStatus;
  verdict: string;
  tradeoffs: string[];
  nextStep: string;
};

export type CityLedgerResult = {
  mode: "local";
  generatedAt: string;
  summary: string;
  assumptions: string[];
  options: CityLedgerOption[];
  warnings: string[];
  nextSteps: string[];
};

type CityProfile = {
  defaultIncome: number;
  rent: number;
  livingCost: number;
  commuteCost: number;
  opportunity: number;
  housingPressure: number;
  note: string;
};

const cityProfiles: Record<string, CityProfile> = {
  上海: {
    defaultIncome: 18500,
    rent: 6500,
    livingCost: 4700,
    commuteCost: 520,
    opportunity: 94,
    housingPressure: 86,
    note: "机会密度高，但住房和通勤会明显挤压预算。",
  },
  深圳: {
    defaultIncome: 18000,
    rent: 6200,
    livingCost: 4500,
    commuteCost: 480,
    opportunity: 91,
    housingPressure: 84,
    note: "产业机会强，独居和近距离通勤的价格较高。",
  },
  北京: {
    defaultIncome: 17500,
    rent: 5800,
    livingCost: 4300,
    commuteCost: 520,
    opportunity: 90,
    housingPressure: 82,
    note: "通勤跨度大，片区选择会显著改变生活质量。",
  },
  杭州: {
    defaultIncome: 16500,
    rent: 4800,
    livingCost: 3900,
    commuteCost: 420,
    opportunity: 84,
    housingPressure: 68,
    note: "收入和居住压力较均衡，适合追求发展和弹性。",
  },
  广州: {
    defaultIncome: 15000,
    rent: 4300,
    livingCost: 3700,
    commuteCost: 400,
    opportunity: 80,
    housingPressure: 62,
    note: "生活成本相对友好，需确认行业薪资上限。",
  },
  成都: {
    defaultIncome: 13500,
    rent: 2800,
    livingCost: 3200,
    commuteCost: 320,
    opportunity: 70,
    housingPressure: 48,
    note: "预算更轻，但要确认长期岗位机会。",
  },
  南京: {
    defaultIncome: 14500,
    rent: 3600,
    livingCost: 3400,
    commuteCost: 360,
    opportunity: 72,
    housingPressure: 56,
    note: "居住压力中等，适合作为长三角稳态选择。",
  },
  武汉: {
    defaultIncome: 12500,
    rent: 2600,
    livingCost: 3000,
    commuteCost: 300,
    opportunity: 64,
    housingPressure: 44,
    note: "成本低，职业上限和行业匹配要优先确认。",
  },
  苏州: {
    defaultIncome: 14500,
    rent: 3500,
    livingCost: 3300,
    commuteCost: 340,
    opportunity: 71,
    housingPressure: 52,
    note: "产业稳定，跨城机会和长期社交半径要考虑。",
  },
};

function parseNumber(value?: string) {
  if (!value) return undefined;
  const match = value.replace(/,/g, "").match(/\d+(\.\d+)?/);
  return match ? Number(match[0]) : undefined;
}

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Math.round(value)));
}

function parsePercent(value?: string) {
  const number = parseNumber(value);
  if (!number) return 0.3;
  return number > 1 ? number / 100 : number;
}

function parseCandidateCities(input?: string) {
  const fallback = [
    { city: "上海", income: 18500 },
    { city: "杭州", income: 16500 },
    { city: "成都", income: 13500 },
  ];

  const rows = input
    ?.split(/[\n,，、]/)
    .map((item) => item.trim())
    .filter(Boolean);

  if (!rows?.length) return fallback;

  return rows.slice(0, 6).map((row) => {
    const city = row.match(/[\u4e00-\u9fa5]{2,}/)?.[0] ?? row;
    const income = parseNumber(row);
    return { city, income };
  });
}

function statusFromScore(score: number): ReportStatus {
  if (score >= 78) return "recommend";
  if (score >= 58) return "caution";
  return "reject";
}

function formatMoney(value: number) {
  return `${Math.round(value).toLocaleString("zh-CN")} 元/月`;
}

function buildVerdict(option: {
  city: string;
  savingRate: number;
  rentIncomeRatio: number;
  profile: CityProfile;
  pressure: ReportStatus;
}) {
  if (option.pressure === "recommend") {
    return `${option.city} 的预算和机会密度较均衡，适合进入片区筛选。${option.profile.note}`;
  }
  if (option.pressure === "caution") {
    return `${option.city} 可以考虑，但需要压低租金或缩短通勤，否则储蓄率会被明显吃掉。${option.profile.note}`;
  }
  return `${option.city} 当前不建议作为优先选择，居住成本或机会回报不匹配，除非薪资条件明显上调。`;
}

function buildTradeoffs(option: {
  city: string;
  savingRate: number;
  rentIncomeRatio: number;
  monthlySavings: number;
  profile: CityProfile;
  incomeGapToGoal: number;
  rentGapToGoal: number;
}) {
  const tradeoffs = [];

  if (option.rentIncomeRatio > 0.35) {
    tradeoffs.push("房租收入比超过 35%，独居或近地铁会显著牺牲储蓄。");
  } else {
    tradeoffs.push("房租收入比仍在可控区间，片区选择有一定余地。");
  }

  if (option.savingRate < 0.25) {
      tradeoffs.push("储蓄率低于 25%，抗风险空间不足，跳槽或生病会放大压力。");
  } else {
    tradeoffs.push("储蓄率相对健康，可以继续比较片区和具体房源。");
  }

  if (option.profile.opportunity >= 85) {
    tradeoffs.push("机会密度较高，值得为职业成长保留一定成本弹性。");
  } else {
    tradeoffs.push("城市成本更友好，但要确认行业岗位数量和薪资上限。");
  }

  if (option.monthlySavings < 3000) {
    tradeoffs.push("每月结余偏低，不适合同时承担高频社交、学习投入和大额消费。");
  }

  if (option.incomeGapToGoal > 0) {
    tradeoffs.push(`距离目标储蓄率还差约 ${formatMoney(option.incomeGapToGoal)} 税后收入，谈薪时要同时看实际结余。`);
  }

  if (option.rentGapToGoal > 0) {
    tradeoffs.push(`若收入不变，租金需要至少再压低约 ${formatMoney(option.rentGapToGoal)}，否则储蓄目标会被房租吃掉。`);
  }

  return tradeoffs;
}

function buildOfferGate(input: {
  city: string;
  savingRate: number;
  savingGoal: number;
  incomeGapToGoal: number;
  rentGapToGoal: number;
  monthlySavings: number;
}) {
  if (input.incomeGapToGoal <= 0 && input.monthlySavings >= 3500) {
    return {
      level: "ready" as const,
      label: "城市预算成立",
      summary: `${input.city} 在当前税后收入下能覆盖目标储蓄率，可以进入片区和房源筛选。`,
      negotiation: "谈薪重点放在试用期、社保公积金、年终和搬家补贴，租金不用为了储蓄目标过度牺牲安全与通勤。",
    };
  }

  if (input.incomeGapToGoal <= 0) {
    return {
      level: "review" as const,
      label: "勉强成立，保留退路",
      summary: `${input.city} 勉强达到 ${Math.round(input.savingGoal * 100)}% 储蓄目标，但安全垫偏薄。`,
      negotiation: "优先争取签字费、搬家补贴或试用期不打折；看房时把租金和通勤都压在红线内。",
    };
  }

  if (input.rentGapToGoal <= 900) {
    return {
      level: "review" as const,
      label: "需要谈薪或降租",
      summary: `${input.city} 暂时没达到目标储蓄率，但差额还可通过谈薪、补贴或降租修正。`,
      negotiation: `底线：税后月收入再增加约 ${formatMoney(input.incomeGapToGoal)}，或把月租压低约 ${formatMoney(input.rentGapToGoal)}。`,
    };
  }

  return {
    level: "stop" as const,
    label: "先别贸然换城",
    summary: `${input.city} 当前薪资条件与居住成本不匹配，签租约前要先重谈薪资或换城市情景。`,
    negotiation: `除非税后月收入增加约 ${formatMoney(input.incomeGapToGoal)}，否则需要把租金压低约 ${formatMoney(input.rentGapToGoal)} 才接近目标储蓄率。`,
  };
}

export function buildCityLedger(input: CityLedgerInput): CityLedgerResult {
  const candidates = parseCandidateCities(input.candidateCities);
  const rentBudget = parseNumber(input.rentBudget);
  const fixedCost = parseNumber(input.fixedCost) ?? 2500;
  const savingGoal = parsePercent(input.savingGoal);
  const commuteLimit = parseNumber(input.commuteLimit);

  const options = candidates
    .map((candidate) => {
      const profile = cityProfiles[candidate.city] ?? {
        defaultIncome: candidate.income ?? 14000,
        rent: rentBudget ?? 4200,
        livingCost: 3600,
        commuteCost: 380,
        opportunity: 66,
        housingPressure: 58,
        note: "缺少城市基线，建议用用户自填数据替换。",
      };
      const monthlyIncome = candidate.income ?? profile.defaultIncome;
      const rentEstimate = rentBudget
        ? Math.min(Math.max(rentBudget, profile.rent * 0.72), profile.rent * 1.08)
        : profile.rent;
      const commuteCost =
        commuteLimit && commuteLimit <= 35 ? profile.commuteCost * 0.85 : profile.commuteCost;
      const trueMonthlyCost = rentEstimate + profile.livingCost + commuteCost + fixedCost;
      const monthlySavings = monthlyIncome - trueMonthlyCost;
      const savingRate = monthlyIncome > 0 ? monthlySavings / monthlyIncome : 0;
      const rentIncomeRatio = monthlyIncome > 0 ? rentEstimate / monthlyIncome : 1;
      const nonRentCost = profile.livingCost + commuteCost + fixedCost;
      const requiredIncomeForGoal =
        savingGoal >= 0.95 ? trueMonthlyCost : trueMonthlyCost / Math.max(0.05, 1 - savingGoal);
      const incomeGapToGoal = Math.max(0, requiredIncomeForGoal - monthlyIncome);
      const maxSafeRentForGoal = Math.max(0, monthlyIncome * (1 - savingGoal) - nonRentCost);
      const rentGapToGoal = Math.max(0, rentEstimate - maxSafeRentForGoal);
      const offerGate = buildOfferGate({
        city: candidate.city,
        savingRate,
        savingGoal,
        incomeGapToGoal,
        rentGapToGoal,
        monthlySavings,
      });
      const score = clamp(
        48 +
          savingRate * 88 -
          Math.max(0, rentIncomeRatio - 0.3) * 80 +
          profile.opportunity * 0.18 -
          profile.housingPressure * 0.12 -
          Math.max(0, savingGoal - savingRate) * 55,
      );
      const pressure = statusFromScore(score);

      return {
        city: candidate.city,
        monthlyIncome,
        rentEstimate: Math.round(rentEstimate),
        livingCostEstimate: profile.livingCost,
        commuteCost: Math.round(commuteCost),
        fixedCost,
        trueMonthlyCost: Math.round(trueMonthlyCost),
        monthlySavings: Math.round(monthlySavings),
        savingRate,
        rentIncomeRatio,
        requiredIncomeForGoal: Math.round(requiredIncomeForGoal),
        incomeGapToGoal: Math.round(incomeGapToGoal),
        maxSafeRentForGoal: Math.round(maxSafeRentForGoal),
        rentGapToGoal: Math.round(rentGapToGoal),
        offerGate,
        score,
        pressure,
        verdict: buildVerdict({
          city: candidate.city,
          savingRate,
          rentIncomeRatio,
          profile,
          pressure,
        }),
        tradeoffs: buildTradeoffs({
          city: candidate.city,
          savingRate,
          rentIncomeRatio,
          monthlySavings,
          profile,
          incomeGapToGoal,
          rentGapToGoal,
        }),
        nextStep:
          offerGate.level === "stop"
            ? "先别急着看房或交定金，先重谈薪资、降低租金目标，或换一个城市情景再测。"
            : pressure === "reject"
            ? "先重新谈薪资、降低租金目标，或换一个城市情景再测。"
            : "进入片区筛选，按工作地点和通勤上限过滤候选区域。",
      };
    })
    .sort((a, b) => b.score - a.score);

  const best = options[0];
  const summary = best
    ? `${best.city} 当前综合更稳，预计每月结余 ${formatMoney(best.monthlySavings)}，储蓄率 ${Math.round(best.savingRate * 100)}%。`
    : "请至少输入一个候选城市和税后月收入。";

  return {
    mode: "local",
    generatedAt: new Date().toISOString(),
    summary,
    assumptions: [
      "城市成本根据基础城市样本和你的输入估算，不代表官方实时数据。",
      "收入建议填写税后月收入；如果只有税前年包，先按保守税后金额换算后再输入。",
      "结果用于排除明显不适合的城市情景，下一步仍需结合具体片区和房源。",
    ],
    options,
    warnings: [
      "住哪儿不预测房价和薪资涨幅，只评估当前预算、机会回报和居住压力。",
    ],
    nextSteps: [
      "保留前 2 个城市进入片区筛选，不要只看最高薪资。",
      "对每个城市设置租金红线，超过红线的房源直接淘汰。",
      "如果储蓄率低于目标，优先调整租金、通勤上限或固定支出。",
      "如果城市账本显示收入差额过大，先谈薪、确认补贴和试用期规则，再进入看房。",
    ],
  };
}
