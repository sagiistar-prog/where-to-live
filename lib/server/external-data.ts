import type { ExternalAnalysisContext, ListingAnalysisInput } from "@/lib/report-builder";
import { getProviderUsageState, recordApiUsage } from "@/lib/server/api-usage";

type DataQualitySignal = NonNullable<ExternalAnalysisContext["dataQuality"]>[number];

type AmapGeoResult = {
  formatted_address?: string;
  location?: string;
  adcode?: string;
  citycode?: string;
};

function env(name: string) {
  return process.env[name]?.trim();
}

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T | null> {
  try {
    const response = await fetch(url, { ...options, cache: "no-store" });
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

async function amapGeocode(address?: string, city?: string) {
  const key = env("AMAP_WEB_SERVICE_KEY");
  if (!key || !address) return undefined;

  const url = new URL("https://restapi.amap.com/v3/geocode/geo");
  url.searchParams.set("key", key);
  url.searchParams.set("address", address);
  if (city) url.searchParams.set("city", city);
  url.searchParams.set("output", "json");

  const data = await fetchJson<{
    status: string;
    geocodes?: AmapGeoResult[];
  }>(url.toString());

  recordApiUsage({
    provider: "amap",
    endpoint: "geocode/geo",
    feature: "address_geocode",
    success: data?.status === "1",
  });

  const first = data?.geocodes?.[0];
  if (!first?.location) return undefined;

  return {
    formattedAddress: first.formatted_address,
    location: first.location,
    adcode: first.adcode,
    citycode: first.citycode,
  };
}

async function amapTransit(origin?: string, destination?: string, city?: string) {
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
        segments?: unknown[];
      }>;
    };
  }>(url.toString());

  recordApiUsage({
    provider: "amap",
    endpoint: "direction/transit/integrated",
    feature: "commute_route",
    success: data?.status === "1",
  });

  const first = data?.route?.transits?.[0];
  if (!first) return undefined;

  const durationSeconds = Number(first.duration);
  return {
    durationMinutes: Number.isFinite(durationSeconds)
      ? Math.round(durationSeconds / 60)
      : undefined,
    walkingDistanceMeters: Number(first.walking_distance) || undefined,
    segments: first.segments?.length,
  summary: "高德公交/地铁路线规划估算",
  };
}

async function amapPoiAround(location?: string, keywords?: string) {
  const key = env("AMAP_WEB_SERVICE_KEY");
  if (!key || !location || !keywords) return undefined;

  const url = new URL("https://restapi.amap.com/v3/place/around");
  url.searchParams.set("key", key);
  url.searchParams.set("location", location);
  url.searchParams.set("keywords", keywords);
  url.searchParams.set("radius", "1500");
  url.searchParams.set("offset", "20");
  url.searchParams.set("page", "1");
  url.searchParams.set("output", "json");

  const data = await fetchJson<{ status: string; count?: string }>(url.toString());

  recordApiUsage({
    provider: "amap",
    endpoint: "place/around",
    feature: "nearby_poi",
    success: data?.status === "1",
  });

  return {
    count: Number(data?.count) || 0,
    ok: data?.status === "1",
  };
}

async function qweatherNow(location?: string) {
  const key = env("QWEATHER_API_KEY");
  const host = env("QWEATHER_API_HOST") || "https://api.qweather.com";
  if (!key || !location) return undefined;

  const url = new URL("/v7/weather/now", host);
  url.searchParams.set("location", location);
  url.searchParams.set("lang", "zh");
  url.searchParams.set("unit", "m");

  const data = await fetchJson<{
    code: string;
    now?: {
      temp?: string;
      feelsLike?: string;
      text?: string;
      humidity?: string;
      precip?: string;
      windDir?: string;
      windScale?: string;
    };
  }>(url.toString(), {
    headers: {
      Authorization: `Bearer ${key}`,
    },
  });

  recordApiUsage({
    provider: "qweather",
    endpoint: "weather/now",
    feature: "comfort_weather",
    success: data?.code === "200",
  });

  return data?.now;
}

export async function collectExternalAnalysisContext(
  input: ListingAnalysisInput,
): Promise<ExternalAnalysisContext> {
  const dataQuality: DataQualitySignal[] = [];
  const degradationNotes: string[] = [];
  const addSignal = (signal: DataQualitySignal) => {
    dataQuality.push(signal);
    if (signal.status !== "live") degradationNotes.push(signal.detail);
  };

  const amapKey = env("AMAP_WEB_SERVICE_KEY");
  const qweatherKey = env("QWEATHER_API_KEY");
  const amapEnabled = input.dataSourceSettings?.amapDataEnabled !== false;
  const qweatherEnabled = input.dataSourceSettings?.weatherDataEnabled !== false;
  const amapUsageState = amapKey ? getProviderUsageState("amap") : undefined;
  const qweatherUsageState = qweatherKey ? getProviderUsageState("qweather") : undefined;
  const canUseAmap = Boolean(amapEnabled && amapKey && amapUsageState?.canCall);
  const canUseQweather = Boolean(qweatherEnabled && qweatherKey && qweatherUsageState?.canCall);

  if (!amapEnabled) {
    addSignal({
      provider: "amap",
      feature: "地图增强",
      status: "fallback",
      label: "地图实时数据已关闭",
      detail: "设置页已关闭实时地图数据，本次改用用户输入信息估算地址、通勤和周边生活。",
    });
  } else if (!amapKey) {
    addSignal({
      provider: "amap",
      feature: "地图增强",
      status: "fallback",
      label: "实时地图数据暂不可用",
      detail: "本次改用用户输入信息估算地址、通勤和周边生活。",
    });
  } else if (!canUseAmap) {
    addSignal({
      provider: "amap",
      feature: "地图增强",
      status: "skipped_limit",
      label: "实时地图数据暂不可用",
      detail:
        amapUsageState?.reason ??
        "实时地图查询暂不可用，本次改用你填写的信息估算。",
    });
  } else if (amapUsageState?.reason) {
    addSignal({
      provider: "amap",
      feature: "地图增强",
      status: "live",
      label: "实时地图数据可用",
      detail: amapUsageState.reason,
    });
  }

  if (!qweatherEnabled) {
    addSignal({
      provider: "qweather",
      feature: "天气舒适度",
      status: "fallback",
      label: "天气实时数据已关闭",
      detail: "设置页已关闭天气与环境开放数据，本次跳过实时天气，改用城市气候常识和居住偏好做保守判断。",
    });
  } else if (!qweatherKey) {
    addSignal({
      provider: "qweather",
      feature: "天气舒适度",
      status: "fallback",
      label: "天气未配置",
      detail: "未配置 QWEATHER_API_KEY，本次跳过实时天气，改用城市气候常识和用户偏好做保守判断。",
    });
  } else if (!canUseQweather) {
    addSignal({
      provider: "qweather",
      feature: "天气舒适度",
      status: "skipped_limit",
      label: "天气额度保护",
      detail:
        qweatherUsageState?.reason ??
        "天气产品侧用量已接近提醒线，本次跳过实时天气调用。",
    });
  } else if (qweatherUsageState?.reason) {
    addSignal({
      provider: "qweather",
      feature: "天气舒适度",
      status: "live",
      label: "天气继续调用",
      detail: qweatherUsageState.reason,
    });
  }

  if (canUseAmap && !input.address) {
    addSignal({
      provider: "amap",
      feature: "房源地址解析",
      status: "missing_input",
      label: "缺少房源地址",
      detail: "未填写房源地址或小区名，无法实时解析房源坐标。",
    });
  }

  if (canUseAmap && !input.workplace) {
    addSignal({
      provider: "amap",
      feature: "工作地点解析",
      status: "missing_input",
      label: "缺少工作地点",
      detail: "未填写工作地点，无法实时计算通勤路线。",
    });
  }

  const [listingLocation, workplaceLocation] = canUseAmap
    ? await Promise.all([
        amapGeocode(input.address, input.city),
        amapGeocode(input.workplace, input.city),
      ])
    : [undefined, undefined];

  if (canUseAmap && input.address) {
    addSignal({
      provider: "amap",
      feature: "房源地址解析",
      status: listingLocation ? "live" : "failed",
      label: listingLocation ? "房源位置已解析" : "房源地址解析失败",
      detail: listingLocation
        ? `已解析房源地址：${listingLocation.formattedAddress ?? input.address}`
        : "未返回可用房源坐标，报告会要求补充更精确的小区名、门牌或地标。",
    });
  }

  if (canUseAmap && input.workplace) {
    addSignal({
      provider: "amap",
      feature: "工作地点解析",
      status: workplaceLocation ? "live" : "failed",
      label: workplaceLocation ? "工作地点已解析" : "工作地点解析失败",
      detail: workplaceLocation
        ? `已解析工作地点：${workplaceLocation.formattedAddress ?? input.workplace}`
        : "未返回可用工作地点坐标，通勤会按用户输入信息估算。",
    });
  }

  const [commute, metroPoi, groceryPoi, medicalPoi, mallPoi, weather] =
    await Promise.all([
      canUseAmap && listingLocation?.location && workplaceLocation?.location
        ? amapTransit(
            listingLocation.location,
            workplaceLocation.location,
            listingLocation.citycode || workplaceLocation.citycode || input.city,
          )
        : Promise.resolve(undefined),
      canUseAmap && listingLocation?.location
        ? amapPoiAround(listingLocation.location, "地铁")
        : Promise.resolve(undefined),
      canUseAmap && listingLocation?.location
        ? amapPoiAround(listingLocation.location, "超市|便利店|菜市场")
        : Promise.resolve(undefined),
      canUseAmap && listingLocation?.location
        ? amapPoiAround(listingLocation.location, "医院|诊所")
        : Promise.resolve(undefined),
      canUseAmap && listingLocation?.location
        ? amapPoiAround(listingLocation.location, "商场|购物中心")
        : Promise.resolve(undefined),
      canUseQweather && listingLocation?.location
        ? qweatherNow(listingLocation.location)
        : Promise.resolve(undefined),
    ]);

  if (canUseAmap) {
    addSignal({
      provider: "amap",
      feature: "通勤路线",
      status: commute ? "live" : "fallback",
      label: commute ? "实时通勤路线" : "通勤路线未实时查询",
      detail: commute
    ? `已获得公交/地铁路线，预计约 ${commute.durationMinutes ?? "-"} 分钟。`
        : "缺少可用坐标或路线查询失败，通勤段落会提示用户现场实测或手动补充。",
    });
  }

  const poiResults = [metroPoi, groceryPoi, medicalPoi, mallPoi];
  const hasAnyPoiResponse = poiResults.some((item) => item !== undefined);
  const hasAnyPoiSuccess = poiResults.some((item) => item?.ok);

  if (canUseAmap) {
    addSignal({
      provider: "amap",
      feature: "周边生活信息",
      status: hasAnyPoiSuccess ? "live" : hasAnyPoiResponse ? "failed" : "fallback",
      label: hasAnyPoiSuccess ? "周边生活信息" : "周边生活信息未实时查询",
      detail: hasAnyPoiSuccess
        ? "已查询地铁、买菜便利、医疗和商场类周边生活点；仍需现场确认步行距离和营业时间。"
        : "周边生活信息未返回可用结果，生活配套会优先根据用户输入保守估算。",
    });
  }

  if (canUseQweather) {
    addSignal({
      provider: "qweather",
      feature: "实时天气",
      status: weather ? "live" : "fallback",
      label: weather ? "和风天气实时天气" : "天气未实时查询",
      detail: weather
        ? `已获得实时天气：${weather.text ?? "未知天气"}，湿度 ${weather.humidity ?? "-"}%。`
        : "天气接口未返回可用结果，舒适度会按城市气候和怕潮/怕热偏好保守判断。",
    });
  }

  const nearby = hasAnyPoiSuccess
    ? {
        metroCount: metroPoi?.count,
        groceryCount: groceryPoi?.count,
        medicalCount: medicalPoi?.count,
        mallCount: mallPoi?.count,
      }
    : undefined;

  return {
    dataQuality,
    degradationNotes: Array.from(new Set(degradationNotes)),
    listingLocation,
    workplaceLocation,
    commute,
    nearby,
    weather,
  };
}
