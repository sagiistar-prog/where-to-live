"use client";

import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  Home,
  Plus,
  ShieldAlert,
  Trash2,
  WalletCards,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { buildFlowHref, compactContext } from "@/lib/flow-links";

type CandidateRisk = "clear" | "review" | "stop";

type QuickCandidate = {
  id: string;
  name: string;
  rent: string;
  extraMonthly: string;
  commuteMinutes: string;
  depositMonths: string;
  risk: CandidateRisk;
  notes: string;
};

type RankedCandidate = QuickCandidate & {
  complete: boolean;
  score: number;
  rank: number;
  trueMonthlyCost?: number;
  rentValue?: number;
  commuteValue?: number;
  depositValue?: number;
  verdict: "优先继续" | "谨慎保留" | "暂不继续" | "待补充";
  reasons: string[];
  analyzeHref: string;
};

const storageKey = "zhunaar:manual-comparison:v1";

const riskCopy: Record<
  CandidateRisk,
  {
    label: string;
    score: number;
    badge: "success" | "warning" | "destructive";
    note: string;
  }
> = {
  clear: {
    label: "合同收款清楚",
    score: 100,
    badge: "success",
    note: "合同版本、收款主体和付款条件已经基本看清。",
  },
  review: {
    label: "需要再确认",
    score: 72,
    badge: "warning",
    note: "合同、收款或退款条件还没有完全写清。",
  },
  stop: {
    label: "不建议付款",
    score: 38,
    badge: "destructive",
    note: "付款条件存在明显不确定，暂不继续推进。",
  },
};

function createCandidate(index: number): QuickCandidate {
  return {
    id: `candidate-${Date.now()}-${index}`,
    name: "",
    rent: "",
    extraMonthly: "",
    commuteMinutes: "",
    depositMonths: "",
    risk: "review",
    notes: "",
  };
}

const comparisonScenarioTemplates: Array<{
  label: string;
  candidates: Omit<QuickCandidate, "id">[];
}> = [
  {
    label: "通勤预算取舍",
    candidates: [
      {
        name: "白石洲一房一厅",
        rent: "6800",
        extraMonthly: "650",
        commuteMinutes: "25",
        depositMonths: "4",
        risk: "review",
        notes: "离公司近，但押一付三，合同和退款条件还要确认。",
      },
      {
        name: "宝安中心整租一居",
        rent: "5200",
        extraMonthly: "500",
        commuteMinutes: "55",
        depositMonths: "2",
        risk: "clear",
        notes: "月成本低，但通勤时间长，晚归和雨天需要单独确认。",
      },
      {
        name: "西丽近地铁单间",
        rent: "5900",
        extraMonthly: "450",
        commuteMinutes: "38",
        depositMonths: "2",
        risk: "review",
        notes: "租金和通勤相对均衡，需要现场看噪音和采光。",
      },
    ],
  },
  {
    label: "便宜但风险高",
    candidates: [
      {
        name: "低价转租主卧",
        rent: "3300",
        extraMonthly: "350",
        commuteMinutes: "35",
        depositMonths: "1",
        risk: "stop",
        notes: "二房东转租，出租授权、押金返还和收款主体都没写清。",
      },
      {
        name: "正规中介一居",
        rent: "5200",
        extraMonthly: "500",
        commuteMinutes: "42",
        depositMonths: "2",
        risk: "clear",
        notes: "合同和收款主体比较清楚，但月租更高。",
      },
      {
        name: "老小区低楼层",
        rent: "4500",
        extraMonthly: "450",
        commuteMinutes: "48",
        depositMonths: "2",
        risk: "review",
        notes: "价格适中，但潮湿、噪音和维修责任要现场确认。",
      },
    ],
  },
];

function parseNumber(value: string) {
  if (/[-−]/.test(value)) return undefined;
  const match = value.replace(/,/g, "").match(/\d+(\.\d+)?/);
  return match ? Number(match[0]) : undefined;
}

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Math.round(value)));
}

function formatMoney(value?: number) {
  return typeof value === "number" ? `${Math.round(value).toLocaleString("zh-CN")} 元/月` : "待补充";
}

function formatDelta(value: number) {
  if (Math.abs(value) < 50) return "当前最低";
  return `比最低多 ${Math.round(value).toLocaleString("zh-CN")} 元/月`;
}

function buildAnalyzeHref(candidate: RankedCandidate) {
  const displayName = candidate.name || `候选 ${candidate.rank || ""}`.trim();
  const context = compactContext([
    "来自多房源快速对比：把这套候选转成完整房源体检。",
    `候选名称：${displayName}`,
    candidate.rentValue ? `月租：${candidate.rentValue} 元` : undefined,
    candidate.trueMonthlyCost ? `估算真实月成本：${candidate.trueMonthlyCost} 元` : undefined,
    candidate.commuteValue !== undefined ? `通勤：${candidate.commuteValue} 分钟` : undefined,
    candidate.depositValue ? `押付压力：约 ${candidate.depositValue} 个月租金` : undefined,
    `付款与合同：${riskCopy[candidate.risk].label}`,
    candidate.notes ? `备注：${candidate.notes}` : undefined,
    "当前行动：补充地址、截图或中介描述，保存完整体检后再决定是否付款或签约。",
  ]);

  return buildFlowHref("/analyze", {
    from: "compare",
    title: displayName,
    rent: candidate.rentValue ? `${candidate.rentValue} 元/月` : candidate.rent,
    commuteLimit: candidate.commuteValue !== undefined ? `${candidate.commuteValue} 分钟` : undefined,
    description: context,
    reportContext: context,
  });
}

export function rankCandidates(candidates: QuickCandidate[]) {
  const enriched = candidates.map((candidate) => {
    const rentValue = parseNumber(candidate.rent);
    const extraValue = parseNumber(candidate.extraMonthly) ?? 0;
    const commuteValue = parseNumber(candidate.commuteMinutes);
    const depositValue = parseNumber(candidate.depositMonths);
    const trueMonthlyCost = rentValue ? rentValue + extraValue : undefined;

    return {
      ...candidate,
      complete: typeof rentValue === "number" && rentValue > 0 && typeof commuteValue === "number" && commuteValue >= 0,
      rentValue,
      commuteValue,
      depositValue,
      trueMonthlyCost,
    };
  });

  const validCosts = enriched.filter(candidate => candidate.complete && candidate.risk !== "stop")
    .map((candidate) => candidate.trueMonthlyCost)
    .filter((value): value is number => typeof value === "number");
  const validCommutes = enriched.filter(candidate => candidate.complete && candidate.risk !== "stop")
    .map((candidate) => candidate.commuteValue)
    .filter((value): value is number => typeof value === "number");
  const lowestCost = validCosts.length ? Math.min(...validCosts) : undefined;
  const fastestCommute = validCommutes.length ? Math.min(...validCommutes) : undefined;

  return enriched
    .map((candidate) => {
      const costScore =
        candidate.trueMonthlyCost && lowestCost
          ? clamp(100 - ((candidate.trueMonthlyCost - lowestCost) / Math.max(lowestCost, 1)) * 130, 45, 100)
          : 62;
      const commuteScore =
        candidate.commuteValue !== undefined && fastestCommute !== undefined
          ? clamp(100 - Math.max(0, candidate.commuteValue - fastestCommute) * 1.8, 42, 100)
          : 62;
      const depositScore =
        typeof candidate.depositValue === "number"
          ? candidate.depositValue <= 2
            ? 92
            : candidate.depositValue <= 3
              ? 76
              : 58
          : 68;
      const riskScore = riskCopy[candidate.risk].score;
      const score = clamp(costScore * 0.34 + commuteScore * 0.25 + riskScore * 0.27 + depositScore * 0.14);
      const verdict = !candidate.complete ? "待补充" :
        candidate.risk === "stop" || score < 66
          ? "暂不继续"
          : score >= 82
            ? "优先继续"
            : "谨慎保留";
      const reasons = [
        candidate.trueMonthlyCost && lowestCost
          ? `月成本：${formatDelta(candidate.trueMonthlyCost - lowestCost)}`
          : "月成本还要补充",
        candidate.commuteValue !== undefined && fastestCommute !== undefined
          ? candidate.commuteValue === fastestCommute
            ? "通勤：当前最短"
            : `通勤：比最短多 ${candidate.commuteValue - fastestCommute} 分钟`
          : "通勤还要补充",
        typeof candidate.depositValue === "number"
          ? `押付：约 ${candidate.depositValue} 个月租金`
          : "押付压力还要补充",
        `付款与合同：${riskCopy[candidate.risk].label}`,
      ];

      const ranked = {
        ...candidate,
        score,
        rank: 0,
        verdict,
        reasons,
        analyzeHref: "",
      } satisfies RankedCandidate;

      return {
        ...ranked,
        analyzeHref: buildAnalyzeHref(ranked),
      };
    })
    .sort((a, b) => Number(b.complete) - Number(a.complete) || Number(a.risk === "stop") - Number(b.risk === "stop") || b.score - a.score)
    .map((candidate, index) => ({ ...candidate, rank: index + 1 }));
}

export function ManualComparisonBuilder() {
  const [candidates, setCandidates] = useState<QuickCandidate[]>([
    createCandidate(0),
    createCandidate(1),
  ]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved) as QuickCandidate[];
        if (Array.isArray(parsed) && parsed.length) {
          setCandidates(parsed.slice(0, 5));
        }
      }
    } catch {
      // 本地草稿损坏时直接使用空表单，不影响用户继续输入。
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try { window.localStorage.setItem(storageKey, JSON.stringify(candidates)); } catch { /* Keep the current comparison usable if browser storage is unavailable. */ }
  }, [candidates, loaded]);

  const rankedCandidates = useMemo(() => rankCandidates(candidates), [candidates]);
  const completeCount = rankedCandidates.filter(candidate => candidate.complete).length;
  const recommended = rankedCandidates.find(candidate => candidate.complete && candidate.risk !== "stop" && candidate.verdict !== "暂不继续");
  const hasEnoughInput = completeCount >= 2;

  function updateCandidate(id: string, patch: Partial<QuickCandidate>) {
    setCandidates((current) =>
      current.map((candidate) =>
        candidate.id === id ? { ...candidate, ...patch } : candidate,
      ),
    );
  }

  function addCandidate() {
    setCandidates((current) => [...current, createCandidate(current.length)].slice(0, 5));
  }

  function applyComparisonScenario(template: (typeof comparisonScenarioTemplates)[number]) {
    setCandidates(
      template.candidates.map((candidate, index) => ({
        ...candidate,
        id: `scenario-${Date.now()}-${index}`,
      })),
    );
  }

  function removeCandidate(id: string) {
    setCandidates((current) =>
      current.length <= 2 ? current.map((item) => (item.id === id ? createCandidate(current.indexOf(item)) : item)) : current.filter((item) => item.id !== id),
    );
  }

  return (
    <section id="quick-compare" className="rounded-lg border border-border bg-card p-5 sm:p-6">
      <div className="grid gap-6 xl:grid-cols-[0.34fr_0.66fr]">
        <div className="min-w-0">
          <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-md bg-primary/15 text-primary">
            <GitCompareIcon />
          </div>
          <p className="text-sm text-primary">快速候选对比</p>
          <h2 className="mt-2 text-2xl font-semibold">
            手上有两三套房，用关键字段排个序
          </h2>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">
            填写月租、固定支出、通勤、押付压力和付款与合同情况。排序只用于初筛，值得继续的房源再转成完整体检。
          </p>
          <div className="mt-5 grid gap-3">
            <QuickMetric
              icon={WalletCards}
              label="真实月成本"
              value={hasEnoughInput ? formatMoney(rankedCandidates[0]?.trueMonthlyCost) : "填满两套后排序"}
            />
            <QuickMetric
              icon={Clock3}
              label="通勤损耗"
              value={hasEnoughInput ? recommended?.commuteValue !== undefined ? `${recommended.commuteValue} 分钟` : "待补充" : "待综合判断"}
            />
            <QuickMetric
              icon={ShieldAlert}
              label="付款与合同"
              value={hasEnoughInput ? riskCopy[rankedCandidates[0]?.risk ?? "review"].label : "未确认清楚不付款"}
            />
          </div>
          <div className="mt-5 space-y-3">
            <div>
              <p className="mb-2 text-xs font-medium text-muted-foreground">常见对比场景</p>
              <div className="flex max-w-full gap-2 overflow-x-auto pb-1 xl:flex-col">
                {comparisonScenarioTemplates.map((template) => (
                  <button
                    key={template.label}
                    type="button"
                    onClick={() => applyComparisonScenario(template)}
                    className="shrink-0 rounded-full border border-border bg-secondary px-3 py-2 text-sm font-medium transition hover:border-primary/40 hover:text-primary xl:rounded-md"
                  >
                    {template.label}
                  </button>
                ))}
              </div>
            </div>
            <Button type="button" onClick={addCandidate} disabled={candidates.length >= 5}>
              <Plus className="mr-2 h-4 w-4" />
              添加候选
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setCandidates([createCandidate(0), createCandidate(1)])}
            >
              清空快速对比
            </Button>
          </div>
        </div>

        <div className="grid min-w-0 gap-4">
          <div className="grid gap-3 lg:grid-cols-2">
            {candidates.map((candidate, index) => (
              <article
                key={candidate.id}
                className="rounded-md border border-border bg-secondary/60 p-4"
              >
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/15 text-sm font-semibold text-primary">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium">候选房源</p>
                      <p className="text-xs text-muted-foreground">填你正在看的具体房源</p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="删除候选"
                    onClick={() => removeCandidate(candidate.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="房源名称">
                    <Input
                      value={candidate.name}
                      onChange={(event) => updateCandidate(candidate.id, { name: event.target.value })}
                      placeholder="填写房源名称或位置"
                    />
                  </Field>
                  <Field label="月租">
                    <Input
                      value={candidate.rent}
                      onChange={(event) => updateCandidate(candidate.id, { rent: event.target.value })}
                      inputMode="numeric"
                      placeholder="填写月租金额"
                    />
                  </Field>
                  <Field label="其他月支出">
                    <Input
                      value={candidate.extraMonthly}
                      onChange={(event) => updateCandidate(candidate.id, { extraMonthly: event.target.value })}
                      inputMode="numeric"
                      placeholder="物业/水电/网费"
                    />
                  </Field>
                  <Field label="单程通勤">
                    <Input
                      value={candidate.commuteMinutes}
                      onChange={(event) => updateCandidate(candidate.id, { commuteMinutes: event.target.value })}
                      inputMode="numeric"
                      placeholder="填写单程分钟数"
                    />
                  </Field>
                  <Field label="押付压力">
                    <Input
                      value={candidate.depositMonths}
                      onChange={(event) => updateCandidate(candidate.id, { depositMonths: event.target.value })}
                      inputMode="decimal"
                      placeholder="约几个月租金"
                    />
                  </Field>
                  <Field label="付款与合同">
                    <div className="grid grid-cols-3 gap-1.5">
                      {(["clear", "review", "stop"] as CandidateRisk[]).map((risk) => (
                        <button
                          key={risk}
                          type="button"
                          className={`min-h-11 rounded-md border px-2 text-xs transition-colors ${
                            candidate.risk === risk
                              ? "border-primary/40 bg-primary/15 text-primary"
                              : "border-border bg-secondary text-muted-foreground hover:bg-secondary/80"
                          }`}
                          onClick={() => updateCandidate(candidate.id, { risk })}
                        >
                          {riskCopy[risk].label}
                        </button>
                      ))}
                    </div>
                  </Field>
                </div>
                <Field label="备注" className="mt-3">
                  <Input
                    value={candidate.notes}
                    onChange={(event) => updateCandidate(candidate.id, { notes: event.target.value })}
                    placeholder="填写影响判断的补充信息"
                  />
                </Field>
              </article>
            ))}
          </div>

          <div className="rounded-md border border-primary/20 bg-primary/10 p-4">
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-primary">快速排序结果</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  {hasEnoughInput
                    ? "排序用于判断方向；付款、合同和押金仍要通过完整报告确认。"
                    : "至少填满两套候选的月租和通勤，排序才有参考价值。填完后会给出优先处理候选。"}
                </p>
              </div>
              <Badge variant={hasEnoughInput ? "success" : "warning"}>
                已填 {completeCount} 套
              </Badge>
            </div>

            {hasEnoughInput && recommended ? (
              <div className="mb-4 rounded-md border border-primary/20 bg-card/80 p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-primary">优先处理候选</p>
                    <h3 className="mt-1 text-lg font-semibold">
                      {recommended.name || "第一套候选"}
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      {recommended.verdict}。先把地址、截图、合同和付款信息补齐成完整体检，再决定是否继续谈。
                    </p>
                  </div>
                  <Button asChild className="shrink-0">
                    <Link href={recommended.analyzeHref}>
                      转成完整体检
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </div>
            ) : null}

            <div className="grid gap-3">
              {rankedCandidates.map((candidate) => (
                <RankedRow key={candidate.id} candidate={candidate} usable={hasEnoughInput && candidate.complete} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function RankedRow({
  candidate,
  usable,
}: {
  candidate: RankedCandidate;
  usable: boolean;
}) {
  const verdictVariant =
    candidate.verdict === "优先继续"
      ? "success"
      : candidate.verdict === "谨慎保留"
        ? "warning"
        : "destructive";

  return (
    <div className="rounded-md border border-border bg-background/45 p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/15 text-sm font-semibold text-primary">
              {candidate.rank}
            </span>
            <h3 className="font-semibold">{candidate.name || `候选 ${candidate.rank}`}</h3>
            <Badge variant={usable ? verdictVariant : "outline"}>
              {usable ? candidate.verdict : "待补充信息"}
            </Badge>
          </div>
          <div className="mt-3 grid gap-2 text-xs leading-5 text-muted-foreground md:grid-cols-2">
            {candidate.reasons.map((reason) => (
              <p key={reason}>{reason}</p>
            ))}
          </div>
        </div>
        <div className="flex shrink-0 flex-col gap-2 sm:flex-row lg:flex-col">
          <div className="rounded-md border border-border bg-secondary/60 px-3 py-2 text-center">
            <p className="text-xs text-muted-foreground">综合分</p>
            <p className="text-2xl font-semibold">{usable ? candidate.score : "-"}</p>
          </div>
          <Button asChild variant="secondary" size="sm">
            <Link href={candidate.analyzeHref}>
              转成完整体检
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

function QuickMetric({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof WalletCards;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-md border border-border bg-secondary/60 p-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/15 text-primary">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="mt-1 truncate text-sm font-semibold">{value}</p>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`grid gap-1.5 ${className}`}>
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

function GitCompareIcon() {
  return (
    <span className="relative flex h-5 w-5 items-center justify-center">
      <Home className="absolute left-0 top-0 h-3.5 w-3.5" />
      <CheckCircle2 className="absolute bottom-0 right-0 h-3.5 w-3.5" />
    </span>
  );
}

