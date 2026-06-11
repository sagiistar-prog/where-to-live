import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { LatestReportSessionFallback } from "@/components/latest-report-session-fallback";
import { ReportView } from "@/components/report-view";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
        label={payload.mode === "openai" ? "完整评估报告" : "快速评估报告"}
        generatedAt={payload.generatedAt}
        dataSources={payload.dataSources}
        dataQuality={payload.dataQuality}
        warnings={payload.warnings}
        analysisPreflight={payload.analysisPreflight}
        reportId={payload.id}
        decisionCase={decisionCase}
      />
      <Card className="mx-auto mt-6 max-w-7xl p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            这是最近一次保存的评估。编号：{payload.id}。
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button asChild variant="secondary" size="sm">
              <Link href={`/report/${payload.id}`}>打开固定链接</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/dashboard">返回工作台</Link>
            </Button>
          </div>
        </div>
      </Card>
    </AppShell>
  );
}
