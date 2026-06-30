import type { UserPreferences } from "@/lib/user-preferences";

export function numberFromPreference(value: string, fallback: number) {
  const match = value.replaceAll(",", "").match(/\d+(\.\d+)?/);
  if (!match) return fallback;

  const parsed = Number(match[0]);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function yuanPerMonth(value: string, fallback: number) {
  if (!value.trim()) return "";
  return `${numberFromPreference(value, fallback)} 元/月`;
}

export function budgetPreferenceSummary(preferences: UserPreferences) {
  const min = numberFromPreference(preferences.budgetMin, 0);
  const max = numberFromPreference(preferences.budgetMax, 0);

  if (min && max && min !== max) {
    return `${min}-${max} 元/月`;
  }

  if (max || min) return `${max || min} 元/月`;

  return "待设置";
}

export function commuteLimitMinutes(preferences: UserPreferences, fallback = 45) {
  return numberFromPreference(preferences.commuteLimit, fallback);
}

export function profileDefaultSummary(preferences: UserPreferences) {
  const budget = budgetPreferenceSummary(preferences);
  const parts = [
    preferences.defaultCity ? `城市 ${preferences.defaultCity}` : "",
    preferences.defaultWorkplace ? `工作地 ${preferences.defaultWorkplace}` : "",
    budget !== "待设置" ? `预算 ${budget}` : "",
    preferences.commuteLimit ? `通勤 ${preferences.commuteLimit}` : "",
  ].filter(Boolean);

  return parts.length ? parts.join(" / ") : "未设置";
}

export function livingPreferenceText(preferences: UserPreferences) {
  return preferences.livingPreferences.length ? preferences.livingPreferences.join("、") : "";
}
