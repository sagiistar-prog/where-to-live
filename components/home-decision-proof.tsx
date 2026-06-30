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
import { Button } from "@/components/ui/button";

type ProofItem = {
  icon: LucideIcon;
  label: string;
  title: string;
  description: string;
  input: string;
  output: string;
  href: string;
  cta: string;
};

const proofItems: ProofItem[] = [
  {
    icon: Compass,
    label: "换城市前",
    title: "生活成本",
    description: "评估收入、租金、通勤和储蓄空间是否支持长期居住。",
    input: "城市、税后收入、租金上限、通勤要求",
    output: "月度压力、储蓄空间、可继续看的城市和片区",
    href: "/city",
    cta: "查看生活成本",
  },
  {
    icon: Home,
    label: "租房前",
    title: "房源体检",
    description: "判断候选房源是否值得继续看、继续谈或直接排除。",
    input: "位置、月租、工作地、房源顾虑",
    output: "是否继续、主要风险、需要确认的事项",
    href: "/analyze",
    cta: "房源体检",
  },
  {
    icon: MapPin,
    label: "选片区前",
    title: "片区初筛",
    description: "根据工作地、预算、通勤和生活配套，先排除不适合长期居住的片区。",
    input: "工作地、预算、通勤上限、候选片区",
    output: "优先片区、备选片区、暂缓片区",
    href: "/area",
    cta: "片区初筛",
  },
  {
    icon: Building2,
    label: "买房前",
    title: "买房大致判断",
    description: "先看首付、月供、通勤和现金流是否在承受范围内。",
    input: "城市、首付、月供上限、工作地",
    output: "长期压力、预算边界、是否进入片区比较",
    href: "/city?mode=buy",
    cta: "买房大致判断",
  },
  {
    icon: BadgeDollarSign,
    label: "付款前",
    title: "付款咨询",
    description: "确认合同、收款主体、退款条件和其他法律风险。",
    input: "合同风险、收款主体、退款条件、催付情况",
    output: "可付款条件、暂停原因、需要补充的确认材料",
    href: "/payment",
    cta: "付款咨询",
  },
];

export function HomeDecisionProof() {
  return (
    <section className="border-t border-border bg-[oklch(0.965_0.006_155)] px-4 pb-10 pt-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-sm font-medium text-primary">真实决策场景</p>
            <h2 className="mt-1 text-3xl font-semibold leading-tight tracking-normal sm:text-4xl">
              每次只处理一个关键判断
            </h2>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">
              选择当前阶段，只填写必要信息，直接得到继续、暂停或补充确认的建议。
            </p>
          </div>
          <Button asChild variant="secondary" className="w-full rounded-full sm:w-auto">
            <Link href="/dashboard">
              进入工作台
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>

        <div className="mt-9 grid gap-px overflow-hidden rounded-lg border border-border bg-border md:grid-cols-2 xl:grid-cols-5">
          {proofItems.map((item) => {
            const Icon = item.icon;
            return (
              <article key={item.title} className="bg-card p-5 sm:p-6">
                <div className="mb-5 flex items-center justify-between gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/12 text-primary">
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="rounded-full border border-border bg-secondary/60 px-2.5 py-1 text-xs text-muted-foreground">
                    {item.label}
                  </span>
                </div>
                <h3 className="text-lg font-semibold leading-7">{item.title}</h3>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  {item.description}
                </p>
                <div className="mt-5 space-y-3 rounded-md border border-border bg-secondary/45 p-3 text-sm">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">需要输入</p>
                    <p className="mt-1 leading-6 text-foreground">{item.input}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">得到结果</p>
                    <p className="mt-1 leading-6 text-foreground">{item.output}</p>
                  </div>
                </div>
                <Link
                  href={item.href}
                  className="mt-5 inline-flex items-center text-sm font-medium text-primary underline-offset-4 hover:underline"
                >
                  {item.cta}
                  <ArrowRight className="ml-1.5 h-4 w-4" />
                </Link>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
