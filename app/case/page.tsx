import Link from "next/link";
import {
  ArrowRight,
  BadgeDollarSign,
  CheckCircle2,
  ClipboardCheck,
  FolderKanban,
  MapPinned,
  WalletCards,
  type LucideIcon,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { DecisionCaseBoard } from "@/components/decision-case-board";
import { StandaloneDecisionRecords } from "@/components/standalone-decision-records";
import { Button } from "@/components/ui/button";
import { buildDecisionCases } from "@/lib/decision-case";
import { listCaseEvents } from "@/lib/server/case-event-store";
import { getCurrentOwnerId } from "@/lib/server/current-owner";
import { listReports } from "@/lib/server/report-store";

export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;

const firstCaseSteps: Array<{
  icon: LucideIcon;
  title: string;
  description: string;
}> = [
  {
    icon: MapPinned,
    title: "输入核心信息",
    description: "先填位置、月租、工作地和主要顾虑，选填内容可以之后再补。",
  },
  {
    icon: ClipboardCheck,
    title: "保存判断记录",
    description: "系统会保留结论、主要风险和需要继续确认的事项。",
  },
  {
    icon: WalletCards,
    title: "付款咨询",
    description: "准备交定金或签约前，先确认合同、收款主体和退款条件。",
  },
];

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function CasePage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const focusId = firstParam(params?.reportId);
  const ownerId = await getCurrentOwnerId();
  const [reports, events] = await Promise.all([listReports(ownerId), listCaseEvents(ownerId)]);
  const cases = buildDecisionCases(reports, events);
  const hasCases = cases.length > 0;
  const cannotPayCount = cases.filter((item) => !item.preSignGate.canPay).length;
  const readyCount = cases.filter((item) => item.preSignGate.canSign).length;

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-7xl min-w-0 space-y-8 overflow-x-hidden">
        <section className="border-b border-border pb-6">
          <div className={`grid gap-5 ${hasCases ? "lg:grid-cols-[minmax(0,1fr)_340px] lg:items-end" : ""}`}>
          <div className="min-w-0">
            <p className="text-sm text-primary">房源记录</p>
            <h1 className="mt-3 max-w-4xl text-3xl font-semibold leading-tight tracking-normal sm:text-4xl">
              {hasCases ? "每套候选房都要有明确结论" : "从第一套候选房源开始"}
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-muted-foreground">
              {hasCases
                ? "把房源体检、片区、付款咨询和合同确认放到同一条记录里，判断哪套可以继续，哪套不适合直接付款或签约。"
                : "输入一套正在考虑的房源，判断租金、通勤、居住风险和付款前事项。保存后再做对比和补充确认。"}
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Button asChild>
                <Link href="/analyze">
                  {hasCases ? "新增候选房源" : "评估第一套房源"}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              {hasCases ? (
                <Button asChild variant="secondary">
                  <Link href="/compare">多房源对比</Link>
                </Button>
              ) : (
                <Button asChild variant="secondary">
                  <Link href="/start?prompt=我正在纠结第一套房，想判断值不值得继续谈">
                    快速应答
                  </Link>
                </Button>
              )}
            </div>
          </div>

          {hasCases ? (
            <div className="grid gap-2">
              <CaseHeroMetric icon={FolderKanban} label="候选房源" value={`${cases.length} 套`} />
              <CaseHeroMetric icon={BadgeDollarSign} label="不建议直接付款" value={`${cannotPayCount} 套`} />
              <CaseHeroMetric icon={CheckCircle2} label="可做签约前确认" value={`${readyCount} 套`} />
            </div>
          ) : null}
          </div>
        </section>

        <StandaloneDecisionRecords events={events} reports={reports} />

        {!hasCases ? (
          <section className="rounded-lg border border-border bg-card/80 p-5 shadow-[0_24px_80px_oklch(var(--foreground)/0.06)] sm:p-6">
            <div className="max-w-3xl">
              <p className="text-sm text-primary">首次使用</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-normal">第一套房源只需要先完成核心判断</h2>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">
                不需要一次填完所有材料。先保存一套正在考虑的房源，再从同一条记录继续做片区、付款、合同和退租相关确认。
              </p>
            </div>
            <div className="mt-5 grid gap-3 md:grid-cols-3">
              {firstCaseSteps.map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.title} className="rounded-md border border-border bg-secondary/55 p-4">
                    <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/15 text-primary">
                      <Icon className="h-4 w-4" />
                    </span>
                    <h3 className="mt-4 text-sm font-semibold">{item.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.description}</p>
                  </div>
                );
              })}
            </div>
          </section>
        ) : null}

        <DecisionCaseBoard cases={cases} focusId={focusId} />
      </div>
    </AppShell>
  );
}

function CaseHeroMetric({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof FolderKanban;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-secondary/60 p-3">
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/15 text-primary">
          <Icon className="h-4 w-4" />
        </span>
        <span className="text-sm text-muted-foreground">{label}</span>
      </div>
      <span className="text-lg font-semibold">{value}</span>
    </div>
  );
}
