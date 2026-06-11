import { livingPreferences } from "@/lib/living-preferences";

export type UserPreferences = {
  nickname: string;
  email: string;
  defaultCity: string;
  defaultWorkplace: string;
  monthlyIncome: string;
  budgetMin: string;
  budgetMax: string;
  commuteLimit: string;
  fixedCost: string;
  reportStyle: string;
  livingPreferences: string[];
};

export const userPreferencesStorageKey = "zhunaar:user-preferences";
export const onboardingStorageKey = "zhunaar:onboarding-completed";
export const userPreferencesUpdatedEvent = "zhunaar:user-preferences-updated";

export const defaultUserPreferences: UserPreferences = {
  nickname: "年轻租客",
  email: "demo@zhunaar.ai",
  defaultCity: "上海",
  defaultWorkplace: "徐家汇",
  monthlyIncome: "18000",
  budgetMin: "3500",
  budgetMax: "6500",
  commuteLimit: "45 分钟",
  fixedCost: "3000",
  reportStyle: "结论直接",
  livingPreferences: ["独居", "必须近地铁", "怕潮湿"],
};

const legacyContractChecklistStyle = "合同" + "确认清单";

const reportStyleAliases: Record<string, string> = {
  理性直接: "结论直接",
  朋友式提醒: "细节提醒",
  合同确认清单: "签约清单",
  [legacyContractChecklistStyle]: "签约清单",
  合同清单: "签约清单",
};

function normalizeReportStyle(value?: string) {
  if (!value) return defaultUserPreferences.reportStyle;
  return reportStyleAliases[value] ?? value;
}

export function sanitizeUserPreferences(value: Partial<UserPreferences>): UserPreferences {
  const selected = Array.isArray(value.livingPreferences)
    ? value.livingPreferences.filter((item) => livingPreferences.includes(item))
    : defaultUserPreferences.livingPreferences;

  return {
    ...defaultUserPreferences,
    ...value,
    reportStyle: normalizeReportStyle(value.reportStyle),
    livingPreferences: selected.length ? selected : defaultUserPreferences.livingPreferences,
  };
}

export function readUserPreferences(): UserPreferences {
  if (typeof window === "undefined") return defaultUserPreferences;

  try {
    const raw = window.localStorage.getItem(userPreferencesStorageKey);
    if (!raw) return defaultUserPreferences;
    return sanitizeUserPreferences(JSON.parse(raw) as Partial<UserPreferences>);
  } catch {
    return defaultUserPreferences;
  }
}

export function writeUserPreferences(preferences: UserPreferences) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    userPreferencesStorageKey,
    JSON.stringify(sanitizeUserPreferences(preferences)),
  );
  window.dispatchEvent(new Event(userPreferencesUpdatedEvent));
}

export function hasStoredUserPreferences() {
  if (typeof window === "undefined") return false;
  return Boolean(window.localStorage.getItem(userPreferencesStorageKey));
}

export function markOnboardingComplete() {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(onboardingStorageKey, new Date().toISOString());
}

export function readOnboardingComplete() {
  if (typeof window === "undefined") return false;
  return Boolean(window.localStorage.getItem(onboardingStorageKey));
}

export async function saveUserPreferencesToAccount(
  preferences: UserPreferences,
  options: { onboardingCompleted?: boolean } = {},
) {
  const response = await fetch("/api/account/preferences", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      preferences: sanitizeUserPreferences(preferences),
      onboardingCompleted: options.onboardingCompleted,
    }),
  });

  if (response.status === 401) {
    return { authenticated: false as const };
  }

  if (!response.ok) {
    throw new Error("ACCOUNT_PREFERENCES_SAVE_FAILED");
  }

  return response.json() as Promise<{
    authenticated: true;
    preferences: UserPreferences;
    onboardingCompletedAt?: string;
    updatedAt: string;
  }>;
}

export async function loadUserPreferencesFromAccount() {
  const response = await fetch("/api/account/preferences", { cache: "no-store" });
  if (!response.ok) return null;

  return response.json() as Promise<{
    authenticated: boolean;
    preferences: UserPreferences | null;
    onboardingCompletedAt?: string;
    updatedAt?: string;
  }>;
}
