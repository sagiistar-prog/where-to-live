import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { ReportView } from "@/components/report-view";
import { buildDecisionCases } from "@/lib/decision-case";
import { listCaseEvents } from "@/lib/server/case-event-store";
import { getCurrentOwnerId } from "@/lib/server/current-owner";
import { getStoredReport } from "@/lib/server/report-store";

export const dynamic = "force-dynamic";

export default async function StoredReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ownerId = await getCurrentOwnerId();
  const [payload, caseEvents] = await Promise.all([
    getStoredReport(id, ownerId),
    listCaseEvents(ownerId),
  ]);

  if (!payload) {
    notFound();
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
