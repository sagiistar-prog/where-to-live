import type { ReportStatus } from "@/lib/mock-data";

export type BuyStressInput = {
  city?: string;
  householdIncome?: string;
  cashSavings?: string;
  currentRent?: string;
  fixedCost?: string;
  targetTotalPrice?: string;
  downPaymentRatio?: string;
  loanYears?: string;
  mortgageRate?: string;
  propertyCost?: string;
  incomeDrop?: string;
  safetyMonths?: string;
};

export type BuyStressMetric = {
  label: string;
  value: string;
  status: ReportStatus;
  note: string;
};

export type BuyStressScenario = {
  label: string;
  status: ReportStatus;
  score: number;
  monthlyHousingCost: number;
  paymentRatio: number;
  cashAfterDownPayment: number;
  bufferMonths: number;
  verdict: string;
  tradeoffs: string[];
};

export type BuyStressResult = {
  mode: "local";
  generatedAt: string;
  city: string;
  summary: string;
  status: ReportStatus;
  score: number;
  metrics: BuyStressMetric[];
  scenarios: BuyStressScenario[];
  riskFlags: string[];
  mustVerify: string[];
  assumptions: string[];
  nextSteps: string[];
};

function parseNumber(value?: string) {
  if (!value) return undefined;
  const normalized = value.replace(/,/g, "").trim();
  const match = normalized.match(/\d+(\.\d+)?/);
  if (!match) return undefined;
  const number = Number(match[0]);
  if (/万/.test(normalized)) return number * 10000;
  return number;
}

function parsePercent(value?: string, fallback = 0) {
  const number = parseNumber(value);
  if (number === undefined) return fallback;
  return number > 1 ? number / 100 : number;
}

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Math.round(value)));
}

function statusFromRatio(ratio: number): ReportStatus {
  if (ratio <= 0.33) return "recommend";
  if (ratio <= 0.5) return "caution";
  return "reject";
}

function statusFromBuffer(months: number): ReportStatus {
  if (months >= 12) return "recommend";
  if (months >= 6) return "caution";
  return "reject";
}

function formatMoney(value: number) {
  return `${Math.round(value).toLocaleString("zh-CN")} 元`;
}

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

function monthlyMortgage(principal: number, annualRate: number, years: number) {
  const months = Math.max(1, Math.round(years * 12));
  const monthlyRate = annualRate / 12;
  if (monthlyRate <= 0) return principal / months;
  const factor = Math.pow(1 + monthlyRate, months);
  return (principal * monthlyRate * factor) / (factor - 1);
}

function buildTradeoffs({
  label,
  paymentRatio,
  bufferMonths,
  cashAfterDownPayment,
  monthlyHousingCost,
}: {
  label: string;
  paymentRatio: number;
  bufferMonths: number;
  cashAfterDownPayment: number;
  monthlyHousingCost: number;
}) {
  const items = [];

  if (paymentRatio > 0.5) {
    items.push("月供收入比超过 50%，降薪、失业或家庭支出上升都会直接冲击生活质量。");
  } else if (paymentRatio > 0.33) {
    items.push("月供收入比进入压力区，需要控制装修、车、消费贷和大额旅行支出。");
  } else {
    items.push("月供收入比相对健康，但仍要保留失业和维修安全垫。");
  }

  if (bufferMonths < 6) {
    items.push("首付后安全垫不足 6 个月，不适合把全部现金压进房子。");
  } else if (bufferMonths < 12) {
    items.push("安全垫勉强可用，建议补充足现金再进入签约和贷款步骤。");
  } else {
    items.push("安全垫较稳，能承受短期收入波动。");
  }

  if (cashAfterDownPayment < monthlyHousingCost * 3) {
    items.push("买后现金过低，装修、家电、契税和维修会形成二次压力。");
  }

  if (label.includes("压力")) {
    items.push("压力情景用于模拟降薪或收入中断，不代表一定发生，但要作为底线判断。");
  }

  return items;
}

function scenarioStatus(paymentRatio: number, bufferMonths: number) {
  if (paymentRatio <= 0.33 && bufferMonths >= 12) return "recommend";
  if (paymentRatio <= 0.5 && bufferMonths >= 6) return "caution";
  return "reject";
}

export function buildBuyStress(input: BuyStressInput): BuyStressResult {
  const city = input.city?.trim() || "目标城市";
  const householdIncome = parseNumber(input.householdIncome) ?? 20000;
  const cashSavings = parseNumber(input.cashSavings) ?? 850000;
  const currentRent = parseNumber(input.currentRent) ?? 6200;
  const fixedCost = parseNumber(input.fixedCost) ?? 6500;
  const targetTotalPrice = parseNumber(input.targetTotalPrice) ?? 2800000;
  const downPaymentRatio = parsePercent(input.downPaymentRatio, 0.3);
  const loanYears = parseNumber(input.loanYears) ?? 30;
  const mortgageRate = parsePercent(input.mortgageRate, 0.035);
  const propertyCost = parseNumber(input.propertyCost) ?? 900;
  const incomeDrop = parsePercent(input.incomeDrop, 0.2);
  const safetyMonthsTarget = parseNumber(input.safetyMonths) ?? 12;

  const downPayment = targetTotalPrice * downPaymentRatio;
  const closingCost = targetTotalPrice * 0.025;
  const initialCashNeeded = downPayment + closingCost;
  const loanAmount = Math.max(targetTotalPrice - downPayment, 0);
  const mortgagePayment = monthlyMortgage(loanAmount, mortgageRate, loanYears);
  const buyMonthlyHousingCost = mortgagePayment + propertyCost;
  const rentMonthlyCost = currentRent + fixedCost;
  const buyMonthlyCost = buyMonthlyHousingCost + fixedCost;
  const cashAfterDownPayment = cashSavings - initialCashNeeded;
  const bufferMonths = cashAfterDownPayment / Math.max(buyMonthlyCost, 1);
  const paymentRatio = buyMonthlyHousingCost / Math.max(householdIncome, 1);
  const rentRatio = currentRent / Math.max(householdIncome, 1);
  const stressIncome = householdIncome * (1 - incomeDrop);
  const stressPaymentRatio = buyMonthlyHousingCost / Math.max(stressIncome, 1);
  const stressMonthlyCost = buyMonthlyHousingCost + fixedCost;
  const stressBufferMonths = cashAfterDownPayment / Math.max(stressMonthlyCost, 1);

  const rentScenario: BuyStressScenario = {
    label: "继续租房 12 个月",
    status:
      rentRatio <= 0.33 && (cashSavings / Math.max(rentMonthlyCost, 1)) >= 12
        ? "recommend"
        : "caution",
    score: clamp(
      72 +
        Math.min(16, (cashSavings / Math.max(rentMonthlyCost, 1)) * 0.8) -
        Math.max(0, rentRatio - 0.3) * 80,
    ),
    monthlyHousingCost: currentRent,
    paymentRatio: rentRatio,
    cashAfterDownPayment: cashSavings,
    bufferMonths: cashSavings / Math.max(rentMonthlyCost, 1),
      verdict: "继续租房能保留现金和换城市灵活度，适合工作城市、职业方向或家庭计划还没稳定的人。",
    tradeoffs: [
      "预算更稳，但无法锁定房屋资产。",
      "如果租金上涨或频繁换租，生活稳定性会下降。",
      "适合把下一年用于观察职业机会、片区和真实居住需求。",
    ],
  };

  const buyStatus = scenarioStatus(paymentRatio, bufferMonths);
  const buyScenario: BuyStressScenario = {
    label: "按目标总价买入",
    status: buyStatus,
    score: clamp(
      92 -
        Math.max(0, paymentRatio - 0.3) * 95 -
        Math.max(0, safetyMonthsTarget - bufferMonths) * 4 -
        (cashAfterDownPayment < 0 ? 24 : 0),
    ),
    monthlyHousingCost: buyMonthlyHousingCost,
    paymentRatio,
    cashAfterDownPayment,
    bufferMonths,
    verdict:
      buyStatus === "recommend"
        ? "当前买入压力可控，但仍要确认贷款、税费、装修和通勤变化。"
        : buyStatus === "caution"
          ? "可以买前继续压价或提高首付后现金垫，避免月供和装修同时挤压生活质量。"
          : "不建议当前直接买入，月供或首付后现金垫已经触及高风险区。",
    tradeoffs: buildTradeoffs({
      label: "按目标总价买入",
      paymentRatio,
      bufferMonths,
      cashAfterDownPayment,
      monthlyHousingCost: buyMonthlyHousingCost,
    }),
  };

  const stressStatus = scenarioStatus(stressPaymentRatio, stressBufferMonths);
  const stressScenario: BuyStressScenario = {
    label: `收入下降 ${formatPercent(incomeDrop)} 压力情景`,
    status: stressStatus,
    score: clamp(
      82 -
        Math.max(0, stressPaymentRatio - 0.33) * 110 -
        Math.max(0, 9 - stressBufferMonths) * 5 -
        (cashAfterDownPayment < 0 ? 30 : 0),
    ),
    monthlyHousingCost: buyMonthlyHousingCost,
    paymentRatio: stressPaymentRatio,
    cashAfterDownPayment,
    bufferMonths: stressBufferMonths,
    verdict:
      stressStatus === "recommend"
        ? "降薪情景下仍能承受，说明预算有一定韧性。"
        : stressStatus === "caution"
          ? "降薪后会明显压缩储蓄和消费，买前需要更厚安全垫。"
          : "降薪或失业会快速击穿预算，不适合在当前参数下上车。",
    tradeoffs: buildTradeoffs({
      label: "压力情景",
      paymentRatio: stressPaymentRatio,
      bufferMonths: stressBufferMonths,
      cashAfterDownPayment,
      monthlyHousingCost: buyMonthlyHousingCost,
    }),
  };

  const scenarios = [rentScenario, buyScenario, stressScenario];
  const score = buyScenario.score;
  const status = buyScenario.status;
  const riskFlags = [
    ...(cashAfterDownPayment < 0
      ? [`首付、税费和初始交易成本还差约 ${formatMoney(Math.abs(cashAfterDownPayment))}。`]
      : []),
    ...(paymentRatio > 0.5 ? ["月供收入比超过 50%，预算压力过高。"] : []),
    ...(bufferMonths < 6 ? ["首付后安全垫不足 6 个月。"] : []),
    ...(stressPaymentRatio > 0.6 ? ["降薪情景下月供收入比超过 60%。"] : []),
  ];

  const summary =
    status === "recommend"
      ? "当前买房情景整体可承受，但仍需保留税费、装修和失业安全垫。"
      : status === "caution"
        ? "当前买房情景需要谨慎，月供或安全垫已经接近压力线。"
        : "当前买房情景不建议直接上车，预算或安全垫风险过高。";

  return {
    mode: "local",
    generatedAt: new Date().toISOString(),
    city,
    summary,
    status,
    score,
    metrics: [
      {
        label: "月供收入比",
        value: formatPercent(paymentRatio),
        status: statusFromRatio(paymentRatio),
        note: "30% 以下较舒适，50% 以上会显著挤压生活质量。",
      },
      {
        label: "首付后现金",
        value: formatMoney(cashAfterDownPayment),
        status: cashAfterDownPayment >= 0 ? statusFromBuffer(bufferMonths) : "reject",
        note: "已扣除首付和约 2.5% 初始交易成本估算。",
      },
      {
        label: "安全垫",
        value: `${Math.max(0, Math.floor(bufferMonths))} 个月`,
        status: statusFromBuffer(bufferMonths),
        note: "建议至少 6 个月，稳妥目标为 12 个月。",
      },
      {
        label: "压力情景月供比",
        value: formatPercent(stressPaymentRatio),
        status: statusFromRatio(stressPaymentRatio),
        note: "模拟收入下降后的还款压力，不预测收入变化。",
      },
    ],
    scenarios,
    riskFlags: riskFlags.length
      ? riskFlags
      : ["当前未触发硬性风险线，但仍需确认贷款审批、税费、装修和通勤变化。"],
    mustVerify: [
      "贷款利率、还款方式、提前还款规则和实际月供。",
      "契税、中介费、评估费、维修基金、物业费、车位费和装修家电预算。",
      "买后通勤是否变长，以及雨天、夜间、接送家人时是否可持续。",
      "如果未来 12 个月失业、降薪或换城市，房子是否会锁死选择。",
    ],
    assumptions: [
      "这里只做预算压力测试，不预测房价涨跌，也不构成购房建议。",
      "月供按等额本息近似计算，具体以银行审批为准。",
      "初始交易成本暂按总价 2.5% 估算，后续可继续拆分契税、中介费和维修基金。",
      `输入城市：${input.city?.trim() || "未填写"}，安全垫目标：${safetyMonthsTarget} 个月。`,
    ],
    nextSteps:
      status === "reject"
        ? [
            "先降低目标总价或提高可用现金，不要在当前参数下直接签约。",
            "把同样预算放回城市账本和片区筛选，比较继续租房的选择权价值。",
            "如果必须买，至少补足 6 个月安全垫后再进入贷款和签约步骤。",
          ]
        : [
            "把目标总价拆成 2-3 个房源情景，分别测月供和安全垫。",
            "在实地看房前确认通勤、物业费、车位费、装修成本和家庭支出变化。",
            "保留一份降薪或失业情景，不要只用最乐观收入做决定。",
          ],
  };
}
