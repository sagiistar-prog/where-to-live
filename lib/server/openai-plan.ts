import {
  buildDecisionPlan,
  type DecisionPlanInput,
  type DecisionPlanPhase,
  type DecisionPlanResult,
  type PlanPriority,
} from "@/lib/decision-plan";
import type { ReportStatus } from "@/lib/mock-data";

const allowedHrefs = new Set([
  "/plan",
  "/city",
  "/area",
  "/commute",
  "/life",
  "/analyze",
  "/visit",
  "/safety",
  "/shared",
  "/official",
  "/evidence",
  "/payment",
  "/contract",
  "/move",
  "/handover",
  "/repair",
  "/renewal",
  "/deposit",
  "/buy",
]);

const allowedPriorities = new Set<PlanPriority>(["必须先做", "高优先级", "可按计划"]);
const allowedStatuses = new Set<ReportStatus>(["recommend", "caution", "reject"]);

function schema() {
  const task = {
    type: "object",
    additionalProperties: false,
    required: ["title", "priority", "moduleName", "href", "why", "output", "timeBox"],
    properties: {
      title: { type: "string" },
      priority: { type: "string", enum: ["必须先做", "高优先级", "可按计划"] },
      moduleName: { type: "string" },
      href: {
        type: "string",
        enum: Array.from(allowedHrefs),
      },
      why: { type: "string" },
      output: { type: "string" },
      timeBox: { type: "string" },
    },
  };

  return {
    type: "object",
    additionalProperties: false,
    required: [
      "status",
      "score",
      "headline",
      "summary",
      "currentStage",
      "decisionDeadline",
      "guardrails",
      "blockers",
      "phases",
      "nextModules",
      "todayPlan",
      "stopLine",
      "doneDefinition",
      "evidenceChecklist",
      "handoffScript",
      "assumptions",
    ],
    properties: {
      status: { type: "string", enum: ["recommend", "caution", "reject"] },
      score: { type: "number", minimum: 0, maximum: 100 },
      headline: { type: "string" },
      summary: { type: "string" },
      currentStage: { type: "string" },
      decisionDeadline: { type: "string" },
      guardrails: {
        type: "array",
        minItems: 3,
        maxItems: 5,
        items: { type: "string" },
      },
      blockers: {
        type: "array",
        minItems: 1,
        maxItems: 5,
        items: { type: "string" },
      },
      phases: {
        type: "array",
        minItems: 3,
        maxItems: 3,
        items: {
          type: "object",
          additionalProperties: false,
          required: ["title", "purpose", "tasks"],
          properties: {
            title: { type: "string" },
            purpose: { type: "string" },
            tasks: {
              type: "array",
              minItems: 2,
              maxItems: 4,
              items: task,
            },
          },
        },
      },
      nextModules: {
        type: "array",
        minItems: 3,
        maxItems: 5,
        items: {
          type: "object",
          additionalProperties: false,
          required: ["name", "href", "reason"],
          properties: {
            name: { type: "string" },
            href: { type: "string", enum: Array.from(allowedHrefs) },
            reason: { type: "string" },
          },
        },
      },
      todayPlan: {
        type: "array",
        minItems: 3,
        maxItems: 4,
        items: { type: "string" },
      },
      stopLine: { type: "string" },
      doneDefinition: { type: "string" },
      evidenceChecklist: {
        type: "array",
        minItems: 4,
        maxItems: 8,
        items: { type: "string" },
      },
      handoffScript: { type: "string" },
      assumptions: {
        type: "array",
        minItems: 3,
        maxItems: 6,
        items: { type: "string" },
      },
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

function textOrFallback(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function listOrFallback(value: unknown, fallback: string[], min = 1) {
  if (!Array.isArray(value)) return fallback;
  const items = value.filter(
    (item): item is string => typeof item === "string" && item.trim().length > 0,
  );
  return items.length >= min ? items : fallback;
}

function normalizePriority(value: unknown, fallback: PlanPriority): PlanPriority {
  return typeof value === "string" && allowedPriorities.has(value as PlanPriority)
    ? (value as PlanPriority)
    : fallback;
}

function normalizeHref(value: unknown, fallback: string) {
  return typeof value === "string" && allowedHrefs.has(value) ? value : fallback;
}

function normalizePhases(value: unknown, fallback: DecisionPlanPhase[]) {
  if (!Array.isArray(value) || value.length < 3) return fallback;

  return value.slice(0, 3).map((phase, phaseIndex) => {
    const fallbackPhase = fallback[phaseIndex] ?? fallback[0];
    const record = phase && typeof phase === "object" ? (phase as Record<string, unknown>) : {};
    const tasks = Array.isArray(record.tasks) ? record.tasks : [];

    return {
      title: textOrFallback(record.title, fallbackPhase.title),
      purpose: textOrFallback(record.purpose, fallbackPhase.purpose),
      tasks: tasks.slice(0, 4).map((task, taskIndex) => {
        const fallbackTask = fallbackPhase.tasks[taskIndex] ?? fallbackPhase.tasks[0];
        const item = task && typeof task === "object" ? (task as Record<string, unknown>) : {};

        return {
          title: textOrFallback(item.title, fallbackTask.title),
          priority: normalizePriority(item.priority, fallbackTask.priority),
          moduleName: textOrFallback(item.moduleName, fallbackTask.moduleName),
          href: normalizeHref(item.href, fallbackTask.href),
          why: textOrFallback(item.why, fallbackTask.why),
          output: textOrFallback(item.output, fallbackTask.output),
          timeBox: textOrFallback(item.timeBox, fallbackTask.timeBox),
        };
      }),
    };
  });
}

function normalizePlanResult(value: unknown, fallback: DecisionPlanResult): DecisionPlanResult {
  const record = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const phases = normalizePhases(record.phases, fallback.phases);

  const nextModules = Array.isArray(record.nextModules)
    ? record.nextModules.slice(0, 5).map((item, index) => {
        const fallbackModule = fallback.nextModules[index] ?? fallback.nextModules[0];
        const moduleRecord = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
        return {
          name: textOrFallback(moduleRecord.name, fallbackModule.name),
          href: normalizeHref(moduleRecord.href, fallbackModule.href),
          reason: textOrFallback(moduleRecord.reason, fallbackModule.reason),
        };
      })
    : fallback.nextModules;

  return {
    ...fallback,
    status:
      typeof record.status === "string" && allowedStatuses.has(record.status as ReportStatus)
        ? (record.status as ReportStatus)
        : fallback.status,
    score:
      typeof record.score === "number" && Number.isFinite(record.score)
        ? Math.max(0, Math.min(100, Math.round(record.score)))
        : fallback.score,
    headline: textOrFallback(record.headline, fallback.headline),
    summary: textOrFallback(record.summary, fallback.summary),
    currentStage: textOrFallback(record.currentStage, fallback.currentStage),
    decisionDeadline: textOrFallback(record.decisionDeadline, fallback.decisionDeadline),
    guardrails: listOrFallback(record.guardrails, fallback.guardrails, 3).slice(0, 5),
    blockers: listOrFallback(record.blockers, fallback.blockers, 1).slice(0, 5),
    phases,
    nextModules,
    todayPlan: listOrFallback(record.todayPlan, fallback.todayPlan, 3).slice(0, 4),
    stopLine: textOrFallback(record.stopLine, fallback.stopLine),
    doneDefinition: textOrFallback(record.doneDefinition, fallback.doneDefinition),
    evidenceChecklist: listOrFallback(
      record.evidenceChecklist,
      fallback.evidenceChecklist,
      4,
    ).slice(0, 8),
    handoffScript: textOrFallback(record.handoffScript, fallback.handoffScript),
    assumptions: listOrFallback(record.assumptions, fallback.assumptions, 3).slice(0, 6),
  };
}

export async function buildDecisionPlanWithOpenAI(
  input: DecisionPlanInput,
): Promise<DecisionPlanResult> {
  const fallback = buildDecisionPlan(input);
  const generatedAt = new Date().toISOString();
  const apiKey = process.env.OPENAI_API_KEY?.trim();

  if (!apiKey) {
    return {
      ...fallback,
      mode: "fallback",
      generatedAt,
      warnings: ["已先按你填写的信息整理今日确认安排；签约、付款和退租相关事项仍建议回到原始材料逐项核对。"],
    };
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
    "你是住哪儿 AI 的下一步助手。你站在中国大陆年轻租客立场，把当前阶段、时间压力、付款压力、凭据状态和居住偏好整理成清楚的确认顺序。你不卖房源，不替平台背书，不替代律师或官方查询。",
          },
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text: JSON.stringify(
                  {
                    task: "优化下一步",
                    input,
                    localRuleBaseline: fallback,
                    allowedToolHrefs: Array.from(allowedHrefs),
                    requirements: [
                      "必须保留用户侧立场，优先减少押金、付款、合同、通勤和凭据损失。",
                      "只能使用 allowedToolHrefs 里的现有工具入口，不要发明新页面。",
      "必须给出为什么做、做到什么程度、付款底线意识；不要只写泛泛建议。",
                      "必须返回 todayPlan、stopLine、doneDefinition，让用户可以复制今日事项。",
                      "被催付款、未见合同、授权缺失、收款主体不明时必须先别付款。",
                      "不要读取私人账号，不爬取租房平台，不承诺房源真假。",
    "结果要比基础确认安排更贴合用户输入，但不能弱化必须先确认的风险项。",
                    ],
                  },
                  null,
                  2,
                ),
              },
            ],
          },
        ],
        text: {
          format: {
            type: "json_schema",
            name: "housing_decision_plan",
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

    return {
      ...normalizePlanResult(JSON.parse(text), fallback),
      mode: "openai",
      generatedAt,
      warnings: [],
    };
  } catch {
    return {
      ...fallback,
      mode: "fallback",
      generatedAt,
      warnings: [
        "已先按你填写的信息整理今日确认安排；签约、付款和退租相关事项仍建议回到原始材料逐项核对。",
      ],
    };
  }
}
