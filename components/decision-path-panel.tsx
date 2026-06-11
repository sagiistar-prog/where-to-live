import Link from "next/link";
import { ArrowRight, type LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export type DecisionPathStep = {
  label: string;
  title: string;
  description: string;
  href: string;
  cta: string;
  icon: LucideIcon;
  state?: "current" | "risk" | "proof" | "next";
};

const stateVariant: Record<
  NonNullable<DecisionPathStep["state"]>,
  "success" | "warning" | "destructive" | "outline"
> = {
  current: "success",
  risk: "destructive",
  proof: "warning",
  next: "outline",
};

export function DecisionPathPanel({
  eyebrow = "确认顺序",
  title,
  description,
  steps,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  steps: DecisionPathStep[];
}) {
  return (
    <Card className="min-w-0 overflow-hidden p-0">
      <div className="grid min-w-0 lg:grid-cols-[0.32fr_0.68fr]">
        <div className="min-w-0 border-b border-border bg-secondary/60 p-5 lg:border-b-0 lg:border-r">
          <p className="text-xs text-primary/80">{eyebrow}</p>
          <h2 className="mt-3 text-xl font-semibold">{title}</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
        </div>
        <div className="grid min-w-0 gap-0 md:grid-cols-2 xl:grid-cols-5">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const state = step.state ?? "next";

            return (
              <div
                key={`${step.label}-${step.href}`}
                className="min-w-0 border-b border-border p-5 last:border-b-0 md:border-r md:last:border-r-0 xl:border-b-0"
              >
                <div className="mb-4 flex items-start justify-between gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/15 text-primary">
                    <Icon className="h-5 w-5" />
                  </span>
                  <Badge variant={stateVariant[state]}>{String(index + 1).padStart(2, "0")}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">{step.label}</p>
                <h3 className="mt-1 font-semibold">{step.title}</h3>
                <p className="mt-2 min-h-[72px] text-sm leading-6 text-muted-foreground">
                  {step.description}
                </p>
                <Button asChild variant="outline" className="mt-4 w-full">
                  <Link href={step.href}>
                    {step.cta}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}
