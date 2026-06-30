import { Archive, BadgeDollarSign, ClipboardCheck, KeyRound, SearchCheck } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { EvidenceVaultPanel } from "@/components/evidence-vault-panel";
import { ProductPageHeader } from "@/components/product-page-header";
import { StartHandoffBanner } from "@/components/start-handoff-banner";
import { buildFlowHref, compactContext } from "@/lib/flow-links";
import type { EvidencePackInput } from "@/lib/evidence-pack";

type SearchParams = Record<string, string | string[] | undefined>;
type EvidencePageSeed = Partial<EvidencePackInput> & {
  autoGenerate?: boolean;
  sourceLabel?: string;
  reportId?: string;
};

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function labeled(label: string, value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed ? `${label}：${trimmed}` : undefined;
}

function moneyLabel(label: string, value: string | undefined) {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  return `${label}：${trimmed}${/[元¥￥]/.test(trimmed) ? "" : " 元"}`;
}

function firstNumberText(value: string | undefined) {
  return value?.replace(/,/g, "").match(/\d+(\.\d+)?/)?.[0];
}

const sourceLabels: Record<string, string> = {
  report: "已从报告带入",
  case: "已从房源记录带入",
  plan: "已从当前行动带入",
  home: "已从首页输入带入",
  area: "已从片区筛选带入",
  commute: "已从通勤成本带入",
  life: "已从生活配套带入",
  official: "已从官方查询带入",
  payment: "已从付款咨询带入",
  visit: "已从看房清单带入",
  safety: "已从独居安全带入",
  shared: "已从合租边界带入",
  contract: "已从合同确认带入",
  move: "已从入住预算带入",
  handover: "已从交割验收带入",
  repair: "已从维修责任带入",
  renewal: "已从续租方案带入",
  deposit: "已从押金退还带入",
  dashboard: "已从工作台输入带入",
};

export default async function EvidencePage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const params = searchParams ? await searchParams : {};
  const source = firstParam(params.from);
  const reportId = firstParam(params.reportId);
  const city = firstParam(params.city);
  const title = firstParam(params.title) || firstParam(params.listingTitle);
  const address = firstParam(params.address);
  const stage =
    firstParam(params.stage) ||
    (source === "payment" ? "交定金前" : source === "handover" ? "交割确认" : "签约前");
  const paymentType = firstParam(params.paymentType);
  const amount = firstParam(params.amount);
  const monthlyRent = firstParam(params.monthlyRent) || firstParam(params.rent);
  const depositAmount = firstParam(params.depositAmount);
  const contractStatus = firstParam(params.contractStatus);
  const authorizationStatus = firstParam(params.authorizationStatus);
  const identityStatus = firstParam(params.identityStatus);
  const payeeType = firstParam(params.payeeType);
  const payeeMatchesContract = firstParam(params.payeeMatchesContract);
  const refundRule = firstParam(params.refundRule);
  const receiptStatus = firstParam(params.receiptStatus);
  const paymentChannel = firstParam(params.paymentChannel);
  const urgencyPressure = firstParam(params.urgencyPressure);
  const notes = firstParam(params.notes);
  const concerns = firstParam(params.concerns);
  const landlordType =
    compactContext([
      firstParam(params.landlordType),
      labeled("授权状态", authorizationStatus),
      labeled("身份状态", identityStatus),
      labeled("收款主体", payeeType),
    ]) || undefined;
  const deposit =
    compactContext([
      firstParam(params.deposit),
      moneyLabel("押金", depositAmount),
      moneyLabel(paymentType || "拟付款", amount),
      moneyLabel("月租", monthlyRent),
    ]) || undefined;
  const paymentCycle =
    compactContext([
      firstParam(params.paymentCycle),
      labeled("付款渠道", paymentChannel),
      labeled("收款主体一致性", payeeMatchesContract),
      labeled("收据材料", receiptStatus),
    ]) || undefined;
  const risks =
    compactContext([
      firstParam(params.risks),
      concerns,
      notes,
      labeled("催付压力", urgencyPressure),
      labeled("合同状态", contractStatus),
      labeled("授权状态", authorizationStatus),
      labeled("退款规则", refundRule),
      labeled("收据材料", receiptStatus),
      labeled("付款渠道", paymentChannel),
      paymentType || amount
        ? `付款场景：${paymentType || "拟付款"}${amount ? ` ${amount} 元` : ""}`
        : undefined,
    ]) || undefined;
  const reportContext = firstParam(params.reportContext);
  const upstreamContext = compactContext([reportContext, risks]) || undefined;
  const moneyAmount = firstNumberText(deposit) || firstNumberText(monthlyRent);
  const officialHref = buildFlowHref("/official", {
    from: "evidence",
    reportId,
    city,
    title,
    address,
    stage,
    landlordType,
    contractStatus: contractStatus || "材料清单提示仍需确认合同、授权和备案材料",
  concerns: risks || "材料清单提示需要继续确认出租权、备案办理办法、合同要求和收款主体。",
    reportContext: upstreamContext,
  });
  const paymentHref = buildFlowHref("/payment", {
    from: "evidence",
    reportId,
    city,
    title,
    listingTitle: title,
    stage,
    paymentType: paymentType || "定金",
    amount,
    monthlyRent,
    contractStatus: contractStatus || "材料清单提示合同和授权仍需确认",
    authorizationStatus: authorizationStatus || landlordType,
    identityStatus,
    payeeType,
    payeeMatchesContract,
    refundRule: refundRule || "退款条件待书面确认",
    receiptStatus,
    paymentChannel,
    urgencyPressure,
    notes:
      compactContext([
        "来自材料清单：付款前先确认授权、押金、维修、付款备注和收据材料。",
        risks,
      ]) || undefined,
    reportContext: upstreamContext,
  });
  const handoverHref = buildFlowHref("/handover", {
    from: "evidence",
    reportId,
    city,
    title,
    address,
    listingTitle: title,
    monthlyRent,
    depositAmount: moneyAmount,
    notes: risks,
    reportContext: upstreamContext,
  });
  const depositHref = buildFlowHref("/deposit", {
    from: "evidence",
    reportId,
    city,
    title,
    listingTitle: title,
    depositAmount: moneyAmount,
    evidenceLevel: "部分材料",
    landlordReason: risks,
    reportContext: upstreamContext,
  });
  const canPrefill = Boolean(source && sourceLabels[source]);
  const initialInput: EvidencePageSeed | undefined = canPrefill
    ? {
        reportId,
        stage,
        title,
        city,
        address,
        landlordType,
        deposit,
        paymentCycle,
        risks,
        reportContext: upstreamContext,
        autoGenerate: true,
        sourceLabel: source ? sourceLabels[source] : undefined,
      }
    : undefined;

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-7xl min-w-0 space-y-8 overflow-x-hidden">
        <ProductPageHeader
          eyebrow="签约前确认"
          title="材料清单"
          description="整理出租权、押金、维修、交割和聊天确认，形成付款或签约前可核对的材料清单。"
          icon={Archive}
          actions={[
            { label: "官方查询步骤", href: officialHref, icon: SearchCheck },
            { label: "付款咨询", href: paymentHref, icon: BadgeDollarSign, variant: "secondary" },
            { label: "交割确认", href: handoverHref, icon: ClipboardCheck, variant: "secondary" },
            { label: "押金退还", href: depositHref, icon: KeyRound, variant: "secondary" },
          ]}
        />

        <StartHandoffBanner handoff={firstParam(params.handoff)} />

        <EvidenceVaultPanel initialInput={initialInput} />
      </div>
    </AppShell>
  );
}
