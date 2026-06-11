import { NextResponse } from "next/server";
import { getCurrentOwnerId } from "@/lib/server/current-owner";
import { getStoredReport } from "@/lib/server/report-store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const ownerId = await getCurrentOwnerId();
  const report = await getStoredReport(id, ownerId);

  if (!report) {
    return NextResponse.json(
      {
        error: "REPORT_NOT_FOUND",
        message: "没有找到这份报告，可能已被清空或还没有保存评估。",
      },
      { status: 404 },
    );
  }

  return NextResponse.json(report);
}
