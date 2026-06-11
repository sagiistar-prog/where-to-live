import { Landmark } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { BuyScenarioCard } from "@/components/buy-scenario-card";
import { BuyStressPanel } from "@/components/buy-stress-panel";
import { Card } from "@/components/ui/card";
import { buyScenarios } from "@/lib/mock-data";
import type { BuyStressInput } from "@/lib/buy-stress";

type SearchParams = Record<string, string | string[] | undefined>;

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function seedFromParams(params: SearchParams): Partial<BuyStressInput> & {
  sourceLabel?: string;
  reportContext?: string;
} {
  return {
    city: firstParam(params.city),
    householdIncome: firstParam(params.householdIncome),
    cashSavings: firstParam(params.cashSavings),
    currentRent: firstParam(params.currentRent),
    fixedCost: firstParam(params.fixedCost),
    targetTotalPrice: firstParam(params.targetTotalPrice),
    downPaymentRatio: firstParam(params.downPaymentRatio),
    loanYears: firstParam(params.loanYears),
    mortgageRate: firstParam(params.mortgageRate),
    propertyCost: firstParam(params.propertyCost),
    incomeDrop: firstParam(params.incomeDrop),
    safetyMonths: firstParam(params.safetyMonths),
    sourceLabel:
      firstParam(params.from) === "city"
        ? "来自城市真实账本"
        : firstParam(params.from) === "plan"
          ? "来自下一步"
          : firstParam(params.from) === "home"
            ? "来自首页输入"
            : firstParam(params.from) === "dashboard"
              ? "来自工作台输入"
              : firstParam(params.from) === "case"
                ? "来自房源记录"
                : undefined,
    reportContext: firstParam(params.reportContext),
  };
}

export default async function BuyPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const params = (await searchParams) ?? {};
  const reportId = firstParam(params.reportId);
  const initialInput = seedFromParams(params);

  return (
    <AppShell>
      <div className="mx-auto max-w-7xl space-y-8">
        <section className="grid gap-6 lg:grid-cols-[0.62fr_0.38fr]">
          <div>
            <p className="text-sm text-primary/80">
              购房压力
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-normal sm:text-4xl">
              买房压力
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground">
              先看买房后的月供压力、首付后现金安全垫、通勤变化和职业流动性，再判断能不能承受、值不值得买。
            </p>
          </div>
          <Card className="p-6">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-md bg-primary/15 text-primary">
              <Landmark className="h-6 w-6" />
            </div>
            <h2 className="text-lg font-semibold">关键判断</h2>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">
              把预算放进坏情景里看：降薪、失业、换城市、家庭支出上升、装修超支和通勤成本变高。
            </p>
          </Card>
        </section>

        <BuyStressPanel reportId={reportId} initialInput={initialInput} />

        <section>
          <div className="mb-4">
            <h2 className="text-xl font-semibold">示例压力情景</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              示例只用来帮助你理解买房压力怎么比较。真实选择请优先使用上方表单输入你的收入、现金、当前租金和目标总价。
            </p>
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            {buyScenarios.map((scenario) => (
              <BuyScenarioCard key={scenario.label} scenario={scenario} />
            ))}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
