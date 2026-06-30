import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const baseUrl = process.env.SMOKE_BASE_URL ?? "http://127.0.0.1:3001";
const serverReadyTimeoutMs = Number(process.env.SMOKE_READY_TIMEOUT_MS ?? 180000);
const shouldRunLocalAuthHappyPath = process.env.SMOKE_AUTH_HAPPY_PATH === "1";
const shouldAutoStartDevServer =
  !process.env.SMOKE_BASE_URL && process.env.SMOKE_AUTO_START !== "0";
const nextBin = require.resolve("next/dist/bin/next");
const smokeAuthCookie = "zhunaar_owner_id=smoke-auth-user";

const forbiddenCopy = [
  "城市成本",
  "付款闸门",
  "信息缺口",
  "知识库",
  "成本与信任护栏",
  "为什么不是房源平台",
  "当前会话深度报告",
  "当前会话基础报告",
  "算清楚",
  "先算清",
  "是否真的划算",
  "不要只",
  "别只",
  "不能只靠感觉",
  "不要凭感觉",
  "不能只",
  "先看清",
  "合租先谈边界",
  "看房现场先确认这些事",
  "糊涂账",
  "先别转账",
  "别跳过",
  "凭据材料",
  "凭据记录",
  "待补充凭据",
  "凭据",
  "下一步行动计划",
  "下一步计划",
  "临时报告",
  "临时评估",
  "样例",
  "示例",
  "演示",
  "OpenAI",
  "Resend",
  "RESEND_API_KEY",
];

const pageChecks = [
  {
    path: "/",
    includes: [
      "住哪儿 AI，您的住宅选址管家",
      "快速应答",
      "真实决策场景",
      "需要输入",
      "得到结果",
    ],
    htmlIncludes: [
      'src="/videos/city-aerial-loop.mp4"',
      "absolute inset-0",
      "object-cover",
      "min-h-[92svh]",
    ],
  },
  {
    path: "/dashboard",
    includes: ["居住判断工作台", "一句话直达对应工具", "买房大致判断", "最近启动", "写下当前情况"],
  },
  {
    path: "/auth",
    includes: ["欢迎来到住哪儿AI", "登录 / 注册", "请填写您的邮箱", "图形验证码", "发送邮件验证码"],
    htmlIncludes: [
      'src="/videos/city-aerial-loop.mp4"',
      "absolute inset-0",
      "object-cover",
      "min-h-screen",
    ],
  },
  {
    path: "/onboarding",
    includes: ["常用信息", "直接开始", "描述当前居住问题", "常用场景", "保存并进入工作台"],
  },
  {
    path: "/city",
    includes: ["生活成本", "候选城市", "税后月收入", "税前年包（选填）", "行业/岗位", "补充条件（选填）"],
  },
  {
    path: "/city?from=home&candidateCities=%E4%B8%8A%E6%B5%B7%0A%E6%9D%AD%E5%B7%9E%0A%E6%88%90%E9%83%BD&notes=%E6%AF%95%E4%B8%9A%E5%90%8E%E4%B8%8D%E7%9F%A5%E9%81%93%E5%8E%BB%E5%93%AA%E4%B8%AA%E5%9F%8E%E5%B8%82%E5%B7%A5%E4%BD%9C",
    includes: ["生活成本", "候选城市已填好", "请补充税后月收入", "税前年包"],
  },
  {
    path: "/city?mode=buy",
    includes: ["买房大致判断", "输入城市、收入和购房预算", "首付", "月供上限", "目标总价", "补充条件（选填）"],
  },
  {
    path: "/analyze",
    includes: ["房源体检", "填写核心信息", "快速填入", "主要顾虑", "房源细节（选填）"],
  },
  {
    path: "/payment",
    includes: ["付款咨询", "输入风险问题", "风险说明", "请输入您担心的合同及其他法律风险", "确认付款风险"],
  },
  {
    path: "/area",
    includes: ["片区与通勤", "片区初筛", "快速填入", "输入城市、工作地和候选片区"],
  },
  {
    path: "/plan",
    includes: ["当前行动", "描述当前问题", "快速填入", "补充信息（选填）"],
  },
  {
    path: "/case",
    includes: ["房源记录"],
    anyOf: ["从第一套候选房源开始", "当前", "候选", "继续"],
  },
  {
    path: "/compare",
    includes: ["多房源对比", "把候选房源放在同一张表里判断", "快速候选对比", "常见对比场景", "优先处理候选"],
  },
  {
    path: "/contract",
    includes: ["签约前确认", "合同确认", "常见合同场景"],
  },
  {
    path: "/evidence",
    includes: ["材料清单", "整理材料清单", "付款咨询"],
  },
  {
    path: "/official",
    includes: ["官方核验", "整理官方查询步骤", "付款咨询"],
  },
  {
    path: "/life",
    includes: ["生活配套", "生活便利度"],
  },
  {
    path: "/commute",
    includes: ["通勤成本", "通勤真实成本", "筛选通勤片区", "对比多个房源"],
  },
  {
    path: "/visit",
    includes: ["签约前确认", "看房清单"],
  },
  {
    path: "/safety",
    includes: ["签约前确认", "独居安全"],
  },
  {
    path: "/shared",
    includes: ["签约前确认", "合租边界"],
  },
  {
    path: "/move",
    includes: ["入住预算", "评估首笔现金压力"],
  },
  {
    path: "/handover",
    includes: ["入住交割", "交割确认", "同步到材料清单", "入住后维修办法"],
  },
  {
    path: "/repair",
    includes: ["维修责任", "维修责任判断", "补充材料清单", "进入押金退还"],
  },
  {
    path: "/renewal",
    includes: ["续租判断", "续租涨租方案", "对比替代房源", "确认续租协议"],
  },
  {
    path: "/renewal?currentRent=6200&proposedRent=7200&movingCost=5000&from=dashboard",
    includes: ["续租判断", "续租涨租方案"],
    htmlIncludes: ['name="movingCost"', 'value="5000"'],
  },
  {
    path: "/deposit",
    includes: ["押金退还", "退租押金退还", "补充材料清单", "确认扣款依据"],
  },
  {
    path: "/settings",
    includes: ["账户与偏好", "当前方案和额度", "判断额度", "常用判断信息", "常用场景", "保存后继续", "用常用信息开始一次判断", "片区初筛"],
  },
  {
    path: "/pricing",
    includes: ["选择合适的判断额度", "适合场景", "包含内容", "判断额度", "暂未开放购买", "完善常用信息", "开始判断"],
  },
  {
    path: "/pricing?quota=exceeded",
    includes: ["本月判断额度已用完", "选择合适的判断额度", "判断额度"],
  },
  {
    path: "/report/latest",
    anyOf: ["先完成一次房源体检", "为什么是这个结论"],
  },
];

const startChecks = [
  {
    name: "city",
    mode: "city",
    prompt: "拿到上海 offer，税后 18000，租金预算 6500，想判断生活成本和储蓄压力。",
    expectedPath: "/city",
  },
  {
    name: "open-ended city choice",
    mode: "plan",
    prompt: "毕业后不知道去哪个城市工作，想先判断生活成本、机会和长期压力。",
    expectedPath: "/city",
    expectedParamsContain: {
      candidateCities: ["上海", "杭州", "成都", "西安"],
      notes: ["毕业后不知道去哪个城市工作"],
    },
    expectedHandoffFields: {
      候选城市: ["上海"],
    },
  },
  {
    name: "multi-city",
    mode: "city",
    prompt: "税后 18000，纠结深圳和上海，想看收入、房租、物价、通勤和片区。",
    expectedPath: "/city",
    expectedParamsContain: {
      candidateCities: ["深圳 18000", "上海 18000"],
      monthlyIncome: ["18000"],
    },
  },
  {
    name: "multi-city annual package industry",
    mode: "city",
    prompt: "软件研发年包 28 万，纠结西安和重庆，租金预算 3500，通勤 45 分钟内。",
    expectedPath: "/city",
    expectedParamsContain: {
      candidateCities: ["西安", "重庆"],
      annualPackage: ["280000"],
      industry: ["软件研发"],
      rentBudget: ["3500"],
      commuteLimit: ["45"],
    },
    expectedParamsAbsent: ["monthlyIncome"],
    expectedHandoffFields: {
      城市: ["西安"],
      "行业/岗位": ["软件研发"],
      税前年包: ["280000"],
      租金上限: ["3500"],
      通勤上限: ["45"],
    },
  },
  {
    name: "analyze",
    mode: "analyze",
    prompt: "我想评估深圳南山一套月租 6800 的房源，公司在科技园，看看是否值得继续谈。",
    expectedPath: "/analyze",
    expectedParamsContain: {
      city: ["深圳"],
      rent: ["6800"],
      workplace: ["科技园"],
      address: ["深圳南山"],
    },
  },
  {
    name: "payment",
    mode: "payment",
    prompt: "中介催我先交 3000 定金，但合同、收款主体和退款条件还没确认。",
    expectedPath: "/payment",
  },
  {
    name: "buy",
    mode: "buy",
    prompt: "想在杭州买房，首付 80 万，月供希望控制在 9000 内，公司在未来科技城。",
    expectedPath: "/city",
    expectedSearch: "mode=buy",
    expectedParamsContain: {
      city: ["杭州"],
      downPayment: ["800000"],
      mortgagePayment: ["9000"],
      workplace: ["未来科技城"],
    },
    expectedHandoffFields: {
      城市: ["杭州"],
      工作地点: ["未来科技城"],
      首付: ["800000"],
      月供上限: ["9000"],
    },
  },
  {
    name: "move-budget",
    mode: "plan",
    prompt: "月租 6800，押一付三，手头现金 2 万，税后 18000，下次发工资还有 18 天，想看首笔支出压力。",
    expectedPath: "/move",
    expectedParamsContain: {
      monthlyRent: ["6800"],
      depositMonths: ["1"],
      prepaidMonths: ["3"],
      cashOnHand: ["20000"],
      monthlyIncome: ["18000"],
      daysUntilSalary: ["18"],
    },
    expectedParamsAbsent: ["upfrontCost"],
    expectedHandoffFields: {
      税后收入: ["18000"],
      月租: ["6800"],
      手头现金: ["20000"],
      押金月数: ["1"],
      预付月数: ["3"],
      发薪间隔: ["18"],
    },
  },
  {
    name: "deposit",
    mode: "deposit",
    prompt: "房东说墙面有划痕要扣押金 3000，我有入住照片和聊天记录，想判断怎么要回押金。",
    expectedPath: "/deposit",
    expectedParamsContain: {
      depositAmount: ["3000"],
      evidenceLevel: ["已有部分材料"],
    },
    expectedHandoffFields: {
      押金金额: ["3000"],
      材料状态: ["已有部分材料"],
    },
  },
  {
    name: "renewal",
    mode: "renewal",
    prompt: "现在月租 6200，房东续租要涨到 7200，搬家大概要 5000，想判断该不该续租。",
    expectedPath: "/renewal",
    expectedParamsContain: {
      currentRent: ["6200"],
      proposedRent: ["7200"],
      movingCost: ["5000"],
    },
    expectedHandoffFields: {
      当前租金: ["6200"],
      新租金: ["7200"],
      搬家成本: ["5000"],
    },
  },
  {
    name: "repair",
    mode: "repair",
    prompt: "入住后发现漏水，房东让我先垫付维修费 1500，我想判断责任和付款风险。",
    expectedPath: "/repair",
    expectedParamsContain: {
      repairCost: ["1500"],
      issueType: ["漏水"],
    },
    expectedHandoffFields: {
      维修费用: ["1500"],
      维修问题: ["漏水"],
    },
  },
];

const apiChecks = [
  {
    name: "account quota pro",
    path: "/api/account/quota?planId=pro",
    method: "GET",
    expectedQuota: {
      planId: "pro",
      limit: 30,
    },
  },
  {
    name: "city-ledger multi-city",
    path: "/api/city/ledger",
    body: {
      candidateCities: "深圳 18000\n上海 18000",
      monthlyIncome: "18000",
      rentBudget: "6500",
      fixedCost: "2500",
      savingGoal: "30%",
      commuteLimit: "45",
    },
    expectedCities: ["深圳", "上海"],
    expectedTextIncludes: ["dataSources", "Numbeo Shenzhen", "Numbeo Shanghai", "数据截至"],
  },
  {
    name: "city-ledger current-city fallback",
    path: "/api/city/ledger",
    body: {
      currentCity: "杭州",
      monthlyIncome: "17000",
      rentBudget: "5200",
      fixedCost: "2600",
      savingGoal: "30%",
      commuteLimit: "45",
    },
    expectedCities: ["杭州"],
  },
  {
    name: "city-ledger expanded cities with industry",
    path: "/api/city/ledger",
    body: {
      candidateCities: "西安 14000\n重庆 15000",
      annualPackage: "28万",
      rentBudget: "3500",
      industry: "软件研发",
      savingGoal: "25%",
      commuteLimit: "45",
    },
    expectedCities: ["西安", "重庆"],
    expectedTextIncludes: ["软件研发机会匹配", "通用机会面", "本次优先使用每个城市的税后月收入", "Numbeo Xi'an", "Numbeo Chongqing"],
  },
  {
    name: "city-ledger annual package estimate",
    path: "/api/city/ledger",
    body: {
      candidateCities: "西安\n重庆",
      annualPackage: "28万",
      rentBudget: "3500",
      industry: "软件研发",
      savingGoal: "25%",
      commuteLimit: "45",
    },
    expectedCities: ["西安", "重庆"],
    expectedMonthlyIncome: 18837,
    expectedTextIncludes: ["税前年包已换算为税后月收入", "18837元"],
  },
  {
    name: "city-ledger unknown city sample caveat",
    path: "/api/city/ledger",
    body: {
      candidateCities: "泉州 12000",
      rentBudget: "3000",
      industry: "外贸运营",
      savingGoal: "25%",
      commuteLimit: "45",
    },
    expectedCities: ["泉州"],
    expectedTextIncludes: ["城市基线缺失", "只根据你填写的数据做初筛"],
  },
  {
    name: "city-ledger missing city",
    path: "/api/city/ledger",
    body: {},
    expectedStatus: 400,
  },
  {
    name: "city-ledger missing income",
    path: "/api/city/ledger",
    body: {
      candidateCities: "上海\n杭州\n成都",
      rentBudget: "6000",
      savingGoal: "25%",
    },
    expectedStatus: 400,
  },
  {
    name: "payment notes-only",
    path: "/api/payment/gate",
    body: {
      notes: "中介催我先交 3000 定金，但合同、收款主体和退款条件还没确认。",
    },
    expectedJson: {
      amount: 3000,
      paymentType: "定金",
      verdict: "不建议付款",
    },
  },
  {
    name: "payment empty input",
    path: "/api/payment/gate",
    body: {},
    expectedStatus: 400,
  },
  {
    name: "deposit refund core numbers",
    path: "/api/deposit/refund",
    body: {
      city: "杭州",
      monthlyRent: 6200,
      depositAmount: 6200,
      damageClaim: 3000,
      evidenceLevel: "已有部分材料",
      landlordReason: "房东说墙面有划痕要扣押金 3000，我有入住照片和聊天记录。",
    },
    expectedTextIncludes: ["6200", "3000", "押金"],
  },
  {
    name: "renewal moving cost",
    path: "/api/renewal/decision",
    body: {
      city: "杭州",
      listingTitle: "当前房源",
      currentRent: 6200,
      proposedRent: 7200,
      marketRent: 6500,
      movingCost: 5000,
      monthlyIncome: 18000,
    },
    expectedTextIncludes: ["6200", "7200", "5000"],
  },
  {
    name: "repair responsibility cost",
    path: "/api/repair/responsibility",
    body: {
      city: "杭州",
      listingTitle: "当前房源",
      issueType: "漏水",
      evidenceLevel: "已有部分材料",
      landlordResponse: "要求租客先垫付",
      repairCost: 1500,
      depositConcern: "担心维修责任影响后续押金",
    },
    expectedTextIncludes: ["漏水", "1500"],
  },
  {
    name: "analyze notes-only",
    path: "/api/analyze/report",
    body: {
      description: "我想评估深圳南山一套月租 6800 的房源，公司在科技园，担心通勤和签约风险。",
      saveReportHistory: false,
      reportDepth: "standard",
      preferences: [],
      dataSourceSettings: {
        amapDataEnabled: false,
        weatherDataEnabled: false,
        officialPromptEnabled: true,
      },
    },
    expectedReport: {
      mode: "fallback",
      titleIncludes: "候选房源",
      addressIncludes: "深圳",
      statusIn: ["recommend", "caution", "reject"],
      saved: false,
    },
  },
  {
    name: "analyze empty input",
    path: "/api/analyze/report",
    body: {
      saveReportHistory: false,
      preferences: [],
    },
    expectedStatus: 400,
  },
];

const authChecks = [
  {
    name: "captcha challenge",
  },
  {
    name: "email code requires captcha",
    path: "/api/auth/email-code",
    body: {
      email: "smoke-auth@example.com",
    },
    expectedStatus: 400,
    errorIncludes: "图形验证码",
  },
  {
    name: "email code rejects wrong captcha",
    path: "/api/auth/email-code",
    useCaptchaToken: true,
    body: {
      email: "smoke-auth@example.com",
      captchaAnswer: "0000",
    },
    expectedStatus: 400,
    errorIncludes: "图形验证码",
  },
  {
    name: "verify email rejects invalid email",
    path: "/api/auth/verify-email",
    body: {
      email: "not-an-email",
      code: "123456",
    },
    expectedStatus: 400,
    errorIncludes: "有效的电子邮箱",
  },
  {
    name: "verify email rejects invalid code format",
    path: "/api/auth/verify-email",
    body: {
      email: "smoke-auth@example.com",
      code: "123",
    },
    expectedStatus: 400,
    errorIncludes: "6 位邮箱验证码",
  },
  {
    name: "verify email rejects missing issued code",
    path: "/api/auth/verify-email",
    body: {
      email: "smoke-auth-missing@example.com",
      code: "123456",
    },
    expectedStatus: 400,
    errorIncludes: "邮箱验证码",
  },
  ...(shouldRunLocalAuthHappyPath
    ? [
        {
          name: "email code local happy path",
          localHappyPath: true,
        },
      ]
    : []),
];

const redirectChecks = [
  {
    path: "/buy",
    expectedPath: "/city",
    expectedSearchParams: {
      mode: "buy",
    },
  },
  {
    path: "/knowledge",
    expectedPath: "/evidence",
  },
  {
    path: "/demo",
    expectedPath: "/dashboard",
  },
  {
    path: "/report/demo",
    expectedPath: "/dashboard",
  },
  {
    path: "/report",
    expectedPath: "/report/latest",
  },
];

const notFoundChecks = [
  {
    path: "/does-not-exist",
    includes: ["404", "页面不存在", "回到工作台"],
  },
];

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function probeServer() {
  try {
    const response = await fetch(new URL("/", baseUrl), { redirect: "manual" });
    return response.status < 500;
  } catch {
    return false;
  }
}

async function waitForServer() {
  const startedAt = Date.now();

  while (Date.now() - startedAt < serverReadyTimeoutMs) {
    if (await probeServer()) return;
    await wait(500);
  }

  throw new Error(`Server did not become ready at ${baseUrl}`);
}

function forwardDevServerOutput(stream, target, { onlyImportant = false } = {}) {
  let buffered = "";

  stream.on("data", (chunk) => {
    buffered += chunk.toString();
    const lines = buffered.split(/\r?\n/);
    buffered = lines.pop() ?? "";

    for (const line of lines) {
      if (line.includes("System Volume Information")) continue;
      if (onlyImportant && !/Ready|Local:|Network:|Environments:|Starting|Error|Failed/i.test(line)) {
        continue;
      }
      target.write(`${line}\n`);
    }
  });

  stream.on("end", () => {
    if (!buffered || buffered.includes("System Volume Information")) return;
    if (onlyImportant && !/Ready|Local:|Network:|Environments:|Starting|Error|Failed/i.test(buffered)) return;
    target.write(buffered);
  });
}

async function maybeStartDevServer() {
  if (await probeServer()) return null;

  if (!shouldAutoStartDevServer) return null;

  const url = new URL(baseUrl);
  const host = url.hostname || "127.0.0.1";
  const port = url.port || "3001";
  const child = spawn(process.execPath, [nextBin, "dev", "--hostname", host, "--port", port], {
    env: {
      ...process.env,
      WATCHPACK_POLLING: process.env.WATCHPACK_POLLING ?? "true",
      CHOKIDAR_USEPOLLING: process.env.CHOKIDAR_USEPOLLING ?? "true",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });

  if (child.stdout) forwardDevServerOutput(child.stdout, process.stdout, { onlyImportant: true });
  if (child.stderr) forwardDevServerOutput(child.stderr, process.stderr);

  return child;
}

async function stopDevServer(child) {
  if (!child || child.killed) return;

  child.kill("SIGTERM");
  await wait(800);
  if (!child.killed) child.kill("SIGKILL");
}

async function fetchText(path, { authenticated = true } = {}) {
  let response;
  try {
    response = await fetch(new URL(path, baseUrl), {
      headers: authenticated ? { Cookie: smokeAuthCookie } : undefined,
    });
  } catch (error) {
    throw new Error(`${path} fetch failed: ${error instanceof Error ? error.message : String(error)}`);
  }
  const text = await response.text();
  assert(response.ok, `${path} returned ${response.status}`);
  return { response, text };
}

async function fetchCaptchaChallenge() {
  let response;
  try {
    response = await fetch(new URL("/api/auth/captcha", baseUrl), { cache: "no-store" });
  } catch (error) {
    throw new Error(`/api/auth/captcha fetch failed: ${error instanceof Error ? error.message : String(error)}`);
  }
  assert(response.ok, `/api/auth/captcha returned ${response.status}`);
  const data = await response.json();
  assert(typeof data.token === "string" && data.token.length > 10, "captcha token is missing");
  assert(
    typeof data.image === "string" && data.image.startsWith("data:image/svg+xml;base64,"),
    "captcha image data URL is missing",
  );
  assert(typeof data.expiresAt === "string", "captcha expiry is missing");
  return data;
}

function captchaAnswerFromImage(image) {
  const encodedSvg = image.split(",")[1] ?? "";
  const svg = Buffer.from(encodedSvg, "base64").toString("utf8");
  const match = svg.match(/(\d+)\s*\+\s*(\d+)\s*=\s*\?/);
  assert(match, "captcha expression is missing from SVG");
  return String(Number(match[1]) + Number(match[2]));
}

async function checkPage({ path, includes = [], anyOf = [], htmlIncludes = [] }) {
  const { text } = await fetchText(path);

  for (const snippet of includes) {
    assert(text.includes(snippet), `${path} is missing expected copy: ${snippet}`);
  }

  for (const snippet of htmlIncludes) {
    assert(text.includes(snippet), `${path} is missing expected HTML structure: ${snippet}`);
  }

  if (anyOf.length) {
    assert(
      anyOf.some((snippet) => text.includes(snippet)),
      `${path} is missing all expected copy options: ${anyOf.join(" / ")}`,
    );
  }

  for (const snippet of forbiddenCopy) {
    assert(!text.includes(snippet), `${path} includes forbidden copy: ${snippet}`);
  }

  return `${path} ok`;
}

async function checkProtectedPageRequiresSignIn() {
  const { text } = await fetchText("/city", { authenticated: false });
  assert(text.includes("登录后继续使用"), "/city must require sign-in before showing tools");
  assert(text.includes("登录 / 注册"), "/city sign-in gate is missing login action");
  assert(!text.includes("候选城市"), "/city must not expose the city form before sign-in");
  return "/city sign-in gate ok";
}

async function checkStartRoute(item) {
  const params = new URLSearchParams({
    __smoke: "1",
    from: "dashboard",
    mode: item.mode,
    prompt: item.prompt,
  });
  let response;
  try {
    response = await fetch(new URL(`/start?${params.toString()}`, baseUrl));
  } catch (error) {
    throw new Error(`/start ${item.name} fetch failed: ${error instanceof Error ? error.message : String(error)}`);
  }
  assert(response.ok, `/start ${item.name} returned ${response.status}`);

  const finalUrl = new URL(response.url);
  assert(
    finalUrl.pathname === item.expectedPath,
    `/start ${item.name} ended at ${finalUrl.pathname}, expected ${item.expectedPath}`,
  );

  if (item.expectedSearch) {
    assert(
      finalUrl.search.includes(item.expectedSearch),
      `/start ${item.name} ended without ${item.expectedSearch}: ${finalUrl.href}`,
    );
  }

  if (item.expectedParamsContain) {
    for (const [key, snippets] of Object.entries(item.expectedParamsContain)) {
      const value = finalUrl.searchParams.get(key) ?? "";
      for (const snippet of snippets) {
        assert(
          value.includes(snippet),
          `/start ${item.name} ${key} is missing ${snippet}: ${value}`,
        );
      }
    }
  }

  if (item.expectedParamsAbsent) {
    for (const key of item.expectedParamsAbsent) {
      assert(
        !finalUrl.searchParams.has(key),
        `/start ${item.name} should not include ${key}: ${finalUrl.href}`,
      );
    }
  }

  if (item.expectedHandoffFields) {
    const rawHandoff = finalUrl.searchParams.get("handoff") ?? "";
    assert(rawHandoff, `/start ${item.name} is missing handoff payload`);
    let parsedHandoff;
    try {
      parsedHandoff = JSON.parse(rawHandoff);
    } catch {
      throw new Error(`/start ${item.name} handoff payload is not valid JSON`);
    }
    const fields = Array.isArray(parsedHandoff.fields) ? parsedHandoff.fields : [];
    for (const [label, snippets] of Object.entries(item.expectedHandoffFields)) {
      const field = fields.find((entry) => entry?.label === label);
      assert(field, `/start ${item.name} handoff is missing ${label}`);
      for (const snippet of snippets) {
        assert(
          String(field.value ?? "").includes(snippet),
          `/start ${item.name} handoff ${label} is missing ${snippet}: ${field.value}`,
        );
      }
    }
  }

  const summary = item.expectedSearch
    ? `${finalUrl.pathname}?${item.expectedSearch}`
    : finalUrl.pathname;
  return `/start ${item.name} -> ${summary} ok`;
}

async function checkApi(item) {
  let response;
  try {
    response = item.method === "GET"
      ? await fetch(new URL(item.path, baseUrl))
      : await fetch(new URL(item.path, baseUrl), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(item.body),
      });
  } catch (error) {
    throw new Error(`${item.path} ${item.name} fetch failed: ${error instanceof Error ? error.message : String(error)}`);
  }
  if (item.expectedStatus) {
    assert(
      response.status === item.expectedStatus,
      `${item.path} ${item.name} returned ${response.status}, expected ${item.expectedStatus}`,
    );
    return `${item.path} ${item.name} ok`;
  }

  assert(response.ok, `${item.path} ${item.name} returned ${response.status}`);

  const data = await response.json();
  if (item.expectedQuota) {
    for (const [key, value] of Object.entries(item.expectedQuota)) {
      assert(
        data[key] === value,
        `${item.path} ${item.name} expected ${key}=${value}, got ${data[key]}`,
      );
    }
    assert(
      data.used === data.counts.reports + data.counts.actionRecords + data.counts.quickStarts,
      `${item.path} ${item.name} used does not match quota counts`,
    );
    assert(
      data.remaining === Math.max(data.limit - data.used, 0),
      `${item.path} ${item.name} remaining does not match limit-used`,
    );
    return `${item.path} ${item.name} ok`;
  }

  if (item.expectedJson) {
    for (const [key, value] of Object.entries(item.expectedJson)) {
      assert(
        data[key] === value,
        `${item.path} ${item.name} expected ${key}=${value}, got ${data[key]}`,
      );
    }
  }

  if (item.expectedTextIncludes) {
    const text = JSON.stringify(data);
    for (const snippet of item.expectedTextIncludes) {
      assert(
        text.includes(snippet),
        `${item.path} ${item.name} response missing ${snippet}`,
      );
    }
    if (!item.expectedCities) {
      return `${item.path} ${item.name} ok`;
    }
  }

  if (item.expectedReport) {
    const report = data.report ?? {};
    if (item.expectedReport.mode) {
      assert(
        data.mode === item.expectedReport.mode,
        `${item.path} ${item.name} expected mode=${item.expectedReport.mode}, got ${data.mode}`,
      );
    }
    if (item.expectedReport.saved !== undefined) {
      assert(
        data.saved === item.expectedReport.saved,
        `${item.path} ${item.name} expected saved=${item.expectedReport.saved}, got ${data.saved}`,
      );
    }
    if (item.expectedReport.titleIncludes) {
      assert(
        String(report.title ?? "").includes(item.expectedReport.titleIncludes),
        `${item.path} ${item.name} title missing ${item.expectedReport.titleIncludes}: ${report.title}`,
      );
    }
    if (item.expectedReport.addressIncludes) {
      assert(
        String(report.address ?? "").includes(item.expectedReport.addressIncludes),
        `${item.path} ${item.name} address missing ${item.expectedReport.addressIncludes}: ${report.address}`,
      );
    }
    if (item.expectedReport.statusIn) {
      assert(
        item.expectedReport.statusIn.includes(report.status),
        `${item.path} ${item.name} unexpected status: ${report.status}`,
      );
    }
    return `${item.path} ${item.name} ok`;
  }

  if (!item.expectedCities) {
    return `${item.path} ${item.name} ok`;
  }

  const cities = Array.isArray(data.options)
    ? data.options.map((option) => option.city)
    : [];

  for (const city of item.expectedCities) {
    assert(cities.includes(city), `${item.path} ${item.name} missing city: ${city}`);
  }

  if (item.expectedMonthlyIncome) {
    for (const option of data.options) {
      assert(
        option.monthlyIncome === item.expectedMonthlyIncome,
        `${item.path} ${item.name} expected monthlyIncome=${item.expectedMonthlyIncome}, got ${option.monthlyIncome} for ${option.city}`,
      );
    }
  }

  return `${item.path} ${item.name} ok`;
}

async function checkAuthApi(item) {
  if (item.name === "captcha challenge") {
    await fetchCaptchaChallenge();
    return "/api/auth/captcha captcha challenge ok";
  }

  if (item.localHappyPath) {
    const email = `smoke-auth-${Date.now()}@example.com`;
    const captcha = await fetchCaptchaChallenge();
    const captchaAnswer = captchaAnswerFromImage(captcha.image);
    let sendResponse;
    try {
      sendResponse = await fetch(new URL("/api/auth/email-code", baseUrl), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          captchaToken: captcha.token,
          captchaAnswer,
        }),
      });
    } catch (error) {
      throw new Error(`/api/auth/email-code local happy path fetch failed: ${error instanceof Error ? error.message : String(error)}`);
    }
    assert(sendResponse.ok, `/api/auth/email-code local happy path returned ${sendResponse.status}`);
    const sendData = await sendResponse.json();
    assert(sendData.ok === true, "/api/auth/email-code local happy path did not return ok");
    assert(
      typeof sendData.autoFillCode === "string" && /^\d{6}$/.test(sendData.autoFillCode),
      "/api/auth/email-code local happy path requires local autoFillCode",
    );

    let verifyResponse;
    try {
      verifyResponse = await fetch(new URL("/api/auth/verify-email", baseUrl), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          code: sendData.autoFillCode,
        }),
      });
    } catch (error) {
      throw new Error(`/api/auth/verify-email local happy path fetch failed: ${error instanceof Error ? error.message : String(error)}`);
    }
    assert(verifyResponse.ok, `/api/auth/verify-email local happy path returned ${verifyResponse.status}`);
    const verifyData = await verifyResponse.json();
    assert(verifyData.ok === true, "/api/auth/verify-email local happy path did not return ok");
    assert(verifyData.user?.email === email, "/api/auth/verify-email local happy path returned wrong user");
    return "/api/auth local email happy path ok";
  }

  const body = { ...(item.body ?? {}) };
  if (item.useCaptchaToken) {
    let captchaResponse;
    try {
      captchaResponse = await fetch(new URL("/api/auth/captcha", baseUrl), { cache: "no-store" });
    } catch (error) {
      throw new Error(`/api/auth/captcha for ${item.name} fetch failed: ${error instanceof Error ? error.message : String(error)}`);
    }
    assert(captchaResponse.ok, `/api/auth/captcha for ${item.name} returned ${captchaResponse.status}`);
    const captcha = await captchaResponse.json();
    body.captchaToken = captcha.token;
  }

  const path = item.path ?? "/api/auth/email-code";
  let response;
  try {
    response = await fetch(new URL(path, baseUrl), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
  } catch (error) {
    throw new Error(`${path} ${item.name} fetch failed: ${error instanceof Error ? error.message : String(error)}`);
  }
  assert(
    response.status === item.expectedStatus,
    `${path} ${item.name} returned ${response.status}, expected ${item.expectedStatus}`,
  );
  const data = await response.json();
  if (item.errorIncludes) {
    assert(
      String(data.error ?? "").includes(item.errorIncludes),
      `${path} ${item.name} error missing ${item.errorIncludes}: ${data.error}`,
    );
  }
  return `${path} ${item.name} ok`;
}

async function checkRedirect(item) {
  let response;
  try {
    response = await fetch(new URL(item.path, baseUrl));
  } catch (error) {
    throw new Error(`${item.path} redirect fetch failed: ${error instanceof Error ? error.message : String(error)}`);
  }
  assert(response.ok, `${item.path} returned ${response.status}`);

  const finalUrl = new URL(response.url);
  assert(
    finalUrl.pathname === item.expectedPath,
    `${item.path} ended at ${finalUrl.pathname}, expected ${item.expectedPath}`,
  );

  if (item.expectedSearchParams) {
    for (const [key, value] of Object.entries(item.expectedSearchParams)) {
      assert(
        finalUrl.searchParams.get(key) === value,
        `${item.path} expected ${key}=${value}, got ${finalUrl.searchParams.get(key) ?? ""}`,
      );
    }
  }

  return `${item.path} -> ${item.expectedPath} ok`;
}

async function checkNotFound(item) {
  let response;
  try {
    response = await fetch(new URL(item.path, baseUrl), { redirect: "follow" });
  } catch (error) {
    throw new Error(`${item.path} 404 fetch failed: ${error instanceof Error ? error.message : String(error)}`);
  }

  assert(response.status === 404, `${item.path} returned ${response.status}, expected 404`);
  const html = await response.text();
  for (const snippet of item.includes) {
    assert(html.includes(snippet), `${item.path} 404 page is missing ${snippet}`);
  }

  return `${item.path} 404 ok`;
}

async function checkSourceInvariants() {
  const startIntentStore = await readFile("lib/server/start-intent-store.ts", "utf8");
  const dashboardPage = await readFile("app/dashboard/page.tsx", "utf8");
  const dashboardStartPanel = await readFile("components/dashboard-start-panel.tsx", "utf8");
  const standaloneDecisionRecords = await readFile(
    "components/standalone-decision-records.tsx",
    "utf8",
  );
  const cityBenchmarkSnapshot = JSON.parse(await readFile("lib/data/city-benchmarks.json", "utf8"));
  const cityLedger = await readFile("lib/city-ledger.ts", "utf8");
  const areaFit = await readFile("lib/area-fit.ts", "utf8");
  const heroSection = await readFile("components/hero-section.tsx", "utf8");
  const cityLedgerResult = await readFile("components/city-ledger-result.tsx", "utf8");
  const topNav = await readFile("components/top-nav.tsx", "utf8");
  const appLayout = await readFile("app/layout.tsx", "utf8");
  const inputComponent = await readFile("components/ui/input.tsx", "utf8");
  const textareaComponent = await readFile("components/ui/textarea.tsx", "utf8");
  const cardComponent = await readFile("components/ui/card.tsx", "utf8");
  const pricingPlanCards = await readFile("components/pricing-plan-cards.tsx", "utf8");

  assert(
    !startIntentStore.includes('destination.includes("买房")'),
    "start intent store must not filter out buy-home decisions",
  );

  assert(
    Array.isArray(cityBenchmarkSnapshot.cities) &&
      cityBenchmarkSnapshot.cities.length >= 20 &&
      cityBenchmarkSnapshot.cities.every((city) => city.source?.asOf && city.source?.url),
    "city benchmark snapshot must cover at least 20 cities with source and asOf fields",
  );

  assert(
    cityLedger.includes("cityBenchmarkMap") &&
      cityLedger.includes("typicalRentFromBenchmark") &&
      cityLedger.includes("dataSources") &&
      !cityLedger.includes("const cityProfiles: Record<string, CityProfile> = {"),
    "city ledger must read city baselines from lib/data snapshot instead of hardcoded city profiles",
  );

  assert(
    areaFit.includes("cityBenchmarkMap") &&
      areaFit.includes("rentRangeFromBenchmark") &&
      !areaFit.includes("const seedAreas: Record<string, string[]> = {"),
    "area screen must read area seeds and rent ranges from lib/data snapshot",
  );

  assert(
    dashboardPage.includes('href: "/city?mode=buy"'),
    "dashboard empty guide must expose buy-home pressure as a core entry",
  );

  assert(
    heroSection.includes('useState<StartMode>("city")'),
    "home hero must default to city and offer comparison, not listing analysis",
  );

  assert(
    !heroSection.includes('{ label: "方案与额度", href: "/pricing" }'),
    "home hero primary navigation must stay focused on core decision tasks",
  );

  assert(
    dashboardStartPanel.includes('useState<StartMode>("city")'),
    "dashboard quick start must default to city and offer comparison, not listing analysis",
  );

  assert(
      dashboardStartPanel.includes('label: "生活成本"') &&
      dashboardStartPanel.includes('label: "房源体检"') &&
      dashboardStartPanel.includes('label: "买房大致判断"') &&
      !dashboardStartPanel.includes('label: "城市判断"') &&
      !dashboardStartPanel.includes('label: "房源评估"') &&
      !dashboardStartPanel.includes('label: "买房判断"'),
    "dashboard examples must use the same task names as the product navigation",
  );

  assert(
    standaloneDecisionRecords.includes("判断记录") &&
      standaloneDecisionRecords.includes("买房大致判断") &&
      !standaloneDecisionRecords.includes("单项记录"),
    "dashboard standalone records must use decision-record copy and expose buy-home continuation",
  );

  assert(
    cityLedgerResult.includes("下一步决策路径") &&
      cityLedgerResult.includes("暂停条件") &&
      cityLedgerResult.includes("买房大致判断"),
    "city result must include a decision path, stop condition, and buy-home next step",
  );

  assert(
    topNav.includes('<Link href="/dashboard">') && topNav.includes("开始判断"),
    "top navigation primary CTA must enter the decision workspace",
  );

  assert(
    appLayout.includes('width: "device-width"') && appLayout.includes("initialScale: 1"),
    "root layout must declare a mobile viewport",
  );

  assert(
    appLayout.includes("metadataBase") &&
      appLayout.includes("openGraph") &&
      appLayout.includes("/brand/zhunaar-icon.svg"),
    "root layout must define production metadata and favicon",
  );

  assert(
    pricingPlanCards.includes("暂未开放购买") &&
      !pricingPlanCards.includes("选择 Pro") &&
      !pricingPlanCards.includes("选择 Max"),
    "pricing must not expose purchase wording before payment is open",
  );

  assert(
    inputComponent.includes("min-w-0 max-w-full") &&
      textareaComponent.includes("min-w-0 max-w-full") &&
      cardComponent.includes("min-w-0 max-w-full"),
    "shared form and card primitives must be able to shrink on mobile",
  );

  return "source invariants ok";
}

async function main() {
  const devServer = await maybeStartDevServer();
  const results = [];

  try {
    await waitForServer();
    results.push(await checkSourceInvariants());
    results.push(await checkProtectedPageRequiresSignIn());

    for (const check of pageChecks) {
      results.push(await checkPage(check));
    }

    for (const check of startChecks) {
      results.push(await checkStartRoute(check));
    }

    for (const check of apiChecks) {
      results.push(await checkApi(check));
    }

    for (const check of authChecks) {
      results.push(await checkAuthApi(check));
    }

    for (const check of redirectChecks) {
      results.push(await checkRedirect(check));
    }

    for (const check of notFoundChecks) {
      results.push(await checkNotFound(check));
    }

    for (const result of results) {
      console.log(result);
    }
  } finally {
    await stopDevServer(devServer);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
