"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { CheckCircle2, CircleDashed, LogOut, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type AccountStatus = {
  authConfigured: boolean;
  authenticated: boolean;
  user: {
    id?: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
    provider?: string | null;
    googleEmailVerified?: boolean;
  } | null;
  localUser: {
    id: string;
    email: string;
    provider: string;
    emailVerified: boolean;
    createdAt: string;
    lastLoginAt: string;
  } | null;
};

export function AccountStatusPanel() {
  const [status, setStatus] = useState<AccountStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSigningOut, setIsSigningOut] = useState(false);

  const refreshStatus = useCallback(() => {
    setIsLoading(true);
    const localEmail =
      typeof window !== "undefined" ? window.localStorage.getItem("zhunaar-auth-email") : "";
    const query = localEmail ? `?email=${encodeURIComponent(localEmail)}` : "";
    fetch(`/api/account/me${query}`, { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => setStatus(data))
      .catch(() => setStatus(null))
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    refreshStatus();
    window.addEventListener("storage", refreshStatus);
    window.addEventListener("focus", refreshStatus);

    return () => {
      window.removeEventListener("storage", refreshStatus);
      window.removeEventListener("focus", refreshStatus);
    };
  }, [refreshStatus]);

  async function handleSignOut() {
    setIsSigningOut(true);
    if (status?.user) {
      await signOut({ redirectTo: "/" });
      return;
    }

    window.localStorage.removeItem("zhunaar-auth-email");
    window.localStorage.removeItem("zhunaar-auth-user-id");
    await fetch("/api/auth/local-session", { method: "DELETE" }).catch(() => null);
    setIsSigningOut(false);
    refreshStatus();
  }

  const user = status?.user;
  const localUser = status?.localUser;
  const accountEmail = user?.email || localUser?.email || "";
  const accountName = user?.name || accountEmail || "邮箱账号";

  return (
    <Card className="min-w-0 p-6">
      <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-border bg-secondary px-3 py-1 text-xs text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5 text-primary" />
            账号
          </div>
          <h2 className="text-lg font-semibold">登录与记录保存</h2>
          <p className="mt-2 max-w-3xl break-words text-sm leading-6 text-muted-foreground">
            登录后，偏好、判断记录和房源记录会绑定到当前账号。本机已有记录也会接到账号下。
          </p>
        </div>
        <StatusPill configured={Boolean(user || localUser)} label={user || localUser ? "已登录" : "未登录"} />
      </div>

      {isLoading ? (
        <div className="min-w-0 rounded-md border border-border bg-secondary p-4 text-sm text-muted-foreground">
          正在读取账号状态...
        </div>
      ) : user || localUser ? (
        <div className="grid min-w-0 gap-4 lg:grid-cols-[1fr_0.9fr]">
          <div className="min-w-0 rounded-md border border-border bg-secondary p-4">
            <div className="flex items-start gap-3">
              {user?.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.image}
                  alt=""
                  className="h-12 w-12 rounded-full border border-border"
                />
              ) : (
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-card text-primary">
                  <ShieldCheck className="h-5 w-5" />
                </span>
              )}
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{accountName}</p>
                <p className="mt-1 truncate text-xs text-muted-foreground">{accountEmail}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <StatusPill configured={user?.googleEmailVerified === true || localUser?.emailVerified === true} label="邮箱已验证" />
                  <StatusPill configured={Boolean(localUser)} label="记录已绑定" />
                </div>
              </div>
            </div>
            {user || localUser ? (
              <Button
                type="button"
                variant="secondary"
                className="mt-4"
                onClick={handleSignOut}
                disabled={isSigningOut}
              >
                <LogOut className="mr-2 h-4 w-4" />
                {isSigningOut ? "正在退出" : "退出登录"}
              </Button>
            ) : null}
          </div>

          <div className="min-w-0 rounded-md border border-border bg-secondary p-4">
            <p className="text-sm font-semibold">记录保存状态</p>
            {localUser ? (
              <>
                <p className="mt-3 text-xs leading-5 text-muted-foreground">
                  当前账号已绑定，可以继续保存偏好、判断记录和房源记录。
                </p>
              </>
            ) : (
              <p className="mt-3 text-xs leading-5 text-muted-foreground">
                完成邮箱验证后，后续判断记录会归到当前账号下。
              </p>
            )}
          </div>
        </div>
      ) : (
        <div className="min-w-0 rounded-md border border-border bg-secondary p-4">
          <p className="text-sm font-semibold">尚未登录</p>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">
            登录后可以保存报告、房源记录和常用偏好。
          </p>
          <Button asChild className="mt-4">
            <Link href="/auth?callbackUrl=/settings">
              登录或注册
            </Link>
          </Button>
        </div>
      )}
    </Card>
  );
}

function StatusPill({ configured, label }: { configured: boolean; label: string }) {
  const Icon = configured ? CheckCircle2 : CircleDashed;

  return (
    <span
      className={`inline-flex w-fit items-center gap-1 rounded-full border px-2.5 py-1 text-xs ${
        configured
          ? "border-emerald-300/30 bg-emerald-300/10 text-emerald-700"
          : "border-amber-300/30 bg-amber-300/10 text-amber-700"
      }`}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </span>
  );
}

