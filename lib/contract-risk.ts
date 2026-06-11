export type ContractSeverity = "高" | "中" | "低";

export type ContractFinding = {
  title: string;
  severity: ContractSeverity;
  category: string;
  evidence: string;
  risk: string;
  action: string;
  negotiationText: string;
};

export type ContractCheckInput = {
  text?: string;
  city?: string;
  role?: "tenant" | "landlord";
  screenshotDataUrl?: string;
};

export type ContractCheckResult = {
  mode: "openai" | "fallback";
  checkedAt: string;
  overallLevel: ContractSeverity;
  score: number;
  summary: string;
  findings: ContractFinding[];
  missingClauses: string[];
  evidenceChecklist: string[];
  nextSteps: string[];
  disclaimer: string;
  sources: Array<{
    title: string;
    url: string;
  }>;
  warnings: string[];
};

export const contractRiskSources = [
  {
    title: "市场监管总局《城镇房屋租赁合同（示范文本）》（2025 版）",
    url: "https://htsfwb.samr.gov.cn/View?id=2340996b-882d-47a4-b74d-c30784628737",
  },
  {
    title: "市场监管总局关于发布《城镇房屋租赁合同（示范文本）》的说明",
    url: "https://www.samr.gov.cn/wljys/sjdt/art/2025/art_11efc3547a1545c5ad452123ebc4a5f0.html",
  },
  {
    title: "司法部：国务院公布《住房租赁条例》",
    url: "https://www.moj.gov.cn/pub/sfbgwapp/bnywapp/202507/t20250721_522919.html",
  },
];

const defaultChecklist = [
  "出租人身份证明、产权证明或合法转租授权",
  "押金金额、返还时间、扣减条件和验收标准",
  "租金支付周期、收款账户和付款备注",
  "水电燃气、物业、网费等费用边界",
  "家具家电清单、现状照片和交割确认",
  "自然损耗、人为损坏和维修响应时限",
  "提前退租通知期、违约金上限和转租配合",
  "房屋安全、消防、燃气和非居住空间出租情况",
];

function has(text: string, pattern: RegExp) {
  return pattern.test(text);
}

function addFinding(
  findings: ContractFinding[],
  finding: ContractFinding,
) {
  if (!findings.some((item) => item.title === finding.title)) {
    findings.push(finding);
  }
}

function severityScore(severity: ContractSeverity) {
  if (severity === "高") return 24;
  if (severity === "中") return 14;
  return 6;
}

function overallFromFindings(findings: ContractFinding[]): ContractSeverity {
  if (findings.some((item) => item.severity === "高")) return "高";
  if (findings.some((item) => item.severity === "中")) return "中";
  return "低";
}

function scoreFromFindings(findings: ContractFinding[]) {
  const penalty = findings.reduce((sum, item) => sum + severityScore(item.severity), 0);
  return Math.max(0, Math.min(100, 92 - penalty));
}

function missingClause(text: string, label: string, pattern: RegExp) {
  return pattern.test(text) ? null : label;
}

export function buildFallbackContractCheck(
  input: ContractCheckInput,
): ContractCheckResult {
  const text = input.text?.trim() || "";
  const findings: ContractFinding[] = [];

  if (has(text, /押金.{0,12}不退|不退.{0,8}押金|提前退租.{0,18}押金不退/)) {
    addFinding(findings, {
      title: "提前退租直接没收押金",
      severity: "高",
      category: "押金与违约",
      evidence: "文本中出现“押金不退”或类似约定。",
      risk: "押金可能被作为无限额违约金使用，退租时会形成直接现金损失。",
      action: "要求写明提前通知期、违约金上限、押金返还时间和扣减标准。",
      negotiationText:
        "建议改为：承租人提前退租应提前 X 日通知，违约金以一个月租金或双方约定上限为限，剩余押金在交割结清后 X 日内返还。",
    });
  }

  if (has(text, /出售房屋.{0,20}无条件.{0,8}搬离|买卖.{0,12}不影响|甲方出售.{0,30}搬离/)) {
    addFinding(findings, {
      title: "出售房屋要求无条件搬离",
      severity: "高",
      category: "租期稳定",
      evidence: "文本中出现房屋出售后承租人无条件搬离的表述。",
      risk: "租期稳定性被削弱，可能与“买卖不破租赁”的通常风险防范方向冲突。",
      action: "要求明确租期内买卖不影响承租使用，或约定充分通知期和搬迁补偿。",
      negotiationText:
        "建议改为：租赁期间房屋权属变化不影响本合同继续履行；确需提前解除的，应提前 X 日通知并承担搬迁补偿。",
    });
  }

  if (has(text, /设施.{0,20}乙方负责维修|所有.{0,10}维修.{0,10}乙方|损坏.{0,8}乙方.{0,8}维修/)) {
    addFinding(findings, {
      title: "维修责任全部压给承租人",
      severity: "中",
      category: "维修责任",
      evidence: "文本中将房屋设施维修责任概括性归给承租人。",
      risk: "自然老化、管道堵塞、家电寿命问题可能被要求由承租人承担。",
      action: "区分自然损耗和人为损坏，明确报修响应时限和费用承担。",
      negotiationText:
        "建议改为：自然损耗、设备老化和非承租人原因造成的损坏由出租人负责维修；承租人人为损坏由承租人承担。",
    });
  }

  if (has(text, /二房东|转租|代签|受托|授权/)) {
    addFinding(findings, {
      title: "转租或代签授权需要确认",
      severity: "高",
      category: "出租主体",
      evidence: "文本中出现二房东、转租、代签、授权等关键词。",
      risk: "如果出租人与产权人不一致且无书面授权，后续合同效力、退租和押金返还都会变复杂。",
      action: "查看产权证明、原租赁合同、允许转租条款和书面授权，拍照留存。",
      negotiationText:
        "签约前请对方提供产权证明及授权材料，并在合同附件中列明授权来源、授权范围和有效期限。",
    });
  }

  if (has(text, /定金|服务费|中介费|管理费/)) {
    addFinding(findings, {
      title: "额外费用边界不清",
      severity: "中",
      category: "费用",
      evidence: "文本中出现定金、服务费、中介费或管理费。",
      risk: "额外费用可能被拆分收取，导致真实月成本高于预算。",
      action: "列明每笔费用金额、收款方、用途、是否可退和退款条件。",
      negotiationText:
        "请将所有费用写入费用清单：金额、支付时间、收款账户、退还条件和对应服务内容。",
    });
  }

  if (has(text, /厨房|卫生间|阳台|过道|地下储藏室|车库|隔断/)) {
    addFinding(findings, {
      title: "疑似非居住空间或隔断出租",
      severity: "高",
      category: "居住安全",
      evidence: "文本中出现厨房、卫生间、阳台、过道、地下储藏室、车库或隔断出租相关描述。",
      risk: "可能涉及安全、消防、居住合法性和后续被清退风险。",
      action: "确认是否为合法居住空间，确认消防、燃气、采光、通风和人数限制。",
      negotiationText:
        "请确认出租空间为合法居住空间，并提供房屋平面、消防和居住用途相关说明。",
    });
  }

  if (has(text, /随时涨租|单方涨租|甲方.{0,8}单方.{0,8}解除|随时解除/)) {
    addFinding(findings, {
      title: "出租方单方变更或解除权过大",
      severity: "高",
      category: "合同稳定",
      evidence: "文本中出现单方涨租、单方解除或随时解除等表述。",
      risk: "承租人租期稳定性不足，可能被临时涨租或要求搬离。",
      action: "要求限定解除条件、通知期、补偿方式和租期内租金调整规则。",
      negotiationText:
        "建议改为：租期内租金不因出租方单方原因调整；任何提前解除应有明确事由、通知期和补偿责任。",
    });
  }

  const missingClauses = [
    missingClause(text, "未看到明确租赁期限", /租期|租赁期限|起租|到期|年月日/),
    missingClause(text, "未看到押金返还时间和扣减标准", /押金.{0,20}返还|退还.{0,20}押金|扣减|验收/),
    missingClause(text, "未看到出租人身份或授权材料", /身份证|产权|房产证|不动产权|授权|委托/),
    missingClause(text, "未看到维修责任拆分", /自然损耗|人为损坏|维修|修理|报修/),
    missingClause(text, "未看到家具家电交割清单", /家具|家电|清单|交割|验收|照片/),
    missingClause(text, "未看到水电燃气和物业费用边界", /水费|电费|燃气|物业|网费|宽带/),
  ].filter((item): item is string => Boolean(item));

  if (!findings.length && text.length < 20) {
    addFinding(findings, {
      title: "输入内容不足",
      severity: "中",
      category: "信息完整性",
      evidence: "当前输入过短，无法判断具体合同风险。",
      risk: "缺少条款会让系统只能给通用确认清单，无法定位真实损失点。",
      action: "粘贴完整合同、补充协议、费用说明或中介聊天截图中的关键条款。",
      negotiationText: "请对方提供完整合同文本和费用清单后，再做签约前确认。",
    });
  }

  const overallLevel = overallFromFindings(findings);
  const score = scoreFromFindings(findings);

  return {
    mode: "fallback",
    checkedAt: new Date().toISOString(),
    overallLevel,
    score,
    summary:
      overallLevel === "高"
        ? "检测到可能造成直接现金损失或租期不稳定的高风险条款。建议先改条款，再考虑付款。"
        : overallLevel === "中"
          ? "检测到若干需要补充或改写的条款。建议签约前逐条确认，不要只接受口头承诺。"
          : "未识别到明显高风险表达，但仍需补充身份、押金、维修、费用和交割凭据。",
    findings,
    missingClauses,
    evidenceChecklist: defaultChecklist,
    nextSteps: [
      "把高风险条款发给出租方或中介，要求书面改写。",
      "付款前确认产权、授权、身份证明和收款账户一致性。",
      "看房交割时拍摄水电表、家具家电、墙面、地板、门锁和卫生间。",
      "大额付款备注写明房源地址、款项用途、租期和合同日期。",
    ],
    disclaimer:
      "本结果仅用于租房签约前风险提示和确认清单，不构成法律意见；重大纠纷请咨询专业律师或当地主管部门。",
    sources: contractRiskSources,
    warnings: ["当前结果先按你粘贴的合同文本和常见租房风险整理；如果合同很长或包含截图，请继续核对原文中的押金、维修、授权和提前退租条款。"],
  };
}
