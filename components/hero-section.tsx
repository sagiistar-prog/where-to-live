"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Search,
  Sparkles,
} from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { Button } from "@/components/ui/button";
import { inferredModeFromPrompt, type StartMode } from "@/lib/start-mode-inference";
import {
  getStartModeMeta,
  primaryStartModes,
} from "@/lib/start-entry";
import { cn } from "@/lib/utils";

export function HeroSection() {
  const [selectedMode, setSelectedMode] = useState<StartMode>("city");
  const [prompt, setPrompt] = useState("");
  const trimmedPrompt = prompt.trim();
  const inferredMode = useMemo(() => inferredModeFromPrompt(trimmedPrompt), [trimmedPrompt]);
  const previewMode = inferredMode ?? selectedMode;
  const preview = getStartModeMeta(previewMode);
  const PreviewIcon = preview.icon;
  const modeChanged = Boolean(inferredMode && inferredMode !== selectedMode);

  return (
    <section className="isolate relative min-h-[92svh] overflow-hidden bg-[oklch(0.986_0.004_155)] text-foreground">
      <video
        className="pointer-events-none absolute inset-0 z-0 h-full w-full object-cover opacity-[0.84] saturate-[0.72] contrast-[0.9]"
        src="/videos/city-aerial-loop.mp4"
        poster="/videos/city-aerial-poster.jpg"
        autoPlay
        muted
        loop
        playsInline
        aria-hidden="true"
      />
      <div className="pointer-events-none absolute inset-0 z-[1] bg-[oklch(0.986_0.004_155/0.44)]" />
      <div className="pointer-events-none absolute inset-0 z-[1] bg-[linear-gradient(180deg,oklch(0.992_0.003_155/0.18),oklch(0.960_0.008_155/0.72))]" />

      <div className="relative z-10 mx-auto flex min-h-[92svh] max-w-7xl flex-col px-4 py-5 sm:px-6 lg:px-8">
        <header className="flex min-w-0 items-center justify-between gap-2 sm:gap-3">
          <Link href="/knowledge" className="text-sm font-medium underline underline-offset-4">租房知识库</Link>
          <BrandMark
            href="/"
            size="sm"
            className="text-foreground"
          />
          <div className="hidden min-w-0 shrink-0 items-center gap-2 sm:flex">
            <Button
              asChild
              variant="ghost"
              className="hidden rounded-full sm:inline-flex"
            >
              <Link href="/auth?callbackUrl=%2Fdashboard">登录</Link>
            </Button>
            <Button asChild className="rounded-full px-4">
              <Link href="/auth?callbackUrl=%2Fdashboard">开始判断</Link>
            </Button>
          </div>
        </header>

        <main className="flex min-w-0 flex-1 flex-col justify-center gap-5 py-6 lg:py-8">
          <div className="mx-auto w-full max-w-5xl min-w-0 text-center">
            <h1 className="mx-auto max-w-[19.5rem] text-balance text-[2.35rem] font-semibold leading-[1.04] tracking-normal text-foreground sm:max-w-[56rem] sm:text-5xl lg:text-[4rem]">
              住哪儿 AI，您的住宅选址管家
            </h1>
            <p className="mx-auto mt-3 max-w-[19.5rem] text-pretty text-base leading-7 text-muted-foreground sm:max-w-[52rem] sm:text-lg">
              从城市、片区、房源、付款到买房大致判断，围绕同一次居住决策连续推进。
            </p>
          </div>

          <div className="mx-auto w-full max-w-[calc(100vw-2rem)] sm:max-w-4xl">
            <form
              action="/start"
              method="get"
              className="min-w-0 rounded-lg border border-border bg-card/90 p-3 shadow-[0_30px_96px_oklch(var(--foreground)/0.11)] backdrop-blur-xl sm:p-4"
            >
              <input type="hidden" name="from" value="home" />
              <input type="hidden" name="mode" value={selectedMode} />

              <div className="mb-2 flex flex-col gap-1 text-left sm:flex-row sm:items-center sm:justify-between">
                <div className="inline-flex items-center gap-2 text-sm font-semibold text-foreground">
                  <Sparkles className="h-4 w-4 text-primary" />
                  快速应答
                </div>
                <p className="text-xs leading-5 text-muted-foreground">
                  一句话直达对应工具
                </p>
              </div>

              <div className="scrollbar-none max-w-full overflow-x-auto">
                <div className="flex w-max gap-2">
                {primaryStartModes.map((mode) => {
                  const item = getStartModeMeta(mode);
                  const Icon = item.icon;
                  const active = selectedMode === mode;
                  return (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setSelectedMode(mode)}
                      className={cn(
                        "inline-flex min-h-9 shrink-0 items-center justify-center gap-2 rounded-full border px-3 text-xs font-medium transition sm:text-sm",
                        active
                          ? "border-primary/45 bg-primary/10 text-foreground"
                          : "border-border bg-secondary/55 text-muted-foreground hover:border-primary/35 hover:bg-primary/10 hover:text-foreground",
                      )}
                    >
                      <Icon className="h-4 w-4 text-primary" />
                      {item.label}
                    </button>
                  );
                })}
                </div>
              </div>

              <label htmlFor="hero-decision-prompt" className="sr-only">
                写下当前居住决策问题
              </label>
              <div className="mt-2 rounded-lg border border-border bg-[oklch(0.982_0.004_155)] p-3">
                <textarea
                  id="hero-decision-prompt"
                  name="prompt"
                  value={prompt}
                  onChange={(event) => setPrompt(event.target.value)}
                  placeholder={getStartModeMeta(selectedMode).heroPlaceholder}
                  className="min-h-[84px] w-full resize-none border-0 bg-transparent text-base leading-7 text-foreground outline-none placeholder:text-muted-foreground"
                />
                <div className="mt-2 flex flex-col gap-2 border-t border-border pt-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-center gap-2 text-sm text-muted-foreground">
                    <PreviewIcon className="h-4 w-4 shrink-0 text-primary" />
                    <span className="truncate">
                      将进入：{preview.destination}
                    </span>
                    {modeChanged ? (
                      <span className="shrink-0 rounded-full border border-amber-300/40 bg-amber-50 px-2 py-0.5 text-xs text-amber-700">
                        已按输入调整
                      </span>
                    ) : null}
                  </div>
                  <Button type="submit" size="lg" className="w-full shrink-0 rounded-full px-6 sm:w-auto">
                    <Search className="mr-2 h-4 w-4" />
                    开始判断
                  </Button>
                </div>
              </div>

            </form>
          </div>
        </main>
      </div>
    </section>
  );
}
