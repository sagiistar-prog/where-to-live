import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type ExtractedListingFields = {
  title: string | null;
  rent: string | null;
  area: string | null;
  floor: string | null;
  address: string | null;
  city: string | null;
  description: string | null;
  confidence: number;
  missingFields: string[];
  warnings: string[];
};

function extractOutputText(data: unknown) {
  if (!data || typeof data !== "object") return undefined;
  const output = (data as { output?: unknown[] }).output;
  if (!Array.isArray(output)) return (data as { output_text?: string }).output_text;

  for (const item of output) {
    const content = (item as { content?: unknown[] }).content;
    if (!Array.isArray(content)) continue;
    for (const part of content) {
      const text = (part as { text?: string }).text;
      if (text) return text;
    }
  }

  return (data as { output_text?: string }).output_text;
}

function extractionSchema() {
  return {
    type: "object",
    additionalProperties: false,
    required: [
      "title",
      "rent",
      "area",
      "floor",
      "address",
      "city",
      "description",
      "confidence",
      "missingFields",
      "warnings",
    ],
    properties: {
      title: { type: ["string", "null"] },
      rent: { type: ["string", "null"] },
      area: { type: ["string", "null"] },
      floor: { type: ["string", "null"] },
      address: { type: ["string", "null"] },
      city: { type: ["string", "null"] },
      description: { type: ["string", "null"] },
      confidence: { type: "number", minimum: 0, maximum: 1 },
      missingFields: {
        type: "array",
        maxItems: 8,
        items: { type: "string" },
      },
      warnings: {
        type: "array",
        maxItems: 8,
        items: { type: "string" },
      },
    },
  };
}

function normalizeFields(fields: ExtractedListingFields) {
  return {
    title: fields.title?.trim() || "",
    rent: fields.rent?.trim() || "",
    area: fields.area?.trim() || "",
    floor: fields.floor?.trim() || "",
    address: fields.address?.trim() || "",
    city: fields.city?.trim() || "",
    description: fields.description?.trim() || "",
  };
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as
    | { screenshotDataUrl?: unknown }
    | null;
  const screenshotDataUrl =
    typeof body?.screenshotDataUrl === "string" ? body.screenshotDataUrl : "";

  if (!screenshotDataUrl.startsWith("data:image/")) {
    return NextResponse.json(
      { message: "请上传图片格式的房源截图。" },
      { status: 400 },
    );
  }

  if (screenshotDataUrl.length > 7_000_000) {
    return NextResponse.json(
      { message: "截图体积过大，请压缩到 4MB 左右后再读取。" },
      { status: 413 },
    );
  }

  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json({
      mode: "fallback",
      fields: {},
      confidence: 0,
      missingFields: ["截图读取服务未配置"],
      warnings: ["截图读取服务未配置，当前只能保留截图并由你手动确认信息。"],
      message: "截图读取服务未配置，暂时不能读取截图信息。",
    });
  }

  const model =
    process.env.OPENAI_VISION_MODEL ||
    process.env.OPENAI_REPORT_MODEL ||
    process.env.OPENAI_MODEL ||
    "gpt-5.2";

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        input: [
          {
            role: "system",
            content:
      "你是住哪儿 AI 的房源截图信息读取器。只从用户主动上传的图片中抽取明确可见的信息，不要编造。无法确认的信息返回 null，并在 missingFields 中说明。",
          },
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text:
                  "请识别这张中国租房相关截图中的房源标题、月租金、面积、楼层、地址/小区、城市和费用/风险描述。保留原文关键信息，方便用户确认后保存房源评估。",
              },
              { type: "input_image", image_url: screenshotDataUrl },
            ],
          },
        ],
        text: {
          format: {
            type: "json_schema",
            name: "listing_screenshot_extraction",
            schema: extractionSchema(),
            strict: true,
          },
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI request failed: ${response.status}`);
    }

    const data = await response.json();
    const text = extractOutputText(data);
    if (!text) throw new Error("OpenAI response did not include output text");

    const parsed = JSON.parse(text) as ExtractedListingFields;
    return NextResponse.json({
      mode: "openai",
      fields: normalizeFields(parsed),
      confidence: parsed.confidence,
      missingFields: parsed.missingFields,
      warnings: parsed.warnings,
      message: "已读取截图信息，请人工确认后再保存房源评估。",
    });
  } catch (error) {
    return NextResponse.json({
      mode: "fallback",
      fields: {},
      confidence: 0,
      missingFields: ["截图读取失败"],
      warnings: [
        error instanceof Error
          ? `截图读取失败：${error.message}`
          : "截图读取失败。",
      ],
      message: "截图读取失败，请先手动补充关键信息。",
    });
  }
}
