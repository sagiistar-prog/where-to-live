import type { ReportStatus } from "@/lib/mock-data";

export type EvidencePackInput = {
  stage?: string;
  title?: string;
  city?: string;
  address?: string;
  landlordType?: string;
  deposit?: string;
  paymentCycle?: string;
  risks?: string;
  reportContext?: string;
};

export type EvidenceItem = {
  id: string;
  category: string;
  title: string;
  priority: "高" | "中" | "低";
  format: string;
  capture: string;
  filenameHint: string;
  reason: string;
};

export type EvidenceSection = {
  title: string;
  summary: string;
  items: EvidenceItem[];
};

export type EvidencePackResult = {
  mode: "local";
  generatedAt: string;
  title: string;
  status: ReportStatus;
  summary: string;
  archiveName: string;
  sections: EvidenceSection[];
  timeline: string[];
  paymentNotes: string[];
  missingWarnings: string[];
  exportText: string;
};

function includesAny(value = "", patterns: string[]) {
  return patterns.some((pattern) => value.includes(pattern));
}

function item(
  id: string,
  category: string,
  title: string,
  priority: EvidenceItem["priority"],
  format: string,
  capture: string,
  filenameHint: string,
  reason: string,
): EvidenceItem {
  return { id, category, title, priority, format, capture, filenameHint, reason };
}

function statusFromWarnings(count: number): ReportStatus {
  if (count >= 3) return "reject";
  if (count >= 1) return "caution";
  return "recommend";
}

function buildExportText(result: Omit<EvidencePackResult, "exportText">) {
  const lines = [
    `凭据材料：${result.title}`,
    `记录名：${result.archiveName}`,
    `整理时间：${new Date(result.generatedAt).toLocaleString("zh-CN")}`,
    "",
    "凭据时间线：",
    ...result.timeline.map((step, index) => `${index + 1}. ${step}`),
    "",
    "付款备注建议：",
    ...result.paymentNotes.map((note) => `- ${note}`),
    "",
    "凭据材料：",
  ];

  result.sections.forEach((section) => {
    lines.push("", `【${section.title}】${section.summary}`);
    section.items.forEach((entry) => {
      lines.push(
        `- ${entry.title}（${entry.priority}）：${entry.capture}；文件名建议：${entry.filenameHint}`,
      );
    });
  });

  if (result.missingWarnings.length) {
    lines.push("", "先别签约/补充材料提醒：", ...result.missingWarnings.map((warning) => `- ${warning}`));
  }

  return lines.join("\n");
}

export function buildEvidencePack(input: EvidencePackInput): EvidencePackResult {
  const stage = input.stage?.trim() || "签约前";
  const title = input.title?.trim() || "候选房源凭据材料";
  const city = input.city?.trim() || "目标城市";
  const address = input.address?.trim() || "待确认地址";
  const landlordType = input.landlordType?.trim() || "房东本人";
  const risks = `${input.risks ?? ""} ${input.reportContext ?? ""} ${input.deposit ?? ""} ${
    input.paymentCycle ?? ""
  } ${landlordType}`;
  const hasSubleaseRisk = includesAny(risks, ["二房东", "转租", "代理", "托管"]);
  const hasDepositRisk = includesAny(risks, ["押金", "扣", "提前退租", "违约"]);
  const hasRepairRisk = includesAny(risks, ["维修", "家电", "老小区", "漏水", "潮湿"]);
  const hasPaymentRisk = includesAny(risks, ["现金", "私人", "微信", "支付宝", "定金"]);
  const archiveName = `${city}-${title}-${stage}`.replace(/[\\/:*?"<>|]/g, "-");

  const identityItems = [
    item(
      "owner-id",
      "身份与授权",
      "出租人身份与产权链条",
      "高",
      "照片 / PDF",
      "拍产权证明、出租人身份证明、签约主体名称和收款账户信息，遮挡敏感号码后保留关键信息。",
      "01-出租权-产权与身份",
      "确认谁有权出租，避免二房东或无授权代理带来的合同风险。",
    ),
    item(
      "address-proof",
      "身份与授权",
      "房屋地址一致性",
      "高",
      "照片",
      "拍门牌、楼栋、合同地址页和房源地址说明，确认四者一致。",
      "02-地址一致性",
      "地址不一致会影响维权、押金退还和水电费用结算。",
    ),
  ];

  if (hasSubleaseRisk) {
    identityItems.push(
      item(
        "sublease-auth",
        "身份与授权",
        "转租或代理授权",
        "高",
        "照片 / 聊天确认",
        "要求提供原租赁合同的转租条款、房东授权书或托管协议，并让对方文字确认可出租期限。",
        "03-转租授权",
        "二房东或代理没有授权时，押金和居住稳定性风险会显著上升。",
      ),
    );
  }

  const conditionItems = [
    item(
      "full-video",
      "房屋状态",
      "全屋连续视频",
      "高",
      "视频",
      "从入户门开始连续拍摄客厅、卧室、厨房、卫生间、阳台、门窗、墙角和已有损坏。",
      "04-全屋交割视频",
      "退租时用于证明入住前状态，减少旧损坏被扣押金。",
    ),
    item(
      "meters",
      "房屋状态",
      "水电燃气表读数",
      "高",
      "照片",
      "拍水表、电表、燃气表读数和对应日期，最好让出租方在聊天里确认。",
      "05-表读数",
      "避免入住前历史欠费或退租结算争议。",
    ),
    item(
      "appliance-list",
      "房屋状态",
      "家具家电清单",
      "中",
      "照片 / 文本",
      "逐件拍摄品牌、型号、现有损坏和遥控器、钥匙、门禁数量。",
      "06-家具家电清单",
      "退租交割时对照是否缺失或损坏。",
    ),
  ];

  if (hasRepairRisk) {
    conditionItems.push(
      item(
        "repair-risk",
        "房屋状态",
        "维修和旧损坏确认",
        "高",
        "照片 / 聊天确认",
        "拍漏水、霉斑、墙面鼓包、家电故障和管道问题，让出租方文字确认由谁维修。",
        "07-维修责任确认",
        "维修责任不清会在入住后转化成现金损失和生活干扰。",
      ),
    );
  }

  const moneyItems = [
    item(
      "deposit-clause",
      "付款与押金",
      "押金退还条件",
      "高",
      "合同页 / 聊天确认",
      "截取押金金额、扣减条件、退还时间和验收方式，不能只保留口头承诺。",
      "08-押金条款",
      "押金纠纷最常见，必须把扣款边界写清楚。",
    ),
    item(
      "payment-record",
      "付款与押金",
      "转账记录和付款备注",
      "高",
      "截图",
      "每笔付款都截图，备注写明房屋地址、款项用途、租期和收款主体。",
      "09-付款记录",
      "付款备注能对应钱款用途，避免定金、押金、租金混淆。",
    ),
    item(
      "fee-boundary",
      "付款与押金",
      "费用边界清单",
      "高",
      "合同页 / 聊天确认",
      "让对方逐项确认水电燃气、物业、网络、中介费、保洁费、维修费和退租清洁费。",
      "10-费用边界",
      "隐藏费用会改变真实月成本，也会制造退租争议。",
    ),
  ];

  const communicationItems = [
    item(
      "chat-promises",
      "沟通记录",
      "口头承诺转文字",
      "高",
      "聊天截图",
      "把采光、噪音、维修、可养宠、可转租、提前退租等承诺逐条发给对方确认。",
      "11-承诺文字确认",
      "没有文字确认的承诺，签约后很难说清。",
    ),
    item(
      "handover-confirm",
      "沟通记录",
      "交割确认",
      "中",
      "聊天截图 / 清单",
      "入住当天把钥匙、门禁、表读数、家具家电和旧损坏清单发给对方确认。",
      "12-交割确认",
      "交割当天的确认最能减少退租扯皮。",
    ),
  ];

  const missingWarnings = [
    ...(hasSubleaseRisk ? ["存在转租或代理风险，未拿到授权材料前不建议签约。"] : []),
    ...(hasDepositRisk ? ["押金或提前退租风险较高，需要同时保存合同页和聊天确认。"] : []),
    ...(hasPaymentRisk ? ["涉及私人收款或定金，必须确认收款账户与签约主体一致。"] : []),
    ...(hasRepairRisk ? ["存在维修或房屋质量风险，入住前要完成旧损坏确认。"] : []),
  ];

  const sections = [
    {
      title: "身份与授权",
      summary: "确认谁有权出租，以及地址、合同和收款主体是否一致。",
      items: identityItems,
    },
    {
      title: "房屋状态",
      summary: "记录入住前状态，避免旧损坏和历史欠费变成你的责任。",
      items: conditionItems,
    },
    {
      title: "付款与押金",
      summary: "记录每笔钱的用途和退还条件，降低押金纠纷概率。",
      items: moneyItems,
    },
    {
      title: "沟通记录",
      summary: "把关键承诺从口头变成可追溯文字。",
      items: communicationItems,
    },
  ];

  const baseResult: Omit<EvidencePackResult, "exportText"> = {
    mode: "local",
    generatedAt: new Date().toISOString(),
    title,
    status: statusFromWarnings(missingWarnings.length),
    summary: `已为 ${address} 整理 ${sections.flatMap((section) => section.items).length} 项凭据留存事项。重点保留出租权、押金、付款备注、交割视频和文字确认。`,
    archiveName,
    sections,
    timeline: [
      "看房当天：拍全屋、门牌、楼道、表读数和明显损坏。",
      "谈定金前：确认出租权、收款主体、押金退还和费用边界。",
      "签约当天：拍合同关键页、付款备注、家具家电清单和交割确认。",
      "入住后 24 小时内：补拍遗漏损坏，并发给出租方文字确认。",
      "退租前 7 天：按入住凭据反向核对，提前确认押金退还方式。",
    ],
    paymentNotes: [
      `支付${input.deposit || "押金/租金"}，房屋地址：${address}，款项用途：押金/租金，租期和合同一致。`,
      "付款前确认收款人姓名、账号与合同出租方或授权收款方一致。",
      "不要使用“辛苦费、占房费、好处费”等模糊备注。",
    ],
    missingWarnings: missingWarnings.length
      ? missingWarnings
      : ["当前未触发明显缺证风险，但签约前仍需确认所有高优先级凭据。"],
  };

  return {
    ...baseResult,
    exportText: buildExportText(baseResult),
  };
}
