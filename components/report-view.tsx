import Link from "next/link";
import {
  ArrowRight,
  BriefcaseBusiness,
  CheckCircle2,
  ClipboardList,
  Gauge,
} from "lucide-react";
import { ReportExportActions } from "@/components/report-export-actions";
import { ReportValueLedger } from "@/components/report-value-ledger";
import { ReportSection } from "@/components/report-section";
import { RiskBadge } from "@/components/risk-badge";
import { SensitiveText } from "@/components/sensitive-text";
import { ScoreCard } from "@/components/score-card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { buildFlowHref } from "@/lib/flow-links";
import { reportSectionIcons, type ReportData } from "@/lib/mock-data";
import type { AnalysisPreflightResult } from "@/lib/analysis-preflight";
import type { DecisionCase } from "@/lib/decision-case";

type ReportViewProps = {
  report: ReportData;
  label?: string;
  generatedAt?: string;
  dataSources?: string[];
  dataQuality?: Array<{
    provider: "amap" | "qweather";
    feature: string;
    status: "live" | "fallback" | "missing_input" | "skipped_limit" | "failed";
    label: string;
    detail: string;
  }>;
  warnings?: string[];
  analysisPreflight?: AnalysisPreflightResult;
  reportId?: string;
  decisionCase?: DecisionCase;
};

type ReportNextAction = {
  label: string;
  reason: string;
  href: string;
  cta: string;
};

function statusLabel(status: ReportData["status"]) {
  if (status === "recommend") return "建议租";
  if (status === "reject") return "不建议租";
  return "谨慎考虑";
}

function inferVisitPreferences(report: ReportData) {
  const text = [
    report.conclusion,
    report.address,
    report.commute.points.join(" "),
    report.amenities.points.join(" "),
    report.lifeRadius?.points.join(" "),
    report.comfort.points.join(" "),
    report.contractRisk.points.join(" "),
  ].join(" ");
  const preferences = new Set<string>();

  if (/独居|夜间|晚归|楼道|门禁|安全/.test(text)) preferences.add("独居");
  if (/地铁|站点|最后一公里/.test(text)) preferences.add("必须近地铁");
  if (/潮湿|湿热|霉|返潮|低楼层/.test(text)) preferences.add("怕潮湿");
  if (/噪音|临街|主干道|油烟|垃圾清运|烧烤/.test(text)) preferences.add("怕吵");
  if (/买菜|做饭|厨房|菜场|商超/.test(text)) preferences.add("经常做饭");

  return Array.from(preferences);
}

function buildReportActionContext(report: ReportData) {
  const lifeRadius = report.lifeRadius?.points ?? [];
  return [
    "来自房源体检报告的现场确认重点：",
    ...report.commute.points.slice(0, 2),
    ...lifeRadius.slice(0, 4),
    ...report.livingCost.points.slice(0, 2),
    ...report.comfort.points.slice(0, 3),
    ...report.contractRisk.points.slice(0, 3),
  ]
    .join("\n")
    .slice(0, 1400);
}

function inferCity(report: ReportData) {
  return report.address.match(/([\u4e00-\u9fa5]{2,}市)/)?.[1] ?? "";
}

function inferMonthlyRent(report: ReportData) {
  const text = [report.conclusion, ...report.livingCost.points].join(" ");
  return text.match(/(?:房租|月租)?\s*(\d{3,5})\s*元/)?.[1] ?? "";
}

function inferLandlordType(report: ReportData) {
  const text = report.contractRisk.points.join(" ");
  if (/二房东|转租/.test(text)) return "二房东 / 代理";
  if (/中介|代理|委托/.test(text)) return "代理 / 中介";
  return "房东本人 / 待确认";
}

function appendReportId(params: URLSearchParams, reportId?: string) {
  if (reportId) params.set("reportId", reportId);
  return params;
}

function buildVisitHref(report: ReportData, reportId?: string) {
  const reportContext = buildReportActionContext(report);
  const params = appendReportId(new URLSearchParams({
    from: "report",
    title: report.title,
    city: inferCity(report),
    address: report.address,
    commute: report.commute.points[0] ?? "",
    description: report.conclusion.slice(0, 500),
    reportContext,
    preferences: inferVisitPreferences(report).join("、"),
  }), reportId);

  return `/visit?${params.toString()}`;
}

function buildLifeHref(report: ReportData, reportId?: string) {
  return buildFlowHref("/life", {
    from: "report",
    reportId,
    city: inferCity(report),
    listingTitle: report.title,
    notes: [
      report.lifeRadius?.points.slice(0, 2).join("；"),
      report.amenities.points.slice(0, 2).join("；"),
    ]
      .filter(Boolean)
      .join("；"),
    reportContext: buildReportActionContext(report),
  });
}

function buildEvidenceHref(report: ReportData, reportId?: string) {
  const rent = inferMonthlyRent(report);
  const params = appendReportId(new URLSearchParams({
    from: "report",
    stage: "签约前",
    title: report.title,
    city: inferCity(report),
    address: report.address,
    landlordType: inferLandlordType(report),
    deposit: rent ? `押金待确认，参考月租 ${rent} 元` : "押金和付款方式待确认",
    paymentCycle: "付款周期、收款主体和退款条件待确认",
    risks: "报告提示需要补充授权、押金、维修、付款和交割记录。",
    reportContext: buildReportActionContext(report),
  }), reportId);

  return `/evidence?${params.toString()}`;
}

function buildPaymentHref(report: ReportData, reportId?: string) {
  const rent = Number(inferMonthlyRent(report)) || 0;
  const suggestedHold = Math.min(Math.round(rent * 0.2), 1000);
  const params = appendReportId(new URLSearchParams({
    from: "report",
    city: inferCity(report),
    listingTitle: report.title,
    paymentType: "待确认付款",
    amount: suggestedHold ? String(suggestedHold) : "",
    monthlyRent: rent ? String(rent) : "",
    stage: "不确定",
    contractStatus: "不确定",
    identityStatus: "不确定",
    authorizationStatus: "不确定",
    payeeType: "不确定",
    payeeMatchesContract: "不确定",
    refundRule: "不确定",
    receiptStatus: "不确定",
    paymentChannel: "不确定",
    urgencyPressure: "不确定",
    notes: "来自房源体检报告：付款前需要确认合同、授权、收款主体和退款条件。",
    reportContext: buildReportActionContext(report),
  }), reportId);

  return `/payment?${params.toString()}`;
}

function buildCaseHref(report: ReportData, reportId?: string) {
  if (!reportId) return "/case";

  const params = new URLSearchParams({
    from: "report",
    reportId,
    currentTitle: report.title,
  });

  return `/case?${params.toString()}`;
}

function buildCompareHref(report: ReportData, reportId?: string) {
  const params = new URLSearchParams({
    from: "report",
    currentTitle: report.title,
    title: report.title,
    address: report.address,
    reportContext: buildReportActionContext(report),
  });

  if (reportId) params.set("reportId", reportId);

  return `/compare?${params.toString()}`;
}

export function ReportView({
  report,
  label = "房源报告",
  generatedAt,
  dataSources = [],
  warnings = [],
  analysisPreflight,
  reportId,
  decisionCase,
}: ReportViewProps) {
  const lifeRadius = report.lifeRadius ?? {
    title: "生活配套与夜间可用性",
    points: report.amenities.points,
  };
  const visitHref = buildVisitHref(report, reportId);
  const evidenceHref = buildEvidenceHref(report, reportId);
  const paymentHref = buildPaymentHref(report, reportId);
  const lifeHref = buildLifeHref(report, reportId);
  const caseHref = buildCaseHref(report, reportId);
  const compareHref = buildCompareHref(report, reportId);
  const nextBestAction = decisionCase?.nextBestAction;
  const reportNextAction = nextBestAction
    ? {
        label: nextBestAction.label,
        reason: nextBestAction.reason,
        href: nextBestAction.href,
        cta: "继续确认",
      }
    : report.status === "reject"
      ? {
          label: "不建议付款，先补充材料",
          reason:
            "这份报告已经出现明显不建议继续的信号。现在最重要的是不被催着付款，补充出租权、合同、收款主体和退款条件，再决定是否放弃或换房。",
          href: paymentHref,
          cta: "做付款咨询",
        }
      : report.status === "caution"
        ? {
            label: "确认现场并补充材料",
            reason:
              "这套房可以继续看，但需要把通勤、生活配套、现场问题和签约材料补充清楚。把风险变成看房和材料确认事项。",
            href: visitHref,
            cta: "整理看房清单",
          }
        : {
            label: "继续看房，并完成签约前确认",
            reason:
              "当前结论整体可以继续，但仍需要确认现场情况、材料和付款条件，避免好房源在签约环节出问题。",
            href: visitHref,
            cta: "整理看房清单",
          };
  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <ReportDecisionCanvas
        report={report}
        label={label}
        generatedAt={generatedAt}
        dataSources={dataSources}
        warnings={warnings}
        analysisPreflight={analysisPreflight}
        decisionCase={decisionCase}
        caseHref={caseHref}
        compareHref={compareHref}
        reportNextAction={reportNextAction}
      />

      <details className="rounded-lg border border-border bg-card p-5">
        <summary className="cursor-pointer text-sm font-medium text-foreground">
          查看评分依据
        </summary>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
          评分只用于解释结论。正式决定仍要看通勤、真实月成本、付款风险和签约前确认。
        </p>
        <section className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-6">
          {report.scores.map((score) => (
            <ScoreCard key={score.label} {...score} />
          ))}
        </section>
      </details>

      <ReportValueLedger
        report={report}
        paymentHref={paymentHref}
        evidenceHref={evidenceHref}
      />

      {analysisPreflight ? <ReportConfidencePanel preflight={analysisPreflight} /> : null}

      <details className="rounded-lg border border-border bg-card p-5">
        <summary className="cursor-pointer text-sm font-medium text-foreground">
          为什么是这个结论
        </summary>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
          展开查看通勤、配套、居住舒适度、真实月成本、合同风险和现场确认问题。
        </p>

        <section className="mt-5 grid gap-4 lg:grid-cols-2">
          <ReportSection title="通勤时间" icon={reportSectionIcons.commute}>
            <BulletList items={report.commute.points} />
          </ReportSection>
          <ReportSection title="周边配套" icon={reportSectionIcons.amenities}>
            <BulletList items={report.amenities.points} />
          </ReportSection>
          <ReportSection title={lifeRadius.title} icon={reportSectionIcons.lifeRadius}>
            <BulletList items={lifeRadius.points} />
            <div className="mt-5 flex min-w-0 flex-col gap-3 rounded-md border border-border bg-secondary p-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm leading-6 text-muted-foreground">
                对买菜、医疗、快递、夜路和噪音仍不确定时，可以继续做更细的生活配套确认。
              </p>
              <Button asChild variant="outline" className="w-full shrink-0 sm:w-auto">
                <Link href={lifeHref}>
                  确认生活配套
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </ReportSection>
          <ReportSection title="天气与居住舒适度" icon={reportSectionIcons.comfort}>
            <BulletList items={report.comfort.points} />
          </ReportSection>
          <ReportSection title="真实月成本" icon={reportSectionIcons.money}>
            <BulletList items={report.livingCost.points} />
          </ReportSection>
          <ReportSection title="合同与签约风险提示" icon={reportSectionIcons.contractRisk}>
            <BulletList items={report.contractRisk.points} />
          </ReportSection>
        </section>

        <section className="mt-4 grid gap-4 lg:grid-cols-[0.48fr_0.52fr]">
          <ReportSection title="看房时必须确认的问题" icon={ClipboardList}>
            <div className="mb-4 flex min-w-0 flex-col gap-3 rounded-md border border-border bg-secondary p-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm leading-6 text-muted-foreground">
                把这些问题转成现场可勾选、可保存的确认清单。
              </p>
              <Button asChild variant="outline" className="w-full shrink-0 sm:w-auto">
                <Link href={visitHref}>
                  整理确认清单
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {report.visitChecklist.map((item) => (
                <div
                  key={item}
                  className="rounded-md border border-border bg-secondary/60 p-3 text-sm text-muted-foreground"
                >
                  <SensitiveText text={item} />
                </div>
              ))}
            </div>
          </ReportSection>
          <ReportSection title="最终建议" icon={CheckCircle2}>
            <SensitiveText
              as="p"
              text={report.finalAdvice}
              className="text-sm leading-7 text-muted-foreground"
            />
          </ReportSection>
        </section>
      </details>
    </div>
  );
}

function ReportDecisionCanvas({
  report,
  label,
  generatedAt,
  dataSources,
  warnings,
  analysisPreflight,
  decisionCase,
  caseHref,
  compareHref,
  reportNextAction,
}: {
  report: ReportData;
  label: string;
  generatedAt?: string;
  dataSources: string[];
  warnings: string[];
  analysisPreflight?: AnalysisPreflightResult;
  decisionCase?: DecisionCase;
  caseHref: string;
  compareHref: string;
  reportNextAction: ReportNextAction;
}) {
  const city = inferCity(report) || "候选城市";
  const lifeRadius = report.lifeRadius ?? report.amenities;
  const visibleChecks = [
    report.commute.points[0],
    lifeRadius.points[0],
    report.contractRisk.points[0],
  ].filter(Boolean);
  const pinItems = [
    { label: "工作地", value: report.commute.points[0] ?? "通勤待确认", className: "left-[16%] top-[24%]" },
    { label: "候选房源", value: report.address, className: "left-[46%] top-[44%]" },
    { label: "生活半径", value: lifeRadius.points[0] ?? "配套待确认", className: "left-[64%] top-[24%]" },
    { label: "签约风险", value: report.contractRisk.points[0] ?? "材料待确认", className: "left-[28%] top-[67%]" },
  ];

  return (
    <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_25rem]">
      <div className="min-w-0 overflow-hidden rounded-lg border border-border bg-card shadow-[0_24px_80px_oklch(var(--foreground)/0.08)]">
        <div className="relative min-h-[34rem] overflow-hidden bg-[oklch(0.946_0.007_155)]">
          <div className="absolute inset-0 opacity-80">
            <div className="absolute left-[-10%] top-[18%] h-px w-[120%] rotate-[10deg] bg-border" />
            <div className="absolute left-[-10%] top-[42%] h-px w-[120%] -rotate-[6deg] bg-border" />
            <div className="absolute left-[-10%] top-[70%] h-px w-[120%] rotate-[4deg] bg-border" />
            <div className="absolute left-[18%] top-[-20%] h-[140%] w-px rotate-[14deg] bg-border" />
            <div className="absolute left-[48%] top-[-20%] h-[140%] w-px -rotate-[11deg] bg-border" />
            <div className="absolute left-[74%] top-[-20%] h-[140%] w-px rotate-[8deg] bg-border" />
            <div className="absolute bottom-[-18%] left-[18%] h-48 w-72 rounded-full border border-primary/18 bg-primary/10" />
            <div className="absolute right-[-8%] top-[10%] h-56 w-56 rounded-full border border-border bg-card/35" />
          </div>

          <div className="absolute left-4 right-4 top-4 rounded-lg border border-border bg-card/90 p-4 shadow-[0_18px_48px_oklch(var(--foreground)/0.08)] backdrop-blur-xl sm:right-auto sm:max-w-[22rem]">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <RiskBadge status={report.status} />
              <span className="rounded-full border border-border bg-secondary/70 px-2.5 py-1 text-xs text-muted-foreground">
                {city}
              </span>
            </div>
            <h1 className="text-2xl font-semibold leading-tight">
              <SensitiveText text={report.title} />
            </h1>
            <SensitiveText
              as="p"
              text={report.address}
              className="mt-2 line-clamp-2 text-xs leading-5 text-muted-foreground"
            />
            <div className="mt-3 flex items-end justify-between gap-3 rounded-md border border-border bg-secondary/60 px-3 py-2 sm:hidden">
              <span className="text-xs text-muted-foreground">综合评分</span>
              <span className="text-2xl font-semibold">{report.score}</span>
            </div>
          </div>

          <div className="absolute right-4 top-4 hidden rounded-lg border border-border bg-card/90 px-4 py-3 text-right shadow-[0_18px_48px_oklch(var(--foreground)/0.08)] backdrop-blur-xl sm:block">
            <p className="text-xs text-muted-foreground">综合评分</p>
            <p className="mt-1 text-4xl font-semibold">{report.score}</p>
            <p className="text-xs text-muted-foreground">/ 100</p>
          </div>

          {pinItems.map((item, index) => (
            <div
              key={item.label}
              className={`absolute hidden max-w-[13rem] rounded-lg border border-border bg-card/88 p-3 shadow-[0_16px_44px_oklch(var(--foreground)/0.08)] backdrop-blur-xl md:block ${item.className}`}
            >
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[11px] font-semibold text-primary">
                  {index + 1}
                </span>
                <p className="text-sm font-semibold">{item.label}</p>
              </div>
              <SensitiveText
                as="p"
                text={item.value}
                className="mt-2 line-clamp-2 text-xs leading-5 text-muted-foreground"
              />
            </div>
          ))}

          <div className="absolute bottom-4 left-4 right-4 rounded-lg border border-border bg-card/92 p-4 shadow-[0_18px_54px_oklch(var(--foreground)/0.09)] backdrop-blur-xl">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0">
                <p className="text-sm text-primary">当前结论：{statusLabel(report.status)}</p>
                <SensitiveText
                  as="p"
                  text={report.conclusion}
                  className="mt-1 line-clamp-2 text-sm leading-6 text-muted-foreground"
                />
              </div>
              <Button asChild className="shrink-0 rounded-full px-5">
                <Link href={reportNextAction.href}>
                  {reportNextAction.cta}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>

        <div className="grid gap-px border-t border-border bg-border md:hidden">
          {pinItems.map((item, index) => (
            <div key={item.label} className="bg-card p-4">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[11px] font-semibold text-primary">
                  {index + 1}
                </span>
                <p className="text-sm font-semibold">{item.label}</p>
              </div>
              <SensitiveText
                as="p"
                text={item.value}
                className="mt-2 text-xs leading-5 text-muted-foreground"
              />
            </div>
          ))}
        </div>

        <div className="grid gap-3 border-t border-border bg-card p-4 md:grid-cols-3">
          {visibleChecks.map((item, index) => (
            <div key={item} className="rounded-md border border-border bg-secondary/55 p-3">
              <div className="mb-2 flex items-center gap-2 text-xs font-medium text-foreground">
                <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                关键确认 {index + 1}
              </div>
              <SensitiveText
                as="p"
                text={item}
                className="line-clamp-3 text-xs leading-5 text-muted-foreground"
              />
            </div>
          ))}
        </div>
      </div>

      <aside className="min-w-0 rounded-lg border border-border bg-card p-5 shadow-[0_24px_80px_oklch(var(--foreground)/0.07)] xl:sticky xl:top-24 xl:self-start">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-border bg-secondary/70 px-3 py-1 text-xs text-muted-foreground">
            {label}
          </span>
          {generatedAt ? (
            <span className="rounded-full border border-border bg-secondary/70 px-3 py-1 text-xs text-muted-foreground">
              {new Date(generatedAt).toLocaleString("zh-CN")}
            </span>
          ) : null}
        </div>

        <div className="mt-5 rounded-lg border border-primary/20 bg-primary/10 p-4">
          <div className="mb-3 flex items-center gap-2 text-primary">
            <BriefcaseBusiness className="h-4 w-4" />
            <p className="text-sm font-semibold">当前行动</p>
          </div>
          <h2 className="text-xl font-semibold leading-tight">{reportNextAction.label}</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {reportNextAction.reason}
          </p>
          <div className="mt-4 grid gap-2">
            <Button asChild>
              <Link href={reportNextAction.href}>
                {reportNextAction.cta}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href={caseHref}>
                打开房源记录
                <BriefcaseBusiness className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
          <Link
            href={compareHref}
            className="mt-3 inline-flex text-sm font-medium text-primary hover:underline"
          >
            需要比较多套房时，进入多房源对比
          </Link>
        </div>

        {warnings.length ? (
          <div className="mt-5 rounded-md border border-amber-300/20 bg-amber-300/10 p-3 text-xs leading-5 text-amber-700">
            <SensitiveText text={warnings.join(" ")} />
          </div>
        ) : null}

        <div className="mt-5">
          <ReportExportActions
            report={report}
            label={label}
            generatedAt={generatedAt}
            dataSources={dataSources}
            warnings={warnings}
            analysisPreflight={analysisPreflight}
            decisionCase={decisionCase}
          />
        </div>

      </aside>
    </section>
  );
}

function ReportConfidencePanel({ preflight }: { preflight: AnalysisPreflightResult }) {
  const levelClassName =
    preflight.level === "ready"
      ? "border-emerald-300/30 bg-emerald-300/10 text-emerald-700"
      : preflight.level === "review"
        ? "border-amber-300/30 bg-amber-300/10 text-amber-700"
        : "border-rose-300/30 bg-rose-300/10 text-rose-700";
  const missingItems = [...preflight.missingCritical, ...preflight.missingUseful].slice(0, 5);
  const confidenceItems = [
    ...preflight.degradation.slice(0, 4),
    ...missingItems.slice(0, Math.max(0, 4 - preflight.degradation.length)),
  ];

  return (
    <section id="confidence" className="rounded-md border border-border bg-card p-6">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-border bg-secondary px-3 py-1 text-xs text-muted-foreground">
            <Gauge className="h-3.5 w-3.5 text-primary" />
            信息完整度
          </div>
          <h2 className="text-lg font-semibold">信息完整度</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
            提示哪些结论可以参考，哪些内容需要在看房或付款前补充确认。
          </p>
        </div>
        <div className="w-full lg:w-72">
          <div className="mb-2 flex items-center justify-between gap-3">
            <span className={`rounded-full border px-2.5 py-1 text-xs ${levelClassName}`}>
              {preflight.label}
            </span>
            <span className="text-sm text-muted-foreground">{preflight.score}%</span>
          </div>
          <Progress value={preflight.score} />
          <p className="mt-2 text-xs leading-5 text-muted-foreground">
            {preflight.description}
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        <ReportConfidenceList
          title="需要谨慎参考"
          items={confidenceItems}
          empty="本次报告没有明显需要补充的信息。"
        />
        <ReportConfidenceList
          title="付款或签约前补充"
          items={missingItems}
          empty="关键输入已经比较完整。"
        />
        <ReportConfidenceList
          title="看房时必须确认"
          items={preflight.riskPrompts.slice(0, 5)}
          empty="至少确认出租权、押金、维修责任和付款条件。"
        />
      </div>
    </section>
  );
}

function ReportConfidenceList({
  title,
  items,
  empty,
}: {
  title: string;
  items: string[];
  empty: string;
}) {
  return (
    <div className="rounded-md border border-border bg-secondary/60 p-4">
      <p className="text-sm font-medium">{title}</p>
      {items.length ? (
        <ul className="mt-3 space-y-2 text-xs leading-5 text-muted-foreground">
          {items.map((item) => (
            <li key={item}>
              <SensitiveText text={item} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-xs leading-5 text-muted-foreground">
          <SensitiveText text={empty} />
        </p>
      )}
    </div>
  );
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-3 text-sm leading-7 text-muted-foreground">
      {items.map((item) => (
        <li key={item} className="flex gap-3">
          <span className="mt-3 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
          <SensitiveText text={item} />
        </li>
      ))}
    </ul>
  );
}

