import Link from "next/link";
import {
  ArrowRight,
  BadgeDollarSign,
  BriefcaseBusiness,
  CheckCircle2,
  Clock3,
  FileWarning,
  MapPinned,
  ReceiptText,
  ShieldAlert,
  Wrench,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { CaseEvent } from "@/lib/case-events";
import { buildFlowHref, compactContext } from "@/lib/flow-links";
import type { StoredReport } from "@/lib/server/report-store";

type DashboardValueProofProps = {
  reports: StoredReport[];
  caseEvents: CaseEvent[];
};

function extractNumbers(text: string) {
  return Array.from(text.matchAll(/\d{2,6}/g)).map((match) => Number(match[0]));
}

function inferRent(report: StoredReport) {
  const fromInput = Number(String(report.inputSummary?.rent ?? "").replace(/[^\d]/g, ""));
  if (fromInput >= 500) return fromInput;

  const text = [report.report.conclusion, ...report.report.livingCost.points].join(" ");
  const direct = text.match(/(?:房租|月租)\s*(\d{3,5})\s*元/);
  if (direct) return Number(direct[1]);

  return extractNumbers(text).find((value) => value >= 1000 && value <= 50000) ?? 5200;
}

function inferTrueMonthlyCost(report: StoredReport, rent: number) {
  const text = report.report.livingCost.points.join(" ");
  const numbers = extractNumbers(text).filter((value) => value >= rent && value <= 50000);
  return numbers.length ? Math.max(...numbers) : Math.round(rent * 1.16);
}

function inferCommuteMinutes(report: StoredReport) {
  const text = report.report.commute.points.join(" ");
  const range = text.match(/(\d{2,3})\s*-\s*(\d{2,3})\s*分钟/);
  if (range) return Math.round((Number(range[1]) + Number(range[2])) / 2);
  const single = text.match(/(\d{2,3})\s*分钟/);
  return single ? Number(single[1]) : 40;
}

function formatMoney(value: number) {
  return `${Math.round(value).toLocaleString("zh-CN")} 元`;
}

function latestReport(reports: StoredReport[]) {
  return [...reports].sort(
    (a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime(),
  )[0];
}

function buildReportToolHref(
  pathname: string,
  report: StoredReport | undefined,
  extra: Record<string, string | number | undefined> = {},
) {
  if (!report) return pathname;

  return buildFlowHref(pathname, {
    from: "dashboard",
    reportId: report.id,
    title: report.summary.title,
    listingTitle: report.summary.title,
    city: report.inputSummary?.city,
    address: report.summary.address || report.inputSummary?.address,
    reportContext: compactContext([
      `来自工作台输入：${report.summary.title}`,
      report.summary.address,
      report.summary.conclusion,
    ]),
    ...extra,
  });
}

const eventTypeCopy: Record<CaseEvent["type"], string> = {
  plan: "下一步",
  city: "城市成本",
  area: "片区筛选",
  commute: "通勤成本",
  life: "生活配套",
  buy: "买房压力",
  visit: "看房清单",
  official: "官方查询",
  evidence: "凭据材料",
  payment: "付款前确认",
  contract: "合同确认",
  safety: "独居安全",
  shared: "合租规则",
  move: "入住预算",
  handover: "交割确认",
  repair: "维修责任",
  renewal: "续租涨租",
  deposit: "押金退还",
};

const eventTypeHref: Record<CaseEvent["type"], string> = {
  plan: "/plan",
  city: "/city",
  area: "/area",
  commute: "/commute",
  life: "/life",
  buy: "/buy",
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

const statusCopy: Record<CaseEvent["status"], { label: string; className: string }> = {
  recommend: {
    label: "已通过",
    className: "border-emerald-300/25 bg-emerald-300/10 text-emerald-700",
  },
  caution: {
    label: "需确认",
    className: "border-amber-300/25 bg-amber-300/10 text-amber-700",
  },
  reject: {
    label: "不建议继续",
    className: "border-rose-300/25 bg-rose-300/10 text-rose-700",
  },
};

function eventHref(event: CaseEvent) {
  return event.href || eventTypeHref[event.type] || "/case";
}

function countByTypes(events: CaseEvent[], types: CaseEvent["type"][]) {
  const typeSet = new Set(types);
  return events.filter((event) => typeSet.has(event.type)).length;
}

function latestEvents(events: CaseEvent[], max = 4) {
  return [...events]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, max);
}

export function DashboardValueProof({ reports, caseEvents }: DashboardValueProofProps) {
  const analyzedCount = reports.length;
  const focusReport = latestReport(reports);
  const focusRent = focusReport ? inferRent(focusReport) : 0;
  const cautionCount = reports.filter((report) => report.summary.status === "caution").length;
  const rejectCount = reports.filter((report) => report.summary.status === "reject").length;
  const riskReportCount = cautionCount + rejectCount;
  const linkedEventCount = caseEvents.length;
  const completedEventCount = caseEvents.filter((event) => event.status === "recommend").length;
  const eventProgress = linkedEventCount
    ? Math.round((completedEventCount / linkedEventCount) * 100)
    : 0;
  const attentionEventCount = caseEvents.filter((event) => event.status === "caution").length;
  const blockedEventCount = caseEvents.filter((event) => event.status === "reject").length;
  const upstreamEventCount = countByTypes(caseEvents, ["city", "area", "commute", "life", "buy"]);
  const preSignEventCount = countByTypes(caseEvents, [
    "visit",
    "official",
    "evidence",
    "payment",
    "contract",
    "safety",
    "shared",
  ]);
  const lifecycleEventCount = countByTypes(caseEvents, [
    "move",
    "handover",
    "repair",
    "renewal",
    "deposit",
  ]);
  const areaEventCount = caseEvents.filter((event) => event.type === "area").length;
  const recentSignals = latestEvents(caseEvents);

  const hiddenMonthlyExposure = reports.reduce((sum, report) => {
    const rent = inferRent(report);
    return sum + Math.max(inferTrueMonthlyCost(report, rent) - rent, 0);
  }, 0);

  const monthlyCommuteHours = reports.reduce((sum, report) => {
    const minutes = inferCommuteMinutes(report);
    return sum + Math.round((minutes * 2 * 22) / 60);
  }, 0);

  const depositExposure = reports.reduce((sum, report) => {
    const rent = inferRent(report);
    const multiplier = report.summary.status === "reject" ? 1.2 : report.summary.status === "caution" ? 1 : 0.65;
    return sum + Math.round(rent * multiplier);
  }, 0);

  const metrics = [
    {
      label: "已评估房源",
      value: `${analyzedCount} 套`,
      detail: riskReportCount ? `${riskReportCount} 套需要谨慎或淘汰` : "继续评估房源后会累计风险金额",
      icon: BriefcaseBusiness,
    },
    {
      label: "隐藏月成本",
      value: formatMoney(hiddenMonthlyExposure),
      detail: "按真实月成本和名义房租差额估算，不等于已节省金额。",
      icon: ReceiptText,
    },
    {
      label: "月通勤时间账",
      value: `${monthlyCommuteHours} 小时`,
      detail: "按已保存报告的单程通勤估算，帮助判断便宜房租是否划算。",
      icon: Clock3,
    },
    {
      label: "押金/付款风险",
      value: formatMoney(depositExposure),
      detail: "用于提醒签约前材料、付款主体、交割凭据还没确认清楚的资金风险。",
      icon: ShieldAlert,
    },
  ];
  const valueTracks = [
    {
      label: "少走弯路",
      value: `${upstreamEventCount} 次`,
      detail: areaEventCount
        ? `已保存 ${areaEventCount} 次片区筛选，把优先约看、可以备选和先不约看的判断带回记录。`
        : "还没有保存片区筛选结果；容易把周末花在不合适的片区。",
      href: buildReportToolHref("/area", focusReport, {
        workplace: focusReport?.inputSummary?.workplace,
        budget: focusReport?.inputSummary?.budget ?? String(focusRent),
        commuteLimit: focusReport?.inputSummary?.commuteLimit,
        candidateAreas: focusReport?.summary.address || focusReport?.inputSummary?.address,
      }),
      icon: MapPinned,
    },
    {
      label: "少冒险付款",
      value: `${preSignEventCount} 次`,
      detail: blockedEventCount || attentionEventCount
        ? `${blockedEventCount} 个不建议继续、${attentionEventCount} 个需要确认已被记录。`
        : "签约前确认会把官方查询、凭据、付款和合同风险留在同一记录。",
      href: focusReport ? `/case?reportId=${encodeURIComponent(focusReport.id)}` : "/case",
      icon: FileWarning,
    },
    {
      label: "少留退租争议",
      value: `${lifecycleEventCount} 次`,
      detail: lifecycleEventCount
        ? "入住预算、交割、维修、续租或押金事项已开始形成凭据记录。"
        : "入住后的事项还没有保存记录；交割、维修和押金仍可能散落在聊天记录里。",
      href: buildReportToolHref("/move", focusReport, {
        monthlyRent: String(focusRent || ""),
        rent: String(focusRent || ""),
        upfrontCost: focusRent ? String(focusRent * 2) : undefined,
      }),
      icon: Wrench,
    },
  ];

  return (
    <Card className="p-6">
      <div className="grid gap-6 xl:grid-cols-[0.7fr_0.3fr]">
        <div className="min-w-0">
          <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm text-primary/80">
                成本与风险
              </p>
              <h2 className="mt-2 text-2xl font-semibold">风险与确认账本</h2>
              <p className="mt-2 max-w-3xl text-sm leading-7 text-muted-foreground">
                这里展示已发现的风险和已确认的关键事项，让你在付款和签约前知道哪里不能跳步。
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button asChild>
                <Link href="/compare">
                  进入真实对比
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="secondary">
                <Link href="/case">查看房源记录</Link>
              </Button>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {metrics.map((metric) => {
              const Icon = metric.icon;
              return (
                <div key={metric.label} className="rounded-md border border-border bg-secondary/45 p-4">
                  <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-md bg-primary/15 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <p className="text-sm text-muted-foreground">{metric.label}</p>
                  <p className="mt-1 text-2xl font-semibold">{metric.value}</p>
                  <p className="mt-3 text-xs leading-5 text-muted-foreground">{metric.detail}</p>
                </div>
              );
            })}
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-3">
            {valueTracks.map((track) => {
              const Icon = track.icon;
              return (
                <Link
                  key={track.label}
                  href={track.href}
                  className="group rounded-md border border-border bg-secondary/60 p-4 transition-colors hover:bg-card"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/15 text-primary">
                      <Icon className="h-5 w-5" />
                    </div>
                    <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                  </div>
                  <p className="mt-4 text-sm text-muted-foreground">{track.label}</p>
                  <p className="mt-1 text-2xl font-semibold">{track.value}</p>
                  <p className="mt-3 text-xs leading-5 text-muted-foreground">{track.detail}</p>
                </Link>
              );
            })}
          </div>
        </div>

        <div className="rounded-md border border-border bg-background/45 p-4">
          <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-md bg-primary/15 text-primary">
            <BadgeDollarSign className="h-5 w-5" />
          </div>
          <h3 className="font-semibold">签约前事项保存</h3>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            看房、官方查询、凭据、付款、合同和入住后的确认结果，会继续保存到房源记录。
          </p>
          <div className="mt-5">
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="text-muted-foreground">已确认事项</span>
              <span className="font-medium">
                {completedEventCount} / {linkedEventCount || 0}
              </span>
            </div>
            <Progress value={eventProgress} />
          </div>

          <div className="mt-5 space-y-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              <h4 className="text-sm font-semibold">最近保存的判断</h4>
            </div>
            {recentSignals.length ? (
              <div className="space-y-2">
                {recentSignals.map((event) => {
                  const status = statusCopy[event.status];
                  return (
                    <Link
                      key={event.id}
                      href={eventHref(event)}
                      className="block rounded-md border border-border bg-secondary/60 p-3 transition-colors hover:bg-card"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-medium text-foreground/90">
                          {eventTypeCopy[event.type]}
                        </span>
                        <span className={`rounded-full border px-2 py-0.5 text-[11px] ${status.className}`}>
                          {status.label}
                        </span>
                      </div>
                      <p className="mt-2 line-clamp-2 text-xs leading-5 text-muted-foreground">
                        {event.summary}
                      </p>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-md border border-border bg-secondary/60 p-3 text-xs leading-5 text-muted-foreground">
                还没有保存过判断结果。确认片区筛选、通勤成本、凭据材料或付款前条件后，这里会显示最新判断。
              </div>
            )}
          </div>

          <div className="mt-5 rounded-md border border-amber-300/20 bg-amber-300/10 p-3 text-xs leading-5 text-amber-700">
            住哪儿会讲清可能损失的钱、会消耗的时间、必须补充的凭据，让每一步都有判断理由。
          </div>
        </div>
      </div>
    </Card>
  );
}

