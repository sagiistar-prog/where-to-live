"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
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
  Loader2,
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { recordCaseEvent } from "@/lib/client-case-events";
import { buildHandoverCaseEventDetails } from "@/lib/lifecycle-case-event-details";
import type {
  HandoverCheckInput,
  HandoverCheckResult,
  HandoverRiskItem,
  HandoverRiskLevel,
} from "@/lib/handover-check";
import { buildFlowHref, compactContext } from "@/lib/flow-links";

type SubmitState = "idle" | "loading" | "error";
type HandoverSeed = Partial<HandoverCheckInput> & {
  autoGenerate?: boolean;
  sourceLabel?: string;
  reportId?: string;
  title?: string;
  address?: string;
  reportContext?: string;
};

const levelVariant: Record<HandoverRiskLevel, "destructive" | "warning" | "success"> = {
  高: "destructive",
  中: "warning",
  低: "success",
};

function formatMoney(value: number) {
  return `${Math.round(value).toLocaleString()} 元`;
}

function seedValue(value: string | undefined, fallback: string) {
  return value?.trim() || fallback;
}

function seedNumber(value: number | undefined, fallback: string) {
  return Number.isFinite(value) ? String(value) : fallback;
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
    evidenceLevel: "部分凭据",
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
      : ["1. 当前没有高优先级待确认事项，但仍需保存基础交割凭据。"];
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
    "四、我会同步留存的凭据",
    ...result.photoShotList.slice(0, 5).map((item, index) => `${index + 1}. ${item}`),
    "",
    "以上待确认事项没有确认前，我会先保留交割争议，也不会确认旧损坏、历史欠费或家具家电责任已经由我承担。请尽量在本聊天里回复确认，方便双方后续核对。",
  ].join("\n");
}

export function HandoverCheckPanel({
  reportId,
  initialInput,
}: {
  reportId?: string;
  initialInput?: HandoverSeed;
}) {
  const autoSubmittedRef = useRef(false);
  const activeReportId = initialInput?.reportId ?? reportId;
  const [result, setResult] = useState<HandoverCheckResult | null>(null);
  const [copiedMemo, setCopiedMemo] = useState(false);
  const [state, setState] = useState<SubmitState>("idle");
  const [message, setMessage] = useState(
    "这里只整理交割验收清单，不上传照片或视频。",
  );

  const submitPayload = useCallback(
    async (payload: HandoverCheckInput, loadingMessage = "正在整理交割验收清单...") => {
    setState("loading");
    setMessage(loadingMessage);

    try {
      const response = await fetch("/api/handover/check", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error("交割确认整理失败，请确认信息后重试。");
      }

      const data = (await response.json()) as HandoverCheckResult;
      setResult(data);
      setCopiedMemo(false);
      setState("idle");
      setMessage("交割确认已整理。补充高风险信息，再拿钥匙入住。");
      if (activeReportId) {
        const caseEventDetails = buildHandoverCaseEventDetails(data);
        void recordCaseEvent({
          reportId: activeReportId,
          type: "handover",
          title: "交割确认",
          status: data.status,
          summary: caseEventDetails.summary,
          highlights: caseEventDetails.highlights,
          href:
            typeof window !== "undefined"
              ? `${window.location.pathname}${window.location.search}`
              : undefined,
        });
      }
    } catch (error) {
      setState("error");
      setMessage(error instanceof Error ? error.message : "交割确认整理失败，请稍后重试。");
    }
    },
    [activeReportId],
  );

  useEffect(() => {
    if (!initialInput?.autoGenerate || autoSubmittedRef.current) return;
    autoSubmittedRef.current = true;
    void submitPayload(
      {
        city: initialInput.city,
        listingTitle: seedValue(initialInput.listingTitle, initialInput.title ?? "报告带入房源"),
        handoverDate: seedValue(initialInput.handoverDate, "2026-06-01"),
        contractSigned: seedValue(initialInput.contractSigned, "合同与交割清单待最终确认"),
        keysStatus: seedValue(initialInput.keysStatus, "钥匙门禁数量待确认"),
        meterStatus: seedValue(initialInput.meterStatus, "水电燃气表读数待拍照确认"),
        applianceStatus: seedValue(initialInput.applianceStatus, "家具家电清单待确认"),
        damageStatus: seedValue(initialInput.damageStatus, "旧损坏、墙面、地板和卫浴状态待拍照确认"),
        utilityDebtStatus: seedValue(initialInput.utilityDebtStatus, "历史欠费待确认"),
        accessStatus: seedValue(initialInput.accessStatus, "门禁卡和电梯卡数量待确认"),
        cleaningStatus: seedValue(initialInput.cleaningStatus, "清洁状态待拍照确认"),
        landlordConfirmation: seedValue(initialInput.landlordConfirmation, "出租方书面确认待补充"),
        depositAmount: initialInput.depositAmount,
        monthlyRent: initialInput.monthlyRent,
        notes: seedValue(
          initialInput.notes,
          compactContext([
            "从上一步带入：准备整理交割确认清单。",
            initialInput.address ? `房源位置：${initialInput.address}` : "",
            initialInput.reportContext,
          ]),
        ),
      },
      `${initialInput.sourceLabel ?? "已带入上下文"}，正在整理交割验收清单...`,
    );
  }, [initialInput, submitPayload]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = new FormData(event.currentTarget);
    const payload = {
      city: String(form.get("city") || ""),
      listingTitle: String(form.get("listingTitle") || ""),
      handoverDate: String(form.get("handoverDate") || ""),
      contractSigned: String(form.get("contractSigned") || ""),
      keysStatus: String(form.get("keysStatus") || ""),
      meterStatus: String(form.get("meterStatus") || ""),
      applianceStatus: String(form.get("applianceStatus") || ""),
      damageStatus: String(form.get("damageStatus") || ""),
      utilityDebtStatus: String(form.get("utilityDebtStatus") || ""),
      accessStatus: String(form.get("accessStatus") || ""),
      cleaningStatus: String(form.get("cleaningStatus") || ""),
      landlordConfirmation: String(form.get("landlordConfirmation") || ""),
      depositAmount: Number(form.get("depositAmount")),
      monthlyRent: Number(form.get("monthlyRent")),
      notes: String(form.get("notes") || ""),
    };

    await submitPayload(payload);
  }

  async function copyHandoverMemo() {
    if (!result) return;
    await navigator.clipboard.writeText(buildHandoverMemo(result));
    setCopiedMemo(true);
  }

  return (
    <div className="space-y-6">
      <form
        onSubmit={handleSubmit}
        className="grid grid-cols-1 gap-4 xl:grid-cols-[0.42fr_0.58fr]"
      >
        <Card className="min-w-0 p-6">
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm text-primary/80">
                交割确认
              </p>
              <h2 className="mt-2 text-2xl font-semibold">输入交割条件</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                拿钥匙当天，把表读数、钥匙门禁、旧损坏、家具家电和历史欠费一次写清。交割越清楚，退租时越不被动。
              </p>
            </div>
            {initialInput?.sourceLabel ? (
              <Badge variant="outline" className="w-fit border-primary/30 text-primary">
                {initialInput.sourceLabel}
              </Badge>
            ) : null}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="城市" name="city" defaultValue={seedValue(initialInput?.city, "上海")} type="text" />
            <Field
              label="房源名称"
              name="listingTitle"
              defaultValue={seedValue(initialInput?.listingTitle, initialInput?.title ?? "徐汇一居室")}
              type="text"
            />
            <Field
              label="交割日期"
              name="handoverDate"
              defaultValue={seedValue(initialInput?.handoverDate, "2026-06-01")}
              type="date"
            />
            <Field
              label="押金金额"
              name="depositAmount"
              defaultValue={seedNumber(initialInput?.depositAmount, "5200")}
            />
            <Field
              label="月租"
              name="monthlyRent"
              defaultValue={seedNumber(initialInput?.monthlyRent, "5200")}
            />
            <SelectField
              label="合同与交割"
              name="contractSigned"
              defaultValue={seedValue(initialInput?.contractSigned, "已签合同但未写交割清单")}
              options={["已签合同且有交割清单", "已签合同但未写交割清单", "只签了简单协议", "还未签合同", "合同和房源信息不一致"]}
            />
            <SelectField
              label="钥匙状态"
              name="keysStatus"
              defaultValue={seedValue(initialInput?.keysStatus, "只口头说有 2 把钥匙")}
              options={["钥匙数量已拍照确认", "只口头说有 2 把钥匙", "不知道是否有备用钥匙", "钥匙门禁数量不清", "不允许换锁"]}
            />
            <SelectField
              label="门禁电梯卡"
              name="accessStatus"
              defaultValue={seedValue(initialInput?.accessStatus, "门禁卡和电梯卡数量未确认")}
              options={["门禁电梯卡已确认", "门禁卡和电梯卡数量未确认", "门禁卡缺失", "补办费用不清", "没有门禁"]}
            />
            <SelectField
              label="表读数"
              name="meterStatus"
              defaultValue={seedValue(initialInput?.meterStatus, "还没拍水电燃气表读数")}
              options={["已拍水电燃气表读数", "还没拍水电燃气表读数", "只拍了电表", "表读数之后补", "不知道表在哪里"]}
            />
            <SelectField
              label="历史欠费"
              name="utilityDebtStatus"
              defaultValue={seedValue(initialInput?.utilityDebtStatus, "不确定是否有历史欠费")}
              options={["已确认无历史欠费", "不确定是否有历史欠费", "物业/水电账单未出", "发现有历史欠费", "对方说之后再算"]}
            />
            <SelectField
              label="家具家电"
              name="applianceStatus"
              defaultValue={seedValue(initialInput?.applianceStatus, "家具家电清单不完整")}
              options={["家具家电清单完整", "家具家电清单不完整", "部分家电未测试", "已有家电故障", "遥控器和配件不全"]}
            />
            <SelectField
              label="清洁状态"
              name="cleaningStatus"
              defaultValue={seedValue(initialInput?.cleaningStatus, "卫生间和厨房清洁一般")}
              options={["已经清洁", "卫生间和厨房清洁一般", "油烟机油污重", "卫生间有异味", "明显未清洁"]}
            />
            <SelectField
              label="书面确认"
              name="landlordConfirmation"
              defaultValue={seedValue(initialInput?.landlordConfirmation, "对方只说没问题")}
              options={["对方已在聊天确认", "对方只说没问题", "对方让之后再说", "对方不愿确认", "只有电话口头确认"]}
            />
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="damageStatus">旧损坏情况</Label>
              <Input
                id="damageStatus"
                name="damageStatus"
                defaultValue={seedValue(initialInput?.damageStatus, "墙面霉斑和地板划痕未写明")}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="notes">补充说明</Label>
              <Textarea
                id="notes"
                name="notes"
                className="min-h-[112px]"
                defaultValue={seedValue(
                  initialInput?.notes,
                  compactContext([
                    "准备今天拿钥匙入住，但还没正式拍交割视频，旧损坏、表读数和门禁数量都没有文字确认。",
                    initialInput?.address ? `房源位置：${initialInput.address}` : "",
                    initialInput?.reportContext,
                  ]),
                )}
              />
            </div>
          </div>

          <StatusMessage state={state} message={message} />

          <Button type="submit" size="lg" className="mt-5 w-full" disabled={state === "loading"}>
            {state === "loading" ? (
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            ) : (
              <PackageCheck className="mr-2 h-5 w-5" />
            )}
            {state === "loading" ? "正在整理清单" : "整理交割验收清单"}
          </Button>
        </Card>

        <Card className="min-w-0 p-6">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm text-primary/80">
                交割结果
              </p>
              <h2 className="mt-2 text-2xl font-semibold">交割结论</h2>
            </div>
            {result ? <RiskBadge status={result.status} tone="generic" /> : null}
          </div>

          {result ? (
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
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <Button asChild variant="secondary" className="h-auto justify-between gap-3 py-3">
                  <Link href={buildEvidenceHref(result, activeReportId)}>
                    <span className="flex min-w-0 items-center gap-2">
                      <Archive className="h-4 w-4 shrink-0" />
                      <span className="truncate">同步凭据材料</span>
                    </span>
                    <ArrowRight className="h-4 w-4 shrink-0" />
                  </Link>
                </Button>
                <Button asChild variant="secondary" className="h-auto justify-between gap-3 py-3">
                  <Link href={buildPaymentHref(result, activeReportId)}>
                    <span className="flex min-w-0 items-center gap-2">
                      <BadgeDollarSign className="h-4 w-4 shrink-0" />
                      <span className="truncate">确认交割相关付款</span>
                    </span>
                    <ArrowRight className="h-4 w-4 shrink-0" />
                  </Link>
                </Button>
                <Button asChild variant="secondary" className="h-auto justify-between gap-3 py-3">
                  <Link href={buildRepairHref(result, activeReportId)}>
                    <span className="flex min-w-0 items-center gap-2">
                      <Wrench className="h-4 w-4 shrink-0" />
                      <span className="truncate">判断维修责任</span>
                    </span>
                    <ArrowRight className="h-4 w-4 shrink-0" />
                  </Link>
                </Button>
                <Button asChild variant="secondary" className="h-auto justify-between gap-3 py-3">
                  <Link href={buildDepositHref(result, activeReportId)}>
                    <span className="flex min-w-0 items-center gap-2">
                      <KeyRound className="h-4 w-4 shrink-0" />
                      <span className="truncate">准备押金退还</span>
                    </span>
                    <ArrowRight className="h-4 w-4 shrink-0" />
                  </Link>
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex min-h-[560px] flex-col justify-center rounded-md border border-border bg-secondary p-5">
              <Badge variant="secondary" className="mb-4 w-fit">
                拿钥匙前
              </Badge>
              <h3 className="text-xl font-semibold">交割要把状态写清楚</h3>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">
                退租时最有用的凭据，往往是在入住第一天拍下来的。钥匙、门禁、表读数、旧损坏和家具家电状态不要靠记忆。
              </p>
            </div>
          )}
        </Card>
      </form>

      {result ? (
        <>
          <Card className="min-w-0 p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <div className="mb-3 flex items-center gap-2">
                  <MessageSquareText className="h-4 w-4 text-primary" />
                  <h3 className="font-semibold">交割确认清单</h3>
                </div>
                <p className="max-w-3xl text-sm leading-7 text-muted-foreground">
                  把钥匙门禁、表读数、旧损坏、家具家电、历史欠费和费用边界整理成可直接发给出租方或中介的文本，减少退租时“当时没说清”的争议。
                </p>
              </div>
              <Button type="button" variant="outline" onClick={copyHandoverMemo}>
                <Copy className="mr-2 h-4 w-4" />
                {copiedMemo ? "已复制" : "复制确认清单"}
              </Button>
            </div>
            <pre className="mt-4 max-h-[360px] overflow-auto whitespace-pre-wrap rounded-md border border-border bg-secondary p-4 text-sm leading-7 text-muted-foreground">
              {buildHandoverMemo(result)}
            </pre>
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
                      <th className="px-3 py-3 font-medium">凭据</th>
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
            <InfoPanel title="下一步" icon={CheckCircle2} items={result.nextActions} />
            <InfoPanel title="判断假设" icon={FileCheck2} items={result.assumptions} />
          </section>
        </>
      ) : null}
    </div>
  );
}

function Field({
  label,
  name,
  defaultValue,
  type = "number",
}: {
  label: string;
  name: string;
  defaultValue: string;
  type?: string;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} type={type} defaultValue={defaultValue} />
    </div>
  );
}

function SelectField({
  label,
  name,
  defaultValue,
  options,
}: {
  label: string;
  name: string;
  defaultValue: string;
  options: string[];
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}</Label>
      <select
        id={name}
        name={name}
        defaultValue={defaultValue}
        className="h-11 w-full rounded-md border border-input bg-secondary px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
      >
        {options.map((option) => (
          <option key={option}>{option}</option>
        ))}
      </select>
    </div>
  );
}

function StatusMessage({ state, message }: { state: SubmitState; message: string }) {
  return (
    <div
      className={`mt-5 rounded-md border p-3 text-sm leading-6 ${
        state === "error"
          ? "border-rose-300/20 bg-rose-300/10 text-rose-700"
          : "border-border bg-secondary text-muted-foreground"
      }`}
    >
      <div className="flex gap-2">
        {state === "error" ? (
          <ShieldAlert className="mt-1 h-4 w-4 shrink-0" />
        ) : (
          <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-primary" />
        )}
        <span>{message}</span>
      </div>
    </div>
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

