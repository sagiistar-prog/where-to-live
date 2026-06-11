import Link from "next/link";
import { ArrowRight, Home, Map, MapPin, TrainFront } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { AreaOptionCard } from "@/components/area-option-card";
import { AreaScreenPanel } from "@/components/area-screen-panel";
import { ProductPageHeader } from "@/components/product-page-header";
import { Button } from "@/components/ui/button";
import { buildFlowHref } from "@/lib/flow-links";
import { areaOptions } from "@/lib/mock-data";
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
      ? "来自城市真实账本"
      : from === "buy"
        ? "来自买房压力"
        : from === "report" || from === "analyze"
          ? "来自房源评估"
          : from === "case"
            ? "来自房源记录"
            : from === "home"
              ? "来自首页输入"
              : from === "plan"
                ? "来自下一步"
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
  const commuteHref = buildFlowHref("/commute", {
    from: "area",
    reportId,
    city: initialInput.city,
    workplace: initialInput.workplace,
    budget: initialInput.budget,
    commuteLimit: initialInput.commuteLimit,
    reportContext: initialInput.reportContext,
  });
  const lifeHref = buildFlowHref("/life", {
    from: "area",
    reportId,
    city: initialInput.city,
    listingTitle: initialInput.candidateAreas,
    notes: initialInput.reportContext,
    reportContext: initialInput.reportContext,
  });
  const analyzeHref = buildFlowHref("/analyze", {
    from: "area",
    reportId,
    city: initialInput.city,
    workplace: initialInput.workplace,
    budget: initialInput.budget,
    commuteLimit: initialInput.commuteLimit,
    reportContext: initialInput.reportContext,
  });

  return (
    <AppShell>
      <div className="mx-auto max-w-7xl space-y-8">
        <ProductPageHeader
          eyebrow="片区与通勤"
          title="先筛片区，再决定要不要去看房"
          description="片区选错，会直接影响通勤、预算和日常便利。先算清通勤、租金、生活配套和长期居住风险，再决定是否安排看房。"
          icon={Map}
          sideTitle="片区怎么判断"
          sideDescription="片区适配要同时看通勤稳定性、真实租金、生活配套、夜间路线和房屋质量风险。地址越明确，路线和周边生活信息越有参考价值。"
          facts={[
            { label: "第一步", value: "排除通勤超限或租金不稳的片区" },
            { label: "第二步", value: "把生活配套和夜间路线一起看" },
            { label: "第三步", value: "只对值得继续的片区安排看房" },
          ]}
          actions={[
            { label: "测通勤成本", href: commuteHref, icon: TrainFront },
            { label: "确认生活配套", href: lifeHref, icon: MapPin, variant: "secondary" },
            { label: "评估候选房源", href: analyzeHref, icon: Home, variant: "secondary" },
          ]}
        />

        <AreaScreenPanel reportId={reportId} initialInput={initialInput} />

        <section>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold">片区样例</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                初筛通过后，再进入具体房源评估，避免把时间浪费在不适合长期居住的区域。
              </p>
            </div>
            <Button asChild variant="outline">
              <Link href={analyzeHref}>
                进入房源评估
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            {areaOptions.map((area) => (
              <AreaOptionCard key={area.name} area={area} reportId={reportId} />
            ))}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
