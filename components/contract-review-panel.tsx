"use client";

import { ChangeEvent, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  FileCheck2,
  Loader2,
  ShieldAlert,
  UploadCloud,
} from "lucide-react";
import { ContractResultView } from "@/components/contract-review-result";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { recordCaseEvent } from "@/lib/client-case-events";
import type { ContractCheckResult } from "@/lib/contract-risk";

type ContractSeed = {
  text?: string;
  upstreamContext?: string;
  city?: string;
  sourceLabel?: string;
  reportId?: string;
};

const contractScenarioTemplates = [
  {
    label: "押金扣款模糊",
    city: "深圳",
    text: [
      "押金为 6800 元，租期结束后经房东验收无误后退还。",
      "如房屋、家具、家电存在损坏，房东有权从押金中扣除相应费用。",
      "租客提前退租视为违约，押金不予退还，已付租金不退。",
      "物业、水电、网络等费用由租客承担，具体金额以实际发生为准。",
    ].join("\n"),
  },
  {
    label: "维修责任不清",
    city: "上海",
    text: [
      "租期内房屋及附属设施由租客妥善使用。",
      "如设施设备发生损坏，租客应及时维修或承担维修费用。",
      "自然损耗、老化、漏水、墙面发霉等情况由双方协商处理。",
      "维修期间造成的居住影响，出租方不承担额外补偿。",
    ].join("\n"),
  },
  {
    label: "转租授权缺失",
    city: "杭州",
    text: [
      "出租方为房屋实际管理人，有权将房屋出租给承租方使用。",
      "承租方应向出租方支付押金 6000 元及首期租金。",
      "收款账户为出租方指定个人账户，后续如有变更以微信通知为准。",
      "如原房东或物业提出异议，双方另行协商解决。",
    ].join("\n"),
  },
];

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function ContractReviewPanel({ initialInput }: { initialInput?: ContractSeed }) {
  const upstreamContext = initialInput?.upstreamContext?.trim() || "";
  const [text, setText] = useState(initialInput?.text?.trim() || "");
  const [city, setCity] = useState(initialInput?.city?.trim() || "");
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<ContractCheckResult | null>(null);
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");
  const [message, setMessage] = useState(
    upstreamContext
      ? "已带入前面记录里的风险提醒；它只用于提示核对重点，不会被当成真实合同直接判断。请粘贴合同条款或上传截图后再确认。"
      : "请粘贴真实合同条款、中介聊天记录或上传截图。优先确认可能造成押金损失和租期不稳定的条款。",
  );
  const hasReviewInput = Boolean(text.trim() || file);

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const nextFile = event.target.files?.[0] ?? null;
    if (!nextFile) {
      setFile(null);
      return;
    }

    if (!nextFile.type.startsWith("image/")) {
      setState("error");
      setMessage("请上传图片格式的合同或聊天截图。");
      return;
    }

    if (nextFile.size > 4 * 1024 * 1024) {
      setState("error");
      setMessage("截图暂时限制在 4MB 内。");
      return;
    }

    setFile(nextFile);
    setState("idle");
    setMessage(`已选择截图：${nextFile.name}`);
  }

  async function runContractCheck() {
    if (!hasReviewInput) {
      setState("error");
      setMessage("请先粘贴真实合同条款、费用说明、聊天记录，或上传合同/聊天截图；前面带来的风险提醒不能替代合同原文。");
      return;
    }

    setState("loading");
    setMessage("正在确认押金、授权、维修、提前退租和费用风险...");

    try {
      const screenshotDataUrl = file ? await readFileAsDataUrl(file) : undefined;
      const response = await fetch("/api/contract/check", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: text.trim(),
          city,
          role: "tenant",
          screenshotDataUrl,
        }),
      });

      if (!response.ok) {
        throw new Error("合同确认失败，请稍后重试。");
      }

      const data = (await response.json()) as ContractCheckResult;
      setResult(data);
      setState("idle");
      setMessage(
        data.mode === "openai"
          ? "已确认合同重点。"
          : "已整理基础合同确认清单。",
      );
      void recordCaseEvent({
        reportId: initialInput?.reportId || "workspace",
        type: "contract",
        title: "合同确认",
        status:
          data.overallLevel === "高"
            ? "reject"
            : data.overallLevel === "中"
              ? "caution"
              : "recommend",
        summary: data.summary,
        highlights: [
          ...data.findings.map((finding) => `${finding.title}：${finding.action}`),
          ...data.nextSteps,
        ].slice(0, 6),
        href: typeof window !== "undefined" ? `${window.location.pathname}${window.location.search}` : undefined,
      });
    } catch (error) {
      setState("error");
      setMessage(error instanceof Error ? error.message : "合同确认失败。");
    }
  }

  function applyContractScenario(scenario: (typeof contractScenarioTemplates)[number]) {
    setCity(scenario.city);
    setText(scenario.text);
    setFile(null);
    setState("idle");
    setResult(null);
    setMessage(`已填入“${scenario.label}”，请确认后再判断风险条款。`);
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[0.42fr_0.58fr]">
      <Card className="p-6">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <FileCheck2 className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold">签约前条款确认</h2>
          </div>
          {initialInput?.sourceLabel ? (
            <Badge variant="outline" className="w-fit border-primary/30 text-primary">
              {initialInput.sourceLabel}
            </Badge>
          ) : null}
        </div>
        <div className="space-y-4">
          {upstreamContext ? (
            <div className="rounded-md border border-primary/20 bg-primary/10 p-3 text-sm leading-6 text-muted-foreground">
              <div className="mb-2 flex items-center gap-2 text-primary">
                <ShieldAlert className="h-4 w-4" />
                <span className="font-medium">前面带来的风险提醒</span>
              </div>
              <p className="line-clamp-5 whitespace-pre-wrap">
                {upstreamContext}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                这段内容只提示本次合同要重点核对什么；不会直接填入下方合同文本，也不会替代真实合同、补充协议或聊天原文。
              </p>
            </div>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-[0.45fr_0.55fr]">
            <div className="space-y-2">
              <Label htmlFor="contract-city">城市</Label>
              <Input
                id="contract-city"
                value={city}
                onChange={(event) => setCity(event.target.value)}
                placeholder="填写目标城市"
              />
            </div>
            <div className="space-y-2">
              <Label>合同截图</Label>
              <Label className="flex h-11 cursor-pointer items-center justify-center gap-2 rounded-md border border-border bg-secondary px-3 text-sm transition-colors hover:bg-muted">
                <UploadCloud className="h-4 w-4" />
                {file ? "重新选择" : "上传截图"}
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={handleFileChange}
                />
              </Label>
            </div>
          </div>

          <div className="space-y-2">
            <Label>常见合同场景</Label>
            <div className="flex max-w-full gap-2 overflow-x-auto pb-1">
              {contractScenarioTemplates.map((scenario) => (
                <button
                  key={scenario.label}
                  type="button"
                  onClick={() => applyContractScenario(scenario)}
                  className="inline-flex min-h-9 shrink-0 items-center rounded-full border border-border bg-secondary/70 px-3 text-xs font-medium text-muted-foreground transition hover:border-primary/35 hover:bg-primary/10 hover:text-foreground"
                >
                  {scenario.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="contract-text">合同条款或聊天记录</Label>
            <Textarea
              id="contract-text"
              className="min-h-[260px]"
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder="粘贴押金、提前退租、维修责任、转租授权、付款方式等条款..."
            />
          </div>

          <div
            className={`rounded-md border p-3 text-sm leading-6 ${
              state === "error"
                ? "border-rose-300/20 bg-rose-300/10 text-rose-700"
                : "border-border bg-secondary text-muted-foreground"
            }`}
          >
            <div className="flex gap-2">
              {state === "error" ? (
                <AlertTriangle className="mt-1 h-4 w-4 shrink-0" />
              ) : (
                <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-primary" />
              )}
              <span>{message}</span>
            </div>
          </div>

          <Button
            type="button"
            className="w-full"
            disabled={state === "loading" || !hasReviewInput}
            onClick={runContractCheck}
          >
            {state === "loading" ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <ShieldAlert className="mr-2 h-4 w-4" />
            )}
            {state === "loading"
              ? "正在确认"
              : hasReviewInput
                ? "确认风险条款"
                : "先粘贴合同或上传截图"}
          </Button>
        </div>
      </Card>

      <ContractResultView
        result={result}
        city={city}
        reportId={initialInput?.reportId}
        onMessage={setMessage}
      />
    </div>
  );
}


