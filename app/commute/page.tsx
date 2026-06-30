import { Route } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { CommuteCostPanel } from "@/components/commute-cost-panel";
import { ProductPageHeader } from "@/components/product-page-header";
import { StartHandoffBanner } from "@/components/start-handoff-banner";
import { buildFlowHref } from "@/lib/flow-links";

type SearchParams = Record<string, string | string[] | undefined>;

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function seedFromParams(params: SearchParams) {
  const from = firstParam(params.from);

  return {
    city: firstParam(params.city),
    listingTitle: firstParam(params.listingTitle) || firstParam(params.title),
    workplace: firstParam(params.workplace),
    monthlyIncome: firstParam(params.monthlyIncome),
    monthlyRent: firstParam(params.monthlyRent) || firstParam(params.budget),
    oneWayMinutes: firstParam(params.oneWayMinutes),
    commuteLimitMinutes: firstParam(params.commuteLimitMinutes) || firstParam(params.commuteLimit),
    reportContext: firstParam(params.reportContext),
    sourceLabel:
      from === "area"
        ? "来自片区筛选"
        : from === "analyze" || from === "report"
          ? "来自房源体检"
        : from === "case"
          ? "来自房源记录"
          : from === "plan"
            ? "来自当前行动"
            : from === "home"
              ? "来自首页输入"
              : from === "dashboard"
                ? "来自工作台输入"
                : undefined,
  };
}

export default async function CommutePage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const params = (await searchParams) ?? {};
  const reportId = firstParam(params.reportId);
  const initialInput = seedFromParams(params);
  const areaHref = buildFlowHref("/area", {
    from: "commute",
    reportId,
    city: initialInput.city,
    workplace: initialInput.workplace,
    budget: initialInput.monthlyRent,
    commuteLimit: initialInput.commuteLimitMinutes,
    reportContext: initialInput.reportContext,
  });
  const compareHref = buildFlowHref("/compare", {
    from: "commute",
    reportId,
    currentTitle: initialInput.listingTitle,
    reportContext: initialInput.reportContext,
  });

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-7xl min-w-0 space-y-8 overflow-x-hidden">
        <ProductPageHeader
          eyebrow="通勤成本"
          title="通勤真实成本"
          description="通勤成本要看步行、换乘、晚归打车、天气和时间消耗，判断低房租是否降低了整体居住成本。"
          icon={Route}
          actions={[
            { label: "筛选通勤片区", href: areaHref, variant: "secondary" },
            { label: "对比多个房源", href: compareHref, variant: "secondary" },
          ]}
        />

        <StartHandoffBanner handoff={firstParam(params.handoff)} />

        <CommuteCostPanel reportId={reportId} initialInput={initialInput} />
      </div>
    </AppShell>
  );
}
