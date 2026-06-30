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
    monthlyIncome: asString(value.monthlyIncome),
    annualPackage: asString(value.annualPackage),
    industry: asString(value.industry),
    workplace: asString(value.workplace),
    rentBudget: asString(value.rentBudget),
    fixedCost: asString(value.fixedCost),
    savingGoal: asString(value.savingGoal),
    commuteLimit: asString(value.commuteLimit),
    notes: asString(value.notes),
  };
}

function hasCitySource(input: CityLedgerInput) {
  return Boolean(input.candidateCities?.trim() || input.currentCity?.trim());
}

function hasIncomeSource(input: CityLedgerInput) {
  const incomePattern = /(\d+(\.\d+)?\s*(万|w|W|k|K|千|元)?|[一二两三四五六七八九十]{1,4}\s*(万|千|元))/;
  return Boolean(
    input.monthlyIncome?.trim() ||
      input.annualPackage?.trim() ||
      incomePattern.test(input.candidateCities ?? ""),
  );
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

  if (!hasCitySource(input)) {
    return NextResponse.json(
      {
        error: "MISSING_CITY_CANDIDATES",
        message: "请至少输入一个候选城市。",
      },
      { status: 400 },
    );
  }

  if (!hasIncomeSource(input)) {
    return NextResponse.json(
      {
        error: "MISSING_INCOME",
        message: "请填写税后月收入，或填写税前年包后再测算。",
      },
      { status: 400 },
    );
  }

  return NextResponse.json(buildCityLedger(input));
}
