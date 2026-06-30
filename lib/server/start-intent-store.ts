import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { CreateStartIntentInput, StartIntent, StartIntentField } from "@/lib/start-intents";
import { localGuestOwnerId } from "@/lib/server/current-owner";
import { parseJsonText } from "@/lib/server/json-utils";

const dataDir = path.join(process.cwd(), ".data");
const intentsPath = path.join(dataDir, "start-intents.json");

async function ensureStore() {
  await mkdir(dataDir, { recursive: true });
}

function createIntentId() {
  return `start_intent_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeOwnerId(ownerId?: string) {
  return ownerId?.trim() || localGuestOwnerId;
}

function getIntentOwnerId(intent: Pick<StartIntent, "ownerId">) {
  return normalizeOwnerId(intent.ownerId);
}

function sanitizeText(value: unknown, fallback = "") {
  return typeof value === "string" ? value.trim() : fallback;
}

function normalizeStoredHref(value: unknown) {
  const href = sanitizeText(value);
  if (!href.startsWith("/")) return "";
  if (href.startsWith("/buy")) return "/city?mode=buy";
  if (href.startsWith("/knowledge")) return "/evidence";
  if (href === "/demo" || href.startsWith("/demo?")) return "/dashboard";
  if (href === "/report/demo" || href.startsWith("/report/demo?")) return "/dashboard";

  try {
    const url = new URL(href, "http://local");
    url.searchParams.delete("handoff");
    url.searchParams.delete("reportContext");
    url.searchParams.delete("urgencyPressure");
    return `${url.pathname}${url.search}`;
  } catch {
    return href.split("&handoff=")[0].split("?handoff=")[0];
  }
}

function normalizeDisplayText(value: string) {
  return value
    .replaceAll("城市成本测算", "生活成本")
    .replaceAll("生活成本测算", "生活成本")
    .replaceAll("城市成本", "生活成本")
    .replaceAll("凭据" + "材料", "材料清单")
    .replaceAll("凭据", "材料")
    .replaceAll("系统按你选择的入口继续分流。", "系统已带你进入对应工具。")
    .replaceAll("分流", "进入对应工具");
}

function sanitizeFields(value: unknown): StartIntentField[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const field = item as Partial<StartIntentField>;
      const label = normalizeDisplayText(sanitizeText(field.label));
      const fieldValue = normalizeDisplayText(sanitizeText(field.value));
      return label && fieldValue ? { label, value: fieldValue } : null;
    })
    .filter((item): item is StartIntentField => Boolean(item))
    .slice(0, 10);
}

function sanitizeIntent(value: unknown): StartIntent | null {
  if (!value || typeof value !== "object") return null;
  const item = value as Partial<StartIntent>;
  const id = sanitizeText(item.id);
  const destination = sanitizeText(item.destination);
  const prompt = sanitizeText(item.prompt);
  const href = normalizeStoredHref(item.href);

  if (!id || !destination || !prompt || !href) return null;

  return {
    id,
    ownerId: sanitizeText(item.ownerId) || undefined,
    source: normalizeDisplayText(sanitizeText(item.source, "启动页输入")),
    selectedDestination: sanitizeText(item.selectedDestination)
      ? normalizeDisplayText(sanitizeText(item.selectedDestination))
      : undefined,
    destination: normalizeDisplayText(destination),
    modeChanged: Boolean(item.modeChanged),
    routeReason: normalizeDisplayText(sanitizeText(item.routeReason, "系统已带你进入对应工具。")),
    prompt: normalizeDisplayText(prompt),
    fields: sanitizeFields(item.fields),
    guardrail: normalizeDisplayText(sanitizeText(
      item.guardrail,
      "这些信息只作为预填上下文，仍需用真实材料确认。",
    )),
    href,
    createdAt: sanitizeText(item.createdAt, new Date().toISOString()),
  };
}

async function readStartIntents(): Promise<StartIntent[]> {
  await ensureStore();
  try {
    const raw = await readFile(intentsPath, "utf8");
    const intents = parseJsonText(raw) as unknown[];
    return Array.isArray(intents)
      ? intents.map(sanitizeIntent).filter((intent): intent is StartIntent => Boolean(intent))
      : [];
  } catch {
    return [];
  }
}

async function writeStartIntents(intents: StartIntent[]) {
  await ensureStore();
  await writeFile(intentsPath, JSON.stringify(intents.slice(0, 500), null, 2), "utf8");
}

export async function listStartIntents(ownerId?: string): Promise<StartIntent[]> {
  const normalizedOwnerId = normalizeOwnerId(ownerId);
  const intents = await readStartIntents();
  return intents.filter((intent) => getIntentOwnerId(intent) === normalizedOwnerId);
}

export async function addStartIntent(input: CreateStartIntentInput, ownerId?: string) {
  const normalizedOwnerId = normalizeOwnerId(ownerId);
  const intents = await readStartIntents();
  const intent: StartIntent = {
    id: createIntentId(),
    ownerId: normalizedOwnerId,
    source: input.source,
    selectedDestination: input.selectedDestination,
    destination: input.destination,
    modeChanged: input.modeChanged,
    routeReason: input.routeReason,
    prompt: input.prompt,
    fields: input.fields.slice(0, 10),
    guardrail: input.guardrail,
    href: normalizeStoredHref(input.href),
    createdAt: new Date().toISOString(),
  };
  const ownerIntents = [
    intent,
    ...intents
      .filter((item) => getIntentOwnerId(item) === normalizedOwnerId)
      .filter((item) => item.prompt !== intent.prompt || item.destination !== intent.destination),
  ].slice(0, 30);

  await writeStartIntents([
    ...ownerIntents,
    ...intents.filter((item) => getIntentOwnerId(item) !== normalizedOwnerId),
  ]);

  return intent;
}

export async function transferStartIntentsOwner(fromOwnerId: string, toOwnerId: string) {
  const normalizedFromOwnerId = normalizeOwnerId(fromOwnerId);
  const normalizedToOwnerId = normalizeOwnerId(toOwnerId);

  if (normalizedFromOwnerId === normalizedToOwnerId) {
    return { moved: 0 };
  }

  const intents = await readStartIntents();
  const sourceIntents = intents.filter(
    (intent) => getIntentOwnerId(intent) === normalizedFromOwnerId,
  );

  if (!sourceIntents.length) {
    return { moved: 0 };
  }

  const targetIntents = intents.filter(
    (intent) => getIntentOwnerId(intent) === normalizedToOwnerId,
  );
  const movedIntents = sourceIntents.map((intent) => ({
    ...intent,
    ownerId: normalizedToOwnerId,
  }));
  const movedIds = new Set(movedIntents.map((intent) => intent.id));
  const mergedTargetIntents = [
    ...movedIntents,
    ...targetIntents.filter((intent) => !movedIds.has(intent.id)),
  ].slice(0, 30);

  await writeStartIntents([
    ...mergedTargetIntents,
    ...intents.filter((intent) => {
      const ownerId = getIntentOwnerId(intent);
      return ownerId !== normalizedFromOwnerId && ownerId !== normalizedToOwnerId;
    }),
  ]);

  return { moved: movedIntents.length };
}
