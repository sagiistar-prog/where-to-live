"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { CheckCircle2, Loader2, PackageCheck, ShieldAlert } from "lucide-react";
import { HandoverCheckResultView } from "@/components/handover-check-result";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { recordCaseEvent } from "@/lib/client-case-events";
import { compactContext } from "@/lib/flow-links";
import { buildHandoverCaseEventDetails } from "@/lib/lifecycle-case-event-details";
import type { HandoverCheckInput, HandoverCheckResult } from "@/lib/handover-check";

type SubmitState = "idle" | "loading" | "error";
type HandoverSeed = Partial<HandoverCheckInput> & {
  autoGenerate?: boolean;
  sourceLabel?: string;
  reportId?: string;
  title?: string;
  address?: string;
  reportContext?: string;
};

function seedValue(value: string | undefined, fallback: string) {
  return value?.trim() || fallback;
}

function seedNumber(value: number | undefined, fallback: string) {
  return Number.isFinite(value) ? String(value) : fallback;
}

export function HandoverCheckPanel({
  reportId,
  initialInput,
}: {
  reportId?: string;
  initialInput?: HandoverSeed;
}) {
  const autoSubmittedRef = useRef(false);
  const activeReportId = initialInput?.reportId ?? reportId;
  const [result, setResult] = useState<HandoverCheckResult | null>(null);
  const [state, setState] = useState<SubmitState>("idle");
  const [message, setMessage] = useState(
    "这里只整理交割验收清单，不上传照片或视频。",
  );

  const submitPayload = useCallback(
    async (payload: HandoverCheckInput, loadingMessage = "正在整理交割验收清单...") => {
    setState("loading");
    setMessage(loadingMessage);

    try {
      const response = await fetch("/api/handover/check", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error("交割确认整理失败，请确认信息后重试。");
      }

      const data = (await response.json()) as HandoverCheckResult;
      setResult(data);
      setState("idle");
      setMessage("交割确认已整理。补充高风险信息，再拿钥匙入住。");
      if (activeReportId) {
        const caseEventDetails = buildHandoverCaseEventDetails(data);
        void recordCaseEvent({
          reportId: activeReportId,
          type: "handover",
          title: "交割确认",
          status: data.status,
          summary: caseEventDetails.summary,
          highlights: caseEventDetails.highlights,
          href:
            typeof window !== "undefined"
              ? `${window.location.pathname}${window.location.search}`
              : undefined,
        });
      }
    } catch (error) {
      setState("error");
      setMessage(error instanceof Error ? error.message : "交割确认整理失败，请稍后重试。");
    }
    },
    [activeReportId],
  );

  useEffect(() => {
    if (!initialInput?.autoGenerate || autoSubmittedRef.current) return;
    autoSubmittedRef.current = true;
    void submitPayload(
      {
        city: initialInput.city,
        listingTitle: seedValue(initialInput.listingTitle, initialInput.title ?? "报告带入房源"),
        handoverDate: seedValue(initialInput.handoverDate, ""),
        contractSigned: seedValue(initialInput.contractSigned, "合同与交割清单待最终确认"),
        keysStatus: seedValue(initialInput.keysStatus, "钥匙门禁数量待确认"),
        meterStatus: seedValue(initialInput.meterStatus, "水电燃气表读数待拍照确认"),
        applianceStatus: seedValue(initialInput.applianceStatus, "家具家电清单待确认"),
        damageStatus: seedValue(initialInput.damageStatus, "旧损坏、墙面、地板和卫浴状态待拍照确认"),
        utilityDebtStatus: seedValue(initialInput.utilityDebtStatus, "历史欠费待确认"),
        accessStatus: seedValue(initialInput.accessStatus, "门禁卡和电梯卡数量待确认"),
        cleaningStatus: seedValue(initialInput.cleaningStatus, "清洁状态待拍照确认"),
        landlordConfirmation: seedValue(initialInput.landlordConfirmation, "出租方书面确认待补充"),
        depositAmount: initialInput.depositAmount,
        monthlyRent: initialInput.monthlyRent,
        notes: seedValue(
          initialInput.notes,
          compactContext([
            "从上一步带入：准备整理交割确认清单。",
            initialInput.address ? `房源位置：${initialInput.address}` : "",
            initialInput.reportContext,
          ]),
        ),
      },
      `${initialInput.sourceLabel ?? "已带入上下文"}，正在整理交割验收清单...`,
    );
  }, [initialInput, submitPayload]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = new FormData(event.currentTarget);
    const payload = {
      city: String(form.get("city") || ""),
      listingTitle: String(form.get("listingTitle") || ""),
      handoverDate: String(form.get("handoverDate") || ""),
      contractSigned: String(form.get("contractSigned") || ""),
      keysStatus: String(form.get("keysStatus") || ""),
      meterStatus: String(form.get("meterStatus") || ""),
      applianceStatus: String(form.get("applianceStatus") || ""),
      damageStatus: String(form.get("damageStatus") || ""),
      utilityDebtStatus: String(form.get("utilityDebtStatus") || ""),
      accessStatus: String(form.get("accessStatus") || ""),
      cleaningStatus: String(form.get("cleaningStatus") || ""),
      landlordConfirmation: String(form.get("landlordConfirmation") || ""),
      depositAmount: Number(form.get("depositAmount")),
      monthlyRent: Number(form.get("monthlyRent")),
      notes: String(form.get("notes") || ""),
    };

    await submitPayload(payload);
  }

  return (
    <div className="space-y-6">
      <form
        onSubmit={handleSubmit}
        className="grid max-w-3xl grid-cols-1 gap-4"
      >
        <Card className="min-w-0 p-6">
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm text-primary/80">
                交割确认
              </p>
              <h2 className="mt-2 text-2xl font-semibold">输入交割条件</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                拿钥匙当天，把表读数、钥匙门禁、旧损坏、家具家电和历史欠费记录清楚，减少入住后和退租时的争议。
              </p>
            </div>
            {initialInput?.sourceLabel ? (
              <Badge variant="outline" className="w-fit border-primary/30 text-primary">
                {initialInput.sourceLabel}
              </Badge>
            ) : null}
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
              defaultValue={seedValue(initialInput?.listingTitle, initialInput?.title ?? "")}
              placeholder="填写小区、房源名称或位置"
              type="text"
            />
            <Field
              label="交割日期"
              name="handoverDate"
              defaultValue={seedValue(initialInput?.handoverDate, "")}
              type="date"
            />
            <Field
              label="押金金额"
              name="depositAmount"
              defaultValue={seedNumber(initialInput?.depositAmount, "")}
              placeholder="填写押金金额"
            />
            <Field
              label="月租"
              name="monthlyRent"
              defaultValue={seedNumber(initialInput?.monthlyRent, "")}
              placeholder="填写月租金额"
            />
            <SelectField
              label="合同与交割"
              name="contractSigned"
              defaultValue={seedValue(initialInput?.contractSigned, "不确定")}
              options={["不确定", "已签合同且有交割清单", "已签合同但未写交割清单", "只签了简单协议", "还未签合同", "合同和房源信息不一致"]}
            />
            <SelectField
              label="钥匙状态"
              name="keysStatus"
              defaultValue={seedValue(initialInput?.keysStatus, "不确定")}
              options={["不确定", "钥匙数量已拍照确认", "不知道是否有备用钥匙", "钥匙门禁数量不清", "不允许换锁"]}
            />
            <SelectField
              label="门禁电梯卡"
              name="accessStatus"
              defaultValue={seedValue(initialInput?.accessStatus, "不确定")}
              options={["不确定", "门禁电梯卡已确认", "门禁卡和电梯卡数量未确认", "门禁卡缺失", "补办费用不清", "没有门禁"]}
            />
            <SelectField
              label="表读数"
              name="meterStatus"
              defaultValue={seedValue(initialInput?.meterStatus, "不确定")}
              options={["不确定", "已拍水电燃气表读数", "还没拍水电燃气表读数", "只拍了电表", "表读数之后补", "不知道表在哪里"]}
            />
            <SelectField
              label="历史欠费"
              name="utilityDebtStatus"
              defaultValue={seedValue(initialInput?.utilityDebtStatus, "不确定是否有历史欠费")}
              options={["不确定是否有历史欠费", "已确认无历史欠费", "物业/水电账单未出", "发现有历史欠费", "对方说之后再算"]}
            />
            <SelectField
              label="家具家电"
              name="applianceStatus"
              defaultValue={seedValue(initialInput?.applianceStatus, "不确定")}
              options={["不确定", "家具家电清单完整", "家具家电清单不完整", "部分家电未测试", "已有家电故障", "遥控器和配件不全"]}
            />
            <SelectField
              label="清洁状态"
              name="cleaningStatus"
              defaultValue={seedValue(initialInput?.cleaningStatus, "不确定")}
              options={["不确定", "已经清洁", "卫生间和厨房清洁一般", "油烟机油污重", "卫生间有异味", "明显未清洁"]}
            />
            <SelectField
              label="书面确认"
              name="landlordConfirmation"
              defaultValue={seedValue(initialInput?.landlordConfirmation, "不确定")}
              options={["不确定", "对方已在聊天确认", "对方只说没问题", "对方让之后再说", "对方不愿确认", "只有电话口头确认"]}
            />
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="damageStatus">旧损坏情况</Label>
              <Input
                id="damageStatus"
                name="damageStatus"
                defaultValue={seedValue(initialInput?.damageStatus, "")}
                placeholder="填写已看到的旧损坏、位置和是否已拍照"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="notes">补充说明</Label>
              <Textarea
                id="notes"
                name="notes"
                className="min-h-[112px]"
                defaultValue={seedValue(initialInput?.notes || initialInput?.reportContext, "")}
                placeholder="填写交割当天还没确认的事项，例如钥匙、门禁、表读数、旧损坏、费用边界"
              />
            </div>
          </div>

          <StatusMessage state={state} message={message} />

          <Button type="submit" size="lg" className="mt-5 w-full" disabled={state === "loading"}>
            {state === "loading" ? (
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            ) : (
              <PackageCheck className="mr-2 h-5 w-5" />
            )}
            {state === "loading" ? "正在整理清单" : "整理交割验收清单"}
          </Button>
        </Card>

      </form>

      {result ? <HandoverCheckResultView result={result} reportId={activeReportId} /> : null}
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


