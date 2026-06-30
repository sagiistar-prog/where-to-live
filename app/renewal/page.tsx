import { RefreshCw } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { ProductPageHeader } from "@/components/product-page-header";
import { RenewalDecisionPanel } from "@/components/renewal-decision-panel";
import { StartHandoffBanner } from "@/components/start-handoff-banner";
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
  payment: "已从付款咨询带入",
  official: "已从官方查询带入",
  evidence: "已从材料清单带入",
  contract: "已从合同确认带入",
  move: "已从入住预算带入",
  handover: "已从交割验收带入",
  deposit: "已从押金退还带入",
  repair: "已从维修责任带入",
  compare: "已从多房源对比带入",
  home: "已从首页输入带入",
  plan: "已从当前行动带入",
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
  const movingCost = firstParam(params.movingCost);
  const depositRisk = firstParam(params.depositRisk) || firstParam(params.depositAmount);
  const reportContext = firstParam(params.reportContext);
  const sharedContext = compactContext([
    reportContext,
    firstParam(params.notes),
    listingTitle ? `当前房源：${listingTitle}` : undefined,
    currentRent ? `当前租金：${currentRent}` : undefined,
    proposedRent ? `续租报价：${proposedRent}` : undefined,
    movingCost ? `搬家成本：${movingCost}` : undefined,
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
          movingCost: numberParam(movingCost),
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
    movingCost,
    reportContext: sharedContext,
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
  return (
    <AppShell>
      <div className="mx-auto w-full max-w-7xl min-w-0 space-y-8 overflow-x-hidden">
        <ProductPageHeader
          eyebrow="续租判断"
          title="续租涨租方案"
          description="评估新租金、替代房、搬家成本、押金风险、维修问题和通勤变化，判断是否续租。"
          icon={RefreshCw}
          actions={[
            { label: "对比替代房源", href: compareHref, variant: "secondary" },
            { label: "确认续租协议", href: contractHref, variant: "secondary" },
          ]}
        />

        <StartHandoffBanner handoff={firstParam(params.handoff)} />

        <RenewalDecisionPanel reportId={reportId} initialInput={initialInput} />
      </div>
    </AppShell>
  );
}
