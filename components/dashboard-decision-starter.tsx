"use client";

import { useState } from "react";
import {
  ArrowRight,
  BadgeDollarSign,
  ClipboardCheck,
  Compass,
  FileSearch,
  Home,
  KeyRound,
  Landmark,
  MapPinned,
  MessageSquareText,
  MoonStar,
  RefreshCw,
  Scale,
  SearchCheck,
  ShieldCheck,
  ShoppingBag,
  Users,
  Wrench,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

type StarterMode =
  | "city"
  | "area"
  | "analyze"
  | "visit"
  | "life"
  | "contract"
  | "evidence"
  | "official"
  | "payment"
  | "plan"
  | "buy"
  | "handover"
  | "repair"
  | "renewal"
  | "deposit"
  | "safety"
  | "shared";

type StarterSample = {
  label: string;
  mode: StarterMode;
  prompt: string;
  icon: LucideIcon;
};

const modeGuidance: Record<StarterMode, { next: string; carry: string }> = {
  city: {
    next: "城市成本",
    carry: "收入、租金预算、通勤和生活成本顾虑。",
  },
  area: {
    next: "片区与通勤",
    carry: "工作地点、通勤上限、预算和候选片区。",
  },
  analyze: {
    next: "房源评估",
    carry: "房源位置、月租、通勤和你担心的问题。",
  },
  visit: {
    next: "看房与安全",
    carry: "现场要问、要看、要拍照保存的事项。",
  },
  life: {
    next: "生活配套",
    carry: "买菜、医疗、快递、夜路和噪音顾虑。",
  },
  contract: {
    next: "合同确认",
    carry: "押金、维修、退租、转租授权和责任边界。",
  },
  evidence: {
    next: "凭据材料",
    carry: "授权、收据、聊天记录、付款备注和交割材料。",
  },
  official: {
    next: "官方材料",
    carry: "出租权、备案办法、合同主体和收款主体。",
  },
  payment: {
    next: "付款前确认",
    carry: "定金、押金、收款主体、合同和退款条件。",
  },
  plan: {
    next: "下一步建议",
    carry: "当前处境、时间压力、预算和最担心的问题。",
  },
  buy: {
    next: "长期预算",
    carry: "首付、月供、收入、安全垫和换城市弹性。",
  },
  handover: {
    next: "交割确认",
    carry: "钥匙门禁、表读数、旧损坏和家具家电情况。",
  },
  repair: {
    next: "维修责任",
    carry: "损坏原因、报修记录、费用和责任边界。",
  },
  renewal: {
    next: "续租涨租",
    carry: "当前租金、涨幅、搬家成本和替代房源。",
  },
  deposit: {
    next: "押金退还",
    carry: "扣款理由、返还时间、交割凭据和沟通记录。",
  },
  safety: {
    next: "独居安全",
    carry: "夜路、门禁、楼道、电梯和维修上门边界。",
  },
  shared: {
    next: "合租边界",
    carry: "室友作息、访客、费用分摊和押金连带责任。",
  },
};

const starterGroups: Array<{ title: string; summary: string; samples: StarterSample[] }> = [
  {
    title: "先判断住哪里",
    summary: "适合刚换城市、换工作、纠结片区或长期预算的人。",
    samples: [
      {
        label: "拿到新工作",
        mode: "city",
        prompt:
          "拿到深圳新工作，税后大概 18000，租金预算 6500，担心通勤、外食和储蓄率，不确定值不值得去。",
        icon: Compass,
      },
      {
        label: "纠结片区",
        mode: "area",
        prompt: "工作在深圳科技园，预算 6500，希望 45 分钟内到公司，纠结西丽、南山、宝安和龙华。",
        icon: MapPinned,
      },
      {
        label: "生活不顺手",
        mode: "life",
        prompt: "房子附近买菜、药店、快递和夜间吃饭都不确定，担心下班后生活不顺手。",
        icon: ShoppingBag,
      },
      {
        label: "买房压力",
        mode: "buy",
        prompt: "纠结要不要在深圳买房，总价 420 万，首付后现金会很紧，担心换城市和月供压力。",
        icon: Landmark,
      },
    ],
  },
  {
    title: "正在看房",
    summary: "适合已经有候选房源，想确认房子、周边和居住边界的人。",
    samples: [
      {
        label: "评估房源",
        mode: "analyze",
        prompt: "南山科技园一居室，月租 6200，地铁走路 11 分钟，中介催今晚定下来，担心噪音和转租授权。",
        icon: Home,
      },
      {
        label: "明天看房",
        mode: "visit",
        prompt: "明天去看房，担心潮湿、噪音、夜路、门禁和楼下环境，不知道现场该问什么。",
        icon: ClipboardCheck,
      },
      {
        label: "独居安全",
        mode: "safety",
        prompt: "女生第一次独居，担心夜路、门禁、楼道、电梯和维修上门安全。",
        icon: MoonStar,
      },
      {
        label: "合租边界",
        mode: "shared",
        prompt: "合租室友作息、访客过夜、水电分摊和押金连带责任都没说清。",
        icon: Users,
      },
    ],
  },
  {
    title: "付款签约前",
    summary: "适合被催付款、准备签合同、需要确认出租权和凭据的人。",
    samples: [
      {
        label: "被催付款",
        mode: "payment",
        prompt: "中介说今晚先交 2000 定金锁房，合同明天补，收款是个人微信，只说不满意可以退。",
        icon: BadgeDollarSign,
      },
      {
        label: "签合同",
        mode: "contract",
        prompt: "合同里押金、提前退租、维修责任和转租授权都写得不清楚，想先确认。",
        icon: Scale,
      },
      {
        label: "查出租权",
        mode: "official",
        prompt: "想确认房东有没有出租权，能不能备案，合同主体和收款主体是否一致。",
        icon: SearchCheck,
      },
      {
        label: "留凭据",
        mode: "evidence",
        prompt: "中介只发了聊天截图和口头承诺，授权、收据和退款规则都没保存凭据。",
        icon: FileSearch,
      },
    ],
  },
  {
    title: "入住后和退租",
    summary: "适合拿钥匙、维修、续租涨租和押金返还这些后续问题。",
    samples: [
      {
        label: "明天交割",
        mode: "handover",
        prompt: "明天拿钥匙入住，中介催我确认无争议，但水电表、旧损坏和家具家电还没拍清楚。",
        icon: ClipboardCheck,
      },
      {
        label: "维修扯皮",
        mode: "repair",
        prompt: "入住后卫生间漏水，房东让我先垫付 1500 维修费，但责任和凭据都没说清。",
        icon: Wrench,
      },
      {
        label: "续租涨租",
        mode: "renewal",
        prompt: "房东说下个月续租要从 6200 涨到 7200，我担心搬家成本和押金风险，不知道该谈还是搬。",
        icon: RefreshCw,
      },
      {
        label: "退押金",
        mode: "deposit",
        prompt: "退租后房东说墙面和保洁要扣 1800 押金，只发了口头理由，我还没签扣款确认。",
        icon: KeyRound,
      },
    ],
  },
];

export function DashboardDecisionStarter() {
  const [prompt, setPrompt] = useState("");
  const [mode, setMode] = useState<StarterMode>("plan");
  const [activeGroupIndex, setActiveGroupIndex] = useState(0);
  const selectedSample = starterGroups
    .flatMap((group) => group.samples)
    .find((sample) => sample.mode === mode && sample.prompt === prompt);
  const activeGroup = starterGroups[activeGroupIndex] ?? starterGroups[0];
  const activeGuidance = modeGuidance[mode];

  function applySample(sample: StarterSample) {
    const groupIndex = starterGroups.findIndex((group) =>
      group.samples.some((item) => item.label === sample.label),
    );
    if (groupIndex >= 0) setActiveGroupIndex(groupIndex);
    setMode(sample.mode);
    setPrompt(sample.prompt);
  }

  return (
    <section className="overflow-hidden rounded-lg border border-border bg-card/88 shadow-[0_22px_68px_oklch(var(--foreground)/0.07)]">
      <div className="grid gap-0 xl:grid-cols-[0.55fr_0.45fr]">
        <form action="/start" method="get" className="p-5 sm:p-6 lg:p-7">
          <input type="hidden" name="from" value="dashboard" />
          <input type="hidden" name="mode" value={mode} />
          <div className="mb-5 flex items-start gap-4">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-primary/15 text-primary">
              <MessageSquareText className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="text-sm text-primary">
                一句话开始
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-normal">
                不确定从哪开始，就写下现在的处境
              </h2>
              <p className="mt-2 text-sm leading-7 text-muted-foreground">
                住哪儿会先看你是在换城市、看片区、评估房源、被催付款、签合同，还是遇到交割、维修、退押金、合租或独居安全问题，再把该确认的事排在前面。
              </p>
            </div>
          </div>

          <label htmlFor="dashboard-decision-prompt" className="sr-only">
            写下当前居住选择问题
          </label>
          <textarea
            id="dashboard-decision-prompt"
            name="prompt"
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            placeholder="例如：我拿到深圳新工作，税后 18000，预算 6500，不确定该不该去；或者中介催我今晚交定金，想先判断哪些钱不能先转。"
            className="min-h-[132px] w-full resize-none rounded-lg border border-border bg-[oklch(0.976_0.006_92)] px-4 py-3 text-sm leading-7 text-foreground outline-none transition placeholder:text-muted-foreground focus:border-primary/55 focus:ring-2 focus:ring-primary/20"
          />

          <div className="mt-4 grid gap-3 rounded-lg border border-border bg-secondary/55 p-4 sm:grid-cols-2">
            <div className="rounded-md border border-border bg-card/82 p-3">
              <p className="text-xs text-muted-foreground">接下来会去</p>
              <p className="mt-1 text-sm font-semibold text-foreground">{activeGuidance.next}</p>
            </div>
            <div className="rounded-md border border-border bg-card/82 p-3">
              <p className="text-xs text-muted-foreground">会带上这些信息</p>
              <p className="mt-1 text-sm leading-6 text-foreground">{activeGuidance.carry}</p>
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs leading-5 text-muted-foreground">
              {selectedSample ? `已选：${selectedSample.label}` : "可以直接输入，也可以从右侧选择一个常用情况。"}
            </p>
            <Button type="submit" size="lg" className="shrink-0 rounded-full px-6">
              帮我判断下一步
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </form>

        <div className="border-t border-border bg-secondary/45 p-5 sm:p-6 lg:p-7 xl:border-l xl:border-t-0">
          <div className="mb-5 flex items-end justify-between gap-4">
            <div>
              <p className="text-sm text-primary">常用场景</p>
              <h3 className="mt-2 text-xl font-semibold">先选大方向，再选具体情况</h3>
            </div>
            <span className="rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground">
              4 类
            </span>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            {starterGroups.map((group, index) => {
              const lead = group.samples[0];
              const LeadIcon = lead.icon;
              const selected = activeGroupIndex === index;

              return (
                <button
                  key={group.title}
                  type="button"
                  onClick={() => setActiveGroupIndex(index)}
                  className={`rounded-lg border p-4 shadow-[0_14px_38px_oklch(var(--foreground)/0.05)] transition ${
                    selected
                      ? "border-primary/45 bg-primary/10"
                      : "border-border bg-card/82 hover:border-primary/35 hover:bg-card"
                  }`}
                  aria-pressed={selected}
                >
                  <span className="flex items-start gap-3 text-left">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-secondary text-primary shadow-sm">
                      <LeadIcon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-base font-semibold">{group.title}</span>
                      <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                        {group.summary}
                      </span>
                    </span>
                  </span>
                </button>
              );
            })}
          </div>

          <div className="mt-4 rounded-lg border border-border bg-card/82 p-4 shadow-[0_14px_38px_oklch(var(--foreground)/0.05)]">
            <div className="mb-3">
              <p className="text-xs text-primary/80">{activeGroup.title}</p>
              <h4 className="mt-1 text-base font-semibold">选择一个最接近的情况</h4>
            </div>
            <div className="grid gap-2">
              {activeGroup.samples.map((sample) => {
                const Icon = sample.icon;
                const selected = mode === sample.mode && prompt === sample.prompt;

                return (
                  <button
                    key={sample.label}
                    type="button"
                    onClick={() => applySample(sample)}
                    className={`flex items-start gap-3 rounded-md border p-3 text-left transition hover:border-primary/45 hover:bg-background/70 hover:text-foreground ${
                      selected
                        ? "border-primary/45 bg-primary/10 text-foreground"
                        : "border-border bg-secondary/65 text-muted-foreground"
                    }`}
                    aria-pressed={selected}
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-card text-primary shadow-sm">
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-medium text-foreground">{sample.label}</span>
                      <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                        {sample.prompt}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-5 rounded-lg border border-border bg-card/82 p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <ShieldCheck className="h-4 w-4 text-primary" />
              住哪儿会帮你确认什么
            </div>
            <div className="grid gap-2 text-sm leading-6 text-muted-foreground">
              <p className="rounded-md border border-border bg-secondary/55 p-3">
                先看你是在选城市、看片区、评估房源，还是被催付款、签合同、交割、维修或退押金。
              </p>
              <p className="rounded-md border border-border bg-secondary/55 p-3">
                再带入已保存的城市、预算、工作地、通勤上限和候选记录。
              </p>
              <p className="rounded-md border border-border bg-secondary/55 p-3">
                最后告诉你下一步该确认什么，哪些钱先别转，哪些字先别签。
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
