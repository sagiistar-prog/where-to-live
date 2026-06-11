import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { ReportView } from "@/components/report-view";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
            编号：{payload.id}。住哪儿只保存报告内容，不保存上传截图原图。
          </p>
          <Button asChild variant="secondary" size="sm">
            <Link href="/dashboard">返回工作台</Link>
          </Button>
        </div>
      </Card>
    </AppShell>
  );
}
