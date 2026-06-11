import { BadgeDollarSign, ClipboardCheck, ShieldCheck, UsersRound } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { ProductPageHeader } from "@/components/product-page-header";
import { SafetyAuditPanel, type SafetyAuditSeed } from "@/components/safety-audit-panel";
import { buildFlowHref } from "@/lib/flow-links";

type SearchParams = Record<string, string | string[] | undefined>;

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

const sourceLabels: Record<string, string> = {
  report: "已从报告带入",
  case: "已从房源记录带入",
  visit: "已从看房清单带入",
  plan: "已从下一步带入",
  home: "已从首页输入带入",
  payment: "已从付款前确认带入",
  contract: "已从合同确认带入",
  evidence: "已从凭据材料带入",
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
    receiptStatus: "夜间路线、门禁楼道和维修上门边界需要先保存凭据",
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
      <div className="mx-auto max-w-7xl space-y-8">
        <ProductPageHeader
          eyebrow="签约前确认"
          title="独居安全不能只靠感觉"
          description="对第一次独居、女生独居和经常晚归的用户来说，“这套房安全吗”不能只靠感觉。把夜间路线、门禁、楼道、电梯、低楼层、人际边界和快递外卖逐项确认，再决定是否继续看房、付款或签约。"
          icon={ShieldCheck}
          sideTitle="安全确认，不涉及监控"
          sideDescription="不读取实时定位、不读聊天、不接入私人账号。所有判断来自用户主动输入，整理成现场确认事项和边界提醒。"
          facts={[
            { label: "路线", value: "晚归路线、照明、人流和打车落点" },
            { label: "楼栋", value: "门禁、楼道、电梯、低楼层和维修上门" },
            { label: "边界", value: "快递外卖、邻里距离和隐私风险" },
          ]}
          actions={[
            { label: "整理看房清单", href: visitHref, icon: ClipboardCheck },
            { label: "合租边界", href: sharedHref, icon: UsersRound, variant: "secondary" },
            { label: "付款前确认", href: paymentHref, icon: BadgeDollarSign, variant: "secondary" },
          ]}
        />

        <SafetyAuditPanel initialInput={initialInput} />
      </div>
    </AppShell>
  );
}
