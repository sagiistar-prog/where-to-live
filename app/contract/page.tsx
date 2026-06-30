import { Archive, Scale, SearchCheck } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { ContractReviewPanel } from "@/components/contract-review-panel";
import { ProductPageHeader } from "@/components/product-page-header";
import { StartHandoffBanner } from "@/components/start-handoff-banner";
import { buildFlowHref } from "@/lib/flow-links";

type SearchParams = Record<string, string | string[] | undefined>;

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

const sourceLabels: Record<string, string> = {
  report: "已从报告带入",
  case: "已从房源记录带入",
  payment: "已从付款咨询带入",
  official: "已从官方查询带入",
  evidence: "已从材料清单带入",
  visit: "已从看房清单带入",
  safety: "已从独居安全带入",
  shared: "已从合租边界带入",
  repair: "已从维修责任带入",
  renewal: "已从续租方案带入",
  move: "已从入住预算带入",
  handover: "已从交割确认带入",
  deposit: "已从押金退还带入",
  plan: "已从当前行动带入",
  home: "已从首页输入带入",
  dashboard: "已从工作台输入带入",
};

export default async function ContractPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const params = searchParams ? await searchParams : {};
  const source = firstParam(params.from);
  const reportId = firstParam(params.reportId);
  const city = firstParam(params.city);
  const title = firstParam(params.title) || firstParam(params.listingTitle);
  const reportContext = firstParam(params.reportContext);
  const upstreamContractContext = firstParam(params.contractText);
  const evidenceHref = buildFlowHref("/evidence", {
    from: "contract",
    reportId,
    city,
    title,
    stage: "签约前",
    risks: "合同确认提示的风险条款、缺失条款和补充协议要求，需要在付款或签约前保存材料。",
    reportContext,
  });
  const officialHref = buildFlowHref("/official", {
    from: "contract",
    reportId,
    city,
    title,
    stage: "签约前",
  contractStatus: "已进入合同确认，仍需确认出租权、备案办理办法、合同示范文本和收款主体。",
    concerns: "合同风险需要回到官方公开入口确认可查事项，本页会整理确认事项和后续问题。",
    reportContext,
  });
  const canPrefill = Boolean(source && sourceLabels[source]);
  const homepageContractText = source === "home" ? upstreamContractContext : undefined;
  const initialInput = canPrefill
    ? {
        city,
        reportId,
        text: homepageContractText,
        upstreamContext: homepageContractText
          ? undefined
          : upstreamContractContext ||
            [
              "以下内容来自上一步结果，不等同于完整合同。请粘贴真实合同条款后再确认：",
              reportContext,
            ]
              .filter(Boolean)
              .join("\n\n"),
        sourceLabel: source ? sourceLabels[source] : undefined,
      }
    : undefined;

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-7xl min-w-0 space-y-8 overflow-x-hidden">
        <ProductPageHeader
          eyebrow="签约前确认"
          title="合同确认"
          description="围绕合同主体、押金、授权、维修责任和提前退租条款，整理签约前需要确认的事项。"
          icon={Scale}
          actions={[
            { label: "整理材料清单", href: evidenceHref, icon: Archive },
            { label: "官方查询步骤", href: officialHref, icon: SearchCheck, variant: "secondary" },
          ]}
        />

        <StartHandoffBanner handoff={firstParam(params.handoff)} />

        <ContractReviewPanel initialInput={initialInput} />
      </div>
    </AppShell>
  );
}
