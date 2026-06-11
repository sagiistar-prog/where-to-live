"use client";

import { Check, Copy, Download } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { defaultAppSettings, readAppSettings } from "@/lib/app-settings";
import type { AnalysisPreflightResult } from "@/lib/analysis-preflight";
import type { DecisionCase } from "@/lib/decision-case";
import type { ReportData } from "@/lib/mock-data";
import { buildReportMarkdown, reportMarkdownFilename } from "@/lib/report-export";
import { redactSensitiveText } from "@/lib/sensitive-redaction";

type ReportExportActionsProps = {
  report: ReportData;
  label?: string;
  generatedAt?: string;
  dataSources?: string[];
  warnings?: string[];
  analysisPreflight?: AnalysisPreflightResult;
  decisionCase?: DecisionCase;
};

type CopyState = "idle" | "copied" | "error";

export function ReportExportActions({
  report,
  label,
  generatedAt,
  dataSources,
  warnings,
  analysisPreflight,
  decisionCase,
}: ReportExportActionsProps) {
  const [copyState, setCopyState] = useState<CopyState>("idle");
  const [maskSensitiveInfo, setMaskSensitiveInfo] = useState(
    defaultAppSettings.maskSensitiveInfo,
  );

  useEffect(() => {
    setMaskSensitiveInfo(readAppSettings().maskSensitiveInfo);
  }, []);

  const markdown = useMemo(() => {
    const raw = buildReportMarkdown(report, {
      label,
      generatedAt,
      dataSources,
      warnings,
      analysisPreflight,
      decisionCase,
    });

    return maskSensitiveInfo ? redactSensitiveText(raw) : raw;
  }, [analysisPreflight, dataSources, decisionCase, generatedAt, label, maskSensitiveInfo, report, warnings]);

  async function copyMarkdown() {
    try {
      await navigator.clipboard.writeText(markdown);
      setCopyState("copied");
      window.setTimeout(() => setCopyState("idle"), 1800);
    } catch {
      setCopyState("error");
      window.setTimeout(() => setCopyState("idle"), 2400);
    }
  }

  function downloadMarkdown() {
    const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = reportMarkdownFilename(report, generatedAt);
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="rounded-md border border-border bg-secondary/60 p-4">
      <div className="mb-3">
        <p className="text-sm font-medium">带走这份报告</p>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">
          整理可转发 Markdown 摘要，适合发给合租室友、伴侣、父母或看房当天离线使用。
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
        <Button type="button" variant="secondary" onClick={copyMarkdown}>
          {copyState === "copied" ? (
            <Check className="mr-2 h-4 w-4" />
          ) : (
            <Copy className="mr-2 h-4 w-4" />
          )}
          {copyState === "copied"
            ? "已复制"
            : copyState === "error"
              ? "复制失败"
              : "复制摘要"}
        </Button>
        <Button type="button" variant="secondary" onClick={downloadMarkdown}>
          <Download className="mr-2 h-4 w-4" />
          下载 Markdown
        </Button>
      </div>
      {maskSensitiveInfo ? (
        <p className="mt-3 text-xs leading-5 text-muted-foreground">
          已按隐私设置隐藏手机号、邮箱、门牌号和房间号。
        </p>
      ) : null}
    </div>
  );
}

