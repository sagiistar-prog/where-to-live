import { AppShell } from "@/components/app-shell";
import { DecisionPlanPanel, type ReportTarget } from "@/components/decision-plan-panel";
import { StartHandoffBanner } from "@/components/start-handoff-banner";
import { getCurrentOwnerId } from "@/lib/server/current-owner";
import { listReports } from "@/lib/server/report-store";

export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function PlanPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const focusReportId = firstParam(params?.reportId) ?? "";
  const from = firstParam(params?.from);
  const initialPrompt = firstParam(params?.prompt) || firstParam(params?.notes) || "";
  const initialStage = firstParam(params?.stage) || "";
  const initialSourceLabel =
    from === "home" ? "来自首页输入" : from === "dashboard" ? "来自工作台输入" : "";
  const ownerId = await getCurrentOwnerId();
  const reports = await listReports(ownerId);
  const focusReport = focusReportId
    ? reports.find((report) => report.id === focusReportId)
    : undefined;
  const initialReports: ReportTarget[] = reports.slice(0, 8).map((report) => ({
    id: report.id,
    generatedAt: report.generatedAt,
    inputSummary: report.inputSummary
      ? {
          rent: report.inputSummary.rent,
          address: report.inputSummary.address,
          city: report.inputSummary.city,
          workplace: report.inputSummary.workplace,
          budget: report.inputSummary.budget,
          commuteLimit: report.inputSummary.commuteLimit,
          source: report.inputSummary.source,
          preferences: report.inputSummary.preferences,
        }
      : undefined,
    summary: report.summary,
  }));

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-7xl min-w-0 space-y-8 overflow-x-hidden">
        <section className="max-w-3xl">
          <p className="text-sm font-medium text-primary/80">当前行动</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-normal sm:text-4xl">
            当前行动
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground">
            整理当前需要确认的事项，明确哪些可以继续推进，哪些需要暂停或补充信息。
          </p>
          {focusReport ? (
            <p className="mt-3 text-sm text-primary">正在承接：{focusReport.summary.title}</p>
          ) : null}
        </section>

        <StartHandoffBanner handoff={firstParam(params?.handoff)} />

        <DecisionPlanPanel
          initialReports={initialReports}
          initialReportId={focusReportId}
          initialPrompt={initialPrompt}
          initialStage={initialStage}
          initialSourceLabel={initialSourceLabel}
        />
      </div>
    </AppShell>
  );
}
