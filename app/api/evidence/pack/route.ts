import { NextResponse } from "next/server";
import { buildEvidencePack, type EvidencePackInput } from "@/lib/evidence-pack";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : undefined;
}

function parseInput(body: unknown): EvidencePackInput | null {
  if (!body || typeof body !== "object") return null;
  const value = body as Record<string, unknown>;
  return {
    stage: asString(value.stage),
    title: asString(value.title),
    city: asString(value.city),
    address: asString(value.address),
    landlordType: asString(value.landlordType),
    deposit: asString(value.deposit),
    paymentCycle: asString(value.paymentCycle),
    risks: asString(value.risks),
    reportContext: asString(value.reportContext),
  };
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const input = parseInput(body);

  if (!input) {
    return NextResponse.json(
      {
        error: "INVALID_EVIDENCE_PACK_INPUT",
        message: "请输入房源、签约阶段、出租人类型、押金和风险说明。",
      },
      { status: 400 },
    );
  }

  return NextResponse.json(buildEvidencePack(input));
}
