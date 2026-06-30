import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { RiskBadge } from "@/components/risk-badge";
import { Button } from "@/components/ui/button";
import type { CityLedgerResult } from "@/lib/city-ledger";

type CityOption = CityLedgerResult["options"][number];

type CityComparisonCardsProps = {
  options: CityOption[];
  formatMoney: (value: number) => string;
  formatPercent: (value: number) => string;
  optionAreaHref: (option: CityOption) => string;
  optionSecondaryHref: (option: CityOption) => string;
  secondaryLabel: string;
};

export function CityComparisonCards({
  options,
  formatMoney,
  formatPercent,
  optionAreaHref,
  optionSecondaryHref,
  secondaryLabel,
}: CityComparisonCardsProps) {
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      {options.map((option, index) => (
        <article key={option.city} className="rounded-lg border border-border bg-card p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">#{index + 1}</p>
              <h3 className="mt-1 text-2xl font-semibold tracking-normal">{option.city}</h3>
            </div>
            <RiskBadge status={option.pressure} tone="generic" />
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <CityCompareFact label="税后到手" value={formatMoney(option.monthlyIncome)} />
            <CityCompareFact label="真实月结余" value={formatMoney(option.monthlySavings)} />
            <CityCompareFact label="储蓄率" value={formatPercent(option.savingRate)} />
            <CityCompareFact label="真实月成本" value={formatMoney(option.trueMonthlyCost)} />
          </div>

          <p className="mt-4 text-sm leading-6 text-muted-foreground">{option.verdict}</p>

          <div className="mt-3 grid gap-2 text-xs leading-5 text-muted-foreground">
            <p className="rounded-md border border-border bg-secondary/55 px-3 py-2">
              {option.dataSourceLabel}
            </p>
            <p className="rounded-md border border-border bg-secondary/55 px-3 py-2">
              {option.opportunityLabel}：{option.baselineNote}
            </p>
            {option.baselineStatus === "estimated" ? (
              <p className="rounded-md border border-amber-300/25 bg-amber-300/10 px-3 py-2 text-amber-700">
                该城市可参考样本不足，本次只按你填写的数据做初筛。
              </p>
            ) : null}
          </div>

          <div className="mt-4 rounded-md border border-border bg-secondary/55 p-3 text-sm leading-6 text-muted-foreground">
            {option.incomeGapToGoal > 0
              ? `税后收入还差${formatMoney(option.incomeGapToGoal)}才能接近目标储蓄率。`
              : option.rentGapToGoal > 0
                ? `租金建议再降${formatMoney(option.rentGapToGoal)}。`
                : option.offerGate.summary}
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <Button asChild variant="secondary" size="sm">
              <Link href={optionAreaHref(option)}>
                筛选片区
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href={optionSecondaryHref(option)}>
                {secondaryLabel}
              </Link>
            </Button>
          </div>
        </article>
      ))}
    </div>
  );
}

function CityCompareFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-secondary/70 p-3">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-semibold">{value}</p>
    </div>
  );
}
