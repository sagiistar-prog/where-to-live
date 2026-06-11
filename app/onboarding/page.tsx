import Link from "next/link";
import { ArrowLeft, CheckCircle2, MapPin, WalletCards } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { OnboardingProfileForm } from "@/components/onboarding-profile-form";
import { Button } from "@/components/ui/button";

export default function OnboardingPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[oklch(0.986_0.006_92)] text-foreground">
      <video
        className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-[0.58] saturate-[0.72] contrast-[0.9]"
        src="/videos/city-aerial-loop.mp4"
        poster="/videos/city-aerial-poster.jpg"
        autoPlay
        muted
        loop
        playsInline
        aria-hidden="true"
      />
      <div className="pointer-events-none absolute inset-0 bg-[oklch(0.986_0.006_92/0.62)]" />

      <div className="relative mx-auto flex min-h-screen w-full max-w-7xl flex-col overflow-x-hidden px-4 py-5 sm:px-6 lg:px-8">
        <header className="mb-9 flex w-full min-w-0 max-w-full items-center justify-between gap-3">
          <BrandMark href="/" size="md" />
          <Button asChild variant="ghost" className="shrink-0 px-2 sm:px-4">
            <Link href="/dashboard">
              <ArrowLeft className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">返回工作台</span>
              <span className="sm:hidden">返回</span>
            </Link>
          </Button>
        </header>

        <section className="mb-8 grid w-full min-w-0 max-w-full gap-5 lg:grid-cols-[minmax(0,0.72fr)_minmax(280px,0.28fr)] lg:items-end">
          <div className="min-w-0">
            <p className="text-sm text-primary">首次设置</p>
            <h1 className="mt-3 max-w-full break-words text-balance text-3xl font-semibold leading-tight tracking-normal [overflow-wrap:anywhere] sm:max-w-4xl sm:text-5xl">
              先把城市成本调成适合你
            </h1>
            <p className="mt-4 max-w-full break-words text-base leading-8 text-muted-foreground [overflow-wrap:anywhere] sm:max-w-3xl">
              同一座城市、同一片区，对刚毕业、经常加班、第一次独居、养宠、做饭和怕潮湿的人，结论会完全不同。先保存预算、通勤和生活偏好，后面判断城市、片区和房源时会直接沿用。
            </p>
          </div>
          <div className="grid min-w-0 gap-2 rounded-lg border border-border bg-card/70 p-4 shadow-[0_18px_54px_oklch(var(--foreground)/0.06)] backdrop-blur">
            <MiniPoint icon={WalletCards} label="租金压力" />
            <MiniPoint icon={MapPin} label="通勤与生活半径" />
            <MiniPoint icon={CheckCircle2} label="看房和签约确认" />
          </div>
        </section>

        <OnboardingProfileForm />
      </div>
    </main>
  );
}

function MiniPoint({
  icon: Icon,
  label,
}: {
  icon: LucideIcon;
  label: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-md bg-secondary/55 px-3 py-2 text-sm text-secondary-foreground">
      <span className="flex h-8 w-8 items-center justify-center rounded-md bg-background text-primary shadow-sm">
        <Icon className="h-4 w-4" />
      </span>
      {label}
    </div>
  );
}
