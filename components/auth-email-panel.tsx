"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  KeyRound,
  Loader2,
  Mail,
  RefreshCw,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { hasStoredUserPreferences, readOnboardingComplete } from "@/lib/user-preferences";

type AuthMode = "register" | "login";

type CaptchaState = {
  token: string;
  image: string;
};

type EmailCodeResponse = {
  ok?: boolean;
  mode?: "resend" | "local";
  message?: string;
  error?: string;
  debugCode?: string;
};

type VerifyResponse = {
  ok?: boolean;
  message?: string;
  error?: string;
};

type AuthConfigStatus = {
  auth?: {
    configured?: boolean;
    googleIdConfigured?: boolean;
    googleSecretConfigured?: boolean;
    callbackUrl?: string;
  };
};

const fieldClassName =
  "border-border bg-card text-foreground placeholder:text-muted-foreground focus-visible:ring-primary/35";

function safeCallbackUrl(value: string | null | undefined, fallback: string) {
  if (!value) return fallback;
  if (!value.startsWith("/") || value.startsWith("//")) return fallback;
  return value;
}

export function AuthEmailPanel() {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>("register");
  const [email, setEmail] = useState("");
  const [loginEmail, setLoginEmail] = useState("");
  const [captcha, setCaptcha] = useState<CaptchaState | null>(null);
  const [captchaAnswer, setCaptchaAnswer] = useState("");
  const [emailCode, setEmailCode] = useState("");
  const [isCaptchaLoading, setIsCaptchaLoading] = useState(false);
  const [isGoogleSigningIn, setIsGoogleSigningIn] = useState(false);
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [debugCode, setDebugCode] = useState<string | null>(null);
  const [codeSent, setCodeSent] = useState(false);
  const [showEmailFallback, setShowEmailFallback] = useState(false);
  const [authConfigStatus, setAuthConfigStatus] = useState<AuthConfigStatus | null>(null);
  const [defaultCallbackUrl, setDefaultCallbackUrl] = useState("/onboarding");
  const [destinationHint, setDestinationHint] = useState(
    "首次登录后先保存城市、工作地、预算和通勤上限。",
  );

  const fetchCaptcha = useCallback(async () => {
    setIsCaptchaLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/captcha", { cache: "no-store" });
      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.token || !data?.image) {
        setError("图形验证码加载失败，请刷新页面后重试。");
        return;
      }

      setCaptcha({
        token: String(data.token),
        image: String(data.image),
      });
      setCaptchaAnswer("");
    } catch {
      setError("图形验证码加载失败，请确认当前服务正常运行。");
    } finally {
      setIsCaptchaLoading(false);
    }
  }, []);

  useEffect(() => {
    if (showEmailFallback) fetchCaptcha();
  }, [fetchCaptcha, showEmailFallback]);

  useEffect(() => {
    let mounted = true;

    async function loadAuthStatus() {
      try {
        const response = await fetch("/api/config/status", { cache: "no-store" });
        const data = (await response.json().catch(() => null)) as AuthConfigStatus | null;
        if (mounted) setAuthConfigStatus(data);
      } catch {
        if (mounted) setAuthConfigStatus(null);
      }
    }

    loadAuthStatus();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const callbackUrl =
      safeCallbackUrl(
        params.get("callbackUrl"),
        readOnboardingComplete() || hasStoredUserPreferences() ? "/dashboard" : "/onboarding",
      );

    setDefaultCallbackUrl(callbackUrl);
    if (callbackUrl.includes("/dashboard")) {
      setDestinationHint("登录成功后进入工作台，继续上次的城市或房源判断。");
    } else if (callbackUrl.includes("/onboarding")) {
      setDestinationHint("首次登录后先保存城市、工作地、预算和通勤上限。");
    } else {
      setDestinationHint("登录成功后会回到刚才正在看的内容。");
    }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const authError = params.get("error");

    if (authError === "google_email_unverified") {
      setError("Google 账号邮箱尚未验证。请先在 Google 账号中完成邮箱验证，再回到这里登录。");
    } else if (authError === "google_email_missing") {
      setError("Google 未返回邮箱地址，无法创建住哪儿账号。请换一个 Google 账号重试。");
    } else if (authError === "OAuthAccountNotLinked") {
      setError("这个邮箱已经绑定过其他登录方式。请先用原方式登录，后续再绑定 Google。");
    } else if (authError) {
      setError("Google 登录没有完成，请重新尝试。");
    }
  }, []);

  async function startGoogleSignIn() {
    setIsGoogleSigningIn(true);
    setError(null);
    setMessage(null);

    const params = new URLSearchParams(window.location.search);
    const callbackUrl = safeCallbackUrl(params.get("callbackUrl"), defaultCallbackUrl);

    try {
      await signIn("google", { redirectTo: callbackUrl });
    } catch {
      setIsGoogleSigningIn(false);
      setError("无法打开 Google 登录，请确认当前服务和 Google 登录设置正常。");
    }
  }

  const googleReady =
    authConfigStatus?.auth?.configured &&
    authConfigStatus.auth.googleIdConfigured &&
    authConfigStatus.auth.googleSecretConfigured;
  const emailContinueLabel = defaultCallbackUrl.includes("/dashboard")
    ? "验证并进入工作台"
    : defaultCallbackUrl.includes("/onboarding")
      ? "验证并保存常用信息"
      : "验证并继续";
  const localContinueLabel = defaultCallbackUrl.includes("/dashboard")
    ? "进入工作台"
    : "继续";

  useEffect(() => {
    if (authConfigStatus && !googleReady) {
      setShowEmailFallback(true);
    }
  }, [authConfigStatus, googleReady]);

  async function sendCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setDebugCode(null);

    if (!captcha) {
      setError("请先刷新图形验证码。");
      return;
    }

    setIsSendingCode(true);

    try {
      const response = await fetch("/api/auth/email-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          captchaToken: captcha.token,
          captchaAnswer,
        }),
      });
      const data = (await response.json().catch(() => null)) as EmailCodeResponse | null;

      if (!response.ok || !data?.ok) {
        setError(data?.error ?? "邮箱验证码发送失败，请稍后再试。");
        fetchCaptcha();
        return;
      }

      setCodeSent(true);
      setMessage(data.message ?? "邮箱验证码已发送，请查收。");
      setDebugCode(data.mode === "local" && data.debugCode ? data.debugCode : null);
      fetchCaptcha();
    } catch {
      setError("邮箱验证码发送失败，请确认当前服务正常运行。");
    } finally {
      setIsSendingCode(false);
    }
  }

  async function verifyCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setIsVerifying(true);

    try {
      const response = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code: emailCode }),
      });
      const data = (await response.json().catch(() => null)) as VerifyResponse | null;

      if (!response.ok || !data?.ok) {
        setError(data?.error ?? "邮箱验证码校验失败，请重新输入。");
        return;
      }

      window.localStorage.setItem("zhunaar-auth-email", email.trim());
      setMessage(data.message ?? "邮箱已验证。");
      window.setTimeout(() => router.push(defaultCallbackUrl), 520);
    } catch {
      setError("邮箱验证码校验失败，请确认当前服务正常运行。");
    } finally {
      setIsVerifying(false);
    }
  }

  function handleLocalLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = loginEmail.trim();
    if (value) window.localStorage.setItem("zhunaar-auth-email", value);
    router.push(defaultCallbackUrl);
  }

  return (
    <section className="w-full max-w-[26rem] min-w-0 overflow-hidden rounded-lg border border-border bg-card/92 p-4 text-foreground shadow-[0_22px_70px_oklch(var(--foreground)/0.10)] backdrop-blur-xl sm:p-5">
      <div className="mb-4 text-center">
        <div className="mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-secondary">
          <ShieldCheck className="h-5 w-5 text-primary" />
        </div>
        <p className="text-xs font-medium text-muted-foreground">
          Google 优先登录
        </p>
        <h2 className="mt-1.5 max-w-full text-xl font-semibold leading-tight tracking-normal">
          继续使用住哪儿
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-5 text-muted-foreground">
          保存城市、预算、候选房源和签约前确认。
        </p>
      </div>

      <div className="mb-4 space-y-2.5 rounded-lg border border-border bg-secondary/55 p-3">
        <div className="flex flex-wrap items-center justify-between gap-2 px-1">
          <span className="inline-flex items-center gap-2 text-xs font-medium text-primary">
            <Sparkles className="h-3.5 w-3.5" />
            推荐使用 Google
          </span>
          <span
            className={cn(
              "rounded-full border px-2 py-0.5 text-[11px]",
              googleReady
                ? "border-emerald-300/30 bg-emerald-300/10 text-emerald-700"
                : "border-amber-300/30 bg-amber-300/10 text-amber-700",
            )}
          >
            {authConfigStatus ? (googleReady ? "可以使用" : "暂不可用") : "正在确认"}
          </span>
        </div>
        <Button
          type="button"
          size="lg"
          onClick={startGoogleSignIn}
          disabled={isGoogleSigningIn || (authConfigStatus !== null && !googleReady)}
          className="h-11 w-full rounded-md border border-primary/20 bg-primary text-primary-foreground shadow-sm hover:bg-primary/90"
        >
          {isGoogleSigningIn ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <GoogleMark className="mr-2 h-4 w-4" />
          )}
          使用 Google 继续
        </Button>
        <Button
          asChild
          variant="ghost"
          className="h-9 w-full rounded-md text-primary hover:bg-primary/10 hover:text-primary"
        >
          <Link href="/demo">先看完整演示</Link>
        </Button>
        <div className="rounded-md bg-card/72 px-3 py-1.5 text-xs leading-5 text-muted-foreground">
          Google 登录会创建或读取你的账号；新用户先保存常用信息，老用户回到工作台继续看。
        </div>
        <div className="grid gap-1 rounded-md border border-border bg-card/72 px-3 py-1.5 text-xs leading-5">
          <span className="font-semibold text-foreground">登录后去向</span>
          <span className="text-muted-foreground">{destinationHint}</span>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-secondary/55 p-3">
        <button
          type="button"
          aria-expanded={showEmailFallback}
          onClick={() => {
            setShowEmailFallback((current) => !current);
            setError(null);
            setMessage(null);
          }}
          className="flex w-full items-center justify-between gap-3 rounded-md px-1 py-1.5 text-left transition hover:bg-card"
        >
          <span className="flex min-w-0 items-center gap-2">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-card text-primary">
              <Mail className="h-4 w-4" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-foreground">
                使用邮箱验证码
              </span>
              <span className="mt-0.5 block text-xs leading-5 text-muted-foreground">
                备用入口，无法使用 Google 时再用。
              </span>
            </span>
          </span>
          <span className="shrink-0 rounded-full border border-border px-2 py-1 text-xs font-medium text-muted-foreground">
            {showEmailFallback ? "收起" : "展开"}
          </span>
        </button>

        {showEmailFallback ? (
          <div className="mt-4">
            <div className="mb-4 grid grid-cols-2 rounded-lg border border-border bg-muted p-1">
              {(["register", "login"] as const).map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => {
              setMode(item);
              setError(null);
              setMessage(null);
            }}
            className={cn(
              "h-10 rounded-md text-sm font-medium transition",
              mode === item
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-card",
            )}
          >
            {item === "register" ? "邮箱验证" : "邮箱进入"}
          </button>
              ))}
            </div>

            {mode === "register" ? (
              <div className="space-y-5">
                <form onSubmit={sendCode} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="register-email" className="text-foreground">
                      电子邮件
                    </Label>
                    <div className="relative">
                      <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="register-email"
                        type="email"
                        autoComplete="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        className={cn("pl-10", fieldClassName)}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <Label htmlFor="captcha" className="text-foreground">
                        图形验证码
                      </Label>
                      <button
                        type="button"
                        onClick={fetchCaptcha}
                        className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80"
                      >
                        <RefreshCw
                          className={cn("h-3.5 w-3.5", isCaptchaLoading && "animate-spin")}
                        />
                        换一张
                      </button>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-[180px_1fr]">
                      <div className="flex h-14 items-center justify-center rounded-md border border-border bg-card">
                        {captcha?.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={captcha.image} alt="图形验证码" className="h-[58px] w-[180px]" />
                        ) : (
                          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                        )}
                      </div>
                      <Input
                        id="captcha"
                        inputMode="numeric"
                        placeholder="输入计算结果"
                        value={captchaAnswer}
                        onChange={(event) => setCaptchaAnswer(event.target.value)}
                        className={fieldClassName}
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    size="lg"
                    disabled={isSendingCode}
                    className="w-full rounded-md bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    {isSendingCode ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        正在发送验证码
                      </>
                    ) : (
                      <>
                        发送邮箱验证码
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>
                </form>

                <form onSubmit={verifyCode} className="space-y-4 border-t border-border pt-5">
                  <div className="space-y-2">
                    <Label htmlFor="email-code" className="text-foreground">
                      邮箱验证码
                    </Label>
                    <div className="relative">
                      <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="email-code"
                        inputMode="numeric"
                        maxLength={6}
                        placeholder={codeSent ? "输入 6 位验证码" : "先发送验证码"}
                        value={emailCode}
                        onChange={(event) => setEmailCode(event.target.value)}
                        className={cn("pl-10", fieldClassName)}
                      />
                    </div>
                  </div>
                  <Button
                    type="submit"
                    size="lg"
                    disabled={!codeSent || isVerifying}
                    className="w-full rounded-md bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    {isVerifying ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        正在验证
                      </>
                    ) : (
                      <>
                        {emailContinueLabel}
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>
                </form>
              </div>
            ) : (
              <form onSubmit={handleLocalLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email" className="text-foreground">
                    电子邮件
                  </Label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="login-email"
                      type="email"
                      autoComplete="email"
                      placeholder="you@example.com"
                      value={loginEmail}
                      onChange={(event) => setLoginEmail(event.target.value)}
                      className={cn("pl-10", fieldClassName)}
                    />
                  </div>
                </div>
                <Button
                  type="submit"
                  size="lg"
                  className="w-full rounded-md bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  {localContinueLabel}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <p className="text-center text-xs leading-5 text-muted-foreground">
                  这个入口用于当前设备继续体验；正式账号建议使用上方 Google 登录。
                </p>
              </form>
            )}
          </div>
        ) : null}
      </div>

      <div aria-live="polite" className="mt-5 space-y-2">
        {message ? (
          <div className="flex gap-2 rounded-md border border-emerald-300/30 bg-emerald-300/10 p-3 text-xs leading-5 text-emerald-700">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{message}</span>
          </div>
        ) : null}
        {debugCode ? (
          <div className="rounded-md border border-amber-300/30 bg-amber-300/10 p-3 text-xs leading-5 text-amber-700">
            当前设备验证码：<span className="font-semibold">{debugCode}</span>
          </div>
        ) : null}
        {error ? (
          <div className="flex gap-2 rounded-md border border-rose-300/30 bg-rose-300/10 p-3 text-xs leading-5 text-rose-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function GoogleMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.84z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06L5.84 9.9C6.71 7.3 9.14 5.38 12 5.38z"
      />
    </svg>
  );
}

