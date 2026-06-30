import { Archive, BadgeDollarSign, Landmark, Scale } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { OfficialVerificationPanel } from "@/components/official-verification-panel";
import { ProductPageHeader } from "@/components/product-page-header";
import { StartHandoffBanner } from "@/components/start-handoff-banner";
import { buildFlowHref } from "@/lib/flow-links";
import type { OfficialVerificationInput } from "@/lib/official-verification";

type SearchParams = Record<string, string | string[] | undefined>;
type OfficialPageSeed = Partial<OfficialVerificationInput> & {
  autoGenerate?: boolean;
  sourceLabel?: string;
  reportId?: string;
};

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

const sourceLabels: Record<string, string> = {
  report: "已从报告带入",
  case: "已从房源记录带入",
  payment: "已从付款咨询带入",
  evidence: "已从材料清单带入",
  contract: "已从合同确认带入",
  visit: "已从看房清单带入",
  safety: "已从独居安全带入",
  shared: "已从合租边界带入",
  move: "已从入住预算带入",
  handover: "已从交割确认带入",
  repair: "已从维修责任带入",
  renewal: "已从续租方案带入",
  deposit: "已从押金退还带入",
  plan: "已从当前行动带入",
  home: "已从首页输入带入",
  dashboard: "已从工作台输入带入",
};

function compactContext(...parts: Array<string | undefined>) {
  return parts
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part))
    .join("\n");
}

export default async function OfficialPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const params = searchParams ? await searchParams : {};
  const source = firstParam(params.from);
  const reportId = firstParam(params.reportId);
  const title = firstParam(params.title) || firstParam(params.listingTitle);
  const city = firstParam(params.city);
  const stage = firstParam(params.stage) || "签约前";
  const address = firstParam(params.address);
  const landlordType =
    firstParam(params.landlordType) ||
    firstParam(params.authorizationStatus) ||
    firstParam(params.identityStatus);
  const contractStatus =
    firstParam(params.contractStatus) ||
    firstParam(params.contractText) ||
    firstParam(params.paymentCycle);
  const concerns = compactContext(
    firstParam(params.concerns),
    firstParam(params.risks),
    firstParam(params.notes),
    firstParam(params.urgencyPressure),
  );
  const reportContext = firstParam(params.reportContext);
  const sourceLabel = source ? sourceLabels[source] : undefined;
  const canPrefill = Boolean(sourceLabel);
  const evidenceHref = buildFlowHref("/evidence", {
    from: "official",
    reportId,
    city,
    title,
    address,
    stage,
    risks:
      concerns ||
      "出租权、备案入口、收款主体和合同示范文本需要在付款或签约前保存材料。",
    reportContext,
  });
  const paymentHref = buildFlowHref("/payment", {
    from: "official",
    reportId,
    city,
    listingTitle: title,
    stage,
    authorizationStatus: landlordType || "出租权或转租授权材料待确认",
    contractStatus: contractStatus || "合同文本和官方示范文本需要对照确认",
    receiptStatus: "收款主体、付款备注和押金去向需要先确认",
    notes: concerns || "来自官方入口确认：主体、授权和收款信息没有确认前，不建议付款。",
    reportContext,
  });
  const contractHref = buildFlowHref("/contract", {
    from: "official",
    reportId,
    city,
    title,
    listingTitle: title,
    stage,
    contractText: compactContext(
      "以下内容来自官方入口确认，不等同于完整合同。请粘贴真实合同、补充协议或聊天确认后再确认：",
      contractStatus,
      concerns,
      reportContext,
    ),
  });
  const initialInput: OfficialPageSeed | undefined = canPrefill
    ? {
        reportId,
        title,
        city,
        stage,
        address,
        landlordType,
        contractStatus,
        concerns,
        reportContext,
        autoGenerate: true,
        sourceLabel,
      }
    : undefined;

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-7xl min-w-0 space-y-8 overflow-x-hidden">
        <ProductPageHeader
          eyebrow="签约前确认"
          title="官方核验"
          description="核对出租权、网签备案、合同示范文本、非居住空间和公共服务材料，保留可追溯的确认记录。"
          icon={Landmark}
          actions={[
            { label: "保存材料", href: evidenceHref, icon: Archive },
            { label: "付款咨询", href: paymentHref, icon: BadgeDollarSign, variant: "secondary" },
            { label: "合同确认", href: contractHref, icon: Scale, variant: "secondary" },
          ]}
        />

        <StartHandoffBanner handoff={firstParam(params.handoff)} />

        <OfficialVerificationPanel initialInput={initialInput} />
      </div>
    </AppShell>
  );
}
