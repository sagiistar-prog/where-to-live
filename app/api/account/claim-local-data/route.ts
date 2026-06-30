import { NextResponse } from "next/server";
import {
  claimLocalGuestDataForOwner,
  getCurrentOwnerId,
  localGuestOwnerId,
} from "@/lib/server/current-owner";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const ownerId = await getCurrentOwnerId();

  if (ownerId === localGuestOwnerId) {
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
    movedStartIntents: result.movedStartIntents,
  });
}
