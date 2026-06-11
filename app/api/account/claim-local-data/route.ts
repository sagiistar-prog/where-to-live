import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { claimLocalGuestDataForOwner } from "@/lib/server/current-owner";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getSessionOwnerId(session: { user?: { id?: unknown } } | null) {
  const userId = session?.user?.id;
  return typeof userId === "string" && userId.trim() ? userId.trim() : "";
}

export async function POST() {
  const session = await auth();
  const ownerId = getSessionOwnerId(session);

  if (!ownerId) {
    return NextResponse.json(
      {
        authenticated: false,
        error: "NOT_AUTHENTICATED",
        message: "登录后可以把本机试用期间保存的报告和房源记录接到当前账号。",
      },
      { status: 401 },
    );
  }

  const result = await claimLocalGuestDataForOwner(ownerId);

  return NextResponse.json({
    authenticated: true,
    movedReports: result.movedReports,
    movedEvents: result.movedEvents,
  });
}
