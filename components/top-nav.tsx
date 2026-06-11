"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { AnimatePresence, motion } from "framer-motion";
import {
  BriefcaseBusiness,
  CircleUserRound,
  Home,
  LogOut,
  Menu,
  SlidersHorizontal,
  Sparkles,
  X,
} from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { Button } from "@/components/ui/button";
import { appNavSections, isNavItemActive, topNavItems } from "@/lib/navigation";
import { budgetPreferenceSummary, profileDefaultSummary } from "@/lib/preference-derived-defaults";
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

export function TopNav() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profile, setProfile] = useState(defaultUserPreferences);
  const [hasProfile, setHasProfile] = useState(false);
  const [authSession, setAuthSession] = useState<AuthSession | null>(null);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [currentPathWithQuery, setCurrentPathWithQuery] = useState(pathname || "/dashboard");

  useEffect(() => {
    setMobileOpen(false);
    const query = window.location.search;
    setCurrentPathWithQuery(`${pathname}${query}` || "/dashboard");
  }, [pathname]);

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
      try {
        const statusResponse = await fetch("/api/config/status", { cache: "no-store" });
        const statusData = statusResponse.ok ? await statusResponse.json() : null;

        if (!statusData?.auth?.secretConfigured) {
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
    window.addEventListener("zhunaar-api-config-updated", refreshAuthSession);

    return () => {
      mounted = false;
      window.removeEventListener("zhunaar-api-config-updated", refreshAuthSession);
    };
  }, [pathname]);

  async function handleSignOut() {
    setIsSigningOut(true);
    await signOut({ redirectTo: "/" });
  }

  const profileHref = hasProfile ? "/settings" : "/onboarding";
  const authUser = authSession?.user;
  const authLabel = authUser?.name || authUser?.email || "Google 用户";
  const authMeta = authUser?.email || "Google OAuth";
  const profileMeta = hasProfile
    ? profileDefaultSummary(profile)
    : "保存城市、工作地、预算和偏好后，后续判断会直接沿用。";
  const compactProfileTitle = hasProfile
    ? `${profile.defaultCity || "城市待设"} · ${profile.defaultWorkplace || "工作地待设"}`
    : "保存居住偏好";
  const compactProfileMeta = hasProfile
    ? `预算 ${budgetPreferenceSummary(profile)} · 通勤 ${profile.commuteLimit || "待设置"}`
    : "城市 / 工作地 / 预算 / 通勤";
  const authHref = `/auth?callbackUrl=${encodeURIComponent(currentPathWithQuery || "/dashboard")}`;

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-card/92 backdrop-blur-xl">
      <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        <BrandMark href="/" size="sm" className="text-foreground" />

        <nav className="hidden items-center gap-1 xl:flex">
          {topNavItems.map((item) => {
            const active = isNavItemActive(pathname, item);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "rounded-full px-3.5 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground",
                  active && "bg-secondary text-foreground",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href={profileHref}
            className="hidden max-w-[15rem] items-center gap-2 rounded-full border border-border bg-secondary/55 px-3 py-2 text-left transition-colors hover:border-primary/35 hover:bg-card md:flex lg:hidden"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-secondary text-primary">
              {hasProfile ? <Home className="h-4 w-4" /> : <SlidersHorizontal className="h-4 w-4" />}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-xs font-medium">{compactProfileTitle}</span>
              <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
                {compactProfileMeta}
              </span>
            </span>
          </Link>
          <Button asChild size="sm" className="hidden rounded-full sm:inline-flex">
            <Link href="/analyze">
              <Sparkles className="mr-2 h-4 w-4" />
              评估房源
            </Link>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label={mobileOpen ? "关闭导航菜单" : "打开导航菜单"}
            aria-expanded={mobileOpen}
            className="xl:hidden"
            onClick={() => setMobileOpen((open) => !open)}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
          <Button asChild variant="ghost" size="icon" aria-label="房源记录">
            <Link href="/case">
              <BriefcaseBusiness className="h-4 w-4" />
            </Link>
          </Button>
          {authUser ? (
            <div className="hidden items-center gap-2 md:flex">
              <Link
                href="/settings"
                className="flex max-w-[13.5rem] items-center gap-2 rounded-full border border-border bg-secondary/55 px-2.5 py-1.5 text-left transition-colors hover:border-primary/35 hover:bg-card"
              >
                {authUser.image ? (
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
            <Button asChild variant="ghost" size="icon" aria-label="登录">
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
                    先看城市和居住成本，再确认具体房源、签约和入住问题。
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
                href={authUser ? "/settings" : authHref}
                className="mb-5 flex gap-3 rounded-md border border-border bg-background/45 p-3 transition-colors hover:border-primary/40 hover:bg-secondary/70"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-secondary text-primary">
                  {authUser ? <CircleUserRound className="h-5 w-5" /> : <SlidersHorizontal className="h-5 w-5" />}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">
                    {authUser ? authLabel : "登录或保存居住偏好"}
                  </span>
                  <span className="mt-1 block line-clamp-2 text-xs leading-5 text-muted-foreground">
                    {authUser ? `已通过 Google 登录 · ${authMeta}` : profileMeta}
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
                        const active = isNavItemActive(pathname, item);
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
