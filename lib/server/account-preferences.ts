import fs from "node:fs/promises";
import path from "node:path";
import {
  sanitizeUserPreferences,
  type UserPreferences,
} from "@/lib/user-preferences";
import { parseJsonText } from "@/lib/server/json-utils";

export type AccountPreferencesRecord = {
  ownerId: string;
  preferences: UserPreferences;
  onboardingCompletedAt?: string;
  createdAt: string;
  updatedAt: string;
};

function preferencesFilePath() {
  return path.join(process.cwd(), ".data", "account-preferences.json");
}

async function readRecords(): Promise<AccountPreferencesRecord[]> {
  try {
    const raw = await fs.readFile(preferencesFilePath(), "utf8");
    const parsed = parseJsonText(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .map((item) => sanitizeRecord(item))
      .filter((item): item is AccountPreferencesRecord => Boolean(item));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
}

async function writeRecords(records: AccountPreferencesRecord[]) {
  await fs.mkdir(path.dirname(preferencesFilePath()), { recursive: true });
  await fs.writeFile(preferencesFilePath(), `${JSON.stringify(records, null, 2)}\n`, "utf8");
}

function sanitizeRecord(value: unknown): AccountPreferencesRecord | null {
  if (!value || typeof value !== "object") return null;
  const item = value as Partial<AccountPreferencesRecord>;
  if (!item.ownerId || typeof item.ownerId !== "string") return null;

  const now = new Date().toISOString();
  return {
    ownerId: item.ownerId,
    preferences: sanitizeUserPreferences(item.preferences ?? {}),
    onboardingCompletedAt:
      typeof item.onboardingCompletedAt === "string" ? item.onboardingCompletedAt : undefined,
    createdAt: typeof item.createdAt === "string" ? item.createdAt : now,
    updatedAt: typeof item.updatedAt === "string" ? item.updatedAt : now,
  };
}

export async function getAccountPreferences(ownerId: string) {
  const records = await readRecords();
  return records.find((record) => record.ownerId === ownerId) ?? null;
}

export async function saveAccountPreferences({
  ownerId,
  preferences,
  onboardingCompletedAt,
}: {
  ownerId: string;
  preferences: Partial<UserPreferences>;
  onboardingCompletedAt?: string;
}) {
  const records = await readRecords();
  const now = new Date().toISOString();
  const index = records.findIndex((record) => record.ownerId === ownerId);
  const existing = index >= 0 ? records[index] : undefined;
  const record: AccountPreferencesRecord = {
    ownerId,
    preferences: sanitizeUserPreferences(preferences),
    onboardingCompletedAt: onboardingCompletedAt ?? existing?.onboardingCompletedAt,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };

  if (index >= 0) {
    records[index] = record;
  } else {
    records.push(record);
  }

  await writeRecords(records);
  return record;
}
