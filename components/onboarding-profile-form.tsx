"use client";

import { FormEvent, useEffect, useState } from "react";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { PreferenceSelector } from "@/components/preference-selector";
import {
  ControlledPreferenceField,
  PreferencePresetButtons,
} from "@/components/preference-form-parts";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  getSubscriptionPlan,
  writeSubscriptionPlanId,
  type SubscriptionPlanId,
} from "@/lib/subscription-plan";
import {
  defaultUserPreferences,
  markOnboardingComplete,
  saveUserPreferencesToAccount,
  writeUserPreferences,
  type UserPreferences,
} from "@/lib/user-preferences";
import { preferencePresets, type PreferencePreset } from "@/lib/preference-presets";

export function OnboardingProfileForm({
  selectedPlanId,
}: {
  selectedPlanId?: SubscriptionPlanId;
}) {
  const [preferences, setPreferences] = useState<UserPreferences>(defaultUserPreferences);
  const [saved, setSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const selectedPlan = selectedPlanId ? getSubscriptionPlan(selectedPlanId) : null;

  useEffect(() => {
    if (selectedPlanId) writeSubscriptionPlanId(selectedPlanId);
  }, [selectedPlanId]);

  function updateField(key: keyof UserPreferences, value: string) {
    setSaved(false);
    setPreferences((current) => ({ ...current, [key]: value }));
  }

  function applyPreset(preset: PreferencePreset) {
    setSaved(false);
    setPreferences((current) => ({ ...current, ...preset.values }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    if (selectedPlanId) writeSubscriptionPlanId(selectedPlanId);
    writeUserPreferences(preferences);
    markOnboardingComplete();
    await saveUserPreferencesToAccount(preferences, { onboardingCompleted: true }).catch(() => null);
    setSaved(true);
    window.location.assign("/dashboard?from=onboarding");
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full rounded-lg border border-border bg-card/95 p-5 shadow-[0_22px_80px_oklch(var(--foreground)/0.08)] sm:p-7"
    >
      <div className="mb-7 border-b border-border/80 pb-6">
        <p className="text-sm text-primary">可选设置</p>
        <h2 className="mt-2 text-2xl font-semibold">只保存会影响判断的信息</h2>
        <p className="mt-2 max-w-3xl text-sm leading-7 text-muted-foreground">
          城市、工作地、收入、固定支出、租金上限和通勤上限会影响后续测算。其余信息可以在具体问题里再补充。
        </p>
        {selectedPlan ? (
          <div className="mt-4 inline-flex max-w-full flex-wrap items-center gap-2 rounded-md border border-primary/20 bg-primary/10 px-3 py-2 text-sm text-primary">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>
              已选择 {selectedPlan.name}：{selectedPlan.usage}
            </span>
          </div>
        ) : null}
      </div>

      <section className="grid gap-5">
        <div>
          <h3 className="text-base font-semibold">城市与预算</h3>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            用来判断换城市、看片区和房源体检时，当前选择是否在可承受范围内。
          </p>
        </div>

        <div className="space-y-2">
          <Label>常用场景</Label>
          <PreferencePresetButtons presets={preferencePresets} onApply={applyPreset} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <ControlledPreferenceField
            label="所在城市"
            value={preferences.defaultCity}
            onChange={(value) => updateField("defaultCity", value)}
            placeholder="填写常用城市"
          />
          <ControlledPreferenceField
            label="工作或上课地点"
            value={preferences.defaultWorkplace}
            onChange={(value) => updateField("defaultWorkplace", value)}
            placeholder="填写公司楼宇、园区、学校、地铁站或明确地标"
            helper="尽量填写地铁站、园区或明确地标。"
          />
          <ControlledPreferenceField
            label="税后月收入"
            value={preferences.monthlyIncome}
            onChange={(value) => updateField("monthlyIncome", value)}
            placeholder="填写每月实际到手收入"
            inputMode="decimal"
          />
          <ControlledPreferenceField
            label="每月固定支出"
            value={preferences.fixedCost}
            onChange={(value) => updateField("fixedCost", value)}
            placeholder="填写每月固定支出，可填 0"
            inputMode="decimal"
          />
          <ControlledPreferenceField
            label="租金预算上限"
            value={preferences.budgetMax}
            onChange={(value) => updateField("budgetMax", value)}
            placeholder="填写租金预算上限"
            inputMode="decimal"
          />
          <ControlledPreferenceField
            label="可接受通勤"
            value={preferences.commuteLimit}
            onChange={(value) => updateField("commuteLimit", value)}
            placeholder="填写可接受通勤上限"
          />
        </div>
      </section>

      <section className="mt-7 border-t border-border/80 pt-6">
        <h3 className="text-base font-semibold">可选偏好</h3>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">
          这些偏好只用于调整看房、通勤和签约提醒。没有明确要求可以先不选。
        </p>
        <div className="mt-4">
          <PreferenceSelector
            value={preferences.livingPreferences}
            onChange={(value) => {
              setSaved(false);
              setPreferences((current) => ({ ...current, livingPreferences: value }));
            }}
          />
        </div>
      </section>

      <div className="mt-7 flex flex-col gap-3 border-t border-border/80 pt-6 sm:flex-row sm:items-center">
        <Button type="submit" size="lg" disabled={isSaving}>
          {saved ? <CheckCircle2 className="mr-2 h-5 w-5" /> : <ArrowRight className="mr-2 h-5 w-5" />}
          {isSaving ? "正在保存..." : "保存并进入工作台"}
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="lg"
          onClick={() => window.location.assign("/dashboard")}
        >
          暂不设置
        </Button>
      </div>
    </form>
  );
}
