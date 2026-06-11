import Link from "next/link";
import {
  ArrowRight,
  BriefcaseBusiness,
  CheckCircle2,
  CircleDashed,
  ClipboardList,
  Gauge,
  GitCompareArrows,
  type LucideIcon,
  MapPin,
  MapPinned,
  ShieldCheck,
  TrainFront,
  UsersRound,
} from "lucide-react";
import { ApiUsageGuardrail } from "@/components/api-usage-guardrail";
import { ReportCommunicationPack } from "@/components/report-communication-pack";
import { ReportExportActions } from "@/components/report-export-actions";
import { ReportValueLedger } from "@/components/report-value-ledger";
import { ReportSection } from "@/components/report-section";
import { ReportWorkflowTracker, type ReportWorkflowStep } from "@/components/report-workflow-tracker";
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
  intent: string;
  doneCriteria: string;
  stopRule: string;
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
    "来自房源评估报告的现场确认重点：",
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

function inferCommuteMinutes(report: ReportData) {
  const text = report.commute.points.join(" ");
  return text.match(/(\d{2,3})\s*分钟/)?.[1] ?? "";
}

function inferAreaSeed(report: ReportData) {
  return [report.address, report.title].filter(Boolean).join("、").slice(0, 160);
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

function buildAreaHref(report: ReportData, reportId?: string) {
  return buildFlowHref("/area", {
    from: "report",
    reportId,
    city: inferCity(report),
    budget: inferMonthlyRent(report),
    candidateAreas: inferAreaSeed(report),
    reportContext: buildReportActionContext(report),
  });
}

function buildCommuteHref(report: ReportData, reportId?: string) {
  return buildFlowHref("/commute", {
    from: "report",
    reportId,
    city: inferCity(report),
    listingTitle: report.title,
    monthlyRent: inferMonthlyRent(report),
    oneWayMinutes: inferCommuteMinutes(report),
    reportContext: buildReportActionContext(report),
  });
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
    risks: "报告提示需要补充授权、押金、维修、付款和交割凭据。",
    reportContext: buildReportActionContext(report),
  }), reportId);

  return `/evidence?${params.toString()}`;
}

function buildOfficialHref(report: ReportData, reportId?: string) {
  const params = appendReportId(new URLSearchParams({
    from: "report",
    title: report.title,
    city: inferCity(report),
    stage: "签约前",
    address: report.address,
    landlordType: inferLandlordType(report),
    contractStatus: "合同、授权和备案材料待确认",
    concerns: "报告提示需要确认出租权、备案办理办法、合同底线、收款主体和付款风险。",
    reportContext: buildReportActionContext(report),
  }), reportId);

  return `/official?${params.toString()}`;
}

function buildPaymentHref(report: ReportData, reportId?: string) {
  const rent = Number(inferMonthlyRent(report)) || 5200;
  const suggestedHold = Math.min(Math.round(rent * 0.2), 1000);
  const params = appendReportId(new URLSearchParams({
    from: "report",
    city: inferCity(report),
    listingTitle: report.title,
    paymentType: "定金",
    amount: String(suggestedHold),
    monthlyRent: String(rent),
    stage: "看房后，未签合同",
    contractStatus: "未看到合同",
    identityStatus: "未确认身份证明",
    authorizationStatus: "未看到产权/转租授权",
    payeeType: "中介个人账户",
    payeeMatchesContract: "收款人与合同主体不一致",
    refundRule: "口头承诺可退",
    receiptStatus: "只说转账截图即可",
    paymentChannel: "微信/支付宝私人转账",
    urgencyPressure: "对方催今天必须付",
    notes: "来自房源评估报告：付款前必须补充合同、授权、收款主体和退款条件。",
    reportContext: buildReportActionContext(report),
  }), reportId);

  return `/payment?${params.toString()}`;
}

function buildContractHref(report: ReportData, reportId?: string) {
  const params = appendReportId(new URLSearchParams({
    from: "report",
    city: inferCity(report),
    reportContext: buildReportActionContext(report),
  }), reportId);

  return `/contract?${params.toString()}`;
}

function buildSafetyHref(report: ReportData, reportId?: string) {
  const params = appendReportId(new URLSearchParams({
    from: "report",
    city: inferCity(report),
    listingTitle: report.title,
    floor: /低楼层|返潮|潮湿|霉/.test(buildReportActionContext(report)) ? "2" : "",
    preferences: inferVisitPreferences(report).join("、"),
    concerns: "报告提示需要再次确认夜间路线、门禁楼道、低楼层窗户、快递外卖和维修上门边界。",
    reportContext: buildReportActionContext(report),
  }), reportId);

  return `/safety?${params.toString()}`;
}

function buildSharedHref(report: ReportData, reportId?: string) {
  const rent = inferMonthlyRent(report);
  const params = appendReportId(new URLSearchParams({
    from: "report",
    city: inferCity(report),
    listingTitle: report.title,
    monthlyRent: rent || "5200",
    preferences: inferVisitPreferences(report).join("、"),
    concerns: "报告提示需要补充室友规则、公共空间、费用分摊、押金连带和转租授权边界。",
    reportContext: buildReportActionContext(report),
  }), reportId);

  return `/shared?${params.toString()}`;
}

function buildLifecycleHref(
  pathname: string,
  report: ReportData,
  reportId?: string,
  extra?: Record<string, string>,
) {
  const rent = inferMonthlyRent(report);
  const params = appendReportId(new URLSearchParams({
    from: "report",
    city: inferCity(report),
    title: report.title,
    address: report.address,
    monthlyRent: rent || "5200",
    listingTitle: report.title,
    reportContext: buildReportActionContext(report),
    ...(extra ?? {}),
  }), reportId);

  return `${pathname}?${params.toString()}`;
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

const preSignStepCopy: Partial<
  Record<
    ReportWorkflowStep["type"],
    {
      label: string;
      description: string;
      cta: string;
    }
  >
> = {
  commute: {
    label: "先算通勤",
    description: "把单程时间、步行换乘、晚归打车和坏天气折算成真实月成本。",
    cta: "测通勤成本",
  },
  life: {
    label: "再查日常",
    description: "把买菜、医疗、快递、夜间补给和噪音转成长期居住判断。",
    cta: "确认生活配套",
  },
  visit: {
    label: "先确认现场",
    description: "把通勤、潮湿、噪音和生活配套风险转成现场要测、要问、要拍的事项。",
    cta: "整理清单",
  },
  safety: {
    label: "居住关注点",
    description: "确认夜间路线、门禁楼道、低楼层窗户、隐私边界和外卖维修接触风险。",
    cta: "确认独居安全",
  },
  shared: {
    label: "居住关注点",
    description: "把室友、公共空间、访客、费用分摊、押金连带和转租授权边界写清楚。",
    cta: "确认合租边界",
  },
  official: {
    label: "再查官方",
    description: "确认出租权、备案办理办法、示范合同和公共服务材料，不能用报告判断替代官方确认。",
    cta: "确认官方材料",
  },
  evidence: {
    label: "补充材料",
    description: "把授权、押金、维修、付款备注和交割凭据整理成签约前材料。",
    cta: "补充凭据",
  },
  payment: {
    label: "最后付款",
    description: "在定金、押金或服务费转出前，先拦截合同、授权和收款主体风险。",
    cta: "确认付款条件",
  },
  contract: {
    label: "签约前确认",
    description: "粘贴真实合同后，再确认押金、维修、提前退租和转租授权条款。",
    cta: "确认合同条款",
  },
};

function workflowStepsFromPreSignGate(gate?: DecisionCase["preSignGate"]) {
  if (!gate?.items.length) return undefined;

  return gate.items.map((item): ReportWorkflowStep => {
    const copy = preSignStepCopy[item.type];

    return {
      type: item.type,
      label: copy?.label ?? "签约前确认",
      title: item.label,
      description: copy?.description ?? item.reason,
      href: item.href,
      cta: copy?.cta ?? "继续确认",
      state: item.state,
      reason: item.reason,
    };
  });
}

export function ReportView({
  report,
  label = "示例报告",
  generatedAt,
  dataSources = [],
  dataQuality = [],
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
  const officialHref = buildOfficialHref(report, reportId);
  const evidenceHref = buildEvidenceHref(report, reportId);
  const paymentHref = buildPaymentHref(report, reportId);
  const contractHref = buildContractHref(report, reportId);
  const areaHref = buildAreaHref(report, reportId);
  const commuteHref = buildCommuteHref(report, reportId);
  const lifeHref = buildLifeHref(report, reportId);
  const moveHref = buildLifecycleHref("/move", report, reportId);
  const handoverHref = buildLifecycleHref("/handover", report, reportId);
  const repairHref = buildLifecycleHref("/repair", report, reportId);
  const renewalHref = buildLifecycleHref("/renewal", report, reportId);
  const depositHref = buildLifecycleHref("/deposit", report, reportId);
  const safetyHref = buildSafetyHref(report, reportId);
  const sharedHref = buildSharedHref(report, reportId);
  const caseHref = buildCaseHref(report, reportId);
  const compareHref = buildCompareHref(report, reportId);
  const nextBestAction = decisionCase?.nextBestAction;
  const preSignGate = decisionCase?.preSignGate;
  const reportNextAction = nextBestAction
    ? {
        label: nextBestAction.label,
        reason: nextBestAction.reason,
        href: nextBestAction.href,
        cta: "继续确认",
        intent: nextBestAction.intent,
        doneCriteria: nextBestAction.doneCriteria,
        stopRule: nextBestAction.stopRule,
      }
    : report.status === "reject"
      ? {
          label: "先别付款，补充材料",
          reason:
            "这份报告已经出现明显不建议继续的信号。现在最重要的是先别被催着付款，补充出租权、合同、收款主体和退款条件，再决定是否放弃或换房。",
          href: paymentHref,
          cta: "先做付款前确认",
          intent: "保住谈判位置，不让一笔定金把自己锁进高风险房源。",
          doneCriteria: "合同、授权、收款主体、退款条件和收据材料都能留痕确认。",
          stopRule: "对方拒绝补充材料、只催转账或只给口头承诺时，先别付款。",
        }
      : report.status === "caution"
        ? {
            label: "先确认现场，再补充材料",
            reason:
              "这套房可以继续看，但需要把通勤、生活配套、现场问题和签约材料补充清楚。先把风险变成看房和材料确认事项。",
            href: visitHref,
            cta: "整理看房清单",
            intent: "把报告里的不确定项变成现场可确认、可拍照、可追问的事项。",
            doneCriteria: "现场问题、授权材料、费用说明和付款条件都有可保存凭据。",
            stopRule: "现场确认或材料补充前，不要因为价格、位置或催促直接付款。",
          }
        : {
            label: "继续看房，但别跳过签约前确认",
            reason:
              "当前结论整体可以继续，但仍需要确认现场情况、官方材料、凭据材料和付款条件，避免好房源在签约环节出问题。",
            href: visitHref,
            cta: "整理看房清单",
            intent: "确认这套房的优势能在现场、材料和合同里站得住。",
            doneCriteria: "现场确认、官方确认、付款条件和合同关键条款都已确认。",
            stopRule: "任何一个关键材料不愿补、付款条件不清或合同条款含糊时，先别付款签约。",
          };
  const fallbackReportPathSteps: ReportWorkflowStep[] = [
    {
      type: "visit",
      label: "先确认现场",
      title: "看房清单",
      description: "把通勤、潮湿、噪音和生活配套风险转成现场要测、要问、要拍的事项。",
      href: visitHref,
      cta: "整理清单",
    },
    {
      type: "official",
      label: "再查官方",
      title: "官方查询",
      description: "确认出租权、备案办理办法、示范合同和公共服务材料，不能用报告判断替代官方确认。",
      href: officialHref,
      cta: "确认官方材料",
    },
    {
      type: "evidence",
      label: "补充材料",
      title: "凭据材料",
      description: "把授权、押金、维修、付款备注和交割凭据整理成签约前材料。",
      href: evidenceHref,
      cta: "补充凭据",
    },
    {
      type: "payment",
      label: "最后付款",
      title: "付款前确认",
      description: "在定金、押金或服务费转出前，先拦截合同、授权和收款主体风险。",
      href: paymentHref,
      cta: "确认付款条件",
    },
    {
      type: "contract",
      label: "签约前确认",
      title: "合同确认",
      description: "粘贴真实合同后，再确认押金、维修、提前退租和转租授权条款。",
      href: contractHref,
      cta: "确认合同条款",
    },
  ];
  const reportPathSteps = workflowStepsFromPreSignGate(preSignGate) ?? fallbackReportPathSteps;
  const lifecycleSteps: ReportWorkflowStep[] = [
    {
      type: "move",
      label: "先算现金",
      title: "入住预算",
      description: "把押金、预付租金、中介费、搬家和添置支出放到同一个安全垫里判断。",
      href: moveHref,
      cta: "计算预算",
    },
    {
      type: "handover",
      label: "拿钥匙当天",
      title: "交割确认",
      description: "把钥匙门禁、表读数、旧损坏、家具家电和历史欠费固定成退租凭据。",
      href: handoverHref,
      cta: "做交割确认",
    },
    {
      type: "repair",
      label: "入住后",
      title: "维修责任",
      description: "遇到漏水、发霉、家电故障或旧损坏时，先报修并保存凭据，再确认费用边界。",
      href: repairHref,
      cta: "判断维修责任",
    },
    {
      type: "renewal",
      label: "租期到期前",
      title: "续租涨租",
      description: "把涨租、替代房、搬家成本、押金风险和通勤变化一起算。",
      href: renewalHref,
      cta: "计算续租上限",
    },
    {
      type: "deposit",
      label: "退租前",
      title: "押金退还",
      description: "拆分明确扣款和争议扣款，准备返还截止日、交割凭据和沟通话术。",
      href: depositHref,
      cta: "整理押金方案",
    },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <ReportDecisionCanvas
        report={report}
        label={label}
        generatedAt={generatedAt}
        dataSources={dataSources}
        dataQuality={dataQuality}
        warnings={warnings}
        analysisPreflight={analysisPreflight}
        reportId={reportId}
        decisionCase={decisionCase}
        caseHref={caseHref}
        compareHref={compareHref}
        reportNextAction={reportNextAction}
      />

      <ReportFollowThrough
        report={report}
        reportId={reportId}
        reportNextAction={reportNextAction}
        preSignGate={preSignGate}
        caseHref={caseHref}
        compareHref={compareHref}
      />

      <section className="rounded-lg border border-border bg-card p-6 shadow-[0_18px_54px_oklch(var(--foreground)/0.05)]">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <p className="text-xs text-primary">前面还要确认什么</p>
            <h2 className="mt-2 text-xl font-semibold">先判断片区是否合适</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
              如果风险来自通勤、夜路、生活配套或预算错配，继续补合同材料前要先回到片区、通勤或预算判断。下面的选择会带入本报告的城市、房源和风险上下文。
            </p>
          </div>
          <Button asChild variant="secondary" className="w-full shrink-0 sm:w-auto">
            <Link href={areaHref}>
              继续筛选片区
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <UpstreamReviewCard
            icon={MapPinned}
            title="片区筛选"
            description="把当前地址作为候选片区线索，重新判断优先约看、可以备选还是先不约看，避免在不合适区域继续耗周末。"
            href={areaHref}
            cta="筛选候选片区"
          />
          <UpstreamReviewCard
            icon={TrainFront}
            title="通勤真实成本"
            description="把单程时间、换乘、步行、晚归打车和坏天气折成月度成本，看低房租是否真的抵得过。"
            href={commuteHref}
            cta="折算通勤成本"
          />
          <UpstreamReviewCard
            icon={MapPin}
            title="生活配套确认"
            description="再次确认买菜、医疗、快递、夜间照明和噪音，判断晚上和周末是否也方便。"
            href={lifeHref}
            cta="确认生活配套"
          />
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        {report.scores.map((score) => (
          <ScoreCard key={score.label} {...score} />
        ))}
      </section>

      <ReportValueLedger
        report={report}
        paymentHref={paymentHref}
        evidenceHref={evidenceHref}
      />

      <ReportCommunicationPack report={report} decisionCase={decisionCase} />

      {analysisPreflight ? <ReportConfidencePanel preflight={analysisPreflight} /> : null}

      <ReportWorkflowTracker
        reportId={reportId}
        steps={reportPathSteps}
        description="房源评估只是第一步。真正降低踩坑概率，要把报告里的风险变成现场确认、官方材料、凭据材料、付款和合同确认；独居、晚归、低楼层或合租，也会有各自需要问清的重点。"
      />

      <ReportWorkflowTracker
        reportId={reportId}
        steps={lifecycleSteps}
        eyebrow="入住到退租"
        title="签约后的居住周期"
        description="真正的损失不只发生在签约前。签约后还要覆盖入住预算、交割、维修、续租和押金退还，让每一步都留下凭据。"
        progressLabel="居住周期进度"
      />

      <section className="rounded-lg border border-border bg-card p-6 shadow-[0_18px_54px_oklch(var(--foreground)/0.05)]">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <p className="text-xs text-primary">居住关注点</p>
            <h2 className="mt-2 text-xl font-semibold">独居与合租边界</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
              报告给出的是方向，签约前还需要把高损失场景拆成可验证的事项。下面两个选择会带入本报告的城市、房源、偏好和风险上下文。
            </p>
          </div>
          <Button asChild variant="secondary" className="w-full shrink-0 sm:w-auto">
            <Link href={visitHref}>
              整理看房清单
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <SpecialRiskToolCard
            icon={ShieldCheck}
            title="独居安全确认"
            description="再次确认夜路、门禁、楼道、低楼层、快递外卖、维修上门和隐私风险，避免只凭白天看房感觉判断安全。"
            href={safetyHref}
            cta="确认独居安全"
          />
          <SpecialRiskToolCard
            icon={UsersRound}
            title="合租边界确认"
            description="把室友作息、公共空间、访客过夜、费用分摊、押金连带和转租授权写成必须问清的规则。"
            href={sharedHref}
            cta="确认合租边界"
          />
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
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

      <section className="grid gap-4 lg:grid-cols-[0.48fr_0.52fr]">
        <ReportSection title="看房时必须确认的问题" icon={ClipboardList}>
          <div className="mb-4 flex min-w-0 flex-col gap-3 rounded-md border border-border bg-secondary p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm leading-6 text-muted-foreground">
              把这些问题转成现场可勾选、可保存凭据的确认清单。
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
    </div>
  );
}

function ReportFollowThrough({
  report,
  reportId,
  reportNextAction,
  preSignGate,
  caseHref,
  compareHref,
}: {
  report: ReportData;
  reportId?: string;
  reportNextAction: ReportNextAction;
  preSignGate?: DecisionCase["preSignGate"];
  caseHref: string;
  compareHref: string;
}) {
  const loopItems = [
    {
      icon: MapPin,
      label: "这套房",
      title: report.title,
      description: report.address,
    },
    {
      icon: Gauge,
      label: "当前结论",
      title: `${statusLabel(report.status)} · ${report.score}/100`,
      description: report.conclusion,
    },
    {
      icon: ClipboardList,
      label: "下一步",
      title: reportNextAction.label,
      description: reportNextAction.reason,
      href: reportNextAction.href,
      cta: reportNextAction.cta,
    },
    {
      icon: BriefcaseBusiness,
      label: "房源记录",
      title: reportId ? "已接到房源记录" : "保存后形成房源记录",
      description: reportId
        ? "付款、合同、入住和押金会继续接到这套房，后面不用重新整理。"
        : "真实评估保存后，后续比较、付款前确认和签约材料会放到同一处。",
      href: caseHref,
      cta: "打开房源记录",
    },
  ];

  return (
    <section className="rounded-lg border border-primary/20 bg-primary/[0.08] p-5 shadow-[0_18px_70px_oklch(var(--foreground)/0.06)] sm:p-6">
      <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0 flex-1">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs text-primary">
            <BriefcaseBusiness className="h-3.5 w-3.5" />
            报告之后怎么继续
          </div>
          <h2 className="text-balance text-2xl font-semibold leading-tight sm:text-3xl">
            先把结论变成可确认、可保存、可比较的下一步。
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground">
            看完报告后，最重要的是知道接下来该问谁、看什么、钱能不能付、合同能不能签。这份报告可以放进房源记录，也可以加入多房源对比。
          </p>

          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {loopItems.map((item, index) => (
              <ReportFollowThroughCard key={item.label} item={item} index={index} />
            ))}
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <ReportActionFact label="为什么要先做" value={reportNextAction.intent} />
            <ReportActionFact label="确认到什么程度" value={reportNextAction.doneCriteria} />
            <ReportActionFact label="付款底线" value={reportNextAction.stopRule} strong />
          </div>
        </div>

        <div className="w-full shrink-0 xl:w-[340px]">
          {preSignGate ? (
            <div className="rounded-lg border border-border bg-background/55 p-4 shadow-[0_16px_54px_oklch(var(--foreground)/0.05)]">
              <div className="mb-3 flex items-center justify-between gap-3">
                <span className="text-sm font-medium">{preSignGate.label}</span>
                <span className="text-sm text-muted-foreground">{preSignGate.progress}%</span>
              </div>
              <Progress value={preSignGate.progress} />
              <p className="mt-3 text-xs leading-5 text-muted-foreground">
                <SensitiveText text={preSignGate.summary} />
              </p>
              <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
                <ReportGateVerdict label="付款" allowed={preSignGate.canPay} />
                <ReportGateVerdict label="签约" allowed={preSignGate.canSign} />
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-border bg-background/55 p-4 shadow-[0_16px_54px_oklch(var(--foreground)/0.05)]">
              <div className="mb-3 flex items-center justify-between gap-3">
                <span className="text-sm font-medium">当前判断</span>
                <span className="text-sm text-muted-foreground">{report.score}/100</span>
              </div>
              <Progress value={report.score} />
              <p className="mt-3 text-xs leading-5 text-muted-foreground">
                保存真实评估后，这里会显示看房、材料、付款和合同的确认情况。
              </p>
              <div className="mt-4 rounded-md border border-border bg-secondary/60 p-3 text-xs leading-5 text-muted-foreground">
                当前结论：{statusLabel(report.status)}
              </div>
            </div>
          )}

          <div className="mt-4 grid gap-3">
            <Button asChild>
              <Link href={reportNextAction.href}>
                {reportNextAction.cta}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
              <Button asChild variant="secondary">
                <Link href={caseHref}>查看房源记录</Link>
              </Button>
              <Button asChild variant="secondary">
                <Link href={compareHref}>加入多房源对比</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function ReportFollowThroughCard({
  item,
  index,
}: {
  item: {
    icon: LucideIcon;
    label: string;
    title: string;
    description: string;
    href?: string;
    cta?: string;
  };
  index: number;
}) {
  const Icon = item.icon;
  const content = (
    <div className="group h-full rounded-lg border border-border bg-card/80 p-4 shadow-[0_14px_44px_oklch(var(--foreground)/0.045)] transition hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-[0_18px_54px_oklch(var(--foreground)/0.07)]">
      <div className="flex items-center justify-between gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/15 text-primary">
          <Icon className="h-4 w-4" />
        </span>
        <span className="rounded-full border border-border bg-secondary/70 px-2 py-1 text-[11px] text-muted-foreground">
          {index + 1}
        </span>
      </div>
      <p className="mt-4 text-xs text-muted-foreground">{item.label}</p>
      <h3 className="mt-1 line-clamp-2 text-base font-semibold leading-6">
        <SensitiveText text={item.title} />
      </h3>
      <SensitiveText
        as="p"
        text={item.description}
        className="mt-2 line-clamp-4 text-xs leading-5 text-muted-foreground"
      />
      {item.cta ? (
        <div className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-primary">
          {item.cta}
          <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
        </div>
      ) : null}
    </div>
  );

  if (!item.href) return content;

  return (
    <Link href={item.href} className="block h-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
      {content}
    </Link>
  );
}

function ReportActionFact({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="rounded-md border border-border bg-background/45 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`mt-2 text-sm leading-6 ${strong ? "text-amber-700" : "text-foreground"}`}>
        <SensitiveText text={value} />
      </p>
    </div>
  );
}

function ReportDecisionCanvas({
  report,
  label,
  generatedAt,
  dataSources,
  dataQuality,
  warnings,
  analysisPreflight,
  reportId,
  decisionCase,
  caseHref,
  compareHref,
  reportNextAction,
}: {
  report: ReportData;
  label: string;
  generatedAt?: string;
  dataSources: string[];
  dataQuality: NonNullable<ReportViewProps["dataQuality"]>;
  warnings: string[];
  analysisPreflight?: AnalysisPreflightResult;
  reportId?: string;
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
        <div className="relative min-h-[34rem] overflow-hidden bg-[oklch(0.936_0.012_92)]">
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

          <div className="absolute left-4 top-4 max-w-[22rem] rounded-lg border border-border bg-card/90 p-4 shadow-[0_18px_48px_oklch(var(--foreground)/0.08)] backdrop-blur-xl">
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
          </div>

          <div className="absolute right-4 top-4 rounded-lg border border-border bg-card/90 px-4 py-3 text-right shadow-[0_18px_48px_oklch(var(--foreground)/0.08)] backdrop-blur-xl">
            <p className="text-xs text-muted-foreground">综合评分</p>
            <p className="mt-1 text-4xl font-semibold">{report.score}</p>
            <p className="text-xs text-muted-foreground">/ 100</p>
          </div>

          {pinItems.map((item, index) => (
            <div
              key={item.label}
              className={`absolute max-w-[13rem] rounded-lg border border-border bg-card/88 p-3 shadow-[0_16px_44px_oklch(var(--foreground)/0.08)] backdrop-blur-xl ${item.className}`}
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

        <div className="mt-5">
          <p className="text-sm text-muted-foreground">总评分</p>
          <div className="mt-2 flex items-end gap-2">
            <span className="text-6xl font-semibold">{report.score}</span>
            <span className="pb-2 text-muted-foreground">/ 100</span>
          </div>
          <Progress value={report.score} className="mt-4" />
        </div>

        <div className="mt-5 rounded-lg border border-primary/20 bg-primary/10 p-4">
          <div className="mb-3 flex items-center gap-2 text-primary">
            <BriefcaseBusiness className="h-4 w-4" />
            <p className="text-sm font-semibold">现在先做</p>
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
            <Button asChild variant="secondary">
              <Link href={compareHref}>
                加入多房源对比
                <GitCompareArrows className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>

        <div className="mt-5 grid gap-2">
                  <ReportActionFact label="为什么做" value={reportNextAction.intent} />
                  <ReportActionFact label="做到什么程度" value={reportNextAction.doneCriteria} />
          <ReportActionFact label="付款底线" value={reportNextAction.stopRule} strong />
        </div>

        {warnings.length ? (
          <div className="mt-5 rounded-md border border-amber-300/20 bg-amber-300/10 p-3 text-xs leading-5 text-amber-700">
            <SensitiveText text={warnings.join(" ")} />
          </div>
        ) : null}

        {dataSources.length ? (
          <div className="mt-5 rounded-md border border-border bg-secondary/60 p-3">
            <p className="mb-2 text-xs font-medium text-muted-foreground">数据来源</p>
            <div className="flex flex-wrap gap-2">
              {dataSources.map((source) => (
                <span
                  key={source}
                  className="rounded-full border border-border bg-card px-2 py-1 text-xs text-muted-foreground"
                >
                  {source}
                </span>
              ))}
            </div>
          </div>
        ) : null}

        {dataQuality.length ? (
          <div className="mt-5 rounded-md border border-border bg-secondary/60 p-3">
            <p className="mb-3 text-xs font-medium text-muted-foreground">信息是否够用</p>
            <div className="space-y-2">
              {dataQuality.slice(0, 3).map((item) => (
                <DataQualityRow
                  key={`${item.provider}-${item.feature}-${item.label}`}
                  label={item.label}
                  detail={item.detail}
                  status={item.status}
                />
              ))}
            </div>
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

        {reportId ? (
          <Button asChild variant="outline" className="mt-3 w-full">
            <Link href={`/report/${reportId}`}>打开固定链接</Link>
          </Button>
        ) : null}

        <ApiUsageGuardrail
          mode="report"
          className="mt-5"
          dataQuality={dataQuality}
          hasAddress={Boolean(report.address)}
          hasWorkplace
        />
      </aside>
    </section>
  );
}

function ReportGateVerdict({ label, allowed }: { label: string; allowed: boolean }) {
  return (
    <div
      className={`rounded-md border px-3 py-2 text-xs ${
        allowed
          ? "border-emerald-300/30 bg-emerald-300/10 text-emerald-700"
          : "border-amber-300/30 bg-amber-300/10 text-amber-700"
      }`}
    >
      {label}：{allowed ? "可以进入最后确认" : "先确认"}
    </div>
  );
}

function SpecialRiskToolCard({
  icon: Icon,
  title,
  description,
  href,
  cta,
}: {
  icon: typeof ShieldCheck;
  title: string;
  description: string;
  href: string;
  cta: string;
}) {
  return (
    <div className="flex min-w-0 flex-col justify-between rounded-md border border-border bg-secondary/60 p-4">
      <div className="min-w-0">
        <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-md border border-primary/20 bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <h3 className="text-base font-semibold">{title}</h3>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
      </div>
      <Button asChild variant="outline" className="mt-4 w-full">
        <Link href={href}>
          {cta}
          <ArrowRight className="ml-2 h-4 w-4" />
        </Link>
      </Button>
    </div>
  );
}

function UpstreamReviewCard({
  icon: Icon,
  title,
  description,
  href,
  cta,
}: {
  icon: typeof ShieldCheck;
  title: string;
  description: string;
  href: string;
  cta: string;
}) {
  return (
    <div className="flex min-w-0 flex-col justify-between rounded-md border border-border bg-secondary/60 p-4">
      <div className="min-w-0">
        <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-md border border-primary/20 bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <h3 className="text-base font-semibold">{title}</h3>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
      </div>
      <Button asChild variant="outline" className="mt-4 w-full">
        <Link href={href}>
          {cta}
          <ArrowRight className="ml-2 h-4 w-4" />
        </Link>
      </Button>
    </div>
  );
}

function DataQualityRow({
  label,
  detail,
  status,
}: {
  label: string;
  detail: string;
  status: NonNullable<ReportViewProps["dataQuality"]>[number]["status"];
}) {
  const isLive = status === "live";
  const Icon = isLive ? CheckCircle2 : CircleDashed;
  return (
    <div className="grid gap-2 rounded-md border border-border bg-secondary px-3 py-2">
      <div className="flex items-center gap-2">
        <Icon className={`h-3.5 w-3.5 ${isLive ? "text-primary" : "text-amber-700"}`} />
        <span className="text-xs font-medium text-foreground">{label}</span>
        <span
          className={`rounded-full border px-2 py-0.5 text-[11px] ${
            isLive
              ? "border-emerald-300/30 bg-emerald-300/10 text-emerald-700"
              : "border-amber-300/30 bg-amber-300/10 text-amber-700"
          }`}
        >
          {isLive ? "实时" : "按现有信息估算"}
        </span>
      </div>
      <p className="text-xs leading-5 text-muted-foreground">
        <SensitiveText text={detail} />
      </p>
    </div>
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
            信息是否够用
          </div>
          <h2 className="text-lg font-semibold">信息是否够用</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
            这里提示哪些结论可以放心参考，哪些只适合做签约前确认事项。
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
          title="哪些地方要谨慎参考"
          items={confidenceItems}
          empty="本次报告没有明显需要补充的信息。"
        />
        <ReportConfidenceList
          title="签约前要补充"
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

