import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/auth";
import { inferredModeFromPrompt, startModes, type StartMode } from "@/lib/start-mode-inference";
import { getCurrentOwnerId } from "@/lib/server/current-owner";
import { getAccountQuota } from "@/lib/server/account-quota";
import { addStartIntent } from "@/lib/server/start-intent-store";
import { buildQuotaExceededHref } from "@/lib/quota-routing";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const destinationLabels: Record<StartMode, string> = {
  city: "生活成本",
  buy: "买房大致判断",
  analyze: "房源体检",
  payment: "付款咨询",
  area: "片区与通勤",
  plan: "当前行动",
  deposit: "押金回收",
  renewal: "续租涨租",
  repair: "维修责任",
  handover: "入住交割",
  move: "入住现金流",
  commute: "通勤真实成本",
  life: "生活半径",
  contract: "合同确认",
  evidence: "材料清单",
  official: "官方核验",
  safety: "独居安全",
  shared: "合租边界",
  visit: "看房核验",
};

const modeRoutes: Record<StartMode, string> = {
  city: "/city",
  buy: "/city",
  analyze: "/analyze",
  payment: "/payment",
  area: "/area",
  plan: "/plan",
  deposit: "/deposit",
  renewal: "/renewal",
  repair: "/repair",
  handover: "/handover",
  move: "/move",
  commute: "/commute",
  life: "/life",
  contract: "/contract",
  evidence: "/evidence",
  official: "/official",
  safety: "/safety",
  shared: "/shared",
  visit: "/visit",
};

const handoffFieldLabels: Record<string, string> = {
  city: "城市",
  currentCity: "当前城市",
  candidateCities: "候选城市",
  annualPackage: "税前年包",
  industry: "行业/岗位",
  monthlyIncome: "税后收入",
  income: "收入",
  rentBudget: "租金上限",
  budget: "预算",
  rent: "月租",
  monthlyRent: "月租",
  currentRent: "当前租金",
  proposedRent: "新租金",
  movingCost: "搬家成本",
  targetRent: "目标房租",
  downPayment: "首付",
  mortgagePayment: "月供上限",
  homePrice: "目标总价",
  amount: "拟付款",
  depositAmount: "押金金额",
  repairCost: "维修费用",
  upfrontCost: "首笔支出",
  cashOnHand: "手头现金",
  depositMonths: "押金月数",
  prepaidMonths: "预付月数",
  daysUntilSalary: "发薪间隔",
  workplace: "工作地点",
  commuteLimit: "通勤上限",
  commuteLimitMinutes: "通勤上限",
  oneWayMinutes: "单程通勤",
  candidateAreas: "候选片区",
  listingTitle: "房源",
  title: "房源",
  address: "位置",
  stage: "当前阶段",
  paymentType: "付款类型",
  contractStatus: "合同状态",
  authorizationStatus: "出租授权",
  payeeType: "收款主体",
  refundRule: "退款条件",
  evidenceLevel: "材料状态",
  issueType: "维修问题",
};

const handoffFieldOrder = [
  "city",
  "currentCity",
  "candidateCities",
  "workplace",
  "candidateAreas",
  "listingTitle",
  "title",
  "address",
  "industry",
  "annualPackage",
  "monthlyIncome",
  "income",
  "rentBudget",
  "budget",
  "rent",
  "monthlyRent",
  "currentRent",
  "proposedRent",
  "targetRent",
  "downPayment",
  "mortgagePayment",
  "homePrice",
  "amount",
  "depositAmount",
  "movingCost",
  "repairCost",
  "upfrontCost",
  "cashOnHand",
  "depositMonths",
  "prepaidMonths",
  "daysUntilSalary",
  "commuteLimit",
  "commuteLimitMinutes",
  "oneWayMinutes",
  "stage",
  "paymentType",
  "contractStatus",
  "authorizationStatus",
  "payeeType",
  "refundRule",
  "evidenceLevel",
  "issueType",
];

const handoffGuardrails: Record<StartMode, string> = {
  city: "提交前请确认收入、租金上限和候选城市；结果会按已输入信息估算。",
  buy: "买房大致判断用于估算长期承受能力；提交前请确认首付、月供上限、工作地和候选片区。",
  analyze: "提交前请确认月租、位置和工作地点；不确定的信息可以先留空。",
  payment: "付款咨询只做风险确认，不读取支付账户，也不会发起转账。",
  area: "片区筛选依赖工作地点和通勤上限；地点越具体，结果越接近真实生活。",
  plan: "当前行动用于排序当前事项；如果涉及付款或签约，先确认材料再继续。",
  deposit: "押金判断需要扣款理由、金额和材料状态；先不要签放弃追偿类确认。",
  renewal: "续租判断需要当前租金、新租金和搬家成本；请先完成费用测算。",
  repair: "维修判断需要问题类型、责任边界和已有记录；垫付前先确认书面条件。",
  handover: "交割前请确认钥匙、表读数、旧损坏和历史欠费。",
  move: "入住现金流需要首笔支出、月租和发薪节奏；先确认现金安全垫。",
  commute: "通勤判断依赖工作地点、路线和晚归场景；先确认时间口径。",
  life: "生活半径用于确认日常便利度；请补充买菜、医疗、夜间路线等真实需求。",
  contract: "合同确认需要真实合同或补充协议文本，并保留书面确认。",
  evidence: "材料清单用于保存付款、签约和退租前的关键材料。",
  official: "官方核验只整理核验顺序；最终以公开入口和原始材料为准。",
  safety: "安全审查需要晚归、门禁、楼道和上门边界等真实场景。",
  shared: "合租边界需要费用、访客、押金和转租授权写清楚。",
  visit: "看房清单用于现场确认；照片和文字无法替代现场核验。",
};

const knownCities = [
  "北京",
  "上海",
  "深圳",
  "广州",
  "杭州",
  "成都",
  "南京",
  "苏州",
  "武汉",
  "重庆",
  "西安",
  "厦门",
  "长沙",
  "天津",
  "青岛",
  "宁波",
  "合肥",
  "东莞",
  "无锡",
  "郑州",
  "泉州",
  "福州",
  "佛山",
  "珠海",
  "大连",
  "济南",
  "沈阳",
];
const moneyValuePattern = "(\\d+(?:\\.\\d+)?|[一二两三四五六七八九十]{1,4})";
const moneyUnitPattern = "(万|w|W|k|K|千|元)?";

function chineseNumberToNumber(text: string) {
  const normalized = text.replaceAll("两", "二");
  const digitValue: Record<string, number> = {
    一: 1,
    二: 2,
    三: 3,
    四: 4,
    五: 5,
    六: 6,
    七: 7,
    八: 8,
    九: 9,
  };

  if (normalized === "十") return 10;
  if (normalized.includes("十")) {
    const [tenPart, onePart] = normalized.split("十");
    const tens = tenPart ? digitValue[tenPart] ?? 0 : 1;
    const ones = onePart ? digitValue[onePart] ?? 0 : 0;
    return tens * 10 + ones;
  }

  return digitValue[normalized];
}

function amountNumberFromText(amountText: string) {
  const numeric = Number(amountText);
  if (Number.isFinite(numeric)) return numeric;
  return chineseNumberToNumber(amountText);
}

function isStartMode(value: string | null): value is StartMode {
  return Boolean(value && (startModes as readonly string[]).includes(value));
}

function modeFrom(value: string | null): StartMode {
  return isStartMode(value) ? value : "city";
}

async function hasSignedInAccount(request: NextRequest) {
  const session = await auth().catch(() => null);
  if (session?.user) return true;
  return Boolean(request.cookies.get("zhunaar_owner_id")?.value?.trim());
}

function truncateHandoffValue(value: string) {
  const compacted = value.replace(/\s+/g, " ").trim();
  return compacted.length > 34 ? `${compacted.slice(0, 33)}...` : compacted;
}

function handoffFieldsFromParams(params: URLSearchParams) {
  const fields: Array<{ label: string; value: string }> = [];
  const seenLabels = new Set<string>();

  for (const key of handoffFieldOrder) {
    const value = params.get(key)?.trim();
    const label = handoffFieldLabels[key];

    if (!value || !label || seenLabels.has(label)) continue;

    fields.push({ label, value: truncateHandoffValue(value) });
    seenLabels.add(label);

    if (fields.length >= 6) break;
  }

  return fields;
}

function moneyFromParts(amountText: string | undefined, unitText?: string) {
  if (!amountText) return undefined;
  const amount = amountNumberFromText(amountText);
  if (!Number.isFinite(amount)) return undefined;
  const unit = unitText?.toLowerCase();
  if (unit === "万" || unit === "w") return String(Math.round(amount * 10000));
  if (unit === "k" || unit === "千") return String(Math.round(amount * 1000));
  return String(Math.round(amount));
}

function moneyFromMatch(match: RegExpMatchArray | null) {
  if (!match) return undefined;
  return moneyFromParts(match[1], match[2]);
}

function moneyNear(text: string, keywords: string[]) {
  const keyword = keywords.join("|");
  const before = new RegExp(`(?:${keyword})[^\\d一二两三四五六七八九十]{0,10}${moneyValuePattern}\\s*${moneyUnitPattern}`);
  const after = new RegExp(`${moneyValuePattern}\\s*${moneyUnitPattern}[^，。；,;]{0,10}(?:${keyword})`);
  return moneyFromMatch(text.match(before)) ?? moneyFromMatch(text.match(after));
}

function inferRenewalRents(text: string, fallbackCurrentRent?: string) {
  const range = text.match(
    new RegExp(
      `从\\s*${moneyValuePattern}\\s*${moneyUnitPattern}\\s*(?:涨到|涨至|涨为|加到)\\s*${moneyValuePattern}\\s*${moneyUnitPattern}`,
    ),
  );
  const currentRent =
    (range ? moneyFromParts(range[1], range[2]) : undefined) ??
    moneyNear(text, ["当前租金", "现在租金", "原租金", "原来租金"]) ??
    fallbackCurrentRent;
  const proposedRent =
    (range ? moneyFromParts(range[3], range[4]) : undefined) ??
    moneyNear(text, ["涨到", "涨至", "涨为", "新租金", "续租租金"]);

  return { currentRent, proposedRent };
}

function firstNumberText(text: string, pattern: RegExp) {
  return text.match(pattern)?.[1];
}

function inferCity(text: string) {
  const knownCity = inferCities(text)[0];
  if (knownCity) return knownCity;
  const explicit = text.match(/([\u4e00-\u9fa5]{2,4})市/)?.[1];
  if (explicit && !/城市|换城|担心|目标/.test(explicit)) return explicit;
  return undefined;
}

function inferCities(text: string) {
  const cities = knownCities
    .map((city) => ({ city, index: text.indexOf(city) }))
    .filter((item) => item.index >= 0)
    .sort((a, b) => a.index - b.index)
    .map((item) => item.city);

  return Array.from(new Set(cities));
}

function inferCandidateCityRows(text: string, income?: string) {
  const cities = inferCities(text);
  if (!cities.length) return undefined;
  return cities.map((city) => (income ? `${city} ${income}` : city)).join("\n");
}

function inferStarterCandidateCities(text: string) {
  if (!/选城市|比城市|换城|换城市|择城|去哪个城市|去哪座城市|去哪里工作|去哪工作|哪里工作|找工作.*城市|毕业.*城市/.test(text)) {
    return undefined;
  }

  if (/互联网|产品|运营|电商|设计|研发|程序员|前端|后端|算法/.test(text)) {
    return "上海\n杭州\n深圳\n成都\n西安";
  }

  if (/制造|硬件|新能源|半导体|供应链|外贸/.test(text)) {
    return "苏州\n合肥\n深圳\n无锡\n东莞";
  }

  return "上海\n杭州\n成都\n西安\n长沙";
}

function inferAnnualPackage(text: string) {
  return moneyNear(text, ["税前年包", "年包", "总包", "年薪", "package", "Package"]);
}

function inferIndustry(text: string) {
  const normalized = text.replace(/\s+/g, "");
  const industries = [
    "软件研发",
    "研发",
    "程序员",
    "前端",
    "后端",
    "算法",
    "测试",
    "产品经理",
    "互联网产品",
    "运营",
    "电商运营",
    "外贸运营",
    "销售",
    "市场",
    "品牌",
    "设计",
    "金融",
    "制造",
    "汽车",
    "新能源",
    "生物医药",
    "医疗",
    "教育",
    "咨询",
    "跨境电商",
    "物流",
  ];
  return industries.find((item) => normalized.includes(item));
}

function inferWorkplace(text: string) {
  return text.match(/(?:工作|公司|上班|通勤)[^，。；,;]{0,8}(?:在|到)([^，。；,;]{2,24})/)?.[1]?.trim();
}

function inferCommuteLimit(text: string) {
  return (
    firstNumberText(text, /(?:通勤|上限|希望|最好|控制在)[^，。；,;]{0,12}(\d{2,3})\s*分钟\s*(?:内|以内|到公司|到工作地)?/) ??
    firstNumberText(text, /(\d{2,3})\s*分钟\s*(?:内|以内|到公司|到工作地)/)
  );
}

function inferPaymentStructure(text: string) {
  const numericMatch = text.match(/押\s*(\d{1,2})\s*付\s*(\d{1,2})/);
  if (numericMatch) {
    return {
      depositMonths: numericMatch[1],
      prepaidMonths: numericMatch[2],
    };
  }

  const chineseMatch = text.match(/押\s*([一二两三四五六七八九十])\s*付\s*([一二两三四五六七八九十])/);
  if (!chineseMatch) return {};

  const depositMonths = chineseNumberToNumber(chineseMatch[1]);
  const prepaidMonths = chineseNumberToNumber(chineseMatch[2]);

  return {
    depositMonths: Number.isFinite(depositMonths) ? String(depositMonths) : undefined,
    prepaidMonths: Number.isFinite(prepaidMonths) ? String(prepaidMonths) : undefined,
  };
}

function inferCashOnHand(text: string) {
  return moneyNear(text, ["手头现金", "可用现金", "手里现金", "现金", "存款", "预算现金"]);
}

function inferDaysUntilSalary(text: string) {
  return (
    firstNumberText(text, /(?:发薪|发工资|下次工资|下次发工资)[^\d，。；,;]{0,10}?(\d{1,2})\s*天/) ??
    firstNumberText(text, /(\d{1,2})\s*天[^\d，。；,;]{0,10}?(?:发薪|发工资|下次工资|下次发工资)/)
  );
}

function inferTitle(text: string) {
  const segment = text
    .split(/[，。；,;]/)
    .map((item) => item.trim())
    .find(
      (item) =>
        /小区|公寓|整租|合租|一居|两居|三居|单间|房间|户型|\d+\s*室|[一二三四五六七八九]室/.test(item) &&
        !/房东|房租|房产证|房本|收款人|退款|定金|押金|合同/.test(item),
    );
  return segment?.slice(0, 36);
}

function inferAddress(text: string) {
  const cityArea = text.match(
    /(北京|上海|深圳|广州|杭州|成都|南京|苏州|武汉|重庆|西安|厦门|长沙|天津|青岛|宁波)([^，。；,;]{1,12})(?:一套|的|房源|月租|整租|合租)/,
  );
  if (cityArea) return `${cityArea[1]}${cityArea[2]}`.trim();

  return text.match(/(?:地址|位于|房源在|小区在|位置在|附近|周边)[:：]?\s*([^，。；,;]{2,32})/)?.[1]?.trim();
}

function setInferredTitle(params: URLSearchParams, key: string, text: string) {
  const title = inferTitle(text);
  if (title) params.set(key, title);
}

function inferPaymentType(text: string) {
  return ["意向金", "定金", "押金", "服务费", "中介费", "首笔租金"].find((item) =>
    text.includes(item),
  ) ?? "待确认付款";
}

function inferRefundRule(text: string) {
  if (/退款|退还|可退|能退|退回/.test(text) && /没|未|不清|不明确|没确认|未确认|没写|未写|口头/.test(text)) {
    return "退款条件待书面确认";
  }
  if (/可退|能退|承诺退|同意退/.test(text)) return "口头承诺可退";
  return "退款条件待书面确认";
}

function inferPlanStage(text: string) {
  if (/退租|押金.*退|扣款/.test(text)) return "deposit";
  if (/涨租|续租/.test(text)) return "renewal";
  if (/维修|漏水|发霉|坏了|故障/.test(text)) return "living";
  if (/交割|拿钥匙|入住/.test(text)) return "handover";
  if (/合同|签约|条款/.test(text)) return "contract";
  if (/付款|定金|押金|服务费|意向金|催.*付/.test(text)) return "payment";
  if (/片区|区域|通勤|预算/.test(text)) return "area";
  return "listing";
}

function inferCandidateAreas(text: string) {
  const focused = text.match(/(?:纠结|候选|考虑|对比|选择|选)([^。；;]{2,80})/)?.[1] ?? text;
  const cleaned = focused
    .replace(/这几个|这几处|怎么选|哪个好|哪里好|片区|区域|通勤|预算|希望|以内|内|分钟|工作|公司|上班/g, " ")
    .replace(/\d+(?:\.\d+)?\s*(?:元|万|w|W|k|K|千)?/g, " ");
  const areas = cleaned
    .split(/[、，,和或/]/)
    .map((item) => item.trim())
    .filter((item) => /^[\u4e00-\u9fa5A-Za-z0-9·-]{2,12}$/.test(item))
    .filter((item) => !knownCities.includes(item.replace(/市$/, "")))
    .slice(0, 8);

  return areas.length ? areas.join("、") : text;
}

function inferRepairIssue(text: string) {
  if (/漏水|渗水|水管|下水/.test(text)) return "漏水/渗水";
  if (/发霉|潮湿|返潮/.test(text)) return "发霉/潮湿";
  if (/空调|冰箱|洗衣机|热水器|家电/.test(text)) return "家电故障";
  if (/门锁|窗|墙|地板|家具/.test(text)) return "旧损坏/设施损坏";
  return "入住后维修问题";
}

function inferEvidenceLevel(text: string) {
  if (/没拍|没有凭据|没保存|没留|口头/.test(text)) return "材料不足";
  if (/照片|视频|聊天记录|录音|收据|截图/.test(text)) return "已有部分材料";
  return "需要补充";
}

function inferLandlordResponse(text: string) {
  if (/拒绝|不管|不修|拖|一直没/.test(text)) return "拒绝或拖延处理";
  if (/让我|要求|叫我|先垫付/.test(text)) return "要求租客先负责或先垫付";
  if (/同意|答应|愿意/.test(text)) return "已口头同意，仍需书面确认";
  return undefined;
}

function targetPath(mode: StartMode, prompt: string, source: "home" | "dashboard" = "home") {
  const value = prompt.trim();
  const sourceLabel = source === "dashboard" ? "工作台输入" : "首页输入";
  const context = value ? `来自${sourceLabel}：${value}` : "";
  const params = new URLSearchParams({ from: source });
  if (mode === "buy") params.set("mode", "buy");

  if (!value) {
    return `${modeRoutes[mode]}?${params.toString()}`;
  }

  const city = inferCity(value);
  const rent = moneyNear(value, ["月租", "房租", "租金", "当前租金"]);
  const budget = moneyNear(value, ["预算", "预算上限", "租金上限"]);
  const workplace = inferWorkplace(value);
  const commuteLimit = inferCommuteLimit(value);

  if (mode === "city" || mode === "buy") {
    if (mode === "buy") params.set("mode", "buy");
    if (city) params.set("city", city);
    const income = moneyNear(value, ["税后", "月收入", "收入", "工资", "薪资", "新工作", "offer"]);
    const annualPackage = inferAnnualPackage(value);
    const industry = inferIndustry(value);
    if (income) params.set("monthlyIncome", income);
    if (annualPackage) params.set("annualPackage", annualPackage);
    if (industry) params.set("industry", industry);
    const candidateCityRows = inferCandidateCityRows(value, income);
    const starterCandidateCities = inferStarterCandidateCities(value);
    if (candidateCityRows) params.set("candidateCities", candidateCityRows);
    else if (starterCandidateCities) params.set("candidateCities", starterCandidateCities);
    else if (city && income) params.set("candidateCities", `${city} ${income}`);
    if (budget ?? rent) params.set("rentBudget", budget ?? rent ?? "");
    if (workplace) params.set("workplace", workplace);
    if (mode === "buy") {
      const downPayment = moneyNear(value, ["首付", "首付款"]);
      const mortgagePayment = moneyNear(value, ["月供", "房贷", "还款"]);
      const homePrice = moneyNear(value, ["总价", "房价", "预算", "目标价"]);
      if (downPayment) params.set("downPayment", downPayment);
      if (mortgagePayment) params.set("mortgagePayment", mortgagePayment);
      if (homePrice) params.set("homePrice", homePrice);
    }
    if (commuteLimit) params.set("commuteLimit", commuteLimit);
    if (value) params.set("notes", value);
    if (context) params.set("reportContext", context);
    return `/city?${params.toString()}`;
  }

  if (mode === "payment") {
    const amount = moneyNear(value, ["定金", "意向金", "押金", "服务费", "中介费", "先交", "先付", "付款"]);
    if (city) params.set("city", city);
    if (amount) params.set("amount", amount);
    if (rent) params.set("monthlyRent", rent);
    setInferredTitle(params, "listingTitle", value);
    if (value) params.set("notes", value);
    if (value) params.set("urgencyPressure", value);
    params.set("stage", "不确定");
    params.set(
      "contractStatus",
      /合同.*(?:明天|后补|没|未|没有|没看)|(?:没|未|没有|没看).*合同/.test(value)
        ? "未看到完整合同"
        : "不确定",
    );
    params.set("authorizationStatus", "不确定");
    params.set(
      "payeeType",
      /个人|私人|微信|支付宝/.test(value) ? "个人收款账户" : "不确定",
    );
    params.set("payeeMatchesContract", "待确认");
    params.set("refundRule", inferRefundRule(value));
    params.set(
      "paymentChannel",
      /微信|支付宝|私人|个人/.test(value) ? "微信/支付宝私人转账" : "不确定",
    );
    params.set("paymentType", inferPaymentType(value));
    if (context) params.set("reportContext", context);
    return `/payment?${params.toString()}`;
  }

  if (mode === "commute") {
    if (city) params.set("city", city);
    if (rent) params.set("monthlyRent", rent);
    if (workplace) params.set("workplace", workplace);
    if (commuteLimit) params.set("commuteLimitMinutes", commuteLimit);
    const minutes = firstNumberText(value, /(\d{2,3})\s*分钟/);
    if (minutes) params.set("oneWayMinutes", minutes);
    setInferredTitle(params, "listingTitle", value);
    if (value) params.set("notes", value);
    if (context) params.set("reportContext", context);
    return `/commute?${params.toString()}`;
  }

  if (mode === "life") {
    if (city) params.set("city", city);
    setInferredTitle(params, "listingTitle", value);
    if (value) params.set("lifestyle", value);
    if (value) params.set("notes", value);
    if (/噪音|吵|临街|施工|烧烤|垃圾/.test(value)) params.set("noiseSources", value);
    if (context) params.set("reportContext", context);
    return `/life?${params.toString()}`;
  }

  if (mode === "contract") {
    if (city) params.set("city", city);
    setInferredTitle(params, "title", value);
    if (value) params.set("contractText", value);
    if (context) params.set("reportContext", context);
    return `/contract?${params.toString()}`;
  }

  if (mode === "evidence") {
    const amount = moneyNear(value, ["定金", "押金", "服务费", "中介费", "付款", "转账"]);
    if (city) params.set("city", city);
    if (rent) params.set("monthlyRent", rent);
    if (amount) params.set("amount", amount);
    setInferredTitle(params, "title", value);
    params.set("stage", /退租/.test(value) ? "退租前" : "签约前");
    if (value) params.set("risks", value);
    params.set("evidenceLevel", inferEvidenceLevel(value));
    if (context) params.set("reportContext", context);
    return `/evidence?${params.toString()}`;
  }

  if (mode === "official") {
    if (city) params.set("city", city);
    setInferredTitle(params, "title", value);
    const address = inferAddress(value);
    if (address) params.set("address", address);
    params.set("stage", "签约前");
    params.set("contractStatus", "合同主体、出租权、备案办理办法和收款主体待确认");
    if (value) params.set("concerns", value);
    if (context) params.set("reportContext", context);
    return `/official?${params.toString()}`;
  }

  if (mode === "safety") {
    if (city) params.set("city", city);
    setInferredTitle(params, "listingTitle", value);
    params.set("preferences", "独居、晚归、安全优先");
    if (value) params.set("concerns", value);
    if (context) params.set("reportContext", context);
    return `/safety?${params.toString()}`;
  }

  if (mode === "shared") {
    if (city) params.set("city", city);
    if (rent) params.set("monthlyRent", rent);
    setInferredTitle(params, "listingTitle", value);
    params.set("preferences", "合租边界、费用分摊、公共空间");
    if (value) params.set("concerns", value);
    if (context) params.set("reportContext", context);
    return `/shared?${params.toString()}`;
  }

  if (mode === "deposit") {
    const depositAmount =
      moneyNear(value, ["押金", "退押金", "扣款", "扣"]) ??
      rent;
    if (city) params.set("city", city);
    if (rent) params.set("monthlyRent", rent);
    if (depositAmount) params.set("depositAmount", depositAmount);
    setInferredTitle(params, "listingTitle", value);
    params.set("evidenceLevel", inferEvidenceLevel(value));
    if (value) params.set("landlordReason", value);
    if (value) params.set("notes", value);
    if (context) params.set("reportContext", context);
    return `/deposit?${params.toString()}`;
  }

  if (mode === "renewal") {
    const renewalRents = inferRenewalRents(value, rent);
    const movingCost = moneyNear(value, ["搬家", "搬家费", "搬家成本", "换房成本"]);
    if (city) params.set("city", city);
    if (renewalRents.currentRent) params.set("currentRent", renewalRents.currentRent);
    if (renewalRents.proposedRent) params.set("proposedRent", renewalRents.proposedRent);
    if (movingCost) params.set("movingCost", movingCost);
    setInferredTitle(params, "listingTitle", value);
    if (value) params.set("depositRisk", /押金|扣款|退租/.test(value) ? value : "续租前需要确认押金沿用或调整");
    if (value) params.set("notes", value);
    if (context) params.set("reportContext", context);
    return `/renewal?${params.toString()}`;
  }

  if (mode === "repair") {
    const repairCost = moneyNear(value, ["维修费", "维修", "垫付", "修理", "费用"]);
    if (city) params.set("city", city);
    if (rent) params.set("monthlyRent", rent);
    if (repairCost) params.set("repairCost", repairCost);
    setInferredTitle(params, "listingTitle", value);
    params.set("issueType", inferRepairIssue(value));
    params.set("evidenceLevel", inferEvidenceLevel(value));
    const landlordResponse = inferLandlordResponse(value);
    if (landlordResponse) params.set("landlordResponse", landlordResponse);
    if (value) params.set("depositConcern", /押金|扣款/.test(value) ? value : "担心维修责任影响后续押金");
    if (value) params.set("notes", value);
    if (context) params.set("reportContext", context);
    return `/repair?${params.toString()}`;
  }

  if (mode === "handover") {
    const depositAmount = moneyNear(value, ["押金", "交割", "欠费", "补付"]) ?? rent;
    if (city) params.set("city", city);
    if (rent) params.set("monthlyRent", rent);
    if (depositAmount) params.set("depositAmount", depositAmount);
    setInferredTitle(params, "listingTitle", value);
    const address = inferAddress(value);
    if (address) params.set("address", address);
    if (value) params.set("concerns", value);
    if (value) params.set("notes", value);
    if (context) params.set("reportContext", context);
    return `/handover?${params.toString()}`;
  }

  if (mode === "move") {
    const upfrontCost =
      moneyNear(value, ["首笔金额", "首笔预算", "一次付", "中介费", "服务费", "搬家费"]);
    const paymentStructure = inferPaymentStructure(value);
    const income = moneyNear(value, ["税后", "月收入", "收入", "工资", "薪资"]);
    const cashOnHand = inferCashOnHand(value);
    const daysUntilSalary = inferDaysUntilSalary(value);
    if (city) params.set("city", city);
    if (rent) params.set("monthlyRent", rent);
    if (upfrontCost) params.set("upfrontCost", upfrontCost);
    if (paymentStructure.depositMonths) params.set("depositMonths", paymentStructure.depositMonths);
    if (paymentStructure.prepaidMonths) params.set("prepaidMonths", paymentStructure.prepaidMonths);
    if (income) params.set("monthlyIncome", income);
    if (cashOnHand) params.set("cashOnHand", cashOnHand);
    if (daysUntilSalary) params.set("daysUntilSalary", daysUntilSalary);
    setInferredTitle(params, "listingTitle", value);
    if (value) params.set("risks", value);
    if (value) params.set("notes", value);
    if (context) params.set("reportContext", context);
    return `/move?${params.toString()}`;
  }

  if (mode === "area") {
    if (city) params.set("city", city);
    if (workplace) params.set("workplace", workplace);
    if (budget ?? rent) params.set("budget", budget ?? rent ?? "");
    if (commuteLimit) params.set("commuteLimit", commuteLimit);
    if (value) params.set("candidateAreas", inferCandidateAreas(value));
    if (context) params.set("reportContext", context);
    return `/area?${params.toString()}`;
  }

  if (mode === "visit") {
    if (city) params.set("city", city);
    setInferredTitle(params, "listingTitle", value);
    const address = inferAddress(value);
    if (address) params.set("address", address);
    if (value) params.set("description", value);
    if (value) params.set("concerns", value);
    if (context) params.set("reportContext", context);
    return `/visit?${params.toString()}`;
  }

  if (mode === "plan") {
    params.set("stage", inferPlanStage(value));
    if (value) params.set("prompt", value);
    if (context) params.set("notes", context);
    return `/plan?${params.toString()}`;
  }

  if (city) params.set("city", city);
  if (rent) params.set("rent", rent);
  if (workplace) params.set("workplace", workplace);
  if (budget) params.set("budget", budget);
  if (commuteLimit) params.set("commuteLimit", commuteLimit);
  setInferredTitle(params, "title", value);
  const address = inferAddress(value);
  if (address) params.set("address", address);
  if (value) params.set("description", value);
  if (context) params.set("reportContext", context);
  return `/analyze?${params.toString()}`;
}

function buildStartHandoff({
  mode,
  selectedMode,
  prompt,
  source,
  pathname,
  params,
}: {
  mode: StartMode;
  selectedMode: StartMode;
  prompt: string;
  source: "home" | "dashboard";
  pathname: string;
  params: URLSearchParams;
}) {
  const originalPrompt = prompt.trim();

  return {
    source: source === "dashboard" ? "工作台输入" : "首页输入",
    selectedDestination: destinationLabels[selectedMode],
    destination: destinationLabels[mode],
    destinationPath: pathname,
    modeChanged: mode !== selectedMode,
    routeReason:
      mode !== selectedMode
        ? `根据输入内容，已从“${destinationLabels[selectedMode]}”切到“${destinationLabels[mode]}”。`
        : "已进入你选择的工具。",
    prompt: originalPrompt.slice(0, 180),
    fields: handoffFieldsFromParams(params),
    guardrail: handoffGuardrails[mode],
  };
}

export async function GET(request: NextRequest) {
  const prompt = request.nextUrl.searchParams.get("prompt") ?? "";
  const selectedMode = modeFrom(request.nextUrl.searchParams.get("mode"));
  const from = request.nextUrl.searchParams.get("from");
  const isSmokeCheck = request.nextUrl.searchParams.get("__smoke") === "1";
  if (!isSmokeCheck && !(await hasSignedInAccount(request))) {
    const authUrl = new URL("/auth", request.url);
    authUrl.searchParams.set(
      "callbackUrl",
      `${request.nextUrl.pathname}${request.nextUrl.search}`,
    );
    return NextResponse.redirect(authUrl);
  }

  const source = from === "dashboard" ? "dashboard" : "home";
  const mode = prompt.trim()
    ? (inferredModeFromPrompt(prompt) ?? selectedMode)
    : selectedMode;
  const redirectUrl = new URL(targetPath(mode, prompt, source), request.url);
  const handoff = buildStartHandoff({
    mode,
    selectedMode,
    prompt,
    source,
    pathname: redirectUrl.pathname,
    params: redirectUrl.searchParams,
  });
  if (handoff.prompt) {
    redirectUrl.searchParams.set(
      "handoff",
      JSON.stringify({
        source: handoff.source,
        selectedDestination: handoff.selectedDestination,
        destination: handoff.destination,
        modeChanged: handoff.modeChanged,
        routeReason: handoff.routeReason,
        prompt: handoff.prompt,
        fields: handoff.fields,
        guardrail: handoff.guardrail,
      }),
    );
  }

  const ownerId = isSmokeCheck ? undefined : await getCurrentOwnerId().catch(() => undefined);
  if (handoff.prompt && !isSmokeCheck) {
    const quota = ownerId ? await getAccountQuota({ ownerId }).catch(() => null) : null;
    if (quota && quota.remaining <= 0) {
      const pricingUrl = new URL(
        buildQuotaExceededHref({ planId: quota.planId, from: "start" }),
        request.url,
      );
      return NextResponse.redirect(pricingUrl);
    }

    await addStartIntent(
      {
        source: handoff.source,
        selectedDestination: handoff.selectedDestination,
        destination: handoff.destination,
        modeChanged: handoff.modeChanged,
        routeReason: handoff.routeReason,
        prompt: handoff.prompt,
        fields: handoff.fields,
        guardrail: handoff.guardrail,
        href: `${redirectUrl.pathname}${redirectUrl.search}`,
      },
      ownerId,
    ).catch(() => null);
  }

  return NextResponse.redirect(redirectUrl);
}
