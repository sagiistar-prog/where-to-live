"use client";

import Link from "next/link";
import { ArrowRight, CheckCircle2, Copy, MessageSquareText, ShieldAlert } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import type { DecisionCase, DecisionCaseGateItem } from "@/lib/decision-case";
import type { CaseEventType } from "@/lib/case-events";

const stateCopy: Record<DecisionCaseGateItem["state"], string> = {
  done: "已确认",
  attention: "待补充",
  blocked: "不建议继续",
  pending: "还没确认",
};

type LifecycleMessageKind = Extract<
  CaseEventType,
  "move" | "handover" | "repair" | "renewal" | "deposit"
>;

function unique(items: string[], max = 6) {
  return Array.from(new Set(items.map((item) => item.trim()).filter(Boolean))).slice(0, max);
}

function lifecycleMessageKind(item: DecisionCase): LifecycleMessageKind | undefined {
  const text = `${item.nextBestAction.label} ${item.nextBestAction.href}`;
  if (/\/move\b|入住预算|首笔支出/.test(text)) return "move";
  if (/\/handover\b|交割|拿钥匙|表读数/.test(text)) return "handover";
  if (/\/repair\b|维修|垫付/.test(text)) return "repair";
  if (/\/renewal\b|续租|涨租/.test(text)) return "renewal";
  if (/\/deposit\b|押金|扣款|退租/.test(text)) return "deposit";
  return undefined;
}

function gateConclusion(item: DecisionCase) {
  if (item.preSignGate.canSign) return "可进入签约前最后确认";
  if (item.preSignGate.canPay) return "可做小额付款前确认，签约前仍需补充必须确认的材料";
  if (item.preSignGate.level === "review") return "补充材料，再决定是否付款";
  return "先别付款，也先别签约";
}

function buildTodayList(item: DecisionCase) {
  const openGates = item.preSignGate.items
    .filter((gate) => gate.state !== "done")
    .map((gate) => `${gate.label}：${gate.reason}`);

  return unique(
    [
      `${item.nextBestAction.label}：${item.nextBestAction.doneCriteria}`,
      ...openGates,
      ...item.evidenceGaps.map((gap) => `补充凭据：${gap}`),
      ...item.dataGaps.map((gap) => `补充信息：${gap}`),
    ],
    5,
  );
}

function buildAskList(item: DecisionCase) {
  const lifecycleKind = lifecycleMessageKind(item);
  if (lifecycleKind) {
    const relatedGate = item.lifecycleGate.items.find((gate) => gate.type === lifecycleKind);
    const relatedEvents = item.completedEvents.filter((event) => event.type === lifecycleKind);

    return unique(
      [
        relatedGate?.reason,
        ...relatedEvents.flatMap((event) => [event.summary, ...event.highlights]),
        item.nextBestAction.doneCriteria,
        ...item.evidenceGaps,
      ].filter((entry): entry is string => Boolean(entry)),
      6,
    );
  }

  const openGateLabels = item.preSignGate.items
    .filter((gate) => gate.state !== "done")
    .map((gate) => gate.label);

  return unique(
    [
      ...item.evidenceGaps,
      ...openGateLabels,
      ...item.blockers,
      ...item.dataConfidence.riskPrompts,
    ],
    6,
  );
}

function buildLifecycleMessage(
  item: DecisionCase,
  kind: LifecycleMessageKind,
  askList: string[],
) {
  const lines = askList.length
    ? askList.map((entry, index) => `${index + 1}. ${entry}`)
    : ["1. 请补充可截图留存的书面确认。"];

  if (kind === "move") {
    return [
      `你好，关于「${item.title}」的首笔支出和入住预算，我需要先把付款周期、收据材料和现金安全垫确认清楚。`,
      "在首笔支出结构、付款时间、收据开具和未确认费用边界补充清楚前，我不会继续做不可逆转账。",
      "麻烦先确认这些事项：",
      ...lines,
      "确认后我再继续安排付款节奏或交割确认。",
    ].join("\n");
  }

  if (kind === "handover") {
    return [
      `你好，关于「${item.title}」的交割确认，我需要先确认钥匙门禁、表读数、旧损坏、家具家电和历史欠费凭据。`,
      "在交割清单、照片视频和费用边界未确认前，我不会签署无争议确认，也不会补付不清楚的历史费用。",
      "麻烦先确认这些事项：",
      ...lines,
      "确认后我再继续交割确认或整理维修/押金凭据。",
    ].join("\n");
  }

  if (kind === "repair") {
    return [
      `你好，关于「${item.title}」的维修问题，我需要先确认责任主体、维修范围、垫付条件、票据要求和报销时间。`,
      "在责任和费用边界未书面确认前，我不会先垫付大额维修费，也不会认可后续把该问题直接作为押金扣款依据。",
      "麻烦先确认这些事项：",
      ...lines,
      "确认后我再继续确认维修办法、付款条件或官方投诉/调解办法。",
    ].join("\n");
  }

  if (kind === "renewal") {
    return [
      `你好，关于「${item.title}」的续租和涨租，我需要先确认新租金、付款周期、押金沿用或调整、维修承诺和补充协议文本。`,
      "在续租上限、替代方案和补充协议风险未确认前，我不会直接按新价格转账。",
      "麻烦先确认这些事项：",
      ...lines,
      "确认后我再决定续租付款、谈判或准备搬家备选。",
    ].join("\n");
  }

  return [
    `你好，关于「${item.title}」的退租押金和扣款争议，我需要先确认扣款依据、返还截止日、交割凭据和可争议费用。`,
    "在扣款明细和凭据材料未补充清楚前，我不会签署扣款确认、放弃追偿或补付费用。",
    "麻烦先确认这些事项：",
    ...lines,
    "确认后我再继续押金返还、官方投诉/调解或扣款确认。",
  ].join("\n");
}

function buildMessage(item: DecisionCase, askList: string[]) {
  const lifecycleKind = lifecycleMessageKind(item);
  if (lifecycleKind) return buildLifecycleMessage(item, lifecycleKind, askList);

  const payText = item.preSignGate.canPay ? "在付款前我还会做最后核对" : "在这些材料确认前我不会先付款";
  const signText = item.preSignGate.canSign ? "签约前我会再次确认原件和合同版本" : "签约也需要等这些点补充清楚后再继续";
  const lines = askList.length
    ? askList.map((entry, index) => `${index + 1}. ${entry}`)
    : [
        "1. 出租权/授权材料",
        "2. 押金、退款和维修责任条款",
        "3. 收款主体和付款备注",
      ];

  return [
    `你好，我还在认真考虑这套「${item.title}」。`,
    `为了避免后续误会，${payText}，${signText}。麻烦先用文字或可截图留存的方式确认这些材料/问题：`,
    ...lines,
    "确认后我再继续安排付款、签约或再次看房。谢谢。",
  ].join("\n");
}

export function CaseActionPack({ item }: { item: DecisionCase }) {
  const [copied, setCopied] = useState(false);
  const todayList = useMemo(() => buildTodayList(item), [item]);
  const askList = useMemo(() => buildAskList(item), [item]);
  const message = useMemo(() => buildMessage(item, askList), [askList, item]);
  const openGates = item.preSignGate.items.filter((gate) => gate.state !== "done");
  const firstOpenGate = openGates[0];
  const toneClass =
    item.preSignGate.level === "ready"
      ? "border-emerald-300/25 bg-emerald-300/10 text-emerald-700"
      : item.preSignGate.level === "review"
        ? "border-amber-300/25 bg-amber-300/10 text-amber-700"
        : "border-rose-300/25 bg-rose-300/10 text-rose-700";

  async function copyMessage() {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  return (
    <section className="mt-5 rounded-md border border-border bg-secondary p-4">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/15 text-primary">
              <MessageSquareText className="h-4 w-4" />
            </span>
            <span className={`rounded-full border px-2.5 py-1 text-xs ${toneClass}`}>
              {gateConclusion(item)}
            </span>
            <span className="rounded-full border border-border bg-secondary/60 px-2.5 py-1 text-xs text-muted-foreground">
              签约前确认事项
            </span>
          </div>
          <h3 className="text-lg font-semibold tracking-normal">今天能直接用的材料包</h3>
          <p className="mt-2 max-w-4xl text-sm leading-6 text-muted-foreground">
            把这套房当前的确认情况整理成一份可直接使用的清单和一段可复制文本。适合被催付款、再次看房前、签合同前直接使用。
          </p>
        </div>
        <div className="grid shrink-0 grid-cols-2 gap-2 sm:min-w-[280px]">
          <PackMetric label="付款判断" value={item.preSignGate.canPay ? "可确认后付款" : "先别付款"} />
          <PackMetric label="签约判断" value={item.preSignGate.canSign ? "可最终确认" : "先别签约"} />
        </div>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[0.48fr_0.52fr]">
        <div className="rounded-md border border-border bg-secondary/60 p-4">
          <div className="mb-3 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-primary" />
            <h4 className="text-sm font-semibold">今天只做这些</h4>
          </div>
          <ol className="space-y-2 text-sm leading-6 text-muted-foreground">
            {todayList.map((entry, index) => (
              <li key={entry} className="flex gap-2">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-primary/15 text-xs text-primary">
                  {index + 1}
                </span>
                <span>{entry}</span>
              </li>
            ))}
          </ol>
        </div>

        <div className="rounded-md border border-border bg-secondary/60 p-4">
          <div className="mb-3 flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-primary" />
            <h4 className="text-sm font-semibold">可复制给出租方/中介</h4>
          </div>
          <p className="whitespace-pre-line rounded-md border border-border bg-background/45 p-3 text-xs leading-5 text-muted-foreground">
            {message}
          </p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <Button type="button" variant="outline" size="sm" onClick={copyMessage}>
              <Copy className="mr-2 h-4 w-4" />
              {copied ? "已复制" : "复制沟通文本"}
            </Button>
            <Button asChild variant="secondary" size="sm">
              <Link href={firstOpenGate?.href ?? item.nextBestAction.href}>
                去补充材料
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {openGates.length ? (
        <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
          {openGates.slice(0, 4).map((gate) => (
            <Link
              key={`${item.id}-pack-${gate.type}-${gate.label}`}
              href={gate.href}
              className="rounded-md border border-border bg-secondary/60 p-3 transition-colors hover:bg-card"
            >
              <p className="text-xs text-muted-foreground">{stateCopy[gate.state]}</p>
              <p className="mt-1 text-sm font-medium">{gate.label}</p>
              <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">
                {gate.reason}
              </p>
            </Link>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function PackMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-secondary/60 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-medium text-foreground/90">{value}</p>
    </div>
  );
}

