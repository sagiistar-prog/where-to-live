type CaptchaRecord = {
  answer: string;
  expiresAt: number;
  attempts: number;
};

type EmailCodeRecord = {
  code: string;
  expiresAt: number;
  attempts: number;
};

type AuthVerificationStore = {
  captchas: Map<string, CaptchaRecord>;
  emailCodes: Map<string, EmailCodeRecord>;
  lastEmailSentAt: Map<string, number>;
};

type CaptchaChallenge = {
  token: string;
  image: string;
  expiresAt: string;
};

type EmailDeliveryResult =
  | {
      mode: "resend";
    }
  | {
      mode: "local";
    };

const CAPTCHA_TTL_MS = 5 * 60 * 1000;
const EMAIL_CODE_TTL_MS = 10 * 60 * 1000;
const EMAIL_RATE_LIMIT_MS = 60 * 1000;
const MAX_ATTEMPTS = 5;
const LOCAL_EMAIL_CODE = "000000";

const globalForAuth = globalThis as typeof globalThis & {
  __zhunaarAuthVerificationStore?: AuthVerificationStore;
};

const store =
  globalForAuth.__zhunaarAuthVerificationStore ??
  {
    captchas: new Map<string, CaptchaRecord>(),
    emailCodes: new Map<string, EmailCodeRecord>(),
    lastEmailSentAt: new Map<string, number>(),
  };

globalForAuth.__zhunaarAuthVerificationStore = store;

function now() {
  return Date.now();
}

function createToken() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${now()}-${Math.random().toString(36).slice(2)}`;
}

function randomDigit(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function cleanupExpired() {
  const current = now();

  for (const [token, record] of store.captchas.entries()) {
    if (record.expiresAt <= current) store.captchas.delete(token);
  }

  for (const [email, record] of store.emailCodes.entries()) {
    if (record.expiresAt <= current) store.emailCodes.delete(email);
  }
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function forcesLocalEmailCode() {
  return process.env.AUTH_FORCE_LOCAL_EMAIL_CODE === "1";
}

function hasResendApiKey() {
  return !forcesLocalEmailCode() && Boolean(process.env.RESEND_API_KEY?.trim());
}

function usesLocalEmailCode() {
  return forcesLocalEmailCode() || !hasResendApiKey() || process.env.NODE_ENV !== "production";
}

export function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(email));
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function buildCaptchaSvg(expression: string) {
  const lineA = randomDigit(18, 58);
  const lineB = randomDigit(74, 132);
  const dotA = randomDigit(24, 150);
  const dotB = randomDigit(18, 48);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="180" height="58" viewBox="0 0 180 58" role="img" aria-label="图形验证码">
  <rect width="180" height="58" rx="8" fill="#edf3f2"/>
  <path d="M10 ${lineA} C 45 ${lineB}, 112 2, 170 ${lineA}" fill="none" stroke="#78cfc5" stroke-width="2" opacity="0.42"/>
  <path d="M8 45 C 50 14, 101 72, 172 19" fill="none" stroke="#d39c45" stroke-width="1.6" opacity="0.38"/>
  <circle cx="${dotA}" cy="${dotB}" r="5" fill="#e05858" opacity="0.16"/>
  <circle cx="${randomDigit(24, 152)}" cy="${randomDigit(16, 46)}" r="3" fill="#1b6f74" opacity="0.18"/>
  <text x="90" y="38" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="25" font-weight="700" fill="#172327" letter-spacing="2">${escapeHtml(expression)}</text>
</svg>`;
}

export function createCaptchaChallenge(): CaptchaChallenge {
  cleanupExpired();

  const left = randomDigit(2, 9);
  const right = randomDigit(1, 9);
  const answer = String(left + right);
  const expression = `${left} + ${right} = ?`;
  const token = createToken();
  const expiresAt = now() + CAPTCHA_TTL_MS;
  const svg = buildCaptchaSvg(expression);

  store.captchas.set(token, {
    answer,
    expiresAt,
    attempts: 0,
  });

  return {
    token,
    image: `data:image/svg+xml;base64,${Buffer.from(svg, "utf8").toString("base64")}`,
    expiresAt: new Date(expiresAt).toISOString(),
  };
}

export function verifyCaptcha(token: string, answer: string) {
  cleanupExpired();

  const record = store.captchas.get(token);
  if (!record) {
    return { ok: false, error: "图形验证码已过期，请刷新后重试。" };
  }

  record.attempts += 1;
  const normalizedAnswer = answer.trim();

  if (normalizedAnswer !== record.answer) {
    if (record.attempts >= MAX_ATTEMPTS) store.captchas.delete(token);
    return { ok: false, error: "图形验证码不正确，请重新输入。" };
  }

  store.captchas.delete(token);
  return { ok: true };
}

export function getEmailCodeRateLimit(email: string) {
  const normalizedEmail = normalizeEmail(email);
  const sentAt = store.lastEmailSentAt.get(normalizedEmail);
  if (!sentAt) return { limited: false, waitSeconds: 0 };

  const waitMs = EMAIL_RATE_LIMIT_MS - (now() - sentAt);
  if (waitMs <= 0) return { limited: false, waitSeconds: 0 };

  return { limited: true, waitSeconds: Math.ceil(waitMs / 1000) };
}

export function createEmailCode(email: string) {
  cleanupExpired();

  const normalizedEmail = normalizeEmail(email);
  const code = usesLocalEmailCode() ? LOCAL_EMAIL_CODE : String(randomDigit(100000, 999999));
  const expiresAt = now() + EMAIL_CODE_TTL_MS;

  store.emailCodes.set(normalizedEmail, {
    code,
    expiresAt,
    attempts: 0,
  });
  store.lastEmailSentAt.set(normalizedEmail, now());

  return {
    code,
    expiresAt: new Date(expiresAt).toISOString(),
    expiresInSeconds: Math.floor(EMAIL_CODE_TTL_MS / 1000),
  };
}

export function verifyEmailCode(email: string, code: string) {
  cleanupExpired();

  const normalizedEmail = normalizeEmail(email);
  const record = store.emailCodes.get(normalizedEmail);
  if (!record) {
    return { ok: false, error: "邮箱验证码已过期，请重新获取。" };
  }

  record.attempts += 1;
  if (code.trim() !== record.code) {
    if (record.attempts >= MAX_ATTEMPTS) store.emailCodes.delete(normalizedEmail);
    return { ok: false, error: "邮箱验证码不正确，请核对后再试。" };
  }

  store.emailCodes.delete(normalizedEmail);
  return { ok: true };
}

export async function sendEmailCode(email: string, code: string): Promise<EmailDeliveryResult> {
  const apiKey = forcesLocalEmailCode() ? "" : process.env.RESEND_API_KEY?.trim();
  const from = process.env.RESEND_FROM_EMAIL?.trim() || "住哪儿 AI <onboarding@resend.dev>";

  if (!apiKey) {
    console.info(`[auth] local email code for ${email}: ${code}`);
    return {
      mode: "local",
    };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: email,
      subject: "住哪儿 AI 邮箱验证码",
      text: `你的住哪儿 AI 注册验证码是 ${code}，10 分钟内有效。若不是你本人操作，请忽略这封邮件。`,
      html: `<div style="font-family:Inter,Arial,sans-serif;line-height:1.7;color:#172327">
        <h2 style="margin:0 0 12px">住哪儿 AI 邮箱验证码</h2>
        <p>你的注册验证码是：</p>
        <p style="font-size:28px;font-weight:700;letter-spacing:4px;margin:16px 0">${code}</p>
        <p>验证码 10 分钟内有效。若不是你本人操作，请忽略这封邮件。</p>
      </div>`,
    }),
  });

  if (!response.ok) {
    throw new Error("邮箱验证码发送失败，请稍后再试。");
  }

  return {
    mode: "resend",
  };
}
