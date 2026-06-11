import Link from "next/link";
import {
  ArrowRight,
  BadgeDollarSign,
  BriefcaseBusiness,
  ClipboardCheck,
  FileCheck2,
  Gauge,
  GitCompareArrows,
  KeyRound,
  Landmark,
  LayoutDashboard,
  PackageCheck,
  ReceiptText,
  RefreshCw,
  Sparkles,
  Target,
  UsersRound,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { buildFlowHref, compactContext } from "@/lib/flow-links";

const demoPrompt =
  "深圳南山科技园一居室，月租 6200，地铁走路 11 分钟，中介催今晚先交 2000 定金锁房，合同明天补，收款是个人微信，担心噪音、晚归安全、转租授权和退租押金。";

const demoContext = compactContext([
  "演示场景：年轻租客刚看完深圳南山科技园一居室，被催今晚先付定金。",
  "痛点：时间紧、凭据不完整、合同未看到、收款主体不清、担心独居晚归和退租押金。",
  "演示顺序：从一句焦虑输入，进入付款前确认、房源评估、签约前确认、凭据材料和入住退租。",
]);

function startHref() {
  const params = new URLSearchParams({
    mode: "payment",
    prompt: demoPrompt,
  });
  return `/start?${params.toString()}`;
}

const primaryStops = [
  {
    title: "一句话进入付款前确认",
    description: "展示首页能接住“今晚先付定金、合同明天补、个人微信收款”的真实高压场景。",
    href: startHref(),
    cta: "从首页开始判断",
    icon: BadgeDollarSign,
  },
  {
    title: "先算城市成本",
    description: "把收入、房租、固定支出和通勤上限放到一张月度账本里，先判断深圳这座城能不能长期住下去。",
    href: buildFlowHref("/city", {
      from: "demo",
      city: "深圳",
      monthlyIncome: "18000",
      rentBudget: "6500",
      fixedCost: "3000",
      commuteLimit: "45",
      lifestyle: "地铁通勤，晚归要安全，周边买菜方便",
      reportContext: demoContext,
    }),
    cta: "看城市成本",
    icon: Landmark,
  },
  {
    title: "看完整房源评估报告",
    description: "展示产品不卖房源，只把通勤、生活配套、真实月成本、合同风险拆成可判断的材料。",
    href: "/report/demo",
    cta: "打开示例报告",
    icon: ReceiptText,
  },
  {
    title: "整理今日下一步",
    description: "展示用户在时间很紧时，今天只做什么、先别做什么、如何对外沟通。",
    href: buildFlowHref("/plan", {
      from: "demo",
      stage: "payment",
      prompt: demoPrompt,
      notes: demoContext,
      reportContext: demoContext,
    }),
    cta: "整理下一步",
    icon: ClipboardCheck,
  },
] satisfies Array<DemoStop>;

const lifecycleStops = [
  {
    title: "付款前确认",
    description: "先别急着付，确认定金、意向金、服务费、个人收款和退款条件是否说清楚。",
    href: buildFlowHref("/payment", {
      from: "home",
      city: "深圳",
      listingTitle: "南山科技园一居室",
      paymentType: "定金",
      amount: "2000",
      monthlyRent: "6200",
      stage: "看房后，未签合同",
      contractStatus: "合同明天补，当前未看到完整合同",
      authorizationStatus: "转租授权待确认",
      payeeType: "个人微信收款",
      payeeMatchesContract: "暂不清楚",
      refundRule: "只口头说不满意可以退",
      urgencyPressure: "中介催今晚先交定金锁房",
      notes: demoPrompt,
      reportContext: demoContext,
    }),
    cta: "看付款结论",
    icon: BadgeDollarSign,
  },
  {
    title: "合同确认",
    description: "展示前面发现的风险只作为核对重点，不能替代真实合同条款。",
    href: buildFlowHref("/contract", {
      from: "payment",
      city: "深圳",
      title: "南山科技园一居室",
      contractText: [
        "以下内容来自演示场景，不等同于完整合同。请粘贴真实合同条款后再确认：",
        demoContext,
        "重点确认：转租授权、押金返还、维修责任、收款主体、提前退租。",
      ].join("\n"),
      reportContext: demoContext,
    }),
    cta: "看合同边界",
    icon: FileCheck2,
  },
  {
    title: "凭据材料",
    description: "把授权、收款、押金、看房问题和付款备注整理成凭据清单。",
    href: buildFlowHref("/evidence", {
      from: "payment",
      city: "深圳",
      title: "南山科技园一居室",
      stage: "签约前",
      paymentType: "定金",
      amount: "2000",
      monthlyRent: "6200",
      risks: "合同未看、转租授权待确认、个人微信收款、口头退款承诺。",
      reportContext: demoContext,
    }),
    cta: "看材料清单",
    icon: BriefcaseBusiness,
  },
  {
    title: "入住预算",
    description: "一起计算押一付三、中介费、搬家和发薪前现金缓冲。",
    href: buildFlowHref("/move", {
      from: "demo",
      city: "深圳",
      title: "南山科技园一居室",
      monthlyRent: "6200",
      upfrontCost: "26800",
      risks: "首笔支出可能打穿现金安全垫，付款前需要谈周期和收据。",
      reportContext: demoContext,
    }),
    cta: "看预算",
    icon: Gauge,
  },
  {
    title: "交割确认",
    description: "拿钥匙当天固定表读数、旧损坏、家具家电和历史欠费凭据。",
    href: buildFlowHref("/handover", {
      from: "demo",
      city: "深圳",
      listingTitle: "南山科技园一居室",
      monthlyRent: "6200",
      depositAmount: "6200",
      concerns: "中介催确认无争议，但旧损坏和水电表还没拍清。",
      reportContext: demoContext,
    }),
    cta: "看交割包",
    icon: PackageCheck,
  },
  {
    title: "维修责任",
    description: "入住后漏水、发霉、家电故障先报修并保存凭据，再判断能否垫付。",
    href: buildFlowHref("/repair", {
      from: "demo",
      city: "深圳",
      listingTitle: "南山科技园一居室",
      monthlyRent: "6200",
      issueType: "卫生间漏水",
      damageScope: "影响卫生间和相邻墙面",
      repairCost: "1500",
      evidenceLevel: "已有部分凭据",
      landlordResponse: "要求租客先垫付维修费",
      depositConcern: "担心退租时被反扣押金",
      reportContext: demoContext,
    }),
    cta: "看维修办法",
    icon: Wrench,
  },
  {
    title: "续租涨租",
    description: "算续租上限、搬家回本月数和谈判话术。",
    href: buildFlowHref("/renewal", {
      from: "demo",
      city: "深圳",
      listingTitle: "南山科技园一居室",
      currentRent: "6200",
      proposedRent: "7200",
      marketRent: "6600",
      depositRisk: "押金沿用和维修承诺未写清",
      reportContext: demoContext,
    }),
    cta: "看续租判断",
    icon: RefreshCw,
  },
  {
    title: "押金退还",
    description: "退租前拆扣款、返还截止日、待补充凭据和催退文本。",
    href: buildFlowHref("/deposit", {
      from: "demo",
      city: "深圳",
      title: "南山科技园一居室",
      monthlyRent: "6200",
      depositAmount: "6200",
      damageClaim: "1800",
      evidenceLevel: "已有部分凭据",
      landlordReason: "房东口头说墙面和保洁要扣 1800，但未提供明细。",
      reportContext: demoContext,
    }),
    cta: "看押金办法",
    icon: KeyRound,
  },
] satisfies Array<DemoStop>;

const proofStops = [
  {
    title: "工作台",
    description: "回看今日事项、最紧急房源和成本风险账本。",
    href: "/dashboard",
    cta: "打开工作台",
    icon: Gauge,
  },
  {
    title: "房源记录",
    description: "查看同一套房的待补充凭据、付款/签约确认和已保存记录。",
    href: "/case",
    cta: "打开记录",
    icon: BriefcaseBusiness,
  },
  {
    title: "多房源对比",
    description: "看清首选、备选、暂不考虑的房源，以及不能越过的付款底线。",
    href: "/compare",
    cta: "打开对比",
    icon: GitCompareArrows,
  },
  {
    title: "买房压力",
    description: "租售犹豫时，看月供、首付后现金和坏情景安全垫。",
    href: buildFlowHref("/buy", {
      from: "demo",
      city: "深圳",
      householdIncome: "24000 元/月",
      cashSavings: "90 万",
      currentRent: "6200 元/月",
      fixedCost: "7000 元/月",
      targetTotalPrice: "420 万",
      safetyMonths: "12 个月",
      reportContext: demoContext,
    }),
    cta: "看买房压力",
    icon: Landmark,
  },
] satisfies Array<DemoStop>;

const valueSignals = [
  {
    label: "真实痛点",
    value: "时间紧、材料缺、被催付款",
    description: "用户最急的是判断现在能不能付、还需要哪些信息、下一步先做什么。",
    icon: BadgeDollarSign,
  },
  {
    label: "怎么使用",
    value: "从城市成本到入住退租",
    description: "把城市成本、片区通勤、房源评估、付款签约、入住交割和押金退还连成一份可持续查看的记录。",
    icon: ClipboardCheck,
  },
  {
    label: "长期价值",
    value: "减少损失、少走弯路、少反复计算",
    description: "帮助年轻人在高压选择里守住现金、时间、安全感和谈判位置。",
    icon: Gauge,
  },
] satisfies Array<DemoSignal>;

const positioningProofs = [
  {
    title: "城市生活决策",
    description: "用户已经有候选房源时，最需要的是判断这座城、这个片区、这套房是否值得继续投入时间和钱。",
    icon: Landmark,
  },
  {
    title: "持续记录同一套房",
    description: "同一套房会继续接到付款、合同、交割、维修、续租和押金退还，减少每次重新梳理的成本。",
    icon: LayoutDashboard,
  },
  {
    title: "每一步都能落地",
    description: "每一步都有具体页面、凭据、话术和保存记录，用户可以拿去问中介、房东或自己复盘。",
    icon: ClipboardCheck,
  },
] satisfies Array<DemoSignal>;

const audienceChecks = [
  {
    title: "使用者能立刻开始",
    description: "是否一眼知道该从哪里开始；能不能把一句急迫问题变成付款确认、待补充信息和可复制沟通文本。",
    icon: UsersRound,
  },
  {
    title: "关键场景连得上",
    description: "是否覆盖租前、签约前、入住后、续租和退租；每一步是否有清楚去处、记录和下一步。",
    icon: ClipboardCheck,
  },
  {
    title: "商业价值清楚",
    description: "是否切中高频高损失场景；是否能从一次报告延展为工作台、记录、对比和继续使用的理由。",
    icon: Target,
  },
  {
    title: "登录到报告能跑通",
    description: "是否能从 Google 登录、常用信息、工作台、评估报告一路走到后续确认。",
    icon: GitCompareArrows,
  },
] satisfies Array<DemoSignal>;

const reviewLenses = [
  {
    title: "租客最关心",
    question: "我现在到底能不能付钱、能不能签、下一步先做什么？",
    proof: "一句话输入后，直接进入付款确认、材料确认和今日事项。",
    icon: UsersRound,
  },
  {
    title: "租前租后一条线",
    question: "租前、签约、入住、续租、退租是否能连续跟进？",
    proof: "工作台、房源记录和每次判断都会继续保存同一套房的上下文。",
    icon: LayoutDashboard,
  },
  {
    title: "问题够不够真",
    question: "这个产品是否解决高频、高损失的真实问题？",
    proof: "每一步都回到现金流、通勤、凭据、付款和签约底线。",
    icon: Target,
  },
  {
    title: "为什么会复用",
    question: "用户为什么会反复回来？",
    proof: "城市成本、片区、候选房源、入住后事项和押金退还都会沉淀到记录。",
    icon: BriefcaseBusiness,
  },
] satisfies Array<DemoLens>;

const scriptStops = [
  {
    time: "0:00",
    title: "先讲真实压力",
    description: "用户被催今晚交钱，手里却没有合同、授权和清楚的退款规则。",
    href: startHref(),
    cta: "从一句话开始",
    icon: BadgeDollarSign,
  },
  {
    time: "0:40",
    title: "说明城市成本",
    description: "先一起计算深圳生活成本、房租预算和通勤上限，讲清城市生活决策定位。",
    href: primaryStops[1].href,
    cta: "看城市成本",
    icon: Landmark,
  },
  {
    time: "1:20",
    title: "进入付款判断",
    description: "让产品把个人收款、合同没看到、转租授权待确认这些风险，变成今天能照着确认的清单。",
    href: lifecycleStops[0].href,
    cta: "看付款结论",
    icon: ClipboardCheck,
  },
  {
    time: "2:20",
    title: "收回工作台",
    description: "最后回到工作台和房源记录，说明产品会持续保存居住选择上下文。",
    href: "/dashboard",
    cta: "打开工作台",
    icon: Gauge,
  },
] satisfies Array<DemoScriptStop>;

type DemoStop = {
  title: string;
  description: string;
  href: string;
  cta: string;
  icon: LucideIcon;
};

type DemoSignal = {
  label?: string;
  title?: string;
  value?: string;
  description: string;
  icon: LucideIcon;
};

type DemoScriptStop = DemoStop & {
  time: string;
};

type DemoLens = {
  title: string;
  question: string;
  proof: string;
  icon: LucideIcon;
};

export default function DemoPage() {
  return (
    <AppShell>
      <div className="mx-auto w-full max-w-7xl min-w-0 space-y-8 overflow-hidden">
        <section className="grid min-w-0 gap-6 lg:grid-cols-[0.62fr_0.38fr]">
          <div className="min-w-0">
            <p className="text-sm text-primary/80">
              完整演示
            </p>
            <h1 className="mt-3 max-w-full break-words text-3xl font-semibold tracking-normal sm:text-4xl">
              3 分钟看懂住哪儿
            </h1>
            <p className="mt-3 max-w-3xl break-words text-sm leading-7 text-muted-foreground">
              用同一个真实居住压力场景，从“今晚要不要先付钱”走到“这座城能不能长期住下去”。不用解释复杂页面，顺着用户最着急的事往下走，就能看清产品价值。
            </p>
          </div>
          <Card className="p-6">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-md bg-primary/15 text-primary">
              <Sparkles className="h-6 w-6" />
            </div>
            <h2 className="text-lg font-semibold">试用场景</h2>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">
              {demoPrompt}
            </p>
            <Button asChild className="mt-5 w-full">
              <Link href={startHref()}>
                从一句话开始
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </Card>
        </section>

        <section className="border-y border-border/70 bg-secondary/35 py-6 sm:py-7">
          <div className="mb-5 flex flex-col gap-3 px-1 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-medium text-primary/75">
                现场讲法
              </p>
              <h2 className="mt-2 text-xl font-semibold">3 分钟怎么讲</h2>
              <p className="mt-2 max-w-4xl text-sm leading-6 text-muted-foreground">
                先讲压力，再讲判断理由，最后收回到工作台。演示时不用解释每个页面，顺着用户当下最着急的事往下走就够了。
              </p>
            </div>
            <Button asChild variant="secondary" className="w-full shrink-0 sm:w-auto">
              <Link href={startHref()}>
                开始演示
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
          <div className="grid gap-3 px-1 md:grid-cols-2 xl:grid-cols-4">
            {scriptStops.map((item) => {
              const Icon = item.icon;

              return (
                <Link key={item.time} href={item.href} className="group min-w-0">
                  <div className="flex h-full min-h-[12rem] flex-col rounded-lg border border-border/80 bg-background/45 p-4 transition-colors group-hover:border-primary/35 group-hover:bg-primary/5">
                    <div className="mb-4 flex items-start justify-between gap-3">
                      <span className="rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                        {item.time}
                      </span>
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/15 text-primary">
                        <Icon className="h-4 w-4" />
                      </span>
                    </div>
                    <h3 className="font-semibold">{item.title}</h3>
                    <p className="mt-2 flex-1 text-sm leading-6 text-muted-foreground">
                      {item.description}
                    </p>
                    <p className="mt-4 flex items-center text-sm font-medium text-primary">
                      {item.cta}
                      <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          {valueSignals.map((signal) => (
            <SignalCard key={signal.label} signal={signal} />
          ))}
        </section>

        <section className="rounded-lg border border-border bg-card p-5 sm:p-6">
          <div className="mb-5">
            <p className="text-xs font-medium text-primary/75">
              产品边界
            </p>
            <h2 className="mt-2 text-xl font-semibold">先讲清产品定位</h2>
            <p className="mt-2 max-w-4xl text-sm leading-6 text-muted-foreground">
              住哪儿解决城市生活决策：收入、房租、通勤、付款、合同和押金一起判断。演示时先讲清定位，后面的页面才更容易理解。
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {positioningProofs.map((signal) => (
              <SignalCard key={signal.title} signal={signal} compact />
            ))}
          </div>
        </section>

        <section className="rounded-lg border border-border bg-card p-5 sm:p-6">
          <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-xl font-semibold">这条演示要讲清什么</h2>
              <p className="mt-2 max-w-4xl text-sm leading-6 text-muted-foreground">
                不要只点功能。先让对方看到真实痛点，再看产品如何把焦虑拆成可确认事项，最后说明为什么用户会继续回来。
              </p>
            </div>
            <Button asChild variant="secondary" className="w-full shrink-0 sm:w-auto">
              <Link href="/dashboard">
                打开工作台
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {audienceChecks.map((signal) => (
              <SignalCard key={signal.title} signal={signal} compact />
            ))}
          </div>
        </section>

        <section className="rounded-lg border border-border bg-card p-5 sm:p-6">
          <div className="mb-5">
            <p className="text-xs font-medium text-primary/75">
              讲给不同听众时
            </p>
            <h2 className="mt-2 text-xl font-semibold">让不同听众都能看懂价值</h2>
            <p className="mt-2 max-w-4xl text-sm leading-6 text-muted-foreground">
              同一条演示，不同对象会关注不同问题。这里把要回答的问题提前列出来，方便现场讲解时不跑偏。
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {reviewLenses.map((lens) => (
              <LensCard key={lens.title} lens={lens} />
            ))}
          </div>
        </section>

        <DemoSection
          title="建议现场先走这 4 步"
          description="先让对方看见：产品会把高压选择拆成今天能确认的事项。"
          items={primaryStops}
          columns="md:grid-cols-2 xl:grid-cols-4"
        />

        <DemoSection
          title="从付款到退租"
          description="需要评估产品深度时，从付款、合同、凭据一路走到交割、维修、续租和押金。"
          items={lifecycleStops}
          columns="md:grid-cols-2 xl:grid-cols-4"
        />

        <DemoSection
          title="最后看它为什么会被反复打开"
          description="最后展示工作台、记录、对比和买房压力，说明产品会持续保存上下文。"
          items={proofStops}
          columns="md:grid-cols-2 xl:grid-cols-4"
        />
      </div>
    </AppShell>
  );
}

function LensCard({ lens }: { lens: DemoLens }) {
  const Icon = lens.icon;

  return (
    <Card className="flex h-full flex-col p-4 transition-colors hover:border-primary/35 hover:bg-primary/5">
      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-md bg-primary/15 text-primary">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="font-semibold">{lens.title}</h3>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">{lens.question}</p>
      <div className="mt-4 rounded-md border border-border bg-secondary/45 p-3 text-xs leading-5 text-muted-foreground">
        {lens.proof}
      </div>
    </Card>
  );
}

function SignalCard({
  signal,
  compact = false,
}: {
  signal: DemoSignal;
  compact?: boolean;
}) {
  const Icon = signal.icon;

  return (
    <Card className={`${compact ? "p-4" : "p-5"} transition-colors hover:border-primary/35 hover:bg-primary/5`}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/15 text-primary">
          <Icon className="h-5 w-5" />
        </span>
        {signal.label ? (
          <span className="rounded-full border border-border bg-secondary px-2.5 py-1 text-xs text-muted-foreground">
            {signal.label}
          </span>
        ) : null}
      </div>
      <h3 className="font-semibold">{signal.value ?? signal.title}</h3>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{signal.description}</p>
    </Card>
  );
}

function DemoSection({
  title,
  description,
  items,
  columns,
}: {
  title: string;
  description: string;
  items: DemoStop[];
  columns: string;
}) {
  return (
    <section>
      <div className="mb-4">
        <h2 className="text-xl font-semibold">{title}</h2>
        <p className="mt-2 max-w-4xl text-sm leading-6 text-muted-foreground">
          {description}
        </p>
      </div>
      <div className={`grid gap-4 ${columns}`}>
        {items.map((item) => {
          const Icon = item.icon;

          return (
            <Link key={item.title} href={item.href} className="group min-w-0">
              <Card className="flex h-full min-h-[13rem] flex-col p-5 transition-colors group-hover:border-primary/35 group-hover:bg-card">
                <div className="mb-4 flex items-start justify-between gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/15 text-primary">
                    <Icon className="h-5 w-5" />
                  </span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" />
                </div>
                <h3 className="font-semibold">{item.title}</h3>
                <p className="mt-2 flex-1 text-sm leading-6 text-muted-foreground">
                  {item.description}
                </p>
                <p className="mt-4 text-sm font-medium text-primary">{item.cta}</p>
              </Card>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

