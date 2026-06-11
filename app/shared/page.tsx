import { Archive, BadgeDollarSign, Scale, UsersRound } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { ProductPageHeader } from "@/components/product-page-header";
import { SharedLivingPanel, type SharedLivingSeed } from "@/components/shared-living-panel";
import { buildFlowHref } from "@/lib/flow-links";

type SearchParams = Record<string, string | string[] | undefined>;

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

const sourceLabels: Record<string, string> = {
  report: "已从报告带入",
  case: "已从房源记录带入",
  safety: "已从独居安全带入",
  visit: "已从看房清单带入",
  plan: "已从下一步带入",
  home: "已从首页输入带入",
  payment: "已从付款前确认带入",
  contract: "已从合同确认带入",
  evidence: "已从凭据材料带入",
  dashboard: "已从工作台输入带入",
};

export default async function SharedLivingPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const params = searchParams ? await searchParams : {};
  const source = firstParam(params.from);
  const reportId = firstParam(params.reportId);
  const city = firstParam(params.city);
  const title = firstParam(params.listingTitle) || firstParam(params.title);
  const monthlyRent = firstParam(params.monthlyRent) || firstParam(params.rent);
  const preferences = firstParam(params.preferences);
  const reportContext = firstParam(params.reportContext);
  const contractHref = buildFlowHref("/contract", {
    from: "shared",
    reportId,
    city,
    title,
    listingTitle: title,
    monthlyRent,
    reportContext,
    contractText: compactSharedContractContext(reportContext),
  });
  const evidenceHref = buildFlowHref("/evidence", {
    from: "shared",
    reportId,
    city,
    title,
    stage: "签约前",
    risks: "合租室友规则、公共空间、访客过夜、费用分摊、押金连带和转租授权需要在付款前保存凭据。",
    reportContext,
  });
  const paymentHref = buildFlowHref("/payment", {
    from: "shared",
    reportId,
    city,
    listingTitle: title,
    monthlyRent,
    stage: "合租签约前",
    contractStatus: "合租室友规则、费用分摊和押金责任需要先写清",
    authorizationStatus: "转租授权和实际入住人数待确认",
    refundRule: "押金扣减和公共区域责任需要书面确认",
    notes: "来自合租边界：室友规则、公共空间、访客过夜、费用分摊和押金连带未写清前，不建议付款。",
    reportContext,
  });
  const sourceLabel = source ? sourceLabels[source] : undefined;
  const canPrefill = Boolean(sourceLabel);
  const initialInput: SharedLivingSeed | undefined = canPrefill
    ? {
        city,
        listingTitle: title,
        monthlyRent,
        preferences,
        reportContext,
        concerns: firstParam(params.concerns),
        reportId,
        autoGenerate: source === "home",
        sourceLabel,
      }
    : undefined;

  return (
    <AppShell>
      <div className="mx-auto max-w-7xl space-y-8">
        <ProductPageHeader
          eyebrow="签约前确认"
          title="合租先谈边界，再谈性价比"
          description="合租的低租金经常被室友作息、公共卫生、访客过夜、水电分摊和押金连带责任抵消。先把规则说清、写清、留痕，再决定这间房是否真的值得住。"
          icon={UsersRound}
          sideTitle="不读取私人聊天或室友账号"
          sideDescription="只根据用户主动输入整理合租风险、必须问清的问题和可复制的合租约定。"
          facts={[
            { label: "人", value: "实际入住人数、作息、访客和维修上门" },
            { label: "钱", value: "水电网费、押金连带和公共区扣款" },
            { label: "规则", value: "卫生、噪音、转租授权和提前退租" },
          ]}
          actions={[
            { label: "继续合同确认", href: contractHref, icon: Scale },
            { label: "保存合租凭据", href: evidenceHref, icon: Archive, variant: "secondary" },
            { label: "付款前确认", href: paymentHref, icon: BadgeDollarSign, variant: "secondary" },
          ]}
        />

        <SharedLivingPanel initialInput={initialInput} />
      </div>
    </AppShell>
  );
}

function compactSharedContractContext(reportContext?: string) {
  return [
    "以下内容来自合租边界确认，不等同于完整合同。请粘贴真实合同、补充协议或聊天确认后再确认：",
    reportContext,
    "重点关注：室友规则、公共空间、访客过夜、费用分摊、押金连带、转租授权和提前退租责任。",
  ]
    .filter(Boolean)
    .join("\n\n");
}
