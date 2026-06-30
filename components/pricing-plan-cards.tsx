"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  BadgeCheck,
  CheckCircle2,
  Crown,
  Loader2,
  Sparkles,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { saveAccountSubscriptionPlan } from "@/lib/client-subscription";
import {
  readSubscriptionPlanId,
  subscriptionPlans,
  writeSubscriptionPlanId,
  type SubscriptionPlanId,
} from "@/lib/subscription-plan";

type PlanCardConfig = {
  id: SubscriptionPlanId;
  cta: string;
  highlighted: boolean;
  icon: LucideIcon;
};

const planCards: PlanCardConfig[] = [
  {
    id: "free",
    cta: "免费使用",
    highlighted: false,
    icon: Sparkles,
  },
  {
    id: "pro",
    cta: "暂未开放购买",
    highlighted: true,
    icon: Crown,
  },
  {
    id: "max",
    cta: "暂未开放购买",
    highlighted: false,
    icon: UsersRound,
  },
];

type SaveState = {
  planId: SubscriptionPlanId;
  status: "idle" | "saving" | "saved" | "local";
};

export function PricingPlanCards() {
  const [selectedPlanId, setSelectedPlanId] = useState<SubscriptionPlanId>("free");
  const [saveState, setSaveState] = useState<SaveState>({ planId: "free", status: "idle" });

  useEffect(() => {
    const storedPlanId = readSubscriptionPlanId();
    if (storedPlanId !== "free") {
      writeSubscriptionPlanId("free");
      setSelectedPlanId("free");
      return;
    }
    setSelectedPlanId(storedPlanId);
  }, []);

  async function choosePlan(planId: SubscriptionPlanId) {
    if (planId !== "free") {
      setSaveState({ planId, status: "idle" });
      return;
    }

    writeSubscriptionPlanId(planId);
    setSelectedPlanId(planId);
    setSaveState({ planId, status: "saving" });

    const result = await saveAccountSubscriptionPlan(planId);
    setSaveState({ planId, status: result.saved ? "saved" : "local" });
  }

  const notice =
    saveState.status === "saved"
      ? `已选择 ${subscriptionPlans[saveState.planId].name}，并保存到当前账号。`
      : saveState.status === "local"
        ? `已在当前设备选择 ${subscriptionPlans[saveState.planId].name}。登录后可同步到账号。`
        : null;

  return (
    <section id="plans" className="scroll-mt-8 space-y-5">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {planCards.map((plan) => (
          <PlanCard
            key={plan.id}
            plan={plan}
            selected={selectedPlanId === plan.id}
            saving={saveState.status === "saving" && saveState.planId === plan.id}
            onChoose={choosePlan}
          />
        ))}
      </div>

      {notice ? (
        <div className="mx-auto flex max-w-3xl flex-col gap-3 rounded-lg border border-primary/25 bg-primary/[0.06] p-4 text-sm leading-6 text-foreground sm:flex-row sm:items-center sm:justify-between">
        <p>{notice}</p>
          <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
            {saveState.status === "local" ? (
              <Button asChild size="sm" variant="secondary">
                <Link href="/auth?callbackUrl=%2Fsettings">登录后同步</Link>
              </Button>
            ) : null}
            <Button asChild size="sm" variant="secondary">
              <Link href="/settings">完善常用信息</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/dashboard">开始判断</Link>
            </Button>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function PlanCard({
  plan,
  selected,
  saving,
  onChoose,
}: {
  plan: PlanCardConfig;
  selected: boolean;
  saving: boolean;
  onChoose: (planId: SubscriptionPlanId) => void;
}) {
  const planDetail = subscriptionPlans[plan.id];
  const Icon = plan.icon;

  return (
    <Card
      className={`relative flex h-full min-w-0 max-w-full flex-col overflow-hidden p-5 transition-colors sm:p-7 ${
        plan.highlighted
          ? "border-primary/45 bg-primary/[0.06] shadow-[0_22px_70px_oklch(var(--foreground)/0.10)]"
          : "hover:border-primary/35"
      } ${selected ? "ring-2 ring-primary/35" : ""}`}
    >
      {plan.highlighted || selected ? (
        <div className="mb-4 inline-flex w-fit items-center gap-1.5 rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground sm:absolute sm:right-5 sm:top-5 sm:mb-0">
          <BadgeCheck className="h-3.5 w-3.5" />
          {selected ? "当前方案" : "推荐"}
        </div>
      ) : null}

      <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-md border border-border bg-secondary text-primary">
        <Icon className="h-6 w-6" />
      </div>
      <div className="mb-5 sm:pr-16">
        <h2 className="text-2xl font-semibold [overflow-wrap:anywhere]">{planDetail.name}</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{planDetail.description}</p>
        <p className="mt-3 inline-flex rounded-full border border-border bg-secondary px-3 py-1 text-xs font-medium text-muted-foreground">
          {planDetail.fit}
        </p>
      </div>
      <div className="mb-5 flex items-end gap-2">
        <span className="text-5xl font-semibold tracking-normal">{planDetail.price}</span>
        <span className="pb-2 text-sm text-muted-foreground">{planDetail.unit}</span>
      </div>
      <Button
        className="mb-6 w-full"
        variant={plan.highlighted ? "default" : "secondary"}
        disabled={saving || plan.id !== "free"}
        onClick={() => onChoose(plan.id)}
      >
        {saving ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            正在保存
          </>
        ) : selected ? (
          "当前方案"
        ) : plan.id !== "free" ? (
          "暂未开放购买"
        ) : (
          plan.cta
        )}
      </Button>

      <div className="mb-5 grid gap-3 rounded-md border border-border bg-secondary/55 p-3 text-sm">
        <div>
          <p className="text-xs font-medium text-muted-foreground">适合场景</p>
          <p className="mt-1 leading-6 text-foreground">{planDetail.scenario}</p>
        </div>
        <div>
          <p className="text-xs font-medium text-muted-foreground">包含内容</p>
          <p className="mt-1 leading-6 text-foreground">{planDetail.decisionScope}</p>
        </div>
        <div className="flex items-center justify-between gap-3 border-t border-border pt-3">
          <span className="text-xs font-medium text-muted-foreground">判断额度</span>
          <span className="text-sm font-semibold">{planDetail.usage}</span>
        </div>
      </div>

      <div className="border-t border-border pt-5">
        <p className="mb-3 text-sm font-semibold">
          {planDetail.id === "free" ? "包含：" : "在上一档基础上增加："}
        </p>
        <ul className="space-y-2 text-sm leading-6 text-muted-foreground">
          {planDetail.features.map((feature) => (
            <li key={feature} className="flex gap-2">
              <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-primary" />
              <span className="min-w-0 [overflow-wrap:anywhere]">{feature}</span>
            </li>
          ))}
        </ul>
      </div>
    </Card>
  );
}
