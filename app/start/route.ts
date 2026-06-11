import { NextRequest, NextResponse } from "next/server";

const fallbackPrompts = {
  city:
    "拿到深圳新工作，税后大概 18000，租金预算 6500，担心通勤、外食和储蓄率，不确定值不值得去。",
  analyze:
    "南山科技园一居室，月租 6200，地铁走路 11 分钟，中介催今晚定下来，担心噪音和转租授权。",
  payment:
    "中介说今晚先交 2000 定金锁房，合同明天补，收款是个人微信，只说不满意可以退。",
  area:
    "工作在深圳科技园，预算 6500，希望 45 分钟内到公司，纠结西丽、南山、宝安和龙华。",
  plan:
    "明天前要回复房东，已经看过房但没看合同，担心押金、维修责任和晚归安全，不知道先做什么。",
  deposit:
    "退租后房东说墙面和保洁要扣 1800 押金，只发了口头理由，我还没签扣款确认。",
  renewal:
    "房东说下个月续租要从 6200 涨到 7200，我担心搬家成本和押金风险，不知道该谈还是搬。",
  repair:
    "入住后卫生间漏水，房东让我先垫付 1500 维修费，但责任和凭据都没说清。",
  handover:
    "明天拿钥匙入住，中介催我确认无争议，但水电表、旧损坏和家具家电还没拍清楚。",
  move:
    "签约前要一次付押一付三和中介费，我担心首笔支出打穿现金安全垫。",
  commute:
    "这套房到公司可能要 65 分钟，换乘两次，晚上加班回去可能要打车，不确定低房租值不值。",
  life:
    "房子附近买菜、药店和夜间吃饭都不确定，担心下班后生活不顺手。",
  contract:
    "合同里押金、提前退租、维修责任和转租授权都写得不清楚，想先确认。",
  evidence:
    "中介只发了聊天截图和口头承诺，授权、收据和退款规则都没保存凭据。",
  official:
    "想确认房东有没有出租权，能不能备案，合同主体和收款主体是否一致。",
  safety:
    "女生第一次独居，担心夜路、门禁、楼道和维修上门安全。",
  shared:
    "合租室友作息、访客过夜、水电分摊和押金连带责任都没说清。",
  buy:
    "纠结要不要在深圳买房，总价 420 万，首付后现金会很紧，担心换城市和月供压力。",
  visit:
    "明天去看房，担心潮湿、噪音、夜路、门禁和楼下环境，不知道现场该问什么。",
};

type StartMode = keyof typeof fallbackPrompts;

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
];

function isStartMode(value: string | null): value is StartMode {
  return Boolean(value && value in fallbackPrompts);
}

function modeFrom(value: string | null): StartMode {
  return isStartMode(value) ? value : "analyze";
}

function inferredModeFromPrompt(text: string): StartMode | undefined {
  if (/付款|定金|服务费|意向金|催.*付|先交|先付|收款.*个人|个人微信/.test(text)) return "payment";
  if (/备案|出租权|产权|房产证|官方|住建|居住证|网签|合同主体|收款主体/.test(text)) return "official";
  if (/看房|再次看房|再看|现场|潮湿|噪音|采光|楼下|周边环境/.test(text)) return "visit";
  if (/合同|条款|补充协议|出租人|承租人|转租授权|提前退租|维修责任.*(?:写|约定)|押金.*条款/.test(text)) {
    return "contract";
  }
  if (/退租|退押金|押金.*(?:不退|扣|退|返)|扣款确认|放弃追偿/.test(text)) return "deposit";
  if (/独居|女生|女孩子|晚归|夜路|门禁|楼道|电梯|低楼层|维修上门|隐私/.test(text)) return "safety";
  if (/合租|室友|公共空间|访客|过夜|水电分摊|押金连带|二房东/.test(text)) return "shared";
  if (/入住后|报修|维修|漏水|发霉|坏了|故障|垫付.*维修|维修.*垫付/.test(text)) return "repair";
  if (/凭据|留证|截图|聊天记录|收据|发票|授权材料|身份证|房产证|退款承诺|口头承诺/.test(text)) return "evidence";
  if (/买房|月供|首付|总价|房贷|贷款|利率|现金安全垫|装修|契税/.test(text)) return "buy";
  if (/换城市|新工作|去.*(?:北京|上海|深圳|广州|杭州|成都)|offer|税后|物价|生活成本|储蓄率|工资/.test(text)) return "city";
  if (/涨租|续租|新租金|搬家回本|替代房/.test(text)) return "renewal";
  if (/交割|拿钥匙|收房|入住当天|钥匙|水电表|旧损坏|家具家电/.test(text)) return "handover";
  if (/押一付|首笔支出|中介费|服务费|现金安全垫|搬家费|添置/.test(text)) return "move";
  if (/买菜|药店|医院|诊所|超市|便利店|外卖|夜宵|快递|洗衣|健身|公园|生活配套|周边/.test(text)) return "life";
  if (
    /(片区|区域|候选|纠结|对比|选址|住哪里|住哪儿|住哪边|住哪个)/.test(text) &&
    /(预算|通勤|工作|公司|上班|地铁|附近|西丽|南山|宝安|龙华|福田|前海|浦东|徐汇|朝阳|海淀|滨江|萧山|天府|番禺)/.test(text)
  ) {
    return "area";
  }
  if (/通勤|地铁|公交|换乘|步行|晚归打车|到公司|上班路|最后一公里/.test(text)) return "commute";
  if (/片区|区域|候选.*区|纠结.*(?:南山|西丽|宝安|龙华|浦东|徐汇|朝阳|海淀)/.test(text)) {
    return "area";
  }
  return undefined;
}

function moneyFromParts(amountText: string | undefined, unitText?: string) {
  if (!amountText) return undefined;
  const amount = Number(amountText);
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
  const before = new RegExp(`(?:${keyword})[^\\d]{0,10}(\\d+(?:\\.\\d+)?)\\s*(万|w|W|k|K|千|元)?`);
  const after = new RegExp(`(\\d+(?:\\.\\d+)?)\\s*(万|w|W|k|K|千|元)?[^，。；,;]{0,10}(?:${keyword})`);
  return moneyFromMatch(text.match(before)) ?? moneyFromMatch(text.match(after));
}

function inferRenewalRents(text: string, fallbackCurrentRent?: string) {
  const range = text.match(
    /从\s*(\d+(?:\.\d+)?)\s*(万|w|W|k|K|千|元)?\s*(?:涨到|涨至|涨为|加到)\s*(\d+(?:\.\d+)?)\s*(万|w|W|k|K|千|元)?/,
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
  const knownCity = knownCities.find((city) => text.includes(city));
  if (knownCity) return knownCity;
  const explicit = text.match(/([\u4e00-\u9fa5]{2,4})市/)?.[1];
  if (explicit && !/城市|换城|担心|目标/.test(explicit)) return explicit;
  return undefined;
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

function inferTitle(text: string) {
  const segment = text
    .split(/[，。；,;]/)
    .map((item) => item.trim())
    .find((item) => /一居|两居|三居|合租|整租|公寓|房|室/.test(item));
  return (segment ?? text).slice(0, 36);
}

function inferAddress(text: string) {
  return text.match(/(?:地址|位于|在|附近|周边)[:：]?\s*([^，。；,;]{2,32})/)?.[1]?.trim();
}

function inferPaymentType(text: string) {
  return ["意向金", "定金", "押金", "服务费", "中介费", "首笔租金"].find((item) =>
    text.includes(item),
  ) ?? "定金";
}

function inferCashSavings(text: string) {
  return moneyNear(text, ["现金", "存款", "储蓄", "积蓄", "首付后"]);
}

function inferTargetTotalPrice(text: string) {
  return moneyNear(text, ["总价", "房价", "目标房价", "目标总价"]);
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
    .replace(/怎么选|哪个好|哪里好|片区|区域|通勤|预算|希望|以内|内|分钟|工作|公司|上班/g, " ")
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
  if (/没拍|没有凭据|没保存|没留|口头/.test(text)) return "凭据不足";
  if (/照片|视频|聊天记录|录音|收据|截图/.test(text)) return "已有部分凭据";
  return "待补充";
}

function inferLandlordResponse(text: string) {
  if (/拒绝|不管|不修|拖|一直没/.test(text)) return "拒绝或拖延处理";
  if (/让我|要求|叫我|先垫付/.test(text)) return "要求租客先负责或先垫付";
  if (/同意|答应|愿意/.test(text)) return "已口头同意，仍需书面确认";
  return undefined;
}

function targetPath(mode: StartMode, prompt: string, source: "home" | "dashboard" = "home") {
  const value = prompt.trim() || fallbackPrompts[mode];
  const sourceLabel = source === "dashboard" ? "工作台输入" : "首页输入";
  const context = `来自${sourceLabel}：${value}`;
  const params = new URLSearchParams({ from: source });
  const city = inferCity(value);
  const rent = moneyNear(value, ["月租", "房租", "租金", "当前租金"]);
  const budget = moneyNear(value, ["预算", "预算上限", "租金上限"]);
  const workplace = inferWorkplace(value);
  const commuteLimit = inferCommuteLimit(value);

  if (mode === "city") {
    if (city) params.set("city", city);
    const income = moneyNear(value, ["税后", "月收入", "收入", "工资", "薪资", "新工作", "offer"]);
    if (income) params.set("monthlyIncome", income);
    if (budget ?? rent) params.set("rentBudget", budget ?? rent ?? "");
    if (commuteLimit) params.set("commuteLimit", commuteLimit);
    params.set("notes", value);
    params.set("reportContext", context);
    return `/city?${params.toString()}`;
  }

  if (mode === "payment") {
    const amount = moneyNear(value, ["定金", "意向金", "押金", "服务费", "中介费", "先交", "先付", "付款"]);
    if (city) params.set("city", city);
    if (amount) params.set("amount", amount);
    if (rent) params.set("monthlyRent", rent);
    params.set("listingTitle", inferTitle(value));
    params.set("notes", value);
    params.set("urgencyPressure", value);
    params.set("stage", "看房后，未签合同");
    params.set(
      "contractStatus",
      /合同.*(?:明天|后补|没|未|没有|没看)|(?:没|未|没有|没看).*合同/.test(value)
        ? "未看到完整合同"
        : "合同状态待确认",
    );
    params.set("authorizationStatus", "出租权或转租授权待确认");
    params.set(
      "payeeType",
      /个人|私人|微信|支付宝/.test(value) ? "个人收款账户" : "收款主体待确认",
    );
    params.set("payeeMatchesContract", "待确认");
    params.set("refundRule", /可退|能退|退/.test(value) ? "口头承诺可退" : "退款条件待书面确认");
    params.set(
      "paymentChannel",
      /微信|支付宝|私人|个人/.test(value) ? "微信/支付宝私人转账" : "付款渠道待确认",
    );
    params.set("paymentType", inferPaymentType(value));
    params.set("reportContext", context);
    return `/payment?${params.toString()}`;
  }

  if (mode === "commute") {
    if (city) params.set("city", city);
    if (rent) params.set("monthlyRent", rent);
    if (workplace) params.set("workplace", workplace);
    if (commuteLimit) params.set("commuteLimitMinutes", commuteLimit);
    const minutes = firstNumberText(value, /(\d{2,3})\s*分钟/);
    if (minutes) params.set("oneWayMinutes", minutes);
    params.set("listingTitle", inferTitle(value));
    params.set("notes", value);
    params.set("reportContext", context);
    return `/commute?${params.toString()}`;
  }

  if (mode === "life") {
    if (city) params.set("city", city);
    params.set("listingTitle", inferTitle(value));
    params.set("radiusMinutes", "15");
    params.set("lifestyle", value);
    params.set("notes", value);
    if (/噪音|吵|临街|施工|烧烤|垃圾/.test(value)) params.set("noiseSources", value);
    params.set("reportContext", context);
    return `/life?${params.toString()}`;
  }

  if (mode === "contract") {
    if (city) params.set("city", city);
    params.set("title", inferTitle(value));
    params.set("contractText", value);
    params.set("reportContext", context);
    return `/contract?${params.toString()}`;
  }

  if (mode === "evidence") {
    const amount = moneyNear(value, ["定金", "押金", "服务费", "中介费", "付款", "转账"]);
    if (city) params.set("city", city);
    if (rent) params.set("monthlyRent", rent);
    if (amount) params.set("amount", amount);
    params.set("title", inferTitle(value));
    params.set("stage", /退租/.test(value) ? "退租前" : "签约前");
    params.set("risks", value);
    params.set("evidenceLevel", inferEvidenceLevel(value));
    params.set("reportContext", context);
    return `/evidence?${params.toString()}`;
  }

  if (mode === "official") {
    if (city) params.set("city", city);
    params.set("title", inferTitle(value));
    const address = inferAddress(value);
    if (address) params.set("address", address);
    params.set("stage", "签约前");
        params.set("contractStatus", "合同主体、出租权、备案办理办法和收款主体待确认");
    params.set("concerns", value);
    params.set("reportContext", context);
    return `/official?${params.toString()}`;
  }

  if (mode === "safety") {
    if (city) params.set("city", city);
    params.set("listingTitle", inferTitle(value));
    params.set("preferences", "独居、晚归、安全优先");
    params.set("concerns", value);
    params.set("reportContext", context);
    return `/safety?${params.toString()}`;
  }

  if (mode === "shared") {
    if (city) params.set("city", city);
    if (rent) params.set("monthlyRent", rent);
    params.set("listingTitle", inferTitle(value));
    params.set("preferences", "合租边界、费用分摊、公共空间");
    params.set("concerns", value);
    params.set("reportContext", context);
    return `/shared?${params.toString()}`;
  }

  if (mode === "buy") {
    if (city) params.set("city", city);
    const income = moneyNear(value, ["家庭收入", "月收入", "收入", "税后", "工资"]);
    const savings = inferCashSavings(value);
    const totalPrice = inferTargetTotalPrice(value);
    if (income) params.set("householdIncome", income);
    if (savings) params.set("cashSavings", savings);
    if (rent) params.set("currentRent", rent);
    if (totalPrice) params.set("targetTotalPrice", totalPrice);
    params.set("safetyMonths", "12 个月");
    params.set("reportContext", context);
    return `/buy?${params.toString()}`;
  }

  if (mode === "deposit") {
    const depositAmount =
      moneyNear(value, ["押金", "退押金", "扣款", "扣"]) ??
      rent;
    if (city) params.set("city", city);
    if (rent) params.set("monthlyRent", rent);
    if (depositAmount) params.set("depositAmount", depositAmount);
    params.set("listingTitle", inferTitle(value));
    params.set("evidenceLevel", inferEvidenceLevel(value));
    params.set("landlordReason", value);
    params.set("notes", value);
    params.set("reportContext", context);
    return `/deposit?${params.toString()}`;
  }

  if (mode === "renewal") {
    const renewalRents = inferRenewalRents(value, rent);
    if (city) params.set("city", city);
    if (renewalRents.currentRent) params.set("currentRent", renewalRents.currentRent);
    if (renewalRents.proposedRent) params.set("proposedRent", renewalRents.proposedRent);
    params.set("listingTitle", inferTitle(value));
    params.set("depositRisk", /押金|扣款|退租/.test(value) ? value : "续租前需要确认押金沿用或调整");
    params.set("notes", value);
    params.set("reportContext", context);
    return `/renewal?${params.toString()}`;
  }

  if (mode === "repair") {
    const repairCost = moneyNear(value, ["维修费", "维修", "垫付", "修理", "费用"]);
    if (city) params.set("city", city);
    if (rent) params.set("monthlyRent", rent);
    if (repairCost) params.set("repairCost", repairCost);
    params.set("listingTitle", inferTitle(value));
    params.set("issueType", inferRepairIssue(value));
    params.set("evidenceLevel", inferEvidenceLevel(value));
    const landlordResponse = inferLandlordResponse(value);
    if (landlordResponse) params.set("landlordResponse", landlordResponse);
    params.set("depositConcern", /押金|扣款/.test(value) ? value : "担心维修责任影响后续押金");
    params.set("notes", value);
    params.set("reportContext", context);
    return `/repair?${params.toString()}`;
  }

  if (mode === "handover") {
    const depositAmount = moneyNear(value, ["押金", "交割", "欠费", "补付"]) ?? rent;
    if (city) params.set("city", city);
    if (rent) params.set("monthlyRent", rent);
    if (depositAmount) params.set("depositAmount", depositAmount);
    params.set("listingTitle", inferTitle(value));
    const address = inferAddress(value);
    if (address) params.set("address", address);
    params.set("concerns", value);
    params.set("notes", value);
    params.set("reportContext", context);
    return `/handover?${params.toString()}`;
  }

  if (mode === "move") {
    const upfrontCost =
      moneyNear(value, ["首笔", "一次付", "押一付三", "押一付二", "中介费", "服务费", "搬家费"]) ??
      moneyNear(value, ["付款", "付"]);
    if (city) params.set("city", city);
    if (rent) params.set("monthlyRent", rent);
    if (upfrontCost) params.set("upfrontCost", upfrontCost);
    params.set("listingTitle", inferTitle(value));
    params.set("risks", value);
    params.set("notes", value);
    params.set("reportContext", context);
    return `/move?${params.toString()}`;
  }

  if (mode === "area") {
    if (city) params.set("city", city);
    if (workplace) params.set("workplace", workplace);
    if (budget ?? rent) params.set("budget", budget ?? rent ?? "");
    if (commuteLimit) params.set("commuteLimit", commuteLimit);
    params.set("candidateAreas", inferCandidateAreas(value));
    params.set("reportContext", context);
    return `/area?${params.toString()}`;
  }

  if (mode === "visit") {
    if (city) params.set("city", city);
    params.set("listingTitle", inferTitle(value));
    const address = inferAddress(value);
    if (address) params.set("address", address);
    params.set("description", value);
    params.set("concerns", value);
    params.set("reportContext", context);
    return `/visit?${params.toString()}`;
  }

  if (mode === "plan") {
    params.set("stage", inferPlanStage(value));
    params.set("prompt", value);
    params.set("notes", context);
    return `/plan?${params.toString()}`;
  }

  if (city) params.set("city", city);
  if (rent) params.set("rent", rent);
  if (workplace) params.set("workplace", workplace);
  if (budget) params.set("budget", budget);
  if (commuteLimit) params.set("commuteLimit", commuteLimit);
  params.set("title", inferTitle(value));
  const address = inferAddress(value);
  if (address) params.set("address", address);
  params.set("description", value);
  params.set("reportContext", context);
  return `/analyze?${params.toString()}`;
}

export function GET(request: NextRequest) {
  const prompt = request.nextUrl.searchParams.get("prompt") ?? "";
  const selectedMode = modeFrom(request.nextUrl.searchParams.get("mode"));
  const from = request.nextUrl.searchParams.get("from");
  const source = from === "dashboard" ? "dashboard" : "home";
  const mode = prompt.trim()
    ? (inferredModeFromPrompt(prompt) ?? selectedMode)
    : selectedMode;

  return NextResponse.redirect(new URL(targetPath(mode, prompt, source), request.url));
}
