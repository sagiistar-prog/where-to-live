import { Map } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { AreaScreenPanel } from "@/components/area-screen-panel";
import { ProductPageHeader } from "@/components/product-page-header";
import { StartHandoffBanner } from "@/components/start-handoff-banner";
import type { AreaScreenInput } from "@/lib/area-fit";

type SearchParams = Record<string, string | string[] | undefined>;

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function seedFromParams(params: SearchParams): Partial<AreaScreenInput> & {
  sourceLabel?: string;
  reportContext?: string;
  autoGenerate?: boolean;
} {
  const from = firstParam(params.from);
  const sourceLabel =
    from === "city"
      ? "来自生活成本"
      : from === "report" || from === "analyze"
        ? "来自房源体检"
        : from === "case"
          ? "来自房源记录"
          : from === "home"
            ? "来自首页输入"
            : from === "plan"
              ? "来自当前行动"
              : from === "dashboard"
                ? "来自工作台输入"
                : undefined;

  return {
    city: firstParam(params.city),
    workplace: firstParam(params.workplace),
    budget: firstParam(params.budget),
    commuteLimit: firstParam(params.commuteLimit),
    candidateAreas: firstParam(params.candidateAreas),
    sourceLabel,
    reportContext: firstParam(params.reportContext),
    autoGenerate: Boolean(
      sourceLabel &&
        (firstParam(params.candidateAreas) ||
          firstParam(params.workplace) ||
          firstParam(params.reportContext)),
    ),
  };
}

export default async function AreaPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const params = (await searchParams) ?? {};
  const reportId = firstParam(params.reportId);
  const initialInput = seedFromParams(params);

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-7xl min-w-0 space-y-8 overflow-x-hidden">
        <ProductPageHeader
          eyebrow="片区与通勤"
          title="片区初筛"
          description="综合通勤、租金、生活配套和长期居住风险，判断候选片区是否值得继续看房。"
          icon={Map}
        />
        <StartHandoffBanner handoff={firstParam(params.handoff)} />

        <AreaScreenPanel reportId={reportId} initialInput={initialInput} />
      </div>
    </AppShell>
  );
}
