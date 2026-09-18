import { listCaseEvents } from "@/lib/server/case-event-store";
import { getAccountSubscription } from "@/lib/server/account-subscription";
import { listReports } from "@/lib/server/report-store";
import { listStartIntents } from "@/lib/server/start-intent-store";
import {
  getSubscriptionPlan,
  type SubscriptionPlanId,
} from "@/lib/subscription-plan";
import { buildQuotaExceededHref, quotaExceededCode } from "@/lib/quota-routing";

function monthStart(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function nextMonthStart(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 1);
}

function inCurrentMonth(value: string | undefined, start: Date, end: Date) {
  if (!value) return false;
  const date = new Date(value);
  return !Number.isNaN(date.getTime()) && date >= start && date < end;
}

function formatPeriod(start: Date) {
  return `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}`;
}

export async function getAccountQuota({
  ownerId,
  fallbackPlanId: _fallbackPlanId,
}: {
  ownerId: string;
  fallbackPlanId?: string | null;
}) {
  const [subscription, reports, caseEvents, startIntents] = await Promise.all([
    getAccountSubscription(ownerId),
    listReports(ownerId),
    listCaseEvents(ownerId),
    listStartIntents(ownerId),
  ]);
  void _fallbackPlanId;
  const planId: SubscriptionPlanId = subscription?.planId
    ?? "free";
  const plan = getSubscriptionPlan(planId);
  const start = monthStart();
  const end = nextMonthStart();
  const reportCount = reports.filter((report) =>
    inCurrentMonth(report.generatedAt, start, end),
  ).length;
  const actionRecordCount = caseEvents.filter((event) =>
    inCurrentMonth(event.createdAt, start, end),
  ).length;
  const quickStartCount = startIntents.filter((intent) =>
    inCurrentMonth(intent.createdAt, start, end),
  ).length;
  const used = reportCount + actionRecordCount + quickStartCount;
  const limit = plan.monthlyDecisionLimit;
  const remaining = Math.max(limit - used, 0);
  const percent = limit > 0 ? Math.min(Math.round((used / limit) * 100), 100) : 0;

  return {
    planId,
    plan,
    period: formatPeriod(start),
    periodStart: start.toISOString(),
    periodEnd: end.toISOString(),
    limit,
    used,
    remaining,
    percent,
    counts: {
      reports: reportCount,
      actionRecords: actionRecordCount,
      quickStarts: quickStartCount,
    },
  };
}

export function buildQuotaExceededPayload(quota: Awaited<ReturnType<typeof getAccountQuota>>) {
  const upgradeHref = buildQuotaExceededHref({ planId: quota.planId });

  return {
    error: quotaExceededCode,
    message: `本月 ${quota.plan.name} 方案可保存 ${quota.limit} 次判断，当前额度已用完。可以清理记录，或到方案与额度页调整方案。`,
    upgradeHref,
    quota: {
      planId: quota.planId,
      planName: quota.plan.name,
      period: quota.period,
      limit: quota.limit,
      used: quota.used,
      remaining: quota.remaining,
    },
  };
}
