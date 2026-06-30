import { NextResponse } from "next/server";
import { collectExternalAnalysisContext } from "@/lib/server/external-data";
import { buildQuotaExceededPayload, getAccountQuota } from "@/lib/server/account-quota";
import { getCurrentOwnerId } from "@/lib/server/current-owner";
import { generateReportPayload } from "@/lib/server/openai-report";
import { saveReport } from "@/lib/server/report-store";
import type { ListingAnalysisInput } from "@/lib/report-builder";
import { isAnalysisPreflightResult } from "@/lib/analysis-preflight";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : undefined;
}

function moneyNear(text: string, keywords: string[]) {
  const keyword = keywords.join("|");
  const before = new RegExp(`(?:${keyword})[^\\d]{0,12}(\\d+(?:\\.\\d+)?)\\s*(万|w|W|k|K|千|元)?`);
  const after = new RegExp(`(\\d+(?:\\.\\d+)?)\\s*(万|w|W|k|K|千|元)?[^，。；,;]{0,12}(?:${keyword})`);
  const match = text.match(before) ?? text.match(after);
  if (!match) return undefined;

  const value = Number(match[1]);
  if (!Number.isFinite(value)) return undefined;
  const unit = match[2]?.toLowerCase();
  if (unit === "万" || unit === "w") return String(Math.round(value * 10000));
  if (unit === "k" || unit === "千") return String(Math.round(value * 1000));
  return String(Math.round(value));
}

const knownCities = [
  "北京",
  "上海",
  "深圳",
  "广州",
  "杭州",
  "成都",
  "南京",
  "苏州",
  "武汉",
  "重庆",
  "西安",
  "厦门",
  "长沙",
  "天津",
  "青岛",
  "宁波",
];

function cityFromText(text: string) {
  return knownCities.find((city) => text.includes(city));
}

function workplaceFromText(text: string) {
  return text.match(/(?:工作|公司|上班|通勤)[^，。；,;]{0,8}(?:在|到)([^，。；,;]{2,24})/)?.[1]?.trim();
}

function addressFromText(text: string) {
  const cityArea = text.match(
    /(北京|上海|深圳|广州|杭州|成都|南京|苏州|武汉|重庆|西安|厦门|长沙|天津|青岛|宁波)([^，。；,;]{1,12})(?:一套|的|房源|月租|整租|合租)/,
  );
  if (cityArea) return `${cityArea[1]}${cityArea[2]}`.trim();

  return text.match(/(?:地址|位于|房源在|小区在|位置在|附近|周边)[:：]?\s*([^，。；,;]{2,32})/)?.[1]?.trim();
}

function titleFromText(text: string) {
  return text
    .split(/[，。；,;]/)
    .map((item) => item.trim())
    .find(
      (item) =>
        /小区|公寓|整租|合租|一居|两居|三居|单间|房间|户型|\d+\s*室|[一二三四五六七八九]室/.test(item) &&
        !/合同|收款|退款|定金|押金|中介费|服务费/.test(item),
    )
    ?.slice(0, 36);
}

function asBoolean(value: unknown) {
  return typeof value === "boolean" ? value : undefined;
}

function asReportDepth(value: unknown): ListingAnalysisInput["reportDepth"] {
  return value === "standard" || value === "deep-risk" || value === "pre-sign"
    ? value
    : undefined;
}

function asDataSourceSettings(value: unknown): ListingAnalysisInput["dataSourceSettings"] {
  if (!value || typeof value !== "object") return undefined;
  const record = value as Record<string, unknown>;
  return {
    amapDataEnabled: asBoolean(record.amapDataEnabled),
    weatherDataEnabled: asBoolean(record.weatherDataEnabled),
    officialPromptEnabled: asBoolean(record.officialPromptEnabled),
  };
}

function asNightLighting(value: unknown): ListingAnalysisInput["nightLighting"] {
  return value === "good" || value === "normal" || value === "poor" ? value : undefined;
}

function asCookingFrequency(value: unknown): ListingAnalysisInput["cookingFrequency"] {
  return value === "often" || value === "sometimes" || value === "rarely" ? value : undefined;
}

function parseAnalysisInput(body: unknown): ListingAnalysisInput | null {
  if (!body || typeof body !== "object") return null;
  const value = body as Record<string, unknown>;
  const preferences = Array.isArray(value.preferences)
    ? value.preferences.filter((item): item is string => typeof item === "string")
    : [];
  const textContext = [
    asString(value.title),
    asString(value.address),
    asString(value.description),
    asString(value.reportContext),
    asString(value.lifeNotes),
  ]
    .filter(Boolean)
    .join(" ");
  const hasMeaningfulInput = [
    value.title,
    value.rent,
    value.address,
    value.description,
    value.city,
    value.workplace,
    value.reportContext,
    value.screenshotDataUrl,
  ].some((item) => String(item ?? "").trim().length > 0);

  if (!hasMeaningfulInput) return null;

  return {
    title: asString(value.title) ?? titleFromText(textContext),
    rent: asString(value.rent) ?? moneyNear(textContext, ["月租", "房租", "租金", "租"]),
    area: asString(value.area),
    floor: asString(value.floor),
    address: asString(value.address) ?? addressFromText(textContext),
    description: asString(value.description),
    city: asString(value.city) ?? cityFromText(textContext),
    income: asString(value.income),
    workplace: asString(value.workplace) ?? workplaceFromText(textContext),
    budget: asString(value.budget),
    commuteLimit: asString(value.commuteLimit),
    fixedCost: asString(value.fixedCost),
    source: asString(value.source),
    sourceReportId: asString(value.sourceReportId),
    reportContext: asString(value.reportContext),
    lifeRadiusMinutes: asString(value.lifeRadiusMinutes),
    groceryMinutes: asString(value.groceryMinutes),
    restaurantCount: asString(value.restaurantCount),
    pharmacyMinutes: asString(value.pharmacyMinutes),
    hospitalMinutes: asString(value.hospitalMinutes),
    parcelMinutes: asString(value.parcelMinutes),
    laundryMinutes: asString(value.laundryMinutes),
    gymMinutes: asString(value.gymMinutes),
    parkMinutes: asString(value.parkMinutes),
    lateFoodAvailable: asBoolean(value.lateFoodAvailable),
    nightLighting: asNightLighting(value.nightLighting),
    cookingFrequency: asCookingFrequency(value.cookingFrequency),
    noiseSources: asString(value.noiseSources),
    lifestyle: asString(value.lifestyle),
    lifeNotes: asString(value.lifeNotes),
    preferences,
    screenshotDataUrl: asString(value.screenshotDataUrl),
    reportDepth: asReportDepth(value.reportDepth),
    saveReportHistory: asBoolean(value.saveReportHistory),
    personalizationEnabled: asBoolean(value.personalizationEnabled),
    dataSourceSettings: asDataSourceSettings(value.dataSourceSettings),
    analysisPreflight: isAnalysisPreflightResult(value.analysisPreflight)
      ? value.analysisPreflight
      : undefined,
  };
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const input = parseAnalysisInput(body);

  if (!input) {
    return NextResponse.json(
      {
        error: "INVALID_ANALYSIS_INPUT",
        message: "输入信息格式不正确，请确认房源、工作地点和偏好信息。",
      },
      { status: 400 },
    );
  }

  const shouldSaveReport = input.saveReportHistory !== false;
  const ownerId = shouldSaveReport ? await getCurrentOwnerId() : undefined;

  if (ownerId) {
    const quota = await getAccountQuota({ ownerId });
    if (quota.remaining <= 0) {
      return NextResponse.json(buildQuotaExceededPayload(quota), { status: 402 });
    }
  }

  const context = await collectExternalAnalysisContext(input);
  const payload = await generateReportPayload(input, context);

  if (!shouldSaveReport) {
    return NextResponse.json({
      ...payload,
      saved: false,
      context,
    });
  }

  const storedReport = await saveReport(payload, input, ownerId);

  return NextResponse.json({
    ...storedReport,
    saved: true,
    context,
  });
}
