import { NextResponse } from "next/server";
import { clearCaseEvents } from "@/lib/server/case-event-store";
import { getCurrentOwnerId } from "@/lib/server/current-owner";
import { clearReports } from "@/lib/server/report-store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST() {
  const ownerId = await getCurrentOwnerId();
  await Promise.all([clearReports(ownerId), clearCaseEvents(ownerId)]);

  return NextResponse.json({
    ok: true,
    cleared: ["reports", "caseEvents"],
    browserSideClearedByClient: [
      "userPreferences",
      "appSettings",
      "onboardingState",
      "latestSessionReport",
    ],
    preserved: [
      ".env.local",
      "OPENAI_API_KEY",
      "AMAP_WEB_SERVICE_KEY",
      "QWEATHER_API_KEY",
    ],
    clearedAt: new Date().toISOString(),
  });
}
