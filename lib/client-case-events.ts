"use client";

import type { CreateCaseEventInput } from "@/lib/case-events";
import { quotaExceededCode, quotaExceededHrefFromPayload } from "@/lib/quota-routing";

export const workspaceRecordId = "workspace";
export const appNoticeEvent = "zhunaar:app-notice";

type ApiErrorPayload = {
  error?: string;
  message?: string;
  upgradeHref?: string;
};

function notify(message: string, actionHref?: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(appNoticeEvent, {
      detail: {
        message,
        actionHref,
        actionLabel: actionHref ? "查看方案" : undefined,
      },
    }),
  );
}

export async function recordCaseEvent(input: CreateCaseEventInput) {
  const reportId = input.reportId?.trim() || workspaceRecordId;

  const response = await fetch("/api/case-events", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      ...input,
      reportId,
    }),
  }).catch(() => null);

  if (response?.ok) return true;

  const data = (await response?.json().catch(() => null)) as ApiErrorPayload | null;
  notify(
    data?.message ?? "判断记录保存失败，请稍后重试。",
    quotaExceededHrefFromPayload({
      error: data?.error === quotaExceededCode ? data.error : undefined,
      upgradeHref: data?.upgradeHref,
      from: "record",
    }),
  );
  return false;
}
