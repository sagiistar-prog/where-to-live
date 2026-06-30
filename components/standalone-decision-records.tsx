import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  CircleAlert,
  ClipboardList,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { caseEventLabels, type CaseEvent, type CaseEventType } from "@/lib/case-events";
import type { ReportStatus } from "@/lib/mock-data";
import type { StoredReport } from "@/lib/server/report-store";

const workspaceRecordId = "workspace";

const eventTypeHref: Record<CaseEventType, string> = {
  plan: "/plan",
  city: "/city",
  area: "/area",
  commute: "/commute",
  life: "/life",
  visit: "/visit",
  official: "/official",
  evidence: "/evidence",
  payment: "/payment",
  contract: "/contract",
  safety: "/safety",
  shared: "/shared",
  move: "/move",
  handover: "/handover",
  repair: "/repair",
  renewal: "/renewal",
  deposit: "/deposit",
};

const statusCopy: Record<
  ReportStatus,
  { label: string; className: string; icon: LucideIcon }
> = {
  recommend: {
    label: "已确认",
    className: "border-emerald-300/30 bg-emerald-300/10 text-emerald-700",
    icon: CheckCircle2,
  },
  caution: {
    label: "需要确认",
    className: "border-amber-300/30 bg-amber-300/10 text-amber-700",
    icon: CircleAlert,
  },
  reject: {
    label: "不建议继续",
    className: "border-rose-300/30 bg-rose-300/10 text-rose-700",
    icon: CircleAlert,
  },
};

function formatTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function eventHref(event: CaseEvent) {
  return event.href || eventTypeHref[event.type] || "/case";
}

function pickUnlinkedEvents(events: CaseEvent[], reports: StoredReport[]) {
  const reportIds = new Set(reports.map((report) => report.id));

  return events
    .filter(
      (event) =>
        event.reportId === workspaceRecordId || !reportIds.has(event.reportId),
    )
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
}

export function StandaloneDecisionRecords({
  events,
  reports,
}: {
  events: CaseEvent[];
  reports: StoredReport[];
}) {
  const unlinkedEvents = pickUnlinkedEvents(events, reports);

  if (!unlinkedEvents.length) return null;

  const confirmedCount = unlinkedEvents.filter(
    (event) => event.status === "recommend",
  ).length;
  const reviewCount = unlinkedEvents.filter(
    (event) => event.status === "caution",
  ).length;
  const blockedCount = unlinkedEvents.filter(
    (event) => event.status === "reject",
  ).length;

  return (
    <Card className="overflow-hidden p-5 sm:p-6">
      <div className="grid gap-6 xl:grid-cols-[0.34fr_0.66fr]">
        <div>
          <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-md bg-primary/15 text-primary">
            <ClipboardList className="h-5 w-5" />
          </div>
          <p className="text-sm text-primary/80">
            判断记录
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-normal">
            已保存的判断
          </h2>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">
            城市、片区、买房、付款和合同判断会保存在这里。需要继续处理时，直接打开对应记录。
          </p>

          <div className="mt-5 grid grid-cols-3 gap-2">
            <DecisionRecordMetric label="已确认" value={confirmedCount} />
            <DecisionRecordMetric label="需确认" value={reviewCount} />
            <DecisionRecordMetric label="不建议" value={blockedCount} />
          </div>

          <div className="mt-5 flex flex-col gap-2 sm:flex-row">
            <Button asChild>
              <Link href="/city">
                继续生活成本
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href="/city?mode=buy">买房大致判断</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/analyze">房源体检</Link>
            </Button>
          </div>
        </div>

        <div className="grid gap-3 lg:grid-cols-2">
          {unlinkedEvents.slice(0, 6).map((event) => {
            const status = statusCopy[event.status];
            const Icon = status.icon;

            return (
              <Link
                key={event.id}
                href={eventHref(event)}
                className="group flex min-h-[168px] flex-col rounded-md border border-border bg-secondary/70 p-4 transition-all hover:-translate-y-0.5 hover:border-primary/35 hover:bg-card hover:shadow-[0_18px_50px_oklch(var(--foreground)/0.08)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="mb-3 flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-border bg-background/60 px-2 py-0.5 text-[11px] text-muted-foreground">
                        {caseEventLabels[event.type]}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] ${status.className}`}
                      >
                        <Icon className="h-3 w-3" />
                        {status.label}
                      </span>
                    </div>
                    <h3 className="line-clamp-2 text-base font-semibold tracking-normal">
                      {event.title}
                    </h3>
                  </div>
                  <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                </div>
                <p className="mt-3 line-clamp-3 text-sm leading-6 text-muted-foreground">
                  {event.summary}
                </p>
                <div className="mt-auto flex items-center justify-between gap-3 pt-4 text-xs text-muted-foreground">
                  <span>{formatTime(event.createdAt)}</span>
                  <span className="font-medium text-primary">继续确认</span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </Card>
  );
}

function DecisionRecordMetric({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-md border border-border bg-secondary/70 p-3">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  );
}

