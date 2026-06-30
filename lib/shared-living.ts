import type { ReportStatus } from "@/lib/mock-data";

export type SharedLivingInput = {
  city?: string;
  listingTitle?: string;
  monthlyRent?: number;
  roommateCount?: number;
  roomType?: string;
  bathroomMode?: string;
  kitchenMode?: string;
  cleaningRule?: string;
  guestRule?: string;
  quietHours?: string;
  petRule?: string;
  billSplit?: string;
  depositLiability?: string;
  leaseHolder?: string;
  subletPermission?: string;
  concerns?: string;
};

export type SharedRiskLevel = "高" | "中" | "低";

export type SharedRiskItem = {
  group: string;
  title: string;
  level: SharedRiskLevel;
  why: string;
  action: string;
  writeDown: string;
};

export type SharedLivingResult = {
  mode: "local";
  generatedAt: string;
  city: string;
  listingTitle: string;
  status: ReportStatus;
  score: number;
  summary: string;
  highRiskCount: number;
  monthlyRent: number;
  boundaryItems: SharedRiskItem[];
  mustAsk: string[];
  agreementClauses: string[];
  evidenceChecklist: string[];
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

function addRisk(
  items: SharedRiskItem[],
  risk: SharedRiskItem,
  penalty: number,
  score: { value: number },
) {
  items.push(risk);
  score.value -= penalty;
}

function statusFromScore(score: number, highRiskCount: number): ReportStatus {
  if (score < 60 || highRiskCount >= 4) return "reject";
  if (score < 78 || highRiskCount >= 2) return "caution";
  return "recommend";
}

export function buildSharedLivingAudit(input: SharedLivingInput): SharedLivingResult {
  const city = input.city?.trim() || "目标城市";
  const listingTitle = input.listingTitle?.trim() || "候选合租房";
  const monthlyRent = Math.max(0, Math.round(numberOr(input.monthlyRent, 0)));
  const roommateCount = Math.max(0, Math.round(numberOr(input.roommateCount, 0)));
  const roomType = input.roomType?.trim() || "待确认";
  const bathroomMode = input.bathroomMode?.trim() || "待确认";
  const kitchenMode = input.kitchenMode?.trim() || "待确认";
  const cleaningRule = input.cleaningRule?.trim() || "待确认";
  const guestRule = input.guestRule?.trim() || "待确认";
  const quietHours = input.quietHours?.trim() || "待确认";
  const petRule = input.petRule?.trim() || "待确认";
  const billSplit = input.billSplit?.trim() || "待确认";
  const depositLiability = input.depositLiability?.trim() || "待确认";
  const leaseHolder = input.leaseHolder?.trim() || "待确认";
  const subletPermission = input.subletPermission?.trim() || "待确认";
  const concerns = input.concerns?.trim() || "";

  const score = { value: 92 };
  const boundaryItems: SharedRiskItem[] = [];
  const context = [
    roomType,
    bathroomMode,
    kitchenMode,
    cleaningRule,
    guestRule,
    quietHours,
    petRule,
    billSplit,
    depositLiability,
    leaseHolder,
    subletPermission,
    concerns,
  ].join(" ");

  if (hasAny(context, ["待确认"]) || monthlyRent <= 0 || roommateCount <= 0) {
    addRisk(
      boundaryItems,
      {
        group: "信息完整性",
        title: "合租规则还没确认完整",
        level: "中",
        why: "合租能不能长期住，取决于室友人数、公共空间、费用分摊、押金责任和签约主体是否说清楚。",
        action: "先补齐室友人数、签约主体、费用分摊、押金责任和转租授权，再判断能否继续。",
        writeDown: "把室友人数、费用分摊、押金责任、访客规则和授权材料写进合同或聊天确认。",
      },
      14,
      score,
    );
  }

  if (roommateCount >= 4 || hasAny(roomType, ["隔断", "群租", "床位", "客厅"])) {
    addRisk(
      boundaryItems,
      {
        group: "居住密度",
        title: "人数和空间边界偏紧",
        level: "高",
        why: "合租人数越多，卫生间、厨房、噪音和访客冲突概率越高。",
        action: "确认实际入住人数、房间属性、是否隔断、公共空间是否被占用。",
        writeDown: "合同或聊天中写明实际入住人数、房间用途、公共空间不可再出租。",
      },
      14,
      score,
    );
  }

  if (hasAny(bathroomMode, ["共用", "排队", "多人"]) || roommateCount >= 3) {
    addRisk(
      boundaryItems,
      {
        group: "公共空间",
        title: "卫生间和洗漱高峰冲突",
        level: roommateCount >= 4 ? "高" : "中",
        why: "早晚高峰卫生间冲突会直接影响上班时间和生活体验。",
        action: "询问室友作息、洗澡时间、热水容量、排风和马桶维修责任。",
        writeDown: "写明卫生间清洁、堵塞维修、热水器维护和公共用品分摊方式。",
      },
      roommateCount >= 4 ? 12 : 8,
      score,
    );
  }

  if (hasAny(kitchenMode, ["规则不清", "油烟", "多人", "不可做饭"]) || hasAny(concerns, ["做饭", "油烟"])) {
    addRisk(
      boundaryItems,
      {
        group: "公共空间",
        title: "厨房使用和油烟边界不清",
        level: "中",
        why: "厨房冲突通常来自油烟、冰箱占用、垃圾和公共锅具。",
        action: "确认做饭频率、冰箱空间、油烟机、垃圾处理和公共厨具边界。",
        writeDown: "写明厨房可用时段、清理标准、冰箱分区和垃圾清运规则。",
      },
      8,
      score,
    );
  }

  if (hasAny(cleaningRule, ["没有", "不清", "靠自觉", "无"])) {
    addRisk(
      boundaryItems,
      {
        group: "卫生责任",
        title: "清洁轮值缺失",
        level: "高",
        why: "合租卫生靠自觉，最后通常会变成长期消耗和押金扣款。",
        action: "要求看到现有清洁表，约定公共区、卫生间、厨房和垃圾责任。",
        writeDown: "写明轮值周期、没做好时怎么办、退租清洁和押金扣款边界。",
      },
      13,
      score,
    );
  }

  if (hasAny(guestRule, ["不清", "可过夜", "随意", "经常"]) || hasAny(concerns, ["访客", "过夜"])) {
    addRisk(
      boundaryItems,
      {
        group: "人际边界",
        title: "访客和过夜规则不清",
        level: "高",
        why: "访客过夜会影响隐私、安全、噪音和公共资源。",
        action: "确认是否允许异性访客、过夜频率、提前告知和公共区使用边界。",
        writeDown: "写明访客需提前通知、过夜上限、公共区不得长期占用。",
      },
      13,
      score,
    );
  }

  if (hasAny(quietHours, ["无", "不清", "很晚", "夜班"]) || hasAny(concerns, ["作息", "噪音", "游戏", "直播"])) {
    addRisk(
      boundaryItems,
      {
        group: "作息噪音",
        title: "安静时间和噪音边界缺失",
        level: "中",
        why: "作息不一致会放大门声、洗澡、做饭、游戏和电话噪音。",
        action: "询问每位室友上下班、夜间洗澡、游戏直播、周末聚会和隔音情况。",
        writeDown: "写明 23:00 后安静时间、公共区音量和反复扰民解决方式。",
      },
      9,
      score,
    );
  }

  if (hasAny(petRule, ["养宠", "猫", "狗", "宠物"]) || hasAny(concerns, ["过敏", "宠物"])) {
    addRisk(
      boundaryItems,
      {
        group: "生活偏好",
        title: "宠物、过敏和公共卫生边界",
        level: "中",
        why: "宠物会影响异味、毛发、抓咬、公共区清洁和押金扣款。",
        action: "确认宠物活动范围、清洁责任、损坏赔偿和是否影响自己过敏。",
        writeDown: "写明宠物不得进入个人房间，公共区损坏和清洁由责任方承担。",
      },
      8,
      score,
    );
  }

  if (hasAny(billSplit, ["不清", "房东定", "按人头", "预估", "包干"]) || hasAny(concerns, ["水电", "费用"])) {
    addRisk(
      boundaryItems,
      {
        group: "费用分摊",
        title: "水电燃气和公共费用口径不清",
        level: "中",
        why: "费用口径不清会导致每月真实成本不可控。",
        action: "要求看近 2 个月账单，确认水电燃气、网费、保洁和公共用品分摊。",
        writeDown: "写明按账单实结、抄表日期、分摊人数和新增费用需提前确认。",
      },
      8,
      score,
    );
  }

  if (hasAny(depositLiability, ["共同", "连带", "整租", "不清"]) || hasAny(concerns, ["押金", "退租"])) {
    addRisk(
      boundaryItems,
      {
        group: "押金责任",
        title: "押金和退租连带责任",
        level: "高",
        why: "整租合租中，别人的损坏、欠费或提前退租可能影响你的押金。",
        action: "确认每个人押金金额、退租结算、损坏归责和室友提前退租办法。",
        writeDown: "写明个人押金独立结算，公共区扣款需有照片、责任方和费用明细。",
      },
      15,
      score,
    );
  }

  if (hasAny(leaseHolder, ["二房东", "室友代签", "转租"]) || hasAny(subletPermission, ["未看到", "没有", "不清"])) {
    addRisk(
      boundaryItems,
      {
        group: "租约授权",
        title: "转租授权和签约主体风险",
        level: "高",
        why: "二房东或室友代签如果没有授权，会影响入住稳定性和押金追回。",
        action: "要求查看原租赁合同、房东授权、身份证明和收款主体一致性。",
        writeDown: "写明转租授权链、收款主体、押金归属和提前解约责任。",
      },
      16,
      score,
    );
  }

  if (boundaryItems.length < 4) {
    boundaryItems.push(
      {
        group: "基础边界",
        title: "公共区物品和冰箱分区",
        level: "低",
        why: "小规则越早说清，越少靠情绪解决。",
        action: "入住前确认鞋柜、冰箱、洗衣机、阳台和储物空间。",
        writeDown: "公共区分区、私人物品和公共用品费用写进聊天确认。",
      },
      {
        group: "基础边界",
        title: "室友沟通入口",
        level: "低",
        why: "没有稳定沟通入口，小问题会拖成长期冲突。",
        action: "建立合租群，确认水电账单、清洁轮值和报修都在群里留痕。",
        writeDown: "重要事项只在合租群确认，不用口头承诺替代。",
      },
    );
  }

  const highRiskCount = boundaryItems.filter((item) => item.level === "高").length;
  const finalScore = clamp(score.value, 30, 94);
  const status = statusFromScore(finalScore, highRiskCount);

  return {
    mode: "local",
    generatedAt: new Date().toISOString(),
    city,
    listingTitle,
    status,
    score: finalScore,
    summary:
      status === "recommend"
        ? "当前合租边界整体可控，但仍建议把清洁、访客、费用和押金责任写进聊天或补充协议。"
        : status === "caution"
          ? "当前合租存在边界不清项，建议先把作息、卫生、访客、费用和押金责任谈清，再决定是否付款。"
          : "当前合租边界风险偏高，尤其是转租授权、押金连带、访客或清洁规则未解决前，不建议付款或签约。",
    highRiskCount,
    monthlyRent,
    boundaryItems,
    mustAsk: [
      "现在实际住几个人，是否还会新增室友或把公共区再出租？",
      "谁是合同签约人，是否有房东书面转租授权？",
      "水电燃气网费如何按账单分摊，有没有近两个月账单？",
      "公共区、卫生间、厨房由谁清洁，多久一次，没执行怎么办？",
      "访客和过夜是否允许，是否需要提前在群里告知？",
      "押金是个人独立结算，还是整租一起扣？公共区损坏如何归责？",
    ],
    agreementClauses: [
      "实际入住人数、房间用途和公共区不可再出租。",
      "清洁轮值、垃圾清运、厨房油烟和卫生间堵塞责任。",
      "访客、过夜、晚间安静时间和公共区使用边界。",
      "水电燃气、网费、保洁、公共用品按账单分摊，新增费用需提前确认。",
      "个人押金独立结算，公共区扣款需提供照片、责任方、票据或维修明细。",
      "室友提前退租、转租、新增室友和换锁/钥匙交割办法。",
    ],
    evidenceChecklist: [
      "原合同、转租授权、签约人身份证明和收款主体截图。",
      "入住当天个人房间、公共区、家具家电和卫生状态视频。",
      "现有水电燃气网费账单、分摊规则和押金付款记录。",
      "清洁轮值、访客规则、安静时间、宠物规则的聊天确认。",
      "钥匙数量、门禁、公共区物品和冰箱/储物分区照片。",
    ],
    nextActions: [
      "逐条确认高风险项，并把室友、费用和公共区规则写清楚。",
      "把清洁、访客、费用、押金和转租授权放进合租群确认。",
      status === "reject" ? "授权、押金连带或公共区再出租未解决前暂不付款。" : "边界确认后，再进入材料清单和合同确认。",
    ],
    assumptions: [
      `城市：${city}；房源：${listingTitle}；房间类型：${roomType}。`,
      `月租：${monthlyRent.toLocaleString()} 元；室友人数：${roommateCount} 人。`,
      "本页根据你输入的信息整理合租边界清单、可写入约定的事项和付款前暂停条件。",
      `输入担忧：${concerns}`,
      `合租上下文：${context}`,
    ],
  };
}
