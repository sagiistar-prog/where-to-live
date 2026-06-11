import { NextResponse } from "next/server";
import { buildHandoverCheck, type HandoverCheckInput } from "@/lib/handover-check";

export const dynamic = "force-dynamic";

function asString(value: unknown) {
  return typeof value === "string" ? value : undefined;
}

function asNumber(value: unknown) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : undefined;
}

function parseInput(body: unknown): HandoverCheckInput | null {
  if (!body || typeof body !== "object") return null;
  const value = body as Record<string, unknown>;

  return {
    city: asString(value.city),
    listingTitle: asString(value.listingTitle),
    handoverDate: asString(value.handoverDate),
    contractSigned: asString(value.contractSigned),
    keysStatus: asString(value.keysStatus),
    meterStatus: asString(value.meterStatus),
    applianceStatus: asString(value.applianceStatus),
    damageStatus: asString(value.damageStatus),
    utilityDebtStatus: asString(value.utilityDebtStatus),
    accessStatus: asString(value.accessStatus),
    cleaningStatus: asString(value.cleaningStatus),
    landlordConfirmation: asString(value.landlordConfirmation),
    depositAmount: asNumber(value.depositAmount),
    monthlyRent: asNumber(value.monthlyRent),
    notes: asString(value.notes),
  };
}

export async function POST(request: Request) {
  try {
    const input = parseInput(await request.json());
    if (!input) {
      return NextResponse.json(
        {
          error: "INVALID_HANDOVER_INPUT",
          message: "请输入交割日期、钥匙门禁、表读数、家具家电、旧损坏和确认情况。",
        },
        { status: 400 },
      );
    }

    return NextResponse.json(buildHandoverCheck(input));
  } catch {
    return NextResponse.json(
      {
        error: "HANDOVER_CHECK_FAILED",
        message: "交割确认计划整理失败，请稍后重试。",
      },
      { status: 500 },
    );
  }
}
