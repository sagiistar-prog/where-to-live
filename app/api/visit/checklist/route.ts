import { NextResponse } from "next/server";
import { buildVisitChecklist, type VisitCheckInput } from "@/lib/visit-check";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : undefined;
}

function parsePreferences(value: unknown) {
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === "string");
  if (typeof value === "string") return value.split(/[，,、\n]/).map((item) => item.trim()).filter(Boolean);
  return undefined;
}

function parseInput(body: unknown): VisitCheckInput | null {
  if (!body || typeof body !== "object") return null;
  const value = body as Record<string, unknown>;
  return {
    title: asString(value.title),
    city: asString(value.city),
    address: asString(value.address),
    floor: asString(value.floor),
    buildingAge: asString(value.buildingAge),
    orientation: asString(value.orientation),
    rent: asString(value.rent),
    commute: asString(value.commute),
    description: asString(value.description),
    reportContext: asString(value.reportContext),
    preferences: parsePreferences(value.preferences),
  };
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const input = parseInput(body);

  if (!input) {
    return NextResponse.json(
      {
        error: "INVALID_VISIT_CHECK_INPUT",
        message: "请输入房源标题、城市、楼层、描述和居住偏好。",
      },
      { status: 400 },
    );
  }

  return NextResponse.json(buildVisitChecklist(input));
}
