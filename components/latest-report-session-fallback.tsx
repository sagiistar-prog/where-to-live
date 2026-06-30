"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BadgeDollarSign, Building2, Home, LayoutDashboard } from "lucide-react";
import { ReportView } from "@/components/report-view";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { AnalysisPreflightResult } from "@/lib/analysis-preflight";
import type { ReportData } from "@/lib/mock-data";

type SessionReportPayload = {
  report?: ReportData;
  mode?: "openai" | "fallback";
  generatedAt?: string;
  dataSources?: string[];
  dataQuality?: Array<{
    provider: "amap" | "qweather";
    feature: string;
    status: "live" | "fallback" | "missing_input" | "skipped_limit" | "failed";
    label: string;
    detail: string;
  }>;
  warnings?: string[];
  analysisPreflight?: AnalysisPreflightResult;
  saved?: boolean;
};

function readSessionReport() {
  try {
    const raw = window.sessionStorage.getItem("zhunaar:last-report");
    if (!raw) return null;
    const payload = JSON.parse(raw) as SessionReportPayload;
    return payload.report ? payload : null;
  } catch {
    return null;
  }
}

export function LatestReportSessionFallback() {
  const [payload, setPayload] = useState<SessionReportPayload | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setPayload(readSessionReport());
    setLoaded(true);
  }, []);

  if (payload?.report) {
    return (
      <>
        <ReportView
          report={payload.report}
          label={payload.mode === "openai" ? "本次完整体检" : "本次快速体检"}
          generatedAt={payload.generatedAt}
          dataSources={payload.dataSources}
          dataQuality={payload.dataQuality}
          warnings={payload.warnings ?? []}
          analysisPreflight={payload.analysisPreflight}
        />
        <Card className="mx-auto mt-6 max-w-7xl p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              这份结果还没有进入房源记录。需要长期回看、继续对比或回到工作台时，请重新体检并保存。
            </p>
            <Button asChild variant="secondary" size="sm">
              <Link href="/analyze">重新体检并保存</Link>
            </Button>
          </div>
        </Card>
      </>
    );
  }

  return (
    <Card className="mx-auto max-w-4xl p-6 sm:p-8">
      <div className="max-w-2xl">
        <p className="text-sm font-medium text-primary">
          {loaded ? "暂无房源体检结果" : "正在读取房源体检结果"}
        </p>
        <h1 className="mt-3 text-2xl font-semibold">
          先完成一次房源体检
        </h1>
        <p className="mt-3 text-sm leading-7 text-muted-foreground">
          输入月租、位置、工作地和主要顾虑后，这里会显示结论、主要风险、付款前需要确认的事项和当前行动。
        </p>
      </div>

      <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <ReportStartLink
          href="/analyze"
          icon={Home}
          title="房源体检"
          description="输入月租、位置、工作地和担心的问题。"
        />
        <ReportStartLink
          href="/payment"
          icon={BadgeDollarSign}
          title="付款咨询"
          description="先判断合同、收款和退款风险。"
        />
        <ReportStartLink
          href="/city?mode=buy"
          icon={Building2}
          title="买房大致判断"
          description="先看首付、月供和长期现金流。"
        />
        <ReportStartLink
          href="/dashboard"
          icon={LayoutDashboard}
          title="回到工作台"
          description="继续最近启动的判断和行动。"
        />
      </div>
    </Card>
  );
}

function ReportStartLink({
  href,
  icon: Icon,
  title,
  description,
}: {
  href: string;
  icon: typeof Home;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-md border border-border bg-secondary/55 p-4 transition-colors hover:border-primary/35 hover:bg-card"
    >
      <span className="mb-4 flex h-10 w-10 items-center justify-center rounded-md bg-primary/12 text-primary">
        <Icon className="h-5 w-5" />
      </span>
      <h2 className="text-sm font-semibold">{title}</h2>
      <p className="mt-2 text-xs leading-5 text-muted-foreground">{description}</p>
    </Link>
  );
}
