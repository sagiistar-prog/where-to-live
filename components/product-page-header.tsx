import Link from "next/link";
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

type HeaderAction = {
  label: string;
  href: string;
  icon?: LucideIcon;
  variant?: "default" | "secondary" | "outline";
};

type HeaderFact = {
  label: string;
  value: string;
};

export function ProductPageHeader({
  eyebrow,
  title,
  description,
  icon: Icon,
  facts = [],
  actions = [],
  sideTitle,
  sideDescription,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  icon: LucideIcon;
  facts?: HeaderFact[];
  actions?: HeaderAction[];
  sideTitle?: string;
  sideDescription?: string;
  children?: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-lg border border-border/80 bg-card shadow-[0_20px_70px_oklch(var(--foreground)/0.06)]">
      <div className="grid lg:grid-cols-[minmax(0,0.62fr)_minmax(360px,0.38fr)]">
        <div className="p-6 sm:p-8">
          <div className="mb-6 flex flex-wrap items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-md border border-border bg-secondary text-primary">
              <Icon className="h-5 w-5" />
            </span>
            <span className="rounded-full border border-border bg-secondary px-3 py-1 text-sm text-muted-foreground">
              {eyebrow}
            </span>
          </div>
          <h1 className="max-w-3xl text-3xl font-semibold tracking-normal text-foreground sm:text-4xl">
            {title}
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-muted-foreground">
            {description}
          </p>
          {actions.length ? (
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              {actions.map((action, index) => {
                const ActionIcon = action.icon ?? ArrowRight;

                return (
                  <Button
                    key={`${action.href}-${action.label}`}
                    asChild
                    variant={action.variant ?? (index === 0 ? "default" : "secondary")}
                  >
                    <Link href={action.href}>
                      <ActionIcon className="mr-2 h-4 w-4" />
                      {action.label}
                    </Link>
                  </Button>
                );
              })}
            </div>
          ) : null}
        </div>

        <aside className="border-t border-border bg-secondary/60 p-6 sm:p-8 lg:border-l lg:border-t-0">
          {sideTitle || sideDescription ? (
            <div>
              {sideTitle ? <h2 className="text-lg font-semibold">{sideTitle}</h2> : null}
              {sideDescription ? (
                <p className="mt-3 text-sm leading-7 text-muted-foreground">
                  {sideDescription}
                </p>
              ) : null}
            </div>
          ) : null}
          {facts.length ? (
            <div className="mt-5 grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
              {facts.map((fact) => (
                <div
                  key={`${fact.label}-${fact.value}`}
                  className="rounded-md border border-border bg-card px-4 py-3"
                >
                  <p className="text-xs text-muted-foreground">{fact.label}</p>
                  <p className="mt-1 text-sm font-semibold leading-6">{fact.value}</p>
                </div>
              ))}
            </div>
          ) : null}
          {children ? <div className="mt-5">{children}</div> : null}
        </aside>
      </div>
    </section>
  );
}
