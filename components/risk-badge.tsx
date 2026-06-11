import { Badge } from "@/components/ui/badge";
import type { ReportStatus } from "@/lib/mock-data";

const statusMap: Record<
  ReportStatus,
  { label: string; variant: "success" | "warning" | "destructive" }
> = {
  recommend: { label: "建议租", variant: "success" },
  caution: { label: "谨慎考虑", variant: "warning" },
  reject: { label: "不建议租", variant: "destructive" },
};

const genericLabels: Record<ReportStatus, string> = {
  recommend: "推荐",
  caution: "谨慎",
  reject: "不建议",
};

export function RiskBadge({
  status,
  tone = "rent",
}: {
  status: ReportStatus;
  tone?: "rent" | "generic";
}) {
  const item = statusMap[status];

  return <Badge variant={item.variant}>{tone === "generic" ? genericLabels[status] : item.label}</Badge>;
}
