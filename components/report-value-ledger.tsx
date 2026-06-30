import Link from "next/link";
import { ArrowRight, Clock3, HandCoins, ReceiptText, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { ReportData } from "@/lib/mock-data";

type ReportValueLedgerProps = {
  report: ReportData;
  paymentHref: string;
  evidenceHref: string;
};

function extractNumbers(text: string) {
  return Array.from(text.matchAll(/\d{2,6}/g)).map((match) => Number(match[0]));
}

function inferRent(report: ReportData) {
  const text = [report.conclusion, ...report.livingCost.points].join(" ");
  const direct = text.match(/(?:房租|月租)\s*(\d{3,5})\s*元/);
  if (direct) return Number(direct[1]);

  const numbers = extractNumbers(text).filter((value) => value >= 1000 && value <= 50000);
  return numbers[0] ?? 0;
}

function inferTrueMonthlyCost(report: ReportData, rent: number) {
  if (rent <= 0) return 0;

  const text = report.livingCost.points.join(" ");
  const numbers = extractNumbers(text).filter((value) => value >= rent && value <= 50000);
  if (!numbers.length) return Math.round(rent * 1.18);
  return Math.max(...numbers);
}

function inferCommuteMinutes(report: ReportData) {
  const text = report.commute.points.join(" ");
  const range = text.match(/(\d{2,3})\s*-\s*(\d{2,3})\s*分钟/);
  if (range) return Math.round((Number(range[1]) + Number(range[2])) / 2);

  const single = text.match(/(\d{2,3})\s*分钟/);
  return single ? Number(single[1]) : 40;
}

function formatMoney(value: number) {
  return `${Math.round(value).toLocaleString("zh-CN")} 元`;
}

function formatMaybeMoney(value: number) {
  return value > 0 ? formatMoney(value) : "待确认";
}

function statusMultiplier(status: ReportData["status"]) {
  if (status === "reject") return 1.2;
  if (status === "caution") return 1;
  return 0.65;
}

export function ReportValueLedger({
  report,
  paymentHref,
  evidenceHref,
}: ReportValueLedgerProps) {
  const rent = inferRent(report);
  const trueMonthlyCost = inferTrueMonthlyCost(report, rent);
  const hiddenMonthlyCost = Math.max(trueMonthlyCost - rent, Math.round(rent * 0.08));
  const commuteMinutes = inferCommuteMinutes(report);
  const monthlyCommuteHours = Math.round((commuteMinutes * 2 * 22) / 60);
  const depositExposure = Math.round(rent * statusMultiplier(report.status));
  const prepayExposure = Math.round(depositExposure + Math.min(rent * 0.2, 1000));
  const hasRent = rent > 0;

  const items = [
    {
      icon: ReceiptText,
      label: "隐藏月成本",
      value: formatMaybeMoney(hasRent ? hiddenMonthlyCost : 0),
      detail: hasRent
        ? `真实月成本约 ${formatMoney(trueMonthlyCost)}，还要看通勤和固定开销。`
        : "补充月租、物业、水电、网费和固定支出后再判断。",
    },
    {
      icon: Clock3,
      label: "月通勤时间",
      value: `${monthlyCommuteHours} 小时`,
      detail: `按单程约 ${commuteMinutes} 分钟、每月 22 个工作日估算。`,
    },
    {
      icon: HandCoins,
      label: "付款风险敞口",
      value: formatMaybeMoney(prepayExposure),
      detail: hasRent
        ? "以定金和押金参考额估算，材料未确认前暂缓大额付款。"
        : "补充定金、押金或首笔付款金额后再判断。",
    },
    {
      icon: ShieldAlert,
      label: "押金争议风险",
      value: formatMaybeMoney(depositExposure),
      detail: hasRent
        ? "押金、维修、交割和提前退租条款没有确认时最容易变成损失。"
        : "补充押金金额、退款条件和维修责任后再判断。",
    },
  ];

  return (
    <Card className="p-6">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <p className="text-sm text-primary/80">
            关键成本与风险
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-normal">
            付款或签约前确认成本与风险
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-7 text-muted-foreground">
            把隐藏月成本、通勤时间、押金争议和付款风险放在一起，帮助你判断是否继续谈、是否需要补充材料。
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button asChild>
            <Link href={paymentHref}>
              进入付款咨询
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href={evidenceHref}>补充材料</Link>
          </Button>
        </div>
      </div>

      <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.label}
              className="min-w-0 rounded-md border border-border bg-secondary/45 p-4"
            >
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-md bg-primary/15 text-primary">
                <Icon className="h-5 w-5" />
              </div>
              <p className="text-sm text-muted-foreground">{item.label}</p>
              <p className="mt-1 text-2xl font-semibold">{item.value}</p>
              <p className="mt-3 text-xs leading-5 text-muted-foreground">
                {item.detail}
              </p>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
