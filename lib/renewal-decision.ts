import type { ReportStatus } from "@/lib/mock-data";

export type RenewalDecisionInput = {
  city?: string;
  listingTitle?: string;
  currentRent?: number;
  proposedRent?: number;
  marketRent?: number;
  monthlyIncome?: number;
  movingCost?: number;
  agencyFee?: number;
  depositRisk?: number;
  commuteMinutes?: number;
  alternativeCommuteMinutes?: number;
  contractLengthMonths?: number;
  noticeDays?: number;
  houseIssues?: string;
  landlordBehavior?: string;
  renewalTerms?: string;
  alternativeQuality?: string;
  workStability?: string;
  notes?: string;
};

export type RenewalRiskLevel = "高" | "中" | "低";

export type RenewalRiskItem = {
  title: string;
  level: RenewalRiskLevel;
  why: string;
  action: string;
  proof: string;
};

export type RenewalScenario = {
  label: string;
  monthlyCost: number;
  upfrontCost: number;
  twelveMonthCost: number;
  verdict: string;
  status: ReportStatus;
};

export type RenewalDecisionResult = {
  mode: "local";
  generatedAt: string;
  city: string;
  listingTitle: string;
  status: ReportStatus;
  score: number;
  decision: "建议续租" | "先谈判再决定" | "准备搬家";
  summary: string;
  currentRent: number;
  proposedRent: number;
  marketRent: number;
  rentIncrease: number;
  rentIncreaseRate: number;
  maxAcceptableRent: number;
  breakEvenMonths: number;
  scenarios: RenewalScenario[];
  riskItems: RenewalRiskItem[];
  blockers: string[];
  negotiationScripts: string[];
  renewalChecklist: string[];
  movePrepChecklist: string[];
  nextActions: string[];
  assumptions: string[];
};

function numberOr(value: number | undefined, fallback: number) {
  return Number.isFinite(value) ? Number(value) : fallback;
}

function money(value: number) {
  return Math.max(0, Math.round(value));
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function hasAny(text: string, keys: string[]) {
  return keys.some((key) => text.includes(key));
}

function addRisk(
  risks: RenewalRiskItem[],
  score: { value: number },
  penalty: number,
  risk: RenewalRiskItem,
) {
  risks.push(risk);
  score.value -= penalty;
}

function statusFrom(score: number, highCount: number): ReportStatus {
  if (score < 58 || highCount >= 3) return "reject";
  if (score < 80 || highCount >= 1) return "caution";
  return "recommend";
}

function decisionFrom(status: ReportStatus): RenewalDecisionResult["decision"] {
  if (status === "recommend") return "建议续租";
  if (status === "caution") return "先谈判再决定";
  return "准备搬家";
}

function scenarioStatus(rentRatio: number, hasHighRisk: boolean): ReportStatus {
  if (hasHighRisk || rentRatio > 0.38) return "reject";
  if (rentRatio > 0.3) return "caution";
  return "recommend";
}

export function buildRenewalDecision(input: RenewalDecisionInput): RenewalDecisionResult {
  const city = input.city?.trim() || "目标城市";
  const listingTitle = input.listingTitle?.trim() || "当前房源";
  const currentRent = money(numberOr(input.currentRent, 0));
  const proposedRent = money(numberOr(input.proposedRent, 0));
  const marketRent = money(numberOr(input.marketRent, 0));
  const monthlyIncome = money(numberOr(input.monthlyIncome, 0));
  const movingCost = money(numberOr(input.movingCost, 0));
  const agencyFee = money(numberOr(input.agencyFee, 0));
  const depositRisk = money(numberOr(input.depositRisk, 0));
  const commuteMinutes = numberOr(input.commuteMinutes, 0);
  const alternativeCommuteMinutes = numberOr(input.alternativeCommuteMinutes, 0);
  const contractLengthMonths = Math.max(0, Math.round(numberOr(input.contractLengthMonths, 0)));
  const noticeDays = Math.max(0, Math.round(numberOr(input.noticeDays, 0)));
  const houseIssues = input.houseIssues?.trim() || "卫生间潮湿、空调老旧、楼道噪音";
  const landlordBehavior = input.landlordBehavior?.trim() || "维修响应慢，但愿意沟通";
  const renewalTerms = input.renewalTerms?.trim() || "涨租 700 元，要求再签 12 个月，押金不变";
  const alternativeQuality = input.alternativeQuality?.trim() || "同片区可选房源一般，搬家会多 10 分钟通勤";
  const workStability = input.workStability?.trim() || "工作地点未来 12 个月稳定";
  const notes =
    input.notes?.trim() ||
    "房东说市场都涨了，希望下周前决定是否续租。用户担心涨租后预算变紧，也担心搬家成本和押金扣款。";

  const context = [
    houseIssues,
    landlordBehavior,
    renewalTerms,
    alternativeQuality,
    workStability,
    notes,
  ].join(" ");

  const score = { value: 92 };
  const riskItems: RenewalRiskItem[] = [];
  const rentIncrease = money(proposedRent - currentRent);
  const rentIncreaseRate = currentRent > 0 ? rentIncrease / currentRent : 0;
  const proposedRentRatio = proposedRent / Math.max(monthlyIncome, 1);
  const marketGap = proposedRent - marketRent;
  const switchUpfrontCost = movingCost + agencyFee + Math.max(0, depositRisk);
  const breakEvenMonths =
    rentIncrease > 0 ? Math.ceil(switchUpfrontCost / Math.max(rentIncrease, 1)) : 999;
  const commutePenalty = Math.max(0, alternativeCommuteMinutes - commuteMinutes);

  if (rentIncreaseRate >= 0.12 || rentIncrease >= 800) {
    addRisk(riskItems, score, 16, {
      title: "涨租幅度偏高",
      level: "高",
      why: "涨租幅度过高会直接抬高未来 12 个月固定成本，且会削弱储蓄率和换工作弹性。",
      action: "要求对方给出涨租依据，并用同片区可替代房源、维修问题和长期稳定续租做谈判。",
      proof: "当前租金、拟涨租金额、同片区房源截图、维修记录和续租沟通记录。",
    });
  }

  if (marketGap > Math.max(300, marketRent * 0.08)) {
    addRisk(riskItems, score, 14, {
      title: "续租价高于同片区可替代水平",
      level: "高",
      why: "如果续租价明显高于同片区类似房源，继续住下去是在为省搬家麻烦支付额外溢价。",
      action: "拿 3 套同片区替代房源做锚点，谈到市场价附近或要求维修、免租期、保洁等补偿。",
      proof: "同片区同面积/通勤房源截图、租金区间和通勤对比。",
    });
  }

  if (proposedRentRatio > 0.35) {
    addRisk(riskItems, score, 14, {
      title: "续租后租金收入比偏高",
      level: "高",
      why: "租金收入比过高会挤压储蓄、学习、社交和紧急现金垫。",
      action: "设置续租租金上限，超过上限就优先找替代房源或谈月付/短租期。",
      proof: "税后收入、拟续租租金、固定支出和储蓄目标。",
    });
  } else if (proposedRentRatio > 0.3) {
    addRisk(riskItems, score, 9, {
      title: "续租后预算变紧",
      level: "中",
      why: "租金收入比超过 30% 后，用户对失业、降薪和突发支出的承受力会下降。",
      action: "优先把涨租控制在可承受上限内，或者要求维持月付降低预算压力。",
      proof: "月收入、固定支出、储蓄率和付款周期。",
    });
  }

  if (hasAny(houseIssues, ["漏水", "发霉", "潮湿", "噪音", "老旧", "故障", "维修"])) {
    addRisk(riskItems, score, 10, {
      title: "房屋问题削弱续租价值",
      level: "中",
      why: "如果房屋问题仍未解决，涨租本质上是在为一个更差的居住体验付更高价格。",
      action: "把维修完成、清洁、除霉、家电保养或免租补偿作为续租条件。",
      proof: "维修记录、照片视频、报修聊天和交割记录。",
    });
  }

  if (hasAny(landlordBehavior, ["不回复", "拖", "拒绝", "强硬", "扣押金", "威胁"])) {
    addRisk(riskItems, score, 12, {
      title: "出租方合作风险较高",
      level: "中",
      why: "出租方响应差，会让未来维修、押金和提前退租成本变高。",
      action: "续租前补充押金、维修、提前退租和费用边界；无法写清时准备搬家。",
      proof: "维修响应记录、押金沟通、合同条款和聊天记录。",
    });
  }

  if (hasAny(renewalTerms, ["押金增加", "押二", "年付", "半年付", "不退", "违约金", "不能退"])) {
    addRisk(riskItems, score, 13, {
      title: "续租条款加重现金或违约压力",
      level: "高",
      why: "续租不只是月租变化，押金、付款周期、违约金和提前退租也会改变真实成本。",
      action: "拒绝口头续租，要求把租期、租金、付款周期、押金、维修和退租写进补充协议。",
      proof: "续租补充协议、付款计划、押金条款和聊天确认。",
    });
  }

  if (noticeDays < 15) {
    addRisk(riskItems, score, 8, {
      title: "剩余确认时间太短",
      level: "中",
      why: "续租窗口太短会压缩看替代房、谈判和退租交割准备时间。",
      action: "先要求延长决定期，同时并行准备 2-3 套替代房源。",
      proof: "对方要求期限、合同到期日和可替代房源清单。",
    });
  }

  if (commutePenalty >= 20 && switchUpfrontCost > rentIncrease * 4) {
    addRisk(riskItems, score, 5, {
      title: "搬家替代也有明显代价",
      level: "低",
      why: "如果替代房通勤明显变长且搬家成本高，续租谈判仍有价值。",
      action: "把搬家成本和通勤损耗作为谈判条件，避免情绪化搬走。",
      proof: "替代房通勤时间、搬家预算和中介费估算。",
    });
  }

  if (riskItems.length === 0) {
    riskItems.push({
      title: "基础续租校准",
      level: "低",
      why: "续租条件相对健康，但仍要避免只在微信里口头确认。",
      action: "把续租租金、租期、付款周期、押金、维修、退租和交割写入补充协议。",
      proof: "续租补充协议、付款备注和沟通记录。",
    });
  }

  const highCount = riskItems.filter((item) => item.level === "高").length;
  const finalScore = clamp(score.value, 28, 94);
  const status = statusFrom(finalScore, highCount);
  const decision = decisionFrom(status);
  const maxAcceptableRent = money(
    Math.min(marketRent + Math.max(200, marketRent * 0.04), monthlyIncome * 0.32),
  );

  const scenarios: RenewalScenario[] = [
    {
      label: "按现价续住",
      monthlyCost: currentRent,
      upfrontCost: 0,
      twelveMonthCost: currentRent * 12,
      verdict: "如果房东愿意维持原价或小幅上涨，这是最低切换成本方案。",
      status: scenarioStatus(currentRent / Math.max(monthlyIncome, 1), false),
    },
    {
      label: "按涨租价续租",
      monthlyCost: proposedRent,
      upfrontCost: 0,
      twelveMonthCost: proposedRent * 12,
      verdict:
        proposedRent > maxAcceptableRent
          ? "超过建议续租上限，需要谈判或寻找替代。"
          : "在可承受范围内，但仍要把维修和退租条款写清。",
      status: scenarioStatus(proposedRentRatio, proposedRent > maxAcceptableRent),
    },
    {
      label: "搬到替代房源",
      monthlyCost: marketRent,
      upfrontCost: switchUpfrontCost,
      twelveMonthCost: marketRent * 12 + switchUpfrontCost,
      verdict:
        breakEvenMonths <= contractLengthMonths
          ? "搬家成本可在本租期内被租金差抵消，可以认真看替代房。"
          : "搬家成本回收慢，除非当前房源体验或出租方风险明显较差。",
      status: scenarioStatus(marketRent / Math.max(monthlyIncome, 1), commutePenalty >= 25),
    },
  ];

  const blockers = riskItems
    .filter((item) => item.level === "高")
    .map((item) => `${item.title}：${item.action}`);

  return {
    mode: "local",
    generatedAt: new Date().toISOString(),
    city,
    listingTitle,
    status,
    score: finalScore,
    decision,
    summary:
      status === "recommend"
        ? "当前续租条件整体可控，建议争取小幅或不涨租，并把续租条款写成补充协议。"
        : status === "caution"
          ? "当前不适合直接答应涨租。建议先谈价格、维修和合同条款，同时准备替代房源。"
          : "当前建议准备搬家或强谈判。涨租、预算、房屋问题或续租条款存在高风险，不宜口头答应。",
    currentRent,
    proposedRent,
    marketRent,
    rentIncrease,
    rentIncreaseRate,
    maxAcceptableRent,
    breakEvenMonths,
    scenarios,
    riskItems,
    blockers: blockers.length ? blockers : ["暂无高优先级待确认事项，但仍需确认续租补充协议。"],
    negotiationScripts: [
      `我愿意优先考虑续租，但 ${proposedRent.toLocaleString()} 元已经高于我的预算上限。结合当前房屋状态和同片区房源，我能接受的续租价是 ${maxAcceptableRent.toLocaleString()} 元以内。`,
      "如果要涨租，请先把维修问题解决，并在续租补充协议里写清维修责任、押金返还、提前退租和付款周期。",
      "我需要至少几天时间对比同片区房源和搬家成本，不能在没有替代方案和书面条款时当天答复。",
      "如果价格无法调整，可以考虑保持租金但延长租期，或小幅上涨但增加保洁/维修/免租期补偿。",
    ],
    renewalChecklist: [
      "续租租金、租期、起止日期和付款周期写进补充协议。",
      "押金是否增加、是否沿用原押金、退租返还时间和扣减条件写清楚。",
      "已有维修问题、家具家电状态和交割记录重新确认。",
      "提前退租通知期、违约金上限和转租/换租边界写清楚。",
      "每笔续租付款备注写明房源、租期、款项用途和合同日期。",
    ],
    movePrepChecklist: [
      "同时准备 2-3 套同片区替代房源，避免谈判时没有退路。",
      "估算搬家费、中介费、清洁费、添置费和押金退还风险。",
      "提前检查退租通知期，避免因为犹豫错过合法通知窗口。",
      "用交割确认、维修记录和押金条款准备退租材料。",
      "比较替代房通勤、配套、押付方式和签约风险。",
    ],
    nextActions: [
      status === "reject" ? "先准备搬家替代方案，再和房东谈最终价。" : "先按建议上限谈判，不要直接答应涨租。",
      "进入退租押金退还，检查如果搬家会损失多少押金和违约金。",
      "进入多房源对比，把当前房源和替代房源放在同一张表里。",
      "如果决定续租，进入合同确认，核对续租补充协议。",
    ],
    assumptions: [
      `城市：${city}；当前房源：${listingTitle}；当前租金：${currentRent.toLocaleString()} 元；拟续租：${proposedRent.toLocaleString()} 元。`,
      `同片区替代租金按 ${marketRent.toLocaleString()} 元估算；搬家一次性成本约 ${switchUpfrontCost.toLocaleString()} 元。`,
      `当前通勤 ${commuteMinutes} 分钟；替代房通勤约 ${alternativeCommuteMinutes} 分钟。`,
      "这里只根据你输入的信息做续租和搬家成本判断，市场价格仍需要你结合实际房源确认。",
      `输入背景：${context}`,
    ],
  };
}
