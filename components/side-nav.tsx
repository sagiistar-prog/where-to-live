"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BriefcaseBusiness, Clock3, Home, MapPin, SlidersHorizontal, WalletCards } from "lucide-react";
import { appNavSections, isNavItemActive } from "@/lib/navigation";
import { budgetPreferenceSummary } from "@/lib/preference-derived-defaults";
import {
  defaultUserPreferences,
  hasStoredUserPreferences,
  readUserPreferences,
  userPreferencesUpdatedEvent,
} from "@/lib/user-preferences";
import { cn } from "@/lib/utils";

export function SideNav() {
  const pathname = usePathname();
  const [profile, setProfile] = useState(defaultUserPreferences);
  const [hasProfile, setHasProfile] = useState(false);

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

  const profileHref = hasProfile ? "/settings" : "/onboarding";
  const profileTitle = hasProfile ? "当前居住偏好" : "未保存居住偏好";
  const profileSubtitle = hasProfile
    ? "后续判断会直接沿用"
    : "先保存城市、工作地、预算和偏好";
  const profileFacts = [
    { label: "城市", value: profile.defaultCity || "待设置", icon: MapPin },
    { label: "工作地", value: profile.defaultWorkplace || "待设置", icon: BriefcaseBusiness },
    { label: "预算", value: budgetPreferenceSummary(profile), icon: WalletCards },
    { label: "通勤", value: profile.commuteLimit || "待设置", icon: Clock3 },
  ];

  return (
    <aside className="sticky top-16 hidden h-[calc(100vh-4rem)] w-[16.5rem] shrink-0 overflow-y-auto border-r border-border bg-[oklch(0.955_0.008_92)] px-4 py-5 lg:block">
      <Link
        href={profileHref}
        className="mb-6 block rounded-lg border border-border bg-card/78 p-4 shadow-[0_14px_38px_oklch(var(--foreground)/0.05)] transition-colors hover:border-primary/35 hover:bg-card"
      >
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-md bg-secondary text-primary shadow-sm">
            {hasProfile ? <Home className="h-5 w-5" /> : <SlidersHorizontal className="h-5 w-5" />}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{profileTitle}</p>
            <p className="truncate text-xs text-muted-foreground">{profileSubtitle}</p>
          </div>
        </div>
        {hasProfile ? (
          <div className="mt-4 grid grid-cols-2 gap-2">
            {profileFacts.map((item) => {
              const Icon = item.icon;

              return (
                <span
                  key={item.label}
                  className="flex min-w-0 items-center gap-2 rounded-md bg-secondary/70 px-2.5 py-2 shadow-sm"
                >
                  <Icon className="h-3.5 w-3.5 shrink-0 text-primary" />
                  <span className="min-w-0">
                    <span className="block text-[10px] leading-none text-muted-foreground">
                      {item.label}
                    </span>
                    <span className="mt-1 block truncate text-xs font-medium">{item.value}</span>
                  </span>
                </span>
              );
            })}
          </div>
        ) : (
          <p className="mt-3 line-clamp-2 text-xs leading-5 text-muted-foreground">
            1 分钟保存后，城市、工作地、预算和通勤上限会沿用到后续判断。
          </p>
        )}
      </Link>

      <nav className="space-y-6">
        {appNavSections.map((section) => (
          <div key={section.title}>
            <p className="mb-2 px-3 text-[11px] font-semibold text-muted-foreground/85">
              {section.title}
            </p>
            <div className="space-y-1">
              {section.items.map((item) => {
                const Icon = item.icon;
                const active = isNavItemActive(pathname, item);
                return (
                  <div key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm text-muted-foreground transition-all hover:bg-card hover:text-foreground hover:shadow-sm",
                        active && "bg-card text-foreground shadow-sm",
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span className="min-w-0 truncate">{item.label}</span>
                    </Link>
                    {active && item.subItems?.length ? (
                      <div className="ml-7 mt-1 grid gap-1 border-l border-border/70 pl-3">
                        {item.subItems.map((subItem) => {
                          const subActive = isNavItemActive(pathname, subItem);

                          return (
                            <Link
                              key={subItem.href}
                              href={subItem.href}
                              className={cn(
                                "rounded-md px-2 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-card hover:text-foreground",
                                subActive && "bg-card text-foreground shadow-sm",
                              )}
                            >
                              {subItem.label}
                            </Link>
                          );
                        })}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  );
}
