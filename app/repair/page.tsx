import { Wrench } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { ProductPageHeader } from "@/components/product-page-header";
import { RepairResponsibilityPanel } from "@/components/repair-responsibility-panel";
import { StartHandoffBanner } from "@/components/start-handoff-banner";
import { buildFlowHref, compactContext } from "@/lib/flow-links";
import type { RepairResponsibilityInput } from "@/lib/repair-responsibility";

type SearchParams = Record<string, string | string[] | undefined>;
type RepairPageSeed = Partial<RepairResponsibilityInput> & {
  autoGenerate?: boolean;
  sourceLabel?: string;
  reportId?: string;
};

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function numberParam(value: string | string[] | undefined) {
  const parsed = Number(firstParam(value));
  return Number.isFinite(parsed) ? parsed : undefined;
}

const sourceLabels: Record<string, string> = {
  report: "已从报告带入",
  case: "已从房源记录带入",
  payment: "已从付款咨询带入",
  official: "已从官方查询带入",
  handover: "已从交割验收带入",
  deposit: "已从押金退还带入",
  move: "已从入住预算带入",
  home: "已从首页输入带入",
  plan: "已从当前行动带入",
  evidence: "已从材料清单带入",
  contract: "已从合同确认带入",
  dashboard: "已从工作台输入带入",
};

export default async function RepairPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const params = searchParams ? await searchParams : {};
  const source = firstParam(params.from);
  const canPrefill = Boolean(source && sourceLabels[source]);
  const reportId = firstParam(params.reportId);
  const city = firstParam(params.city);
  const listingTitle = firstParam(params.listingTitle) || firstParam(params.title);
  const monthlyRent = firstParam(params.monthlyRent);
  const depositAmount = firstParam(params.depositAmount);
  const issueType = firstParam(params.issueType);
  const damageScope = firstParam(params.damageScope);
  const evidenceLevel = firstParam(params.evidenceLevel);
  const repairCost = firstParam(params.repairCost);
  const reportContext = firstParam(params.reportContext);
  const notes = firstParam(params.notes);
  const sharedContext = compactContext([
    reportContext,
    notes,
    issueType ? `维修问题：${issueType}` : undefined,
    damageScope ? `影响范围：${damageScope}` : undefined,
  ]);
  const evidenceHref = buildFlowHref("/evidence", {
    from: "repair",
    reportId,
    city,
    title: listingTitle,
    stage: "入住后维修",
    risks: compactContext([
      issueType ? `维修问题：${issueType}` : "维修责任待确认",
      damageScope,
      evidenceLevel,
    ]),
    reportContext: sharedContext,
  });
  const depositHref = buildFlowHref("/deposit", {
    from: "repair",
    reportId,
    city,
    monthlyRent,
    depositAmount,
    damageClaim: repairCost,
    evidenceLevel,
    landlordReason: compactContext([
      "从维修责任判断带入：维修、旧损坏或责任不清可能在退租时变成押金扣款。",
      sharedContext,
    ]),
  });
  const initialInput: RepairPageSeed | undefined = canPrefill
    ? {
        city,
        listingTitle,
        issueType,
        urgency: firstParam(params.urgency),
        damageScope,
        discoveredTiming: firstParam(params.discoveredTiming),
        evidenceLevel,
        contractClause: firstParam(params.contractClause),
        landlordResponse: firstParam(params.landlordResponse),
        repairCost: numberParam(params.repairCost),
        safetyImpact: firstParam(params.safetyImpact),
        tenantCause: firstParam(params.tenantCause),
        depositConcern: firstParam(params.depositConcern),
        notes: sharedContext,
        reportId,
        autoGenerate: true,
        sourceLabel: source ? sourceLabels[source] : undefined,
      }
    : reportId
      ? { city, listingTitle, notes: sharedContext, reportId }
    : undefined;

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-7xl min-w-0 space-y-8 overflow-x-hidden">
        <ProductPageHeader
          eyebrow="维修责任"
          title="维修责任判断"
          description="结合问题原因、合同条款、出租方响应和维修费用，判断责任归属和材料留存重点。"
          icon={Wrench}
          actions={[
            { label: "补充材料清单", href: evidenceHref, variant: "secondary" },
            { label: "进入押金退还", href: depositHref, variant: "secondary" },
          ]}
        />

        <StartHandoffBanner handoff={firstParam(params.handoff)} />

        <RepairResponsibilityPanel initialInput={initialInput} />
      </div>
    </AppShell>
  );
}
