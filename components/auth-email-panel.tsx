"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  KeyRound,
  Loader2,
  Mail,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { getSubscriptionPlan, isSubscriptionPlanId } from "@/lib/subscription-plan";

type CaptchaState = {
  token: string;
  image: string;
};

type EmailCodeResponse = {
  ok?: boolean;
  message?: string;
  error?: string;
  autoFillCode?: string;
};

type VerifyResponse = {
  ok?: boolean;
  message?: string;
  error?: string;
  user?: {
    id?: string;
    email?: string;
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
  const [email, setEmail] = useState("");
  const [captcha, setCaptcha] = useState<CaptchaState | null>(null);
  const [captchaAnswer, setCaptchaAnswer] = useState("");
  const [emailCode, setEmailCode] = useState("");
  const [isCaptchaLoading, setIsCaptchaLoading] = useState(false);
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [codeSent, setCodeSent] = useState(false);
  const [defaultCallbackUrl, setDefaultCallbackUrl] = useState("/dashboard");
  const [destinationHint, setDestinationHint] = useState(
    "验证后进入工作台，继续处理已保存的信息。",
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
      setError("图形验证码加载失败，请刷新页面后重试。");
    } finally {
      setIsCaptchaLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCaptcha();
  }, [fetchCaptcha]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const callbackUrl =
      safeCallbackUrl(
        params.get("callbackUrl"),
        "/dashboard",
      );
    const selectedPlanId = params.get("plan");
    const selectedPlan = isSubscriptionPlanId(selectedPlanId) ? getSubscriptionPlan(selectedPlanId) : null;

    setDefaultCallbackUrl(callbackUrl);
    if (selectedPlan) {
      setDestinationHint(`验证后进入个人设置，确认 ${selectedPlan.name} 方案和额度。`);
    } else if (callbackUrl.includes("/dashboard")) {
      setDestinationHint("验证后进入工作台，继续处理城市或房源判断。");
    } else if (callbackUrl.includes("/onboarding")) {
      setDestinationHint("验证后进入常用信息设置，也可以随时返回工作台。");
    } else {
      setDestinationHint("验证后返回刚才访问的页面。");
    }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const authError = params.get("error");

    if (authError) {
      setError("登录没有完成，请使用邮箱验证码重新验证。");
    }
  }, []);

  const continueLabel = "继续";

  async function sendCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);

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
      if (typeof data.autoFillCode === "string") setEmailCode(data.autoFillCode);
      setMessage(data.message ?? "邮箱验证码已发送，请查收。");
      fetchCaptcha();
    } catch {
      setError("邮箱验证码发送失败，请稍后重试。");
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

      const verifiedEmail = data.user?.email || email.trim();
      window.localStorage.setItem("zhunaar-auth-email", verifiedEmail);
      if (data.user?.id) window.localStorage.setItem("zhunaar-auth-user-id", data.user.id);
      setMessage(data.message ?? "邮箱已验证。");
      window.setTimeout(() => router.push(defaultCallbackUrl), 520);
    } catch {
      setError("邮箱验证码校验失败，请稍后重试。");
    } finally {
      setIsVerifying(false);
    }
  }

  function resetEmailStep() {
    setCodeSent(false);
    setEmailCode("");
    setMessage(null);
    setError(null);
    fetchCaptcha();
  }

  return (
    <section className="w-full max-w-[22.25rem] min-w-0 overflow-hidden rounded-lg border border-border bg-card/92 p-4 text-foreground shadow-[0_22px_70px_oklch(var(--foreground)/0.10)] backdrop-blur-xl sm:max-w-[26rem] sm:p-5">
      <div className="mb-3 text-center">
        <div className="mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-secondary">
          <ShieldCheck className="h-5 w-5 text-primary" />
        </div>
        <p className="text-xs font-medium text-muted-foreground">登录 / 注册</p>
        <h2 className="mt-1.5 max-w-full text-xl font-semibold leading-tight tracking-normal">
          请填写您的邮箱
        </h2>
        <p className="mx-auto mt-2 max-w-md text-xs leading-5 text-muted-foreground">
          {destinationHint}
        </p>
      </div>

      <div className="mb-4 rounded-lg border border-border bg-secondary/55 p-3">
        {!codeSent ? (
          <form onSubmit={sendCode} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="register-email" className="text-foreground">
                邮箱
              </Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="register-email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value);
                    setEmailCode("");
                  }}
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
                  <RefreshCw className={cn("h-3.5 w-3.5", isCaptchaLoading && "animate-spin")} />
                  换一张
                </button>
              </div>
              <div className="grid gap-3 sm:grid-cols-[180px_1fr]">
                <div className="flex h-14 items-center justify-center rounded-md border border-border bg-card">
                  {captcha?.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={captcha.image} alt="图形验证码" className="h-[58px] max-w-full" />
                  ) : (
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  )}
                </div>
                <Input
                  id="captcha"
                  inputMode="numeric"
                  placeholder="输入结果"
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
                  正在发送邮件验证码
                </>
              ) : (
                <>
                  发送邮件验证码
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </form>
        ) : (
          <form onSubmit={verifyCode} className="space-y-4">
            <div className="rounded-md border border-border bg-card p-3 text-xs leading-5 text-muted-foreground">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <span className="min-w-0 [overflow-wrap:anywhere]">
                  验证码已发送到 <strong className="font-semibold text-foreground">{email}</strong>
                </span>
                <button
                  type="button"
                  onClick={resetEmailStep}
                  className="shrink-0 text-left font-medium text-primary hover:text-primary/80"
                >
                  更换邮箱
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email-code" className="text-foreground">
                邮件验证码
              </Label>
              <div className="relative">
                <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email-code"
                  inputMode="numeric"
                  maxLength={6}
                  autoComplete="one-time-code"
                  placeholder="输入 6 位验证码"
                  value={emailCode}
                  onChange={(event) => setEmailCode(event.target.value)}
                  className={cn("pl-10", fieldClassName)}
                />
              </div>
            </div>
            <Button
              type="submit"
              size="lg"
              disabled={isVerifying}
              className="w-full rounded-md bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {isVerifying ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  正在验证
                </>
              ) : (
                <>
                  {continueLabel}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </form>
        )}
      </div>

      <div aria-live="polite" className="mt-3 space-y-2">
        {message ? (
          <div className="flex gap-2 rounded-md border border-emerald-300/30 bg-emerald-300/10 p-3 text-xs leading-5 text-emerald-700">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{message}</span>
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
