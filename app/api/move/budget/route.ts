import { NextResponse } from "next/server";
import { buildMoveBudget, type MoveBudgetInput } from "@/lib/move-budget";

export const dynamic = "force-dynamic";

function asString(value: unknown) {
  return typeof value === "string" ? value : undefined;
}

function asNumber(value: unknown) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : undefined;
}

function parseInput(body: unknown): MoveBudgetInput | null {
  if (!body || typeof body !== "object") return null;
  const value = body as Record<string, unknown>;

  return {
    city: asString(value.city),
    monthlyIncome: asNumber(value.monthlyIncome),
    cashOnHand: asNumber(value.cashOnHand),
    monthlyRent: asNumber(value.monthlyRent),
    depositMonths: asNumber(value.depositMonths),
    prepaidMonths: asNumber(value.prepaidMonths),
    agencyFee: asNumber(value.agencyFee),
    serviceFee: asNumber(value.serviceFee),
    movingCost: asNumber(value.movingCost),
    setupCost: asNumber(value.setupCost),
    utilityDeposit: asNumber(value.utilityDeposit),
    fixedMonthlyCost: asNumber(value.fixedMonthlyCost),
    daysUntilSalary: asNumber(value.daysUntilSalary),
  };
}

export async function POST(request: Request) {
  try {
    const input = parseInput(await request.json());
    if (!input) {
      return NextResponse.json(
        {
          error: "INVALID_MOVE_BUDGET_INPUT",
          message: "请输入城市、收入、现金、月租和付款方式。",
        },
        { status: 400 },
      );
    }

    return NextResponse.json(buildMoveBudget(input));
  } catch {
    return NextResponse.json(
      {
        error: "MOVE_BUDGET_FAILED",
        message: "入住预算测算失败，请稍后重试。",
      },
      { status: 500 },
    );
  }
}
