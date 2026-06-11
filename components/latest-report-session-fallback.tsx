"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
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
          label={payload.mode === "openai" ? "当前会话深度报告" : "当前会话基础报告"}
          generatedAt={payload.generatedAt}
          dataSources={payload.dataSources}
          dataQuality={payload.dataQuality}
          warnings={payload.warnings ?? []}
          analysisPreflight={payload.analysisPreflight}
        />
        <Card className="mx-auto mt-6 max-w-7xl p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              这份报告还只保留在当前浏览器会话里，尚未进入房源记录。关闭浏览器会话后可能无法再次打开。
            </p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button asChild variant="secondary" size="sm">
                <Link href="/analyze">重新评估并保存</Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link href="/settings">调整隐私设置</Link>
              </Button>
            </div>
          </div>
        </Card>
      </>
    );
  }

  return (
    <Card className="mx-auto max-w-2xl p-8 text-center">
      <h1 className="text-2xl font-semibold">
        {loaded ? "还没有最新报告" : "正在读取最新报告"}
      </h1>
      <p className="mt-3 text-sm leading-7 text-muted-foreground">
        先提交一套候选房源。住哪儿会整理成可回看的判断结果；如果你关闭了报告历史保存，结果只会保留在当前浏览器会话里。
      </p>
      <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
        <Button asChild>
          <Link href="/analyze">评估候选房源</Link>
        </Button>
        <Button asChild variant="secondary">
          <Link href="/report/demo">查看示例报告</Link>
        </Button>
      </div>
    </Card>
  );
}
