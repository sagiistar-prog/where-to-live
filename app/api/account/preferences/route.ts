import { NextResponse } from "next/server";
import {
  getAccountPreferences,
  saveAccountPreferences,
} from "@/lib/server/account-preferences";
import { getCurrentOwnerId, localGuestOwnerId } from "@/lib/server/current-owner";
import { sanitizeUserPreferences, type UserPreferences } from "@/lib/user-preferences";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const ownerId = await getCurrentOwnerId();

  if (ownerId === localGuestOwnerId) {
    return NextResponse.json({
      authenticated: false,
      preferences: null,
    });
  }

  const record = await getAccountPreferences(ownerId);

  return NextResponse.json({
    authenticated: true,
    preferences: record?.preferences ?? null,
    onboardingCompletedAt: record?.onboardingCompletedAt,
    updatedAt: record?.updatedAt,
  });
}

export async function PUT(request: Request) {
  const ownerId = await getCurrentOwnerId();

  if (ownerId === localGuestOwnerId) {
    return NextResponse.json(
      {
        authenticated: false,
        error: "NOT_AUTHENTICATED",
        message: "登录后可以把居住偏好保存到当前账号。",
      },
      { status: 401 },
    );
  }

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const preferences = sanitizeUserPreferences(
    body?.preferences && typeof body.preferences === "object"
      ? (body.preferences as Partial<UserPreferences>)
      : {},
  );
  const onboardingCompletedAt =
    body?.onboardingCompleted === true
      ? new Date().toISOString()
      : typeof body?.onboardingCompletedAt === "string"
        ? body.onboardingCompletedAt
        : undefined;
  const record = await saveAccountPreferences({
    ownerId,
    preferences,
    onboardingCompletedAt,
  });

  return NextResponse.json({
    authenticated: true,
    preferences: record.preferences,
    onboardingCompletedAt: record.onboardingCompletedAt,
    updatedAt: record.updatedAt,
  });
}
