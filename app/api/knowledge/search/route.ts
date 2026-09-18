import { NextResponse } from "next/server";
import { housingQueryBoundary, knowledgeCities, searchHousingKnowledge } from "@/lib/housing-knowledge";

export async function POST(request: Request) {
  let body;
  try {
    const raw = await request.text();
    if (new TextEncoder().encode(raw).length > 8192) throw new Error();
    body = JSON.parse(raw);
  } catch { return NextResponse.json({ error: "请求格式不正确。" }, { status: 400 }); }
  const { query, city } = body ?? {};
  if (typeof query !== "string" || !query.trim() || query.length > 1000 || !knowledgeCities.includes(city)) {
    return NextResponse.json({ error: "请选择地区并输入 1 到 1000 字的问题。" }, { status: 400 });
  }
  const boundary = housingQueryBoundary(query);
  if (boundary) return NextResponse.json({ hits: [], mode: "scope-boundary", query, city, notice: boundary.message });
  const base = process.env.HOUSING_KB_URL;
  if (base) {
    try {
      const response = await fetch(new URL("/search", base), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ query, jurisdiction: city }), signal: AbortSignal.timeout(30000), cache: "no-store" });
      if (response.status === 400) {
        const failure = await response.json();
        if (failure.code === "QUERY_TOO_LONG") return NextResponse.json({ error: "问题较长，请保留一个具体事项后重试。", code: "QUERY_TOO_LONG" }, { status: 400 });
      }
      if (!response.ok) throw new Error();
      const result = await response.json();
      if (!Array.isArray(result.evidence)) throw new Error();
      return NextResponse.json({ hits: result.evidence.filter((h: { jurisdiction: string }) => ["全国", city].includes(h.jurisdiction)), mode: "hybrid", query, city });
    } catch { return NextResponse.json({ error: "知识库暂时无法连接，请保留问题后重试。" }, { status: 503 }); }
  }
  return NextResponse.json({ hits: searchHousingKnowledge(query, city), mode: "reference-search", query, city });
}
