import { NextResponse } from "next/server";
import { buildCommuteCost, type CommuteCostInput } from "@/lib/commute-cost";
import { enhanceCommuteInputWithAmap } from "@/lib/server/commute-route";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function asNumber(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}

function asString(value: unknown) {
  return typeof value === "string" ? value : undefined;
}

function firstString(...values: unknown[]) {
  for (const value of values) {
    const text = asString(value)?.trim();
    if (text) return text;
  }
  return undefined;
}

function asBoolean(value: unknown) {
  return typeof value === "boolean" ? value : undefined;
}

function parseInput(body: unknown): CommuteCostInput | null {
  if (!body || typeof body !== "object") return null;
  const value = body as Record<string, unknown>;
  const dataSourceSettings =
    value.dataSourceSettings && typeof value.dataSourceSettings === "object"
      ? (value.dataSourceSettings as Record<string, unknown>)
      : undefined;

  return {
    city: asString(value.city),
    listingTitle: firstString(value.listingTitle, value.title, value.address, value.homeAddress, value.origin),
    workplace: firstString(value.workplace, value.workAddress, value.destination),
    monthlyIncome: asNumber(value.monthlyIncome),
    monthlyRent: asNumber(value.monthlyRent),
    oneWayMinutes: asNumber(value.oneWayMinutes),
    walkMinutes: asNumber(value.walkMinutes),
    transferCount: asNumber(value.transferCount),
    transitFareOneWay: asNumber(value.transitFareOneWay),
    workdaysPerMonth: asNumber(value.workdaysPerMonth),
    commuteLimitMinutes: asNumber(value.commuteLimitMinutes),
    lateNightsPerMonth: asNumber(value.lateNightsPerMonth),
    taxiCostPerLateNight: asNumber(value.taxiCostPerLateNight),
    badWeatherDaysPerMonth: asNumber(value.badWeatherDaysPerMonth),
    alternativeOneWayMinutes: asNumber(value.alternativeOneWayMinutes),
    alternativeMonthlyRent: asNumber(value.alternativeMonthlyRent),
    notes: asString(value.notes),
    dataSourceSettings: {
      amapDataEnabled: asBoolean(dataSourceSettings?.amapDataEnabled),
    },
  };
}

export async function POST(request: Request) {
  try {
    const input = parseInput(await request.json());
    if (!input) {
      return NextResponse.json(
        {
          error: "INVALID_COMMUTE_INPUT",
          message: "请输入通勤分钟、步行、换乘、租金、收入和替代房信息。",
        },
        { status: 400 },
      );
    }

    const enhancedInput = await enhanceCommuteInputWithAmap(input);
    return NextResponse.json(buildCommuteCost(enhancedInput));
  } catch {
    return NextResponse.json(
      {
        error: "COMMUTE_COST_FAILED",
        message: "通勤真实成本测算失败，请稍后重试。",
      },
      { status: 500 },
    );
  }
}
