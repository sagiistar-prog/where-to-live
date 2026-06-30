import type { ReportStatus } from "@/lib/mock-data";

export type MoveBudgetInput = {
  city?: string;
  monthlyIncome?: number;
  cashOnHand?: number;
  monthlyRent?: number;
  depositMonths?: number;
  prepaidMonths?: number;
  agencyFee?: number;
  serviceFee?: number;
  movingCost?: number;
  setupCost?: number;
  utilityDeposit?: number;
  fixedMonthlyCost?: number;
  daysUntilSalary?: number;
};

export type MoveBudgetLineItem = {
  label: string;
  amount: number;
  timing: string;
  type: "required" | "negotiable" | "deferrable";
  note: string;
};

export type MoveBudgetScenario = {
  label: string;
  status: ReportStatus;
  upfrontCost: number;
  cashAfterMove: number;
  safetyMonths: number;
  rentIncomeRatio: number;
  verdict: string;
};

export type MoveBudgetResult = {
  mode: "local";
  generatedAt: string;
  city: string;
  status: ReportStatus;
  score: number;
  summary: string;
  upfrontCost: number;
  cashAfterMove: number;
  minimumSafeCash: number;
  safetyMonths: number;
  firstMonthPressure: number;
  lineItems: MoveBudgetLineItem[];
  scenarios: MoveBudgetScenario[];
  risks: string[];
  negotiationLevers: string[];
  nextActions: string[];
  assumptions: string[];
};

function numberOr(value: number | undefined, fallback: number) {
  return Number.isFinite(value) ? Number(value) : fallback;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function money(value: number) {
  return Math.round(value);
}

function statusFromMetrics(cashAfterMove: number, minimumSafeCash: number, firstMonthPressure: number) {
  if (cashAfterMove < 0 || cashAfterMove < minimumSafeCash * 0.45 || firstMonthPressure > 0.95) {
    return "reject" as const;
  }
  if (cashAfterMove < minimumSafeCash || firstMonthPressure > 0.7) {
    return "caution" as const;
  }
  return "recommend" as const;
}

function scenarioStatus(safetyMonths: number, rentIncomeRatio: number) {
  if (safetyMonths < 1 || rentIncomeRatio > 0.45) return "reject" as const;
  if (safetyMonths < 2 || rentIncomeRatio > 0.35) return "caution" as const;
  return "recommend" as const;
}

function scenarioVerdict(status: ReportStatus, label: string) {
  if (status === "recommend") return `${label}下预算仍有余量，可以进入签约前确认。`;
  if (status === "caution") return `${label}下预算偏紧，建议至少谈下付款周期或延后非必要添置。`;
  return `${label}下会明显打穿安全垫，不建议直接付款。`;
}

export function buildMoveBudget(input: MoveBudgetInput): MoveBudgetResult {
  const city = input.city?.trim() || "目标城市";
  const monthlyIncome = numberOr(input.monthlyIncome, 0);
  const cashOnHand = numberOr(input.cashOnHand, 0);
  const monthlyRent = numberOr(input.monthlyRent, 0);
  const depositMonths = numberOr(input.depositMonths, 0);
  const prepaidMonths = numberOr(input.prepaidMonths, 0);
  const agencyFee = numberOr(input.agencyFee, monthlyRent * 0.35);
  const serviceFee = numberOr(input.serviceFee, 0);
  const movingCost = numberOr(input.movingCost, 0);
  const setupCost = numberOr(input.setupCost, 0);
  const utilityDeposit = numberOr(input.utilityDeposit, 0);
  const fixedMonthlyCost = numberOr(input.fixedMonthlyCost, 0);
  const daysUntilSalary = numberOr(input.daysUntilSalary, 0);

  const deposit = monthlyRent * depositMonths;
  const prepaidRent = monthlyRent * prepaidMonths;
  const salaryGapCost = ((fixedMonthlyCost + monthlyRent) / 30) * clamp(daysUntilSalary, 0, 31);

  const lineItems: MoveBudgetLineItem[] = [
    {
      label: "押金",
      amount: money(deposit),
      timing: "签约当天",
      type: "required",
      note: "必须写清退还时间、扣减标准和验收方式。",
    },
    {
      label: "预付租金",
      amount: money(prepaidRent),
      timing: "签约当天",
      type: prepaidMonths > 1 ? "negotiable" : "required",
      note: prepaidMonths > 1 ? "可尝试谈成月付或押一付一，降低首笔预算压力。" : "按月付时压力较低。",
    },
    {
      label: "中介费",
      amount: money(agencyFee),
      timing: "签约前后",
      type: "negotiable",
      note: "确认收费主体、收费标准和是否能开具收据或发票。",
    },
    {
      label: "服务费/管理费",
      amount: money(serviceFee),
      timing: "签约前后",
      type: serviceFee > 0 ? "negotiable" : "deferrable",
      note: "服务费会改变真实月成本，必须写进合同或聊天确认。",
    },
    {
      label: "搬家与打包",
      amount: money(movingCost),
      timing: "入住前 3 天",
      type: "negotiable",
      note: "周末、跨区、无电梯和大件家具会抬高费用。",
    },
    {
      label: "基础添置",
      amount: money(setupCost),
      timing: "入住后 7 天",
      type: "deferrable",
      note: "床品、清洁、路由器、小家电可以分批买，优先安全和卫生。",
    },
    {
      label: "水电燃气/宽带预存",
      amount: money(utilityDeposit),
      timing: "入住后 7 天",
      type: "required",
      note: "入住前拍表读数，避免历史欠费转嫁。",
    },
    {
      label: "发薪前生活缓冲",
      amount: money(salaryGapCost),
      timing: `未来 ${Math.round(daysUntilSalary)} 天`,
      type: "required",
      note: "签约后到下一次发薪前，仍要覆盖吃饭、交通和日常支出。",
    },
  ];

  const upfrontCost = money(lineItems.reduce((sum, item) => sum + item.amount, 0));
  const cashAfterMove = money(cashOnHand - upfrontCost);
  const minimumSafeCash = money((fixedMonthlyCost + monthlyRent) * 1.5);
  const safetyMonths = cashAfterMove / Math.max(fixedMonthlyCost + monthlyRent, 1);
  const firstMonthPressure = upfrontCost / Math.max(cashOnHand + monthlyIncome, 1);
  const rentIncomeRatio = monthlyRent / Math.max(monthlyIncome, 1);
  const status = statusFromMetrics(cashAfterMove, minimumSafeCash, firstMonthPressure);
  const score = clamp(
    Math.round(
      100 -
        Math.max(0, firstMonthPressure - 0.45) * 80 -
        Math.max(0, 1.5 - safetyMonths) * 20 -
        Math.max(0, rentIncomeRatio - 0.3) * 85,
    ),
    35,
    92,
  );

  const negotiableSavings = money(
    Math.max(0, prepaidRent - monthlyRent) + agencyFee * 0.5 + Math.max(0, serviceFee) + setupCost * 0.45,
  );
  const lighterUpfront = Math.max(upfrontCost - negotiableSavings, monthlyRent + deposit + utilityDeposit);
  const delayedSetup = Math.max(upfrontCost - setupCost * 0.65, 0);

  const scenarios: MoveBudgetScenario[] = [
    {
      label: "按当前条件签约",
      upfrontCost,
      cashAfterMove,
      safetyMonths,
      rentIncomeRatio,
      status,
      verdict: scenarioVerdict(status, "按当前条件"),
    },
    {
      label: "谈成月付/降低中介费",
      upfrontCost: money(lighterUpfront),
      cashAfterMove: money(cashOnHand - lighterUpfront),
      safetyMonths: (cashOnHand - lighterUpfront) / Math.max(fixedMonthlyCost + monthlyRent, 1),
      rentIncomeRatio,
      status: scenarioStatus(
        (cashOnHand - lighterUpfront) / Math.max(fixedMonthlyCost + monthlyRent, 1),
        rentIncomeRatio,
      ),
      verdict: scenarioVerdict(
        scenarioStatus(
          (cashOnHand - lighterUpfront) / Math.max(fixedMonthlyCost + monthlyRent, 1),
          rentIncomeRatio,
        ),
        "谈判后",
      ),
    },
    {
      label: "延后非必要添置",
      upfrontCost: money(delayedSetup),
      cashAfterMove: money(cashOnHand - delayedSetup),
      safetyMonths: (cashOnHand - delayedSetup) / Math.max(fixedMonthlyCost + monthlyRent, 1),
      rentIncomeRatio,
      status: scenarioStatus(
        (cashOnHand - delayedSetup) / Math.max(fixedMonthlyCost + monthlyRent, 1),
        rentIncomeRatio,
      ),
      verdict: scenarioVerdict(
        scenarioStatus(
          (cashOnHand - delayedSetup) / Math.max(fixedMonthlyCost + monthlyRent, 1),
          rentIncomeRatio,
        ),
        "延后添置",
      ),
    },
  ];

  const risks = [
    cashAfterMove < 0 ? "签约后现金会变成负数，不建议付款。" : "",
    cashAfterMove < minimumSafeCash ? "签约后安全垫不足 1.5 个月，任何意外支出都会很难受。" : "",
    prepaidMonths >= 3 ? "押一付三会把未来预算提前锁死，可尝试谈月付或押一付一。" : "",
    agencyFee > monthlyRent * 0.5 ? "中介费超过半个月租金，需要确认收费标准和收据。" : "",
    serviceFee > 0 ? "服务费/管理费会抬高真实月成本，必须写清收费周期。" : "",
    daysUntilSalary > 20 ? "距离下一次发薪较久，需要保留更高生活缓冲。" : "",
    rentIncomeRatio > 0.35 ? "月租已超过收入 35%，后续每月也会持续偏紧。" : "",
  ].filter(Boolean);

  const negotiationLevers = [
    "优先谈付款周期：押一付三改押一付一或月付，比砍 200 元月租更能救首月预算。",
    "中介费和服务费必须有收费主体、金额、用途和收据，不接受模糊口头收费。",
    "非必要家具家电延后 2 到 4 周添置，先买安全、卫生和睡眠必需品。",
    "如果出租方要求先付定金，先确认官方查询、授权链和材料清单。",
  ];

  return {
    mode: "local",
    generatedAt: new Date().toISOString(),
    city,
    status,
    score,
    summary:
      status === "recommend"
        ? `当前入住预算可承受，签约后预计还剩 ${money(cashAfterMove).toLocaleString()} 元现金，仍需确认官方查询和材料留存。`
        : status === "caution"
          ? `当前入住预算偏紧，签约后预计还剩 ${money(cashAfterMove).toLocaleString()} 元现金，建议先谈付款周期或延后非必要支出。`
          : `当前不建议直接付款，首笔支出约 ${upfrontCost.toLocaleString()} 元，可能打穿你的现金安全垫。`,
    upfrontCost,
    cashAfterMove,
    minimumSafeCash,
    safetyMonths,
    firstMonthPressure,
    lineItems,
    scenarios,
    risks: risks.length ? risks : ["当前未发现明显预算风险，但仍建议保留至少 1.5 个月安全垫。"],
    negotiationLevers,
    nextActions: [
      status === "reject" ? "不建议付款，重新谈付款周期或换更低首付压力的房源。" : "进入官方查询和合同确认，确认主体、备案和合同条款。",
      "把押金、首笔租金、中介费、服务费逐项写入材料清单。",
      "入住当天拍表读数、交割视频和家具家电清单。",
      "非必要添置延后购买，等下一次发薪后再补充。",
    ],
    assumptions: [
      `城市：${city}，月租：${monthlyRent.toLocaleString()} 元，税后月收入：${monthlyIncome.toLocaleString()} 元。`,
      `付款结构：押 ${depositMonths} 付 ${prepaidMonths}，距离下次发薪约 ${Math.round(daysUntilSalary)} 天。`,
      "本结果用于整理入住预算测算；签约前仍要确认合同和官方备案信息。",
    ],
  };
}
