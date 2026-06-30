import { Truck } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { MoveBudgetPanel } from "@/components/move-budget-panel";
import { ProductPageHeader } from "@/components/product-page-header";
import { StartHandoffBanner } from "@/components/start-handoff-banner";
import { buildFlowHref, compactContext } from "@/lib/flow-links";
import type { MoveBudgetInput } from "@/lib/move-budget";

type SearchParams = Record<string, string | string[] | undefined>;
type MoveBudgetSeed = Partial<MoveBudgetInput> & {
  reportId?: string;
  sourceLabel?: string;
  reportContext?: string;
  listingTitle?: string;
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
  evidence: "已从材料清单带入",
  contract: "已从合同确认带入",
  handover: "已从交割验收带入",
  repair: "已从维修责任带入",
  renewal: "已从续租方案带入",
  deposit: "已从押金退还带入",
  compare: "已从多房源对比带入",
  home: "已从首页输入带入",
  plan: "已从当前行动带入",
  dashboard: "已从工作台输入带入",
};

export default async function MovePage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const params = searchParams ? await searchParams : {};
  const reportId = firstParam(params.reportId);
  const source = firstParam(params.from);
  const city = firstParam(params.city);
  const title = firstParam(params.title) || firstParam(params.listingTitle);
  const monthlyRent = firstParam(params.monthlyRent) || firstParam(params.rent) || firstParam(params.currentRent);
  const upfrontAmount =
    firstParam(params.upfrontCost) ||
    firstParam(params.amount) ||
    firstParam(params.depositAmount) ||
    firstParam(params.deposit);
  const reportContext = firstParam(params.reportContext);
  const sharedContext = compactContext([
    reportContext,
    firstParam(params.notes),
    firstParam(params.risks),
    firstParam(params.concerns),
    firstParam(params.contractStatus),
    title ? `当前房源：${title}` : undefined,
    monthlyRent ? `月租：${monthlyRent}` : undefined,
    upfrontAmount ? `首笔或押金金额：${upfrontAmount}` : undefined,
  ]);
  const initialInput: MoveBudgetSeed | undefined =
    reportId || city || monthlyRent || sharedContext
      ? {
          reportId,
          sourceLabel: source ? sourceLabels[source] : undefined,
          reportContext: sharedContext,
          listingTitle: title,
          city,
          monthlyIncome: numberParam(params.monthlyIncome),
          cashOnHand: numberParam(params.cashOnHand),
          monthlyRent: numberParam(monthlyRent),
          depositMonths: numberParam(params.depositMonths),
          prepaidMonths: numberParam(params.prepaidMonths),
          agencyFee: numberParam(params.agencyFee),
          serviceFee: numberParam(params.serviceFee),
          movingCost: numberParam(params.movingCost),
          setupCost: numberParam(params.setupCost),
          utilityDeposit: numberParam(params.utilityDeposit),
          fixedMonthlyCost: numberParam(params.fixedMonthlyCost),
          daysUntilSalary: numberParam(params.daysUntilSalary),
        }
      : undefined;
  const paymentHref = buildFlowHref("/payment", {
    from: "move",
    reportId,
    city,
    title,
    listingTitle: title,
    paymentType: "首笔租金/押金/服务费",
    amount: upfrontAmount,
    monthlyRent,
    stage: "签约前，已测算入住预算",
    contractStatus: "付款周期、押金、中介费/服务费和收款主体待确认",
    refundRule: "押金、定金、服务费、提前退租和退款条件待写清",
    receiptStatus: "中介费/服务费/押金需要收据或电子确认",
    urgencyPressure: "首笔支出会影响现金安全垫，付款前需要再次确认",
    notes: compactContext([
      "入住预算已提示首笔支出、安全垫和发薪前压力。付款前继续确认合同、授权、收款主体、退款条件和收据材料。",
      sharedContext,
    ]),
    reportContext: sharedContext,
  });
  const handoverHref = buildFlowHref("/handover", {
    from: "move",
    reportId,
    city,
    title,
    listingTitle: title,
    monthlyRent,
    reportContext: sharedContext,
  });

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-7xl min-w-0 space-y-8 overflow-x-hidden">
        <ProductPageHeader
          eyebrow="入住现金流"
          title="入住预算"
          description="计算押金、预付租金、中介费、搬家、添置和发薪前生活缓冲，评估首笔现金压力。"
          icon={Truck}
          actions={[
            { label: "付款咨询", href: paymentHref, variant: "secondary" },
            { label: "准备交割确认", href: handoverHref, variant: "secondary" },
          ]}
        />

        <StartHandoffBanner handoff={firstParam(params.handoff)} />

        <MoveBudgetPanel reportId={reportId} initialInput={initialInput} />
      </div>
    </AppShell>
  );
}
