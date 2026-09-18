import { test } from "node:test";
import assert from "node:assert/strict";
import { housingQueryBoundary, searchHousingKnowledge } from "../lib/housing-knowledge";
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
test("scope messages prevent presenting live prices or unseen contracts as researched", () => {
  for (const query of ["今天上海成交均价是多少", "明年房屋会升值吗", "未上传协议可以判断有效吗", "广州周末几点日落"]) {
    assert.ok(housingQueryBoundary(query));
    assert.deepEqual(searchHousingKnowledge(query, "上海"), []);
  }
  assert.equal(housingQueryBoundary("房东要求涨租，租金变更应如何约定"), null);
  for (const query of ["房东说明年涨价，合同应该怎么约定？", "未提供合同就要求交押金，需要先核对什么？"]) {
    assert.equal(housingQueryBoundary(query), null);
    assert.ok(searchHousingKnowledge(query, "北京").length > 0);
  }
});

test("new housing tasks return their official source and keep regional boundaries", () => {
  for (const [query, city, source] of [
    ["高层住宅电动自行车楼梯间充电", "全国", "cn-highrise-fire"],
    ["中介服务费收费清单明码标价", "全国", "cn-broker-service"],
    ["上海住宅晚上七点装修噪声", "上海", "sh-noise"],
    ["广州租赁备案办理材料", "广州", "gz-lease-filing-guide"],
    ["深圳普通租房公积金分段计算", "深圳", "sz-gjj-rent-calculation"],
  ]) {
    const results = searchHousingKnowledge(query, city, new Date("2026-09-18"));
    assert.ok(results.some(r => r.source_id === source), `${query} misses ${source}`);
    assert.ok(results.every(r => ["全国", city].includes(r.jurisdiction)));
  }
});

test("temporary rates and future rules stay outside their effective window", () => {
  const query = "深圳普通租房公积金分段计算";
  for (const day of ["2025-10-31", "2027-11-01"]) {
    assert.ok(searchHousingKnowledge(query, "深圳", new Date(day)).every(r => r.source_id !== "sz-gjj-rent-calculation"));
  }
});
