"use client";

import {
  AlertTriangle,
  CheckCircle2,
  CircleDashed,
  Gauge,
  MapPinned,
  ReceiptText,
  ShieldAlert,
} from "lucide-react";
import type { ReactNode } from "react";
import {
  buildAnalysisPreflight,
  type AnalysisDecisionFields,
  type AnalysisExtractResult,
  type AnalysisListingFields,
  type AnalysisPreflightLevel,
  type AnalysisProviderStatus,
} from "@/lib/analysis-preflight";
import { Progress } from "@/components/ui/progress";

const levelClassName: Record<AnalysisPreflightLevel, string> = {
  ready: "border-emerald-300/30 bg-emerald-300/10 text-emerald-700",
  review: "border-amber-300/30 bg-amber-300/10 text-amber-700",
  limited: "border-rose-300/30 bg-rose-300/10 text-rose-700",
};

export function AnalysisPreflightPanel({
  listing,
  decision,
  preferences,
  providers,
  hasScreenshot,
  extractResult,
}: {
  listing: AnalysisListingFields;
  decision: AnalysisDecisionFields;
  preferences: string[];
  providers: AnalysisProviderStatus[];
  hasScreenshot: boolean;
  extractResult: AnalysisExtractResult | null;
}) {
  const preflight = buildAnalysisPreflight({
    listing,
    decision,
    preferences,
    providers,
    hasScreenshot,
    extractResult,
  });
  const configuredCount = providers.filter((provider) => provider.configured).length;
  const listingReadyCount = preflight.checks.filter(
    (item) => item.group === "listing" && item.ok,
  ).length;
  const decisionReadyCount = preflight.checks.filter(
    (item) => item.group === "decision" && item.ok,
  ).length;

  return (
    <section className="mt-6 rounded-md border border-border bg-secondary p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground">
            <Gauge className="h-3.5 w-3.5 text-primary" />
            信息确认
          </div>
          <h3 className="text-lg font-semibold">提交前信息确认</h3>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
            先判断这份输入能支撑到什么程度，避免把信息不足的结论当成签约依据。
          </p>
        </div>
        <div className="w-full lg:w-64">
          <div className="mb-2 flex items-center justify-between gap-3">
            <span
              className={`rounded-full border px-2.5 py-1 text-xs ${levelClassName[preflight.level]}`}
            >
              {preflight.label}
            </span>
            <span className="text-sm text-muted-foreground">{preflight.score}%</span>
          </div>
          <Progress value={preflight.score} />
          <p className="mt-2 text-xs leading-5 text-muted-foreground">
            {preflight.description}
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-3 lg:grid-cols-4">
        <SignalBlock
          icon={<ReceiptText className="h-4 w-4" />}
          title="房源基本面"
          value={`${listingReadyCount}/4`}
          description="租金、面积、楼层、精确位置"
        />
        <SignalBlock
          icon={<MapPinned className="h-4 w-4" />}
          title="真实成本约束"
          value={`${decisionReadyCount}/5`}
          description="收入、预算、通勤和工作地"
        />
        <SignalBlock
          icon={<CircleDashed className="h-4 w-4" />}
          title="可用信息"
          value={providers.length ? `${configuredCount}/${providers.length}` : "检测中"}
          description="截图整理、路线、天气和邮件状态"
        />
        <SignalBlock
          icon={<ShieldAlert className="h-4 w-4" />}
          title="偏好风险"
          value={`${preflight.riskPrompts.length || 1} 项`}
          description="独居、怕吵、怕潮、宠物、老小区"
        />
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        <PreflightList
          title="优补充"
          empty="关键信息已经比较完整。"
          items={[...preflight.missingCritical, ...preflight.missingUseful].slice(0, 5)}
          tone={preflight.missingCritical.length ? "warning" : "normal"}
        />
        <PreflightList
          title="需要谨慎判断的内容"
          empty="暂未发现明显需要谨慎判断的内容。"
          items={preflight.degradation.slice(0, 5)}
          tone={preflight.degradation.length ? "warning" : "normal"}
        />
        <PreflightList
          title="看房时必须确认"
          empty="至少要确认出租权、押金、维修责任和付款条件。"
          items={preflight.riskPrompts.slice(0, 5)}
          tone="normal"
        />
      </div>
    </section>
  );
}

function SignalBlock({
  icon,
  title,
  value,
  description,
}: {
  icon: ReactNode;
  title: string;
  value: string;
  description: string;
}) {
  return (
    <div className="rounded-md border border-border bg-card p-4">
      <div className="mb-3 flex items-center gap-2 text-primary">{icon}</div>
      <div className="flex items-end justify-between gap-3">
        <p className="text-sm font-medium">{title}</p>
        <p className="text-lg font-semibold">{value}</p>
      </div>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p>
    </div>
  );
}

function PreflightList({
  title,
  items,
  empty,
  tone,
}: {
  title: string;
  items: string[];
  empty: string;
  tone: "normal" | "warning";
}) {
  const Icon = tone === "warning" ? AlertTriangle : CheckCircle2;

  return (
    <div className="rounded-md border border-border bg-card p-4">
      <div className="mb-3 flex items-center gap-2">
        <Icon
          className={`h-4 w-4 ${tone === "warning" ? "text-amber-200" : "text-primary"}`}
        />
        <p className="text-sm font-medium">{title}</p>
      </div>
      {items.length ? (
        <ul className="space-y-2 text-xs leading-5 text-muted-foreground">
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : (
        <p className="text-xs leading-5 text-muted-foreground">{empty}</p>
      )}
    </div>
  );
}

