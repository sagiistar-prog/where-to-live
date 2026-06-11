"use client";

import { FormEvent, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  Compass,
  Gauge,
  Home,
  MapPin,
  ShieldCheck,
  SlidersHorizontal,
  TrainFront,
  WalletCards,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { PreferenceSelector } from "@/components/preference-selector";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  defaultUserPreferences,
  markOnboardingComplete,
  saveUserPreferencesToAccount,
  writeUserPreferences,
  type UserPreferences,
} from "@/lib/user-preferences";
import { cn } from "@/lib/utils";

const profileTemplates = [
  {
    title: "刚毕业独居",
    description: "收入刚起步，先看通勤、安全、押金和月结余。",
    preferences: {
      budgetMin: "3500",
      budgetMax: "6500",
      commuteLimit: "45 分钟",
      fixedCost: "3000",
      livingPreferences: ["独居", "必须近地铁", "怕潮湿"],
      reportStyle: "结论直接",
    },
  },
  {
    title: "经常加班",
    description: "晚归频率高，更看重通勤稳定和夜间安全。",
    preferences: {
      budgetMin: "4500",
      budgetMax: "7500",
      commuteLimit: "35 分钟",
      fixedCost: "3500",
      livingPreferences: ["独居", "必须近地铁", "怕吵"],
      reportStyle: "细节提醒",
    },
  },
  {
    title: "合租过渡",
    description: "控制月成本，同时留意室友、押金和公共空间。",
    preferences: {
      budgetMin: "2500",
      budgetMax: "4800",
      commuteLimit: "50 分钟",
      fixedCost: "2800",
      livingPreferences: ["必须近地铁", "经常做饭", "接受老小区"],
      reportStyle: "签约清单",
    },
  },
] satisfies Array<{
  title: string;
  description: string;
  preferences: Partial<UserPreferences>;
}>;

const nextDestinationOptions = [
  {
    href: "/dashboard?from=onboarding",
    label: "工作台",
    description: "先看当前最该确认的判断。",
    icon: Gauge,
  },
  {
    href: "/city?from=onboarding",
    label: "城市成本",
    description: "从到手收入和租金红线开始。",
    icon: Compass,
  },
  {
    href: "/analyze?from=onboarding",
    label: "房源评估",
    description: "已有候选房源，直接判断。",
    icon: Home,
  },
] satisfies Array<{
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
}>;

function parseNumber(value: string) {
  const match = value.replace(/,/g, "").match(/\d+(\.\d+)?/);
  return match ? Number(match[0]) : 0;
}

function formatMoney(value: number) {
  return `${Math.round(value).toLocaleString("zh-CN")} 元`;
}

function buildPreferencePreview(preferences: UserPreferences) {
  const income = parseNumber(preferences.monthlyIncome);
  const maxRent = parseNumber(preferences.budgetMax);
  const minRent = parseNumber(preferences.budgetMin);
  const fixedCost = parseNumber(preferences.fixedCost);
  const commuteLimit = parseNumber(preferences.commuteLimit);
  const rentRatio = income ? maxRent / income : 0;
  const monthlyBuffer = income - maxRent - fixedCost;
  const bufferRatio = income ? monthlyBuffer / income : 0;
  const status =
    rentRatio > 0.42 || bufferRatio < 0.18
      ? "压力偏高"
      : rentRatio > 0.34 || bufferRatio < 0.28
        ? "需要收紧"
        : "预算较稳";
  const tone = "border-primary/25 bg-primary/10 text-primary";
  const rentBand =
    minRent && maxRent
      ? `${formatMoney(minRent)}-${formatMoney(maxRent)}`
      : maxRent
        ? `最高 ${formatMoney(maxRent)}`
        : "待填写";
  const advice =
    status === "预算较稳"
      ? "可以优先比较片区、通勤和签约前材料，不必只追最低月租。"
      : status === "需要收紧"
        ? "建议先把租金、通勤和押付周期放在一起谈，不要只看月租标价。"
        : "建议先降低租金上限或押付压力，再判断具体房源是否值得付款。";

  return {
    status,
    tone,
    rentBand,
    rentRatio: income ? `${Math.round(rentRatio * 100)}%` : "待填",
    monthlyBuffer: income ? formatMoney(monthlyBuffer) : "待填",
    commuteLimit: commuteLimit ? `${commuteLimit} 分钟` : "待填",
    advice,
  };
}

export function OnboardingProfileForm() {
  const [preferences, setPreferences] = useState<UserPreferences>(defaultUserPreferences);
  const [saved, setSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [nextHref, setNextHref] = useState(nextDestinationOptions[0].href);
  const [selectedTemplateTitle, setSelectedTemplateTitle] = useState<string | null>(null);
  const nextHrefRef = useRef(nextDestinationOptions[0].href);
  const preview = useMemo(() => buildPreferencePreview(preferences), [preferences]);
  const selectedDestination =
    nextDestinationOptions.find((item) => item.href === nextHref) ?? nextDestinationOptions[0];

  function updateField(key: keyof UserPreferences, value: string) {
    setSaved(false);
    setPreferences((current) => ({ ...current, [key]: value }));
  }

  function applyTemplate(title: string, template: Partial<UserPreferences>) {
    setSaved(false);
    setSelectedTemplateTitle(title);
    setPreferences((current) => ({
      ...current,
      ...template,
      livingPreferences: template.livingPreferences ?? current.livingPreferences,
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    writeUserPreferences(preferences);
    markOnboardingComplete();
    await saveUserPreferencesToAccount(preferences, { onboardingCompleted: true }).catch(() => null);
    setSaved(true);
    window.location.assign(nextHrefRef.current);
  }

  return (
    <form onSubmit={handleSubmit} className="grid w-full min-w-0 max-w-full gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
      <Card className="min-w-0 overflow-hidden bg-card/95 p-5 shadow-[0_22px_80px_oklch(var(--foreground)/0.08)] sm:p-7">
        <div className="mb-7 flex flex-col gap-4 border-b border-border/80 pb-6 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm text-primary">
              1 分钟偏好设置
            </p>
            <h2 className="mt-2 text-2xl font-semibold">先保存你的生活预算和偏好</h2>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-muted-foreground [overflow-wrap:anywhere]">
              住哪儿会用这些信息判断当地物价、通勤成本、租金压力和签约注意点。后面换城市、看片区、评估房源时不用每次重新填写。
            </p>
          </div>
          <div className="grid w-fit gap-2">
            <span className="rounded-full border border-border bg-secondary/70 px-3 py-1.5 text-xs text-muted-foreground">
              可随时修改
            </span>
            <span className="rounded-full border border-primary/25 bg-primary/10 px-3 py-1.5 text-xs text-primary">
              只用于你的判断
            </span>
          </div>
        </div>

        <section className="mb-7 min-w-0">
          <SectionTitle
            title="选择接近你的状态"
            description="快速带入一组常见偏好，后面仍然可以手动改。"
          />
        <div className="grid min-w-0 gap-3 lg:grid-cols-3">
          {profileTemplates.map((template) => (
            <button
              key={template.title}
              type="button"
              aria-pressed={selectedTemplateTitle === template.title}
              onClick={() => applyTemplate(template.title, template.preferences)}
              className={cn(
                "group rounded-lg border p-4 text-left transition-all hover:-translate-y-0.5 hover:border-primary/35 hover:bg-primary/10 hover:shadow-[0_14px_40px_oklch(var(--foreground)/0.08)]",
                selectedTemplateTitle === template.title
                  ? "border-primary/45 bg-primary/10"
                  : "border-border bg-secondary/55",
              )}
            >
              <span className="mb-3 inline-flex h-8 w-8 items-center justify-center rounded-md bg-background text-primary shadow-sm">
                <Home className="h-4 w-4" />
              </span>
              <p className="text-sm font-semibold text-foreground">{template.title}</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground [overflow-wrap:anywhere]">
                {template.description}
              </p>
            </button>
          ))}
        </div>
        </section>

        <section className="grid min-w-0 gap-5">
          <SectionTitle title="城市与工作地点" description="用于计算生活半径、通勤和片区成本。" />
          <div className="grid min-w-0 gap-4 sm:grid-cols-2">
          <ControlledField
            label="当前城市"
            value={preferences.defaultCity}
            onChange={(value) => updateField("defaultCity", value)}
            placeholder="深圳"
            helper="填你正在考虑工作或生活的城市。"
          />
          <ControlledField
            label="工作或上课地点"
            value={preferences.defaultWorkplace}
            onChange={(value) => updateField("defaultWorkplace", value)}
            placeholder="深圳平安金融中心"
            helper="尽量填公司楼宇、园区、地铁站或明确地标，后面通勤计算会更准。"
          />
          </div>

          <SectionTitle title="预算与通勤" description="用来判断你能否长期住得稳，不只看月租标价。" />
          <div className="grid min-w-0 gap-4 sm:grid-cols-2">
          <ControlledField
            label="税后月收入"
            value={preferences.monthlyIncome}
            onChange={(value) => updateField("monthlyIncome", value)}
            placeholder="18000"
            helper="填每月实际到手收入，用来判断房租和储蓄压力。"
          />
          <ControlledField
            label="每月固定支出"
            value={preferences.fixedCost}
            onChange={(value) => updateField("fixedCost", value)}
            placeholder="3000"
            helper="包含吃饭、交通、贷款、社保外支出等固定开销。"
          />
          <ControlledField
            label="租金预算下限"
            value={preferences.budgetMin}
            onChange={(value) => updateField("budgetMin", value)}
            placeholder="3500"
            helper="低于这个价位时，住哪儿会提醒你留意通勤、环境和合同细节。"
          />
          <ControlledField
            label="租金预算上限"
            value={preferences.budgetMax}
            onChange={(value) => updateField("budgetMax", value)}
            placeholder="6500"
            helper="用来守住长期现金流，不建议按上限花满。"
          />
          <ControlledField
            label="可接受通勤"
            value={preferences.commuteLimit}
            onChange={(value) => updateField("commuteLimit", value)}
            placeholder="45 分钟"
            helper="建议填你能长期接受的单程时间。"
          />
          <ControlledField
            label="提醒方式"
            value={preferences.reportStyle}
            onChange={(value) => updateField("reportStyle", value)}
            placeholder="结论直接"
            helper="例如：结论直接、细节提醒、签约清单。"
          />
          </div>
        </section>

        <div className="mt-7 grid gap-2 rounded-lg border border-border bg-secondary/45 p-4 text-sm leading-6 text-muted-foreground md:grid-cols-4">
          <StepPill icon={MapPin} label="城市与地点" value={`${preferences.defaultCity} · ${preferences.defaultWorkplace}`} />
          <StepPill icon={WalletCards} label="租金范围" value={preview.rentBand} />
          <StepPill icon={TrainFront} label="通勤上限" value={preview.commuteLimit} />
          <StepPill icon={ShieldCheck} label="重点偏好" value={preferences.livingPreferences.slice(0, 2).join("、") || "待选择"} />
        </div>

        <div className="mt-6">
          <Label>居住偏好</Label>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            后续会根据这些信息调整看房、通勤和签约提醒。
          </p>
          <div className="mt-3">
            <PreferenceSelector
              value={preferences.livingPreferences}
              onChange={(value) => {
                setSaved(false);
                setPreferences((current) => ({ ...current, livingPreferences: value }));
              }}
            />
          </div>
        </div>

        <div className="mt-6 rounded-lg border border-border bg-secondary/45 p-4">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">下一步去哪儿</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                选一个最贴近当前情况的下一步，保存后直接继续。
              </p>
            </div>
            <span className="rounded-full border border-primary/25 bg-primary/10 px-2 py-1 text-xs text-primary">
              推荐：工作台
            </span>
          </div>
          <div className="grid gap-2 md:grid-cols-3">
            {nextDestinationOptions.map((option) => {
              const Icon = option.icon;
              const active = option.href === nextHref;

              return (
                <button
                  key={option.href}
                  type="button"
                  onClick={() => {
                    setSaved(false);
                    nextHrefRef.current = option.href;
                    setNextHref(option.href);
                  }}
                  className={`rounded-md border p-3 text-left transition-colors ${
                    active
                      ? "border-primary/50 bg-primary/10 text-foreground"
                      : "border-border bg-background/35 text-muted-foreground hover:border-primary/35 hover:bg-secondary"
                  }`}
                >
                  <span className="mb-2 flex items-center gap-2 text-sm font-semibold">
                    <Icon className="h-4 w-4 text-primary" />
                    {option.label}
                  </span>
                  <span className="block text-xs leading-5 text-muted-foreground">
                    {option.description}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-7 flex flex-col gap-3 sm:flex-row">
          <Button type="submit" size="lg" disabled={isSaving}>
            {saved ? <CheckCircle2 className="mr-2 h-5 w-5" /> : <ArrowRight className="mr-2 h-5 w-5" />}
            {isSaving ? "正在保存..." : `保存，进入${selectedDestination.label}`}
          </Button>
          <Button type="button" variant="secondary" size="lg" onClick={() => window.location.assign("/dashboard")}>
            暂时跳过，进入工作台
          </Button>
          <Button asChild variant="ghost" size="lg">
            <Link href="/demo">先看完整演示</Link>
          </Button>
        </div>
      </Card>

      <div className="grid min-w-0 gap-4 lg:sticky lg:top-6 lg:self-start">
        <DecisionPreviewMap preferences={preferences} preview={preview} selectedDestination={selectedDestination} />

        <Card className="border-primary/20 bg-card/90 p-5 shadow-[0_18px_54px_oklch(var(--foreground)/0.08)]">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/15 text-primary">
              <SlidersHorizontal className="h-5 w-5" />
            </div>
            <span className={`rounded-full border px-2.5 py-1 text-xs ${preview.tone}`}>
              {preview.status}
            </span>
          </div>
          <h3 className="text-lg font-semibold">按这个预算看，当前状态是</h3>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{preview.advice}</p>
          <div className="mt-4 grid gap-3">
            <PreviewMetric label="房租占收入" value={preview.rentRatio} />
            <PreviewMetric label="月结余预估" value={preview.monthlyBuffer} />
            <PreviewMetric label="可接受通勤" value={preview.commuteLimit} />
          </div>
        </Card>
        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h3 className="font-semibold">保存后会用在哪里</h3>
            <span className="rounded-full border border-border bg-secondary/60 px-2.5 py-1 text-xs text-muted-foreground">
              常用信息
            </span>
          </div>
          <div className="grid gap-2">
            <ImpactRow
              icon={CircleDollarSign}
              title="城市成本"
              description="收入、租金、固定支出和储蓄压力一起看。"
            />
            <ImpactRow
              icon={Clock3}
              title="通勤判断"
              description="单程时间、换乘、晚归打车和天气影响一起算。"
            />
            <ImpactRow
              icon={MapPin}
              title="看房与签约"
              description="独居、做饭、怕吵、怕潮湿会影响确认重点。"
            />
          </div>
        </Card>
      </div>
    </form>
  );
}

function StepPill({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0">
      <div className="mb-1 flex items-center gap-2 text-xs text-muted-foreground">
        <Icon className="h-3.5 w-3.5 text-primary" />
        {label}
      </div>
      <p className="truncate font-medium text-foreground">{value}</p>
    </div>
  );
}

function PreviewMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-secondary/45 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-base font-semibold">{value}</p>
    </div>
  );
}

function DecisionPreviewMap({
  preferences,
  preview,
  selectedDestination,
}: {
  preferences: UserPreferences;
  preview: ReturnType<typeof buildPreferencePreview>;
  selectedDestination: (typeof nextDestinationOptions)[number];
}) {
  const destinationIcon = selectedDestination.icon;
  const DestinationIcon = destinationIcon;

  return (
    <Card className="overflow-hidden border-primary/20 bg-card/92 shadow-[0_22px_70px_oklch(var(--foreground)/0.08)]">
      <div className="relative min-h-[15rem] border-b border-border bg-[oklch(0.938_0.012_92)] p-4">
        <div className="absolute inset-0 opacity-75">
          <div className="absolute left-[-10%] top-[30%] h-px w-[120%] rotate-[9deg] bg-border" />
          <div className="absolute left-[-10%] top-[62%] h-px w-[120%] -rotate-[7deg] bg-border" />
          <div className="absolute left-[32%] top-[-20%] h-[140%] w-px rotate-[12deg] bg-border" />
          <div className="absolute left-[66%] top-[-20%] h-[140%] w-px -rotate-[10deg] bg-border" />
        </div>
        <div className="relative grid h-full gap-3">
          <div className="flex items-center justify-between gap-3">
            <span className="rounded-full border border-border bg-card/88 px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm">
              实时判断预览
            </span>
            <span className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs text-primary shadow-sm">
              会随填写变化
            </span>
          </div>
          <div className="max-w-[15rem] rounded-lg border border-border bg-card/88 p-3 shadow-[0_14px_38px_oklch(var(--foreground)/0.08)] backdrop-blur">
              <p className="text-xs text-muted-foreground">常用城市</p>
            <p className="mt-1 truncate text-lg font-semibold">{preferences.defaultCity || "待填写"}</p>
            <p className="mt-1 truncate text-xs text-muted-foreground">
              {preferences.defaultWorkplace || "工作地点待填写"}
            </p>
          </div>
          <div className="ml-auto max-w-[15rem] rounded-lg border border-primary/20 bg-primary/10 p-3 shadow-[0_14px_38px_oklch(var(--foreground)/0.08)] backdrop-blur">
            <p className="text-xs text-primary">预算判断</p>
            <p className="mt-1 text-lg font-semibold">{preview.status}</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              租金范围 {preview.rentBand}
            </p>
          </div>
          <div className="max-w-[16rem] rounded-lg border border-border bg-card/88 p-3 shadow-[0_14px_38px_oklch(var(--foreground)/0.08)] backdrop-blur">
            <p className="text-xs text-muted-foreground">保存后进入</p>
            <div className="mt-2 flex items-center gap-2">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-secondary text-primary">
                <DestinationIcon className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{selectedDestination.label}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {selectedDestination.description}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="grid gap-2 p-4">
        {[
          ["月结余", preview.monthlyBuffer],
          ["通勤上限", preview.commuteLimit],
          ["偏好", preferences.livingPreferences.slice(0, 2).join("、") || "待选择"],
        ].map(([label, value]) => (
          <div key={label} className="flex items-center justify-between gap-3 rounded-md border border-border bg-secondary/55 px-3 py-2">
            <span className="text-xs text-muted-foreground">{label}</span>
            <span className="truncate text-sm font-medium">{value}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

function SectionTitle({ title, description }: { title: string; description: string }) {
  return (
    <div className="mb-3">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p>
    </div>
  );
}

function ControlledField({
  label,
  value,
  onChange,
  placeholder,
  helper,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  helper?: string;
}) {
  return (
    <div className="min-w-0 space-y-2">
      <Label>{label}</Label>
      <Input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
      {helper ? <p className="text-xs leading-5 text-muted-foreground [overflow-wrap:anywhere]">{helper}</p> : null}
    </div>
  );
}

function ImpactRow({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <div className="flex gap-3 rounded-md border border-border bg-secondary/55 p-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-card text-primary shadow-sm">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <h3 className="text-sm font-semibold">{title}</h3>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}
