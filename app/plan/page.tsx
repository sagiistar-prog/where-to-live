import Link from "next/link";
import {
  Archive,
  BadgeDollarSign,
  CheckCircle2,
  Landmark,
  ListChecks,
  Scale,
  Sparkles,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { DecisionPathPanel, type DecisionPathStep } from "@/components/decision-path-panel";
import { DecisionPlanPanel, type ReportTarget } from "@/components/decision-plan-panel";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getCurrentOwnerId } from "@/lib/server/current-owner";
import { listReports } from "@/lib/server/report-store";

export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

const urgentPaymentPath: DecisionPathStep[] = [
  {
    label: "先判断房源",
    title: "房源评估",
    description: "如果还没形成报告，先用截图或手动填写信息判断这套房是否值得继续。",
    href: "/analyze",
    cta: "做评估",
    icon: Sparkles,
    state: "current",
  },
  {
    label: "被催先付",
    title: "付款前确认",
    description: "合同、授权、收款主体和退款条件没确认时，先不要转大额费用。",
    href: "/payment",
    cta: "确认付款条件",
    icon: BadgeDollarSign,
    state: "risk",
  },
  {
    label: "补充凭据",
    title: "凭据材料",
    description: "把出租权、押金、维修、交割、聊天确认和付款备注整理成可保存的材料。",
    href: "/evidence",
    cta: "补充凭据",
    icon: Archive,
    state: "proof",
  },
  {
    label: "回到官方",
    title: "官方查询",
    description: "备案、示范合同、出租权和公共服务材料要回到公开入口确认。",
    href: "/official",
    cta: "查官方",
    icon: Landmark,
    state: "proof",
  },
  {
    label: "签约前确认",
    title: "合同确认",
    description: "拿到真实合同后，再审押金、维修、提前退租和授权条款。",
    href: "/contract",
    cta: "确认合同条款",
    icon: Scale,
    state: "next",
  },
];

const planSignals = [
  {
    title: "先别急着付钱签字",
    detail: "被催交定金、服务费或押金时，先看材料是否足够，不让时间压力替你做决定。",
    icon: BadgeDollarSign,
  },
  {
    title: "把需要补充的信息列清楚",
    detail: "出租权、合同、收款主体、退款条件和聊天确认，会被整理成一张清楚的材料表。",
    icon: Archive,
  },
  {
    title: "做完后知道下一步去哪",
    detail: "保存后，可以回到房源记录，继续确认付款、合同、凭据材料和入住交割。",
    icon: CheckCircle2,
  },
];

export default async function PlanPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const focusReportId = firstParam(params?.reportId) ?? "";
  const from = firstParam(params?.from);
  const initialPrompt = firstParam(params?.prompt) || firstParam(params?.notes) || "";
  const initialStage = firstParam(params?.stage) || "";
  const initialSourceLabel =
    from === "home" ? "来自首页输入" : from === "dashboard" ? "来自工作台输入" : "";
  const ownerId = await getCurrentOwnerId();
  const reports = await listReports(ownerId);
  const focusReport = focusReportId
    ? reports.find((report) => report.id === focusReportId)
    : undefined;
  const initialReports: ReportTarget[] = reports.slice(0, 8).map((report) => ({
    id: report.id,
    generatedAt: report.generatedAt,
    inputSummary: report.inputSummary
      ? {
          rent: report.inputSummary.rent,
          address: report.inputSummary.address,
          city: report.inputSummary.city,
          workplace: report.inputSummary.workplace,
          budget: report.inputSummary.budget,
          commuteLimit: report.inputSummary.commuteLimit,
          source: report.inputSummary.source,
          preferences: report.inputSummary.preferences,
        }
      : undefined,
    summary: report.summary,
  }));

  return (
    <AppShell>
      <div className="mx-auto max-w-7xl space-y-8">
        <section className="grid gap-6 lg:grid-cols-[0.62fr_0.38fr]">
          <div className="min-w-0">
            <p className="text-sm font-medium text-primary/80">
              下一步
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-normal sm:text-4xl">
              今天先做什么
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground">
              当租金、通勤、付款、合同和押金同时压过来，先把今天要做的事排清楚：哪些钱先别转，哪些字先别签，下一步去哪里确认。
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <span className="rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                {focusReport
                  ? `正在承接：${focusReport.summary.title}`
                  : "适合：被催付款 / 不知道先做什么 / 材料没齐"}
              </span>
              <span className="rounded-full border border-border bg-secondary px-3 py-1 text-xs text-muted-foreground">
                你会得到：今天先做什么、付款底线、需要补充的材料、下一步入口
              </span>
            </div>
            <div className="mt-6 grid gap-3 md:grid-cols-3">
              {planSignals.map((item) => {
                const Icon = item.icon;

                return (
                  <div
                    key={item.title}
                    className="min-w-0 rounded-md border border-border bg-card/65 p-4"
                  >
                    <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-md bg-primary/15 text-primary">
                      <Icon className="h-4 w-4" />
                    </div>
                    <h3 className="text-sm font-semibold">{item.title}</h3>
                    <p className="mt-2 text-xs leading-5 text-muted-foreground">
                      {item.detail}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
          <Card className="min-w-0 p-6">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-md bg-primary/15 text-primary">
              <ListChecks className="h-6 w-6" />
            </div>
            <h2 className="text-lg font-semibold">先排顺序，再做判断</h2>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">
              填下当前阶段、时间压力、付款压力和材料状态，住哪儿会先排出今天必须做的事、先别急着做的事和下一步去哪里确认。
            </p>
            <div className="mt-5 grid gap-3">
              <Button asChild variant="secondary" className="w-full">
                <Link href="/analyze">先评估房源</Link>
              </Button>
              <Button asChild variant="secondary" className="w-full">
                <Link href="/payment">我正在被催付款</Link>
              </Button>
            </div>
          </Card>
        </section>

        <DecisionPathPanel
          eyebrow="先确认最容易亏钱的事"
              title="被催决定时，先走这条线"
      description="这里会按你填写的信息整理优先顺序；在没有完整材料前，先用这条主线守住现金、凭据材料和签约底线。"
          steps={urgentPaymentPath}
        />

        <DecisionPlanPanel
          initialReports={initialReports}
          initialReportId={focusReportId}
          initialPrompt={initialPrompt}
          initialStage={initialStage}
          initialSourceLabel={initialSourceLabel}
        />
      </div>
    </AppShell>
  );
}
