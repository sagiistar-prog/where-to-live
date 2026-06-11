import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  ClipboardList,
  ShieldAlert,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { DecisionCase, DecisionCasePriority } from "@/lib/decision-case";

const priorityStyle: Record<
  DecisionCasePriority,
  { label: string; className: string; icon: LucideIcon }
> = {
  blocker: {
    label: "必须先确认",
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
  return "先别付款，也先别签约";
}

export function CaseTriageQueue({ cases }: { cases: DecisionCase[] }) {
  if (!cases.length) return null;

  const queue = [...cases]
    .sort((a, b) => urgencyScore(b) - urgencyScore(a))
    .slice(0, 3);
  const stopCount = cases.filter((item) => item.preSignGate.level === "stop").length;
  const cannotPayCount = cases.filter((item) => !item.preSignGate.canPay).length;
  const lowConfidenceCount = cases.filter(
    (item) => item.dataConfidence.level === "limited" || item.dataConfidence.level === "review",
  ).length;
  const lifecycleBlockedCount = cases.reduce(
    (total, item) => total + item.lifecycleGate.blockedCount,
    0,
  );
  const planEventCount = cases.filter((item) =>
    item.completedEvents.some((event) => event.type === "plan"),
  ).length;

  const headline =
    stopCount > 0
      ? `${stopCount} 套房仍不适合直接付款或签约`
      : cannotPayCount > 0
        ? `${cannotPayCount} 套房还不能直接付款`
        : "当前没有明显付款前要确认的事项";

  return (
    <section className="grid gap-4 xl:grid-cols-[0.36fr_0.64fr]">
      <div className="rounded-lg border border-border bg-card p-5">
        <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-md bg-primary/15 text-primary">
          <ClipboardList className="h-5 w-5" />
        </div>
        <p className="text-sm text-primary/80">
          当前优先顺序
        </p>
        <h2 className="mt-2 text-xl font-semibold tracking-normal">
          现在最该确认什么
        </h2>
        <p className="mt-3 text-sm leading-7 text-muted-foreground">
          {headline}。这里把付款签约风险、信息是否够用、居住关注点和入住后争议放在一起看，避免用户只被租金或通勤优势带着走。
        </p>

        <div className="mt-5 grid gap-3">
          <TriageFact label="不可直接付款" value={`${cannotPayCount} 套`} />
          <TriageFact label="信息需再确认" value={`${lowConfidenceCount} 套`} />
          <TriageFact label="已有下一步" value={`${planEventCount} 套`} />
          <TriageFact label="入住后要确认" value={`${lifecycleBlockedCount} 项`} />
        </div>

        <div className="mt-5 rounded-md border border-amber-200 bg-amber-50/70 p-3 text-xs leading-5 text-amber-900">
          付款底线：官方查询、凭据材料、付款前确认、合同确认或独居/合租安全确认没有做好前，不要用“房东催了”“价格便宜”“位置不错”作为付款理由。
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
                    现在先做：{item.nextBestAction.label}。{item.nextBestAction.reason}
                  </p>
                </div>

                <div className="grid shrink-0 grid-cols-2 gap-2 sm:min-w-[260px]">
                  <QueueMiniMetric
                    label="签约前确认"
                    value={`${item.preSignGate.progress}%`}
                    ok={item.preSignGate.level === "ready"}
                  />
                  <QueueMiniMetric
                    label="信息是否够用"
                    value={item.dataConfidence.score ? `${item.dataConfidence.score}%` : "-"}
                    ok={item.dataConfidence.level === "ready"}
                  />
                </div>
              </div>

              <div className="mt-4 grid gap-3 lg:grid-cols-3">
                <DecisionFact label="为什么做" value={item.nextBestAction.intent} />
                <DecisionFact label="确认到什么程度" value={item.nextBestAction.doneCriteria} />
                <DecisionFact label="付款底线" value={item.nextBestAction.stopRule} strong />
              </div>

              <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_auto] lg:items-center">
                <div>
                  <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
                    <span>签约前材料</span>
                    <span>{item.preSignGate.progress}%</span>
                  </div>
                  <Progress value={item.preSignGate.progress} className="bg-secondary" />
                </div>
                <div className="flex flex-col gap-2 sm:flex-row lg:justify-end">
                  <Button asChild>
                    <Link href={item.nextBestAction.href}>
                      继续确认
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                  <Button asChild variant="secondary">
                    <Link href={item.reportHref}>回看报告</Link>
                  </Button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function TriageFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-secondary/60 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
    </div>
  );
}

function QueueMiniMetric({
  label,
  value,
  ok,
}: {
  label: string;
  value: string;
  ok: boolean;
}) {
  return (
    <div className="rounded-md border border-border bg-secondary/60 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={ok ? "mt-1 font-semibold text-emerald-700" : "mt-1 font-semibold text-amber-700"}>
        {value}
      </p>
    </div>
  );
}

function DecisionFact({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div
      className={
        strong
          ? "rounded-md border border-rose-200 bg-rose-50/80 p-3"
          : "rounded-md border border-border bg-secondary/60 p-3"
      }
    >
      <p className={strong ? "text-xs text-rose-700/80" : "text-xs text-muted-foreground"}>
        {label}
      </p>
      <p className={strong ? "mt-1 line-clamp-3 text-xs leading-5 text-rose-900" : "mt-1 line-clamp-3 text-xs leading-5 text-foreground/85"}>
        {value}
      </p>
    </div>
  );
}
