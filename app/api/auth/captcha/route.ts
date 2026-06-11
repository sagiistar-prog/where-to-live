import { NextResponse } from "next/server";
import { createCaptchaChallenge } from "@/lib/server/auth-verification";

export const dynamic = "force-dynamic";

export function GET() {
  const challenge = createCaptchaChallenge();
  return NextResponse.json(challenge, {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
