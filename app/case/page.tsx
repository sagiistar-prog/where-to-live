import Link from "next/link";
import { ArrowRight, BadgeDollarSign, CheckCircle2, FolderKanban } from "lucide-react";
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
  const cannotPayCount = cases.filter((item) => !item.preSignGate.canPay).length;
  const readyCount = cases.filter((item) => item.preSignGate.canSign).length;

  return (
    <AppShell>
      <div className="mx-auto max-w-7xl space-y-8">
        <section className="grid gap-5 rounded-lg border border-border bg-card/80 p-5 shadow-[0_24px_80px_oklch(var(--foreground)/0.06)] lg:grid-cols-[minmax(0,1fr)_340px] lg:items-end">
          <div className="min-w-0">
            <p className="text-sm text-primary">房源记录</p>
            <h1 className="mt-3 max-w-4xl text-3xl font-semibold leading-tight tracking-normal sm:text-5xl">
              每一套候选房，都知道下一步该不该继续。
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-muted-foreground">
              城市成本、片区判断、看房确认、付款前确认、合同确认、交割维修和押金退还都会汇总到这里，帮你看清哪套房可以继续，哪套房先别付款签约。
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Button asChild>
                <Link href="/analyze">
                  新增候选房源
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="secondary">
                <Link href="/compare">多房源对比</Link>
              </Button>
            </div>
          </div>

          <div className="grid gap-2">
            <CaseHeroMetric icon={FolderKanban} label="候选房源" value={`${cases.length} 套`} />
            <CaseHeroMetric icon={BadgeDollarSign} label="先别直接付款" value={`${cannotPayCount} 套`} />
            <CaseHeroMetric icon={CheckCircle2} label="可做签约前确认" value={`${readyCount} 套`} />
          </div>
        </section>

        <StandaloneDecisionRecords events={events} reports={reports} />

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
