import { KeyRound, ServerCog, ShieldCheck } from "lucide-react";
import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { apiProviders } from "@/lib/api-providers";

const rules = [
  {
    title: "只放服务端",
    description:
      "OpenAI、高德 Web 服务、天气和 Resend Key 都写入根目录 .env.local，不加 NEXT_PUBLIC_，浏览器拿不到真实密钥。",
    icon: ServerCog,
  },
  {
    title: "用户触发才调用",
    description:
      "截图读取、房源评估、片区筛选和合同确认都由用户点击触发，不在打开页面时偷偷消耗额度。",
    icon: KeyRound,
  },
  {
    title: "用量不足也能继续用",
    description:
      "高德和天气使用个人免费 Key 时，产品侧会记录当前设备用量；接近提醒线后会改用手动输入信息估算。",
    icon: ShieldCheck,
  },
];

export function ApiSetupGuide() {
  return (
    <Card className="p-6">
      <div className="mb-6">
        <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-border bg-secondary px-3 py-1 text-xs text-muted-foreground">
          <ServerCog className="h-3.5 w-3.5 text-primary" />
          接入清单
        </div>
        <h2 className="text-lg font-semibold">API 接入清单</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
          这里展示当前版本的接入边界：密钥写在服务端环境变量里，产品只展示配置状态和产品侧用量标识。
        </p>
      </div>

      <div className="mb-5 rounded-md border border-primary/20 bg-primary/[0.08] p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs text-primary">
              <KeyRound className="h-3.5 w-3.5" />
              密钥填写位置
            </div>
            <h3 className="text-base font-semibold">优先用上方输入区写入 .env.local</h3>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
              上方表单会把服务端 Key 写入项目根目录的 `.env.local`，
              并同步到当前服务；你也可以手动编辑 `.env.local`，手动编辑后重启 `npm run dev`。
            </p>
          </div>
          <div className="grid shrink-0 gap-2 text-xs leading-5 text-muted-foreground lg:w-[320px]">
            <p>OpenAI：使用 OpenAI Platform 的 Project API Key。</p>
            <p>高德：选择“Web服务”Key，不是“Web端(JS API)”Key。</p>
            <p>天气：使用和风天气服务端 API Key。</p>
            <p>Resend：使用服务端 API Key，发件地址建议来自已验证域名。</p>
          </div>
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        {rules.map((rule) => {
          const Icon = rule.icon;
          return (
            <div key={rule.title} className="rounded-md border border-border bg-secondary p-4">
              <div className="mb-3 flex items-center gap-2">
                <Icon className="h-4 w-4 text-primary" />
                <p className="text-sm font-semibold">{rule.title}</p>
              </div>
              <p className="text-xs leading-5 text-muted-foreground">{rule.description}</p>
            </div>
          );
        })}
      </div>

      <div className="mt-5 overflow-hidden rounded-md border border-border">
        <div className="grid gap-px bg-border text-sm md:grid-cols-[0.75fr_1fr_1.5fr_1.35fr]">
          <HeaderCell>服务</HeaderCell>
          <HeaderCell>环境变量</HeaderCell>
          <HeaderCell>创建方式</HeaderCell>
          <HeaderCell>消耗时机</HeaderCell>
          {apiProviders.map((provider) => (
            <div key={provider.id} className="contents">
              <BodyCell label="服务" className="font-medium text-foreground">
                <span>{provider.name}</span>
                <span className="mt-1 block text-xs font-normal text-muted-foreground">
                  {provider.keyType}
                </span>
              </BodyCell>
              <BodyCell label="环境变量">
                <code className="rounded bg-background px-2 py-1 text-xs text-primary">
                  {provider.env}
                </code>
              </BodyCell>
              <BodyCell label="创建方式">{provider.setupHint}</BodyCell>
              <BodyCell label="消耗时机">{provider.quotaTrigger}</BodyCell>
            </div>
          ))}
        </div>
      </div>

      <pre className="mt-5 overflow-x-auto rounded-md border border-border bg-background p-4 text-xs leading-6 text-muted-foreground">
        <code>{`OPENAI_API_KEY=
OPENAI_MODEL=gpt-5.2
OPENAI_REPORT_MODEL=gpt-5.2
OPENAI_VISION_MODEL=gpt-5.2
AMAP_WEB_SERVICE_KEY=
QWEATHER_API_KEY=
QWEATHER_API_HOST=https://api.qweather.com
RESEND_API_KEY=
RESEND_FROM_EMAIL=`}</code>
      </pre>
    </Card>
  );
}

function HeaderCell({ children }: { children: ReactNode }) {
  return (
    <div className="hidden bg-secondary px-4 py-3 text-xs font-medium text-muted-foreground md:block">
      {children}
    </div>
  );
}

function BodyCell({
  children,
  className = "",
  label,
}: {
  children: ReactNode;
  className?: string;
  label: string;
}) {
  return (
    <div className={`bg-card px-4 py-3 text-xs leading-5 text-muted-foreground ${className}`}>
      <span className="mb-1 block text-[11px] font-medium text-muted-foreground md:hidden">
        {label}
      </span>
      {children}
    </div>
  );
}
