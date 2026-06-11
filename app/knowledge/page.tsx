import Link from "next/link";
import { ArrowRight, ClipboardCheck, ExternalLink, FileCheck2, ShieldAlert } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { KnowledgeCard } from "@/components/knowledge-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { knowledgeItems, knowledgeSourceGroups } from "@/lib/mock-data";

const quickActions = [
  {
    title: "看房与安全",
    description: "看房前确认夜路、门禁、楼道、室友和现场必拍内容。",
    href: "/visit",
    cta: "整理看房清单",
  },
  {
    title: "付款与签约",
    description: "被催交定金、服务费或押金时，先确认材料和退款边界。",
    href: "/payment",
    cta: "做付款前确认",
  },
  {
    title: "材料与凭据",
    description: "把授权、合同、收款、聊天承诺和付款备注整理成凭据清单。",
    href: "/evidence",
    cta: "整理凭据材料",
  },
  {
    title: "入住与交割",
    description: "拿钥匙前确认旧损坏、表读数、家具家电、欠费和首笔预算。",
    href: "/move",
    cta: "进入入住准备",
  },
  {
    title: "维修与退租",
    description: "遇到维修扯皮、续租涨价或押金扣款时，先整理依据和沟通文本。",
    href: "/repair",
    cta: "维修与退租",
  },
];

export default function KnowledgePage() {
  return (
    <AppShell>
      <div className="mx-auto max-w-7xl space-y-8">
        <section className="grid gap-6 lg:grid-cols-[0.64fr_0.36fr]">
          <div>
            <p className="text-sm text-primary/80">
              知识库
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-normal sm:text-4xl">
              居住决策知识库
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground">
              各类居住问题的解决方案：城市成本、看房、付款、合同、交割、维修和退租。
            </p>
          </div>
          <Card className="p-6">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-md bg-primary/15 text-primary">
              <ClipboardCheck className="h-6 w-6" />
            </div>
            <h2 className="text-lg font-semibold">把知识变成可操作方案</h2>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">
              知识库帮助你把问题拆成下一步确认事项。涉及官方结果和合同凭据时，仍以原始材料为准。
            </p>
            <div className="mt-5 grid gap-3">
              {quickActions.map((action, index) => (
                <div key={action.title} className="rounded-md border border-border bg-secondary/45 p-3">
                  <h3 className="text-sm font-semibold">{action.title}</h3>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    {action.description}
                  </p>
                  <Button
                    asChild
                    variant={index === 0 ? "default" : "secondary"}
                    className="mt-3 w-full"
                    size="sm"
                  >
                    <Link href={action.href}>
                      {action.cta}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              ))}
            </div>
          </Card>
        </section>

        <section className="grid gap-4 lg:grid-cols-[0.62fr_0.38fr]">
          <Card className="p-6">
            <div className="mb-5 flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-md bg-primary/15 text-primary">
                <FileCheck2 className="h-5 w-5" />
              </span>
              <div>
                <h2 className="text-xl font-semibold">开放来源与使用边界</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  每条知识都要能说清“依据从哪来、该怎么确认、哪些情况先别付款或签字”。
                </p>
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {knowledgeSourceGroups.map((source) => (
                <Link
                  key={source.title}
                  href={source.href ?? "/knowledge"}
                  className="group rounded-md border border-border bg-secondary/45 p-4 transition-colors hover:border-primary/45 hover:bg-secondary/70"
                >
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold">{source.title}</h3>
                      <p className="mt-1 text-xs text-muted-foreground">{source.provider}</p>
                    </div>
                    <Badge variant="secondary" className="shrink-0">
                      {source.sourceType}
                    </Badge>
                  </div>
                  <p className="text-sm leading-6 text-muted-foreground">{source.usage}</p>
                  <p className="mt-3 text-xs leading-5 text-muted-foreground/80">
                    边界：{source.boundary}
                  </p>
                  <span className="mt-3 inline-flex items-center text-xs font-medium text-primary">
                    继续查看
                    <ExternalLink className="ml-1.5 h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </Link>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-md bg-amber-300/15 text-amber-700">
              <ShieldAlert className="h-6 w-6" />
            </div>
            <h2 className="text-lg font-semibold">使用边界</h2>
            <div className="mt-4 grid gap-3 text-sm leading-6 text-muted-foreground">
              <p className="rounded-md border border-border bg-secondary/45 p-3">
                不爬取贝壳、链家、自如、安居客等租房平台房源或非公开数据。
              </p>
              <p className="rounded-md border border-border bg-secondary/45 p-3">
                不复制付费文章全文或非开放授权内容，只记录核对清单和合规来源提示。
              </p>
              <p className="rounded-md border border-border bg-secondary/45 p-3">
                高风险项必须回到官方入口、律师意见、鉴定结论或调解结果。
              </p>
            </div>
          </Card>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {knowledgeItems.map((item) => (
            <KnowledgeCard key={item.title} item={item} />
          ))}
        </section>
      </div>
    </AppShell>
  );
}

