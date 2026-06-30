import type { AreaOption } from "@/lib/mock-data";
import {
  cityBenchmarkMap,
  formatBenchmarkSource,
  rentRangeFromBenchmark,
} from "@/lib/city-benchmark-data";

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
  dataSources: Array<{ city: string; label: string; url: string; asOf: string; estimated: boolean }>;
};

function parseNumber(value?: string) {
  if (!value) return undefined;
  const match = value.replace(/,/g, "").match(/\d+(\.\d+)?/);
  return match ? Number(match[0]) : undefined;
}

function clampScore(score: number) {
  return Math.max(0, Math.min(100, Math.round(score)));
}

export function parseCandidateAreas(input?: string, city = "") {
  const parsed = input
    ?.split(/[,，、\n]/)
    .map((item) => item.trim())
    .filter(Boolean);

  if (parsed?.length) return parsed.slice(0, 8);
  return cityBenchmarkMap[city]?.areaSeeds ?? [];
}

function estimateRentRange(city: string, area: string) {
  const benchmark = cityBenchmarkMap[city];
  if (benchmark) return rentRangeFromBenchmark(benchmark, area);
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
  if (/莘庄|回龙观|民治|红山|番禺|萧山|宝安|未来科技城|大学城|黄岛|城阳|北仑|海沧|航空港|北客站/.test(area)) return 55;
  if (/中山公园|西丽|望京|滨江|天府三街|客村|体育西|工业园区|软件园|高新|政务区|东部新城|松山湖|麓谷|观音桥/.test(area)) return 38;
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
  if (/科技园|车公庙|珠江新城|金融城|文三|工业园区|软件园|高新|政务区|东部新城|松山湖/.test(area)) risks.push("租金和加班后的日常支出偏高");
  if (/莘庄|回龙观|民治|番禺|萧山|大学城|黄岛|城阳|北仑|海沧|航空港|北客站/.test(area)) risks.push("通勤距离和晚归路线是主要变量");
  if (lifestyle?.includes("怕吵")) risks.push("需夜间确认临街噪音和人流");
  if (lifestyle?.includes("怕潮湿")) risks.push("需检查低楼层潮湿和通风");
  return risks.length ? risks.join("；") : "暂未识别明显结构性风险，现场重点复核楼栋、楼层和夜间路线";
}

function lifeRadius(area: string) {
  if (/科技园|金融城|车公庙|珠江新城|文三|徐家汇|工业园区|软件园|高新|政务区|东部新城|松山湖/.test(area)) {
    return "餐饮、通勤和工作配套强，生活价格偏高";
  }
  if (/莘庄|回龙观|民治|红山|宝安|番禺|大学城|黄岛|城阳|北仑|海沧|航空港|北客站/.test(area)) {
    return "社区型生活配套成熟，通勤稳定性是关键";
  }
  return "基础生活配套较完整，重点看夜间动线和买菜便利度";
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
    focus.push(`工作日晚高峰实测一次，看通勤能否稳定在${option.commuteMinutes}分钟以内。`);
  } else {
    focus.push("补一条真实通勤路线，记录高峰耗时和末班车。");
  }
  if (/老小区|楼龄/.test(option.risk)) {
    focus.push("抽查2个小区的楼龄、电梯、潮湿、楼道照明和门禁。");
  }
  if (/夜间|末班车|远距离/.test(option.risk) || lifestyle?.includes("独居")) {
    focus.push("晚上9点后从地铁口走到小区，记录照明、人流和外卖快递动线。");
  }
  if (lifestyle?.includes("做饭")) {
    focus.push("看10分钟步行范围内是否有菜场、超市和常用外卖。");
  }
  if (lifestyle?.includes("怕吵")) {
    focus.push("工作日晚间再去一次，听临街、施工、商铺和夜宵噪音。");
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
      level === "priority" ? "优先约看" : level === "backup" ? "可以备选" : "暂不约看";
    const reason =
      level === "priority"
        ? "通勤、预算和生活配套相对均衡，可以进入具体房源验证。"
        : level === "backup"
          ? "有可接受取舍。补通勤、夜间动线或楼龄记录后，再决定是否约看。"
          : "当前不值得投入看房时间。先调整租金预算、通勤上限或工作地点范围。";
    const visitWindow =
      level === "priority"
        ? index === 0
          ? "本周安排2套样本，至少1次放在晚高峰或夜间。"
          : "本周安排1到2套，与第一片区同一天比较。"
        : level === "backup"
          ? "先补线上材料，再决定是否安排1套样本房。"
          : "不安排现场看房。等价格、通勤或工作地点条件变化后再复核。";

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
            ? "租金没有明显低于预算，或通勤仍超上限时，停止跟进。"
            : "晚高峰通勤、夜间路线、楼龄潮湿任一项明显不达标，降为备选或暂停。",
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
        ? `在${priority.slice(0, 2).join("、")}各找1到2套房源，尽量安排在同一个周末比较。`
        : "当前没有强优先片区。收窄候选数量，或重新调整预算、通勤上限。",
      backup.length
        ? `${backup.slice(0, 2).join("、")}先做线上材料补充，再决定是否现场看房。`
        : "备选片区为空，当前约束比较清晰，可以集中看优先片区。",
      pause.length
        ? `${pause.slice(0, 2).join("、")}暂不约看。先把预算、通勤或工作地点条件调整清楚。`
        : "没有明确要放弃的片区，现场看房时仍按通勤、楼龄和夜间路线复核。",
    ],
  };
}

export function buildFallbackAreaScreen(input: AreaScreenInput): AreaScreenResult {
  const city = input.city?.trim() || "目标城市";
  const workplace = input.workplace?.trim() || "工作地待确认";
  const budget = parseNumber(input.budget);
  const limit = parseNumber(input.commuteLimit);
  const candidates = parseCandidateAreas(input.candidateAreas, city);
  const benchmark = cityBenchmarkMap[city];
  const dataSources = benchmark
    ? [{
        city,
        label: formatBenchmarkSource(benchmark),
        url: benchmark.source.url,
        asOf: benchmark.asOf,
        estimated: benchmark.estimated,
      }]
    : [{
        city,
        label: `数据截至 ${new Date().toISOString().slice(0, 10)}，来源 用户输入；城市基线缺失`,
        url: "",
        asOf: new Date().toISOString().slice(0, 10),
        estimated: true,
      }];

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
        ? `到${workplace}约${minutes}分钟`
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
            ? "适合作为优先片区。找2到3套具体房源放在一起比较。"
            : score >= 65
              ? "可作为备选片区。通勤、楼龄和夜间安全记录补齐后，再决定是否约看。"
              : "不建议优先约看。请先调整预算、通勤或工作地点条件。",
        score,
        tags: [
          score >= 80 ? "优先" : score >= 65 ? "备选" : "谨慎",
          minutes && limit && minutes > limit ? "通勤超限" : "通勤可评估",
          budget ? "预算已纳入" : "缺预算",
        ],
        evidence: [
          benchmark ? formatBenchmarkSource(benchmark) : "该城市未进入本地数据快照，本次只根据你填写的数据做初筛。",
          budget ? `预算上限${budget}元参与评分。` : "未填写预算，价格判断偏保守。",
          limit ? `通勤上限${limit}分钟参与评分。` : "未填写通勤上限。",
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
    summary: `${city}片区筛选完成。工作地点${workplace}、预算和通勤上限已参与判断。`,
    options,
    viewingQueue: buildViewingQueue(options),
    warnings: [
      benchmark
        ? formatBenchmarkSource(benchmark)
        : "该城市未进入本地数据快照，本次只根据你填写的数据做初筛。",
      "这是基于已填写信息的片区初筛；工作地点和候选片区越具体，后续越容易接入路线和周边生活信息。",
    ],
    nextSteps: [
      "从优先队列里选前1到2个片区，每个片区找1到2套候选房源。",
      "每套房源先保存评估，再进入多房源对比。",
      "夜间实走地铁口到小区路线，记录照明、人流和最后一公里。",
    ],
    dataSources,
  };
}
