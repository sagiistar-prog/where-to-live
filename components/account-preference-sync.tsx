"use client";

import { useEffect } from "react";
import {
  hasStoredUserPreferences,
  loadUserPreferencesFromAccount,
  markOnboardingComplete,
  readOnboardingComplete,
  readUserPreferences,
  saveUserPreferencesToAccount,
  writeUserPreferences,
} from "@/lib/user-preferences";

export function AccountPreferenceSync() {
  useEffect(() => {
    let cancelled = false;

    async function claimLocalData() {
      await fetch("/api/account/claim-local-data", {
        method: "POST",
      }).catch(() => null);
    }

    async function syncPreferences() {
      const remote = await loadUserPreferencesFromAccount().catch(() => null);
      if (cancelled || !remote?.authenticated) return;

      await claimLocalData();

      const hasLocalPreferences = hasStoredUserPreferences();

      if (remote.preferences && !hasLocalPreferences) {
        writeUserPreferences(remote.preferences);
        if (remote.onboardingCompletedAt) markOnboardingComplete();
        return;
      }

      if (!remote.preferences && hasLocalPreferences) {
        await saveUserPreferencesToAccount(readUserPreferences(), {
          onboardingCompleted: readOnboardingComplete(),
        }).catch(() => null);
      }
    }

    syncPreferences();

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
