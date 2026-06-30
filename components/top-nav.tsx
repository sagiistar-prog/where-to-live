"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { signOut } from "next-auth/react";
import { AnimatePresence, motion } from "framer-motion";
import {
  BriefcaseBusiness,
  CircleUserRound,
  LogOut,
  Menu,
  Sparkles,
  X,
} from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { Button } from "@/components/ui/button";
import { appNavSections, isNavItemActive } from "@/lib/navigation";
import { profileDefaultSummary } from "@/lib/preference-derived-defaults";
import {
  defaultUserPreferences,
  hasStoredUserPreferences,
  readUserPreferences,
  userPreferencesUpdatedEvent,
} from "@/lib/user-preferences";
import { cn } from "@/lib/utils";

type AuthSession = {
  user?: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
    provider?: string | null;
  };
};

type LocalAuth = {
  email: string;
  id?: string;
};

export function TopNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profile, setProfile] = useState(defaultUserPreferences);
  const [hasProfile, setHasProfile] = useState(false);
  const [authSession, setAuthSession] = useState<AuthSession | null>(null);
  const [localAuth, setLocalAuth] = useState<LocalAuth | null>(null);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [currentPathWithQuery, setCurrentPathWithQuery] = useState(pathname || "/dashboard");

  useEffect(() => {
    setMobileOpen(false);
    const query = searchParams.toString();
    setCurrentPathWithQuery(`${pathname}${query ? `?${query}` : ""}` || "/dashboard");
  }, [pathname, searchParams]);

  useEffect(() => {
    if (!mobileOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [mobileOpen]);

  useEffect(() => {
    function refreshProfile() {
      setProfile(readUserPreferences());
      setHasProfile(hasStoredUserPreferences());
    }

    refreshProfile();
    window.addEventListener(userPreferencesUpdatedEvent, refreshProfile);
    window.addEventListener("storage", refreshProfile);
    window.addEventListener("focus", refreshProfile);

    return () => {
      window.removeEventListener(userPreferencesUpdatedEvent, refreshProfile);
      window.removeEventListener("storage", refreshProfile);
      window.removeEventListener("focus", refreshProfile);
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    async function refreshAuthSession() {
      const localEmail = window.localStorage.getItem("zhunaar-auth-email")?.trim() || "";
      const localUserId = window.localStorage.getItem("zhunaar-auth-user-id")?.trim() || "";
      if (mounted) {
        setLocalAuth(localEmail ? { email: localEmail, id: localUserId || undefined } : null);
      }

      try {
        const statusResponse = await fetch("/api/config/status", { cache: "no-store" });
        const statusData = statusResponse.ok ? await statusResponse.json() : null;

        if (!statusData?.auth?.sessionAvailable) {
          if (mounted) setAuthSession(null);
          return;
        }

        const sessionResponse = await fetch("/api/auth/session", { cache: "no-store" });
        const sessionData = sessionResponse.ok ? await sessionResponse.json() : null;

        if (mounted) {
          setAuthSession(sessionData?.user ? sessionData : null);
        }
      } catch {
        if (mounted) setAuthSession(null);
      }
    }

    refreshAuthSession();
    window.addEventListener("storage", refreshAuthSession);
    window.addEventListener("focus", refreshAuthSession);

    return () => {
      mounted = false;
      window.removeEventListener("storage", refreshAuthSession);
      window.removeEventListener("focus", refreshAuthSession);
    };
  }, [pathname]);

  async function handleSignOut() {
    setIsSigningOut(true);
    if (authSession?.user) {
      await signOut({ redirectTo: "/" });
      return;
    }

    window.localStorage.removeItem("zhunaar-auth-email");
    window.localStorage.removeItem("zhunaar-auth-user-id");
    await fetch("/api/auth/local-session", { method: "DELETE" }).catch(() => null);
    setLocalAuth(null);
    setIsSigningOut(false);
  }

  const authUser = authSession?.user;
  const hasAccount = Boolean(authUser || localAuth);
  const authLabel = authUser?.name || authUser?.email || localAuth?.email || "邮箱账号";
  const authMeta = authUser?.email || (localAuth ? "邮箱已验证" : "");
  const profileMeta = hasProfile
    ? profileDefaultSummary(profile)
    : "保存常用城市、工作地、预算和通勤，后续判断会自动带入。";
  const authHref = `/auth?callbackUrl=${encodeURIComponent(currentPathWithQuery || "/dashboard")}`;

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-card/92 backdrop-blur-xl">
      <div className="relative flex h-16 min-w-0 items-center justify-between px-4 sm:px-6 lg:px-8">
        <BrandMark href="/" size="sm" className="text-foreground" />

        <div className="flex min-w-0 shrink-0 items-center gap-1 sm:gap-2">
          <Button asChild size="sm" className="hidden rounded-full sm:inline-flex">
            <Link href="/dashboard">
              <Sparkles className="mr-2 h-4 w-4" />
              开始判断
            </Link>
          </Button>
          <button
            type="button"
            aria-label={mobileOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={mobileOpen}
            className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-border bg-card/88 text-muted-foreground shadow-[0_12px_32px_oklch(var(--foreground)/0.08)] backdrop-blur-xl transition hover:bg-secondary hover:text-foreground xl:hidden"
            onClick={() => setMobileOpen((open) => !open)}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          <Button asChild variant="ghost" size="icon" aria-label="房源记录" className="hidden sm:inline-flex">
            <Link href="/case">
              <BriefcaseBusiness className="h-4 w-4" />
            </Link>
          </Button>
          {hasAccount ? (
            <div className="hidden items-center gap-2 md:flex">
              <Link
                href="/settings"
                className="flex max-w-[13.5rem] items-center gap-2 rounded-full border border-border bg-secondary/55 px-2.5 py-1.5 text-left transition-colors hover:border-primary/35 hover:bg-card"
              >
                {authUser?.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={authUser.image}
                    alt=""
                    className="h-7 w-7 shrink-0 rounded-full border border-border"
                  />
                ) : (
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-secondary text-primary">
                    <CircleUserRound className="h-4 w-4" />
                  </span>
                )}
                <span className="min-w-0">
                  <span className="block truncate text-xs font-medium">{authLabel}</span>
                  <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
                    {authMeta}
                  </span>
                </span>
              </Link>
              <Button
                variant="ghost"
                size="icon"
                aria-label="退出登录"
                disabled={isSigningOut}
                onClick={handleSignOut}
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <Button asChild variant="ghost" size="icon" aria-label="登录" className="hidden sm:inline-flex">
              <Link href={authHref}>
                <CircleUserRound className="h-5 w-5" />
              </Link>
            </Button>
          )}
        </div>
      </div>

      <AnimatePresence>
        {mobileOpen ? (
          <>
            <motion.button
              type="button"
              aria-label="关闭导航菜单背景"
              className="fixed inset-x-0 top-16 z-30 h-[calc(100dvh-4rem)] bg-background/70 backdrop-blur-xl xl:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              onClick={() => setMobileOpen(false)}
            />
            <motion.nav
              aria-label="移动端主导航"
              className="fixed inset-x-3 top-20 z-40 max-h-[calc(100dvh-5.25rem)] overflow-y-auto rounded-lg border border-border bg-card/96 p-4 shadow-[0_24px_80px_oklch(var(--foreground)/0.12)] xl:hidden"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
            >
              <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-medium text-primary/80">
                    主要入口
                  </p>
                  <h2 className="mt-2 text-lg font-semibold">按当前问题进入</h2>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    生活成本、具体房源、付款咨询和当前行动都可以从这里进入。
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="关闭导航菜单"
                  onClick={() => setMobileOpen(false)}
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>

              <Link
                href={hasAccount ? "/settings" : authHref}
                className="mb-5 flex gap-3 rounded-md border border-border bg-background/45 p-3 transition-colors hover:border-primary/40 hover:bg-secondary/70"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-secondary text-primary">
                  <CircleUserRound className="h-5 w-5" />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">
                    {hasAccount ? authLabel : "登录或保存信息"}
                  </span>
                  <span className="mt-1 block line-clamp-2 text-xs leading-5 text-muted-foreground">
                    {hasAccount ? `账号已验证 · ${authMeta}` : profileMeta}
                  </span>
                </span>
              </Link>

              <div className="space-y-5">
                {appNavSections.map((section) => (
                  <section key={section.title}>
                    <div className="mb-2">
                      <h3 className="text-sm font-semibold">{section.title}</h3>
                      <p className="mt-1 text-xs leading-5 text-muted-foreground">
                        {section.summary}
                      </p>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {section.items.map((item) => {
                        const Icon = item.icon;
                        const active = isNavItemActive(pathname, item, currentPathWithQuery);
                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                              "flex min-h-[4.75rem] gap-3 rounded-md border border-border bg-background/45 p-3 transition-colors hover:border-primary/40 hover:bg-secondary/70",
                              active && "border-primary/50 bg-primary/10 text-foreground",
                            )}
                          >
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-secondary text-primary">
                              <Icon className="h-4 w-4" />
                            </span>
                            <span className="min-w-0">
                              <span className="block text-sm font-medium">{item.label}</span>
                              <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                                {item.description}
                              </span>
                              {item.subItems?.length ? (
                                <span className="mt-2 flex flex-wrap gap-1.5">
                                  {item.subItems.map((subItem) => (
                                    <span
                                      key={subItem.href}
                                      className="rounded-full border border-border bg-background/40 px-2 py-0.5 text-[11px] text-muted-foreground"
                                    >
                                      {subItem.label}
                                    </span>
                                  ))}
                                </span>
                              ) : null}
                            </span>
                          </Link>
                        );
                      })}
                    </div>
                  </section>
                ))}
              </div>
            </motion.nav>
          </>
        ) : null}
      </AnimatePresence>
    </header>
  );
}
