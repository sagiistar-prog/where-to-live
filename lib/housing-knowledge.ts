import notes from "../knowledge/reference-notes.json";

export const knowledgeCities = ["全国", "北京", "上海", "广州", "深圳"] as const;
const ignored = new Set(["怎么", "如何", "什么", "可以", "需要", "租房", "住房", "北京", "上海", "广州", "深圳"]);
function terms(text: string) {
  const runs = text.toLowerCase().match(/[\u4e00-\u9fff]+|[a-z0-9]+/g) ?? [];
  return [...new Set(runs.flatMap(run => /^[a-z0-9]+$/.test(run) ? [run] : Array.from({ length: Math.max(0, run.length - 1) }, (_, i) => run.slice(i, i + 2))))].filter(t => !ignored.has(t));
}

export function searchHousingKnowledge(query: string, city: string, now = new Date()) {
  const words = terms(query);
  return notes.filter(n => (n.jurisdiction === "全国" || n.jurisdiction === city) && (!n.valid_until || new Date(n.valid_until + "T23:59:59Z") >= now))
    .map(n => ({ ...n, score: words.reduce((score, term) => score + (n.text.includes(term) ? 2 : 0) + (n.source_title.includes(term) ? 1 : 0), 0) }))
    .filter(n => n.score > 0).sort((a, b) => b.score - a.score).slice(0, 5)
    .map(({ score, ...n }) => { void score; return { ...n, stale: now.getTime() - new Date(n.retrieved_at).getTime() > 90 * 86400000 }; });
}
