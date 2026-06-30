import type { CaseEvent, CaseEventType } from "@/lib/case-events";
import type { ReportStatus } from "@/lib/mock-data";
import type { StoredReport } from "@/lib/server/report-store";

export type DecisionCasePriority = "blocker" | "required" | "recommended";
export type DecisionCaseGateLevel = "stop" | "review" | "ready";
export type DecisionCaseGateState = "done" | "attention" | "blocked" | "pending";

export type DecisionCaseAction = {
  label: string;
  href: string;
  priority: DecisionCasePriority;
  reason: string;
};

export type DecisionCaseNextBestAction = DecisionCaseAction & {
  intent: string;
  doneCriteria: string;
  stopRule: string;
};

export type DecisionCaseGateItem = {
  label: string;
  type: CaseEventType;
  state: DecisionCaseGateState;
  reason: string;
  href: string;
};

export type DecisionCaseGate = {
  level: DecisionCaseGateLevel;
  label: string;
  summary: string;
  progress: number;
  canPay: boolean;
  canSign: boolean;
  items: DecisionCaseGateItem[];
};

export type DecisionCaseLifecycleGate = {
  progress: number;
  completedCount: number;
  attentionCount: number;
  blockedCount: number;
  nextItem?: DecisionCaseGateItem;
  items: DecisionCaseGateItem[];
};

export type DecisionCaseDataConfidence = {
  level: "ready" | "review" | "limited" | "unknown";
  label: string;
  score: number;
  summary: string;
  gaps: string[];
  riskPrompts: string[];
  href: string;
};

export type DecisionCase = {
  id: string;
  title: string;
  address: string;
  status: ReportStatus;
  score: number;
  stage: string;
  stageNote: string;
  generatedAt: string;
  reportHref: string;
  dataMode: "openai" | "fallback";
  dataConfidence: DecisionCaseDataConfidence;
  dataGaps: string[];
  blockers: string[];
  evidenceGaps: string[];
  completedEvents: CaseEvent[];
  preSignGate: DecisionCaseGate;
  lifecycleGate: DecisionCaseLifecycleGate;
  nextBestAction: DecisionCaseNextBestAction;
  nextActions: DecisionCaseAction[];
};

function compactText(value: string, max = 86) {
  const text = value.replace(/\s+/g, " ").trim();
  return text.length > max ? `${text.slice(0, max)}...` : text;
}

function firstMatch(text: string, pattern: RegExp) {
  return pattern.test(text);
}

function normalizeVisibleCopy(value: string) {
  return value
    .replaceAll("报告可生成", "可以继续评估")
    .replaceAll("生成报告", "保存评估")
    .replaceAll("重新生成", "重新评估")
    .replaceAll("提交前信息确认", "提交前信息确认")
    .replaceAll("生成结果", "整理结果")
    .replaceAll("整理结果", "确认结果")
    .replaceAll("本工具", "这一步")
    .replaceAll("对应页面", "对应内容")
    .replaceAll("工具", "功能")
    .replaceAll("信息" + "已补", "信息完整度")
    .replaceAll("补充", "补充")
    .replaceAll("补充", "补充")
    .replaceAll("补充材料", "补充材料")
    .replaceAll("材料清单", "材料清单")
    .replaceAll("凭据记录", "材料记录")
    .replaceAll("待补充凭据", "待补充材料")
    .replaceAll("待补充信息", "待补充信息")
    .replaceAll("待补充材料", "待补充材料")
    .replaceAll("通勤信息待补充", "通勤信息待补充")
    .replaceAll("现金差额", "现金差额")
    .replaceAll("待补充项过大", "需要补充的材料太多")
    .replaceAll("待补充项较多", "需要补充的信息较多")
    .replaceAll("待补充项", "待补充信息")
    .replaceAll(`处理${"清单"}`, "确认事项")
    .replaceAll("下一步", "下一步")
    .replaceAll("可确认事项", "可确认事项")
    .replaceAll("确认事项", "确认事项")
    .replaceAll("处理" + "办法", "应对办法")
    .replaceAll("事项", "事项")
    .replaceAll("付款" + "底线", "付款咨询")
    .replaceAll("继续确认", "继续确认")
    .replaceAll("凭据", "材料")
    .replaceAll("已填写信息", "已填写信息")
    .replaceAll("高德" + " Web 服务未配置", "实时路线与周边生活信息暂不可用")
    .replaceAll("未配置 " + "OPENAI" + "_API_KEY", "截图与合同自动整理暂不可用")
    .replaceAll("周边生活信息", "周边生活信息")
    .replaceAll("周边生活信息", "周边生活信息")
    .replace(/\s+/g, " ")
    .replaceAll("周边生活信息 和", "周边生活信息和")
    .replaceAll("周边生活信息 会", "周边生活信息会")
    .trim();
}

function inferCity(report: StoredReport) {
  return report.inputSummary?.city || report.report.address.match(/([\u4e00-\u9fa5]{2,}市)/)?.[1] || "";
}

const flowParamLimits: Record<string, number> = {
  address: 56,
  candidateAreas: 88,
  commute: 48,
  concerns: 120,
  contractStatus: 96,
  deposit: 96,
  description: 64,
  landlordType: 80,
  lifestyle: 88,
  notes: 104,
  preferences: 88,
  reportContext: 72,
  risks: 120,
  title: 56,
  listingTitle: 56,
};

function compactFlowParam(key: string, value: string) {
  const max = flowParamLimits[key] ?? 160;
  const compacted = value.replace(/\s+/g, " ").trim();
  if (compacted.length <= max) return compacted;
  return `${compacted.slice(0, Math.max(0, max - 3))}...`;
}

function buildReportContext(report: StoredReport) {
  return [
    "记录摘要：",
    report.report.conclusion,
    report.report.commute.points[0],
    (report.report.lifeRadius?.points ?? report.report.amenities.points)[0],
    report.report.contractRisk.points[0],
    report.warnings?.[0],
  ]
    .filter(Boolean)
    .map((item) => compactText(String(item), 56))
    .join(" ");
}

function buildFlowHref(pathname: string, report: StoredReport, extra?: Record<string, string>) {
  const rawParams: Record<string, string> = {
    from: "case",
    reportId: report.id,
    title: report.report.title,
    city: inferCity(report),
    address: report.report.address,
    reportContext: buildReportContext(report),
    ...(extra ?? {}),
  };

  const params = new URLSearchParams();
  Object.entries(rawParams).forEach(([key, value]) => {
    if (!value) return;
    params.set(key, compactFlowParam(key, value));
  });

  return `${pathname}?${params.toString()}`;
}

function buildDataConfidence(report: StoredReport): DecisionCaseDataConfidence {
  const preflight = report.analysisPreflight;
  if (!preflight) {
    const fallbackGaps = inferDataGaps(report);
    return {
      level: fallbackGaps.length ? "review" : "unknown",
      label: fallbackGaps.length ? "信息需再确认" : "未记录提交前信息确认",
      score: fallbackGaps.length ? 68 : 0,
      summary: fallbackGaps.length
        ? "这份报告来自较早版本，已根据数据不足项做谨慎提醒。"
        : "这份报告未记录提交前信息确认结果，建议回到评估页补充关键信息后重新评估。",
      gaps: fallbackGaps.length
        ? fallbackGaps.map(normalizeVisibleCopy)
        : ["缺少提交前信息确认记录，无法确认关键信息是否充足。"],
      riskPrompts: [],
      href: `/report/${report.id}`,
    };
  }

  return {
    level: preflight.level,
    label: preflight.label,
    score: preflight.score,
    summary: normalizeVisibleCopy(preflight.description),
    gaps: [
      ...preflight.missingCritical,
      ...preflight.degradation,
      ...preflight.missingUseful,
    ].map(normalizeVisibleCopy).slice(0, 5),
    riskPrompts: preflight.riskPrompts.map(normalizeVisibleCopy).slice(0, 5),
    href: `/report/${report.id}#confidence`,
  };
}

function stageFor(report: StoredReport) {
  const status = report.report.status;
  const confidence = buildDataConfidence(report);

  if (confidence.level === "limited") {
    return {
      stage: "信息待补充",
      note: "这份报告的关键信息或数据来源还不够完整，只适合作为问题清单。补充地址、收入、楼层或授权材料，再决定是否继续。",
    };
  }
  if (confidence.level === "review") {
    return {
      stage: "补充信息再判断",
      note: "报告可以参考，但部分结论需要谨慎看待。优补充信息不足处和现场确认项，再进入付款或签约判断。",
    };
  }

  if (status === "recommend") {
    return {
      stage: "可以继续，补充材料",
      note: "评分较高，但付款和签约前仍要补充现场、官方和材料事项。",
    };
  }
  if (status === "reject") {
    return {
      stage: "不建议继续",
      note: "当前风险或成本偏高，除非关键风险被书面解决，否则不要付款。",
    };
  }
  return {
    stage: "谨慎继续",
    note: "先把高风险项转成确认事项，不要被催付节奏带走。",
  };
}

function inferEvidenceGaps(report: StoredReport) {
  const text = [
    report.report.conclusion,
    ...report.report.contractRisk.points,
    ...report.report.visitChecklist,
    ...(report.warnings ?? []),
  ].join(" ");
  const gaps = new Set<string>();

  if (firstMatch(text, /二房东|转租|授权|产权|房东身份|出租主体/)) {
    gaps.add("出租权、产权或转租授权证明");
  }
  if (firstMatch(text, /押金|定金|付款|收款|退款|服务费|中介费/)) {
    gaps.add("押金退还、付款备注、收款主体和退款条件");
  }
  if (firstMatch(text, /维修|家具|家电|旧损坏|交割|清单/)) {
    gaps.add("家具家电、旧损坏、维修责任和交割照片");
  }
  if (firstMatch(text, /潮湿|噪音|夜间|晚归|楼道|门禁|低楼层/)) {
    gaps.add("夜间路线、楼道门禁、潮湿噪音现场记录");
  }
  if (!gaps.size) {
    gaps.add("房东身份、押金条款、维修责任和水电表读数");
  }

  return Array.from(gaps).slice(0, 4);
}

function inferDataGaps(report: StoredReport) {
  const gaps = (report.dataQuality ?? [])
    .filter((item) => item.status !== "live")
    .map((item) => compactText(normalizeVisibleCopy(item.detail), 64));

  const preflight = report.analysisPreflight;
  const preflightGaps = preflight
      ? [
          ...preflight.missingCritical,
          ...preflight.degradation,
          ...preflight.missingUseful,
        ].map((item) => compactText(normalizeVisibleCopy(item), 70))
    : [];

  return Array.from(new Set([...preflightGaps, ...gaps])).slice(0, 5);
}

function inferBlockers(report: StoredReport) {
  const blockers = [
    ...(report.analysisPreflight?.level === "limited"
      ? ["提交前信息确认显示关键信息不足，当前更适合作为问题清单，不适合直接做签约判断。"]
      : []),
    ...(report.analysisPreflight?.degradation ?? []),
    ...(report.warnings ?? []),
    ...report.report.contractRisk.points,
    ...(report.report.lifeRadius?.points ?? []).filter((item) =>
      /短板|暂停|不足|风险|必须|未/.test(item),
    ),
  ].map((item) => compactText(normalizeVisibleCopy(item), 78));

  return Array.from(new Set(blockers)).slice(0, 4);
}

function inferContextualRiskSignals(report: StoredReport) {
  const riskText = [
    report.report.conclusion,
    report.report.address,
    ...report.report.visitChecklist,
    ...report.report.commute.points,
    ...(report.report.lifeRadius?.points ?? report.report.amenities.points),
    ...report.report.comfort.points,
    ...report.report.contractRisk.points,
    ...(report.warnings ?? []),
  ].join(" ");

  return {
    riskText,
    hasSafetyRisk:
      /独居|晚归|夜间|楼道|门禁|低楼层|窗户|安全|隐私|怕吵|潮湿/.test(riskText),
    hasSharedRisk:
      /合租|室友|公共空间|二房东|转租|押金连带|费用分摊|访客|公共卫生/.test(riskText),
  };
}

function scoreByLabel(report: StoredReport, pattern: RegExp) {
  return report.report.scores.find((item) => pattern.test(item.label))?.score;
}

function needsCommuteReview(report: StoredReport) {
  const commuteScore = scoreByLabel(report, /通勤/);
  const commuteText = [
    report.report.conclusion,
    ...report.report.commute.points,
    report.inputSummary?.commuteLimit ?? "",
  ].join(" ");

  return (
    (typeof commuteScore === "number" && commuteScore < 75) ||
    /超过|偏高|过长|不稳定|晚归|打车|换乘|雨天|坏天气|谨慎|风险|风险点|明显风险|暂停|疲惫|折损/.test(
      commuteText,
    )
  );
}

function needsLifeRadiusReview(report: StoredReport) {
  const lifeScore = scoreByLabel(report, /生活配套|配套/);
  const lifeText = [
    report.report.conclusion,
    ...(report.report.lifeRadius?.points ?? report.report.amenities.points),
    ...report.report.comfort.points,
  ].join(" ");

  return (
    (typeof lifeScore === "number" && lifeScore < 75) ||
    /短板|不足|不便|距离略远|晚归|夜间|噪音|潮湿|医疗|买菜|快递|菜场|谨慎|风险|风险点|明显风险|暂停/.test(
      lifeText,
    )
  );
}

function buildActions(
  report: StoredReport,
  completedTypes: Set<CaseEventType>,
  completedEvents: CaseEvent[],
): DecisionCaseAction[] {
  const status = report.report.status;
  const rent = report.inputSummary?.rent?.match(/\d+/)?.[0] ?? "0";
  const latestOfficial = latestEventByType(completedEvents, "official");
  const officialHardGateReady =
    isOfficialHardGateEvent(latestOfficial) && latestOfficial?.status === "recommend";
  const hasPaymentRisk = [
    report.report.conclusion,
    ...report.report.contractRisk.points,
    ...(report.warnings ?? []),
  ].some((item) => /付款|定金|押金|收款|退款|服务费|授权|合同/.test(item));
  const { hasSafetyRisk, hasSharedRisk } = inferContextualRiskSignals(report);
  const hasCommuteRisk = needsCommuteReview(report);
  const hasLifeRadiusRisk = needsLifeRadiusReview(report);

  const actions: DecisionCaseAction[] = [
    {
      label: "打开完整报告",
      href: `/report/${report.id}`,
      priority: "recommended",
      reason: "回看综合结论、评分、信息完整度和报告后的去处。",
    },
    {
      label: "更新当前行动",
      href: `/plan?reportId=${encodeURIComponent(report.id)}`,
      priority: completedTypes.has("plan") ? "recommended" : "required",
      reason: completedTypes.has("plan")
        ? "已把当前行动保存到记录；当时间压力、付款压力或材料清单变化时可重新整理。"
        : "把当前阶段、付款压力、材料清单和剩余时间整理成当前事项。",
    },
    {
      label: "筛选候选片区",
      href: buildFlowHref("/area", report, {
        workplace: report.inputSummary?.workplace ?? "",
        budget: report.inputSummary?.budget ?? "",
        commuteLimit: report.inputSummary?.commuteLimit ?? "",
        candidateAreas: report.inputSummary?.address || report.report.address,
      }),
      priority: completedTypes.has("area")
        ? "recommended"
        : status === "recommend"
          ? "recommended"
          : "required",
      reason: completedTypes.has("area")
        ? "已保存片区筛选，可回看优先约看、可以备选、暂不约看和第一片区判断。"
        : "先判断当前片区是否值得继续投入看房时间，再决定是否补同通勤圈替代片区。",
    },
    {
      label: "测算通勤真实成本",
      href: buildFlowHref("/commute", report, {
        listingTitle: report.report.title,
        workplace: report.inputSummary?.workplace ?? "",
        monthlyRent: rent,
        commuteLimitMinutes: report.inputSummary?.commuteLimit?.match(/\d+/)?.[0] ?? "",
      }),
      priority: completedTypes.has("commute")
        ? "recommended"
        : hasCommuteRisk
          ? "required"
          : "recommended",
      reason: completedTypes.has("commute")
        ? "已测算过通勤成本，可回看时间、现金和晚归兜底成本。"
        : "把单程分钟、步行、换乘、晚归打车和坏天气折算成真实月成本。",
    },
    {
      label: "确认生活配套",
      href: buildFlowHref("/life", report, {
        listingTitle: report.report.title,
        radiusMinutes: "15",
        lifestyle: report.inputSummary?.preferences?.join("、") ?? "",
        notes: (report.report.lifeRadius?.points ?? report.report.amenities.points)
          .slice(0, 2)
          .join("；"),
      }),
      priority: completedTypes.has("life")
        ? "recommended"
        : hasLifeRadiusRisk
          ? "required"
          : "recommended",
      reason: completedTypes.has("life")
        ? "已确认过生活配套，可回看买菜、医疗、快递、晚归和噪音短板。"
        : "把周边配套从地图热闹程度，转成下班后、生病时和周末是否真的好住。",
    },
    {
      label: "整理看房清单",
      href: buildFlowHref("/visit", report, {
        commute: report.report.commute.points[0] ?? "",
        description: report.report.conclusion.slice(0, 500),
      }),
      priority: completedTypes.has("visit") ? "recommended" : status === "recommend" ? "recommended" : "required",
      reason: completedTypes.has("visit")
        ? "已整理过现场确认事项，可继续补充或复查高优先级项目。"
        : "把潮湿、噪音、通勤和生活配套风险转成现场要测、要问、要拍。",
    },
    {
      label: "确认独居安全",
      href: buildFlowHref("/safety", report, {
        preferences: "独居、晚归、怕吵、怕潮湿",
        concerns: "夜间路线、门禁楼道、低楼层窗户、快递外卖和维修上门边界需要在签约前单独确认。",
      }),
      priority: completedTypes.has("safety")
        ? "recommended"
        : hasSafetyRisk
          ? "required"
          : "recommended",
      reason: completedTypes.has("safety")
        ? "已做过独居安全确认，可回看风险点和后续确认事项。"
        : "把夜路、门禁、楼道、低楼层、隐私和维修上门边界单独确认，避免仅依据白天看房印象判断安全。",
    },
    {
      label: "确认合租边界",
      href: buildFlowHref("/shared", report, {
        monthlyRent: rent,
        preferences: "合租、做饭、怕吵、养宠",
        concerns: "室友作息、公共空间、访客过夜、费用分摊、押金连带和转租授权需要付款前说清。",
      }),
      priority: completedTypes.has("shared")
        ? "recommended"
        : hasSharedRisk
          ? "required"
          : "recommended",
      reason: completedTypes.has("shared")
        ? "已做过合租边界确认，可回看高风险项和需要写清的约定。"
        : "低租金合租常被室友边界、公共空间和押金连带抵消，付款前先把规则写清楚。",
    },
    {
      label: "补充材料清单",
      href: buildFlowHref("/evidence", report, {
        stage: "签约前",
        landlordType: "房东/中介/转租授权待确认",
        deposit: `押金和付款方式待确认，参考月租 ${rent} 元`,
        risks: inferEvidenceGaps(report).join("；"),
      }),
      priority: completedTypes.has("evidence") ? "recommended" : "required",
      reason: completedTypes.has("evidence")
        ? "已整理过材料清单，可继续补充高优先级材料。"
        : "把授权、押金、维修、付款备注和交割记录集中补充。",
    },
    {
      label: "进入官方查询",
      href: buildFlowHref("/official", report, {
        stage: "签约前",
        landlordType: "出租主体待确认",
        contractStatus: "合同、授权和备案材料待确认",
    concerns: "出租权、备案办理办法、合同要求和收款主体需要先查清。",
      }),
      priority: officialHardGateReady ? "recommended" : "required",
      reason: officialHardGateReady
        ? "官方查询已逐项确认，后续只需保留截图、链接和出租方材料。"
        : completedTypes.has("official")
          ? "已整理官方查询步骤，但还要逐项确认重点材料。"
        : "官方入口能验证的事项应以可核验信息判断。",
    },
    {
      label: hasPaymentRisk ? "先做付款咨询" : "准备付款前再确认",
      href: buildFlowHref("/payment", report, {
        listingTitle: report.report.title,
        paymentType: "待确认付款",
        amount: String(Number(rent) > 0 ? Math.min(Math.round(Number(rent) * 0.2), 1000) : 0),
        monthlyRent: rent,
        stage: "不确定",
        contractStatus: "不确定",
        authorizationStatus: "未看到产权/转租授权",
        payeeType: "待确认",
        refundRule: "待确认",
        urgencyPressure: "如被催付，补充材料再付款",
      }),
      priority: completedTypes.has("payment")
        ? "recommended"
        : hasPaymentRisk || status !== "recommend"
          ? "blocker"
          : "recommended",
      reason: completedTypes.has("payment")
        ? "已经做了付款咨询，未解除待确认事项前不要转账。"
        : "定金、押金、服务费转出前先确认合同、授权、收款主体和退款条件。",
    },
    {
      label: "签约前合同确认",
      href: buildFlowHref("/contract", report),
      priority: completedTypes.has("contract")
        ? "recommended"
        : status === "reject"
          ? "blocker"
          : "required",
      reason: completedTypes.has("contract")
        ? "已做过合同确认，可继续用完整合同再次确认。"
        : "粘贴真实合同或聊天记录，识别押金、维修、提前退租和转租授权条款。",
    },
  ];

  return actions;
}

function latestEventByType(events: CaseEvent[], type: CaseEventType) {
  return events.find((event) => event.type === type);
}

function isOfficialHardGateEvent(event: CaseEvent | undefined) {
  return Boolean(event?.title.includes("官方查询必须确认"));
}

function gateStateFromEvent(event: CaseEvent | undefined): DecisionCaseGateState {
  if (!event) return "pending";
  if (event.status === "reject") return "blocked";
  if (event.status === "caution") return "attention";
  return "done";
}

function officialGateStateFromEvent(event: CaseEvent | undefined): DecisionCaseGateState {
  if (!event) return "pending";
  if (event.status === "reject") return "blocked";
  if (event.status === "caution") return "attention";
  return isOfficialHardGateEvent(event) ? "done" : "attention";
}

function gateReasonFromState({
  event,
  missing,
  attention,
  blocked,
  done,
}: {
  event?: CaseEvent;
  missing: string;
  attention: string;
  blocked: string;
  done: string;
}) {
  if (!event) return missing;
  if (event.status === "reject") return event.summary || blocked;
  if (event.status === "caution") return event.summary || attention;
  return event.summary || done;
}

function officialGateReasonFromEvent(event: CaseEvent | undefined) {
  if (!event) return "还没有做官方查询，出租权、备案办理办法和示范合同要求未确认。";
  if (event.status === "reject") return event.summary || "官方查询存在明显风险，不建议签约和付款。";
  if (event.status === "caution") return event.summary || "官方查询仍需补充材料，未解除前暂缓大额付款。";
  if (!isOfficialHardGateEvent(event)) {
    return "已整理官方查询步骤，但高优先级官方查询还没有逐项确认。先确认官方入口、出租权、备案办理办法、合同要求和付款主体，再进入付款或签约。";
  }
  return event.summary || "官方查询已经确认，继续补充材料并做付款咨询。";
}

function buildPreSignGate(
  report: StoredReport,
  completedEvents: CaseEvent[],
): DecisionCaseGate {
  const confidence = buildDataConfidence(report);
  const latest = {
    commute: latestEventByType(completedEvents, "commute"),
    life: latestEventByType(completedEvents, "life"),
    visit: latestEventByType(completedEvents, "visit"),
    safety: latestEventByType(completedEvents, "safety"),
    shared: latestEventByType(completedEvents, "shared"),
    official: latestEventByType(completedEvents, "official"),
    evidence: latestEventByType(completedEvents, "evidence"),
    payment: latestEventByType(completedEvents, "payment"),
    contract: latestEventByType(completedEvents, "contract"),
  };

  const visitHref = buildFlowHref("/visit", report, {
    commute: report.report.commute.points[0] ?? "",
    description: report.report.conclusion.slice(0, 500),
  });
  const commuteHref = buildFlowHref("/commute", report, {
    listingTitle: report.report.title,
    workplace: report.inputSummary?.workplace ?? "",
    monthlyRent: report.inputSummary?.rent?.match(/\d+/)?.[0] ?? "0",
    commuteLimitMinutes: report.inputSummary?.commuteLimit?.match(/\d+/)?.[0] ?? "",
  });
  const lifeHref = buildFlowHref("/life", report, {
    listingTitle: report.report.title,
    radiusMinutes: "15",
    lifestyle: report.inputSummary?.preferences?.join("、") ?? "",
    notes: (report.report.lifeRadius?.points ?? report.report.amenities.points)
      .slice(0, 2)
      .join("；"),
  });
  const officialHref = buildFlowHref("/official", report, {
    stage: "签约前",
    landlordType: "出租主体待确认",
    contractStatus: "合同、授权和备案材料待确认",
    concerns: "出租权、备案办理办法、合同要求和收款主体需要先查清。",
  });
  const evidenceHref = buildFlowHref("/evidence", report, {
    stage: "签约前",
    landlordType: "房东/中介/转租授权待确认",
    deposit: "押金和付款方式待确认",
    risks: inferEvidenceGaps(report).join("；"),
  });
  const paymentHref = buildFlowHref("/payment", report, {
    listingTitle: report.report.title,
    paymentType: "待确认付款",
    amount: "0",
    monthlyRent: report.inputSummary?.rent?.match(/\d+/)?.[0] ?? "0",
    stage: "不确定",
    contractStatus: "不确定",
    authorizationStatus: "未看到产权/转租授权",
    payeeType: "待确认",
    refundRule: "待确认",
    urgencyPressure: "如被催付，补充材料再付款",
  });
  const contractHref = buildFlowHref("/contract", report);
  const { hasSafetyRisk, hasSharedRisk } = inferContextualRiskSignals(report);
  const hasCommuteRisk = needsCommuteReview(report);
  const hasLifeRadiusRisk = needsLifeRadiusReview(report);
  const contextualRiskItems: DecisionCaseGateItem[] = [];
  const upstreamReviewItems: DecisionCaseGateItem[] = [];

  if (hasCommuteRisk || latest.commute) {
    upstreamReviewItems.push({
      label: "通勤成本",
      type: "commute",
      state: gateStateFromEvent(latest.commute),
      reason: gateReasonFromState({
        event: latest.commute,
        missing:
          "报告已提示通勤可能影响长期稳定性，但还没有把单程时间、换乘、晚归和坏天气折算成真实月成本。",
        attention:
          "通勤测算仍需再确认，先确认晚高峰、步行、换乘、晚归打车和坏天气兜底。",
        blocked:
          "通勤真实成本已经触发高风险，不建议在未改变通勤方案前继续。",
        done:
          "通勤真实成本已形成取舍判断，可带到现场确认和多房源对比。",
      }),
      href: commuteHref,
    });
  }

  if (hasLifeRadiusRisk || latest.life) {
    upstreamReviewItems.push({
      label: "生活配套",
      type: "life",
      state: gateStateFromEvent(latest.life),
      reason: gateReasonFromState({
        event: latest.life,
        missing:
          "报告已提示生活配套或居住舒适度短板，但还没有检查买菜、医疗、快递、夜间补给和噪音。",
        attention:
          "生活配套确认仍需再确认，先确认下班后补给、生病买药、快递隐私、晚归路线和噪音源。",
        blocked:
          "生活配套确认显示长期好住性不足，不建议在未解决核心短板前继续。",
        done:
          "生活配套已形成长期居住判断，可带到再次看房和签约前取舍。",
      }),
      href: lifeHref,
    });
  }

  if (hasSafetyRisk) {
    contextualRiskItems.push({
      label: "独居安全",
      type: "safety",
      state: gateStateFromEvent(latest.safety),
      reason: gateReasonFromState({
        event: latest.safety,
        missing:
          "报告触发独居、晚归、低楼层、门禁楼道、隐私或潮湿噪音等安全场景，但还没有做独居安全确认。",
        attention:
          "独居安全确认仍有风险点或待确认事项，先确认夜路、门禁楼道、低楼层窗户和维修上门边界，再考虑付款。",
        blocked:
          "独居安全确认显示不建议继续，除非关键风险点被现场和书面材料确认，否则不要付款或签约。",
        done:
          "独居安全确认已通过或形成可直接核对的确认事项，继续保留夜间路线、门禁和上门维修边界记录。",
      }),
      href: buildFlowHref("/safety", report, {
        preferences: "独居、晚归、怕吵、怕潮湿",
        concerns:
          "夜间路线、门禁楼道、低楼层窗户、快递外卖和维修上门边界需要在签约前单独确认。",
      }),
    });
  }

  if (hasSharedRisk) {
    contextualRiskItems.push({
      label: "合租边界",
      type: "shared",
      state: gateStateFromEvent(latest.shared),
      reason: gateReasonFromState({
        event: latest.shared,
        missing:
          "报告触发合租、室友、公共空间、二房东、转租或押金连带场景，但还没有做合租边界确认。",
        attention:
          "合租边界仍有高风险项，先把室友作息、公共空间、访客过夜、费用分摊和押金责任写清楚。",
        blocked:
          "合租边界确认显示不建议继续，公共空间、押金连带或转租授权未确认前不要付款或签约。",
        done:
          "合租边界确认已形成能写进约定的规则，继续把室友、费用、押金和转租授权写进补充确认。",
      }),
      href: buildFlowHref("/shared", report, {
        monthlyRent: report.inputSummary?.rent?.match(/\d+/)?.[0] ?? "0",
        preferences: "合租、做饭、怕吵、养宠",
        concerns:
          "室友作息、公共空间、访客过夜、费用分摊、押金连带和转租授权需要付款前说清。",
      }),
    });
  }

  const items: DecisionCaseGateItem[] = [
    ...upstreamReviewItems,
    {
      label: "现场确认",
      type: "visit",
      state: gateStateFromEvent(latest.visit),
      reason: gateReasonFromState({
        event: latest.visit,
        missing: "还没有整理看房清单，潮湿、噪音、夜路和生活配套仍未现场验证。",
        attention: "看房清单存在未解除提醒，付款前应补充现场记录。",
        blocked: "看房清单发现高风险情况，不建议付款。",
        done: "现场确认已保存，继续按材料和合同做确认。",
      }),
      href: visitHref,
    },
    ...contextualRiskItems,
    {
      label: "官方查询",
      type: "official",
      state: officialGateStateFromEvent(latest.official),
      reason: officialGateReasonFromEvent(latest.official),
      href: officialHref,
    },
    {
      label: "材料清单",
      type: "evidence",
      state: gateStateFromEvent(latest.evidence),
      reason: gateReasonFromState({
        event: latest.evidence,
        missing: "还没有材料清单，授权、押金、维修和交割记录还没有形成最小清单。",
        attention: "材料清单里仍有高优先级内容待补充，补充再谈付款。",
        blocked: "需要补充的材料清单太多，不适合继续付款或签约。",
        done: "核心材料已形成清单，继续确认付款条件和合同条款。",
      }),
      href: evidenceHref,
    },
    {
      label: "付款咨询",
      type: "payment",
      state: gateStateFromEvent(latest.payment),
      reason: gateReasonFromState({
        event: latest.payment,
        missing: "还没有做付款咨询，定金、押金、服务费和收款主体风险未判断。",
        attention: "付款条件只适合谨慎小额，仍需补充收款主体、退款条件或收据。",
        blocked: "付款咨询提示不建议付款，不能先转账后补充材料。",
        done: "付款条件基本可控，但仍要保留备注、收据和授权链。",
      }),
      href: paymentHref,
    },
    {
      label: "合同确认",
      type: "contract",
      state: gateStateFromEvent(latest.contract),
      reason: gateReasonFromState({
        event: latest.contract,
        missing: "还没有确认真实合同，押金、维修、提前退租和转租授权条款未确认。",
        attention: "合同仍有中风险条款，签约前应先改条款或补充协议。",
        blocked: "合同确认提示高风险条款，先改合同再考虑签约。",
        done: "合同风险可控，可以结合付款和材料状态决定是否继续。",
      }),
      href: contractHref,
    },
  ];

  if (confidence.level === "limited") {
    items.unshift({
      label: "信息完整度",
      type: "visit",
      state: "blocked",
      reason: "提交前信息确认显示关键信息或数据来源还不够完整。补充地址、收入、楼层、授权或现场记录，再决定是否付款或签约。",
      href: confidence.href,
    });
  } else if (confidence.level === "review") {
    items.unshift({
      label: "信息完整度",
      type: "visit",
      state: "attention",
      reason: "报告可参考，但部分结论需要谨慎看待。先确认提交前待补充信息，再进入付款咨询或合同确认。",
      href: confidence.href,
    });
  }

  if (report.report.status === "reject") {
    items.unshift({
      label: "房源体检",
      type: "visit",
      state: "blocked",
      reason: "房源体检结论是不建议租。除非关键风险被书面解决，否则不要付款或签约。",
      href: `/report/${report.id}`,
    });
  }

  const completedScore = items.reduce((total, item) => {
    if (item.state === "done") return total + 1;
    if (item.state === "attention") return total + 0.5;
    return total;
  }, 0);
  const progress = Math.round((completedScore / items.length) * 100);
  const hasBlocked = items.some((item) => item.state === "blocked");
  const missingHardGate = items.some(
    (item) =>
      (item.state === "pending" &&
        ["safety", "shared", "official", "evidence", "payment", "contract"].includes(
          item.type,
        )) ||
      (item.type === "official" && item.state !== "done"),
  );
  const hasAttention = items.some((item) => item.state === "attention");
  const contextualRiskReady =
    (!hasSafetyRisk || latest.safety?.status === "recommend") &&
    (!hasSharedRisk || latest.shared?.status === "recommend");
  const upstreamRiskReady =
    (!hasCommuteRisk && latest.commute?.status !== "reject") ||
    latest.commute?.status === "recommend";
  const lifeRadiusReady =
    (!hasLifeRadiusRisk && latest.life?.status !== "reject") ||
    latest.life?.status === "recommend";
  const canPay =
    report.report.status !== "reject" &&
    isOfficialHardGateEvent(latest.official) &&
    latest.official?.status === "recommend" &&
    latest.evidence?.status === "recommend" &&
    latest.payment?.status === "recommend" &&
    contextualRiskReady &&
    upstreamRiskReady &&
    lifeRadiusReady;
  const canSign = canPay && latest.contract?.status === "recommend";

  if (canSign) {
    return {
      level: "ready",
      label: "可进入签约前最后确认",
      summary: "官方查询、材料、付款和合同都已确认，仍需在签约当天再次确认原件、收据和交割清单。",
      progress,
      canPay,
      canSign,
      items,
    };
  }

  if (hasBlocked || missingHardGate || report.report.status === "reject") {
    return {
      level: "stop",
      label: "不建议付款和签约",
      summary: "关键确认、材料、付款或合同还没有确认清楚。现在最重要的是补充材料，暂不跟随催付节奏。",
      progress,
      canPay,
      canSign,
      items,
    };
  }

  return {
    level: "review",
    label: hasAttention ? "补充材料后再继续" : "可以小步继续",
    summary: hasAttention
      ? "已有判断结果，但仍有中风险提醒。补充高优先级材料，再决定是否小额付款或签约。"
      : "基础确认已经开始，但签约前仍要把合同和材料确认清楚。",
    progress,
    canPay,
    canSign,
    items,
  };
}

function buildLifecycleGate(
  report: StoredReport,
  completedEvents: CaseEvent[],
): DecisionCaseLifecycleGate {
  const rent = report.inputSummary?.rent?.match(/\d+/)?.[0] ?? "0";
  const latest = {
    move: latestEventByType(completedEvents, "move"),
    handover: latestEventByType(completedEvents, "handover"),
    repair: latestEventByType(completedEvents, "repair"),
    renewal: latestEventByType(completedEvents, "renewal"),
    deposit: latestEventByType(completedEvents, "deposit"),
  };

  const items: DecisionCaseGateItem[] = [
    {
      label: "入住预算",
      type: "move",
      state: gateStateFromEvent(latest.move),
      reason: gateReasonFromState({
        event: latest.move,
        missing: "还没有测算签约后的首笔支出、搬家费和现金安全垫，容易低估入住第一个月压力。",
        attention: "入住预算仍有压力，先确认首付月数、搬家费、临时住宿和备用金。",
        blocked: "入住预算已经触发高风险，不建议继续付款，优先改谈付款节奏。",
        done: "入住预算已形成能直接参考的预算，继续在交割当天固定记录。",
      }),
      href: buildFlowHref("/move", report, {
        monthlyRent: rent,
        listingTitle: report.report.title,
      }),
    },
    {
      label: "交割确认",
      type: "handover",
      state: gateStateFromEvent(latest.handover),
      reason: gateReasonFromState({
        event: latest.handover,
        missing: "还没有做交割确认，钥匙、表读数、旧损坏、历史欠费和家具家电状态都需要保存记录。",
        attention: "交割仍有未确认项，入住前补充拍旧损坏、表读数和欠费证明。",
        blocked: "交割存在明显风险，暂不签收或确认入住无争议。",
        done: "交割记录已形成清单，可继续记录维修责任和后续争议。",
      }),
      href: buildFlowHref("/handover", report, {
        monthlyRent: rent,
        depositAmount: rent,
        listingTitle: report.report.title,
      }),
    },
    {
      label: "维修责任",
      type: "repair",
      state: gateStateFromEvent(latest.repair),
      reason: gateReasonFromState({
        event: latest.repair,
        missing: "还没有记录入住后的维修责任边界，漏水、发霉、家电故障和垫付费用容易变成争议。",
        attention: "维修责任仍需补充材料，先保留报修记录、照片视频和费用确认。",
        blocked: "维修责任判断偏高风险，暂不自行垫付大额维修费。",
        done: "维修责任判断方式已记录，可作为后续续租或退租谈判依据。",
      }),
      href: buildFlowHref("/repair", report, {
        listingTitle: report.report.title,
        evidenceLevel: "部分材料",
        depositConcern: "担心退租时从押金扣",
      }),
    },
    {
      label: "续租涨租",
      type: "renewal",
      state: gateStateFromEvent(latest.renewal),
      reason: gateReasonFromState({
        event: latest.renewal,
        missing: "还没有计算续租上限、搬家成本和可接受涨幅，涨租时容易只看月租差额。",
        attention: "续租需要谨慎谈判，先明确可接受涨幅、搬家回本月数和替代房源。",
        blocked: "续租方案不划算或风险过高，优先准备搬家备选。",
        done: "续租可接受条件已记录，接下来可以继续确认押金和退租材料。",
      }),
      href: buildFlowHref("/renewal", report, {
        currentRent: rent,
        listingTitle: report.report.title,
      }),
    },
    {
      label: "押金退还",
      type: "deposit",
      state: gateStateFromEvent(latest.deposit),
      reason: gateReasonFromState({
        event: latest.deposit,
        missing: "还没有拆解退租押金、返还期限和可争议扣款，退租前需要提前准备材料。",
        attention: "押金退还仍有不确定项，补充交割照片、聊天记录和费用清单。",
        blocked: "押金扣款争议风险高，先按材料清单和返还期限沟通。",
        done: "押金退还办法已记录，这套房的入住退租办法已经说明清楚。",
      }),
      href: buildFlowHref("/deposit", report, {
        monthlyRent: rent,
        depositAmount: rent,
        evidenceLevel: "部分材料",
      }),
    },
  ];

  const completedScore = items.reduce((total, item) => {
    if (item.state === "done") return total + 1;
    if (item.state === "attention") return total + 0.5;
    return total;
  }, 0);

  return {
    progress: Math.round((completedScore / items.length) * 100),
    completedCount: items.filter((item) => item.state === "done").length,
    attentionCount: items.filter((item) => item.state === "attention").length,
    blockedCount: items.filter((item) => item.state === "blocked").length,
    nextItem:
      items.find((item) => item.state === "blocked") ??
      items.find((item) => item.state === "attention") ??
      items.find((item) => item.state === "pending"),
    items,
  };
}

function priorityFromGateState(state: DecisionCaseGateState): DecisionCasePriority {
  if (state === "blocked") return "blocker";
  if (state === "pending" || state === "attention") return "required";
  return "recommended";
}

function buildNextBestAction({
  report,
  dataConfidence,
  preSignGate,
  lifecycleGate,
  nextActions,
}: {
  report: StoredReport;
  dataConfidence: DecisionCaseDataConfidence;
  preSignGate: DecisionCaseGate;
  lifecycleGate: DecisionCaseLifecycleGate;
  nextActions: DecisionCaseAction[];
}): DecisionCaseNextBestAction {
  const urgentLifecycleGate =
    lifecycleGate.items.find((item) => item.state === "blocked") ??
    lifecycleGate.items.find((item) => item.state === "attention");

  if (urgentLifecycleGate) {
    const priority = priorityFromGateState(urgentLifecycleGate.state);
    return {
      label: `先确认${urgentLifecycleGate.label}`,
      href: urgentLifecycleGate.href,
      priority,
      reason: urgentLifecycleGate.reason,
      intent:
        priority === "blocker"
          ? "先解除入住后已经出现的真实现金或材料风险。"
          : "把入住后的争议点整理成可保存材料、可继续确认的结果。",
      doneCriteria: `${urgentLifecycleGate.label}结果已保存到房源记录，高风险或待补充材料已经说明清楚。`,
      stopRule:
        priority === "blocker"
          ? "该项未解除前，不确认无争议、不补付费用、不先垫付大额支出，也不签署放弃追偿文本。"
          : "该项未补充前，暂缓不可逆付款、无争议确认或放弃押金/维修追偿事项。",
    };
  }

  if (report.report.status === "reject") {
    return {
      label: "回看淘汰原因",
      href: `/report/${report.id}`,
      priority: "blocker",
      reason: "房源体检结论是不建议租。除非关键风险能被书面解决，否则不要继续付款或签约。",
      intent: "避免被低租金、稀缺感或催付节奏带着做决定。",
      doneCriteria: "确认关键风险是否能被书面解决；不能解决就从候选清单放后或淘汰。",
      stopRule: "在风险没有书面解除前，不转账、不签字、不交定金。",
    };
  }

  if (dataConfidence.level === "limited") {
    return {
      label: "补充关键信息",
      href: dataConfidence.href,
      priority: "blocker",
      reason: dataConfidence.summary,
      intent: "先把报告从问题清单变成可继续判断的依据。",
      doneCriteria: "补充地址、收入、楼层、授权、现场记录等关键信息后重新评估或再次确认报告。",
      stopRule: "信息不足的评估不能作为付款或签约依据。",
    };
  }

  const blockingGate =
    preSignGate.items.find((item) => item.state === "blocked") ??
    preSignGate.items.find(
      (item) =>
        item.state === "pending" &&
        ["safety", "shared", "official", "evidence", "payment", "contract"].includes(
          item.type,
        ),
    ) ??
    preSignGate.items.find((item) => item.state === "attention") ??
    preSignGate.items.find((item) => item.state === "pending");

  if (blockingGate) {
    const priority = priorityFromGateState(blockingGate.state);
    return {
      label: `先确认${blockingGate.label}`,
      href: blockingGate.href,
      priority,
      reason: blockingGate.reason,
      intent:
        priority === "blocker"
          ? "先解除会影响付款或签约的硬风险。"
          : "把签约前必做事项整理成可保存结果。",
      doneCriteria: `${blockingGate.label}结果已保存到房源记录，不再是还没确认或高风险。`,
      stopRule:
        priority === "blocker"
          ? "该项未解除前，不付款、不签约。"
          : "这项还没确认前，暂缓不可逆付款或签字事项。",
    };
  }

  if (preSignGate.canSign && lifecycleGate.nextItem) {
    return {
      label: `入住准备：${lifecycleGate.nextItem.label}`,
      href: lifecycleGate.nextItem.href,
      priority: priorityFromGateState(lifecycleGate.nextItem.state),
      reason: lifecycleGate.nextItem.reason,
      intent: "签约前确认已通过，把注意力切到入住、交割和后续押金风险。",
      doneCriteria: `${lifecycleGate.nextItem.label}整理结果并保存到房源记录。`,
      stopRule: "签约当天仍要再次确认原件、收款主体、收据和交割清单。",
    };
  }

  const fallbackAction =
    nextActions.find((action) => action.priority === "blocker") ??
    nextActions.find((action) => action.priority === "required") ??
    nextActions[0];

  return {
    label: fallbackAction?.label ?? "回看完整报告",
    href: fallbackAction?.href ?? `/report/${report.id}`,
    priority: fallbackAction?.priority ?? "recommended",
    reason: fallbackAction?.reason ?? "回看综合结论、评分、信息完整度和报告后的去处。",
    intent: "继续确认这套候选房源的下一项事项。",
    doneCriteria: "确认后查看判断是否需要更新。",
    stopRule: "任何付款或签约事项都必须先满足官方查询、材料、付款和合同确认。",
  };
}

export function buildDecisionCases(
  reports: StoredReport[],
  events: CaseEvent[] = [],
): DecisionCase[] {
  return reports.map((report) => {
    const stage = stageFor(report);
    const dataConfidence = buildDataConfidence(report);
    const completedEvents = events
      .filter((event) => event.reportId === report.id)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const completedTypes = new Set(completedEvents.map((event) => event.type));
    const preSignGate = buildPreSignGate(report, completedEvents);
    const lifecycleGate = buildLifecycleGate(report, completedEvents);
    const nextActions = buildActions(report, completedTypes, completedEvents);

    return {
      id: report.id,
      title: report.summary.title,
      address: report.summary.address,
      status: report.summary.status,
      score: report.summary.score,
      generatedAt: report.generatedAt,
      reportHref: `/report/${report.id}`,
      dataMode: report.mode,
      dataConfidence,
      stage: stage.stage,
      stageNote: stage.note,
      dataGaps: inferDataGaps(report),
      blockers: inferBlockers(report),
      evidenceGaps: inferEvidenceGaps(report),
      completedEvents,
      preSignGate,
      lifecycleGate,
      nextBestAction: buildNextBestAction({
        report,
        dataConfidence,
        preSignGate,
        lifecycleGate,
        nextActions,
      }),
      nextActions,
    };
  });
}
