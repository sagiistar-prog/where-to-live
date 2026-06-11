import { ClipboardCheck, MapPin, MapPinned, SearchCheck } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { LifeRadiusPanel } from "@/components/life-radius-panel";
import { ProductPageHeader } from "@/components/product-page-header";
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
    radiusMinutes: firstParam(params.radiusMinutes) || firstParam(params.lifeRadiusMinutes),
    groceryMinutes: firstParam(params.groceryMinutes),
    restaurantCount: firstParam(params.restaurantCount),
    pharmacyMinutes: firstParam(params.pharmacyMinutes),
    hospitalMinutes: firstParam(params.hospitalMinutes),
    parcelMinutes: firstParam(params.parcelMinutes),
    laundryMinutes: firstParam(params.laundryMinutes),
    gymMinutes: firstParam(params.gymMinutes),
    parkMinutes: firstParam(params.parkMinutes),
    noiseSources: firstParam(params.noiseSources),
    lifestyle: firstParam(params.lifestyle),
    notes: firstParam(params.notes),
    reportContext: firstParam(params.reportContext),
    sourceLabel:
      from === "area"
        ? "来自片区筛选"
        : from === "analyze" || from === "report"
          ? "来自房源评估"
          : from === "case"
            ? "来自房源记录"
            : from === "plan"
              ? "来自下一步"
              : from === "home"
                ? "来自首页输入"
                : from === "dashboard"
                  ? "来自工作台输入"
                  : undefined,
  };
}

export default async function LifePage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const params = (await searchParams) ?? {};
  const reportId = firstParam(params.reportId);
  const initialInput = seedFromParams(params);
  const areaHref = buildFlowHref("/area", {
    from: "life",
    reportId,
    city: initialInput.city,
    reportContext: initialInput.reportContext,
  });
  const visitHref = buildFlowHref("/visit", {
    from: "life",
    reportId,
    city: initialInput.city,
    listingTitle: initialInput.listingTitle,
    reportContext: initialInput.reportContext,
  });
  const analyzeHref = buildFlowHref("/analyze", {
    from: "life",
    reportId,
    city: initialInput.city,
    listingTitle: initialInput.listingTitle,
    reportContext: initialInput.reportContext,
  });

  return (
    <AppShell>
      <div className="mx-auto max-w-7xl space-y-8">
        <ProductPageHeader
          eyebrow="生活配套"
          title="看这套房的真实生活便利度"
          description="重点看工作日晚上、周末、生病、下雨和晚归时是否方便：买菜吃饭、药店医疗、快递外卖、夜间路线和休息空间。"
          icon={MapPin}
          sideTitle="先看日常是否顺手"
          sideDescription="地址足够明确时，会结合周边地图数据查看超市、药店、医疗、快递、运动和公园；地址还不清楚时，也可以先用你已知的信息判断。"
          facts={[
            { label: "工作日", value: "买菜、吃饭、快递、夜间路线" },
            { label: "突发情况", value: "药店、医疗、打车落点和维修" },
            { label: "长期居住", value: "噪音、气味、周末恢复和生活成本" },
          ]}
          actions={[
            { label: "先筛生活片区", href: areaHref, icon: MapPinned },
            { label: "整理看房清单", href: visitHref, icon: ClipboardCheck, variant: "secondary" },
            { label: "评估房源", href: analyzeHref, icon: SearchCheck, variant: "secondary" },
          ]}
        />

        <LifeRadiusPanel reportId={reportId} initialInput={initialInput} />
      </div>
    </AppShell>
  );
}
