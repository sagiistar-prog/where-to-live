import Link from "next/link";
import {
  ArrowRight,
  BadgeDollarSign,
  CheckCircle2,
  CircleDashed,
  ClipboardCheck,
  Home,
  MapPinned,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { DecisionCase } from "@/lib/decision-case";
import type { CaseEvent, CaseEventType } from "@/lib/case-events";
import type { StoredReport } from "@/lib/server/report-store";

type JourneyStep = {
  id: string;
  title: string;
  description: string;
  href: string;
  cta: string;
  icon: LucideIcon;
  done: boolean;
};

type StepState = "done" | "current" | "next";

const stageStyles: Record<StepState, string> = {
  done: "border-emerald-200 bg-emerald-50/70",
  current: "border-primary/35 bg-primary/10",
  next: "border-border bg-card/70",
};

const stateLabels: Record<StepState, string> = {
  done: "已确认",
  current: "现在确认",
  next: "稍后再看",
};

function hasAnyEvent(cases: DecisionCase[], types: CaseEventType[]) {
  return cases.some((item) =>
    item.completedEvents.some((event) => types.includes(event.type)),
  );
}

function hasAnySavedEvent(events: CaseEvent[], types: CaseEventType[]) {
  return events.some((event) => types.includes(event.type));
}

function getStepState(steps: JourneyStep[], index: number): StepState {
  if (steps[index]?.done) return "done";
  const firstOpenIndex = steps.findIndex((step) => !step.done);
  return index === firstOpenIndex ? "current" : "next";
}

function gateRank(item: DecisionCase) {
  if (item.preSignGate.level === "stop") return 0;
  if (item.preSignGate.level === "review") return 1;
  return 2;
}

function pickFocusCase(cases: DecisionCase[]) {
  return [...cases].sort((a, b) => {
    const gateDiff = gateRank(a) - gateRank(b);
    if (gateDiff !== 0) return gateDiff;
    return b.lifecycleGate.blockedCount - a.lifecycleGate.blockedCount;
  })[0];
}

export function DashboardJourneyOverview({
  reports,
  cases,
  caseEvents,
}: {
  reports: StoredReport[];
  cases: DecisionCase[];
  caseEvents: CaseEvent[];
}) {
  const hasReport = reports.length > 0;
  const hasCityContext = reports.some(
    (report) => report.inputSummary?.city || report.inputSummary?.budget,
  );
  const cityDone =
    hasCityContext ||
    hasAnyEvent(cases, ["city", "buy"]) ||
    hasAnySavedEvent(caseEvents, ["city", "buy"]);
  const areaDone =
    hasAnyEvent(cases, ["area", "commute", "life"]) ||
    hasAnySavedEvent(caseEvents, ["area", "commute", "life"]);
  const preSignDone =
    hasAnyEvent(cases, ["visit", "official", "evidence", "payment", "contract", "safety", "shared"]) ||
    hasAnySavedEvent(caseEvents, ["visit", "official", "evidence", "payment", "contract", "safety", "shared"]) ||
    cases.some((item) => item.preSignGate.progress >= 60);
  const lifecycleDone =
    hasAnyEvent(cases, ["move", "handover", "repair", "renewal", "deposit"]) ||
    hasAnySavedEvent(caseEvents, ["move", "handover", "repair", "renewal", "deposit"]) ||
    cases.some((item) => item.lifecycleGate.completedCount > 0);
  const focusCase = pickFocusCase(cases);

  const steps: JourneyStep[] = [
    {
      id: "city",
      title: "城市成本",
      description: "先看税后收入、租金红线、日常开销和储蓄空间，判断这座城市值不值得留下。",
      href: "/city",
      cta: "算城市成本",
      icon: MapPinned,
      done: cityDone,
    },
    {
      id: "area",
      title: "片区与通勤",
      description: "把工作地点、预算、晚归路线、买菜就医和通勤时间放在一起比较。",
      href: "/area",
      cta: "比较片区",
      icon: Home,
      done: areaDone,
    },
    {
      id: "analyze",
      title: "房源评估",
      description: "录入候选房源，形成可回看的报告、风险提醒和下一步建议。",
      href: "/analyze",
      cta: "评估房源",
      icon: ClipboardCheck,
      done: hasReport,
    },
    {
      id: "payment",
      title: "付款签约",
      description: "确认出租权、收款主体、合同、退款条件和凭据材料，再决定要不要付钱签字。",
      href: "/payment",
      cta: "付款前确认",
      icon: BadgeDollarSign,
      done: preSignDone,
    },
    {
      id: "move",
      title: "入住退租",
      description: "继续确认交割、维修、续租和押金返还，避免入住后才发现责任说不清。",
      href: "/move",
      cta: "入住退租",
      icon: ShieldCheck,
      done: lifecycleDone,
    },
  ];

  const doneCount = steps.filter((step) => step.done).length;
  const progress = Math.round((doneCount / steps.length) * 100);
  const currentStep = steps.find((step) => !step.done) ?? steps[steps.length - 1];
  const primaryHref = focusCase?.nextBestAction.href ?? currentStep.href;
  const primaryLabel = focusCase?.nextBestAction.label ?? currentStep.cta;
  const paymentBoundary =
    focusCase?.nextBestAction.stopRule ??
    "付款前先确认出租权、收款主体、合同条款、退款条件和基础凭据。";

  return (
    <section className="rounded-lg border border-border bg-card p-5 sm:p-6">
      <div className="grid gap-6 xl:grid-cols-[0.34fr_0.66fr]">
        <div className="min-w-0">
          <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-md bg-primary/15 text-primary">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <p className="text-sm text-primary/80">
            居住选择总览
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-normal">
            从换城市到押金返还，按一条主线判断
          </h2>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">
            住哪儿帮助年轻人在关键时刻少走弯路：先判断城市和生活成本，再比较片区与房源，最后确认付款、签约、入住和退租边界。
          </p>

          <div className="mt-5 rounded-md border border-primary/20 bg-primary/10 p-4">
            <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
              <span>当前确认情况</span>
              <span>{doneCount} / {steps.length}</span>
            </div>
            <Progress value={progress} />
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              当前建议：{primaryLabel}。{focusCase ? `优先确认「${focusCase.title}」这套房。` : currentStep.description}
            </p>
          </div>

          <div className="mt-4 rounded-md border border-amber-200 bg-amber-50/70 p-4 text-sm leading-6 text-amber-900">
            付款底线：{paymentBoundary}
          </div>

          <div className="mt-5 flex flex-col gap-2 sm:flex-row">
            <Button asChild>
              <Link href={primaryHref}>
                {primaryLabel}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href="/case">查看房源记录</Link>
            </Button>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-5">
          {steps.map((step, index) => {
            const state = getStepState(steps, index);
            const Icon = step.icon;
            const StateIcon = state === "done" ? CheckCircle2 : CircleDashed;

            return (
              <Link
                key={step.id}
                href={step.href}
                className={`group flex min-h-[220px] flex-col rounded-md border p-4 transition-colors hover:border-primary/45 hover:bg-primary/10 ${stageStyles[state]}`}
              >
                <div className="mb-4 flex items-start justify-between gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-md bg-background/70 text-primary">
                    <Icon className="h-5 w-5" />
                  </span>
                    <span className="inline-flex items-center gap-1 rounded-full border border-border bg-background/70 px-2 py-1 text-[11px] text-muted-foreground">
                    <StateIcon className="h-3 w-3" />
                    {stateLabels[state]}
                  </span>
                </div>
                <h3 className="text-base font-semibold transition-colors group-hover:text-primary">
                  {step.title}
                </h3>
                <p className="mt-2 line-clamp-4 text-xs leading-5 text-muted-foreground">
                  {step.description}
                </p>
                <span className="mt-auto inline-flex items-center pt-4 text-xs font-medium text-primary">
                  {step.cta}
                  <ArrowRight className="ml-1 h-3.5 w-3.5" />
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
