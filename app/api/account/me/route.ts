import { NextResponse } from "next/server";
import { getCurrentOwnerId, localGuestOwnerId } from "@/lib/server/current-owner";
import { getAuthUserById } from "@/lib/server/auth-users";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET() {
  const id = await getCurrentOwnerId();
  const record = id === localGuestOwnerId ? null : await getAuthUserById(id);
  const user = record ? { id: record.id, email: record.email, name: record.name, image: record.image, provider: record.provider, emailVerified: record.emailVerified } : null;
  return NextResponse.json({ authenticated: !!user, authConfigured: !!process.env.AUTH_SECRET, user, localUser: user }, { headers: { "Cache-Control": "no-store" } });
}
