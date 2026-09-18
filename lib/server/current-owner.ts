import { auth } from "@/auth";
import { cookies } from "next/headers";
import { ownerCookieName, verifyOwnerSession } from "./owner-session";

export const localGuestOwnerId = "guest-local";

// Legacy shared guest records have no proof of ownership and cannot be claimed.
export async function claimLocalGuestDataForOwner(_ownerId: string) {
  void _ownerId;
  return { movedReports: 0, movedEvents: 0, movedStartIntents: 0 };
}

export async function getCurrentOwnerId() {
  const session = await auth().catch(() => null);
  const userId = session?.user?.id;
  if (typeof userId === "string" && userId.trim()) return userId.trim();
  const cookieStore = await cookies().catch(() => null);
  return verifyOwnerSession(cookieStore?.get(ownerCookieName)?.value) ?? localGuestOwnerId;
}
