import {
  isSubscriptionPlanId,
  type SubscriptionPlanId,
} from "@/lib/subscription-plan";

export type AccountSubscriptionSyncResult =
  | {
      authenticated: true;
      planId: SubscriptionPlanId;
      updatedAt?: string;
    }
  | {
      authenticated: false;
      planId: null;
    };

export async function readAccountSubscription(): Promise<AccountSubscriptionSyncResult | null> {
  const response = await fetch("/api/account/subscription", { cache: "no-store" }).catch(
    () => null,
  );
  if (!response?.ok) return null;

  const data = await response.json().catch(() => null);
  if (data?.authenticated && isSubscriptionPlanId(data.planId)) {
    return {
      authenticated: true,
      planId: data.planId,
      updatedAt: typeof data.updatedAt === "string" ? data.updatedAt : undefined,
    };
  }

  return {
    authenticated: false,
    planId: null,
  };
}

export async function saveAccountSubscriptionPlan(planId: SubscriptionPlanId) {
  const response = await fetch("/api/account/subscription", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ planId }),
  }).catch(() => null);

  if (!response?.ok) {
    return {
      authenticated: false,
      saved: false,
    };
  }

  const data = await response.json().catch(() => null);
  return {
    authenticated: Boolean(data?.authenticated),
    saved: Boolean(data?.authenticated && isSubscriptionPlanId(data?.planId)),
  };
}
