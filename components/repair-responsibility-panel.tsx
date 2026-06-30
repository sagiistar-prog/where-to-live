"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import {
  CheckCircle2,
  Loader2,
  ShieldAlert,
  Wrench,
} from "lucide-react";
import { RepairResponsibilityResultView } from "@/components/repair-responsibility-result";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { recordCaseEvent } from "@/lib/client-case-events";
import { buildRepairCaseEventDetails } from "@/lib/lifecycle-case-event-details";
import type {
  RepairResponsibilityInput,
  RepairResponsibilityResult,
} from "@/lib/repair-responsibility";

type SubmitState = "idle" | "loading" | "error";
type RepairSeed = Partial<RepairResponsibilityInput> & {
  autoGenerate?: boolean;
  sourceLabel?: string;
  reportId?: string;
};

function seedValue(value: string | undefined, fallback: string) {
  return value?.trim() || fallback;
}

function seedNumber(value: number | undefined, fallback: string) {
  return Number.isFinite(value) ? String(value) : fallback;
}

export function RepairResponsibilityPanel({ initialInput }: { initialInput?: RepairSeed }) {
  const reportId = initialInput?.reportId || "";
  const autoSubmittedRef = useRef(false);
  const [result, setResult] = useState<RepairResponsibilityResult | null>(null);
  const [state, setState] = useState<SubmitState>("idle");
  const [message, setMessage] = useState(
    "这里只整理维修责任判断，不读取聊天记录或支付账户。",
  );

  const submitPayload = useCallback(async (payload: RepairResponsibilityInput, loadingMessage: string) => {
    setState("loading");
    setMessage(loadingMessage);

    try {
      const response = await fetch("/api/repair/responsibility", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error("维修责任方案整理失败，请确认信息后重试。");
      }

      const data = (await response.json()) as RepairResponsibilityResult;
      setResult(data);
      setState("idle");
      setMessage("维修责任判断方案已整理。补充材料，再决定是否垫付维修。");
      const caseEventDetails = buildRepairCaseEventDetails(data);
      void recordCaseEvent({
        reportId: reportId || "workspace",
        type: "repair",
        title: "维修责任",
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
      setMessage(error instanceof Error ? error.message : "维修责任判断方案整理失败，请稍后重试。");
    }
  }, [reportId]);

  useEffect(() => {
    if (!initialInput?.autoGenerate || autoSubmittedRef.current) return;
    autoSubmittedRef.current = true;
    void submitPayload(
      {
        city: seedValue(initialInput.city, ""),
        listingTitle: seedValue(initialInput.listingTitle, "带入房源"),
        issueType: seedValue(initialInput.issueType, "旧损坏或维修扣款争议"),
        urgency: seedValue(initialInput.urgency, "影响正常居住"),
        damageScope: seedValue(initialInput.damageScope, "需要结合交割记录和维修材料判断影响范围"),
        discoveredTiming: seedValue(initialInput.discoveredTiming, "交割确认或退租前发现"),
        evidenceLevel: seedValue(initialInput.evidenceLevel, "有照片和视频"),
        contractClause: seedValue(
          initialInput.contractClause,
          "合同维修责任条款需要粘贴后进一步确认。",
        ),
        landlordResponse: seedValue(initialInput.landlordResponse, "对方要求先确认或可能扣押金"),
        repairCost: initialInput.repairCost,
        safetyImpact: seedValue(initialInput.safetyImpact, "可能影响居住体验或退租扣款"),
        tenantCause: seedValue(initialInput.tenantCause, "原因不清"),
        depositConcern: seedValue(initialInput.depositConcern, "担心退租时从押金扣"),
        notes: seedValue(
          initialInput.notes,
          "已从上一步带入，需要判断维修责任、费用边界和待补充材料。",
        ),
      },
      "已带入上一步上下文，正在判断维修责任...",
    );
  }, [initialInput, submitPayload]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = new FormData(event.currentTarget);
    const payload = {
      city: String(form.get("city") || ""),
      listingTitle: String(form.get("listingTitle") || ""),
      issueType: String(form.get("issueType") || ""),
      urgency: String(form.get("urgency") || ""),
      damageScope: String(form.get("damageScope") || ""),
      discoveredTiming: String(form.get("discoveredTiming") || ""),
      evidenceLevel: String(form.get("evidenceLevel") || ""),
      contractClause: String(form.get("contractClause") || ""),
      landlordResponse: String(form.get("landlordResponse") || ""),
      repairCost: Number(form.get("repairCost")),
      safetyImpact: String(form.get("safetyImpact") || ""),
      tenantCause: String(form.get("tenantCause") || ""),
      depositConcern: String(form.get("depositConcern") || ""),
      notes: String(form.get("notes") || ""),
    };

    await submitPayload(payload, "正在判断维修责任和待补充材料...");
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
              维修责任
            </p>
            <h2 className="mt-2 text-2xl font-semibold">输入维修问题</h2>
            {initialInput?.sourceLabel ? (
              <Badge variant="outline" className="mt-3 w-fit border-primary/30 text-primary">
                {initialInput.sourceLabel}
              </Badge>
            ) : null}
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              把漏水、发霉、家电损坏、门锁失效、噪音和旧损坏争议放进同一张责任表。先固定记录和费用边界，再决定是否自费维修。
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
              label="房源名称"
              name="listingTitle"
              defaultValue={seedValue(initialInput?.listingTitle, "")}
              placeholder="填写小区、房源名称或位置"
              type="text"
            />
            <SelectField
              label="问题类型"
              name="issueType"
              defaultValue={seedValue(initialInput?.issueType, "不确定")}
              options={["不确定", "卫生间漏水", "墙面发霉返潮", "空调/热水器故障", "门锁失效", "电路跳闸", "噪音扰民", "虫害异味", "家具家电旧损坏"]}
            />
            <SelectField
              label="紧急程度"
              name="urgency"
              defaultValue={seedValue(initialInput?.urgency, "不确定")}
              options={["不确定", "轻微不便", "影响正常居住", "无法正常居住", "存在安全风险", "可能扩大损失"]}
            />
            <SelectField
              label="发现时间"
              name="discoveredTiming"
              defaultValue={seedValue(initialInput?.discoveredTiming, "不确定")}
              options={["不确定", "看房时已发现", "交割确认当天发现", "入住后 7 天内发现", "住了一段时间后出现", "退租前被提出"]}
            />
            <SelectField
              label="材料情况"
              name="evidenceLevel"
              defaultValue={seedValue(initialInput?.evidenceLevel, "不确定")}
              options={["不确定", "有照片和视频", "有聊天和照片", "只有口头沟通", "几乎没有材料"]}
            />
            <SelectField
              label="出租方响应"
              name="landlordResponse"
              defaultValue={seedValue(initialInput?.landlordResponse, "不确定")}
              options={["不确定", "已承诺安排维修", "同意但没有时间", "房东让租客先自己找人修，费用之后再说", "一直不回复", "拒绝维修"]}
            />
            <SelectField
              label="责任倾向"
              name="tenantCause"
              defaultValue={seedValue(initialInput?.tenantCause, "原因不清")}
              options={["原因不清", "非人为损坏", "自然损耗或设备老化", "可能使用不当", "承租人人为造成"]}
            />
            <Field
              label="预估维修费"
              name="repairCost"
              defaultValue={seedNumber(initialInput?.repairCost, "")}
              placeholder="不确定可留空"
            />
            <SelectField
              label="押金担忧"
              name="depositConcern"
              defaultValue={seedValue(initialInput?.depositConcern, "不确定")}
              options={["不确定", "不担心押金", "担心退租时从押金扣", "对方已暗示要扣押金", "已经进入退租扣款争议"]}
            />
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="damageScope">影响范围</Label>
              <Input
                id="damageScope"
                name="damageScope"
                defaultValue={seedValue(initialInput?.damageScope, "")}
                placeholder="填写问题位置、范围和是否持续发生"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="safetyImpact">安全或生活影响</Label>
              <Input
                id="safetyImpact"
                name="safetyImpact"
                defaultValue={seedValue(initialInput?.safetyImpact, "")}
                placeholder="填写是否影响居住、安全或可能扩大损失"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="contractClause">合同相关条款</Label>
              <Textarea
                id="contractClause"
                name="contractClause"
                className="min-h-[96px]"
                defaultValue={seedValue(initialInput?.contractClause, "")}
                placeholder="粘贴合同里关于维修责任、自然损耗、垫付报销的条款"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="notes">补充说明</Label>
              <Textarea
                id="notes"
                name="notes"
                className="min-h-[112px]"
                defaultValue={seedValue(initialInput?.notes, "")}
                placeholder="补充你已经沟通过的情况、对方回复和当前担心"
              />
            </div>
          </div>

          <StatusMessage state={state} message={message} />

          <Button type="submit" size="lg" className="mt-5 w-full" disabled={state === "loading"}>
            {state === "loading" ? (
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            ) : (
              <Wrench className="mr-2 h-5 w-5" />
            )}
            {state === "loading" ? "正在整理责任建议" : "判断维修责任"}
          </Button>
        </Card>

      </form>

      {result ? (
        <RepairResponsibilityResultView result={result} reportId={reportId} />
      ) : null}
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

