"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Archive,
  ArrowRight,
  BadgeDollarSign,
  CheckCircle2,
  ClipboardCheck,
  Copy,
  Hammer,
  KeyRound,
  Landmark,
  LayoutDashboard,
  MessageSquareText,
  ReceiptText,
  Scale,
  ShieldAlert,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { RiskBadge } from "@/components/risk-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { buildFlowHref, compactContext } from "@/lib/flow-links";
import type {
  RepairResponsibilityResult,
  RepairRiskItem,
  RepairRiskLevel,
} from "@/lib/repair-responsibility";

const levelVariant: Record<RepairRiskLevel, "destructive" | "warning" | "success"> = {
  高: "destructive",
  中: "warning",
  低: "success",
};

function formatMoney(value: number) {
  return `${Math.round(value).toLocaleString()} 元`;
}

function buildEvidenceHref(result: RepairResponsibilityResult, reportId?: string) {
  return buildFlowHref("/evidence", {
    from: "repair",
    reportId,
    stage: "入住后维修",
    title: result.listingTitle,
    city: result.city,
    risks: compactContext(["维修前待确认事项：", result.blockers]),
    reportContext: compactContext([
      result.summary,
      `问题类型：${result.issueType}`,
      `预估费用：${result.estimatedCost.toLocaleString()} 元`,
      "材料清单：",
      result.evidenceChecklist,
      "费用边界：",
      result.costControl,
    ]),
  });
}

function buildDepositHref(result: RepairResponsibilityResult, reportId?: string) {
  return buildFlowHref("/deposit", {
    from: "repair",
    reportId,
    city: result.city,
    damageClaim: result.estimatedCost,
    evidenceLevel: "部分材料",
    landlordReason: compactContext([
      `从维修责任带入：${result.issueType} 可能演变为押金扣款争议。`,
      result.summary,
      result.blockers,
      result.costControl,
    ]),
  });
}

function buildContractHref(result: RepairResponsibilityResult, reportId?: string) {
  return buildFlowHref("/contract", {
    from: "repair",
    reportId,
    city: result.city,
    contractText: compactContext([
      "以下内容来自维修责任判断，不等同于完整合同。请粘贴真实维修条款后再确认：",
      result.summary,
      "待确认事项：",
      result.blockers,
      "建议补充条款重点：自然损耗、设备老化、房屋结构问题、人为损坏、垫付报销、维修时限。",
    ]),
  });
}

function buildPaymentHref(result: RepairResponsibilityResult, reportId?: string) {
  return buildFlowHref("/payment", {
    from: "repair",
    reportId,
    city: result.city,
    title: result.listingTitle,
    listingTitle: result.listingTitle,
    paymentType: "维修垫付款",
    amount: result.estimatedCost,
    stage: "入住后维修垫付前",
    contractStatus: "维修责任和费用边界待确认",
    authorizationStatus: result.responsibility,
    refundRule: "维修垫付报销金额、凭证要求、付款时间和责任主体待书面确认",
    receiptStatus: "维修报价、票据和完工复拍待补充",
    paymentChannel: "待确认",
    urgencyPressure: "对方要求先垫付维修费或先自行安排维修",
    notes: compactContext([
      "从维修责任判断带入：责任归属、费用边界、报修记录和维修结果未确认前，不建议直接垫付维修费。",
      result.summary,
      `问题类型：${result.issueType}`,
      `预估费用：${result.estimatedCost.toLocaleString()} 元`,
      result.blockers,
      result.costControl,
    ]),
    reportContext: compactContext([
      result.evidenceChecklist,
      result.escalationOptions,
      result.nextActions,
      result.assumptions,
    ]),
  });
}

function buildOfficialHref(result: RepairResponsibilityResult, reportId?: string) {
  return buildFlowHref("/official", {
    from: "repair",
    reportId,
    city: result.city,
    title: result.listingTitle,
    listingTitle: result.listingTitle,
    stage: "入住后维修责任/费用边界确认",
    contractStatus: "维修责任、维修时限、费用垫付和报销条款待确认",
    concerns: compactContext([
      "从维修责任判断带入：出租方拒绝维修、拖延维修、要求承租人垫付或把旧损坏转成押金扣款时，需要确认合同示范文本、投诉/调解办法和材料要求。",
      result.summary,
      result.blockers,
      result.costControl,
      result.escalationOptions,
    ]),
    reportContext: compactContext([
      result.evidenceChecklist,
      result.timeline.map((item) => `${item.timing}：${item.title}。${item.action}`),
      result.nextActions,
    ]),
  });
}

function buildRepairMemo(result: RepairResponsibilityResult) {
  const blockerLines =
    result.blockers.length && !result.blockers[0].includes("暂无高优先级")
      ? result.blockers.map((item, index) => `${index + 1}. ${item}`)
      : ["1. 当前没有高优先级待确认事项，但仍需要完整报修、保存记录和费用确认。"];
  const timelineLines = result.timeline.map(
    (item, index) => `${index + 1}. ${item.timing}：${item.title}，${item.action}`,
  );

  return [
    `你好，关于${result.city}「${result.listingTitle}」的${result.issueType}问题，我这边先做正式报修和责任确认。`,
    "",
    `当前建议：${result.verdict}；责任倾向：${result.responsibility}；预估费用约 ${result.estimatedCost.toLocaleString()} 元。`,
    "",
    "一、需要先确认的问题",
    ...blockerLines,
    "",
    "二、请确认维修安排和责任边界",
    "1. 请确认由谁安排维修、预计上门时间、维修范围和预计时间。",
    "2. 如属于自然损耗、设备老化、房屋结构或入住前已存在问题，请确认由出租方承担。",
    "3. 如需要我先垫付，请先书面确认可报销金额、凭证要求、付款时间和收款方式。",
    "4. 在责任和费用未确认前，我暂不认可把该问题作为退租押金扣款依据。",
    "",
    "三、我会同步留存的材料",
    ...result.evidenceChecklist.slice(0, 5).map((item, index) => `${index + 1}. ${item}`),
    "",
    "四、费用控制",
    ...result.costControl.map((item, index) => `${index + 1}. ${item}`),
    "",
    "五、维修时间记录",
    ...timelineLines,
    "",
    "请尽量在本聊天里回复确认，方便双方后续核对；如果问题持续影响正常居住或可能扩大损失，我会保留物业记录、紧急处置和维修凭证。",
  ].join("\n");
}

export function RepairResponsibilityResultView({
  result,
  reportId,
}: {
  result: RepairResponsibilityResult;
  reportId?: string;
}) {
  const [copiedMemo, setCopiedMemo] = useState(false);

  async function copyRepairMemo() {
    await navigator.clipboard.writeText(buildRepairMemo(result));
    setCopiedMemo(true);
  }

  return (
    <>
      <Card className="min-w-0 p-6">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm text-primary/80">维修结果</p>
            <h2 className="mt-2 text-2xl font-semibold">维修责任结论</h2>
          </div>
          <RiskBadge status={result.status} tone="generic" />
        </div>
        <div className="space-y-5">
          <p className="text-sm leading-7 text-muted-foreground">{result.summary}</p>
          <div className="grid gap-3 sm:grid-cols-3">
            <SummaryTile icon={Wrench} label="建议" value={result.verdict} />
            <SummaryTile icon={Hammer} label="责任倾向" value={result.responsibility} />
            <SummaryTile icon={ReceiptText} label="预估费用" value={formatMoney(result.estimatedCost)} />
          </div>
          <div className="rounded-md border border-border bg-secondary p-4">
            <div className="mb-3 flex items-center justify-between gap-4">
              <p className="text-sm font-medium">责任可控评分</p>
              <p className="text-2xl font-semibold">{result.score}</p>
            </div>
            <Progress value={result.score} />
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              分数越低，越不建议先自费维修。先让问题、责任、费用和维修结果都有书面记录。
            </p>
          </div>
          <div className="rounded-md border border-amber-300/20 bg-amber-300/10 p-4">
            <div className="mb-3 flex items-center gap-2 text-amber-700">
              <ShieldAlert className="h-4 w-4" />
              <h3 className="font-semibold">维修前待确认事项</h3>
            </div>
            <div className="grid gap-2 text-sm leading-6 text-amber-900/90">
              {result.blockers.map((item) => (
                <p key={item}>{item}</p>
              ))}
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <NextLink href="/dashboard" icon={LayoutDashboard} label="回到工作台" />
            <NextLink href={buildEvidenceHref(result, reportId)} icon={Archive} label="整理维修材料" />
            <NextLink href={buildPaymentHref(result, reportId)} icon={BadgeDollarSign} label="看垫付风险" />
            <NextLink href={buildOfficialHref(result, reportId)} icon={Landmark} label="查看投诉调解办法" />
            <NextLink href={buildDepositHref(result, reportId)} icon={KeyRound} label="进入押金退还" />
            <NextLink href={buildContractHref(result, reportId)} icon={Scale} label="确认维修条款" />
          </div>

          <details className="rounded-md border border-border bg-secondary/55 p-4">
            <summary className="cursor-pointer text-sm font-medium text-foreground">
              查看维修通知文本
            </summary>
            <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <p className="text-sm leading-6 text-muted-foreground">
                用于说明报修事实、责任确认、费用边界、垫付条件、材料要求和维修期限。
              </p>
              <Button type="button" variant="outline" onClick={copyRepairMemo}>
                <Copy className="mr-2 h-4 w-4" />
                {copiedMemo ? "已复制" : "复制文本"}
              </Button>
            </div>
            <pre className="mt-4 max-h-[320px] overflow-auto whitespace-pre-wrap rounded-md border border-border bg-card p-4 text-sm leading-7 text-muted-foreground">
              {buildRepairMemo(result)}
            </pre>
          </details>
        </div>
      </Card>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-[0.6fr_0.4fr]">
        <Card className="min-w-0 p-5">
          <h3 className="font-semibold">维修风险拆解</h3>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-[760px] text-left text-sm">
              <thead className="text-xs text-muted-foreground">
                <tr className="border-b border-border">
                  <th className="px-3 py-3 font-medium">风险</th>
                  <th className="px-3 py-3 font-medium">等级</th>
                  <th className="px-3 py-3 font-medium">为什么</th>
                  <th className="px-3 py-3 font-medium">维修办法</th>
                  <th className="px-3 py-3 font-medium">记录</th>
                </tr>
              </thead>
              <tbody>
                {result.riskItems.map((item) => (
                  <RiskRow key={item.title} item={item} />
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card className="min-w-0 p-5">
          <div className="mb-3 flex items-center gap-2">
            <MessageSquareText className="h-4 w-4 text-primary" />
            <h3 className="font-semibold">沟通话术</h3>
          </div>
          <div className="grid gap-2 text-sm leading-6 text-muted-foreground">
            {result.messageTemplates.map((item) => (
              <p key={item} className="rounded-md border border-border bg-secondary p-3">
                {item}
              </p>
            ))}
          </div>
        </Card>
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <InfoPanel title="材料清单" icon={ClipboardCheck} items={result.evidenceChecklist} />
        <InfoPanel title="费用边界" icon={ReceiptText} items={result.costControl} />
        <InfoPanel
          title="维修时间记录"
          icon={Wrench}
          items={result.timeline.map((item) => `${item.timing}：${item.title}。${item.action}`)}
        />
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-[0.5fr_0.5fr]">
        <InfoPanel title="投诉调解办法" icon={ShieldAlert} items={result.escalationOptions} />
        <InfoPanel title="后续确认" icon={CheckCircle2} items={result.nextActions} />
      </section>
    </>
  );
}

function NextLink({
  href,
  icon: Icon,
  label,
}: {
  href: string;
  icon: LucideIcon;
  label: string;
}) {
  return (
    <Button asChild variant="secondary" className="h-auto justify-between gap-3 py-3">
      <Link href={href}>
        <span className="flex min-w-0 items-center gap-2">
          <Icon className="h-4 w-4 shrink-0" />
          <span className="truncate">{label}</span>
        </span>
        <ArrowRight className="h-4 w-4 shrink-0" />
      </Link>
    </Button>
  );
}

function SummaryTile({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-md border border-border bg-secondary p-4">
      <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-md bg-primary/15 text-primary">
        <Icon className="h-4 w-4" />
      </div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
    </div>
  );
}

function RiskRow({ item }: { item: RepairRiskItem }) {
  return (
    <tr className="border-b border-border last:border-0">
      <td className="px-3 py-4 font-medium">{item.title}</td>
      <td className="px-3 py-4">
        <Badge variant={levelVariant[item.level]}>{item.level}</Badge>
      </td>
      <td className="px-3 py-4 text-muted-foreground">{item.why}</td>
      <td className="px-3 py-4 text-muted-foreground">{item.action}</td>
      <td className="px-3 py-4 text-muted-foreground">{item.proof}</td>
    </tr>
  );
}

function InfoPanel({
  title,
  icon: Icon,
  items,
}: {
  title: string;
  icon: LucideIcon;
  items: string[];
}) {
  return (
    <Card className="p-5">
      <div className="mb-3 flex items-center gap-2">
        <Icon className="h-4 w-4 text-primary" />
        <h3 className="font-semibold">{title}</h3>
      </div>
      <div className="grid gap-2 text-sm leading-6 text-muted-foreground">
        {items.map((item) => (
          <p key={item} className="rounded-md border border-border bg-secondary p-3">
            {item}
          </p>
        ))}
      </div>
    </Card>
  );
}
