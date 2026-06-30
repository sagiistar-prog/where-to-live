import Link from "next/link";
import {
  ArrowLeft,
  BadgeCheck,
  MapPin,
} from "lucide-react";
import { AuthEmailPanel } from "@/components/auth-email-panel";
import { BrandMark } from "@/components/brand-mark";

export default function AuthPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[oklch(0.986_0.004_155)] text-foreground">
      <video
        className="absolute inset-0 h-full w-full object-cover opacity-[0.9] saturate-[0.76] contrast-[0.92]"
        src="/videos/city-aerial-loop.mp4"
        poster="/videos/city-aerial-poster.jpg"
        autoPlay
        muted
        loop
        playsInline
        aria-hidden="true"
      />
      <div className="absolute inset-0 bg-[oklch(0.986_0.004_155/0.54)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_22%_48%,oklch(0.992_0.003_155/0.96),oklch(0.992_0.003_155/0.72)_35%,oklch(0.992_0.003_155/0.30)_68%,oklch(0.992_0.003_155/0.12))]" />
      <div className="absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-[oklch(0.965_0.006_155/0.96)] to-transparent" />

      <div className="relative z-10 mx-auto flex min-h-screen max-w-7xl flex-col px-4 py-4 sm:px-6 lg:px-8">
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

        <section className="flex w-full min-w-0 flex-1 items-center overflow-x-hidden py-5 lg:py-8">
          <div className="mx-auto w-full max-w-[22.25rem] min-w-0 sm:max-w-[26rem] lg:mx-0 lg:max-w-[36rem]">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-border bg-card/80 px-4 py-2 text-sm text-muted-foreground shadow-[0_14px_42px_oklch(var(--foreground)/0.06)]">
              <BadgeCheck className="h-4 w-4 text-primary" />
              账号与判断记录
            </div>

            <h1 className="max-w-[32rem] text-balance text-[2.3rem] font-semibold leading-none tracking-normal text-foreground sm:text-4xl lg:text-[3rem]">
              欢迎来到住哪儿AI
            </h1>
            <p className="mt-3 max-w-[31rem] text-sm leading-6 text-muted-foreground sm:text-base">
              登录后可保存城市、预算、工作地点、候选房源和付款相关信息。后续换城市、看房源或签约付款时，可以继续使用已保存的信息。
            </p>

            <div className="mt-4">
              <AuthEmailPanel />
            </div>

            <div className="mt-4 flex max-w-[26rem] flex-wrap gap-2 text-xs text-muted-foreground">
              {["城市预算", "房源记录", "付款确认", "买房大致判断"].map((item) => (
                <span
                  key={item}
                  className="inline-flex items-center gap-1 rounded-full border border-border bg-card/76 px-3 py-1.5 shadow-[0_10px_28px_oklch(var(--foreground)/0.05)]"
                >
                  <MapPin className="h-3.5 w-3.5 text-primary" />
                  {item}
                </span>
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
