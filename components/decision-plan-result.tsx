import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ClipboardCopy,
  LayoutDashboard,
  MessageSquareText,
  Save,
  ShieldAlert,
} from "lucide-react";
import { RiskBadge } from "@/components/risk-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { DecisionPlanResult } from "@/lib/decision-plan";
import type { ReportTarget } from "@/components/decision-plan-panel";

export type DecisionPlanRecordState = "idle" | "saving" | "saved" | "error";

export type DecisionPlanNextModule = {
  name: string;
  reason: string;
  href: string;
};

export function DecisionPlanResultCard({
  result,
  selectedReport,
  recordState,
  onRecord,
  nextModules,
}: {
  result: DecisionPlanResult;
  selectedReport?: ReportTarget;
  recordState: DecisionPlanRecordState;
  onRecord: () => void;
  nextModules: DecisionPlanNextModule[];
}) {
  const [copied, setCopied] = useState(false);

  async function copyActionPack() {
    try {
      await navigator.clipboard.writeText(buildDecisionPlanCopy(result));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  return (
    <Card className="min-w-0 p-6">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm text-primary/80">
            判断结果
          </p>
          <h2 className="mt-2 text-2xl font-semibold">当前先处理什么</h2>
        </div>
        <RiskBadge status={result.status} tone="generic" />
      </div>
      <div className="space-y-5">
        <div>
          <h3 className="text-xl font-semibold">{result.headline}</h3>
          <p className="mt-2 text-sm leading-7 text-muted-foreground">{result.summary}</p>
        </div>
        <div className="grid gap-2 rounded-md border border-border bg-secondary p-4 text-sm leading-6 text-muted-foreground sm:grid-cols-2">
          <p>
            <span className="font-medium text-foreground">阶段：</span>
            {result.currentStage}
          </p>
          <p>
            <span className="font-medium text-foreground">时间：</span>
            {result.decisionDeadline}
          </p>
        </div>
        <div className="rounded-md border border-primary/20 bg-primary/10 p-4">
          <h3 className="font-semibold text-foreground">今天先做</h3>
          <div className="mt-3 grid gap-2 text-sm leading-6 text-foreground/90">
            {result.todayPlan.slice(0, 3).map((item) => (
              <p key={item} className="rounded-md border border-border/70 bg-background/55 px-3 py-2">
                {item}
              </p>
            ))}
          </div>
        </div>
        <div className="rounded-md border border-amber-300/20 bg-amber-300/10 p-4">
          <div className="mb-3 flex items-center gap-2 text-amber-700">
            <ShieldAlert className="h-4 w-4" />
            <h3 className="font-semibold">继续前先确认</h3>
          </div>
          <div className="grid gap-2 text-sm leading-6 text-amber-900/90">
            {result.blockers.map((item) => (
              <p key={item}>{item}</p>
            ))}
          </div>
        </div>
        <ActionPackPanel
          result={result}
          copied={copied}
          onCopy={copyActionPack}
          selectedReport={selectedReport}
          recordState={recordState}
          onRecord={onRecord}
          nextModules={nextModules}
        />
      </div>
    </Card>
  );
}

function buildDecisionPlanCopy(result: DecisionPlanResult) {
  return [
    "住哪儿｜当前行动",
    `结论：${result.headline}`,
    `阶段：${result.currentStage}`,
    `时间：${result.decisionDeadline}`,
    "",
    "当前先处理：",
    ...result.todayPlan.map((item) => item),
    "",
    `付款咨询：${result.stopLine}`,
    `做到什么程度：${result.doneDefinition}`,
    "",
    "需要补充的信息：",
    ...result.evidenceChecklist.slice(0, 4).map((item) => `- ${item}`),
    "",
    "对外话术：",
    result.handoffScript,
    "",
    "使用提醒：本清单只基于你主动输入的信息和公开可核验信息整理；付款、签约和维权前仍需回到原始材料与官方入口确认。",
  ].join("\n");
}

function ActionPackPanel({
  result,
  copied,
  onCopy,
  selectedReport,
  recordState,
  onRecord,
  nextModules,
}: {
  result: DecisionPlanResult;
  copied: boolean;
  onCopy: () => void;
  selectedReport?: ReportTarget;
  recordState: DecisionPlanRecordState;
  onRecord: () => void;
  nextModules: DecisionPlanNextModule[];
}) {
  return (
    <section className="rounded-md border border-primary/25 bg-primary/10 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-primary">
            <MessageSquareText className="h-4 w-4" />
            <h3 className="font-semibold">可保存的行动清单</h3>
          </div>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            用于复制给自己或保存到房源记录，后续回到工作台可继续查看。
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button asChild variant="outline" className="shrink-0">
            <Link href="/dashboard">
              <LayoutDashboard className="mr-2 h-4 w-4" />
              回到工作台
            </Link>
          </Button>
          <Button type="button" variant="secondary" className="shrink-0" onClick={onCopy}>
            <ClipboardCopy className="mr-2 h-4 w-4" />
            {copied ? "已复制" : "复制行动"}
          </Button>
          {selectedReport ? (
            <Button
              type="button"
              variant="outline"
              className="shrink-0"
              onClick={onRecord}
              disabled={recordState === "saving"}
            >
              <Save className="mr-2 h-4 w-4" />
              {recordState === "saving"
                ? "正在写入"
                : recordState === "saved"
                  ? "已保存到记录"
                  : "保存到记录"}
            </Button>
          ) : null}
        </div>
      </div>

      {selectedReport ? (
        <p className="mt-4 rounded-md border border-border/70 bg-background/45 px-3 py-2 text-xs leading-5 text-muted-foreground">
          当前将写入：{selectedReport.summary.title} · {selectedReport.summary.address}
        </p>
      ) : null}

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-md border border-amber-300/20 bg-amber-300/10 p-3">
          <p className="text-xs text-amber-700/80">付款咨询</p>
          <p className="mt-1 text-sm leading-6 text-amber-900">{result.stopLine}</p>
        </div>
        <div className="rounded-md border border-emerald-300/20 bg-emerald-300/10 p-3">
          <p className="text-xs text-emerald-700/80">做到什么程度</p>
          <p className="mt-1 text-sm leading-6 text-emerald-900">{result.doneDefinition}</p>
        </div>
      </div>
      {nextModules.length ? (
        <div className="mt-4 border-t border-primary/20 pt-4">
          <p className="text-sm font-medium text-primary">后续入口</p>
          <div className="mt-3 grid gap-2">
            {nextModules.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="group rounded-md border border-border/70 bg-background/45 px-3 py-3 transition hover:border-primary/50"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold">{item.name}</p>
                  <ArrowRight className="h-4 w-4 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-primary" />
                </div>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">{item.reason}</p>
              </Link>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
