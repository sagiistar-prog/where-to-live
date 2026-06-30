import {
  buildFallbackContractCheck,
  contractRiskSources,
  type ContractCheckInput,
  type ContractCheckResult,
} from "@/lib/contract-risk";

function schema() {
  return {
    type: "object",
    additionalProperties: false,
    required: [
      "overallLevel",
      "score",
      "summary",
      "findings",
      "missingClauses",
      "evidenceChecklist",
      "nextSteps",
      "disclaimer",
    ],
    properties: {
      overallLevel: { type: "string", enum: ["高", "中", "低"] },
      score: { type: "number", minimum: 0, maximum: 100 },
      summary: { type: "string" },
      findings: {
        type: "array",
        maxItems: 8,
        items: {
          type: "object",
          additionalProperties: false,
          required: [
            "title",
            "severity",
            "category",
            "evidence",
            "risk",
            "action",
            "negotiationText",
          ],
          properties: {
            title: { type: "string" },
            severity: { type: "string", enum: ["高", "中", "低"] },
            category: { type: "string" },
            evidence: { type: "string" },
            risk: { type: "string" },
            action: { type: "string" },
            negotiationText: { type: "string" },
          },
        },
      },
      missingClauses: {
        type: "array",
        items: { type: "string" },
      },
      evidenceChecklist: {
        type: "array",
        minItems: 6,
        maxItems: 10,
        items: { type: "string" },
      },
      nextSteps: {
        type: "array",
        minItems: 3,
        maxItems: 6,
        items: { type: "string" },
      },
      disclaimer: { type: "string" },
    },
  };
}

function extractOutputText(data: unknown) {
  if (!data || typeof data !== "object") return undefined;
  const output = (data as { output?: unknown[] }).output;
  if (Array.isArray(output)) {
    for (const item of output) {
      const content = (item as { content?: unknown[] }).content;
      if (!Array.isArray(content)) continue;
      for (const part of content) {
        const text = (part as { text?: string }).text;
        if (text) return text;
      }
    }
  }
  return (data as { output_text?: string }).output_text;
}

export async function checkContractRisk(
  input: ContractCheckInput,
): Promise<ContractCheckResult> {
  const fallback = buildFallbackContractCheck(input);
  const apiKey = process.env.OPENAI_API_KEY?.trim();

  if (!apiKey) return fallback;

  const content: Array<
    { type: "input_text"; text: string } | { type: "input_image"; image_url: string }
  > = [
    {
      type: "input_text",
      text: JSON.stringify(
        {
          task: "租房合同签约前风险确认",
          userRole: input.role ?? "tenant",
          city: input.city,
          contractText: input.text,
          officialReferences: contractRiskSources,
          requirements: [
            "只做风险提示，不给法律结论",
            "每个发现必须包含材料、风险、建议和可复制的沟通话术",
            "重点识别押金、提前退租、维修责任、转租授权、费用、非居住空间、单方解除",
            "如果信息不足，明确列出缺失条款和后续确认事项",
          ],
        },
        null,
        2,
      ),
    },
  ];

  if (input.screenshotDataUrl) {
    content.push({ type: "input_image", image_url: input.screenshotDataUrl });
  }

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_REPORT_MODEL || process.env.OPENAI_MODEL || "gpt-5.2",
        input: [
          {
            role: "system",
            content:
    "你是住哪儿 AI 的合同确认助手。你站在中国大陆年轻租客立场，依据用户主动提供的合同文本、截图和公开租赁法规常识给出能直接核对的确认事项。不要替代律师。",
          },
          {
            role: "user",
            content,
          },
        ],
        text: {
          format: {
            type: "json_schema",
            name: "contract_risk_check",
            schema: schema(),
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
    const parsed = JSON.parse(text) as Omit<
      ContractCheckResult,
      "mode" | "checkedAt" | "sources" | "warnings"
    >;

    return {
      ...parsed,
      mode: "openai",
      checkedAt: new Date().toISOString(),
      sources: contractRiskSources,
      warnings: [],
    };
  } catch {
    return {
      ...fallback,
      warnings: ["重点确认暂时不可用，已先整理基础合同确认。"],
    };
  }
}
