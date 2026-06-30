import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set("zhunaar_owner_id", "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });

  return response;
}
