import { PackageCheck } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { HandoverCheckPanel } from "@/components/handover-check-panel";
import { ProductPageHeader } from "@/components/product-page-header";
import { StartHandoffBanner } from "@/components/start-handoff-banner";
import { buildFlowHref, compactContext } from "@/lib/flow-links";
import type { HandoverCheckInput } from "@/lib/handover-check";

type SearchParams = Record<string, string | string[] | undefined>;
type HandoverPageSeed = Partial<HandoverCheckInput> & {
  autoGenerate?: boolean;
  sourceLabel?: string;
  reportId?: string;
  title?: string;
  address?: string;
  reportContext?: string;
};

const sourceLabels: Record<string, string> = {
  report: "已从报告带入",
  case: "已从房源记录带入",
  payment: "已从付款咨询带入",
  official: "已从官方查询带入",
  contract: "已从合同确认带入",
  move: "已从入住预算带入",
  evidence: "已从材料清单带入",
  repair: "已从维修责任带入",
  deposit: "已从押金退还带入",
  renewal: "已从续租方案带入",
  visit: "已从看房清单带入",
  safety: "已从独居安全带入",
  shared: "已从合租边界带入",
  home: "已从首页输入带入",
  plan: "已从当前行动带入",
  dashboard: "已从工作台输入带入",
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

export default async function HandoverPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const params = searchParams ? await searchParams : {};
  const reportId = firstParam(params.reportId);
  const source = firstParam(params.from);
  const city = firstParam(params.city);
  const title = firstParam(params.title);
  const listingTitle = firstParam(params.listingTitle) || title;
  const address = firstParam(params.address);
  const monthlyRent = firstParam(params.monthlyRent) || firstParam(params.rent);
  const depositAmount = firstParam(params.depositAmount) || firstParam(params.deposit) || firstParam(params.amount);
  const reportContext = firstParam(params.reportContext);
  const sharedContext = compactContext([
    reportContext,
    firstParam(params.notes),
    firstParam(params.risks),
    firstParam(params.concerns),
    title ? `当前房源：${title}` : undefined,
    monthlyRent ? `月租：${monthlyRent}` : undefined,
    depositAmount ? `押金或交割金额：${depositAmount}` : undefined,
  ]);
  const evidenceHref = buildFlowHref("/evidence", {
    from: "handover",
    reportId,
    city,
    title,
    address,
    stage: "交割确认",
    deposit: depositAmount ? `押金 ${depositAmount} 元` : undefined,
    risks: "交割当天需要同步钥匙门禁、表读数、旧损坏、家具家电、历史欠费和清洁状态记录。",
    reportContext: sharedContext,
  });
  const repairHref = buildFlowHref("/repair", {
    from: "handover",
    reportId,
    city,
    listingTitle,
    evidenceLevel: "交割记录已整理或待补充",
    depositConcern: "担心维修责任或旧损坏影响退租押金",
    notes: sharedContext,
  });
  const sourceLabel = source ? sourceLabels[source] : undefined;
  const initialInput: HandoverPageSeed | undefined = sourceLabel
    ? {
        city,
        listingTitle,
        title,
        address,
        monthlyRent: numberParam(monthlyRent),
        depositAmount: numberParam(depositAmount),
        notes: sharedContext || firstParam(params.notes),
        reportContext: sharedContext,
        reportId,
        autoGenerate: true,
        sourceLabel,
      }
    : reportId
      ? { reportId }
      : undefined;

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-7xl min-w-0 space-y-8 overflow-x-hidden">
        <ProductPageHeader
          eyebrow="入住交割"
          title="交割确认"
          description="核对钥匙门禁、表读数、家具家电、旧损坏、历史欠费和清洁状态，减少入住后的争议。"
          icon={PackageCheck}
          actions={[
            { label: "同步到材料清单", href: evidenceHref, variant: "secondary" },
            { label: "入住后维修办法", href: repairHref, variant: "secondary" },
          ]}
        />

        <StartHandoffBanner handoff={firstParam(params.handoff)} />

        <HandoverCheckPanel reportId={reportId} initialInput={initialInput} />
      </div>
    </AppShell>
  );
}
