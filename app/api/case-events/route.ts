import { NextResponse } from "next/server";
import { caseEventTypes, type CaseEventType } from "@/lib/case-events";
import { buildQuotaExceededPayload, getAccountQuota } from "@/lib/server/account-quota";
import { addCaseEvent, listCaseEvents } from "@/lib/server/case-event-store";
import { getCurrentOwnerId } from "@/lib/server/current-owner";
import type { ReportStatus } from "@/lib/mock-data";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const statuses: ReportStatus[] = ["recommend", "caution", "reject"];

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function asHighlights(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string").slice(0, 6)
    : [];
}

export async function GET() {
  const ownerId = await getCurrentOwnerId();
  const events = await listCaseEvents(ownerId);
  return NextResponse.json({ events });
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const reportId = asString(body?.reportId);
  const type = asString(body?.type) as CaseEventType;
  const status = asString(body?.status) as ReportStatus;
  const title = asString(body?.title);
  const summary = asString(body?.summary);

  if (!reportId || !caseEventTypes.includes(type) || !statuses.includes(status) || !title || !summary) {
    return NextResponse.json(
      {
        error: "INVALID_CASE_EVENT",
        message: "记录事件缺少 reportId、type、status、title 或 summary。",
      },
      { status: 400 },
    );
  }

  const ownerId = await getCurrentOwnerId();
  const quota = await getAccountQuota({ ownerId });
  if (quota.remaining <= 0) {
    return NextResponse.json(buildQuotaExceededPayload(quota), { status: 402 });
  }

  const event = await addCaseEvent(
    {
      reportId,
      type,
      status,
      title,
      summary,
      highlights: asHighlights(body?.highlights),
      href: asString(body?.href) || undefined,
    },
    ownerId,
  );

  return NextResponse.json({ event });
}
