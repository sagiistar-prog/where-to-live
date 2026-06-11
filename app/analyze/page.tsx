import { ListingForm } from "@/components/listing-form";
import { AppShell } from "@/components/app-shell";
import type { ListingFormInitialInput } from "@/components/listing-form";
import {
  BriefcaseBusiness,
  GitCompareArrows,
  MapPinned,
  SearchCheck,
} from "lucide-react";
import { ProductPageHeader } from "@/components/product-page-header";

type SearchParams = Record<string, string | string[] | undefined>;

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function sourceLabelFrom(from?: string) {
  if (from === "area") return "来自片区筛选";
  if (from === "city") return "来自城市真实账本";
  if (from === "commute") return "来自通勤真实成本";
  if (from === "life") return "来自生活配套确认";
  if (from === "buy") return "来自买房压力";
  if (from === "case") return "来自房源记录";
  if (from === "onboarding") return "来自首访偏好";
  if (from === "compare") return "来自多房源对比";
  if (from === "home") return "来自首页输入";
  if (from === "dashboard") return "来自工作台输入";
  if (from === "plan") return "来自下一步";
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
      <div className="mx-auto max-w-7xl space-y-8">
        <ProductPageHeader
          eyebrow="房源评估"
          title="在真实生活场景里做判断"
          description="把候选房源放进日常预算、通勤时间、生活配套和签约付款条件里一起看，先判断还值不值得继续约看。"
          icon={SearchCheck}
          sideTitle="评估后继续确认"
          sideDescription="评估后会保存为房源记录，并继续连接看房清单、官方查询、付款前确认、合同确认和多房源对比。"
          facts={[
            { label: "评估对象", value: "你手上的具体候选房源" },
            { label: "重点判断", value: "真实成本、通勤、舒适度和签约风险" },
            { label: "你会得到", value: "继续看、补充信息或放弃" },
          ]}
          actions={[
            { label: "开始评估", href: "#listing-evaluation-form", icon: SearchCheck },
            { label: "先筛片区", href: "/area", icon: MapPinned, variant: "secondary" },
            { label: "查看房源记录", href: "/case", icon: BriefcaseBusiness, variant: "secondary" },
            { label: "多房源对比", href: "/compare", icon: GitCompareArrows, variant: "secondary" },
          ]}
        />
        <section id="listing-evaluation-form" className="scroll-mt-24">
          <ListingForm initialInput={initialInput} />
        </section>
      </div>
    </AppShell>
  );
}
