import Link from "next/link";
import { TrainFront } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { CommuteCostPanel } from "@/components/commute-cost-panel";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { buildFlowHref } from "@/lib/flow-links";

type SearchParams = Record<string, string | string[] | undefined>;

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function seedFromParams(params: SearchParams) {
  const from = firstParam(params.from);

  return {
    city: firstParam(params.city),
    listingTitle: firstParam(params.listingTitle) || firstParam(params.title),
    workplace: firstParam(params.workplace),
    monthlyIncome: firstParam(params.monthlyIncome),
    monthlyRent: firstParam(params.monthlyRent) || firstParam(params.budget),
    oneWayMinutes: firstParam(params.oneWayMinutes),
    commuteLimitMinutes: firstParam(params.commuteLimitMinutes) || firstParam(params.commuteLimit),
    reportContext: firstParam(params.reportContext),
    sourceLabel:
      from === "area"
        ? "来自片区筛选"
        : from === "analyze" || from === "report"
          ? "来自房源评估"
        : from === "case"
          ? "来自房源记录"
          : from === "plan"
            ? "来自下一步"
            : from === "home"
              ? "来自首页输入"
              : from === "dashboard"
                ? "来自工作台输入"
                : undefined,
  };
}

export default async function CommutePage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const params = (await searchParams) ?? {};
  const reportId = firstParam(params.reportId);
  const initialInput = seedFromParams(params);
  const areaHref = buildFlowHref("/area", {
    from: "commute",
    reportId,
    city: initialInput.city,
    workplace: initialInput.workplace,
    budget: initialInput.monthlyRent,
    commuteLimit: initialInput.commuteLimitMinutes,
    reportContext: initialInput.reportContext,
  });
  const compareHref = buildFlowHref("/compare", {
    from: "commute",
    reportId,
    currentTitle: initialInput.listingTitle,
    reportContext: initialInput.reportContext,
  });

  return (
    <AppShell>
      <div className="mx-auto max-w-7xl space-y-8">
        <section className="grid gap-6 lg:grid-cols-[0.62fr_0.38fr]">
          <div className="min-w-0">
            <p className="text-sm text-primary/80">
              通勤成本
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-normal sm:text-4xl">
              通勤真实成本
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground">
              通勤成本要看步行、换乘、晚归打车、坏天气和时间消耗，帮你判断低房租是否真的划算。
            </p>
          </div>
          <Card className="min-w-0 p-6">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-md bg-primary/15 text-primary">
              <TrainFront className="h-6 w-6" />
            </div>
            <h2 className="text-lg font-semibold">先算时间账，再谈租金</h2>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">
              地址足够明确时，会结合实时路线估算公交/地铁、步行距离和换乘次数；地址还不清楚时，也可以先用手动输入的通勤时间判断。
            </p>
            <div className="mt-5 grid gap-3">
              <Button asChild variant="secondary" className="w-full">
                <Link href={areaHref}>先筛通勤片区</Link>
              </Button>
              <Button asChild variant="secondary" className="w-full">
                <Link href={compareHref}>对比多个房源</Link>
              </Button>
            </div>
          </Card>
        </section>

        <CommuteCostPanel reportId={reportId} initialInput={initialInput} />
      </div>
    </AppShell>
  );
}
