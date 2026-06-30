import {
  attachViewingPlan,
  buildFallbackAreaScreen,
  buildViewingQueue,
  parseCandidateAreas,
  type AreaScreenInput,
  type AreaScreenResult,
} from "@/lib/area-fit";
import { recordApiUsage } from "@/lib/server/api-usage";

type GeoResult = {
  formatted_address?: string;
  location?: string;
  citycode?: string;
};

const AMAP_REALTIME_AREA_LIMIT = 3;

function key() {
  return process.env.AMAP_WEB_SERVICE_KEY?.trim();
}

function firstNumber(value?: string) {
  const match = value?.replace(/,/g, "").match(/\d+(\.\d+)?/);
  return match ? Number(match[0]) : undefined;
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

async function geocode(address: string, city?: string) {
  const apiKey = key();
  if (!apiKey || !address) return undefined;
  const url = new URL("https://restapi.amap.com/v3/geocode/geo");
  url.searchParams.set("key", apiKey);
  url.searchParams.set("address", address);
  if (city) url.searchParams.set("city", city);
  url.searchParams.set("output", "json");
  const data = await fetchJson<{ status: string; geocodes?: GeoResult[] }>(url.toString());
  recordApiUsage({
    provider: "amap",
    endpoint: "geocode/geo",
    feature: "area_screen_geocode",
    success: data?.status === "1",
  });
  return data?.geocodes?.[0];
}

async function transit(origin?: string, destination?: string, city?: string) {
  const apiKey = key();
  if (!apiKey || !origin || !destination || !city) return undefined;
  const url = new URL("https://restapi.amap.com/v3/direction/transit/integrated");
  url.searchParams.set("key", apiKey);
  url.searchParams.set("origin", origin);
  url.searchParams.set("destination", destination);
  url.searchParams.set("city", city);
  url.searchParams.set("output", "json");
  const data = await fetchJson<{
    status: string;
    route?: { transits?: Array<{ duration?: string }> };
  }>(url.toString());
  recordApiUsage({
    provider: "amap",
    endpoint: "direction/transit/integrated",
    feature: "area_screen_commute",
    success: data?.status === "1",
  });
  const seconds = Number(data?.route?.transits?.[0]?.duration);
  return Number.isFinite(seconds) && seconds > 0 ? Math.round(seconds / 60) : undefined;
}

async function poiCount(location?: string, keywords?: string) {
  const apiKey = key();
  if (!apiKey || !location || !keywords) return 0;
  const url = new URL("https://restapi.amap.com/v3/place/around");
  url.searchParams.set("key", apiKey);
  url.searchParams.set("location", location);
  url.searchParams.set("keywords", keywords);
  url.searchParams.set("radius", "1200");
  url.searchParams.set("offset", "10");
  url.searchParams.set("output", "json");
  const data = await fetchJson<{ status: string; count?: string }>(url.toString());
  recordApiUsage({
    provider: "amap",
    endpoint: "place/around",
    feature: "area_screen_poi",
    success: data?.status === "1",
  });
  return Number(data?.count) || 0;
}

export async function screenAreas(input: AreaScreenInput): Promise<AreaScreenResult> {
  const fallback = buildFallbackAreaScreen(input);
  const apiKey = key();
  const city = input.city?.trim() || fallback.city;
  const userWorkplace = input.workplace?.trim();
  const workplace = userWorkplace || fallback.workplace;

  if (!apiKey || !userWorkplace) return fallback;

  const workplaceGeo = await geocode(workplace, city);
  if (!workplaceGeo?.location) return fallback;

  const allCandidates = parseCandidateAreas(input.candidateAreas, city);
  const candidates = allCandidates.slice(0, AMAP_REALTIME_AREA_LIMIT);
  const warnings =
    allCandidates.length > candidates.length
      ? [
          `本次只实时增强前 ${AMAP_REALTIME_AREA_LIMIT} 个片区；其余片区可分批再筛。`,
        ]
      : [];
  const enrichedOptions = await Promise.all(
    candidates.map(async (areaName) => {
      const areaGeo = await geocode(areaName, city);
      const [minutes, metroCount, groceryCount] = await Promise.all([
        transit(areaGeo?.location, workplaceGeo.location, areaGeo?.citycode || workplaceGeo.citycode || city),
        poiCount(areaGeo?.location, "地铁"),
        poiCount(areaGeo?.location, "超市|便利店|菜市场"),
      ]);

      const base = buildFallbackAreaScreen({
        ...input,
        city,
        workplace,
        candidateAreas: areaName,
      }).options[0];
      const commuteLimit = firstNumber(input.commuteLimit);
      const commutePenalty =
        minutes && commuteLimit && minutes > commuteLimit
          ? -14
          : 0;
      const poiBoost = Math.min(10, metroCount * 2 + groceryCount);
      const score = Math.max(0, Math.min(100, base.score + poiBoost + commutePenalty));

      return {
        ...base,
        commute: minutes ? `到${workplace}约 ${minutes} 分钟` : base.commute,
        lifeRadius: `地铁相关 ${metroCount} 个，生活购物 ${groceryCount} 个；${base.lifeRadius}`,
        score,
        commuteMinutes: minutes,
        tags: [
          score >= 80 ? "优先" : score >= 65 ? "备选" : "谨慎",
          minutes ? "实时通勤" : "通勤待确认",
          metroCount ? "近轨交" : "轨交待确认",
        ],
        evidence: [
      "已把地址解析、公交地铁路线和周边生活信息纳入评分。",
          minutes ? `通勤估算 ${minutes} 分钟。` : "未取得通勤估算。",
          `1200 米内地铁相关 ${metroCount} 个，生活购物 ${groceryCount} 个。`,
        ],
      };
    }),
  );

  const sortedOptions = enrichedOptions.sort((a, b) => b.score - a.score);
  const plannedOptions = attachViewingPlan(sortedOptions, input);

  return {
    ...fallback,
    mode: "amap",
    summary: `已结合实时地图信息对 ${city} 的 ${enrichedOptions.length} 个候选片区做好初步筛选。`,
    options: plannedOptions,
    viewingQueue: buildViewingQueue(plannedOptions),
    warnings: [...fallback.warnings, ...warnings],
  };
}
