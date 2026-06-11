import { Archive, BookOpenCheck, Scale, SearchCheck } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { ContractRiskList } from "@/components/contract-risk-list";
import { ContractReviewPanel } from "@/components/contract-review-panel";
import { ProductPageHeader } from "@/components/product-page-header";
import { buildFlowHref } from "@/lib/flow-links";
import { contractRisks } from "@/lib/mock-data";

type SearchParams = Record<string, string | string[] | undefined>;

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

const sourceLabels: Record<string, string> = {
  report: "已从报告带入",
  case: "已从房源记录带入",
  payment: "已从付款前确认带入",
  official: "已从官方查询带入",
  evidence: "已从凭据材料带入",
  visit: "已从看房清单带入",
  safety: "已从独居安全带入",
  shared: "已从合租边界带入",
  repair: "已从维修责任带入",
  renewal: "已从续租方案带入",
  move: "已从入住预算带入",
  handover: "已从交割确认带入",
  deposit: "已从押金退还带入",
  plan: "已从下一步带入",
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
    risks: "合同确认提示的风险条款、缺失条款和补充协议要求，需要在付款/签约前保存凭据。",
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
      <div className="mx-auto max-w-7xl space-y-8">
        <ProductPageHeader
          eyebrow="签约前确认"
          title="合同、押金和维修责任，先看清再签字"
      description="合同、押金、授权和维修责任是最容易产生真实损失的环节。这里把官方示范文本、租赁法规和合同常识转成签约前要确认的事项。"
          icon={Scale}
          sideTitle="使用边界"
          sideDescription="提供风险提示和确认清单；重大争议建议咨询律师。所有合同图片和聊天记录都必须由用户主动上传。"
          facts={[
            { label: "重点", value: "出租权、押金、维修、提前退租和费用边界" },
            { label: "适合", value: "拿到合同、补充协议或聊天承诺后" },
            { label: "你会得到", value: "可接受、需修改或先别签" },
          ]}
          actions={[
            { label: "整理凭据材料", href: evidenceHref, icon: Archive },
            { label: "官方查询步骤", href: officialHref, icon: SearchCheck, variant: "secondary" },
            { label: "查看知识库", href: "/knowledge", icon: BookOpenCheck, variant: "secondary" },
          ]}
        />

        <ContractReviewPanel initialInput={initialInput} />

        <section>
          <div className="mb-4">
            <h2 className="text-xl font-semibold">高频合同风险</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              即使不上传完整合同，也可以先用这些高频风险校准签约底线。
            </p>
          </div>
          <ContractRiskList items={contractRisks} />
        </section>

      </div>
    </AppShell>
  );
}
