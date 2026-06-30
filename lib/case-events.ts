import type { ReportStatus } from "@/lib/mock-data";

export const caseEventTypes = [
  "plan",
  "city",
  "area",
  "commute",
  "life",
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
  plan: "当前行动",
  city: "生活成本",
  area: "片区初筛",
  commute: "通勤成本",
  life: "生活配套",
  visit: "看房核验",
  official: "官方核验",
  evidence: "材料清单",
  payment: "付款咨询",
  contract: "合同确认",
  safety: "独居安全",
  shared: "合租边界",
  move: "入住预算",
  handover: "交割确认",
  repair: "维修责任",
  renewal: "续租涨租",
  deposit: "押金退还",
};
