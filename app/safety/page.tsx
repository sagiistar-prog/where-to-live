import { BadgeDollarSign, ClipboardCheck, ShieldCheck, UsersRound } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { ProductPageHeader } from "@/components/product-page-header";
import { SafetyAuditPanel, type SafetyAuditSeed } from "@/components/safety-audit-panel";
import { StartHandoffBanner } from "@/components/start-handoff-banner";
import { buildFlowHref } from "@/lib/flow-links";

type SearchParams = Record<string, string | string[] | undefined>;

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

const sourceLabels: Record<string, string> = {
  report: "已从报告带入",
  case: "已从房源记录带入",
  visit: "已从看房清单带入",
  plan: "已从当前行动带入",
  home: "已从首页输入带入",
  payment: "已从付款咨询带入",
  contract: "已从合同确认带入",
  evidence: "已从材料清单带入",
  dashboard: "已从工作台输入带入",
};

export default async function SafetyPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const params = searchParams ? await searchParams : {};
  const source = firstParam(params.from);
  const reportId = firstParam(params.reportId);
  const city = firstParam(params.city);
  const title = firstParam(params.listingTitle) || firstParam(params.title);
  const floor = firstParam(params.floor);
  const preferences = firstParam(params.preferences);
  const reportContext = firstParam(params.reportContext);
  const visitHref = buildFlowHref("/visit", {
    from: "safety",
    reportId,
    city,
    title,
    floor,
    preferences,
    reportContext,
    concerns: "独居安全确认后回到现场确认，把夜间路线、门禁楼道、低楼层窗户和隐私边界变成看房时必须拍、必须问的问题。",
  });
  const sharedHref = buildFlowHref("/shared", {
    from: "safety",
    reportId,
    city,
    title,
    listingTitle: title,
    floor,
    preferences,
    reportContext,
    concerns: "独居安全确认后继续确认合租室友、公共空间、访客、费用分摊和维修上门边界。",
  });
  const paymentHref = buildFlowHref("/payment", {
    from: "safety",
    reportId,
    city,
    listingTitle: title,
    stage: "看房后，未签合同",
    contractStatus: "独居安全风险点未确认前，不建议用定金锁房",
    receiptStatus: "夜间路线、门禁楼道和维修上门边界需要先保存记录",
    notes: firstParam(params.concerns) || reportContext,
    reportContext,
  });
  const sourceLabel = source ? sourceLabels[source] : undefined;
  const canPrefill = Boolean(sourceLabel);
  const initialInput: SafetyAuditSeed | undefined = canPrefill
    ? {
        city,
        listingTitle: title,
        floor,
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
      <div className="mx-auto w-full max-w-7xl min-w-0 space-y-8 overflow-x-hidden">
        <ProductPageHeader
          eyebrow="签约前确认"
          title="独居安全"
          description="逐项确认夜间路线、门禁、楼道、电梯、低楼层、人际边界和快递外卖，再决定是否继续看房、付款或签约。"
          icon={ShieldCheck}
          actions={[
            { label: "整理看房清单", href: visitHref, icon: ClipboardCheck },
            { label: "合租边界", href: sharedHref, icon: UsersRound, variant: "secondary" },
            { label: "付款咨询", href: paymentHref, icon: BadgeDollarSign, variant: "secondary" },
          ]}
        />

        <StartHandoffBanner handoff={firstParam(params.handoff)} />

        <SafetyAuditPanel initialInput={initialInput} />
      </div>
    </AppShell>
  );
}
