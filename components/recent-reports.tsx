"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Compass,
  Download,
  FileText,
  GitCompareArrows,
  Loader2,
  MapPinned,
  PlusCircle,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { RiskBadge } from "@/components/risk-badge";
import { recentListings, type ReportStatus } from "@/lib/mock-data";

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

const emptyStateActions = [
  {
    title: "先算城市成本",
    description: "适合刚拿到新工作，想知道这座城值不值得去。",
    href: "/city",
    label: "开始核算",
    icon: Compass,
  },
  {
    title: "评估第一套房源",
    description: "适合已经看中一套房，想知道能不能继续谈。",
    href: "/analyze",
    label: "开始评估",
    icon: PlusCircle,
  },
  {
    title: "先看片区通勤",
    description: "适合还没锁定房源，先排除长期住不顺的片区。",
    href: "/area",
    label: "筛选片区",
    icon: MapPinned,
  },
];

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
  const [clearState, setClearState] = useState<"idle" | "confirming" | "clearing" | "done" | "error">("idle");

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

  async function clearHistory() {
    if (clearState !== "confirming") {
      setClearState("confirming");
      return;
    }

    setClearState("clearing");
    try {
      const response = await fetch("/api/reports/clear", { method: "POST" });
      if (!response.ok) throw new Error("清空失败");
      sessionStorage.removeItem("zhunaar:last-report");
      setReports([]);
      setClearState("done");
    } catch {
      setClearState("error");
    }
  }

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
        <div className="rounded-md border border-border bg-secondary p-4">
          <div className="grid gap-3 md:grid-cols-3">
            <HistoryMetric label="已保存报告" value={`${reports.length} 份`} />
            <HistoryMetric label="平均评分" value={`${reportStats.averageScore}`} />
            <HistoryMetric label="需谨慎/不建议" value={`${reportStats.risky} 份`} />
          </div>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm leading-6 text-muted-foreground">
              {reportStats.compareReady
                ? "已满足真实多房源对比条件，可以把候选房源放到同一张表里看取舍。"
                : "再保存 1 份评估后，就能进入真实多房源对比。"}
            </p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button asChild variant="secondary" size="sm" disabled={!reportStats.compareReady}>
                <Link href={reportStats.compareReady ? "/compare" : "/analyze"}>
                  <GitCompareArrows className="mr-2 h-4 w-4" />
                  {reportStats.compareReady ? "进入对比" : "继续评估"}
                </Link>
              </Button>
              <Button asChild variant="secondary" size="sm">
                <a href="/api/reports/export" download>
                  <Download className="mr-2 h-4 w-4" />
                  导出记录
                </a>
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={clearHistory}
                disabled={clearState === "clearing"}
              >
                {clearState === "clearing" ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="mr-2 h-4 w-4" />
                )}
                {clearState === "clearing"
                  ? "正在清空"
                  : clearState === "confirming"
                    ? "再次确认清空"
                    : "清空记录"}
              </Button>
            </div>
          </div>
          {clearState === "done" ? (
            <p className="mt-3 text-xs text-muted-foreground">
              已清空报告、已保存判断和浏览器会话报告。
            </p>
          ) : null}
          {clearState === "confirming" ? (
            <p className="mt-3 text-xs text-amber-700">
              这会删除已保存的报告和房源记录事件。再次点击红色按钮后才会清空。
            </p>
          ) : null}
          {clearState === "error" ? (
            <p className="mt-3 text-xs text-rose-700">清空失败，请稍后重试。</p>
          ) : null}
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
                    {report.mode === "openai" ? "完整评估" : "快速评估"}
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
                  <Button asChild variant="ghost" size="sm">
                    <Link href="/compare">去对比</Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="rounded-md border border-border bg-secondary p-5">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-md bg-primary/15 text-primary">
              <FileText className="h-5 w-5" />
            </div>
            <h3 className="font-semibold">从第一份居住判断开始</h3>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              {clearState === "done"
                ? "报告、已保存判断和浏览器会话报告已清空。你可以重新从城市、片区或房源开始。"
                : "不用一次填完所有信息。先选你现在最着急的一步，住哪儿会把结果保存成房源记录，后面可以继续比较、补充材料、做付款前确认。"}
            </p>
          </div>
          <Button asChild size="sm">
            <Link href="/start?prompt=我正在纠结第一套房，想先判断值不值得继续谈">
              从一句话开始
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>

        <div className="mt-5 grid gap-3 lg:grid-cols-3">
          {emptyStateActions.map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.href}
                href={action.href}
                className="group rounded-md border border-border bg-card p-4 transition-colors hover:border-primary/45 hover:bg-primary/10"
              >
                <div className="mb-3 flex items-center justify-between gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/15 text-primary">
                    <Icon className="h-4 w-4" />
                  </span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground transition group-hover:translate-x-1 group-hover:text-primary" />
                </div>
                <h4 className="text-sm font-semibold">{action.title}</h4>
                <p className="mt-1 min-h-10 text-xs leading-5 text-muted-foreground">
                  {action.description}
                </p>
                <span className="mt-3 inline-flex text-xs font-medium text-primary">
                  {action.label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>

      {recentListings.slice(0, 2).map((listing) => (
        <div
          key={listing.id}
          className="rounded-md border border-border bg-secondary/60 p-4 opacity-80"
        >
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-semibold">{listing.title}</h3>
                <RiskBadge status={listing.status} />
                <span className="rounded-full border border-border bg-secondary px-2.5 py-1 text-xs text-muted-foreground">
                  示例
                </span>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                {listing.district} · {listing.area} · {listing.commute}
              </p>
            </div>
            <Button asChild variant="secondary" size="sm">
              <Link href="/report/demo">查看示例</Link>
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}

function HistoryMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-card p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-semibold">{value}</p>
    </div>
  );
}

