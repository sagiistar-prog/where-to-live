"use client";

import type { CreateCaseEventInput } from "@/lib/case-events";

export const workspaceRecordId = "workspace";

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

  return Boolean(response?.ok);
}
