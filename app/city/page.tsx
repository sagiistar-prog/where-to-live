import { Compass, Map, ReceiptText, SearchCheck } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { CityCostTable } from "@/components/city-cost-table";
import { CityLedgerPanel, type CityLedgerSeed } from "@/components/city-ledger-panel";
import { ProductPageHeader } from "@/components/product-page-header";
import { cityOptions } from "@/lib/mock-data";

type SearchParams = Record<string, string | string[] | undefined>;

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function buildInitialInput(params: SearchParams): CityLedgerSeed | undefined {
  const from = firstParam(params.from);
  const input: CityLedgerSeed = {
    reportId: firstParam(params.reportId),
    currentCity: firstParam(params.currentCity) ?? firstParam(params.city),
    candidateCities: firstParam(params.candidateCities),
    monthlyIncome:
      firstParam(params.monthlyIncome) ??
      firstParam(params.householdIncome) ??
      firstParam(params.income),
    rentBudget:
      firstParam(params.rentBudget) ??
      firstParam(params.budget) ??
      firstParam(params.currentRent) ??
      firstParam(params.safeRent),
    fixedCost: firstParam(params.fixedCost),
    savingGoal: firstParam(params.savingGoal),
    commuteLimit: firstParam(params.commuteLimit),
    notes: firstParam(params.notes),
    reportContext: firstParam(params.reportContext),
    sourceLabel:
      from === "buy"
        ? "来自买房压力"
        : from === "case"
          ? "来自房源记录"
          : from === "report"
            ? "来自房源评估报告"
            : from === "home"
              ? "来自首页输入"
              : from === "dashboard"
                ? "来自工作台输入"
                : from === "plan"
                  ? "来自下一步"
                  : from === "area"
                    ? "来自片区筛选"
                    : from === "compare"
                      ? "来自多房源对比"
                      : undefined,
  };

  return Object.values(input).some(Boolean) ? input : undefined;
}

export default async function CityPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const params = searchParams ? await searchParams : {};
  const reportId = firstParam(params.reportId);
  const initialInput = buildInitialInput(params);

  return (
    <AppShell>
      <div className="mx-auto max-w-7xl space-y-8">
        <ProductPageHeader
          eyebrow="城市成本"
          title="把收入、房租和生活成本算清楚"
          description="先看税后收入、租金上限、通勤、日常开销和储蓄率，再决定是否换城市、换片区、看房或买房。"
          icon={Compass}
          sideTitle="这页帮你判断什么"
          sideDescription="如果一份工作每月多 4000 元，但房租、通勤、外食和疲劳成本多花 3500 元，这个机会就要重新算。"
          facts={[
            { label: "先看", value: "税后收入和真实月成本" },
            { label: "再看", value: "储蓄率、租金红线和通勤承受力" },
            { label: "最后", value: "只把值得去的城市带入片区筛选" },
          ]}
          actions={[
            { label: "筛选片区", href: "/area", icon: Map },
            { label: "评估候选房源", href: "/analyze", icon: SearchCheck, variant: "secondary" },
          ]}
        />

        <CityLedgerPanel reportId={reportId} initialInput={initialInput} />

        <section>
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/15 text-primary">
              <ReceiptText className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">示例城市基线</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                示例只用来帮助你理解城市成本怎么比较。真实选择请优先使用上方表单输入你的税后收入和租金红线。
              </p>
            </div>
          </div>
          <CityCostTable cities={cityOptions} />
        </section>
      </div>
    </AppShell>
  );
}
