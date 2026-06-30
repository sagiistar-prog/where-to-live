import Link from "next/link";
import {
  ArrowRight,
  BadgeDollarSign,
  Building2,
  Compass,
  Home,
  MapPin,
  type LucideIcon,
} from "lucide-react";

const nextActions: Array<{
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
}> = [
  {
    title: "生活成本",
    description: "带入城市、收入、预算和通勤要求，判断长期承受力。",
    href: "/city?from=settings",
    icon: Compass,
  },
  {
    title: "房源体检",
    description: "带入预算和偏好，评估正在看的具体房源。",
    href: "/analyze?from=settings",
    icon: Home,
  },
  {
    title: "片区初筛",
    description: "带入工作地、预算和通勤要求，先排除不适合长期居住的片区。",
    href: "/area?from=settings",
    icon: MapPin,
  },
  {
    title: "付款咨询",
    description: "确认合同、收款主体、退款条件和其他法律风险。",
    href: "/payment?from=settings",
    icon: BadgeDollarSign,
  },
  {
    title: "买房大致判断",
    description: "估算首付、月供、通勤和长期现金流压力。",
    href: "/city?mode=buy&from=settings",
    icon: Building2,
  },
];

export function SettingsNextActions() {
  return (
    <section className="rounded-lg border border-border bg-card p-5 shadow-[0_18px_54px_oklch(var(--foreground)/0.05)] sm:p-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm text-primary">保存后继续</p>
          <h2 className="mt-2 text-xl font-semibold tracking-normal">
            用常用信息开始一次判断
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
            城市、工作地、预算和偏好会在后续页面优先带入，减少重复填写。
          </p>
        </div>
        <Link
          href="/dashboard"
          className="inline-flex min-h-10 w-full items-center justify-center rounded-full border border-border bg-secondary px-4 text-sm font-medium text-foreground transition hover:border-primary/35 hover:bg-card sm:w-auto"
        >
          回到工作台
          <ArrowRight className="ml-2 h-4 w-4" />
        </Link>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        {nextActions.map((item) => {
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className="group min-w-0 rounded-md border border-border bg-secondary/55 p-4 transition-colors hover:border-primary/35 hover:bg-card"
            >
              <div className="flex items-start justify-between gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/15 text-primary">
                  <Icon className="h-5 w-5" />
                </span>
                <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
              </div>
              <h3 className="mt-4 text-sm font-semibold">{item.title}</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {item.description}
              </p>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
