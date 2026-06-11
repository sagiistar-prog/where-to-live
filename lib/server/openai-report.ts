import {
  buildFallbackReport,
  normalizeReportData,
  type ExternalAnalysisContext,
  type GeneratedReportPayload,
  type ListingAnalysisInput,
} from "@/lib/report-builder";
import type { ReportData } from "@/lib/mock-data";

function reportSchema() {
  const section = {
    type: "object",
    additionalProperties: false,
    required: ["title", "points"],
    properties: {
      title: { type: "string" },
      points: { type: "array", minItems: 3, maxItems: 5, items: { type: "string" } },
    },
  };

  return {
    type: "object",
    additionalProperties: false,
    required: [
      "title",
      "address",
      "status",
      "conclusion",
      "score",
      "scores",
      "commute",
      "amenities",
      "lifeRadius",
      "comfort",
      "livingCost",
      "contractRisk",
      "visitChecklist",
      "finalAdvice",
    ],
    properties: {
      title: { type: "string" },
      address: { type: "string" },
      status: { type: "string", enum: ["recommend", "caution", "reject"] },
      conclusion: { type: "string" },
      score: { type: "number", minimum: 0, maximum: 100 },
      scores: {
        type: "array",
        minItems: 6,
        maxItems: 6,
        items: {
          type: "object",
          additionalProperties: false,
          required: ["label", "score", "summary"],
          properties: {
            label: { type: "string" },
            score: { type: "number", minimum: 0, maximum: 100 },
            summary: { type: "string" },
          },
        },
      },
      commute: section,
      amenities: section,
      lifeRadius: section,
      comfort: section,
      livingCost: section,
      contractRisk: section,
      visitChecklist: {
        type: "array",
        minItems: 6,
        maxItems: 8,
        items: { type: "string" },
      },
      finalAdvice: { type: "string" },
    },
  };
}

function extractOutputText(data: unknown) {
  if (!data || typeof data !== "object") return undefined;
  const output = (data as { output?: unknown[] }).output;
  if (!Array.isArray(output)) return undefined;

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

function buildDataSources(input: ListingAnalysisInput, context: ExternalAnalysisContext) {
  const sourceLabels = [
    input.screenshotDataUrl ? "用户上传截图" : "用户手动输入",
    input.analysisPreflight ? "提交前信息确认" : "",
    input.reportContext ? "上一步记录" : "",
    ...(context.dataQuality ?? []).map((signal) =>
      signal.status === "live" ? signal.label : `${signal.label}（按现有信息估算）`,
    ),
  ].filter(Boolean);

  return Array.from(new Set(sourceLabels));
}

function buildExternalWarnings(context: ExternalAnalysisContext) {
  return Array.from(new Set(context.degradationNotes ?? []));
}

function buildPreflightWarnings(input: ListingAnalysisInput) {
  const preflight = input.analysisPreflight;
  if (!preflight) return [];

  const notes = [
    `提交前信息确认：${preflight.label}，信息完整度 ${preflight.score}%。${preflight.description}`,
    ...preflight.missingCritical.slice(0, 3),
    ...preflight.degradation.slice(0, 3),
  ];

  return Array.from(new Set(notes));
}

function reportDepthInstruction(depth: ListingAnalysisInput["reportDepth"]) {
  if (depth === "pre-sign") {
    return "签约前确认：结果必须更保守，重点确认合同主体、收款主体、出租/转租授权、押金退还、维修责任、提前退租、付款备注和待补充凭据；未补充必须确认时不要给出可付款或可签约暗示。";
  }

  if (depth === "deep-risk") {
    return "深度风险提示：结果必须优先说清高损失风险，包括押金、维修、授权、噪音、潮湿、低楼层、晚归安全和合租边界；结论要给出补充凭据和现场确认事项。";
  }

    return "标准评估：重点覆盖预算、通勤、生活配套、舒适度、基础合同风险和看房清单，保持简洁并能直接参考。";
}

function officialPromptInstruction(enabled: boolean | undefined) {
  if (enabled === false) {
    return "用户已关闭官方查询入口提示；不要额外扩展官方入口引导，但仍需保留必要的合同、授权、押金和付款风险提示。";
  }

  return "必须提醒用户：备案入口、出租权、合同示范文本、公共服务影响和付款主体要回到住建、政务服务、市场监管等官方公开入口或可留存材料确认；本产品不能替用户确认产权真假。";
}

function personalizationInstruction(enabled: boolean | undefined) {
  if (!enabled) {
    return "用户未开启个性化优化；只使用本次表单里明确填写的预算、通勤上限和偏好做判断，不要额外推断长期需求。";
  }

  return "用户已开启个性化优化；可以把本次表单偏好视为长期偏好，强化独居、养宠、做饭、怕吵、怕潮湿、近地铁和老小区接受度等条件对最终建议和看房清单的影响。";
}

export async function generateReportPayload(
  input: ListingAnalysisInput,
  context: ExternalAnalysisContext,
): Promise<GeneratedReportPayload> {
  const dataSources = buildDataSources(input, context);
  const externalWarnings = buildExternalWarnings(context);
  const preflightWarnings = buildPreflightWarnings(input);
  const generatedAt = new Date().toISOString();
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  const officialInstruction = officialPromptInstruction(
    input.dataSourceSettings?.officialPromptEnabled,
  );
  const preferenceInstruction = personalizationInstruction(input.personalizationEnabled);

  if (!apiKey) {
    return {
      report: buildFallbackReport(input, context),
      mode: "fallback",
      generatedAt,
      dataSources,
      dataQuality: context.dataQuality,
      analysisPreflight: input.analysisPreflight,
      warnings: [
        "当前按你填写的信息和常见租房风险保存评估；截图、合同和长文本仍需要你回到原始材料核对。",
        ...preflightWarnings,
        ...externalWarnings,
      ],
    };
  }

  const model = process.env.OPENAI_REPORT_MODEL || process.env.OPENAI_MODEL || "gpt-5.2";
  const userContent: Array<{ type: "input_text"; text: string } | { type: "input_image"; image_url: string }> = [
    {
      type: "input_text",
      text: JSON.stringify(
        {
          product: "住哪儿 AI",
          task: "生成面向中国年轻租客的房源评估报告",
          reportDepth: input.reportDepth ?? "standard",
          reportDepthInstruction: reportDepthInstruction(input.reportDepth),
          officialPromptEnabled: input.dataSourceSettings?.officialPromptEnabled !== false,
          officialPromptInstruction: officialInstruction,
          personalizationEnabled: input.personalizationEnabled === true,
          personalizationInstruction: preferenceInstruction,
          input,
          externalContext: context,
          constraints: [
            "不要假装知道未提供的信息",
    "必须站在租客立场，不替房源平台或中介背书",
    "结果必须直白、能直接参考、能帮助签约前避坑",
            "风险提示要具体到看房和合同确认事项",
    "必须单独说明生活配套与夜间可用性，判断买菜、餐饮、药店、医疗、快递、夜路和噪音是否长期顺手",
            reportDepthInstruction(input.reportDepth),
            officialInstruction,
            preferenceInstruction,
          ],
        },
        null,
        2,
      ),
    },
  ];

  if (input.screenshotDataUrl) {
    userContent.push({ type: "input_image", image_url: input.screenshotDataUrl });
  }

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
    "你是住哪儿 AI 的房源风险提示分析器。你只根据用户主动提供的信息、地图/天气开放数据和租房常识生成结构化报告。不要编造平台房源数据。报告必须站在租客立场解释真实月成本、通勤、生活配套、舒适度和签约风险。",
          },
          {
            role: "user",
            content: userContent,
          },
        ],
        text: {
          format: {
            type: "json_schema",
            name: "listing_health_report",
            schema: reportSchema(),
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

    const report = normalizeReportData(JSON.parse(text) as ReportData);
    return {
      report,
      mode: "openai",
      generatedAt,
      dataSources,
      dataQuality: context.dataQuality,
      analysisPreflight: input.analysisPreflight,
      warnings: [...preflightWarnings, ...externalWarnings],
    };
  } catch {
    return {
      report: buildFallbackReport(input, context),
      mode: "fallback",
      generatedAt,
      dataSources,
      dataQuality: context.dataQuality,
      analysisPreflight: input.analysisPreflight,
      warnings: [
        "已先按你填写的信息和常见租房风险形成快速判断；截图、合同和长文本仍建议回到原始材料核对。",
        ...preflightWarnings,
        ...externalWarnings,
      ],
    };
  }
}
