import { NextResponse } from "next/server";
import { buildDepositRefundPlan, type DepositRefundInput } from "@/lib/deposit-refund";

export const dynamic = "force-dynamic";

function asString(value: unknown) {
  return typeof value === "string" ? value : undefined;
}

function asNumber(value: unknown) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : undefined;
}

function parseInput(body: unknown): DepositRefundInput | null {
  if (!body || typeof body !== "object") return null;
  const value = body as Record<string, unknown>;

  return {
    city: asString(value.city),
    monthlyRent: asNumber(value.monthlyRent),
    depositAmount: asNumber(value.depositAmount),
    moveOutDate: asString(value.moveOutDate),
    noticeDate: asString(value.noticeDate),
    requiredNoticeDays: asNumber(value.requiredNoticeDays),
    contractReturnDays: asNumber(value.contractReturnDays),
    unpaidRent: asNumber(value.unpaidRent),
    utilityBalance: asNumber(value.utilityBalance),
    cleaningFee: asNumber(value.cleaningFee),
    damageClaim: asNumber(value.damageClaim),
    penaltyClaim: asNumber(value.penaltyClaim),
    evidenceLevel: asString(value.evidenceLevel),
    landlordReason: asString(value.landlordReason),
  };
}

export async function POST(request: Request) {
  try {
    const input = parseInput(await request.json());
    if (!input) {
      return NextResponse.json(
        {
          error: "INVALID_DEPOSIT_REFUND_INPUT",
          message: "请输入押金、退租时间、通知期、拟扣款和凭据情况。",
        },
        { status: 400 },
      );
    }

    return NextResponse.json(buildDepositRefundPlan(input));
  } catch {
    return NextResponse.json(
      {
        error: "DEPOSIT_REFUND_FAILED",
        message: "押金退还计划整理失败，请稍后重试。",
      },
      { status: 500 },
    );
  }
}
