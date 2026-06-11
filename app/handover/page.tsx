import Link from "next/link";
import { PackageCheck } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { HandoverCheckPanel } from "@/components/handover-check-panel";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
  payment: "已从付款前确认带入",
  official: "已从官方查询带入",
  contract: "已从合同确认带入",
  move: "已从入住预算带入",
  evidence: "已从凭据材料带入",
  repair: "已从维修责任带入",
  deposit: "已从押金退还带入",
  renewal: "已从续租方案带入",
  visit: "已从看房清单带入",
  safety: "已从独居安全带入",
  shared: "已从合租边界带入",
  home: "已从首页输入带入",
  plan: "已从下一步带入",
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
    risks: "交割当天需要同步钥匙门禁、表读数、旧损坏、家具家电、历史欠费和清洁状态凭据。",
    reportContext: sharedContext,
  });
  const repairHref = buildFlowHref("/repair", {
    from: "handover",
    reportId,
    city,
    listingTitle,
    evidenceLevel: "交割凭据已整理或待补充",
    depositConcern: "担心维修责任或旧损坏影响退租押金",
    notes: sharedContext,
  });
  const paymentHref = buildFlowHref("/payment", {
    from: "handover",
    reportId,
    city,
    title,
    listingTitle,
    monthlyRent,
    amount: firstParam(params.amount) || depositAmount || monthlyRent,
    paymentType: "交割确认/历史欠费补付争议",
    stage: "交割确认/拿钥匙前",
    contractStatus: "交割清单、钥匙门禁、表读数和历史欠费待确认",
    refundRule: "旧损坏、历史欠费、钥匙门禁和交割责任未书面确认",
    receiptStatus: "交割视频、表读数、钥匙清单和费用边界待补充",
    urgencyPressure: "对方要求先拿钥匙、确认无争议或补付历史费用",
    notes: compactContext([
      "从交割确认带入：钥匙门禁、表读数、旧损坏、历史欠费和家具家电责任未写清前，不建议确认无争议或补付费用。",
      sharedContext,
    ]),
    reportContext: sharedContext,
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
      <div className="mx-auto max-w-7xl space-y-8">
        <section className="grid gap-6 lg:grid-cols-[0.62fr_0.38fr]">
          <div>
            <p className="text-sm text-primary/80">
              入住交割
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-normal sm:text-4xl">
              交割确认
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground">
              拿钥匙当天要把关键状态写清楚：钥匙门禁、表读数、家具家电、旧损坏、历史欠费和清洁状态。
            </p>
          </div>
          <Card className="p-6">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-md bg-primary/15 text-primary">
              <PackageCheck className="h-6 w-6" />
            </div>
            <h2 className="text-lg font-semibold">交割清楚，退租才有底气</h2>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">
              不托管照片视频；只整理交割事项、拍摄清单、表读数清单和确认话术。凭据仍保存在用户自己的设备里。
            </p>
            <div className="mt-5 grid gap-3">
              <Button asChild variant="secondary" className="w-full">
                <Link href={evidenceHref}>同步到凭据材料</Link>
              </Button>
              <Button asChild variant="secondary" className="w-full">
                <Link href={repairHref}>入住后维修办法</Link>
              </Button>
              <Button asChild variant="secondary" className="w-full">
                <Link href={paymentHref}>确认交割相关付款</Link>
              </Button>
            </div>
          </Card>
        </section>

        <HandoverCheckPanel reportId={reportId} initialInput={initialInput} />
      </div>
    </AppShell>
  );
}
