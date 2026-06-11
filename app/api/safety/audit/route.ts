import { NextResponse } from "next/server";
import { buildSafetyAudit, type SafetyAuditInput } from "@/lib/safety-audit";

export const dynamic = "force-dynamic";

function asString(value: unknown) {
  return typeof value === "string" ? value : undefined;
}

function asNumber(value: unknown) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : undefined;
}

function parseInput(body: unknown): SafetyAuditInput | null {
  if (!body || typeof body !== "object") return null;
  const value = body as Record<string, unknown>;

  return {
    city: asString(value.city),
    listingTitle: asString(value.listingTitle),
    floor: asNumber(value.floor),
    buildingAccess: asString(value.buildingAccess),
    hallwayLighting: asString(value.hallwayLighting),
    elevatorSecurity: asString(value.elevatorSecurity),
    nightReturnTime: asString(value.nightReturnTime),
    walkFromTransit: asNumber(value.walkFromTransit),
    routeDescription: asString(value.routeDescription),
    deliveryMode: asString(value.deliveryMode),
    roommateMode: asString(value.roommateMode),
    landlordContact: asString(value.landlordContact),
    windowSecurity: asString(value.windowSecurity),
    userProfile: asString(value.userProfile),
    concerns: asString(value.concerns),
  };
}

export async function POST(request: Request) {
  try {
    const input = parseInput(await request.json());
    if (!input) {
      return NextResponse.json(
        {
          error: "INVALID_SAFETY_AUDIT_INPUT",
          message: "请输入楼层、门禁、夜间路线、快递外卖、室友和房东接触等安全信息。",
        },
        { status: 400 },
      );
    }

    return NextResponse.json(buildSafetyAudit(input));
  } catch {
    return NextResponse.json(
      {
        error: "SAFETY_AUDIT_FAILED",
        message: "独居安全确认失败，请稍后重试。",
      },
      { status: 500 },
    );
  }
}
