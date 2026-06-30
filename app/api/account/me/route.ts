import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getAuthUserByEmail } from "@/lib/server/auth-users";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function configured(name: string) {
  return Boolean(process.env[name]?.trim());
}

function authConfigState() {
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
    sessionAvailable: secretConfigured,
  };
}

function requestEmail(request: Request) {
  const url = new URL(request.url);
  const email = url.searchParams.get("email")?.trim() || "";
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : "";
}

export async function GET(request: Request) {
  const authConfig = authConfigState();
  const localEmail = requestEmail(request);

  if (!authConfig.sessionAvailable) {
    return NextResponse.json({
      authConfigured: false,
      authenticated: Boolean(localEmail),
      user: null,
      localUser: localEmail ? await getAuthUserByEmail(localEmail) : null,
    });
  }

  const session = await auth().catch(() => null);
  const email = session?.user?.email ?? null;
  const lookupEmail = email ?? localEmail;
  const localUser = lookupEmail ? await getAuthUserByEmail(lookupEmail) : null;

  return NextResponse.json({
    authConfigured: authConfig.configured,
    authenticated: Boolean(session?.user || localUser),
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
  });
}
