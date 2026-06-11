import { Card } from "@/components/ui/card";
import type { MarketInsight } from "@/lib/mock-data";

export function MarketInsightCard({ insight }: { insight: MarketInsight }) {
  return (
    <Card className="p-5">
      <p className="text-3xl font-semibold text-primary">{insight.metric}</p>
      <h3 className="mt-3 text-base font-semibold">{insight.title}</h3>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{insight.note}</p>
      <p className="mt-4 border-t border-border pt-3 text-xs leading-5 text-muted-foreground">
        {insight.source}
      </p>
    </Card>
  );
}
