import Link from "next/link";
import { RefreshCw } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { RenewalDecisionPanel } from "@/components/renewal-decision-panel";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { buildFlowHref, compactContext } from "@/lib/flow-links";
import type { RenewalDecisionInput } from "@/lib/renewal-decision";

type SearchParams = Record<string, string | string[] | undefined>;
type RenewalPageSeed = Partial<RenewalDecisionInput> & {
  reportId?: string;
  sourceLabel?: string;
  reportContext?: string;
};

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function numberParam(value: string | string[] | undefined) {
  const parsed = Number(firstParam(value));
  return Number.isFinite(parsed) ? parsed : undefined;
}

const sourceLabels: Record<string, string> = {
  report: "已从房源报告带入",
  case: "已从房源记录带入",
  payment: "已从付款前确认带入",
  official: "已从官方查询带入",
  evidence: "已从凭据材料带入",
  contract: "已从合同确认带入",
  move: "已从入住预算带入",
  handover: "已从交割验收带入",
  deposit: "已从押金退还带入",
  repair: "已从维修责任带入",
  compare: "已从多房源对比带入",
  home: "已从首页输入带入",
  plan: "已从下一步带入",
  dashboard: "已从工作台输入带入",
};

export default async function RenewalPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const params = searchParams ? await searchParams : {};
  const reportId = firstParam(params.reportId);
  const source = firstParam(params.from);
  const city = firstParam(params.city);
  const listingTitle = firstParam(params.listingTitle) || firstParam(params.title) || firstParam(params.currentTitle);
  const currentRent = firstParam(params.currentRent) || firstParam(params.monthlyRent);
  const proposedRent = firstParam(params.proposedRent);
  const marketRent = firstParam(params.marketRent);
  const depositRisk = firstParam(params.depositRisk) || firstParam(params.depositAmount);
  const reportContext = firstParam(params.reportContext);
  const sharedContext = compactContext([
    reportContext,
    firstParam(params.notes),
    listingTitle ? `当前房源：${listingTitle}` : undefined,
    currentRent ? `当前租金：${currentRent}` : undefined,
    depositRisk ? `押金或扣款风险：${depositRisk}` : undefined,
  ]);
  const initialInput: RenewalPageSeed | undefined =
    reportId || city || listingTitle || currentRent || sharedContext
      ? {
          city,
          listingTitle,
          currentRent: numberParam(currentRent),
          proposedRent: numberParam(proposedRent),
          marketRent: numberParam(marketRent),
          depositRisk: numberParam(depositRisk),
          commuteMinutes: numberParam(params.commuteMinutes),
          alternativeCommuteMinutes: numberParam(params.alternativeCommuteMinutes),
          notes: sharedContext,
          reportContext: sharedContext,
          reportId,
          sourceLabel: source ? sourceLabels[source] : undefined,
        }
      : undefined;
  const compareHref = buildFlowHref("/compare", {
    from: "renewal",
    reportId,
    city,
    currentTitle: listingTitle,
    currentRent,
    proposedRent,
    marketRent,
    reportContext: sharedContext,
  });
  const depositHref = buildFlowHref("/deposit", {
    from: "renewal",
    reportId,
    city,
    title: listingTitle,
    monthlyRent: currentRent,
    depositAmount: depositRisk || currentRent,
    landlordReason: compactContext([
      "从续租方案带入：如果不续租或谈判失败，需要提前评估押金、违约金和退租通知期。",
      sharedContext,
    ]),
  });
  const contractHref = buildFlowHref("/contract", {
    from: "renewal",
    reportId,
    city,
    title: listingTitle,
    contractText: compactContext([
      "以下内容来自续租页入口，不等同于完整合同。请粘贴真实续租补充协议后再确认：",
      sharedContext,
    ]),
  });
  const paymentHref = buildFlowHref("/payment", {
    from: "renewal",
    reportId,
    city,
    title: listingTitle,
    listingTitle,
    paymentType: "续租首笔租金/押金调整",
    amount: proposedRent || currentRent,
    monthlyRent: proposedRent || currentRent,
    stage: "续租补充协议付款前",
    contractStatus: "续租补充协议待确认",
    refundRule: depositRisk ? `押金沿用或调整需书面确认；当前押金风险：${depositRisk}` : undefined,
    receiptStatus: "续租付款记录待确认",
    urgencyPressure: "房东要求先确认续租或先付新租金",
    notes: compactContext([
      "从续租涨租方案带入：续租租金、押金沿用/调整、付款周期和补充协议未写清前，不建议先付款。",
      sharedContext,
    ]),
    reportContext: sharedContext,
  });

  return (
    <AppShell>
      <div className="mx-auto max-w-7xl space-y-8">
        <section className="grid gap-6 lg:grid-cols-[0.62fr_0.38fr]">
          <div>
            <p className="text-sm text-primary/80">
              续租判断
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-normal sm:text-4xl">
              续租涨租方案
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground">
              租期快到时，先一起计算涨租幅度、同片区替代房、搬家成本、押金风险、维修问题和通勤变化。
            </p>
          </div>
          <Card className="p-6">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-md bg-primary/15 text-primary">
              <RefreshCw className="h-6 w-6" />
            </div>
            <h2 className="text-lg font-semibold">续租前先算清谈判底线</h2>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">
              不爬平台房源，只用用户手动输入的替代价格和搬家成本做判断。结论会给出续租上限、搬家回本月数和谈判话术。
            </p>
            <div className="mt-5 grid gap-3">
              <Button asChild variant="secondary" className="w-full">
                <Link href={compareHref}>对比替代房源</Link>
              </Button>
              <Button asChild variant="secondary" className="w-full">
                <Link href={depositHref}>测算退租押金</Link>
              </Button>
              <Button asChild variant="secondary" className="w-full">
                <Link href={contractHref}>确认续租补充协议</Link>
              </Button>
              <Button asChild variant="secondary" className="w-full">
                <Link href={paymentHref}>确认续租付款条件</Link>
              </Button>
            </div>
          </Card>
        </section>

        <RenewalDecisionPanel reportId={reportId} initialInput={initialInput} />
      </div>
    </AppShell>
  );
}
