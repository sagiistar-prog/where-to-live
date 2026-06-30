export type SubscriptionPlanId = "free" | "pro" | "max";

export type SubscriptionPlan = {
  id: SubscriptionPlanId;
  name: string;
  price: string;
  unit: string;
  usage: string;
  monthlyDecisionLimit: number;
  fit: string;
  scenario: string;
  decisionScope: string;
  description: string;
  features: string[];
};

export const subscriptionPlanStorageKey = "zhunaar:subscription-plan";
export const subscriptionPlanUpdatedEvent = "zhunaar:subscription-plan-updated";

export const subscriptionPlans: Record<SubscriptionPlanId, SubscriptionPlan> = {
  free: {
    id: "free",
    name: "Free",
    price: "¥0",
    unit: "试用",
    usage: "每月 5 次判断",
    monthlyDecisionLimit: 5,
    fit: "第一次试用",
    scenario: "适合先完成一次生活成本、房源体检或付款咨询，确认这个工具是否适合自己。",
    decisionScope: "保留最近判断，可以从工作台继续查看。",
    description: "适合第一次判断城市、房源、付款或买房压力。",
    features: [
      "生活成本、房源体检和付款咨询",
      "保存最近判断",
      "生成当前行动",
    ],
  },
  pro: {
    id: "pro",
    name: "Pro",
    price: "¥19",
    unit: "每月",
    usage: "每月 30 次判断",
    monthlyDecisionLimit: 30,
    fit: "正在密集换城、看房或签约",
    scenario: "适合两到四周内连续比较城市、片区、房源、合同和付款条件。",
    decisionScope: "从换城市到付款签约，可以连续保存同一条判断上下文。",
    description: "适合正在集中看房、谈合同、准备付款的人。",
    features: [
      "多套房源和片区对比",
      "付款、合同、押金连续记录",
      "可复制的沟通文本和确认清单",
      "保留完整判断上下文",
    ],
  },
  max: {
    id: "max",
    name: "Max",
    price: "¥49",
    unit: "每月",
    usage: "每月 100 次判断",
    monthlyDecisionLimit: 100,
    fit: "多人参与或周期更长",
    scenario: "适合情侣、家庭或买房前长期比较，需要多人讨论、反复保存和回看判断。",
    decisionScope: "覆盖长期预算、买房大致判断、续租退租和押金争议。",
    description: "适合周期更长、参与人更多、需要反复比较的居住决策。",
    features: [
      "城市、片区、长期预算一起比较",
      "退租、续租、押金争议完整记录",
      "复制关键判断给同住人讨论",
    ],
  },
};

export function isSubscriptionPlanId(value: string | null | undefined): value is SubscriptionPlanId {
  return value === "free" || value === "pro" || value === "max";
}

export function getSubscriptionPlan(id: string | null | undefined) {
  return isSubscriptionPlanId(id) ? subscriptionPlans[id] : subscriptionPlans.free;
}

export function readSubscriptionPlanId(): SubscriptionPlanId {
  if (typeof window === "undefined") return "free";

  const stored = window.localStorage.getItem(subscriptionPlanStorageKey);
  return isSubscriptionPlanId(stored) ? stored : "free";
}

export function writeSubscriptionPlanId(id: SubscriptionPlanId) {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(subscriptionPlanStorageKey, id);
  window.dispatchEvent(new Event(subscriptionPlanUpdatedEvent));
}
