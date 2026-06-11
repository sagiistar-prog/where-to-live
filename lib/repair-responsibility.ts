import type { ReportStatus } from "@/lib/mock-data";

export type RepairResponsibilityInput = {
  city?: string;
  listingTitle?: string;
  issueType?: string;
  urgency?: string;
  damageScope?: string;
  discoveredTiming?: string;
  evidenceLevel?: string;
  contractClause?: string;
  landlordResponse?: string;
  repairCost?: number;
  safetyImpact?: string;
  tenantCause?: string;
  depositConcern?: string;
  notes?: string;
};

export type RepairRiskLevel = "高" | "中" | "低";

export type RepairRiskItem = {
  title: string;
  level: RepairRiskLevel;
  why: string;
  action: string;
  proof: string;
};

export type RepairTimelineItem = {
  title: string;
  timing: string;
  action: string;
};

export type RepairResponsibilityResult = {
  mode: "local";
  generatedAt: string;
  city: string;
  listingTitle: string;
  status: ReportStatus;
  score: number;
  verdict: "出租方应负责处理" | "需协商并保存凭据" | "先别自费维修";
  responsibility: "出租方优先" | "承租方可能承担" | "责任不清需补充材料";
  issueType: string;
  estimatedCost: number;
  summary: string;
  riskItems: RepairRiskItem[];
  blockers: string[];
  evidenceChecklist: string[];
  messageTemplates: string[];
  costControl: string[];
  timeline: RepairTimelineItem[];
  escalationOptions: string[];
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
  risks: RepairRiskItem[],
  score: { value: number },
  penalty: number,
  risk: RepairRiskItem,
) {
  risks.push(risk);
  score.value -= penalty;
}

function statusFrom(score: number, highCount: number): ReportStatus {
  if (score < 58 || highCount >= 3) return "reject";
  if (score < 78 || highCount >= 1) return "caution";
  return "recommend";
}

function verdictFrom(status: ReportStatus): RepairResponsibilityResult["verdict"] {
  if (status === "recommend") return "出租方应负责处理";
  if (status === "caution") return "需协商并保存凭据";
  return "先别自费维修";
}

export function buildRepairResponsibility(
  input: RepairResponsibilityInput,
): RepairResponsibilityResult {
  const city = input.city?.trim() || "目标城市";
  const listingTitle = input.listingTitle?.trim() || "候选房源";
  const issueType = input.issueType?.trim() || "卫生间漏水";
  const urgency = input.urgency?.trim() || "影响正常居住";
  const damageScope = input.damageScope?.trim() || "卫生间地面渗水，楼下也反馈漏水";
  const discoveredTiming = input.discoveredTiming?.trim() || "入住后 7 天内发现";
  const evidenceLevel = input.evidenceLevel?.trim() || "有照片和视频";
  const contractClause = input.contractClause?.trim() || "合同只写设施损坏由承租人负责维修";
  const landlordResponse = input.landlordResponse?.trim() || "房东让租客先自己找人修，费用之后再说";
  const repairCost = money(numberOr(input.repairCost, 1200));
  const safetyImpact = input.safetyImpact?.trim() || "有滑倒和继续渗漏风险";
  const tenantCause = input.tenantCause?.trim() || "非人为损坏";
  const depositConcern = input.depositConcern?.trim() || "担心退租时从押金扣";
  const notes =
    input.notes?.trim() ||
    "看房时没有说明漏水，入住后几天发现卫生间持续渗水，房东说小问题让租客自己处理。";
  const context = [
    issueType,
    urgency,
    damageScope,
    discoveredTiming,
    evidenceLevel,
    contractClause,
    landlordResponse,
    safetyImpact,
    tenantCause,
    depositConcern,
    notes,
  ].join(" ");

  const score = { value: 92 };
  const riskItems: RepairRiskItem[] = [];
  const likelyTenantCaused =
    !hasAny(tenantCause, ["非人为", "自然损耗", "设备老化"]) &&
    hasAny(tenantCause, ["人为", "我造成", "使用不当", "宠物", "打孔", "改造"]);

  const urgentIssue = hasAny(context, [
    "漏水",
    "渗水",
    "停电",
    "跳闸",
    "燃气",
    "门锁",
    "无法入住",
    "严重发霉",
    "异味",
    "危险",
  ]);

  if (urgentIssue || hasAny(urgency, ["无法正常居住", "影响正常居住", "安全", "紧急"])) {
    addRisk(riskItems, score, 14, {
      title: "问题已影响正常居住或安全",
      level: "高",
      why: "漏水、电路、燃气、门锁、严重发霉等问题如果拖延，会扩大损失并影响居住安全。",
      action: "先书面通知出租方限时维修；涉及人身安全或扩大损失时，保留紧急处置记录和费用记录。",
      proof: "连续视频、照片、时间戳、楼下反馈、物业记录和紧急维修单。",
    });
  }

  if (hasAny(discoveredTiming, ["入住前", "入住当天", "7 天", "一周", "交割"])) {
    addRisk(riskItems, score, 8, {
      title: "疑似入住前已存在问题",
      level: "中",
      why: "入住前或入住初期发现的问题，更需要结合交割记录判断是否属于旧损坏或房屋自然损耗。",
      action: "对照交割确认视频、看房照片和聊天记录，要求出租方确认并承担非人为原因维修。",
      proof: "交割确认视频、看房照片、报修时间和首次发现问题的聊天记录。",
    });
  }

  if (hasAny(contractClause, ["所有维修", "承租人负责", "乙方负责维修", "概不负责", "自行维修"])) {
    addRisk(riskItems, score, 16, {
      title: "合同维修责任过度压给承租人",
      level: "高",
      why: "把所有维修概括性压给承租人，会把自然损耗、设备老化和房屋质量问题转成用户现金损失。",
      action: "要求区分自然损耗、设备老化、房屋结构问题和承租人人为损坏；必要时进入合同确认补充条款。",
      proof: "合同维修条款截图、补充协议和出租方文字确认。",
    });
  }

  if (hasAny(landlordResponse, ["不回复", "拖", "自己修", "之后再说", "不管", "拒绝", "退租再说"])) {
    addRisk(riskItems, score, 14, {
      title: "出租方响应不明确",
      level: "高",
      why: "维修响应拖延会让损失扩大，也会在退租时被反向说成承租人未及时报修。",
      action: "发送带截止时间的书面报修，要求确认责任、维修时间、费用承担和是否允许紧急维修。",
      proof: "报修消息、已读或通话记录、物业工单和维修预约截图。",
    });
  }

  if (hasAny(evidenceLevel, ["几乎没有", "没有", "只有口头"])) {
    addRisk(riskItems, score, 12, {
      title: "凭据不足",
      level: "中",
      why: "没有照片、视频、时间线和报修记录时，后续很难证明问题出现时间、责任归属和费用合理性。",
      action: "补充拍连续视频、近景远景、影响范围、表读数和报修聊天，再讨论维修费用。",
      proof: "照片视频、时间戳、报修记录、物业反馈和维修报价。",
    });
  }

  if (repairCost >= 1000) {
    addRisk(riskItems, score, 10, {
      title: "维修金额较高",
      level: "中",
      why: "高额维修如果先自费，后续报销和押金抵扣都容易争议。",
      action: "付款前拿到报价单、维修范围、责任确认和发票/收据，避免只凭口头承诺先垫付。",
      proof: "至少 1 份维修报价、付款记录、维修前后照片和出租方同意记录。",
    });
  }

  if (likelyTenantCaused) {
    addRisk(riskItems, score, 15, {
      title: "可能存在承租方责任",
      level: "高",
      why: "如果是承租人人为损坏或使用不当，维修费用可能需要由承租方承担。",
      action: "先确认损坏原因和费用边界，争取只承担直接、合理、可证明的维修费用。",
      proof: "损坏原因说明、维修报价、前后状态照片和费用票据。",
    });
  }

  if (hasAny(depositConcern, ["押金", "扣", "退租"])) {
    addRisk(riskItems, score, 7, {
      title: "可能演变为押金扣款争议",
      level: "中",
      why: "维修责任不清常在退租时变成押金扣款，需要提前固定问题来源和处理过程。",
      action: "把报修、责任确认、维修结果和费用票据同步放进凭据材料。",
      proof: "报修时间线、维修结果确认、费用票据和退租前状态视频。",
    });
  }

  if (riskItems.length === 0) {
    riskItems.push({
      title: "基础报修凭据",
      level: "低",
      why: "即使责任较清楚，也要让每一次维修都有问题、时间、责任、费用和结果记录。",
      action: "报修时写清问题位置、影响范围、发现时间、是否影响居住和希望维修时限。",
      proof: "照片视频、聊天确认、维修单、付款记录和维修后复拍。",
    });
  }

  const highCount = riskItems.filter((item) => item.level === "高").length;
  const finalScore = clamp(score.value, 26, 94);
  const status = statusFrom(finalScore, highCount);
  const verdict = verdictFrom(status);

  let responsibility: RepairResponsibilityResult["responsibility"] = "责任不清需补充材料";
  if (likelyTenantCaused) {
    responsibility = "承租方可能承担";
  } else if (
    urgentIssue ||
    hasAny(discoveredTiming, ["入住前", "入住当天", "7 天", "一周", "交割"]) ||
    hasAny(tenantCause, ["非人为", "自然损耗", "设备老化"])
  ) {
    responsibility = "出租方优先";
  }

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
    verdict,
    responsibility,
    issueType,
    estimatedCost: repairCost,
    summary:
      status === "recommend"
        ? "当前维修责任相对清楚，建议按报修、确认、维修、复拍的顺序处理，并保存费用和结果凭据。"
        : status === "caution"
          ? "当前维修责任存在争议，建议补充凭据、拿到出租方书面确认，再决定是否垫付或安排维修。"
          : "当前不建议直接自费维修。问题可能影响居住或押金，且合同、责任或出租方响应存在高风险信息待补充，先书面报修并固定凭据。",
    riskItems,
    blockers: blockers.length ? blockers : ["暂无高优先级待确认事项，但仍需保存基础报修凭据。"],
    evidenceChecklist: [
      "连续视频：从门牌或房间整体拍到问题位置，证明具体房源和影响范围。",
      "近景照片：漏水、霉斑、裂缝、损坏部位、家电故障提示或异味来源。",
      "时间线：首次发现时间、首次报修时间、对方回复时间和维修预计时间。",
      "合同条款：维修责任、自然损耗、人为损坏、报修时限和费用承担条款。",
      "维修报价：维修范围、材料费、人工费、是否开票和保修期。",
      "维修后复拍：证明问题是否解决，避免退租时重复扣款。",
    ],
    messageTemplates: [
      `报修通知：${listingTitle} 出现 ${issueType}，发现时间为 ${discoveredTiming}，目前影响为“${urgency}”。我已保留照片和视频，请确认由谁安排维修、预计预计时间和费用承担方式。`,
      `责任确认：该问题看起来不像承租人人为造成，请在维修前书面确认是否由出租方承担；如需我先垫付，请确认报销金额、凭据要求和付款时间。`,
      `限时维修：该问题已影响正常居住/可能扩大损失，请在 24 小时内确认维修安排；如无法及时维修，我将保留紧急维修、物业反馈和费用记录。`,
      `押金边界：本次维修过程和结果请同步确认，避免退租时重复作为押金扣款依据。`,
    ],
    costControl: [
      "不要在责任未确认前支付大额维修费；紧急维修也要保留报价、发票和对方授权。",
      "涉及人为损坏时，只承担直接、合理、可证明的维修费用，不接受笼统扣款。",
      "自然损耗、设备老化、管道渗漏和房屋结构问题优先要求出租方处理。",
      "所有现金支出都要有付款备注，写明房源、维修项目、日期和费用用途。",
    ],
    timeline: [
      {
        title: "补充材料",
        timing: "今天",
        action: "拍摄连续视频、近景照片、合同条款和首次发现时间线。",
      },
      {
        title: "书面报修",
        timing: "今天",
        action: "把问题、影响、凭据和希望维修时限发给出租方或中介。",
      },
      {
        title: "确认责任",
        timing: "24 小时内",
        action: "确认由谁维修、谁付费、是否允许垫付和需要哪些票据。",
      },
      {
        title: "维修复拍",
        timing: "维修结束后",
        action: "拍维修前后对比、保存票据，并让对方确认问题已处理。",
      },
    ],
    escalationOptions: [
      "先找出租方或合同约定联系人，避免只和口头中介沟通。",
      "同步物业或楼管记录，尤其是漏水、公共管道、电路和楼下受损。",
      "对方长期不维修时，整理合同、报修记录、凭据和费用票据，进入官方投诉或调解准备。",
      "涉及燃气、电路、门锁失效等安全问题时，优先采取必要的安全处置，并保留全过程凭据。",
    ],
    nextActions: [
      status === "reject"
        ? "先别自费维修，先发送限时书面报修并补充凭据。"
        : "先拿到责任确认和费用口径，再安排维修或垫付。",
      "把维修凭据同步放进租前/租中凭据材料。",
      "如合同条款把所有维修压给承租人，进入合同确认或补充协议修正。",
      "退租前把本次维修结果和费用确认纳入押金退还计划。",
    ],
    assumptions: [
      `城市：${city}；房源：${listingTitle}；问题：${issueType}。`,
      `预估维修金额：${repairCost.toLocaleString()} 元；发现时间：${discoveredTiming}。`,
      "本页基于用户主动输入整理维修责任判断建议；重大争议建议咨询法律意见、官方调解或专业鉴定。",
      `输入背景：${context}`,
    ],
  };
}
