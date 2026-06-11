import { NextResponse } from "next/server";
import {
  createEmailCode,
  getEmailCodeRateLimit,
  isValidEmail,
  sendEmailCode,
  verifyCaptcha,
} from "@/lib/server/auth-verification";

export const dynamic = "force-dynamic";

type EmailCodeRequest = {
  email?: unknown;
  captchaToken?: unknown;
  captchaAnswer?: unknown;
};

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as EmailCodeRequest | null;
  const email = typeof body?.email === "string" ? body.email.trim() : "";
  const captchaToken =
    typeof body?.captchaToken === "string" ? body.captchaToken.trim() : "";
  const captchaAnswer =
    typeof body?.captchaAnswer === "string" ? body.captchaAnswer.trim() : "";

  if (!isValidEmail(email)) {
    return NextResponse.json({ ok: false, error: "请输入有效的电子邮箱。" }, { status: 400 });
  }

  if (!captchaToken || !captchaAnswer) {
    return NextResponse.json(
      { ok: false, error: "请先完成图形验证码。" },
      { status: 400 },
    );
  }

  const captchaResult = verifyCaptcha(captchaToken, captchaAnswer);
  if (!captchaResult.ok) {
    return NextResponse.json({ ok: false, error: captchaResult.error }, { status: 400 });
  }

  const rateLimit = getEmailCodeRateLimit(email);
  if (rateLimit.limited) {
    return NextResponse.json(
      {
        ok: false,
        error: `${rateLimit.waitSeconds} 秒后可以再次发送邮箱验证码。`,
      },
      { status: 429 },
    );
  }

  const emailCode = createEmailCode(email);

  try {
    const delivery = await sendEmailCode(email, emailCode.code);
    return NextResponse.json({
      ok: true,
      mode: delivery.mode,
      resendId: delivery.mode === "resend" ? delivery.resendId : undefined,
      debugCode: delivery.mode === "local" ? delivery.debugCode : undefined,
      expiresAt: emailCode.expiresAt,
      expiresInSeconds: emailCode.expiresInSeconds,
      message:
        delivery.mode === "resend"
          ? "邮箱验证码已发送，请查收。"
          : "当前设备验证码已准备好；配置 RESEND_API_KEY 后会发送真实邮件。",
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Resend 邮件发送失败，请稍后再试。",
      },
      { status: 502 },
    );
  }
}
