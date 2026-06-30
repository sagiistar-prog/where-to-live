import fs from "node:fs/promises";
import path from "node:path";
import {
  getSubscriptionPlan,
  isSubscriptionPlanId,
  type SubscriptionPlanId,
} from "@/lib/subscription-plan";
import { parseJsonText } from "@/lib/server/json-utils";

export type AccountSubscriptionRecord = {
  ownerId: string;
  planId: SubscriptionPlanId;
  createdAt: string;
  updatedAt: string;
};

function subscriptionFilePath() {
  return path.join(process.cwd(), ".data", "account-subscription.json");
}

function sanitizeRecord(value: unknown): AccountSubscriptionRecord | null {
  if (!value || typeof value !== "object") return null;
  const item = value as Partial<AccountSubscriptionRecord>;
  if (!item.ownerId || typeof item.ownerId !== "string") return null;

  const now = new Date().toISOString();
  return {
    ownerId: item.ownerId,
    planId: isSubscriptionPlanId(item.planId) ? item.planId : "free",
    createdAt: typeof item.createdAt === "string" ? item.createdAt : now,
    updatedAt: typeof item.updatedAt === "string" ? item.updatedAt : now,
  };
}

async function readRecords(): Promise<AccountSubscriptionRecord[]> {
  try {
    const raw = await fs.readFile(subscriptionFilePath(), "utf8");
    const parsed = parseJsonText(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .map((item) => sanitizeRecord(item))
      .filter((item): item is AccountSubscriptionRecord => Boolean(item));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
}

async function writeRecords(records: AccountSubscriptionRecord[]) {
  await fs.mkdir(path.dirname(subscriptionFilePath()), { recursive: true });
  await fs.writeFile(subscriptionFilePath(), `${JSON.stringify(records, null, 2)}\n`, "utf8");
}

export async function getAccountSubscription(ownerId: string) {
  const records = await readRecords();
  return records.find((record) => record.ownerId === ownerId) ?? null;
}

export async function saveAccountSubscription({
  ownerId,
  planId,
}: {
  ownerId: string;
  planId: SubscriptionPlanId;
}) {
  const records = await readRecords();
  const now = new Date().toISOString();
  const index = records.findIndex((record) => record.ownerId === ownerId);
  const existing = index >= 0 ? records[index] : undefined;
  const record: AccountSubscriptionRecord = {
    ownerId,
    planId: getSubscriptionPlan(planId).id,
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
