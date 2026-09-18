import { createHmac, timingSafeEqual } from "node:crypto";

export const ownerCookieName = "zhunaar_owner_id";
export const sessionLifetime = 60 * 60 * 24 * 7;

function secret() {
  const key = process.env.AUTH_SECRET?.trim() || process.env.NEXTAUTH_SECRET?.trim();
  if (!key || key.length < 32) throw new Error("AUTH_SECRET must contain at least 32 characters");
  return key;
}

export function createOwnerSession(ownerId: string, now = Date.now()) {
  if (!ownerId.trim()) throw new Error("Owner required");
  const payload = Buffer.from(JSON.stringify({ sub: ownerId, exp: Math.floor(now / 1000) + sessionLifetime })).toString("base64url");
  return `${payload}.${createHmac("sha256", secret()).update(payload).digest("base64url")}`;
}

export function verifyOwnerSession(value?: string, now = Date.now()): string | null {
  try {
    if (!value || value.length > 2048) return null;
    const parts = value.split(".");
    if (parts.length !== 2) return null;
    const expected = createHmac("sha256", secret()).update(parts[0]).digest();
    const actual = Buffer.from(parts[1], "base64url");
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;
    const { sub, exp } = JSON.parse(Buffer.from(parts[0], "base64url").toString());
    if (typeof sub !== "string" || !sub.trim() || !Number.isInteger(exp) || exp <= now / 1000) return null;
    return sub;
  } catch { return null; }
}
