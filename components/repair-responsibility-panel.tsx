"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
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
  Loader2,
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { recordCaseEvent } from "@/lib/client-case-events";
import { buildRepairCaseEventDetails } from "@/lib/lifecycle-case-event-details";
import type {
  RepairResponsibilityInput,
  RepairResponsibilityResult,
  RepairRiskItem,
  RepairRiskLevel,
} from "@/lib/repair-responsibility";
import { buildFlowHref, compactContext } from "@/lib/flow-links";

type SubmitState = "idle" | "loading" | "error";
type RepairSeed = Partial<RepairResponsibilityInput> & {
  autoGenerate?: boolean;
  sourceLabel?: string;
  reportId?: string;
};

const levelVariant: Record<RepairRiskLevel, "destructive" | "warning" | "success"> = {
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
      "凭据材料：",
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
    evidenceLevel: "部分凭据",
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
      "从维修责任判断带入：责任归属、费用边界、报修凭据和维修结果未确认前，不建议直接垫付维修费。",
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
  "从维修责任判断带入：出租方拒绝维修、拖延维修、要求承租人垫付或把旧损坏转成押金扣款时，需要确认合同示范文本、投诉/调解办法和凭据要求。",
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
      : ["1. 当前没有高优先级待确认事项，但仍需要完整报修、保存凭据和费用确认。"];
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
    "三、我会同步留存的凭据",
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

export function RepairResponsibilityPanel({ initialInput }: { initialInput?: RepairSeed }) {
  const reportId = initialInput?.reportId || "";
  const autoSubmittedRef = useRef(false);
  const [result, setResult] = useState<RepairResponsibilityResult | null>(null);
  const [copiedMemo, setCopiedMemo] = useState(false);
  const [state, setState] = useState<SubmitState>("idle");
  const [message, setMessage] = useState(
    "这里只整理维修责任判断，不读取聊天记录或支付账户。",
  );

  const submitPayload = useCallback(async (payload: RepairResponsibilityInput, loadingMessage: string) => {
    setState("loading");
    setMessage(loadingMessage);

    try {
      const response = await fetch("/api/repair/responsibility", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error("维修责任方案整理失败，请确认信息后重试。");
      }

      const data = (await response.json()) as RepairResponsibilityResult;
      setResult(data);
      setCopiedMemo(false);
      setState("idle");
      setMessage("维修责任判断方案已整理。补充凭据，再决定是否垫付维修。");
      if (reportId) {
        const caseEventDetails = buildRepairCaseEventDetails(data);
        void recordCaseEvent({
          reportId,
          type: "repair",
          title: "维修责任",
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
      setMessage(error instanceof Error ? error.message : "维修责任判断方案整理失败，请稍后重试。");
    }
  }, [reportId]);

  useEffect(() => {
    if (!initialInput?.autoGenerate || autoSubmittedRef.current) return;
    autoSubmittedRef.current = true;
    void submitPayload(
      {
        city: seedValue(initialInput.city, "上海"),
        listingTitle: seedValue(initialInput.listingTitle, "带入房源"),
        issueType: seedValue(initialInput.issueType, "旧损坏或维修扣款争议"),
        urgency: seedValue(initialInput.urgency, "影响正常居住"),
        damageScope: seedValue(initialInput.damageScope, "需要结合交割记录和维修凭据判断影响范围"),
        discoveredTiming: seedValue(initialInput.discoveredTiming, "交割确认或退租前发现"),
        evidenceLevel: seedValue(initialInput.evidenceLevel, "有照片和视频"),
        contractClause: seedValue(
          initialInput.contractClause,
          "合同维修责任条款需要粘贴后进一步确认。",
        ),
        landlordResponse: seedValue(initialInput.landlordResponse, "对方要求先确认或可能扣押金"),
        repairCost: initialInput.repairCost,
        safetyImpact: seedValue(initialInput.safetyImpact, "可能影响居住体验或退租扣款"),
        tenantCause: seedValue(initialInput.tenantCause, "原因不清"),
        depositConcern: seedValue(initialInput.depositConcern, "担心退租时从押金扣"),
        notes: seedValue(
          initialInput.notes,
          "已从上一步带入，需要判断维修责任、费用边界和待补充凭据。",
        ),
      },
      "已带入上一步上下文，正在判断维修责任...",
    );
  }, [initialInput, submitPayload]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = new FormData(event.currentTarget);
    const payload = {
      city: String(form.get("city") || ""),
      listingTitle: String(form.get("listingTitle") || ""),
      issueType: String(form.get("issueType") || ""),
      urgency: String(form.get("urgency") || ""),
      damageScope: String(form.get("damageScope") || ""),
      discoveredTiming: String(form.get("discoveredTiming") || ""),
      evidenceLevel: String(form.get("evidenceLevel") || ""),
      contractClause: String(form.get("contractClause") || ""),
      landlordResponse: String(form.get("landlordResponse") || ""),
      repairCost: Number(form.get("repairCost")),
      safetyImpact: String(form.get("safetyImpact") || ""),
      tenantCause: String(form.get("tenantCause") || ""),
      depositConcern: String(form.get("depositConcern") || ""),
      notes: String(form.get("notes") || ""),
    };

    await submitPayload(payload, "正在判断维修责任和待补充凭据...");
  }

  async function copyRepairMemo() {
    if (!result) return;
    await navigator.clipboard.writeText(buildRepairMemo(result));
    setCopiedMemo(true);
  }

  return (
    <div className="space-y-6">
      <form
        onSubmit={handleSubmit}
        className="grid grid-cols-1 gap-4 xl:grid-cols-[0.42fr_0.58fr]"
      >
        <Card className="min-w-0 p-6">
          <div className="mb-6">
            <p className="text-sm text-primary/80">
              维修责任
            </p>
            <h2 className="mt-2 text-2xl font-semibold">输入维修问题</h2>
            {initialInput?.sourceLabel ? (
              <Badge variant="outline" className="mt-3 w-fit border-primary/30 text-primary">
                {initialInput.sourceLabel}
              </Badge>
            ) : null}
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              把漏水、发霉、家电损坏、门锁失效、噪音和旧损坏争议放进同一张责任表。先固定凭据和费用边界，再决定是否自费维修。
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="城市" name="city" defaultValue={seedValue(initialInput?.city, "上海")} type="text" />
            <Field
              label="房源名称"
              name="listingTitle"
              defaultValue={seedValue(initialInput?.listingTitle, "徐汇一居室")}
              type="text"
            />
            <SelectField
              label="问题类型"
              name="issueType"
              defaultValue={seedValue(initialInput?.issueType, "卫生间漏水")}
              options={["卫生间漏水", "墙面发霉返潮", "空调/热水器故障", "门锁失效", "电路跳闸", "噪音扰民", "虫害异味", "家具家电旧损坏"]}
            />
            <SelectField
              label="紧急程度"
              name="urgency"
              defaultValue={seedValue(initialInput?.urgency, "影响正常居住")}
              options={["轻微不便", "影响正常居住", "无法正常居住", "存在安全风险", "可能扩大损失"]}
            />
            <SelectField
              label="发现时间"
              name="discoveredTiming"
              defaultValue={seedValue(initialInput?.discoveredTiming, "入住后 7 天内发现")}
              options={["看房时已发现", "交割确认当天发现", "入住后 7 天内发现", "住了一段时间后出现", "退租前被提出"]}
            />
            <SelectField
              label="凭据情况"
              name="evidenceLevel"
              defaultValue={seedValue(initialInput?.evidenceLevel, "有照片和视频")}
              options={["有照片和视频", "有聊天和照片", "只有口头沟通", "几乎没有凭据"]}
            />
            <SelectField
              label="出租方响应"
              name="landlordResponse"
              defaultValue={seedValue(initialInput?.landlordResponse, "房东让租客先自己找人修，费用之后再说")}
              options={["已承诺安排维修", "同意但没有时间", "房东让租客先自己找人修，费用之后再说", "一直不回复", "拒绝维修"]}
            />
            <SelectField
              label="责任倾向"
              name="tenantCause"
              defaultValue={seedValue(initialInput?.tenantCause, "非人为损坏")}
              options={["非人为损坏", "自然损耗或设备老化", "原因不清", "可能使用不当", "承租人人为造成"]}
            />
            <Field label="预估维修费" name="repairCost" defaultValue={seedNumber(initialInput?.repairCost, "1200")} />
            <SelectField
              label="押金担忧"
              name="depositConcern"
              defaultValue={seedValue(initialInput?.depositConcern, "担心退租时从押金扣")}
              options={["不担心押金", "担心退租时从押金扣", "对方已暗示要扣押金", "已经进入退租扣款争议"]}
            />
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="damageScope">影响范围</Label>
              <Input
                id="damageScope"
                name="damageScope"
                defaultValue={seedValue(initialInput?.damageScope, "卫生间地面渗水，楼下也反馈漏水")}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="safetyImpact">安全或生活影响</Label>
              <Input
                id="safetyImpact"
                name="safetyImpact"
                defaultValue={seedValue(initialInput?.safetyImpact, "有滑倒和继续渗漏风险")}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="contractClause">合同相关条款</Label>
              <Textarea
                id="contractClause"
                name="contractClause"
                className="min-h-[96px]"
                defaultValue={seedValue(
                  initialInput?.contractClause,
                  "合同只写设施损坏由承租人负责维修，没有区分自然损耗、设备老化和人为损坏。",
                )}
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
                  "看房时没有说明漏水，入住后几天发现卫生间持续渗水，房东说小问题让租客自己维修。",
                )}
              />
            </div>
          </div>

          <StatusMessage state={state} message={message} />

          <Button type="submit" size="lg" className="mt-5 w-full" disabled={state === "loading"}>
            {state === "loading" ? (
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            ) : (
              <Wrench className="mr-2 h-5 w-5" />
            )}
            {state === "loading" ? "正在整理责任建议" : "判断维修责任"}
          </Button>
        </Card>

        <Card className="min-w-0 p-6">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm text-primary/80">
                维修结果
              </p>
              <h2 className="mt-2 text-2xl font-semibold">维修责任结论</h2>
            </div>
            {result ? <RiskBadge status={result.status} tone="generic" /> : null}
          </div>

          {result ? (
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
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                <Button asChild variant="secondary" className="h-auto justify-between gap-3 py-3">
                  <Link href={buildEvidenceHref(result, reportId)}>
                    <span className="flex min-w-0 items-center gap-2">
                      <Archive className="h-4 w-4 shrink-0" />
                      <span className="truncate">整理维修凭据</span>
                    </span>
                    <ArrowRight className="h-4 w-4 shrink-0" />
                  </Link>
                </Button>
                <Button asChild variant="secondary" className="h-auto justify-between gap-3 py-3">
                  <Link href={buildPaymentHref(result, reportId)}>
                    <span className="flex min-w-0 items-center gap-2">
                      <BadgeDollarSign className="h-4 w-4 shrink-0" />
                      <span className="truncate">看垫付风险</span>
                    </span>
                    <ArrowRight className="h-4 w-4 shrink-0" />
                  </Link>
                </Button>
                <Button asChild variant="secondary" className="h-auto justify-between gap-3 py-3">
                  <Link href={buildOfficialHref(result, reportId)}>
                    <span className="flex min-w-0 items-center gap-2">
                      <Landmark className="h-4 w-4 shrink-0" />
                      <span className="truncate">查看投诉调解办法</span>
                    </span>
                    <ArrowRight className="h-4 w-4 shrink-0" />
                  </Link>
                </Button>
                <Button asChild variant="secondary" className="h-auto justify-between gap-3 py-3">
                  <Link href={buildDepositHref(result, reportId)}>
                    <span className="flex min-w-0 items-center gap-2">
                      <KeyRound className="h-4 w-4 shrink-0" />
                      <span className="truncate">进入押金退还</span>
                    </span>
                    <ArrowRight className="h-4 w-4 shrink-0" />
                  </Link>
                </Button>
                <Button asChild variant="secondary" className="h-auto justify-between gap-3 py-3">
                  <Link href={buildContractHref(result, reportId)}>
                    <span className="flex min-w-0 items-center gap-2">
                      <Scale className="h-4 w-4 shrink-0" />
                      <span className="truncate">确认维修条款</span>
                    </span>
                    <ArrowRight className="h-4 w-4 shrink-0" />
                  </Link>
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex min-h-[560px] flex-col justify-center rounded-md border border-border bg-secondary p-5">
              <Badge variant="secondary" className="mb-4 w-fit">
                入住后风险提示
              </Badge>
              <h3 className="text-xl font-semibold">不要把维修争议拖到退租那天</h3>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">
                漏水、发霉、家电故障和旧损坏如果只靠口头沟通，最后常会变成押金扣款。先报修、保存凭据、确认责任和费用边界。
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
                  <h3 className="font-semibold">维修责任通知包</h3>
                </div>
                <p className="max-w-3xl text-sm leading-7 text-muted-foreground">
                  把报修事实、责任确认、费用边界、垫付条件、凭据要求和维修期限整理成一段可直接发送的文字，避免维修问题拖到退租时变成押金扣款。
                </p>
              </div>
              <Button type="button" variant="outline" onClick={copyRepairMemo}>
                <Copy className="mr-2 h-4 w-4" />
                {copiedMemo ? "已复制" : "复制通知包"}
              </Button>
            </div>
            <pre className="mt-4 max-h-[360px] overflow-auto whitespace-pre-wrap rounded-md border border-border bg-secondary p-4 text-sm leading-7 text-muted-foreground">
              {buildRepairMemo(result)}
            </pre>
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
            <InfoPanel title="凭据材料" icon={ClipboardCheck} items={result.evidenceChecklist} />
            <InfoPanel title="费用边界" icon={ReceiptText} items={result.costControl} />
            <InfoPanel
              title="维修时间记录"
              icon={Wrench}
              items={result.timeline.map((item) => `${item.timing}：${item.title}。${item.action}`)}
            />
          </section>

          <section className="grid grid-cols-1 gap-4 lg:grid-cols-[0.5fr_0.5fr]">
            <InfoPanel title="投诉调解办法" icon={ShieldAlert} items={result.escalationOptions} />
            <InfoPanel title="下一步" icon={CheckCircle2} items={result.nextActions} />
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

