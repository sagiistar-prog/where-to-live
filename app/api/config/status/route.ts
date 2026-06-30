import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function configured(name: string) {
  return Boolean(process.env[name]?.trim());
}

export function GET() {
  const secretConfigured = configured("AUTH_SECRET") || configured("NEXTAUTH_SECRET");
  const googleIdConfigured = configured("AUTH_GOOGLE_ID") || configured("GOOGLE_CLIENT_ID");
  const googleSecretConfigured =
    configured("AUTH_GOOGLE_SECRET") || configured("GOOGLE_CLIENT_SECRET");
  const nextAuthUrlConfigured = configured("NEXTAUTH_URL") || configured("AUTH_URL");
  const googleAvailable =
    secretConfigured &&
    googleIdConfigured &&
    googleSecretConfigured &&
    nextAuthUrlConfigured;

  return NextResponse.json({
    auth: {
      configured: googleAvailable,
      sessionAvailable: secretConfigured,
    },
    checkedAt: new Date().toISOString(),
  });
}
