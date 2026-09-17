"use client";

import { ChangeEvent, DragEvent } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ImageIcon,
  Loader2,
  SearchCheck,
  UploadCloud,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

type ExtractState = "idle" | "extracting" | "done" | "error";

type ExtractResult = {
  mode?: "openai" | "fallback";
  fields?: {
    title?: string;
    rent?: string;
    area?: string;
    floor?: string;
    address?: string;
    description?: string;
    city?: string;
  };
  confidence?: number;
  missingFields?: string[];
  warnings?: string[];
  message?: string;
};

type ListingScreenshotSectionProps = {
  screenshot: File | null;
  screenshotDataUrl?: string;
  extractState: ExtractState;
  extractResult: ExtractResult | null;
  screenshotExtractionEnabled: boolean;
  onFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onDrop: (event: DragEvent<HTMLDivElement>) => void;
  onExtractScreenshot: () => void;
};

export function ListingScreenshotSection({
  screenshot,
  screenshotDataUrl,
  extractState,
  extractResult,
  screenshotExtractionEnabled,
  onFileChange,
  onDrop,
  onExtractScreenshot,
}: ListingScreenshotSectionProps) {
  return (
    <details className="mt-3 rounded-md border border-border bg-secondary/45 p-4">
      <summary className="cursor-pointer text-sm font-medium text-foreground">
        上传截图（选填）
      </summary>
      <div
        className="mt-4 rounded-lg border border-dashed border-border bg-secondary p-5"
        onDragOver={(event) => event.preventDefault()}
        onDrop={onDrop}
      >
        <div className="grid gap-5 lg:grid-cols-[0.72fr_0.28fr]">
          <div className="flex min-h-[220px] flex-col items-center justify-center text-center">
            <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-md bg-primary/15 text-primary">
              <UploadCloud className="h-7 w-7" />
            </div>
            <h3 className="text-lg font-semibold">上传截图补充信息</h3>
            <p className="mt-3 max-w-md text-sm leading-6 text-muted-foreground">
              支持房源截图、中介聊天截图、房屋照片。上传后可以提取租金、面积、地址和费用说明，但评估前仍以你确认后的信息为准。
            </p>
            <div className="mt-6 flex flex-col gap-2 sm:flex-row">
              <Label className="inline-flex h-10 cursor-pointer items-center justify-center rounded-md border border-border bg-secondary px-4 py-2 text-sm font-medium transition-colors hover:bg-muted">
                选择图片
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={onFileChange}
                />
              </Label>
              <Button
                type="button"
                variant="secondary"
                onClick={onExtractScreenshot}
                disabled={
                  !screenshotDataUrl ||
                  extractState === "extracting" ||
                  !screenshotExtractionEnabled
                }
              >
                {extractState === "extracting" ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <SearchCheck className="mr-2 h-4 w-4" />
                )}
                {extractState === "extracting" ? "读取中" : "读取截图信息"}
              </Button>
            </div>
            {!screenshotExtractionEnabled ? (
              <p className="mt-3 text-xs leading-5 text-amber-700">
                当前没有开启截图读取。截图只能作为你手动确认的补充信息。
              </p>
            ) : null}
            {screenshot ? (
              <div className="mt-4 inline-flex max-w-full items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1 text-xs text-emerald-700">
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{screenshot.name}</span>
              </div>
            ) : null}
          </div>

          <div className="min-w-0">
            {screenshotDataUrl ? (
              <div className="overflow-hidden rounded-md border border-border bg-secondary/70">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={screenshotDataUrl}
                  alt="房源截图预览"
                  className="h-44 w-full object-cover"
                />
              </div>
            ) : (
              <div className="flex h-44 items-center justify-center rounded-md border border-border bg-secondary/60 text-muted-foreground">
                <div className="text-center">
                  <ImageIcon className="mx-auto mb-2 h-6 w-6" />
                  <p className="text-xs">截图预览</p>
                </div>
              </div>
            )}
            <ExtractionSummary result={extractResult} state={extractState} />
          </div>
        </div>
      </div>
    </details>
  );
}

function ExtractionSummary({
  result,
  state,
}: {
  result: ExtractResult | null;
  state: ExtractState;
}) {
  if (!result && state === "idle") {
    return (
      <div className="mt-3 rounded-md border border-border bg-secondary/60 p-3 text-xs leading-5 text-muted-foreground">
        读取后会填入手动输入表单。请你再确认一遍，因为截图里的小字、遮挡和宣传文案可能导致误读。
      </div>
    );
  }

  if (state === "extracting") {
    return (
      <div className="mt-3 rounded-md border border-primary/20 bg-primary/10 p-3 text-xs leading-5 text-primary">
        正在读取截图里的信息，只提取图片里明确可见的内容。
      </div>
    );
  }

  const fields = result?.fields ?? {};
  const chips = [
    fields.title ? `标题：${fields.title}` : "",
    fields.rent ? `租金：${fields.rent}` : "",
    fields.area ? `面积：${fields.area}` : "",
    fields.floor ? `楼层：${fields.floor}` : "",
    fields.address ? `位置：${fields.address}` : "",
    fields.city ? `城市：${fields.city}` : "",
  ].filter(Boolean);
  const warnings = [...(result?.warnings ?? []), ...(result?.missingFields ?? [])].slice(0, 3);

  return (
    <div
      className={`mt-3 rounded-md border p-3 text-xs leading-5 ${
        state === "done"
          ? "border-emerald-300/20 bg-emerald-300/10 text-emerald-900"
          : "border-amber-300/20 bg-amber-300/10 text-amber-900"
      }`}
    >
      <div className="mb-2 flex items-center gap-2">
        {state === "done" ? (
          <CheckCircle2 className="h-4 w-4" />
        ) : (
          <AlertTriangle className="h-4 w-4" />
        )}
        <p className="font-medium">
          {state === "done" ? "已读取到信息" : "需要手动确认"}
        </p>
      </div>
      {chips.length ? (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {chips.map((chip) => (
            <span
              key={chip}
              className="max-w-full truncate rounded-full border border-border bg-secondary/70 px-2 py-0.5"
            >
              {chip}
            </span>
          ))}
        </div>
      ) : null}
      <p>{result?.message ?? "请补充截图里无法确认的信息。"}</p>
      {typeof result?.confidence === "number" && result.confidence > 0 ? (
        <p className="mt-1 opacity-80">已读取到约 {Math.round(result.confidence * 100)}% 的可用信息。</p>
      ) : null}
      {warnings.length ? (
        <ul className="mt-2 space-y-1 opacity-90">
          {warnings.map((warning) => (
            <li key={warning}>{warning}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
