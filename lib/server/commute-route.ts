import type {
  CommuteCostInput,
  CommuteDataQualitySignal,
  CommuteRouteEvidence,
} from "@/lib/commute-cost";
import { getProviderUsageState, recordApiUsage } from "@/lib/server/api-usage";

type AmapGeoResult = {
  formatted_address?: string;
  location?: string;
  citycode?: string;
};

type AmapRouteContext = {
  formattedAddress?: string;
  location: string;
  citycode?: string;
};

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

async function geocode(address?: string, city?: string): Promise<AmapRouteContext | undefined> {
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
    feature: "commute_page_geocode",
    success: data?.status === "1",
  });

  const first = data?.geocodes?.[0];
  if (!first?.location) return undefined;

  return {
    formattedAddress: first.formatted_address,
    location: first.location,
    citycode: first.citycode,
  };
}

async function transitRoute(origin?: string, destination?: string, city?: string) {
  const key = env("AMAP_WEB_SERVICE_KEY");
  if (!key || !origin || !destination || !city) return undefined;

  const url = new URL("https://restapi.amap.com/v3/direction/transit/integrated");
  url.searchParams.set("key", key);
  url.searchParams.set("origin", origin);
  url.searchParams.set("destination", destination);
  url.searchParams.set("city", city);
  url.searchParams.set("output", "json");
  url.searchParams.set("strategy", "0");

  const data = await fetchJson<{
    status: string;
    route?: {
      transits?: Array<{
        duration?: string;
        walking_distance?: string;
        cost?: string;
        segments?: unknown[];
      }>;
    };
  }>(url.toString());

  recordApiUsage({
    provider: "amap",
    endpoint: "direction/transit/integrated",
    feature: "commute_page_route",
    success: data?.status === "1",
  });

  const first = data?.route?.transits?.[0];
  if (!first) return undefined;

  const durationSeconds = Number(first.duration);
  const walkingDistanceMeters = Number(first.walking_distance);
  const cost = Number(first.cost);
  const segmentCount = first.segments?.length;

  return {
    durationMinutes: Number.isFinite(durationSeconds)
      ? Math.max(1, Math.round(durationSeconds / 60))
      : undefined,
    walkingDistanceMeters: Number.isFinite(walkingDistanceMeters)
      ? walkingDistanceMeters
      : undefined,
    transferCount:
      typeof segmentCount === "number" ? Math.max(0, Math.min(6, segmentCount - 1)) : undefined,
    transitFareOneWay: Number.isFinite(cost) ? cost : undefined,
  };
}

function manualEvidence(input: CommuteCostInput, detail: string): CommuteRouteEvidence {
  return {
    source: "manual",
    label: "手动通勤参数",
    detail,
    origin: input.listingTitle?.trim(),
    destination: input.workplace?.trim(),
    durationMinutes: input.oneWayMinutes,
    transferCount: input.transferCount,
    transitFareOneWay: input.transitFareOneWay,
  };
}

export async function enhanceCommuteInputWithAmap(
  input: CommuteCostInput,
): Promise<CommuteCostInput> {
  const dataQuality: CommuteDataQualitySignal[] = [];
  const addSignal = (signal: CommuteDataQualitySignal) => dataQuality.push(signal);

  const amapEnabled = input.dataSourceSettings?.amapDataEnabled !== false;
  const key = env("AMAP_WEB_SERVICE_KEY");
  const usageState = key ? getProviderUsageState("amap") : undefined;
  const originQuery = input.listingTitle?.trim();
  const destinationQuery = input.workplace?.trim();

  if (!amapEnabled) {
    addSignal({
      provider: "amap",
      feature: "通勤路线",
      status: "fallback",
      label: "高德路线已关闭",
      detail: "设置页已关闭地图实时数据，本次只按你手动输入的通勤参数折算。",
    });
    return {
      ...input,
      dataQuality,
      routeEvidence: manualEvidence(input, "设置页关闭了地图实时数据。"),
    };
  }

  if (!key) {
    addSignal({
      provider: "amap",
      feature: "通勤路线",
      status: "fallback",
      label: "实时路线暂不可用",
      detail: "本次只按你手动输入的通勤时间、步行和换乘情况折算。",
    });
    return {
      ...input,
      dataQuality,
      routeEvidence: manualEvidence(input, "实时路线暂不可用，本次按手动通勤信息判断。"),
    };
  }

  if (!usageState?.canCall) {
    addSignal({
      provider: "amap",
      feature: "通勤路线",
      status: "skipped_limit",
      label: "高德额度保护",
      detail:
        usageState?.reason ??
        "高德产品侧用量已接近提醒线，本次不再调用实时路线，改用手动输入。",
    });
    return {
      ...input,
      dataQuality,
      routeEvidence: manualEvidence(input, "高德额度保护触发，本次没有调用实时路线。"),
    };
  }

  if (!originQuery || !destinationQuery) {
    addSignal({
      provider: "amap",
      feature: "通勤路线",
      status: "missing_input",
      label: "缺少路线起终点",
      detail: "请填写候选房源的小区名/地址和工作地点，才能调用高德路线增强。",
    });
    return {
      ...input,
      dataQuality,
      routeEvidence: manualEvidence(input, "缺少房源地址或工作地点，无法调用实时路线。"),
    };
  }

  const [origin, destination] = await Promise.all([
    geocode(originQuery, input.city),
    geocode(destinationQuery, input.city),
  ]);

  addSignal({
    provider: "amap",
    feature: "起终点解析",
    status: origin && destination ? "live" : "failed",
    label: origin && destination ? "高德起终点解析" : "起终点解析失败",
    detail:
      origin && destination
        ? `已解析房源 ${origin.formattedAddress ?? originQuery}，工作地 ${
            destination.formattedAddress ?? destinationQuery
          }。`
        : "高德没有返回可用坐标，请补充更具体的小区、门牌、地标或写字楼名称。",
  });

  const route =
    origin && destination
      ? await transitRoute(
          origin.location,
          destination.location,
          input.city || origin.citycode || destination.citycode,
        )
      : undefined;

  if (!route?.durationMinutes) {
    addSignal({
      provider: "amap",
      feature: "公交地铁路线",
      status: "fallback",
      label: "实时路线未返回",
      detail: "高德没有返回可用公交/地铁路线，本次继续使用手动输入的通勤分钟和换乘信息。",
    });
    return {
      ...input,
      dataQuality,
      routeEvidence: manualEvidence(input, "高德路线未返回可用结果，已回落到手动参数。"),
    };
  }

  const walkMinutes =
    route.walkingDistanceMeters !== undefined
      ? Math.max(1, Math.round(route.walkingDistanceMeters / 75))
      : input.walkMinutes;

  addSignal({
    provider: "amap",
    feature: "公交地铁路线",
    status: "live",
    label: "高德实时路线",
    detail: `已按高德公交/地铁路线更新单程 ${route.durationMinutes} 分钟、步行约 ${
      route.walkingDistanceMeters ? Math.round(route.walkingDistanceMeters) : "-"
    } 米、换乘 ${route.transferCount ?? input.transferCount ?? "-"} 次。`,
  });

  return {
    ...input,
    oneWayMinutes: route.durationMinutes,
    walkMinutes,
    transferCount: route.transferCount ?? input.transferCount,
    transitFareOneWay: route.transitFareOneWay ?? input.transitFareOneWay,
    dataQuality,
    routeEvidence: {
      source: "amap",
      label: "高德实时路线",
      detail: `本次优先采用高德公交/地铁路线；仍建议在早高峰、晚高峰和晚归场景实测一次。`,
      origin: origin?.formattedAddress ?? originQuery,
      destination: destination?.formattedAddress ?? destinationQuery,
      durationMinutes: route.durationMinutes,
      walkingDistanceMeters: route.walkingDistanceMeters,
      transferCount: route.transferCount,
      transitFareOneWay: route.transitFareOneWay,
    },
  };
}
