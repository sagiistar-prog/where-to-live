import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { searchHousingKnowledge } from "../lib/housing-knowledge";
import notes from "../knowledge/reference-notes.json";

type Case = { id: string; query: string; jurisdiction: string; relevant_sources: string[]; expect_evidence: boolean };
const [casesPath, outputPath, asOf] = process.argv.slice(2);
if (!casesPath || !outputPath || !/^\d{4}-\d{2}-\d{2}$/.test(asOf ?? "") || Number.isNaN(Date.parse(asOf))) {
  throw new Error("Usage: node --import tsx scripts/evaluate-knowledge-summary.ts cases.json output.json YYYY-MM-DD");
}
const raw = readFileSync(casesPath, "utf8");
const cases: Case[] = JSON.parse(raw);
const known = new Set(notes.map(note => note.source_id));
if (!Array.isArray(cases) || !cases.length || new Set(cases.map(c => c.id)).size !== cases.length
  || cases.some(c => !c.id || !c.query?.trim() || typeof c.expect_evidence !== "boolean"
    || !Array.isArray(c.relevant_sources) || c.relevant_sources.some(id => !known.has(id))
    || (c.expect_evidence && !c.relevant_sources.length))) throw new Error("Invalid regression cases");
const rows = cases.map(c => {
  const hits = searchHousingKnowledge(c.query, c.jurisdiction, new Date(asOf));
  return { id: c.id, query: c.query, sources: hits.map(h => h.source_id),
    positive: c.expect_evidence, hit: c.expect_evidence ? hits.some(h => c.relevant_sources.includes(h.source_id)) : null,
    false_result: !c.expect_evidence && hits.length > 0,
    region_leak: hits.some(h => !["全国", c.jurisdiction].includes(h.jurisdiction)) };
});
const summary = { positive: rows.filter(r => r.positive).length, hits: rows.filter(r => r.hit).length,
  negative: rows.filter(r => !r.positive).length, false_results: rows.filter(r => r.false_result).length,
  region_leaks: rows.filter(r => r.region_leak).length };
const passed = summary.positive > 0 && summary.negative > 0 && summary.hits / summary.positive >= .95
  && summary.false_results === 0 && summary.region_leaks === 0;
const report = { scope: "Authored source-level regression for shipped summaries, not vector retrieval or user outcomes", as_of: asOf,
  cases_sha256: createHash("sha256").update(raw).digest("hex"),
  notes_sha256: createHash("sha256").update(JSON.stringify(notes)).digest("hex"),
  gate: { minimum_hit_rate: .95, maximum_false_results: 0, maximum_region_leaks: 0, passed }, summary, rows };
mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, JSON.stringify(report, null, 2) + "\n", { flag: "wx" });
console.log(JSON.stringify({ summary, passed }));
if (!passed) process.exitCode = 2;
