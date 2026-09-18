import { test } from "node:test";
import assert from "node:assert/strict";
import { createOwnerSession, verifyOwnerSession } from "../lib/server/owner-session";

test("owner sessions reject forged, modified and expired identities", () => {
  process.env.AUTH_SECRET = "test-only-secret-with-at-least-thirty-two-characters";
  const token = createOwnerSession("owner-a", 1000);
  assert.equal(verifyOwnerSession(token, 2000), "owner-a");
  assert.equal(verifyOwnerSession("owner-b", 2000), null);
  const [, signature] = token.split(".");
  const forged = Buffer.from(JSON.stringify({ sub: "owner-b", exp: 9999999999 })).toString("base64url");
  assert.equal(verifyOwnerSession(`${forged}.${signature}`, 2000), null);
  assert.equal(verifyOwnerSession(token, 1000 + 8 * 86400 * 1000), null);
  assert.equal(verifyOwnerSession(`${token}.extra`, 2000), null);
  delete process.env.AUTH_SECRET;
  assert.equal(verifyOwnerSession(token, 2000), null);
});
