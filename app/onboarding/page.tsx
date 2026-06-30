import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { OnboardingQuickStart } from "@/components/onboarding-quick-start";
import { OnboardingProfileForm } from "@/components/onboarding-profile-form";
import { Button } from "@/components/ui/button";
import { isSubscriptionPlanId, type SubscriptionPlanId } from "@/lib/subscription-plan";

type SearchParams = Record<string, string | string[] | undefined>;

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const params = (await searchParams) ?? {};
  const planParam = firstParam(params.plan);
  const selectedPlanId: SubscriptionPlanId | undefined = isSubscriptionPlanId(planParam)
    ? planParam
    : undefined;

  return (
    <main className="relative min-h-screen overflow-hidden bg-[oklch(0.986_0.006_155)] text-foreground">
      <video
        className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-[0.58] saturate-[0.72] contrast-[0.9]"
        src="/videos/city-aerial-loop.mp4"
        poster="/videos/city-aerial-poster.jpg"
        autoPlay
        muted
        loop
        playsInline
        aria-hidden="true"
      />
      <div className="pointer-events-none absolute inset-0 bg-[oklch(0.986_0.006_155/0.62)]" />

      <div className="relative mx-auto flex min-h-screen w-full max-w-7xl flex-col overflow-x-hidden px-4 py-5 sm:px-6 lg:px-8">
        <header className="mb-9 flex w-full min-w-0 max-w-full items-center justify-between gap-3">
          <BrandMark href="/" size="md" />
          <Button asChild variant="ghost" className="shrink-0 px-2 sm:px-4">
            <Link href="/dashboard">
              <ArrowLeft className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">返回工作台</span>
              <span className="sm:hidden">返回</span>
            </Link>
          </Button>
        </header>

        <section className="mb-8 w-full min-w-0 max-w-full">
          <div className="min-w-0">
            <p className="text-sm text-primary">常用信息</p>
            <h1 className="mt-3 max-w-full break-words text-balance text-3xl font-semibold leading-tight tracking-normal [overflow-wrap:anywhere] sm:max-w-4xl sm:text-5xl">
              保存后续判断会用到的信息
            </h1>
            <p className="mt-4 max-w-full break-words text-base leading-8 text-muted-foreground [overflow-wrap:anywhere] sm:max-w-3xl">
              只保存城市、工作地、收入、租金预算和通勤上限。后续判断城市、片区、房源和付款问题时直接沿用。
            </p>
          </div>
        </section>

        <div className="grid gap-5">
          <OnboardingQuickStart />
          <OnboardingProfileForm selectedPlanId={selectedPlanId} />
        </div>
      </div>
    </main>
  );
}
