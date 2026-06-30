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

export function ProductPageHeader({
  eyebrow,
  title,
  description,
  icon: Icon,
  actions = [],
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  icon: LucideIcon;
  actions?: HeaderAction[];
  children?: ReactNode;
}) {
  return (
    <section className="border-b border-border pb-6">
      <div className="flex min-w-0 flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <div className="mb-5 flex flex-wrap items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-md border border-border bg-secondary text-primary">
              <Icon className="h-5 w-5" />
            </span>
            <span className="rounded-full border border-border bg-secondary px-3 py-1 text-sm text-muted-foreground">
              {eyebrow}
            </span>
          </div>
          <h1 className="max-w-3xl text-3xl font-semibold tracking-normal text-foreground [overflow-wrap:anywhere] sm:text-4xl">
            {title}
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-muted-foreground [overflow-wrap:anywhere]">
            {description}
          </p>
        </div>

        {actions.length ? (
          <div className="flex shrink-0 flex-col gap-3 sm:flex-row sm:flex-wrap lg:max-w-md lg:justify-end">
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
      {children ? <div className="mt-5 max-w-3xl">{children}</div> : null}
    </section>
  );
}
