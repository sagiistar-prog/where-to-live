import { auth } from "@/auth";

export const localGuestOwnerId = "guest-local";

export async function claimLocalGuestDataForOwner(ownerId: string) {
  const normalizedOwnerId = ownerId.trim();

  if (!normalizedOwnerId || normalizedOwnerId === localGuestOwnerId) {
    return { movedReports: 0, movedEvents: 0 };
  }

  const [{ transferReportsOwner }, { transferCaseEventsOwner }] = await Promise.all([
    import("@/lib/server/report-store"),
    import("@/lib/server/case-event-store"),
  ]);
  const [reports, events] = await Promise.all([
    transferReportsOwner(localGuestOwnerId, normalizedOwnerId),
    transferCaseEventsOwner(localGuestOwnerId, normalizedOwnerId),
  ]);

  return {
    movedReports: reports.moved,
    movedEvents: events.moved,
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

  return localGuestOwnerId;
}
