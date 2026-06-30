"use client";

import { useMemo, useState } from "react";
import { ArrowRight, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { inferredModeFromPrompt, type StartMode } from "@/lib/start-mode-inference";
import { getStartModeMeta, primaryStartModes } from "@/lib/start-entry";
import { cn } from "@/lib/utils";

const promptExamples: Array<{
  label: string;
  mode: StartMode;
  prompt: string;
  detail: string;
}> = [
  {
    label: "生活成本",
    mode: "city",
    prompt: "拿到上海 offer，税后 18000，租金预算 6500，想判断生活成本和储蓄压力。",
    detail: "城市、收入、租金、通勤",
  },
  {
    label: "房源体检",
    mode: "analyze",
    prompt: "我想评估深圳南山一套月租 6800 的房源，公司在科技园，看看是否值得继续谈。",
    detail: "位置、月租、工作地、顾虑",
  },
  {
    label: "片区筛选",
    mode: "area",
    prompt: "公司在上海徐汇，租金预算 6500，希望通勤 45 分钟内，想比较几个适合长期住的片区。",
    detail: "工作地、预算、通勤、片区",
  },
  {
    label: "付款咨询",
    mode: "payment",
    prompt: "中介催我先交 3000 定金，但合同、收款主体和退款条件还没确认。",
    detail: "合同、收款、退款、催付",
  },
  {
    label: "买房大致判断",
    mode: "buy",
    prompt: "想在杭州买房，首付 80 万，月供希望控制在 9000 内，公司在未来科技城。",
    detail: "城市、首付、月供、工作地",
  },
];

export function DashboardStartPanel() {
  const [selectedMode, setSelectedMode] = useState<StartMode>("city");
  const [prompt, setPrompt] = useState("");
  const inferredMode = useMemo(() => inferredModeFromPrompt(prompt.trim()), [prompt]);
  const activeMode = inferredMode ?? selectedMode;
  const active = getStartModeMeta(activeMode);
  const ActiveIcon = active.icon;

  return (
    <section className="rounded-lg border border-border bg-card p-4 shadow-[0_18px_54px_oklch(var(--foreground)/0.06)] sm:p-5">
      <form action="/start" method="get" className="min-w-0">
        <input type="hidden" name="from" value="dashboard" />
        <input type="hidden" name="mode" value={selectedMode} />

        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-medium text-primary">快速应答</p>
            <h2 className="mt-1 text-2xl font-semibold tracking-normal">
              一句话直达对应工具
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              写下当前情况，自动匹配生活成本、片区初筛、房源体检、付款咨询或买房大致判断。
            </p>
          </div>
          <div className="flex max-w-full flex-wrap gap-2">
            {primaryStartModes.map((mode) => {
              const item = getStartModeMeta(mode);
              const Icon = item.icon;
              const selected = selectedMode === mode;
              return (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setSelectedMode(mode)}
                  className={cn(
                    "inline-flex min-h-9 shrink-0 items-center gap-2 rounded-full border px-3 text-xs font-medium transition sm:text-sm",
                    selected
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

        <label htmlFor="dashboard-start-prompt" className="sr-only">
          写下当前居住决策问题
        </label>
        <div className="rounded-lg border border-border bg-secondary/45 p-3">
          <div className="mb-3 grid gap-2 md:grid-cols-2 xl:grid-cols-5">
            {promptExamples.map((example) => (
              <button
                key={example.label}
                type="button"
                onClick={() => {
                  setSelectedMode(example.mode);
                  setPrompt(example.prompt);
                }}
                className="group min-w-0 rounded-md border border-border bg-card p-3 text-left transition-colors hover:border-primary/35 hover:bg-primary/10"
              >
                <span className="flex items-center justify-between gap-2 text-sm font-medium text-foreground">
                  {example.label}
                  <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                </span>
                <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                  {example.detail}
                </span>
              </button>
            ))}
          </div>
          <textarea
            id="dashboard-start-prompt"
            name="prompt"
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            placeholder={getStartModeMeta(selectedMode).dashboardPlaceholder}
            className="min-h-[112px] w-full resize-none border-0 bg-transparent text-sm leading-7 text-foreground outline-none placeholder:text-muted-foreground sm:text-base"
          />
          <div className="mt-3 flex flex-col gap-3 border-t border-border pt-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-2 text-sm text-muted-foreground">
              <ActiveIcon className="h-4 w-4 shrink-0 text-primary" />
              <span className="truncate">将进入：{active.destination}</span>
              {inferredMode && inferredMode !== selectedMode ? (
                <span className="shrink-0 rounded-full border border-amber-300/40 bg-amber-50 px-2 py-0.5 text-xs text-amber-700">
                  已按输入调整
                </span>
              ) : null}
            </div>
            <Button type="submit" className="shrink-0">
              <Search className="mr-2 h-4 w-4" />
              开始判断
            </Button>
          </div>
        </div>
      </form>
    </section>
  );
}
