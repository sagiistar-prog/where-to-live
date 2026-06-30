import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { caseEventTypes, type CaseEvent, type CreateCaseEventInput } from "@/lib/case-events";
import type { ReportStatus } from "@/lib/mock-data";
import { localGuestOwnerId } from "@/lib/server/current-owner";
import { parseJsonText } from "@/lib/server/json-utils";

const dataDir = path.join(process.cwd(), ".data");
const eventsPath = path.join(dataDir, "case-events.json");
const statuses: ReportStatus[] = ["recommend", "caution", "reject"];

async function ensureStore() {
  await mkdir(dataDir, { recursive: true });
}

function createEventId() {
  return `case_event_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeOwnerId(ownerId?: string) {
  return ownerId?.trim() || localGuestOwnerId;
}

function getEventOwnerId(event: Pick<CaseEvent, "ownerId">) {
  return normalizeOwnerId(event.ownerId);
}

function normalizeDisplayText(value: string) {
  return value
    .replaceAll("凭据" + "材料", "材料清单")
    .replaceAll("凭据", "材料")
    .replaceAll("缺证", "材料不足")
    .replaceAll("底线判断", "关键确认");
}

function normalizeStoredHref(value: unknown) {
  const href = typeof value === "string" ? value.trim() : "";
  if (!href.startsWith("/")) return undefined;
  if (href.startsWith("/buy")) return "/city?mode=buy";
  if (href.startsWith("/knowledge")) return "/evidence";
  if (href === "/demo" || href.startsWith("/demo?")) return "/dashboard";
  if (href === "/report/demo" || href.startsWith("/report/demo?")) return "/dashboard";
  return href;
}

function sanitizeEvent(value: unknown): CaseEvent | null {
  if (!value || typeof value !== "object") return null;
  const item = value as Partial<CaseEvent>;
  if (!item.id || !item.reportId || !item.type || !item.title || !item.summary) return null;
  if (!caseEventTypes.includes(item.type)) return null;
  if (!item.status || !statuses.includes(item.status)) return null;

  return {
    id: String(item.id),
    ownerId: typeof item.ownerId === "string" ? item.ownerId : undefined,
    reportId: String(item.reportId),
    type: item.type,
    title: normalizeDisplayText(String(item.title)),
    status: item.status,
    summary: normalizeDisplayText(String(item.summary)),
    highlights: Array.isArray(item.highlights)
      ? item.highlights
          .filter((entry): entry is string => typeof entry === "string")
          .map(normalizeDisplayText)
          .slice(0, 6)
      : [],
    href: normalizeStoredHref(item.href),
    createdAt: item.createdAt ? String(item.createdAt) : new Date().toISOString(),
  };
}

async function readCaseEvents(): Promise<CaseEvent[]> {
  await ensureStore();
  try {
    const raw = await readFile(eventsPath, "utf8");
    const events = parseJsonText(raw) as unknown[];
    return Array.isArray(events)
      ? events.map(sanitizeEvent).filter((event): event is CaseEvent => Boolean(event))
      : [];
  } catch {
    return [];
  }
}

export async function listCaseEvents(ownerId?: string): Promise<CaseEvent[]> {
  const normalizedOwnerId = normalizeOwnerId(ownerId);
  const events = await readCaseEvents();
  return events.filter((event) => getEventOwnerId(event) === normalizedOwnerId);
}

async function writeCaseEvents(events: CaseEvent[]) {
  await ensureStore();
  await writeFile(eventsPath, JSON.stringify(events.slice(0, 1000), null, 2), "utf8");
}

export async function addCaseEvent(input: CreateCaseEventInput, ownerId?: string) {
  const normalizedOwnerId = normalizeOwnerId(ownerId);
  const events = await readCaseEvents();
  const event: CaseEvent = {
    id: createEventId(),
    ownerId: normalizedOwnerId,
    reportId: input.reportId,
    type: input.type,
    title: input.title,
    status: input.status,
    summary: input.summary,
    highlights: (input.highlights ?? []).filter(Boolean).slice(0, 6),
    href: input.href,
    createdAt: new Date().toISOString(),
  };
  const ownerEvents = [
    event,
    ...events.filter((item) => getEventOwnerId(item) === normalizedOwnerId),
  ].slice(0, 500);
  await writeCaseEvents([
    ...ownerEvents,
    ...events.filter((item) => getEventOwnerId(item) !== normalizedOwnerId),
  ]);
  return event;
}

export async function transferCaseEventsOwner(fromOwnerId: string, toOwnerId: string) {
  const normalizedFromOwnerId = normalizeOwnerId(fromOwnerId);
  const normalizedToOwnerId = normalizeOwnerId(toOwnerId);

  if (normalizedFromOwnerId === normalizedToOwnerId) {
    return { moved: 0 };
  }

  const events = await readCaseEvents();
  const sourceEvents = events.filter(
    (event) => getEventOwnerId(event) === normalizedFromOwnerId,
  );

  if (!sourceEvents.length) {
    return { moved: 0 };
  }

  const targetEvents = events.filter(
    (event) => getEventOwnerId(event) === normalizedToOwnerId,
  );
  const movedEvents = sourceEvents.map((event) => ({
    ...event,
    ownerId: normalizedToOwnerId,
  }));
  const movedIds = new Set(movedEvents.map((event) => event.id));
  const mergedTargetEvents = [
    ...movedEvents,
    ...targetEvents.filter((event) => !movedIds.has(event.id)),
  ].slice(0, 500);
  const nextEvents = [
    ...mergedTargetEvents,
    ...events.filter((event) => {
      const ownerId = getEventOwnerId(event);
      return ownerId !== normalizedFromOwnerId && ownerId !== normalizedToOwnerId;
    }),
  ];

  await writeCaseEvents(nextEvents);
  return { moved: movedEvents.length };
}
