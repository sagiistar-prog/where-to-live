import { NextResponse } from "next/server";
import { buildBuyStress, type BuyStressInput } from "@/lib/buy-stress";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : undefined;
}

function parseInput(body: unknown): BuyStressInput | null {
  if (!body || typeof body !== "object") return null;
  const value = body as Record<string, unknown>;
  return {
    city: asString(value.city),
    householdIncome: asString(value.householdIncome),
    cashSavings: asString(value.cashSavings),
    currentRent: asString(value.currentRent),
    fixedCost: asString(value.fixedCost),
    targetTotalPrice: asString(value.targetTotalPrice),
    downPaymentRatio: asString(value.downPaymentRatio),
    loanYears: asString(value.loanYears),
    mortgageRate: asString(value.mortgageRate),
    propertyCost: asString(value.propertyCost),
    incomeDrop: asString(value.incomeDrop),
    safetyMonths: asString(value.safetyMonths),
  };
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const input = parseInput(body);

  if (!input) {
    return NextResponse.json(
      {
        error: "INVALID_BUY_STRESS_INPUT",
        message: "请输入家庭收入、可用现金、目标总价、贷款年限和利率。",
      },
      { status: 400 },
    );
  }

  return NextResponse.json(buildBuyStress(input));
}
