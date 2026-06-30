import fs from "node:fs/promises";
import path from "node:path";
import { parseJsonText } from "@/lib/server/json-utils";

export type AuthProvider = "email" | "google";

export type AuthUserRecord = {
  id: string;
  email: string;
  name?: string;
  image?: string;
  provider: AuthProvider;
  providerAccountId?: string;
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string;
};

type UpsertAuthUserInput = {
  email: string;
  name?: string | null;
  image?: string | null;
  provider: AuthProvider;
  providerAccountId?: string | null;
  emailVerified: boolean;
};

function usersFilePath() {
  return path.join(process.cwd(), ".data", "auth-users.json");
}

async function readUsers(): Promise<AuthUserRecord[]> {
  try {
    const raw = await fs.readFile(usersFilePath(), "utf8");
    const parsed = parseJsonText(raw);
    return Array.isArray(parsed) ? (parsed as AuthUserRecord[]) : [];
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
}

async function writeUsers(users: AuthUserRecord[]) {
  await fs.mkdir(path.dirname(usersFilePath()), { recursive: true });
  await fs.writeFile(usersFilePath(), `${JSON.stringify(users, null, 2)}\n`, "utf8");
}

function normalizedEmail(email: string) {
  return email.trim().toLowerCase();
}

function createUserId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `user_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

export async function upsertAuthUser(input: UpsertAuthUserInput) {
  const email = normalizedEmail(input.email);
  const users = await readUsers();
  const now = new Date().toISOString();
  const existingIndex = users.findIndex((user) => user.email === email);

  if (existingIndex >= 0) {
    const existing = users[existingIndex];
    const nextUser: AuthUserRecord = {
      ...existing,
      name: input.name?.trim() || existing.name,
      image: input.image?.trim() || existing.image,
      provider: input.provider,
      providerAccountId: input.providerAccountId?.trim() || existing.providerAccountId,
      emailVerified: input.emailVerified,
      updatedAt: now,
      lastLoginAt: now,
    };
    users[existingIndex] = nextUser;
    await writeUsers(users);
    return nextUser;
  }

  const user: AuthUserRecord = {
    id: createUserId(),
    email,
    name: input.name?.trim() || undefined,
    image: input.image?.trim() || undefined,
    provider: input.provider,
    providerAccountId: input.providerAccountId?.trim() || undefined,
    emailVerified: input.emailVerified,
    createdAt: now,
    updatedAt: now,
    lastLoginAt: now,
  };

  users.push(user);
  await writeUsers(users);
  return user;
}

export async function getAuthUserByEmail(email: string) {
  const normalized = normalizedEmail(email);
  const users = await readUsers();
  return users.find((user) => user.email === normalized) ?? null;
}
