import {
  BookOpenCheck,
  ClipboardCheck,
  Compass,
  Gauge,
  Settings,
  Sparkles,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type AppNavSubItem = {
  href: string;
  label: string;
  activePaths?: string[];
};

export type AppNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  description: string;
  activePaths?: string[];
  subItems?: AppNavSubItem[];
};

export type AppNavSection = {
  title: string;
  summary: string;
  items: AppNavItem[];
};

export type TopNavItem = {
  href: string;
  label: string;
  activePaths?: string[];
};

export const appNavSections: AppNavSection[] = [
  {
    title: "主要入口",
    summary: "按真实居住选择顺序走：先看城市和片区，再看具体房源，最后确认签约与入住。",
    items: [
      {
        href: "/dashboard",
        label: "工作台",
        icon: Gauge,
        description: "查看今天最该先确认的居住选择和下一步。",
      },
      {
        href: "/city",
        label: "城市成本",
        icon: Compass,
        description: "把城市成本、片区通勤和日常生活放在一起判断。",
        activePaths: ["/city", "/area", "/commute", "/life", "/buy"],
        subItems: [
          { href: "/city", label: "城市成本" },
          { href: "/area", label: "片区与通勤", activePaths: ["/area", "/commute", "/life"] },
          { href: "/buy", label: "长期预算" },
        ],
      },
      {
        href: "/analyze",
        label: "房源评估",
        icon: Sparkles,
        description: "评估候选房源，对比多套选择，并保存成房源记录。",
        activePaths: ["/report", "/analyze", "/compare", "/case", "/plan"],
        subItems: [
          { href: "/analyze", label: "评估房源", activePaths: ["/report"] },
          { href: "/compare", label: "多房源对比" },
          { href: "/case", label: "房源记录" },
          { href: "/plan", label: "下一步" },
        ],
      },
      {
        href: "/visit",
        label: "签约与入住",
        icon: ClipboardCheck,
        description: "把看房、安全、材料、付款、合同、入住和退租放在一个阶段确认。",
        activePaths: [
          "/visit",
          "/safety",
          "/shared",
          "/official",
          "/evidence",
          "/payment",
          "/contract",
          "/move",
          "/handover",
          "/repair",
          "/renewal",
          "/deposit",
        ],
        subItems: [
          { href: "/visit", label: "看房与安全", activePaths: ["/visit", "/safety", "/shared"] },
          { href: "/payment", label: "付款与材料", activePaths: ["/payment", "/official", "/evidence"] },
          { href: "/contract", label: "合同确认" },
          { href: "/move", label: "入住退租", activePaths: ["/move", "/handover", "/repair", "/renewal", "/deposit"] },
        ],
      },
    ],
  },
  {
    title: "资料与设置",
    summary: "需要查规则、改偏好或检查服务状态时再进入。",
    items: [
      {
        href: "/knowledge",
        label: "知识库",
        icon: BookOpenCheck,
        description: "按你当前遇到的问题找对应清单。",
      },
      {
        href: "/settings",
        label: "个人设置",
        icon: Settings,
        description: "维护常用城市、工作地、预算、偏好和服务状态。",
      },
    ],
  },
];

export const topNavItems: TopNavItem[] = [
  { href: "/dashboard", label: "工作台" },
  { href: "/city", label: "城市成本", activePaths: ["/city", "/area", "/commute", "/life", "/buy"] },
  { href: "/analyze", label: "房源评估", activePaths: ["/report", "/analyze", "/compare", "/case", "/plan"] },
  {
    href: "/visit",
    label: "签约与入住",
    activePaths: [
      "/visit",
      "/safety",
      "/shared",
      "/official",
      "/evidence",
      "/payment",
      "/contract",
      "/move",
      "/handover",
      "/repair",
      "/renewal",
      "/deposit",
    ],
  },
  { href: "/knowledge", label: "知识库" },
];

export function isNavItemActive(
  pathname: string,
  item: { href: string; activePaths?: string[] },
) {
  return (
    pathname === item.href ||
    Boolean(item.activePaths?.some((path) => pathname.startsWith(path)))
  );
}
