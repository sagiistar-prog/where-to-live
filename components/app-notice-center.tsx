"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertCircle, X } from "lucide-react";
import { appNoticeEvent } from "@/lib/client-case-events";

type AppNotice = {
  message: string;
  actionHref?: string;
  actionLabel?: string;
};

function isNoticeDetail(value: unknown): value is AppNotice {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return typeof record.message === "string" && record.message.trim().length > 0;
}

export function AppNoticeCenter() {
  const [notice, setNotice] = useState<AppNotice | null>(null);

  useEffect(() => {
    function handleNotice(event: Event) {
      const detail = (event as CustomEvent).detail;
      if (!isNoticeDetail(detail)) return;
      setNotice({
        message: detail.message,
        actionHref: typeof detail.actionHref === "string" ? detail.actionHref : undefined,
        actionLabel: typeof detail.actionLabel === "string" ? detail.actionLabel : undefined,
      });
    }

    window.addEventListener(appNoticeEvent, handleNotice);
    return () => window.removeEventListener(appNoticeEvent, handleNotice);
  }, []);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 7000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  if (!notice) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 w-[min(24rem,calc(100vw-2rem))] rounded-lg border border-amber-300/35 bg-card p-4 text-sm shadow-[0_24px_80px_oklch(var(--foreground)/0.16)]">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-amber-300/15 text-amber-700">
          <AlertCircle className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="leading-6 text-foreground">{notice.message}</p>
          {notice.actionHref ? (
            <Link
              href={notice.actionHref}
              className="mt-2 inline-flex text-sm font-medium text-primary underline-offset-4 hover:underline"
              onClick={() => setNotice(null)}
            >
              {notice.actionLabel ?? "查看"}
            </Link>
          ) : null}
        </div>
        <button
          type="button"
          aria-label="关闭提示"
          className="shrink-0 rounded-md p-1 text-muted-foreground transition hover:bg-secondary hover:text-foreground"
          onClick={() => setNotice(null)}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
