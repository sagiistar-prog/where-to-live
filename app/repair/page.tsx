import Link from "next/link";
import { Wrench } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { RepairResponsibilityPanel } from "@/components/repair-responsibility-panel";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
  payment: "已从付款前确认带入",
  official: "已从官方查询带入",
  handover: "已从交割验收带入",
  deposit: "已从押金退还带入",
  move: "已从入住预算带入",
  home: "已从首页输入带入",
  plan: "已从下一步带入",
  evidence: "已从凭据材料带入",
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
  const handoverHref = buildFlowHref("/handover", {
    from: "repair",
    reportId,
    city,
    title: listingTitle,
    listingTitle,
    monthlyRent,
    depositAmount,
    reportContext: sharedContext,
  });
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
  const paymentHref = buildFlowHref("/payment", {
    from: "repair",
    reportId,
    city,
    title: listingTitle,
    listingTitle,
    paymentType: "维修垫付款",
    amount: repairCost,
    monthlyRent,
    stage: "入住后维修付款前",
    contractStatus: firstParam(params.contractClause),
    authorizationStatus: firstParam(params.tenantCause),
    receiptStatus: evidenceLevel,
    refundRule: firstParam(params.depositConcern),
    notes: compactContext([
      "从维修责任判断带入：责任归属、费用边界、报修凭据和维修结果未确认前，不建议直接垫付维修费。",
      sharedContext,
      firstParam(params.landlordResponse) ? `出租方响应：${firstParam(params.landlordResponse)}` : undefined,
      firstParam(params.safetyImpact) ? `安全影响：${firstParam(params.safetyImpact)}` : undefined,
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
      <div className="mx-auto max-w-7xl space-y-8">
        <section className="grid gap-6 lg:grid-cols-[0.62fr_0.38fr]">
          <div>
            <p className="text-sm text-primary/80">
              Repair Responsibility
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-normal sm:text-4xl">
              维修责任判断
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground">
              入住后最容易被低估的损失，是漏水、发霉、家电故障、门锁失效和旧损坏责任。这里把问题、凭据、合同条款、出租方响应和维修费用放在一起判断，避免先自费维修，退租时又被扣押金。
            </p>
          </div>
          <Card className="p-6">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-md bg-primary/15 text-primary">
              <Wrench className="h-6 w-6" />
            </div>
            <h2 className="text-lg font-semibold">先确认责任和费用边界</h2>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">
              先确认问题来源、责任归属、费用边界、维修时限和维修结果。需要付款或退租时，再把凭据同步到付款前确认和押金退还。
              </p>
            <div className="mt-5 grid gap-3">
              <Button asChild variant="secondary" className="w-full">
                <Link href={handoverHref}>回看交割记录</Link>
              </Button>
              <Button asChild variant="secondary" className="w-full">
                <Link href={evidenceHref}>补充凭据材料</Link>
              </Button>
              <Button asChild variant="secondary" className="w-full">
              <Link href={paymentHref}>查看维修垫付付款确认</Link>
              </Button>
              <Button asChild variant="secondary" className="w-full">
                <Link href={depositHref}>进入押金退还</Link>
              </Button>
            </div>
          </Card>
        </section>

        <RepairResponsibilityPanel initialInput={initialInput} />
      </div>
    </AppShell>
  );
}
