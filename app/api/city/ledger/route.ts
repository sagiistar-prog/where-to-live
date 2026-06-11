import { NextResponse } from "next/server";
import { buildCityLedger, type CityLedgerInput } from "@/lib/city-ledger";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : undefined;
}

function parseInput(body: unknown): CityLedgerInput | null {
  if (!body || typeof body !== "object") return null;
  const value = body as Record<string, unknown>;
  return {
    currentCity: asString(value.currentCity),
    candidateCities: asString(value.candidateCities),
    rentBudget: asString(value.rentBudget),
    fixedCost: asString(value.fixedCost),
    savingGoal: asString(value.savingGoal),
    commuteLimit: asString(value.commuteLimit),
    notes: asString(value.notes),
  };
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const input = parseInput(body);

  if (!input) {
    return NextResponse.json(
      {
        error: "INVALID_CITY_LEDGER_INPUT",
        message: "请输入候选城市、税后月收入、租金预算和储蓄目标。",
      },
      { status: 400 },
    );
  }

  return NextResponse.json(buildCityLedger(input));
}
