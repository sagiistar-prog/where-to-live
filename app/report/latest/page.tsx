import { AppShell } from "@/components/app-shell";
import { LatestReportSessionFallback } from "@/components/latest-report-session-fallback";
import { ReportView } from "@/components/report-view";
import { buildDecisionCases } from "@/lib/decision-case";
import { listCaseEvents } from "@/lib/server/case-event-store";
import { getCurrentOwnerId } from "@/lib/server/current-owner";
import { listReports } from "@/lib/server/report-store";

export const dynamic = "force-dynamic";

export default async function LatestReportPage() {
  const ownerId = await getCurrentOwnerId();
  const [reports, caseEvents] = await Promise.all([listReports(ownerId), listCaseEvents(ownerId)]);
  const payload = reports[0];

  if (!payload) {
    return (
      <AppShell>
        <LatestReportSessionFallback />
      </AppShell>
    );
  }

  const decisionCase = buildDecisionCases([payload], caseEvents)[0];

  return (
    <AppShell>
      <ReportView
        report={payload.report}
        label={payload.mode === "openai" ? "完整体检报告" : "快速体检报告"}
        generatedAt={payload.generatedAt}
        dataSources={payload.dataSources}
        dataQuality={payload.dataQuality}
        warnings={payload.warnings}
        analysisPreflight={payload.analysisPreflight}
        reportId={payload.id}
        decisionCase={decisionCase}
      />
    </AppShell>
  );
}
