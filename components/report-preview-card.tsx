import {
  AlertTriangle,
  Archive,
  ArrowRight,
  ArrowUpRight,
  Clock,
  MapPin,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { RiskBadge } from "@/components/risk-badge";
import { demoReport } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

type ReportPreviewCardProps = {
  className?: string;
  compact?: boolean;
  showActions?: boolean;
  variant?: "default" | "hero";
};

export function ReportPreviewCard({
  className,
  compact = false,
  showActions = true,
  variant = "default",
}: ReportPreviewCardProps) {
  const isHero = variant === "hero";

  return (
    <div
      className={cn(
        isHero
          ? "rounded-lg border border-border bg-card/88 p-4 text-foreground shadow-[0_24px_80px_oklch(var(--foreground)/0.10)] backdrop-blur-xl"
          : "glass-card rounded-lg p-5 sm:p-6",
        className,
      )}
    >
      <div className={cn("flex items-start justify-between gap-4", compact ? "mb-4" : "mb-6")}>
        <div>
          <p
            className={cn(
              "mb-2 text-xs",
              isHero ? "text-muted-foreground" : "text-primary/80",
            )}
          >
            报告预览
          </p>
          <h3 className={cn("font-semibold", compact ? "text-lg" : "text-xl")}>
            {compact ? "样例评估摘要" : demoReport.title}
          </h3>
          <p
            className={cn(
              "mt-2 text-sm leading-6",
              isHero ? "text-muted-foreground" : "text-muted-foreground",
              compact && "line-clamp-2",
            )}
          >
            {demoReport.address}
          </p>
        </div>
        <RiskBadge status={demoReport.status} />
      </div>

      <div
        className={cn(
          "rounded-md border p-4",
          compact ? "mb-4" : "mb-6",
          isHero ? "border-border bg-secondary/70" : "border-border bg-secondary",
        )}
      >
        <div className="mb-3 flex items-end justify-between">
          <div>
            <p className={cn("text-sm", isHero ? "text-muted-foreground" : "text-muted-foreground")}>
              综合评分
            </p>
            <p className={cn("font-semibold tracking-normal", compact ? "text-4xl" : "text-5xl")}>
              {demoReport.score}
            </p>
          </div>
          <p className="pb-1 text-sm text-amber-700">谨慎考虑</p>
        </div>
        <Progress value={demoReport.score} />
      </div>

      <div className={cn(compact ? "space-y-2" : "space-y-3")}>
        {[
          {
            icon: Clock,
            label: "通勤",
            value: "38 分钟 · 换乘压力中等",
          },
          {
            icon: MapPin,
            label: "配套",
            value: "餐饮丰富 · 大型商超稍远",
          },
          {
            icon: AlertTriangle,
            label: "风险",
            value: "采光、噪音、转租授权需确认",
          },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.label}
              className={cn(
                "flex items-center justify-between gap-4 rounded-md border px-4 py-3",
                isHero ? "border-border bg-secondary/70" : "border-border bg-secondary/70",
              )}
            >
              <div className="flex items-center gap-3">
                <Icon className={cn("h-4 w-4", isHero ? "text-primary" : "text-primary")} />
                <span className={cn("text-sm", isHero ? "text-muted-foreground" : "text-muted-foreground")}>
                  {item.label}
                </span>
              </div>
              <span className="text-right text-sm">{item.value}</span>
            </div>
          );
        })}
      </div>

      {showActions ? (
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Button asChild className="flex-1">
            <Link href="/report/demo">
              查看完整示例
              <ArrowUpRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="secondary" className="flex-1">
            <Link href="/analyze">
              <ShieldCheck className="mr-2 h-4 w-4" />
              开始评估
            </Link>
          </Button>
        </div>
      ) : (
        <Link
          href="/case"
          className={cn(
            "mt-3 flex items-center justify-between rounded-md border px-3 py-2 text-xs transition",
            isHero
              ? "border-border bg-secondary/70 text-muted-foreground hover:border-primary/35 hover:bg-card hover:text-foreground"
              : "border-border bg-secondary text-muted-foreground hover:bg-secondary/80 hover:text-foreground",
          )}
        >
          <span className="inline-flex items-center gap-2">
            <Archive className={cn("h-3.5 w-3.5", isHero ? "text-primary" : "text-primary")} />
            报告会保存为房源记录
          </span>
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      )}
    </div>
  );
}

