import { NextResponse } from "next/server";
import { getAccountQuota } from "@/lib/server/account-quota";
import { getCurrentOwnerId, localGuestOwnerId } from "@/lib/server/current-owner";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const ownerId = await getCurrentOwnerId();
  const url = new URL(request.url);
  const fallbackPlanId = url.searchParams.get("planId");
  const quota = await getAccountQuota({ ownerId, fallbackPlanId });

  return NextResponse.json({
    authenticated: ownerId !== localGuestOwnerId,
    ...quota,
  });
}
