"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Banknote,
  Calculator,
  CheckCircle2,
  Copy,
  Landmark,
  Loader2,
  PiggyBank,
  ShieldAlert,
  WalletCards,
} from "lucide-react";
import { RiskBadge } from "@/components/risk-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import type {
  BuyStressInput,
  BuyStressResult,
  BuyStressScenario,
} from "@/lib/buy-stress";
import { recordCaseEvent } from "@/lib/client-case-events";
import { buildFlowHref, compactContext } from "@/lib/flow-links";

type SubmitState = "idle" | "loading" | "error";

type BuyStressSeed = Partial<BuyStressInput> & {
  sourceLabel?: string;
  reportContext?: string;
};

function seedValue(value: string | undefined, fallback: string) {
  return value?.trim() || fallback;
}

function formatMoney(value: number) {
  return `${Math.round(value).toLocaleString("zh-CN")} 元`;
}

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

function currentHref() {
  if (typeof window === "undefined") return undefined;
  return `${window.location.pathname}${window.location.search}`;
}

export function BuyStressPanel({
  reportId,
  initialInput,
}: {
  reportId?: string;
  initialInput?: BuyStressSeed;
}) {
  const [result, setResult] = useState<BuyStressResult | null>(null);
  const [lastInput, setLastInput] = useState<BuyStressInput | null>(null);
  const [copiedBrief, setCopiedBrief] = useState(false);
  const [state, setState] = useState<SubmitState>("idle");
  const [message, setMessage] = useState(
    "这里只做预算承压判断，不预测房价，也不读取银行或征信账户。",
  );

  const activeReportId = reportId?.trim() || "";

  const defaults = useMemo(
    () => ({
      city: seedValue(initialInput?.city, "杭州"),
      householdIncome: seedValue(initialInput?.householdIncome, "20000 元/月"),
      cashSavings: seedValue(initialInput?.cashSavings, "85 万"),
      currentRent: seedValue(initialInput?.currentRent, "6200 元/月"),
      fixedCost: seedValue(initialInput?.fixedCost, "6500 元/月"),
      targetTotalPrice: seedValue(initialInput?.targetTotalPrice, "280 万"),
      downPaymentRatio: seedValue(initialInput?.downPaymentRatio, "30%"),
      loanYears: seedValue(initialInput?.loanYears, "30 年"),
      mortgageRate: seedValue(initialInput?.mortgageRate, "3.5%"),
      propertyCost: seedValue(initialInput?.propertyCost, "900 元/月"),
      incomeDrop: seedValue(initialInput?.incomeDrop, "20%"),
      safetyMonths: seedValue(initialInput?.safetyMonths, "12 个月"),
    }),
    [initialInput],
  );
  const submittedInput: BuyStressInput = lastInput ?? defaults;
  const submittedCity = submittedInput.city?.trim() || result?.city || defaults.city;

  const decisionContext = useMemo(() => {
    if (!result) return "";
    return compactContext([
      initialInput?.reportContext,
      "买房压力输入：",
      `城市：${submittedCity}`,
      submittedInput.householdIncome ? `家庭税后月收入：${submittedInput.householdIncome}` : undefined,
      submittedInput.currentRent ? `当前月租：${submittedInput.currentRent}` : undefined,
      submittedInput.cashSavings ? `可用现金：${submittedInput.cashSavings}` : undefined,
      submittedInput.fixedCost ? `其他固定支出：${submittedInput.fixedCost}` : undefined,
      submittedInput.safetyMonths ? `安全垫要求：${submittedInput.safetyMonths}` : undefined,
      submittedInput.targetTotalPrice ? `目标总价：${submittedInput.targetTotalPrice}` : undefined,
      "买房压力：",
      `${result.city} 当前测算结论：${result.summary}`,
      `承受分 ${result.score}`,
      result.riskFlags,
      result.nextSteps,
    ]);
  }, [initialInput?.reportContext, result, submittedCity, submittedInput]);

  const cityHref = result
    ? buildFlowHref("/city", {
        from: "buy",
        reportId: activeReportId,
        city: submittedCity,
        currentCity: submittedCity,
        monthlyIncome: submittedInput.householdIncome,
        householdIncome: submittedInput.householdIncome,
        rentBudget: submittedInput.currentRent,
        currentRent: submittedInput.currentRent,
        fixedCost: submittedInput.fixedCost,
        cashSavings: submittedInput.cashSavings,
        safetyMonths: submittedInput.safetyMonths,
        targetTotalPrice: submittedInput.targetTotalPrice,
        reportContext: decisionContext,
      })
    : "/city";

  const areaHref = result
    ? buildFlowHref("/area", {
        from: "buy",
        reportId: activeReportId,
        city: submittedCity,
        budget: submittedInput.currentRent,
        monthlyIncome: submittedInput.householdIncome,
        householdIncome: submittedInput.householdIncome,
        currentRent: submittedInput.currentRent,
        cashSavings: submittedInput.cashSavings,
        safetyMonths: submittedInput.safetyMonths,
        targetTotalPrice: submittedInput.targetTotalPrice,
        reportContext: decisionContext,
      })
    : "/area";

  const analyzeHref = result
    ? buildFlowHref("/analyze", {
        from: "buy",
        reportId: activeReportId,
        city: submittedCity,
        income: submittedInput.householdIncome,
        householdIncome: submittedInput.householdIncome,
        monthlyIncome: submittedInput.householdIncome,
        rent: submittedInput.currentRent,
        currentRent: submittedInput.currentRent,
        budget: submittedInput.currentRent,
        fixedCost: submittedInput.fixedCost,
        cashSavings: submittedInput.cashSavings,
        safetyMonths: submittedInput.safetyMonths,
        targetTotalPrice: submittedInput.targetTotalPrice,
        description: decisionContext,
        reportContext: decisionContext,
      })
    : "/analyze";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState("loading");
    setMessage("正在计算月供、首付后现金、安全垫和压力情景...");

    const form = new FormData(event.currentTarget);
    const payload: BuyStressInput = {
      city: String(form.get("city") || ""),
      householdIncome: String(form.get("householdIncome") || ""),
      cashSavings: String(form.get("cashSavings") || ""),
      currentRent: String(form.get("currentRent") || ""),
      fixedCost: String(form.get("fixedCost") || ""),
      targetTotalPrice: String(form.get("targetTotalPrice") || ""),
      downPaymentRatio: String(form.get("downPaymentRatio") || ""),
      loanYears: String(form.get("loanYears") || ""),
      mortgageRate: String(form.get("mortgageRate") || ""),
      propertyCost: String(form.get("propertyCost") || ""),
      incomeDrop: String(form.get("incomeDrop") || ""),
      safetyMonths: String(form.get("safetyMonths") || ""),
    };
    setLastInput(payload);

    try {
      const response = await fetch("/api/buy/stress", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error("买房压力测算失败，请确认信息后重试。");
      }

      const data = (await response.json()) as BuyStressResult;
      setResult(data);
      setState("idle");
      setMessage("压力测算已更新。请重点看月供收入比、安全垫和降薪情景。");

      if (activeReportId) {
        void recordCaseEvent({
          reportId: activeReportId,
          type: "buy",
          title: "买房压力",
          status: data.status,
          summary: data.summary,
          highlights: [
            `目标城市 ${data.city}`,
            `承受分 ${data.score}`,
            ...data.riskFlags,
            ...data.mustVerify,
            ...data.nextSteps,
          ].slice(0, 6),
          href: currentHref(),
        });
      }
    } catch (error) {
      setState("error");
      setMessage(error instanceof Error ? error.message : "买房压力失败，请稍后重试。");
    }
  }

  async function handleCopyBrief() {
    if (!result) return;

    try {
      await navigator.clipboard.writeText(
        buildBuyDecisionBrief({
          result,
          input: submittedInput,
          city: submittedCity,
          reportContext: initialInput?.reportContext,
        }),
      );
      setCopiedBrief(true);
      setMessage("租买取舍简报已复制，可以直接发给伴侣、家人或经纪人做下一轮沟通。");
      window.setTimeout(() => setCopiedBrief(false), 2200);
    } catch {
      setCopiedBrief(false);
      setMessage("复制失败，请确认浏览器剪贴板权限后重试。");
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="grid gap-4 xl:grid-cols-[0.43fr_0.57fr]">
        <Card className="p-6">
          <div className="mb-6">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm text-primary/80">
                Stress Input
              </p>
              {initialInput?.sourceLabel ? (
                <Badge variant="secondary">{initialInput.sourceLabel}</Badge>
              ) : null}
            </div>
            <h2 className="mt-2 text-2xl font-semibold">输入买房预算</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              先算能不能承受，再谈要不要买。重点看月供、首付后现金和坏情景下还能撑多久。
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="目标城市" name="city" defaultValue={defaults.city} />
            <Field
              label="家庭税后月收入"
              name="householdIncome"
              defaultValue={defaults.householdIncome}
            />
            <Field label="可用现金" name="cashSavings" defaultValue={defaults.cashSavings} />
            <Field label="当前月租" name="currentRent" defaultValue={defaults.currentRent} />
            <Field
              label="其他固定支出"
              name="fixedCost"
              defaultValue={defaults.fixedCost}
            />
            <Field
              label="目标总价"
              name="targetTotalPrice"
              defaultValue={defaults.targetTotalPrice}
            />
            <Field
              label="首付比例"
              name="downPaymentRatio"
              defaultValue={defaults.downPaymentRatio}
            />
            <Field label="贷款年限" name="loanYears" defaultValue={defaults.loanYears} />
            <Field
              label="商贷利率估算"
              name="mortgageRate"
              defaultValue={defaults.mortgageRate}
            />
            <Field
              label="物业维修等月成本"
              name="propertyCost"
              defaultValue={defaults.propertyCost}
            />
            <Field
              label="压力情景收入下降"
              name="incomeDrop"
              defaultValue={defaults.incomeDrop}
            />
            <Field
              label="期望安全垫"
              name="safetyMonths"
              defaultValue={defaults.safetyMonths}
            />
          </div>

          <div
            className={`mt-5 rounded-md border p-3 text-sm leading-6 ${
              state === "error"
                ? "border-rose-300/20 bg-rose-300/10 text-rose-700"
                : "border-border bg-secondary text-muted-foreground"
            }`}
          >
            <div className="flex gap-2">
              {state === "error" ? (
                <AlertTriangle className="mt-1 h-4 w-4 shrink-0" />
              ) : (
                <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-primary" />
              )}
              <span>{message}</span>
            </div>
          </div>

          <Button type="submit" size="lg" className="mt-5 w-full" disabled={state === "loading"}>
            {state === "loading" ? (
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            ) : (
              <Calculator className="mr-2 h-5 w-5" />
            )}
            {state === "loading" ? "正在计算压力" : "测算买房压力"}
          </Button>
        </Card>

        <Card className="p-6">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm text-primary/80">
                判断结果
              </p>
              <h2 className="mt-2 text-2xl font-semibold">是否能承受</h2>
            </div>
            {result ? <RiskBadge status={result.status} tone="generic" /> : null}
          </div>

          {result ? (
            <div className="space-y-5">
              <p className="text-sm leading-7 text-muted-foreground">{result.summary}</p>

              <div className="rounded-md border border-border bg-secondary p-4">
                <div className="mb-3 flex items-center justify-between gap-4">
                  <p className="text-sm font-medium">买入承受分</p>
                  <p className="text-2xl font-semibold">{result.score}</p>
                </div>
                <Progress value={result.score} />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {result.metrics.map((metric) => (
                  <MetricCard key={metric.label} metric={metric} />
                ))}
              </div>

              <div className="rounded-md border border-amber-300/20 bg-amber-300/10 p-4">
                <div className="mb-3 flex items-center gap-2 text-amber-700">
                  <ShieldAlert className="h-4 w-4" />
                  <h3 className="font-semibold">风险线</h3>
                </div>
                <div className="grid gap-2 text-sm leading-6 text-amber-900/90">
                  {result.riskFlags.map((item) => (
                    <p key={item}>{item}</p>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex min-h-[460px] flex-col justify-center rounded-md border border-border bg-secondary p-5">
              <Badge variant="secondary" className="mb-4 w-fit">
                不预测房价
              </Badge>
              <h3 className="text-xl font-semibold">买房前先做坏情景</h3>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">
                如果收入下降、换城市、装修超支或家庭支出增加，月供还能不能撑住？这里只回答预算问题。
              </p>
            </div>
          )}
        </Card>
      </form>

      {result ? (
        <>
          <section>
            <div className="mb-4">
              <h2 className="text-xl font-semibold">租售压力情景</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                不同情景的价值不一样：租房保留现金和流动性，买房换来稳定性，但会锁定预算。
              </p>
            </div>
            <div className="grid gap-4 lg:grid-cols-3">
              {result.scenarios.map((scenario) => (
                <ScenarioCard key={scenario.label} scenario={scenario} />
              ))}
            </div>
          </section>

          <section className="grid gap-4 lg:grid-cols-2">
            <Card className="p-5">
              <h3 className="font-semibold">买前必须确认</h3>
              <div className="mt-3 grid gap-2 text-sm leading-6 text-muted-foreground">
                {result.mustVerify.map((item) => (
                  <p key={item} className="rounded-md border border-border bg-secondary p-3">
                    {item}
                  </p>
                ))}
              </div>
            </Card>
            <Card className="p-5">
              <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="font-semibold">下一步</h3>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    复制简报后，可以把同一套预算口径发给一起看房的人确认。
                  </p>
                </div>
                <Button type="button" variant="secondary" onClick={handleCopyBrief}>
                  <Copy className="mr-2 h-4 w-4" />
                  {copiedBrief ? "已复制" : "复制租买取舍简报"}
                </Button>
              </div>
              <div className="mt-3 grid gap-2 text-sm leading-6 text-muted-foreground">
                {result.nextSteps.map((item) => (
                  <p key={item} className="rounded-md border border-border bg-secondary p-3">
                    {item}
                  </p>
                ))}
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <Button asChild variant="outline">
                  <Link href={cityHref}>
                    回到城市账本
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href={areaHref}>
                    继续筛片区
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild>
                  <Link href={analyzeHref}>
                    评估候选房源
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </Card>
          </section>

          <Card className="p-5">
            <h3 className="font-semibold">测算假设</h3>
            <div className="mt-3 grid gap-2 text-sm leading-6 text-muted-foreground md:grid-cols-2">
              {result.assumptions.map((item) => (
                <p key={item}>{item}</p>
              ))}
            </div>
          </Card>
        </>
      ) : null}
    </div>
  );
}

function buildBuyDecisionBrief({
  result,
  input,
  city,
  reportContext,
}: {
  result: BuyStressResult;
  input: BuyStressInput;
  city: string;
  reportContext?: string;
}) {
  const stressScenario =
    result.scenarios.find((scenario) => scenario.label.includes("压力")) ??
    result.scenarios[result.scenarios.length - 1];

  return [
    "住哪儿｜租买取舍简报",
    "",
    "输入口径",
    `城市：${city}`,
    `家庭税后月收入：${input.householdIncome}`,
    `当前月租：${input.currentRent}`,
    `可用现金：${input.cashSavings}`,
    `其他固定支出：${input.fixedCost}`,
    `目标总价：${input.targetTotalPrice}`,
    `首付比例：${input.downPaymentRatio}`,
    `贷款年限：${input.loanYears}`,
    `期望安全垫：${input.safetyMonths}`,
    reportContext ? `来源上下文：${reportContext}` : undefined,
    "",
    "当前结论",
    result.summary,
    `买入承受分：${result.score}`,
    "",
    "关键指标",
    ...result.metrics.map((metric) => `${metric.label}：${metric.value}。${metric.note}`),
    stressScenario
      ? `压力情景：${stressScenario.label}，安全垫约 ${Math.max(
          0,
          Math.floor(stressScenario.bufferMonths),
        )} 个月，结论：${stressScenario.verdict}`
      : undefined,
    "",
    "风险线",
    ...result.riskFlags.map((item, index) => `${index + 1}. ${item}`),
    "",
    "买前必须确认",
    ...result.mustVerify.map((item, index) => `${index + 1}. ${item}`),
    "",
    "下一步",
    ...result.nextSteps.map((item, index) => `${index + 1}. ${item}`),
    "",
    "对外话术",
    `我现在按预算口径评估 ${city} 买房压力。当前结论是：${result.summary} 在确认月供、首付后安全垫、压力情景和通勤变化之前，我不会先交定金或承诺签约。`,
    "",
    "使用边界",
    "本简报用于判断预算承受力；房价走势、贷款审批、征信审核和法律问题仍需单独确认。",
  ]
    .filter(Boolean)
    .join("\n");
}

function Field({
  label,
  name,
  defaultValue,
}: {
  label: string;
  name: string;
  defaultValue: string;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} defaultValue={defaultValue} />
    </div>
  );
}

function MetricCard({ metric }: { metric: BuyStressResult["metrics"][number] }) {
  const iconMap = {
    月供收入比: WalletCards,
    首付后现金: Banknote,
    安全垫: PiggyBank,
    压力情景月供比: AlertTriangle,
  };
  const Icon = iconMap[metric.label as keyof typeof iconMap] ?? Landmark;

  return (
    <div className="rounded-md border border-border bg-secondary p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/15 text-primary">
          <Icon className="h-4 w-4" />
        </div>
        <RiskBadge status={metric.status} tone="generic" />
      </div>
      <p className="text-xs text-muted-foreground">{metric.label}</p>
      <p className="mt-1 text-xl font-semibold">{metric.value}</p>
      <p className="mt-2 text-xs leading-5 text-muted-foreground">{metric.note}</p>
    </div>
  );
}

function ScenarioCard({ scenario }: { scenario: BuyStressScenario }) {
  return (
    <Card className="p-5">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold">{scenario.label}</h3>
          <p className="mt-1 text-xs text-muted-foreground">承受分 {scenario.score}</p>
        </div>
        <RiskBadge status={scenario.status} tone="generic" />
      </div>
      <Progress value={scenario.score} />
      <div className="mt-5 grid gap-3 text-sm">
        <Info label="月居住支出" value={formatMoney(scenario.monthlyHousingCost)} />
        <Info label="收入占比" value={formatPercent(scenario.paymentRatio)} />
        <Info label="剩余现金" value={formatMoney(scenario.cashAfterDownPayment)} />
        <Info label="安全垫" value={`${Math.max(0, Math.floor(scenario.bufferMonths))} 个月`} />
      </div>
      <p className="mt-5 rounded-md border border-border bg-secondary p-3 text-sm leading-6 text-muted-foreground">
        {scenario.verdict}
      </p>
      <div className="mt-4 space-y-2 border-t border-border pt-4">
        {scenario.tradeoffs.map((item) => (
          <p key={item} className="text-xs leading-5 text-muted-foreground">
            {item}
          </p>
        ))}
      </div>
    </Card>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}

