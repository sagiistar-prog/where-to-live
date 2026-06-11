import { NextResponse } from "next/server";
import { apiProviders } from "@/lib/api-providers";

export const dynamic = "force-dynamic";

function configured(name: string) {
  return Boolean(process.env[name]?.trim());
}

export function GET() {
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

  return NextResponse.json({
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
      ...provider,
      configured: configured(provider.env),
    })),
    checkedAt: new Date().toISOString(),
  });
}
