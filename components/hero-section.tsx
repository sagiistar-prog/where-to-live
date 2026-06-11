"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  Compass,
  FileCheck2,
  Home,
  MapPin,
  Search,
  ShieldCheck,
  WalletCards,
  type LucideIcon,
} from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { Button } from "@/components/ui/button";

const navItems = [
  { label: "工作台", href: "/dashboard" },
  { label: "城市成本", href: "/city" },
  { label: "房源评估", href: "/analyze" },
  { label: "签约与入住", href: "/visit" },
  { label: "知识库", href: "/knowledge" },
];

const decisionModes = [
  {
    id: "city",
    label: "城市成本",
    icon: CircleDollarSign,
    cta: "算城市成本",
    placeholder: "写下候选城市、到手收入、租金预算和你担心的生活成本...",
    sample: "拿到深圳新工作，税后 18000，租金预算 6500，担心通勤、外食和储蓄率，不确定值不值得去。",
  },
  {
    id: "area",
    label: "片区通勤",
    icon: MapPin,
    cta: "比较片区",
    placeholder: "写下工作地点、预算、通勤上限和候选片区...",
    sample: "工作在深圳科技园，预算 6500，希望 45 分钟内到公司，纠结西丽、南山、宝安和龙华。",
  },
  {
    id: "analyze",
    label: "房源评估",
    icon: Home,
    cta: "评估房源",
    placeholder: "写下房源位置、月租、通勤或你担心的问题...",
    sample: "南山科技园一居室，月租 6200，地铁走路 11 分钟，中介催今晚定下来，担心噪音和转租授权。",
  },
  {
    id: "payment",
    label: "付款前确认",
    icon: WalletCards,
    cta: "确认付款风险",
    placeholder: "写下对方催你付什么、多少钱、材料还差什么...",
    sample: "中介说今晚先交 2000 定金锁房，合同明天补，收款是个人微信，只说不满意可以退。",
  },
] as const;

type DecisionModeId = (typeof decisionModes)[number]["id"];

const quickEntries = [
  { mode: "city", label: "拿到新工作", value: "先算城市成本", icon: Compass },
  { mode: "area", label: "纠结片区", value: "比较通勤和预算", icon: MapPin },
  { mode: "analyze", label: "已有候选房", value: "评估这套房", icon: Home },
  { mode: "payment", label: "被催付款", value: "先确认付款风险", icon: WalletCards },
] satisfies Array<{
  mode: DecisionModeId;
  label: string;
  value: string;
  icon: LucideIcon;
}>;

const modeHandOff: Record<
  DecisionModeId,
  { destination: string; carry: string; reassure: string }
> = {
  city: {
    destination: "进入城市成本",
    carry: "带入收入、房租预算、通勤和生活成本顾虑。",
    reassure: "适合先判断这座城市值不值得去。",
  },
  area: {
    destination: "进入片区通勤",
    carry: "带入工作地点、预算、通勤上限和候选片区。",
    reassure: "适合还没定具体房源，先选居住范围。",
  },
  analyze: {
    destination: "进入房源评估",
    carry: "带入位置、月租、通勤和你担心的风险。",
    reassure: "适合已经有一套候选房，想判断值不值得继续看。",
  },
  payment: {
    destination: "进入付款前确认",
    carry: "带入付款金额、收款主体、合同和退款条件。",
    reassure: "适合被催定金、押金或服务费时先确认底线。",
  },
};

const proofCards = [
  {
    icon: CircleDollarSign,
    title: "预算压力",
    value: "36%",
    desc: "房租占到手收入",
  },
  {
    icon: Clock3,
    title: "通勤消耗",
    value: "45 分钟",
    desc: "按单程与晚归一起看",
  },
  {
    icon: ShieldCheck,
    title: "付款底线",
    value: "先确认",
    desc: "收款主体和退款条件",
  },
];

export function HeroSection() {
  const [activeMode, setActiveMode] = useState<DecisionModeId>("city");
  const [prompt, setPrompt] = useState("");
  const activeDecisionMode = useMemo(
    () => decisionModes.find((mode) => mode.id === activeMode) ?? decisionModes[0],
    [activeMode],
  );
  const activeHandOff = modeHandOff[activeMode];

  return (
    <section className="relative min-h-screen overflow-hidden bg-[oklch(0.986_0.006_92)] text-foreground">
      <video
        className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-[0.84] saturate-[0.72] contrast-[0.9]"
        src="/videos/city-aerial-loop.mp4"
        poster="/videos/city-aerial-poster.jpg"
        autoPlay
        muted
        loop
        playsInline
        aria-hidden="true"
      />
      <div className="pointer-events-none absolute inset-0 bg-[oklch(0.986_0.006_92/0.44)]" />

      <div className="relative mx-auto flex min-h-screen max-w-7xl flex-col px-4 py-5 sm:px-6 lg:px-8">
        <header className="flex items-center justify-between gap-3">
          <BrandMark href="/" size="md" />
          <nav className="hidden items-center gap-1 rounded-full border border-border bg-card/76 px-2 py-1 shadow-[0_14px_42px_oklch(var(--foreground)/0.05)] backdrop-blur-xl lg:flex">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-full px-4 py-2 text-sm text-muted-foreground transition hover:bg-secondary hover:text-foreground"
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" className="hidden rounded-full sm:inline-flex">
              <Link href="/auth?callbackUrl=%2Fdashboard">登录</Link>
            </Button>
            <Button asChild className="rounded-full px-4">
              <Link href="/auth?callbackUrl=%2Fonboarding">免费开始</Link>
            </Button>
          </div>
        </header>

        <main className="flex flex-1 flex-col items-center justify-center pb-8 pt-8 text-center sm:pt-10">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-card/78 px-4 py-2 text-sm text-muted-foreground shadow-[0_14px_42px_oklch(var(--foreground)/0.05)] backdrop-blur-xl">
            <BadgeCheck className="h-4 w-4 text-primary" />
            城市生活决策助手
          </div>

          <h1 className="max-w-[56rem] text-balance text-[3rem] font-semibold leading-[0.97] tracking-normal text-foreground sm:text-6xl lg:text-[4.85rem]">
            先看清一座城，
            <span className="block">再决定住哪儿。</span>
          </h1>
          <p className="mt-4 max-w-[43rem] text-base leading-7 text-muted-foreground sm:text-lg">
            把到手收入、房租、物价、通勤、片区和付款签约放到同一次判断里。换城市、看片区、付款前，不再只靠感觉和零散搜索。
          </p>

          <form
            action="/start"
            method="get"
            className="mt-5 w-full max-w-[54rem] rounded-lg border border-border bg-card/90 p-3 text-left shadow-[0_30px_96px_oklch(var(--foreground)/0.11)] backdrop-blur-xl"
          >
            <input type="hidden" name="from" value="home" />
            <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
              {decisionModes.map((modeItem) => {
                const Icon = modeItem.icon;
                return (
                  <label
                    key={modeItem.id}
                    className="inline-flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-full border border-border bg-secondary/55 px-3 text-xs font-medium text-muted-foreground transition hover:border-primary/35 hover:bg-primary/10 hover:text-foreground has-[:checked]:border-primary/45 has-[:checked]:bg-primary/10 has-[:checked]:text-foreground sm:text-sm"
                  >
                    <input
                      type="radio"
                      name="mode"
                      value={modeItem.id}
                      checked={modeItem.id === activeMode}
                      onChange={() => setActiveMode(modeItem.id)}
                      className="sr-only"
                    />
                    <Icon className="h-4 w-4 text-primary" />
                    {modeItem.label}
                  </label>
                );
              })}
            </div>

            <label htmlFor="hero-decision-prompt" className="sr-only">
              写下当前居住选择问题
            </label>
            <textarea
              id="hero-decision-prompt"
              name="prompt"
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              placeholder={activeDecisionMode.placeholder}
              className="mt-3 min-h-[104px] w-full resize-none rounded-md border border-border bg-[oklch(0.978_0.006_92)] px-4 py-3 text-base leading-7 text-foreground outline-none transition placeholder:text-muted-foreground focus:border-primary/40 focus:bg-card focus:ring-4 focus:ring-primary/10"
            />
            <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="line-clamp-2 text-xs leading-5 text-muted-foreground">
                示例：{activeDecisionMode.sample}
              </p>
              <Button type="submit" className="shrink-0 rounded-full px-6">
                <Search className="mr-2 h-4 w-4" />
                {activeDecisionMode.cta}
              </Button>
            </div>
            <div className="mt-3 grid gap-2 rounded-md border border-border bg-secondary/55 p-3 text-xs leading-5 text-muted-foreground sm:grid-cols-[0.32fr_0.68fr]">
              <div className="flex items-center gap-2 font-medium text-foreground">
                <ArrowRight className="h-3.5 w-3.5 text-primary" />
                {activeHandOff.destination}
              </div>
              <div>
                {activeHandOff.carry}
                <span className="ml-1 text-primary">{activeHandOff.reassure}</span>
              </div>
            </div>
          </form>

          <div className="mt-5 grid w-full max-w-[54rem] gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {quickEntries.map((entry) => {
              const Icon = entry.icon;
              return (
                <Link
                  key={entry.mode}
                  href={`/start?from=home&mode=${entry.mode}`}
                  className="group flex items-center justify-between gap-3 rounded-lg border border-border bg-card/78 px-4 py-3 text-left shadow-[0_12px_34px_oklch(var(--foreground)/0.05)] transition hover:-translate-y-0.5 hover:border-primary/35 hover:bg-card"
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-secondary text-primary">
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold">{entry.label}</span>
                      <span className="mt-0.5 block text-xs text-muted-foreground">{entry.value}</span>
                    </span>
                  </span>
                  <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition group-hover:translate-x-1 group-hover:text-primary" />
                </Link>
              );
            })}
          </div>

          <div className="mt-7 grid w-full max-w-[58rem] gap-3 lg:grid-cols-[1fr_0.78fr]">
            <div className="grid gap-3 sm:grid-cols-3">
              {proofCards.map((item) => (
                <ProofCard key={item.title} {...item} />
              ))}
            </div>
            <div className="rounded-lg border border-border bg-card/86 p-4 text-left shadow-[0_18px_54px_oklch(var(--foreground)/0.07)] backdrop-blur-xl">
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
                <FileCheck2 className="h-4 w-4 text-primary" />
                当前更适合先看
              </div>
              <div className="grid gap-2 text-sm text-muted-foreground">
                {["通勤是否稳定，不只看地图距离", "月结余是否还能覆盖搬家和应急", "付款前收款主体和退款条件是否清楚"].map((item) => (
                  <div
                    key={item}
                    className="flex items-center gap-2 rounded-md border border-border bg-secondary/55 px-3 py-2"
                  >
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>
    </section>
  );
}

function ProofCard({
  icon: Icon,
  title,
  value,
  desc,
}: {
  icon: LucideIcon;
  title: string;
  value: string;
  desc: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-card/86 p-4 text-left shadow-[0_18px_54px_oklch(var(--foreground)/0.06)] backdrop-blur-xl">
      <div className="mb-3 flex items-center justify-between text-muted-foreground">
        <span className="text-xs">{title}</span>
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <p className="text-xl font-semibold">{value}</p>
      <p className="mt-2 text-xs leading-5 text-muted-foreground">{desc}</p>
    </div>
  );
}
