"use client";

import { useState } from "react";
import { Download, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { appSettingsStorageKey, appSettingsUpdatedEvent } from "@/lib/app-settings";
import {
  onboardingStorageKey,
  userPreferencesStorageKey,
  userPreferencesUpdatedEvent,
} from "@/lib/user-preferences";

const latestReportStorageKey = "zhunaar:last-report";

type ActionState = "idle" | "loading" | "done" | "error";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function readStoredJson(storage: Storage, key: string) {
  const raw = storage.getItem(key);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return raw;
  }
}

function countPresent(values: Record<string, unknown>) {
  return Object.values(values).filter((value) => value !== null && value !== undefined && value !== "").length;
}

function downloadJson(filename: string, payload: unknown) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function DataManagementActions() {
  const [status, setStatus] = useState<"idle" | "confirming" | "clearing" | "done" | "error">("idle");
  const [exportState, setExportState] = useState<ActionState>("idle");

  async function exportFullArchive() {
    setExportState("loading");

    try {
      const response = await fetch("/api/reports/export");
      if (!response.ok) throw new Error("导出失败");
      const serverArchive = await response.json();
      const accountResponse = await fetch("/api/account/me", { cache: "no-store" }).catch(() => null);
      const accountArchive =
        accountResponse?.ok ? await accountResponse.json().catch(() => null) : null;
      const exportedAt = new Date().toISOString();
      const serverCounts = isRecord(serverArchive) && isRecord(serverArchive.counts)
        ? serverArchive.counts
        : {};
      const browserArchive = {
        userPreferences: readStoredJson(localStorage, userPreferencesStorageKey),
        appSettings: readStoredJson(localStorage, appSettingsStorageKey),
        onboardingCompletedAt: localStorage.getItem(onboardingStorageKey),
        latestSessionReport: readStoredJson(sessionStorage, latestReportStorageKey),
      };

      downloadJson(`zhunaar-full-local-archive-${exportedAt.slice(0, 10)}.json`, {
        product: "住哪儿 AI",
        archiveType: "full-local-decision-archive",
        schemaVersion: 2,
        exportedAt,
        manifest: {
          included: [
            { key: "serverReports", source: "local-node-storage", count: serverCounts.reports ?? 0 },
            { key: "serverCaseEvents", source: "local-node-storage", count: serverCounts.caseEvents ?? 0 },
            { key: "browserUserPreferences", source: "localStorage", present: Boolean(browserArchive.userPreferences) },
            { key: "browserAppSettings", source: "localStorage", present: Boolean(browserArchive.appSettings) },
            { key: "browserOnboardingState", source: "localStorage", present: Boolean(browserArchive.onboardingCompletedAt) },
            { key: "browserLatestSessionReport", source: "sessionStorage", present: Boolean(browserArchive.latestSessionReport) },
            { key: "accountStatus", source: "auth-session-and-local-user-record", present: Boolean(accountArchive?.user || accountArchive?.localUser) },
          ],
          excluded: [
            ".env.local 中的 API Key",
            "OpenAI / 高德 / 天气 / Resend / Google OAuth 服务端密钥",
            "Google OAuth access token / refresh token",
            "Auth.js session cookie 原文",
            "微信、邮箱、社交媒体或租房平台后台",
            "浏览器之外的私人账号数据",
          ],
          clearActionWillRemove: [
            "serverReports",
            "serverCaseEvents",
            "browserUserPreferences",
            "browserAppSettings",
            "browserOnboardingState",
            "browserLatestSessionReport",
          ],
          clearActionWillPreserve: [
            ".env.local",
            "OPENAI_API_KEY",
            "AMAP_WEB_SERVICE_KEY",
            "QWEATHER_API_KEY",
            "RESEND_API_KEY",
            "AUTH_SECRET",
            "AUTH_GOOGLE_ID",
            "AUTH_GOOGLE_SECRET",
            ".data/auth-users.json",
          ],
        },
        counts: {
          serverReports: serverCounts.reports ?? 0,
          serverCaseEvents: serverCounts.caseEvents ?? 0,
          browserItemsPresent: countPresent(browserArchive),
        },
        boundary:
          "本导出只包含当前设备保存的报告、房源记录、当前账号摘要和当前浏览器保存的偏好/设置/会话报告，不包含 .env.local 中的 API Key、Google OAuth token 或 Auth.js session cookie，也不读取私人账号、微信、邮箱或租房平台后台。",
        accountArchive,
        serverArchive,
        browserArchive,
      });

      setExportState("done");
    } catch {
      setExportState("error");
    }
  }

  async function clearHistory() {
    if (status !== "confirming") {
      setStatus("confirming");
      return;
    }

    setStatus("clearing");
    try {
      const response = await fetch("/api/reports/clear", { method: "POST" });
      if (!response.ok) throw new Error("清空失败");
      sessionStorage.removeItem(latestReportStorageKey);
      localStorage.removeItem(userPreferencesStorageKey);
      localStorage.removeItem(appSettingsStorageKey);
      localStorage.removeItem(onboardingStorageKey);
      window.dispatchEvent(new Event(userPreferencesUpdatedEvent));
      window.dispatchEvent(new Event(appSettingsUpdatedEvent));
      setStatus("done");
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row">
        <Button
          type="button"
          variant="secondary"
          className="flex-1"
          onClick={exportFullArchive}
          disabled={exportState === "loading"}
        >
          {exportState === "loading" ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Download className="mr-2 h-4 w-4" />
          )}
          {exportState === "loading" ? "正在导出" : "导出完整数据"}
        </Button>
        <Button
          type="button"
          variant="destructive"
          className="flex-1"
          onClick={clearHistory}
          disabled={status === "clearing"}
        >
          {status === "clearing" ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Trash2 className="mr-2 h-4 w-4" />
          )}
          {status === "clearing"
            ? "正在清空"
            : status === "confirming"
              ? "再次确认清空"
              : "清空历史记录"}
        </Button>
      </div>
      <div className="grid gap-2 text-xs leading-5 text-muted-foreground">
        <p>
          {exportState === "done"
            ? "已导出完整数据：包含报告、房源记录、浏览器里的居住偏好、应用设置和会话报告。"
            : exportState === "error"
              ? "导出失败，请稍后重试。"
              : "完整导出会合并当前设备保存的报告、房源记录，以及当前浏览器保存的居住偏好、应用设置和会话报告；不会导出 .env.local 里的 API Key。"}
        </p>
        <p>
        {status === "done"
      ? "已清空报告、已保存判断、浏览器会话报告、居住偏好和应用设置；设置表单和导航摘要已回到初始状态。"
          : status === "confirming"
            ? "这会删除当前设备保存的报告、房源记录事件、浏览器会话报告、居住偏好和应用设置。不会删除 .env.local 中的 API Key，也不会删除账号记录。再次点击红色按钮后才会清空。"
          : status === "error"
            ? "清空失败，请稍后重试。"
            : "清空会删除当前设备历史和当前浏览器租房数据，保留服务端环境变量中的 API Key 和账号记录。"}
        </p>
      </div>
    </div>
  );
}
