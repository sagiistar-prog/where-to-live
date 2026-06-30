import { Badge } from "@/components/ui/badge";

export function ProfileDefaultNote({
  hasProfile,
  summary,
}: {
  hasProfile: boolean;
  summary: string;
}) {
  if (!hasProfile) {
    return null;
  }

  const shouldShowSummary = summary !== "未设置";

  return (
    <div className="mb-4 flex flex-col gap-2 rounded-md border border-border bg-secondary/45 px-3 py-2 text-xs leading-5 text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
      <p className="min-w-0">
        已带入常用信息，提交前可直接修改。
      </p>
      {shouldShowSummary ? (
        <Badge variant="outline" className="w-fit max-w-full whitespace-normal text-left">
          {summary}
        </Badge>
      ) : null}
    </div>
  );
}
