import { NextResponse } from "next/server";
import { buildSharedLivingAudit, type SharedLivingInput } from "@/lib/shared-living";

export const dynamic = "force-dynamic";

function asString(value: unknown) {
  return typeof value === "string" ? value : undefined;
}

function asNumber(value: unknown) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : undefined;
}

function parseInput(body: unknown): SharedLivingInput | null {
  if (!body || typeof body !== "object") return null;
  const value = body as Record<string, unknown>;

  return {
    city: asString(value.city),
    listingTitle: asString(value.listingTitle),
    monthlyRent: asNumber(value.monthlyRent),
    roommateCount: asNumber(value.roommateCount),
    roomType: asString(value.roomType),
    bathroomMode: asString(value.bathroomMode),
    kitchenMode: asString(value.kitchenMode),
    cleaningRule: asString(value.cleaningRule),
    guestRule: asString(value.guestRule),
    quietHours: asString(value.quietHours),
    petRule: asString(value.petRule),
    billSplit: asString(value.billSplit),
    depositLiability: asString(value.depositLiability),
    leaseHolder: asString(value.leaseHolder),
    subletPermission: asString(value.subletPermission),
    concerns: asString(value.concerns),
  };
}

export async function POST(request: Request) {
  try {
    const input = parseInput(await request.json());
    if (!input) {
      return NextResponse.json(
        {
          error: "INVALID_SHARED_LIVING_INPUT",
          message: "请输入室友人数、公共空间、清洁、访客、费用、押金和转租授权等合租信息。",
        },
        { status: 400 },
      );
    }

    return NextResponse.json(buildSharedLivingAudit(input));
  } catch {
    return NextResponse.json(
      {
        error: "SHARED_LIVING_AUDIT_FAILED",
        message: "合租边界确认失败，请稍后重试。",
      },
      { status: 500 },
    );
  }
}
