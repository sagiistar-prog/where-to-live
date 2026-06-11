import type { ReportStatus } from "@/lib/mock-data";

export const caseEventTypes = [
  "plan",
  "city",
  "area",
  "commute",
  "life",
  "buy",
  "visit",
  "official",
  "evidence",
  "payment",
  "contract",
  "safety",
  "shared",
  "move",
  "handover",
  "repair",
  "renewal",
  "deposit",
] as const;

export type CaseEventType = (typeof caseEventTypes)[number];

export type CaseEvent = {
  id: string;
  ownerId?: string;
  reportId: string;
  type: CaseEventType;
  title: string;
  status: ReportStatus;
  summary: string;
  highlights: string[];
  href?: string;
  createdAt: string;
};

export type CreateCaseEventInput = {
  reportId: string;
  type: CaseEventType;
  title: string;
  status: ReportStatus;
  summary: string;
  highlights?: string[];
  href?: string;
};

export const caseEventLabels: Record<CaseEventType, string> = {
  plan: "下一步",
  city: "城市成本",
  area: "片区筛选",
  commute: "通勤成本",
  life: "生活配套",
  buy: "买房压力",
  visit: "看房清单",
  official: "官方查询",
  evidence: "凭据材料",
  payment: "付款前确认",
  contract: "合同确认",
  safety: "独居安全",
  shared: "合租规则",
  move: "入住预算",
  handover: "交割确认",
  repair: "维修责任",
  renewal: "续租涨租",
  deposit: "押金退还",
};
