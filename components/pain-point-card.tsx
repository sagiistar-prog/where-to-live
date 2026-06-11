import { Card } from "@/components/ui/card";
import type { PainPoint } from "@/lib/mock-data";

export function PainPointCard({ item }: { item: PainPoint }) {
  const Icon = item.icon;

  return (
    <Card className="p-5">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div className="flex h-11 w-11 items-center justify-center rounded-md bg-primary/15 text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <span className="rounded-full border border-border bg-secondary px-2.5 py-1 text-xs text-muted-foreground">
          {item.scenario}
        </span>
      </div>
      <h3 className="text-lg font-semibold">{item.title}</h3>
      <div className="mt-4 space-y-4 text-sm leading-6">
        <div>
          <p className="mb-1 text-xs text-muted-foreground">
            触发问题
          </p>
          <p className="text-foreground/85">{item.userPain}</p>
        </div>
        <div>
          <p className="mb-1 text-xs text-primary/80">
            住哪儿怎么帮
          </p>
          <p className="text-muted-foreground">{item.aiSolution}</p>
        </div>
        <div className="rounded-md border border-emerald-300/20 bg-emerald-300/10 p-3 text-emerald-900">
          <p className="mb-1 text-xs text-emerald-700/75">
            用户价值
          </p>
          {item.valueSignal}
        </div>
      </div>
    </Card>
  );
}

