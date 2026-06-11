import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import type { ContractRiskItem } from "@/lib/mock-data";

const severityClass: Record<ContractRiskItem["severity"], string> = {
  高: "border-red-300/30 bg-red-400/15 text-red-50",
  中: "border-amber-300/30 bg-amber-400/15 text-amber-900",
  低: "border-emerald-300/30 bg-emerald-400/15 text-emerald-900",
};

export function ContractRiskList({ items }: { items: ContractRiskItem[] }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {items.map((item) => (
        <Card key={item.title} className="p-5">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-md bg-secondary text-primary">
                <AlertTriangle className="h-5 w-5" />
              </span>
              <h3 className="text-lg font-semibold">{item.title}</h3>
            </div>
            <span
              className={`rounded-full border px-2.5 py-1 text-xs ${severityClass[item.severity]}`}
            >
              {item.severity}风险
            </span>
          </div>
          <p className="text-sm leading-6 text-muted-foreground">{item.risk}</p>
          <div className="mt-4 flex gap-3 rounded-md border border-emerald-300/20 bg-emerald-300/10 p-3 text-sm leading-6 text-emerald-900">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{item.action}</span>
          </div>
        </Card>
      ))}
    </div>
  );
}

