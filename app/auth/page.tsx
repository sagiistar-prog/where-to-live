import Link from "next/link";
import {
  ArrowLeft,
  BadgeCheck,
  BriefcaseBusiness,
  CheckCircle2,
  Clock3,
  FileCheck2,
  MapPin,
  ShieldCheck,
  WalletCards,
} from "lucide-react";
import { AuthEmailPanel } from "@/components/auth-email-panel";
import { BrandMark } from "@/components/brand-mark";

const scenarioCards = [
  {
    title: "城市成本",
    value: "月结余约 8,500",
    desc: "收入、租金、通勤和日常支出一起看。",
    icon: WalletCards,
  },
  {
    title: "通勤半径",
    value: "45 分钟内",
    desc: "按工作地、换乘和晚归场景判断。",
    icon: Clock3,
  },
  {
    title: "付款签约",
    value: "付款前确认",
    desc: "把押金、合同和材料放到同一步。",
    icon: ShieldCheck,
  },
];

const savedItems = [
  {
    icon: BriefcaseBusiness,
    label: "工作台",
    text: "继续上次的城市和房源判断",
  },
  {
    icon: FileCheck2,
    label: "房源记录",
    text: "保存凭据、付款和合同确认",
  },
  {
    icon: ShieldCheck,
    label: "付款前",
    text: "材料不清楚时先别转账",
  },
];

export default function AuthPage() {
  return (
    <main className="min-h-screen overflow-hidden bg-[oklch(0.986_0.006_92)] text-foreground">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col px-4 py-4 sm:px-6 lg:px-8">
        <header className="flex items-center justify-between gap-3">
          <BrandMark href="/" size="md" />
          <Link
            href="/"
            className="inline-flex h-10 shrink-0 items-center gap-2 rounded-full border border-border bg-card/82 px-3 text-sm text-muted-foreground shadow-[0_12px_32px_oklch(var(--foreground)/0.06)] transition hover:border-primary/35 hover:bg-card hover:text-foreground sm:px-4"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">返回首页</span>
            <span className="sm:hidden">返回</span>
          </Link>
        </header>

        <section className="grid flex-1 gap-7 py-6 lg:grid-cols-[0.82fr_1fr] lg:items-center lg:gap-10 lg:py-8">
          <div className="mx-auto w-full max-w-[36rem] lg:mx-0">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-card/80 px-4 py-2 text-sm text-muted-foreground shadow-[0_14px_42px_oklch(var(--foreground)/0.06)]">
              <BadgeCheck className="h-4 w-4 text-primary" />
              Google 登录 · 保存上次判断
            </div>

            <h1 className="max-w-[34rem] text-balance text-[2.7rem] font-semibold leading-[0.96] tracking-normal text-foreground sm:text-5xl lg:text-[3.9rem]">
              先算清楚，
              <span className="block">再决定住哪儿。</span>
            </h1>
            <p className="mt-4 max-w-[32rem] text-base leading-7 text-muted-foreground sm:text-[1.05rem]">
              登录后保存你的城市、收入、预算、工作地点和生活偏好。下一次换城市、看片区或付款前，住哪儿会直接按你的真实情况接着判断。
            </p>

            <div className="mt-5">
              <AuthEmailPanel />
            </div>
          </div>

          <ProductScene />
        </section>
      </div>
    </main>
  );
}

function ProductScene() {
  return (
    <div className="relative mx-auto hidden w-full max-w-[44rem] lg:block">
      <div className="overflow-hidden rounded-lg border border-border bg-card/88 shadow-[0_30px_90px_oklch(var(--foreground)/0.09)] backdrop-blur-xl">
        <div className="relative min-h-[19rem] border-b border-border">
          <video
            className="absolute inset-0 h-full w-full object-cover saturate-[0.62] contrast-[0.86]"
            src="/videos/city-aerial-loop.mp4"
            poster="/videos/city-aerial-poster.jpg"
            autoPlay
            muted
            loop
            playsInline
            aria-hidden="true"
          />
          <div className="absolute inset-0 bg-[oklch(0.986_0.006_92/0.55)]" />
          <div className="absolute inset-x-5 top-5 grid gap-3">
            <div className="max-w-[28rem] rounded-lg border border-border bg-card/90 p-4 shadow-[0_18px_48px_oklch(var(--foreground)/0.08)] backdrop-blur-xl">
              <div className="mb-3 flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-primary">
                  我
                </span>
                <p className="text-xs text-muted-foreground">刚拿到一个 offer</p>
              </div>
              <p className="text-lg font-semibold leading-7">
                税后 18,000，徐家汇上班，租金 6,500 以内，去上海值不值得？
              </p>
            </div>
            <div className="ml-auto max-w-[30rem] rounded-lg border border-primary/20 bg-primary/10 p-4 shadow-[0_18px_48px_oklch(var(--foreground)/0.08)] backdrop-blur-xl">
              <div className="mb-3 flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-card text-xs font-semibold text-primary">
                  住
                </span>
                <p className="text-xs text-primary">先看三件事</p>
              </div>
              <p className="text-sm leading-6 text-muted-foreground">
                月结余是否稳定、通勤是否可持续、首月现金是否压得太紧。先别急着定房，把城市成本和片区一起看。
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-3 p-5">
          <div className="rounded-lg border border-border bg-card p-4 shadow-[0_18px_48px_oklch(var(--foreground)/0.06)]">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm text-muted-foreground">登录后保留</p>
                <p className="mt-2 text-lg font-semibold">税后 18,000 · 房租 3,500-6,500 · 徐家汇上班</p>
              </div>
              <span className="shrink-0 rounded-md bg-secondary px-3 py-2 text-xs text-muted-foreground">
                常用信息
              </span>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {scenarioCards.map((item) => {
              const Icon = item.icon;
              return (
                <article
                  key={item.title}
                  className="rounded-lg border border-border bg-card p-4 shadow-[0_18px_48px_oklch(var(--foreground)/0.06)]"
                >
                  <span className="mb-4 flex h-9 w-9 items-center justify-center rounded-md bg-secondary text-primary">
                    <Icon className="h-4 w-4" />
                  </span>
                  <p className="text-xs text-muted-foreground">{item.title}</p>
                  <h3 className="mt-1 text-base font-semibold">{item.value}</h3>
                  <p className="mt-2 text-xs leading-5 text-muted-foreground">{item.desc}</p>
                </article>
              );
            })}
          </div>

          <div className="grid gap-3 md:grid-cols-[0.58fr_0.42fr]">
            <div className="rounded-lg border border-border bg-card p-5 shadow-[0_18px_48px_oklch(var(--foreground)/0.06)]">
              <div className="mb-4 flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <MapPin className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-sm font-semibold">住哪儿给出的建议</p>
                  <p className="text-xs text-muted-foreground">先选通勤稳定片区，再看具体房源。</p>
                </div>
              </div>
              <div className="grid gap-2">
                {["月结余预估 8,500 元", "首月预算不超过 16,000 元", "签约前确认押金退还和维修责任"].map((item) => (
                  <div
                    key={item}
                    className="flex items-center gap-3 rounded-md border border-border bg-secondary/55 px-3 py-2 text-sm"
                  >
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
                    {item}
                  </div>
                ))}
              </div>
            </div>
            <div className="grid gap-2 rounded-lg border border-border bg-secondary/50 p-4">
              {savedItems.map((item) => {
                const Icon = item.icon;
                return (
                <div
                  key={item.label}
                  className="flex items-start gap-3 rounded-md border border-border bg-card/82 p-3"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-secondary text-primary">
                    <Icon className="h-4 w-4" />
                  </span>
                  <span>
                    <span className="block text-sm font-semibold">{item.label}</span>
                    <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                      {item.text}
                    </span>
                  </span>
                </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="absolute -right-5 top-20 rounded-lg border border-border bg-card px-4 py-3 text-sm shadow-[0_18px_54px_oklch(var(--foreground)/0.08)]">
        付款前先确认，不急着转账
      </div>
      <div className="absolute -left-5 bottom-16 rounded-lg border border-border bg-card px-4 py-3 text-sm shadow-[0_18px_54px_oklch(var(--foreground)/0.08)]">
        通勤稳定比月租低 300 更重要
      </div>
    </div>
  );
}
