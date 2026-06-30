import { KeyRound } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { DepositRefundPanel } from "@/components/deposit-refund-panel";
import { ProductPageHeader } from "@/components/product-page-header";
import { StartHandoffBanner } from "@/components/start-handoff-banner";
import { buildFlowHref, compactContext } from "@/lib/flow-links";
import type { DepositRefundInput } from "@/lib/deposit-refund";

type SearchParams = Record<string, string | string[] | undefined>;
type DepositPageSeed = Partial<DepositRefundInput> & {
  autoGenerate?: boolean;
  sourceLabel?: string;
  reportId?: string;
  title?: string;
};

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function numberParam(value: string | string[] | undefined) {
  const raw = firstParam(value);
  const match = raw?.replace(/,/g, "").match(/\d+(\.\d+)?/);
  if (!match) return undefined;
  const parsed = Number(match[0]);
  return Number.isFinite(parsed) ? parsed : undefined;
}

const sourceLabels: Record<string, string> = {
  report: "已从房源报告带入",
  case: "已从房源记录带入",
  payment: "已从付款咨询带入",
  official: "已从官方查询带入",
  contract: "已从合同确认带入",
  move: "已从入住预算带入",
  handover: "已从交割验收带入",
  repair: "已从维修责任带入",
  renewal: "已从续租方案带入",
  evidence: "已从材料清单带入",
  compare: "已从多房源对比带入",
  home: "已从首页输入带入",
  plan: "已从当前行动带入",
  dashboard: "已从工作台输入带入",
};

export default async function DepositPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const params = searchParams ? await searchParams : {};
  const source = firstParam(params.from);
  const canPrefill = Boolean(source && sourceLabels[source]);
  const reportId = firstParam(params.reportId);
  const city = firstParam(params.city);
  const title = firstParam(params.title) || firstParam(params.listingTitle) || firstParam(params.currentTitle);
  const monthlyRent = firstParam(params.monthlyRent) || firstParam(params.currentRent) || firstParam(params.rent);
  const depositAmount =
    firstParam(params.depositAmount) || firstParam(params.deposit) || firstParam(params.amount) || monthlyRent;
  const evidenceLevel = firstParam(params.evidenceLevel);
  const landlordReason =
    firstParam(params.landlordReason) ||
    firstParam(params.concerns) ||
    firstParam(params.refundRule) ||
    firstParam(params.notes);
  const reportContext = firstParam(params.reportContext);
  const sharedContext = compactContext([
    reportContext,
    landlordReason,
    firstParam(params.risks),
    title ? `当前房源：${title}` : undefined,
    monthlyRent ? `月租：${monthlyRent}` : undefined,
    depositAmount ? `押金：${depositAmount}` : undefined,
  ]);
  const paymentHref = buildFlowHref("/payment", {
    from: "deposit",
    reportId,
    city,
    title,
    listingTitle: title,
    paymentType: "押金扣款确认/补付争议",
    amount: firstParam(params.damageClaim) || firstParam(params.amount) || depositAmount,
    monthlyRent,
    stage: "退租押金扣款确认前",
    contractStatus: "押金返还和扣款依据待确认",
    refundRule: landlordReason || "扣款依据和剩余押金返还时间待书面确认",
    receiptStatus: evidenceLevel || "退租交割、扣款依据和返还记录待补充",
    urgencyPressure: "对方要求先签扣款确认或接受少退押金",
    notes: compactContext([
      "从押金退还带入：扣款依据未拆清前，不建议签署扣款确认、放弃追偿或补付费用。",
      sharedContext,
    ]),
    reportContext: sharedContext,
  });
  const evidenceHref = buildFlowHref("/evidence", {
    from: "deposit",
    reportId,
    city,
    title,
    stage: "退租押金",
    deposit: depositAmount ? `押金 ${depositAmount} 元` : undefined,
    risks: firstParam(params.risks),
    reportContext: sharedContext,
  });
  const initialInput: DepositPageSeed | undefined = canPrefill
    ? {
        city,
        monthlyRent: numberParam(monthlyRent),
        depositAmount: numberParam(depositAmount),
        noticeDate: firstParam(params.noticeDate),
        moveOutDate: firstParam(params.moveOutDate),
        requiredNoticeDays: numberParam(params.requiredNoticeDays),
        contractReturnDays: numberParam(params.contractReturnDays),
        unpaidRent: numberParam(params.unpaidRent),
        utilityBalance: numberParam(params.utilityBalance),
        cleaningFee: numberParam(params.cleaningFee),
        damageClaim: numberParam(params.damageClaim) || numberParam(params.amount),
        penaltyClaim: numberParam(params.penaltyClaim),
        evidenceLevel,
        landlordReason: sharedContext || landlordReason,
        reportId,
        title,
        autoGenerate: true,
        sourceLabel: source ? sourceLabels[source] : undefined,
      }
    : reportId
      ? {
          city,
          monthlyRent: numberParam(monthlyRent),
          depositAmount: numberParam(depositAmount),
          evidenceLevel,
          landlordReason: sharedContext,
          reportId,
          title,
        }
    : undefined;

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-7xl min-w-0 space-y-8 overflow-x-hidden">
        <ProductPageHeader
          eyebrow="押金退还"
          title="退租押金退还"
          description="拆分明确费用、争议扣款和可留存材料，评估应退金额和后续沟通重点。"
          icon={KeyRound}
          actions={[
            { label: "补充材料清单", href: evidenceHref, variant: "secondary" },
            { label: "确认扣款依据", href: paymentHref, variant: "secondary" },
          ]}
        />

        <StartHandoffBanner handoff={firstParam(params.handoff)} />

        <DepositRefundPanel initialInput={initialInput} />
      </div>
    </AppShell>
  );
}
