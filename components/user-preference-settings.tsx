"use client";

import { FormEvent, useEffect, useState } from "react";
import { CheckCircle2, Save } from "lucide-react";
import { PreferenceSelector } from "@/components/preference-selector";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
    <form onSubmit={handleSubmit} className="grid gap-4 lg:col-span-2">
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-border bg-card p-6">
          <div className="mb-5">
            <h2 className="text-lg font-semibold">个人资料</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              用于保存判断记录、带入常用偏好，并在登录后同步到账号。
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <ControlledField
              label="昵称"
              value={preferences.nickname}
              onChange={(value) => updateField("nickname", value)}
            />
            <ControlledField
              label="邮箱"
              value={preferences.email}
              onChange={(value) => updateField("email", value)}
            />
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-6">
          <div className="mb-5">
            <h2 className="text-lg font-semibold">常用城市与工作地点</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              下一次评估房源、筛选片区和测算通勤时会优先带入。
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <ControlledField
              label="常用城市"
              value={preferences.defaultCity}
              onChange={(value) => updateField("defaultCity", value)}
            />
            <ControlledField
              label="常用工作地点"
              value={preferences.defaultWorkplace}
              onChange={(value) => updateField("defaultWorkplace", value)}
            />
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-6">
          <div className="mb-5">
            <h2 className="text-lg font-semibold">预算与通勤</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              用来判断一套房是否超过真实承受范围，不只看标价。
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <ControlledField
              label="税后月收入"
              value={preferences.monthlyIncome}
              onChange={(value) => updateField("monthlyIncome", value)}
            />
            <ControlledField
              label="租金预算下限"
              value={preferences.budgetMin}
              onChange={(value) => updateField("budgetMin", value)}
            />
            <ControlledField
              label="租金预算上限"
              value={preferences.budgetMax}
              onChange={(value) => updateField("budgetMax", value)}
            />
            <ControlledField
              label="可接受通勤"
              value={preferences.commuteLimit}
              onChange={(value) => updateField("commuteLimit", value)}
            />
            <ControlledField
              label="每月固定支出"
              value={preferences.fixedCost}
              onChange={(value) => updateField("fixedCost", value)}
            />
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-6">
          <div className="mb-5">
            <h2 className="text-lg font-semibold">居住偏好</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              这些偏好会影响房源判断、看房清单、独居安全和生活配套提醒。
            </p>
          </div>
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

      <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-semibold">提醒方式</h2>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            选择你更容易接受的表达方式，后续判断会按这个口径给出建议。
          </p>
          {saved ? (
            <p className="mt-2 text-xs leading-5 text-primary">
              {accountSynced ? "已同步到当前账号。" : "已保存到本机；登录后会同步到账号。"}
            </p>
          ) : null}
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <select
            value={preferences.reportStyle}
            onChange={(event) => updateField("reportStyle", event.target.value)}
            className="h-11 min-w-[180px] rounded-md border border-input bg-secondary px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          >
            <option>结论直接</option>
            <option>细节提醒</option>
            <option>签约清单</option>
          </select>
          <Button type="submit" disabled={isSaving}>
            {saved ? <CheckCircle2 className="mr-2 h-4 w-4" /> : <Save className="mr-2 h-4 w-4" />}
            {isSaving ? "正在保存..." : saved ? "已保存" : "保存偏好"}
          </Button>
        </div>
      </div>
    </form>
  );
}

function ControlledField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input value={value} onChange={(event) => onChange(event.target.value)} />
    </div>
  );
}
