import { NextResponse } from "next/server";
import { isValidEmail, verifyEmailCode } from "@/lib/server/auth-verification";

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

  const result = verifyEmailCode(email, code);
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    message: "邮箱已验证，可以继续保存居住偏好。",
  });
}
