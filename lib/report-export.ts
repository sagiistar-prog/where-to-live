import type { AnalysisPreflightResult } from "@/lib/analysis-preflight";
import type { DecisionCase } from "@/lib/decision-case";
import type { ReportData } from "@/lib/mock-data";
import { buildReportCommunicationScripts } from "@/lib/report-communication";

export type ReportExportContext = {
  label?: string;
  generatedAt?: string;
  dataSources?: string[];
  warnings?: string[];
  analysisPreflight?: AnalysisPreflightResult;
  decisionCase?: DecisionCase;
};

function statusLabel(status: ReportData["status"]) {
  if (status === "recommend") return "建议租";
  if (status === "reject") return "不建议租";
  return "谨慎考虑";
}

function section(title: string, points: string[]) {
  if (!points.length) return "";
  return [`## ${title}`, ...points.map((point) => `- ${point}`)].join("\n");
}

function firstItems(items: string[] | undefined, count: number) {
  return (items ?? []).filter(Boolean).slice(0, count);
}

export function buildReportMarkdown(report: ReportData, context: ReportExportContext = {}) {
  const lifeRadius = report.lifeRadius ?? report.amenities;
  const generatedAt = context.generatedAt
    ? new Date(context.generatedAt).toLocaleString("zh-CN")
    : new Date().toLocaleString("zh-CN");
  const dataSources = context.dataSources?.length
    ? context.dataSources.join("、")
    : "用户输入、截图/手动信息或已配置的数据服务";
  const warnings = firstItems(context.warnings, 5);
  const preflightIssues = firstItems(
    [
      ...(context.analysisPreflight?.degradation ?? []),
      ...(context.analysisPreflight?.riskPrompts ?? []),
    ],
    5,
  );
  const nextAction = context.decisionCase?.nextBestAction;
  const gate = context.decisionCase?.preSignGate;
  const scripts = buildReportCommunicationScripts(report, context.decisionCase);

  const lines = [
    `# ${report.title}`,
    "",
    `- 结论：${statusLabel(report.status)}`,
    `- 总评分：${report.score}/100`,
    `- 地址：${report.address}`,
    `- 整理时间：${generatedAt}`,
    `- 数据来源：${dataSources}`,
    "",
    "## 综合结论",
    report.conclusion,
    "",
    "## 分项评分",
    ...report.scores.map((item) => `- ${item.label}：${item.score}/100。${item.summary}`),
    "",
    section(report.livingCost.title, report.livingCost.points),
    "",
    section(report.commute.title, report.commute.points),
    "",
    section(report.amenities.title, report.amenities.points),
    "",
    section(lifeRadius.title, lifeRadius.points),
    "",
    section(report.comfort.title, report.comfort.points),
    "",
    section(report.contractRisk.title, report.contractRisk.points),
    "",
    section("看房时必须确认", report.visitChecklist),
    "",
    "## 最终建议",
    report.finalAdvice,
  ];

  if (nextAction) {
    lines.push(
      "",
      "## 现在先做什么",
      `- 下一步：${nextAction.label}`,
      `- 原因：${nextAction.reason}`,
      `- 做到什么程度：${nextAction.doneCriteria}`,
      `- 付款底线：${nextAction.stopRule}`,
    );
  }

  if (gate) {
    lines.push(
      "",
      "## 付款/签约确认",
      `- 状态：${gate.label}`,
      `- 进度：${gate.progress}%`,
      `- 可付款：${gate.canPay ? "是" : "否"}`,
      `- 可签约：${gate.canSign ? "是" : "否"}`,
      `- 说明：${gate.summary}`,
    );
  }

  if (scripts.length) {
    lines.push("", "## 签约前沟通文本");
    scripts.forEach((script) => {
      lines.push(
        "",
        `### ${script.title}`,
        `- 使用场景：${script.scenario}`,
        `- 优先级：${script.priority}`,
        "",
        script.body,
      );
    });
  }

  if (warnings.length || preflightIssues.length) {
    lines.push("", "## 待补充信息与提醒");
    warnings.forEach((warning) => lines.push(`- ${warning}`));
    preflightIssues.forEach((warning) => lines.push(`- ${warning}`));
  }

  lines.push(
    "",
    "---",
    "本摘要由住哪儿根据用户主动输入、用户上传材料、公开查询和已保存记录整理。它用于租房辅助；官方查询、合同法律意见和现场看房仍需单独确认。",
  );

  return lines.filter((line, index, array) => !(line === "" && array[index - 1] === "")).join("\n");
}

export function reportMarkdownFilename(report: ReportData, generatedAt?: string) {
  const date = generatedAt ? generatedAt.slice(0, 10) : new Date().toISOString().slice(0, 10);
  const safeTitle = report.title
    .replace(/[\\/:*?"<>|]/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 40);

  return `住哪儿AI-房源评估-${safeTitle || "报告"}-${date}.md`;
}
