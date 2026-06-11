import { AppShell } from "@/components/app-shell";
import { ReportView } from "@/components/report-view";
import { demoReport } from "@/lib/mock-data";

export default function DemoReportPage() {
  return (
    <AppShell>
      <ReportView report={demoReport} label="示例评估报告" />
    </AppShell>
  );
}
