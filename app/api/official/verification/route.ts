import { NextResponse } from "next/server";
import {
  buildOfficialVerificationPlan,
  type OfficialVerificationInput,
} from "@/lib/official-verification";

export const dynamic = "force-dynamic";

function parseInput(body: unknown): OfficialVerificationInput | null {
  if (!body || typeof body !== "object") return null;
  const input = body as Record<string, unknown>;

  return {
    title: typeof input.title === "string" ? input.title : undefined,
    city: typeof input.city === "string" ? input.city : undefined,
    stage: typeof input.stage === "string" ? input.stage : undefined,
    address: typeof input.address === "string" ? input.address : undefined,
    landlordType: typeof input.landlordType === "string" ? input.landlordType : undefined,
    contractStatus: typeof input.contractStatus === "string" ? input.contractStatus : undefined,
    concerns: typeof input.concerns === "string" ? input.concerns : undefined,
    reportContext: typeof input.reportContext === "string" ? input.reportContext : undefined,
  };
}

export async function POST(request: Request) {
  try {
    const input = parseInput(await request.json());
    if (!input) {
      return NextResponse.json(
        {
          error: "INVALID_OFFICIAL_VERIFICATION_INPUT",
          message: "请提供城市、阶段、房源和确认担忧。",
        },
        { status: 400 },
      );
    }

    return NextResponse.json(buildOfficialVerificationPlan(input));
  } catch {
    return NextResponse.json(
      {
        error: "OFFICIAL_VERIFICATION_FAILED",
        message: "官方查询计划整理失败，请稍后重试。",
      },
      { status: 500 },
    );
  }
}
