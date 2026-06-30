import type {
  LifeDataQualitySignal,
  LifePoiCategoryEvidence,
  LifeRadiusInput,
} from "@/lib/life-radius";
import { getProviderUsageState, recordApiUsage } from "@/lib/server/api-usage";

type AmapGeoResult = {
  formatted_address?: string;
  location?: string;
};

type AmapPoi = {
  name?: string;
  distance?: string;
};

type PoiQuery = {
  key: keyof Pick<
    LifeRadiusInput,
    | "groceryMinutes"
    | "restaurantCount"
    | "pharmacyMinutes"
    | "hospitalMinutes"
    | "parcelMinutes"
    | "laundryMinutes"
    | "gymMinutes"
    | "parkMinutes"
  >;
  label: string;
  keywords: string;
};

const poiQueries: PoiQuery[] = [
  { key: "groceryMinutes", label: "买菜超市", keywords: "超市|菜市场|生鲜" },
  { key: "restaurantCount", label: "餐饮补给", keywords: "餐饮" },
  { key: "pharmacyMinutes", label: "药店", keywords: "药店" },
  { key: "hospitalMinutes", label: "医疗", keywords: "医院|社区卫生服务中心|诊所" },
  { key: "parcelMinutes", label: "快递", keywords: "快递|菜鸟驿站|快递柜" },
  { key: "laundryMinutes", label: "洗衣维修", keywords: "洗衣|干洗|维修" },
  { key: "gymMinutes", label: "运动健身", keywords: "健身|运动" },
  { key: "parkMinutes", label: "公园散步", keywords: "公园" },
];

function env(name: string) {
  return process.env[name]?.trim();
}

async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

function walkMinutes(distanceMeters?: number) {
  if (!distanceMeters || !Number.isFinite(distanceMeters)) return undefined;
  return Math.max(1, Math.round(distanceMeters / 75));
}

async function geocode(address?: string, city?: string) {
  const key = env("AMAP_WEB_SERVICE_KEY");
  if (!key || !address) return undefined;

  const url = new URL("https://restapi.amap.com/v3/geocode/geo");
  url.searchParams.set("key", key);
  url.searchParams.set("address", address);
  if (city) url.searchParams.set("city", city);
  url.searchParams.set("output", "json");

  const data = await fetchJson<{ status: string; geocodes?: AmapGeoResult[] }>(url.toString());

  recordApiUsage({
    provider: "amap",
    endpoint: "geocode/geo",
    feature: "life_radius_geocode",
    success: data?.status === "1",
  });

  const first = data?.geocodes?.[0];
  if (!first?.location) return undefined;

  return {
    formattedAddress: first.formatted_address,
    location: first.location,
  };
}

async function searchAround(location: string, query: PoiQuery) {
  const key = env("AMAP_WEB_SERVICE_KEY");
  if (!key) return undefined;

  const url = new URL("https://restapi.amap.com/v3/place/around");
  url.searchParams.set("key", key);
  url.searchParams.set("location", location);
  url.searchParams.set("keywords", query.keywords);
  url.searchParams.set("radius", "1500");
  url.searchParams.set("offset", "20");
  url.searchParams.set("page", "1");
  url.searchParams.set("extensions", "base");
  url.searchParams.set("output", "json");

  const data = await fetchJson<{
    status: string;
    count?: string;
    pois?: AmapPoi[];
  }>(url.toString());

  recordApiUsage({
    provider: "amap",
    endpoint: "place/around",
    feature: `life_radius_${query.key}`,
    success: data?.status === "1",
  });

  if (data?.status !== "1") return undefined;

  const pois = Array.isArray(data.pois) ? data.pois : [];
  const nearest = pois
    .map((poi) => ({
      name: poi.name,
      distance: Number(poi.distance),
    }))
    .filter((poi) => Number.isFinite(poi.distance))
    .sort((a, b) => a.distance - b.distance)[0];

  return {
    label: query.label,
    count: Number(data.count) || pois.length,
    nearestName: nearest?.name,
    nearestMeters: nearest?.distance,
    nearestMinutes: walkMinutes(nearest?.distance),
  };
}

function manualResult(input: LifeRadiusInput, detail: string): LifeRadiusInput {
  return {
    ...input,
    dataQuality: [
      {
        provider: "amap",
        feature: "生活配套",
        status: "fallback",
        label: "按已填写信息判断",
        detail,
      },
    ],
    poiEvidence: {
      source: "manual",
      label: "手动生活配套参数",
      detail,
      locationLabel: input.listingTitle?.trim(),
    },
  };
}

export async function enhanceLifeRadiusWithAmap(input: LifeRadiusInput): Promise<LifeRadiusInput> {
  const dataQuality: LifeDataQualitySignal[] = [];
  const addSignal = (signal: LifeDataQualitySignal) => dataQuality.push(signal);
  const amapEnabled = input.dataSourceSettings?.amapDataEnabled !== false;
  const key = env("AMAP_WEB_SERVICE_KEY");
  const usageState = key ? getProviderUsageState("amap") : undefined;
  const listingTitle = input.listingTitle?.trim();

  if (!amapEnabled) {
    return manualResult(input, "本次先按你填写的配套距离判断。看房时请再确认买菜、医疗、快递、夜间路线和噪音。");
  }

  if (!key) {
    return manualResult(input, "本次先按你填写的配套距离判断。看房时请再确认买菜、医疗、快递、夜间路线和噪音。");
  }

  if (!usageState?.canCall) {
    return manualResult(
      input,
      usageState?.reason ?? "实时周边查询暂时跳过，本次按你手动输入的配套距离判断。",
    );
  }

  if (!listingTitle) {
    return manualResult(input, "请填写候选房源的小区名、地址或地标，才能查询周边生活信息。");
  }

  const location = await geocode(listingTitle, input.city);
  addSignal({
    provider: "amap",
    feature: "房源位置解析",
    status: location ? "live" : "failed",
    label: location ? "位置解析" : "位置解析失败",
    detail: location
      ? `已解析到 ${location.formattedAddress ?? listingTitle} 附近。`
      : "实时地图未返回可用坐标，请补充更具体的小区、门牌或地标。",
  });

  if (!location?.location) {
    return {
      ...input,
      dataQuality,
      poiEvidence: {
        source: "manual",
        label: "手动生活配套参数",
        detail: "房源位置未解析成功，已回落到手动参数。",
        locationLabel: listingTitle,
      },
    };
  }

  const poiResults = await Promise.all(
    poiQueries.map(async (query) => [query, await searchAround(location.location, query)] as const),
  );

  const categories: LifePoiCategoryEvidence[] = poiResults
    .filter((entry): entry is readonly [PoiQuery, NonNullable<Awaited<ReturnType<typeof searchAround>>>] =>
      Boolean(entry[1]),
    )
    .map(([, result]) => ({
      label: result.label,
      count: result.count,
      nearestMinutes: result.nearestMinutes,
      nearestName: result.nearestName,
    }));

  const hasAnyPoi = categories.some((item) => item.count > 0);
  addSignal({
    provider: "amap",
    feature: "周边生活信息",
    status: hasAnyPoi ? "live" : "fallback",
    label: hasAnyPoi ? "周边生活查询" : "周边生活信息未返回",
    detail: hasAnyPoi
      ? "已查询买菜、餐饮、药店、医疗、快递、洗衣、运动和公园等周边生活点；仍需现场确认步行路线和营业时间。"
      : "没有返回可用周边生活信息，本次继续按已填写信息判断。",
  });

  if (!hasAnyPoi) {
    return {
      ...input,
      dataQuality,
      poiEvidence: {
        source: "manual",
        label: "按已填写信息判断",
        detail: "周边生活信息未返回可用结果，已按你填写的配套距离判断。",
        locationLabel: location.formattedAddress ?? listingTitle,
      },
    };
  }

  const byLabel = new Map(categories.map((item) => [item.label, item]));
  const minutesFor = (label: string, fallback?: number) =>
    byLabel.get(label)?.nearestMinutes ?? fallback;
  const countFor = (label: string, fallback?: number) => byLabel.get(label)?.count ?? fallback;

  const lateFoodCount =
    (countFor("餐饮补给", 0) ?? 0) + (countFor("买菜超市", 0) ?? 0);

  return {
    ...input,
    groceryMinutes: minutesFor("买菜超市", input.groceryMinutes),
    restaurantCount: Math.min(20, countFor("餐饮补给", input.restaurantCount) ?? 0),
    pharmacyMinutes: minutesFor("药店", input.pharmacyMinutes),
    hospitalMinutes: minutesFor("医疗", input.hospitalMinutes),
    parcelMinutes: minutesFor("快递", input.parcelMinutes),
    laundryMinutes: minutesFor("洗衣维修", input.laundryMinutes),
    gymMinutes: minutesFor("运动健身", input.gymMinutes),
    parkMinutes: minutesFor("公园散步", input.parkMinutes),
    lateFoodAvailable: lateFoodCount >= 4 ? true : input.lateFoodAvailable,
    dataQuality,
    poiEvidence: {
      source: "amap",
      label: "周边生活信息",
      detail: `本次以 ${location.formattedAddress ?? listingTitle} 周边 1.5 公里生活点辅助判断；现场仍要确认营业时间、夜间照明和实际步行路线。`,
      locationLabel: location.formattedAddress ?? listingTitle,
      categories,
    },
  };
}
