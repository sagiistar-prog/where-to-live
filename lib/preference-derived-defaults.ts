import type { UserPreferences } from "@/lib/user-preferences";

export function numberFromPreference(value: string, fallback: number) {
  const match = value.replaceAll(",", "").match(/\d+(\.\d+)?/);
  if (!match) return fallback;

  const parsed = Number(match[0]);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function yuanPerMonth(value: string, fallback: number) {
  return `${numberFromPreference(value, fallback)} 元/月`;
}

export function budgetPreferenceSummary(preferences: UserPreferences) {
  const min = numberFromPreference(preferences.budgetMin, 3500);
  const max = numberFromPreference(preferences.budgetMax, 6500);

  if (min && max && min !== max) {
    return `${min}-${max} 元/月`;
  }

  return `${max || min} 元/月`;
}

export function commuteLimitMinutes(preferences: UserPreferences, fallback = 45) {
  return numberFromPreference(preferences.commuteLimit, fallback);
}

export function profileDefaultSummary(preferences: UserPreferences) {
  return [
    `城市 ${preferences.defaultCity}`,
    `工作地 ${preferences.defaultWorkplace}`,
    `预算 ${budgetPreferenceSummary(preferences)}`,
    `通勤 ${preferences.commuteLimit}`,
  ]
    .filter(Boolean)
    .join(" / ");
}

export function livingPreferenceText(preferences: UserPreferences) {
  return preferences.livingPreferences.length
    ? preferences.livingPreferences.join("、")
    : "独居、近地铁、怕潮湿";
}
