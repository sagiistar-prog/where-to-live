import { ClipboardCheck, MapPin, MapPinned, SearchCheck } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { LifeRadiusPanel } from "@/components/life-radius-panel";
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
      <div className="mx-auto w-full max-w-7xl min-w-0 space-y-8 overflow-x-hidden">
        <ProductPageHeader
          eyebrow="生活配套"
          title="生活便利度"
          description="核对买菜吃饭、药店医疗、快递外卖、夜间路线和休息空间，判断日常生活是否方便。"
          icon={MapPin}
          actions={[
            { label: "筛选生活片区", href: areaHref, icon: MapPinned },
            { label: "整理看房清单", href: visitHref, icon: ClipboardCheck, variant: "secondary" },
            { label: "房源体检", href: analyzeHref, icon: SearchCheck, variant: "secondary" },
          ]}
        />

        <StartHandoffBanner handoff={firstParam(params.handoff)} />

        <LifeRadiusPanel reportId={reportId} initialInput={initialInput} />
      </div>
    </AppShell>
  );
}
