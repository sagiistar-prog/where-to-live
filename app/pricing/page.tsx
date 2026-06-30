import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { PricingPlanCards } from "@/components/pricing-plan-cards";

type SearchParams = Record<string, string | string[] | undefined>;

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function PricingPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const params = searchParams ? await searchParams : {};
  const quotaExceeded = firstParam(params.quota) === "exceeded";

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-7xl min-w-0 space-y-10 overflow-x-hidden">
        {quotaExceeded ? (
          <section className="mx-auto flex max-w-3xl flex-col gap-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-800 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-semibold">本月判断额度已用完</p>
              <p className="mt-1">
                已有记录仍可查看。更高额度暂未开放购买，当前先保留免费方案。
              </p>
            </div>
            <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
              <Link
                href="#plans"
                className="inline-flex min-h-9 items-center justify-center rounded-full bg-amber-700 px-4 text-sm font-medium text-white transition hover:bg-amber-800"
              >
                查看方案
              </Link>
              <Link
                href="/dashboard"
                className="inline-flex min-h-9 items-center justify-center rounded-full border border-amber-300 bg-white/70 px-4 text-sm font-medium text-amber-900 transition hover:bg-white"
              >
                回工作台
              </Link>
            </div>
          </section>
        ) : null}

        <section className="mx-auto max-w-3xl text-center">
          <div className="mx-auto mb-4 inline-flex items-center rounded-full border border-border bg-secondary/70 p-1 text-sm">
            <span className="rounded-full bg-card px-4 py-2 font-medium shadow-[0_8px_24px_oklch(var(--foreground)/0.06)]">
              三档方案
            </span>
            <span className="px-4 py-2 text-muted-foreground">可随时调整</span>
          </div>
          <p className="text-sm text-primary">方案与额度</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-normal sm:text-5xl">
            选择合适的判断额度
          </h1>
          <p className="mt-4 text-sm leading-7 text-muted-foreground">
            免费版适合试用。密集换城、看房、签约付款或买房前比较时，选择更高额度。
          </p>
        </section>

        <PricingPlanCards />

        <div className="mx-auto flex max-w-3xl flex-col items-center gap-3 text-center">
          <p className="text-xs leading-6 text-muted-foreground">
            方案页只展示额度差异，不接入支付。付费方案开放前，当前记录和免费额度仍可继续使用。
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Link
              href="/settings"
              className="inline-flex min-h-10 items-center justify-center rounded-full border border-border bg-card px-4 text-sm font-medium transition hover:bg-secondary"
            >
              完善常用信息
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex min-h-10 items-center justify-center rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
            >
              开始判断
            </Link>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
