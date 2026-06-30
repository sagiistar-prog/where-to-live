import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  ArrowRight,
  BadgeDollarSign,
  CheckCircle2,
  Copy,
  LayoutDashboard,
  PiggyBank,
  Route,
  WalletCards,
} from "lucide-react";
import { RiskBadge } from "@/components/risk-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { CityLedgerResult } from "@/lib/city-ledger";

type CityOption = CityLedgerResult["options"][number];

type BuyInput = {
  downPayment: string;
  mortgagePayment: string;
  homePrice: string;
};

export function CityLedgerResultCard({
  result,
  option,
  isBuyMode,
  buyInput,
  areaHref,
  secondaryHref,
  secondaryLabel,
  buyHref,
  copiedMemo,
  onCopyDecisionMemo,
}: {
  result: CityLedgerResult;
  option: CityOption;
  isBuyMode: boolean;
  buyInput: BuyInput;
  areaHref: string;
  secondaryHref: string;
  secondaryLabel: string;
  buyHref?: string;
  copiedMemo: boolean;
  onCopyDecisionMemo: () => void;
}) {
  const buyPressure = isBuyMode ? calculateBuyPressure(option, buyInput) : null;
  const decisionPath = buildDecisionPath({ option, isBuyMode, buyPressure });

  return (
    <Card className="p-6">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-medium text-primary/80">测算结果</p>
          <h2 className="mt-2 text-2xl font-semibold">
            {isBuyMode ? "长期承受力" : "城市预算判断"}
          </h2>
        </div>
        <RiskBadge status={option.pressure} tone="generic" />
      </div>
      <div className="space-y-5">
        <p className="text-sm leading-7 text-muted-foreground">{result.summary}</p>

        {result.dataSources.length ? (
          <div className="rounded-md border border-border bg-secondary p-4">
            <h3 className="text-sm font-semibold">数据来源</h3>
            <div className="mt-2 grid gap-2 text-xs leading-5 text-muted-foreground">
              {result.dataSources.slice(0, 4).map((source) => (
                <p key={`${source.city}-${source.asOf}`} className="rounded-md border border-border bg-card/70 px-3 py-2">
                  {source.city}：{source.label}
                </p>
              ))}
            </div>
          </div>
        ) : null}

        {!isBuyMode && result.options.length > 1 ? (
          <OfferComparisonStrip options={result.options} />
        ) : null}

        <div className="rounded-md border border-primary/20 bg-primary/[0.06] p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-primary">下一步决策路径</p>
              <h3 className="mt-1 text-lg font-semibold">{decisionPath.title}</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {decisionPath.summary}
              </p>
            </div>
            <RiskBadge status={decisionPath.status} tone="generic" />
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            {decisionPath.steps.map((step) => (
              <div key={step.label} className="rounded-md border border-border bg-card/80 p-3">
                <p className="text-xs font-medium text-muted-foreground">{step.label}</p>
                <p className="mt-1 text-sm leading-6 text-foreground">{step.value}</p>
              </div>
            ))}
          </div>
        </div>

        {buyPressure ? (
          <>
            <div className="grid gap-3 sm:grid-cols-3">
              <Metric
                icon={WalletCards}
                label="目标总价"
                value={buyPressure.homePrice ? formatMoney(buyPressure.homePrice) : "待填写"}
              />
              <Metric
                icon={BadgeDollarSign}
                label="月供占收入"
                value={formatPercent(buyPressure.mortgageRatio)}
              />
              <Metric
                icon={PiggyBank}
                label="月供后结余"
                value={formatMoney(buyPressure.afterMortgageSavings)}
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <Metric
                icon={WalletCards}
                label="可用首付"
                value={buyPressure.downPayment ? formatMoney(buyPressure.downPayment) : "待填写"}
              />
              <Metric
                icon={AlertTriangle}
                label="首付缺口"
                value={buyPressure.downPaymentGap > 0 ? formatMoney(buyPressure.downPaymentGap) : "暂无缺口"}
              />
              <Metric
                icon={Route}
                label="建议月供上限"
                value={formatMoney(buyPressure.suggestedMortgageLimit)}
              />
            </div>
          </>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-3">
              <Metric
                icon={WalletCards}
                label="真实月成本"
                value={formatMoney(option.trueMonthlyCost)}
              />
              <Metric
                icon={PiggyBank}
                label="预计月结余"
                value={formatMoney(option.monthlySavings)}
              />
              <Metric icon={Route} label="储蓄率" value={formatPercent(option.savingRate)} />
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <Metric
                icon={BadgeDollarSign}
                label="达标税后收入"
                value={formatMoney(option.requiredIncomeForGoal)}
              />
              <Metric
                icon={WalletCards}
                label="安全租金上限"
                value={formatMoney(option.maxSafeRentForGoal)}
              />
              <Metric
                icon={AlertTriangle}
                label="当前差额"
                value={option.incomeGapToGoal > 0 ? formatMoney(option.incomeGapToGoal) : "已达标"}
              />
            </div>
          </>
        )}

        <div className="rounded-md border border-border bg-secondary p-4">
          <h3 className="text-sm font-semibold">岗位机会口径</h3>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {option.industry}：{option.baselineNote}
          </p>
          {option.baselineStatus === "estimated" ? (
            <p className="mt-3 rounded-md border border-amber-300/25 bg-amber-300/10 px-3 py-2 text-xs leading-5 text-amber-700">
              {option.dataSourceLabel}。正式换城市前，请用真实offer、目标片区租金和通勤路线复核。
            </p>
          ) : null}
        </div>

        {!isBuyMode ? <OfferGateCard option={option} /> : null}

        {isBuyMode ? <BuyPressureCard option={option} buyInput={buyInput} /> : null}

        <div className="rounded-md border border-border bg-secondary p-4">
          <div className="mb-3 flex items-center justify-between gap-4">
            <p className="text-sm font-medium">综合适配分</p>
            <p className="text-2xl font-semibold">{option.score}</p>
          </div>
          <Progress value={option.score} />
          <p className="mt-3 text-sm leading-6 text-muted-foreground">{option.verdict}</p>
        </div>

        <div>
          <h3 className="font-semibold">主要影响因素</h3>
          <div className="mt-3 grid gap-2">
            {option.tradeoffs.map((item) => (
              <p
                key={item}
                className="rounded-md border border-border bg-secondary px-3 py-2 text-sm leading-6 text-muted-foreground"
              >
                {item}
              </p>
            ))}
          </div>
        </div>

        <div className="rounded-md border border-primary/25 bg-primary/10 p-4">
          <p className="text-sm leading-6 text-primary">{option.nextStep}</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <Button asChild>
              <Link href={areaHref}>
                筛选片区
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href={secondaryHref}>
                {secondaryLabel}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            {!isBuyMode && buyHref ? (
              <Button asChild variant="outline">
                <Link href={buyHref}>
                  买房大致判断
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            ) : null}
            <Button type="button" variant="outline" onClick={onCopyDecisionMemo}>
              <Copy className="mr-2 h-4 w-4" />
              {copiedMemo ? "已复制" : "复制结论"}
            </Button>
            <Button asChild variant="outline">
              <Link href="/dashboard">
                <LayoutDashboard className="mr-2 h-4 w-4" />
                回到工作台
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

function formatMoney(value: number) {
  return `${Math.round(value)}元`;
}

function parseMoney(value?: string) {
  const normalized = value?.replace(/,/g, "").trim() ?? "";
  const match = normalized.match(/\d+(\.\d+)?/);
  if (!match) return 0;
  const amount = Number(match[0]);
  if (!Number.isFinite(amount)) return 0;
  if (/[万wW]/.test(normalized)) return amount * 10000;
  if (/[千kK]/.test(normalized)) return amount * 1000;
  return amount;
}

function calculateBuyPressure(option: CityOption, buyInput: BuyInput) {
  const homePrice = parseMoney(buyInput.homePrice);
  const downPayment = parseMoney(buyInput.downPayment);
  const mortgagePayment = parseMoney(buyInput.mortgagePayment);
  const availableMonthlyBuffer = Math.max(0, option.monthlySavings);
  const suggestedMortgageLimit = Math.round(availableMonthlyBuffer * 0.65);
  const monthlyPayment = mortgagePayment || suggestedMortgageLimit;
  const downPaymentGap = homePrice ? Math.max(0, homePrice * 0.3 - downPayment) : 0;
  const mortgageRatio = option.monthlyIncome > 0 ? monthlyPayment / option.monthlyIncome : 1;
  const afterMortgageSavings = option.monthlySavings - monthlyPayment;

  return {
    homePrice,
    downPayment,
    mortgagePayment,
    suggestedMortgageLimit,
    monthlyPayment,
    downPaymentGap,
    mortgageRatio,
    afterMortgageSavings,
  };
}

function buildDecisionPath({
  option,
  isBuyMode,
  buyPressure,
}: {
  option: CityOption;
  isBuyMode: boolean;
  buyPressure: ReturnType<typeof calculateBuyPressure> | null;
}) {
  if (isBuyMode) {
    const shouldPause =
      !buyPressure?.homePrice ||
      !buyPressure.downPayment ||
      buyPressure.downPaymentGap > 0 ||
      buyPressure.mortgageRatio > 0.35 ||
      buyPressure.afterMortgageSavings < 0;

    return {
      status: shouldPause ? "caution" as const : "recommend" as const,
      title: shouldPause ? "补齐购房压力信息" : "进入片区和交易风险确认",
      summary: shouldPause
        ? "目标总价、首付和月供压力缺一项，长期承受力就无法判断。"
        : "当前现金流可进入下一轮比较，片区、贷款资格、税费和付款风险仍要单独核对。",
      steps: [
        { label: "当前动作", value: shouldPause ? "补目标总价、首付和月供上限" : "筛选通勤和生活稳定的片区" },
        { label: "继续", value: shouldPause ? "重新测算后再看片区" : "核对合同、付款和交易费用" },
        { label: "暂停条件", value: "月供超过收入35%或月供后结余为负" },
      ],
    };
  }

  if (option.offerGate.level === "stop") {
    return {
      status: "reject" as const,
      title: "暂不进入看房阶段",
      summary: "当前offer在该城市下没有形成稳定结余。看房前，需要调整薪资、租金或候选城市。",
      steps: [
        { label: "当前动作", value: "调整offer、补贴或租金上限" },
        { label: "继续", value: "换一个城市情景重新测算" },
        { label: "暂停条件", value: "收入差额或租金差额仍然过大" },
      ],
    };
  }

  if (option.offerGate.level === "review") {
    return {
      status: "caution" as const,
      title: "保留备选，带着边界看片区",
      summary: "这个城市可以继续比较，但预算空间偏紧。片区筛选时，租金上限和通勤上限必须作为硬条件。",
      steps: [
        { label: "当前动作", value: "筛选前2个片区" },
        { label: "继续", value: "只看不超过安全租金上限的房源" },
        { label: "暂停条件", value: "月租超过安全租金上限" },
      ],
    };
  }

  return {
    status: "recommend" as const,
    title: "进入片区筛选，再看具体房源",
    summary: "城市预算成立，比较重点可以从城市转到片区、通勤和具体房源条件。",
    steps: [
      { label: "当前动作", value: "筛选片区" },
      { label: "继续", value: "比较2到3套具体房源" },
      { label: "暂停条件", value: "通勤、楼龄或付款条件不达标" },
    ],
  };
}

function OfferComparisonStrip({ options }: { options: CityOption[] }) {
  return (
    <div className="rounded-md border border-border bg-secondary p-4">
      <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold">多城市offer对比</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            对齐税后月收入、真实月结余和储蓄率。
          </p>
        </div>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {options.slice(0, 4).map((item) => (
          <div key={item.city} className="rounded-md border border-border bg-card px-3 py-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold">{item.city}</p>
              <p className="text-xs text-muted-foreground">{formatPercent(item.savingRate)}</p>
            </div>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">
              税后{formatMoney(item.monthlyIncome)}，月结余{formatMoney(item.monthlySavings)}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-md border border-border bg-secondary p-4">
      <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-md bg-primary/15 text-primary">
        <Icon className="h-4 w-4" />
      </div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-semibold">{value}</p>
    </div>
  );
}

function OfferGateCard({ option }: { option: CityOption }) {
  const tone =
    option.offerGate.level === "ready"
      ? {
          className: "border-emerald-300/25 bg-emerald-300/10 text-emerald-900",
          iconClassName: "text-emerald-700",
          Icon: CheckCircle2,
        }
      : option.offerGate.level === "stop"
        ? {
            className: "border-rose-300/25 bg-rose-300/10 text-rose-900",
            iconClassName: "text-rose-700",
            Icon: AlertTriangle,
          }
        : {
            className: "border-amber-300/25 bg-amber-300/10 text-amber-900",
            iconClassName: "text-amber-700",
            Icon: AlertTriangle,
          };
  const Icon = tone.Icon;

  return (
    <div className={`rounded-md border p-4 ${tone.className}`}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Icon className={`h-4 w-4 ${tone.iconClassName}`} />
            <p className="text-sm font-semibold">跨城offer口径：{option.offerGate.label}</p>
          </div>
          <p className="mt-2 text-sm leading-6 text-current/80">
            {option.offerGate.summary}
          </p>
        </div>
        <div className="grid shrink-0 grid-cols-2 gap-2 sm:w-[260px]">
          <GateFact
            label="谈薪差额"
            value={option.incomeGapToGoal > 0 ? formatMoney(option.incomeGapToGoal) : "已达标"}
          />
          <GateFact
            label="降租差额"
            value={option.rentGapToGoal > 0 ? formatMoney(option.rentGapToGoal) : "未超线"}
          />
        </div>
      </div>
      <p className="mt-3 rounded-md border border-border bg-secondary/60 px-3 py-2 text-sm leading-6 text-current/85">
        {option.offerGate.negotiation}
      </p>
    </div>
  );
}

function BuyPressureCard({
  option,
  buyInput,
}: {
  option: CityOption;
  buyInput: BuyInput;
}) {
  const {
    homePrice,
    downPayment,
    downPaymentGap,
    mortgageRatio,
    afterMortgageSavings,
  } = calculateBuyPressure(option, buyInput);
  const pressure =
    !homePrice || !downPayment
      ? "补充目标总价和首付后，才能判断购房压力。"
      : downPaymentGap > 0
        ? `按30%首付估算，还差${formatMoney(downPaymentGap)}。暂不进入付款或签约。`
        : mortgageRatio > 0.35 || afterMortgageSavings < 0
          ? "月供会明显挤压日常生活和风险准备金，需要降低总价或延后购房。"
          : "首付和月供可进入下一轮片区比较，后续仍需确认贷款资格、税费和交易成本。";

  return (
    <div className="rounded-md border border-border bg-secondary p-4">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold">买房压力</p>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            核对首付和月供是否超过长期承受范围，再继续比较片区。
          </p>
        </div>
        <RiskBadge
          status={downPaymentGap > 0 || mortgageRatio > 0.35 || afterMortgageSavings < 0 ? "caution" : "recommend"}
          tone="generic"
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <GateFact label="目标总价" value={homePrice ? formatMoney(homePrice) : "待填写"} />
        <GateFact label="首付缺口" value={downPaymentGap > 0 ? formatMoney(downPaymentGap) : "暂无缺口"} />
        <GateFact label="月供后结余" value={formatMoney(afterMortgageSavings)} />
      </div>
      <p className="mt-3 rounded-md border border-border bg-card px-3 py-2 text-sm leading-6 text-muted-foreground">
        {pressure}
      </p>
    </div>
  );
}

function GateFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-secondary/60 p-3">
      <p className="text-xs text-current/60">{label}</p>
      <p className="mt-1 text-sm font-semibold">{value}</p>
    </div>
  );
}
