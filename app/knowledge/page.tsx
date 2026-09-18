"use client";
import Link from "next/link";
import { useRef, useState } from "react";
import { ArrowUpRight, Search } from "lucide-react";

type Hit = { source_id: string; chunk_id?: string; source_title: string; source_url: string; retrieved_at: string; jurisdiction: string; text: string; stale?: boolean; applicability?: string; published_at?: string | null; effective_from?: string | null; valid_until?: string | null };
export default function HousingKnowledge() {
  const [city, setCity] = useState("全国");
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<Hit[] | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  async function search() {
    if (pending.current) return;
    pending.current = true; setBusy(true); setError(""); setNotice(""); setHits(null);
    try {
      const response = await fetch("/api/knowledge/search", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ city, query }), signal: AbortSignal.timeout(35000) });
      const data = await response.json();
      if (!response.ok) {
        setError(data.code === "QUERY_TOO_LONG" ? "问题较长，请保留一个具体事项后重试。" : "暂时无法查找资料。你的问题已保留，请稍后重试。");
        return;
      }
      setHits(data.hits);
      setNotice(typeof data.notice === "string" ? data.notice : "");
    } catch { setError("暂时无法查找资料。你的问题已保留，请稍后重试。"); }
    finally { pending.current = false; setBusy(false); }
  }
  return <main className="min-h-screen bg-[#f4f5f8] text-[#222a40]">
    <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-7"><Link href="/" className="text-lg font-semibold">住哪儿</Link><Link href="/payment" className="text-sm underline underline-offset-4">检查付款风险</Link></header>
    <div className="mx-auto max-w-4xl px-6 py-12 sm:py-20">
      <h1 className="max-w-2xl text-4xl font-semibold leading-tight tracking-tight sm:text-6xl">住得安心，<br />先把依据找清楚。</h1>
      <p className="mt-6 max-w-xl leading-7 text-[#525d75]">从租房押金到买房税费，查清与你有关的官方依据。</p>
      <form onSubmit={e => { e.preventDefault(); void search(); }} className="mt-10 rounded-2xl bg-white p-6 shadow-[0_12px_40px_#222a4010]">
        <label htmlFor="kb-city" className="block text-sm font-medium">房屋所在地区</label>
        <select id="kb-city" value={city} disabled={busy} onChange={e => { setCity(e.target.value); setHits(null); }} className="mt-2 rounded-lg border border-[#b8c1d1] bg-white px-3 py-2 focus-visible:outline-[#315dc6]">{["全国", "北京", "上海", "广州", "深圳"].map(c => <option key={c}>{c}</option>)}</select>
        <label htmlFor="kb-query" className="mt-6 block text-sm font-medium">你想确认什么？</label>
        <textarea id="kb-query" required maxLength={1000} readOnly={busy} value={query} onChange={e => { setQuery(e.target.value); setHits(null); }} placeholder="例如：退租时押金什么时候退？" className="mt-2 min-h-28 w-full resize-y rounded-lg border border-[#b8c1d1] p-3 leading-7 placeholder:text-[#626d82] focus-visible:outline-[#315dc6]" />
        <div className="mt-4 flex justify-end"><button disabled={busy} className="flex items-center gap-2 rounded-xl bg-[#294a9d] px-5 py-3 font-medium text-white transition-colors hover:bg-[#1d397d] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#315dc6] disabled:opacity-60"><Search size={18} aria-hidden="true" />{busy ? "正在查找" : "查找依据"}</button></div>
      </form>
      <p className="mt-4 text-sm leading-6 text-[#525d75]">覆盖全国通用规则及北上广深部分政策。签约前请核对原文、适用主体和最新规定。</p>
      <p role="status" aria-live="polite" className={busy ? "mt-8" : "sr-only"}>{busy ? "正在查找所选地区的资料" : hits ? `查询完成，找到 ${hits.length} 条资料。` : ""}</p>
      {error && <p role="alert" className="mt-8 text-[#963239]">{error}</p>}
      {hits && <section aria-label="查询结果" className="mt-12"><h2 className="text-2xl font-semibold">{hits.length ? "与你的问题相关" : "暂未找到对应资料"}</h2>{!hits.length && <p className="mt-3 leading-7 text-[#525d75]">{notice || "试着补充合同、押金或公积金等具体事项。实时租金、房源真伪和通勤时间需要另行核验。"}</p>}{hits.map(hit => <article key={hit.chunk_id ?? hit.source_id} className="border-b border-[#ccd2dd] py-7"><div className="text-sm text-[#525d75]">{hit.jurisdiction} / 采集于 {hit.retrieved_at.slice(0, 10)}</div><h3 className="mt-3 text-lg font-semibold">{hit.source_title}</h3><p className="mt-3 max-w-[70ch] whitespace-pre-wrap leading-8">{hit.text}</p>{hit.stale && <p className="mt-3 text-sm">资料已超过 90 天未更新，请优先核对原文。</p>}{hit.applicability && <details className="mt-4 text-sm leading-7 text-[#525d75]"><summary className="cursor-pointer font-medium text-[#294a9d] focus-visible:outline-[#315dc6]">适用条件与日期</summary><p className="mt-2 max-w-[70ch]">{hit.applicability}</p>{hit.published_at && <p>发布：{hit.published_at}</p>}{hit.effective_from && <p>开始施行：{hit.effective_from}</p>}{hit.valid_until && <p>收录规则有效至：{hit.valid_until}</p>}</details>}<a href={hit.source_url} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-1 font-medium text-[#294a9d] underline underline-offset-4">查看官方原文<ArrowUpRight size={16} aria-hidden="true" /></a></article>)}</section>}
    </div>
  </main>;
}
