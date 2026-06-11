import { NextResponse } from "next/server";
import { getApiUsageSnapshot } from "@/lib/server/api-usage";

export const dynamic = "force-dynamic";

export function GET() {
  const snapshot = getApiUsageSnapshot();
  return NextResponse.json({
    items: snapshot.items,
    source: snapshot.source,
    updatedAt: new Date().toISOString(),
  });
}
