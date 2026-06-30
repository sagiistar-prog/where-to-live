import type { ReportStatus } from "@/lib/mock-data";

export type DepositRefundInput = {
  city?: string;
  monthlyRent?: number;
  depositAmount?: number;
  moveOutDate?: string;
  noticeDate?: string;
  requiredNoticeDays?: number;
  contractReturnDays?: number;
  unpaidRent?: number;
  utilityBalance?: number;
  cleaningFee?: number;
  damageClaim?: number;
  penaltyClaim?: number;
  evidenceLevel?: string;
  landlordReason?: string;
};

export type DepositDeductionItem = {
  label: string;
  amount: number;
  confidence: "明确" | "需确认" | "可争议";
  reason: string;
  action: string;
};

export type DepositTimelineItem = {
  dateLabel: string;
  title: string;
  action: string;
};

export type DepositRefundResult = {
  mode: "local";
  generatedAt: string;
  city: string;
  status: ReportStatus;
  score: number;
  summary: string;
  depositAmount: number;
  claimedDeduction: number;
  clearDeduction: number;
  disputedDeduction: number;
  suggestedRefundFloor: number;
  targetRefund: number;
  noticeGapDays: number;
  returnDeadlineText: string;
  deductions: DepositDeductionItem[];
  risks: string[];
  evidenceChecklist: string[];
  timeline: DepositTimelineItem[];
  messageTemplates: string[];
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

function parseDate(value: string | undefined, fallbackOffsetDays: number) {
  if (value) {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  const date = new Date();
  date.setDate(date.getDate() + fallbackOffsetDays);
  return date;
}

function dayDiff(start: Date, end: Date) {
  return Math.ceil((end.getTime() - start.getTime()) / 86400000);
}

function formatDate(date: Date) {
  return date.toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function statusFromScore(score: number, disputedRatio: number, noticeShort: boolean): ReportStatus {
  if (score < 55 || disputedRatio > 0.7) return "reject";
  if (score < 75 || noticeShort || disputedRatio > 0.35) return "caution";
  return "recommend";
}

function evidencePenalty(level: string) {
  if (level.includes("完整")) return 0;
  if (level.includes("部分")) return 8;
  return 18;
}

export function buildDepositRefundPlan(input: DepositRefundInput): DepositRefundResult {
  const city = input.city?.trim() || "目标城市";
  const monthlyRent = numberOr(input.monthlyRent, 0);
  const depositAmount = numberOr(input.depositAmount, monthlyRent);
  const requiredNoticeDays = numberOr(input.requiredNoticeDays, 0);
  const contractReturnDays = numberOr(input.contractReturnDays, 0);
  const unpaidRent = money(numberOr(input.unpaidRent, 0));
  const utilityBalance = money(numberOr(input.utilityBalance, 0));
  const cleaningFee = money(numberOr(input.cleaningFee, 0));
  const damageClaim = money(numberOr(input.damageClaim, 0));
  const penaltyClaim = money(numberOr(input.penaltyClaim, 0));
  const evidenceLevel = input.evidenceLevel?.trim() || "不确定";
  const landlordReason =
    input.landlordReason?.trim() || "对方扣款理由待补充。";

  const noticeDate = parseDate(input.noticeDate, -15);
  const moveOutDate = parseDate(input.moveOutDate, 7);
  const noticeGapDays = dayDiff(noticeDate, moveOutDate);
  const noticeShort = noticeGapDays < requiredNoticeDays;
  const returnDeadline = addDays(moveOutDate, contractReturnDays);

  const deductions: DepositDeductionItem[] = [
    {
      label: "未结清租金",
      amount: unpaidRent,
      confidence: unpaidRent > 0 ? "明确" : "需确认",
      reason: unpaidRent > 0 ? "存在未结清租金输入。" : "当前未填写未结清租金。",
      action: "用租金账单、转账记录和租期日期核对。",
    },
    {
      label: "水电燃气/宽带结算",
      amount: utilityBalance,
      confidence: utilityBalance > 0 ? "明确" : "需确认",
      reason: "退租时通常需要按表读数和账单结清。",
      action: "拍退租当天表读数，保存账单或小程序截图。",
    },
    {
      label: "清洁费",
      amount: cleaningFee,
      confidence: cleaningFee > 0 ? "需确认" : "可争议",
      reason: cleaningFee > 0 ? "清洁费需要合同或双方约定支持。" : "未填写清洁费。",
      action: "要求出租方说明收费依据，并对照合同与交割照片。",
    },
    {
      label: "损坏维修扣款",
      amount: damageClaim,
      confidence: damageClaim > 0 ? "可争议" : "需确认",
      reason: landlordReason,
      action: "要求逐项列明损坏位置、维修报价、照片和是否属于入住前旧损坏或自然损耗。",
    },
    {
      label: "提前退租违约金",
      amount: penaltyClaim,
      confidence: penaltyClaim > 0 || noticeShort ? "可争议" : "需确认",
      reason: noticeShort
        ? `通知期 ${noticeGapDays} 天，短于合同要求 ${requiredNoticeDays} 天。`
        : "当前通知期未明显不足。",
      action: "核对合同提前退租条款、通知记录和是否允许转租减损。",
    },
  ];

  const clearDeduction = money(unpaidRent + utilityBalance);
  const disputedDeduction = money(cleaningFee + damageClaim + penaltyClaim);
  const claimedDeduction = money(clearDeduction + disputedDeduction);
  const suggestedRefundFloor = money(depositAmount - clearDeduction - Math.min(disputedDeduction, depositAmount * 0.35));
  const targetRefund = money(depositAmount - clearDeduction);
  const disputedRatio = disputedDeduction / Math.max(depositAmount, 1);
  const score = clamp(
    Math.round(
      92 -
        disputedRatio * 38 -
        (noticeShort ? 12 : 0) -
        evidencePenalty(evidenceLevel) -
        (claimedDeduction > depositAmount ? 10 : 0),
    ),
    28,
    92,
  );
  const status = statusFromScore(score, disputedRatio, noticeShort);

  const risks = [
    noticeShort ? `提前通知期不足：当前 ${noticeGapDays} 天，合同要求 ${requiredNoticeDays} 天。` : "",
    damageClaim > 0 ? "出租方提出维修扣款，需要逐项确认损坏、责任和报价。" : "",
    cleaningFee > 0 ? "清洁费需要合同或交割约定支持，应提供书面依据。" : "",
    penaltyClaim > 0 ? "提前退租违约金需要核对上限和减损义务。" : "",
    evidenceLevel.includes("几乎") ? "材料较弱，优先补充交割确认、退租视频和聊天确认。" : "",
    claimedDeduction > depositAmount ? "对方拟扣款超过押金金额，必须要求明细和依据。" : "",
  ].filter(Boolean);

  const evidenceChecklist = [
    "入住当天全屋视频、旧损坏照片、家具家电清单。",
    "退租当天全屋连续视频、钥匙门禁交割、水电燃气表读数。",
    "合同中押金返还时间、扣减条件、提前退租和维修责任条款。",
    "所有租金、押金、费用转账记录和付款备注。",
    "关于维修、清洁、退租日期、押金返还的聊天确认。",
    "出租方提出扣款时的照片、报价、发票或维修记录。",
  ];

  const timeline: DepositTimelineItem[] = [
    {
      dateLabel: "退租前 7 天",
      title: "发起书面退租确认",
      action: "确认退租日期、交割时间、押金返还账户和水电结算方式。",
    },
    {
      dateLabel: "退租当天",
      title: "保存交割记录",
      action: "拍全屋视频、表读数、钥匙门禁和家具家电状态，让对方在聊天里确认。",
    },
    {
      dateLabel: formatDate(returnDeadline),
      title: "押金返还截止提醒",
      action: `按合同约定 ${contractReturnDays} 天内返还。未返还时发送书面催告并附材料清单。`,
    },
    {
      dateLabel: "逾期后 3 天",
      title: "升级沟通",
      action: "要求对方提供扣款明细、合同依据和维修票据；仍拒绝时准备官方投诉或调解材料。",
    },
  ];

  const messageTemplates = [
    `退租交割确认：我将于 ${formatDate(moveOutDate)} 办理退租交割，请确认押金 ${depositAmount.toLocaleString()} 元的返还账户、返还时间和需结清费用明细。`,
    "扣款明细请求：请逐项提供扣款项目、金额、合同依据、损坏照片、维修报价或票据；未提供依据的扣款我暂不确认。",
    `押金返还催告：根据合同约定和交割记录，除已确认费用外，请于 ${formatDate(returnDeadline)} 前返还剩余押金。`,
  ];

  return {
    mode: "local",
    generatedAt: new Date().toISOString(),
    city,
    status,
    score,
    summary:
      status === "recommend"
        ? `当前押金退还风险可控，目标退还约 ${targetRefund.toLocaleString()} 元。按时间线办理交割和书面确认。`
        : status === "caution"
          ? `当前押金退还存在争议项，建议目标退还 ${targetRefund.toLocaleString()} 元，最低可接受退还不低于 ${suggestedRefundFloor.toLocaleString()} 元。`
          : `当前押金退还风险较高，对方拟扣款或待补充材料可能明显侵蚀押金，补充材料并要求扣款依据。`,
    depositAmount: money(depositAmount),
    claimedDeduction,
    clearDeduction,
    disputedDeduction,
    suggestedRefundFloor,
    targetRefund,
    noticeGapDays,
    returnDeadlineText: `${formatDate(returnDeadline)} 前`,
    deductions,
    risks: risks.length ? risks : ["当前未发现明显押金退还风险，但仍需补充交割记录和书面确认。"],
    evidenceChecklist,
    timeline,
    messageTemplates,
    nextActions: [
      "先把扣款分成明确费用和争议费用，不接受未拆分的扣款明细。",
      "退租当天完成全屋视频、表读数、钥匙门禁和聊天确认。",
      "要求出租方对每项扣款提供合同依据、照片、报价或票据。",
      status === "reject" ? "材料未补充前不要签署放弃押金或确认扣款的文字。" : "按返还截止日设置提醒，逾期后升级催告。",
    ],
    assumptions: [
      `城市：${city}，月租：${monthlyRent.toLocaleString()} 元，押金：${depositAmount.toLocaleString()} 元。`,
      `退租通知期：当前 ${noticeGapDays} 天，合同要求 ${requiredNoticeDays} 天。`,
      "本结果用于整理押金退还计划和材料清单；重大争议建议咨询律师或官方调解渠道。",
    ],
  };
}
