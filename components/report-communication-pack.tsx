"use client";

import { Check, Copy, MessageSquareText, ShieldAlert } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { defaultAppSettings, readAppSettings } from "@/lib/app-settings";
import type { DecisionCase } from "@/lib/decision-case";
import type { ReportData } from "@/lib/mock-data";
import {
  buildReportCommunicationScripts,
  type ReportCommunicationScript,
} from "@/lib/report-communication";
import { redactSensitiveText } from "@/lib/sensitive-redaction";

type CopyTarget = "all" | string;

export function ReportCommunicationPack({
  report,
  decisionCase,
}: {
  report: ReportData;
  decisionCase?: DecisionCase;
}) {
  const [copied, setCopied] = useState<CopyTarget | null>(null);
  const [maskSensitiveInfo, setMaskSensitiveInfo] = useState(
    defaultAppSettings.maskSensitiveInfo,
  );

  useEffect(() => {
    setMaskSensitiveInfo(readAppSettings().maskSensitiveInfo);
  }, []);

  const scripts = useMemo(
    () => buildReportCommunicationScripts(report, decisionCase),
    [decisionCase, report],
  );
  const visibleScripts = useMemo(
    () =>
      scripts.map((script) => ({
        ...script,
        body: maskSensitiveInfo ? redactSensitiveText(script.body) : script.body,
      })),
    [maskSensitiveInfo, scripts],
  );
  const allText = visibleScripts
    .map((script) => `【${script.title}】\n${script.body}`)
    .join("\n\n---\n\n");

  async function copyText(target: CopyTarget, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(target);
      window.setTimeout(() => setCopied(null), 1800);
    } catch {
      setCopied(null);
    }
  }

  return (
    <section className="rounded-md border border-border bg-card p-6">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-border bg-secondary px-3 py-1 text-xs text-muted-foreground">
            <MessageSquareText className="h-3.5 w-3.5 text-primary" />
            沟通文本
          </div>
          <h2 className="text-xl font-semibold">签约前沟通文本</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
            把报告里的风险转成能发给中介、房东或室友的文字。重点是留痕、补充材料、先别付款和再次看房；重大争议建议回到官方查询或专业法律意见。
          </p>
        </div>
        <Button
          type="button"
          variant="secondary"
          className="w-full shrink-0 sm:w-auto"
          onClick={() => copyText("all", allText)}
        >
          {copied === "all" ? (
            <Check className="mr-2 h-4 w-4" />
          ) : (
            <Copy className="mr-2 h-4 w-4" />
          )}
          {copied === "all" ? "已复制全部" : "复制全部话术"}
        </Button>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        {visibleScripts.map((script) => (
          <CommunicationScriptCard
            key={script.id}
            script={script}
            copied={copied === script.id}
            onCopy={() => copyText(script.id, script.body)}
          />
        ))}
      </div>

      {maskSensitiveInfo ? (
        <p className="mt-4 text-xs leading-5 text-muted-foreground">
          已按隐私设置隐藏手机号、邮箱、门牌号和房间号。发送前仍建议你再人工检查一遍。
        </p>
      ) : null}
    </section>
  );
}

function CommunicationScriptCard({
  script,
  copied,
  onCopy,
}: {
  script: ReportCommunicationScript;
  copied: boolean;
  onCopy: () => void;
}) {
  const isMust = script.priority === "必须先发";

  return (
    <article className="flex min-w-0 flex-col rounded-md border border-border bg-secondary/60 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs ${
                isMust
                  ? "border-amber-300/30 bg-amber-300/10 text-amber-700"
                  : "border-primary/25 bg-primary/10 text-primary"
              }`}
            >
              {isMust ? <ShieldAlert className="h-3.5 w-3.5" /> : null}
              {script.priority}
            </span>
          </div>
          <h3 className="text-base font-semibold">{script.title}</h3>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">{script.scenario}</p>
        </div>
        <Button type="button" variant="outline" size="icon" aria-label="复制话术" onClick={onCopy}>
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        </Button>
      </div>
      <pre className="mt-4 whitespace-pre-wrap break-words rounded-md border border-border bg-background/55 p-3 text-xs leading-5 text-muted-foreground">
        {script.body}
      </pre>
    </article>
  );
}

