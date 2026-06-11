import { NextResponse } from "next/server";
import { listCaseEvents } from "@/lib/server/case-event-store";
import { getCurrentOwnerId } from "@/lib/server/current-owner";
import { listReports } from "@/lib/server/report-store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const ownerId = await getCurrentOwnerId();
  const [reports, caseEvents] = await Promise.all([listReports(ownerId), listCaseEvents(ownerId)]);
  const exportedAt = new Date().toISOString();

  return new NextResponse(
    JSON.stringify(
      {
        product: "住哪儿 AI",
        archiveType: "server-decision-archive",
        schemaVersion: 2,
        exportedAt,
        included: [
          "serverReports",
          "serverCaseEvents",
        ],
        excluded: [
          "browserUserPreferences",
          "browserAppSettings",
          "browserOnboardingState",
          "browserLatestSessionReport",
          "environmentApiKeys",
          "privateAccounts",
        ],
        preservedByClear: [
          ".env.local",
          "OPENAI_API_KEY",
          "AMAP_WEB_SERVICE_KEY",
          "QWEATHER_API_KEY",
        ],
        counts: {
          reports: reports.length,
          caseEvents: caseEvents.length,
        },
        reports,
        caseEvents,
      },
      null,
      2,
    ),
    {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="zhunaar-decision-archive-${exportedAt.slice(0, 10)}.json"`,
      },
    },
  );
}
