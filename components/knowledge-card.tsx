import Link from "next/link";
import { ArrowRight, BookOpenCheck, Clock3, FileCheck2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import type { KnowledgeItem } from "@/lib/mock-data";

export function KnowledgeCard({ item }: { item: KnowledgeItem }) {
  return (
    <Card className="flex h-full flex-col p-5">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/15 text-primary">
            <BookOpenCheck className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">
              {item.category}
            </p>
            <h3 className="mt-1 text-lg font-semibold">{item.title}</h3>
          </div>
        </div>
      </div>
      <p className="mb-4 text-sm leading-6 text-muted-foreground">{item.summary}</p>
      <ul className="space-y-2 text-sm text-muted-foreground">
        {item.bullets.map((bullet) => (
          <li key={bullet} className="flex gap-2">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
            <span>{bullet}</span>
          </li>
        ))}
      </ul>
      <div className="mt-4 rounded-md border border-border/70 bg-secondary/35 p-3">
        <div className="mb-2 flex items-center gap-2 text-xs font-medium text-foreground">
          <FileCheck2 className="h-4 w-4 text-primary" />
          建议确认来源
        </div>
        <div className="flex flex-wrap gap-2">
          {item.sourceNotes.map((source) => (
            <span
              key={source}
              className="rounded-md border border-border bg-background/45 px-2.5 py-1 text-xs text-muted-foreground"
            >
              {source}
            </span>
          ))}
        </div>
      </div>
      <div className="mt-auto pt-5">
        <div className="mb-3 flex gap-2 rounded-md border border-border/70 bg-secondary/35 p-3 text-xs leading-5 text-muted-foreground">
          <Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <span>{item.decisionMoment}</span>
        </div>
        <Link
          href={item.actionHref}
          className="inline-flex min-h-11 w-full items-center justify-between gap-3 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span className="min-w-0">{item.actionLabel}</span>
          <ArrowRight className="h-4 w-4 shrink-0" />
        </Link>
      </div>
    </Card>
  );
}
