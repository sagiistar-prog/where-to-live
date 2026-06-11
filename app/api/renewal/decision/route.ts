import { NextResponse } from "next/server";
import { buildRenewalDecision, type RenewalDecisionInput } from "@/lib/renewal-decision";

export const dynamic = "force-dynamic";

function asString(value: unknown) {
  return typeof value === "string" ? value : undefined;
}

function asNumber(value: unknown) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : undefined;
}

function parseInput(body: unknown): RenewalDecisionInput | null {
  if (!body || typeof body !== "object") return null;
  const value = body as Record<string, unknown>;

  return {
    city: asString(value.city),
    listingTitle: asString(value.listingTitle),
    currentRent: asNumber(value.currentRent),
    proposedRent: asNumber(value.proposedRent),
    marketRent: asNumber(value.marketRent),
    monthlyIncome: asNumber(value.monthlyIncome),
    movingCost: asNumber(value.movingCost),
    agencyFee: asNumber(value.agencyFee),
    depositRisk: asNumber(value.depositRisk),
    commuteMinutes: asNumber(value.commuteMinutes),
    alternativeCommuteMinutes: asNumber(value.alternativeCommuteMinutes),
    contractLengthMonths: asNumber(value.contractLengthMonths),
    noticeDays: asNumber(value.noticeDays),
    houseIssues: asString(value.houseIssues),
    landlordBehavior: asString(value.landlordBehavior),
    renewalTerms: asString(value.renewalTerms),
    alternativeQuality: asString(value.alternativeQuality),
    workStability: asString(value.workStability),
    notes: asString(value.notes),
  };
}

export async function POST(request: Request) {
  try {
    const input = parseInput(await request.json());
    if (!input) {
      return NextResponse.json(
        {
          error: "INVALID_RENEWAL_INPUT",
          message: "请输入当前租金、拟续租租金、替代租金、搬家成本和续租条件。",
        },
        { status: 400 },
      );
    }

    return NextResponse.json(buildRenewalDecision(input));
  } catch {
    return NextResponse.json(
      {
        error: "RENEWAL_DECISION_FAILED",
        message: "续租涨租方案整理失败，请稍后重试。",
      },
      { status: 500 },
    );
  }
}
