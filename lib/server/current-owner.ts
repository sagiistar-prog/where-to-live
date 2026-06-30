import { auth } from "@/auth";
import { cookies } from "next/headers";

export const localGuestOwnerId = "guest-local";

export async function claimLocalGuestDataForOwner(ownerId: string) {
  const normalizedOwnerId = ownerId.trim();

  if (!normalizedOwnerId || normalizedOwnerId === localGuestOwnerId) {
    return { movedReports: 0, movedEvents: 0, movedStartIntents: 0 };
  }

  const [
    { transferReportsOwner },
    { transferCaseEventsOwner },
    { transferStartIntentsOwner },
  ] = await Promise.all([
    import("@/lib/server/report-store"),
    import("@/lib/server/case-event-store"),
    import("@/lib/server/start-intent-store"),
  ]);
  const [reports, events, startIntents] = await Promise.all([
    transferReportsOwner(localGuestOwnerId, normalizedOwnerId),
    transferCaseEventsOwner(localGuestOwnerId, normalizedOwnerId),
    transferStartIntentsOwner(localGuestOwnerId, normalizedOwnerId),
  ]);

  return {
    movedReports: reports.moved,
    movedEvents: events.moved,
    movedStartIntents: startIntents.moved,
  };
}

export async function getCurrentOwnerId() {
  const session = await auth().catch(() => null);
  const userId = session?.user?.id;

  if (typeof userId === "string" && userId.trim()) {
    const ownerId = userId.trim();
    await claimLocalGuestDataForOwner(ownerId).catch(() => null);
    return ownerId;
  }

  const cookieStore = await cookies().catch(() => null);
  const emailOwnerId = cookieStore?.get("zhunaar_owner_id")?.value?.trim();

  if (emailOwnerId) {
    await claimLocalGuestDataForOwner(emailOwnerId).catch(() => null);
    return emailOwnerId;
  }

  return localGuestOwnerId;
}
