import type { ReportStatus } from "@/lib/mock-data";

export type PaymentGateInput = {
  city?: string;
  listingTitle?: string;
  paymentType?: string;
  amount?: number;
  monthlyRent?: number;
  stage?: string;
  contractStatus?: string;
  identityStatus?: string;
  authorizationStatus?: string;
  payeeType?: string;
  payeeMatchesContract?: string;
  refundRule?: string;
  receiptStatus?: string;
  paymentChannel?: string;
  urgencyPressure?: string;
  notes?: string;
  reportContext?: string;
};

export type PaymentRiskLevel = "高" | "中" | "低";

export type PaymentRiskItem = {
  title: string;
  level: PaymentRiskLevel;
  why: string;
  action: string;
  proof: string;
};

export type PaymentGateResult = {
  mode: "local";
  generatedAt: string;
  city: string;
  listingTitle: string;
  status: ReportStatus;
  score: number;
  verdict: "可以付款" | "谨慎小额" | "先别付款";
  summary: string;
  paymentType: string;
  amount: number;
  maxReasonableHold: number;
  riskItems: PaymentRiskItem[];
  blockers: string[];
  beforePayChecklist: string[];
  paymentNoteTemplate: string;
  receiptChecklist: string[];
  negotiationScripts: string[];
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
  risks: PaymentRiskItem[],
  score: { value: number },
  penalty: number,
  risk: PaymentRiskItem,
) {
  risks.push(risk);
  score.value -= penalty;
}

function statusFrom(score: number, highCount: number): ReportStatus {
  if (score < 60 || highCount >= 3) return "reject";
  if (score < 78 || highCount >= 1) return "caution";
  return "recommend";
}

function verdictFrom(status: ReportStatus): PaymentGateResult["verdict"] {
  if (status === "recommend") return "可以付款";
  if (status === "caution") return "谨慎小额";
  return "先别付款";
}

export function buildPaymentGate(input: PaymentGateInput): PaymentGateResult {
  const city = input.city?.trim() || "目标城市";
  const listingTitle = input.listingTitle?.trim() || "候选房源";
  const paymentType = input.paymentType?.trim() || "定金";
  const monthlyRent = money(numberOr(input.monthlyRent, 5200));
  const amount = money(numberOr(input.amount, 2000));
  const stage = input.stage?.trim() || "看房后，未签合同";
  const contractStatus = input.contractStatus?.trim() || "未看到合同";
  const identityStatus = input.identityStatus?.trim() || "未确认身份证明";
  const authorizationStatus = input.authorizationStatus?.trim() || "未看到产权/转租授权";
  const payeeType = input.payeeType?.trim() || "中介个人账户";
  const payeeMatchesContract = input.payeeMatchesContract?.trim() || "主体不一致";
  const refundRule = input.refundRule?.trim() || "口头承诺可退";
  const receiptStatus = input.receiptStatus?.trim() || "只说转账截图即可";
  const paymentChannel = input.paymentChannel?.trim() || "微信/支付宝私人转账";
  const urgencyPressure = input.urgencyPressure?.trim() || "对方催今天必须付";
  const notes =
    input.notes?.trim() || "中介说房子很抢手，先交定金锁房，合同和授权明天再补。";
  const reportContext = input.reportContext?.trim() || "";
  const context = [
    paymentType,
    stage,
    contractStatus,
    identityStatus,
    authorizationStatus,
    payeeType,
    payeeMatchesContract,
    refundRule,
    receiptStatus,
    paymentChannel,
    urgencyPressure,
    notes,
    reportContext,
  ].join(" ");

  const score = { value: 94 };
  const riskItems: PaymentRiskItem[] = [];

  if (hasAny(stage, ["未看房", "线上", "没看"]) || hasAny(notes, ["没看房", "视频看房"])) {
    addRisk(riskItems, score, 18, {
        title: "还没实地看房就要求付款",
      level: "高",
      why: "未看房付款会放大虚假房源、临时换房和定金不退风险。",
      action: "先实地看房，至少完成门牌、房屋状态、出租方身份和授权链确认。",
      proof: "保留看房照片、门牌、房屋视频和联系人名片。",
    });
  }

  if (hasAny(contractStatus, ["未看到", "没合同", "明天补", "口头"]) || hasAny(notes, ["合同明天", "先付后签"])) {
    addRisk(riskItems, score, 18, {
      title: "合同未确认就先付款",
      level: "高",
      why: "未看到合同，押金、定金、租期、违约和退款边界都无法约束。",
      action: "要求先发合同草稿，确认房源地址、租期、租金、费用、退款条件和收款主体。",
      proof: "保存合同草稿、聊天确认和版本日期。",
    });
  }

  if (hasAny(authorizationStatus, ["未看到", "没有", "拒绝", "不清"]) || hasAny(identityStatus, ["未确认", "不清"])) {
    addRisk(riskItems, score, 17, {
      title: "出租权和身份未确认",
      level: "高",
      why: "无产权、委托或转租授权时，付款后可能无法入住或难以追回。",
      action: "确认身份证明、产权/原合同、委托书或转租授权，并确认授权期限覆盖租期。",
      proof: "保存身份证明遮敏截图、授权文件、原合同关键页和官方查询入口记录。",
    });
  }

  if (hasAny(payeeMatchesContract, ["不一致", "未知", "不清", "待确认"]) || hasAny(payeeType, ["个人", "中介个人", "室友", "朋友"])) {
    addRisk(riskItems, score, 16, {
      title: "收款主体与签约主体不一致",
      level: "高",
      why: "钱打给非合同主体，后续定金、押金和租金归属会变模糊。",
      action: "要求收款人、合同出租方和授权收款方一致；不一致时必须有书面授权收款说明。",
      proof: "保存收款账户、授权收款说明、合同主体和聊天确认。",
    });
  }

  if (hasAny(refundRule, ["口头", "不退", "没写", "不清", "可退但"])) {
    addRisk(riskItems, score, 13, {
      title: "退款条件没有写清",
      level: "中",
      why: "定金、订金、意向金和押金的返还条件不同，口头承诺很难举证。",
      action: "写清金额、款项性质、什么情况下退、多久退、退到哪个账户。",
      proof: "保存带有退款条件的聊天记录或补充协议。",
    });
  }

  if (hasAny(urgencyPressure, ["今天必须", "马上", "不付就没", "催", "倒计时"]) || hasAny(notes, ["很抢手", "锁房"])) {
    addRisk(riskItems, score, 10, {
      title: "对方用稀缺和限时催付",
      level: "中",
      why: "催付常用于压缩用户确认时间，让用户跳过合同、授权和收款主体确认。",
      action: "把付款事项拆到确认之后，不接受“先付再补充材料”。",
      proof: "保存催付话术，作为后续争议时的沟通背景。",
    });
  }

  if (hasAny(receiptStatus, ["转账截图即可", "没有", "不开发票", "不收据"]) || hasAny(paymentChannel, ["现金", "私人", "微信", "支付宝"])) {
    addRisk(riskItems, score, 9, {
      title: "收据和付款记录不足",
      level: "中",
      why: "只有截图、没有备注和收据，后续很难证明款项用途、房源和租期。",
      action: "要求收据或电子确认，付款备注写清房源地址、款项用途、租期和合同主体。",
      proof: "保存转账记录、付款备注、收据和聊天确认。",
    });
  }

  const maxReasonableHold = money(Math.min(monthlyRent * 0.2, 1000));
  if (hasAny(paymentType, ["定金", "意向金", "订金"]) && amount > maxReasonableHold) {
    addRisk(riskItems, score, 10, {
      title: "锁房金额偏高",
      level: "中",
      why: "定金/意向金过高，会降低用户换房和谈判空间。",
      action: `建议先谈到 ${maxReasonableHold.toLocaleString()} 元以内，且写清可退条件。`,
      proof: "保存降额沟通、退款条件和款项性质确认。",
    });
  }

  if (amount >= monthlyRent) {
    addRisk(riskItems, score, 8, {
      title: "付款金额已接近或超过一个月租金",
      level: "中",
      why: "大额付款应进入合同签署和正式押租金步骤，不能只靠口头锁房。",
      action: "金额接近月租时，必须同步合同、收款主体、押金条款和交割清单。",
      proof: "保存合同、收款主体、押金条款、房屋交割和收据。",
    });
  }

  if (riskItems.length === 0) {
    riskItems.push({
      title: "基础付款凭据",
      level: "低",
      why: "即使风险较低，也要让每笔钱能对应房源、用途和租期。",
      action: "付款前再次核对合同主体、房源地址、金额、租期和退款条件。",
      proof: "保存付款备注、收据、合同和聊天确认。",
    });
  }

  const highCount = riskItems.filter((item) => item.level === "高").length;
  const finalScore = clamp(score.value, 28, 94);
  const status = statusFrom(finalScore, highCount);
  const verdict = verdictFrom(status);
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
    summary:
      status === "recommend"
        ? "当前付款条件基本可控，但仍需保留付款备注、收据、合同和授权凭据。"
        : status === "caution"
          ? "当前付款存在中等风险，建议补充退款条件、收款主体和收据，再考虑小额付款。"
          : "当前不建议付款。合同、授权、收款主体或退款条件存在高风险信息待补充，补充材料再谈钱。",
    paymentType,
    amount,
    maxReasonableHold,
    riskItems,
    blockers: blockers.length ? blockers : ["暂无高优先级付款前待确认事项，但仍需保存基础付款凭据。"],
    beforePayChecklist: [
      "看过真实房屋，并保存门牌、房屋视频和联系人信息。",
      "看过合同草稿，房源地址、租期、租金、押金、费用和退款条件完整。",
      "确认出租权、转租授权或代理委托，授权期限覆盖租期。",
      "收款人与合同主体或授权收款方一致。",
      "付款金额、款项性质、可退条件、退还时间和账户已写清。",
      "付款备注和收据能对应房源、用途、租期和合同主体。",
    ],
    paymentNoteTemplate: `支付${listingTitle}${paymentType}，房源城市：${city}，房源地址/门牌以合同为准，款项用途：${paymentType}，金额：${amount.toLocaleString()} 元，租期和退款条件以双方确认的合同/聊天记录为准。`,
    receiptChecklist: [
      "收款人姓名、账号、手机号或公司主体。",
      "付款金额、付款日期、款项性质和房源地址。",
      "租期、入住日期、合同编号或合同日期。",
      "什么情况下退、多久退、退回哪个账户。",
      "中介费/服务费另收时，写清收费主体、服务内容和是否可退。",
    ],
    negotiationScripts: [
      "我可以继续确认，但需要先看到合同草稿、授权链和收款主体说明，再考虑付款。",
      "如果只是锁房，我只能接受小额意向金，并且需要写明不签约或材料不全时原路退回。",
      "收款人与合同出租方不一致时，请先提供授权收款说明，否则我会暂缓付款。",
      "付款备注我会写清房源地址、款项用途和租期，请确认这笔款的性质和退款条件。",
    ],
    nextActions: [
      status === "reject" ? "先别付款，把高风险事项逐条补充。" : "补充中风险凭据，再决定是否小额付款。",
      "把付款备注、收据、授权链同步到凭据材料。",
      "进入入住预算，确认付款后不会打穿安全垫。",
      "进入合同确认，确认合同里的押金、退租、维修和费用边界。",
    ],
    assumptions: [
      `城市：${city}；房源：${listingTitle}；月租：${monthlyRent.toLocaleString()} 元。`,
      `拟付款项：${paymentType} ${amount.toLocaleString()} 元；当前阶段：${stage}。`,
      "这里基于用户主动输入做付款前风险判断；重大争议建议回到合同、法律意见或官方查询结果。",
      `输入背景：${context}`,
    ],
  };
}
