import { Card } from "@/components/ui/card";
import type { ProductStage } from "@/lib/mock-data";

export function DecisionPipeline({ stages }: { stages: ProductStage[] }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {stages.map((stage, index) => {
        const Icon = stage.icon;

        return (
          <Card key={stage.title} className="group relative overflow-hidden p-5">
            <div className="absolute right-4 top-4 text-5xl font-semibold text-muted/50">
              {String(index + 1).padStart(2, "0")}
            </div>
            <div className="mb-5 flex items-center justify-between gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-md bg-primary/15 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                <Icon className="h-5 w-5" />
              </span>
              <span className="rounded-full border border-border bg-secondary px-2.5 py-1 text-xs text-muted-foreground">
                {stage.subtitle}
              </span>
            </div>
            <h3 className="text-lg font-semibold">{stage.title}</h3>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              {stage.description}
            </p>
          </Card>
        );
      })}
    </div>
  );
}
