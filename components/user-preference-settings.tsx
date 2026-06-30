"use client";

import { FormEvent, useEffect, useState } from "react";
import { CheckCircle2, Save } from "lucide-react";
import { PreferenceSelector } from "@/components/preference-selector";
import {
  ControlledPreferenceField,
  PreferencePresetButtons,
} from "@/components/preference-form-parts";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  defaultUserPreferences,
  readOnboardingComplete,
  readUserPreferences,
  saveUserPreferencesToAccount,
  userPreferencesUpdatedEvent,
  writeUserPreferences,
  type UserPreferences,
} from "@/lib/user-preferences";
import { preferencePresets, type PreferencePreset } from "@/lib/preference-presets";

export function UserPreferenceSettings() {
  const [preferences, setPreferences] = useState<UserPreferences>(defaultUserPreferences);
  const [saved, setSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [accountSynced, setAccountSynced] = useState(false);

  useEffect(() => {
    function refreshPreferences() {
      setPreferences(readUserPreferences());
      setSaved(false);
    }

    refreshPreferences();
    window.addEventListener(userPreferencesUpdatedEvent, refreshPreferences);
    window.addEventListener("storage", refreshPreferences);
    window.addEventListener("focus", refreshPreferences);

    return () => {
      window.removeEventListener(userPreferencesUpdatedEvent, refreshPreferences);
      window.removeEventListener("storage", refreshPreferences);
      window.removeEventListener("focus", refreshPreferences);
    };
  }, []);

  function updateField(key: keyof UserPreferences, value: string) {
    setSaved(false);
    setAccountSynced(false);
    setPreferences((current) => ({ ...current, [key]: value }));
  }

  function applyPreset(preset: PreferencePreset) {
    setSaved(false);
    setAccountSynced(false);
    setPreferences((current) => ({ ...current, ...preset.values }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    writeUserPreferences(preferences);
    const accountResult = await saveUserPreferencesToAccount(preferences, {
      onboardingCompleted: readOnboardingComplete(),
    }).catch(() => null);
    setAccountSynced(Boolean(accountResult?.authenticated));
    setSaved(true);
    setIsSaving(false);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-lg border border-border bg-card p-5 shadow-[0_18px_54px_oklch(var(--foreground)/0.05)] sm:p-6 lg:col-span-2"
    >
      <div className="mb-6">
        <h2 className="text-lg font-semibold">常用判断信息</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
          保存城市、工作地、收入、预算和通勤要求，后续判断可以直接复用。
        </p>
      </div>

      <div className="mb-6 space-y-2">
        <Label>常用场景</Label>
        <PreferencePresetButtons presets={preferencePresets} onApply={applyPreset} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <ControlledPreferenceField
          label="常用城市"
          value={preferences.defaultCity}
          onChange={(value) => updateField("defaultCity", value)}
          placeholder="填写常用城市"
        />
        <ControlledPreferenceField
          label="工作或上课地点"
          value={preferences.defaultWorkplace}
          onChange={(value) => updateField("defaultWorkplace", value)}
          placeholder="填写公司楼宇、园区、学校、地铁站或明确地标"
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
          placeholder="填写每月固定支出"
          inputMode="decimal"
        />
        <ControlledPreferenceField
          label="租金预算下限"
          value={preferences.budgetMin}
          onChange={(value) => updateField("budgetMin", value)}
          placeholder="可选"
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

      <div className="mt-7 border-t border-border pt-6">
        <h3 className="font-semibold">居住偏好</h3>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">
          影响看房提醒、通勤判断和签约前确认；没有明确要求可以不选。
        </p>
        <div className="mt-4">
          <PreferenceSelector
            value={preferences.livingPreferences}
            onChange={(value) => {
              setSaved(false);
              setAccountSynced(false);
              setPreferences((current) => ({ ...current, livingPreferences: value }));
            }}
          />
        </div>
      </div>

      <div className="mt-7 flex flex-col gap-3 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm leading-6 text-muted-foreground">
          {saved
            ? accountSynced
              ? "已同步到当前账号。"
              : "已保存到本机；登录后可同步到账号。"
            : "保存后，后续页面优先带入这些信息。"}
        </p>
        <Button type="submit" disabled={isSaving}>
          {saved ? <CheckCircle2 className="mr-2 h-4 w-4" /> : <Save className="mr-2 h-4 w-4" />}
          {isSaving ? "正在保存..." : saved ? "已保存" : "保存常用信息"}
        </Button>
      </div>
    </form>
  );
}
