"use client";

import Link from "next/link";
import { ArrowRight, ClipboardCopy, FileText, ShieldAlert } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import type { ComparisonListing } from "@/lib/mock-data";

function riskLabel(value: ComparisonListing["risk"]) {
  if (value === "recommend") return "建议租";
  if (value === "reject") return "不建议租";
  return "谨慎考虑";
}

function gateLine(listing: ComparisonListing) {
  const pay = typeof listing.canPay === "boolean" ? (listing.canPay ? "可付款" : "先别付款") : "付款待确认";
  const sign = typeof listing.canSign === "boolean" ? (listing.canSign ? "可签约" : "先别签约") : "签约待确认";
  return `${pay}，${sign}`;
}

type ComparisonMode = "real" | "hybrid" | "demo";

function sourceLine(mode: ComparisonMode) {
  if (mode === "real") return "来源：已保存的真实房源评估报告";
  if (mode === "hybrid") return "来源：1 份真实报告 + 示例替代方案；请继续补充真实候选";
  return "来源：展示数据，真实选择前请至少保存两份评估";
}

function buildMemo(listings: ComparisonListing[], comparisonMode: ComparisonMode) {
  const top = listings[0];
  const backup = listings[1];
  const blocked =
    listings.find((item) => item.gateLevel === "stop" || item.canPay === false || item.risk === "reject") ??
    listings.find((item) => item.blockers?.length) ??
    listings[listings.length - 1];

  if (!top) return "还没有可对比的候选房源。";

  const lines = [
    "住哪儿多房源对比备忘录",
    sourceLine(comparisonMode),
    "",
    `当前第一选择：${top.name}`,
    `结论：${riskLabel(top.risk)}；${gateLine(top)}`,
    `理由：${top.decisionSummary ?? top.reason}`,
    top.monthlyCostDelta ? `成本取舍：${top.monthlyCostDelta}` : "",
    top.commuteDelta ? `通勤取舍：${top.commuteDelta}` : "",
    "",
    backup ? `备选：${backup.name}` : "备选：暂无，需要继续评估候选房源",
    backup ? `成立条件：${backup.decisionSummary ?? backup.reason}` : "",
    backup?.giveUp?.length ? `主要代价：${backup.giveUp.slice(0, 2).join("；")}` : "",
    "",
    blocked ? `先确认或放弃：${blocked.name}` : "先确认或放弃：暂无明显高风险候选",
    blocked ? `卡点：${blocked.blockers?.[0] ?? blocked.giveUp?.[0] ?? blocked.reason}` : "",
    "",
    "选择底线：不要因为租金便宜、房东催促或位置不错，跳过官方查询、凭据材料、付款前确认和合同确认。",
  ];

  return lines.filter(Boolean).join("\n");
}

function firstBlocker(listings: ComparisonListing[]) {
  return (
    listings.find((item) => item.gateLevel === "stop" || item.canPay === false || item.risk === "reject") ??
    listings.find((item) => item.blockers?.length)
  );
}

export function ComparisonDecisionMemo({
  listings,
  comparisonMode,
}: {
  listings: ComparisonListing[];
  comparisonMode: ComparisonMode;
}) {
  const [copied, setCopied] = useState(false);
  const memo = useMemo(
    () => buildMemo(listings, comparisonMode),
    [comparisonMode, listings],
  );
  const top = listings[0];
  const backup = listings[1];
  const blocked = firstBlocker(listings);

  if (!top) return null;

  async function copyMemo() {
    try {
      await navigator.clipboard.writeText(memo);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  return (
    <section className="rounded-lg border border-border bg-card p-5">
      <div className="grid gap-5 xl:grid-cols-[0.34fr_0.66fr]">
        <div className="min-w-0">
          <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-md bg-primary/15 text-primary">
            <FileText className="h-5 w-5" />
          </div>
          <p className="text-sm text-primary">
            对比备忘录
          </p>
          <h2 className="mt-2 text-xl font-semibold">这轮对比怎么跟别人说清楚</h2>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">
            把推荐、备选、先确认风险和底线压缩成一段能发给同住人、家人或自己复盘的文字，只保留判断理由。
          </p>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row xl:flex-col">
            <Button type="button" onClick={copyMemo}>
              <ClipboardCopy className="mr-2 h-4 w-4" />
              {copied ? "已复制备忘录" : "复制对比备忘录"}
            </Button>
            <Button asChild variant="secondary">
              <Link href={top.nextActionHref ?? top.href ?? "/case"}>
                确认第一选择下一步
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[0.58fr_0.42fr]">
          <div className="rounded-md border border-border bg-secondary/60 p-4">
            <p className="mb-3 text-sm font-medium">可复制文本</p>
            <pre className="whitespace-pre-wrap break-words rounded-md border border-border bg-background/45 p-4 text-xs leading-6 text-muted-foreground">
              {memo}
            </pre>
          </div>

          <div className="grid gap-3">
            <MemoFact
              label="当前第一选择"
              title={top.name}
              detail={top.decisionSummary ?? top.reason}
            />
            <MemoFact
              label="备选"
              title={backup?.name ?? "继续添加一套候选"}
              detail={backup?.decisionSummary ?? "至少两套真实报告后，备选判断会更可靠。"}
            />
            <MemoFact
              label="先确认"
              title={blocked?.name ?? "暂无明显高风险候选"}
              detail={
                blocked?.blockers?.[0] ??
                blocked?.giveUp?.[0] ??
                "仍需保存签约前确认，避免因为价格或位置冲动决定。"
              }
              tone="warning"
              href={blocked?.nextActionHref ?? blocked?.href}
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function MemoFact({
  label,
  title,
  detail,
  tone = "default",
  href,
}: {
  label: string;
  title: string;
  detail: string;
  tone?: "default" | "warning";
  href?: string;
}) {
  const content = (
    <div
      className={
        tone === "warning"
          ? "rounded-md border border-amber-300/20 bg-amber-300/10 p-4"
          : "rounded-md border border-border bg-secondary/60 p-4"
      }
    >
      <div className="mb-3 flex items-center gap-2">
        {tone === "warning" ? <ShieldAlert className="h-4 w-4 text-amber-700" /> : null}
        <p className={tone === "warning" ? "text-xs text-amber-700/80" : "text-xs text-muted-foreground"}>
          {label}
        </p>
      </div>
      <p className="font-medium">{title}</p>
      <p className={tone === "warning" ? "mt-2 line-clamp-4 text-xs leading-5 text-amber-900/90" : "mt-2 line-clamp-4 text-xs leading-5 text-muted-foreground"}>
        {detail}
      </p>
    </div>
  );

  return href ? <Link href={href}>{content}</Link> : content;
}

