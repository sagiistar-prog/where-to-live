import type { AreaOption } from "@/lib/mock-data";

export type AreaScreenInput = {
  city?: string;
  workplace?: string;
  budget?: string;
  commuteLimit?: string;
  lifestyle?: string;
  candidateAreas?: string;
};

export type AreaScreenResult = {
  mode: "amap" | "fallback";
  generatedAt: string;
  summary: string;
  city: string;
  workplace: string;
  options: AreaOption[];
  viewingQueue: {
    priority: string[];
    backup: string[];
    pause: string[];
    dayPlan: string[];
  };
  warnings: string[];
  nextSteps: string[];
};

const seedAreas: Record<string, string[]> = {
  上海: ["漕河泾 / 田林", "宜山路 / 桂林路", "中山公园", "莘庄", "浦东塘桥"],
  深圳: ["南山科技园", "西丽", "宝安中心", "民治 / 红山", "福田车公庙"],
  北京: ["望京", "双井", "回龙观", "西二旗", "青年路"],
  杭州: ["滨江", "西湖文三", "萧山钱江世纪城", "未来科技城", "城西银泰"],
  成都: ["金融城", "桐梓林", "天府三街", "建设路", "高新区南侧"],
  广州: ["珠江新城", "客村", "体育西", "番禺万博", "琶洲"],
};

function parseNumber(value?: string) {
  if (!value) return undefined;
  const match = value.replace(/,/g, "").match(/\d+(\.\d+)?/);
  return match ? Number(match[0]) : undefined;
}

function clampScore(score: number) {
  return Math.max(0, Math.min(100, Math.round(score)));
}

export function parseCandidateAreas(input?: string, city = "上海") {
  const parsed = input
    ?.split(/[,，、\n]/)
    .map((item) => item.trim())
    .filter(Boolean);

  if (parsed?.length) return parsed.slice(0, 8);
  return seedAreas[city] ?? seedAreas.上海;
}

function estimateRentRange(city: string, area: string) {
  const expensive = /科技园|珠江新城|金融城|车公庙|西二旗|文三|徐家汇|中山公园|望京|滨江/.test(
    area,
  );
  const remote = /莘庄|回龙观|民治|红山|西丽|萧山|番禺|宝安|未来科技城/.test(area);

  if (city === "上海") return expensive ? "5,800-8,500 元/月" : remote ? "3,800-6,200 元/月" : "4,800-7,200 元/月";
  if (city === "深圳") return expensive ? "6,000-9,500 元/月" : remote ? "4,200-7,000 元/月" : "5,000-8,000 元/月";
  if (city === "北京") return expensive ? "5,500-8,500 元/月" : remote ? "3,800-6,300 元/月" : "4,800-7,500 元/月";
  if (city === "杭州") return expensive ? "4,500-7,000 元/月" : remote ? "3,200-5,500 元/月" : "3,800-6,200 元/月";
  if (city === "成都") return expensive ? "3,200-5,200 元/月" : "2,400-4,200 元/月";
  if (city === "广州") return expensive ? "4,800-7,800 元/月" : remote ? "3,000-5,300 元/月" : "3,800-6,500 元/月";
  return "待结合当地行情确认";
}

function rentPressureScore(budget?: number, rentRange?: string) {
  if (!budget || !rentRange) return 0;
  const nums = [...rentRange.matchAll(/\d[\d,]*/g)].map((item) =>
    Number(item[0].replace(/,/g, "")),
  );
  const mid = nums.length >= 2 ? (nums[0] + nums[1]) / 2 : nums[0];
  if (!mid) return 0;
  if (mid <= budget * 0.75) return 12;
  if (mid <= budget) return 4;
  return -12;
}

function estimateCommute(area: string, workplace?: string) {
  if (!workplace) return undefined;
  if (area.includes(workplace) || workplace.includes(area.split(/[ /]/)[0])) return 20;
  if (/莘庄|回龙观|民治|红山|番禺|萧山|宝安|未来科技城/.test(area)) return 55;
  if (/中山公园|西丽|望京|滨江|天府三街|客村|体育西/.test(area)) return 38;
  return 45;
}

function commuteScore(minutes?: number, limit?: number) {
  if (!minutes) return 0;
  if (!limit) return minutes <= 35 ? 8 : minutes <= 50 ? 0 : -8;
  if (minutes <= limit * 0.75) return 14;
  if (minutes <= limit) return 4;
  return -16;
}

function areaRisk(area: string, lifestyle?: string) {
  const risks = [];
  if (/老|田林|桂林|望京|建设路/.test(area)) risks.push("老小区和楼龄差异大");
  if (/科技园|车公庙|珠江新城|金融城|文三/.test(area)) risks.push("租金和加班生活成本偏高");
  if (/莘庄|回龙观|民治|番禺|萧山/.test(area)) risks.push("远距离通勤和末班车风险");
  if (lifestyle?.includes("怕吵")) risks.push("需夜间确认临街噪音和人流");
  if (lifestyle?.includes("怕潮湿")) risks.push("需检查低楼层潮湿和通风");
  return risks.length ? risks.join("；") : "暂无明显结构性风险，仍需现场确认";
}

function lifeRadius(area: string) {
  if (/科技园|金融城|车公庙|珠江新城|文三|徐家汇/.test(area)) {
    return "餐饮、通勤和工作配套强，生活价格偏高";
  }
  if (/莘庄|回龙观|民治|红山|宝安|番禺/.test(area)) {
    return "社区型生活配套成熟，通勤稳定性要重点确认";
  }
  return "基础生活配套较完整，需确认夜间动线和买菜便利度";
}

function viewingLevel(option: Pick<AreaOption, "score" | "commuteMinutes" | "risk">, limit?: number) {
  const commuteOverLimit = Boolean(option.commuteMinutes && limit && option.commuteMinutes > limit);
  const riskText = option.risk || "";
  if (option.score >= 80 && !commuteOverLimit) return "priority" as const;
  if (option.score < 65 || commuteOverLimit || /远距离|末班车|建议谨慎/.test(riskText)) {
    return "pause" as const;
  }
  return "backup" as const;
}

function visitFocus(option: AreaOption, lifestyle?: string) {
  const focus = [];
  if (option.commuteMinutes) {
    focus.push(`工作日晚高峰实测到 ${option.commuteMinutes} 分钟以内是否稳定。`);
  } else {
    focus.push("补充一次真实通勤路线，确认高峰和末班车。");
  }
  if (/老小区|楼龄/.test(option.risk)) {
    focus.push("抽查 2 个小区的楼龄、电梯、潮湿、楼道照明和门禁。");
  }
  if (/夜间|末班车|远距离/.test(option.risk) || lifestyle?.includes("独居")) {
    focus.push("晚上 9 点后实走地铁口到小区，确认照明、人流和外卖快递动线。");
  }
  if (lifestyle?.includes("做饭")) {
    focus.push("确认 10 分钟内是否有菜场、超市和常用外卖。");
  }
  if (lifestyle?.includes("怕吵")) {
    focus.push("工作日晚间再去一次，确认临街、施工、商铺和夜宵噪音。");
  }
  return focus.slice(0, 4);
}

export function attachViewingPlan(
  options: AreaOption[],
  input: AreaScreenInput,
): AreaOption[] {
  const limit = parseNumber(input.commuteLimit);
  return options.map((option, index) => {
    const level = viewingLevel(option, limit);
    const label =
      level === "priority" ? "优先约看" : level === "backup" ? "可以备选" : "先不约看";
    const reason =
      level === "priority"
        ? "通勤、预算和生活配套相对平衡，适合先找具体房源验证。"
        : level === "backup"
          ? "存在可接受取舍，但需要补充通勤、夜间动线或楼龄凭据。"
          : "当前约束下容易浪费看房时间，除非租金明显低于预算或工作地点变化。";
    const visitWindow =
      level === "priority"
        ? index === 0
          ? "本周优先安排 2 套，至少一次放在晚高峰或夜间确认。"
          : "本周安排 1-2 套，与第一片区同一天放在一起比较。"
        : level === "backup"
          ? "先在线补充材料，凭据通过后再安排 1 套样本房。"
          : "先不安排现场看房，等价格、通勤或工作地点条件变化后再看。";

    return {
      ...option,
      viewingPlan: {
        level,
        label,
        reason,
        visitWindow,
        verify: visitFocus(option, input.lifestyle),
        stopRule:
          level === "pause"
            ? "如果租金没有明显低于预算，或通勤仍超上限，就不要继续投入看房时间。"
            : "如果晚高峰通勤、夜间路线或楼龄潮湿任一项明显不达标，就先列为备选或先不约看。",
      },
    };
  });
}

export function buildViewingQueue(options: AreaOption[]) {
  const priority = options
    .filter((option) => option.viewingPlan?.level === "priority")
    .map((option) => option.name);
  const backup = options
    .filter((option) => option.viewingPlan?.level === "backup")
    .map((option) => option.name);
  const pause = options
    .filter((option) => option.viewingPlan?.level === "pause")
    .map((option) => option.name);

  return {
    priority,
    backup,
    pause,
    dayPlan: [
      priority.length
        ? `先在 ${priority.slice(0, 2).join("、")} 各找 1-2 套房源，控制在同一个周末放在一起比较。`
        : "当前没有强优先片区，先减少候选数量或重新调整预算、通勤上限。",
      backup.length
        ? `${backup.slice(0, 2).join("、")} 只做线上补充材料，不急着约现场。`
        : "备选片区为空，说明当前约束比较清晰，可以集中精力看优先片区。",
      pause.length
        ? `${pause.slice(0, 2).join("、")} 先不约看，避免把周末耗在明显不合适的看房上。`
        : "没有明确要放弃的片区，现场看房时仍要按通勤、楼龄和夜间路线再次确认。",
    ],
  };
}

export function buildFallbackAreaScreen(input: AreaScreenInput): AreaScreenResult {
  const city = input.city?.trim() || "上海";
  const workplace = input.workplace?.trim() || "徐家汇";
  const budget = parseNumber(input.budget);
  const limit = parseNumber(input.commuteLimit);
  const candidates = parseCandidateAreas(input.candidateAreas, city);

  const options = attachViewingPlan(candidates
    .map((name) => {
      const rentRange = estimateRentRange(city, name);
      const minutes = estimateCommute(name, workplace);
      const score = clampScore(
        70 +
          rentPressureScore(budget, rentRange) +
          commuteScore(minutes, limit) -
          (/远距离|末班车/.test(areaRisk(name, input.lifestyle)) ? 4 : 0),
      );
      const commute = minutes
        ? `到${workplace}约 ${minutes} 分钟`
        : `到${workplace}待查询`;

      return {
        name,
        city,
        rentRange,
        commute,
        lifeRadius: lifeRadius(name),
        risk: areaRisk(name, input.lifestyle),
        fit:
          score >= 80
            ? "适合作为优先看房片区，先找 2-3 套具体房源放在一起比较。"
            : score >= 65
              ? "可作为备选片区，重点确认通勤、楼龄和夜间安全。"
              : "建议谨慎，除非租金明显低于预算或工作地点变化。",
        score,
        tags: [
          score >= 80 ? "优先" : score >= 65 ? "备选" : "谨慎",
          minutes && limit && minutes > limit ? "通勤超限" : "通勤可评估",
          budget ? "预算已纳入" : "缺预算",
        ],
        evidence: [
          "按已填写信息估算，未抓取房源平台数据。",
          budget ? `预算上限 ${budget} 元已纳入评分。` : "未填写预算，价格判断偏保守。",
          limit ? `通勤上限 ${limit} 分钟已纳入评分。` : "未填写通勤上限。",
        ],
        commuteMinutes: minutes,
      } satisfies AreaOption;
    })
    .sort((a, b) => b.score - a.score), input);

  return {
    mode: "fallback",
    generatedAt: new Date().toISOString(),
    city,
    workplace,
    summary: `已基于 ${city}、工作地点 ${workplace}、预算和通勤约束保存片区筛选。`,
    options,
    viewingQueue: buildViewingQueue(options),
    warnings: ["当前按已填写信息估算；如果工作地点和候选片区更具体，后续可以结合实时路线和周边生活信息继续判断。"],
    nextSteps: [
      "优先只看确认顺序里的前 1-2 个片区，每个片区先找 1-2 套候选房源。",
      "对每套房源保存评估，再进入多房源对比。",
      "夜间实走地铁口到小区路线，确认照明、人流和最后一公里。",
    ],
  };
}
