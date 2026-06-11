"use client";

import Link from "next/link";
import { ChangeEvent, useEffect, useState } from "react";
import {
  AlertTriangle,
  Archive,
  ArrowRight,
  BadgeDollarSign,
  CheckCircle2,
  Copy,
  FileCheck2,
  Loader2,
  Scale,
  ShieldAlert,
  UploadCloud,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { recordCaseEvent } from "@/lib/client-case-events";
import type { ContractCheckResult, ContractSeverity } from "@/lib/contract-risk";

type ContractSeed = {
  text?: string;
  upstreamContext?: string;
  city?: string;
  sourceLabel?: string;
  reportId?: string;
};

const severityClass: Record<ContractSeverity, string> = {
  高: "border-rose-300/30 bg-rose-300/10 text-rose-700",
  中: "border-amber-300/30 bg-amber-300/10 text-amber-700",
  低: "border-emerald-300/30 bg-emerald-300/10 text-emerald-700",
};

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
  const [city, setCity] = useState(initialInput?.city?.trim() || "上海");
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<ContractCheckResult | null>(null);
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");
  const [message, setMessage] = useState(
    upstreamContext
      ? "已带入前面记录里的风险提醒；它只用于提示核对重点，不会被当成真实合同直接判断。请粘贴合同条款或上传截图后再确认。"
      : "请粘贴真实合同条款、中介聊天记录或上传截图。住哪儿会优先确认可能造成押金损失和租期不稳定的条款。",
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
                placeholder="例如：上海"
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

function ContractResultView({
  result,
  city,
  reportId,
  onMessage,
}: {
  result: ContractCheckResult | null;
  city: string;
  reportId?: string;
  onMessage?: (message: string) => void;
}) {
  const [checkedItems, setCheckedItems] = useState<string[]>([]);
  const [copiedMemo, setCopiedMemo] = useState(false);

  useEffect(() => {
    setCheckedItems([]);
    setCopiedMemo(false);
  }, [result?.checkedAt]);

  if (!result) {
    return (
      <Card className="p-6">
        <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-md bg-primary/15 text-primary">
          <Scale className="h-6 w-6" />
        </div>
        <h2 className="text-xl font-semibold">签约前底线</h2>
        <div className="mt-5 grid gap-3 text-sm leading-6 text-muted-foreground">
          {[
            "出租人身份、产权证明或转租授权必须确认。",
            "押金金额、返还时间、扣减条件必须写进合同。",
            "维修责任要区分自然损耗和人为损坏。",
            "付款备注必须写明地址、款项用途和周期。",
            "口头承诺一律转成合同或补充协议。",
          ].map((item) => (
            <div key={item} className="rounded-md border border-border bg-secondary/60 p-3">
              {item}
            </div>
          ))}
        </div>
      </Card>
    );
  }

  const revisionItems = [
    ...result.findings.map((finding) => ({
      id: `finding-${finding.title}`,
      label: `改写风险条款：${finding.title}`,
      detail: finding.action,
    })),
    ...result.missingClauses.map((clause) => ({
      id: `missing-${clause}`,
      label: `补充条款：${clause}`,
      detail: "必须写进合同、补充协议或聊天确认，不能只接受口头承诺。",
    })),
  ];
  const missingRevisionItems = revisionItems.filter((item) => !checkedItems.includes(item.id));
  const revisionProgress = revisionItems.length
    ? Math.round(((revisionItems.length - missingRevisionItems.length) / revisionItems.length) * 100)
    : 100;
  const signatureReady = missingRevisionItems.length === 0;
  const remediationMemo = buildRemediationMemo(result, city);

  function toggleRevisionItem(id: string) {
    setCheckedItems((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  }

  async function syncContractReadiness() {
    if (!result) return;

    await recordCaseEvent({
      reportId: reportId || "workspace",
      type: "contract",
      title: "签约前修改确认",
      status: signatureReady ? "recommend" : "reject",
      summary: signatureReady
        ? "合同风险条款和缺失条款已逐项修改确认，可以进入签约前最后确认。"
        : `仍有 ${missingRevisionItems.length} 项条款修改未确认，当前不建议签约。`,
      highlights: (signatureReady
        ? ["已确认风险条款改写、缺失条款补充、凭据材料和签约前事项。"]
                        : missingRevisionItems.map((item) => `还没确认：${item.label}`)
      ).slice(0, 6),
      href:
        typeof window !== "undefined"
          ? `${window.location.pathname}${window.location.search}`
          : undefined,
    });
    onMessage?.(reportId ? "签约前修改状态已保存到房源记录。" : "签约前修改状态已保存到工作台。");
  }

  async function copyRemediationMemo() {
    try {
      await navigator.clipboard.writeText(remediationMemo);
      setCopiedMemo(true);
      window.setTimeout(() => setCopiedMemo(false), 1600);
    } catch {
      setCopiedMemo(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card className="p-6">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm text-muted-foreground">综合风险</p>
            <h2 className="mt-2 text-2xl font-semibold">{result.summary}</h2>
          </div>
          <div className="flex gap-2">
            <span className={`rounded-full border px-3 py-1 text-xs ${severityClass[result.overallLevel]}`}>
              {result.overallLevel}风险
            </span>
            <span className="rounded-full border border-border bg-secondary px-3 py-1 text-xs text-muted-foreground">
              {result.mode === "openai" ? "重点确认" : "基础确认"}
            </span>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <Metric label="安全分" value={`${result.score}/100`} />
          <Metric label="风险项" value={`${result.findings.length} 项`} />
          <Metric label="缺失条款" value={`${result.missingClauses.length} 项`} />
        </div>
        {result.warnings.length ? (
          <div className="mt-4 rounded-md border border-amber-300/20 bg-amber-300/10 p-3 text-sm leading-6 text-amber-700">
            {result.warnings.join(" ")}
          </div>
        ) : null}
      </Card>

      <Card className="p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm text-muted-foreground">签字前修改清单</p>
            <h3 className="mt-1 text-xl font-semibold">
              {signatureReady ? "可进入签约前最后确认" : "先改条款，再谈签字"}
            </h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              把看到的风险条款和缺失条款逐项写进合同、补充协议或聊天确认。写清前，不要把“我理解了风险”当成“可以签”。
            </p>
          </div>
          <Badge variant={signatureReady ? "success" : "warning"}>
            {signatureReady ? "修改已确认" : "待修改"}
          </Badge>
        </div>
        <div className="mt-4">
          <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
            <span>条款修改进度</span>
            <span>{revisionProgress}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${revisionProgress}%` }}
            />
          </div>
        </div>
        <div className="mt-4 grid gap-2">
          {(revisionItems.length
            ? revisionItems
            : [
                {
                  id: "baseline-final-check",
                  label: "做签约前最后确认",
                  detail: "逐项确认身份授权、押金返还、维修责任、费用边界和交割凭据。",
                },
              ]
          ).map((item) => (
            <Label
              key={item.id}
              className="flex cursor-pointer items-start gap-3 rounded-md border border-border bg-secondary/60 p-3 text-sm leading-6 text-muted-foreground"
            >
              <Checkbox
                checked={checkedItems.includes(item.id) || (!revisionItems.length && signatureReady)}
                onCheckedChange={() => toggleRevisionItem(item.id)}
                aria-label={item.label}
              />
              <span>
                <span className="block font-medium text-foreground">{item.label}</span>
                <span className="mt-1 block text-xs leading-5">{item.detail}</span>
              </span>
            </Label>
          ))}
        </div>
        <Button
          type="button"
          variant="secondary"
          className="mt-4 w-full"
          onClick={syncContractReadiness}
        >
          保存修改状态
        </Button>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Button asChild variant="secondary">
            <Link href={buildEvidenceHref(result, city, reportId)}>
              <Archive className="mr-2 h-4 w-4" />
              把合同风险转成凭据材料
            </Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href={buildPaymentHref(result, city, reportId)}>
              <BadgeDollarSign className="mr-2 h-4 w-4" />
              带去付款前确认
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </Card>

      <Card className="p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm text-muted-foreground">签约前沟通文本</p>
            <h3 className="mt-1 text-xl font-semibold">把风险条款改成可落地要求</h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              这段文字适合发给中介或出租方。重点是要求改合同、补附件、保留书面确认，避免只停留在口头承诺。
            </p>
          </div>
          <Button type="button" variant="outline" onClick={copyRemediationMemo}>
            <Copy className="mr-2 h-4 w-4" />
            {copiedMemo ? "已复制" : "复制沟通文本"}
          </Button>
        </div>
        <pre className="mt-4 whitespace-pre-wrap break-words rounded-md border border-border bg-background/45 p-4 text-xs leading-6 text-muted-foreground">
          {remediationMemo}
        </pre>
      </Card>

      {result.findings.length ? (
        <div className="grid gap-3">
          {result.findings.map((finding) => (
            <Card key={finding.title} className="p-5">
              <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h3 className="text-lg font-semibold">{finding.title}</h3>
                  <p className="mt-1 text-xs text-muted-foreground">{finding.category}</p>
                </div>
                <span className={`w-fit rounded-full border px-2.5 py-1 text-xs ${severityClass[finding.severity]}`}>
                  {finding.severity}风险
                </span>
              </div>
              <div className="grid gap-3 text-sm leading-6 text-muted-foreground">
                <p>凭据：{finding.evidence}</p>
                <p>风险：{finding.risk}</p>
                <p>事项：{finding.action}</p>
                <div className="rounded-md border border-emerald-300/20 bg-emerald-300/10 p-3 text-emerald-900">
                  沟通话术：{finding.negotiationText}
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <ChecklistCard title="缺失条款" items={result.missingClauses} empty="暂未看到明显缺失条款。" />
        <ChecklistCard title="凭据材料" items={result.evidenceChecklist} />
        <ChecklistCard title="下一步" items={result.nextSteps} />
        <Card className="p-5">
          <h3 className="font-semibold">依据与边界</h3>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            {result.disclaimer}
          </p>
          <div className="mt-4 grid gap-2">
            {result.sources.map((source) => (
              <a
                key={source.url}
                href={source.url}
                target="_blank"
                rel="noreferrer"
                className="text-sm text-primary underline-offset-4 hover:underline"
              >
                {source.title}
              </a>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

function buildRemediationMemo(result: ContractCheckResult, city: string) {
  const findingLines = result.findings.length
    ? result.findings.flatMap((finding, index) => [
        `${index + 1}. ${finding.title}`,
        `   风险：${finding.risk}`,
        `   请改为/补充：${finding.negotiationText}`,
      ])
    : [
        "1. 目前未看到明确高风险表述，但仍需做签约前最后确认。",
        "   请确认出租权、押金、维修、费用、交割和付款备注都写进合同或附件。",
      ];
  const missingLines = result.missingClauses.length
    ? result.missingClauses.map((item, index) => `${index + 1}. ${item}`)
    : ["1. 当前未看到明显缺失条款，签字前仍需核对附件和交割清单。"];
  const evidenceLines = result.evidenceChecklist
    .slice(0, 8)
    .map((item, index) => `${index + 1}. ${item}`);

  return [
    `你好，我正在核对${city ? `${city}这份` : "这份"}租房合同。为了避免后续押金、维修和退租争议，以下内容需要在签约前改进到合同、补充协议、附件或可留存聊天确认里。`,
    "",
    "一、需要改写或确认的风险条款",
    ...findingLines,
    "",
    "二、需要补充的缺失条款",
    ...missingLines,
    "",
    "三、签字前需要留存的材料",
    ...evidenceLines,
    "",
    "请尽量用文字、合同修订版、附件或可截图留存的方式回复。以上问题确认前，我不会先付款或签字。",
  ].join("\n");
}

function buildContractContext(result: ContractCheckResult) {
  return [
    "合同确认结果",
    `综合结论：${result.summary}`,
    `风险等级：${result.overallLevel}，安全分：${result.score}/100`,
    ...result.findings
      .slice(0, 6)
      .map((finding) => `${finding.category} - ${finding.title}：${finding.risk}；事项：${finding.action}`),
    ...result.missingClauses.slice(0, 6).map((clause) => `缺失条款：${clause}`),
    ...result.evidenceChecklist.slice(0, 6).map((item) => `需保存凭据：${item}`),
    ...result.nextSteps.slice(0, 4).map((item) => `下一步：${item}`),
  ].join("\n");
}

function buildEvidenceHref(result: ContractCheckResult, city: string, reportId?: string) {
  const params = new URLSearchParams({
    from: "contract",
    stage: "签约前",
    title: "合同确认带入房源",
    city,
    landlordType: result.findings.some((finding) => finding.category.includes("出租主体"))
      ? "疑似二房东 / 代理 / 授权待确认"
      : "出租主体待确认",
    deposit: "押金、定金和付款周期按合同条款确认",
    paymentCycle: "付款周期、收款主体和退款条件待确认",
    risks: [
      result.summary,
      ...result.findings.map((finding) => `${finding.title}：${finding.action}`),
      ...result.missingClauses.map((clause) => `缺失：${clause}`),
    ]
      .slice(0, 10)
      .join("；"),
    reportContext: buildContractContext(result),
  });
  if (reportId) params.set("reportId", reportId);
  return `/evidence?${params.toString()}`;
}

function buildPaymentHref(result: ContractCheckResult, city: string, reportId?: string) {
  const hasAuthorizationRisk = result.findings.some((finding) =>
    `${finding.category} ${finding.title} ${finding.risk}`.includes("授权"),
  );
  const hasPaymentRisk = result.findings.some((finding) =>
    `${finding.category} ${finding.title} ${finding.risk}`.includes("费用"),
  );
  const params = new URLSearchParams({
    from: "contract",
    title: "合同确认带入房源",
    city,
    listingTitle: "合同确认带入房源",
    paymentType: hasPaymentRisk ? "服务费" : "定金",
    amount: "1000",
    monthlyRent: "5200",
    stage: "合同确认后，未签字",
    contractStatus:
      result.overallLevel === "高"
        ? "合同存在高风险条款，未修改"
        : result.overallLevel === "中"
          ? "合同存在待补充条款"
          : "合同需做签字前最后确认",
    identityStatus: "待确认出租人身份",
    authorizationStatus: hasAuthorizationRisk ? "未看到产权/转租授权" : "授权材料待最终确认",
    payeeType: "待确认收款主体",
    payeeMatchesContract: "暂不清楚",
    refundRule: result.missingClauses.some((clause) => clause.includes("押金"))
      ? "未写清"
      : "按合同条款确认",
    receiptStatus: "需要收据/电子确认",
    paymentChannel: "待确认",
    urgencyPressure: "合同条款未修改前不接受催付",
    notes: [
      result.summary,
      ...result.findings.map((finding) => `${finding.title}：${finding.action}`),
      ...result.missingClauses.map((clause) => `缺失：${clause}`),
    ]
      .slice(0, 8)
      .join("；"),
    reportContext: buildContractContext(result),
  });
  if (reportId) params.set("reportId", reportId);
  return `/payment?${params.toString()}`;
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-secondary p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-semibold">{value}</p>
    </div>
  );
}

function ChecklistCard({
  title,
  items,
  empty = "暂无。",
}: {
  title: string;
  items: string[];
  empty?: string;
}) {
  return (
    <Card className="p-5">
      <h3 className="font-semibold">{title}</h3>
      <ul className="mt-4 space-y-2 text-sm leading-6 text-muted-foreground">
        {(items.length ? items : [empty]).map((item) => (
          <li key={item} className="flex gap-2">
            <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

