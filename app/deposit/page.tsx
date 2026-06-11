import Link from "next/link";
import { KeyRound } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { DepositRefundPanel } from "@/components/deposit-refund-panel";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { buildFlowHref, compactContext } from "@/lib/flow-links";
import type { DepositRefundInput } from "@/lib/deposit-refund";

type SearchParams = Record<string, string | string[] | undefined>;
type DepositPageSeed = Partial<DepositRefundInput> & {
  autoGenerate?: boolean;
  sourceLabel?: string;
  reportId?: string;
  title?: string;
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

const sourceLabels: Record<string, string> = {
  report: "已从房源报告带入",
  case: "已从房源记录带入",
  payment: "已从付款前确认带入",
  official: "已从官方查询带入",
  contract: "已从合同确认带入",
  move: "已从入住预算带入",
  handover: "已从交割验收带入",
  repair: "已从维修责任带入",
  renewal: "已从续租方案带入",
  evidence: "已从凭据材料带入",
  compare: "已从多房源对比带入",
  home: "已从首页输入带入",
  plan: "已从下一步带入",
  dashboard: "已从工作台输入带入",
};

export default async function DepositPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const params = searchParams ? await searchParams : {};
  const source = firstParam(params.from);
  const canPrefill = Boolean(source && sourceLabels[source]);
  const reportId = firstParam(params.reportId);
  const city = firstParam(params.city);
  const title = firstParam(params.title) || firstParam(params.listingTitle) || firstParam(params.currentTitle);
  const monthlyRent = firstParam(params.monthlyRent) || firstParam(params.currentRent) || firstParam(params.rent);
  const depositAmount =
    firstParam(params.depositAmount) || firstParam(params.deposit) || firstParam(params.amount) || monthlyRent;
  const evidenceLevel = firstParam(params.evidenceLevel);
  const landlordReason =
    firstParam(params.landlordReason) ||
    firstParam(params.concerns) ||
    firstParam(params.refundRule) ||
    firstParam(params.notes);
  const reportContext = firstParam(params.reportContext);
  const sharedContext = compactContext([
    reportContext,
    landlordReason,
    firstParam(params.risks),
    title ? `当前房源：${title}` : undefined,
    monthlyRent ? `月租：${monthlyRent}` : undefined,
    depositAmount ? `押金：${depositAmount}` : undefined,
  ]);
  const handoverHref = buildFlowHref("/handover", {
    from: "deposit",
    reportId,
    city,
    title,
    listingTitle: title,
    monthlyRent,
    depositAmount,
    reportContext: sharedContext,
  });
  const repairHref = buildFlowHref("/repair", {
    from: "deposit",
    reportId,
    city,
    listingTitle: title,
    evidenceLevel,
    repairCost: firstParam(params.damageClaim),
    depositConcern: "已经进入退租押金扣款争议",
    notes: sharedContext,
  });
  const renewalHref = buildFlowHref("/renewal", {
    from: "deposit",
    reportId,
    city,
    listingTitle: title,
    currentRent: monthlyRent,
    depositRisk: depositAmount,
    notes: sharedContext,
  });
  const officialHref = buildFlowHref("/official", {
    from: "deposit",
    reportId,
    city,
    title,
    stage: "退租押金争议/扣款依据确认",
    contractStatus: "押金返还、扣款条件和维修责任条款待确认",
    concerns: compactContext([
  "押金退还页提示：需要确认押金返还期限、扣款依据、维修责任和官方投诉/调解办法。",
      landlordReason,
      sharedContext,
    ]),
    reportContext: sharedContext,
  });
  const paymentHref = buildFlowHref("/payment", {
    from: "deposit",
    reportId,
    city,
    title,
    listingTitle: title,
    paymentType: "押金扣款确认/补付争议",
    amount: firstParam(params.damageClaim) || firstParam(params.amount) || depositAmount,
    monthlyRent,
    stage: "退租押金扣款确认前",
    contractStatus: "押金返还和扣款依据待确认",
    refundRule: landlordReason || "扣款依据和剩余押金返还时间待书面确认",
    receiptStatus: evidenceLevel || "退租交割、扣款依据和返还记录待补充",
    urgencyPressure: "对方要求先签扣款确认或接受少退押金",
    notes: compactContext([
      "从押金退还带入：扣款依据未拆清前，不建议签署扣款确认、放弃追偿或补付费用。",
      sharedContext,
    ]),
    reportContext: sharedContext,
  });
  const evidenceHref = buildFlowHref("/evidence", {
    from: "deposit",
    reportId,
    city,
    title,
    stage: "退租押金",
    deposit: depositAmount ? `押金 ${depositAmount} 元` : undefined,
    risks: firstParam(params.risks),
    reportContext: sharedContext,
  });
  const initialInput: DepositPageSeed | undefined = canPrefill
    ? {
        city,
        monthlyRent: numberParam(monthlyRent),
        depositAmount: numberParam(depositAmount),
        noticeDate: firstParam(params.noticeDate),
        moveOutDate: firstParam(params.moveOutDate),
        requiredNoticeDays: numberParam(params.requiredNoticeDays),
        contractReturnDays: numberParam(params.contractReturnDays),
        unpaidRent: numberParam(params.unpaidRent),
        utilityBalance: numberParam(params.utilityBalance),
        cleaningFee: numberParam(params.cleaningFee),
        damageClaim: numberParam(params.damageClaim) || numberParam(params.amount),
        penaltyClaim: numberParam(params.penaltyClaim),
        evidenceLevel,
        landlordReason: sharedContext || landlordReason,
        reportId,
        title,
        autoGenerate: true,
        sourceLabel: source ? sourceLabels[source] : undefined,
      }
    : reportId
      ? {
          city,
          monthlyRent: numberParam(monthlyRent),
          depositAmount: numberParam(depositAmount),
          evidenceLevel,
          landlordReason: sharedContext,
          reportId,
          title,
        }
    : undefined;

  return (
    <AppShell>
      <div className="mx-auto max-w-7xl space-y-8">
        <section className="grid grid-cols-1 gap-6 lg:grid-cols-[0.62fr_0.38fr]">
          <div className="min-w-0">
            <p className="text-sm text-primary/80">
              押金退还
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-normal sm:text-4xl">
              退租押金退还
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground">
              退租时最容易损失的是一笔糊涂押金：清洁费、维修费、违约金、通知期和待补充凭据混在一起。这里先把明确费用和争议扣款拆开，再给出退款目标、谈判底线和交割凭据清单。
            </p>
          </div>
          <Card className="min-w-0 p-6">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-md bg-primary/15 text-primary">
              <KeyRound className="h-6 w-6" />
            </div>
            <h2 className="text-lg font-semibold">押金要在退租前就开始准备</h2>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">
              优先整理计划和话术，不读取聊天记录、支付账户或私人文件。所有凭据仍由用户保存在自己的设备里。
            </p>
            <div className="mt-5 grid gap-3">
              <Button asChild variant="secondary" className="w-full">
                <Link href={handoverHref}>回看交割确认</Link>
              </Button>
              <Button asChild variant="secondary" className="w-full">
                <Link href={repairHref}>先确认维修扣款争议</Link>
              </Button>
              <Button asChild variant="secondary" className="w-full">
                <Link href={renewalHref}>先判断续租还是搬家</Link>
              </Button>
              <Button asChild variant="secondary" className="w-full">
                <Link href={evidenceHref}>补充凭据材料</Link>
              </Button>
              <Button asChild variant="secondary" className="w-full">
              <Link href={officialHref}>查看投诉调解办法</Link>
              </Button>
              <Button asChild variant="secondary" className="w-full">
                <Link href={paymentHref}>确认扣款依据</Link>
              </Button>
            </div>
          </Card>
        </section>

        <DepositRefundPanel initialInput={initialInput} />
      </div>
    </AppShell>
  );
}
