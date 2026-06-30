import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  normalizeGeneratedReportPayload,
  normalizeVisibleReportCopy,
  type GeneratedReportPayload,
} from "@/lib/report-builder";
import type { ListingAnalysisInput } from "@/lib/report-builder";
import type { ReportData } from "@/lib/mock-data";
import { localGuestOwnerId } from "@/lib/server/current-owner";
import { parseJsonText } from "@/lib/server/json-utils";

export type StoredReport = GeneratedReportPayload & {
  id: string;
  ownerId?: string;
  inputSummary?: {
    rent?: string;
    area?: string;
    floor?: string;
    address?: string;
    city?: string;
    workplace?: string;
    budget?: string;
    commuteLimit?: string;
    source?: string;
    sourceReportId?: string;
    reportContext?: string;
    preferences: string[];
  };
  summary: {
    title: string;
    address: string;
    score: number;
    status: ReportData["status"];
    conclusion: string;
  };
};

const dataDir = path.join(process.cwd(), ".data");
const reportsPath = path.join(dataDir, "reports.json");

async function ensureStore() {
  await mkdir(dataDir, { recursive: true });
}

async function readReports(): Promise<StoredReport[]> {
  await ensureStore();
  try {
    const raw = await readFile(reportsPath, "utf8");
    const reports = parseJsonText(raw) as StoredReport[];
    return Array.isArray(reports) ? reports.map(normalizeStoredReport) : [];
  } catch {
    return [];
  }
}

async function writeReports(reports: StoredReport[]) {
  await ensureStore();
  await writeFile(reportsPath, JSON.stringify(reports, null, 2), "utf8");
}

function createReportId() {
  return `report_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeOwnerId(ownerId?: string) {
  return ownerId?.trim() || localGuestOwnerId;
}

function getReportOwnerId(report: Pick<StoredReport, "ownerId">) {
  return normalizeOwnerId(report.ownerId);
}

function normalizeStoredReport(report: StoredReport): StoredReport {
  const payload = normalizeGeneratedReportPayload(report);
  return {
    ...report,
    ...payload,
    ownerId: typeof report.ownerId === "string" ? report.ownerId : undefined,
    inputSummary: report.inputSummary
      ? {
          rent: report.inputSummary.rent ? normalizeVisibleReportCopy(report.inputSummary.rent) : undefined,
          area: report.inputSummary.area ? normalizeVisibleReportCopy(report.inputSummary.area) : undefined,
          floor: report.inputSummary.floor ? normalizeVisibleReportCopy(report.inputSummary.floor) : undefined,
          address: report.inputSummary.address ? normalizeVisibleReportCopy(report.inputSummary.address) : undefined,
          city: report.inputSummary.city ? normalizeVisibleReportCopy(report.inputSummary.city) : undefined,
          workplace: report.inputSummary.workplace
            ? normalizeVisibleReportCopy(report.inputSummary.workplace)
            : undefined,
          budget: report.inputSummary.budget ? normalizeVisibleReportCopy(report.inputSummary.budget) : undefined,
          commuteLimit: report.inputSummary.commuteLimit
            ? normalizeVisibleReportCopy(report.inputSummary.commuteLimit)
            : undefined,
          source: report.inputSummary.source ? normalizeVisibleReportCopy(report.inputSummary.source) : undefined,
          sourceReportId: report.inputSummary.sourceReportId,
          reportContext: report.inputSummary.reportContext
            ? normalizeVisibleReportCopy(report.inputSummary.reportContext)
            : undefined,
          preferences: report.inputSummary.preferences?.map(normalizeVisibleReportCopy) ?? [],
        }
      : undefined,
    summary: {
      title: payload.report.title,
      address: payload.report.address,
      score: payload.report.score,
      status: payload.report.status,
      conclusion: payload.report.conclusion,
    },
  };
}

export async function saveReport(
  payload: GeneratedReportPayload,
  input?: ListingAnalysisInput,
  ownerId?: string,
) {
  const reports = await readReports();
  const normalizedPayload = normalizeGeneratedReportPayload(payload);
  const normalizedOwnerId = normalizeOwnerId(ownerId);
  const id = normalizedPayload.id || createReportId();
  const stored: StoredReport = {
    ...normalizedPayload,
    id,
    ownerId: normalizedOwnerId,
    inputSummary: input
      ? {
          rent: input.rent ? normalizeVisibleReportCopy(input.rent) : undefined,
          area: input.area ? normalizeVisibleReportCopy(input.area) : undefined,
          floor: input.floor ? normalizeVisibleReportCopy(input.floor) : undefined,
          address: input.address ? normalizeVisibleReportCopy(input.address) : undefined,
          city: input.city ? normalizeVisibleReportCopy(input.city) : undefined,
          workplace: input.workplace ? normalizeVisibleReportCopy(input.workplace) : undefined,
          budget: input.budget ? normalizeVisibleReportCopy(input.budget) : undefined,
          commuteLimit: input.commuteLimit ? normalizeVisibleReportCopy(input.commuteLimit) : undefined,
          source: input.source ? normalizeVisibleReportCopy(input.source) : undefined,
          sourceReportId: input.sourceReportId,
          reportContext: input.reportContext ? normalizeVisibleReportCopy(input.reportContext) : undefined,
          preferences: input.preferences.map(normalizeVisibleReportCopy),
        }
      : undefined,
    summary: {
      title: normalizedPayload.report.title,
      address: normalizedPayload.report.address,
      score: normalizedPayload.report.score,
      status: normalizedPayload.report.status,
      conclusion: normalizedPayload.report.conclusion,
    },
  };

  const ownerReports = [
    stored,
    ...reports.filter(
      (report) => getReportOwnerId(report) === normalizedOwnerId && report.id !== id,
    ),
  ].slice(0, 50);
  const nextReports = [
    ...ownerReports,
    ...reports.filter((report) => getReportOwnerId(report) !== normalizedOwnerId),
  ];
  await writeReports(nextReports);
  return stored;
}

export async function listReports(ownerId?: string) {
  const normalizedOwnerId = normalizeOwnerId(ownerId);
  const reports = await readReports();
  return reports.filter((report) => getReportOwnerId(report) === normalizedOwnerId);
}

export async function getStoredReport(id: string, ownerId?: string) {
  const normalizedOwnerId = normalizeOwnerId(ownerId);
  const reports = await readReports();
  return (
    reports.find(
      (report) => report.id === id && getReportOwnerId(report) === normalizedOwnerId,
    ) ?? null
  );
}

export async function transferReportsOwner(fromOwnerId: string, toOwnerId: string) {
  const normalizedFromOwnerId = normalizeOwnerId(fromOwnerId);
  const normalizedToOwnerId = normalizeOwnerId(toOwnerId);

  if (normalizedFromOwnerId === normalizedToOwnerId) {
    return { moved: 0 };
  }

  const reports = await readReports();
  const sourceReports = reports.filter(
    (report) => getReportOwnerId(report) === normalizedFromOwnerId,
  );

  if (!sourceReports.length) {
    return { moved: 0 };
  }

  const targetReports = reports.filter(
    (report) => getReportOwnerId(report) === normalizedToOwnerId,
  );
  const movedReports = sourceReports.map((report) => ({
    ...report,
    ownerId: normalizedToOwnerId,
  }));
  const movedIds = new Set(movedReports.map((report) => report.id));
  const mergedTargetReports = [
    ...movedReports,
    ...targetReports.filter((report) => !movedIds.has(report.id)),
  ].slice(0, 50);
  const nextReports = [
    ...mergedTargetReports,
    ...reports.filter((report) => {
      const ownerId = getReportOwnerId(report);
      return ownerId !== normalizedFromOwnerId && ownerId !== normalizedToOwnerId;
    }),
  ];

  await writeReports(nextReports);
  return { moved: movedReports.length };
}
