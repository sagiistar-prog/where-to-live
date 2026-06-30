"use client";

import {
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import {
  buildAnalysisPreflight,
  type AnalysisDecisionFields,
  type AnalysisExtractResult,
  type AnalysisListingFields,
  type AnalysisPreflightLevel,
} from "@/lib/analysis-preflight";

const levelClassName: Record<AnalysisPreflightLevel, string> = {
  ready: "border-emerald-300/30 bg-emerald-300/10 text-emerald-700",
  review: "border-amber-300/30 bg-amber-300/10 text-amber-700",
  limited: "border-rose-300/30 bg-rose-300/10 text-rose-700",
};

export function AnalysisPreflightPanel({
  listing,
  decision,
  preferences,
  hasScreenshot,
  extractResult,
}: {
  listing: AnalysisListingFields;
  decision: AnalysisDecisionFields;
  preferences: string[];
  hasScreenshot: boolean;
  extractResult: AnalysisExtractResult | null;
}) {
  const preflight = buildAnalysisPreflight({
    listing,
    decision,
    preferences,
    hasScreenshot,
    extractResult,
  });
  const advice = preflight.missingCritical.slice(0, 2);
  const remainingCount = preflight.missingCritical.length - advice.length;
  const AdviceIcon = preflight.missingCritical.length ? AlertTriangle : CheckCircle2;

  if (!preflight.missingCritical.length) {
    return null;
  }

  return (
    <section className="mt-6 rounded-md border border-border bg-secondary/60 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 gap-3">
          <AdviceIcon
            className={`mt-1 h-4 w-4 shrink-0 ${preflight.missingCritical.length ? "text-amber-600" : "text-primary"}`}
          />
          <div className="min-w-0">
            <p className="text-sm font-medium">提交前确认</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              {preflight.description}
            </p>
          </div>
        </div>
        <span
          className={`w-fit shrink-0 rounded-full border px-2.5 py-1 text-xs ${levelClassName[preflight.level]}`}
        >
          {preflight.label}
        </span>
      </div>

      {advice.length ? (
        <ul className="mt-3 grid gap-2 text-xs leading-5 text-muted-foreground">
          {advice.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : null}
      {remainingCount > 0 ? (
        <p className="mt-3 text-xs leading-5 text-muted-foreground">
          还有 {remainingCount} 项关键信息需要确认。
        </p>
      ) : null}
    </section>
  );
}

