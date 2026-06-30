"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  GitCompareArrows,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { RiskBadge } from "@/components/risk-badge";
import type { ReportStatus } from "@/lib/mock-data";

type ReportListItem = {
  id: string;
  mode: "openai" | "fallback";
  generatedAt: string;
  summary: {
    title: string;
    address: string;
    score: number;
    status: ReportStatus;
    conclusion: string;
  };
};

function formatTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function RecentReports() {
  const [reports, setReports] = useState<ReportListItem[]>([]);
  const [loading, setLoading] = useState(true);

  const reportStats = useMemo(() => {
    const risky = reports.filter((report) => report.summary.status !== "recommend").length;
    const averageScore = reports.length
      ? Math.round(
          reports.reduce((total, report) => total + report.summary.score, 0) / reports.length,
        )
      : 0;
    return {
      risky,
      averageScore,
      compareReady: reports.length >= 2,
    };
  }, [reports]);

  useEffect(() => {
    let mounted = true;

    fetch("/api/reports")
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (!mounted) return;
        setReports(Array.isArray(data?.reports) ? data.reports : []);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="rounded-md border border-border bg-secondary p-5 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          正在读取最近评估...
        </div>
      </div>
    );
  }

  if (reports.length) {
    return (
      <div className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm leading-6 text-muted-foreground">
            已保存 {reports.length} 份，平均评分 {reportStats.averageScore}，需谨慎或不建议 {reportStats.risky} 份。
          </p>
          <Button asChild variant="secondary" size="sm">
            <Link href={reportStats.compareReady ? "/compare" : "/analyze"}>
              <GitCompareArrows className="mr-2 h-4 w-4" />
              {reportStats.compareReady ? "进入对比" : "继续评估"}
            </Link>
          </Button>
        </div>

        {reports.slice(0, 5).map((report) => (
          <div
            key={report.id}
            className="rounded-md border border-border bg-secondary/60 p-4"
          >
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-semibold">{report.summary.title}</h3>
                  <RiskBadge status={report.summary.status} />
                  <span className="rounded-full border border-border bg-secondary px-2.5 py-1 text-xs text-muted-foreground">
                    {report.mode === "openai" ? "完整体检" : "快速体检"}
                  </span>
                </div>
                <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                  {report.summary.address}
                </p>
                <p className="mt-2 line-clamp-2 text-xs leading-5 text-muted-foreground">
                  {report.summary.conclusion}
                </p>
              </div>
              <div className="flex items-center gap-5">
                <div className="text-right">
                  <p className="text-2xl font-semibold">{report.summary.score}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatTime(report.generatedAt)}
                  </p>
                </div>
                <div className="grid gap-2">
                  <Button asChild variant="secondary" size="sm">
                    <Link href={`/report/${report.id}`}>查看</Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return null;
}

