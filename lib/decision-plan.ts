import type { ReportStatus } from "@/lib/mock-data";

export type DecisionStage =
  | "city"
  | "area"
  | "listing"
  | "visit"
  | "payment"
  | "contract"
  | "move"
  | "handover"
  | "living"
  | "renewal"
  | "deposit";

export type DecisionPlanInput = {
  city?: string;
  stage?: DecisionStage;
  listingTitle?: string;
  daysToDecision?: number;
  monthlyIncome?: number;
  rentBudget?: number;
  targetRent?: number;
  commuteMinutes?: number;
  livingMode?: "solo" | "shared" | "couple" | "family";
  hasListing?: boolean;
  hasContract?: boolean;
  paymentPressure?: boolean;
  evidenceReady?: boolean;
  riskFocus?: string;
  notes?: string;
};

export type PlanPriority = "必须先做" | "高优先级" | "可按计划";

export type DecisionPlanTask = {
  title: string;
  priority: PlanPriority;
  moduleName: string;
  href: string;
  why: string;
  output: string;
  timeBox: string;
};

export type DecisionPlanPhase = {
  title: string;
  purpose: string;
  tasks: DecisionPlanTask[];
};

export type DecisionPlanResult = {
  mode?: "openai" | "fallback";
  generatedAt?: string;
  warnings?: string[];
  status: ReportStatus;
  score: number;
  headline: string;
  summary: string;
  currentStage: string;
  decisionDeadline: string;
  guardrails: string[];
  blockers: string[];
  phases: DecisionPlanPhase[];
  nextModules: Array<{
    name: string;
    href: string;
    reason: string;
  }>;
  todayPlan: string[];
  stopLine: string;
  doneDefinition: string;
  evidenceChecklist: string[];
  handoffScript: string;
  assumptions: string[];
};

const stageMeta: Record<
  DecisionStage,
  { label: string; href: string; moduleName: string; baselineTask: string }
> = {
  city: {
    label: "选择工作城市",
    href: "/city",
    moduleName: "生活成本",
    baselineTask: "生活成本。",
  },
  area: {
    label: "筛选居住片区",
    href: "/area",
    moduleName: "片区筛选",
    baselineTask: "先围绕工作地点和通勤上限筛 2 到 4 个片区。",
  },
  listing: {
    label: "判断候选房源",
    href: "/analyze",
    moduleName: "房源体检",
    baselineTask: "先把房源截图或手输信息转成评估报告。",
  },
  visit: {
    label: "准备现场看房",
    href: "/visit",
    moduleName: "看房清单",
    baselineTask: "先把风险点转成现场要问、要测、要拍的清单。",
  },
  payment: {
    label: "被催先付款",
    href: "/payment",
    moduleName: "付款咨询",
    baselineTask: "先确认材料、收款主体、退款条件和付款备注。",
  },
  contract: {
    label: "准备签合同",
    href: "/contract",
    moduleName: "合同确认",
    baselineTask: "先确认押金、提前退租、维修、转租授权和付款周期。",
  },
  move: {
    label: "准备入住付款",
    href: "/move",
    moduleName: "入住预算",
    baselineTask: "先测算首笔支出和发薪前现金安全垫。",
  },
  handover: {
    label: "拿钥匙交割",
    href: "/handover",
    moduleName: "交割确认",
    baselineTask: "先确认钥匙、表读数、旧损坏和历史欠费记录。",
  },
  living: {
    label: "入住后出问题",
    href: "/repair",
    moduleName: "维修责任",
    baselineTask: "先报修、保存记录、确认责任和费用边界。",
  },
  renewal: {
    label: "租期快到涨租",
    href: "/renewal",
    moduleName: "续租涨租",
    baselineTask: "先计算续租上限、搬家回本月数和可接受条件。",
  },
  deposit: {
    label: "准备退租",
    href: "/deposit",
    moduleName: "押金退还",
    baselineTask: "先拆解扣款、材料、通知期和返还截止日。",
  },
};

function asNumber(value: number | undefined, fallback: number) {
  return Number.isFinite(value) && value !== undefined ? value : fallback;
}

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function statusFromScore(score: number): ReportStatus {
  if (score >= 78) return "recommend";
  if (score >= 52) return "caution";
  return "reject";
}

function task(
  title: string,
  priority: PlanPriority,
  moduleName: string,
  href: string,
  why: string,
  output: string,
  timeBox: string,
): DecisionPlanTask {
  return { title, priority, moduleName, href, why, output, timeBox };
}

function includesAny(value: string, keywords: string[]) {
  return keywords.some((keyword) => value.includes(keyword));
}

export function buildDecisionPlan(input: DecisionPlanInput): DecisionPlanResult {
  const stage = input.stage && stageMeta[input.stage] ? input.stage : "listing";
  const meta = stageMeta[stage];
  const city = input.city?.trim() || "目标城市";
  const listingTitle = input.listingTitle?.trim() || "当前候选房源";
  const daysToDecision = asNumber(input.daysToDecision, 0);
  const monthlyIncome = asNumber(input.monthlyIncome, 0);
  const targetRent = asNumber(input.targetRent, 0);
  const rentBudget = asNumber(input.rentBudget, 0);
  const commuteMinutes = asNumber(input.commuteMinutes, 45);
  const riskFocus = input.riskFocus?.trim() || "通勤、押金、合同、潮湿、噪音";
  const notes = input.notes?.trim() || "用户正在比较候选房源，希望整理当前最该确认的事项。";
  const combinedConcern = `${riskFocus} ${notes}`;
  const rentRatio = monthlyIncome > 0 ? targetRent / monthlyIncome : 1;
  const overBudget = targetRent > rentBudget;
  const tightDeadline = daysToDecision <= 1;
  const shortDeadline = daysToDecision <= 3;
  const evidenceReady = input.evidenceReady ?? false;
  const hasContract = input.hasContract ?? false;
  const hasListing = input.hasListing ?? true;
  const paymentPressure = input.paymentPressure ?? false;

  let score = 82;
  const blockers: string[] = [];
  const guardrails: string[] = [
    `城市：${city}；阶段：${meta.label}；对象：${listingTitle}。`,
    `目标租金约 ${targetRent.toLocaleString()} 元，占税后月收入约 ${Math.round(rentRatio * 100)}%。`,
    `通勤目标约 ${commuteMinutes} 分钟；预算上限约 ${rentBudget.toLocaleString()} 元。`,
  ];

  if (!hasListing && !["city", "area"].includes(stage)) {
    score -= 12;
    blockers.push("还没有明确候选房源，先不要进入付款或签约。");
  }

  if (paymentPressure) {
    score -= 18;
    blockers.push("对方正在催付款，必须先做付款咨询，不能先转账后补充材料。");
  }

  if (!evidenceReady && ["payment", "contract", "move", "handover", "deposit"].includes(stage)) {
    score -= 14;
    blockers.push("关键材料待补充，授权、合同、押金和交割记录要先确认。");
  }

  if (!hasContract && ["payment", "contract", "move"].includes(stage)) {
    score -= 10;
    blockers.push("合同或补充协议还不完整，暂缓进入大额付款。");
  }

  if (tightDeadline) {
    score -= 12;
    blockers.push("剩余确认时间只剩 1 天以内，必须减少新变化，只做暂不付款和关键确认。");
  } else if (shortDeadline) {
    score -= 6;
  }

  if (rentRatio > 0.38) {
    score -= 16;
    blockers.push("租金收入比偏高，签约前需要重新测算预算和安全垫。");
  } else if (rentRatio > 0.32) {
    score -= 8;
  }

  if (overBudget) {
    score -= 10;
    blockers.push("目标租金超过预算上限，要先放下这套房源，或重新谈付款周期。");
  }

  if (commuteMinutes > 65) {
    score -= 10;
    blockers.push("通勤时间偏长，可能变成长期工作成本。");
  }

  if (includesAny(riskFocus, ["二房东", "转租", "押金不退", "定金", "意向金", "年付", "私转"])) {
    score -= 10;
  }

  if (includesAny(notes, ["催", "马上", "今晚", "不退", "私下", "先转"])) {
    score -= 8;
  }

  score = clamp(score);
  const status = statusFromScore(score);
  const headline =
    status === "recommend"
      ? "可以继续，但要按顺序处理"
      : status === "caution"
        ? "补充关键材料，再继续判断"
        : "暂不付款或签约，先拆风险";

  const phases: DecisionPlanPhase[] = [
    {
      title: tightDeadline ? "今天必须确认" : "第一步：先确认关键条件",
      purpose: "先把会造成真实损失的现金、材料和时间压力处理清楚。",
      tasks: [
        task(
          meta.baselineTask,
          "必须先做",
          meta.moduleName,
          meta.href,
          "用户当前最容易在这个阶段漏掉关键判断。",
          "整理本阶段结论和后续确认项。",
          tightDeadline ? "30 分钟内" : "今天",
        ),
        task(
          "测算租金收入比和首笔现金压力",
          rentRatio > 0.32 || overBudget ? "必须先做" : "高优先级",
          "入住预算",
          "/move",
          "年轻租客最容易低估押金、预付租金、中介费、搬家和发薪前生活缓冲。",
          "得到可承受上限、现金差额和付款周期建议。",
          "今天",
        ),
      ],
    },
    {
      title: "第二步：补充材料和确认",
      purpose: "把口头承诺、截图和付款信息整理成可保存记录。",
      tasks: [
        task(
          "补充出租权、押金、维修和聊天确认",
          evidenceReady ? "可按计划" : "必须先做",
          "材料清单",
          "/evidence",
          "签约后的争议通常卡在材料不足，缺少能证明当时约定的记录。",
          "整理最小材料清单和付款备注要求。",
          shortDeadline ? "今天" : "1 到 2 天",
        ),
        task(
          "用公开入口做关键确认",
          "高优先级",
          "官方查询",
          "/official",
          "备案、示范文本和机构信息必须回到公开入口，本页只帮你整理确认顺序。",
          "得到确认入口、查不到时的应对办法和暂不签约的信号。",
          "30 分钟",
        ),
      ],
    },
    {
      title: "第三步：进入具体场景",
      purpose: "根据你的阶段进入更具体的页面，避免所有问题挤在一份报告里。",
      tasks: [
        task(
          paymentPressure ? "先做付款咨询" : "确认付款、签约和看房后续事项",
          paymentPressure ? "必须先做" : "高优先级",
          paymentPressure ? "付款咨询" : "合同确认",
          paymentPressure ? "/payment" : "/contract",
          paymentPressure
            ? "被催付款时，最重要的是先确认材料完整、退款规则和收款主体。"
            : "签约前要把押金、提前退租、维修责任和转租授权写清。",
          paymentPressure ? "给出可付、暂不付款或小额保留判断。" : "整理高风险条款和补充协议清单。",
          "付款或签约前",
        ),
        task(
          "准备看房或再次确认",
          stage === "visit" || stage === "listing" ? "高优先级" : "可按计划",
          "看房清单",
          "/visit",
          "截图和文字无法确认噪音、潮湿、采光、楼道、门禁和家电状态。",
          "整理现场要问、要测、要拍和暂不签约的情况。",
          "看房前",
        ),
      ],
    },
  ];

  if (input.livingMode === "solo") {
    phases[1].tasks.push(
      task(
        "补独居安全确认",
        "高优先级",
        "独居安全",
        "/safety",
        "独居、晚归、低楼层和维修上门边界会影响长期安全感。",
        "整理夜路、门禁、楼道、快递外卖和上门边界清单。",
        "看房或签约前",
      ),
    );
  }

  if (commuteMinutes > 50) {
    phases[0].tasks.push(
      task(
        "折算通勤真实成本",
        commuteMinutes > 65 ? "必须先做" : "高优先级",
        "通勤成本",
        "/commute",
        "通勤会持续影响睡眠、加班恢复、晚归安全和租金取舍，要结合实际路线一起看。",
        "得到每月通勤小时、晚归打车成本和近通勤替代房最多值得多付多少租金。",
        "今天",
      ),
    );
  }

  if (includesAny(combinedConcern, ["配套", "买菜", "药店", "医院", "夜路", "夜间", "噪音", "生活配套", "周边", "快递"])) {
    phases[2].tasks.push(
      task(
        "确认生活配套和夜间配套",
        "高优先级",
        "生活配套",
        "/life",
        "白天看房很难发现买菜、医疗、快递、夜路和噪音是否会长期消耗日常生活。",
        "整理生活配套评分、短板、夜间实测清单和谈判依据。",
        "看房或再次确认前",
      ),
    );
  }

  if (input.livingMode === "shared") {
    phases[1].tasks.push(
      task(
        "补充合租边界确认",
        "高优先级",
        "合租边界",
        "/shared",
        "低租金可能换来室友、费用、押金连带和公共空间摩擦。",
        "整理必须问清、必须写下来的合租规则。",
        "付款前",
      ),
    );
  }

  if (["handover", "move"].includes(stage)) {
    phases[2].tasks.push(
      task(
        "拿钥匙当天确认交割记录",
        "必须先做",
        "交割确认",
        "/handover",
        "退租押金争议的材料起点通常在入住第一天。",
        "整理钥匙门禁、表读数、旧损坏、历史欠费和视频清单。",
        "拿钥匙当天",
      ),
    );
  }

  if (stage === "renewal") {
    phases[2].tasks.push(
      task(
        "计算续租上限和搬家回本月数",
        "必须先做",
        "续租涨租",
        "/renewal",
        "涨租判断要同时算搬家、中介、新押金和通勤变化。",
        "给出续租、谈判或搬家建议。",
        "回复房东前",
      ),
    );
  }

  if (stage === "deposit") {
    phases[2].tasks.push(
      task(
        "拆解押金扣款和返还截止日",
        "必须先做",
        "押金退还",
        "/deposit",
        "退租时的清洁费、维修费和违约金要拆开看依据。",
      "整理争议扣款、可接受扣款和追款办法。",
        "退租前",
      ),
    );
  }

  const nextModules = phases
    .flatMap((phase) => phase.tasks)
    .filter((item, index, all) => all.findIndex((other) => other.href === item.href) === index)
    .slice(0, 5)
    .map((item) => ({
      name: item.moduleName,
      href: item.href,
      reason: item.why,
    }));
  const allTasks = phases.flatMap((phase) => phase.tasks);
  const criticalTasks = allTasks.filter((item) => item.priority === "必须先做");
  const todayTasks = [...criticalTasks, ...allTasks.filter((item) => item.priority !== "必须先做")]
    .filter((item, index, items) => items.findIndex((other) => other.title === item.title) === index)
    .slice(0, 4);
  const todayPlan = todayTasks.map(
    (item, index) => `${index + 1}. ${item.title}：${item.output}（${item.timeBox}）`,
  );
  const stopLine = blockers.length
      ? `说清前暂不付款签约：${blockers[0]}`
    : "付款和签约前仍需确认材料清单，材料没有确认时暂缓大额付款。";
  const doneDefinition =
    evidenceReady && hasContract && !paymentPressure
      ? "今天至少确认本阶段结论、材料清单和付款/签约条件，确认没有新增待处理事项后再继续。"
      : "今天至少拿到出租授权、合同或补充协议、押金/退款规则、收款主体和付款备注确认；少一项就继续暂不付款或签约。";

  return {
    status,
    score,
    headline,
    summary:
      status === "recommend"
        ? "当前信息基本可以继续，但仍要按预算、材料、确认、签约顺序推进。"
        : status === "caution"
          ? "当前可以继续看，但有若干材料、预算或时间压力需要补充。"
          : "当前继续容易造成付款、押金或合同损失，建议暂不做关键承诺。",
    currentStage: meta.label,
    decisionDeadline:
      daysToDecision <= 0
        ? "已经到期"
        : daysToDecision === 1
          ? "剩余 1 天"
          : `剩余 ${daysToDecision} 天`,
    guardrails,
    blockers: blockers.length ? blockers : ["暂无硬性待处理事项，但付款和签约前仍需确认材料清单。"],
    phases,
    nextModules,
    todayPlan,
    stopLine,
    doneDefinition,
    evidenceChecklist: [
      "房源截图、地址、租金、面积、楼层、付款周期和费用说明。",
      "出租权或转租授权、合同草稿、押金条款、维修责任和提前退租条款。",
      "聊天承诺截图、付款备注模板、收款主体信息和收据要素。",
      "看房照片、视频、表读数、旧损坏、家具家电状态和门禁钥匙数量。",
    ],
    handoffScript:
      "我会继续确认，但需要先把出租授权、合同草稿、押金/退款规则和收款主体补充清楚。材料确认前，暂缓大额付款。",
    assumptions: [
      `风险关注点：${riskFocus}。`,
      `补充说明：${notes}`,
      "本计划只基于你主动输入的信息整理；合同、截图和聊天记录需要你主动补充。",
    ],
  };
}
