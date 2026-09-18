import { test } from "node:test";
import assert from "node:assert/strict";
import { searchHousingKnowledge } from "../lib/housing-knowledge";
test("local policy never leaks into a different city", () => {
  const results = searchHousingKnowledge("押金托管退还", "上海");
  assert.ok(results.length);
  assert.ok(results.every(r => ["全国", "上海"].includes(r.jurisdiction)));
});
test("unrelated questions and unsupported cities do not invent local advice", () => {
  assert.deepEqual(searchHousingKnowledge("quantum spacecraft", "北京"), []);
  assert.ok(searchHousingKnowledge("押金", "成都").every(r => r.jurisdiction === "全国"));
});
test("expired rules are excluded and aging snapshots are marked", () => {
  const results = searchHousingKnowledge("监管押金", "广州", new Date("2029-01-01"));
  assert.ok(results.every(r => r.source_id !== "gz-rental"));
  assert.ok(results.every(r => r.stale));
});
