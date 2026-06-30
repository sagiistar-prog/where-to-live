import { Compass } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { CityLedgerPanel, type CityLedgerSeed } from "@/components/city-ledger-panel";
import { ProductPageHeader } from "@/components/product-page-header";
import { StartHandoffBanner } from "@/components/start-handoff-banner";

type SearchParams = Record<string, string | string[] | undefined>;

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function buildInitialInput(params: SearchParams): CityLedgerSeed | undefined {
  const from = firstParam(params.from);
  const mode = firstParam(params.mode) === "buy" ? "buy" : "city";
  const input: CityLedgerSeed = {
    mode,
    reportId: firstParam(params.reportId),
    currentCity: firstParam(params.currentCity) ?? firstParam(params.city),
    candidateCities: firstParam(params.candidateCities),
    monthlyIncome:
      firstParam(params.monthlyIncome) ??
      firstParam(params.householdIncome) ??
      firstParam(params.income),
    annualPackage: firstParam(params.annualPackage),
    industry: firstParam(params.industry) ?? firstParam(params.role) ?? firstParam(params.job),
    rentBudget:
      firstParam(params.rentBudget) ??
      firstParam(params.budget) ??
      firstParam(params.currentRent) ??
      firstParam(params.safeRent),
    fixedCost: firstParam(params.fixedCost),
    savingGoal: firstParam(params.savingGoal),
    commuteLimit: firstParam(params.commuteLimit),
    workplace: firstParam(params.workplace),
    downPayment: firstParam(params.downPayment),
    mortgagePayment: firstParam(params.mortgagePayment),
    homePrice: firstParam(params.homePrice),
    notes: firstParam(params.notes),
    reportContext: firstParam(params.reportContext),
    sourceLabel:
      from === "case"
          ? "来自房源记录"
          : from === "report"
            ? "来自房源体检报告"
            : from === "home"
              ? "来自首页输入"
              : from === "dashboard"
                ? "来自工作台输入"
                : from === "plan"
                  ? "来自当前行动"
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
  const isBuyMode = initialInput?.mode === "buy";

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-7xl min-w-0 space-y-8 overflow-x-hidden">
        <ProductPageHeader
          eyebrow={isBuyMode ? "买房大致判断" : "生活成本"}
          title={isBuyMode ? "长期居住压力" : "选城市/比城市/换城市"}
          description={
            isBuyMode
              ? "综合税后收入、首付、月供、通勤和日常开销，评估长期居住压力和片区选择空间。"
              : "面向正在找工作、要选城市的年轻人，把各城offer、税后月收入、租金上限、通勤、日常开销和储蓄率放在一起比较。"
          }
          icon={Compass}
        />
        <StartHandoffBanner handoff={firstParam(params.handoff)} />

        <CityLedgerPanel reportId={reportId} initialInput={initialInput} />
      </div>
    </AppShell>
  );
}
