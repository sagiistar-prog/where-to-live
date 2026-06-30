import { NextResponse } from "next/server";
import {
  buildRepairResponsibility,
  type RepairResponsibilityInput,
} from "@/lib/repair-responsibility";

export const dynamic = "force-dynamic";

function asString(value: unknown) {
  return typeof value === "string" ? value : undefined;
}

function asNumber(value: unknown) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : undefined;
}

function parseInput(body: unknown): RepairResponsibilityInput | null {
  if (!body || typeof body !== "object") return null;
  const value = body as Record<string, unknown>;

  return {
    city: asString(value.city),
    listingTitle: asString(value.listingTitle),
    issueType: asString(value.issueType),
    urgency: asString(value.urgency),
    damageScope: asString(value.damageScope),
    discoveredTiming: asString(value.discoveredTiming),
    evidenceLevel: asString(value.evidenceLevel),
    contractClause: asString(value.contractClause),
    landlordResponse: asString(value.landlordResponse),
    repairCost: asNumber(value.repairCost),
    safetyImpact: asString(value.safetyImpact),
    tenantCause: asString(value.tenantCause),
    depositConcern: asString(value.depositConcern),
    notes: asString(value.notes),
  };
}

export async function POST(request: Request) {
  try {
    const input = parseInput(await request.json());
    if (!input) {
      return NextResponse.json(
        {
          error: "INVALID_REPAIR_INPUT",
          message: "请输入维修问题、发现时间、合同条款、出租方响应、预估费用和材料情况。",
        },
        { status: 400 },
      );
    }

    return NextResponse.json(buildRepairResponsibility(input));
  } catch {
    return NextResponse.json(
      {
        error: "REPAIR_RESPONSIBILITY_FAILED",
        message: "维修责任判断计划整理失败，请稍后重试。",
      },
      { status: 500 },
    );
  }
}
