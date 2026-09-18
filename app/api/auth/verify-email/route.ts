import { createOwnerSession, sessionLifetime } from "@/lib/server/owner-session";
import { NextResponse } from "next/server";
import { isValidEmail, verifyEmailCode } from "@/lib/server/auth-verification";
import { upsertAuthUser } from "@/lib/server/auth-users";
import { claimLocalGuestDataForOwner } from "@/lib/server/current-owner";

export const dynamic = "force-dynamic";

type VerifyEmailRequest = {
  email?: unknown;
  code?: unknown;
};

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as VerifyEmailRequest | null;
  const email = typeof body?.email === "string" ? body.email.trim() : "";
  const code = typeof body?.code === "string" ? body.code.trim() : "";

  if (!isValidEmail(email)) {
    return NextResponse.json({ ok: false, error: "请输入有效的电子邮箱。" }, { status: 400 });
  }

  if (!/^\d{6}$/.test(code)) {
    return NextResponse.json({ ok: false, error: "请输入 6 位邮箱验证码。" }, { status: 400 });
  }

  try { createOwnerSession("configuration-check"); } catch {
    return NextResponse.json({ error: "登录服务尚未配置，请联系管理员。" }, { status: 503 });
  }
  const result = verifyEmailCode(email, code);
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
  }

  const user = await upsertAuthUser({
    email,
    provider: "email",
    emailVerified: true,
  });
  const claimed = await claimLocalGuestDataForOwner(user.id).catch(() => null);

  const response = NextResponse.json({
    ok: true,
    user: {
      id: user.id,
      email: user.email,
      provider: user.provider,
      emailVerified: user.emailVerified,
    },
    message: "邮箱已验证，可以继续使用。",
    claimed,
  });
  response.cookies.set("zhunaar_owner_id", createOwnerSession(user.id), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: sessionLifetime,
    secure: process.env.NODE_ENV === "production",
  });

  return response;
}
