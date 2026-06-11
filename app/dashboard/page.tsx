import Link from "next/link";
import {
  ArrowRight,
  BadgeDollarSign,
  BriefcaseBusiness,
  CheckCircle2,
  Compass,
  Crown,
  Gauge,
  ListChecks,
  ReceiptText,
  ShieldAlert,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { CaseTriageQueue } from "@/components/case-triage-queue";
import { DashboardDecisionStarter } from "@/components/dashboard-decision-starter";
import { DashboardDecisionSnapshot } from "@/components/dashboard-decision-snapshot";
import { DashboardValueProof } from "@/components/dashboard-value-proof";
import { DashboardJourneyOverview } from "@/components/dashboard-journey-overview";
import { OnboardingPrompt } from "@/components/onboarding-prompt";
import { RecentReports } from "@/components/recent-reports";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { buildDecisionCases } from "@/lib/decision-case";
import { getCurrentOwnerId } from "@/lib/server/current-owner";
import { listReports } from "@/lib/server/report-store";
import { listCaseEvents } from "@/lib/server/case-event-store";

export const dynamic = "force-dynamic";

const monthlyFreeAnalysisLimit = 5;

type DashboardDecisionCase = ReturnType<typeof buildDecisionCases>[number];

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function casePriorityRank(item: DashboardDecisionCase) {
  if (item.nextBestAction.priority === "blocker") return 0;
  if (item.nextBestAction.priority === "required") return 1;
  return 2;
}

function caseGateRank(item: DashboardDecisionCase) {
  if (item.preSignGate.level === "stop") return 0;
  if (item.preSignGate.level === "review") return 1;
  return 2;
}

function pickDashboardFocusCase(cases: DashboardDecisionCase[]) {
  return [...cases].sort((a, b) => {
    const priorityDiff = casePriorityRank(a) - casePriorityRank(b);
    if (priorityDiff !== 0) return priorityDiff;
    const gateDiff = caseGateRank(a) - caseGateRank(b);
    if (gateDiff !== 0) return gateDiff;
    return b.lifecycleGate.blockedCount - a.lifecycleGate.blockedCount;
  })[0];
}

const livingJourneySteps = [
  {
    step: "01",
    title: "城市与片区",
    description: "先判断这座城市值不值得去，再按通勤、预算和生活配套筛片区。",
    primaryHref: "/city",
    primaryLabel: "开始城市成本",
    icon: Compass,
    links: [
      { href: "/area", label: "片区与通勤" },
      { href: "/life", label: "生活配套" },
      { href: "/buy", label: "长期预算" },
    ],
  },
  {
    step: "02",
    title: "候选房源",
    description: "把截图、租金、通勤、舒适度和需要补充的材料放在一起看。",
    primaryHref: "/analyze",
    primaryLabel: "评估房源",
    icon: Sparkles,
    links: [
      { href: "/compare", label: "多房源对比" },
      { href: "/case", label: "房源记录" },
    ],
  },
  {
    step: "03",
    title: "付款签约与入住",
    description: "付款、合同、凭据、交割、维修、续租和押金放在同一条线里确认。",
    primaryHref: "/payment",
    primaryLabel: "付款前确认",
    icon: BadgeDollarSign,
    links: [
      { href: "/visit", label: "看房与安全" },
      { href: "/evidence", label: "材料与合同" },
      { href: "/move", label: "入住退租" },
      { href: "/repair", label: "维修责任" },
      { href: "/deposit", label: "押金退还" },
    ],
  },
];

function isCurrentMonth(value: string) {
  const date = new Date(value);
  const now = new Date();
  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
}

function nextMonthResetLabel() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, 1).toLocaleDateString("zh-CN", {
    month: "long",
    day: "numeric",
  });
}

function DashboardHeroSummary({
  reportCount,
  savedEventCount,
  focusCase,
  blockedPaymentCount,
  needsMoreInfoCount,
  urgentLifecycleCount,
}: {
  reportCount: number;
  savedEventCount: number;
  focusCase?: DashboardDecisionCase;
  blockedPaymentCount: number;
  needsMoreInfoCount: number;
  urgentLifecycleCount: number;
}) {
  const nextHref = focusCase?.nextBestAction.href ?? (reportCount ? "/case" : "/onboarding");
  const nextLabel = focusCase?.nextBestAction.label ?? (reportCount ? "查看房源记录" : "保存常用信息");
  const nextReason =
    focusCase?.nextBestAction.reason ??
    (reportCount
      ? "已有评估报告，可以继续把付款、合同和凭据材料接到同一份记录里。"
      : "先保存城市、工作地、预算和通勤上限，后续判断不用每次重新填写。");
  const paymentLine =
    focusCase?.nextBestAction.stopRule ??
    "付款前先确认出租权、收款主体、退款条件、合同版本和收据材料。";

  return (
    <aside className="rounded-lg border border-border bg-background/48 p-4 shadow-[0_18px_54px_oklch(var(--foreground)/0.06)]">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm text-primary">判断摘要</p>
          <h2 className="mt-1 text-lg font-semibold">现在先看这一件事</h2>
        </div>
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/15 text-primary">
          <ListChecks className="h-5 w-5" />
        </span>
      </div>

      <div className="rounded-md border border-primary/20 bg-primary/10 p-3">
        <p className="line-clamp-1 text-sm font-semibold">
          {focusCase?.title ?? (reportCount ? "继续整理候选房源" : "先建立你的城市判断基础")}
        </p>
        <p className="mt-2 line-clamp-3 text-xs leading-5 text-muted-foreground">
          {nextReason}
        </p>
        <Button asChild className="mt-3 w-full" size="sm">
          <Link href={nextHref}>
            {nextLabel}
            <ArrowRight className="ml-2 h-3.5 w-3.5" />
          </Link>
        </Button>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <HeroSummaryMetric icon={BriefcaseBusiness} label="候选记录" value={`${reportCount} 份`} />
        <HeroSummaryMetric icon={ShieldAlert} label="先别付款" value={`${blockedPaymentCount} 套`} />
        <HeroSummaryMetric icon={ReceiptText} label="已保存判断" value={`${savedEventCount} 次`} />
        <HeroSummaryMetric
          icon={Gauge}
          label="信息要补充"
          value={`${needsMoreInfoCount} 套`}
        />
      </div>

      <div className="mt-3 rounded-md border border-border bg-secondary/55 p-3">
        <div className="mb-2 flex items-center gap-2">
          <BadgeDollarSign className="h-4 w-4 text-primary" />
          <p className="text-xs font-semibold text-foreground">付款底线</p>
        </div>
        <p className="text-xs leading-5 text-muted-foreground">{paymentLine}</p>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3 rounded-md border border-border bg-secondary/55 px-3 py-2 text-xs text-muted-foreground">
        <span>入住后要确认</span>
        <span className="font-semibold text-foreground">{urgentLifecycleCount} 项</span>
      </div>
    </aside>
  );
}

function HeroSummaryMetric({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-md border border-border bg-secondary/55 p-3">
      <div className="mb-2 flex items-center gap-2 text-muted-foreground">
        <Icon className="h-3.5 w-3.5 text-primary" />
        <p className="text-[11px]">{label}</p>
      </div>
      <p className="text-lg font-semibold">{value}</p>
    </div>
  );
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = (await searchParams) ?? {};
  const fromOnboarding = firstParam(params.from) === "onboarding";
  const ownerId = await getCurrentOwnerId();
  const [reports, caseEvents] = await Promise.all([
    listReports(ownerId),
    listCaseEvents(ownerId),
  ]);
  const decisionCases = buildDecisionCases(reports, caseEvents);
  const monthlyReportCount = reports.filter((report) => isCurrentMonth(report.generatedAt)).length;
  const freeAnalysisUsed = Math.min(monthlyReportCount, monthlyFreeAnalysisLimit);
  const freeAnalysisRemaining = Math.max(monthlyFreeAnalysisLimit - monthlyReportCount, 0);
  const freeAnalysisProgress = Math.min(
    100,
    Math.round((monthlyReportCount / monthlyFreeAnalysisLimit) * 100),
  );
  const overFreeLimitCount = Math.max(monthlyReportCount - monthlyFreeAnalysisLimit, 0);
  const resetLabel = nextMonthResetLabel();
  const heroTertiary = decisionCases.length
    ? {
        href: "/case",
        label: "继续房源记录",
        icon: BriefcaseBusiness,
      }
    : {
        href: "/demo",
        label: "看完整演示",
        icon: Crown,
      };
  const HeroTertiaryIcon = heroTertiary.icon;
  const focusCase = pickDashboardFocusCase(decisionCases);
  const blockedPaymentCount = decisionCases.filter((item) => !item.preSignGate.canPay).length;
  const needsMoreInfoCount = decisionCases.filter(
    (item) => item.dataConfidence.level === "limited" || item.dataConfidence.level === "review",
  ).length;
  const urgentLifecycleCount = decisionCases.reduce(
    (total, item) => total + item.lifecycleGate.blockedCount,
    0,
  );

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-7xl min-w-0 space-y-8 overflow-hidden">
        <section className="grid min-w-0 gap-6 rounded-lg border border-border bg-card/72 p-6 shadow-[0_20px_64px_oklch(var(--foreground)/0.07)] lg:grid-cols-[minmax(0,1fr)_390px] lg:items-stretch">
          <div className="flex min-w-0 flex-col gap-5">
            <div className="min-w-0">
              <p className="text-sm text-primary">
                今日工作台
              </p>
              <h1 className="mt-3 max-w-full break-words text-3xl font-semibold leading-tight tracking-normal sm:text-5xl">
                <span className="block sm:inline">今天先判断什么</span>
                <span className="block sm:inline">把居住选择做清楚</span>
              </h1>
              <p className="mt-3 max-w-3xl break-words text-sm leading-7 text-muted-foreground">
                把城市、片区、生活成本、房源、合同和押金放在同一个工作台里，形成可比较、可保存、能回头确认的判断理由。
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Button asChild size="lg">
                <Link href="/city">
                  <Compass className="mr-2 h-5 w-5" />
                  从城市成本开始
                </Link>
              </Button>
              <Button asChild size="lg" variant="secondary">
                <Link href="/analyze">
                  <Sparkles className="mr-2 h-5 w-5" />
                  直接评估房源
                </Link>
              </Button>
              <Button asChild size="lg" variant="secondary">
                <Link href={heroTertiary.href}>
                  <HeroTertiaryIcon className="mr-2 h-5 w-5" />
                  {heroTertiary.label}
                </Link>
              </Button>
            </div>
            <form
              action="/start"
              method="get"
              className="max-w-3xl rounded-lg border border-border bg-background/62 p-3 shadow-[0_16px_48px_oklch(var(--foreground)/0.055)]"
            >
              <input type="hidden" name="from" value="dashboard" />
              <input type="hidden" name="mode" value="plan" />
              <div className="mb-2 flex items-center gap-2 text-sm font-medium text-primary">
                <Sparkles className="h-4 w-4" />
                一句话开始
              </div>
              <label htmlFor="dashboard-hero-prompt" className="sr-only">
                写下当前居住选择问题
              </label>
              <textarea
                id="dashboard-hero-prompt"
                name="prompt"
                placeholder="例如：税后 18000，徐家汇上班，租金 6500 内，纠结深圳和上海；或者中介催今晚交定金，想先确认哪些钱不能转。"
                className="min-h-[92px] w-full resize-none rounded-md border border-border bg-[oklch(0.976_0.006_92)] px-3 py-2 text-sm leading-6 text-foreground outline-none transition placeholder:text-muted-foreground focus:border-primary/55 focus:ring-2 focus:ring-primary/20"
              />
              <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs leading-5 text-muted-foreground">
                  会根据城市、片区、房源、付款或合同问题，带你进入对应页面。
                </p>
                <Button type="submit" className="shrink-0" size="sm">
                  看下一步怎么做
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </form>
          </div>
          <DashboardHeroSummary
            reportCount={reports.length}
            savedEventCount={caseEvents.length}
            focusCase={focusCase}
            blockedPaymentCount={blockedPaymentCount}
            needsMoreInfoCount={needsMoreInfoCount}
            urgentLifecycleCount={urgentLifecycleCount}
          />
        </section>

        <DashboardDecisionStarter />

        {fromOnboarding ? (
          <section className="rounded-lg border border-primary/25 bg-primary/[0.08] p-5 shadow-[0_18px_54px_oklch(var(--foreground)/0.06)]">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex min-w-0 gap-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-primary/15 text-primary">
                  <CheckCircle2 className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <h2 className="text-lg font-semibold">常用信息已保存</h2>
                  <p className="mt-2 max-w-3xl text-sm leading-7 text-muted-foreground">
                    现在可以从城市成本、片区通勤或第一套候选房源开始。后续判断会沿用你的城市、预算和通勤上限。
                  </p>
                </div>
              </div>
              <div className="grid gap-2 sm:flex sm:flex-wrap">
                <Button asChild>
                  <Link href="/city">先算城市成本</Link>
                </Button>
                <Button asChild variant="secondary">
                  <Link href="/area">比较片区通勤</Link>
                </Button>
                <Button asChild variant="secondary">
                  <Link href="/analyze">评估候选房源</Link>
                </Button>
              </div>
            </div>
          </section>
        ) : null}

        <OnboardingPrompt />

        <DashboardJourneyOverview reports={reports} cases={decisionCases} caseEvents={caseEvents} />

        <DashboardDecisionSnapshot cases={decisionCases} />

        <CaseTriageQueue cases={decisionCases} />

        <section className="space-y-5">
          <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm text-primary">
                从城市到住处
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-normal">
                一条线做好居住判断
              </h2>
              <p className="mt-2 max-w-3xl text-sm leading-7 text-muted-foreground">
                先判断一座城市是否适合留下，再看片区、候选房源、付款签约和入住退租。不用在很多入口之间来回找，按当前问题继续就行。
              </p>
            </div>
            <Button asChild variant="secondary">
              <Link href="/demo">
                看完整演示
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>

          <div className="grid gap-3 lg:grid-cols-3">
            {livingJourneySteps.map((step) => {
              const Icon = step.icon;
              return (
                <article
                  key={step.step}
                  className="group flex h-full flex-col rounded-lg border border-border/80 bg-card/82 p-4 shadow-[0_14px_42px_oklch(var(--foreground)/0.05)] transition hover:-translate-y-0.5 hover:border-primary/35 hover:bg-card"
                >
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <span className="rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                      {step.step}
                    </span>
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-background text-primary">
                      <Icon className="h-4 w-4" />
                    </span>
                  </div>
                  <h3 className="text-base font-semibold leading-6">{step.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {step.description}
                  </p>

                  <Button asChild className="mt-5 w-full">
                    <Link href={step.primaryHref}>
                      {step.primaryLabel}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {step.links.map((link) => (
                      <Link
                        key={link.href}
                        href={link.href}
                        className="rounded-full border border-border/80 px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:border-primary/45 hover:text-foreground"
                      >
                        {link.label}
                      </Link>
                    ))}
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <DashboardValueProof reports={reports} caseEvents={caseEvents} />

        <section className="grid gap-4 lg:grid-cols-[0.72fr_0.28fr]">
          <Card className="p-6">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold">最近评估过的房源</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  按风险结论和综合评分快速回看。
                </p>
              </div>
              <div className="flex gap-2">
                <Button asChild variant="ghost">
                  <Link href="/compare">
                    去对比
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild variant="ghost">
                  <Link href="/case">
                    去记录
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>

            <RecentReports />
          </Card>

          <Card className="p-6">
            <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-md bg-primary/15 text-primary">
              <Gauge className="h-6 w-6" />
            </div>
            <h2 className="text-xl font-semibold">本月免费评估次数</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              按本月已保存报告计算，方便知道这个月还能评估几次。
            </p>
            <div className="my-6">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm text-muted-foreground">本月已用</span>
                <span className="text-sm font-medium">
                  {freeAnalysisUsed} / {monthlyFreeAnalysisLimit}
                  {overFreeLimitCount ? ` +${overFreeLimitCount}` : ""}
                </span>
              </div>
              <Progress value={freeAnalysisProgress} />
            </div>
            <div className="mb-4 grid grid-cols-2 gap-2">
              <div className="rounded-md border border-border bg-secondary/55 p-3">
                <p className="text-xs text-muted-foreground">还可评估</p>
                <p className="mt-1 text-lg font-semibold">{freeAnalysisRemaining} 次</p>
              </div>
              <div className="rounded-md border border-border bg-secondary/55 p-3">
                <p className="text-xs text-muted-foreground">下次重置</p>
                <p className="mt-1 text-lg font-semibold">{resetLabel}</p>
              </div>
            </div>
            <div className="rounded-md border border-primary/20 bg-primary/10 p-4 text-sm leading-6 text-foreground">
              <Crown className="mb-2 h-5 w-5" />
              稳定保存城市成本、房源记录和签约前确认，减少押金纠纷、错误通勤和不合适的长期租约。
            </div>
          </Card>
        </section>
      </div>
    </AppShell>
  );
}
