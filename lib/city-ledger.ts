import {
  cityBenchmarkMap,
  cityBenchmarkNames,
  formatBenchmarkSource,
  livingCostFromBenchmark,
  typicalRentFromBenchmark,
} from "@/lib/city-benchmark-data";
import type { CityBenchmark } from "@/lib/city-benchmark-data";
import type { ReportStatus } from "@/lib/mock-data";

export type CityLedgerInput = {
  currentCity?: string;
  candidateCities?: string;
  monthlyIncome?: string;
  annualPackage?: string;
  industry?: string;
  workplace?: string;
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
  industry: string;
  opportunityLabel: string;
  baselineStatus: "known" | "estimated";
  baselineNote: string;
  dataSourceLabel: string;
  dataSourceUrl: string;
  dataAsOf: string;
  isEstimatedData: boolean;
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
  dataSources: Array<{ city: string; label: string; url: string; asOf: string; estimated: boolean }>;
};

type CityProfile = {
  rent: number;
  livingCost: number;
  commuteCost: number;
  opportunity: number;
  housingPressure: number;
  note: string;
  industries?: string[];
  benchmark?: CityBenchmark;
};

const cityProfiles: Record<string, CityProfile> = Object.fromEntries(
  Object.entries(cityBenchmarkMap).map(([city, benchmark]) => [
    city,
    {
      rent: typicalRentFromBenchmark(benchmark),
      livingCost: livingCostFromBenchmark(benchmark),
      commuteCost: benchmark.commuteCostMonthly,
      opportunity: benchmark.opportunityIndex,
      housingPressure: benchmark.housingPressureIndex,
      note: benchmark.note,
      industries: benchmark.industries,
      benchmark,
    } satisfies CityProfile,
  ]),
);

function parseNumber(value?: string) {
  if (!value) return undefined;
  const normalized = value.replace(/,/g, "").trim();
  const match = normalized.match(/\d+(\.\d+)?/);
  if (!match) return undefined;
  const amount = Number(match[0]);
  if (!Number.isFinite(amount)) return undefined;
  if (/[万wW]/.test(normalized)) return amount * 10000;
  if (/[千kK]/.test(normalized)) return amount * 1000;
  return amount;
}

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Math.round(value)));
}

function parsePercent(value?: string) {
  const number = parseNumber(value);
  if (!number) return 0.3;
  return number > 1 ? number / 100 : number;
}

function cityNamesInText(text: string) {
  return cityBenchmarkNames
    .map((city) => ({ city, index: text.indexOf(city) }))
    .filter((item) => item.index >= 0)
    .sort((a, b) => a.index - b.index)
    .map((item) => item.city);
}

function cityNameFromText(text?: string) {
  if (!text) return undefined;
  const knownCity = cityNamesInText(text)[0];
  if (knownCity) return knownCity;
  return text.match(/[\u4e00-\u9fa5]{2,}/)?.[0];
}

function parseCandidateCities(input?: string, currentCity?: string, monthlyIncome?: string) {
  const fallbackIncome = parseNumber(monthlyIncome);
  const rows = input
    ?.split(/[\n,，、；;]/)
    .map((item) => item.trim())
    .filter(Boolean);

  if (!rows?.length) {
    const fallbackCity = cityNameFromText(currentCity);
    return fallbackCity ? [{ city: fallbackCity, income: fallbackIncome }] : [];
  }

  const candidates = rows.flatMap((row) => {
    const rowCities = cityNamesInText(row);
    const income = parseNumber(row) ?? fallbackIncome;
    if (rowCities.length) {
      return rowCities.map((city) => ({ city, income }));
    }

    const city = cityNameFromText(row);
    return city ? [{ city, income }] : [];
  });

  return candidates.slice(0, 6);
}

function statusFromScore(score: number): ReportStatus {
  if (score >= 78) return "recommend";
  if (score >= 58) return "caution";
  return "reject";
}

function formatMoney(value: number) {
  return `${Math.round(value)}元`;
}

function sentence(value: string) {
  const text = value.trim().replace(/[。；;]+$/g, "");
  return text ? `${text}。` : "";
}

function joinSentences(lines: string[]) {
  return lines.map(sentence).filter(Boolean).join("");
}

function estimateAnnualTax(taxableAnnual: number) {
  if (taxableAnnual <= 0) return 0;
  const brackets = [
    { limit: 36000, rate: 0.03, deduction: 0 },
    { limit: 144000, rate: 0.1, deduction: 2520 },
    { limit: 300000, rate: 0.2, deduction: 16920 },
    { limit: 420000, rate: 0.25, deduction: 31920 },
    { limit: 660000, rate: 0.3, deduction: 52920 },
    { limit: 960000, rate: 0.35, deduction: 85920 },
    { limit: Infinity, rate: 0.45, deduction: 181920 },
  ];
  const bracket = brackets.find((item) => taxableAnnual <= item.limit) ?? brackets[brackets.length - 1];
  return taxableAnnual * bracket.rate - bracket.deduction;
}

export function estimateMonthlyIncomeFromAnnualPackage(value?: string) {
  const annual = parseNumber(value);
  if (!annual) return undefined;
  const annualYuan = annual < 10000 ? annual * 10000 : annual;
  const grossMonthly = annualYuan / 12;
  const socialFundRate = annualYuan >= 500000 ? 0.17 : annualYuan >= 300000 ? 0.15 : 0.12;
  const socialFundMonthly = grossMonthly * socialFundRate;
  const taxableMonthly = Math.max(0, grossMonthly - socialFundMonthly - 5000);
  const annualTax = estimateAnnualTax(taxableMonthly * 12);
  return Math.round((annualYuan - socialFundMonthly * 12 - annualTax) / 12);
}

function normalizeIndustry(value?: string) {
  return value?.trim() || "未填写岗位";
}

function industryFit(profile: CityProfile, industry?: string) {
  const normalized = normalizeIndustry(industry);
  if (!industry?.trim()) {
    return {
      adjustment: 0,
      label: "通用机会面",
      detail: "未填写行业/岗位，本次只看城市通用机会面，不能代表具体岗位密度。",
    };
  }

  if (!profile.industries?.length) {
    return {
      adjustment: 0,
      label: "通用机会面",
      detail: `该城市暂缺${normalized}岗位基线，本次按通用机会面处理。请以你的offer、面试反馈和岗位数量为准。`,
    };
  }

  const matched = profile.industries?.some((item) => normalized.includes(item) || item.includes(normalized));
  if (matched) {
    return {
      adjustment: 6,
      label: `${normalized}机会匹配`,
      detail: `${normalized}与该城市产业方向有重合，已做保守加分。`,
    };
  }

  return {
    adjustment: -4,
    label: "通用机会面",
    detail: `暂缺${normalized}的细分岗位数据，本次只按通用机会面处理，不能当成岗位密度结论。`,
  };
}

function fallbackProfileForCity(city: string, rentBudget?: number): CityProfile {
  const seed = Array.from(city).reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const rent = rentBudget || 2600 + (seed % 1800);
  const livingCost = 2900 + (seed % 900);
  const commuteCost = 260 + (seed % 140);
  const opportunity = 50 + (seed % 18);
  const housingPressure = 34 + (seed % 22);

  return {
    rent,
    livingCost,
    commuteCost,
    opportunity,
    housingPressure,
    note: "该城市未进入本地数据快照，本次只根据你填写的数据做初筛。",
  };
}

function sourceForProfile(city: string, profile: CityProfile) {
  if (profile.benchmark) {
    return {
      label: formatBenchmarkSource(profile.benchmark),
      url: profile.benchmark.source.url,
      asOf: profile.benchmark.asOf,
      estimated: profile.benchmark.estimated,
    };
  }

  return {
    label: `数据截至 ${new Date().toISOString().slice(0, 10)}，来源 用户输入；城市基线缺失`,
    url: "",
    asOf: new Date().toISOString().slice(0, 10),
    estimated: true,
  };
}

function buildVerdict(option: {
  city: string;
  monthlySavings: number;
  savingRate: number;
  rentIncomeRatio: number;
  profile: CityProfile;
  opportunityLabel: string;
  baselineStatus: "known" | "estimated";
  pressure: ReportStatus;
}) {
  const saving = Math.round(option.savingRate * 100);
  const rentRatio = Math.round(option.rentIncomeRatio * 100);
  const baseline =
    option.baselineStatus === "estimated"
      ? "该城市可参考样本不足，本次只根据你填写的数据做初筛"
      : option.profile.note;
  const opportunity =
    option.opportunityLabel === "通用机会面"
      ? "岗位机会按通用机会面处理"
      : `${option.opportunityLabel}已纳入测算`;
  const savings = formatMoney(option.monthlySavings);
  const costLine = `税后月结余约${savings}，储蓄率${saving}%，房租约占收入${rentRatio}%`;

  if (option.pressure === "recommend") {
    return joinSentences([
      `${option.city}可以进入片区比较`,
      costLine,
      opportunity,
      baseline,
    ]);
  }
  if (option.pressure === "caution") {
    return joinSentences([
      `${option.city}先保留为备选`,
      costLine,
      "推进前，把租金和通勤上限写成硬条件",
      baseline,
    ]);
  }
  return joinSentences([
    `${option.city}暂不放在第一顺位`,
    costLine,
    "需要先确认收入、补贴或租金是否有调整空间",
    baseline,
  ]);
}

function buildTradeoffs(option: {
  city: string;
  savingRate: number;
  rentIncomeRatio: number;
  monthlySavings: number;
  profile: CityProfile;
  incomeGapToGoal: number;
  rentGapToGoal: number;
  opportunityLabel: string;
  baselineStatus: "known" | "estimated";
}) {
  const tradeoffs = [];
  const saving = Math.round(option.savingRate * 100);
  const rentRatio = Math.round(option.rentIncomeRatio * 100);

  if (option.rentIncomeRatio > 0.35) {
    tradeoffs.push(`房租约占收入${rentRatio}%，高于35%安全线。租金需要回到红线内，独居、近地铁等体验项再排序。`);
  } else {
    tradeoffs.push(`房租约占收入${rentRatio}%，住房压力暂未越线。片区筛选的重点放在通勤稳定性。`);
  }

  if (option.savingRate < 0.25) {
    tradeoffs.push(`储蓄率${saving}%，现金缓冲偏薄。试用期折扣、跳槽间隔、一次性支出需要单独预留。`);
  } else {
    tradeoffs.push(`储蓄率${saving}%，月度安全垫基本成立。比较重心可以转到片区、通勤和具体房源。`);
  }

  if (option.opportunityLabel.includes("匹配")) {
    tradeoffs.push(`${option.opportunityLabel}。职业方向有匹配信号，租金仍按安全线上限执行。`);
  } else if (option.profile.opportunity >= 85) {
    tradeoffs.push("城市通用机会面较强，但岗位还未细分。请单独核对目标岗位数量、薪资带宽和面试反馈。");
  } else {
    tradeoffs.push("低成本不能替代岗位核验。目标岗位数量、薪资上限和面试反馈需要先查清楚。");
  }

  if (option.monthlySavings < 3000) {
    tradeoffs.push("月结余低于3000元，高频社交、进修投入和大额消费需要排序，不能同时展开。");
  }

  if (option.incomeGapToGoal > 0) {
    tradeoffs.push(`距离目标储蓄率还差约${formatMoney(option.incomeGapToGoal)}税后月收入。谈offer时看月结余，不只看总包。`);
  }

  if (option.rentGapToGoal > 0) {
    tradeoffs.push(`收入不变时，月租还需降低约${formatMoney(option.rentGapToGoal)}，储蓄目标才比较稳。`);
  }

  if (option.baselineStatus === "estimated") {
    tradeoffs.push("该城市可参考样本不足，本次只根据你填写的数据做初筛。");
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
      label: "跨城预算成立",
      summary: `${input.city}换算后，月结余约${formatMoney(input.monthlySavings)}，目标储蓄率可以覆盖。`,
      negotiation: "谈offer时核对试用期、社保公积金基数、年终和搬家补贴；租金不必为了储蓄目标牺牲安全与通勤。",
    };
  }

  if (input.incomeGapToGoal <= 0) {
    return {
      level: "review" as const,
      label: "可选但边界薄",
      summary: `${input.city}能达到${Math.round(input.savingGoal * 100)}%储蓄目标，但月结余只有约${formatMoney(input.monthlySavings)}。`,
      negotiation: "优先争取签字费、搬家补贴或试用期不打折；看房时，租金和通勤都按红线筛。",
    };
  }

  if (input.rentGapToGoal <= 900) {
    return {
      level: "review" as const,
      label: "谈薪或降租后再选",
      summary: `${input.city}距离目标储蓄率还有缺口，offer补贴和租金上限都要先谈清楚。`,
      negotiation: `可行条件：税后月收入再增加约${formatMoney(input.incomeGapToGoal)}，或月租压低约${formatMoney(input.rentGapToGoal)}。`,
    };
  }

  return {
    level: "stop" as const,
    label: "当前offer不成立",
    summary: `${input.city}的收入和居住成本没有形成稳定结余，签租约前需要重谈薪资或换城市。`,
    negotiation: `要接近目标储蓄率，税后月收入需增加约${formatMoney(input.incomeGapToGoal)}，或月租压低约${formatMoney(input.rentGapToGoal)}。`,
  };
}

export function buildCityLedger(input: CityLedgerInput): CityLedgerResult {
  const candidates = parseCandidateCities(
    input.candidateCities,
    input.currentCity,
    input.monthlyIncome,
  );
  const estimatedIncome = estimateMonthlyIncomeFromAnnualPackage(input.annualPackage);
  const rentBudget = parseNumber(input.rentBudget);
  const fixedCost = parseNumber(input.fixedCost) ?? 0;
  const savingGoal = parsePercent(input.savingGoal);
  const commuteLimit = parseNumber(input.commuteLimit);
  const industry = normalizeIndustry(input.industry);

  const options = candidates
    .map((candidate) => {
      const knownProfile = cityProfiles[candidate.city];
      const profile = knownProfile ?? fallbackProfileForCity(candidate.city, rentBudget);
      const baselineStatus =
        knownProfile && !knownProfile.benchmark?.estimated ? "known" as const : "estimated" as const;
      const dataSource = sourceForProfile(candidate.city, profile);
      const fit = industryFit(profile, input.industry);
      const opportunityScore = clamp(profile.opportunity + fit.adjustment);
      const monthlyIncome = candidate.income ?? estimatedIncome ?? 0;
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
          opportunityScore * 0.18 -
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
        industry,
        opportunityLabel: fit.label,
        baselineStatus,
        baselineNote: fit.detail,
        dataSourceLabel: dataSource.label,
        dataSourceUrl: dataSource.url,
        dataAsOf: dataSource.asOf,
        isEstimatedData: dataSource.estimated,
        score,
        pressure,
        verdict: buildVerdict({
          city: candidate.city,
          monthlySavings,
          savingRate,
          rentIncomeRatio,
          profile,
          opportunityLabel: fit.label,
          baselineStatus,
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
          opportunityLabel: fit.label,
          baselineStatus,
        }),
        nextStep:
          offerGate.level === "stop"
            ? "暂停看房和付款。调整薪资、租金目标，或换一个城市情景再测。"
            : pressure === "reject"
            ? "调整薪资、租金目标，或换一个城市情景再测。"
            : "进入片区筛选，按工作地点和通勤上限过滤候选区域。",
      };
    })
    .sort((a, b) => b.score - a.score);

  const best = options[0];
  const summary = best
    ? `${options.length > 1 ? "当前首选是" : ""}${best.city}：税后月结余约${formatMoney(best.monthlySavings)}，储蓄率约${Math.round(best.savingRate * 100)}%，真实月成本约${formatMoney(best.trueMonthlyCost)}。`
    : "请至少输入一个候选城市，并填写税后月收入或税前年包。";
  const hasEstimatedBaseline = options.some((option) => option.baselineStatus === "estimated");
  const dataSources = options.map((option) => ({
    city: option.city,
    label: option.dataSourceLabel,
    url: option.dataSourceUrl,
    asOf: option.dataAsOf,
    estimated: option.isEstimatedData,
  }));
  const usedAnnualPackageEstimate =
    estimatedIncome !== undefined && candidates.some((candidate) => candidate.income === undefined);

  return {
    mode: "local",
    generatedAt: new Date().toISOString(),
    summary,
    assumptions: [
      "生活成本按一次性公开数据快照和你的输入估算，不代表实时行情或薪资承诺。",
      usedAnnualPackageEstimate
        ? `税前年包已换算为税后月收入，约${formatMoney(estimatedIncome ?? 0)}。正式决策前，请替换为真实到手收入。`
        : estimatedIncome
        ? "已同时填写税前年包和税后月收入；本次优先使用每个城市的税后月收入。"
        : "建议填写税后月收入；只有税前年包时，可先用年包换算助手做保守估算。",
      input.industry?.trim()
        ? `行业/岗位已按“${industry}”做保守匹配；缺细分数据时会明确标为通用机会面。`
        : "未填写行业/岗位时，机会判断只代表城市通用机会面。",
      hasEstimatedBaseline
        ? "部分城市为估算或缺少稳定样本，页面会展示来源和截至日期。"
        : "已匹配到公开城市样本；具体offer、片区和房源仍需继续确认。",
      "结果用于排除明显不适合的城市情景，后续仍需结合具体片区和房源。",
    ],
    options,
    warnings: [
      "住哪儿不预测房价和薪资涨幅，只评估当前预算、机会回报和居住压力。",
    ],
    nextSteps: [
      "保留前2个城市进入片区筛选，同时比较收入、租金和通勤压力。",
      "对每个城市设置租金红线，超过红线的房源直接淘汰。",
      "储蓄率低于目标时，先调整租金、通勤上限或固定支出。",
      "收入差额过大时，先谈薪、核对补贴和试用期规则，再进入看房。",
    ],
    dataSources,
  };
}
