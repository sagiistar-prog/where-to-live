"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import {
  CheckCircle2,
  ClipboardCheck,
  Copy,
  DoorOpen,
  Handshake,
  Loader2,
  Scale,
  ShieldAlert,
  UsersRound,
  WalletCards,
  type LucideIcon,
} from "lucide-react";
import { ProfileDefaultNote } from "@/components/profile-default-note";
import { RiskBadge } from "@/components/risk-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { recordCaseEvent } from "@/lib/client-case-events";
import {
  livingPreferenceText,
  numberFromPreference,
  profileDefaultSummary,
} from "@/lib/preference-derived-defaults";
import {
  defaultUserPreferences,
  hasStoredUserPreferences,
  readUserPreferences,
} from "@/lib/user-preferences";
import type {
  SharedLivingInput,
  SharedLivingResult,
  SharedRiskItem,
  SharedRiskLevel,
} from "@/lib/shared-living";

type SubmitState = "idle" | "loading" | "error";

export type SharedLivingSeed = {
  city?: string;
  listingTitle?: string;
  monthlyRent?: string;
  preferences?: string;
  reportContext?: string;
  concerns?: string;
  reportId?: string;
  autoGenerate?: boolean;
  sourceLabel?: string;
};

const levelVariant: Record<SharedRiskLevel, "destructive" | "warning" | "success"> = {
  高: "destructive",
  中: "warning",
  低: "success",
};

function formatMoney(value: number) {
  return `${Math.round(value).toLocaleString()} 元`;
}

function buildSharedLivingMemo(result: SharedLivingResult) {
  const highRiskLines = result.boundaryItems
    .filter((item) => item.level === "高")
    .slice(0, 8)
    .map((item, index) => `${index + 1}. ${item.title}：${item.action}需要写清：${item.writeDown}`);
  const askLines = result.mustAsk.slice(0, 8).map((item, index) => `${index + 1}. ${item}`);
  const clauseLines = result.agreementClauses.slice(0, 8).map((item, index) => `${index + 1}. ${item}`);
  const evidenceLines = result.evidenceChecklist.slice(0, 7).map((item, index) => `${index + 1}. ${item}`);
  const actionLines = result.nextActions.map((item, index) => `${index + 1}. ${item}`);

  return [
    `你好，关于${result.city}「${result.listingTitle}」这间合租房，我需要在付款或签约前把合租边界确认清楚。`,
    "",
    `当前合租边界评分 ${result.score}/100，高风险项 ${result.highRiskCount} 项。高风险边界没有文字确认前，我不会付款或签约。`,
    "",
    "一、需要先确认的高风险边界",
    ...(highRiskLines.length
      ? highRiskLines
      : ["1. 当前没有高风险边界，但仍需要把清洁、访客、费用和押金规则写清。"]),
    "",
    "二、请明确回复的问题",
    ...askLines,
    "",
    "三、需要写进合租约定或聊天确认的内容",
    ...clauseLines,
    "",
    "四、请补充或允许我留存的材料",
    ...evidenceLines,
    "",
    "五、后续确认",
    ...actionLines,
    "",
    "以上内容请尽量用文字确认，尤其是实际入住人数、转租授权、费用分摊、押金扣款、访客过夜和提前退租责任。确认前暂不付款或签约。",
  ].join("\n");
}

function seedValue(value: string | undefined, fallback: string) {
  return value?.trim() || fallback;
}

export function SharedLivingPanel({ initialInput }: { initialInput?: SharedLivingSeed }) {
  const autoSubmittedRef = useRef(false);
  const [profile, setProfile] = useState(defaultUserPreferences);
  const [hasProfile, setHasProfile] = useState(false);
  const [result, setResult] = useState<SharedLivingResult | null>(null);
  const [copiedMemo, setCopiedMemo] = useState(false);
  const [state, setState] = useState<SubmitState>("idle");
  const [message, setMessage] = useState(
    "填写室友、费用、访客、清洁和押金责任，确认合租前必须写清的边界。",
  );

  useEffect(() => {
    setProfile(readUserPreferences());
    setHasProfile(hasStoredUserPreferences());
  }, []);

  const preferenceText = [initialInput?.preferences, livingPreferenceText(profile)]
    .filter(Boolean)
    .join("、");
  const sourceLabel = initialInput?.sourceLabel || "";
  const rentDefault =
    initialInput?.monthlyRent ||
    (profile.budgetMax ? String(Math.round(numberFromPreference(profile.budgetMax, 0) * 0.74)) : "");
  const concernsDefault =
    initialInput?.concerns ||
    initialInput?.reportContext ||
    (preferenceText
      ? `当前偏好：${preferenceText}。重点确认室友作息、公共卫生、访客过夜、费用分摊、押金连带和提前退租边界。`
      : "重点确认室友作息、公共卫生、访客过夜、费用分摊、押金连带和提前退租边界。");
  const seedKey = [
    hasProfile ? "profile" : "empty",
    profile.defaultCity,
    profile.budgetMax,
    profile.livingPreferences.join("-"),
    initialInput?.city,
    initialInput?.listingTitle,
    initialInput?.monthlyRent,
    initialInput?.reportContext,
  ].join("-");

  const submitPayload = useCallback(
    async (payload: SharedLivingInput, loadingMessage = "正在确认合租边界...") => {
    setState("loading");
    setMessage(loadingMessage);

    try {
      const response = await fetch("/api/shared/audit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error("合租边界确认失败，请确认信息后重试。");
      }

      const data = (await response.json()) as SharedLivingResult;
      setResult(data);
      setCopiedMemo(false);
      setState("idle");
      setMessage("合租边界确认已整理。先把高风险项写清楚，再进入付款和签约。");
      void recordCaseEvent({
        reportId: initialInput?.reportId || "workspace",
        type: "shared",
        title: "合租边界确认",
        status: data.status,
        summary: data.summary,
        highlights: [
          ...data.boundaryItems
            .filter((item) => item.level === "高")
            .map((item) => `${item.title}：${item.why}`),
          ...data.nextActions,
        ].slice(0, 6),
        href: typeof window !== "undefined" ? `${window.location.pathname}${window.location.search}` : undefined,
      });
    } catch (error) {
      setState("error");
      setMessage(error instanceof Error ? error.message : "合租边界确认失败，请稍后重试。");
    }
    },
    [initialInput?.reportId],
  );

  useEffect(() => {
    if (!initialInput?.autoGenerate || autoSubmittedRef.current) return;
    autoSubmittedRef.current = true;
    void submitPayload(
      {
        city: seedValue(initialInput.city, profile.defaultCity),
        listingTitle: seedValue(initialInput.listingTitle, "首页输入的合租房源"),
        monthlyRent: Number(seedValue(rentDefault, "0")),
        roommateCount: 0,
        roomType: "待确认",
        bathroomMode: "待确认",
        kitchenMode: "待确认",
        cleaningRule: "待确认",
        guestRule: "待确认",
        quietHours: "待确认",
        petRule: "待确认",
        billSplit: "待确认",
        depositLiability: "待确认",
        leaseHolder: "待确认",
        subletPermission: "待确认",
        concerns: concernsDefault,
      },
      `${sourceLabel || "已带入首页输入"}，正在确认合租边界...`,
    );
  }, [
    concernsDefault,
    initialInput,
    profile.defaultCity,
    rentDefault,
    sourceLabel,
    submitPayload,
  ]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = new FormData(event.currentTarget);
    await submitPayload({
      city: String(form.get("city") || ""),
      listingTitle: String(form.get("listingTitle") || ""),
      monthlyRent: Number(form.get("monthlyRent")),
      roommateCount: Number(form.get("roommateCount")),
      roomType: String(form.get("roomType") || ""),
      bathroomMode: String(form.get("bathroomMode") || ""),
      kitchenMode: String(form.get("kitchenMode") || ""),
      cleaningRule: String(form.get("cleaningRule") || ""),
      guestRule: String(form.get("guestRule") || ""),
      quietHours: String(form.get("quietHours") || ""),
      petRule: String(form.get("petRule") || ""),
      billSplit: String(form.get("billSplit") || ""),
      depositLiability: String(form.get("depositLiability") || ""),
      leaseHolder: String(form.get("leaseHolder") || ""),
      subletPermission: String(form.get("subletPermission") || ""),
      concerns: String(form.get("concerns") || ""),
    });
  }

  async function copySharedLivingMemo() {
    if (!result) return;
    await navigator.clipboard.writeText(buildSharedLivingMemo(result));
    setCopiedMemo(true);
  }

  return (
    <div className="space-y-6">
      <form
        onSubmit={handleSubmit}
        className={`grid grid-cols-1 gap-4 ${state === "loading" || result ? "xl:grid-cols-[0.42fr_0.58fr]" : "max-w-3xl"}`}
      >
        <Card className="min-w-0 p-6">
          <div className="mb-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm font-medium text-primary">
                  合租边界
                </p>
                <h2 className="mt-2 text-2xl font-semibold">输入合租边界</h2>
              </div>
              {sourceLabel ? (
                <Badge variant="outline" className="w-fit border-primary/30 text-primary">
                  {sourceLabel}
                </Badge>
              ) : null}
            </div>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              合租要提前说清公共空间、作息、访客、费用和押金责任，结合规则与责任判断是否适合长期同住。
            </p>
          </div>

          <ProfileDefaultNote hasProfile={hasProfile} summary={profileDefaultSummary(profile)} />

          <div key={seedKey} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field
              label="城市"
              name="city"
              defaultValue={initialInput?.city || profile.defaultCity}
              type="text"
              placeholder="填写目标城市"
            />
            <Field
              label="房源名称"
              name="listingTitle"
              defaultValue={initialInput?.listingTitle || ""}
              type="text"
              placeholder="填写房源名称或位置"
            />
            <Field
              label="月租"
              name="monthlyRent"
              defaultValue={rentDefault}
              placeholder="填写月租金额"
            />
            <Field
              label="室友人数"
              name="roommateCount"
              defaultValue=""
              placeholder="填写室友人数"
            />
            <SelectField
              label="房间类型"
              name="roomType"
              defaultValue="待确认"
              options={["待确认", "合租主卧", "合租次卧", "隔断间", "客厅隔断", "床位房"]}
            />
            <SelectField
              label="卫生间"
              name="bathroomMode"
              defaultValue="待确认"
              options={["待确认", "独卫", "两人共用", "共用卫生间", "多人排队明显"]}
            />
            <SelectField
              label="厨房"
              name="kitchenMode"
              defaultValue="待确认"
              options={["待确认", "基本不用厨房", "厨房可做饭且分区清楚", "厨房可做饭但规则不清", "油烟重且多人做饭"]}
            />
            <SelectField
              label="清洁规则"
              name="cleaningRule"
              defaultValue="待确认"
              options={["待确认", "有清洁轮值表", "请保洁并平摊", "靠自觉清洁", "没有明确清洁轮值"]}
            />
            <SelectField
              label="访客规则"
              name="guestRule"
              defaultValue="待确认"
              options={["待确认", "访客需提前说", "不允许过夜", "可偶尔过夜", "访客和过夜规则不清"]}
            />
            <SelectField
              label="安静时间"
              name="quietHours"
              defaultValue="待确认"
              options={["待确认", "23:00 后安静", "室友作息接近", "有人夜班或直播", "无明确安静时间"]}
            />
            <SelectField
              label="宠物规则"
              name="petRule"
              defaultValue="待确认"
              options={["待确认", "无宠物", "养宠且规则清楚", "有人养宠但未写规则", "不确定是否养宠"]}
            />
            <SelectField
              label="费用分摊"
              name="billSplit"
              defaultValue="待确认"
              options={["待确认", "按账单实结", "水电燃气按人头平摊", "房东预估收费", "费用口径不清"]}
            />
            <SelectField
              label="押金责任"
              name="depositLiability"
              defaultValue="待确认"
              options={["待确认", "个人押金独立结算", "公共区损坏共同承担", "整租押金共同承担", "押金扣款规则不清"]}
            />
            <SelectField
              label="签约主体"
              name="leaseHolder"
              defaultValue="待确认"
              options={["待确认", "房东直签", "机构/公寓签约", "室友代签", "二房东转租"]}
            />
            <SelectField
              label="转租授权"
              name="subletPermission"
              defaultValue="待确认"
              options={["待确认", "已看到书面授权", "口头说有授权", "未看到转租授权", "对方拒绝提供授权"]}
            />
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="concerns">最担心的问题</Label>
              <Textarea
                id="concerns"
                name="concerns"
                className="min-h-[112px]"
                defaultValue={concernsDefault}
                placeholder="填写你担心的合租规则、费用或签约问题"
              />
            </div>
          </div>

          <StatusMessage state={state} message={message} />

          <Button type="submit" size="lg" className="mt-5 w-full" disabled={state === "loading"}>
            {state === "loading" ? (
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            ) : (
              <UsersRound className="mr-2 h-5 w-5" />
            )}
            {state === "loading" ? "正在确认" : "确认合租边界"}
          </Button>
        </Card>

        {state === "loading" || result ? (
          <Card className="min-w-0 p-6">
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm text-primary/80">
                  合租边界
                </p>
                <h2 className="mt-2 text-2xl font-semibold">合租边界结论</h2>
              </div>
              {result ? <RiskBadge status={result.status} tone="generic" /> : null}
            </div>

            {state === "loading" ? (
            <div className="flex min-h-[560px] flex-col justify-center rounded-md border border-border bg-secondary p-5">
              <Badge variant="secondary" className="mb-4 w-fit">
                正在整理
              </Badge>
              <Loader2 className="mb-4 h-6 w-6 animate-spin text-primary" />
              <h3 className="text-xl font-semibold">正在把合租规则拆成确认清单</h3>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">
                会优先看室友人数、公共空间、清洁、访客、费用分摊、押金责任和转租授权，确认后再决定是否继续付款或签约。
              </p>
            </div>
          ) : result ? (
            <div className="space-y-5">
              <p className="text-sm leading-7 text-muted-foreground">{result.summary}</p>
              <div className="grid gap-3 sm:grid-cols-3">
                <SummaryTile icon={Handshake} label="边界评分" value={`${result.score}`} />
                <SummaryTile icon={ShieldAlert} label="高风险项" value={`${result.highRiskCount} 项`} />
                <SummaryTile icon={WalletCards} label="月租" value={formatMoney(result.monthlyRent)} />
              </div>
              <div className="rounded-md border border-border bg-secondary p-4">
                <div className="mb-3 flex items-center justify-between gap-4">
                  <p className="text-sm font-medium">合租可控度</p>
                  <p className="text-2xl font-semibold">{result.score}</p>
                </div>
                <Progress value={result.score} />
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  作息、卫生、访客、费用和押金责任越不清，越应该先写进合租群或补充协议。
                </p>
              </div>
              <div className="rounded-md border border-amber-300/20 bg-amber-300/10 p-4">
                <div className="mb-3 flex items-center gap-2 text-amber-700">
                  <ShieldAlert className="h-4 w-4" />
                  <h3 className="font-semibold">合租风险</h3>
                </div>
                <div className="grid gap-2 text-sm leading-6 text-amber-900/90">
                  {result.boundaryItems
                    .filter((item) => item.level === "高")
                    .slice(0, 4)
                    .map((item) => (
                      <p key={item.title}>{item.title}：{item.why}</p>
                    ))}
                </div>
              </div>

              <details className="rounded-md border border-border bg-secondary/55 p-4">
                <summary className="cursor-pointer text-sm font-medium text-foreground">
                  查看合租边界确认文本
                </summary>
                <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <p className="text-sm leading-6 text-muted-foreground">
                    用于确认室友人数、公共空间、清洁、访客、费用、押金和转租授权。
                  </p>
                  <Button type="button" variant="outline" onClick={copySharedLivingMemo}>
                    <Copy className="mr-2 h-4 w-4" />
                    {copiedMemo ? "已复制" : "复制文本"}
                  </Button>
                </div>
                <pre className="mt-4 max-h-[320px] overflow-auto whitespace-pre-wrap rounded-md border border-border bg-card p-4 text-sm leading-7 text-muted-foreground">
                  {buildSharedLivingMemo(result)}
                </pre>
              </details>
            </div>
            ) : null}
          </Card>
        ) : null}
      </form>

      {result ? (
        <>
          <section className="grid grid-cols-1 gap-4 lg:grid-cols-[0.58fr_0.42fr]">
            <Card className="min-w-0 p-5">
              <h3 className="font-semibold">边界风险拆解</h3>
              <div className="mt-4 overflow-x-auto">
                <table className="min-w-[860px] text-left text-sm">
                  <thead className="text-xs text-muted-foreground">
                    <tr className="border-b border-border">
                      <th className="px-3 py-3 font-medium">分组</th>
                      <th className="px-3 py-3 font-medium">风险</th>
                      <th className="px-3 py-3 font-medium">等级</th>
                      <th className="px-3 py-3 font-medium">事项</th>
                      <th className="px-3 py-3 font-medium">必须写清</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.boundaryItems.map((item) => (
                      <RiskRow key={`${item.group}-${item.title}`} item={item} />
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            <InfoPanel title="必须问清" icon={ClipboardCheck} items={result.mustAsk} />
          </section>

          <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <InfoPanel title="写进合租约定" icon={Scale} items={result.agreementClauses} />
            <InfoPanel title="材料清单" icon={DoorOpen} items={result.evidenceChecklist} />
            <InfoPanel title="后续确认" icon={CheckCircle2} items={result.nextActions} />
          </section>
        </>
      ) : null}
    </div>
  );
}

function Field({
  label,
  name,
  defaultValue,
  type = "number",
  placeholder,
}: {
  label: string;
  name: string;
  defaultValue: string;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} type={type} defaultValue={defaultValue} placeholder={placeholder} />
    </div>
  );
}

function SelectField({
  label,
  name,
  defaultValue,
  options,
}: {
  label: string;
  name: string;
  defaultValue: string;
  options: string[];
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}</Label>
      <select
        id={name}
        name={name}
        defaultValue={defaultValue}
        className="h-11 w-full rounded-md border border-input bg-secondary px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
      >
        {options.map((option) => (
          <option key={option}>{option}</option>
        ))}
      </select>
    </div>
  );
}

function StatusMessage({ state, message }: { state: SubmitState; message: string }) {
  return (
    <div
      className={`mt-5 rounded-md border p-3 text-sm leading-6 ${
        state === "error"
          ? "border-rose-300/20 bg-rose-300/10 text-rose-700"
          : "border-border bg-secondary text-muted-foreground"
      }`}
    >
      <div className="flex gap-2">
        {state === "error" ? (
          <ShieldAlert className="mt-1 h-4 w-4 shrink-0" />
        ) : (
          <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-primary" />
        )}
        <span>{message}</span>
      </div>
    </div>
  );
}

function SummaryTile({
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

function RiskRow({ item }: { item: SharedRiskItem }) {
  return (
    <tr className="border-b border-border last:border-0">
      <td className="px-3 py-4 text-muted-foreground">{item.group}</td>
      <td className="px-3 py-4">
        <p className="font-medium">{item.title}</p>
        <p className="mt-1 text-muted-foreground">{item.why}</p>
      </td>
      <td className="px-3 py-4">
        <Badge variant={levelVariant[item.level]}>{item.level}</Badge>
      </td>
      <td className="px-3 py-4 text-muted-foreground">{item.action}</td>
      <td className="px-3 py-4 text-muted-foreground">{item.writeDown}</td>
    </tr>
  );
}

function InfoPanel({
  title,
  icon: Icon,
  items,
}: {
  title: string;
  icon: LucideIcon;
  items: string[];
}) {
  return (
    <Card className="min-w-0 p-5">
      <div className="mb-3 flex items-center gap-2">
        <Icon className="h-4 w-4 text-primary" />
        <h3 className="font-semibold">{title}</h3>
      </div>
      <div className="grid gap-2 text-sm leading-6 text-muted-foreground">
        {items.map((item) => (
          <p key={item} className="rounded-md border border-border bg-secondary p-3">
            {item}
          </p>
        ))}
      </div>
    </Card>
  );
}

