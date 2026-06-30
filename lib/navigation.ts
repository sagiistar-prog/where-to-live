import {
  BadgeDollarSign,
  Building2,
  ClipboardCheck,
  Compass,
  Gauge,
  MapPin,
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

export const appNavSections: AppNavSection[] = [
  {
    title: "主要任务",
    summary: "从当前问题进入城市、片区、房源、付款或行动判断。",
    items: [
      {
        href: "/dashboard",
        label: "工作台",
        icon: Gauge,
        description: "查看最近判断、当前行动和需要补齐的信息。",
      },
      {
        href: "/city",
        label: "生活成本",
        icon: Compass,
        description: "输入城市、收入、租金和通勤要求，判断长期承受力。",
        activePaths: ["/city", "/commute", "/life"],
      },
      {
        href: "/area",
        label: "片区初筛",
        icon: MapPin,
        description: "按工作地、预算、通勤和生活配套筛掉不合适的片区。",
        activePaths: ["/area"],
      },
      {
        href: "/city?mode=buy",
        label: "买房大致判断",
        icon: Building2,
        description: "把首付、月供、工作地、通勤和长期现金流放在一起判断。",
      },
      {
        href: "/analyze",
        label: "房源体检",
        icon: Sparkles,
        description: "对候选房源做体检，生成可回看的判断记录。",
        activePaths: ["/report", "/analyze", "/compare", "/case"],
      },
      {
        href: "/payment",
        label: "付款咨询",
        icon: BadgeDollarSign,
        description: "确认合同、付款、退款和相关法律风险。",
        activePaths: ["/payment", "/contract", "/official", "/evidence"],
      },
      {
        href: "/plan",
        label: "当前行动",
        icon: ClipboardCheck,
        description: "把当前情况转成可以直接执行的确认事项。",
        activePaths: ["/plan"],
      },
    ],
  },
  {
    title: "账户",
    summary: "管理常用信息、判断记录和方案额度。",
    items: [
      {
        href: "/pricing",
        label: "方案与额度",
        icon: BadgeDollarSign,
        description: "查看当前方案、判断额度和适合场景。",
      },
      {
        href: "/settings",
        label: "个人设置",
        icon: Settings,
        description: "维护城市、工作地、预算、偏好和账号同步。",
      },
    ],
  },
];

export function isNavItemActive(
  pathname: string,
  item: { href: string; activePaths?: string[] },
  currentHref = pathname,
) {
  if (item.href.includes("?")) {
    return currentHref === item.href || currentHref.startsWith(`${item.href}&`);
  }

  if (item.href === "/city" && currentHref.startsWith("/city?mode=buy")) {
    return false;
  }

  return (
    pathname === item.href ||
    Boolean(item.activePaths?.some((path) => pathname.startsWith(path)))
  );
}
