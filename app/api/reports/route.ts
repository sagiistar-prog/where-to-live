import { NextResponse } from "next/server";
import { getCurrentOwnerId } from "@/lib/server/current-owner";
import { listReports } from "@/lib/server/report-store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const ownerId = await getCurrentOwnerId();
  const reports = await listReports(ownerId);

  return NextResponse.json({
    reports: reports.map((report) => ({
      id: report.id,
      mode: report.mode,
      generatedAt: report.generatedAt,
      dataSources: report.dataSources,
      warnings: report.warnings,
      inputSummary: report.inputSummary,
      summary: report.summary,
    })),
  });
}
