"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { hasStoredUserPreferences, readOnboardingComplete } from "@/lib/user-preferences";

export function OnboardingPrompt() {
  const [shouldShow, setShouldShow] = useState(false);

  useEffect(() => {
    setShouldShow(!readOnboardingComplete() && !hasStoredUserPreferences());
  }, []);

  if (!shouldShow) {
    return null;
  }

  return (
    <Card className="border-primary/20 bg-primary/[0.08] p-5">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex gap-4">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-primary/15 text-primary">
            <SlidersHorizontal className="h-5 w-5" />
          </span>
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-xs text-primary">
              <CheckCircle2 className="h-3.5 w-3.5" />
              1 分钟保存常用信息
            </div>
            <h2 className="text-xl font-semibold">先保存你的租住偏好</h2>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-muted-foreground">
              城市、工作地、预算、通勤上限和生活习惯保存后，评估房源、比较片区、核算通勤时会直接沿用，不用每次重新填写。
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button asChild>
            <Link href="/onboarding">
              现在设置
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button type="button" variant="secondary" onClick={() => setShouldShow(false)}>
            本次先跳过
          </Button>
        </div>
      </div>
    </Card>
  );
}
