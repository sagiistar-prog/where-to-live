import { NextResponse } from "next/server";
import { buildLifeRadius, type LifeRadiusInput } from "@/lib/life-radius";
import { enhanceLifeRadiusWithAmap } from "@/lib/server/life-radius-poi";

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

function parseNightLighting(value: unknown): LifeRadiusInput["nightLighting"] {
  return value === "good" || value === "normal" || value === "poor" ? value : undefined;
}

function parseCookingFrequency(value: unknown): LifeRadiusInput["cookingFrequency"] {
  return value === "often" || value === "sometimes" || value === "rarely" ? value : undefined;
}

function parseInput(body: unknown): LifeRadiusInput | null {
  if (!body || typeof body !== "object") return null;
  const value = body as Record<string, unknown>;
  const dataSourceSettings =
    value.dataSourceSettings && typeof value.dataSourceSettings === "object"
      ? (value.dataSourceSettings as Record<string, unknown>)
      : undefined;

  return {
    city: asString(value.city),
    listingTitle: firstString(value.listingTitle, value.title, value.address, value.homeAddress),
    radiusMinutes: asNumber(value.radiusMinutes),
    groceryMinutes: asNumber(value.groceryMinutes),
    restaurantCount: asNumber(value.restaurantCount),
    pharmacyMinutes: asNumber(value.pharmacyMinutes),
    hospitalMinutes: asNumber(value.hospitalMinutes),
    parcelMinutes: asNumber(value.parcelMinutes),
    laundryMinutes: asNumber(value.laundryMinutes),
    gymMinutes: asNumber(value.gymMinutes),
    parkMinutes: asNumber(value.parkMinutes),
    lateFoodAvailable: asBoolean(value.lateFoodAvailable),
    nightLighting: parseNightLighting(value.nightLighting),
    noiseSources: asString(value.noiseSources),
    cookingFrequency: parseCookingFrequency(value.cookingFrequency),
    lifestyle: asString(value.lifestyle),
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
          error: "INVALID_LIFE_RADIUS_INPUT",
          message: "请输入买菜、餐饮、药店、医院、快递、夜间照明和噪音等生活配套信息。",
        },
        { status: 400 },
      );
    }

    const enhancedInput = await enhanceLifeRadiusWithAmap(input);
    return NextResponse.json(buildLifeRadius(enhancedInput));
  } catch {
    return NextResponse.json(
      {
        error: "LIFE_RADIUS_FAILED",
        message: "生活配套确认失败，请稍后重试。",
      },
      { status: 500 },
    );
  }
}
