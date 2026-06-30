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
      label: "按手动通勤信息估算",
      detail: "本次先按你填写的通勤时间、步行、换乘和票价估算。确定房源前，请再用实际路线确认一次。",
    });
    return {
      ...input,
      dataQuality,
      routeEvidence: manualEvidence(input, "本次先按手动通勤信息估算。"),
    };
  }

  if (!key) {
    addSignal({
      provider: "amap",
      feature: "通勤路线",
      status: "fallback",
      label: "按手动通勤信息估算",
      detail: "本次先按你填写的通勤时间、步行和换乘情况估算。",
    });
    return {
      ...input,
      dataQuality,
      routeEvidence: manualEvidence(input, "本次先按手动通勤信息估算。"),
    };
  }

  if (!usageState?.canCall) {
    addSignal({
      provider: "amap",
      feature: "通勤路线",
      status: "skipped_limit",
      label: "按手动通勤信息估算",
      detail:
        usageState?.reason?.replaceAll("调用", "使用") ??
        "本次先按你填写的通勤信息估算。",
    });
    return {
      ...input,
      dataQuality,
      routeEvidence: manualEvidence(input, "本次先按手动通勤信息估算。"),
    };
  }

  if (!originQuery || !destinationQuery) {
    addSignal({
      provider: "amap",
      feature: "通勤路线",
      status: "missing_input",
      label: "缺少路线起终点",
      detail: "请填写候选房源的小区名或地址，以及工作地点。信息越具体，通勤判断越接近真实情况。",
    });
    return {
      ...input,
      dataQuality,
      routeEvidence: manualEvidence(input, "缺少房源地址或工作地点，本次先按已有信息估算。"),
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
    label: origin && destination ? "起终点解析" : "起终点解析失败",
    detail:
      origin && destination
        ? `已解析房源 ${origin.formattedAddress ?? originQuery}，工作地 ${
            destination.formattedAddress ?? destinationQuery
          }。`
        : "实时地图没有返回可用坐标，请补充更具体的小区、门牌、地标或写字楼名称。",
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
      label: "按手动通勤信息估算",
      detail: "未获得可用公交/地铁路线，本次继续使用你填写的通勤分钟和换乘信息。",
    });
    return {
      ...input,
      dataQuality,
      routeEvidence: manualEvidence(input, "本次先按手动通勤信息估算。"),
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
    label: "实时公交/地铁路线",
    detail: `已按实时公交/地铁路线更新单程 ${route.durationMinutes} 分钟、步行约 ${
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
      label: "实时公交/地铁路线",
      detail: `本次优先采用实时公交/地铁路线；仍建议在早高峰、晚高峰和晚归场景实测一次。`,
      origin: origin?.formattedAddress ?? originQuery,
      destination: destination?.formattedAddress ?? destinationQuery,
      durationMinutes: route.durationMinutes,
      walkingDistanceMeters: route.walkingDistanceMeters,
      transferCount: route.transferCount,
      transitFareOneWay: route.transitFareOneWay,
    },
  };
}
