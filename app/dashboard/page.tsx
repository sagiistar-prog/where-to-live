import Link from "next/link";
import { BadgeDollarSign, Building2, Home, MapPinned } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { CaseTriageQueue } from "@/components/case-triage-queue";
import { DashboardStartPanel } from "@/components/dashboard-start-panel";
import { RecentStartIntents } from "@/components/recent-start-intents";
import { RecentReports } from "@/components/recent-reports";
import { StandaloneDecisionRecords } from "@/components/standalone-decision-records";
import { buildDecisionCases } from "@/lib/decision-case";
import { getCurrentOwnerId } from "@/lib/server/current-owner";
import { listReports } from "@/lib/server/report-store";
import { listCaseEvents } from "@/lib/server/case-event-store";
import { listStartIntents } from "@/lib/server/start-intent-store";
import type { StartIntent } from "@/lib/start-intents";

export const dynamic = "force-dynamic";

function normalizeDashboardText(value: string) {
  return value
    .replaceAll("下一步" + "行动计划", "当前行动")
    .replaceAll("下一步" + "计划", "当前行动")
    .replaceAll("城市成本测算", "生活成本")
    .replaceAll("生活成本测算", "生活成本")
    .replaceAll("城市成本", "生活成本");
}

function normalizeStartIntentForDashboard(intent: StartIntent): StartIntent {
  return {
    ...intent,
    source: normalizeDashboardText(intent.source),
    selectedDestination: intent.selectedDestination
      ? normalizeDashboardText(intent.selectedDestination)
      : undefined,
    destination: normalizeDashboardText(intent.destination),
    routeReason: normalizeDashboardText(intent.routeReason),
    prompt: normalizeDashboardText(intent.prompt),
    fields: intent.fields.map((field) => ({
      label: normalizeDashboardText(field.label),
      value: normalizeDashboardText(field.value),
    })),
    guardrail: normalizeDashboardText(intent.guardrail),
  };
}

export default async function DashboardPage() {
  const ownerId = await getCurrentOwnerId();
  const [reports, caseEvents, rawStartIntents] = await Promise.all([
    listReports(ownerId),
    listCaseEvents(ownerId),
    listStartIntents(ownerId),
  ]);
  const startIntents = rawStartIntents.map(normalizeStartIntentForDashboard);
  const decisionCases = buildDecisionCases(reports, caseEvents);
  const hasAnyWorkspaceRecord =
    startIntents.length > 0 || decisionCases.length > 0 || caseEvents.length > 0 || reports.length > 0;

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-7xl min-w-0 space-y-8 overflow-hidden">
        <section className="min-w-0 border-b border-border pb-6">
          <div className="min-w-0">
            <p className="text-sm text-primary">
              工作台
            </p>
            <h1 className="mt-3 max-w-full break-words text-3xl font-semibold leading-tight tracking-normal sm:text-4xl">
              居住判断工作台
            </h1>
            <p className="mt-3 max-w-3xl break-words text-sm leading-7 text-muted-foreground">
              汇总最近启动的判断、已保存的房源记录和付款签约前需要继续确认的事项。
            </p>
          </div>
        </section>

        <DashboardStartPanel />

        {!hasAnyWorkspaceRecord ? <DashboardEmptyGuide /> : null}

        <RecentStartIntents intents={startIntents} />

        <CaseTriageQueue cases={decisionCases} />

        <StandaloneDecisionRecords events={caseEvents} reports={reports} />

        {reports.length ? (
          <section>
            <div className="mb-5">
              <h2 className="text-xl font-semibold">最近评估过的房源</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                按风险结论和综合评分回看。
              </p>
            </div>

            <RecentReports />
          </section>
        ) : null}
      </div>
    </AppShell>
  );
}

function DashboardEmptyGuide() {
  const entries = [
    {
      title: "先比城市",
      description: "有 offer 或准备换城市时，先确认收入、租金、通勤和储蓄空间。",
      href: "/city",
      icon: MapPinned,
    },
    {
      title: "房源体检",
      description: "已经看到房源时，把月租、位置、工作地和顾虑放在同一次判断里。",
      href: "/analyze",
      icon: Building2,
    },
    {
      title: "判断买房压力",
      description: "准备买房或比较城市时，先确认首付、月供和长期现金流是否可承受。",
      href: "/city?mode=buy",
      icon: Home,
    },
    {
      title: "确认付款风险",
      description: "合同、收款主体或退款条件没清楚前，先判断是否适合付款。",
      href: "/payment",
      icon: BadgeDollarSign,
    },
  ];

  return (
    <section className="rounded-lg border border-border bg-card p-5 shadow-[0_18px_54px_oklch(var(--foreground)/0.05)]">
      <div className="flex flex-col gap-2">
        <p className="text-sm text-primary">开始使用</p>
        <h2 className="text-2xl font-semibold tracking-normal">从一次真实判断开始</h2>
        <p className="max-w-3xl text-sm leading-7 text-muted-foreground">
          这里会保存最近启动的判断和需要继续确认的事项。第一次使用时，选择最接近当前问题的入口即可。
        </p>
      </div>
      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {entries.map((entry) => {
          const Icon = entry.icon;
          return (
            <Link
              key={entry.title}
              href={entry.href}
              className="group rounded-md border border-border bg-secondary/55 p-4 transition-colors hover:border-primary/35 hover:bg-primary/10"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/15 text-primary">
                <Icon className="h-5 w-5" />
              </span>
              <h3 className="mt-4 text-base font-semibold">{entry.title}</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{entry.description}</p>
              <span className="mt-4 inline-flex text-sm font-medium text-primary underline-offset-4 group-hover:underline">
                开始
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
