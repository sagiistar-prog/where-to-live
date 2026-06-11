import { NextResponse } from "next/server";
import { collectExternalAnalysisContext } from "@/lib/server/external-data";
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

  return {
    title: asString(value.title),
    rent: asString(value.rent),
    area: asString(value.area),
    floor: asString(value.floor),
    address: asString(value.address),
    description: asString(value.description),
    city: asString(value.city),
    income: asString(value.income),
    workplace: asString(value.workplace),
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

  const context = await collectExternalAnalysisContext(input);
  const payload = await generateReportPayload(input, context);

  if (input.saveReportHistory === false) {
    return NextResponse.json({
      ...payload,
      saved: false,
      context,
    });
  }

  const ownerId = await getCurrentOwnerId();
  const storedReport = await saveReport(payload, input, ownerId);

  return NextResponse.json({
    ...storedReport,
    saved: true,
    context,
  });
}
