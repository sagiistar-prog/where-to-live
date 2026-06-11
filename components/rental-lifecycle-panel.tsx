import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  ListChecks,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { rentalLifecycleStages, type RentalLifecycleStage } from "@/lib/mock-data";

const statusStyles: Record<
  RentalLifecycleStage["status"],
  { label: string; className: string }
> = {
  risk: {
    label: "先拦截",
    className: "border-rose-300/30 bg-rose-300/10 text-rose-700",
  },
  watch: {
    label: "重点凭据",
    className: "border-amber-300/30 bg-amber-300/10 text-amber-700",
  },
  ready: {
    label: "可保存",
    className: "border-emerald-300/30 bg-emerald-300/10 text-emerald-700",
  },
};

export function RentalLifecyclePanel() {
  return (
    <section className="rounded-lg border border-border bg-card p-5 sm:p-6">
      <div className="grid gap-6 xl:grid-cols-[0.34fr_0.66fr]">
        <div className="min-w-0">
          <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-md bg-primary/15 text-primary">
            <ListChecks className="h-5 w-5" />
          </div>
          <p className="text-sm text-primary/80">
            入住到退租
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-normal">
            把签约后的真实损失点接住
          </h2>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">
            住哪儿不只在签约前给结论。很多钱是之后亏掉的：首笔支出打穿安全垫、交割没有保存凭据、维修先垫付、涨租没算账、退租押金被混扣。工作台会把这些阶段整理成可保存、可追责的记录。
          </p>

          <div className="mt-5 grid gap-3">
            <LifecycleMetric
              label="最高优先级"
              value="付款顺序"
              note="材料没确认前，先别让现金离开你的谈判位置。"
            />
            <LifecycleMetric
              label="凭据复用"
              value="交割 → 维修 → 押金"
              note="入住第一天拍下来的凭据，会在退租最后一天发挥作用。"
            />
          </div>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row xl:flex-col">
            <Button asChild>
              <Link href="/payment">
                先做付款前确认
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href="/handover">准备交割清单</Link>
            </Button>
          </div>
        </div>

        <div className="min-w-0">
          <div className="grid gap-3">
            {rentalLifecycleStages.map((stage, index) => (
              <LifecycleStageRow key={stage.id} stage={stage} index={index} />
            ))}
          </div>

          <div className="mt-5 rounded-md border border-primary/20 bg-primary/10 p-4">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/15 text-primary">
                <ShieldCheck className="h-4 w-4" />
              </span>
              <div>
                <p className="text-sm font-semibold text-primary">
                  隐私原则：只使用你主动提供的信息
                </p>
                <p className="mt-2 text-sm leading-6 text-foreground/85">
                  不读取私人账号，不抓取租房平台。合同、截图、照片、报价单和聊天节选，只有你主动上传或粘贴后才会进入判断。
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function LifecycleStageRow({
  stage,
  index,
}: {
  stage: RentalLifecycleStage;
  index: number;
}) {
  const Icon = stage.icon;
  const status = statusStyles[stage.status];

  return (
    <Link
      href={stage.href}
      className="group grid gap-4 rounded-md border border-border bg-secondary p-4 transition-colors hover:border-primary/50 hover:bg-primary/5 lg:grid-cols-[0.3fr_0.7fr]"
    >
      <div className="min-w-0">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-background text-primary">
            <Icon className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">
              {String(index + 1).padStart(2, "0")} / {stage.phase}
            </p>
            <h3 className="mt-1 truncate text-base font-semibold">{stage.title}</h3>
          </div>
        </div>
        <span className={`mt-3 inline-flex rounded-full border px-2.5 py-1 text-xs ${status.className}`}>
          {status.label}
        </span>
      </div>

      <div className="min-w-0">
        <div className="grid gap-3 md:grid-cols-2">
          <StageDetail
            icon={CheckCircle2}
            label="钱会亏在哪"
            value={stage.moneyRisk}
          />
          <StageDetail
            icon={ClipboardCheck}
            label="现在该做什么"
            value={stage.action}
          />
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-[0.62fr_0.38fr]">
          <p className="rounded-md border border-border bg-secondary/60 p-3 text-xs leading-5 text-muted-foreground">
            凭据：{stage.evidence}
          </p>
          <div className="flex items-center justify-between gap-3 rounded-md border border-border bg-secondary/60 p-3">
            <p className="text-xs leading-5 text-muted-foreground">
              你会得到：{stage.output}
            </p>
            <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
          </div>
        </div>
      </div>
    </Link>
  );
}

function LifecycleMetric({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note: string;
}) {
  return (
    <div className="rounded-md border border-border bg-secondary p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
      <p className="mt-2 text-xs leading-5 text-muted-foreground">{note}</p>
    </div>
  );
}

function StageDetail({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-md border border-border bg-secondary/60 p-3">
      <div className="mb-2 flex items-center gap-2">
        <Icon className="h-3.5 w-3.5 text-primary" />
        <p className="text-xs font-medium text-foreground/90">{label}</p>
      </div>
      <p className="text-xs leading-5 text-muted-foreground">{value}</p>
    </div>
  );
}

