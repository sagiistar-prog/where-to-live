import { NextResponse } from "next/server";
import { checkContractRisk } from "@/lib/server/openai-contract";
import type { ContractCheckInput } from "@/lib/contract-risk";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : undefined;
}

function parseInput(body: unknown): ContractCheckInput | null {
  if (!body || typeof body !== "object") return null;
  const value = body as Record<string, unknown>;
  const role = value.role === "landlord" ? "landlord" : "tenant";
  const text = asString(value.text);
  const screenshotDataUrl = asString(value.screenshotDataUrl);

  if (!text && !screenshotDataUrl) return null;

  return {
    text,
    city: asString(value.city),
    role,
    screenshotDataUrl,
  };
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const input = parseInput(body);

  if (!input) {
    return NextResponse.json(
      {
        error: "INVALID_CONTRACT_INPUT",
        message: "请输入合同条款、聊天记录或截图信息。",
      },
      { status: 400 },
    );
  }

  const result = await checkContractRisk(input);
  return NextResponse.json(result);
}
