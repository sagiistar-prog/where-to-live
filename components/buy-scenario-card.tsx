import { RiskBadge } from "@/components/risk-badge";
import { Card } from "@/components/ui/card";
import type { BuyScenario } from "@/lib/mock-data";

export function BuyScenarioCard({ scenario }: { scenario: BuyScenario }) {
  return (
    <Card className="p-5">
      <div className="mb-5 flex items-start justify-between gap-4">
        <h3 className="text-xl font-semibold">{scenario.label}</h3>
        <RiskBadge status={scenario.status} tone="generic" />
      </div>
      <div className="grid gap-3 text-sm">
        <Info label="总价/资产" value={scenario.totalPrice} />
        <Info label="首付/现金" value={scenario.downPayment} />
        <Info label="月支出" value={scenario.monthlyPayment} />
        <Info label="收入占比" value={scenario.paymentRatio} />
        <Info label="安全垫" value={scenario.cashBuffer} />
      </div>
      <p className="mt-5 rounded-md border border-border bg-secondary p-3 text-sm leading-6 text-muted-foreground">
        {scenario.verdict}
      </p>
    </Card>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border pb-2 last:border-0 last:pb-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}
