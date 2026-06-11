import { NextResponse } from "next/server";
import { screenAreas } from "@/lib/server/area-screen";
import type { AreaScreenInput } from "@/lib/area-fit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : undefined;
}

function firstString(...values: unknown[]) {
  for (const value of values) {
    const text = asString(value);
    if (text) return text;
  }
  return undefined;
}

function parseInput(body: unknown): AreaScreenInput | null {
  if (!body || typeof body !== "object") return null;
  const value = body as Record<string, unknown>;
  return {
    city: asString(value.city),
    workplace: firstString(value.workplace, value.workAddress, value.destination),
    budget: firstString(value.budget, value.rentBudget),
    commuteLimit: firstString(value.commuteLimit, value.commuteTargetMinutes, value.commuteLimitMinutes),
    lifestyle: asString(value.lifestyle),
    candidateAreas: asString(value.candidateAreas),
  };
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const input = parseInput(body);

  if (!input) {
    return NextResponse.json(
      {
        error: "INVALID_AREA_INPUT",
        message: "请输入目标城市、工作地点、预算和候选片区。",
      },
      { status: 400 },
    );
  }

  const result = await screenAreas(input);
  return NextResponse.json(result);
}
