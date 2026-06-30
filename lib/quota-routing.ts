import { isSubscriptionPlanId } from "@/lib/subscription-plan";

export const quotaExceededCode = "QUOTA_EXCEEDED";

export type QuotaExceededSource = "start" | "analyze" | "record";

export function buildQuotaExceededHref({
  planId,
  from,
}: {
  planId?: string | null;
  from?: QuotaExceededSource;
} = {}) {
  const params = new URLSearchParams({ quota: "exceeded" });

  if (isSubscriptionPlanId(planId)) params.set("plan", planId);
  if (from) params.set("from", from);

  return `/pricing?${params.toString()}`;
}

export function quotaExceededHrefFromPayload({
  error,
  upgradeHref,
  from,
}: {
  error?: string;
  upgradeHref?: string;
  from?: QuotaExceededSource;
}) {
  if (error !== quotaExceededCode) return upgradeHref;
  if (!upgradeHref) return buildQuotaExceededHref({ from });

  try {
    const url = new URL(upgradeHref, "http://local");
    url.searchParams.set("quota", "exceeded");
    if (from) url.searchParams.set("from", from);
    return `${url.pathname}${url.search}`;
  } catch {
    return buildQuotaExceededHref({ from });
  }
}
