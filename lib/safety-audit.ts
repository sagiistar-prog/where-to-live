import type { ReportStatus } from "@/lib/mock-data";

export type SafetyAuditInput = {
  city?: string;
  listingTitle?: string;
  floor?: number;
  buildingAccess?: string;
  hallwayLighting?: string;
  elevatorSecurity?: string;
  nightReturnTime?: string;
  walkFromTransit?: number;
  routeDescription?: string;
  deliveryMode?: string;
  roommateMode?: string;
  landlordContact?: string;
  windowSecurity?: string;
  userProfile?: string;
  concerns?: string;
};

export type SafetyLevel = "高" | "中" | "低";

export type SafetyTask = {
  group: string;
  title: string;
  severity: SafetyLevel;
  why: string;
  action: string;
  passStandard: string;
  evidence: string;
};

export type SafetyAuditResult = {
  mode: "local";
  generatedAt: string;
  city: string;
  listingTitle: string;
  status: ReportStatus;
  score: number;
  summary: string;
  highRiskCount: number;
  tasks: SafetyTask[];
  redFlags: string[];
  routeActions: string[];
  privacyBoundaries: string[];
  questions: string[];
  nextActions: string[];
  assumptions: string[];
};

function numberOr(value: number | undefined, fallback: number) {
  return Number.isFinite(value) ? Number(value) : fallback;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function hasAny(text: string, keys: string[]) {
  return keys.some((key) => text.includes(key));
}

function pushTask(
  tasks: SafetyTask[],
  task: SafetyTask,
  penalty: number,
  risk: { value: number },
) {
  tasks.push(task);
  risk.value += penalty;
}

function statusFromScore(score: number, highRiskCount: number): ReportStatus {
  if (score < 60 || highRiskCount >= 4) return "reject";
  if (score < 78 || highRiskCount >= 2) return "caution";
  return "recommend";
}

export function buildSafetyAudit(input: SafetyAuditInput): SafetyAuditResult {
  const city = input.city?.trim() || "目标城市";
  const listingTitle = input.listingTitle?.trim() || "候选房源";
  const floor = numberOr(input.floor, 2);
  const walkFromTransit = numberOr(input.walkFromTransit, 9);
  const buildingAccess = input.buildingAccess?.trim() || "门禁松散";
  const hallwayLighting = input.hallwayLighting?.trim() || "楼道偏暗";
  const elevatorSecurity = input.elevatorSecurity?.trim() || "电梯无明显监控";
  const nightReturnTime = input.nightReturnTime?.trim() || "22:30 后";
  const routeDescription =
    input.routeDescription?.trim() || "地铁口到小区需要步行 9 分钟，中间有一段灯光较暗的小路。";
  const deliveryMode = input.deliveryMode?.trim() || "快递外卖可送到门口";
  const roommateMode = input.roommateMode?.trim() || "独居";
  const landlordContact = input.landlordContact?.trim() || "房东/中介要求单独看房";
  const windowSecurity = input.windowSecurity?.trim() || "低楼层窗户无额外防护";
  const userProfile = input.userProfile?.trim() || "女生独居";
  const concerns = input.concerns?.trim() || "担心夜间回家、门禁松散和低楼层安全。";
  const routeText = `${routeDescription} ${concerns}`;
  const risk = { value: 0 };
  const tasks: SafetyTask[] = [];

  if (floor <= 2 || hasAny(windowSecurity, ["无防护", "低楼层", "可攀爬"])) {
    pushTask(
      tasks,
      {
        group: "房屋边界",
        title: "低楼层窗户和入户门防护",
        severity: "高",
        why: "低楼层、可攀爬窗台或老旧门锁会放大独居风险。",
        action: "现场确认窗锁、防盗网、门锁、猫眼、门缝和楼外可攀爬点。",
        passStandard: "窗户能反锁，门锁无松动，外部没有可轻易攀爬到窗边的管道或平台。",
        evidence: "拍窗锁、门锁、楼外立面和入户门细节。",
      },
      14,
      risk,
    );
  }

  if (hasAny(buildingAccess, ["松散", "开放", "无门禁", "陌生人"]) || hasAny(hallwayLighting, ["暗", "坏", "少"])) {
    pushTask(
      tasks,
      {
        group: "楼栋动线",
        title: "门禁、楼道照明和陌生人进入",
        severity: "高",
        why: "门禁松散和暗楼道会影响夜间回家安全，也影响快递外卖交付边界。",
        action: "晚上 20:30 后再走一次，观察门禁是否尾随可进、楼道是否有照明死角。",
        passStandard: "单元门需要门禁或钥匙，楼道灯可正常触发，楼层无长期堆物和遮挡。",
        evidence: "拍单元门、楼道灯、楼梯间、电梯间和楼层公共区。",
      },
      16,
      risk,
    );
  }

  if (hasAny(elevatorSecurity, ["无监控", "坏", "偏僻", "独立"]) || floor >= 8) {
    pushTask(
      tasks,
      {
        group: "楼栋动线",
        title: "电梯与楼梯间安全感",
        severity: floor >= 8 ? "中" : "高",
        why: "高楼层依赖电梯，独立电梯间或无监控会增加夜间不确定性。",
        action: "看电梯监控标识、紧急按钮、梯控、楼梯间照明和手机信号。",
        passStandard: "电梯有监控或物业维护标识，紧急按钮可见，楼梯间照明稳定。",
        evidence: "拍电梯内外、楼梯间和物业维护电话。",
      },
      floor >= 8 ? 8 : 12,
      risk,
    );
  }

  if (
    walkFromTransit >= 8 ||
    hasAny(routeText, ["小路", "夜路", "桥洞", "工地", "空旷", "绿化带", "灯光暗", "偏僻"])
  ) {
    pushTask(
      tasks,
      {
        group: "夜间路线",
        title: "地铁/公交到家的最后一公里",
        severity: "高",
        why: "夜间路线比白天看房更接近真实居住状态。",
        action: "按真实下班时间实走一次，记录步行分钟、照明、商铺开门、路口和可求助点。",
        passStandard: "夜间步行不超过 8 分钟，沿途有连续照明、商铺或稳定人流。",
        evidence: "保存路线截图，记录夜间实走时间和关键路段照片。",
      },
      15,
      risk,
    );
  }

  if (hasAny(nightReturnTime, ["22", "23", "凌晨", "很晚", "加班"])) {
    pushTask(
      tasks,
      {
        group: "作息适配",
        title: "晚归场景预案",
        severity: "中",
        why: "经常晚归时，房源安全性要按最差时间段判断。",
        action: "确认末班车、打车落点、保安值班、门禁故障时的进入方式。",
        passStandard: "晚归时可以打车到小区门口，门岗或物业电话可联系，备用进入方式清楚。",
        evidence: "保存末班车时间、小区门口定位和物业电话。",
      },
      9,
      risk,
    );
  }

  if (hasAny(deliveryMode, ["门口", "上门", "送到家", "代收混乱"])) {
    pushTask(
      tasks,
      {
        group: "隐私边界",
        title: "快递外卖不泄露具体门牌",
        severity: "中",
        why: "独居场景下，门牌和作息不应被不必要泄露。",
        action: "优先使用驿站、快递柜或小区门口取餐点；门牌备注使用模糊地址。",
        passStandard: "快递外卖可以不送到家门口，取件点夜间照明和距离可接受。",
        evidence: "拍快递柜、外卖架、取件路线和取件点照明。",
      },
      8,
      risk,
    );
  }

  if (hasAny(roommateMode, ["陌生", "合租", "混住", "多人"]) || hasAny(userProfile, ["女生", "独居"])) {
    pushTask(
      tasks,
      {
        group: "人际边界",
        title: "室友、房东和维修上门边界",
        severity: hasAny(roommateMode, ["陌生", "混住", "多人"]) ? "高" : "中",
        why: "合租和维修上门是独居用户最容易忽略的边界风险。",
        action: "确认是否异性合租、能否换锁、维修是否提前预约、房东是否保留钥匙。",
        passStandard: "合同或聊天中明确未经同意不得进入房间，维修需提前预约，钥匙交割清楚。",
        evidence: "保存室友规则、钥匙数量、换锁许可和维修预约文字确认。",
      },
      hasAny(roommateMode, ["陌生", "混住", "多人"]) ? 14 : 8,
      risk,
    );
  }

  if (hasAny(landlordContact, ["单独", "晚上", "临时", "催", "私下"])) {
    pushTask(
      tasks,
      {
        group: "看房过程",
        title: "看房和签约不单独泄露行踪",
        severity: "中",
        why: "独居用户不应在陌生关系里单独、晚间、无留痕地看房或付款。",
        action: "看房约白天或带朋友同行，把地址、联系人和时间同步给可信联系人。",
        passStandard: "看房不安排在深夜；付款前出租方身份、收款主体和合同版本均有留痕。",
        evidence: "保存看房预约、联系人名片、门牌和收款主体截图。",
      },
      8,
      risk,
    );
  }

  if (tasks.length < 4) {
    tasks.push(
      {
        group: "基础确认",
        title: "门锁、猫眼和备用钥匙",
        severity: "中",
        why: "即使房源整体安全，也要确认入住后可控的基础边界。",
        action: "问清钥匙数量、门锁是否可换、猫眼是否正常，入住当天拍照留存。",
        passStandard: "钥匙数量可确认，允许换锁或加装安全扣，猫眼无遮挡。",
        evidence: "拍钥匙交割、门锁、猫眼和聊天确认。",
      },
      {
        group: "基础确认",
        title: "物业和值班电话",
        severity: "低",
        why: "遇到门禁、噪音、陌生人尾随或维修问题时，需要知道找谁。",
        action: "保存物业、门岗、社区和紧急维修电话。",
        passStandard: "至少有 2 个可联系的管理入口，夜间有人响应。",
        evidence: "拍公告栏、门岗电话和物业服务牌。",
      },
    );
  }

  const highRiskCount = tasks.filter((task) => task.severity === "高").length;
  const score = clamp(94 - risk.value, 30, 94);
  const status = statusFromScore(score, highRiskCount);
  const redFlags = tasks
    .filter((task) => task.severity === "高")
    .map((task) => `${task.title}：${task.why}`);

  const routeActions = [
    "用真实下班时间实走地铁/公交到小区路线，不用白天看房路线替代。",
    "记录最后一公里是否有连续照明、营业商铺、门岗和可打车落点。",
    "如果需要穿过工地、桥洞、长距离绿化带或空旷路段，优先把该房源列为暂不考虑。",
    "把末班车、夜间打车落点和备用路线写进看房记录。",
  ];

  return {
    mode: "local",
    generatedAt: new Date().toISOString(),
    city,
    listingTitle,
    status,
    score,
    summary:
      status === "recommend"
        ? "当前独居安全条件基本可控，但仍需夜间确认，并把钥匙、维修上门和快递外卖边界写清楚。"
        : status === "caution"
          ? "当前房源存在若干独居安全不确定项，建议先确认夜间路线、门禁和人际边界确认，再决定是否继续签约。"
          : "当前独居安全风险偏多，尤其是夜间路线、楼栋门禁或低楼层边界问题未解决前，不建议付款或签约。",
    highRiskCount,
    tasks,
    redFlags: redFlags.length ? redFlags : ["未发现高优先级安全风险，但仍需做好夜间确认和钥匙交割确认。"],
    routeActions,
    privacyBoundaries: [
      "不在外卖、快递备注里泄露具体门牌和独居信息。",
      "看房、维修、签约尽量保留聊天记录，不接受临时私下变更。",
      "维修上门必须提前约时间，独居场景不接受陌生人突然进门。",
      "付款前不要把身份证、工作单位、详细作息发给非必要主体。",
    ],
    questions: [
      "小区门禁是否 24 小时有效，陌生人能否尾随进入？",
      "楼道、电梯、楼梯间晚上是否有照明和监控？",
      "房东、中介、保洁或维修是否保留钥匙，入住后能否换锁？",
      "快递外卖是否必须送到家门口，有没有安全的代收点？",
      "晚归时打车能否停到小区门口，门岗或物业是否有人值守？",
    ],
    nextActions: [
      "先按真实晚归时间再走一次，不只看白天照片。",
      "把高优先级事项拍照留存，并同步到材料清单。",
      status === "reject" ? "关键风险点确认前暂不付款和签约。" : "如果风险点可确认，再进入合同确认和入住预算。",
    ],
    assumptions: [
      `城市：${city}；房源：${listingTitle}；楼层：${floor} 层。`,
      `夜间到家时间：${nightReturnTime}；地铁/公交到小区步行约 ${walkFromTransit} 分钟。`,
      "这里根据你输入的信息整理安全确认清单、现场核验问题和付款前暂停条件。",
    ],
  };
}
