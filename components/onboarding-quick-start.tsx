import { ArrowRight, Search } from "lucide-react";
import { Button } from "@/components/ui/button";

export function OnboardingQuickStart() {
  return (
    <section className="rounded-lg border border-border bg-card/95 p-5 shadow-[0_22px_80px_oklch(var(--foreground)/0.08)] sm:p-6">
      <div className="mb-4">
        <p className="text-sm text-primary">直接开始</p>
        <h2 className="mt-2 text-2xl font-semibold tracking-normal">
          描述当前居住问题
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-7 text-muted-foreground">
          可以先不填写常用信息。输入当前情况后，系统会进入对应判断。
        </p>
      </div>

      <form action="/start" method="get" className="rounded-lg border border-border bg-secondary/50 p-3">
        <input type="hidden" name="from" value="onboarding" />
        <label htmlFor="onboarding-start-prompt" className="sr-only">
          当前居住问题
        </label>
        <textarea
          id="onboarding-start-prompt"
          name="prompt"
          placeholder="例如：刚拿到杭州 offer，税后 18000，租金预算 5500，想判断住哪里更合适。"
          className="min-h-[92px] w-full resize-none border-0 bg-transparent text-sm leading-7 text-foreground outline-none placeholder:text-muted-foreground sm:text-base"
        />
        <div className="mt-3 flex flex-col gap-3 border-t border-border pt-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex min-w-0 items-center gap-2 text-sm text-muted-foreground">
            <Search className="h-4 w-4 shrink-0 text-primary" />
            <span className="truncate">生活成本、房源体检、付款咨询和买房大致判断会自动匹配。</span>
          </p>
          <Button type="submit" className="shrink-0">
            开始判断
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </form>
    </section>
  );
}
