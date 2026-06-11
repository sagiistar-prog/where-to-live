import { NextResponse } from "next/server";
import { buildDecisionPlanWithOpenAI } from "@/lib/server/openai-plan";
import type { DecisionPlanInput, DecisionStage } from "@/lib/decision-plan";

const stages = new Set<DecisionStage>([
  "city",
  "area",
  "listing",
  "visit",
  "payment",
  "contract",
  "move",
  "handover",
  "living",
  "renewal",
  "deposit",
  "buy",
]);

function asNumber(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}

function asString(value: unknown) {
  return typeof value === "string" ? value : undefined;
}

function asBoolean(value: unknown) {
  return typeof value === "boolean" ? value : undefined;
}

function parseStage(value: unknown): DecisionStage | undefined {
  return typeof value === "string" && stages.has(value as DecisionStage)
    ? (value as DecisionStage)
    : undefined;
}

function parseLivingMode(value: unknown): DecisionPlanInput["livingMode"] {
  return value === "solo" || value === "shared" || value === "couple" || value === "family"
    ? value
    : undefined;
}

function parseInput(body: unknown): DecisionPlanInput | null {
  if (!body || typeof body !== "object") return null;
  const value = body as Record<string, unknown>;
  return {
    city: asString(value.city),
    stage: parseStage(value.stage),
    listingTitle: asString(value.listingTitle),
    daysToDecision: asNumber(value.daysToDecision),
    monthlyIncome: asNumber(value.monthlyIncome),
    rentBudget: asNumber(value.rentBudget),
    targetRent: asNumber(value.targetRent),
    commuteMinutes: asNumber(value.commuteMinutes),
    livingMode: parseLivingMode(value.livingMode),
    hasListing: asBoolean(value.hasListing),
    hasContract: asBoolean(value.hasContract),
    paymentPressure: asBoolean(value.paymentPressure),
    evidenceReady: asBoolean(value.evidenceReady),
    riskFocus: asString(value.riskFocus),
    notes: asString(value.notes),
  };
}

export async function POST(request: Request) {
  try {
    const input = parseInput(await request.json());
    if (!input) {
      return NextResponse.json(
        {
          error: "INVALID_PLAN_INPUT",
          message: "请输入当前阶段、预算、租金、通勤和风险关注点。",
        },
        { status: 400 },
      );
    }

    return NextResponse.json(await buildDecisionPlanWithOpenAI(input));
  } catch {
    return NextResponse.json(
      {
        error: "PLAN_BUILD_FAILED",
        message: "下一步整理失败，请稍后重试。",
      },
      { status: 500 },
    );
  }
}
