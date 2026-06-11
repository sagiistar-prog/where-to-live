import fs from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { apiProviders } from "@/lib/api-providers";

export const dynamic = "force-dynamic";

const editableEnvMap = {
  authSecret: "AUTH_SECRET",
  authGoogleId: "AUTH_GOOGLE_ID",
  authGoogleSecret: "AUTH_GOOGLE_SECRET",
  nextAuthUrl: "NEXTAUTH_URL",
  openaiApiKey: "OPENAI_API_KEY",
  amapWebServiceKey: "AMAP_WEB_SERVICE_KEY",
  qweatherApiKey: "QWEATHER_API_KEY",
  resendApiKey: "RESEND_API_KEY",
  resendFromEmail: "RESEND_FROM_EMAIL",
} as const;

type EditableInputKey = keyof typeof editableEnvMap;

function localEnvEditorEnabled() {
  return process.env.NODE_ENV !== "production" || process.env.ENABLE_LOCAL_ENV_EDITOR === "true";
}

function configured(name: string) {
  return Boolean(process.env[name]?.trim());
}

function envFilePath() {
  return path.join(process.cwd(), ".env.local");
}

function publicState() {
  const nextAuthUrl =
    process.env.NEXTAUTH_URL?.trim() ||
    process.env.AUTH_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    "http://localhost:3000";
  const secretConfigured = configured("AUTH_SECRET") || configured("NEXTAUTH_SECRET");
  const googleIdConfigured = configured("AUTH_GOOGLE_ID") || configured("GOOGLE_CLIENT_ID");
  const googleSecretConfigured =
    configured("AUTH_GOOGLE_SECRET") || configured("GOOGLE_CLIENT_SECRET");
  const nextAuthUrlConfigured = configured("NEXTAUTH_URL") || configured("AUTH_URL");

  return {
    enabled: localEnvEditorEnabled(),
    fileName: ".env.local",
    auth: {
      name: "Google 登录",
      configured:
        secretConfigured &&
        googleIdConfigured &&
        googleSecretConfigured &&
        nextAuthUrlConfigured,
      secretConfigured,
      googleIdConfigured,
      googleSecretConfigured,
      nextAuthUrlConfigured,
      callbackUrl: `${nextAuthUrl.replace(/\/+$/g, "")}/api/auth/callback/google`,
    },
    providers: apiProviders.map((provider) => ({
      id: provider.id,
      name: provider.name,
      env: provider.env,
      keyType: provider.keyType,
      setupHint: provider.setupHint,
      configured: configured(provider.env),
    })),
  };
}

function formatEnvValue(value: string) {
  if (/^[A-Za-z0-9_.:/+=@-]+$/.test(value)) return value;
  return JSON.stringify(value);
}

async function readExistingEnv() {
  try {
    return await fs.readFile(envFilePath(), "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return "";
    throw error;
  }
}

function upsertEnvValues(existing: string, updates: Record<string, string>) {
  const lines = existing.length ? existing.split(/\r?\n/) : [];
  const usedKeys = new Set<string>();
  const nextLines = lines.map((line) => {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=/);
    if (!match) return line;

    const key = match[1];
    const value = updates[key];
    if (!value) return line;

    usedKeys.add(key);
    return `${key}=${formatEnvValue(value)}`;
  });

  const missingLines = Object.entries(updates)
    .filter(([key, value]) => value && !usedKeys.has(key))
    .map(([key, value]) => `${key}=${formatEnvValue(value)}`);

  if (missingLines.length) {
    if (nextLines.length && nextLines[nextLines.length - 1].trim()) {
      nextLines.push("");
    }
    nextLines.push(...missingLines);
  }

  return `${nextLines.join("\n").replace(/\n+$/g, "")}\n`;
}

function collectUpdates(body: unknown) {
  if (!body || typeof body !== "object") return null;

  const updates: Record<string, string> = {};
  for (const inputKey of Object.keys(editableEnvMap) as EditableInputKey[]) {
    const rawValue = (body as Record<string, unknown>)[inputKey];
    if (typeof rawValue !== "string") continue;

    const value = rawValue.trim();
    if (!value) continue;
    if (value.includes("\n") || value.includes("\r")) return null;
    if (value.length > 4096) return null;

    updates[editableEnvMap[inputKey]] = value;
  }

  return updates;
}

function validationWarnings(updates: Record<string, string>) {
  const warnings: string[] = [];

  if (updates.OPENAI_API_KEY && !updates.OPENAI_API_KEY.startsWith("sk-")) {
    warnings.push("OpenAI Key 通常以 sk- 开头；如果你使用的是受限网关或代理 Key，请确认服务端兼容。");
  }

  if (updates.AMAP_WEB_SERVICE_KEY && updates.AMAP_WEB_SERVICE_KEY.toLowerCase().includes("js")) {
    warnings.push("高德这里需要 Web服务 Key，不是 Web端(JS API) Key；如调用失败，请回高德控制台确认服务平台。");
  }

  if (updates.RESEND_API_KEY && !updates.RESEND_API_KEY.startsWith("re_")) {
    warnings.push("Resend API Key 通常以 re_ 开头；如果你使用的是代理或旧格式 Key，请确认 Resend 后台兼容。");
  }

  if (updates.AUTH_SECRET && updates.AUTH_SECRET.length < 32) {
    warnings.push("AUTH_SECRET 建议至少 32 个字符；可用 openssl rand -base64 32 创建。");
  }

  if (
    updates.AUTH_GOOGLE_ID &&
    !updates.AUTH_GOOGLE_ID.endsWith(".apps.googleusercontent.com")
  ) {
    warnings.push("AUTH_GOOGLE_ID 通常以 .apps.googleusercontent.com 结尾，请确认来自 Google OAuth Client。");
  }

  if (updates.NEXTAUTH_URL && !/^https?:\/\/[^/\s]+/.test(updates.NEXTAUTH_URL)) {
    warnings.push("NEXTAUTH_URL 应为完整 URL，当前开发地址建议填 http://localhost:3000。");
  }

  if (
    updates.RESEND_FROM_EMAIL &&
    !/^[^<@\s]+@[^<@\s]+\.[^<@\s]+$/.test(updates.RESEND_FROM_EMAIL) &&
    !/^.{1,64}\s+<[^<@\s]+@[^<@\s]+\.[^<@\s]+>$/.test(updates.RESEND_FROM_EMAIL)
  ) {
    warnings.push("Resend 发件地址建议使用 name@example.com 或 住哪儿 AI <name@example.com> 格式。");
  }

  return warnings;
}

export function GET() {
  return NextResponse.json(publicState());
}

export async function POST(request: Request) {
  if (!localEnvEditorEnabled()) {
    return NextResponse.json(
      {
        ...publicState(),
        error: "生产环境不会直接写入服务密钥。若确需在本地开启，请设置 ENABLE_LOCAL_ENV_EDITOR=true。",
      },
      { status: 403 },
    );
  }

  const body = await request.json().catch(() => null);
  const updates = collectUpdates(body);

  if (!updates) {
    return NextResponse.json(
      {
        ...publicState(),
        error: "只能保存单行密钥，且长度不能超过 4096 字符。",
      },
      { status: 400 },
    );
  }

  if (!Object.keys(updates).length) {
    return NextResponse.json(
      {
        ...publicState(),
        error: "请至少填写一个要保存的 API Key。留空的密钥项会保持不变。",
      },
      { status: 400 },
    );
  }

  const existing = await readExistingEnv();
  await fs.writeFile(envFilePath(), upsertEnvValues(existing, updates), "utf8");

  for (const [key, value] of Object.entries(updates)) {
    process.env[key] = value;
  }

  return NextResponse.json({
    ...publicState(),
    saved: Object.keys(updates),
    warnings: validationWarnings(updates),
    updatedAt: new Date().toISOString(),
  });
}
