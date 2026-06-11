"use client";

import Link from "next/link";
import {
  ArrowRight,
  BadgeDollarSign,
  ClipboardCheck,
  Home,
  KeyRound,
  Landmark,
  SearchCheck,
  ShieldAlert,
  Sparkles,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { DecisionFlowStage } from "@/lib/decision-flow";

const stageIcons: Record<string, LucideIcon> = {
  "before-viewing": Sparkles,
  "after-viewing": ClipboardCheck,
  paying: BadgeDollarSign,
  handover: KeyRound,
  living: Wrench,
  "move-out": Home,
  buying: Landmark,
};

const priorityVariant: Record<
  DecisionFlowStage["priority"],
  "destructive" | "warning" | "success"
> = {
  尽快确认: "destructive",
  补充材料: "warning",
  可以继续: "success",
};

export function DecisionCommandCenter({ stages }: { stages: DecisionFlowStage[] }) {
  const defaultStage = stages[2]?.id ?? stages[0]?.id;

  return (
    <Tabs defaultValue={defaultStage} className="w-full">
      <Card className="overflow-hidden p-0">
        <div className="grid min-w-0 lg:grid-cols-[0.36fr_0.64fr]">
          <div className="min-w-0 border-b border-border bg-secondary/60 p-5 lg:border-b-0 lg:border-r">
            <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-md bg-primary/15 text-primary">
              <SearchCheck className="h-5 w-5" />
            </div>
            <h2 className="text-xl font-semibold">下一步确认台</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              先选你现在卡住的阶段。住哪儿会给出应该继续、先别付款签约，还是补充材料的确认顺序。
            </p>
            <TabsList className="mt-5 grid h-auto w-full grid-cols-2 gap-2 bg-background/30 p-1 sm:grid-cols-3 lg:grid-cols-2">
              {stages.map((stage) => (
                <TabsTrigger
                  key={stage.id}
                  value={stage.id}
                  className="h-auto min-h-11 whitespace-normal px-2 py-2 text-xs"
                >
                  {stage.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          <div className="min-w-0 p-5 lg:p-6">
            {stages.map((stage) => {
              const Icon = stageIcons[stage.id] ?? SearchCheck;

              return (
                <TabsContent key={stage.id} value={stage.id} className="mt-0">
                  <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="mb-3 flex flex-wrap items-center gap-2">
                        <span className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/15 text-primary">
                          <Icon className="h-5 w-5" />
                        </span>
                        <Badge variant={priorityVariant[stage.priority]}>
                          {stage.priority}
                        </Badge>
                      </div>
                      <h3 className="text-2xl font-semibold">{stage.title}</h3>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">
                        {stage.situation}
                      </p>
                    </div>
                    <Button asChild className="w-full shrink-0 sm:w-auto">
                      <Link href={stage.primaryHref}>
                        {stage.primaryCta}
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  </div>

                  <div className="rounded-md border border-primary/20 bg-primary/10 p-4">
                    <p className="text-sm font-medium text-primary">当前判断</p>
                    <p className="mt-2 text-sm leading-7 text-foreground/90">
                      {stage.decision}
                    </p>
                  </div>

                  <div className="mt-5 grid gap-4 xl:grid-cols-[0.5fr_0.5fr]">
                    <ActionList
                      title="先别付款签约的情况"
                      icon={ShieldAlert}
                      items={stage.pauseWhen}
                      tone="risk"
                    />
                    <ActionList
                      title="必须补充的材料"
                      icon={ClipboardCheck}
                      items={stage.evidence}
                      tone="neutral"
                    />
                  </div>

                  <div className="mt-5 border-t border-border pt-5">
                    <p className="mb-3 text-sm font-medium">继续确认</p>
                    <div className="grid gap-3 md:grid-cols-3">
                      {stage.nextLinks.map((link) => (
                        <Link
                          key={link.href}
                          href={link.href}
                          className="group min-w-0 rounded-md border border-border bg-secondary p-4 transition-colors hover:border-primary/50 hover:bg-primary/5"
                        >
                          <div className="mb-2 flex items-center justify-between gap-3">
                            <span className="font-medium">{link.label}</span>
                            <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                          </div>
                          <p className="text-sm leading-6 text-muted-foreground">
                            {link.reason}
                          </p>
                        </Link>
                      ))}
                    </div>
                  </div>
                </TabsContent>
              );
            })}
          </div>
        </div>
      </Card>
    </Tabs>
  );
}

function ActionList({
  title,
  icon: Icon,
  items,
  tone,
}: {
  title: string;
  icon: LucideIcon;
  items: string[];
  tone: "risk" | "neutral";
}) {
  return (
    <div
      className={
        tone === "risk"
          ? "rounded-md border border-amber-300/20 bg-amber-300/10 p-4"
          : "rounded-md border border-border bg-secondary p-4"
      }
    >
      <div className="mb-3 flex items-center gap-2">
        <Icon className={tone === "risk" ? "h-4 w-4 text-amber-700" : "h-4 w-4 text-primary"} />
        <h4 className="font-semibold">{title}</h4>
      </div>
      <div className="grid gap-2 text-sm leading-6 text-muted-foreground">
        {items.map((item) => (
          <p key={item} className="border-b border-border/70 pb-2 last:border-0 last:pb-0">
            {item}
          </p>
        ))}
      </div>
    </div>
  );
}

