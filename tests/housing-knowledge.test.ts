import { test } from "node:test";
import assert from "node:assert/strict";
import { housingQueryBoundary, searchHousingKnowledge } from "../lib/housing-knowledge";
import sources from "../knowledge/sources.json";
import notes from "../knowledge/reference-notes.json";

test("every collected source has a shipped summary with matching provenance", () => {
  assert.equal(new Set(sources.map(s => s.source_id)).size, sources.length);
  assert.equal(notes.length, sources.length);
  for (const source of sources) {
    const note = notes.find(n => n.source_id === source.source_id);
    assert.ok(note, source.source_id);
    for (const key of ["source_title", "source_url", "jurisdiction", "published_at", "effective_from", "valid_until", "applicability"] as const) {
      assert.equal(note[key], source[key], `${source.source_id}: ${key}`);
    }
    assert.ok(!note.text.includes("·"));
  }
});

test("moving and residence tasks can be searched without adding the word housing", () => {
  for (const [city, id, query] of [
    ["北京", "bj-residence-guide", "居住证租赁住所申请材料"],
    ["上海", "sh-residence-update", "居住登记未满半年但连续缴社保能申领居住证吗"],
    ["广州", "gz-residence-guide", "电子居住证绿色通道要先办居住登记吗"],
  ]) {
    assert.equal(housingQueryBoundary(query), null);
    const found = searchHousingKnowledge(query, city, new Date("2026-09-18"));
    assert.ok(found.some(n => n.source_id === id), `${city}: ${query}`);
    assert.ok(found.every(n => ["全国", city].includes(n.jurisdiction)));
  }
});

test("a residence application does not pad its results with noise and property records", () => {
  const found = searchHousingKnowledge("居住登记未满半年但连续缴社保能申领居住证吗", "上海", new Date("2026-09-18"));
  assert.ok(found.some(n => n.source_id === "sh-residence-update"));
  assert.ok(found.every(n => !["cn-noise", "cn-property-records"].includes(n.source_id)));
});
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

test("verified commencement and extension dates bound the shipped summaries", () => {
  const query = "深圳住房租赁资金监管续期";
  assert.ok(searchHousingKnowledge(query, "深圳", new Date("2027-06-11"))
    .some(r => r.source_id === "sz-funds"));
  assert.ok(searchHousingKnowledge(query, "深圳", new Date("2027-06-12"))
    .every(r => r.source_id !== "sz-funds"));
  assert.ok(searchHousingKnowledge("北京押金托管", "北京", new Date("2024-09-30"))
    .every(r => r.source_id !== "bj-funds"));
  const applicable = searchHousingKnowledge("北京押金托管", "北京", new Date("2024-10-01"))
    .find(r => r.source_id === "bj-funds");
  assert.ok(applicable?.applicability?.includes("转租"));
});

test("purchase and dispute tasks return usable sources with applicability", () => {
  for (const [query, city, id] of [
    ["家庭第二套住房契税140平方米", "全国", "cn-purchase-deed-tax"],
    ["浮动房贷重定价周期", "全国", "cn-mortgage-repricing"],
    ["租房纠纷人民调解收费", "北京", "cn-people-mediation"],
    ["北京二手房资金托管是否自行选择", "北京", "bj-resale-funds"],
    ["提前还清住房贷款利息扣除", "上海", "cn-loan-interest-tax"],
  ]) {
    const results = searchHousingKnowledge(query, city, new Date("2026-09-18"));
    assert.ok(results.some(r => r.source_id === id), `${query} misses ${id}`);
    assert.ok(results.every(r => r.applicability && ["全国", city].includes(r.jurisdiction)));
  }
  for (const query of ["我一定获批住房贷款吗", "请保证银行给我放款买房"]) {
    assert.equal(housingQueryBoundary(query)?.id, "credit_approval");
    assert.deepEqual(searchHousingKnowledge(query, "全国"), []);
  }
});
