import { CheckCircle2 } from "lucide-react";

type StartHandoffField = {
  label: string;
  value: string;
};

type StartHandoffPayload = {
  source?: string;
  selectedDestination?: string;
  destination?: string;
  modeChanged?: boolean;
  routeReason?: string;
  prompt?: string;
  fields?: StartHandoffField[];
  guardrail?: string;
};

function parseHandoff(raw: string | undefined): StartHandoffPayload | undefined {
  if (!raw) return undefined;

  try {
    const parsed = JSON.parse(raw) as StartHandoffPayload;
    if (!parsed || typeof parsed !== "object") return undefined;
    return parsed;
  } catch {
    return undefined;
  }
}

export function StartHandoffBanner({ handoff }: { handoff?: string }) {
  const payload = parseHandoff(handoff);

  if (!payload) return null;
  const fields = payload.fields?.filter((field) => field.label && field.value).slice(0, 6) ?? [];

  return (
    <section className="rounded-md border border-primary/20 bg-primary/[0.045] px-4 py-3">
      <div className="flex min-w-0 gap-3">
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <div className="min-w-0 text-sm leading-6">
          <p className="font-medium text-foreground">
            已带入{payload.destination ? `“${payload.destination}”` : "当前工具"}，下方内容可修改后提交。
          </p>
          {payload.routeReason && payload.modeChanged ? (
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              {payload.routeReason}
            </p>
          ) : null}
          {payload.prompt ? (
            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground [overflow-wrap:anywhere]">
              输入内容：{payload.prompt}
            </p>
          ) : null}
          {fields.length ? (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {fields.map((field) => (
                <span
                  key={`${field.label}-${field.value}`}
                  className="max-w-full rounded-full border border-primary/20 bg-card/70 px-2.5 py-1 text-xs text-muted-foreground"
                >
                  <span className="text-foreground">{field.label}</span>：{field.value}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
