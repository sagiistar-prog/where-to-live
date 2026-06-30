export type AppSettings = {
  reportDepth: "standard" | "deep-risk" | "pre-sign";
  screenshotExtractionEnabled: boolean;
  amapDataEnabled: boolean;
  weatherDataEnabled: boolean;
  officialPromptEnabled: boolean;
  saveReportHistory: boolean;
  maskSensitiveInfo: boolean;
  personalizationEnabled: boolean;
};

export const appSettingsStorageKey = "zhunaar:app-settings";

export const defaultAppSettings: AppSettings = {
  reportDepth: "standard",
  screenshotExtractionEnabled: true,
  amapDataEnabled: true,
  weatherDataEnabled: true,
  officialPromptEnabled: true,
  saveReportHistory: true,
  maskSensitiveInfo: true,
  personalizationEnabled: false,
};

function isReportDepth(value: unknown): value is AppSettings["reportDepth"] {
  return value === "standard" || value === "deep-risk" || value === "pre-sign";
}

function boolOrDefault(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback;
}

export function sanitizeAppSettings(value: Partial<AppSettings>): AppSettings {
  return {
    reportDepth: isReportDepth(value.reportDepth)
      ? value.reportDepth
      : defaultAppSettings.reportDepth,
    screenshotExtractionEnabled: defaultAppSettings.screenshotExtractionEnabled,
    amapDataEnabled: defaultAppSettings.amapDataEnabled,
    weatherDataEnabled: defaultAppSettings.weatherDataEnabled,
    officialPromptEnabled: defaultAppSettings.officialPromptEnabled,
    saveReportHistory: defaultAppSettings.saveReportHistory,
    maskSensitiveInfo: boolOrDefault(
      value.maskSensitiveInfo,
      defaultAppSettings.maskSensitiveInfo,
    ),
    personalizationEnabled: boolOrDefault(
      value.personalizationEnabled,
      defaultAppSettings.personalizationEnabled,
    ),
  };
}

export function readAppSettings(): AppSettings {
  if (typeof window === "undefined") return defaultAppSettings;

  try {
    const raw = window.localStorage.getItem(appSettingsStorageKey);
    if (!raw) return defaultAppSettings;
    return sanitizeAppSettings(JSON.parse(raw) as Partial<AppSettings>);
  } catch {
    return defaultAppSettings;
  }
}
