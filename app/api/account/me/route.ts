import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getAuthUserByEmail } from "@/lib/server/auth-users";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function configured(name: string) {
  return Boolean(process.env[name]?.trim());
}

function authConfigState() {
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
  };
}

export async function GET() {
  const authConfig = authConfigState();

  if (!authConfig.secretConfigured) {
    return NextResponse.json({
      authConfigured: false,
      authenticated: false,
      authConfig,
      user: null,
      localUser: null,
      reason: "AUTH_SECRET 未配置，暂不读取 Auth.js session。",
    });
  }

  const session = await auth();
  const email = session?.user?.email ?? null;
  const localUser = email ? await getAuthUserByEmail(email) : null;

  return NextResponse.json({
    authConfigured: authConfig.configured,
    authenticated: Boolean(session?.user),
    authConfig,
    user: session?.user
      ? {
          id: session.user.id,
          name: session.user.name,
          email: session.user.email,
          image: session.user.image,
          provider: session.user.provider,
          googleEmailVerified: session.user.googleEmailVerified,
        }
      : null,
    localUser,
    reason: session?.user ? undefined : "尚未登录。",
  });
}
