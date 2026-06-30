import type { ReportStatus } from "@/lib/mock-data";

export type HandoverCheckInput = {
  city?: string;
  listingTitle?: string;
  handoverDate?: string;
  contractSigned?: string;
  keysStatus?: string;
  meterStatus?: string;
  applianceStatus?: string;
  damageStatus?: string;
  utilityDebtStatus?: string;
  accessStatus?: string;
  cleaningStatus?: string;
  landlordConfirmation?: string;
  depositAmount?: number;
  monthlyRent?: number;
  notes?: string;
};

export type HandoverRiskLevel = "高" | "中" | "低";

export type HandoverRiskItem = {
  title: string;
  level: HandoverRiskLevel;
  why: string;
  action: string;
  proof: string;
};

export type HandoverTask = {
  group: string;
  title: string;
  action: string;
  passStandard: string;
  evidence: string;
};

export type HandoverCheckResult = {
  mode: "local";
  generatedAt: string;
  city: string;
  listingTitle: string;
  status: ReportStatus;
  score: number;
  verdict: "可以交割" | "补充材料后交割" | "暂不交割";
  summary: string;
  depositAmount: number;
  monthlyRent: number;
  riskItems: HandoverRiskItem[];
  blockers: string[];
  tasks: HandoverTask[];
  confirmationMessage: string;
  photoShotList: string[];
  meterChecklist: string[];
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
  risks: HandoverRiskItem[],
  score: { value: number },
  penalty: number,
  risk: HandoverRiskItem,
) {
  risks.push(risk);
  score.value -= penalty;
}

function statusFrom(score: number, highCount: number): ReportStatus {
  if (score < 58 || highCount >= 3) return "reject";
  if (score < 80 || highCount >= 1) return "caution";
  return "recommend";
}

function verdictFrom(status: ReportStatus): HandoverCheckResult["verdict"] {
  if (status === "recommend") return "可以交割";
  if (status === "caution") return "补充材料后交割";
  return "暂不交割";
}

export function buildHandoverCheck(input: HandoverCheckInput): HandoverCheckResult {
  const city = input.city?.trim() || "目标城市";
  const listingTitle = input.listingTitle?.trim() || "候选房源";
  const handoverDate = input.handoverDate?.trim() || "待确认";
  const contractSigned = input.contractSigned?.trim() || "不确定";
  const keysStatus = input.keysStatus?.trim() || "不确定";
  const meterStatus = input.meterStatus?.trim() || "不确定";
  const applianceStatus = input.applianceStatus?.trim() || "不确定";
  const damageStatus = input.damageStatus?.trim() || "不确定";
  const utilityDebtStatus = input.utilityDebtStatus?.trim() || "不确定是否有历史欠费";
  const accessStatus = input.accessStatus?.trim() || "不确定";
  const cleaningStatus = input.cleaningStatus?.trim() || "不确定";
  const landlordConfirmation = input.landlordConfirmation?.trim() || "不确定";
  const depositAmount = money(numberOr(input.depositAmount, 0));
  const monthlyRent = money(numberOr(input.monthlyRent, 0));
  const notes = input.notes?.trim() || "";
  const context = [
    contractSigned,
    keysStatus,
    meterStatus,
    applianceStatus,
    damageStatus,
    utilityDebtStatus,
    accessStatus,
    cleaningStatus,
    landlordConfirmation,
    notes,
  ].join(" ");

  const score = { value: 94 };
  const riskItems: HandoverRiskItem[] = [];

  if (hasAny(contractSigned, ["未签", "没签", "未写", "没有交割", "不完整"])) {
    addRisk(riskItems, score, 16, {
        title: "合同或交割清单还没确认",
      level: "高",
      why: "没有交割清单时，旧损坏、家电状态、钥匙数量和费用读数会在退租时变成争议。",
      action: "交割前补一份文字清单，至少确认钥匙门禁、表读数、家具家电、旧损坏和费用结算。",
      proof: "合同页、补充协议、交割清单截图和双方聊天确认。",
    });
  }

  if (hasAny(keysStatus, ["口头", "不清", "未确认", "不知道", "备用钥匙"]) || hasAny(accessStatus, ["未确认", "不清", "少", "没给"])) {
    addRisk(riskItems, score, 14, {
      title: "钥匙门禁数量不清",
      level: "高",
      why: "钥匙、门禁、电梯卡和备用钥匙不清，会影响独居安全、维修上门边界和退租交割。",
      action: "逐项写清钥匙、门禁卡、电梯卡、邮箱钥匙、燃气卡和是否允许换锁。",
      proof: "钥匙门禁合照、数量清单、换锁许可和聊天确认。",
    });
  }

  if (hasAny(meterStatus, ["没拍", "未拍", "没有", "不清", "之后补"])) {
    addRisk(riskItems, score, 14, {
      title: "表读数未固定",
      level: "高",
      why: "水电燃气和宽带历史欠费如果没有交割读数，入住后很难证明费用边界。",
      action: "入住当天拍水表、电表、燃气表和对应日期，确认历史欠费由谁承担。",
      proof: "水电燃气表读数照片、费用小程序截图、出租方确认消息。",
    });
  }

  if (hasAny(applianceStatus, ["不完整", "没清单", "未确认", "故障", "坏", "缺"])) {
    addRisk(riskItems, score, 10, {
      title: "家具家电清单不完整",
      level: "中",
      why: "没有清单时，家电故障、遥控器缺失、家具旧损坏和品牌型号都可能在退租时产生扣款。",
      action: "逐件拍摄品牌、型号、外观、功能状态、遥控器和配件数量。",
      proof: "家具家电清单、铭牌照片、功能测试视频和对方确认。",
    });
  }

  if (hasAny(damageStatus, ["霉", "划痕", "破", "裂", "漏", "鼓包", "未写", "没写", "旧损坏"])) {
    addRisk(riskItems, score, 12, {
      title: "旧损坏未写清",
      level: "中",
      why: "墙面、地板、柜体、卫浴、窗边和管道旧损坏不写清，退租时可能被当成新损坏扣押金。",
      action: "把每个旧损坏位置拍近景和远景，并在聊天里发给出租方确认。",
      proof: "全屋连续视频、旧损坏近景、位置说明和确认记录。",
    });
  }

  if (hasAny(utilityDebtStatus, ["不确定", "欠费", "没查", "未确认"])) {
    addRisk(riskItems, score, 9, {
      title: "历史欠费边界不清",
      level: "中",
      why: "水电燃气、物业、宽带和垃圾费如果没有结清口径，可能变成入住后的额外支出。",
      action: "交割当天要求展示或截图当前账单，确认交割日前费用由出租方承担。",
      proof: "费用账单、缴费截图、表读数和聊天确认。",
    });
  }

  if (hasAny(cleaningStatus, ["一般", "差", "未清洁", "油污", "霉", "异味"])) {
    addRisk(riskItems, score, 7, {
      title: "清洁状态可能影响退租扣款",
      level: "中",
      why: "入住时本来就有油污、霉味或卫生死角，如果没有保存记录，退租清洁费很难争议。",
      action: "拍厨房、卫生间、地漏、油烟机、冰箱和柜体内部，确认入住时清洁状态。",
      proof: "清洁状态照片、视频和对方确认。",
    });
  }

  if (hasAny(landlordConfirmation, ["口头", "没问题", "不用拍", "之后再说", "不确认"])) {
    addRisk(riskItems, score, 10, {
      title: "对方未做书面确认",
      level: "中",
      why: "交割当天只靠口头确认，退租时很难证明双方认可过旧损坏和费用边界。",
      action: "把交割清单发到聊天里，让对方回复确认；不确认时至少保留已发送记录。",
      proof: "聊天确认、交割清单截图、发送时间和对方回复。",
    });
  }

  if (depositAmount >= monthlyRent) {
    addRisk(riskItems, score, 5, {
      title: "押金金额较高",
      level: "低",
      why: "押金越高，交割记录越关键；一处旧损坏或表读数不清都可能变成直接现金损失。",
      action: "按押金金额提高记录标准，全屋视频、表读数和家具家电清单不能缺。",
      proof: "押金付款记录、交割清单和全屋视频。",
    });
  }

  if (riskItems.length === 0) {
    riskItems.push({
      title: "基础交割记录",
      level: "低",
      why: "即使条件清楚，也要让每个交割项都能在退租时回溯。",
      action: "按全屋视频、表读数、钥匙门禁、家具家电、旧损坏和聊天确认的顺序办理交割。",
      proof: "交割清单、照片视频和双方确认。",
    });
  }

  const highCount = riskItems.filter((item) => item.level === "高").length;
  const finalScore = clamp(score.value, 28, 94);
  const status = statusFrom(finalScore, highCount);
  const verdict = verdictFrom(status);
  const blockers = riskItems
    .filter((item) => item.level === "高")
    .map((item) => `${item.title}：${item.action}`);

  const tasks: HandoverTask[] = [
    {
      group: "钥匙门禁",
      title: "钥匙与门禁数量确认",
      action: "把房门钥匙、单元门禁、电梯卡、邮箱钥匙、燃气卡逐一拍照列数。",
      passStandard: "数量、用途、缺失补办费用和是否允许换锁都有文字确认。",
      evidence: "钥匙门禁合照、清单和聊天确认。",
    },
    {
      group: "费用读数",
      title: "水电燃气表读数",
      action: "拍水表、电表、燃气表读数和对应日期，截图缴费账户当前余额。",
      passStandard: "交割日前费用由出租方承担，交割日后由承租方承担。",
      evidence: "表读数照片、缴费截图和费用边界确认。",
    },
    {
      group: "房屋状态",
      title: "全屋连续视频",
      action: "从入户门开始连续拍客厅、卧室、厨房、卫生间、阳台、窗边和柜体内部。",
      passStandard: "能看出房源、空间、旧损坏、清洁状态和主要设施。",
      evidence: "全屋连续视频和旧损坏截图。",
    },
    {
      group: "家具家电",
      title: "家具家电功能测试",
      action: "测试空调、热水器、冰箱、洗衣机、油烟机、灶具、灯具和门窗。",
      passStandard: "能正常使用；已有故障写清由谁维修、何时处理。",
      evidence: "功能测试视频、铭牌照片和故障确认。",
    },
    {
      group: "费用边界",
      title: "物业宽带和杂费确认",
      action: "确认物业费、网络费、垃圾费、停车费、维修基金类费用是否另收。",
      passStandard: "每项费用都有金额、周期、承担方和收款主体。",
      evidence: "费用清单、账单截图和聊天确认。",
    },
  ];

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
        ? "当前交割条件较完整，可以按清单确认钥匙、表读数、家具家电和旧损坏确认。"
        : status === "caution"
          ? "当前交割存在待补充材料，建议补充高风险清单，再拿钥匙或正式入住。"
          : "当前不建议直接交割。钥匙、表读数、交割清单或旧损坏存在高风险信息待补充，补充材料再入住。",
    depositAmount,
    monthlyRent,
    riskItems,
    blockers: blockers.length ? blockers : ["暂无高优先级待确认事项，但仍需保存基础交割记录。"],
    tasks,
    confirmationMessage: `交割确认：${listingTitle} 将于 ${handoverDate} 交割。请确认钥匙/门禁数量、水电燃气表读数、家具家电清单、旧损坏位置、历史欠费和清洁状态；交割日前费用由出租方承担，交割日后费用按合同约定。以上照片和视频我会同步发到本聊天，作为退租交割依据。`,
    photoShotList: [
      "门牌、入户门、门锁、猫眼和钥匙门禁合照。",
      "客厅、卧室、厨房、卫生间、阳台的连续视频。",
      "墙角、窗边、柜体背板、地板划痕、霉斑、漏水和鼓包近景。",
      "空调、热水器、冰箱、洗衣机、油烟机、灶具和灯具功能测试。",
      "家具家电品牌型号、铭牌、遥控器、配件和已有损坏。",
      "水表、电表、燃气表读数和缴费账户余额。",
    ],
    meterChecklist: [
      "水表读数、拍摄日期、是否有欠费。",
      "电表读数、峰谷电或阶梯电口径、缴费账户。",
      "燃气表读数、燃气卡或线上账户、是否需要过户。",
      "宽带账号、物业费、水费代收、电梯卡补办费和门禁卡补办费。",
    ],
    nextActions: [
      status === "reject" ? "暂不交割，补充钥匙门禁、表读数和交割清单确认。" : "按确认清单办理交割并发送确认消息。",
      "把交割视频、表读数和家具家电清单同步到材料清单。",
      "发现漏水、发霉或家电故障时，立即进入维修责任判断。",
      "退租前用本次交割记录反向核对押金扣款。",
    ],
    assumptions: [
      `城市：${city}；房源：${listingTitle}；交割日期：${handoverDate}。`,
      `押金：${depositAmount.toLocaleString()} 元；月租：${monthlyRent.toLocaleString()} 元。`,
      "本页根据你输入的信息整理交割清单、付款前需要确认的事项和后续留痕要求。",
      `输入背景：${context}`,
    ],
  };
}
