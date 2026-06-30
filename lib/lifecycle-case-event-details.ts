import type { DepositRefundResult } from "@/lib/deposit-refund";
import type { HandoverCheckResult } from "@/lib/handover-check";
import type { MoveBudgetResult } from "@/lib/move-budget";
import type { RenewalDecisionResult } from "@/lib/renewal-decision";
import type { RepairResponsibilityResult } from "@/lib/repair-responsibility";

type CaseEventDetails = {
  summary: string;
  highlights: string[];
};

function money(value: number) {
  return `${Math.round(value).toLocaleString()} 元`;
}

function percent(value: number) {
  return `${Math.round(value * 100)}%`;
}

function unique(items: Array<string | number | null | undefined>, max = 6) {
  return Array.from(
    new Set(
      items
        .filter((item): item is string | number => item !== null && item !== undefined)
        .map(String)
        .map((item) => item.replace(/\s+/g, " ").trim())
        .filter(Boolean),
    ),
  ).slice(0, max);
}

function appendSummary(summary: string, metrics: string[]) {
  return unique([summary, metrics.join("；")], 2).join(" ");
}

export function buildMoveCaseEventDetails(result: MoveBudgetResult): CaseEventDetails {
  return {
    summary: appendSummary(result.summary, [
      `首笔支出 ${money(result.upfrontCost)}`,
      `签约后剩余现金 ${money(result.cashAfterMove)}`,
      `安全垫 ${result.safetyMonths.toFixed(1)} 个月`,
    ]),
    highlights: unique([
      `首笔支出：${money(result.upfrontCost)}`,
      `签约后剩余现金：${money(result.cashAfterMove)}`,
      `安全垫：${result.safetyMonths.toFixed(1)} 个月`,
      `首月压力：${percent(result.firstMonthPressure)}`,
      ...result.risks,
      ...result.negotiationLevers,
      ...result.nextActions,
    ]),
  };
}

export function buildHandoverCaseEventDetails(result: HandoverCheckResult): CaseEventDetails {
  return {
    summary: appendSummary(result.summary, [
      `交割结论：${result.verdict}`,
      `押金 ${money(result.depositAmount)}`,
      `月租 ${money(result.monthlyRent)}`,
    ]),
    highlights: unique([
      `交割结论：${result.verdict}`,
      `押金：${money(result.depositAmount)}`,
      ...result.blockers,
      ...result.photoShotList,
      ...result.meterChecklist,
      ...result.nextActions,
    ]),
  };
}

export function buildRepairCaseEventDetails(result: RepairResponsibilityResult): CaseEventDetails {
  return {
    summary: appendSummary(result.summary, [
      `责任倾向：${result.responsibility}`,
      `预估费用 ${money(result.estimatedCost)}`,
      `建议：${result.verdict}`,
    ]),
    highlights: unique([
      `建议：${result.verdict}`,
      `责任倾向：${result.responsibility}`,
      `预估费用：${money(result.estimatedCost)}`,
      ...result.blockers,
      ...result.costControl,
      ...result.evidenceChecklist,
      ...result.nextActions,
    ]),
  };
}

export function buildRenewalCaseEventDetails(result: RenewalDecisionResult): CaseEventDetails {
  return {
    summary: appendSummary(result.summary, [
      `续租判断：${result.decision}`,
      `拟续租 ${money(result.proposedRent)}`,
      `可接受上限 ${money(result.maxAcceptableRent)}`,
      `涨幅 ${percent(result.rentIncreaseRate)}`,
    ]),
    highlights: unique([
      `续租判断：${result.decision}`,
      `当前租金：${money(result.currentRent)}`,
      `拟续租：${money(result.proposedRent)}`,
      `可接受上限：${money(result.maxAcceptableRent)}`,
      `搬家回本：${result.breakEvenMonths} 个月`,
      ...result.blockers,
      ...result.renewalChecklist,
      ...result.movePrepChecklist,
      ...result.nextActions,
    ]),
  };
}

export function buildDepositCaseEventDetails(result: DepositRefundResult): CaseEventDetails {
  return {
    summary: appendSummary(result.summary, [
      `目标返还 ${money(result.targetRefund)}`,
      `争议扣款 ${money(result.disputedDeduction)}`,
      `返还截止：${result.returnDeadlineText}`,
    ]),
    highlights: unique([
      `押金总额：${money(result.depositAmount)}`,
      `目标返还：${money(result.targetRefund)}`,
      `争议扣款：${money(result.disputedDeduction)}`,
      `建议最低退还：${money(result.suggestedRefundFloor)}`,
      `返还截止：${result.returnDeadlineText}`,
      ...result.risks,
      ...result.evidenceChecklist,
      ...result.nextActions,
    ]),
  };
}
