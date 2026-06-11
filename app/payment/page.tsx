import { Archive, BadgeDollarSign, Scale, SearchCheck } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { PaymentGatePanel } from "@/components/payment-gate-panel";
import { ProductPageHeader } from "@/components/product-page-header";
import { buildFlowHref, compactContext } from "@/lib/flow-links";
import type { PaymentGateInput } from "@/lib/payment-gate";

type SearchParams = Record<string, string | string[] | undefined>;
type PaymentPageSeed = Partial<PaymentGateInput> & {
  autoGenerate?: boolean;
  sourceLabel?: string;
  reportId?: string;
};

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function firstNumberParam(...values: Array<string | string[] | undefined>) {
  for (const value of values) {
    const raw = firstParam(value);
    const match = raw?.replace(/,/g, "").match(/\d+(\.\d+)?/);
    if (match) return Number(match[0]);
  }
  return undefined;
}

function labeled(label: string, value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed ? `${label}：${trimmed}` : undefined;
}

const sourceLabels: Record<string, string> = {
  report: "已从报告带入",
  official: "已从官方查询带入",
  case: "已从房源记录带入",
  plan: "已从下一步带入",
  area: "已从片区筛选带入",
  commute: "已从通勤成本带入",
  life: "已从生活配套带入",
  visit: "已从看房清单带入",
  safety: "已从独居安全带入",
  shared: "已从合租边界带入",
  evidence: "已从凭据材料带入",
  contract: "已从合同确认带入",
  move: "已从入住预算带入",
  handover: "已从交割验收带入",
  repair: "已从维修责任带入",
  renewal: "已从续租方案带入",
  deposit: "已从押金退还带入",
  compare: "已从多房源对比带入",
  home: "已从首页输入带入",
  dashboard: "已从工作台输入带入",
};

export default async function PaymentPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const params = searchParams ? await searchParams : {};
  const source = firstParam(params.from);
  const reportId = firstParam(params.reportId);
  const city = firstParam(params.city);
  const listingTitle =
    firstParam(params.listingTitle) || firstParam(params.title) || firstParam(params.currentTitle);
  const stage =
    firstParam(params.stage) ||
    (source === "repair"
      ? "入住后维修付款前"
      : source === "deposit"
        ? "退租押金争议中"
        : source === "handover"
          ? "交割确认前"
          : source === "renewal"
            ? "续租补充协议付款前"
          : "看房后，未签合同");
  const paymentType =
    firstParam(params.paymentType) ||
    (source === "repair"
      ? "维修垫付款"
      : source === "deposit"
        ? "押金争议"
        : source === "move"
          ? "首笔租金/押金"
          : source === "renewal"
            ? "续租首笔租金/押金调整"
            : source === "handover"
              ? "交割确认/历史欠费补付争议"
          : "定金");
  const amount =
    firstNumberParam(
      params.amount,
      params.repairCost,
      params.damageClaim,
      params.depositAmount,
      params.utilityBalance,
      params.proposedRent,
      params.currentRent,
    ) ?? undefined;
  const monthlyRent =
    firstNumberParam(params.monthlyRent, params.rent, params.proposedRent, params.currentRent) ??
    undefined;
  const contractStatus =
    firstParam(params.contractStatus) ||
    firstParam(params.contractClause) ||
    firstParam(params.paymentCycle);
  const identityStatus = firstParam(params.identityStatus);
  const authorizationStatus =
    firstParam(params.authorizationStatus) ||
    firstParam(params.landlordType) ||
    firstParam(params.tenantCause);
  const payeeType = firstParam(params.payeeType);
  const payeeMatchesContract = firstParam(params.payeeMatchesContract);
  const refundRule =
    firstParam(params.refundRule) ||
    firstParam(params.landlordReason) ||
    firstParam(params.depositRisk);
  const receiptStatus =
    firstParam(params.receiptStatus) ||
    firstParam(params.evidenceLevel) ||
    firstParam(params.proofStatus);
  const paymentChannel = firstParam(params.paymentChannel);
  const urgencyPressure = firstParam(params.urgencyPressure);
  const notes = compactContext([
    firstParam(params.notes),
    firstParam(params.risks),
    firstParam(params.concerns),
    firstParam(params.issueType) ? `维修问题：${firstParam(params.issueType)}` : undefined,
    firstParam(params.damageScope) ? `影响范围：${firstParam(params.damageScope)}` : undefined,
    firstParam(params.evidenceLevel) ? `凭据状态：${firstParam(params.evidenceLevel)}` : undefined,
    firstParam(params.landlordReason) ? `出租方/扣款理由：${firstParam(params.landlordReason)}` : undefined,
    source === "handover" ? "交割信息未确认前，不建议把钥匙交接当成付款已经安全的信号。" : undefined,
    source === "repair" ? "维修责任和费用边界未确认前，不建议直接垫付维修费。" : undefined,
    source === "deposit" ? "押金扣款依据未拆清前，不建议签署扣款确认或放弃追偿。" : undefined,
    source === "shared" ? "合租费用、押金连带和转租授权未写清前，不建议付款。" : undefined,
    source === "safety" ? "独居安全风险点未确认前，不建议用定金锁房。" : undefined,
    source === "renewal" ? "续租补充协议、押金沿用/调整、付款周期和维修承诺未写清前，不建议先付新租金。" : undefined,
  ]);
  const reportContext = firstParam(params.reportContext);
  const upstreamContext = compactContext([reportContext, notes]);
  const officialHref = buildFlowHref("/official", {
    from: "payment",
    reportId,
    city,
    title: listingTitle,
    stage,
    contractStatus,
    landlordType: authorizationStatus,
    concerns: compactContext([
  "付款前确认提示补充出租权、备案办理办法、合同底线和收款主体，再考虑转账。",
      notes,
    ]),
    reportContext: upstreamContext,
  });
  const contractHref = buildFlowHref("/contract", {
    from: "payment",
    reportId,
    city,
    title: listingTitle,
    reportContext: upstreamContext,
    contractText: [
      "以下内容来自付款前确认，不等同于完整合同。请粘贴真实合同条款后再确认：",
      upstreamContext,
      `当前付款阶段：${stage}`,
      contractStatus ? `合同状态：${contractStatus}` : "",
      authorizationStatus ? `授权状态：${authorizationStatus}` : "",
      refundRule ? `退款/押金规则：${refundRule}` : "",
      receiptStatus ? `收据材料：${receiptStatus}` : "",
    ]
      .filter(Boolean)
      .join("\n"),
  });
  const evidenceHref = buildFlowHref("/evidence", {
    from: "payment",
    reportId,
    city,
    title: listingTitle,
    listingTitle,
    stage,
    paymentType,
    amount,
    monthlyRent,
    contractStatus,
    authorizationStatus,
    identityStatus,
    payeeType,
    payeeMatchesContract,
    refundRule,
    receiptStatus,
    paymentChannel,
    urgencyPressure,
    notes: compactContext([
      "来自付款前确认：先把合同、授权、收款主体、退款条件、收据材料和付款备注补充，再决定是否转账。",
      notes,
      labeled("拟付款类型", paymentType),
    ]),
    reportContext: upstreamContext,
  });
  const canPrefill = Boolean(source && sourceLabels[source]);
  const initialInput: PaymentPageSeed | undefined = canPrefill
    ? {
        reportId,
        city,
        listingTitle,
        paymentType,
        amount,
        monthlyRent,
        stage,
        contractStatus,
        identityStatus,
        authorizationStatus,
        payeeType,
        payeeMatchesContract,
        refundRule,
        receiptStatus,
        paymentChannel,
        urgencyPressure,
        notes,
        reportContext: upstreamContext,
        autoGenerate: true,
        sourceLabel: source ? sourceLabels[source] : undefined,
      }
    : undefined;

  return (
    <AppShell>
      <div className="mx-auto max-w-7xl space-y-8">
        <ProductPageHeader
          eyebrow="签约前确认"
          title="钱转出去之前，先确认能不能付"
          description="最容易出问题的时刻，往往是“先交定金锁房”“服务费先转我”“合同明天补”。先确认合同、授权、收款主体、退款条件和收据，再决定钱能不能打出去。"
          icon={BadgeDollarSign}
          sideTitle="先确认付款条件"
          sideDescription="本页只做付款前风险判断，不代付、不托管、不读取支付账户。高风险项未解除前，建议回到官方查询、凭据材料和合同确认。"
          facts={[
            { label: "先确认", value: "合同、授权、收款主体是否一致" },
            { label: "再确认", value: "退款条件、收据材料和付款备注" },
            { label: "最后决定", value: "先别付、小额保留或可以继续" },
          ]}
          actions={[
            { label: "补官方查询", href: officialHref, icon: SearchCheck },
            { label: "整理付款凭据", href: evidenceHref, icon: Archive, variant: "secondary" },
            { label: "继续合同确认", href: contractHref, icon: Scale, variant: "secondary" },
          ]}
        />

        <PaymentGatePanel initialInput={initialInput} />
      </div>
    </AppShell>
  );
}
