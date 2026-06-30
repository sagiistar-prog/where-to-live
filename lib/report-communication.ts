import type { DecisionCase } from "@/lib/decision-case";
import type { ReportData } from "@/lib/mock-data";

export type ReportCommunicationScript = {
  id: string;
  title: string;
  scenario: string;
  priority: "必须先发" | "建议发送" | "看情况";
  body: string;
};

function firstItems(items: string[], count: number) {
  return items.filter(Boolean).slice(0, count);
}

function compactLine(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function riskDigest(report: ReportData, decisionCase?: DecisionCase) {
  const gateItems = decisionCase?.preSignGate.items
    .filter((item) => item.state !== "done")
    .map((item) => `${item.label}：${item.reason}`) ?? [];
  const reportRisks = [
    ...report.contractRisk.points,
    ...report.comfort.points,
    ...(report.lifeRadius?.points ?? []),
  ];

  return firstItems([...gateItems, ...reportRisks].map(compactLine), 4);
}

function visitFocus(report: ReportData) {
  return firstItems(
    [
      ...report.commute.points,
      ...(report.lifeRadius?.points ?? report.amenities.points),
      ...report.comfort.points,
      ...report.visitChecklist,
    ].map(compactLine),
    5,
  );
}

export function buildReportCommunicationScripts(
  report: ReportData,
  decisionCase?: DecisionCase,
): ReportCommunicationScript[] {
  const risks = riskDigest(report, decisionCase);
  const focus = visitFocus(report);
  const nextAction = decisionCase?.nextBestAction;
  const hardGate = decisionCase?.preSignGate;
  const title = report.title;
  const riskLines = risks.length
    ? risks.map((item, index) => `${index + 1}. ${item}`).join("\n")
    : "1. 出租权、完整合同、押金退还、维修责任和收款主体仍需确认。";
  const focusLines = focus.map((item, index) => `${index + 1}. ${item}`).join("\n");

  return [
    {
      id: "materials",
      title: "材料补充请求",
      scenario: "对方催你继续决定，但授权、合同或押金规则还没齐",
      priority: "必须先发",
      body: [
        `你好，我这边对「${title}」还有兴趣，但付款或签约前需要先把关键材料确认完整。`,
        "",
        "麻烦补充这些信息：",
        riskLines,
        "",
        "我确认材料后再决定是否继续看房/付款。为避免后续误会，麻烦尽量用文字或可截图留存的方式回复。",
      ].join("\n"),
    },
    {
      id: "pause-payment",
      title: "暂不付款说明",
      scenario: "被要求先交定金、意向金、押金或服务费",
      priority: hardGate?.canPay ? "看情况" : "必须先发",
      body: [
        "你好，目前我还没有看到完整合同、出租/转租授权、收款主体和退款规则，所以现在不能先付款。",
        "",
        "如果后续要支付任何定金、押金、服务费或租金，我需要先确认：",
        "1. 收款人和合同主体是否一致；",
        "2. 付款用途、房源地址、租期和金额能否写进备注或收据；",
        "3. 未签约或材料不一致时是否可退，以及退款期限；",
        "4. 完整合同条款是否已经确认。",
        "",
        "这些确认完之前，暂不转账。",
      ].join("\n"),
    },
    {
      id: "revisit",
      title: "约再次看房清单",
      scenario: "白天看过但通勤、夜路、噪音、潮湿或生活配套还不确定",
      priority: "建议发送",
      body: [
        `你好，我想再约一次「${title}」再次看房，最好安排在工作日晚高峰后或晚上。`,
        "",
        "这次我主要想确认：",
        focusLines,
        "",
        "再次看房时我会拍照或记录现场情况，方便双方后续确认，避免签约后产生误会。",
      ].join("\n"),
    },
    {
      id: "contract",
      title: "合同条款确认",
      scenario: "准备要合同或补充协议，不想只听口头承诺",
      priority: "建议发送",
      body: [
        "你好，签约前麻烦先发完整合同文本，我需要提前确认以下条款：",
        "1. 押金金额、退还条件、返还期限和可扣款范围；",
        "2. 家具家电、漏水发霉、下水反味、门锁电器等维修责任；",
        "3. 提前退租、转租、换租和违约金规则；",
        "4. 物业费、水电燃气网费、中介费或服务费由谁承担；",
        "5. 出租人/转租人授权、收款主体和合同主体是否一致。",
        "",
        nextAction
          ? `我现在优先确认的是「${nextAction.label}」，确认清楚前不会进入签约。`
          : "这些确认前，我不会进入签约或付款。",
      ].join("\n"),
    },
  ];
}
