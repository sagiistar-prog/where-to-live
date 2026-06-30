import { NextResponse } from "next/server";
import {
  getAccountSubscription,
  saveAccountSubscription,
} from "@/lib/server/account-subscription";
import { getCurrentOwnerId, localGuestOwnerId } from "@/lib/server/current-owner";
import {
  getSubscriptionPlan,
  isSubscriptionPlanId,
  subscriptionPlans,
} from "@/lib/subscription-plan";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const ownerId = await getCurrentOwnerId();

  if (ownerId === localGuestOwnerId) {
    return NextResponse.json({
      authenticated: false,
      planId: null,
      plan: null,
    });
  }

  const record = await getAccountSubscription(ownerId);
  const planId = record?.planId ?? "free";

  return NextResponse.json({
    authenticated: true,
    planId,
    plan: getSubscriptionPlan(planId),
    updatedAt: record?.updatedAt,
  });
}

export async function PUT(request: Request) {
  const ownerId = await getCurrentOwnerId();

  if (ownerId === localGuestOwnerId) {
    return NextResponse.json(
      {
        authenticated: false,
        error: "NOT_AUTHENTICATED",
        message: "登录后可以把方案保存到当前账号。",
      },
      { status: 401 },
    );
  }

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const planId = typeof body?.planId === "string" ? body.planId : "";

  if (!isSubscriptionPlanId(planId)) {
    return NextResponse.json(
      {
        authenticated: true,
        error: "INVALID_PLAN",
        message: "请选择有效方案。",
        availablePlans: Object.keys(subscriptionPlans),
      },
      { status: 400 },
    );
  }

  const record = await saveAccountSubscription({ ownerId, planId });

  return NextResponse.json({
    authenticated: true,
    planId: record.planId,
    plan: getSubscriptionPlan(record.planId),
    updatedAt: record.updatedAt,
  });
}
