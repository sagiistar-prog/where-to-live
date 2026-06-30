"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Crown, Loader2, Sparkles, UsersRound, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  readAccountSubscription,
  saveAccountSubscriptionPlan,
} from "@/lib/client-subscription";
import {
  getSubscriptionPlan,
  isSubscriptionPlanId,
  readSubscriptionPlanId,
  subscriptionPlanUpdatedEvent,
  subscriptionPlans,
  writeSubscriptionPlanId,
  type SubscriptionPlanId,
} from "@/lib/subscription-plan";

const planIcons: Record<SubscriptionPlanId, LucideIcon> = {
  free: Sparkles,
  pro: Crown,
  max: UsersRound,
};

type QuotaState = {
  period: string;
  limit: number;
  used: number;
  remaining: number;
  percent: number;
  counts: {
    reports: number;
    actionRecords: number;
    quickStarts: number;
  };
};

export function SubscriptionPlanPanel() {
  const [planId, setPlanId] = useState<SubscriptionPlanId>("free");
  const [notice, setNotice] = useState<string | null>(null);
  const [accountSynced, setAccountSynced] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [quota, setQuota] = useState<QuotaState | null>(null);
  const [quotaLoading, setQuotaLoading] = useState(true);

  async function refreshQuota(nextPlanId: SubscriptionPlanId) {
    setQuotaLoading(true);
    const response = await fetch(`/api/account/quota?planId=${nextPlanId}`, {
      cache: "no-store",
    }).catch(() => null);
    const data = response?.ok ? await response.json().catch(() => null) : null;
    if (data && typeof data === "object") {
      setQuota({
        period: typeof data.period === "string" ? data.period : "",
        limit: typeof data.limit === "number" ? data.limit : subscriptionPlans[nextPlanId].monthlyDecisionLimit,
        used: typeof data.used === "number" ? data.used : 0,
        remaining: typeof data.remaining === "number" ? data.remaining : subscriptionPlans[nextPlanId].monthlyDecisionLimit,
        percent: typeof data.percent === "number" ? data.percent : 0,
        counts: {
          reports: typeof data.counts?.reports === "number" ? data.counts.reports : 0,
          actionRecords:
            typeof data.counts?.actionRecords === "number" ? data.counts.actionRecords : 0,
          quickStarts: typeof data.counts?.quickStarts === "number" ? data.counts.quickStarts : 0,
        },
      });
    }
    setQuotaLoading(false);
  }

  useEffect(() => {
    let mounted = true;

    function refreshPlan() {
      setPlanId(readSubscriptionPlanId());
    }

    async function readAccountPlan() {
      const data = await readAccountSubscription();
      if (!mounted || !data) return false;

      if (data.authenticated) {
        writeSubscriptionPlanId(data.planId);
        setPlanId(data.planId);
        setAccountSynced(true);
        return true;
      }

      setAccountSynced(false);
      return false;
    }

    async function bootstrapPlan() {
      refreshPlan();
      const selectedPlan = new URLSearchParams(window.location.search).get("plan");

      if (isSubscriptionPlanId(selectedPlan)) {
        if (selectedPlan !== "free") {
          writeSubscriptionPlanId("free");
          setPlanId("free");
          await refreshQuota("free");
          setAccountSynced(false);
          setNotice("付费方案暂未开放购买，当前保留 Free 方案。");
          window.history.replaceState(null, "", window.location.pathname);
          return;
        }

        writeSubscriptionPlanId(selectedPlan);
        setPlanId(selectedPlan);
        await refreshQuota(selectedPlan);
        setIsSyncing(true);
        const syncResult = await saveAccountSubscriptionPlan(selectedPlan);
        const synced = syncResult.saved;
        if (!mounted) return;
        setAccountSynced(synced);
        setNotice(
          synced
            ? `已记录 ${subscriptionPlans[selectedPlan].name} 方案，并保存到当前账号。`
            : `已记录 ${subscriptionPlans[selectedPlan].name} 方案。登录后可以同步到账号。`,
        );
        setIsSyncing(false);
        window.history.replaceState(null, "", window.location.pathname);
        return;
      }

      setIsSyncing(true);
      await readAccountPlan();
      if (mounted) setIsSyncing(false);
    }

    bootstrapPlan();
    window.addEventListener(subscriptionPlanUpdatedEvent, refreshPlan);
    window.addEventListener("storage", refreshPlan);
    window.addEventListener("focus", refreshPlan);

    return () => {
      mounted = false;
      window.removeEventListener(subscriptionPlanUpdatedEvent, refreshPlan);
      window.removeEventListener("storage", refreshPlan);
      window.removeEventListener("focus", refreshPlan);
    };
  }, []);

  useEffect(() => {
    refreshQuota(planId);
  }, [planId]);

  const plan = getSubscriptionPlan(planId);
  const Icon = planIcons[plan.id];

  return (
    <Card className="min-w-0 p-6">
      <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-border bg-secondary px-3 py-1 text-xs text-muted-foreground">
            <Icon className="h-3.5 w-3.5 text-primary" />
            方案与额度
          </div>
          <h2 className="text-lg font-semibold">当前方案和额度</h2>
          <p className="mt-2 max-w-3xl break-words text-sm leading-6 text-muted-foreground">
            查看当前方案、剩余额度和本月使用情况。付费方案暂未开放购买，方案页仅展示额度差异。
          </p>
        </div>
        <Button asChild variant="secondary">
          <Link href="/pricing">查看全部方案</Link>
        </Button>
      </div>

      <div className="grid gap-4">
        <div className="min-w-0 rounded-md border border-primary/25 bg-primary/[0.06] p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="text-sm text-muted-foreground">
                {plan.id === "free" ? "当前使用" : "已选择"}
              </p>
              <h3 className="mt-1 text-2xl font-semibold">{plan.name}</h3>
            </div>
            <div className="shrink-0 text-left sm:text-right">
              <p className="text-2xl font-semibold">{plan.price}</p>
              <p className="text-xs text-muted-foreground">{plan.unit}</p>
            </div>
          </div>
          <div className="mt-4 grid min-w-0 gap-3 rounded-md border border-border bg-card/70 p-3 text-sm">
            <p className="break-words leading-6 text-foreground">{plan.scenario}</p>
            <div className="flex flex-col gap-1 border-t border-border pt-3 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
              <span className="text-xs font-medium text-muted-foreground">判断额度</span>
              <span className="break-words text-sm font-semibold">{plan.usage}</span>
            </div>
          </div>
          {notice ? (
            <p className="mt-3 text-xs leading-5 text-primary">{notice}</p>
          ) : null}
          <p className="mt-3 flex items-center gap-2 text-xs leading-5 text-muted-foreground">
            {isSyncing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
            {isSyncing
              ? "正在同步方案状态..."
              : accountSynced
                ? "已保存到当前账号。"
                : "当前设备已保存；登录后可同步到账号。"}
          </p>
          {!accountSynced && plan.id !== "free" ? (
            <Button asChild variant="outline" size="sm" className="mt-4 w-full">
              <Link href="/auth?callbackUrl=%2Fsettings">登录后同步方案</Link>
            </Button>
          ) : null}
        </div>

        <div className="grid gap-4">
          <div className="min-w-0 rounded-md border border-border bg-secondary/60 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="text-sm font-semibold">本月判断额度</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  统计本月已保存的快速应答、房源体检和当前行动。
                </p>
              </div>
              <div className="text-left sm:text-right">
                <p className="text-2xl font-semibold">
                  {quotaLoading ? "..." : `${quota?.remaining ?? plan.monthlyDecisionLimit}`}
                </p>
                <p className="text-xs text-muted-foreground">
                  {quotaLoading ? "正在读取" : `剩余 / ${quota?.limit ?? plan.monthlyDecisionLimit} 次`}
                </p>
              </div>
            </div>
            <Progress value={quota?.percent ?? 0} className="mt-4" />
            {quota ? (
              <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
                <QuotaBreakdownItem label="快速应答" value={quota.counts.quickStarts} />
                <QuotaBreakdownItem label="房源报告" value={quota.counts.reports} />
                <QuotaBreakdownItem label="行动记录" value={quota.counts.actionRecords} />
              </div>
            ) : null}
            <p className="mt-3 text-xs text-muted-foreground">
              {quota?.period ? `${quota.period} 统计周期` : "当前月度统计周期"}
            </p>
          </div>

          <Button asChild variant="outline" className="w-full sm:w-fit">
            <Link href="/pricing">查看方案</Link>
          </Button>
        </div>
      </div>
    </Card>
  );
}

function QuotaBreakdownItem({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-md border border-border bg-card/70 px-3 py-2">
      <p className="text-muted-foreground">{label}</p>
      <p className="mt-1 text-base font-semibold text-foreground">{value}</p>
    </div>
  );
}
