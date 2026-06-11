import { SlidersHorizontal } from "lucide-react";

import { Badge } from "@/components/ui/badge";

export function ProfileDefaultNote({
  hasProfile,
  summary,
}: {
  hasProfile: boolean;
  summary: string;
}) {
  return (
    <div className="mb-5 flex flex-col gap-3 rounded-md border border-border bg-secondary/70 p-3 text-sm leading-6 text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-start gap-2">
        <SlidersHorizontal className="mt-1 h-4 w-4 shrink-0 text-primary" />
        <div className="min-w-0">
          <p className="font-medium text-foreground">
            {hasProfile ? "已带入你的居住偏好" : "当前使用常用居住偏好"}
          </p>
          <p className="mt-0.5">
            城市、工作地、预算和偏好会作为常用信息带入，提交前可以直接修改。
          </p>
        </div>
      </div>
      <Badge variant="outline" className="w-fit max-w-full whitespace-normal text-left">
        {summary}
      </Badge>
    </div>
  );
}
