"use client";

import { useState, type ComponentType } from "react";
import Link from "next/link";
import {
  Archive,
  ArrowRight,
  BadgeDollarSign,
  Camera,
  CheckCircle2,
  ClipboardCheck,
  Copy,
  FileCheck2,
  Gauge,
  KeyRound,
  LayoutDashboard,
  MessageSquareText,
  PackageCheck,
  ShieldAlert,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { RiskBadge } from "@/components/risk-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { HandoverCheckResult, HandoverRiskItem, HandoverRiskLevel } from "@/lib/handover-check";
import { buildFlowHref, compactContext } from "@/lib/flow-links";

const levelVariant: Record<HandoverRiskLevel, "destructive" | "warning" | "success"> = {
  高: "destructive",
  中: "warning",
  低: "success",
};

function formatMoney(value: number) {
  return `${Math.round(value).toLocaleString()} 元`;
}

function buildEvidenceHref(result: HandoverCheckResult, reportId?: string) {
  return buildFlowHref("/evidence", {
    from: "handover",
    reportId,
    stage: "交割确认",
    title: result.listingTitle,
    city: result.city,
    deposit: `押金 ${result.depositAmount.toLocaleString()} 元`,
    risks: compactContext(["交割前待确认事项：", result.blockers]),
    reportContext: compactContext([
      result.summary,
      "交割事项：",
      result.tasks.map((item) => `${item.group}：${item.title}，${item.action}`),
      "拍摄清单：",
      result.photoShotList,
      "表读数清单：",
      result.meterChecklist,
    ]),
  });
}

function buildRepairHref(result: HandoverCheckResult, reportId?: string) {
  return buildFlowHref("/repair", {
    from: "handover",
    reportId,
    city: result.city,
    listingTitle: result.listingTitle,
    evidenceLevel: "有照片和视频",
    depositConcern: "担心退租时从押金扣",
    notes: compactContext([result.summary, result.blockers, result.nextActions]),
  });
}

function buildDepositHref(result: HandoverCheckResult, reportId?: string) {
  return buildFlowHref("/deposit", {
    from: "handover",
    reportId,
    city: result.city,
    monthlyRent: result.monthlyRent,
    depositAmount: result.depositAmount,
    evidenceLevel: "部分材料",
    landlordReason: compactContext([
      "从交割确认带入：退租时需用本次交割记录反向核对押金扣款。",
      result.summary,
      result.blockers,
      result.photoShotList,
    ]),
  });
}

function buildPaymentHref(result: HandoverCheckResult, reportId?: string) {
  return buildFlowHref("/payment", {
    from: "handover",
    reportId,
    city: result.city,
    title: result.listingTitle,
    listingTitle: result.listingTitle,
    paymentType: "交割确认/历史欠费补付争议",
    amount: result.depositAmount,
    monthlyRent: result.monthlyRent,
    stage: "交割确认/拿钥匙前",
    contractStatus: "交割清单、钥匙门禁、表读数和历史欠费待确认",
    refundRule: "旧损坏、历史欠费、钥匙门禁和交割责任未书面确认",
    receiptStatus: "交割视频、表读数、钥匙清单和费用边界待补充",
    urgencyPressure: "对方要求先拿钥匙、确认无争议或补付历史费用",
    notes: compactContext([
      "从交割确认带入：钥匙门禁、表读数、旧损坏、历史欠费和家具家电责任未写清前，不建议确认无争议或补付费用。",
      result.summary,
      result.blockers,
      result.tasks.map((item) => `${item.group}：${item.title}，${item.action}`),
    ]),
    reportContext: compactContext([result.photoShotList, result.meterChecklist, result.nextActions, result.assumptions]),
  });
}

function buildHandoverMemo(result: HandoverCheckResult) {
  const blockers =
    result.blockers.length && !result.blockers[0].includes("暂无高优先级")
      ? result.blockers.map((item, index) => `${index + 1}. ${item}`)
      : ["1. 当前没有高优先级待确认事项，但仍需保存基础交割记录。"];
  const keyTasks = result.tasks
    .filter((item) => ["钥匙门禁", "费用读数", "房屋状态", "家具家电"].includes(item.group))
    .map((item, index) => `${index + 1}. ${item.title}：${item.action}通过标准：${item.passStandard}`);

  return [
    `你好，关于${result.city}的「${result.listingTitle}」交割确认，我这边按交割清单先做以下确认。`,
    "",
    `当前交割结论：${result.verdict}，交割可控度 ${result.score}/100。`,
    `押金 ${result.depositAmount.toLocaleString()} 元，月租 ${result.monthlyRent.toLocaleString()} 元；这些交割记录会作为退租、维修责任和押金核对依据。`,
    "",
    "一、交割前需要确认的待确认事项",
    ...blockers,
    "",
    "二、钥匙、表读数、旧损坏和家具家电确认",
    ...keyTasks,
    "",
    "三、请按文字确认费用边界",
    "1. 交割日前产生的水电燃气、物业、宽带、垃圾费等历史费用由出租方承担。",
    "2. 交割日后按合同和实际读数由承租方承担。",
    "3. 钥匙、门禁卡、电梯卡、燃气卡等数量和补办费用请一次写清。",
    "",
    "四、我会同步留存的材料",
    ...result.photoShotList.slice(0, 5).map((item, index) => `${index + 1}. ${item}`),
    "",
    "以上待确认事项没有确认前，我会先保留交割争议，也不会确认旧损坏、历史欠费或家具家电责任已经由我承担。请尽量在本聊天里回复确认，方便双方后续核对。",
  ].join("\n");
}

export function HandoverCheckResultView({
  result,
  reportId,
}: {
  result: HandoverCheckResult;
  reportId?: string;
}) {
  const [copiedMemo, setCopiedMemo] = useState(false);

  async function copyHandoverMemo() {
    await navigator.clipboard.writeText(buildHandoverMemo(result));
    setCopiedMemo(true);
  }

  return (
    <div className="space-y-6">
      <Card className="min-w-0 p-6">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm text-primary/80">交割结果</p>
            <h2 className="mt-2 text-2xl font-semibold">交割结论</h2>
          </div>
          <RiskBadge status={result.status} tone="generic" />
        </div>
        <div className="space-y-5">
          <p className="text-sm leading-7 text-muted-foreground">{result.summary}</p>
          <div className="grid gap-3 sm:grid-cols-3">
            <SummaryTile icon={PackageCheck} label="交割建议" value={result.verdict} />
            <SummaryTile icon={KeyRound} label="押金金额" value={formatMoney(result.depositAmount)} />
            <SummaryTile icon={Gauge} label="交割评分" value={`${result.score}`} />
          </div>
          <div className="rounded-md border border-border bg-secondary p-4">
            <div className="mb-3 flex items-center justify-between gap-4">
              <p className="text-sm font-medium">交割可控度</p>
              <p className="text-2xl font-semibold">{result.score}</p>
            </div>
            <Progress value={result.score} />
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              分数越低，越不建议直接拿钥匙入住。先把表读数、钥匙数量、旧损坏和费用边界写清楚。
            </p>
          </div>
          <div className="rounded-md border border-amber-300/20 bg-amber-300/10 p-4">
            <div className="mb-3 flex items-center gap-2 text-amber-700">
              <ShieldAlert className="h-4 w-4" />
              <h3 className="font-semibold">交割前待确认事项</h3>
            </div>
            <div className="grid gap-2 text-sm leading-6 text-amber-900/90">
              {result.blockers.map((item) => (
                <p key={item}>{item}</p>
              ))}
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <FlowButton href="/dashboard" icon={LayoutDashboard} label="回到工作台" />
            <FlowButton href={buildEvidenceHref(result, reportId)} icon={Archive} label="同步材料清单" />
            <FlowButton href={buildPaymentHref(result, reportId)} icon={BadgeDollarSign} label="确认交割相关付款" />
            <FlowButton href={buildRepairHref(result, reportId)} icon={Wrench} label="判断维修责任" />
            <FlowButton href={buildDepositHref(result, reportId)} icon={KeyRound} label="准备押金退还" />
          </div>

          <details className="rounded-md border border-border bg-secondary/55 p-4">
            <summary className="cursor-pointer text-sm font-medium text-foreground">查看交割确认文本</summary>
            <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <p className="text-sm leading-6 text-muted-foreground">
                用于确认钥匙门禁、表读数、旧损坏、家具家电、历史欠费和费用边界。
              </p>
              <Button type="button" variant="outline" onClick={copyHandoverMemo}>
                <Copy className="mr-2 h-4 w-4" />
                {copiedMemo ? "已复制" : "复制文本"}
              </Button>
            </div>
            <pre className="mt-4 max-h-[320px] overflow-auto whitespace-pre-wrap rounded-md border border-border bg-card p-4 text-sm leading-7 text-muted-foreground">
              {buildHandoverMemo(result)}
            </pre>
          </details>
        </div>
      </Card>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-[0.6fr_0.4fr]">
        <Card className="min-w-0 p-5">
          <h3 className="font-semibold">交割风险拆解</h3>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-[760px] text-left text-sm">
              <thead className="text-xs text-muted-foreground">
                <tr className="border-b border-border">
                  <th className="px-3 py-3 font-medium">风险</th>
                  <th className="px-3 py-3 font-medium">等级</th>
                  <th className="px-3 py-3 font-medium">为什么</th>
                  <th className="px-3 py-3 font-medium">交割前事项</th>
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
            <h3 className="font-semibold">确认话术</h3>
          </div>
          <p className="rounded-md border border-border bg-secondary p-4 text-sm leading-7 text-muted-foreground">
            {result.confirmationMessage}
          </p>
        </Card>
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <InfoPanel
          title="交割事项"
          icon={ClipboardCheck}
          items={result.tasks.map(
            (item) => `${item.group}：${item.title}。${item.action} 通过标准：${item.passStandard}`,
          )}
        />
        <InfoPanel title="拍摄清单" icon={Camera} items={result.photoShotList} />
        <InfoPanel title="表读数清单" icon={Gauge} items={result.meterChecklist} />
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-[0.5fr_0.5fr]">
        <InfoPanel title="后续确认" icon={CheckCircle2} items={result.nextActions} />
        <InfoPanel title="判断假设" icon={FileCheck2} items={result.assumptions} />
      </section>
    </div>
  );
}

function FlowButton({
  href,
  icon: Icon,
  label,
}: {
  href: string;
  icon: ComponentType<{ className?: string }>;
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

function RiskRow({ item }: { item: HandoverRiskItem }) {
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
