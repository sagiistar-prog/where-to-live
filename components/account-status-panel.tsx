"use client";

import { useCallback, useEffect, useState } from "react";
import { signIn, signOut } from "next-auth/react";
import { CheckCircle2, CircleDashed, LogOut, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type AccountStatus = {
  authConfigured: boolean;
  authenticated: boolean;
  authConfig: {
    configured: boolean;
    secretConfigured: boolean;
    googleIdConfigured: boolean;
    googleSecretConfigured: boolean;
    nextAuthUrlConfigured: boolean;
    callbackUrl: string;
  };
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
  reason?: string;
};

export function AccountStatusPanel() {
  const [status, setStatus] = useState<AccountStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSigningOut, setIsSigningOut] = useState(false);

  const refreshStatus = useCallback(() => {
    setIsLoading(true);
    fetch("/api/account/me", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => setStatus(data))
      .catch(() => setStatus(null))
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    refreshStatus();
    window.addEventListener("zhunaar-api-config-updated", refreshStatus);

    return () => {
      window.removeEventListener("zhunaar-api-config-updated", refreshStatus);
    };
  }, [refreshStatus]);

  async function startGoogleSignIn() {
    await signIn("google", { redirectTo: "/settings" });
  }

  async function handleSignOut() {
    setIsSigningOut(true);
    await signOut({ redirectTo: "/" });
  }

  const user = status?.user;
  const localUser = status?.localUser;
  const configured = Boolean(status?.authConfig.configured);

  return (
    <Card className="p-6">
      <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-border bg-secondary px-3 py-1 text-xs text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5 text-primary" />
            账号
          </div>
          <h2 className="text-lg font-semibold">登录与记录保存</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
            使用 Google 登录后，居住偏好、判断记录和房源记录会绑定到当前账号。先试用再登录，本机保存的报告也会自动接上。住哪儿只保存必要的账号摘要，不保存你的登录凭证。
          </p>
        </div>
        <StatusPill configured={configured} label={configured ? "Google 可用" : "Google 暂不可用"} />
      </div>

      {isLoading ? (
        <div className="rounded-md border border-border bg-secondary p-4 text-sm text-muted-foreground">
          正在读取账号状态...
        </div>
      ) : user ? (
        <div className="grid gap-4 lg:grid-cols-[1fr_0.9fr]">
          <div className="rounded-md border border-border bg-secondary p-4">
            <div className="flex items-start gap-3">
              {user.image ? (
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
                <p className="truncate text-sm font-semibold">{user.name || "Google 用户"}</p>
                <p className="mt-1 truncate text-xs text-muted-foreground">{user.email}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <StatusPill configured={user.googleEmailVerified === true} label="邮箱已验证" />
                  <StatusPill configured={Boolean(localUser)} label="记录已绑定" />
                </div>
              </div>
            </div>
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
          </div>

          <div className="rounded-md border border-border bg-secondary p-4">
            <p className="text-sm font-semibold">记录保存状态</p>
            {localUser ? (
              <>
                <p className="mt-3 text-xs leading-5 text-muted-foreground">
                  当前账号已绑定，可以保存偏好、判断记录和房源记录；本机试用期间保存的报告会自动归到这个账号下。
                </p>
                <details className="mt-3 rounded-md border border-border bg-card px-3 py-2 text-xs leading-5 text-muted-foreground">
                  <summary className="cursor-pointer font-medium">查看账号摘要</summary>
                  <div className="mt-3 grid gap-2">
                    <p>用户 ID：{localUser.id}</p>
                    <p>登录方式：{localUser.provider}</p>
                    <p>创建时间：{new Date(localUser.createdAt).toLocaleString("zh-CN")}</p>
                    <p>最近登录：{new Date(localUser.lastLoginAt).toLocaleString("zh-CN")}</p>
                  </div>
                </details>
              </>
            ) : (
              <p className="mt-3 text-xs leading-5 text-muted-foreground">
                尚未绑定账号。成功 Google 登录后，后续判断记录会归到当前账号下；本机试用期间保存的报告也会一起接上。
              </p>
            )}
          </div>
        </div>
      ) : (
        <div className="rounded-md border border-border bg-secondary p-4">
          <p className="text-sm font-semibold">尚未登录</p>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">
            {status?.reason ?? "登录后可以把居住偏好、报告和房源记录绑定到当前账号；本机试用期间保存的报告也会一起接上。"}
          </p>
          <details className="mt-3 text-xs leading-5 text-muted-foreground">
            <summary className="cursor-pointer">查看本地登录配置</summary>
            <p className="mt-1 break-all">
              Google 回调地址：{status?.authConfig.callbackUrl ?? "http://localhost:3000/api/auth/callback/google"}
            </p>
          </details>
          <Button
            type="button"
            className="mt-4"
            onClick={startGoogleSignIn}
            disabled={!configured}
          >
            使用 Google 登录
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

