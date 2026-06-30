import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  ClipboardList,
  ShieldAlert,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { DecisionCase, DecisionCasePriority } from "@/lib/decision-case";

const priorityStyle: Record<
  DecisionCasePriority,
  { label: string; className: string; icon: LucideIcon }
> = {
  blocker: {
    label: "必须确认",
    className: "border-rose-200 bg-rose-50 text-rose-700",
    icon: ShieldAlert,
  },
  required: {
    label: "本次要补充",
    className: "border-amber-200 bg-amber-50 text-amber-700",
    icon: AlertTriangle,
  },
  recommended: {
    label: "建议继续",
    className: "border-primary/30 bg-primary/10 text-primary",
    icon: ClipboardList,
  },
};

function urgencyScore(item: DecisionCase) {
  let score = 0;
  if (item.nextBestAction.priority === "blocker") score += 60;
  if (item.nextBestAction.priority === "required") score += 36;
  if (item.preSignGate.level === "stop") score += 42;
  if (item.preSignGate.level === "review") score += 20;
  if (!item.preSignGate.canPay) score += 18;
  if (!item.preSignGate.canSign) score += 12;
  if (item.status === "reject") score += 22;
  if (item.status === "caution") score += 10;
  if (item.dataConfidence.level === "limited") score += 28;
  if (item.dataConfidence.level === "review") score += 14;
  score += item.preSignGate.items.filter((gate) => gate.state === "blocked").length * 10;
  score += item.lifecycleGate.blockedCount * 18;
  score += item.lifecycleGate.attentionCount * 8;
  return score;
}

function gateCopy(item: DecisionCase) {
  if (item.preSignGate.canSign) return "可进入签约前最后确认";
  if (item.preSignGate.canPay) return "可小步付款，但签约前仍需再次确认";
  if (item.preSignGate.level === "review") return "补充材料，再决定是否付款";
  return "不建议付款或签约";
}

export function CaseTriageQueue({ cases }: { cases: DecisionCase[] }) {
  if (!cases.length) return null;

  const queue = [...cases]
    .sort((a, b) => urgencyScore(b) - urgencyScore(a))
    .slice(0, 3);
  const stopCount = cases.filter((item) => item.preSignGate.level === "stop").length;
  const cannotPayCount = cases.filter((item) => !item.preSignGate.canPay).length;

  const headline =
    stopCount > 0
      ? `${stopCount} 套房仍不适合直接付款或签约`
      : cannotPayCount > 0
        ? `${cannotPayCount} 套房还不能直接付款`
        : "当前没有明显需要暂停的房源";

  return (
    <section>
      <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-md bg-primary/15 text-primary">
            <ClipboardList className="h-5 w-5" />
          </div>
          <p className="text-sm text-primary/80">当前优先顺序</p>
          <h2 className="mt-2 text-xl font-semibold tracking-normal">现在最该确认什么</h2>
          <p className="mt-2 max-w-3xl text-sm leading-7 text-muted-foreground">
            {headline}。优先处理付款、签约和信息仍不清楚的房源。
          </p>
        </div>
      </div>

      <div className="grid gap-3">
        {queue.map((item, index) => {
          const priority = priorityStyle[item.nextBestAction.priority];
          const Icon = priority.icon;

          return (
            <article
              key={item.id}
              className="rounded-lg border border-border bg-card p-5"
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/15 text-sm font-semibold text-primary">
                      {index + 1}
                    </span>
                    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs ${priority.className}`}>
                      <Icon className="h-3.5 w-3.5" />
                      {priority.label}
                    </span>
                    <span className="rounded-full border border-border bg-secondary px-2.5 py-1 text-xs text-muted-foreground">
                      {gateCopy(item)}
                    </span>
                  </div>

                  <h3 className="mt-3 text-lg font-semibold tracking-normal">
                    {item.title}
                  </h3>
                  <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
                    {item.address}
                  </p>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">
                    当前事项：{item.nextBestAction.label}。{item.nextBestAction.reason}
                  </p>
                </div>

                <Button asChild className="shrink-0">
                  <Link href={item.nextBestAction.href}>
                    继续确认
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>

              <div className="mt-4 rounded-md border border-border bg-secondary/55 p-3">
                <p className="text-xs text-muted-foreground">付款或签约前先确认</p>
                <p className="mt-1 text-sm leading-6 text-foreground">
                  {item.nextBestAction.stopRule}
                </p>
                <Link
                  href={item.reportHref}
                  className="mt-2 inline-flex text-sm font-medium text-primary underline-offset-4 hover:underline"
                >
                  回看报告
                </Link>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
