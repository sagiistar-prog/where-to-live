import { NextResponse } from "next/server";
import { buildPaymentGate, type PaymentGateInput } from "@/lib/payment-gate";

export const dynamic = "force-dynamic";

function asString(value: unknown) {
  return typeof value === "string" ? value : undefined;
}

function asNumber(value: unknown) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : undefined;
}

function parseInput(body: unknown): PaymentGateInput | null {
  if (!body || typeof body !== "object") return null;
  const value = body as Record<string, unknown>;
  const hasMeaningfulInput = [
    value.notes,
    value.reportContext,
    value.amount,
    value.monthlyRent,
    value.contractStatus,
    value.authorizationStatus,
    value.payeeType,
    value.refundRule,
    value.urgencyPressure,
  ].some((item) => String(item ?? "").trim().length > 0);

  if (!hasMeaningfulInput) return null;

  return {
    city: asString(value.city),
    listingTitle: asString(value.listingTitle),
    paymentType: asString(value.paymentType),
    amount: asNumber(value.amount),
    monthlyRent: asNumber(value.monthlyRent),
    stage: asString(value.stage),
    contractStatus: asString(value.contractStatus),
    identityStatus: asString(value.identityStatus),
    authorizationStatus: asString(value.authorizationStatus),
    payeeType: asString(value.payeeType),
    payeeMatchesContract: asString(value.payeeMatchesContract),
    refundRule: asString(value.refundRule),
    receiptStatus: asString(value.receiptStatus),
    paymentChannel: asString(value.paymentChannel),
    urgencyPressure: asString(value.urgencyPressure),
    notes: asString(value.notes),
    reportContext: asString(value.reportContext),
  };
}

export async function POST(request: Request) {
  try {
    const input = parseInput(await request.json());
    if (!input) {
      return NextResponse.json(
        {
          error: "INVALID_PAYMENT_GATE_INPUT",
          message: "请输入您担心的合同及其他法律风险。",
        },
        { status: 400 },
      );
    }

    return NextResponse.json(buildPaymentGate(input));
  } catch {
    return NextResponse.json(
      {
        error: "PAYMENT_GATE_FAILED",
        message: "付款咨询失败，请稍后重试。",
      },
      { status: 500 },
    );
  }
}
