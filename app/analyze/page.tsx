import { ListingForm } from "@/components/listing-form";
import { AppShell } from "@/components/app-shell";
import type { ListingFormInitialInput } from "@/components/listing-form";
import { SearchCheck } from "lucide-react";
import { ProductPageHeader } from "@/components/product-page-header";
import { StartHandoffBanner } from "@/components/start-handoff-banner";

type SearchParams = Record<string, string | string[] | undefined>;

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function sourceLabelFrom(from?: string) {
  if (from === "area") return "来自片区筛选";
  if (from === "city") return "来自生活成本";
  if (from === "commute") return "来自通勤真实成本";
  if (from === "life") return "来自生活配套确认";
  if (from === "case") return "来自房源记录";
  if (from === "onboarding") return "来自首访偏好";
  if (from === "compare") return "来自多房源对比";
  if (from === "home") return "来自首页输入";
  if (from === "dashboard") return "来自工作台输入";
  if (from === "plan") return "来自当前行动";
  return undefined;
}

function seedFromParams(params: SearchParams): ListingFormInitialInput {
  const from = firstParam(params.from);

  return {
    source: from,
    sourceLabel: sourceLabelFrom(from),
    sourceReportId: firstParam(params.reportId),
    reportContext: firstParam(params.reportContext),
    title: firstParam(params.title) || firstParam(params.listingTitle),
    rent: firstParam(params.rent) || firstParam(params.monthlyRent) || firstParam(params.currentRent),
    area: firstParam(params.area),
    floor: firstParam(params.floor),
    address: firstParam(params.address),
    description: firstParam(params.description),
    city: firstParam(params.city),
    income:
      firstParam(params.income) ||
      firstParam(params.monthlyIncome) ||
      firstParam(params.householdIncome),
    workplace: firstParam(params.workplace),
    budget: firstParam(params.budget),
    commuteLimit: firstParam(params.commuteLimit),
    fixedCost: firstParam(params.fixedCost),
  };
}

export default async function AnalyzePage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const params = (await searchParams) ?? {};
  const initialInput = seedFromParams(params);

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-7xl min-w-0 space-y-8 overflow-x-hidden">
        <ProductPageHeader
          eyebrow="房源体检"
          title="房源体检"
          description="综合月租、位置、工作地、通勤、生活配套和签约付款条件，判断是否继续看房或进入付款确认。"
          icon={SearchCheck}
        />
        <StartHandoffBanner handoff={firstParam(params.handoff)} />
        <section id="listing-evaluation-form" className="scroll-mt-24">
          <ListingForm initialInput={initialInput} />
        </section>
      </div>
    </AppShell>
  );
}
