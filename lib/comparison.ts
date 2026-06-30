import type { ComparisonListing } from "@/lib/mock-data";
import type { CaseEvent } from "@/lib/case-events";
import { buildDecisionCases, type DecisionCase } from "@/lib/decision-case";
import type { StoredReport } from "@/lib/server/report-store";

const statusWeight = {
  recommend: 0,
  caution: 1,
  reject: 2,
};

const gateWeight = {
  ready: 0,
  review: 1,
  stop: 2,
};

const confidenceWeight = {
  ready: 0,
  review: 1,
  unknown: 1,
  limited: 2,
};

function firstUsefulText(items: string[] | undefined, fallback: string) {
  return items?.find(Boolean) ?? fallback;
}

function compactText(text: string, max = 42) {
  return text.length > max ? `${text.slice(0, max)}...` : text;
}

function parseMoney(value: string | undefined) {
  if (!value) return undefined;
  const match = value.replace(/,/g, "").match(/(\d{3,6})/);
  return match ? Number(match[1]) : undefined;
}

function parseCommuteMinutes(value: string | undefined) {
  if (!value) return undefined;
  const match = value.match(/(\d{1,3})\s*分钟/);
  return match ? Number(match[1]) : undefined;
}

function formatMoney(value: number) {
  return `${Math.round(value).toLocaleString("zh-CN")} 元/月`;
}

function inferTrueMonthlyCost(report: StoredReport) {
  const rent = report.inputSummary?.rent;
  const livingText = report.report.livingCost.points.join(" ");
  const costMatch = livingText.match(/(\d[\d,]*)\s*[-~到至]\s*(\d[\d,]*)\s*元/);

  if (costMatch) {
    const low = Number(costMatch[1].replace(/,/g, ""));
    const high = Number(costMatch[2].replace(/,/g, ""));
    return {
      label: `约 ${costMatch[1]}-${costMatch[2]} 元/月`,
      value: Math.round((low + high) / 2),
    };
  }

  const singleMatch = livingText.match(/(\d[\d,]*)\s*元/);
  if (singleMatch) {
    return {
      label: `约 ${singleMatch[1]} 元/月`,
      value: Number(singleMatch[1].replace(/,/g, "")),
    };
  }

  const rentValue = parseMoney(rent);
  return {
    label: rent ? `租金 ${rent}` : "待补充",
    value: rentValue,
  };
}

function inferRent(report: StoredReport) {
  const rent = report.inputSummary?.rent;
  if (rent) return /元|¥|￥/.test(rent) ? rent : `${rent} 元/月`;

  const text = report.report.livingCost.points.join(" ");
  const match = text.match(/(?:租金|月租金|月租)\D*(\d[\d,]*)\s*元/);
  return match ? `${match[1]} 元/月` : "待补充";
}

function inferCommute(report: StoredReport) {
  const text = firstUsefulText(report.report.commute.points, "待补充");
  const minutes = parseCommuteMinutes(text);
  return {
    label: minutes ? `${minutes} 分钟` : compactText(text, 24),
    minutes,
  };
}

function inferAmenities(report: StoredReport) {
  const text = firstUsefulText(report.report.amenities.points, "待补充");
  return compactText(text, 28);
}

function reasonFor(report: StoredReport) {
  if (report.report.status === "recommend") {
    return compactText(`优先考虑：${report.report.finalAdvice}`, 72);
  }
  if (report.report.status === "reject") {
    return compactText(`放后或淘汰：${report.report.finalAdvice}`, 72);
  }
  return compactText(`谨慎保留：${report.report.finalAdvice}`, 72);
}

function scoreTradeoff(report: StoredReport) {
  const scores = [...report.report.scores].sort((a, b) => b.score - a.score);
  const best = scores[0];
  const weakest = scores[scores.length - 1];

  if (!best || !weakest) return "等待更多评分维度后整理取舍解释。";
  return compactText(
    `优势是${best.label}（${best.score}），主要代价是${weakest.label}（${weakest.score}）。`,
    64,
  );
}

function confidenceTradeoff(caseItem: DecisionCase | undefined) {
  if (!caseItem) return undefined;
  if (caseItem.dataConfidence.level === "ready") {
    return `信息完整度 ${caseItem.dataConfidence.score}%：关键信息较完整，可进入签约前确认。`;
  }

  const gap = caseItem.dataConfidence.gaps[0];
  return compactText(
    `信息完整度 ${caseItem.dataConfidence.score || "-"}%：${gap ?? caseItem.dataConfidence.summary}`,
    72,
  );
}

function focusGate(caseItem: DecisionCase | undefined) {
  if (!caseItem) return undefined;
  return (
    caseItem.preSignGate.items.find((gate) => gate.state === "blocked") ??
    caseItem.preSignGate.items.find((gate) => gate.state === "pending" && gate.type !== "visit") ??
    caseItem.preSignGate.items.find((gate) => gate.state === "attention") ??
    caseItem.preSignGate.items.find((gate) => gate.state === "pending")
  );
}

function gateTradeoff(caseItem: DecisionCase | undefined) {
  if (!caseItem) return "签约前确认还没有真实记录。";
  if (caseItem.preSignGate.level === "ready") {
    return "签约前确认情况最好，可进入最后确认。";
  }
  if (caseItem.preSignGate.level === "review") {
    return "签约前仍有待确认事项，适合补充材料再继续。";
  }
  return "签约前仍有高风险，不适合被租金或通勤优势带着冲动决定。";
}

function monthlyDeltaLabel(value: number | undefined, lowest: number | undefined) {
  if (!value || !lowest) return "月成本待补充";
  const delta = value - lowest;
  if (Math.abs(delta) < 50) return "当前最低月成本";
  return `比最低月成本多 ${formatMoney(delta)}`;
}

function commuteDeltaLabel(minutes: number | undefined, fastest: number | undefined) {
  if (!minutes || !fastest) return "通勤差额待补充";
  const delta = minutes - fastest;
  if (delta <= 0) return "当前最快通勤";
  const monthlyHours = Math.round((delta * 2 * 22) / 60);
  return `比最快通勤多 ${delta} 分钟/单程，每月约多 ${monthlyHours} 小时`;
}

function decisionSummary({
  report,
  caseItem,
  monthlyCostDelta,
  commuteDelta,
}: {
  report: StoredReport;
  caseItem: DecisionCase | undefined;
  monthlyCostDelta: string;
  commuteDelta: string;
}) {
  if (caseItem?.preSignGate.level === "stop") {
    return compactText(
      `先确认：${focusGate(caseItem)?.reason ?? "付款、材料或官方查询还没有完成。"}`,
      96,
    );
  }
  if (report.report.status === "recommend") {
    return compactText(`可作为优先候选：${monthlyCostDelta}，${commuteDelta}。`, 88);
  }
  if (report.report.status === "reject") {
    return compactText(`建议淘汰或放后：${report.report.finalAdvice}`, 88);
  }
  return compactText(`谨慎保留：${monthlyCostDelta}，${commuteDelta}，签约前还要补充材料。`, 88);
}

function whyThisRank({
  report,
  caseItem,
  monthlyCostDelta,
  commuteDelta,
}: {
  report: StoredReport;
  caseItem: DecisionCase | undefined;
  monthlyCostDelta: string;
  commuteDelta: string;
}) {
  const scores = [...report.report.scores].sort((a, b) => b.score - a.score);
  const best = scores[0];
  const points = [
    `${report.report.status === "recommend" ? "结论可以继续" : report.report.status === "reject" ? "结论不建议租" : "结论需谨慎"}，总分 ${report.report.score}`,
    best ? `${best.label}表现最好（${best.score}）` : undefined,
    monthlyCostDelta,
    commuteDelta,
    gateTradeoff(caseItem),
  ].filter(Boolean) as string[];

  return points.slice(0, 5);
}

function giveUpList({
  report,
  caseItem,
  monthlyCostDelta,
  commuteDelta,
}: {
  report: StoredReport;
  caseItem: DecisionCase | undefined;
  monthlyCostDelta: string;
  commuteDelta: string;
}) {
  const scores = [...report.report.scores].sort((a, b) => a.score - b.score);
  const weakest = scores[0];
  const focus = focusGate(caseItem);
  const points = [
    weakest ? `主要代价：${weakest.label}只有 ${weakest.score}` : undefined,
    monthlyCostDelta.includes("多") ? monthlyCostDelta : undefined,
    commuteDelta.includes("多") ? commuteDelta : undefined,
    focus && focus.state !== "done" ? `当前卡点：${focus.label}` : undefined,
    report.report.status === "reject" ? "即使便宜，也不应覆盖硬风险。" : undefined,
  ].filter(Boolean) as string[];

  return points.slice(0, 4);
}

function compareReports(a: StoredReport, b: StoredReport, casesById: Map<string, DecisionCase>) {
  const statusDelta = statusWeight[a.report.status] - statusWeight[b.report.status];
  if (statusDelta !== 0) return statusDelta;

  const aCase = casesById.get(a.id);
  const bCase = casesById.get(b.id);
  const gateDelta =
    gateWeight[aCase?.preSignGate.level ?? "stop"] -
    gateWeight[bCase?.preSignGate.level ?? "stop"];
  if (gateDelta !== 0) return gateDelta;

  const confidenceDelta =
    confidenceWeight[aCase?.dataConfidence.level ?? "unknown"] -
    confidenceWeight[bCase?.dataConfidence.level ?? "unknown"];
  if (confidenceDelta !== 0) return confidenceDelta;

  return b.report.score - a.report.score;
}

export function buildComparisonListingsFromReports(
  reports: StoredReport[],
  events: CaseEvent[] = [],
): ComparisonListing[] {
  const casesById = new Map(
    buildDecisionCases(reports, events).map((caseItem) => [caseItem.id, caseItem]),
  );
  const inferred = reports.map((report) => ({
    report,
    trueMonthlyCost: inferTrueMonthlyCost(report),
    commute: inferCommute(report),
  }));
  const lowestCost = Math.min(
    ...inferred
      .map((item) => item.trueMonthlyCost.value)
      .filter((value): value is number => typeof value === "number"),
  );
  const fastestCommute = Math.min(
    ...inferred
      .map((item) => item.commute.minutes)
      .filter((value): value is number => typeof value === "number"),
  );
  const lowestCostValue = Number.isFinite(lowestCost) ? lowestCost : undefined;
  const fastestCommuteValue = Number.isFinite(fastestCommute) ? fastestCommute : undefined;

  return [...inferred]
    .map((item) => item.report)
    .sort((a, b) => compareReports(a, b, casesById))
    .map((report, index) => {
      const caseItem = casesById.get(report.id);
      const gate = focusGate(caseItem);
      const nextBestAction = caseItem?.nextBestAction;
      const trueMonthlyCost = inferTrueMonthlyCost(report);
      const commute = inferCommute(report);
      const monthlyCostDelta = monthlyDeltaLabel(
        trueMonthlyCost.value,
        lowestCostValue,
      );
      const commuteDelta = commuteDeltaLabel(commute.minutes, fastestCommuteValue);
      const blockers = [
        ...(caseItem?.dataConfidence.gaps ?? []).map((item) => `信息待补充：${item}`),
        ...(caseItem?.blockers ?? []),
        ...(caseItem?.evidenceGaps ?? []).map((item) => `待补充材料：${item}`),
        ...(gate && gate.state !== "done" ? [`签约前卡点：${gate.reason}`] : []),
      ];
      const tradeoff = [
        scoreTradeoff(report),
        confidenceTradeoff(caseItem),
        gateTradeoff(caseItem),
      ].filter(Boolean).join(" ");

      return {
        id: report.id,
        rank: index + 1,
        name: report.summary.title,
        rent: inferRent(report),
        trueMonthlyCost: trueMonthlyCost.label,
        trueMonthlyCostValue: trueMonthlyCost.value,
        area: report.inputSummary?.area || "待补充",
        commute: commute.label,
        commuteMinutes: commute.minutes,
        amenities: inferAmenities(report),
        risk: report.report.status,
        score: report.report.score,
        reason: reasonFor(report),
        href: `/report/${report.id}`,
        source: report.mode === "openai" ? "完整体检" : "快速体检",
        gateLevel: caseItem?.preSignGate.level,
        gateLabel: caseItem?.preSignGate.label,
        gateProgress: caseItem?.preSignGate.progress,
        canPay: caseItem?.preSignGate.canPay,
        canSign: caseItem?.preSignGate.canSign,
        confidenceLevel: caseItem?.dataConfidence.level,
        confidenceLabel: caseItem?.dataConfidence.label,
        confidenceScore: caseItem?.dataConfidence.score,
        confidenceSummary: caseItem?.dataConfidence.summary,
        confidenceGaps: caseItem?.dataConfidence.gaps.slice(0, 3),
        nextActionLabel: nextBestAction?.label ?? gate?.label,
        nextActionHref: nextBestAction?.href ?? gate?.href,
        tradeoff,
        blockers: blockers.slice(0, 3),
        monthlyCostDelta,
        commuteDelta,
        decisionSummary: decisionSummary({
          report,
          caseItem,
          monthlyCostDelta,
          commuteDelta,
        }),
        whyThisRank: whyThisRank({
          report,
          caseItem,
          monthlyCostDelta,
          commuteDelta,
        }),
        giveUp: giveUpList({
          report,
          caseItem,
          monthlyCostDelta,
          commuteDelta,
        }),
      };
    });
}
