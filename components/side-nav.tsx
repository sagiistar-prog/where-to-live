"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { appNavSections, isNavItemActive } from "@/lib/navigation";
import { cn } from "@/lib/utils";

export function SideNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const query = searchParams.toString();
  const currentHref = query ? `${pathname}?${query}` : pathname;

  return (
    <aside className="sticky top-16 hidden h-[calc(100vh-4rem)] w-[16.5rem] shrink-0 overflow-y-auto border-r border-border bg-[oklch(0.958_0.006_155)] px-4 py-5 lg:block">
      <nav className="space-y-6">
        {appNavSections.map((section) => (
          <div key={section.title}>
            <p className="mb-2 px-3 text-[11px] font-semibold text-muted-foreground/85">
              {section.title}
            </p>
            <div className="space-y-1">
              {section.items.map((item) => {
                const Icon = item.icon;
                const active = isNavItemActive(pathname, item, currentHref);
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
                          const subActive = isNavItemActive(pathname, subItem, currentHref);

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
