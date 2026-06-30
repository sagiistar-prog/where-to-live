"use client";

import { FormEvent, useState } from "react";
import { CheckCircle2, Loader2, RefreshCw, ShieldAlert } from "lucide-react";
import { RenewalDecisionResultView } from "@/components/renewal-decision-result";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { recordCaseEvent } from "@/lib/client-case-events";
import { buildRenewalCaseEventDetails } from "@/lib/lifecycle-case-event-details";
import type { RenewalDecisionInput, RenewalDecisionResult } from "@/lib/renewal-decision";

type SubmitState = "idle" | "loading" | "error";
type RenewalSeed = Partial<RenewalDecisionInput> & {
  reportId?: string;
  sourceLabel?: string;
  reportContext?: string;
};

function seedValue(value: string | undefined, fallback: string) {
  return value?.trim() || fallback;
}

function seedNumber(value: number | undefined, fallback: string) {
  return Number.isFinite(value) ? String(value) : fallback;
}

export function RenewalDecisionPanel({
  reportId,
  initialInput,
}: {
  reportId?: string;
  initialInput?: RenewalSeed;
}) {
  const activeReportId = reportId || initialInput?.reportId || "";
  const [result, setResult] = useState<RenewalDecisionResult | null>(null);
  const [state, setState] = useState<SubmitState>("idle");
  const [message, setMessage] = useState(
    "请输入当前租金、续租报价、替代房源和搬家成本，系统将计算谈判上限。",
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState("loading");
    setMessage("正在计算续租、谈判和搬家成本...");

    const form = new FormData(event.currentTarget);
    const payload = {
      city: String(form.get("city") || ""),
      listingTitle: String(form.get("listingTitle") || ""),
      currentRent: Number(form.get("currentRent")),
      proposedRent: Number(form.get("proposedRent")),
      marketRent: Number(form.get("marketRent")),
      monthlyIncome: Number(form.get("monthlyIncome")),
      movingCost: Number(form.get("movingCost")),
      agencyFee: Number(form.get("agencyFee")),
      depositRisk: Number(form.get("depositRisk")),
      commuteMinutes: Number(form.get("commuteMinutes")),
      alternativeCommuteMinutes: Number(form.get("alternativeCommuteMinutes")),
      contractLengthMonths: Number(form.get("contractLengthMonths")),
      noticeDays: Number(form.get("noticeDays")),
      houseIssues: String(form.get("houseIssues") || ""),
      landlordBehavior: String(form.get("landlordBehavior") || ""),
      renewalTerms: String(form.get("renewalTerms") || ""),
      alternativeQuality: String(form.get("alternativeQuality") || ""),
      workStability: String(form.get("workStability") || ""),
      notes: String(form.get("notes") || ""),
    };

    try {
      const response = await fetch("/api/renewal/decision", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error("续租涨租方案整理失败，请确认信息后重试。");
      }

      const data = (await response.json()) as RenewalDecisionResult;
      setResult(data);
      setState("idle");
      setMessage("续租涨租方案已整理。先看上限，再谈价格和条款。");
      const caseEventDetails = buildRenewalCaseEventDetails(data);
      void recordCaseEvent({
        reportId: activeReportId || "workspace",
        type: "renewal",
        title: "续租涨租",
        status: data.status,
        summary: caseEventDetails.summary,
        highlights: caseEventDetails.highlights,
        href:
          typeof window !== "undefined"
            ? `${window.location.pathname}${window.location.search}`
            : undefined,
      });
    } catch (error) {
      setState("error");
      setMessage(error instanceof Error ? error.message : "续租涨租方案整理失败，请稍后重试。");
    }
  }

  return (
    <div className="space-y-6">
      <form
        onSubmit={handleSubmit}
        className="grid max-w-3xl grid-cols-1 gap-4"
      >
        <Card className="min-w-0 p-6">
          <div className="mb-6">
            <p className="text-sm text-primary/80">
              续租判断
            </p>
            <h2 className="mt-2 text-2xl font-semibold">输入续租条件</h2>
            {initialInput?.sourceLabel ? (
              <Badge variant="outline" className="mt-3 w-fit border-primary/30 text-primary">
                {initialInput.sourceLabel}
              </Badge>
            ) : null}
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              一起计算涨租、同片区替代、搬家成本、押金风险和通勤变化，判断续租、谈判或搬家的优先级。
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field
              label="城市"
              name="city"
              defaultValue={seedValue(initialInput?.city, "")}
              placeholder="填写租房城市"
              type="text"
            />
            <Field
              label="当前房源"
              name="listingTitle"
              defaultValue={seedValue(initialInput?.listingTitle, "")}
              placeholder="填写当前小区、房源名称或位置"
              type="text"
            />
            <Field
              label="当前租金"
              name="currentRent"
              defaultValue={seedNumber(initialInput?.currentRent, "")}
              placeholder="填写当前月租"
            />
            <Field
              label="拟续租租金"
              name="proposedRent"
              defaultValue={seedNumber(initialInput?.proposedRent, "")}
              placeholder="填写对方给出的续租月租"
            />
            <Field
              label="同片区替代租金"
              name="marketRent"
              defaultValue={seedNumber(initialInput?.marketRent, "")}
              placeholder="填写你看到的可替代房源月租"
            />
            <Field
              label="税后月收入"
              name="monthlyIncome"
              defaultValue={seedNumber(initialInput?.monthlyIncome, "")}
              placeholder="填写每月实际到手收入"
            />
            <Field
              label="搬家费"
              name="movingCost"
              defaultValue={seedNumber(initialInput?.movingCost, "")}
              placeholder="没有可留空"
            />
            <Field
              label="新房中介费"
              name="agencyFee"
              defaultValue={seedNumber(initialInput?.agencyFee, "")}
              placeholder="没有可留空"
            />
            <Field
              label="押金损失风险"
              name="depositRisk"
              defaultValue={seedNumber(initialInput?.depositRisk, "")}
              placeholder="没有可留空"
            />
            <Field
              label="当前通勤分钟"
              name="commuteMinutes"
              defaultValue={seedNumber(initialInput?.commuteMinutes, "")}
              placeholder="填写单程通勤分钟"
            />
            <Field
              label="替代房通勤分钟"
              name="alternativeCommuteMinutes"
              defaultValue={seedNumber(initialInput?.alternativeCommuteMinutes, "")}
              placeholder="填写替代房单程通勤分钟"
            />
            <Field
              label="续租月数"
              name="contractLengthMonths"
              defaultValue={seedNumber(initialInput?.contractLengthMonths, "")}
              placeholder="填写对方要求续租月数"
            />
            <Field
              label="剩余确认天数"
              name="noticeDays"
              defaultValue={seedNumber(initialInput?.noticeDays, "")}
              placeholder="填写你还剩几天必须答复"
            />
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="houseIssues">房屋问题</Label>
              <Input
                id="houseIssues"
                name="houseIssues"
                defaultValue={seedValue(initialInput?.houseIssues, "")}
                placeholder="填写房屋目前存在的问题"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="landlordBehavior">出租方表现</Label>
              <Input
                id="landlordBehavior"
                name="landlordBehavior"
                defaultValue={seedValue(initialInput?.landlordBehavior, "")}
                placeholder="填写出租方维修、沟通和催促情况"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="renewalTerms">续租条件</Label>
              <Textarea
                id="renewalTerms"
                name="renewalTerms"
                className="min-h-[88px]"
                defaultValue={seedValue(initialInput?.renewalTerms, "")}
                placeholder="填写对方提出的续租价格、租期、押金和费用安排"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="alternativeQuality">替代房情况</Label>
              <Input
                id="alternativeQuality"
                name="alternativeQuality"
                defaultValue={seedValue(initialInput?.alternativeQuality, "")}
                placeholder="填写你看到的替代房源质量、通勤和可接受程度"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="workStability">工作稳定性</Label>
              <Input
                id="workStability"
                name="workStability"
                defaultValue={seedValue(initialInput?.workStability, "")}
                placeholder="填写工作地、收入或居住计划是否稳定"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="notes">补充说明</Label>
              <Textarea
                id="notes"
                name="notes"
                className="min-h-[112px]"
                defaultValue={seedValue(initialInput?.notes || initialInput?.reportContext, "")}
                placeholder="补充你最担心的续租问题"
              />
            </div>
          </div>

          <StatusMessage state={state} message={message} />

          <Button type="submit" size="lg" className="mt-5 w-full" disabled={state === "loading"}>
            {state === "loading" ? (
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-5 w-5" />
            )}
            {state === "loading" ? "正在整理方案" : "整理续租方案"}
          </Button>
        </Card>

      </form>

      {result ? <RenewalDecisionResultView result={result} reportId={activeReportId} /> : null}
    </div>
  );
}

function Field({
  label,
  name,
  defaultValue,
  placeholder,
  type = "number",
}: {
  label: string;
  name: string;
  defaultValue: string;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} type={type} defaultValue={defaultValue} placeholder={placeholder} />
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


